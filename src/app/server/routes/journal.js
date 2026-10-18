const express = require('express');
const router = express.Router();
const JournalVaultService = require('../services/JournalVaultService');
const SseService = require('../services/SseService');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.get('/journal/daily/:date?', (req, res) => {
  try {
    const targetDate = req.params.date || new Date().toISOString().split('T')[0];
    const note = JournalVaultService.getDailyNote(targetDate);
    res.json({ success: true, date: targetDate, note, raw: note ? note.rawContent : '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal/daily-list', (req, res) => {
  try {
    res.json({ success: true, notes: JournalVaultService.listDailyNotes() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/journal/daily', (req, res) => {
  try {
    const saved = JournalVaultService.saveDailyNote(req.body);
    SseService.broadcast('journal:updated', { date: saved.date, note: saved });
    res.json({ success: true, note: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/journal/daily/:date/habits', (req, res) => {
  try {
    const { habitId } = req.body;
    if (!habitId) return res.status(400).json({ error: 'habitId is required' });
    const updatedNote = JournalVaultService.toggleDailyHabit(req.params.date, habitId);
    SseService.broadcast('journal:updated', { note: updatedNote });
    res.json({ success: true, note: updatedNote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal/habits/matrix', (req, res) => {
  try {
    const refDate = req.query.date || req.query.endDate || new Date().toISOString().split('T')[0];
    res.json({ success: true, matrix: JournalVaultService.getHabitWeeklyMatrix(refDate) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal/habits/history', (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const refDate = req.query.date || new Date().toISOString().split('T')[0];
    res.json({ success: true, ...JournalVaultService.getHabitHistory(days, refDate) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal/rollover-check', (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    res.json({ success: true, rollover: JournalVaultService.getPendingRollover(targetDate) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/journal/migrate-tasks', (req, res) => {
  try {
    const { fromDate, toDate, taskIndices, selectedTaskIds } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const targetToDate = toDate || today;
    let targetFromDate = fromDate;
    if (!targetFromDate) {
      const d = new Date(targetToDate);
      d.setDate(d.getDate() - 1);
      targetFromDate = d.toISOString().split('T')[0];
    }
    const result = JournalVaultService.migrateTasks(targetFromDate, targetToDate, taskIndices || selectedTaskIds || null);
    if (result.success) SseService.broadcast('journal:migrated', { result });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/journal/monthly', (req, res) => {
  try {
    res.json({ success: true, reviews: JournalVaultService.getMonthlyReviews() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal/monthly/:month', (req, res) => {
  try {
    const targetMonth = req.params.month || new Date().toISOString().slice(0, 7);
    res.json({ success: true, month: targetMonth, review: JournalVaultService.getMonthlyReview(targetMonth) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/journal/monthly', (req, res) => {
  try {
    const saved = JournalVaultService.saveMonthlyReview(req.body);
    SseService.broadcast('journal:monthly:saved', { review: saved });
    res.json({ success: true, review: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/journal/monthly/:month/telemetry', (req, res) => {
  try {
    const targetMonth = req.params.month || new Date().toISOString().slice(0, 7);
    const telemetry = JournalVaultService.getMonthlyTelemetryRollup(targetMonth);
    res.json({ success: true, month: targetMonth, telemetry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal/yearly', (req, res) => {
  try {
    res.json({ success: true, reviews: JournalVaultService.getYearlyIndexes(), indexes: JournalVaultService.getYearlyIndexes() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal/yearly/:year', (req, res) => {
  try {
    const targetYear = req.params.year || String(new Date().getFullYear());
    res.json({ success: true, year: targetYear, review: JournalVaultService.getYearlyIndex(targetYear) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/journal/yearly', (req, res) => {
  try {
    const saved = JournalVaultService.saveYearlyIndex(req.body);
    SseService.broadcast('journal:yearly:saved', { review: saved });
    res.json({ success: true, review: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/journal/yearly/:year/telemetry', (req, res) => {
  try {
    const targetYear = req.params.year || String(new Date().getFullYear());
    const telemetry = JournalVaultService.getYearlyTelemetryRollup(targetYear);
    res.json({ success: true, year: targetYear, telemetry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal/weekly', (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    res.json({ success: true, telemetry: JournalVaultService.getWeeklyTelemetryRollup(targetDate) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal/weekly-reviews', (req, res) => {
  try {
    res.json({ success: true, reviews: JournalVaultService.getWeeklyReviews() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal/weekly-review/:week?', (req, res) => {
  try {
    const targetWeek = req.params.week || req.query.week || JournalVaultService.getISOWeekString();
    res.json({ success: true, week: targetWeek, review: JournalVaultService.getWeeklyReview(targetWeek) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/journal/weekly-review', (req, res) => {
  try {
    const saved = JournalVaultService.saveWeeklyReview(req.body);
    SseService.broadcast('journal:weekly:saved', { review: saved });
    res.json({ success: true, review: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
