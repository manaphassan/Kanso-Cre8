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

  await test('FrontmatterService.validate validates document schemas while strictly preserving unknown keys', () => {
    // 1. Project frontmatter with custom unknown keys
    const rawProjectFm = {
      status: 'in-progress',
      client: 'ACME',
      revision: 2,
      deadline: '2026-09-30',
      created: '2026-09-01',
      tags: ['fintech', 'branding'],
      custom_plugin_meta: { render_engine: 'blender', gpu_tier: 'ultra' },
      user_notes_extra: 'Do not drop this key'
    };

    const projectResult = FrontmatterService.validate('project', rawProjectFm);
    assert.strictEqual(projectResult.valid, true);
    assert.strictEqual(projectResult.errors.length, 0);
    assert.strictEqual(projectResult.data.status, 'in-progress');
    assert.strictEqual(projectResult.data.user_notes_extra, 'Do not drop this key');
    assert.strictEqual(projectResult.data.custom_plugin_meta.render_engine, 'blender');

    // 2. Project frontmatter with invalid status
    const invalidProject = FrontmatterService.validate('project', {
      status: 'non_existent_status_123',
      revision: -5,
      deadline: 'invalid-date'
    });
    assert.strictEqual(invalidProject.valid, false);
    assert.ok(invalidProject.errors.length >= 2, 'Should flag invalid status, revision, or deadline');

    // 3. Client frontmatter validation
    const clientResult = FrontmatterService.validate('client', {
      code: 'ACME',
      name: 'Acme Corporation',
      default_hourly_rate: 150,
      custom_slack_channel: '#acme-studio'
    });
    assert.strictEqual(clientResult.valid, true);
    assert.strictEqual(clientResult.data.custom_slack_channel, '#acme-studio');

    // 4. Client frontmatter missing code
    const invalidClient = FrontmatterService.validate('client', {
      name: 'No Code Corp'
    });
    assert.strictEqual(invalidClient.valid, false);
    assert.ok(invalidClient.errors.some(e => e.includes('Client code is required')));

    // 5. Journal day frontmatter
    const journalResult = FrontmatterService.validate('journal_day', {
      date: '2026-09-09',
      habits: ['Deep Craft'],
      custom_energy_metric: 99
    });
    assert.strictEqual(journalResult.valid, true);
    assert.strictEqual(journalResult.data.custom_energy_metric, 99);

    const invalidJournal = FrontmatterService.validate('journal_day', {
      date: 'not-a-date'
    });
    assert.strictEqual(invalidJournal.valid, false);

    // 6. Atomic note frontmatter
    const noteResult = FrontmatterService.validate('note', {
      id: 'zettel_999',
      title: 'Atomic Thinking',
      category: 'permanent',
      unknown_external_sync_id: 'sync_abc123'
    });
    assert.strictEqual(noteResult.valid, true);
    assert.strictEqual(noteResult.data.unknown_external_sync_id, 'sync_abc123');
  });

  await test('FrontmatterService executes atomic writes, debounces rapid writes, and WorkspaceService detects conflicted copies', async () => {
    const testWs = path.join(__dirname, 'temp-sync-safety-test');
    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;

    try {
      if (fs.existsSync(testWs)) fs.rmSync(testWs, { recursive: true, force: true });
      fs.mkdirSync(testWs, { recursive: true });
      config.WORKSPACE_ROOT = testWs;
      WorkspaceService.workspaceRoot = testWs;

      // 1. Verify FrontmatterService.writeAtomic creates target file without leftover tmp files
      const atomicTestFile = path.join(testWs, 'test_atomic.md');
      const testContent = '---\ntitle: "Atomic Write Test"\n---\n\nSafe content.';
      const res = FrontmatterService.writeAtomic(atomicTestFile, testContent);
      assert.strictEqual(res, true);
      assert.ok(fs.existsSync(atomicTestFile));
      assert.strictEqual(fs.readFileSync(atomicTestFile, 'utf8'), testContent);

      // Verify no temporary files remain in directory
      const leftoverTmp = fs.readdirSync(testWs).filter(f => f.includes('.tmp.'));
      assert.strictEqual(leftoverTmp.length, 0, 'No temporary files should linger after atomic write');

      // 2. Verify FrontmatterService.writeDebounced coalesces rapid writes
      const debouncedTestFile = path.join(testWs, 'test_debounced.md');

      // Trigger 5 rapid writes within 50ms
      FrontmatterService.writeDebounced(debouncedTestFile, 'version 1', 100);
      FrontmatterService.writeDebounced(debouncedTestFile, 'version 2', 100);
      FrontmatterService.writeDebounced(debouncedTestFile, 'version 3', 100);
      FrontmatterService.writeDebounced(debouncedTestFile, 'version 4', 100);
      const finalWritePromise = FrontmatterService.writeDebounced(debouncedTestFile, 'version 5 final', 100);

      // Before timer fires, file should not exist yet
      assert.strictEqual(fs.existsSync(debouncedTestFile), false, 'Debounced write should not hit disk immediately');

      // Wait for debounced write to complete
      await finalWritePromise;
      assert.ok(fs.existsSync(debouncedTestFile));
      assert.strictEqual(fs.readFileSync(debouncedTestFile, 'utf8'), 'version 5 final');

      // 3. Verify NotesVaultService.saveScratchpad writes atomically
      const scratch = NotesVaultService.saveScratchpad('Rapid scratchpad entry');
      assert.strictEqual(scratch.success, true);
      const scratchPath = NotesVaultService.getScratchpadPath();
      assert.ok(fs.existsSync(scratchPath));
      assert.strictEqual(fs.readFileSync(scratchPath, 'utf8'), 'Rapid scratchpad entry');

      // 4. Verify detection of Dropbox / OneDrive *conflicted copy* files
      const clientDir = path.join(testWs, '_Clients', 'ACME_Acme_Corp');
      fs.mkdirSync(clientDir, { recursive: true });
      const mainClient = path.join(clientDir, 'client.md');
      const conflictClient = path.join(clientDir, "client (Acme's conflicted copy 2026-10-17).md");

      FrontmatterService.writeAtomic(mainClient, '---\ncode: ACME\nname: Acme Corp\n---\n');
      FrontmatterService.writeAtomic(conflictClient, '---\ncode: ACME\nname: Acme Corp Remote\n---\n');

      const detectedConflicts = WorkspaceService.scanSyncConflicts();
      assert.strictEqual(detectedConflicts.length, 1);
      assert.strictEqual(detectedConflicts[0].filename, "client (Acme's conflicted copy 2026-10-17).md");
      assert.strictEqual(detectedConflicts[0].baseFilename, 'client.md');
      assert.strictEqual(detectedConflicts[0].baseExists, true);

      // Resolve conflict via keep_local
      const resolveRes = WorkspaceService.resolveSyncConflict(conflictClient, 'keep_local');
      assert.strictEqual(resolveRes.success, true);
      assert.strictEqual(fs.existsSync(conflictClient), false);
      assert.strictEqual(fs.existsSync(mainClient), true);
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
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
