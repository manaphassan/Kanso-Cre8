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

const journalRoutes = require('../routes/journal');

module.exports = async function run(test, context = {}) {
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

# Tuesday, September 8, 2026

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

  await test('JournalVaultService checks pending rollover and migrates selective tasks', async () => {
    const testDir = path.join(__dirname, 'temp-rollover-test');
    const dailyDir = path.join(testDir, '_Journal', 'Daily');
    fs.mkdirSync(dailyDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      // 1. Create yesterday's daily note with 3 tasks
      const yesterday = '2026-09-14';
      const today = '2026-09-15';
      const day1Path = path.join(dailyDir, `${yesterday}.md`);
      const day1Content = `---
date: ${yesterday}
title: Monday Log
tags: [journal, bujo, daily]
---

# Monday Log

## Rapid Log
• [x] Completed visual identity audit
• [ ] Fix responsive mobile nav padding
* Priority: Deliver 4K packaging renders
`;
      fs.writeFileSync(day1Path, day1Content, 'utf8');

      // 2. Check pending rollover
      const rollover = JournalVaultService.getPendingRollover(today);
      assert.strictEqual(rollover.hasTasks, true);
      assert.strictEqual(rollover.fromDate, yesterday);
      assert.strictEqual(rollover.count, 2);
      assert.strictEqual(rollover.tasks.length, 2);

      // 3. Migrate selectively (only the priority task)
      const priorityTask = rollover.tasks.find(t => t.type === 'priority');
      assert.ok(priorityTask, 'Priority task must exist');

      const migrationRes = JournalVaultService.migrateTasks(yesterday, today, [priorityTask.id]);
      assert.strictEqual(migrationRes.success, true);
      assert.strictEqual(migrationRes.migratedCount, 1);

      // Verify today received the migrated priority task
      const todayNote = JournalVaultService.getDailyNote(today);
      assert.ok(todayNote.entries.some(e => e.text === 'Deliver 4K packaging renders'), 'Today must receive migrated task');

      // 4. Test weekly telemetry dailyCadence
      const weekly = JournalVaultService.getWeeklyTelemetryRollup(today);
      assert.ok(Array.isArray(weekly.dailyCadence), 'dailyCadence must be an array');
      assert.strictEqual(weekly.dailyCadence.length, 7);
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  await test('JournalVaultService parses, saves daily habits frontmatter, and generates 7-day matrix', async () => {
    const testDir = path.join(__dirname, 'temp-habits-test');
    const dailyDir = path.join(testDir, '_Journal', 'Daily');
    fs.mkdirSync(dailyDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      const today = '2026-09-16';
      // 1. Save daily note with habits
      const note = {
        date: today,
        title: 'Wednesday Log',
        habits: ['focus_sprint', 'daily_sketch'],
        focusIntentions: ['Deep craft'],
        entries: [
          { id: 'e1', type: 'task', text: 'Design graph visualization', completed: false }
        ]
      };
      JournalVaultService.saveDailyNote(note);

      // Verify file on disk has habits in YAML frontmatter
      const filePath = path.join(dailyDir, `${today}.md`);
      assert.ok(fs.existsSync(filePath), 'Daily note must exist');
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('habits:'), 'YAML frontmatter must include habits');
      assert.ok(content.includes('focus_sprint'), 'Must include focus_sprint');

      // 2. Read back
      const readBack = JournalVaultService.getDailyNote(today);
      assert.ok(Array.isArray(readBack.habits), 'habits must be array');
      assert.strictEqual(readBack.habits.length, 2);
      assert.ok(readBack.habits.includes('focus_sprint'));
      assert.ok(readBack.habits.includes('daily_sketch'));

      // 3. Toggle habit
      const toggled = JournalVaultService.toggleDailyHabit(today, 'inbox_zero');
      assert.strictEqual(toggled.habits.length, 3);
      assert.ok(toggled.habits.includes('inbox_zero'));

      // Toggle off
      const toggledOff = JournalVaultService.toggleDailyHabit(today, 'focus_sprint');
      assert.strictEqual(toggledOff.habits.length, 2);
      assert.ok(!toggledOff.habits.includes('focus_sprint'));

      // 4. Matrix
      const matrix = JournalVaultService.getHabitWeeklyMatrix(today);
      assert.strictEqual(matrix.length, 7);
      const todayRow = matrix.find(m => m.date === today);
      assert.ok(todayRow, 'Today row must exist in matrix');
      assert.ok(todayRow.habits.includes('inbox_zero'));
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  await test('JournalVaultService reads, writes, and lists Weekly reviews in _Journal/Weekly/ with YAML frontmatter', async () => {
    const testDir = path.join(__dirname, 'temp-journal-weekly-test');
    const weeklyDir = path.join(testDir, '_Journal', 'Weekly');
    fs.mkdirSync(weeklyDir, { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testDir;
    WorkspaceService.workspaceRoot = testDir;

    try {
      const weekStr = '2026-W42';
      const scaffold = JournalVaultService.getWeeklyReview(weekStr);
      assert.strictEqual(scaffold.week, weekStr);
      assert.ok(Array.isArray(scaffold.shippedDeliverables));
      assert.ok(Array.isArray(scaffold.nextWeekTop3));

      const toSave = {
        week: weekStr,
        title: 'Weekly Review: 2026-W42',
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        shippedDeliverables: ['Mobile App Illustration 3D Key Visuals (ACME)', 'Brand Guidelines v2 (LUM)'],
        hoursLogged: 42.5,
        unbilledHours: 2.0,
        nextWeekTop3: [
          'Acme Corp motion onboarding sequence',
          'Lumina Labs vector asset library',
          'Calibrate Q4 retainers'
        ],
        reflections: 'Zero friction week. Delivered all high-impact proofs ahead of schedule.'
      };
      const saved = JournalVaultService.saveWeeklyReview(toSave);
      assert.strictEqual(saved.week, weekStr);
      assert.strictEqual(saved.hoursLogged, 42.5);
      assert.strictEqual(saved.shippedDeliverables.length, 2);

      const filePath = path.join(weeklyDir, weekStr + '.md');
      assert.ok(fs.existsSync(filePath), 'File _Journal/Weekly/2026-W42.md must exist on disk');

      const list = JournalVaultService.getWeeklyReviews();
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].week, weekStr);
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origWs;
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
