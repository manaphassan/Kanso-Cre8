/**
 * Automated Verification Test Suite for Kanso Cre8 Desktop Application Engine
 * Orchestrates modular per-service test suites.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

// Must run before any service loads config.js: tests must never touch the real %APPDATA%/KansoCre8/app.json.
const tempMachineDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanso-test-'));
process.env.KANSO_MACHINE_CONFIG = path.join(tempMachineDir, 'app.json');
process.on('exit', () => {
  try { fs.rmSync(tempMachineDir, { recursive: true, force: true }); } catch (_) {}
});

const WorkspaceService = require('../services/WorkspaceService');
const AuditService = require('../services/AuditService');

console.log('Starting Kanso Cre8 Desktop Application Verification Suite...\n');

// Mock AuditService path to prevent polluting production NAS audit logs
const origAuditGetPath = AuditService.getAuditLogPath;
const tempAuditPath = path.join(__dirname, 'temp-test-audit.jsonl');
AuditService.getAuditLogPath = () => tempAuditPath;

const testSuites = [
  { name: 'Frontmatter & Storage', module: require('./frontmatter.test') },
  { name: 'Workspace & Projects', module: require('./workspace.test') },
  { name: 'Deliverables & Media', module: require('./deliverables.test') },
  { name: 'Finance & Invoices', module: require('./finance.test') },
  { name: 'Journal & BuJo', module: require('./journal.test') },
  { name: 'Notes & Atelier', module: require('./notes.test') },
  { name: 'Team, Clients & License', module: require('./team.test') },
  { name: 'System & Platform', module: require('./system.test') },
  { name: 'Config & Security', module: require('./config.test') }
];

async function runTests() {
  const sampleWsRoot = path.resolve(__dirname, '../../sample-workspace');
  WorkspaceService.setWorkspaceRoot(sampleWsRoot, 'TestRunner');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
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

  for (const suite of testSuites) {
    await suite.module(test, { sampleWsRoot });
  }

  console.log('\n========================================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

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

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
