const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { SYSTEM_USERS, ROLE_PERMISSIONS, verifyUserPassword, updateUserPassword, generateToken, authenticateToken, requirePermission } = require('../middleware/auth');
const WorkspaceService = require('../services/WorkspaceService');
const FrontmatterService = require('../services/FrontmatterService');
const DeliverableService = require('../services/DeliverableService');
const ApprovalService = require('../services/ApprovalService');
const CopywritingService = require('../services/CopywritingService');
const TeamService = require('../services/TeamService');
const AuditService = require('../services/AuditService');

// ─── AUTHENTICATION ROUTES ──────────────────────────────────────────

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const targetUsername = (username || 'hasan').toLowerCase();
  const user = SYSTEM_USERS.find(u => u.username.toLowerCase() === targetUsername || u.staffId.toLowerCase() === targetUsername);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or staff ID.' });
  }

  // Verify user password against persistent NAS store or default
  if (password && !verifyUserPassword(user.username, password)) {
    return res.status(401).json({ error: 'Invalid password. Please check your password.' });
  }

  const token = generateToken(user);
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      staffId: user.staffId,
      department: user.department,
      permissions: ROLE_PERMISSIONS[user.role] || []
    }
  });
});

router.post('/auth/change-password', authenticateToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!verifyUserPassword(req.user.username, currentPassword)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    updateUserPassword(req.user.username, newPassword);

    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: req.user.username,
      details: { username: req.user.username }
    });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

router.get('/auth/users', authenticateToken, (req, res) => {
  res.json({ users: SYSTEM_USERS, roles: Object.keys(ROLE_PERMISSIONS) });
});

// ─── DASHBOARD ROUTES ───────────────────────────────────────────────

router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const data = WorkspaceService.getDashboardMetrics();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PROJECT ROUTES ─────────────────────────────────────────────────

