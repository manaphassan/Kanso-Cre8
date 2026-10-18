const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');
const WorkspaceService = require('../services/WorkspaceService');
const TeamService = require('../services/TeamService');
const LicenseService = require('../services/LicenseService');
const SseService = require('../services/SseService');
const AuditService = require('../services/AuditService');
const WebhookService = require('../services/WebhookService');
const CommentService = require('../services/CommentService');
const RadioMetadataService = require('../services/RadioMetadataService');
const VaultHealthService = require('../services/VaultHealthService');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.get('/events', (req, res) => {
  SseService.addClient(req, res);
});

router.get('/status', (req, res) => {
  res.json({
    success: true,
    name: 'Kanso Cre8',
    version: config.VERSION || '0.8.0',
    platform: process.platform,
    uptime: process.uptime()
  });
});

router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const data = WorkspaceService.getDashboardMetrics({ timeRange: req.query.timeRange || 'all', brand: req.query.brand || 'all' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/webhooks', authenticateToken, (req, res) => {
  try {
    res.json({ success: true, webhooks: WebhookService.getWebhooks() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhooks', authenticateToken, (req, res) => {
  try {
    const { name, url, serviceType, events, active } = req.body;
    res.status(201).json({ success: true, webhook: WebhookService.addWebhook({ name, url, serviceType, events, active }) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/webhooks/:id', authenticateToken, (req, res) => {
  try {
    res.json({ success: WebhookService.deleteWebhook(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhooks/test', authenticateToken, async (req, res) => {
  try {
    res.json({ success: true, result: await WebhookService.testPing(req.body.url, req.body.serviceType) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notifications', authenticateToken, (req, res) => {
  try {
    const notifications = CommentService.getNotifications(req.user ? req.user.username : '', parseInt(req.query.limit, 10) || 25);
    res.json({ notifications, unreadCount: notifications.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit', authenticateToken, (req, res) => {
  try {
    res.json({ logs: AuditService.getLogs({ limit: parseInt(req.query.limit, 10) || 100, entityId: req.query.entityId, action: req.query.action }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/system/health', authenticateToken, (req, res) => {
  const wsRoot = (WorkspaceService && WorkspaceService.workspaceRoot) || config.WORKSPACE_ROOT;
  res.json({
    success: true,
    workspaceRoot: wsRoot,
    workspaceExists: fs.existsSync(wsRoot),
    cachedProjects: WorkspaceService.projectsCache ? WorkspaceService.projectsCache.length : 0,
    lastScan: WorkspaceService.lastScanTime,
    uptimeSeconds: Math.floor(process.uptime()),
    platform: process.platform
  });
});

router.get('/system/status', authenticateToken, (req, res) => {
  const wsRoot = (WorkspaceService && WorkspaceService.workspaceRoot) || config.WORKSPACE_ROOT;
  res.json({
    success: true,
    app: config.APP_TITLE,
    version: config.VERSION,
    workspaceRoot: wsRoot,
    workspaceExists: fs.existsSync(wsRoot),
    cachedProjects: WorkspaceService.projectsCache ? WorkspaceService.projectsCache.length : 0,
    lastScan: WorkspaceService.lastScanTime,
    uptimeSeconds: Math.floor(process.uptime()),
    platform: process.platform
  });
});

router.get('/system/workspace-candidates', authenticateToken, (req, res) => {
  try {
    res.json({ success: true, ...WorkspaceService.getWorkspaceCandidates() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/system/studio-profile', authenticateToken, (req, res) => {
  try {
    res.json({ success: true, profile: TeamService.getStudioProfile() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/system/studio-profile', authenticateToken, (req, res) => {
  try {
    const updated = TeamService.saveStudioProfile(req.body);
    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'STUDIO_PROFILE_UPDATED',
      entityType: 'StudioBranding',
      entityId: 'studio_profile',
      details: { studioName: updated.studioName, principalName: updated.principalName }
    });
    SseService.broadcast('studio:updated', { profile: updated });
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/system/license', (req, res) => {
  try {
    res.json({ success: true, license: TeamService.getLicense(), status: LicenseService.getLicenseStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/system/license', (req, res) => {
  try {
    const result = LicenseService.saveLicense(req.body ? req.body.licenseKey : undefined);
    res.json({ success: true, message: result.message, status: result.status, license: req.body ? req.body.licenseKey : undefined });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/system/license/verify', (req, res) => {
  try {
    const result = LicenseService.verifyKey(req.body ? req.body.licenseKey : undefined);
    res.json({ success: result.valid, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/system/license/deactivate', (req, res) => {
  try {
    const result = LicenseService.deactivateLicense();
    res.json({ success: true, message: result.message, status: result.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/system/workspace-root', authenticateToken, (req, res) => {
  try {
    const roleLower = (req.user?.role || '').toLowerCase();
    const permissions = req.user?.permissions || [];
    const isAuthorized = roleLower.includes('admin') || roleLower.includes('ceo') || roleLower.includes('executive') || permissions.includes('admin:system_audit');
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Permission Denied. System Administrator or Executive privileges required.' });
    }
    const { workspacePath, autoCreate } = req.body;
    if (!workspacePath || typeof workspacePath !== 'string' || !workspacePath.trim()) {
      return res.status(400).json({ error: 'Valid workspace path is required.' });
    }
    const result = WorkspaceService.setWorkspaceRoot(
      workspacePath,
      req.user?.name || req.user?.username || 'Administrator',
      autoCreate === true || autoCreate === 'true'
    );
    res.json({ success: true, message: 'Workspace root mount path updated and rescan initiated successfully.', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/radio/now-playing', async (req, res) => {
  const { streamUrl, stationId } = req.query;
  if (!streamUrl && !stationId) return res.status(400).json({ error: 'streamUrl or stationId is required' });
  try {
    res.json(await RadioMetadataService.fetchNowPlaying(streamUrl, stationId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/restart', authenticateToken, (req, res) => {
  const role = (req.user?.role || '').toLowerCase();
  const roles = (req.user?.roles || []).map(r => r.toLowerCase());
  if (!role.includes('admin') && !roles.some(r => r.includes('admin'))) {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  AuditService.logEvent({
    actor: req.user?.name || 'Administrator',
    role: req.user?.role || 'Admin',
    action: 'SERVER_RESTART_REQUESTED',
    entityType: 'System',
    entityId: 'desktop-service',
    details: { timestamp: new Date().toISOString() }
  });
  res.json({ success: true, message: 'Server restarting now...' });
  setTimeout(() => { process.exit(0); }, 300);
});

router.get('/system/sync-conflicts', (req, res) => {
  try {
    const conflicts = WorkspaceService.scanSyncConflicts();
    res.json({ success: true, count: conflicts.length, conflicts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/system/sync-conflicts/resolve', (req, res) => {
  try {
    const result = WorkspaceService.resolveSyncConflict(req.body.conflictPath, req.body.resolution, (req.user && req.user.name) || 'Designer');
    SseService.broadcast('workspace:updated', { reason: 'conflict_resolved' });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/system/vault-health', (req, res) => {
  try {
    const report = VaultHealthService.getVaultHealthReport();
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/system/vault-health/clean-conflicts', (req, res) => {
  try {
    const actor = (req.user && req.user.name) || 'Designer';
    const resolution = req.body?.resolution || 'keep_local';
    const result = VaultHealthService.cleanAllSyncConflicts(resolution, actor);
    SseService.broadcast('workspace:updated', { reason: 'conflicts_cleaned' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
