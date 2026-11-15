import { describe, expect, it } from 'vitest';
import { routeHarness } from '../testing';
import { exportRoutes, handoverOptions } from './export';

const FOLDER = '202609_0001D_ACME_MobileAppIllustration';
const ACME_PATH = `_Projects/2026/${FOLDER}`;

describe('export routes on the sample vault', () => {
  it('previews a handover like the server (job id lookup, studio and client stamping)', async () => {
    const { call } = routeHarness([exportRoutes], { sample: true });
    const res = await call('GET', '/projects/0001D/export/preview');
    expect(res.success).toBe(true);
    expect(res.filename).toBe(`${FOLDER}_Handover_2026-09-15.zip`);
    expect(res.preview).toMatchObject({
      jobId: '0001D',
      projectTitle: FOLDER,
      clientCode: 'ACME',
      clientName: 'Acme Corporation',
      totalAssets: 4
    });
    expect(Object.keys(res.preview).sort()).toEqual(
      ['assets', 'clientCode', 'clientName', 'deliveryMd', 'htmlSummary', 'jobId', 'projectTitle', 'totalAssets', 'totalSizeBytes', 'totalSizeFormatted'].sort()
    );
    expect(Object.keys(res.preview.assets[0]).sort()).toEqual(['filename', 'format', 'relPath', 'sha256', 'sizeBytes', 'sizeFormatted']);
    expect(res.preview.deliveryMd).toContain('Acme Design Studio');
    expect(res.preview.deliveryMd).toContain('`0000-0000-0000`');
    expect(res.preview.deliveryMd).toContain('Lead Designer** | alex.mercer');
  });

  it('reads the query string the ApiClient sends (wip, brief, copy, files)', async () => {
    const { call } = routeHarness([exportRoutes], { sample: true });
    const res = await call('GET', `/projects/${FOLDER}/export/preview?wip=true&brief=false&copy=false&files=Mobile_Banking_Hero_3D.png,Card_Design_Preview_WIP.png`);
    expect(res.preview.assets.map((a: any) => a.relPath)).toEqual([
      '05_DELIVERABLES/Mobile_Banking_Hero_3D.png',
      '04_WIP/Card_Design_Preview_WIP.png'
    ]);
    await expect(call('GET', '/projects/nope/export/preview')).rejects.toMatchObject({ status: 404 });
  });

  it('writes the handover ZIP to the chosen destination', async () => {
    const { call, fs, events } = routeHarness([exportRoutes], { sample: true });
    const dest = 'D:\\Exports\\Acme Handover.zip';
    const res = await call('POST', '/projects/0001D/export', { dest, includeWip: true, includeManifest: true });
    expect(res).toMatchObject({ success: true, dest, filename: 'Acme Handover.zip', files: 7 });
    expect(res.bytes).toBeGreaterThan(0);
    expect(fs.exports.get(dest)).toEqual([
      '03_COPY/COPY.md',
      '04_WIP/Card_Design_Preview_WIP.png',
      '05_DELIVERABLES/Isometric_Icons_16x_Set.svg',
      '05_DELIVERABLES/Mobile_Banking_Hero_3D.png',
      'DELIVERY.md',
      'HANDOVER_SUMMARY.html',
      'README.md'
    ]);
    const delivery = fs.exportExtras.get(dest)!.find((e) => e.name === 'DELIVERY.md')!.text;
    expect(delivery).toContain(await fs.sha256(`${ACME_PATH}/04_WIP/Card_Design_Preview_WIP.png`));
    expect(events).toEqual([]);
  });

  it('accepts short field names and drops DELIVERY.md when asked', async () => {
    const { call, fs } = routeHarness([exportRoutes], { sample: true });
    await call('POST', `/projects/${FOLDER}/export/zip`, { dest: 'D:/out.zip', manifest: false, brief: 'false', files: 'Isometric_Icons_16x_Set.svg' });
    expect(fs.exports.get('D:/out.zip')).toEqual(['03_COPY/COPY.md', '05_DELIVERABLES/Isometric_Icons_16x_Set.svg', 'HANDOVER_SUMMARY.html']);
  });

  it('requires a .zip destination', async () => {
    const { call, fs } = routeHarness([exportRoutes], { sample: true });
    await expect(call('POST', '/projects/0001D/export', {})).rejects.toMatchObject({ status: 400, message: 'Choose where to save the ZIP file.' });
    await expect(call('POST', '/projects/0001D/export', { dest: 'D:/out.txt' })).rejects.toMatchObject({ status: 400 });
    await expect(call('POST', '/system/export-vault', { dest: '  ' })).rejects.toMatchObject({ status: 400 });
    await expect(call('POST', '/projects/nope/export', { dest: 'D:/out.zip' })).rejects.toMatchObject({ status: 404 });
    expect(fs.exports.size).toBe(0);
  });

  it('previews and writes the full vault export', async () => {
    const { call, fs } = routeHarness([exportRoutes], { sample: true });
    const preview = await call('GET', '/system/export-vault/preview');
    expect(preview).toMatchObject({ success: true, filename: 'Kanso_Vault_Archive_2026-09-15.zip' });
    expect(preview.preview.compartments.map((c: any) => c.name)).toEqual(['_Clients', '_Finance', '_Projects', '_Journal', '_Notes', '_Team']);

    const res = await call('POST', '/system/export-vault', { dest: 'D:/Backups/Kanso_Vault_Archive_2026-09-15.zip' });
    expect(res).toMatchObject({ success: true, filename: 'Kanso_Vault_Archive_2026-09-15.zip', files: preview.preview.totalFiles + 1 });
    const names = fs.exports.get('D:/Backups/Kanso_Vault_Archive_2026-09-15.zip')!;
    expect(names).toContain('VAULT_MANIFEST.md');
    expect(names).toContain('_Clients/ACME_AcmeCorp/client.md');
    expect(names).toContain(`${ACME_PATH}/05_DELIVERABLES/Mobile_Banking_Hero_3D.png`);
  });

  it('parses option flags with server defaults', () => {
    expect(handoverOptions()).toEqual({ includeWip: false, includeBrief: true, includeCopy: true, includeManifest: true, selectedFiles: null });
    expect(handoverOptions({ includeWip: 'true', copy: false, selectedFiles: [' a.png ', ''] })).toMatchObject({
      includeWip: true,
      includeCopy: false,
      selectedFiles: ['a.png']
    });
  });
});
