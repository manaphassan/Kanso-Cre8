import { describe, expect, it } from 'vitest';
import { sampleVault } from '$lib/vault/sampleVault';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import { encodeDeliverableId } from '$lib/domain/deliverables';
import {
  collectProjectAssets,
  exportHandover,
  planHandover,
  suggestedHandoverFilename
} from './handover';
import { buildHandoverDoc, formatBytes, generateDeliveryMarkdown, studioIdentity } from './manifest';
import { generateHtmlSummary } from './summaryHtml';

const NOW = new Date(Date.UTC(2026, 8, 15, 9, 0, 0));
const FOLDER = '202609_0001D_ACME_MobileAppIllustration';
const ACME_PATH = `_Projects/2026/${FOLDER}`;
const ACME = { fullPath: ACME_PATH, folderName: FOLDER, jobId: '0001D', brand: 'ACME' };
const CLIENT = { code: 'ACME', name: 'Acme Corporation' };
const ASCII = /^[\x09\x0a\x0d\x20-\x7e]*$/;

describe('handover planning', () => {
  it('packs deliverables, copy and brief with SHA-256 checksums', async () => {
    const fs = sampleVault(NOW);
    const plan = await planHandover(fs, ACME, {}, {}, CLIENT, NOW);
    expect(plan.prefix).toBe(ACME_PATH);
    expect(plan.paths).toEqual([
      `${ACME_PATH}/05_DELIVERABLES/Isometric_Icons_16x_Set.svg`,
      `${ACME_PATH}/05_DELIVERABLES/Mobile_Banking_Hero_3D.png`,
      `${ACME_PATH}/03_COPY/COPY.md`,
      `${ACME_PATH}/README.md`
    ]);
    expect(plan.extras.map((e) => e.name)).toEqual(['DELIVERY.md', 'HANDOVER_SUMMARY.html']);

    const { preview } = plan;
    expect(preview).toMatchObject({ jobId: '0001D', projectTitle: FOLDER, clientCode: 'ACME', clientName: 'Acme Corporation', totalAssets: 4 });
    expect(preview.assets.map((a) => [a.relPath, a.format])).toEqual([
      ['05_DELIVERABLES/Isometric_Icons_16x_Set.svg', 'SVG'],
      ['05_DELIVERABLES/Mobile_Banking_Hero_3D.png', 'PNG'],
      ['03_COPY/COPY.md', 'Markdown'],
      ['README.md', 'Markdown']
    ]);
    expect(preview.assets[0]).not.toHaveProperty('vaultPath');
    const hash = await fs.sha256(`${ACME_PATH}/05_DELIVERABLES/Mobile_Banking_Hero_3D.png`);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(preview.assets[1]).toMatchObject({ sha256: hash, sizeBytes: 64, sizeFormatted: '64 B' });
    expect(preview.totalSizeBytes).toBe(preview.assets.reduce((s, a) => s + a.sizeBytes, 0));
    expect(preview.deliveryMd).toContain('DELIVERY.md');
    expect(preview.deliveryMd).toContain(hash);
    expect(preview.htmlSummary).toContain('Mobile_Banking_Hero_3D.png');
    expect(plan.extras[0].text).toBe(preview.deliveryMd);
  });

  it('honours includeWip, includeBrief, includeCopy and includeManifest', async () => {
    const fs = sampleVault(NOW);
    const plan = await planHandover(
      fs,
      ACME,
      { includeWip: true, includeBrief: false, includeCopy: false, includeManifest: false },
      {},
      CLIENT,
      NOW
    );
    expect(plan.preview.assets.map((a) => a.relPath)).toEqual([
      '05_DELIVERABLES/Isometric_Icons_16x_Set.svg',
      '05_DELIVERABLES/Mobile_Banking_Hero_3D.png',
      '04_WIP/Card_Design_Preview_WIP.png'
    ]);
    expect(plan.extras.map((e) => e.name)).toEqual(['HANDOVER_SUMMARY.html']);
    expect(plan.preview.deliveryMd).toContain('total_assets: 3');
  });

  it('filters deliverables by filename, legacy path or deliverable id', async () => {
    const fs = sampleVault(NOW);
    const hero = `${ACME_PATH}/05_DELIVERABLES/Mobile_Banking_Hero_3D.png`;
    const byName = await planHandover(fs, ACME, { selectedFiles: ['Mobile_Banking_Hero_3D.png'], includeBrief: false, includeCopy: false }, {}, CLIENT, NOW);
    expect(byName.paths).toEqual([hero]);
    const byLegacy = await planHandover(fs, ACME, { selectedFiles: ['Deliverables/Mobile_Banking_Hero_3D.png'] }, {}, CLIENT, NOW);
    expect(byLegacy.paths).toEqual([hero, `${ACME_PATH}/03_COPY/COPY.md`, `${ACME_PATH}/README.md`]);
    const byId = await planHandover(fs, ACME, { selectedFiles: [encodeDeliverableId(hero)], includeBrief: false, includeCopy: false }, {}, CLIENT, NOW);
    expect(byId.paths).toEqual([hero]);
  });

  it('skips hidden files, lock files and Thumbs.db and reads job id and client from the README', async () => {
    const fs = new MemoryVaultFs({
      'P/README.md': '---\njob_id: ACME-2026-099\nclient: nex\ntitle: Acme Campaign\nrevision: 3\n---\n# Acme Campaign\n',
      'P/05_DELIVERABLES/Hero_Motion_Teaser.mp4': 'Binary Video Simulation Content 12345',
      'P/05_DELIVERABLES/.DS_Store': 'x',
      'P/05_DELIVERABLES/Thumbs.db': 'x',
      'P/05_DELIVERABLES/~lock~Hero.psd#': 'x',
      'P/05_DELIVERABLES/Sizes/archive': 'raw'
    });
    const plan = await planHandover(fs, { fullPath: 'P', folderName: 'P' }, {}, null, null, NOW);
    expect(plan.preview.assets.map((a) => [a.relPath, a.format])).toEqual([
      ['05_DELIVERABLES/Hero_Motion_Teaser.mp4', 'MP4'],
      ['05_DELIVERABLES/Sizes/archive', 'BIN'],
      ['README.md', 'Markdown']
    ]);
    expect(plan.preview).toMatchObject({ jobId: 'ACME-2026-099', projectTitle: 'Acme Campaign', clientCode: 'NEX', clientName: 'nex' });
    expect(plan.preview.deliveryMd).toContain('Rev 3');
    expect((await collectProjectAssets(fs, 'P', { includeBrief: false })).map((a) => a.vaultPath)).toEqual([
      'P/05_DELIVERABLES/Hero_Motion_Teaser.mp4',
      'P/05_DELIVERABLES/Sizes/archive'
    ]);
    await expect(planHandover(fs, { fullPath: 'Missing', folderName: 'Missing' }, {}, null, null, NOW)).rejects.toThrow(
      'Project folder not found.'
    );
  });

  it('writes the ZIP with the project folder stripped from entry names', async () => {
    const fs = sampleVault(NOW);
    const plan = await planHandover(fs, ACME, {}, {}, CLIENT, NOW);
    const result = await exportHandover(fs, plan, 'D:/Exports/acme.zip');
    expect(result).toMatchObject({ success: true, dest: 'D:/Exports/acme.zip', files: 6 });
    expect(fs.exports.get('D:/Exports/acme.zip')).toEqual([
      '03_COPY/COPY.md',
      '05_DELIVERABLES/Isometric_Icons_16x_Set.svg',
      '05_DELIVERABLES/Mobile_Banking_Hero_3D.png',
      'DELIVERY.md',
      'HANDOVER_SUMMARY.html',
      'README.md'
    ]);
    expect(fs.exportExtras.get('D:/Exports/acme.zip')?.[0].text).toBe(plan.preview.deliveryMd);
  });

  it('suggests a dated, file-system safe ZIP name', () => {
    expect(suggestedHandoverFilename(ACME, NOW)).toBe(`${FOLDER}_Handover_2026-09-15.zip`);
    expect(suggestedHandoverFilename({ fullPath: '_Projects/2026/A:B?', folderName: '' }, NOW)).toBe('A_B__Handover_2026-09-15.zip');
  });
});

