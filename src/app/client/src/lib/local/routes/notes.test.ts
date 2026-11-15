import { describe, expect, it } from 'vitest';
import { routeHarness } from '../testing';
import { notesRoutes } from './notes';

const FLEETING = '_Notes/01_Fleeting/client_intake_call_sarah_jenkins_acme.md';
const ACME = '202609_0001D_ACME_MobileAppIllustration';
const ACME_README = `_Projects/2026/${ACME}/README.md`;

const harness = (options: Parameters<typeof routeHarness>[1] = { sample: true }) => routeHarness([notesRoutes], options);

describe('atomic notes', () => {
  it('lists the sample notes newest first with links, clients, projects and tasks', async () => {
    const { call } = harness();
    const res = await call('GET', '/notes/atomic');
    expect(res.success).toBe(true);
    expect(res.notes.map((n: any) => n.id)).toEqual(['zettel_1789526685377', 'zettel_003', 'zettel_002', 'zettel_001']);
    const intake = res.notes.find((n: any) => n.id === 'zettel_003');
    expect(intake).toMatchObject({
      title: 'Client Intake Call: Sarah Jenkins ([[ACME]])',
      type: 'fleeting',
      category: 'fleeting',
      tags: ['client-meeting', 'brief-intake', 'fintech'],
      created: '2026-09-09',
      updated: '2026-09-13',
      filename: 'client_intake_call_sarah_jenkins_acme.md',
      categoryFolder: '01_Fleeting',
      filepath: FLEETING,
      linkedClients: ['[[ACME]]'],
      linkedProjects: [`[[${ACME}]]`],
      backlinks: []
    });
    expect(intake.links).toEqual([ACME, 'INV-2026-001', 'ACME']);
    expect(intake.relatedLinks).toEqual(['[[INV-2026-001]]', '[[ACME]]']);
    expect(intake.content.startsWith('# Client Intake Call: Sarah Jenkins')).toBe(true);
    expect(intake.extractedTasks.map((t: any) => [t.text, t.dueDate, t.priority, t.lineIndex])).toEqual([
      [`3D chassis blockout in Blender for [[${ACME}]]`, '2026-09-14', 'high', 18],
      ['Export transparent 4K PNG renders to 04_WIP/', '2026-09-18', 'normal', 19],
      ['Send revised quote [[INV-2026-001]] to Sarah', null, 'normal', 20]
    ]);
    expect((await call('GET', '/notes/atomic?category=permanent')).notes).toHaveLength(3);
  });

  it('builds backlinks from [[Title]] references', async () => {
    const { call } = harness({
      files: {
        '_Notes/03_Permanent/a.md': '---\nid: a\ntitle: Visual Balance\n---\n\n# Visual Balance\n',
        '_Notes/02_Literature/b.md': '---\nid: b\ntitle: Grid Notes\ntype: literature\n---\n\nSee [[Visual Balance]].\n'
      }
    });
    const notes = (await call('GET', '/notes/atomic')).notes;
    expect(notes.find((n: any) => n.id === 'a').backlinks).toEqual([{ id: 'b', title: 'Grid Notes', type: 'literature' }]);
  });

  it('gets one note by category and id, by id alone, and 404s', async () => {
    const { call } = harness();
    expect((await call('GET', '/notes/atomic/fleeting/zettel_003')).note.filepath).toBe(FLEETING);
    expect((await call('GET', '/notes/atomic/03_Permanent/the_60_30_10_creative_color_rule')).note.id).toBe('zettel_002');
    expect((await call('GET', '/notes/atomic/zettel_001')).note.title).toBe('The Curiosity Gap Hook Formula');
    await expect(call('GET', '/notes/atomic/permanent/zettel_003')).rejects.toThrow('Note not found on disk.');
  });

  it('saves notes with YAML frontmatter at the server file names', async () => {
    const { call, fs, events } = harness({ files: {} });
    const saved = await call('POST', '/notes/atomic', {
      id: '20260909120000',
      title: 'Design System Principles',
      category: 'permanent',
      tags: ['design', 'systems', 'tokens'],
      content: '# Design System Principles\n\nMust link to [[Color-Palette]] and [[Typography-Rules]].\n\n- [ ] #task Audit tokens'
    });
    expect(saved.note).toMatchObject({ title: 'Design System Principles', category: 'permanent', updated: '2026-09-15' });
    expect(saved.note.links).toEqual(['Color-Palette', 'Typography-Rules']);
    const path = '_Notes/03_Permanent/20260909120000 - Design System Principles.md';
    const text = await fs.readText(path);
    expect(text).toMatch(/^---\nid: "20260909120000"\ntitle: Design System Principles\ntype: permanent\ncategory: permanent\n/);
    expect(text).toContain('Audit tokens');
    expect(events.map((e) => e.event)).toContain('notes:atomic:saved');

    await call('POST', '/notes/atomic', { title: 'Color Palette Notes', category: 'literature', content: 'Body only' });
    expect(await fs.readText('_Notes/02_Literature/color_palette_notes.md')).toContain('# Color Palette Notes\n\nBody only\n');
    expect((await call('GET', '/notes/atomic')).notes).toHaveLength(2);
    await expect(call('POST', '/notes/atomic', { title: 'X', type: 'diary' })).rejects.toThrow(/Invalid note category/);
  });

  it('moves a note between categories, keeps unknown keys, and never overwrites another note', async () => {
    const { call, fs } = harness();
    fs.put('_Notes/03_Permanent/the_60_30_10_creative_color_rule.md',
      (await fs.readText('_Notes/03_Permanent/the_60_30_10_creative_color_rule.md')).replace('type: permanent', 'type: permanent\nsource: book'));
    const note = (await call('GET', '/notes/atomic/permanent/zettel_002')).note;
    await call('POST', '/notes/atomic', { ...note, type: 'literature' });
    const moved = await fs.readText('_Notes/02_Literature/the_60_30_10_creative_color_rule.md');
    expect(moved).toContain('source: book');
    expect(moved).toContain('created: "2026-09-08"');
    expect(fs.paths()).toContain('_Archive/20260915-090000/_Notes/03_Permanent/the_60_30_10_creative_color_rule.md');
    expect((await call('GET', '/notes/atomic')).notes.filter((n: any) => n.id === 'zettel_002')).toHaveLength(1);

    await call('POST', '/notes/atomic', { id: 'other', title: 'The Curiosity Gap Hook Formula', content: 'Mine' });
    expect(await fs.readText('_Notes/03_Permanent/the_curiosity_gap_hook_formula.md')).toContain('id: zettel_001');
    expect(await fs.readText('_Notes/03_Permanent/the_curiosity_gap_hook_formula-2.md')).toContain('id: other');
  });

  it('archives a note instead of deleting it', async () => {
    const { call, fs, events } = harness();
    expect(await call('DELETE', '/notes/atomic/fleeting/zettel_003')).toEqual({ success: true, deleted: true });
    expect(fs.paths()).toContain(`_Archive/20260915-090000/${FLEETING}`);
    expect(fs.paths()).not.toContain(FLEETING);
    expect(events.find((e) => e.event === 'notes:atomic:deleted')?.data).toEqual({ id: 'zettel_003', category: 'fleeting' });
    await expect(call('DELETE', '/notes/atomic/fleeting/zettel_003')).rejects.toThrow('Note not found to delete.');
  });
});

