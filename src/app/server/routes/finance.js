const express = require('express');
const router = express.Router();
const FinanceVaultService = require('../services/FinanceVaultService');
const TimerService = require('../services/TimerService');
const SseService = require('../services/SseService');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.get('/finance/invoices', (req, res) => {
  try {
    res.json({ success: true, invoices: FinanceVaultService.getInvoices() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/finance/invoices/:id', (req, res) => {
  try {
    const invoice = FinanceVaultService.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found on disk.' });
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/finance/invoices', (req, res) => {
  try {
    const saved = FinanceVaultService.saveInvoice(req.body);
    SseService.broadcast('finance:updated', { invoice: saved });
    res.json({ success: true, invoice: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/finance/append-session', (req, res) => {
  try {
    const { clientCode, sessionLog } = req.body;
    if (!clientCode || !sessionLog) return res.status(400).json({ error: 'clientCode and sessionLog are required.' });
    const updated = FinanceVaultService.appendSessionToInvoice(clientCode, sessionLog);
    SseService.broadcast('finance:session-appended', { invoice: updated });
    res.json({ success: true, invoice: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/finance/invoices/:id', (req, res) => {
  try {
    const deleted = FinanceVaultService.deleteInvoice(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Invoice not found to delete.' });
    SseService.broadcast('finance:invoice-deleted', { id: req.params.id });
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/finance/quotes', (req, res) => {
  try {
    res.json({ success: true, quotes: FinanceVaultService.getQuotes() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/finance/quotes/:id', (req, res) => {
  try {
    const quote = FinanceVaultService.getQuote(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quote not found on disk.' });
    res.json({ success: true, quote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/finance/quotes', (req, res) => {
  try {
    const saved = FinanceVaultService.saveQuote(req.body);
    SseService.broadcast('finance:quote-saved', { quote: saved });
    res.json({ success: true, quote: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/finance/convert-quote', (req, res) => {
  try {
    const { quoteId } = req.body;
    if (!quoteId) return res.status(400).json({ error: 'quoteId is required.' });
    const result = FinanceVaultService.convertQuoteToInvoice(quoteId);
    SseService.broadcast('finance:quote-converted', result);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/finance/convert-quote-full', (req, res) => {
  try {
    const { quoteId, projectTitle, depositPercentage, deadline, deliverableType, description } = req.body;
    if (!quoteId) return res.status(400).json({ error: 'quoteId is required.' });
    const result = FinanceVaultService.convertQuoteToProjectAndInvoice(quoteId, {
      projectTitle,
      depositPercentage,
      deadline,
      deliverableType,
      description
    });
    SseService.broadcast('finance:quote-converted-full', result);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/finance/quotes/:id', (req, res) => {
  try {
    const deleted = FinanceVaultService.deleteQuote(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Quote not found to delete.' });
    SseService.broadcast('finance:quote-deleted', { id: req.params.id });
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/finance/:type/:id/export-html', (req, res) => {
  try {
    const { type, id } = req.params;
    let doc = type === 'invoice' || type === 'invoices' ? FinanceVaultService.getInvoice(id) : FinanceVaultService.getQuote(id);
    if (!doc) return res.status(404).send('Document not found');
    const html = FinanceVaultService.generateDocumentHtml(doc, type.startsWith('inv') ? 'invoice' : 'quote');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send('Error generating export HTML: ' + err.message);
  }
});

// ─── BILLABLE CHRONOMETER TIMER ROUTES ──────────────────────────────
router.get(['/system/timer', '/timer'], (req, res) => {
  try {
    res.json({ success: true, timer: TimerService.getState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(['/system/timer/start', '/timer/start'], (req, res) => {
  try {
    const state = TimerService.start(req.body);
    SseService.broadcast('timer:started', { timer: state });
    res.json({ success: true, timer: state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post(['/system/timer/pause', '/timer/pause'], (req, res) => {
  try {
    const state = TimerService.pause();
    SseService.broadcast('timer:paused', { timer: state });
    res.json({ success: true, timer: state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post(['/system/timer/resume', '/timer/resume'], (req, res) => {
  try {
    const state = TimerService.resume();
    SseService.broadcast('timer:resumed', { timer: state });
    res.json({ success: true, timer: state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post(['/system/timer/stop', '/timer/stop'], (req, res) => {
  try {
    const result = TimerService.stop(req.body);
    SseService.broadcast('timer:stopped', { timer: result.state, sessionLog: result.sessionLog });
    if (result.invoice) SseService.broadcast('finance:session-appended', { invoice: result.invoice });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
