import { describe, expect, it } from 'vitest';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import { sampleVault } from '$lib/vault/sampleVault';
import { formatBytes, healthScore, vaultHealthReport } from './vaultHealth';

const NOW = new Date(Date.UTC(2026, 9, 18, 9, 0, 0));

describe('vaultHealthReport', () => {
  it('audits broken WikiLinks, orphan notes, frontmatter schema, conflicts and compartments (server case)', async () => {
    const fs = new MemoryVaultFs();
    fs.now = () => NOW;
    await fs.ensureDirs(['_Clients', '_Finance/Quotes', '_Projects', '_Journal', '_Notes/01_Fleeting', '_Notes/03_Permanent', '_Team']);
    fs.put(
      '_Notes/01_Fleeting/CallNotes.md',
      '---\ntitle: Call Notes\nid: note_call_01\ntype: fleeting\n---\nDiscussed packaging specs with [[ACME]]. Also check [[GhostNoteReference]] for details.\n'
    );
    fs.put(
      '_Notes/03_Permanent/SolitaryRule.md',
      '---\ntitle: Solitary Rule\nid: note_solitary_01\ntype: permanent\n---\nThis is a standalone design principle with no links.\n'
    );
    fs.put('_Finance/Quotes/Q-2026-999.md', '---\nclient: ACME\ndate: 2026-10-18\n---\n# Quote missing documentNumber and total\n');
    fs.put('_Notes/01_Fleeting/CallNotes (conflicted copy 2026-10-18).md', 'Conflicted content copy');
    fs.put('_Finance/Quotes/Q-2026-998.md', '# No frontmatter at all\n');

    const report = await vaultHealthReport(fs, 'D:/Vault', NOW);
    expect(report.vaultExists).toBe(true);
    expect(report.workspaceRoot).toBe('D:/Vault');
    expect(report.lastScannedAt).toBe(NOW.toISOString());
    expect(report.compartments.map((c) => [c.name, c.exists])).toEqual([
      ['_Clients', true], ['_Finance', true], ['_Projects', true], ['_Journal', true], ['_Notes', true], ['_Team', true]
    ]);

    expect(report.brokenWikiLinks.map((b) => b.target)).toEqual(['GhostNoteReference']);
    expect(report.brokenWikiLinks[0]).toMatchObject({ sourceFile: '_Notes/01_Fleeting/CallNotes.md', sourceTitle: 'Call Notes' });

    expect(report.orphanNotes.map((o) => o.title)).toContain('Solitary Rule');
    expect(report.orphanNotes.find((o) => o.title === 'Solitary Rule')).toMatchObject({ category: '03_Permanent', id: 'note_solitary_01' });

    const quote = report.frontmatterIssues.find((i) => i.file === '_Finance/Quotes/Q-2026-999.md');
    expect(quote?.issue).toBe('Quote requires a documentNumber or id');
    expect(report.frontmatterIssues.find((i) => i.file === '_Finance/Quotes/Q-2026-998.md')?.issue).toMatch(/Missing YAML frontmatter/);

    expect(report.syncConflicts.map((c) => c.filename)).toEqual(['CallNotes (conflicted copy 2026-10-18).md']);
    expect(report.score).toBeLessThan(100);
    expect(report.storageSummary.totalFiles).toBe(5);
  });

  it('reports a missing compartment and counts incoming links', async () => {
    const fs = new MemoryVaultFs({
      '_Notes/a.md': '---\ntitle: Alpha\n---\nSee [[Beta]].\n',
      '_Notes/b.md': '---\ntitle: Beta\n---\nNo links.\n',
      '_Notes/Scratchpad.md': 'scratch'
    });
    const report = await vaultHealthReport(fs, '', NOW);
    expect(report.compartments.filter((c) => !c.exists).map((c) => c.name)).toEqual(['_Clients', '_Finance', '_Projects', '_Journal', '_Team']);
    expect(report.orphanNotes).toEqual([]);
    expect(report.brokenWikiLinks).toEqual([]);
    expect(report.orphanNotes.some((o) => o.relPath === '_Notes/Scratchpad.md')).toBe(false);
  });

  it('resolves sample-vault links to clients, projects and notes', async () => {
    const report = await vaultHealthReport(sampleVault(), 'D:/Vault', NOW);
    expect(report.compartments.every((c) => c.exists)).toBe(true);
    expect(report.brokenWikiLinks.map((b) => b.target)).not.toContain('202609_0001D_ACME_MobileAppIllustration');
    expect(report.brokenWikiLinks.map((b) => b.target)).not.toContain('ACME');
    expect(report.syncConflicts).toEqual([]);
    expect(report.storageSummary.totalFiles).toBeGreaterThan(30);
  });
});

describe('score and formatting', () => {
  it('matches the server penalties and thresholds', () => {
    expect(healthScore({ broken: 0, frontmatter: 0, conflicts: 0, orphans: 0 })).toEqual({ score: 100, status: 'pristine' });
    expect(healthScore({ broken: 1, frontmatter: 0, conflicts: 0, orphans: 1 })).toEqual({ score: 93, status: 'healthy' });
    expect(healthScore({ broken: 10, frontmatter: 10, conflicts: 10, orphans: 10 })).toEqual({ score: 0, status: 'critical' });
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});
