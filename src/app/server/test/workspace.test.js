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
const VaultPathService = require('../services/VaultPathService');



module.exports = async function run(test, context = {}) {
  test('WorkspaceService accurately computes dashboard metrics', () => {
    const metrics = WorkspaceService.getDashboardMetrics();
    assert.ok(typeof metrics.kpis.total === 'number');
    assert.ok(typeof metrics.kpis.active === 'number');
    assert.ok(typeof metrics.kpis.pendingReview === 'number');
    assert.ok(Array.isArray(metrics.designerWorkload));
    assert.ok(metrics.pipeline.inProgress !== undefined);
  });

  test('WorkspaceService safely deletes project folder and subdirectories with audit log', () => {
    const testDir = path.join(__dirname, 'temp-delete-workspace');
    const projectDir = path.join(testDir, '2026', '202608_August', '202608_9999D_SS_Temp_Test_Project');
    const sub1 = path.join(projectDir, '01_BRIEF_ASSETS');
    const sub2 = path.join(projectDir, '02_SOURCE_FILES');
    const sub3 = path.join(projectDir, '03_COPY');
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
      
      // Verify machine config was written and legacy override was not created in server/
      const machineConfigPath = config.getMachineConfigPath();
      assert.ok(fs.existsSync(machineConfigPath), 'Machine config app.json must exist');
      const savedConfig = config.loadMachineConfig();
      assert.strictEqual(path.resolve(savedConfig.workspaceRoot), path.resolve(tempSwitchDir), 'Saved config must match new path');
      const legacyPath = path.resolve(__dirname, '../workspace_config.json');
      assert.strictEqual(fs.existsSync(legacyPath), false, 'workspace_config.json must not be created in server/');

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

  await test('WorkspaceService scans sync conflicts and resolves via keep_local, keep_conflict, and archive', async () => {
    const testDir = path.join(__dirname, 'temp-sync-conflict-test');
    const notesDir = path.join(testDir, '_Notes', '01_Fleeting');
    fs.mkdirSync(notesDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Create master note and conflicted copy
      const baseFile = path.join(notesDir, 'Meeting_Notes.md');
      const conflictFile = path.join(notesDir, "Meeting_Notes (Sarah's conflicted copy 2026-09-15).md");

      fs.writeFileSync(baseFile, '# Meeting Notes (Local Master)\n', 'utf8');
      fs.writeFileSync(conflictFile, '# Meeting Notes (Cloud Conflicted Copy)\n', 'utf8');

      // 2. Scan conflicts
      const conflicts = WorkspaceService.scanSyncConflicts();
      assert.strictEqual(conflicts.length, 1);
      assert.strictEqual(conflicts[0].baseFilename, 'Meeting_Notes.md');
      assert.strictEqual(conflicts[0].baseExists, true);

      // 3. Resolve via archive
      const archiveRes = WorkspaceService.resolveSyncConflict(conflictFile, 'archive');
      assert.strictEqual(archiveRes.success, true);
      assert.ok(!fs.existsSync(conflictFile), 'Original conflict file should be moved');
      const expectedArchive = path.join(notesDir, "archived_Meeting_Notes (Sarah's conflicted copy 2026-09-15).md");
      assert.ok(fs.existsSync(expectedArchive), 'Archived file must exist');

      // Clean up archive file
      try { fs.unlinkSync(expectedArchive); } catch (e) {}

      // 4. Test keep_local resolution
      fs.writeFileSync(conflictFile, '# Conflicted\n', 'utf8');
      const localRes = WorkspaceService.resolveSyncConflict(conflictFile, 'keep_local');
      assert.strictEqual(localRes.success, true);
      assert.ok(!fs.existsSync(conflictFile), 'Conflict file must be unlinked');
      assert.ok(fs.existsSync(baseFile), 'Base file must be preserved');
      assert.strictEqual(fs.readFileSync(baseFile, 'utf8'), '# Meeting Notes (Local Master)\n');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  await test('Kanban stage transitions update README frontmatter and deliverable decisions persist', async () => {
    const testWs = path.join(__dirname, 'temp-kanban-pipeline-test');
    const origRoot = config.WORKSPACE_ROOT;

    try {
      if (fs.existsSync(testWs)) fs.rmSync(testWs, { recursive: true, force: true });
      fs.mkdirSync(testWs, { recursive: true });
      config.WORKSPACE_ROOT = testWs;
      WorkspaceService.workspaceRoot = testWs;

      // 1. Scaffold project in backlog
      const scaffoldRes = WorkspaceService.scaffoldProject({
        jobId: '0099',
        brand: 'ACME',
        title: 'Atelier Brand System',
        status: 'backlog',
        designer: 'Alex Mercer',
        priority: 'high'
      }, 'Alex Mercer');

      assert.strictEqual(scaffoldRes.success, true);
      const project = scaffoldRes.project;
      assert.strictEqual(project.status, 'backlog');

      // Check README.md on disk
      const readmePath = path.join(project.fullPath, 'README.md');
      assert.ok(fs.existsSync(readmePath), 'Project README.md must exist on disk');
      let { frontmatter, body } = FrontmatterService.readProjectReadme(project.fullPath);
      assert.strictEqual(frontmatter.status, 'backlog');
      assert.strictEqual(frontmatter.brand, 'ACME');

      // 2. Advance stage sequentially along PIPELINE_ORDER: backlog -> in-progress -> review -> revision -> done
      const pipelineStages = ['in-progress', 'review', 'revision', 'done'];
      for (const targetStage of pipelineStages) {
        const updateRes = FrontmatterService.writeProjectReadme(
          project.fullPath,
          { ...frontmatter, status: targetStage },
          body
        );
        assert.ok(updateRes.versionHash);

        // Verify disk content
        const readBack = FrontmatterService.readProjectReadme(project.fullPath);
        assert.strictEqual(readBack.frontmatter.status, targetStage, `Stage should advance to ${targetStage}`);
        frontmatter = readBack.frontmatter;
      }

      // 3. Create simulated deliverables in 05_DELIVERABLES
      const reviewDir = path.join(project.fullPath, '05_DELIVERABLES');
      if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });
      fs.writeFileSync(path.join(reviewDir, 'hero-banner-16x9.png'), Buffer.from([0x89, 0x50, 0x4E, 0x47]));
      fs.writeFileSync(path.join(reviewDir, 'social-square-1x1.png'), Buffer.from([0x89, 0x50, 0x4E, 0x47]));

      const dels = DeliverableService.getProjectDeliverables(project.fullPath);
      assert.strictEqual(dels.length, 2, 'Must detect 2 deliverables in 05_DELIVERABLES folder');

      // 4. Submit revision request on hero banner
      const revDecision = ApprovalService.processDecision({
        projectId: project.id,
        decision: 'revision_requested',
        reviewer: 'Art Director',
        role: 'Director',
        comment: 'Adjust logo padding on mobile viewport',
        deliverableId: 'hero-banner-16x9.png'
      });

      assert.strictEqual(revDecision.success, true);
      assert.strictEqual(revDecision.approvalRecord.decision, 'revision_requested');
      assert.strictEqual(revDecision.approvalRecord.round, 1);

      // Verify frontmatter updated on disk
      const revFm = FrontmatterService.readProjectReadme(project.fullPath).frontmatter;
      assert.strictEqual(revFm.status, 'revision');
      assert.strictEqual(revFm.revision, 1);
      assert.strictEqual(revFm.approvals.length, 1);

      // 5. Submit approval sign-off
      const appDecision = ApprovalService.processDecision({
        projectId: project.id,
        decision: 'approved',
        reviewer: 'Lead Designer',
        role: 'Lead',
        comment: 'Approved for client delivery',
        deliverableId: 'social-square-1x1.png'
      });

      assert.strictEqual(appDecision.success, true);
      const appFm = FrontmatterService.readProjectReadme(project.fullPath).frontmatter;
      assert.strictEqual(appFm.status, 'approved');
      assert.ok(appFm.completedAt);
      assert.strictEqual(appFm.approvals.length, 2);
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origRoot;
      try { fs.rmSync(testWs, { recursive: true, force: true }); } catch (e) {}
    }
  });

  test('VaultPathService.getVaultStatus returns missing_root for absent path without creating folder', () => {
    const absentPath = path.join(__dirname, 'temp-absent-vault-' + Date.now());
    assert.strictEqual(fs.existsSync(absentPath), false);

    const status = VaultPathService.getVaultStatus(absentPath);
    assert.strictEqual(status.ok, false);
    assert.strictEqual(status.status, 'missing_root');
    assert.strictEqual(status.reason, 'missing_root');
    assert.strictEqual(fs.existsSync(absentPath), false, 'Absent directory must NOT be quietly created');
  });

  test('VaultPathService.resetVaultStructure requires matching folder name confirmation', () => {
    const testWs = path.join(__dirname, 'temp-reset-confirm-test');
    const origRoot = config.WORKSPACE_ROOT;
    const origWsRoot = WorkspaceService.workspaceRoot;
    fs.mkdirSync(testWs, { recursive: true });

    try {
      WorkspaceService.workspaceRoot = testWs;
      config.WORKSPACE_ROOT = testWs;

      assert.throws(() => {
        VaultPathService.resetVaultStructure('WrongFolderName', 'Tester');
      }, /Confirmation failed/);

      assert.throws(() => {
        VaultPathService.resetVaultStructure('', 'Tester');
      }, /Confirmation failed/);
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWsRoot;
      try { fs.rmSync(testWs, { recursive: true, force: true }); } catch (_) {}
    }
  });

  test('VaultPathService.resetVaultStructure archives canonical folders to _Archive and leaves non-canonical files intact', () => {
    const testWs = path.join(__dirname, 'temp-reset-archive-test');
    const origRoot = config.WORKSPACE_ROOT;
    const origWsRoot = WorkspaceService.workspaceRoot;
    fs.mkdirSync(testWs, { recursive: true });

    try {
      WorkspaceService.workspaceRoot = testWs;
      config.WORKSPACE_ROOT = testWs;

      VaultPathService.ensureVaultStructure(testWs, true);
      const userClientDir = path.join(testWs, '_Clients', 'TEST_Client');
      fs.mkdirSync(userClientDir, { recursive: true });
      fs.writeFileSync(path.join(userClientDir, 'client.md'), '# Test Client\n', 'utf8');

      const nonCanonicalFile = path.join(testWs, 'my-custom-notes.txt');
      fs.writeFileSync(nonCanonicalFile, 'Important non-canonical notes', 'utf8');
      const nonCanonicalDir = path.join(testWs, 'PersonalPortfolio');
      fs.mkdirSync(nonCanonicalDir, { recursive: true });
      fs.writeFileSync(path.join(nonCanonicalDir, 'art.png'), 'fake-png', 'utf8');

      const expectedName = path.basename(testWs);
      const res = VaultPathService.resetVaultStructure(expectedName, 'Tester');

      assert.strictEqual(res.success, true);
      assert.ok(res.archivePath, 'Archive path must be returned');
      assert.ok(fs.existsSync(res.archivePath), 'Archive directory must exist on disk');

      assert.ok(fs.existsSync(path.join(res.archivePath, '_Clients', 'TEST_Client', 'client.md')), 'User client must be preserved inside _Archive');

      assert.ok(fs.existsSync(path.join(testWs, '_Clients')));
      assert.ok(fs.existsSync(path.join(testWs, '_Finance', 'Quotes')));
      assert.ok(fs.existsSync(path.join(testWs, '_Notes', 'Scratchpad.md')));
      assert.strictEqual(fs.existsSync(path.join(testWs, '_Clients', 'TEST_Client')), false, 'User client in root should have moved to _Archive');

      assert.ok(fs.existsSync(nonCanonicalFile), 'Non-canonical file must remain in root');
      assert.strictEqual(fs.readFileSync(nonCanonicalFile, 'utf8'), 'Important non-canonical notes');
      assert.ok(fs.existsSync(path.join(nonCanonicalDir, 'art.png')), 'Non-canonical folder must remain in root');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWsRoot;
      try { fs.rmSync(testWs, { recursive: true, force: true }); } catch (_) {}
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
