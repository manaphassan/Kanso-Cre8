/**
 * Test Suite Module
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const express = require('express');
const config = require('../config');
const FrontmatterService = require('../services/FrontmatterService');
const AuditService = require('../services/AuditService');
const DeliverableService = require('../services/DeliverableService');
const WorkspaceService = require('../services/WorkspaceService');
const ApprovalService = require('../services/ApprovalService');
const JournalVaultService = require('../services/JournalVaultService');
const FinanceVaultService = require('../services/FinanceVaultService');
const NotesVaultService = require('../services/NotesVaultService');
const TeamService = require('../services/TeamService');
const LicenseService = require('../services/LicenseService');
const ConfigService = require('../services/ConfigService');
const CompanyService = require('../services/CompanyService');
const CommentService = require('../services/CommentService');
const CopywritingService = require('../services/CopywritingService');
const SseService = require('../services/SseService');
const ExportService = require('../services/ExportService');
const ShareService = require('../services/ShareService');
const GeminiService = require('../services/GeminiService');
const WebhookService = require('../services/WebhookService');
const SnapshotService = require('../services/SnapshotService');
const TimerService = require('../services/TimerService');



module.exports = async function run(test, context = {}) {
  test('DeliverableService blocks directory traversal attacks', () => {
    const maliciousPayload = Buffer.from('../../../Windows/System32/calc.exe').toString('base64url');
    const resolved = DeliverableService.resolveSafePath(maliciousPayload);
    assert.strictEqual(resolved, null, 'Path outside workspace must resolve to null');
  });

  await test('DeliverableService supports HTTP 206 Partial Content range requests for video media', async () => {
    const tempFile = path.join(__dirname, 'temp-video-stream.mp4');
    const dummyBuffer = Buffer.alloc(1024 * 10, 'A'); // 10 KB dummy video
    fs.writeFileSync(tempFile, dummyBuffer);

    let status = 200;
    let headers = {};
    const { Writable } = require('stream');
    const mockRes = new Writable({
      write(chunk, encoding, callback) {
        callback();
      }
    });
    mockRes.writeHead = (code, hdrs) => {
      status = code;
      headers = hdrs;
    };
    mockRes.status = (code) => {
      status = code;
      return mockRes;
    };

    const streamFinishPromise = new Promise(resolve => {
      mockRes.on('finish', resolve);
      mockRes.on('close', resolve);
    });

    const mockReq = {
      headers: {
        range: 'bytes=0-1023'
      }
    };

    DeliverableService.streamMedia(tempFile, mockReq, mockRes);

    assert.strictEqual(status, 206, 'Should respond with HTTP 206 Partial Content');
    assert.strictEqual(headers['Content-Range'], 'bytes 0-1023/10240');
    assert.strictEqual(headers['Content-Length'], 1024);
    assert.strictEqual(headers['Content-Type'], 'video/mp4');

    await streamFinishPromise;
    try { fs.unlinkSync(tempFile); } catch (e) {}
  });

  test('DeliverableService strictly indexes output media (PNG, JPG, MP4, PDF) and excludes COPY.md / raw source files', () => {
    const testDir = path.join(__dirname, 'temp-deliv-test-project');
    const delivDir = path.join(testDir, '05_DELIVERABLES');
    const prodDir = path.join(testDir, '04_Production');
    const copyDir = path.join(testDir, '03_COPY');
    const srcDir = path.join(testDir, '02_SOURCE_FILES');

    fs.mkdirSync(delivDir, { recursive: true });
    fs.mkdirSync(prodDir, { recursive: true });
    fs.mkdirSync(copyDir, { recursive: true });
    fs.mkdirSync(srcDir, { recursive: true });

    // Write mixed files
    fs.writeFileSync(path.join(delivDir, 'master_packaging_v1.png'), 'dummy-png-data');
    fs.writeFileSync(path.join(delivDir, 'product_catalogue_final.pdf'), 'dummy-pdf-data');
    fs.writeFileSync(path.join(prodDir, 'social_reel_1080p.mp4'), 'dummy-mp4-data');
    fs.writeFileSync(path.join(copyDir, 'COPY.md'), '# Copywriting text should be excluded from gallery');
    fs.writeFileSync(path.join(srcDir, 'packaging_master.afdesign'), 'raw-vector-source-data');

    const deliverables = DeliverableService.getProjectDeliverables(testDir);

    // Assert only media files from deliverables & production folders were indexed
    assert.strictEqual(deliverables.length, 3, 'Must index exactly 3 media deliverables (png, pdf, mp4)');
    
    const filenames = deliverables.map(d => d.filename);
    assert.ok(filenames.includes('master_packaging_v1.png'), 'Must include PNG export');
    assert.ok(filenames.includes('product_catalogue_final.pdf'), 'Must include PDF export');
    assert.ok(filenames.includes('social_reel_1080p.mp4'), 'Must include MP4 video');
    assert.strictEqual(filenames.includes('COPY.md'), false, 'COPY.md must NEVER be in deliverables gallery');
    assert.strictEqual(filenames.includes('packaging_master.afdesign'), false, 'Source files must not be in deliverables gallery');

    // Assert preview URLs and flags
    const pngDel = deliverables.find(d => d.filename === 'master_packaging_v1.png');
    assert.strictEqual(pngDel.isImage, true);
    assert.strictEqual(pngDel.format, 'PNG');
    assert.ok(pngDel.previewUrl.includes('/api/deliverables/preview?id='));
    assert.ok(pngDel.downloadUrl.includes('/api/deliverables/download?id='));

    const mp4Del = deliverables.find(d => d.filename === 'social_reel_1080p.mp4');
    assert.strictEqual(mp4Del.isVideo, true);
    assert.strictEqual(mp4Del.format, 'MP4');
    assert.ok(mp4Del.streamUrl.includes('/api/deliverables/stream?id='));

    // Cleanup
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
  });

  test('DeliverableService extracts mediaClass, aspectRatioEstimate, and sizeTier', () => {
    const testDir = path.join(__dirname, 'temp-dam-workspace');
    const projectDir = path.join(testDir, '2026', '202608_August', '202608_0077D_SS_DAM_Test');
    const delivDir = path.join(projectDir, '05_DELIVERABLES');
    fs.mkdirSync(delivDir, { recursive: true });

    fs.writeFileSync(path.join(projectDir, 'README.md'), '---\nstatus: in-progress\n---\n# DAM Test\n', 'utf8');
    fs.writeFileSync(path.join(delivDir, 'Hero_Banner_16x9_v1.png'), 'DUMMY_IMAGE_DATA_BYTES', 'utf8');
    fs.writeFileSync(path.join(delivDir, 'Promo_Story_9x16_Final.mp4'), 'DUMMY_VIDEO_DATA_BYTES', 'utf8');
    fs.writeFileSync(path.join(delivDir, 'Brochure_Print.pdf'), 'DUMMY_PDF_DATA_BYTES', 'utf8');

    const origRoot = WorkspaceService.workspaceRoot;
    WorkspaceService.workspaceRoot = testDir;

    try {
      const deliverables = DeliverableService.getProjectDeliverables(projectDir);
      assert.strictEqual(deliverables.length, 3, 'Must index all 3 deliverable files');

      const banner = deliverables.find(d => d.filename.includes('16x9'));
      assert.ok(banner, '16x9 banner must exist');
      assert.strictEqual(banner.mediaClass, 'raster_image');
      assert.strictEqual(banner.aspectRatioEstimate, '16:9');
      assert.strictEqual(banner.sizeTier, 'small');

      const video = deliverables.find(d => d.filename.includes('9x16'));
      assert.ok(video, '9x16 video must exist');
      assert.strictEqual(video.mediaClass, 'video_master');
      assert.strictEqual(video.aspectRatioEstimate, '9:16');

      const pdf = deliverables.find(d => d.filename.includes('Brochure'));
      assert.ok(pdf, 'PDF must exist');
      assert.strictEqual(pdf.mediaClass, 'print_pdf');
    } finally {
      WorkspaceService.workspaceRoot = origRoot;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  test('SnapshotService captures versioned milestones and restores project state', () => {
    const SnapshotService = require('../services/SnapshotService');
    const testDir = path.join(__dirname, 'temp-snapshot-workspace');
    const projDir = path.join(testDir, '2026', '202608_August', '202608_0088D_SS_Snapshot_Test');
    const copyDir = path.join(projDir, '03_COPY');
    fs.mkdirSync(copyDir, { recursive: true });

    // Initial state: Rev 1
    fs.writeFileSync(path.join(projDir, 'README.md'), '---\nrevision: 1\nstatus: in-progress\n---\n# Rev 1 Initial\n', 'utf8');
    fs.writeFileSync(path.join(copyDir, 'COPY.md'), '# Initial Draft Headline\nBody copy v1', 'utf8');

    const origRoot = WorkspaceService.workspaceRoot;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Capture snapshot of Rev 1
      const snap1 = SnapshotService.createSnapshot(projDir, 'MANUAL_MILESTONE', 'Designer Ali', 'First draft completed');
      assert.ok(snap1 && snap1.id, 'Snapshot must be created with ID');
      assert.strictEqual(snap1.revision, 1);

      // 2. Modify files (simulate Rev 2)
      fs.writeFileSync(path.join(projDir, 'README.md'), '---\nrevision: 2\nstatus: in-progress\n---\n# Rev 2 Changed\n', 'utf8');
      fs.writeFileSync(path.join(copyDir, 'COPY.md'), '# Altered Bad Headline\nCorrupted text', 'utf8');

      // 3. Capture snapshot of Rev 2
      const snap2 = SnapshotService.createSnapshot(projDir, 'CLIENT_REVISION', 'Client User', 'Client feedback logged');
      assert.strictEqual(snap2.revision, 2);

      const list = SnapshotService.getSnapshots(projDir);
      assert.strictEqual(list.length, 2, 'Must list 2 snapshots');
      // Inspect snapshot details without rollback
      const details = SnapshotService.getSnapshotDetails(projDir, snap1.id);
      assert.ok(details && details.meta, 'Snapshot details must return meta');
      assert.ok(details.readme.includes('Rev 1 Initial'), 'Readme in details must match snap1');
      assert.ok(details.copy.includes('Initial Draft Headline'), 'Copy in details must match snap1');

      // 4. Rollback to snap1
      const rollbackResult = SnapshotService.rollback(projDir, snap1.id, 'Art Director');
      assert.strictEqual(rollbackResult.success, true);

      // Verify files were restored
      const restoredCopy = fs.readFileSync(path.join(copyDir, 'COPY.md'), 'utf8');
      assert.ok(restoredCopy.includes('Initial Draft Headline'), 'COPY.md must be restored to Rev 1');
      assert.ok(!restoredCopy.includes('Altered Bad Headline'), 'Altered text must be gone');
    } finally {
      WorkspaceService.workspaceRoot = origRoot;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });
};

if (require.main === module) {
  (async () => {
    let passed = 0;
    let failed = 0;
    async function t(name, fn) {
      try {
        const res = fn();
        if (res && typeof res.then === 'function') await res;
        console.log(`  PASS: ${name}`);
        passed++;
      } catch (err) {
        console.error(`  FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
      }
    }
    console.log(`Running standalone test: ${path.basename(__filename)}...`);
    await module.exports(t, {});
    console.log(`\n${passed} Passed, ${failed} Failed\n`);
    if (WorkspaceService.watcher) {
      try { await WorkspaceService.watcher.close(); } catch (_) {}
    }
    process.exit(failed > 0 ? 1 : 0);
  })();
}
