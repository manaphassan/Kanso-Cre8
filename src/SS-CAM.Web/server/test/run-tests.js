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

  // ─── TEST 7: Sidebar Navigation & App Banner DOM Structure ─────────
  test('Client index.html includes SS-CAM Desktop nav item and download banner DOM elements', () => {
    const indexPath = path.join(__dirname, '../../client/index.html');
    const htmlContent = fs.readFileSync(indexPath, 'utf8');

    assert.ok(htmlContent.includes('<aside class="app-sidebar">'), 'Sidebar root element must exist');
    assert.ok(htmlContent.includes('<nav class="sidebar-nav">'), 'Sidebar nav container must exist');
    assert.ok(htmlContent.includes('<div class="nav-category">Desktop Ecosystem</div>'), 'Desktop Ecosystem category heading must exist');
    assert.ok(htmlContent.includes('SS-CAM Desktop'), 'SS-CAM Desktop navigation text must exist');
    assert.ok(htmlContent.includes('https://github.com/SuamiSihat/ss_cam/releases/tag/v3.6.1'), 'SS-CAM release tag link must exist');
    assert.ok(htmlContent.includes('<div class="sidebar-app-banner"'), 'Sidebar desktop app banner card must exist');
    assert.ok(htmlContent.includes('Download SS-CAM v3.6.1 (.exe)'), 'SS-CAM executable download button must exist');
  });

  // ─── TEST 8: Login View Canvas & Glassmorphism Card DOM Structure ──
  test('LoginView.js renders wave canvas, ambient glow, and static glassmorphism DOM card', () => {
    const loginViewPath = path.join(__dirname, '../../client/js/views/LoginView.js');
    const jsContent = fs.readFileSync(loginViewPath, 'utf8');

    assert.ok(jsContent.includes('<div class="login-hero-bg" id="login-hero-viewport">'), 'Login hero viewport container must exist');
    assert.ok(jsContent.includes('<canvas id="heroWaveCanvas"'), 'heroWaveCanvas canvas element must exist');
    assert.ok(jsContent.includes('<div class="login-ambient-glow"></div>'), 'login-ambient-glow element must exist');
    assert.ok(jsContent.includes('<div class="login-card-static">'), 'login-card-static glassmorphism container must exist');
    assert.ok(jsContent.includes('linear-gradient(180deg, #022057 0%, #043388 60%, #021233 100%)'), 'Prussian blue vertical gradient background must be defined');
    assert.ok(!jsContent.includes('water-flow-particle'), 'Previous water flow particle DOM elements must be removed');
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