router.get('/projects', authenticateToken, (req, res) => {
  try {
    const filters = {
      query: req.query.query,
      status: req.query.status,
      brand: req.query.brand,
      designer: req.query.designer,
      priority: req.query.priority,
      department: req.query.department,
      isOverdue: req.query.isOverdue
    };

    const projects = WorkspaceService.getAllProjects(filters);
    res.json({ total: projects.length, projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:id', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const deliverables = DeliverableService.getProjectDeliverables(project.fullPath);
    const auditLogs = AuditService.getLogs({ entityId: project.jobId || project.id, limit: 20 });

    res.json({
      project,
      deliverables,
      auditLogs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/projects/:id', authenticateToken, requirePermission('project:edit'), (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { frontmatter, body, expectedHash } = req.body;

    const result = FrontmatterService.writeProjectReadme(
      project.fullPath,
      frontmatter || {},
      body !== undefined ? body : null,
      expectedHash || null
    );

    AuditService.logEvent({
      actor: req.user.name || req.user.username,
      role: req.user.role,
      action: 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: project.jobId || project.id,
      details: { frontmatter }
    });

    WorkspaceService.scan();

    res.json({
      success: true,
      project: WorkspaceService.getProjectById(req.params.id),
      versionHash: result.versionHash
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/projects/:id/brief', authenticateToken, requirePermission('brief:edit'), (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { briefMarkdown, expectedHash } = req.body;
    const { frontmatter } = FrontmatterService.readProjectReadme(project.fullPath);

    const result = FrontmatterService.writeProjectReadme(
      project.fullPath,
      frontmatter,
      briefMarkdown,
      expectedHash || null
    );

    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'PROJECT_BRIEF_UPDATED',
      entityType: 'Project',
      entityId: project.jobId || project.id
    });

    WorkspaceService.scan();
    res.json({ success: true, versionHash: result.versionHash });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/projects/:id/direction', authenticateToken, requirePermission('direction:edit'), (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { tone, keyMessaging, visualNotes } = req.body;
    const { frontmatter, body } = FrontmatterService.readProjectReadme(project.fullPath);

    const updatedFm = {
      ...frontmatter,
      creative_direction: {
        tone: tone || '',
        key_messaging: keyMessaging || '',
        visual_notes: visualNotes || '',
        updatedBy: req.user.name,
        updatedAt: new Date().toISOString()
      }
    };

    FrontmatterService.writeProjectReadme(project.fullPath, updatedFm, body);

    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'CREATIVE_DIRECTION_UPDATED',
      entityType: 'Project',
      entityId: project.jobId || project.id
    });

    WorkspaceService.scan();
    res.json({ success: true, creativeDirection: updatedFm.creative_direction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/projects/:id/copywriting', authenticateToken, requirePermission('copy:view'), (req, res) => {
  try {
    const result = CopywritingService.updateCopywriting(
      req.params.id,
      req.body,
      req.user.name,
      req.user.role
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── DECISION & APPROVAL ROUTE ──────────────────────────────────────

router.post('/projects/:id/decision', authenticateToken, requirePermission('deliverable:approve'), (req, res) => {
  try {
    const { decision, comment, deliverableId } = req.body;
    if (!['approved', 'revision_requested', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision. Must be approved, revision_requested, or rejected.' });
    }

    const result = ApprovalService.processDecision({
      projectId: req.params.id,
      decision,
      reviewer: req.user.name,
      role: req.user.role,
      comment,
      deliverableId
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── DELIVERABLES & PREVIEWS ────────────────────────────────────────

router.get('/deliverables', authenticateToken, (req, res) => {
  try {
    const allProjects = WorkspaceService.getAllProjects();
    const reviewQueue = [];

    for (const p of allProjects) {
      if (['review', 'revision', 'in-progress'].includes(p.status)) {
        const dels = DeliverableService.getProjectDeliverables(p.fullPath);
        dels.forEach(d => {
          if (d.isDeliverable) {
            reviewQueue.push({
              ...d,
              projectTitle: p.title,
              projectJobId: p.jobId,
              projectBrand: p.brand,
              projectStatus: p.status,
              projectDesigner: p.designer,
              projectPriority: p.priority,
              projectId: p.id
            });
          }
        });
      }
    }

    res.json({ total: reviewQueue.length, deliverables: reviewQueue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/deliverables/preview', (req, res) => {
  const safePath = DeliverableService.resolveSafePath(req.query.id);
  if (!safePath) {
    return res.status(404).send('Asset not found or access denied.');
  }

  res.sendFile(safePath);
});

router.get('/deliverables/download', (req, res) => {
  const safePath = DeliverableService.resolveSafePath(req.query.id);
  if (!safePath) {
    return res.status(404).send('Asset not found or access denied.');
  }

  res.download(safePath);
});

// ─── TEAM & WORKLOAD ────────────────────────────────────────────────

router.get('/team', authenticateToken, (req, res) => {
  try {
    const team = TeamService.getTeamDirectory();
    res.json({ team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/team/roster', authenticateToken, (req, res) => {
  try {
    const roster = TeamService.getStaffRoster();
    res.json({ roster });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/team/roster', authenticateToken, requirePermission('team:manage_workload'), (req, res) => {
  try {
    const newMember = TeamService.addStaffMember(req.body);
    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'STAFF_MEMBER_PROVISIONED',
      entityType: 'Staff',
      entityId: newMember.staffId,
      details: newMember
    });
    res.json({ success: true, member: newMember });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/team/roster/:id', authenticateToken, requirePermission('team:manage_workload'), (req, res) => {
  try {
    const updated = TeamService.updateStaffMember(req.params.id, req.body);
    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'STAFF_MEMBER_UPDATED',
      entityType: 'Staff',
      entityId: req.params.id,
      details: updated
    });
    res.json({ success: true, member: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── AUDIT LOGS ─────────────────────────────────────────────────────

router.get('/audit', authenticateToken, (req, res) => {
  try {
    const logs = AuditService.getLogs({
      limit: parseInt(req.query.limit, 10) || 100,
      entityId: req.query.entityId,
      action: req.query.action
    });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SYSTEM STATUS & DOCKER HEALTHCHECK ───────────────────────────────

router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    app: config.APP_TITLE,
    version: config.VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    timestamp: new Date().toISOString()
  });
});

router.get('/system/status', authenticateToken, (req, res) => {
  res.json({
    app: config.APP_TITLE,
    version: config.VERSION,
    workspaceRoot: config.WORKSPACE_ROOT,
    workspaceExists: fs.existsSync(config.WORKSPACE_ROOT),
    cachedProjects: WorkspaceService.projectsCache.length,
    lastScan: WorkspaceService.lastScanTime,
    uptimeSeconds: Math.floor(process.uptime()),
    platform: process.platform
  });
});

module.exports = router;
