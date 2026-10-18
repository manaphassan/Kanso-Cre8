/**
 * Test Suite Module
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const express = require('express');
const config = require('../config');
const FrontmatterService = require('../services/FrontmatterService');
const AuditService = require('../services/AuditService');
const DeliverableService = require('../services/DeliverableService');
const WorkspaceService = require('../services/WorkspaceService');
const ApprovalService = require('../services/ApprovalService');
const JournalVaultService = require('../services/JournalVaultService');
const FinanceVaultService = require('../services/FinanceVaultService');
const NotesVaultService = require('../services/NotesVaultService');
const TeamService = require('../services/TeamService');
const LicenseService = require('../services/LicenseService');
const ConfigService = require('../services/ConfigService');
const CompanyService = require('../services/CompanyService');
const CommentService = require('../services/CommentService');
const CopywritingService = require('../services/CopywritingService');
const SseService = require('../services/SseService');
const ExportService = require('../services/ExportService');
const ShareService = require('../services/ShareService');
const GeminiService = require('../services/GeminiService');
const WebhookService = require('../services/WebhookService');
const SnapshotService = require('../services/SnapshotService');
const TimerService = require('../services/TimerService');

const notesRoutes = require('../routes/notes');

module.exports = async function run(test, context = {}) {
  await test('Quick Notes discovers Notes and user-scoped Notes_* directories with UTF-8 BOM safety', async () => {
    const config = require('../config');
    const testDir = path.join(__dirname, 'temp-notes-workspace');
    const notesTeamDir = path.join(testDir, '_Team', '_Config', 'Notes');
    const notesBrandDir = path.join(testDir, '_Team', '_Config', 'Notes_brand');
    fs.mkdirSync(notesTeamDir, { recursive: true });
    fs.mkdirSync(notesBrandDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWsRoot = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Write team note and user-scoped note with UTF-8 BOM
      fs.writeFileSync(path.join(notesTeamDir, 'team_note.md'), '---\npriority: high\n---\n# Team Overview\n\nAll designers briefing.');
      fs.writeFileSync(path.join(notesBrandDir, 'brand_note.md'), '\uFEFF---\npinned: true\n---\n# Madu Tualang Specs\n\n17x target sales.');

      // 2. Query routes/api notes functions using native fetch
      const express = require('express');
      const app = express();
      app.use(express.json());
      app.use('/api', require('../routes/api'));

      const server = app.listen(0);
      const port = server.address().port;

      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/notes`);
        const resBody = await response.json();
        assert.strictEqual(response.status, 200);
        assert.strictEqual(resBody.success, true);
        assert.strictEqual(resBody.notes.length, 2);

        const brandNote = resBody.notes.find(n => n.id === 'brand_note');
        assert.ok(brandNote, 'Brand note must be discovered from Notes_brand');
        assert.strictEqual(brandNote.title, 'Madu Tualang Specs');
        assert.strictEqual(brandNote.isPinned, true);
        assert.strictEqual(brandNote.owner, 'brand');

        const teamNote = resBody.notes.find(n => n.id === 'team_note');
        assert.ok(teamNote, 'Team note must be discovered from Notes');
        assert.strictEqual(teamNote.title, 'Team Overview');
        assert.strictEqual(teamNote.owner, 'team');
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWsRoot;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  await test('NotesVaultService reads/writes atomic notes with YAML frontmatter, WikiLinks and Scratchpad', async () => {
    const testDir = path.join(__dirname, 'temp-notes-vault-test');
    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;

    try {
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
      fs.mkdirSync(testDir, { recursive: true });
      config.WORKSPACE_ROOT = testDir;
      WorkspaceService.workspaceRoot = testDir;

      // 1. Save atomic note in permanent
      const note1 = await NotesVaultService.saveAtomicNote({
        id: '20260909120000',
        title: 'Design System Principles',
        category: 'permanent',
        tags: ['design', 'systems', 'tokens'],
        content: '# Design System Principles\n\nMust link to [[Color-Palette]] and [[Typography-Rules]].\n\n- [ ] #task Audit tokens'
      });

      assert.strictEqual(note1.title, 'Design System Principles');
      assert.strictEqual(note1.category, 'permanent');
      assert.ok(note1.links.includes('Color-Palette'));
      assert.ok(note1.links.includes('Typography-Rules'));

      // Check physical file on disk
      const filePath = path.join(testDir, '_Notes', '03_Permanent', '20260909120000 - Design System Principles.md');
      assert.ok(fs.existsSync(filePath), 'Note file should exist on disk in _Notes/03_Permanent');
      const diskContent = fs.readFileSync(filePath, 'utf8');
      assert.ok(diskContent.includes('category: permanent'));
      assert.ok(diskContent.includes('Audit tokens'));

      // 2. Save note in literature that links back
      const note2 = await NotesVaultService.saveAtomicNote({
        id: '20260909130000',
        title: 'Color Palette Notes',
        category: 'literature',
        tags: ['color', 'research'],
        content: '# Color Palette Notes\n\nReferenced by [[Design-System-Principles]].'
      });
      assert.strictEqual(note2.category, 'literature');

      // 3. List all atomic notes
      const notes = await NotesVaultService.getAtomicNotes();
      assert.strictEqual(notes.length, 2);

      // 4. Scratchpad test
      const scratch = await NotesVaultService.saveScratchpad('# Scratchpad Header\n\nInstant dump of ideas.');
      assert.strictEqual(scratch.content, '# Scratchpad Header\n\nInstant dump of ideas.');
      const scratchFile = path.join(testDir, '_Notes', 'Scratchpad.md');
      assert.ok(fs.existsSync(scratchFile));

      const retrievedScratch = await NotesVaultService.getScratchpad();
      assert.strictEqual(retrievedScratch.content, '# Scratchpad Header\n\nInstant dump of ideas.');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  await test('NotesVaultService extracts universal #task items and toggles directly on disk', async () => {
    const testDir = path.join(__dirname, 'temp-notes-tasks-test');
    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;

    try {
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
      fs.mkdirSync(testDir, { recursive: true });
      config.WORKSPACE_ROOT = testDir;
      WorkspaceService.workspaceRoot = testDir;

      // Create a note with multiple markdown tasks
      await NotesVaultService.saveAtomicNote({
        id: '20260909150000',
        title: 'Client Review Prep',
        category: 'fleeting',
        tags: ['prep'],
        content: '# Client Review Prep\n\n' +
                 '- [ ] #task Export SVG proof sheet due: 2026-09-20 priority: high\n' +
                 '- [x] #task Email agenda to stakeholders\n' +
                 '- [ ] Plain uncompleted note without hash'
      });

      // 1. Get universal tasks
      const tasks = await NotesVaultService.getUniversalTasks();
      assert.strictEqual(tasks.length, 2, 'Should find 2 #task items');

      const task1 = tasks.find(t => t.text.includes('Export SVG proof sheet'));
      assert.ok(task1, 'Export task found');
      assert.strictEqual(task1.completed, false);
      assert.strictEqual(task1.priority, 'high');
      assert.strictEqual(task1.dueDate, '2026-09-20');

      const task2 = tasks.find(t => t.text.includes('Email agenda'));
      assert.ok(task2, 'Email task found');
      assert.strictEqual(task2.completed, true);

      // 2. Toggle task1 to completed
      const toggled = await NotesVaultService.toggleTask('fleeting', '20260909150000', task1.text, true);
      assert.strictEqual(toggled.completed, true);

      // 3. Verify disk markdown reflection
      const noteFiles = fs.readdirSync(path.join(testDir, '_Notes', '01_Fleeting'));
      const noteContent = fs.readFileSync(path.join(testDir, '_Notes', '01_Fleeting', noteFiles[0]), 'utf8');
      assert.ok(noteContent.includes('- [x] #task Export SVG proof sheet'), 'Markdown file on disk must be updated to [x]');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  await test('Express API exposes /api/notes/atomic, /api/notes/scratchpad, and /api/notes/tasks endpoints', async () => {
    const testDir = path.join(__dirname, 'temp-notes-api-test');
    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;

    try {
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
      fs.mkdirSync(testDir, { recursive: true });
      config.WORKSPACE_ROOT = testDir;
      WorkspaceService.workspaceRoot = testDir;

      const express = require('express');
      const apiRoutes = require('../routes/api');
      const app = express();
      app.use(express.json());
      app.use('/api', apiRoutes);

      const server = await new Promise(resolve => {
        const s = app.listen(0, () => resolve(s));
      });
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        // 1. POST /api/notes/atomic
        const saveRes = await fetch(`${baseUrl}/api/notes/atomic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'API Test Note',
            category: 'permanent',
            tags: ['api', 'test'],
            content: '# API Test Note\n\n- [ ] #task Verify API endpoints'
          })
        });
        const saveBody = await saveRes.json();
        assert.strictEqual(saveRes.status, 200);
        assert.strictEqual(saveBody.success, true);
        assert.strictEqual(saveBody.note.title, 'API Test Note');

        // 2. GET /api/notes/atomic
        const listRes = await fetch(`${baseUrl}/api/notes/atomic`);
        const listBody = await listRes.json();
        assert.strictEqual(listRes.status, 200);
        assert.strictEqual(listBody.success, true);
        assert.ok(listBody.notes.some(n => n.title === 'API Test Note'));

        // 3. GET & POST /api/notes/scratchpad
        const postScratchRes = await fetch(`${baseUrl}/api/notes/scratchpad`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Quick note via API' })
        });
        const postScratchBody = await postScratchRes.json();
        assert.strictEqual(postScratchRes.status, 200);
        assert.strictEqual(postScratchBody.success, true);

        const getScratchRes = await fetch(`${baseUrl}/api/notes/scratchpad`);
        const getScratchBody = await getScratchRes.json();
        assert.strictEqual(getScratchRes.status, 200);
        assert.strictEqual(getScratchBody.content, 'Quick note via API');

        // 4. GET /api/notes/tasks
        const tasksRes = await fetch(`${baseUrl}/api/notes/tasks`);
        const tasksBody = await tasksRes.json();
        assert.strictEqual(tasksRes.status, 200);
        assert.ok(tasksBody.tasks.length >= 1);
        assert.ok(tasksBody.tasks.some(t => t.text.includes('Verify API endpoints')));

        // 5. POST /api/notes/tasks/toggle
        const toggleRes = await fetch(`${baseUrl}/api/notes/tasks/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'permanent',
            noteId: saveBody.note.id,
            taskDescription: 'Verify API endpoints',
            completed: true
          })
        });
        const toggleBody = await toggleRes.json();
        assert.strictEqual(toggleRes.status, 200);
        assert.strictEqual(toggleBody.success, true);
        assert.strictEqual(toggleBody.completed, true);
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  await test('NotesVaultService.getGraphTopology maps atomic notes, client nodes, and project edges', async () => {
    const testDir = path.join(__dirname, 'temp-graph-test');
    const notesDir = path.join(testDir, '_Notes', '03_Permanent');
    fs.mkdirSync(notesDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Create note A linking to note B and client ACME
      const noteAPath = path.join(notesDir, 'Note_A.md');
      fs.writeFileSync(noteAPath, `---
id: note_a
title: Color Harmonies
type: permanent
tags: [color, design]
---

# Color Harmonies
Connecting to [[Visual Balance]] and client [[ACME]] and project [[202609_0001D_BrandSprint]].
`, 'utf8');

      // 2. Create note B
      const noteBPath = path.join(notesDir, 'Note_B.md');
      fs.writeFileSync(noteBPath, `---
id: note_b
title: Visual Balance
type: permanent
tags: [layout]
---

# Visual Balance
Layout balance principles.
`, 'utf8');

      const topology = NotesVaultService.getGraphTopology();
      assert.ok(Array.isArray(topology.nodes), 'Nodes must be an array');
      assert.ok(Array.isArray(topology.edges), 'Edges must be an array');

      // Check node exists
      const nodeA = topology.nodes.find(n => n.id === 'note_a');
      assert.ok(nodeA, 'Node A must exist');
      assert.strictEqual(nodeA.label, 'Color Harmonies');

      // Check client node was automatically discovered
      const clientNode = topology.nodes.find(n => n.id === 'client_ACME' || n.label === 'ACME');
      assert.ok(clientNode, 'Client ACME node must exist in graph');
      assert.strictEqual(clientNode.type, 'client');

      // Check project node was automatically discovered
      const projNode = topology.nodes.find(n => n.type === 'project');
      assert.ok(projNode, 'Project node must exist in graph');

      // Check edges connect Note A to Note B, ACME, and Project
      const edgeToB = topology.edges.find(e => e.source === 'note_a' && e.target === 'note_b');
      assert.ok(edgeToB, 'Edge from Note A to Note B must exist');

      const edgeToClient = topology.edges.find(e => e.source === 'note_a' && e.target.includes('ACME'));
      assert.ok(edgeToClient, 'Edge from Note A to client ACME must exist');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });
};

if (require.main === module) {
  (async () => {
    let passed = 0;
    let failed = 0;
    async function t(name, fn) {
      try {
        const res = fn();
        if (res && typeof res.then === 'function') await res;
        console.log(`  PASS: ${name}`);
        passed++;
      } catch (err) {
        console.error(`  FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
      }
    }
    console.log(`Running standalone test: ${path.basename(__filename)}...`);
    await module.exports(t, {});
    console.log(`\n${passed} Passed, ${failed} Failed\n`);
    if (WorkspaceService.watcher) {
      try { await WorkspaceService.watcher.close(); } catch (_) {}
    }
    process.exit(failed > 0 ? 1 : 0);
  })();
}
