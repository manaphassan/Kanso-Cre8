/**
 * Vault lifecycle routes: startup status, structure repair, and demo data load/clear.
 */
const express = require('express');
const path = require('path');
const WorkspaceService = require('../services/WorkspaceService');
const SseService = require('../services/SseService');
const AuditService = require('../services/AuditService');
const DemoDataService = require('../services/DemoDataService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const requireVaultAdmin = (req, res, next) => {
  const roleLower = (req.user?.role || '').toLowerCase();
  const permissions = req.user?.permissions || [];
  const ok = roleLower.includes('admin') || roleLower.includes('ceo') || roleLower.includes('executive') || permissions.includes('admin:system_audit');
  if (!ok) return res.status(403).json({ error: 'Permission Denied. System Administrator or Executive privileges required.' });
  next();
};

router.get('/system/vault-status', (req, res) => {
  try {
    const status = WorkspaceService.getVaultStatus();
    if (status.repaired.length) SseService.broadcast('workspace:updated', { reason: 'vault_repaired' });
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/system/vault-health/repair', (req, res) => {
  try {
    const result = WorkspaceService.ensureVaultStructure();
    if (result.createdDirs.length || result.createdFiles.length) {
      SseService.broadcast('workspace:updated', { reason: 'vault_repaired' });
    }
    res.json({ success: result.errors.length === 0, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/system/demo-data', (req, res) => {
  try {
    res.json({ success: true, workspaceRoot: WorkspaceService.workspaceRoot, ...DemoDataService.getStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/system/demo-data/load', authenticateToken, requireVaultAdmin, (req, res) => {
  try {
    const status = DemoDataService.load();
    AuditService.logEvent({ actor: req.user?.name || 'Administrator', action: 'DEMO_DATA_LOADED', entityType: 'System', entityId: 'DemoData', details: { counts: status.counts } });
    SseService.broadcast('workspace:updated', { reason: 'demo_data_loaded' });
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/system/demo-data/clear', authenticateToken, requireVaultAdmin, (req, res) => {
  try {
    const expected = path.basename(path.resolve(WorkspaceService.workspaceRoot));
    if (!req.body || req.body.confirm !== expected) {
      return res.status(400).json({ error: `Confirmation failed. Type the vault folder name "${expected}" to proceed.` });
    }
    const result = DemoDataService.clear();
    AuditService.logEvent({ actor: req.user?.name || 'Administrator', action: 'DEMO_DATA_CLEARED', entityType: 'System', entityId: 'DemoData', details: { removed: result.removed.length, skipped: result.skipped.length } });
    SseService.broadcast('workspace:updated', { reason: 'demo_data_cleared' });
    res.json({ success: true, ...result, ...DemoDataService.getStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/system/vault/reset', authenticateToken, requireVaultAdmin, (req, res) => {
  try {
    const confirmationName = req.body?.confirmationName || req.body?.confirm;
    const actor = req.user?.name || req.user?.username || 'Administrator';
    const result = WorkspaceService.resetVaultStructure(confirmationName, actor);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
