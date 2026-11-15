import { describe, expect, it } from 'vitest';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import { SAMPLE_PATHS, sampleVault } from '$lib/vault/sampleVault';
import { clearDemoData, demoStatus, DemoSource, inspectDemoData, isDemoPath, loadDemoData } from './demoData';

const NOW = new Date(Date.UTC(2026, 8, 15, 9, 0, 0));
const ACME_PROJECT = '_Projects/2026/202609_0001D_ACME_MobileAppIllustration';

function emptyVault(files: Record<string, string> = {}) {
  const fs = new MemoryVaultFs(files);
  fs.now = () => NOW;
  return fs;
}

const source = () => DemoSource.from(sampleVault(NOW));

describe('demo data', () => {
  it('is off and absent on a fresh vault', async () => {
    const status = await demoStatus(emptyVault(), await source());
    expect(status).toEqual({ enabled: false, present: false, counts: {}, totalFiles: 0, items: [] });
  });

  it('loads the sample workspace without config, retired files or the scratchpad', async () => {
    const fs = emptyVault();
    const res = await loadDemoData(fs, await source());
    const expected = SAMPLE_PATHS.filter(isDemoPath);
    expect(res.created.sort()).toEqual(expected);
    expect(res.errors).toEqual([]);
    expect(res.enabled).toBe(true);
    expect(res.counts).toEqual({ client: 3, project: 3, quote: 3, invoice: 3, note: 4, journal: 8 });
    expect(res.totalFiles).toBe(expected.length);
    expect(fs.paths()).not.toContain('_Team/team-notes.json');
    expect(fs.paths()).not.toContain('_Notes/Scratchpad.md');
    expect(await fs.readText('_Clients/ACME_AcmeCorp/client.md')).toMatch(/^---\n/);
    expect((await fs.listDir(`${ACME_PROJECT}/05_DELIVERABLES`)).map((e) => e.size)).toEqual([64, 64]);
    expect(JSON.parse(await fs.readText('_Team/_Config/preferences.json')).demo_data).toBe(true);
  });

  it('never overwrites an existing user file', async () => {
    const fs = emptyVault({ '_Journal/Daily/2026-09-14.md': '# My real day\n' });
    const res = await loadDemoData(fs, await source());
    expect(res.kept).toEqual(['_Journal/Daily/2026-09-14.md']);
    expect(await fs.readText('_Journal/Daily/2026-09-14.md')).toBe('# My real day\n');
    // The user's own file at a sample path is not demo data.
    const items = await inspectDemoData(fs, await source());
    expect(items.some((i) => i.label === '2026-09-14.md')).toBe(false);
  });

  it('clears only unchanged demo items by archiving them, and keeps user work (server case)', async () => {
    const fs = emptyVault();
    const src = await source();
    await loadDemoData(fs, src);
    fs.put('_Clients/ZZZ_Mine/client.md', '---\nname: Mine\ncode: ZZZ\n---\n');
    fs.put('_Clients/NEX_NexusStudio/brand-notes.txt', 'mine');
    await fs.writeText(`${ACME_PROJECT}/README.md`, '---\nstatus: review\n---\n# Edited\n');
    await fs.writeText('_Finance/Quotes/QUOTE-2026-002_NEX.md', '---\nid: QUOTE-2026-002\n---\nEdited by me\n');

    const res = await clearDemoData(fs, src);
    expect(res.skipped).toEqual([
      { label: 'NEX_NexusStudio', reason: 'contains your own files' },
      { label: '202609_0001D_ACME_MobileAppIllustration', reason: 'you edited 1 file(s)' }
    ]);
    // A fully edited single file is the user's now: kept, and no longer listed as demo data.
    expect(await fs.readText('_Finance/Quotes/QUOTE-2026-002_NEX.md')).toContain('Edited by me');
    expect(res.removed.some((r) => r.label === 'QUOTE-2026-002_NEX.md')).toBe(false);
    expect(res.removed.find((r) => r.label === 'ACME_AcmeCorp')).toMatchObject({
      kind: 'client',
      archivedTo: '_Archive/20260915-090000/_Clients/ACME_AcmeCorp'
    });
    expect(fs.paths()).toContain('_Archive/20260915-090000/_Clients/ACME_AcmeCorp/client.md');
    expect(fs.paths()).not.toContain('_Clients/ACME_AcmeCorp');
    expect(fs.paths()).toContain('_Clients/ZZZ_Mine/client.md');
    expect(fs.paths()).toContain('_Clients/NEX_NexusStudio/brand-notes.txt');
    expect(await fs.readText(`${ACME_PROJECT}/README.md`)).toContain('# Edited');
    expect(fs.paths()).toContain(`${ACME_PROJECT}/05_DELIVERABLES/Mobile_Banking_Hero_3D.png`);

    const after = await demoStatus(fs, src);
    expect(after.enabled).toBe(false);
    expect(after.counts.note).toBeUndefined();
    expect(after.counts.invoice).toBeUndefined();
    expect(after.items.map((i) => i.label).sort()).toEqual(['202609_0001D_ACME_MobileAppIllustration', 'NEX_NexusStudio']);
  });
});