describe('scratchpad', () => {
  it('reads and writes _Notes/Scratchpad.md with POST and PUT', async () => {
    const { call, fs, events } = harness();
    expect(await call('GET', '/notes/scratchpad')).toEqual({ success: true, content: '' });
    expect(await call('POST', '/notes/scratchpad', { content: '# Scratchpad Header\n\nInstant dump of ideas.' })).toEqual({ success: true });
    expect((await call('GET', '/notes/scratchpad')).content).toBe('# Scratchpad Header\n\nInstant dump of ideas.');
    await call('PUT', '/notes/scratchpad', { content: 'via put' });
    expect(await fs.readText('_Notes/Scratchpad.md')).toBe('via put');
    expect(events.filter((e) => e.event === 'notes:scratchpad:saved')).toHaveLength(2);
    expect((await harness({ files: {} }).call('GET', '/notes/scratchpad')).content).toBe('');
  });
});

describe('universal tasks', () => {
  const JOURNAL = '_Journal/Daily/2026-09-15.md';
  const journal = '---\ndate: 2026-09-15\ntitle: Tuesday\n---\n\n## Rapid Log\n- [ ] #task Call [[NEX]] about the key visual priority: urgent\n- [ ] Plain item\n';

  it('rolls up #task lines from notes, the journal and project folders', async () => {
    const { call } = harness({ sample: true, files: { [JOURNAL]: journal } });
    const { tasks } = await call('GET', '/notes/tasks');
    expect(tasks.filter((t: any) => t.sourceCategory === 'fleeting' || t.sourceCategory === 'permanent')).toHaveLength(4);
    expect(tasks.filter((t: any) => t.sourceCategory === 'project')).toHaveLength(15);
    const call_ = tasks.find((t: any) => t.sourceCategory === 'journal');
    expect(call_).toMatchObject({ text: 'Call [[NEX]] about the key visual', priority: 'urgent', sourceFile: JOURNAL, sourceNoteTitle: 'Tuesday', lineIndex: 6 });
    const review = tasks.find((t: any) => t.sourceFile === ACME_README && t.lineIndex === 36);
    expect(review).toMatchObject({
      text: 'Review client brief and references in 01_BRIEF/',
      dueDate: '2026-09-23',
      priority: 'normal',
      completed: false,
      projectId: ACME,
      sourceNoteId: ACME_README
    });
    expect(new Set(tasks.map((t: any) => t.id)).size).toBe(tasks.length);
  });

  it('toggles by note and description, changing only that line', async () => {
    const { call, fs, events } = harness();
    const before = await fs.readText(FLEETING);
    const res = await call('POST', '/notes/tasks/toggle', {
      category: 'fleeting',
      noteId: 'zettel_003',
      taskDescription: 'Export transparent 4K PNG renders to 04_WIP/',
      completed: true
    });
    expect(res).toMatchObject({ success: true, noteId: 'zettel_003', completed: true, sourceFile: FLEETING, lineIndex: 19 });
    expect(res.task).toMatchObject({ sourceNoteId: 'zettel_003', completed: true });
    const lines = before.split('\n');
    lines[19] = lines[19].replace('- [ ]', '- [x]');
    expect(await fs.readText(FLEETING)).toBe(lines.join('\n'));
    expect(events.map((e) => e.event)).toEqual(['notes:task:toggled']);

    // Same state again: no write; omitted `completed` flips.
    await call('POST', '/notes/tasks/toggle', { category: 'fleeting', noteId: 'zettel_003', taskDescription: 'Export transparent 4K PNG', completed: true });
    expect((await call('POST', '/notes/tasks/toggle', { noteId: 'zettel_003', taskDescription: 'Export transparent 4K PNG' })).completed).toBe(false);
    expect(await fs.readText(FLEETING)).toBe(before);
  });

  it('toggles a project task by file and line and reports the project change', async () => {
    const { call, fs, events } = harness();
    const before = await fs.readText(ACME_README);
    const res = await call('POST', '/notes/tasks/toggle', { sourceFile: ACME_README, lineIndex: 37 });
    expect(res).toMatchObject({ success: true, completed: true, lineIndex: 37, taskDescription: 'Prepare design source files in 02_SOURCE/' });
    const after = await fs.readText(ACME_README);
    expect(after.split('\n').filter((l, i) => l !== before.split('\n')[i])).toEqual(['- [x] #task Prepare design source files in 02_SOURCE/']);
    expect(events.find((e) => e.event === 'project:updated')?.data).toMatchObject({ projectId: ACME });
    expect((await call('GET', '/notes/tasks')).tasks.find((t: any) => t.sourceFile === ACME_README && t.lineIndex === 37).completed).toBe(true);
  });

  it('falls back to the description when the line moved, and rejects bad requests', async () => {
    const { call } = harness();
    const res = await call('POST', '/notes/tasks/toggle', { noteId: ACME_README, category: 'project', lineIndex: 2, taskDescription: 'Export review renders' });
    expect(res.lineIndex).toBe(39);
    await expect(call('POST', '/notes/tasks/toggle', { noteId: 'zettel_003' })).rejects.toThrow('noteId and taskDescription are required.');
    await expect(call('POST', '/notes/tasks/toggle', { noteId: 'zettel_003', category: 'fleeting', taskDescription: 'Nope' })).rejects.toThrow(/not found in note file/);
    await expect(call('POST', '/notes/tasks/toggle', { noteId: 'missing', taskDescription: 'x' })).rejects.toThrow(/Note "missing" not found/);
    await expect(call('POST', '/notes/tasks/toggle', { sourceFile: '_Team/_Config/preferences.json', lineIndex: 0 })).rejects.toThrow(/not a note, journal or project file/);
  });

  it('runs a note save and a task toggle fired together one after the other', async () => {
    const { call, fs } = harness();
    const note = (await call('GET', '/notes/atomic/fleeting/zettel_003')).note;
    const content = note.content.replace('- [ ] #task Send revised quote', '- [x] #task Send revised quote');
    const [saved, toggled] = await Promise.all([
      call('POST', '/notes/atomic', { ...note, content }),
      call('POST', '/notes/tasks/toggle', { category: 'fleeting', noteId: 'zettel_003', taskDescription: 'Send revised quote', completed: true })
    ]);
    expect(saved.success && toggled.completed).toBe(true);
    const text = await fs.readText(FLEETING);
    expect(text).toContain('- [x] #task Send revised quote');
    expect(text).toContain('updated: "2026-09-15"');
  });
});

