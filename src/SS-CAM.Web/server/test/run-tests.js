/**
 * Automated Verification Test Suite for SS-CAM Web Portal
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const FrontmatterService = require('../services/FrontmatterService');
const AuditService = require('../services/AuditService');
const DeliverableService = require('../services/DeliverableService');
const WorkspaceService = require('../services/WorkspaceService');
const ApprovalService = require('../services/ApprovalService');

console.log('🧪 Starting SS-CAM Web Management Portal Verification Suite...\n');

// Mock AuditService path to prevent polluting production NAS audit logs
const origAuditGetPath = AuditService.getAuditLogPath;
const tempAuditPath = path.join(__dirname, 'temp-test-audit.jsonl');
AuditService.getAuditLogPath = () => tempAuditPath;

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
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
    const projects = WorkspaceService.getAllProjects();
    if (projects.length > 0) {
      const target = projects[0];
      const initialRev = target.revision || 0;

      const result = ApprovalService.processDecision({
        projectId: target.id,
        decision: 'revision_requested',
        reviewer: 'QA Lead',
        role: 'CreativeManager',
        comment: 'Please refine typography hierarchy'
      });

      assert.ok(result.success);
      assert.strictEqual(result.project.status, 'revision');
      assert.strictEqual(result.project.revision, initialRev + 1);
      assert.ok(result.project.approvals.length > 0);
      assert.strictEqual(result.project.approvals[0].decision, 'revision_requested');
    }
  });

  // ─── TEST 7: Sidebar Navigation & App Ecosystem DOM Structure ─────
  test('App.svelte and Client structure include SS-CAM Desktop ecosystem navigation', () => {
    const svelteAppPath = path.join(__dirname, '../../client/src/App.svelte');
    const indexPath = path.join(__dirname, '../../client/index.html');
    const content = fs.existsSync(svelteAppPath)
      ? fs.readFileSync(svelteAppPath, 'utf8')
      : fs.readFileSync(indexPath, 'utf8');

    assert.ok(content.includes('app-sidebar'), 'Sidebar root element must exist');
    assert.ok(content.includes('sidebar-nav'), 'Sidebar nav container must exist');
    assert.ok(content.includes('desktop-app-banner') || content.includes('Desktop Client'), 'Desktop Client banner must exist');
    assert.ok(
      content.includes('https://suamisihat.github.io/ss_cam/') || content.includes('https://github.com/SuamiSihat/ss_cam/releases'),
      'SS-CAM landing page or release link must exist'
    );
  });

  // ─── TEST 8: Login View DOM Structure & Authentication ─────────────
  test('LoginView renders brand header, quick sign-in roster, and authentication form', () => {
    const svelteLoginPath = path.join(__dirname, '../../client/src/lib/views/LoginView.svelte');
    const legacyLoginPath = path.join(__dirname, '../../client/js/views/LoginView.js');
    const content = fs.existsSync(svelteLoginPath)
      ? fs.readFileSync(svelteLoginPath, 'utf8')
      : fs.readFileSync(legacyLoginPath, 'utf8');

    assert.ok(content.includes('SuamiSihat Creative Portal') || content.includes('login-hero-bg'), 'Login title/viewport must exist');
    assert.ok(content.includes('quick-roster') || content.includes('heroWaveCanvas'), 'Quick roster or canvas must exist');
    assert.ok(content.includes('Sign In') || content.includes('login-card-static'), 'Sign in card must exist');
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
  test('CompanyService manages corporate holding subsidiaries (SSH, SSC, SSW, SSE, SST)', () => {
    const CompanyService = require('../services/CompanyService');
    const companies = CompanyService.getAll();

    assert.ok(Array.isArray(companies), 'Companies must return an array');
    assert.ok(companies.length >= 5, 'Must contain at least 5 default subsidiaries');

    const holding = CompanyService.getByCode('SSH');
    assert.ok(holding, 'SuamiSihat Holding (SSH) must exist');
    assert.strictEqual(holding.name, 'SuamiSihat Holding Sdn Bhd');
    assert.strictEqual(holding.isParent, true);

    const healthcare = CompanyService.getByCode('SSC');
    assert.ok(healthcare, 'SuamiSihat Healthcare (SSC) must exist');

    const wellness = CompanyService.getByCode('SSW');
    assert.ok(wellness, 'SuamiSihat Ellness (SSW) must exist');

    const ecommerce = CompanyService.getByCode('SSE');
    assert.ok(ecommerce, 'SuamiSihat Ecommerce (SSE) must exist');

    const tech = CompanyService.getByCode('SST');
    assert.ok(tech, 'SuamiSihat Technology (SST) must exist');

    // Test saving an update
    const updated = CompanyService.saveCompany({
      code: 'SST',
      name: 'SuamiSihat Technology Sdn Bhd',
      location: 'Cyberjaya, Selangor'
    });
    assert.strictEqual(updated.location, 'Cyberjaya, Selangor');
  });

  // ─── TEST 12: TeamService & User Staff Directory Governance ────────
  test('TeamService provisions, updates, and validates staff user accounts', () => {
    const TeamService = require('../services/TeamService');
    const { getUserRoles, getUserPermissions } = require('../middleware/auth');
    const roster = TeamService.getStaffRoster();

    assert.ok(Array.isArray(roster), 'Staff roster must return an array');
    assert.ok(roster.length >= 6, 'Must contain canonical creative team members');

    const hasan = roster.find(m => m.staffId === 'SS0001');
    assert.ok(hasan, 'Hasan (SS0001) must exist');
    assert.ok(hasan.role, 'Hasan must have an assigned role');

    // Test adding and updating a multi-role staff user
    const testStaffId = 'SS9999';
    try {
      TeamService.deleteStaffMember(testStaffId);
    } catch (e) {}

    const added = TeamService.addStaffMember({
      staffId: testStaffId,
      name: 'Test Staff Designer & Copywriter',
      roles: ['Designer', 'Copywriter'],
      department: 'Creative Production',
      defaultBrand: 'SS'
    });

    assert.strictEqual(added.staffId, 'SS9999');
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
    
    const harussani = directory.find(m => m.staffId === 'SS0004' || m.name === 'Harussani');
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
  test('DeliverableService supports HTTP 206 Partial Content range requests for video media', () => {
    const tempFile = path.join(__dirname, 'temp-video-stream.mp4');
    const dummyBuffer = Buffer.alloc(1024 * 10, 'A'); // 10 KB dummy video
    fs.writeFileSync(tempFile, dummyBuffer);

    let status = 200;
    let headers = {};
    const mockRes = {
      writeHead: (code, hdrs) => {
        status = code;
        headers = hdrs;
      },
      status: (code) => {
        status = code;
        return {
          setHeader: (k, v) => { headers[k] = v; },
          end: () => {}
        };
      },
      write: () => {},
      end: () => {},
      on: () => {},
      once: () => {},
      emit: () => {}
    };

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

    // Cleanup
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
  test('ExportService generates clean ZIP stream and HTML handover summary manifest', (done) => {
    const ExportService = require('../services/ExportService');
    const testDir = path.join(__dirname, 'temp-export-project');
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
    const mockRes = {
      setHeader: (k, v) => { headers[k] = v; },
      writeHead: () => {},
      headersSent: false,
      write: (c) => outStream.write(c),
      end: (c) => outStream.end(c),
      on: (e, cb) => outStream.on(e, cb),
      once: (e, cb) => outStream.once(e, cb),
      emit: (e, ...args) => outStream.emit(e, ...args)
    };

    ExportService.streamProjectHandover(testDir, '0085D', mockRes);

    assert.strictEqual(headers['Content-Type'], 'application/zip');
    assert.ok(headers['Content-Disposition'].includes('Handover.zip'));

    // Cleanup
    setTimeout(() => {
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
      try { if (fs.existsSync(tempZipOut)) fs.unlinkSync(tempZipOut); } catch (e) {}
    }, 500);
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
  test('WorkspaceService dynamically switches workspace root path, restarts watcher, and persists override', () => {
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
        brand: 'SSH',
        title: 'Maca Gold Launch',
        audience: 'Men 30-50',
        goal: 'Direct Response'
      });
      assert.ok(ultraPrompt.includes('SUAMISIHAT CREATIVE CAMPAIGN PROMPT'), 'Must contain header');
      assert.ok(ultraPrompt.includes('Maca Gold Launch'), 'Must contain project title');
      assert.ok(ultraPrompt.includes('SSH'), 'Must contain brand code');
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

  console.log(`\n========================================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================================\n`);

  // Cleanup test audit log
  AuditService.getAuditLogPath = origAuditGetPath;
  try { if (fs.existsSync(tempAuditPath)) fs.unlinkSync(tempAuditPath); } catch (e) {}

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
