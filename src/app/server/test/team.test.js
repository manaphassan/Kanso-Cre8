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
  test('CompanyService provisions and manages active client entities via _Clients markdown', () => {
    const testDir = path.join(__dirname, 'temp-client-test');
    const origRoot = config.WORKSPACE_ROOT;
    config.WORKSPACE_ROOT = testDir;

    try {
      const CompanyService = require('../services/CompanyService');
      assert.deepStrictEqual(CompanyService.getAll(), [], 'A clean vault must not auto-seed demo clients');

      require('../services/DemoDataService').setEnabled(true);
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

      // Assert physical markdown file was written
      const luminaMd = path.join(testDir, '_Clients', 'LUM_LuminaLabs', 'client.md');
      assert.ok(fs.existsSync(luminaMd), 'client.md must exist on disk in _Clients folder');
      const mdContent = fs.readFileSync(luminaMd, 'utf8');
      assert.ok(mdContent.includes('Singapore'));

      // Assert companies.json is NEVER created
      const legacyJson = path.join(testDir, '_Team', '_Config', 'companies.json');
      assert.strictEqual(fs.existsSync(legacyJson), false, 'companies.json must NEVER be created');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  test('DemoDataService keeps vaults clean by default, loads samples on request, and clears only demo items', () => {
    const testDir = path.join(__dirname, 'temp-demo-test');
    const origRoot = config.WORKSPACE_ROOT;
    const origWsRoot = WorkspaceService.workspaceRoot;
    fs.mkdirSync(testDir, { recursive: true });
    WorkspaceService.workspaceRoot = testDir;
    config.WORKSPACE_ROOT = testDir;

    try {
      const DemoDataService = require('../services/DemoDataService');
      const clientsDir = path.join(testDir, '_Clients');

      assert.strictEqual(DemoDataService.isEnabled(), false, 'demo data must be off by default');
      NotesVaultService.ensureSeeded();
      FinanceVaultService.ensureQuotesSeeded();
      assert.strictEqual(DemoDataService.getStatus().present, false, 'no demo items on a fresh vault');
      assert.strictEqual(FinanceVaultService.getQuotes().length, 0, 'no sample quote by default');

      DemoDataService.setEnabled(true);
      CompanyService.ensureCanonicalSeeds();
      NotesVaultService.ensureSeeded();
      FinanceVaultService.ensureQuotesSeeded();
      const loaded = DemoDataService.getStatus();
      assert.strictEqual(loaded.counts.client, 3);
      assert.strictEqual(loaded.counts.quote, 1);
      assert.strictEqual(loaded.counts.note, 3);

      // User-created client and a demo client holding a user file must survive
      fs.mkdirSync(path.join(clientsDir, 'ZZZ_Mine'), { recursive: true });
      fs.writeFileSync(path.join(clientsDir, 'ZZZ_Mine', 'client.md'), '---\nname: Mine\ncode: ZZZ\n---\n', 'utf8');
      fs.writeFileSync(path.join(clientsDir, 'NEX_NexusStudio', 'brand-notes.txt'), 'mine', 'utf8');

      const result = DemoDataService.clear();
      assert.strictEqual(DemoDataService.isEnabled(), false);
      assert.ok(result.skipped.some(s => s.label === 'NEX_NexusStudio'), 'client with user files is kept');
      assert.ok(fs.existsSync(path.join(clientsDir, 'ZZZ_Mine', 'client.md')), 'user client untouched');
      assert.strictEqual(fs.existsSync(path.join(clientsDir, 'ACME_AcmeCorp')), false);
      assert.strictEqual(DemoDataService.getStatus().counts.quote, undefined);
      assert.strictEqual(DemoDataService.getStatus().counts.note, undefined);
    } finally {
      WorkspaceService.workspaceRoot = origWsRoot;
      config.WORKSPACE_ROOT = origRoot;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  test('VaultPathService.getVaultStatus repairs an empty vault and reports an unreachable one', () => {
    const emptyDir = path.join(__dirname, 'temp-status-test');
    const origRoot = config.WORKSPACE_ROOT;
    const origWsRoot = WorkspaceService.workspaceRoot;
    fs.mkdirSync(emptyDir, { recursive: true });

    try {
      WorkspaceService.workspaceRoot = emptyDir;
      const ok = WorkspaceService.getVaultStatus();
      assert.strictEqual(ok.ok, true);
      assert.ok(ok.repaired.includes('_Clients'), 'missing base folders are recreated');
      assert.ok(fs.existsSync(path.join(emptyDir, '_Notes', 'Scratchpad.md')));
      assert.deepStrictEqual(WorkspaceService.getVaultStatus().repaired, [], 'second run is a no-op');

      WorkspaceService.workspaceRoot = path.join(emptyDir, 'does-not-exist');
      const missing = WorkspaceService.getVaultStatus();
      assert.strictEqual(missing.ok, false);
      assert.strictEqual(missing.reason, 'missing_root');
    } finally {
      WorkspaceService.workspaceRoot = origWsRoot;
      config.WORKSPACE_ROOT = origRoot;
      try { fs.rmSync(emptyDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  test('TeamService provisions, updates, and validates staff user accounts', () => {
    const testDir = path.join(__dirname, 'temp-team-test');
    const origRoot = config.WORKSPACE_ROOT;
    config.WORKSPACE_ROOT = testDir;

    try {
      const TeamService = require('../services/TeamService');
      const { getUserRoles, getUserPermissions } = require('../middleware/auth');
      const roster = TeamService.getStaffRoster();

      assert.ok(Array.isArray(roster), 'Staff roster must return an array');
      assert.ok(roster.length >= 6, 'Must contain canonical creative team members');

      const lead = roster.find(m => m.staffId === 'ACME001' || m.username === 'alex');
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
      
      const alex = directory.find(m => m.staffId === 'ACME001' || m.name === 'Alex Mercer');
      assert.ok(alex, 'Alex Mercer (Art Director) must be in creative team directory');
      assert.ok(alex.workload, 'Alex Mercer must have workload metrics object');
      assert.strictEqual(typeof alex.workload.active, 'number', 'Workload active count must be a number');
      assert.strictEqual(typeof alex.capacityStatus, 'string', 'Capacity status must be a string');
      assert.strictEqual(typeof alex.workload.weightedLoad, 'number', 'Weighted load must be a number');
      assert.ok(Array.isArray(alex.assignedProjects), 'Assigned projects must be an array');
      if (alex.assignedProjects.length > 0) {
        assert.strictEqual(typeof alex.assignedProjects[0].slaDays, 'number', 'Assigned project must have numeric slaDays');
        assert.strictEqual(typeof alex.assignedProjects[0].slotWeight, 'number', 'Assigned project must have numeric slotWeight');
      }

      // Cleanup
      TeamService.deleteStaffMember(testStaffId);
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  await test('TeamService and REST API manage offline perpetual license key in _Team/_Config/license.key with zero telemetry', async () => {
    const testDir = path.join(__dirname, 'temp-license-test');
    const origRoot = config.WORKSPACE_ROOT;
    config.WORKSPACE_ROOT = testDir;

    try {
      // 1. Initial state should be null
      assert.strictEqual(TeamService.getLicense(), null);

      // 2. Save license key
      const testKey = 'KANSO-PRO-STUDIO-2026-ALPHA-VERIFIED';
      const saved = TeamService.saveLicense(testKey);
      assert.strictEqual(saved, true);
      assert.strictEqual(TeamService.getLicense(), testKey);

      // 3. Verify physical file exists on disk
      const licensePath = path.join(testDir, '_Team', '_Config', 'license.key');
      assert.ok(fs.existsSync(licensePath), 'license.key must exist on disk');
      assert.strictEqual(fs.readFileSync(licensePath, 'utf8').trim(), testKey);

      // 4. Test REST API endpoint using local express server
      const express = require('express');
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api', require('../routes/api'));

      const server = testApp.listen(0);
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const getRes = await fetch(`${baseUrl}/api/system/license`);
        const getBody = await getRes.json();
        assert.strictEqual(getRes.status, 200);
        assert.strictEqual(getBody.success, true);
        assert.strictEqual(getBody.license, testKey);

        // 5. Test updating via PUT
        const newKey = 'KANSO-PRO-CUSTOM-TEST-VERIFIED';
        const putRes = await fetch(`${baseUrl}/api/system/license`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: newKey })
        });
        const putBody = await putRes.json();
        assert.strictEqual(putRes.status, 200);
        assert.strictEqual(putBody.success, true);
        assert.strictEqual(TeamService.getLicense(), newKey);
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  test('LicenseService verifies offline canonical master key and deterministic signatures', () => {
    // 1. Verify canonical alpha key
    const alphaVerif = LicenseService.verifyKey(LicenseService.CANONICAL_ALPHA_KEY);
    assert.strictEqual(alphaVerif.valid, true);
    assert.strictEqual(alphaVerif.tier, 'pro');
    assert.strictEqual(alphaVerif.status, 'valid');
    assert.strictEqual(alphaVerif.payload.type, 'alpha-studio');

    // 2. Generate and verify a custom offline key
    const generated = LicenseService.generateKey({
      licensee: 'Nexus Creative Lab',
      email: 'studio@nexuslab.io',
      issued: '2026-09-16'
    });
    assert.ok(generated.key.startsWith('KANSO-PRO-'));
    assert.strictEqual(generated.payload.licensee, 'Nexus Creative Lab');

    const genVerif = LicenseService.verifyKey(generated.key);
    assert.strictEqual(genVerif.valid, true);
    assert.strictEqual(genVerif.tier, 'pro');
    assert.strictEqual(genVerif.payload.licensee, 'Nexus Creative Lab');
    assert.strictEqual(genVerif.payload.email, 'studio@nexuslab.io');

    // 3. Reject tampered key
    const tamperedKey = generated.key.slice(0, -2) + '00';
    const tamperedVerif = LicenseService.verifyKey(tamperedKey);
    assert.strictEqual(tamperedVerif.valid, false);

    // 4. Test disk save, status, and deactivation
    const testWs = path.join(__dirname, 'temp-license-ws');
    const origRoot = config.WORKSPACE_ROOT;
    config.WORKSPACE_ROOT = testWs;
    WorkspaceService.workspaceRoot = testWs;

    try {
      // Initially unlicensed
      const initialStatus = LicenseService.getLicenseStatus();
      assert.strictEqual(initialStatus.tier, 'zen');
      assert.strictEqual(initialStatus.isPro, false);

      // Save pro key
      const saveRes = LicenseService.saveLicense(LicenseService.CANONICAL_ALPHA_KEY);
      assert.strictEqual(saveRes.success, true);
      assert.strictEqual(saveRes.status.tier, 'pro');
      assert.strictEqual(saveRes.status.isPro, true);

      // Read back status
      const savedStatus = LicenseService.getLicenseStatus();
      assert.strictEqual(savedStatus.isPro, true);
      assert.strictEqual(savedStatus.licenseKey, LicenseService.CANONICAL_ALPHA_KEY);

      // Deactivate
      const deactRes = LicenseService.deactivateLicense();
      assert.strictEqual(deactRes.success, true);
      assert.strictEqual(deactRes.status.tier, 'zen');
      assert.strictEqual(deactRes.status.isPro, false);

      const postDeact = LicenseService.getLicenseStatus();
      assert.strictEqual(postDeact.isPro, false);
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origRoot;
      try { fs.rmSync(testWs, { recursive: true, force: true }); } catch (e) {}
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