describe('DELIVERY.md and HTML summary', () => {
  const studio = {
    name: 'Kanso Studio',
    registration_no: '202601001234',
    remittance: { bank_name: 'Lumina Savings Bank', account_no: '5140 1234 5678', duitnow_id: '1234567890' }
  };
  const assets = [
    { relPath: '05_DELIVERABLES/Hero_Motion_Teaser.mp4', filename: 'Hero_Motion_Teaser.mp4', format: 'MP4', sizeBytes: 1024, sizeFormatted: '1 KB', sha256: 'a'.repeat(64) }
  ];
  const fm = { job_id: 'ACME-2026-099', client: 'ACME', designer: '0001D', title: 'Acme Campaign' };

  it('stamps checksums, remittance and studio identity (server case)', () => {
    const doc = buildHandoverDoc({ folderName: 'Acme-2026-099' }, fm, assets, studio, CLIENT, NOW);
    const md = generateDeliveryMarkdown(doc);
    expect(md).toContain('DELIVERY.md');
    expect(md).toContain('a'.repeat(64));
    expect(md).toContain('5140 1234 5678');
    expect(md).toContain('Lumina Savings Bank');
    expect(md).toContain('`1234567890`');
    expect(md).toContain('delivered_date: "2026-09-15"');
    expect(md).toContain('title: "Creative Handover - Acme Campaign"');
    expect(md).toMatch(ASCII);
    expect(generateHtmlSummary(doc)).toMatch(ASCII);
  });

  it('reads the studio profile view keys with the server defaults', () => {
    expect(studioIdentity({ studioName: 'Acme Design Studio', bankName: 'Acme Federal Bank', accountNumber: '0000', swift_bic: 'ACMEUS33', signature_text: 'Alex' })).toMatchObject({
      studioName: 'Acme Design Studio',
      principalName: 'Alex Mercer',
      bankName: 'Acme Federal Bank',
      accountNo: '0000',
      accountHolder: 'Acme Design Studio',
      swiftOrDuitNow: 'SWIFT: ACMEUS33',
      paymentTerms: 'Net 14 Days',
      signed: true
    });
    expect(studioIdentity(null)).toMatchObject({ swiftOrDuitNow: 'ACMEUS33', registrationNo: '2026-ACME-0001', signed: false });
  });

  it('escapes HTML and table cells from vault data', () => {
    const doc = buildHandoverDoc({ folderName: 'P' }, { title: '<b>A|B</b>' }, assets, {}, null, NOW);
    const html = generateHtmlSummary(doc);
    expect(html).toContain('&lt;b&gt;A|B&lt;/b&gt;');
    expect(html).not.toContain('<b>');
    expect(generateDeliveryMarkdown(doc)).toContain('**<b>A\\|B</b>**');
  });

  it('formats sizes like the server', () => {
    expect([0, 64, 1024, 1536, 5 * 1024 ** 2].map(formatBytes)).toEqual(['0 B', '64 B', '1 KB', '1.5 KB', '5 MB']);
  });
});
