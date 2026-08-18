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
    assert.ok(content.includes('SS-CAM Desktop'), 'SS-CAM Desktop navigation text must exist');
    assert.ok(content.includes('https://github.com/SuamiSihat/ss_cam/releases'), 'SS-CAM release link must exist');
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
    const roster = TeamService.getStaffRoster();

    assert.ok(Array.isArray(roster), 'Staff roster must return an array');
    assert.ok(roster.length >= 6, 'Must contain canonical creative team members');

    const hasan = roster.find(m => m.staffId === 'SS0001');
    assert.ok(hasan, 'Hasan (SS0001) must exist');
    assert.strictEqual(hasan.role, 'Chief Executive Officer');

    // Test adding and updating a staff user
    const testStaffId = 'SS9999';
    try {
      TeamService.deleteStaffMember(testStaffId);
    } catch (e) {}

    const added = TeamService.addStaffMember({
      staffId: testStaffId,
      name: 'Test Staff Designer',
      role: 'Multimedia Designer',
      department: 'Creative Production',
      defaultBrand: 'SS'
    });

    assert.strictEqual(added.staffId, 'SS9999');
    assert.strictEqual(added.name, 'Test Staff Designer');

    const updated = TeamService.updateStaffMember(testStaffId, {
      name: 'Test Staff Lead Designer'
    });
    assert.strictEqual(updated.name, 'Test Staff Lead Designer');

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
    const testProjectId = '0085D';
    const proj = WorkspaceService.getProjectById(testProjectId);
    const testDir = proj ? proj.fullPath : path.join(require('../config').WORKSPACE_ROOT, '2026', '202608_August', '202608_0085D_SS_Rejal_Premium_Packaging');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const copyData = CopywritingService.getCopywriting(testDir, testProjectId, 'Rejal Premium Packaging');
    assert.ok(copyData.body, 'Must return non-empty copywriting markdown body');
    assert.ok(copyData.stats.words > 0, 'Must compute word count');
    assert.ok(copyData.filePath.includes('03_COPYWRITING') || copyData.filePath.includes('COPY.md'), 'Must resolve copy file path');

    // Test saving custom markdown copy
    const customCopy = '# Updated Video Script Hook\n\n- Hook 1: Raw Honey vitality test';
    const saved = CopywritingService.updateCopywriting(testDir, testProjectId, customCopy, 'Test Writer', 'Copywriter');
    assert.strictEqual(saved.success, true);
    assert.strictEqual(saved.body, customCopy);
  });

  console.log(`\n========================================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
