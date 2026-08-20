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
const CompanyService = require('../services/CompanyService');
const CommentService = require('../services/CommentService');
const SseService = require('../services/SseService');
const ExportService = require('../services/ExportService');

// ─── REAL-TIME SERVER-SENT EVENTS (SSE) ROUTE ───────────────────────

router.get('/events', (req, res) => {
  SseService.addClient(req, res);
});

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
    const comments = CommentService.getComments(project.fullPath, project.jobId || project.id);

    res.json({
      project,
      deliverables,
      auditLogs,
      comments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:id/export', (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    ExportService.streamProjectHandover(project.fullPath, req.params.id, res, {
      includeWip: req.query.wip === 'true'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/projects/:id', authenticateToken, (req, res) => {
  try {
    const userRole = (req.user ? req.user.role : '').toLowerCase();
    const isAdmin = userRole.includes('admin') || userRole.includes('director') || userRole.includes('lead') || userRole.includes('manager') || userRole.includes('executive');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Administrative permission required to delete project directories.' });
    }

    const result = WorkspaceService.deleteProject(
      req.params.id,
      req.user ? req.user.name : 'Administrator',
      req.user ? req.user.role : 'Admin'
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── PROJECT COMMENTS & COLLABORATION ────────────────────────────────

router.get('/projects/:id/comments', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    const comments = CommentService.getComments(project ? project.fullPath : null, req.params.id);
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/:id/comments', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    const { content, deliverableId, mentions } = req.body;
    const comment = CommentService.addComment(project ? project.fullPath : null, req.params.id, {
      author: req.user ? req.user.name : 'Designer',
      authorRole: req.user ? req.user.role : 'User',
      authorAvatar: req.user ? req.user.avatarColor || '#043388' : '#043388',
      content,
      deliverableId,
      mentions
    });
    SseService.broadcast('comment:added', { projectId: req.params.id, comment });
    res.status(201).json({ success: true, comment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/projects/:id/comments/:commentId/resolve', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    const { resolved = true } = req.body;
    const result = CommentService.resolveComment(
      project ? project.fullPath : null,
      req.params.id,
      req.params.commentId,
      resolved,
      req.user ? req.user.name : 'System',
      req.user ? req.user.role : 'User'
    );
    SseService.broadcast('comment:resolved', { projectId: req.params.id, commentId: req.params.commentId, resolved });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/projects/:id/comments/:commentId', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    const result = CommentService.deleteComment(
      project ? project.fullPath : null,
      req.params.id,
      req.params.commentId,
      req.user ? req.user.name : 'System',
      req.user ? req.user.role : 'User'
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── LIVE ACTIVITY & NOTIFICATIONS ───────────────────────────────────

router.get('/notifications', authenticateToken, (req, res) => {
  try {
    const username = req.user ? req.user.username : '';
    const limit = parseInt(req.query.limit, 10) || 25;
    const notifications = CommentService.getNotifications(username, limit);
    res.json({ notifications, unreadCount: notifications.length });
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

    const { frontmatter, status, priority, body, expectedHash } = req.body;
    const { frontmatter: existingFm, body: existingBody } = FrontmatterService.readProjectReadme(project.fullPath);

    const mergedFm = {
      ...existingFm,
      ...(frontmatter || {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {})
    };

    const result = FrontmatterService.writeProjectReadme(
      project.fullPath,
      mergedFm,
      body !== undefined && body !== null ? body : existingBody,
      expectedHash || null
    );

    AuditService.logEvent({
      actor: req.user.name || req.user.username,
      role: req.user.role,
      action: 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: project.jobId || project.id,
      details: { status: mergedFm.status, priority: mergedFm.priority }
    });

    WorkspaceService.scan();
    SseService.broadcast('project:updated', { projectId: req.params.id, status: mergedFm.status, priority: mergedFm.priority });

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
    SseService.broadcast('project:updated', { projectId: req.params.id });
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

router.get('/projects/:id/copywriting', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    const result = CopywritingService.getCopywriting(
      project ? project.fullPath : null,
      req.params.id,
      project ? project.title : ''
    );
    res.json({ success: true, copywriting: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/projects/:id/copywriting', authenticateToken, requirePermission('copy:view'), (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    const { body, content } = req.body;
    const bodyToSave = body !== undefined ? body : content || '';

    const result = CopywritingService.updateCopywriting(
      project ? project.fullPath : null,
      req.params.id,
      bodyToSave,
      req.user ? req.user.name : 'Copywriter',
      req.user ? req.user.role : 'Copywriter'
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

    SseService.broadcast('project:decision', {
      projectId: req.params.id,
      decision,
      deliverableId,
      reviewer: req.user.name,
      comment
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

router.get('/deliverables/stream', (req, res) => {
  const safePath = DeliverableService.resolveSafePath(req.query.id);
  if (!safePath) {
    return res.status(404).send('Asset not found or access denied.');
  }

  DeliverableService.streamMedia(safePath, req, res);
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

// ─── USER & STAFF DIRECTORY ROUTES ──────────────────────────────────

router.get('/team/roster', (req, res) => {
  try {
    const roster = TeamService.getStaffRoster();
    res.json({ success: true, roster, users: roster });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', (req, res) => {
  try {
    const roster = TeamService.getStaffRoster();
    res.json({ success: true, users: roster, roster });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', authenticateToken, (req, res) => {
  try {
    const newMember = TeamService.addStaffMember(req.body);
    if (req.body.password) {
      updateUserPassword(newMember.username, req.body.password);
    }
    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newMember.staffId,
      details: { staffId: newMember.staffId, name: newMember.name, role: newMember.role }
    });
    res.json({ success: true, user: newMember, member: newMember });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/users/:id', authenticateToken, (req, res) => {
  try {
    const updated = TeamService.updateStaffMember(req.params.id, req.body);
    if (req.body.password) {
      updateUserPassword(updated.username, req.body.password);
    }
    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: req.params.id,
      details: updated
    });
    res.json({ success: true, user: updated, member: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/users/:id', authenticateToken, (req, res) => {
  try {
    const result = TeamService.deleteStaffMember(req.params.id);
    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: req.params.id
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/users/:username/reset-password', authenticateToken, (req, res) => {
  try {
    const { newPassword } = req.body;
    updateUserPassword(req.params.username, newPassword || 'SuamiSihat123!');
    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'USER_PASSWORD_RESET',
      entityType: 'User',
      entityId: req.params.username
    });
    res.json({ success: true, message: `Password reset successfully for ${req.params.username}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/team/roster', authenticateToken, (req, res) => {
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

router.put('/team/roster/:id', authenticateToken, (req, res) => {
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

// ─── COMPANY & SUBSIDIARY DIRECTORY ROUTES ──────────────────────────

router.get('/companies', (req, res) => {
  try {
    const companies = CompanyService.getAll();
    res.json({ success: true, companies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/companies/:code', (req, res) => {
  try {
    const company = CompanyService.getByCode(req.params.code);
    if (!company) {
      return res.status(404).json({ error: `Company with code ${req.params.code} not found.` });
    }
    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/companies', authenticateToken, (req, res) => {
  try {
    const saved = CompanyService.saveCompany(req.body);
    AuditService.logEvent({
      actor: req.user ? req.user.name : 'System Admin',
      role: req.user ? req.user.role : 'Admin',
      action: 'COMPANY_SAVED',
      entityType: 'Company',
      entityId: saved.code,
      details: saved
    });
    res.json({ success: true, company: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/companies/:code', authenticateToken, (req, res) => {
  try {
    const data = { ...req.body, code: req.params.code };
    const saved = CompanyService.saveCompany(data);
    AuditService.logEvent({
      actor: req.user ? req.user.name : 'System Admin',
      role: req.user ? req.user.role : 'Admin',
      action: 'COMPANY_UPDATED',
      entityType: 'Company',
      entityId: saved.code,
      details: saved
    });
    res.json({ success: true, company: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/companies', authenticateToken, (req, res) => {
  try {
    const saved = CompanyService.saveCompany(req.body);
    AuditService.logEvent({
      actor: req.user ? req.user.name : 'System Admin',
      role: req.user ? req.user.role : 'Admin',
      action: 'COMPANY_UPDATED',
      entityType: 'Company',
      entityId: saved.code,
      details: saved
    });
    res.json({ success: true, company: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/companies/:code', authenticateToken, (req, res) => {
  try {
    const result = CompanyService.deleteCompany(req.params.code);
    AuditService.logEvent({
      actor: req.user ? req.user.name : 'System Admin',
      role: req.user ? req.user.role : 'Admin',
      action: 'COMPANY_DELETED',
      entityType: 'Company',
      entityId: req.params.code,
      details: { deletedCode: req.params.code }
    });
    res.json({ success: true, ...result });
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
