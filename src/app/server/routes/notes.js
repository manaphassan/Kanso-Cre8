const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');
const WorkspaceService = require('../services/WorkspaceService');
const NotesVaultService = require('../services/NotesVaultService');
const SseService = require('../services/SseService');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.get('/notes', (req, res) => {
  try {
    const dirs = NotesVaultService.getAllQuickNotesDirs(req.query.user || null);
    const notes = [];
    for (const d of dirs) {
      if (fs.existsSync(d.path)) {
        try {
          const files = fs.readdirSync(d.path);
          for (const file of files) {
            if (file.endsWith('.md')) {
              const fullPath = path.join(d.path, file);
              const stat = fs.statSync(fullPath);
              const content = fs.readFileSync(fullPath, 'utf8');
              notes.push(NotesVaultService.parseQuickNoteMarkdown(content, file, stat, d.owner));
            }
          }
        } catch (e) {}
      }
    }
    notes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.mtime - a.mtime;
    });
    res.json({ success: true, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notes', (req, res) => {
  try {
    const { title, body, pinned, priority, targetUser } = req.body;
    if (!title && !body) return res.status(400).json({ error: 'Title or body is required' });
    const targetDir = NotesVaultService.getTargetWriteDir(targetUser || null);
    const safeTitle = (title || 'quick_note').toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 40);
    const filename = `${Date.now()}_${safeTitle}.md`;
    const fullPath = path.join(targetDir.path, filename);
    const frontmatter = `---\npriority: ${priority || 'normal'}\npinned: ${!!pinned}\n---\n`;
    const mdContent = `${frontmatter}# ${title || 'Quick Note'}\n\n${body || ''}\n`;
    fs.writeFileSync(fullPath, mdContent, 'utf8');
    const stat = fs.statSync(fullPath);
    const newNote = NotesVaultService.parseQuickNoteMarkdown(mdContent, filename, stat, targetDir.owner);
    SseService.broadcast('notes:updated', { action: 'created', note: newNote });
    res.status(201).json({ success: true, note: newNote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/notes/:id', (req, res) => {
  try {
    const noteId = req.params.id;
    const { title, body, pinned, priority, targetUser } = req.body;
    const dirs = NotesVaultService.getAllQuickNotesDirs(targetUser || null);
    let targetPath = null;
    let targetOwner = 'team';

    for (const d of dirs) {
      if (fs.existsSync(d.path)) {
        const candidate = path.join(d.path, `${noteId}.md`);
        if (fs.existsSync(candidate)) {
          targetPath = candidate;
          targetOwner = d.owner;
          break;
        }
      }
    }

    if (!targetPath) return res.status(404).json({ error: 'Note not found on disk' });
    const frontmatter = `---\npriority: ${priority || 'normal'}\npinned: ${!!pinned}\n---\n`;
    const mdContent = `${frontmatter}# ${title || 'Quick Note'}\n\n${body || ''}\n`;
    fs.writeFileSync(targetPath, mdContent, 'utf8');
    const stat = fs.statSync(targetPath);
    const updatedNote = NotesVaultService.parseQuickNoteMarkdown(mdContent, `${noteId}.md`, stat, targetOwner);
    SseService.broadcast('notes:updated', { action: 'updated', note: updatedNote });
    res.json({ success: true, note: updatedNote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/notes/:id', (req, res) => {
  try {
    const noteId = req.params.id;
    const dirs = NotesVaultService.getAllQuickNotesDirs(req.query.user || null);
    let deleted = false;
    for (const d of dirs) {
      if (fs.existsSync(d.path)) {
        const candidate = path.join(d.path, `${noteId}.md`);
        if (fs.existsSync(candidate)) {
          fs.unlinkSync(candidate);
          deleted = true;
          break;
        }
      }
    }
    if (!deleted) return res.status(404).json({ error: 'Note not found' });
    SseService.broadcast('notes:updated', { action: 'deleted', noteId });
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notes/scratchpad', (req, res) => {
  try {
    const content = NotesVaultService.getScratchpad();
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const handleSaveScratchpad = (req, res) => {
  try {
    const { content } = req.body;
    NotesVaultService.saveScratchpad(content || '');
    SseService.broadcast('notes:scratchpad:saved', { updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
router.post('/notes/scratchpad', handleSaveScratchpad);
router.put('/notes/scratchpad', handleSaveScratchpad);

router.get('/notes/atomic', (req, res) => {
  try {
    res.json({ success: true, notes: NotesVaultService.listNotes(req.query.category || null) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notes/atomic', (req, res) => {
  try {
    const saved = NotesVaultService.saveNote(req.body);
    SseService.broadcast('notes:atomic:saved', { note: saved });
    res.json({ success: true, note: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get(['/notes/atomic/:category/:id', '/notes/atomic/:id'], (req, res) => {
  try {
    const note = req.params.category ? NotesVaultService.getNote(req.params.category, req.params.id) : NotesVaultService.getNote(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found on disk.' });
    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete(['/notes/atomic/:category/:id', '/notes/atomic/:id'], (req, res) => {
  try {
    const deleted = req.params.category ? NotesVaultService.deleteNote(req.params.category, req.params.id) : NotesVaultService.deleteNote(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Note not found to delete.' });
    SseService.broadcast('notes:atomic:deleted', { id: req.params.id, category: req.params.category });
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notes/tasks', (req, res) => {
  try {
    res.json({ success: true, tasks: NotesVaultService.getAllTasks() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notes/tasks/toggle', (req, res) => {
  try {
    const { category, noteId, taskDescription, completed, lineIndex } = req.body;
    if (lineIndex !== undefined) {
      const result = NotesVaultService.toggleTask(noteId, parseInt(lineIndex, 10));
      SseService.broadcast('notes:task:toggled', { result });
      return res.json({ success: true, ...result });
    }
    if (!noteId || !taskDescription) return res.status(400).json({ error: 'noteId and taskDescription are required.' });
    const result = NotesVaultService.toggleTask(category || 'permanent', noteId, taskDescription, completed);
    SseService.broadcast('notes:task:toggled', { result });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/notes/graph', (req, res) => {
  try {
    res.json({ success: true, graph: NotesVaultService.getGraphTopology() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
