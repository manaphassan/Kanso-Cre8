import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryVaultFs } from './memoryVaultFs';
import { exists, readJson, writeJson } from './types';

// Mirrors src-tauri/src/vault/ops_tests.rs so both implementations agree.
let fs: MemoryVaultFs;

beforeEach(() => {
  fs = new MemoryVaultFs({
    '_Notes/Scratchpad.md': '# Scratch\r\nline\r\n',
    '.obsidian/app.json': '{}'
  });
  fs.put('_Notes/01_Fleeting/.keep', '');
});

describe('MemoryVaultFs', () => {
  it('writes LF text without BOM and creates parents', async () => {
    const w = await fs.writeText('_Projects/2026/Alpha/README.md', '\uFEFFa\r\nb\n');
    expect(w).toEqual({ path: '_Projects/2026/Alpha/README.md', size: 4 });
    expect(await fs.readText('_Projects/2026/Alpha/README.md')).toBe('a\nb\n');
    await fs.writeText('_Projects/2026/Alpha/README.md', 'replaced');
    expect(await fs.readText('_Projects/2026/Alpha/README.md')).toBe('replaced');
  });

  it('reads CRLF and BOM files as LF', async () => {
    fs.put('bom.md', '\uFEFFtitle\r\nbody');
    expect(await fs.readText('bom.md')).toBe('title\nbody');
    expect(await fs.readText('_Notes/Scratchpad.md')).toBe('# Scratch\nline\n');
  });

  it('rejects invalid new names and escaping paths', async () => {
    for (const rel of ['_Notes/CON.md', '_Notes/a:b.md', '_Notes/trailing.', 'New?/x.md', '../x.md']) {
      await expect(fs.writeText(rel, 'x'), rel).rejects.toThrow();
    }
    await expect(fs.writeText('_Notes', 'x')).rejects.toThrow(/folder/);
  });

  it('reports case collisions like Linux', async () => {
    await expect(fs.writeText('_Notes/scratchpad.md', 'x')).rejects.toThrow(/letter case/);
  });

  it('scans with text and skips dot folders', async () => {
    fs.put('_Notes/big.bin', new Uint8Array(16));
    const entries = await fs.scan();
    const paths = entries.map((e) => e.path);
    expect(paths).toContain('_Notes');
    expect(paths).toContain('_Notes/01_Fleeting');
    expect(paths.some((p) => p.startsWith('.obsidian'))).toBe(false);
    expect(entries.find((e) => e.path === '_Notes/Scratchpad.md')?.text).toBe('# Scratch\nline\n');
    const bin = entries.find((e) => e.path === '_Notes/big.bin')!;
    expect([bin.size, bin.text]).toEqual([16, undefined]);
    await expect(fs.scan('_Notes/Scratchpad.md')).rejects.toThrow(/not a folder/);
  });

  it('lists only direct children', async () => {
    expect((await fs.listDir('')).map((e) => e.path)).toEqual(['.obsidian', '_Notes']);
    expect((await fs.listDir('_Notes/')).map((e) => e.path)).toEqual([
      '_Notes/01_Fleeting',
      '_Notes/Scratchpad.md'
    ]);
  });

  it('ensureDirs reports only what it created', async () => {
    expect(await fs.ensureDirs(['_Notes', '_Finance/Quotes', '_Finance/Invoices'])).toEqual([
      '_Finance/Quotes',
      '_Finance/Invoices'
    ]);
    await expect(fs.ensureDirs(['../x'])).rejects.toThrow();
  });

  it('archives instead of deleting', async () => {
    fs.now = () => new Date(Date.UTC(2026, 10, 14, 9, 30, 0));
    const first = await fs.moveToArchive('_Notes/Scratchpad.md');
    expect(first).toBe('_Archive/20261114-093000/_Notes/Scratchpad.md');
    expect(await exists(fs, '_Notes/Scratchpad.md')).toBe(false);
    expect(await fs.readText(first)).toBe('# Scratch\nline\n');

    await fs.writeText('_Notes/Scratchpad.md', 'again');
    const second = await fs.moveToArchive('_Notes/Scratchpad.md');
    expect(second).toBe('_Archive/20261114-093000-2/_Notes/Scratchpad.md');

    const folder = await fs.moveToArchive('_Notes');
    expect(fs.paths()).toContain(`${folder}/01_Fleeting/.keep`);
    for (const rel of ['', '_Archive', 'missing.md']) {
      await expect(fs.moveToArchive(rel), rel).rejects.toThrow();
    }
  });

  it('copies picked files in and respects overwrite', async () => {
    fs.external.set('C:/Users/a/render.png', new Uint8Array(1000).fill(7));
    const dest = '_Projects/P/05_DELIVERABLES/render.png';
    expect(await fs.copyIn('C:/Users/a/render.png', dest)).toEqual({ path: dest, size: 1000 });
    await expect(fs.copyIn('C:/Users/a/render.png', dest)).rejects.toThrow(/already exists/);
    await expect(fs.copyIn('C:/Users/a/render.png', dest, true)).resolves.toBeTruthy();
    await expect(fs.copyIn('C:/Users/a/missing.png', '_P/x.png')).rejects.toThrow(/not found/);
  });

  it('writes bytes and copies within the vault', async () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(await fs.writeBytes('_Projects/P/04_WIP/raw.png', bytes)).toEqual({ path: '_Projects/P/04_WIP/raw.png', size: 256 });
    await expect(fs.writeBytes('_Projects/P/04_WIP/raw.png', bytes)).rejects.toThrow(/already exists/);
    await expect(fs.writeBytes('_Projects/P/04_WIP/raw.png', bytes, true)).resolves.toBeTruthy();
    await fs.copyWithin('_Notes/Scratchpad.md', '_Projects/P/_snapshots/s1/README.md');
    expect(await fs.readText('_Projects/P/_snapshots/s1/README.md')).toBe('# Scratch\nline\n');
    await expect(fs.copyWithin('_Notes', 'x.md')).rejects.toThrow(/not a file/);
  });

  it('hashes like sha256sum', async () => {
    fs.put('empty.txt', '');
    fs.put('abc.txt', 'abc');
    expect(await fs.sha256('empty.txt')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
    expect(await fs.sha256('abc.txt')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('records ZIP exports', async () => {
    fs.put('_Projects/P1/05_DELIVERABLES/hero.png', new Uint8Array(5000));
    fs.put('_Projects/P1/README.md', '# P1\n');
    const summary = await fs.exportZip(
      ['_Projects/P1/05_DELIVERABLES', '_Projects/P1/README.md'],
      'D:/Exports/handover.zip'
    );
    expect(summary).toEqual({ files: 2, bytes: 5005 });
    expect(fs.exports.get('D:/Exports/handover.zip')).toEqual([
      '_Projects/P1/05_DELIVERABLES/hero.png',
      '_Projects/P1/README.md'
    ]);
    await expect(fs.exportZip(['_Projects'], 'out.txt')).rejects.toThrow(/\.zip/);
  });

  it('notifies listeners until unsubscribed', async () => {
    const seen: string[][] = [];
    const stop = await fs.onChange((paths) => seen.push(paths));
    await fs.writeText('_Notes/a.md', 'a');
    await fs.ensureDirs(['_Finance/Quotes']);
    stop();
    await fs.writeText('_Notes/b.md', 'b');
    expect(seen).toEqual([['_Notes/a.md'], ['_Finance/Quotes']]);
  });

  it('reads and writes JSON helpers', async () => {
    expect(await readJson(fs, '_Team/_Config/preferences.json', { theme: 'dark' })).toEqual({
      theme: 'dark'
    });
    await writeJson(fs, '_Team/_Config/preferences.json', { theme: 'light' });
    expect(await fs.readText('_Team/_Config/preferences.json')).toBe('{\n  "theme": "light"\n}\n');
    expect(await readJson(fs, '_Team/_Config/preferences.json', {})).toEqual({ theme: 'light' });
  });
});
