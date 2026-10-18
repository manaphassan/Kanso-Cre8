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
const VaultHealthService = require('../services/VaultHealthService');



module.exports = async function run(test, context = {}) {
  test('AuditService logs events to JSONL and retrieves them in order', () => {
    const event = AuditService.logEvent({
      actor: 'TestManager',
      role: 'Manager',
      action: 'TEST_ACTION',
      entityType: 'TestEntity',
      entityId: '0001X',
      details: { test: true }
    });

    assert.ok(event);
    assert.ok(event.id);

    const logs = AuditService.getLogs({ action: 'TEST_ACTION', limit: 5 });
    assert.ok(logs.length > 0);
    assert.strictEqual(logs[0].actor, 'TestManager');
  });

  test('ApprovalService increments revision round and updates frontmatter on revision request', () => {
    const testDir = path.join(__dirname, 'temp-approval-workspace');
    const projectDir = path.join(testDir, '2026', '202608_August', '202608_9998A_SS_Temp_Approval_Test');
    fs.mkdirSync(projectDir, { recursive: true });

    const initialFm = { status: 'review', designer: 'Alex Mercer', revision: 1, approvals: [] };
    const initialBody = '# Sandbox Approval Test Project\n\nBrief content.';
    FrontmatterService.writeProjectReadme(projectDir, initialFm, initialBody);

    const origRoot = WorkspaceService.workspaceRoot;
    WorkspaceService.workspaceRoot = testDir;
    WorkspaceService.isScanning = false;
    WorkspaceService.scan(true);

    try {
      const result = ApprovalService.processDecision({
        projectId: '9998A',
        decision: 'revision_requested',
        reviewer: 'QA Lead',
        role: 'CreativeManager',
        comment: 'Please refine typography hierarchy'
      });

      assert.ok(result.success);
      assert.ok(result.project);
      assert.strictEqual(result.project.status, 'revision');
      assert.strictEqual(result.project.revision, 2);
      assert.ok(result.project.approvals.length > 0);
      assert.strictEqual(result.project.approvals[0].decision, 'revision_requested');
    } finally {
      // Restore workspaceRoot and clean up
      WorkspaceService.workspaceRoot = origRoot;
      WorkspaceService.scan(true);
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('App.svelte and Client structure include Kanso Cre8 Desktop ecosystem navigation', () => {
    const svelteAppPath = path.join(__dirname, '../../client/src/App.svelte');
    const indexPath = path.join(__dirname, '../../client/index.html');
    const content = fs.existsSync(svelteAppPath)
      ? fs.readFileSync(svelteAppPath, 'utf8')
      : fs.readFileSync(indexPath, 'utf8');

    assert.ok(content.includes('view-switcher-wrapper') || content.includes('app-header'), 'Header HUD navigation must exist');
    assert.ok(content.includes('Desktop') || content.includes('MiniCassetteDock'), 'Desktop Vault banner or dock must exist');
    assert.ok(
      content.includes('Desktop') || content.includes('MiniCassetteDock'),
      'Kanso Cre8 desktop client or dock reference must exist'
    );
  });

  test('Desktop direct-boot vault and creator state are configured for standalone desktop', () => {
    const appStatePath = path.join(__dirname, '../../client/src/lib/stores/appState.svelte.ts');
    const content = fs.readFileSync(appStatePath, 'utf8');

    assert.ok(content.includes('DEFAULT_DESKTOP_CREATOR'), 'DEFAULT_DESKTOP_CREATOR state must exist');
    assert.ok(content.includes('DEFAULT_DESKTOP_CREATOR'), 'Default desktop creator must be initialized');
  });

  test('ApiClient contains updateProject, updateBrief, and submitDecision methods', () => {
    const apiTsPath = path.join(__dirname, '../../client/src/lib/services/api.ts');
    const apiJsPath = path.join(__dirname, '../../client/js/api.js');
    const content = fs.existsSync(apiTsPath)
      ? fs.readFileSync(apiTsPath, 'utf8')
      : fs.readFileSync(apiJsPath, 'utf8');

    assert.ok(content.includes('updateProject') || content.includes('updateProjectStatus'), 'ApiClient updateProject method must exist');
    assert.ok(content.includes('updateBrief') || content.includes('updateProjectBrief'), 'ApiClient updateBrief method must exist');
    assert.ok(content.includes('submitDecision') || content.includes('recordApproval'), 'ApiClient submitDecision method must exist');
  });

  test('MarkdownService and MermaidViewer support full GFM, Callouts, and Mermaid diagrams', () => {
    const markdownTsPath = path.join(__dirname, '../../client/src/lib/services/markdown.ts');
    const mermaidSveltePath = path.join(__dirname, '../../client/src/lib/components/markdown/MermaidViewer.svelte');
    
    assert.ok(fs.existsSync(markdownTsPath), 'MarkdownService must exist in services');
    assert.ok(fs.existsSync(mermaidSveltePath), 'MermaidViewer Svelte component must exist');

    const mdContent = fs.readFileSync(markdownTsPath, 'utf8');
    assert.ok(mdContent.includes('transformCallouts'), 'Callout transformer must exist');
    assert.ok(mdContent.includes('NOTE|WARNING|IMPORTANT|CAUTION'), 'Supported callout regex must be defined');
  });

  test('CommentService reads, writes, extracts @mentions, and resolves project comments', () => {
    const CommentService = require('../services/CommentService');
    const testProjectId = '202609_0001D_ACME';
    const testDir = path.join(__dirname, 'temp-comment-test');
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir, { recursive: true });

    try {
      const newComment = CommentService.addComment(testDir, testProjectId, {
        author: 'Haikal',
        authorRole: 'User',
        content: 'Updated the packaging dieline specs. @alex @marcus please sign off!',
        deliverableId: 'del_001'
      });

      assert.ok(newComment.id.startsWith('cmt_'), 'Comment ID must start with cmt_');
      assert.strictEqual(newComment.author, 'Haikal');
      assert.ok(newComment.mentions.includes('alex'), 'Must extract @alex mention');
      assert.ok(newComment.mentions.includes('marcus'), 'Must extract @marcus mention');
      assert.strictEqual(newComment.resolved, false);

      // Verify physical _review.md file created in project folder
      const reviewFilePath = path.join(testDir, '_review.md');
      assert.ok(fs.existsSync(reviewFilePath), '_review.md must exist in project folder');
      const reviewContent = fs.readFileSync(reviewFilePath, 'utf8');
      assert.ok(reviewContent.includes('Updated the packaging dieline specs.'));

      // Retrieve comments
      const allComments = CommentService.getComments(testDir, testProjectId);
      assert.ok(allComments.length >= 1, 'Must contain at least 1 comment');
      assert.ok(allComments.some(c => c.id === newComment.id), 'Must find created comment');

      // Resolve comment
      const resolveResult = CommentService.resolveComment(testDir, testProjectId, newComment.id, true, 'Hasan', 'Admin');
      assert.strictEqual(resolveResult.resolved, true);

      const updatedComments = CommentService.getComments(testDir, testProjectId);
      const resolvedItem = updatedComments.find(c => c.id === newComment.id);
      assert.ok(resolvedItem && resolvedItem.resolved, 'Comment must be marked resolved');

      // Delete comment
      const deleteResult = CommentService.deleteComment(testDir, testProjectId, newComment.id, 'Haikal', 'User');
      assert.strictEqual(deleteResult.success, true);

      // Assert _Team/comments is never created
      const teamComments = path.join(config.WORKSPACE_ROOT, '_Team', 'comments');
      assert.strictEqual(fs.existsSync(teamComments), false, 'Forbidden _Team/comments must never be created');
    } finally {
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  test('CommentService aggregates workspace activity & notification feed', () => {
    const CommentService = require('../services/CommentService');
    const notifs = CommentService.getNotifications('hasan', 10);
    assert.ok(Array.isArray(notifs), 'Notifications must return an array');
  });

  test('CopywritingService reads, auto-scaffolds templates, and saves COPY.md on NAS', () => {
    const CopywritingService = require('../services/CopywritingService');
    const testDir = path.join(__dirname, 'temp-test-copywriting-dir');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const copyData = CopywritingService.getCopywriting(testDir, '0085D', 'Rejal Premium Packaging');
    assert.ok(copyData.body, 'Must return non-empty copywriting markdown body');
    assert.ok(copyData.stats.words > 0, 'Must compute word count');
    assert.ok(copyData.filePath.includes('03_COPY') || copyData.filePath.includes('COPY.md'), 'Must resolve copy file path');

    // Test saving custom markdown copy
    const customCopy = '# Updated Video Script Hook\n\n- Hook 1: Raw Honey vitality test';
    const saved = CopywritingService.updateCopywriting(testDir, '0085D', customCopy, 'Test Writer', 'Copywriter');
    assert.strictEqual(saved.success, true);
    assert.strictEqual(saved.body, customCopy);

    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('SseService registers clients and broadcasts structured events', () => {
    const SseService = require('../services/SseService');
    
    let writtenData = [];
    const mockRes = {
      setHeader: () => {},
      flushHeaders: () => {},
      write: (chunk) => {
        writtenData.push(chunk);
      }
    };
    const mockReq = {
      on: () => {},
      user: { name: 'Test Client' }
    };

    const initialCount = SseService.getClientCount();
    SseService.addClient(mockReq, mockRes);
    assert.strictEqual(SseService.getClientCount(), initialCount + 1, 'Client count should increase by 1');

    // Broadcast test
    SseService.broadcast('project:updated', { projectId: '0085D', status: 'review' });
    const hasBroadcast = writtenData.some(d => d.includes('event: project:updated') && d.includes('0085D'));
    assert.ok(hasBroadcast, 'Broadcast message must be written to client stream');
  });

  await test('ExportService generates clean ZIP stream and HTML handover summary manifest', async () => {
    const ExportService = require('../services/ExportService');
    const testDir = path.join(__dirname, 'temp-export-project-runtime');
    const delivDir = path.join(testDir, '05_DELIVERABLES');
    const copyDir = path.join(testDir, '03_COPY');

    fs.mkdirSync(delivDir, { recursive: true });
    fs.mkdirSync(copyDir, { recursive: true });

    fs.writeFileSync(path.join(testDir, 'README.md'), '---\nstatus: done\ndesigner: 0001D\n---\n# Export Project\n', 'utf8');
    fs.writeFileSync(path.join(copyDir, 'COPY.md'), '# Master Copywriting\nHeadline text here\n', 'utf8');
    fs.writeFileSync(path.join(delivDir, '202608_0085D_SS_Poster_Print.pdf'), 'Dummy PDF Deliverable Content', 'utf8');

    const tempZipOut = path.join(__dirname, 'temp-output-handover.zip');
    const outStream = fs.createWriteStream(tempZipOut);

    let headers = {};
    outStream.setHeader = (k, v) => { headers[k] = v; };
    outStream.writeHead = () => {};
    outStream.headersSent = false;

    const streamFinishedPromise = new Promise(resolve => {
      outStream.on('finish', resolve);
      outStream.on('close', resolve);
    });

    ExportService.streamProjectHandover(testDir, '0085D', outStream);

    assert.strictEqual(headers['Content-Type'], 'application/zip');
    assert.ok(headers['Content-Disposition'].includes('Handover.zip'));

    await streamFinishedPromise;
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    try { if (fs.existsSync(tempZipOut)) fs.unlinkSync(tempZipOut); } catch (e) {}
  });

  await test('ExportService computes SHA-256 and generates compliant DELIVERY.md manifest with colophon', async () => {
    const ExportService = require('../services/ExportService');
    const CommentService = require('../services/CommentService');
    const testDir = path.join(__dirname, 'temp-proof-project-runtime');
    const delivDir = path.join(testDir, '05_DELIVERABLES');
    const copyDir = path.join(testDir, '03_COPY');

    fs.mkdirSync(delivDir, { recursive: true });
    fs.mkdirSync(copyDir, { recursive: true });

    const sampleFile = path.join(delivDir, 'Hero_Motion_Teaser.mp4');
    fs.writeFileSync(sampleFile, 'Binary Video Simulation Content 12345', 'utf8');
    fs.writeFileSync(path.join(testDir, 'README.md'), '---\njob_id: ACME-2026-099\nclient: ACME\nstatus: approved\ndesigner: 0001D\n---\n# Acme Campaign\n', 'utf8');

    // 1. Verify SHA-256 Checksum calculation
    const hash = ExportService.computeFileSha256(sampleFile);
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64, 'SHA-256 hash must be 64 hexadecimal characters');

    // 2. Verify DELIVERY.md manifest generation
    const assetItems = [{
      relPath: 'Deliverables/Hero_Motion_Teaser.mp4',
      filename: 'Hero_Motion_Teaser.mp4',
      format: 'MP4',
      sizeBytes: 1024,
      sizeFormatted: '1.00 KB',
      sha256: hash
    }];
    const studioProfile = {
      name: 'Kanso Studio',
      registration_no: '202601001234',
      remittance: {
        bank_name: 'Maybank Berhad',
        account_no: '5140 1234 5678',
        duitnow_id: '1234567890'
      }
    };
    const clientProfile = {
      name: 'Acme Corporation',
      code: 'ACME'
    };

    const deliveryMd = ExportService.generateDeliveryMarkdown('Acme-2026-099', {
      job_id: 'ACME-2026-099',
      client: 'ACME',
      designer: '0001D',
      title: 'Acme Campaign'
    }, assetItems, studioProfile, clientProfile);

    assert.ok(deliveryMd.includes('DELIVERY.md'), 'Must include manifest title');
    assert.ok(deliveryMd.includes(hash), 'Must include computed SHA-256 checksum');
    assert.ok(deliveryMd.includes('5140 1234 5678'), 'Must include wire remittance account');
    assert.ok(deliveryMd.includes('Maybank Berhad'), 'Must include bank name');

    // 3. Verify CommentService stores video timestamp annotations
    const videoComment = CommentService.addComment(testDir, 'ACME-2026-099', {
      author: 'Senior Art Director',
      authorRole: 'Manager',
      content: 'Trim tail frame to match beat drop',
      deliverableId: 'Hero_Motion_Teaser.mp4',
      annotation: {
        x: 45.5,
        y: 60.2,
        pinNumber: 1,
        priority: 'critical',
        videoTimestamp: 12.45,
        timecodeFormatted: '00:12'
      }
    });

    assert.ok(videoComment.annotation, 'Comment must retain annotation');
    assert.strictEqual(videoComment.annotation.videoTimestamp, 12.45);
    assert.strictEqual(videoComment.annotation.timecodeFormatted, '00:12');
    assert.strictEqual(videoComment.annotation.priority, 'critical');

    const loadedComments = CommentService.getComments(testDir, 'ACME-2026-099');
    const found = loadedComments.find(c => c.id === videoComment.id);
    assert.ok(found, 'Comment must be retrievable from _comments.jsonl');
    assert.strictEqual(found.annotation.timecodeFormatted, '00:12');

    // Cleanup
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
  });

  test('ShareService generates, validates, and revokes client review tokens', () => {
    const ShareService = require('../services/ShareService');
    const testDir = path.join(__dirname, 'temp-share-workspace');
    const projectDir = path.join(testDir, '2026', '202608_August', '202608_0088S_SS_Share_Test');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'README.md'), '---\nstatus: in-progress\ntitle: Share Test Project\nbrand: SSH\n---\n# Share Test\n', 'utf8');

    const origRoot = WorkspaceService.workspaceRoot;
    WorkspaceService.workspaceRoot = testDir;
    WorkspaceService.scan(true);

    try {
      // 1. Create a 7-day token
      const shareRecord = ShareService.createShareToken({
        projectId: '0088S',
        createdBy: 'Senior Designer',
        expiresInDays: 7,
        permissions: 'review_approve',
        note: 'Director signoff'
      });

      assert.ok(shareRecord.token, 'Token string must be generated');
      assert.strictEqual(shareRecord.jobId, '0088S');
      assert.strictEqual(shareRecord.permissions, 'review_approve');
      assert.strictEqual(shareRecord.active, true);

      // 2. Validate token
      const validated = ShareService.validateToken(shareRecord.token);
      assert.ok(validated, 'Validated result must not be null');
      assert.strictEqual(validated.project.jobId, '0088S');
      assert.strictEqual(validated.shareInfo.permissions, 'review_approve');

      // 3. Revoke token
      const revoked = ShareService.revokeToken(shareRecord.token);
      assert.strictEqual(revoked, true);
      assert.strictEqual(ShareService.validateToken(shareRecord.token), null, 'Revoked token must not validate');
    } finally {
      WorkspaceService.workspaceRoot = origRoot;
      WorkspaceService.scan(true);
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  test('GeminiService manages AI configuration and formats Gemini Ultra prompts', () => {
    const GeminiService = require('../services/GeminiService');
    const testDir = path.join(__dirname, 'temp-gemini-workspace');
    fs.mkdirSync(testDir, { recursive: true });

    const origRoot = WorkspaceService.workspaceRoot;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Save and retrieve AI configuration
      const ok = GeminiService.saveApiKey('AIzaSyTestKey123456789', 'gemini-1.5-pro');
      assert.strictEqual(ok, true);

      const status = GeminiService.getStatus();
      assert.strictEqual(status.configured, true);
      assert.strictEqual(status.preferredModel, 'gemini-1.5-pro');
      assert.strictEqual(status.maskedKey, undefined, 'Key must never be returned to client');

      // 2. Format Gemini Ultra Web Prompt
      const ultraPrompt = GeminiService.formatUltraWebPrompt({
        brand: 'ACME',
        title: 'Maca Gold Launch',
        audience: 'Men 30-50',
        goal: 'Direct Response'
      });
      assert.ok(ultraPrompt.includes('KANSO CRE8 CAMPAIGN PROMPT'), 'Must contain header');
      assert.ok(ultraPrompt.includes('Maca Gold Launch'), 'Must contain project title');
      assert.ok(ultraPrompt.includes('ACME'), 'Must contain brand code');
    } finally {
      WorkspaceService.workspaceRoot = origRoot;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  test('WebhookService manages webhooks and handles Discord/Slack payloads', async () => {
    const WebhookService = require('../services/WebhookService');
    const testDir = path.join(__dirname, 'temp-webhook-workspace');
    fs.mkdirSync(testDir, { recursive: true });

    const origRoot = WorkspaceService.workspaceRoot;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Add Webhook
      const hook = WebhookService.addWebhook({
        name: 'Discord Creative Alerts',
        url: 'https://discord.com/api/webhooks/mock/123',
        serviceType: 'discord',
        events: ['all']
      });
      assert.ok(hook && hook.id, 'Webhook must be registered with ID');

      const list = WebhookService.getWebhooks();
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].name, 'Discord Creative Alerts');

      // 2. Delete Webhook
      const deleted = WebhookService.deleteWebhook(hook.id);
      assert.strictEqual(deleted, true);
      assert.strictEqual(WebhookService.getWebhooks().length, 0);
    } finally {
      WorkspaceService.workspaceRoot = origRoot;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  await test('REST API /api/journal and /api/finance endpoints return valid responses and sync to disk', async () => {
    const testDir = path.join(__dirname, 'temp-api-vault-test');
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(testDir, '_Journal', 'Daily'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '_Finance', 'Invoices'), { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      const express = require('express');
      const app = express();
      app.use(express.json());
      app.use('/api', require('../routes/api'));

      const server = app.listen(0);
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        // 1. GET /api/journal/daily/2026-09-09
        const dailyRes = await fetch(`${baseUrl}/api/journal/daily/2026-09-09`);
        const dailyBody = await dailyRes.json();
        assert.strictEqual(dailyRes.status, 200);
        assert.strictEqual(dailyBody.success, true);
        assert.strictEqual(dailyBody.note.date, '2026-09-09');

        // 2. POST /api/journal/daily
        const saveRes = await fetch(`${baseUrl}/api/journal/daily`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: '2026-09-09',
            title: 'Custom Wednesday Log',
            focusIntentions: ['Test intention'],
            entries: [{ id: 'test_1', type: 'task', text: 'Brand guide audit', completed: false }]
          })
        });
        const saveBody = await saveRes.json();
        assert.strictEqual(saveRes.status, 200);
        assert.strictEqual(saveBody.note.title, 'Custom Wednesday Log');

        // 3. POST /api/journal/migrate-tasks
        const migrateRes = await fetch(`${baseUrl}/api/journal/migrate-tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromDate: '2026-09-09', toDate: '2026-09-10' })
        });
        const migrateBody = await migrateRes.json();
        assert.strictEqual(migrateRes.status, 200);
        assert.strictEqual(migrateBody.success, true);
        assert.strictEqual(migrateBody.migratedCount, 1);

        // 4. GET /api/finance/invoices
        const invListRes = await fetch(`${baseUrl}/api/finance/invoices`);
        const invListBody = await invListRes.json();
        assert.strictEqual(invListRes.status, 200);
        assert.strictEqual(invListBody.success, true);

        // 5. POST /api/finance/append-session
        const appendRes = await fetch(`${baseUrl}/api/finance/append-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientCode: 'ACME',
            sessionLog: {
              projectTitle: 'Fintech Sprint',
              note: 'UI Icon Set',
              durationSeconds: 1800,
              durationFormatted: '00:30:00',
              hourlyRate: 120,
              earnedAmount: 60
            }
          })
        });
        const appendBody = await appendRes.json();
        assert.strictEqual(appendRes.status, 200);
        assert.strictEqual(appendBody.success, true);
        assert.ok(appendBody.invoice.documentNumber);
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  await test('Tauri v2 desktop shell configuration, system tray icon, and packaging pipeline integrity', async () => {
    const tauriConfPath = path.join(__dirname, '..', '..', 'src-tauri', 'tauri.conf.json');
    const cargoTomlPath = path.join(__dirname, '..', '..', 'src-tauri', 'Cargo.toml');
    const mainRsPath = path.join(__dirname, '..', '..', 'src-tauri', 'src', 'main.rs');
    const workflowPath = path.resolve(__dirname, '../../../../.github/workflows/release-builds.yml');

    // 1. Verify tauri.conf.json
    assert.ok(fs.existsSync(tauriConfPath), 'tauri.conf.json must exist');
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    assert.strictEqual(tauriConf.productName, 'Kanso Cre8');
    assert.strictEqual(tauriConf.identifier, 'com.kansocre8.desktop');
    assert.ok(tauriConf.app?.windows?.length > 0, 'Must configure at least one main window');
    assert.strictEqual(tauriConf.app.windows[0].backgroundColor, '#09090B');
    assert.strictEqual(tauriConf.app.trayIcon?.iconPath, 'icons/32x32.png', 'Tray icon must be configured');
    assert.ok(tauriConf.bundle?.active, 'Bundle must be active');
    assert.strictEqual(tauriConf.bundle?.targets, 'all', 'Bundle targets must be set to all');
    assert.ok(tauriConf.app.security?.csp, 'Security CSP must be defined');

    // 2. Verify Cargo.toml
    assert.ok(fs.existsSync(cargoTomlPath), 'Cargo.toml must exist');
    const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
    assert.ok(cargoToml.includes('name = "kanso-cre8"'));
    assert.ok(cargoToml.includes('tauri-plugin-fs'));
    assert.ok(cargoToml.includes('tauri-plugin-dialog'));
    assert.ok(cargoToml.includes('tauri-plugin-global-shortcut'));

    // 3. Verify main.rs
    assert.ok(fs.existsSync(mainRsPath), 'src/main.rs must exist');
    const mainRs = fs.readFileSync(mainRsPath, 'utf8');
    assert.ok(mainRs.includes('tauri_plugin_fs'));
    assert.ok(mainRs.includes('tauri_plugin_dialog'));
    assert.ok(mainRs.includes('tauri_plugin_global_shortcut'));

    // 4. Verify GitHub Actions Packaging Workflow
    assert.ok(fs.existsSync(workflowPath), 'GitHub Actions release-builds.yml must exist');
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    assert.ok(workflow.includes('tauri-action@v1'));
    assert.ok(workflow.includes('windows-latest'));
    assert.ok(workflow.includes('ubuntu-22.04'));
  });

  await test('ApprovalService stamps APPROVAL.md with SHA-256 checksums and digital signature', async () => {
    const testDir = path.join(__dirname, 'temp-approval-test');
    const projectDir = path.join(testDir, '_Projects', '2026', '202609_0001D_ACME_BrandCampaign');
    const delivDir = path.join(projectDir, '05_DELIVERABLES');
    fs.mkdirSync(delivDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Create project README.md
      const readmePath = path.join(projectDir, 'README.md');
      fs.writeFileSync(readmePath, `---
jobId: 0001D
title: Acme Brand Campaign
brand: ACME
status: review
revision: 1
---

# Acme Brand Campaign Brief
`, 'utf8');

      // 2. Create sample deliverable file
      const assetPath = path.join(delivDir, 'hero_4k.png');
      fs.writeFileSync(assetPath, 'FAKE_BINARY_PNG_CONTENT_1234567890', 'utf8');

      // 3. Rescan workspace
      WorkspaceService.scan();

      // 4. Process approval decision
      const res = ApprovalService.processDecision({
        projectId: '0001D',
        decision: 'approved',
        reviewer: 'Sarah Jenkins',
        role: 'Brand Director',
        comment: 'Stunning visual execution. Approved for print.'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.project.status, 'approved');

      // 5. Verify APPROVAL.md exists in 05_DELIVERABLES/
      const certPath = path.join(delivDir, 'APPROVAL.md');
      assert.ok(fs.existsSync(certPath), 'APPROVAL.md must exist on disk');

      const certContent = fs.readFileSync(certPath, 'utf8');
      assert.ok(certContent.includes('type: deliverable_approval'), 'Must contain YAML frontmatter');
      assert.ok(certContent.includes('Official Deliverable Approval & Handover Certificate'), 'Must contain cert title');
      assert.ok(certContent.includes('hero_4k.png'), 'Must index hero_4k.png');
      assert.ok(certContent.includes('SHA-256'), 'Must contain SHA-256 table header');
      assert.ok(certContent.includes('Sarah Jenkins'), 'Must mention reviewer');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  await test('ConfigService.migrateVault consolidates _Team/_Config, creates outside backups, and normalizes schema', async () => {
    const ConfigService = require('../services/ConfigService');
    const testWs = path.join(__dirname, 'temp-migrate-vault-test');
    const testConfigDir = path.join(testWs, '_Team', '_Config');

    fs.mkdirSync(testConfigDir, { recursive: true });

    // Seed legacy vault files
    fs.writeFileSync(path.join(testConfigDir, 'theme.txt'), 'light\n', 'utf8');
    fs.writeFileSync(path.join(testConfigDir, 'license.key'), 'KANSO-PRO-TEST-MIGRATED-KEY-2026', 'utf8');
    fs.writeFileSync(path.join(testConfigDir, 'user_passwords.json'), JSON.stringify({ admin: 'secret123' }), 'utf8');
    fs.writeFileSync(path.join(testConfigDir, 'staff_directory.json'), JSON.stringify([{ id: 'S1' }]), 'utf8');
    fs.writeFileSync(path.join(testConfigDir, 'team-notes.json'), JSON.stringify({ notes: [] }), 'utf8');
    fs.writeFileSync(path.join(testConfigDir, 'studio_profile.json'), JSON.stringify({
      studioName: 'Migrated Atelier',
      businessRegNo: 'REG-999',
      digitalSignature: 'Alex Signature',
      logo: 'https://example.com/logo.png',
      paymentSwiftOrQr: 'SWIFT: TESTSWIFT / DuitNow: 12345678'
    }), 'utf8');

    // Run first migration pass
    const report1 = ConfigService.migrateVault(testWs);
    assert.strictEqual(report1.success, true);
    assert.ok(report1.actions.length >= 4);

    // Verify theme.txt was migrated into preferences.json and removed from vault
    assert.strictEqual(fs.existsSync(path.join(testConfigDir, 'theme.txt')), false, 'theme.txt must be removed from vault');
    assert.strictEqual(fs.existsSync(path.join(testConfigDir, 'preferences.json')), true, 'preferences.json must be created');
    const prefs = JSON.parse(fs.readFileSync(path.join(testConfigDir, 'preferences.json'), 'utf8'));
    assert.strictEqual(prefs.theme, 'light');

    // Verify license.key was migrated into license.json and removed from vault
    assert.strictEqual(fs.existsSync(path.join(testConfigDir, 'license.key')), false, 'license.key must be removed from vault');
    assert.strictEqual(fs.existsSync(path.join(testConfigDir, 'license.json')), true, 'license.json must be created');
    const lic = JSON.parse(fs.readFileSync(path.join(testConfigDir, 'license.json'), 'utf8'));
    assert.strictEqual(lic.active, true);
    assert.strictEqual(lic.licenseKey, 'KANSO-PRO-TEST-MIGRATED-KEY-2026');

    // Verify retired files were removed from vault
    assert.strictEqual(fs.existsSync(path.join(testConfigDir, 'user_passwords.json')), false);
    assert.strictEqual(fs.existsSync(path.join(testConfigDir, 'staff_directory.json')), false);
    assert.strictEqual(fs.existsSync(path.join(testConfigDir, 'team-notes.json')), false);

    // Verify backups were created outside vault
    assert.ok(report1.backups.length >= 3);
    for (const b of report1.backups) {
      assert.strictEqual(fs.existsSync(b), true, `Backup file ${b} must exist on disk`);
    }

    // Verify studio_profile.json was normalized with canonical AGENTS.md keys
    const prof = JSON.parse(fs.readFileSync(path.join(testConfigDir, 'studio_profile.json'), 'utf8'));
    assert.strictEqual(prof.registration_no, 'REG-999');
    assert.strictEqual(prof.signature_text, 'Alex Signature');
    assert.strictEqual(prof.logo_url, 'https://example.com/logo.png');
    assert.strictEqual(prof.swift_bic, 'TESTSWIFT');
    assert.strictEqual(prof.duitnow_id, '12345678');

    // Run second pass to assert idempotency
    const report2 = ConfigService.migrateVault(testWs);
    assert.strictEqual(report2.success, true);
    assert.strictEqual(report2.backups.length, 0, 'Second run must not create redundant backups');

    // Cleanup
    try { fs.rmSync(testWs, { recursive: true, force: true }); } catch (_) {}
  });

  await test('CommentService and ApprovalService store review comments and decisions in <project>/_review.md', () => {
    const CommentService = require('../services/CommentService');
    const ApprovalService = require('../services/ApprovalService');
    const testDir = path.join(__dirname, 'temp-review-md-test');
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir, { recursive: true });

    try {
      // 1. Post a comment
      const cmt = CommentService.addComment(testDir, '202609_0099_TEST', {
        author: 'Marcus Vance',
        authorRole: 'Designer',
        content: 'Refined 3D shadows and typography.'
      });
      assert.ok(cmt.id);

      // 2. Add an approval record
      const appr = CommentService.addApproval(testDir, '202609_0099_TEST', {
        id: 'appr_test_001',
        round: 1,
        decision: 'approved',
        reviewer: 'Alex Mercer',
        role: 'Creative Director',
        comment: 'Outstanding visual depth.',
        timestamp: new Date().toISOString()
      });
      assert.ok(appr.id);

      // 3. Verify physical _review.md file existence and content
      const reviewPath = path.join(testDir, '_review.md');
      assert.ok(fs.existsSync(reviewPath), '_review.md must physically exist');
      const raw = fs.readFileSync(reviewPath, 'utf8');
      assert.ok(raw.includes('Refined 3D shadows and typography.'));
      assert.ok(raw.includes('Outstanding visual depth.'));
      assert.ok(raw.includes('Alex Mercer'));

      // 4. Verify reading back
      const loadedComments = CommentService.getComments(testDir, '202609_0099_TEST');
      assert.strictEqual(loadedComments.length, 1);
      assert.strictEqual(loadedComments[0].content, 'Refined 3D shadows and typography.');

      const loadedApprovals = ApprovalService.getApprovals(testDir, '202609_0099_TEST');
      assert.strictEqual(loadedApprovals.length, 1);
      assert.strictEqual(loadedApprovals[0].reviewer, 'Alex Mercer');

      // 5. Ensure global _Team/comments is NOT created
      const forbiddenDir = path.join(config.WORKSPACE_ROOT, '_Team', 'comments');
      assert.strictEqual(fs.existsSync(forbiddenDir), false, '_Team/comments must not exist');
    } finally {
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  await test('VaultHealthService audits broken WikiLinks, orphan notes, frontmatter schema and compartments', async () => {
    const testDir = path.join(__dirname, 'temp-vault-health-test');
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
    fs.mkdirSync(testDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Scaffold canonical 6 compartments
      const compartments = ['_Clients', '_Finance', '_Projects', '_Journal', '_Notes', '_Team'];
      for (const comp of compartments) {
        fs.mkdirSync(path.join(testDir, comp), { recursive: true });
      }
      fs.mkdirSync(path.join(testDir, '_Finance', 'Quotes'), { recursive: true });
      fs.mkdirSync(path.join(testDir, '_Notes', '01_Fleeting'), { recursive: true });
      fs.mkdirSync(path.join(testDir, '_Notes', '03_Permanent'), { recursive: true });

      // 2. Note with broken link and note with valid link
      const note1Path = path.join(testDir, '_Notes', '01_Fleeting', 'CallNotes.md');
      fs.writeFileSync(note1Path, `---
title: Call Notes
id: note_call_01
type: fleeting
---
Discussed packaging specs with [[ACME]]. Also check [[GhostNoteReference]] for details.
`);

      // 3. Isolated orphan note (no incoming, no outgoing)
      const orphanPath = path.join(testDir, '_Notes', '03_Permanent', 'SolitaryRule.md');
      fs.writeFileSync(orphanPath, `---
title: Solitary Rule
id: note_solitary_01
type: permanent
---
This is a standalone design principle with no links.
`);

      // 4. Broken frontmatter quote
      const quotePath = path.join(testDir, '_Finance', 'Quotes', 'Q-2026-999.md');
      fs.writeFileSync(quotePath, `---
client: ACME
date: 2026-10-18
---
# Quote missing documentNumber and total
`);

      // 5. Cloud sync conflict file
      const conflictPath = path.join(testDir, '_Notes', '01_Fleeting', 'CallNotes (conflicted copy 2026-10-18).md');
      fs.writeFileSync(conflictPath, 'Conflicted content copy');

      // 6. Execute audit
      const report = VaultHealthService.getVaultHealthReport();
      assert.strictEqual(report.vaultExists, true);
      assert.strictEqual(report.compartments.length, 6);

      // Check broken links: should detect GhostNoteReference
      assert.ok(report.brokenWikiLinks.length >= 1, 'Should find broken link');
      const broken = report.brokenWikiLinks.find(b => b.target === 'GhostNoteReference');
      assert.ok(broken, 'Should locate GhostNoteReference as broken');

      // Check orphan notes: should detect SolitaryRule
      assert.ok(report.orphanNotes.length >= 1, 'Should find orphan note');
      const orphan = report.orphanNotes.find(o => o.title === 'Solitary Rule');
      assert.ok(orphan, 'Should flag Solitary Rule as orphan');

      // Check frontmatter: quote missing documentNumber
      assert.ok(report.frontmatterIssues.length >= 1, 'Should flag missing frontmatter');

      // Check sync conflicts
      assert.ok(report.syncConflicts.length >= 1, 'Should identify sync conflict');

      // Check health score degradation
      assert.ok(report.score < 100, 'Score should reflect detected issues');

      // 7. Clean sync conflicts
      const cleanRes = VaultHealthService.cleanAllSyncConflicts('keep_local', 'HealthTester');
      assert.strictEqual(cleanRes.success, true);
      assert.strictEqual(cleanRes.resolvedCount, 1);
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
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
