import { describe, expect, it } from 'vitest';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import { cleanAllSyncConflicts, detectConflict, resolveSyncConflict, scanSyncConflicts } from './syncConflicts';

const NOW = new Date(Date.UTC(2026, 8, 15, 9, 0, 0));

function vault(files: Record<string, string | Uint8Array>) {
  const fs = new MemoryVaultFs();
  fs.now = () => NOW;
  for (const [p, c] of Object.entries(files)) fs.put(p, c);
  return fs;
}

const none = new Set<string>();

describe('detectConflict', () => {
  it('recognises the confirmed Dropbox and Syncthing markers without a sibling', () => {
    expect(detectConflict("client (Acme's conflicted copy 2026-10-17).md", none)).toMatchObject({ base: 'client.md', provider: 'dropbox', inferred: false });
    expect(detectConflict('CallNotes (conflicted copy 2026-10-18).md', none)?.base).toBe('CallNotes.md');
    expect(detectConflict("Brief (Alex's conflicted copy 2026-09-15 (1)).md", none)?.base).toBe('Brief.md');
    expect(detectConflict('Logo (Case Conflict).svg', none)?.base).toBe('Logo.svg');
    expect(detectConflict('notes.sync-conflict-20260915-101500-ABCDEF1.md', none)).toMatchObject({ base: 'notes.md', provider: 'syncthing' });
    expect(detectConflict('notes.sync-temp-12345.md', none)?.base).toBe('notes.md');
    expect(detectConflict('Plan (conflict).md', none)?.base).toBe('Plan.md');
  });

  it('matches OneDrive machine-name copies only when the base file exists', () => {
    expect(detectConflict('README-DESKTOP-AB12CD.md', new Set(['README.md']))).toMatchObject({ base: 'README.md', provider: 'onedrive', inferred: true });
    expect(detectConflict('README-DESKTOP-AB12CD.md', none)).toBeNull();
    expect(detectConflict('README-desktop.md', new Set(['README.md']))).toBeNull();
    expect(detectConflict('2026-09-15.md', new Set(['2026-09.md', '2026.md']))).toBeNull();
    expect(detectConflict('INV-2026-001_ACME.md', new Set(['INV.md']))).toBeNull();
  });

  it('matches Google Drive numbered copies only when the base file exists', () => {
    expect(detectConflict('Brief (1).md', new Set(['Brief.md']))).toMatchObject({ base: 'Brief.md', provider: 'google-drive', inferred: true });
    expect(detectConflict('Hero (2).png', new Set(['Hero.png']))?.base).toBe('Hero.png');
    expect(detectConflict('Brief (1).md', none)).toBeNull();
    expect(detectConflict('Brief.md', new Set(['Brief.md']))).toBeNull();
  });
});

describe('scanSyncConflicts', () => {
  it('reports vault-relative paths and base details from one scan, ignoring _Archive', async () => {
    const fs = vault({
      '_Clients/ACME_AcmeCorp/client.md': '---\ncode: ACME\n---\n',
      "_Clients/ACME_AcmeCorp/client (Acme's conflicted copy 2026-10-17).md": '---\ncode: ACME\nname: Remote\n---\n',
      '_Archive/20260101-000000/_Notes/a (conflicted copy).md': 'old'
    });
    const conflicts = await scanSyncConflicts(fs);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      filename: "client (Acme's conflicted copy 2026-10-17).md",
      conflictPath: "_Clients/ACME_AcmeCorp/client (Acme's conflicted copy 2026-10-17).md",
      baseFilename: 'client.md',
      basePath: '_Clients/ACME_AcmeCorp/client.md',
      baseExists: true,
      provider: 'dropbox'
    });
    expect(conflicts[0].mtime).toBe(NOW.toISOString());
  });
});

describe('resolveSyncConflict', () => {
  const base = '_Notes/01_Fleeting/Meeting_Notes.md';
  const copy = "_Notes/01_Fleeting/Meeting_Notes (Sarah's conflicted copy 2026-09-15).md";

  it('keep_local archives the copy and leaves the base as it was', async () => {
    const fs = vault({ [base]: '# Local Master\n', [copy]: '# Conflicted\n' });
    const res = await resolveSyncConflict(fs, copy, 'keep_local');
    expect(res).toMatchObject({ success: true, resolution: 'keep_local', conflictPath: copy, archivedTo: `_Archive/20260915-090000/${copy}` });
    expect(await fs.readText(base)).toBe('# Local Master\n');
    expect(await fs.readText(res.archivedTo)).toBe('# Conflicted\n');
    expect(fs.paths()).not.toContain(copy);
  });

  it('keep_conflict and keep_cloud write the copy over the base, then archive the copy', async () => {
    for (const resolution of ['keep_conflict', 'keep_cloud']) {
      const fs = vault({ [base]: '# Local Master\n', [copy]: '# Cloud\n' });
      const res = await resolveSyncConflict(fs, copy, resolution);
      expect(await fs.readText(base)).toBe('# Cloud\n');
      expect(await fs.readText(res.archivedTo)).toBe('# Cloud\n');
      expect(fs.paths()).not.toContain(copy);
    }
  });

  it('copies binary files with copyWithin', async () => {
    const fs = vault({ 'art/Hero.png': new Uint8Array([1]), 'art/Hero (1).png': new Uint8Array([2, 2]) });
    await resolveSyncConflict(fs, 'art/Hero (1).png', 'keep_cloud');
    expect((await fs.listDir('art')).map((e) => [e.path, e.size])).toEqual([['art/Hero.png', 2]]);
  });

  it('archive moves the copy into _Archive (never deletes)', async () => {
    const fs = vault({ [base]: 'a', [copy]: 'b' });
    const res = await resolveSyncConflict(fs, copy, 'archive');
    expect(res.archivedTo.startsWith('_Archive/')).toBe(true);
    expect(fs.paths()).toContain(res.archivedTo);
  });

  it('rejects missing files, non-conflicts and unknown strategies', async () => {
    const fs = vault({ [base]: 'a', [copy]: 'b' });
    await expect(resolveSyncConflict(fs, '_Notes/none (conflicted copy).md')).rejects.toThrow(/not found/);
    await expect(resolveSyncConflict(fs, base, 'keep_cloud')).rejects.toThrow(/not a sync conflict/);
    await expect(resolveSyncConflict(fs, copy, 'nuke')).rejects.toThrow(/Unknown resolution/);
    expect(fs.paths()).toContain(copy);
  });
});

describe('cleanAllSyncConflicts', () => {
  it('resolves confirmed copies and leaves inferred ones for the user', async () => {
    const fs = vault({
      '_Notes/CallNotes.md': 'base',
      '_Notes/CallNotes (conflicted copy 2026-10-18).md': 'copy',
      '_Notes/README.md': 'readme',
      '_Notes/README-DESKTOP-AB12CD.md': 'readme copy'
    });
    const res = await cleanAllSyncConflicts(fs, 'keep_local');
    expect(res).toMatchObject({ success: true, resolvedCount: 1, totalCount: 2 });
    expect(res.details.find((d) => d.conflict === 'README-DESKTOP-AB12CD.md')).toMatchObject({ success: false, skipped: true });
    expect(fs.paths()).toContain('_Notes/README-DESKTOP-AB12CD.md');
    expect(fs.paths()).not.toContain('_Notes/CallNotes (conflicted copy 2026-10-18).md');
  });
});
