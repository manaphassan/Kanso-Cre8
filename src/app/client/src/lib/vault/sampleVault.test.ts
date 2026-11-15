import { describe, expect, it } from 'vitest';
import { SAMPLE_PATHS, sampleVault } from './sampleVault';

describe('sampleVault', () => {
  it('loads the canonical sample workspace', async () => {
    expect(SAMPLE_PATHS).toContain('_Clients/ACME_AcmeCorp/client.md');
    expect(SAMPLE_PATHS).toContain('_Projects/2026/202609_0001D_ACME_MobileAppIllustration/README.md');
    const fs = sampleVault();
    expect(await fs.readText('_Clients/ACME_AcmeCorp/client.md')).toMatch(/^---\n/);
    const entries = await fs.scan('_Projects');
    expect(entries.some((e) => e.path.endsWith('Mobile_Banking_Hero_3D.png') && e.size === 64)).toBe(true);
  });
});
