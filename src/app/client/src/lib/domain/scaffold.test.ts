import { describe, expect, it } from 'vitest';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import { decodeBase64, highestJobNumber, jobLetter, resolveIngestFolder, safeIngestName, scaffoldProject } from './scaffold';

const NOW = new Date(Date.UTC(2026, 8, 15, 9, 0, 0));

describe('scaffoldProject (finance contract)', () => {
  it('scaffolds into an empty vault with quote links and numbering from 0001', async () => {
    const fs = new MemoryVaultFs();
    fs.now = () => NOW;
    const res = await scaffoldProject(fs, {
      title: 'Brand System / Phase 1',
      clientCode: 'LUM',
      clientName: 'Lumina Labs',
      budget: '4500',
      currency: 'USD',
      deadline: '2026-10-30',
      deliverableType: 'Brand Identity',
      linkedQuoteId: 'QUOTE-2026-001'
    }, NOW);
    expect(res.folderName).toBe('202609_0001P_LUM_Brand_System_Phase_1');
    expect(res.targetDir).toBe('_Projects/2026/202609_0001P_LUM_Brand_System_Phase_1');
    expect(res.project).toMatchObject({ id: res.folderName, fullPath: res.targetDir, jobId: '0001P', presetType: 'Brand Identity', deadline: '2026-10-30', deliverableCount: 0 });
    const readme = await fs.readText(`${res.targetDir}/README.md`);
    expect(readme).toContain('linkedQuoteId: QUOTE-2026-001');
    expect(readme).toContain('budget: 4500');
    expect(readme).not.toContain('linkedInvoiceId');

    const next = await scaffoldProject(fs, { title: 'Reel', clientCode: 'NEX', deliverableType: 'Video' }, NOW);
    expect(next.folderName).toBe('202609_0002V_NEX_Reel');
    expect(await highestJobNumber(fs)).toBe(2);
  });

  it('falls back to defaults for empty options', async () => {
    const fs = new MemoryVaultFs();
    const res = await scaffoldProject(fs, {}, NOW);
    expect(res.folderName).toBe('202609_0001D_ACME_Untitled_Project');
    expect(res.project).toMatchObject({ status: 'in-progress', priority: 'normal', designer: 'alex.mercer', deadline: '2026-09-29' });
  });
});

describe('ingest helpers', () => {
  it('maps folders, cleans names and decodes base64', () => {
    expect(jobLetter('Social Media')).toBe('S');
    expect(resolveIngestFolder('03_COPY', [])).toBe('03_COPY');
    expect(resolveIngestFolder('01_BRIEF_ASSETS', [])).toBe('01_BRIEF');
    expect(resolveIngestFolder('01_BRIEF_ASSETS', ['01_BRIEF_ASSETS'])).toBe('01_BRIEF_ASSETS');
    expect(resolveIngestFolder('', [])).toBe('01_BRIEF');
    expect(safeIngestName('C:\\Users\\x\\My File (1).png')).toBe('My_File__1_.png');
    expect(() => safeIngestName('')).toThrow();
    expect(new TextDecoder().decode(decodeBase64(`data:text/plain;base64,${btoa('hi')}`))).toBe('hi');
  });
});
