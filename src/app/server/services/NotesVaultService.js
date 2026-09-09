/**
 * Kanso Cre8 — NotesVaultService
 * Pure Markdown Persistence Engine for the Atelier Knowledge Base (_Notes/)
 * 
 * Manages:
 * - 01_Fleeting/  (Ephemeral call captures, quick notes)
 * - 02_Literature/(Summaries, teardowns, swipe files)
 * - 03_Permanent/ (Atomic formulas, layout rules, proven hooks)
 * - Scratchpad.md (Instant clipboard dump and quick scribbles)
 * 
 * 100% human-readable UTF-8 Markdown with YAML frontmatter.
 * Zero SQL, SQLite, or Prisma ORM dependencies.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const config = require('../config');

const CATEGORY_MAP = {
  fleeting: '01_Fleeting',
  literature: '02_Literature',
  permanent: '03_Permanent'
};

const REVERSE_CATEGORY_MAP = {
  '01_Fleeting': 'fleeting',
  '02_Literature': 'literature',
  '03_Permanent': 'permanent'
};

class NotesVaultService {
  static getNotesRootDir() {
    let wsRoot = config.WORKSPACE_ROOT;
    try {
      const WorkspaceService = require('./WorkspaceService');
      if (WorkspaceService && WorkspaceService.workspaceRoot) {
        wsRoot = WorkspaceService.workspaceRoot;
      }
    } catch (e) {}
    const dir = path.join(wsRoot, '_Notes');
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    return dir;
  }

  static getCategoryDir(categoryOrType) {
    const root = this.getNotesRootDir();
    const folderName = CATEGORY_MAP[categoryOrType] || categoryOrType || '03_Permanent';
    const dir = path.join(root, folderName);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    return dir;
  }

  static getScratchpadPath() {
    return path.join(this.getNotesRootDir(), 'Scratchpad.md');
  }

  /**
   * Seeds canonical sample notes if subdirectories are empty.
   */
  static ensureSeeded() {
    const root = this.getNotesRootDir();
    const scratchpad = this.getScratchpadPath();
    if (!fs.existsSync(scratchpad)) {
      const defaultScratchpad = `# Scratchpad (_Notes/Scratchpad.md)

Use this space for instant clipboard dumps, fleeting ideas, temporary hex codes, or quick meeting scribbles.
Everything here is saved automatically in real-time.

- Quick hex: #38BDF8 (Electric Sky Accent)
- Review brand tokens with [[ACME]] design lead
- Check invoice draft for September design sprints
`;
      try { fs.writeFileSync(scratchpad, defaultScratchpad, 'utf8'); } catch (e) {}
    }

    const permDir = this.getCategoryDir('permanent');
    const fleetingDir = this.getCategoryDir('fleeting');
    const litDir = this.getCategoryDir('literature');

    // Only seed sample notes if the entire _Notes/ vault has no existing markdown notes
    const hasExistingNotes = [permDir, fleetingDir, litDir].some(dir => {
      try {
        return fs.existsSync(dir) && fs.readdirSync(dir).filter(f => f.endsWith('.md')).length > 0;
      } catch (e) {
        return false;
      }
    });

    if (hasExistingNotes) {
      return;
    }

    try {
      if (fs.readdirSync(permDir).filter(f => f.endsWith('.md')).length === 0) {
        // Seed Curiosity Gap formula
        const n1 = {
          id: 'zettel_001',
          title: 'The Curiosity Gap Hook Formula',
          type: 'permanent',
          tags: ['copywriting', 'viral-hooks', 'social-ads'],
          created: '2026-09-09',
          updated: '2026-09-09',
          content: `# The Curiosity Gap Hook Formula

State an unexpected, counter-intuitive result in line 1 without revealing the catalyst until line 3.

### 3 Actionable Patterns:
1. **The Negative Result**: Show the worst-case scenario first (e.g. *"90% of fintech platforms lose $12,000 monthly in untracked drop-offs..."*).
2. **The Fast Cutaway**: High-contrast graphic transition within 1.2 seconds.
3. **The Contrast Statement**: *"Stop buying generic stock templates. Start deploying custom 3D isometric brand systems."*

### Proven Client Tests:
- Tested on [[ACME]] Mobile Banking dashboard hero copy.
- Tested on [[NEX]] interactive campaign reels.`
        };
        this.saveNote(n1);

        // Seed 60-30-10 rule
        const n2 = {
          id: 'zettel_002',
          title: 'The 60-30-10 Creative Color Rule',
          type: 'permanent',
          tags: ['design-theory', 'color-systems', 'branding'],
          created: '2026-09-08',
          updated: '2026-09-08',
          content: `# The 60-30-10 Creative Color Rule

A timeless interior and graphic design ratio to balance palette harmony:

- **60% Dominant Surface**: Canvas background, negative space (e.g. Obsidian #09090B or Clean Slate #F8FAFC).
- **30% Secondary Structure**: Card containers, navigation headers, dark panels.
- **10% Accent Intent**: High-saturation action buttons, badges, key figures (e.g. Electric Sky #38BDF8).

*Rule of thumb: Never let your accent color exceed 10% of total visible viewport.*`
        };
        this.saveNote(n2);
      }

      if (fs.readdirSync(fleetingDir).filter(f => f.endsWith('.md')).length === 0) {
        const n3 = {
          id: 'zettel_003',
          title: 'Client Intake Call: Sarah Jenkins ([[ACME]])',
          type: 'fleeting',
          tags: ['client-meeting', 'brief-intake', 'fintech'],
          created: '2026-09-09',
          updated: '2026-09-09',
          content: `# Client Intake Call: Sarah Jenkins ([[ACME]])

Met with Sarah Jenkins regarding the new Enterprise Mobile Banking 3D isometric asset package.

### Action Items & Deliverables:
- [ ] #task 3D chassis blockout in Blender for [[202609_0001D_ACME_MobileAppIllustration]] 📅 2026-09-14 ⏫ high
- [ ] #task Export transparent 4K PNG renders to 04_WIP/ 📅 2026-09-18
- [ ] #task Send revised quote [[INV-2026-001]] to Sarah
- [ ] Verify font licensing for [[ACME]] typography assets

### Notes on Preferences:
Sarah likes bold, high-contrast dark enterprise UI with subtle 1px cyan hairline borders. Avoid playful cartoonish 3D; keep it clean, professional, and tactile.`
        };
        this.saveNote(n3);
      }
    } catch (e) {}
  }

  /**
   * Parses markdown raw content with frontmatter
   */
  static parseRawNote(rawContent, defaultId = '', defaultType = 'permanent') {
    let body = (rawContent || '').replace(/^\uFEFF/, '');
    let fm = {};

    const fmMatch = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (fmMatch) {
      try {
        const parsed = yaml.load(fmMatch[1]);
        if (parsed && typeof parsed === 'object') {
          fm = parsed;
        }
      } catch (e) {}
      body = fmMatch[2];
    }

    // Extract title from frontmatter or first # Heading
    let title = fm.title;
    if (!title) {
      const headingMatch = body.match(/^#\s+(.+)$/m);
      title = headingMatch ? headingMatch[1].trim() : (defaultId || 'Untitled Note');
    }

    const type = fm.type || fm.category || defaultType || 'permanent';
    const id = String(fm.id !== undefined ? fm.id : (defaultId || `zettel_${Date.now()}`));
    const tags = Array.isArray(fm.tags) ? fm.tags : [];
    const created = fm.created || new Date().toISOString().split('T')[0];
    const updated = fm.updated || new Date().toISOString().split('T')[0];

    // Extract WikiLinks
    const wikiRegex = /\[\[(.*?)\]\]/g;
    const rawLinks = Array.from(body.matchAll(wikiRegex), m => m[1]);
    const links = Array.from(new Set(rawLinks));
    const uniqueLinks = links.map(l => `[[${l}]]`);

    const relatedLinks = uniqueLinks.filter(l => !l.startsWith('[[client_') && !l.startsWith('[[2026'));
    const linkedClients = uniqueLinks.filter(l => 
      l.includes('ACME') || l.includes('NEX') || l.includes('LUM') ||
      l.toLowerCase().includes('acme') || l.toLowerCase().includes('nexus') || l.toLowerCase().includes('lumina')
    );
    const linkedProjects = uniqueLinks.filter(l => l.match(/\[\[\d{6}_/));

    // Extract inline tasks tagged with #task
    const taskRegex = /- \[([ xX])\]\s*#task\s*(.*?)(?:\s*📅\s*(\d{4}-\d{2}-\d{2}))?(?:\s*⏫\s*(high|urgent|low))?$/gm;
    const extractedTasks = [];

    for (const match of body.matchAll(taskRegex)) {
      const isChecked = match[1].toLowerCase() === 'x';
      const desc = match[2]?.trim();
      const dueDate = match[3];
      const priority = match[4];

      if (desc) {
        extractedTasks.push({
          id: `${id}_task_${extractedTasks.length + 1}`,
          sourceNoteId: id,
          sourceNoteTitle: title,
          sourceCategory: type,
          rawText: match[0],
          description: desc,
          text: desc,
          completed: isChecked,
          dueDate: dueDate || null,
          priority: priority || 'normal'
        });
      }
    }

    return {
      id,
      title,
      type,
      category: type,
      tags,
      created,
      updated,
      content: body.trim(),
      links,
      relatedLinks,
      linkedClients,
      linkedProjects,
      extractedTasks
    };
  }

  /**
   * Serializes a note object into standard Markdown with YAML frontmatter
   */
  static serializeNote(note) {
    const type = note.type || note.category || 'permanent';
    const fm = {
      id: note.id || `zettel_${Date.now()}`,
      title: note.title || 'Untitled Note',
      type,
      category: type,
      tags: Array.isArray(note.tags) ? note.tags : [],
      created: note.created || new Date().toISOString().split('T')[0],
      updated: new Date().toISOString().split('T')[0]
    };

    let content = note.content || '';
    // Ensure content starts with heading if not already present
    if (!content.trim().startsWith('# ')) {
      content = `# ${fm.title}\n\n${content.trim()}`;
    }

    return `---\n${yaml.dump(fm).trim()}\n---\n\n${content.trim()}\n`;
  }

  /**
   * Lists all atomic notes across 01_Fleeting, 02_Literature, and 03_Permanent
   */
  static listNotes() {
    this.ensureSeeded();
    const allNotes = [];

    for (const [typeKey, folderName] of Object.entries(CATEGORY_MAP)) {
      const dir = this.getCategoryDir(typeKey);
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
        for (const file of files) {
          try {
            const filePath = path.join(dir, file);
            const raw = fs.readFileSync(filePath, 'utf8');
            const defaultId = path.basename(file, '.md');
            const note = this.parseRawNote(raw, defaultId, typeKey);
            note.filename = file;
            note.categoryFolder = folderName;
            allNotes.push(note);
          } catch (err) {
            console.warn(`[NotesVaultService] Error reading ${file}:`, err.message);
          }
        }
      } catch (e) {}
    }

    // Build backlinks index
    for (const note of allNotes) {
      const noteRef = `[[${note.title}]]`;
      note.backlinks = allNotes
        .filter(other => other.id !== note.id && other.content.includes(noteRef))
        .map(other => ({ id: other.id, title: other.title, type: other.type }));
    }

    return allNotes.sort((a, b) => b.updated.localeCompare(a.updated));
  }

  /**
   * Retrieves a single note by category and id
   */
  static getNote(categoryOrType, id) {
    const dir = this.getCategoryDir(categoryOrType);
    if (!fs.existsSync(dir)) return null;

    const strId = String(id);
    // Search by direct filename or by id in frontmatter
    const directPath = path.join(dir, `${strId}.md`);
    if (fs.existsSync(directPath)) {
      const raw = fs.readFileSync(directPath, 'utf8');
      const note = this.parseRawNote(raw, strId, categoryOrType);
      note.filename = `${strId}.md`;
      return note;
    }

    // Search all files in category
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(dir, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = this.parseRawNote(raw, path.basename(file, '.md'), categoryOrType);
      if (String(parsed.id) === strId || file.startsWith(strId)) {
        parsed.filename = file;
        return parsed;
      }
    }

    return null;
  }

  /**
   * Saves or updates a note on disk
   */
  static saveNote(noteData) {
    if (!noteData) throw new Error('Note data is required.');
    const type = noteData.type || noteData.category || 'permanent';
    const dir = this.getCategoryDir(type);

    const safeTitle = (noteData.title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'note';

    const id = noteData.id || `zettel_${Date.now()}`;
    let filename = `${safeTitle}.md`;
    if (noteData.filename) {
      filename = noteData.filename;
    } else if (noteData.id && String(noteData.id).match(/^\d{14}/)) {
      filename = `${noteData.id} - ${noteData.title || 'Untitled'}.md`;
    }
    const filePath = path.join(dir, filename);

    // If an existing file with the same ID exists under a different filename, remove it
    try {
      const existingFiles = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of existingFiles) {
        const p = path.join(dir, file);
        const raw = fs.readFileSync(p, 'utf8');
        if (raw.includes(`id: ${id}`) && file !== filename) {
          try { fs.unlinkSync(p); } catch (e) {}
        }
      }
    } catch (e) {}

    const serialized = this.serializeNote({ ...noteData, id, type });
    fs.writeFileSync(filePath, serialized, 'utf8');

    return this.parseRawNote(serialized, id, type);
  }

  /**
   * Deletes a note by category and id
   */
  static deleteNote(categoryOrType, id) {
    const dir = this.getCategoryDir(categoryOrType);
    if (!fs.existsSync(dir)) return false;

    // Try direct filename
    const directPath = path.join(dir, `${id}.md`);
    if (fs.existsSync(directPath)) {
      fs.unlinkSync(directPath);
      return true;
    }

    // Search by ID
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const p = path.join(dir, file);
      const raw = fs.readFileSync(p, 'utf8');
      if (raw.includes(`id: ${id}`) || path.basename(file, '.md') === id) {
        fs.unlinkSync(p);
        return true;
      }
    }

    return false;
  }

  /**
   * Scratchpad reading and saving
   */
  static getScratchpad() {
    this.ensureSeeded();
    const p = this.getScratchpadPath();
    let text = '';
    if (fs.existsSync(p)) {
      text = fs.readFileSync(p, 'utf8');
    }
    const strObj = new String(text);
    strObj.content = text;
    return strObj;
  }

  static saveScratchpad(content) {
    const p = this.getScratchpadPath();
    const text = content || '';
    fs.writeFileSync(p, text, 'utf8');
    const strObj = new String(text);
    strObj.content = text;
    strObj.success = true;
    return strObj;
  }

  /**
   * Universal Task Rollup:
   * Gathers all inline `- [ ] #task` items across all notes in _Notes/
   */
  static getAllTasks() {
    const notes = this.listNotes();
    const allTasks = [];

    for (const note of notes) {
      if (note.extractedTasks && note.extractedTasks.length > 0) {
        allTasks.push(...note.extractedTasks);
      }
    }

    return allTasks;
  }

  /**
   * Toggles completion of an inline task directly on disk in the physical note file
   */
  static toggleTask(categoryOrType, noteId, taskDescription, setCompleted = null) {
    const note = this.getNote(categoryOrType, noteId);
    if (!note) {
      throw new Error(`Note "${noteId}" not found in category "${categoryOrType}".`);
    }

    const dir = this.getCategoryDir(note.type);
    // Find file
    let targetPath = note.filename ? path.join(dir, note.filename) : null;
    if (!targetPath || !fs.existsSync(targetPath)) {
      targetPath = path.join(dir, `${note.id}.md`);
    }
    if (!fs.existsSync(targetPath)) {
      const strId = String(note.id);
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const p = path.join(dir, file);
        if (file.startsWith(strId)) {
          targetPath = p;
          break;
        }
        const raw = fs.readFileSync(p, 'utf8');
        if (raw.includes(`id: ${strId}`) || raw.includes(`id: "${strId}"`) || raw.includes(`id: '${strId}'`)) {
          targetPath = p;
          break;
        }
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      throw new Error(`Physical file for note "${noteId}" not found on disk.`);
    }

    let fileContent = fs.readFileSync(targetPath, 'utf8');
    const escapedDesc = taskDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const taskRegex = new RegExp(`- \\[([ xX])\\](\\s*(?:#task)?\\s*${escapedDesc})`, 'i');

    const match = fileContent.match(taskRegex);
    if (!match) {
      throw new Error(`Task description not found in note file: "${taskDescription}"`);
    }

    const currentCompleted = match[1].toLowerCase() === 'x';
    const newCompleted = setCompleted !== null ? Boolean(setCompleted) : !currentCompleted;
    const newCheckbox = newCompleted ? '- [x]' : '- [ ]';

    fileContent = fileContent.replace(taskRegex, `${newCheckbox}$2`);
    fs.writeFileSync(targetPath, fileContent, 'utf8');

    return {
      success: true,
      noteId,
      taskDescription,
      completed: newCompleted,
      task: {
        id: `${noteId}_task`,
        sourceNoteId: noteId,
        text: taskDescription,
        description: taskDescription,
        completed: newCompleted
      }
    };
  }

  // Convenience aliases for flexible consumption
  static saveAtomicNote(noteData) { return this.saveNote(noteData); }
  static getAtomicNotes() { return this.listNotes(); }
  static getUniversalTasks() { return this.getAllTasks(); }
}

module.exports = NotesVaultService;
