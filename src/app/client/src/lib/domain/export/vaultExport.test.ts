import { describe, expect, it } from 'vitest';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import { SAMPLE_PATHS, sampleVault } from '$lib/vault/sampleVault';
import { exportVault, planVaultExport, suggestedVaultFilename, VAULT_COMPARTMENTS } from './vaultExport';

const NOW = new Date(Date.UTC(2026, 8, 15, 9, 0, 0));
const ASCII = /^[\x09\x0a\x0d\x20-\x7e]*$/;

describe('full vault export', () => {
  it('packs the 6 canonical compartments with a manifest (server case)', async () => {
    const fs = new MemoryVaultFs({
      '_Clients/ACME.md': '# Acme Corp\n',
      '_Notes/01_Fleeting/Idea.md': '# Fleeting Idea\n',
      '_Notes/.obsidian/workspace.json': '{}',
      '_Notes/01_Fleeting/.DS_Store': 'x',
      '_Archive/20260101-000000/_Notes/Old.md': '# old\n',
      'loose.md': '# not a compartment\n'
    });
    await fs.ensureDirs(['_Finance/Invoices', '_Projects/2026/ACME-01', '_Journal/Daily', '_Team/_Config']);
    const plan = await planVaultExport(fs, NOW);
    expect(plan.paths).toEqual(['_Clients/ACME.md', '_Notes/01_Fleeting/Idea.md']);
    expect(plan.preview.compartments.map((c) => [c.name, c.files])).toEqual([
      ['_Clients', 1],
      ['_Finance', 0],
      ['_Projects', 0],
      ['_Journal', 0],
      ['_Notes', 1],
      ['_Team', 0]
    ]);
    expect(plan.extras.map((e) => e.name)).toEqual(['VAULT_MANIFEST.md']);
    const manifest = plan.extras[0].text;
    expect(manifest).toContain('total_files: 2');
    expect(manifest).toContain('exported_at: "2026-09-15T09:00:00.000Z"');
    expect(manifest).toContain('compartments: ["_Clients", "_Finance", "_Projects", "_Journal", "_Notes", "_Team"]');
    expect(manifest).toMatch(ASCII);
    expect(manifest.toLowerCase()).not.toContain('zettel');

    const result = await exportVault(fs, plan, 'D:/Exports/vault.zip');
    expect(result).toEqual({ success: true, files: 3, bytes: result.bytes, dest: 'D:/Exports/vault.zip' });
    expect(fs.exports.get('D:/Exports/vault.zip')).toEqual(['VAULT_MANIFEST.md', '_Clients/ACME.md', '_Notes/01_Fleeting/Idea.md']);
  });

  it('exports every sample file inside the compartments', async () => {
    const fs = sampleVault(NOW);
    const plan = await planVaultExport(fs, NOW);
    const expected = SAMPLE_PATHS.filter((p) => (VAULT_COMPARTMENTS as readonly string[]).includes(p.split('/')[0]));
    expect([...plan.paths].sort()).toEqual(expected);
    expect(plan.preview.totalFiles).toBe(expected.length);
    expect(plan.preview.totalSizeBytes).toBe(plan.preview.compartments.reduce((s, c) => s + c.bytes, 0));
  });

  it('works on an empty vault and suggests the server file name', async () => {
    const plan = await planVaultExport(new MemoryVaultFs(), NOW);
    expect(plan.paths).toEqual([]);
    expect(plan.preview).toMatchObject({ totalFiles: 0, totalSizeFormatted: '0 B', compartments: [] });
    expect(suggestedVaultFilename(NOW)).toBe('Kanso_Vault_Archive_2026-09-15.zip');
  });
});
