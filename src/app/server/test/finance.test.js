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

const financeRoutes = require('../routes/finance');

module.exports = async function run(test, context = {}) {
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

  test('FinanceVaultService losslessly stores multi-currency, fiscal metadata, and printable themes', () => {
    const testWs = path.join(__dirname, 'temp-finance-ws');
    const origRoot = config.WORKSPACE_ROOT;
    config.WORKSPACE_ROOT = testWs;
    WorkspaceService.workspaceRoot = testWs;

    try {
      const sampleInvoice = {
        id: 'inv-2026-999',
        documentNumber: 'INV-2026-999',
        type: 'invoice',
        clientCode: 'ACME',
        clientName: 'Acme Corporation',
        clientEmail: 'billing@acme.com',
        clientAddress: '100 Innovation Way, San Francisco, CA',
        date: '2026-09-16',
        dueDate: '2026-09-30',
        status: 'draft',
        currency: 'EUR',
        hourlyRate: 160,
        taxLabel: 'VAT',
        taxRatePercent: 20,
        tin: 'C25891024090',
        sstRegistrationNo: 'W10-1808-32000012',
        buyerTin: 'C10293847560',
        buyerSstNo: 'B01-1904-41000088',
        theme: 'swiss',
        items: [
          {
            id: 'it-1',
            description: 'Brand Identity Guidelines & Design System',
            quantity: 10,
            unitPrice: 160,
            amount: 1600
          }
        ],
        subtotal: 1600,
        taxAmount: 320,
        total: 1920,
        notes: 'Strict net-14 payment settlement.'
      };

      // Save invoice to disk
      const saved = FinanceVaultService.saveInvoice(sampleInvoice);
      assert.strictEqual(saved.currency, 'EUR');
      assert.strictEqual(saved.taxLabel, 'VAT');
      assert.strictEqual(saved.taxRatePercent, 20);
      assert.strictEqual(saved.tin, 'C25891024090');
      assert.strictEqual(saved.sstRegistrationNo, 'W10-1808-32000012');
      assert.strictEqual(saved.buyerTin, 'C10293847560');
      assert.strictEqual(saved.buyerSstNo, 'B01-1904-41000088');
      assert.strictEqual(saved.theme, 'swiss');
      assert.strictEqual(saved.total, 1920);

      // Read back from disk
      const retrieved = FinanceVaultService.getInvoice('INV-2026-999');
      assert.ok(retrieved, 'Invoice should exist on disk');
      assert.strictEqual(retrieved.currency, 'EUR');
      assert.strictEqual(retrieved.taxLabel, 'VAT');
      assert.strictEqual(retrieved.tin, 'C25891024090');
      assert.strictEqual(retrieved.sstRegistrationNo, 'W10-1808-32000012');
      assert.strictEqual(retrieved.buyerTin, 'C10293847560');
      assert.strictEqual(retrieved.buyerSstNo, 'B01-1904-41000088');
      assert.strictEqual(retrieved.theme, 'swiss');

      // Test Quote creation with Classic Letterpress theme and Malaysian Ringgit
      const sampleQuote = {
        id: 'qte-2026-888',
        documentNumber: 'QTE-2026-888',
        type: 'quote',
        clientCode: 'LUM',
        clientName: 'Lumina Labs',
        clientEmail: 'procurement@luminalabs.com',
        clientAddress: 'Level 18, Menara Lumina, Kuala Lumpur',
        date: '2026-09-16',
        dueDate: '2026-09-30',
        validUntil: '2026-09-30',
        status: 'draft',
        currency: 'MYR',
        hourlyRate: 180,
        taxLabel: 'SST',
        taxRatePercent: 8,
        tin: 'C99887766554',
        sstRegistrationNo: 'W10-2201-99881122',
        theme: 'letterpress',
        items: [
          {
            id: 'it-1',
            description: 'AI Creative Vault UX Architecture',
            quantity: 20,
            unitPrice: 180,
            amount: 3600
          }
        ],
        subtotal: 3600,
        taxAmount: 288,
        total: 3888,
        notes: 'Quote valid for 14 days.'
      };

      const savedQuote = FinanceVaultService.saveQuote(sampleQuote);
      assert.strictEqual(savedQuote.currency, 'MYR');
      assert.strictEqual(savedQuote.taxLabel, 'SST');
      assert.strictEqual(savedQuote.theme, 'letterpress');

      // Convert Quote to Invoice and check fiscal continuity
      const conversion = FinanceVaultService.convertQuoteToInvoice('QTE-2026-888');
      assert.strictEqual(conversion.success, true);
      assert.strictEqual(conversion.invoice.currency, 'MYR');
      assert.strictEqual(conversion.invoice.taxLabel, 'SST');
      assert.strictEqual(conversion.invoice.tin, 'C99887766554');
      assert.strictEqual(conversion.invoice.theme, 'letterpress');
      assert.strictEqual(conversion.invoice.linkedQuoteId, 'QTE-2026-888');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origRoot;
      try { fs.rmSync(testWs, { recursive: true, force: true }); } catch (e) {}
    }
  });

  test('FinanceVaultService parses official stamps, client accents, and generates standalone offline HTML', () => {
    const testWs = path.join(__dirname, 'temp-branding-ws');
    const origRoot = config.WORKSPACE_ROOT;
    config.WORKSPACE_ROOT = testWs;
    WorkspaceService.workspaceRoot = testWs;

    try {
      const brandedInvoice = {
        id: 'inv-2026-stamp',
        documentNumber: 'INV-2026-STAMP',
        type: 'invoice',
        clientCode: 'NEX',
        clientName: 'Nexus Studio',
        clientEmail: 'finance@nexusstudio.io',
        clientAddress: '42 Shoreditch High St, London E1 6JJ',
        date: '2026-09-16',
        dueDate: '2026-09-30',
        status: 'paid',
        currency: 'GBP',
        hourlyRate: 150,
        taxLabel: 'VAT',
        taxRatePercent: 20,
        theme: 'geist',
        stamp: 'paid',
        showClientAccent: true,
        items: [
          {
            id: 'it-1',
            description: '3D & Kinetic Motion Choreography Package',
            quantity: 20,
            unitPrice: 150,
            amount: 3000
          }
        ],
        subtotal: 3000,
        taxAmount: 600,
        total: 3600,
        notes: 'Full payment settled via wire remittance.'
      };

      // 1. Save and verify Markdown YAML persistence
      const saved = FinanceVaultService.saveInvoice(brandedInvoice);
      assert.strictEqual(saved.stamp, 'paid');
      assert.strictEqual(saved.showClientAccent, true);

      const retrieved = FinanceVaultService.getInvoice('INV-2026-STAMP');
      assert.ok(retrieved, 'Invoice should exist on disk');
      assert.strictEqual(retrieved.stamp, 'paid');
      assert.strictEqual(retrieved.showClientAccent, true);
      assert.strictEqual(retrieved.currency, 'GBP');

      // 2. Generate and verify standalone HTML export
      const studioProfile = {
        studioName: 'Acme Design Studio',
        studioAddress: '100 Creative Way, Metropolis',
        billingEmail: 'billing@example.com',
        principalName: 'Alex Mercer',
        tagline: 'Mindful Creative Systems',
        paymentBank: 'Acme Federal Bank',
        paymentAccountNo: '0000-0000-0000',
        paymentAccountName: 'Acme Design Studio'
      };

      const html = FinanceVaultService.generateStandaloneHtml(retrieved, studioProfile);
      assert.ok(html.includes('<!DOCTYPE html>'), 'Must produce standard HTML5 doctype');
      assert.ok(html.includes('INV-2026-STAMP'), 'Must contain document number');
      assert.ok(html.includes('Nexus Studio'), 'Must contain client name');
      assert.ok(html.includes('stamp-paid'), 'Must render tactile stamp-paid CSS class');
      assert.ok(html.includes('PAID'), 'Must render PAID stamp text');
      assert.ok(html.includes('Client Palette:'), 'Must include client palette swatch bar when showClientAccent is true');
      assert.ok(html.includes('3D &amp; Kinetic Motion Choreography Package'), 'Must escape HTML in deliverables');
      assert.ok(html.includes('@media print'), 'Must include print media stylesheet');

      // 3. Test Quote conversion with approved stamp
      const sampleQuote = {
        id: 'qte-2026-stamp',
        documentNumber: 'QTE-2026-STAMP',
        type: 'quote',
        clientCode: 'LUM',
        clientName: 'Lumina Labs',
        clientEmail: 'billing@luminalabs.dev',
        date: '2026-09-16',
        dueDate: '2026-09-30',
        validUntil: '2026-09-30',
        status: 'accepted',
        currency: 'USD',
        hourlyRate: 180,
        stamp: 'approved',
        showClientAccent: true,
        items: [
          {
            id: 'it-q',
            description: 'Biotech Data Visualization UI System',
            quantity: 15,
            unitPrice: 180,
            amount: 2700
          }
        ],
        subtotal: 2700,
        taxAmount: 0,
        total: 2700
      };

      FinanceVaultService.saveQuote(sampleQuote);
      const conversion = FinanceVaultService.convertQuoteToInvoice('QTE-2026-STAMP');
      assert.strictEqual(conversion.success, true);
      assert.strictEqual(conversion.invoice.stamp, 'approved', 'Converted invoice should inherit approved stamp');
      assert.strictEqual(conversion.invoice.showClientAccent, true, 'Converted invoice should inherit showClientAccent');
    } finally {
      config.WORKSPACE_ROOT = origRoot;
      WorkspaceService.workspaceRoot = origRoot;
      try { fs.rmSync(testWs, { recursive: true, force: true }); } catch (e) {}
    }
  });

  await test('TimerService persists live state in Machine tier and appends session to draft invoice on stop', () => {
    const TimerService = require('../services/TimerService');
    const ConfigService = require('../services/ConfigService');

    const testWs = path.join(__dirname, 'temp-timer-workspace-test');
    if (fs.existsSync(testWs)) fs.rmSync(testWs, { recursive: true, force: true });
    fs.mkdirSync(path.join(testWs, '_Finance', 'Invoices'), { recursive: true });

    const origRoot = config.WORKSPACE_ROOT;
    const origWs = WorkspaceService.workspaceRoot;
    config.WORKSPACE_ROOT = testWs;
    WorkspaceService.workspaceRoot = testWs;

    try {
      // 1. Reset timer to clean baseline
      TimerService.reset();
      const initial = TimerService.getState();
      assert.strictEqual(initial.isRunning, false);
      assert.strictEqual(initial.startedAt, null);

      // 2. Start timer
      const started = TimerService.start({
        projectId: '202609_0001D_ACME_MobileAppIllustration',
        projectTitle: 'Mobile App 3D Assets',
        clientCode: 'ACME',
        hourlyRate: 150,
        sessionNote: 'Isometric icon rendering',
        accumulatedSeconds: 1800 // Pre-bank 30 mins for test
      });

      assert.strictEqual(started.isRunning, true);
      assert.ok(typeof started.startedAt === 'number');

      // 3. Verify state persisted in Machine tier (app.json) and NOT in vault
      const machineTimer = ConfigService.machine.get('timer');
      assert.ok(machineTimer, 'Timer state must be in Machine tier');
      assert.strictEqual(machineTimer.isRunning, true);
      assert.strictEqual(machineTimer.startedAt, started.startedAt);

      const forbiddenVaultTimer = path.join(testWs, '_Team', '_Config', 'timer.json');
      assert.strictEqual(fs.existsSync(forbiddenVaultTimer), false, 'Vault _Team/_Config/timer.json must never exist');

      // 4. Verify elapsed time calculation from startedAt
      const state = TimerService.getState();
      assert.ok(state.elapsedSeconds >= 1800, 'Elapsed seconds must include accumulated and live time');
      assert.ok(state.earnedAmount >= 75, 'Earned amount must be calculated from elapsed hours * rate');

      // 5. Pause and resume
      const paused = TimerService.pause();
      assert.strictEqual(paused.isRunning, false);
      assert.strictEqual(paused.isPaused, true);
      assert.strictEqual(paused.startedAt, null);
      assert.ok(paused.accumulatedSeconds >= 1800);

      const resumed = TimerService.resume();
      assert.strictEqual(resumed.isRunning, true);
      assert.strictEqual(resumed.isPaused, false);
      assert.ok(typeof resumed.startedAt === 'number');

      // 6. Stop timer and append to invoice
      const stopResult = TimerService.stop({ appendToInvoice: true, note: 'Final sprint sign-off' });
      assert.strictEqual(stopResult.success, true);
      assert.ok(stopResult.sessionLog, 'Session log must be generated');
      assert.strictEqual(stopResult.sessionLog.appendedToInvoice, true);
      assert.ok(stopResult.invoice, 'Draft invoice must be updated/created');
      assert.ok(stopResult.invoice.documentNumber);

      // Verify machine state reset after stop
      const afterStopMachine = ConfigService.machine.get('timer');
      assert.strictEqual(afterStopMachine.isRunning, false);
      assert.strictEqual(afterStopMachine.startedAt, null);
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
