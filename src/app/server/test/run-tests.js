/**
 * Automated Verification Test Suite for Kanso Cre8 Desktop Application Engine
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const FrontmatterService = require('../services/FrontmatterService');
const AuditService = require('../services/AuditService');
const DeliverableService = require('../services/DeliverableService');
const WorkspaceService = require('../services/WorkspaceService');
const ApprovalService = require('../services/ApprovalService');
const JournalVaultService = require('../services/JournalVaultService');
const FinanceVaultService = require('../services/FinanceVaultService');
const NotesVaultService = require('../services/NotesVaultService');
const config = require('../config');

console.log('🧪 Starting Kanso Cre8 Desktop Application Verification Suite...\n');

// Mock AuditService path to prevent polluting production NAS audit logs
const origAuditGetPath = AuditService.getAuditLogPath;
const tempAuditPath = path.join(__dirname, 'temp-test-audit.jsonl');
AuditService.getAuditLogPath = () => tempAuditPath;

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      const res = fn();
      if (res && typeof res.then === 'function') await res;
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // ─── TEST 1: Frontmatter Parsing & Serialization ────────────────────
  test('FrontmatterService parses standard and extended YAML without data loss', () => {
    const rawMarkdown = `---
status: review
designer: 0001D
client: SS
deadline: 2026-09-30
priority: high
tags: [branding, print]
revision: 1
department: Marketing
creative_direction:
  tone: "Luxury Modern"
---

# Test Project Title

This is the project brief content.
- Requirement 1
- Requirement 2
`;

    const parsed = FrontmatterService.parseRawContent(rawMarkdown);
    assert.strictEqual(parsed.frontmatter.status, 'review');
    assert.strictEqual(parsed.frontmatter.designer, '0001D');
    assert.strictEqual(parsed.frontmatter.client, 'SS');
    assert.strictEqual(parsed.frontmatter.revision, 1);
    assert.strictEqual(parsed.frontmatter.department, 'Marketing');
    assert.strictEqual(parsed.frontmatter.creative_direction.tone, 'Luxury Modern');
    assert.ok(parsed.body.includes('# Test Project Title'));
    assert.ok(parsed.body.includes('Requirement 1'));

    const serialized = FrontmatterService.serializeContent(parsed.frontmatter, parsed.body);
    const roundtrip = FrontmatterService.parseRawContent(serialized);
    assert.strictEqual(roundtrip.frontmatter.status, 'review');
    assert.strictEqual(roundtrip.frontmatter.department, 'Marketing');
    assert.ok(roundtrip.body.includes('Requirement 2'));
  });

  // ─── TEST 2: Atomic File Write & OCC Lock ───────────────────────────
  test('FrontmatterService executes atomic writes and detects hash collisions', () => {
    const testDir = path.join(__dirname, 'temp-test-project');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const initialFm = { status: 'in-progress', designer: '0001D', revision: 0 };
    const initialBody = '# Project Brief Body';
    const writeRes = FrontmatterService.writeProjectReadme(testDir, initialFm, initialBody);

    assert.ok(writeRes.success);
    assert.ok(writeRes.versionHash);

    // Read back
    const readBack = FrontmatterService.readProjectReadme(testDir);
    assert.strictEqual(readBack.frontmatter.status, 'in-progress');
    assert.strictEqual(readBack.versionHash, writeRes.versionHash);

    // Test OCC hash failure
    let conflictCaught = false;
    try {
      FrontmatterService.writeProjectReadme(testDir, { status: 'done' }, null, 'INVALID_HASH');
    } catch (e) {
      if (e.message.includes('Concurrency Conflict')) {
        conflictCaught = true;
      }
    }
    assert.ok(conflictCaught, 'OCC conflict should be detected');

    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // ─── TEST 3: Directory Traversal Prevention ─────────────────────────
  test('DeliverableService blocks directory traversal attacks', () => {
    const maliciousPayload = Buffer.from('../../../Windows/System32/calc.exe').toString('base64url');
    const resolved = DeliverableService.resolveSafePath(maliciousPayload);
    assert.strictEqual(resolved, null, 'Path outside workspace must resolve to null');
  });

  // ─── TEST 4: Workspace Scanner & KPIs ────────────────────────────────
  test('WorkspaceService accurately computes dashboard metrics', () => {
    const metrics = WorkspaceService.getDashboardMetrics();
    assert.ok(typeof metrics.kpis.total === 'number');
    assert.ok(typeof metrics.kpis.active === 'number');
    assert.ok(typeof metrics.kpis.pendingReview === 'number');
    assert.ok(Array.isArray(metrics.designerWorkload));
    assert.ok(metrics.pipeline.inProgress !== undefined);
  });

  // ─── TEST 5: Audit Trail Append & Retrieval ─────────────────────────
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

  // ─── TEST 6: Approval Decision Lifecycle ────────────────────────────
  test('ApprovalService increments revision round and updates frontmatter on revision request', () => {
    const testDir = path.join(__dirname, 'temp-approval-workspace');
    const projectDir = path.join(testDir, '2026', '202608_August', '202608_9998A_SS_Temp_Approval_Test');
    fs.mkdirSync(projectDir, { recursive: true });

    const initialFm = { status: 'review', designer: 'Harussani', revision: 1, approvals: [] };
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

  // ─── TEST 7: Zen HUD Navigation & App Ecosystem DOM Structure ─────
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

  // ─── TEST 8: Desktop Direct-Boot Vault & Profile Management ─────────────
  test('Desktop direct-boot vault and creator state are configured for standalone desktop', () => {
    const appStatePath = path.join(__dirname, '../../client/src/lib/stores/appState.svelte.ts');
    const content = fs.readFileSync(appStatePath, 'utf8');

    assert.ok(content.includes('DEFAULT_DESKTOP_CREATOR'), 'DEFAULT_DESKTOP_CREATOR state must exist');
    assert.ok(content.includes('DEFAULT_DESKTOP_CREATOR'), 'Default desktop creator must be initialized');
  });

  // ─── TEST 9: ApiClient Interface Integrity ──────────────────────────
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

  // ─── TEST 10: Obsidian Markdown & Mermaid Integration ──────────────
  test('MarkdownService and MermaidViewer support full GFM, Callouts, and Mermaid diagrams', () => {
    const markdownTsPath = path.join(__dirname, '../../client/src/lib/services/markdown.ts');
    const mermaidSveltePath = path.join(__dirname, '../../client/src/lib/components/markdown/MermaidViewer.svelte');
    
    assert.ok(fs.existsSync(markdownTsPath), 'MarkdownService must exist in services');
    assert.ok(fs.existsSync(mermaidSveltePath), 'MermaidViewer Svelte component must exist');

    const mdContent = fs.readFileSync(markdownTsPath, 'utf8');
    assert.ok(mdContent.includes('transformCallouts'), 'Callout transformer must exist');
    assert.ok(mdContent.includes('NOTE|WARNING|IMPORTANT|CAUTION'), 'Supported callout regex must be defined');
  });

  // ─── TEST 11: Company & Subsidiary Management Integrity ─────────────
  test('CompanyService provisions and manages active client entities', () => {
    const CompanyService = require('../services/CompanyService');
    const companies = CompanyService.getAll();

    assert.ok(Array.isArray(companies), 'Companies must return an array');
    assert.ok(companies.length >= 3, 'Must contain at least 3 default client profiles');

    const acme = CompanyService.getByCode('ACME');
    assert.ok(acme, 'Acme Corporation (ACME) must exist');
    assert.strictEqual(acme.name, 'Acme Corporation');
    assert.strictEqual(acme.isParent, true);

    const nexus = CompanyService.getByCode('NEX');
    assert.ok(nexus, 'Nexus Studio (NEX) must exist');

    const lumina = CompanyService.getByCode('LUM');
    assert.ok(lumina, 'Lumina Labs (LUM) must exist');

    // Test saving an update
    const updated = CompanyService.saveCompany({
      code: 'LUM',
      name: 'Lumina Labs Pte Ltd',
      location: 'Singapore'
    });
    assert.strictEqual(updated.location, 'Singapore');
  });

  // ─── TEST 12: TeamService & User Staff Directory Governance ────────
  test('TeamService provisions, updates, and validates staff user accounts', () => {
    const TeamService = require('../services/TeamService');
    const { getUserRoles, getUserPermissions } = require('../middleware/auth');
    const roster = TeamService.getStaffRoster();

    assert.ok(Array.isArray(roster), 'Staff roster must return an array');
    assert.ok(roster.length >= 6, 'Must contain canonical creative team members');

    const lead = roster.find(m => m.staffId === 'ACME001' || m.username === 'harussani');
    assert.ok(lead, 'Lead staff (ACME001) must exist');
    assert.ok(lead.role, 'Lead staff must have an assigned role');

    // Test adding and updating a multi-role staff user
    const testStaffId = 'KANSO9999';
    try {
      TeamService.deleteStaffMember(testStaffId);
    } catch (e) {}

    const added = TeamService.addStaffMember({
      staffId: testStaffId,
      name: 'Test Staff Designer & Copywriter',
      roles: ['Designer', 'Copywriter'],
      department: 'Creative Production',
      defaultBrand: 'ACME'
    });

    assert.strictEqual(added.staffId, 'KANSO9999');
    assert.strictEqual(added.name, 'Test Staff Designer & Copywriter');
    assert.ok(added.roles.includes('Designer'), 'Must include Designer role');
    assert.ok(added.roles.includes('Copywriter'), 'Must include Copywriter role');

    // Test permission aggregation across multiple roles
    const perms = getUserPermissions(added);
    assert.ok(perms.includes('deliverable:upload'), 'Must contain Designer upload permission');
    assert.ok(perms.includes('copy:draft'), 'Must contain Copywriter draft permission');

    const updated = TeamService.updateStaffMember(testStaffId, {
      name: 'Test Staff Lead Designer',
      roles: ['Designer', 'Manager']
    });
    assert.strictEqual(updated.name, 'Test Staff Lead Designer');
    assert.ok(updated.roles.includes('Manager'), 'Must update to include Manager role');

    const updatedPerms = getUserPermissions(updated);
    assert.ok(updatedPerms.includes('team:manage_workload'), 'Must contain Manager workload permission');

    // Test Team Directory & Workload aggregation
    const directory = TeamService.getTeamDirectory();
    assert.ok(Array.isArray(directory), 'Team directory must return an array of creatives');
    assert.ok(directory.length > 0, 'Directory must contain active creative staff');
    
    const harussani = directory.find(m => m.staffId === 'ACME001' || m.name === 'Harussani');
    assert.ok(harussani, 'Harussani (Art Director) must be in creative team directory');
    assert.ok(harussani.workload, 'Harussani must have workload metrics object');
    assert.strictEqual(typeof harussani.workload.active, 'number', 'Workload active count must be a number');
    assert.strictEqual(typeof harussani.capacityStatus, 'string', 'Capacity status must be a string');
    assert.strictEqual(typeof harussani.workload.weightedLoad, 'number', 'Weighted load must be a number');
    assert.ok(Array.isArray(harussani.assignedProjects), 'Assigned projects must be an array');
    if (harussani.assignedProjects.length > 0) {
      assert.strictEqual(typeof harussani.assignedProjects[0].slaDays, 'number', 'Assigned project must have numeric slaDays');
      assert.strictEqual(typeof harussani.assignedProjects[0].slotWeight, 'number', 'Assigned project must have numeric slotWeight');
    }

    // Cleanup
    TeamService.deleteStaffMember(testStaffId);
  });

  // ─── TEST 13: CommentService & Collaboration Threads ────────────────
  test('CommentService reads, writes, extracts @mentions, and resolves project comments', () => {
    const CommentService = require('../services/CommentService');
    const testProjectId = '0085D';
    const testDir = path.join(__dirname, '..', '..', '..', 'Creative-Team', '2026', '202608_August', '202608_0085D_SS_Rejal_Premium_Packaging');

    const newComment = CommentService.addComment(testDir, testProjectId, {
      author: 'Haikal',
      authorRole: 'User',
      content: 'Updated the packaging dieline specs. @hasan @harussani please sign off!',
      deliverableId: 'del_001'
    });

    assert.ok(newComment.id.startsWith('cmt_'), 'Comment ID must start with cmt_');
    assert.strictEqual(newComment.author, 'Haikal');
    assert.ok(newComment.mentions.includes('hasan'), 'Must extract @hasan mention');
    assert.ok(newComment.mentions.includes('harussani'), 'Must extract @harussani mention');
    assert.strictEqual(newComment.resolved, false);

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
  });

  // ─── TEST 14: Activity Notifications & Mentions ─────────────────────
  test('CommentService aggregates workspace activity & notification feed', () => {
    const CommentService = require('../services/CommentService');
    const notifs = CommentService.getNotifications('hasan', 10);
    assert.ok(Array.isArray(notifs), 'Notifications must return an array');
  });

  // ─── TEST 15: CopywritingService & 03_COPYWRITING/COPY.md ───────────
  test('CopywritingService reads, auto-scaffolds templates, and saves COPY.md on NAS', () => {
    const CopywritingService = require('../services/CopywritingService');
    const testDir = path.join(__dirname, 'temp-test-copywriting-dir');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const copyData = CopywritingService.getCopywriting(testDir, '0085D', 'Rejal Premium Packaging');
    assert.ok(copyData.body, 'Must return non-empty copywriting markdown body');
    assert.ok(copyData.stats.words > 0, 'Must compute word count');
    assert.ok(copyData.filePath.includes('03_COPYWRITING') || copyData.filePath.includes('COPY.md'), 'Must resolve copy file path');

    // Test saving custom markdown copy
    const customCopy = '# Updated Video Script Hook\n\n- Hook 1: Raw Honey vitality test';
    const saved = CopywritingService.updateCopywriting(testDir, '0085D', customCopy, 'Test Writer', 'Copywriter');
    assert.strictEqual(saved.success, true);
    assert.strictEqual(saved.body, customCopy);

    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // ─── TEST 16: Admin Project Deletion & Filesystem Safety ────────────
  test('WorkspaceService safely deletes project folder and subdirectories with audit log', () => {
    const testDir = path.join(__dirname, 'temp-delete-workspace');
    const projectDir = path.join(testDir, '2026', '202608_August', '202608_9999D_SS_Temp_Test_Project');
    const sub1 = path.join(projectDir, '01_BRIEF_ASSETS');
    const sub2 = path.join(projectDir, '02_SOURCE_FILES');
    const sub3 = path.join(projectDir, '03_COPYWRITING');
    const sub4 = path.join(projectDir, '04_WORK_IN_PROGRESS');
    const sub5 = path.join(projectDir, '05_DELIVERABLES');

    fs.mkdirSync(sub1, { recursive: true });
    fs.mkdirSync(sub2, { recursive: true });
    fs.mkdirSync(sub3, { recursive: true });
    fs.mkdirSync(sub4, { recursive: true });
    fs.mkdirSync(sub5, { recursive: true });

    fs.writeFileSync(path.join(projectDir, 'README.md'), '---\nstatus: backlog\n---\n# Temp Project\n', 'utf8');
    fs.writeFileSync(path.join(sub3, 'COPY.md'), '# Copy\n', 'utf8');

    const origRoot = WorkspaceService.workspaceRoot;
    WorkspaceService.workspaceRoot = testDir;
    WorkspaceService.isScanning = false;
    WorkspaceService.scan(true);

    const projBefore = WorkspaceService.getProjectById('9999D');
    assert.ok(projBefore, 'Project 9999D must be indexed in workspace');
    assert.strictEqual(projBefore.readmeBody.includes('# Temp Project'), true, 'readmeBody must be loaded from README.md');
    assert.strictEqual(projBefore.briefMarkdown.includes('# Temp Project'), true, 'briefMarkdown must be loaded from README.md');

    const deleteRes = WorkspaceService.deleteProject('9999D', 'Test Admin', 'Administrator');
    assert.strictEqual(deleteRes.success, true);
    assert.strictEqual(WorkspaceService.getProjectById('9999D'), null, 'Project 9999D must be removed from cache');
    assert.strictEqual(fs.existsSync(projectDir), false, 'Project directory and all subfolders must be deleted');

    // Restore workspaceRoot and clean up
    WorkspaceService.workspaceRoot = origRoot;
    WorkspaceService.scan(true);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // ─── TEST 17: Real-time Server-Sent Events (SSE) Service ────────────
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

  // ─── TEST 18: Deliverable Media Partial Content (Range) Streaming ───
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

  // ─── TEST 19: DeliverableService Strict Media Filtering & Previews ──
  test('DeliverableService strictly indexes output media (PNG, JPG, MP4, PDF) and excludes COPY.md / raw source files', () => {
    const testDir = path.join(__dirname, 'temp-deliv-test-project');
    const delivDir = path.join(testDir, '05_DELIVERABLES');
    const prodDir = path.join(testDir, '04_Production');
    const copyDir = path.join(testDir, '03_COPYWRITING');
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

  // ─── TEST 20: Creative Handover Package Export (ZIP + HTML) ─────────
  await test('ExportService generates clean ZIP stream and HTML handover summary manifest', async () => {
    const ExportService = require('../services/ExportService');
    const testDir = path.join(__dirname, 'temp-export-project-runtime');
    const delivDir = path.join(testDir, '05_DELIVERABLES');
    const copyDir = path.join(testDir, '03_COPYWRITING');

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

  // ─── TEST 20: Designer Capacity & Creative SLA Metrics Computation ──
  test('WorkspaceService accurately calculates designer capacity scores and SLA turnaround metrics', () => {
    const metrics = WorkspaceService.getDashboardMetrics();
    assert.ok(metrics.designerWorkload, 'Should include designer workload');
    assert.ok(Array.isArray(metrics.designerWorkload), 'Designer workload should be an array');

    metrics.designerWorkload.forEach(dw => {
      assert.ok(typeof dw.capacityPercent === 'number', 'Should have numeric capacityPercent');
      assert.ok(typeof dw.capacityStatus === 'string', 'Should have string capacityStatus');
      assert.ok(typeof dw.capacityColor === 'string', 'Should have string capacityColor');
    });

    assert.ok(metrics.slaMetrics, 'Should include slaMetrics');
    assert.ok(typeof metrics.slaMetrics.avgTurnaroundDays === 'number' || metrics.slaMetrics.avgTurnaroundDays === null, 'avgTurnaroundDays should be number or null');
    assert.ok(typeof metrics.slaMetrics.medianTurnaroundDays === 'number' || metrics.slaMetrics.medianTurnaroundDays === null, 'medianTurnaroundDays should be number or null');
    assert.ok(typeof metrics.slaMetrics.p90TurnaroundDays === 'number' || metrics.slaMetrics.p90TurnaroundDays === null, 'p90TurnaroundDays should be number or null');
    assert.ok(typeof metrics.slaMetrics.firstTimeRightPercent === 'number' || metrics.slaMetrics.firstTimeRightPercent === null, 'firstTimeRightPercent should be number or null');
    assert.ok(typeof metrics.slaMetrics.avgRevisionCount === 'number' || metrics.slaMetrics.avgRevisionCount === null, 'avgRevisionCount should be number or null');
    assert.ok(typeof metrics.slaMetrics.avgReviewAgeDays === 'number', 'avgReviewAgeDays should be number');
    assert.ok(Array.isArray(metrics.slaMetrics.brandVelocity), 'brandVelocity should be array');
    assert.ok(Array.isArray(metrics.slaMetrics.competencySkills), 'competencySkills should be array');
    assert.ok(metrics.slaMetrics.competencySkills.length === 6, 'Should have 6 creative competency disciplines');

    // Test time-range and brand filtering
    const scoped30d = WorkspaceService.getDashboardMetrics({ timeRange: '30d', brand: 'SS' });
    assert.strictEqual(scoped30d.activeFilters.timeRange, '30d');
    assert.strictEqual(scoped30d.activeFilters.brand, 'SS');
  });

  // ─── TEST 21: Workspace Mount Path Switching & Override Persistence ───
  await test('WorkspaceService dynamically switches workspace root path, restarts watcher, and persists override', async () => {
    const origRoot = WorkspaceService.workspaceRoot;
    const tempSwitchDir = path.join(__dirname, 'temp-workspace-switch-test');
    if (!fs.existsSync(tempSwitchDir)) {
      fs.mkdirSync(tempSwitchDir, { recursive: true });
    }

    try {
      const result = WorkspaceService.setWorkspaceRoot(tempSwitchDir, 'TestAdmin');
      assert.strictEqual(result.success, true, 'Should report success on valid path switch');
      assert.strictEqual(path.resolve(WorkspaceService.workspaceRoot), path.resolve(tempSwitchDir), 'workspaceRoot must update');
      
      // Verify override file was written
      const overridePath = path.resolve(__dirname, '../workspace_config.json');
      assert.ok(fs.existsSync(overridePath), 'workspace_config.json must be created');
      const savedConfig = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
      assert.strictEqual(path.resolve(savedConfig.workspaceRoot), path.resolve(tempSwitchDir), 'Saved config must match new path');

      // Test invalid path throws error
      assert.throws(() => {
        WorkspaceService.setWorkspaceRoot('Z:\\NonExistent\\Drive\\Folder\\12345');
      }, /does not exist/i, 'Should reject non-existent paths');
    } finally {
      // Restore original workspaceRoot
      WorkspaceService.setWorkspaceRoot(origRoot, 'TestAdmin');
      // Allow Windows watcher handle to release before directory removal
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        fs.rmdirSync(tempSwitchDir);
      } catch (e) {
        try { fs.rmSync(tempSwitchDir, { recursive: true, force: true }); } catch (e2) {}
      }
    }
  });

  // ─── TEST 22: Drag-and-Drop Vault Ingester & Auto-Sorting ───────────
  test('WorkspaceService.ingestFile stores files in canonical subfolders with path safety', () => {
    const testDir = path.join(__dirname, 'temp-ingest-workspace');
    const projectDir = path.join(testDir, '2026', '202608_August', '202608_0099T_SS_Ingest_Test');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'README.md'), '---\nstatus: in-progress\n---\n# Ingest Test\n', 'utf8');

    const origRoot = WorkspaceService.workspaceRoot;
    WorkspaceService.workspaceRoot = testDir;
    WorkspaceService.isScanning = false;
    WorkspaceService.scan(true);

    try {
      // Ingest test source file (.psd)
      const base64Content = Buffer.from('FAKE_PSD_BINARY_CONTENT').toString('base64');
      const res = WorkspaceService.ingestFile('0099T', '02_SOURCE_FILES', 'Master_Layout.psd', base64Content, 'Tester');

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.folder, '02_SOURCE_FILES');
      assert.strictEqual(res.filename, 'Master_Layout.psd');

      const expectedSavedFile = path.join(projectDir, '02_SOURCE_FILES', 'Master_Layout.psd');
      assert.ok(fs.existsSync(expectedSavedFile), 'Master_Layout.psd must exist in 02_SOURCE_FILES');
      assert.strictEqual(fs.readFileSync(expectedSavedFile, 'utf8'), 'FAKE_PSD_BINARY_CONTENT');
    } finally {
      WorkspaceService.workspaceRoot = origRoot;
      WorkspaceService.scan(true);
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 23: Tokenized ShareService for Client Reviews ─────────────
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

  // ─── TEST 24: DeliverableService Rich DAM Metadata Indexing ─────────
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

  // ─── TEST 25: GeminiService Creative AI Studio Governance ───────────
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
      assert.ok(status.maskedKey.startsWith('AIzaSy'), 'Masked key must begin with prefix');

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

  // ─── TEST 26: SnapshotService Creative Version Timeline & Rollback ──
  test('SnapshotService captures versioned milestones and restores project state', () => {
    const SnapshotService = require('../services/SnapshotService');
    const testDir = path.join(__dirname, 'temp-snapshot-workspace');
    const projDir = path.join(testDir, '2026', '202608_August', '202608_0088D_SS_Snapshot_Test');
    const copyDir = path.join(projDir, '03_COPYWRITING');
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

  // ─── TEST 27: WebhookService Studio Notifications ───────────────────
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

  // ─── TEST 28: Quick Notes Multi-User Isolation & Sync ────────────────
  await test('Quick Notes discovers Notes and user-scoped Notes_* directories with UTF-8 BOM safety', async () => {
    const config = require('../config');
    const testDir = path.join(__dirname, 'temp-notes-workspace');
    const notesTeamDir = path.join(testDir, '_Team', '_Config', 'Notes');
    const notesBrandDir = path.join(testDir, '_Team', '_Config', 'Notes_brand');
    fs.mkdirSync(notesTeamDir, { recursive: true });
    fs.mkdirSync(notesBrandDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWsRoot = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Write team note and user-scoped note with UTF-8 BOM
      fs.writeFileSync(path.join(notesTeamDir, 'team_note.md'), '---\npriority: high\n---\n# Team Overview\n\nAll designers briefing.');
      fs.writeFileSync(path.join(notesBrandDir, 'brand_note.md'), '\uFEFF---\npinned: true\n---\n# Madu Tualang Specs\n\n17x target sales.');

      // 2. Query routes/api notes functions using native fetch
      const express = require('express');
      const app = express();
      app.use(express.json());
      app.use('/api', require('../routes/api'));

      const server = app.listen(0);
      const port = server.address().port;

      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/notes`);
        const resBody = await response.json();
        assert.strictEqual(response.status, 200);
        assert.strictEqual(resBody.success, true);
        assert.strictEqual(resBody.notes.length, 2);

        const brandNote = resBody.notes.find(n => n.id === 'brand_note');
        assert.ok(brandNote, 'Brand note must be discovered from Notes_brand');
        assert.strictEqual(brandNote.title, 'Madu Tualang Specs');
        assert.strictEqual(brandNote.isPinned, true);
        assert.strictEqual(brandNote.owner, 'brand');

        const teamNote = resBody.notes.find(n => n.id === 'team_note');
        assert.ok(teamNote, 'Team note must be discovered from Notes');
        assert.strictEqual(teamNote.title, 'Team Overview');
        assert.strictEqual(teamNote.owner, 'team');
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWsRoot;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 29: OrderService NAS _Orders Attachment Vault & Ingestion ──
  await test('OrderService saves, lists, downloads attachments in NAS _Orders and ingests to 01_BRIEF_ASSETS', async () => {
    const OrderService = require('../services/OrderService');
    const testDir = path.join(__dirname, 'temp-orders-workspace');
    const origRoot = config.WORKSPACE_ROOT;
    config.WORKSPACE_ROOT = testDir;

    try {
      // 1. Submit an order with an attachment
      const order = OrderService.submitOrder({
        title: 'Hero Banner Campaign',
        entity: 'SSC',
        priority: 'tier_1',
        format: 'print_digital',
        copy: 'Special headline copy for test',
        targetDate: '2026-09-30',
        requester: 'Test Requester',
        attachments: [
          { filename: 'logo_mockup.png', fileData: Buffer.from('fake_image_bytes').toString('base64') }
        ]
      });

      assert.ok(order && order.id.startsWith('ORD-'), 'Order ID must be generated');
      assert.strictEqual(order.attachmentCount, 1, 'Order must have 1 initial attachment');

      // 2. Add another attachment
      const added = OrderService.saveOrderAttachment(order.id, 'spec_sheet.pdf', Buffer.from('pdf_content'), 'Designer Harussani');
      assert.strictEqual(added.filename, 'spec_sheet.pdf');

      // 3. List attachments
      const list = OrderService.listOrderAttachments(order.id);
      assert.strictEqual(list.length, 2, 'Must list 2 attachments');
      assert.ok(list.some(f => f.filename === 'logo_mockup.png'), 'Must contain logo_mockup.png');
      assert.ok(list.some(f => f.filename === 'spec_sheet.pdf'), 'Must contain spec_sheet.pdf');

      // 4. Verify physical NAS path
      const filePath = OrderService.getOrderAttachmentPath(order.id, 'spec_sheet.pdf');
      assert.ok(fs.existsSync(filePath), 'Physical file must exist on NAS _Orders directory');

      // 5. Ingest to project
      const projDir = path.join(testDir, '2026', '202609_September', '202609_0091D_SSC_Test_Vault');
      fs.mkdirSync(projDir, { recursive: true });
      fs.writeFileSync(path.join(projDir, 'README.md'), '---\nstatus: in-progress\n---\n# Vault\n', 'utf8');

      const origWsRoot = WorkspaceService.workspaceRoot;
      WorkspaceService.workspaceRoot = testDir;
      WorkspaceService.scan();
      try {
        const ingestRes = OrderService.copyAttachmentsToProject(order.id, '0091D', 'Designer');
        assert.strictEqual(ingestRes.count, 2, 'Must copy 2 files into 01_BRIEF_ASSETS');
        assert.ok(fs.existsSync(path.join(projDir, '01_BRIEF_ASSETS', 'logo_mockup.png')), 'File must exist in 01_BRIEF_ASSETS');
        assert.ok(fs.existsSync(path.join(projDir, '01_BRIEF_ASSETS', 'spec_sheet.pdf')), 'File must exist in 01_BRIEF_ASSETS');
      } finally {
        WorkspaceService.workspaceRoot = origWsRoot;
        WorkspaceService.scan();
      }
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 30: Obsidian & Notion Vault Migration Wizard ─────────────
  await test('MigrationService previews, categorizes, and ingests external markdown vaults', () => {
    const MigrationService = require('../services/MigrationService');
    const sourceVault = path.join(__dirname, 'temp-source-obsidian');
    const destVault = path.join(__dirname, 'temp-dest-kanso');

    fs.mkdirSync(path.join(sourceVault, 'Daily'), { recursive: true });
    fs.mkdirSync(path.join(sourceVault, 'Literature'), { recursive: true });
    fs.mkdirSync(path.join(sourceVault, 'Atomic'), { recursive: true });
    fs.mkdirSync(path.join(sourceVault, 'Finance'), { recursive: true });
    fs.mkdirSync(path.join(sourceVault, 'Clients'), { recursive: true });
    fs.mkdirSync(destVault, { recursive: true });

    try {
      // 1. Create sample source files
      fs.writeFileSync(path.join(sourceVault, 'Daily', '2026-09-09-call.md'), '# Fleeting Call Note\nQuick call thoughts.', 'utf8');
      fs.writeFileSync(path.join(sourceVault, 'Literature', 'minimalist_grids.md'), '# Grid Systems\nJosef Muller-Brockmann.', 'utf8');
      fs.writeFileSync(path.join(sourceVault, 'Atomic', 'zen_contrast.md'), '# Zen Principle\nEliminate chrome.', 'utf8');
      fs.writeFileSync(path.join(sourceVault, 'Finance', 'INV-2026-0901.md'), '---\nclient: ACME\namount: 4500\n---\n# Invoice', 'utf8');
      fs.writeFileSync(path.join(sourceVault, 'Clients', 'acme_brand_notes.md'), '# Acme Corp Brand\nPrimary blue: #38BDF8', 'utf8');
      fs.writeFileSync(path.join(sourceVault, 'random_scratch.md'), '# Scratchpad\nDraft ideas', 'utf8');

      // 2. Preview Migration
      const preview = MigrationService.preview(sourceVault);
      assert.strictEqual(preview.totalFiles, 6, 'Must detect 6 source markdown files');
      assert.strictEqual(preview.counts.fleeting, 1, 'Must detect 1 fleeting note');
      assert.strictEqual(preview.counts.literature, 1, 'Must detect 1 literature note');
      assert.strictEqual(preview.counts.permanent, 1, 'Must detect 1 permanent note');
      assert.strictEqual(preview.counts.finance, 1, 'Must detect 1 finance invoice');
      assert.strictEqual(preview.counts.clients, 1, 'Must detect 1 client note');
      assert.strictEqual(preview.counts.notes, 1, 'Must detect 1 general scratch note');

      // 3. Execute Migration into target Kanso vault
      const result = MigrationService.execute(sourceVault, destVault, { mode: 'copy', author: 'TestArchitect' });
      assert.strictEqual(result.success, true, 'Migration execution must report success');
      assert.strictEqual(result.migratedCount, 6, 'Must successfully migrate all 6 files');
      assert.strictEqual(result.errorCount, 0, 'Must have zero migration errors');

      // 4. Verify target vault layout
      assert.ok(fs.existsSync(path.join(destVault, '_Zettelkasten', '01_Fleeting', '2026-09-09-call.md')), 'Fleeting note must be in 01_Fleeting');
      assert.ok(fs.existsSync(path.join(destVault, '_Zettelkasten', '02_Literature', 'minimalist_grids.md')), 'Literature note must be in 02_Literature');
      assert.ok(fs.existsSync(path.join(destVault, '_Zettelkasten', '03_Permanent', 'zen_contrast.md')), 'Permanent note must be in 03_Permanent');
      assert.ok(fs.existsSync(path.join(destVault, '_Finance', 'Invoices', 'INV-2026-0901.md')), 'Invoice must be in _Finance/Invoices');
      assert.ok(fs.existsSync(path.join(destVault, '_Clients', 'acme_brand_notes.md')), 'Client note must be in _Clients');
      assert.ok(fs.existsSync(path.join(destVault, '_Notes', 'random_scratch.md')), 'General note must be in _Notes');

      // 5. Verify Migration Report
      const reportFile = path.join(destVault, result.reportPath);
      assert.ok(fs.existsSync(reportFile), 'Migration report markdown file must exist in _Notes');
      const reportText = fs.readFileSync(reportFile, 'utf8');
      assert.ok(reportText.includes('Kanso Cre8 Vault Migration Report'), 'Report must contain title');
      assert.ok(reportText.includes('Total Migrated**: **6 files**'), 'Report must record 6 migrated files');
    } finally {
      try { fs.rmSync(sourceVault, { recursive: true, force: true }); } catch (e) {}
      try { fs.rmSync(destVault, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 31: JournalVaultService BuJo Symbols & Task Rollover ──────
  await test('JournalVaultService parses BuJo symbols, serializes markdown, and executes task rollover migration', async () => {
    const testDir = path.join(__dirname, 'temp-journal-vault-test');
    const dailyDir = path.join(testDir, '_Journal', 'Daily');
    fs.mkdirSync(dailyDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Write sample day with various BuJo symbols
      const day1Path = path.join(dailyDir, '2026-09-08.md');
      const day1Content = `---
date: 2026-09-08
title: Tuesday, September 8, 2026
tags: [journal, bujo, daily]
---

# 📔 Tuesday, September 8, 2026

## Focus Intentions
- [x] Initial design sprint

## Rapid Log
• [x] Completed logo vectorization
• [ ] Unfinished packaging box dieline
* Priority: Client contract review call
o Meeting with Art Director
- Note: Color preference is sky blue
`;
      fs.writeFileSync(day1Path, day1Content, 'utf8');

      // 2. Parse daily note
      const parsedNote = JournalVaultService.getDailyNote('2026-09-08');
      assert.strictEqual(parsedNote.date, '2026-09-08');
      assert.strictEqual(parsedNote.entries.length, 5);

      const doneEntry = parsedNote.entries.find(e => e.type === 'done');
      assert.ok(doneEntry, 'Done entry must be parsed');
      assert.strictEqual(doneEntry.completed, true);

      const taskEntry = parsedNote.entries.find(e => e.type === 'task');
      assert.ok(taskEntry, 'Task entry must be parsed');
      assert.strictEqual(taskEntry.completed, false);
      assert.strictEqual(taskEntry.text, 'Unfinished packaging box dieline');

      const priorityEntry = parsedNote.entries.find(e => e.type === 'priority');
      assert.ok(priorityEntry, 'Priority entry must be parsed');
      assert.strictEqual(priorityEntry.text, 'Client contract review call');

      // 3. Migrate tasks to next day
      const migrationRes = JournalVaultService.migrateTasks('2026-09-08', '2026-09-09');
      assert.strictEqual(migrationRes.success, true);
      assert.strictEqual(migrationRes.migratedCount, 2, 'Must migrate 2 incomplete tasks');

      // Verify day 1 note has migrated entries marked as • [>]
      const updatedDay1 = JournalVaultService.getDailyNote('2026-09-08');
      const migratedEntriesDay1 = updatedDay1.entries.filter(e => e.type === 'migrated');
      assert.strictEqual(migratedEntriesDay1.length, 2);

      // Verify day 2 note has received migrated tasks
      const day2 = JournalVaultService.getDailyNote('2026-09-09');
      assert.ok(day2.entries.some(e => e.text === 'Unfinished packaging box dieline'), 'Day 2 must contain migrated task');
      assert.ok(day2.entries.some(e => e.text === 'Client contract review call'), 'Day 2 must contain migrated priority');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 32: FinanceVaultService Invoice Persistence & Chronometer Append ─
  await test('FinanceVaultService parses markdown invoices, calculates totals, and appends chronometer session', async () => {
    const testDir = path.join(__dirname, 'temp-finance-vault-test');
    const invoicesDir = path.join(testDir, '_Finance', 'Invoices');
    fs.mkdirSync(invoicesDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Write sample invoice
      const invPath = path.join(invoicesDir, 'INV-2026-100_ACME.md');
      const invContent = `---
id: inv-2026-100
documentNumber: INV-2026-100
client_code: ACME
client_name: Acme Corporation
date: 2026-09-01
due_date: 2026-09-15
status: draft
currency: USD
hourly_rate: 150
items:
  - description: 3D Isometric Key Visual
    hours: 10
    rate: 150
    amount: 1500
subtotal: 1500
tax_percent: 10
tax_amount: 150
total: 1650
notes: Initial deposit invoice.
---

# Invoice INV-2026-100: Acme Corporation
`;
      fs.writeFileSync(invPath, invContent, 'utf8');

      // 2. Read invoices
      const invoices = FinanceVaultService.getInvoices();
      assert.strictEqual(invoices.length, 1);
      assert.strictEqual(invoices[0].documentNumber, 'INV-2026-100');
      assert.strictEqual(invoices[0].total, 1650);

      // 3. Append chronometer session
      const sessionLog = {
        projectTitle: 'Mobile Banking Illustrations',
        note: 'Camera framing and lighting',
        durationSeconds: 3600, // 1 hour
        durationFormatted: '01:00:00',
        hourlyRate: 150,
        earnedAmount: 150
      };

      const updated = FinanceVaultService.appendSessionToInvoice('ACME', sessionLog);
      assert.strictEqual(updated.documentNumber, 'INV-2026-100');
      assert.strictEqual(updated.items.length, 2);
      assert.strictEqual(updated.subtotal, 1650);
      assert.strictEqual(updated.total, 1815);

      // Verify written to disk
      assert.ok(fs.existsSync(invPath));
      const readBack = FinanceVaultService.getInvoice('INV-2026-100');
      assert.strictEqual(readBack.items.length, 2);
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 33: REST API /api/journal and /api/finance Endpoints ───────
  await test('REST API /api/journal and /api/finance endpoints return valid responses and sync to disk', async () => {
    const testDir = path.join(__dirname, 'temp-api-vault-test');
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

  // ─── TEST 35: NotesVaultService Atomic Notes & Scratchpad Disk Storage ───
  await test('NotesVaultService reads/writes atomic notes with YAML frontmatter, WikiLinks and Scratchpad', async () => {
    const testDir = path.join(__dirname, 'temp-notes-vault-test');
    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;

    try {
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
      fs.mkdirSync(testDir, { recursive: true });
      config.WORKSPACE_ROOT = testDir;
      WorkspaceService.workspaceRoot = testDir;

      // 1. Save atomic note in permanent
      const note1 = await NotesVaultService.saveAtomicNote({
        id: '20260909120000',
        title: 'Design System Principles',
        category: 'permanent',
        tags: ['design', 'systems', 'tokens'],
        content: '# Design System Principles\n\nMust link to [[Color-Palette]] and [[Typography-Rules]].\n\n- [ ] #task Audit tokens'
      });

      assert.strictEqual(note1.title, 'Design System Principles');
      assert.strictEqual(note1.category, 'permanent');
      assert.ok(note1.links.includes('Color-Palette'));
      assert.ok(note1.links.includes('Typography-Rules'));

      // Check physical file on disk
      const filePath = path.join(testDir, '_Notes', '03_Permanent', '20260909120000 - Design System Principles.md');
      assert.ok(fs.existsSync(filePath), 'Note file should exist on disk in _Notes/03_Permanent');
      const diskContent = fs.readFileSync(filePath, 'utf8');
      assert.ok(diskContent.includes('category: permanent'));
      assert.ok(diskContent.includes('Audit tokens'));

      // 2. Save note in literature that links back
      const note2 = await NotesVaultService.saveAtomicNote({
        id: '20260909130000',
        title: 'Color Palette Notes',
        category: 'literature',
        tags: ['color', 'research'],
        content: '# Color Palette Notes\n\nReferenced by [[Design-System-Principles]].'
      });
      assert.strictEqual(note2.category, 'literature');

      // 3. List all atomic notes
      const notes = await NotesVaultService.getAtomicNotes();
      assert.strictEqual(notes.length, 2);

      // 4. Scratchpad test
      const scratch = await NotesVaultService.saveScratchpad('# Scratchpad Header\n\nInstant dump of ideas.');
      assert.strictEqual(scratch.content, '# Scratchpad Header\n\nInstant dump of ideas.');
      const scratchFile = path.join(testDir, '_Notes', 'Scratchpad.md');
      assert.ok(fs.existsSync(scratchFile));

      const retrievedScratch = await NotesVaultService.getScratchpad();
      assert.strictEqual(retrievedScratch.content, '# Scratchpad Header\n\nInstant dump of ideas.');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 36: NotesVaultService Universal Task Crawler & In-Place Toggle ───
  await test('NotesVaultService extracts universal #task items and toggles directly on disk', async () => {
    const testDir = path.join(__dirname, 'temp-notes-tasks-test');
    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;

    try {
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
      fs.mkdirSync(testDir, { recursive: true });
      config.WORKSPACE_ROOT = testDir;
      WorkspaceService.workspaceRoot = testDir;

      // Create a note with multiple markdown tasks
      await NotesVaultService.saveAtomicNote({
        id: '20260909150000',
        title: 'Client Review Prep',
        category: 'fleeting',
        tags: ['prep'],
        content: '# Client Review Prep\n\n' +
                 '- [ ] #task Export SVG proof sheet 📅 2026-09-20 ⏫ high\n' +
                 '- [x] #task Email agenda to stakeholders\n' +
                 '- [ ] Plain uncompleted note without hash'
      });

      // 1. Get universal tasks
      const tasks = await NotesVaultService.getUniversalTasks();
      assert.strictEqual(tasks.length, 2, 'Should find 2 #task items');

      const task1 = tasks.find(t => t.text.includes('Export SVG proof sheet'));
      assert.ok(task1, 'Export task found');
      assert.strictEqual(task1.completed, false);
      assert.strictEqual(task1.priority, 'high');
      assert.strictEqual(task1.dueDate, '2026-09-20');

      const task2 = tasks.find(t => t.text.includes('Email agenda'));
      assert.ok(task2, 'Email task found');
      assert.strictEqual(task2.completed, true);

      // 2. Toggle task1 to completed
      const toggled = await NotesVaultService.toggleTask('fleeting', '20260909150000', task1.text, true);
      assert.strictEqual(toggled.completed, true);

      // 3. Verify disk markdown reflection
      const noteFiles = fs.readdirSync(path.join(testDir, '_Notes', '01_Fleeting'));
      const noteContent = fs.readFileSync(path.join(testDir, '_Notes', '01_Fleeting', noteFiles[0]), 'utf8');
      assert.ok(noteContent.includes('- [x] #task Export SVG proof sheet'), 'Markdown file on disk must be updated to [x]');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 37: Notes REST API Endpoints Integration ───────────────────
  await test('Express API exposes /api/notes/atomic, /api/notes/scratchpad, and /api/notes/tasks endpoints', async () => {
    const testDir = path.join(__dirname, 'temp-notes-api-test');
    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;

    try {
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
      fs.mkdirSync(testDir, { recursive: true });
      config.WORKSPACE_ROOT = testDir;
      WorkspaceService.workspaceRoot = testDir;

      const express = require('express');
      const apiRoutes = require('../routes/api');
      const app = express();
      app.use(express.json());
      app.use('/api', apiRoutes);

      const server = await new Promise(resolve => {
        const s = app.listen(0, () => resolve(s));
      });
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        // 1. POST /api/notes/atomic
        const saveRes = await fetch(`${baseUrl}/api/notes/atomic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'API Test Note',
            category: 'permanent',
            tags: ['api', 'test'],
            content: '# API Test Note\n\n- [ ] #task Verify API endpoints'
          })
        });
        const saveBody = await saveRes.json();
        assert.strictEqual(saveRes.status, 200);
        assert.strictEqual(saveBody.success, true);
        assert.strictEqual(saveBody.note.title, 'API Test Note');

        // 2. GET /api/notes/atomic
        const listRes = await fetch(`${baseUrl}/api/notes/atomic`);
        const listBody = await listRes.json();
        assert.strictEqual(listRes.status, 200);
        assert.strictEqual(listBody.success, true);
        assert.ok(listBody.notes.some(n => n.title === 'API Test Note'));

        // 3. GET & POST /api/notes/scratchpad
        const postScratchRes = await fetch(`${baseUrl}/api/notes/scratchpad`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Quick note via API' })
        });
        const postScratchBody = await postScratchRes.json();
        assert.strictEqual(postScratchRes.status, 200);
        assert.strictEqual(postScratchBody.success, true);

        const getScratchRes = await fetch(`${baseUrl}/api/notes/scratchpad`);
        const getScratchBody = await getScratchRes.json();
        assert.strictEqual(getScratchRes.status, 200);
        assert.strictEqual(getScratchBody.content, 'Quick note via API');

        // 4. GET /api/notes/tasks
        const tasksRes = await fetch(`${baseUrl}/api/notes/tasks`);
        const tasksBody = await tasksRes.json();
        assert.strictEqual(tasksRes.status, 200);
        assert.ok(tasksBody.tasks.length >= 1);
        assert.ok(tasksBody.tasks.some(t => t.text.includes('Verify API endpoints')));

        // 5. POST /api/notes/tasks/toggle
        const toggleRes = await fetch(`${baseUrl}/api/notes/tasks/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'permanent',
            noteId: saveBody.note.id,
            taskDescription: 'Verify API endpoints',
            completed: true
          })
        });
        const toggleBody = await toggleRes.json();
        assert.strictEqual(toggleRes.status, 200);
        assert.strictEqual(toggleBody.success, true);
        assert.strictEqual(toggleBody.completed, true);
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 38: FinanceVaultService Quote Storage & Markdown Serialization ───
  await test('FinanceVaultService reads, writes, and lists Quotes in _Finance/Quotes/ with YAML frontmatter', async () => {
    const testDir = path.join(__dirname, 'temp-finance-quotes-test');
    const quotesDir = path.join(testDir, '_Finance', 'Quotes');
    fs.mkdirSync(quotesDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Save quote
      const sampleQuote = {
        documentNumber: 'QTE-2026-042',
        type: 'quote',
        clientCode: 'LUM',
        clientName: 'Lumina Labs',
        clientEmail: 'contact@luminalabs.com',
        date: '2026-09-09',
        validUntil: '2026-09-23',
        status: 'draft',
        currency: 'USD',
        hourlyRate: 160,
        items: [
          {
            description: 'AI Interface Design System & Iconography',
            quantity: 25,
            unitPrice: 160,
            amount: 4000
          }
        ],
        subtotal: 4000,
        taxRatePercent: 10,
        taxAmount: 400,
        total: 4400,
        notes: 'Quote valid for 14 calendar days.'
      };

      const savedQuote = FinanceVaultService.saveQuote(sampleQuote);
      assert.strictEqual(savedQuote.documentNumber, 'QTE-2026-042');
      assert.strictEqual(savedQuote.type, 'quote');
      assert.strictEqual(savedQuote.total, 4400);

      // Verify file written to disk
      const filePath = path.join(quotesDir, 'QTE-2026-042_LUM.md');
      assert.ok(fs.existsSync(filePath), 'Physical quote file must exist in _Finance/Quotes/');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      assert.ok(fileContent.includes('type: quote'));
      assert.ok(fileContent.includes('valid_until') && fileContent.includes('2026-09-23'));

      // 2. Read quote list
      const quotes = FinanceVaultService.getQuotes();
      assert.ok(quotes.length >= 1, 'Should find at least 1 quote');
      const retrieved = FinanceVaultService.getQuote('QTE-2026-042');
      assert.ok(retrieved, 'Should retrieve quote by documentNumber');
      assert.strictEqual(retrieved.clientCode, 'LUM');
      assert.strictEqual(retrieved.items.length, 1);
      assert.strictEqual(retrieved.items[0].description, 'AI Interface Design System & Iconography');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 39: FinanceVaultService Quote-to-Invoice Conversion ───────
  await test('FinanceVaultService.convertQuoteToInvoice creates invoice in _Finance/Invoices/ and links documents', async () => {
    const testDir = path.join(__dirname, 'temp-finance-convert-test');
    fs.mkdirSync(path.join(testDir, '_Finance', 'Quotes'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '_Finance', 'Invoices'), { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Save quote
      const quote = FinanceVaultService.saveQuote({
        documentNumber: 'QTE-2026-088',
        clientCode: 'NEX',
        clientName: 'Nexus Studio',
        date: '2026-09-08',
        validUntil: '2026-09-22',
        status: 'draft',
        currency: 'USD',
        hourlyRate: 150,
        items: [
          { description: 'Motion Teaser Sequence', quantity: 10, unitPrice: 150, amount: 1500 }
        ],
        subtotal: 1500,
        taxRatePercent: 0,
        taxAmount: 0,
        total: 1500,
        notes: '2 revisions included.'
      });

      // 2. Convert quote to invoice
      const conversion = FinanceVaultService.convertQuoteToInvoice(quote.documentNumber);
      assert.strictEqual(conversion.success, true);
      assert.ok(conversion.invoice, 'Created invoice must be returned');
      assert.strictEqual(conversion.invoice.type, 'invoice');
      assert.strictEqual(conversion.invoice.clientCode, 'NEX');
      assert.strictEqual(conversion.invoice.linkedQuoteId, 'QTE-2026-088');
      assert.strictEqual(conversion.invoice.total, 1500);

      // Verify invoice file exists on disk in _Finance/Invoices/
      const invFiles = fs.readdirSync(path.join(testDir, '_Finance', 'Invoices')).filter(f => f.endsWith('.md'));
      assert.ok(invFiles.length >= 1, 'Invoice file must be created on disk');

      // Verify quote updated to accepted and linked on disk
      const updatedQuote = FinanceVaultService.getQuote(quote.documentNumber);
      assert.strictEqual(updatedQuote.status, 'accepted');
      assert.strictEqual(updatedQuote.linkedInvoiceId, conversion.invoice.documentNumber);
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 40: Finance REST API Quotes & Conversion Endpoints ─────────
  await test('Express API exposes /api/finance/quotes and /api/finance/convert-quote endpoints', async () => {
    const testDir = path.join(__dirname, 'temp-finance-api-test');
    fs.mkdirSync(path.join(testDir, '_Finance', 'Quotes'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '_Finance', 'Invoices'), { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      const express = require('express');
      const apiRoutes = require('../routes/api');
      const app = express();
      app.use(express.json());
      app.use('/api', apiRoutes);

      const server = await new Promise(resolve => {
        const s = app.listen(0, () => resolve(s));
      });
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        // 1. POST /api/finance/quotes
        const createRes = await fetch(`${baseUrl}/api/finance/quotes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentNumber: 'QTE-2026-999',
            clientCode: 'ACME',
            clientName: 'Acme Corporation',
            date: '2026-09-09',
            validUntil: '2026-09-30',
            status: 'draft',
            currency: 'USD',
            hourlyRate: 125,
            items: [
              { description: 'Annual Brand Refresh', quantity: 20, unitPrice: 125, amount: 2500 }
            ],
            subtotal: 2500,
            taxRatePercent: 0,
            taxAmount: 0,
            total: 2500,
            notes: 'Proposal for brand refresh'
          })
        });
        const createBody = await createRes.json();
        assert.strictEqual(createRes.status, 200);
        assert.strictEqual(createBody.success, true);
        assert.strictEqual(createBody.quote.documentNumber, 'QTE-2026-999');

        // 2. GET /api/finance/quotes
        const listRes = await fetch(`${baseUrl}/api/finance/quotes`);
        const listBody = await listRes.json();
        assert.strictEqual(listRes.status, 200);
        assert.strictEqual(listBody.success, true);
        assert.ok(listBody.quotes.some(q => q.documentNumber === 'QTE-2026-999'));

        // 3. POST /api/finance/convert-quote
        const convertRes = await fetch(`${baseUrl}/api/finance/convert-quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId: 'QTE-2026-999' })
        });
        const convertBody = await convertRes.json();
        assert.strictEqual(convertRes.status, 200);
        assert.strictEqual(convertBody.success, true);
        assert.strictEqual(convertBody.invoice.linkedQuoteId, 'QTE-2026-999');
        assert.strictEqual(convertBody.quote.status, 'accepted');

        // 4. DELETE /api/finance/quotes/:id
        const delRes = await fetch(`${baseUrl}/api/finance/quotes/QTE-2026-999`, {
          method: 'DELETE'
        });
        const delBody = await delRes.json();
        assert.strictEqual(delRes.status, 200);
        assert.strictEqual(delBody.success, true);
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 41: JournalVaultService Monthly Reviews Storage & Listing ───
  await test('JournalVaultService reads, writes, and lists Monthly reviews in _Journal/Monthly/ with YAML frontmatter', async () => {
    const testDir = path.join(__dirname, 'temp-monthly-reviews-test');
    fs.mkdirSync(path.join(testDir, '_Journal', 'Monthly'), { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Save monthly review
      const sampleReview = {
        month: '2026-09',
        title: 'September 2026 Creative Retrospective',
        goals: ['Ship Design Tokens', 'Reduce revision rounds'],
        deliverablesSummary: ['3D Asset Pack', 'Identity Guidelines'],
        billableHours: 56,
        reflections: 'Sublime focus cadence and seamless client approvals.'
      };

      const saved = JournalVaultService.saveMonthlyReview(sampleReview);
      assert.strictEqual(saved.month, '2026-09');
      assert.strictEqual(saved.billableHours, 56);
      assert.strictEqual(saved.goals.length, 2);

      // Verify file on disk
      const filePath = path.join(testDir, '_Journal', 'Monthly', '2026-09.md');
      assert.ok(fs.existsSync(filePath), 'Monthly review file must exist in _Journal/Monthly/');
      const diskContent = fs.readFileSync(filePath, 'utf8');
      assert.ok(diskContent.includes('September 2026 Creative Retrospective'));
      assert.ok(diskContent.includes('Identity Guidelines'));

      // 2. List reviews
      const reviews = JournalVaultService.getMonthlyReviews();
      assert.ok(reviews.length >= 1);
      assert.ok(reviews.some(r => r.month === '2026-09'));
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 42: JournalVaultService Yearly Vision & Retrospective Index ──
  await test('JournalVaultService reads, writes, and serializes Yearly reviews in _Journal/Yearly/ with YAML frontmatter', async () => {
    const testDir = path.join(__dirname, 'temp-yearly-reviews-test');
    fs.mkdirSync(path.join(testDir, '_Journal', 'Yearly'), { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Save yearly review
      const sampleYearly = {
        year: '2026',
        title: '2026 Studio Vision & Annual Index',
        vision: 'Pure minimalist craft with 100% data sovereignty.',
        milestones: ['Built Kanso Cre8 studio engine', 'Retainer with Acme Corp'],
        revenueTarget: 180000,
        revenueActual: 95000,
        clientHighlights: ['Acme Corp', 'Nexus Studio']
      };

      const saved = JournalVaultService.saveYearlyIndex(sampleYearly);
      assert.strictEqual(saved.year, '2026');
      assert.strictEqual(saved.revenueTarget, 180000);
      assert.strictEqual(saved.milestones.length, 2);

      // Verify file on disk
      const filePath = path.join(testDir, '_Journal', 'Yearly', '2026.md');
      assert.ok(fs.existsSync(filePath), 'Yearly file must exist on disk in _Journal/Yearly/');
      const diskContent = fs.readFileSync(filePath, 'utf8');
      assert.ok(diskContent.includes('revenue_target: 180000'));
      assert.ok(diskContent.includes('Built Kanso Cre8 studio engine'));

      // 2. List indexes
      const indexes = JournalVaultService.getYearlyIndexes();
      assert.ok(indexes.length >= 1);
      assert.ok(indexes.some(i => i.year === '2026'));
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 43: JournalVaultService Creative Operations Telemetry Rollups ───
  await test('JournalVaultService computes monthly and yearly creative telemetry from workspace projects and invoices', async () => {
    const testDir = path.join(__dirname, 'temp-journal-telemetry-test');
    fs.mkdirSync(path.join(testDir, '_Journal', 'Monthly'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '_Journal', 'Yearly'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '_Finance', 'Invoices'), { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Write an invoice for 2026-09
      FinanceVaultService.saveInvoice({
        documentNumber: 'INV-2026-701',
        clientCode: 'ACME',
        clientName: 'Acme Corporation',
        date: '2026-09-05',
        status: 'paid',
        items: [
          { description: 'Design Sprint', quantity: 20, unitPrice: 150, amount: 3000 }
        ],
        subtotal: 3000,
        taxRatePercent: 0,
        taxAmount: 0,
        total: 3000
      });

      // 2. Compute monthly telemetry
      const mTelemetry = JournalVaultService.getMonthlyTelemetryRollup('2026-09');
      assert.strictEqual(mTelemetry.month, '2026-09');
      assert.strictEqual(mTelemetry.totalRevenue, 3000);
      assert.strictEqual(mTelemetry.paidRevenue, 3000);
      assert.strictEqual(mTelemetry.billableHours, 20);
      assert.ok(mTelemetry.activeClients.includes('ACME'));

      // 3. Compute yearly telemetry
      const yTelemetry = JournalVaultService.getYearlyTelemetryRollup('2026');
      assert.strictEqual(yTelemetry.year, '2026');
      assert.strictEqual(yTelemetry.totalRevenue, 3000);
      assert.strictEqual(yTelemetry.totalHours, 20);
      assert.strictEqual(yTelemetry.effectiveRate, 150);
      assert.strictEqual(yTelemetry.monthlyCurve.length, 12);
      assert.ok(yTelemetry.clientDistribution.some(c => c.clientCode === 'ACME'));
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 44: Express API Monthly/Yearly BuJo & Telemetry Endpoints ────
  await test('Express API exposes /api/journal/monthly, /api/journal/yearly, and telemetry endpoints', async () => {
    const testDir = path.join(__dirname, 'temp-journal-api-test');
    fs.mkdirSync(path.join(testDir, '_Journal', 'Monthly'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '_Journal', 'Yearly'), { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      const express = require('express');
      const apiRoutes = require('../routes/api');
      const app = express();
      app.use(express.json());
      app.use('/api', apiRoutes);

      const server = await new Promise(resolve => {
        const s = app.listen(0, () => resolve(s));
      });
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        // 1. POST /api/journal/monthly
        const postMonth = await fetch(`${baseUrl}/api/journal/monthly`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            month: '2026-08',
            title: 'August Retrospective',
            goals: ['Launch campaign'],
            deliverablesSummary: ['Motion Cut'],
            billableHours: 40,
            reflections: 'Productive month'
          })
        });
        const monthBody = await postMonth.json();
        assert.strictEqual(postMonth.status, 200);
        assert.strictEqual(monthBody.success, true);
        assert.strictEqual(monthBody.review.month, '2026-08');

        // 2. GET /api/journal/monthly/2026-08/telemetry
        const monthTelem = await fetch(`${baseUrl}/api/journal/monthly/2026-08/telemetry`);
        const telemBody = await monthTelem.json();
        assert.strictEqual(monthTelem.status, 200);
        assert.strictEqual(telemBody.success, true);
        assert.strictEqual(telemBody.telemetry.month, '2026-08');

        // 3. POST /api/journal/yearly
        const postYear = await fetch(`${baseUrl}/api/journal/yearly`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: '2026',
            title: '2026 Studio Vision',
            vision: 'Craft-led design studio',
            milestones: ['Milestone 1'],
            revenueTarget: 160000,
            revenueActual: 90000
          })
        });
        const yearBody = await postYear.json();
        assert.strictEqual(postYear.status, 200);
        assert.strictEqual(yearBody.success, true);
        assert.strictEqual(yearBody.review.year, '2026');

        // 4. GET /api/journal/yearly/2026/telemetry
        const yearTelem = await fetch(`${baseUrl}/api/journal/yearly/2026/telemetry`);
        const yTelemBody = await yearTelem.json();
        assert.strictEqual(yearTelem.status, 200);
        assert.strictEqual(yTelemBody.success, true);
        assert.strictEqual(yTelemBody.telemetry.year, '2026');
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  // ─── TEST 45: Tauri v2 Desktop Shell & Multi-Platform Packaging ───────────
  await test('Tauri v2 desktop shell configuration, system tray icon, and packaging pipeline integrity', async () => {
    const tauriConfPath = path.join(__dirname, '..', '..', 'src-tauri', 'tauri.conf.json');
    const cargoTomlPath = path.join(__dirname, '..', '..', 'src-tauri', 'Cargo.toml');
    const mainRsPath = path.join(__dirname, '..', '..', 'src-tauri', 'src', 'main.rs');
    const workflowPath = path.resolve(__dirname, '../../../../.github/workflows/tauri-build.yml');

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
    assert.ok(fs.existsSync(workflowPath), 'GitHub Actions tauri-build.yml must exist');
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    assert.ok(workflow.includes('tauri-action@v1'));
    assert.ok(workflow.includes('windows-latest'));
    assert.ok(workflow.includes('ubuntu-22.04'));
  });

  console.log(`\n========================================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================================\n`);

  // Cleanup test audit log
  AuditService.getAuditLogPath = origAuditGetPath;
  try { if (fs.existsSync(tempAuditPath)) fs.unlinkSync(tempAuditPath); } catch (e) {}

  if (WorkspaceService.watcher) {
    try { await WorkspaceService.watcher.close(); } catch (e) {}
  }

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