describe('knowledge graph', () => {
  it('links sample notes to client and project nodes', async () => {
    const { call } = harness();
    const { graph } = await call('GET', '/notes/graph');
    const ids = graph.nodes.map((n: any) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['zettel_003', 'client_ACME', 'client_NEX', `project_${ACME}`]));
    expect(graph.nodes.find((n: any) => n.id === 'client_ACME')).toMatchObject({ type: 'client', label: 'ACME', name: 'Acme Corporation' });
    expect(graph.nodes.find((n: any) => n.id === `project_${ACME}`)).toMatchObject({ type: 'project', brand: 'ACME' });
    expect(graph.edges).toEqual(expect.arrayContaining([
      { source: 'zettel_003', target: `project_${ACME}` },
      { source: `project_${ACME}`, target: 'client_ACME' },
      { source: 'zettel_001', target: 'client_NEX' }
    ]));
    expect(graph.nodes.find((n: any) => n.id === 'client_ACME').degree).toBe(4);
    expect(ids).not.toContain('client_INV-2026-001');
  });

  it('maps note-to-note links, clients from client.md and unindexed project links (server case)', async () => {
    const { call } = harness({
      files: {
        '_Clients/ACME_AcmeCorp/client.md': '---\ncode: ACME\nname: Acme Corporation\n---\n',
        '_Notes/03_Permanent/Note_A.md':
          '---\nid: note_a\ntitle: Color Harmonies\ntype: permanent\ntags: [color, design]\n---\n\n# Color Harmonies\nConnecting to [[Visual Balance]] and client [[ACME]] and project [[202609_0001D_BrandSprint]].\n',
        '_Notes/03_Permanent/Note_B.md': '---\nid: note_b\ntitle: Visual Balance\ntype: permanent\ntags: [layout]\n---\n\n# Visual Balance\nLayout balance principles.\n'
      }
    });
    const { graph } = await call('GET', '/notes/graph');
    expect(graph.nodes.find((n: any) => n.id === 'note_a')).toMatchObject({ label: 'Color Harmonies', snippet: 'Connecting to [[Visual Balance]] and client [[ACME]] and project [[202609_0001D_BrandSprint]].' });
    expect(graph.nodes.find((n: any) => n.id === 'client_ACME').type).toBe('client');
    expect(graph.nodes.find((n: any) => n.type === 'project').id).toBe('project_202609_0001D_BrandSprint');
    expect(graph.edges).toEqual([
      { source: 'note_a', target: 'note_b' },
      { source: 'note_a', target: 'client_ACME' },
      { source: 'note_a', target: 'project_202609_0001D_BrandSprint' }
    ]);
  });
});
