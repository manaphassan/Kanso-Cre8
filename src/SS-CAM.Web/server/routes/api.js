const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { SYSTEM_USERS, ROLE_PERMISSIONS, getUserRoles, getUserPermissions, verifyUserPassword, updateUserPassword, generateToken, authenticateToken, requirePermission } = require('../middleware/auth');
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
const ShareService = require('../services/ShareService');

// ─── REAL-TIME SERVER-SENT EVENTS (SSE) ROUTE ───────────────────────

router.get('/events', (req, res) => {
  SseService.addClient(req, res);
});

// ─── AUTHENTICATION ROUTES ──────────────────────────────────────────

router.get('/auth/roster', (req, res) => {
  try {
    const roster = TeamService.getStaffRoster()
      .filter(u => u.active !== false)
      .map(u => ({
        staffId: u.staffId || u.id,
        username: u.username || (u.name || '').toLowerCase().replace(/\s+/g, ''),
        name: u.name,
        role: u.role || 'Designer',
        department: u.department || 'Creative Production',
        avatarColor: u.avatarColor || '#0078D4'
      }))
      .sort((a, b) => (b.staffId || '').localeCompare(a.staffId || ''));
    res.json({ success: true, staff: roster });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const staffRoster = TeamService.getStaffRoster();
  const searchKey = username.trim().toLowerCase();

  // Support case-insensitive lookup by username, name, or staffId from live roster
  let user = staffRoster.find(
    u => (u.username && u.username.toLowerCase() === searchKey) || 
         (u.name && u.name.toLowerCase() === searchKey) ||
         (u.staffId && u.staffId.toLowerCase() === searchKey)
  );

  // Fallback to SYSTEM_USERS if not in staff directory
  if (!user) {
    user = SYSTEM_USERS.find(
      u => (u.username && u.username.toLowerCase() === searchKey) || 
           (u.name && u.name.toLowerCase() === searchKey) ||
           (u.id && u.id.toLowerCase() === searchKey)
    );
  }

  if (!user) {
    return res.status(401).json({ error: 'User not found in staff directory' });
  }

  if (user.active === false) {
    return res.status(403).json({ error: 'Account has been suspended' });
  }

  if (!verifyUserPassword(user.username, password)) {
    return res.status(401).json({ error: 'Invalid password. Please try again.' });
  }

  const token = generateToken(user);
  const roles = getUserRoles(user);
  const permissions = getUserPermissions(user);
  res.json({
    success: true,
    token,
    user: {
      id: user.staffId || user.id,
      username: user.username,
      name: user.name,
      role: Array.isArray(user.role) ? user.role.join(', ') : (user.role || roles.join(', ')),
      roles,
      staffId: user.staffId,
      department: user.department,
      email: user.email || '',
      avatar: user.avatar || user.avatarUrl || '',
      avatarColor: user.avatarColor || '#0078D4',
      defaultBrand: user.defaultBrand || 'SS',
      permissions
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
  const staffRoster = TeamService.getStaffRoster();
  const searchStaffId = (req.user.staffId || '').toLowerCase();
  const searchUsername = (req.user.username || '').toLowerCase();
  const liveStaff = staffRoster.find(u => 
    (u.staffId && u.staffId.toLowerCase() === searchStaffId) ||
    (u.username && u.username.toLowerCase() === searchUsername)
  );

  if (liveStaff) {
    res.json({
      user: {
        ...req.user,
        name: liveStaff.name || req.user.name,
        role: liveStaff.role || req.user.role,
        roles: liveStaff.roles || req.user.roles,
        department: liveStaff.department || req.user.department,
        email: liveStaff.email || req.user.email,
        avatar: liveStaff.avatar || liveStaff.avatarUrl || liveStaff.avatarPath || '',
        avatarColor: liveStaff.avatarColor || req.user.avatarColor || '#0078D4',
        defaultBrand: liveStaff.defaultBrand || req.user.defaultBrand || 'SS'
      }
    });
  } else {
    res.json({ user: req.user });
  }
});

router.put('/auth/profile', authenticateToken, (req, res) => {
  try {
    const staffRoster = TeamService.getStaffRoster();
    const searchStaffId = (req.user.staffId || '').toLowerCase();
    const searchUsername = (req.user.username || '').toLowerCase();
    
    let target = staffRoster.find(u => 
      (u.staffId && u.staffId.toLowerCase() === searchStaffId) ||
      (u.username && u.username.toLowerCase() === searchUsername)
    );

    const updates = {
      name: req.body.name || (target ? target.name : req.user.name),
      email: req.body.email !== undefined ? req.body.email : (target ? target.email : req.user.email),
      department: req.body.department || (target ? target.department : req.user.department),
      avatar: req.body.avatar !== undefined ? req.body.avatar : (target ? target.avatar : ''),
      avatarColor: req.body.avatarColor || (target ? target.avatarColor : '#0078D4'),
      defaultBrand: req.body.defaultBrand || (target ? target.defaultBrand : 'SS')
    };

    let updatedMember;
    if (target) {
      updatedMember = TeamService.updateStaffMember(target.staffId, updates);
    } else {
      updatedMember = TeamService.addStaffMember({
        staffId: req.user.staffId || 'SS' + Math.floor(1000 + Math.random() * 9000),
        username: req.user.username,
        role: req.user.role || 'Designer',
        ...updates
      });
    }

    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: updatedMember.staffId,
      details: { name: updatedMember.name, email: updatedMember.email }
    });

    SseService.broadcast('team:updated', { member: updatedMember, action: 'profile_updated' });

    res.json({
      success: true,
      user: {
        ...req.user,
        name: updatedMember.name,
        email: updatedMember.email,
        department: updatedMember.department,
        avatar: updatedMember.avatar || '',
        avatarColor: updatedMember.avatarColor || '#0078D4',
        defaultBrand: updatedMember.defaultBrand || 'SS'
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/auth/users', authenticateToken, (req, res) => {
  res.json({ users: SYSTEM_USERS, roles: Object.keys(ROLE_PERMISSIONS) });
});

// ─── DASHBOARD ROUTES ───────────────────────────────────────────────

router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'all';
    const brand = req.query.brand || 'all';
    const data = WorkspaceService.getDashboardMetrics({ timeRange, brand });
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
    SseService.broadcast('workspace:updated', { projectId: req.params.id, action: 'deleted' });
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
router.post('/projects/:id/ingest', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { filename, targetSubfolder, fileData } = req.body;
    if (!filename || !fileData) {
      return res.status(400).json({ error: 'filename and fileData (base64) are required.' });
    }
    const actor = req.user ? req.user.name : 'Designer';
    const result = WorkspaceService.ingestFile(id, targetSubfolder, filename, fileData, actor);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SHARE & PUBLIC CLIENT REVIEW ROUTES ────────────────────────────

router.post('/share/generate', authenticateToken, (req, res) => {
  try {
    const { projectId, deliverableId, expiresInDays, permissions, note } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required.' });
    }
    const createdBy = req.user ? req.user.name : 'Staff';
    const tokenRecord = ShareService.createShareToken({
      projectId,
      deliverableId,
      createdBy,
      expiresInDays: expiresInDays !== undefined ? expiresInDays : 14,
      permissions: permissions || 'review_approve',
      note: note || ''
    });
    res.status(201).json({ success: true, share: tokenRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/share/list/:projectId', authenticateToken, (req, res) => {
  try {
    const links = ShareService.getProjectShareLinks(req.params.projectId);
    res.json({ success: true, links });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/share/:token', authenticateToken, (req, res) => {
  try {
    const revoked = ShareService.revokeToken(req.params.token);
    res.json({ success: revoked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUBLIC / GUEST REVIEW ENDPOINTS (NO AUTH REQUIRED) ─────────────

router.get('/public/review/:token', (req, res) => {
  try {
    const data = ShareService.validateToken(req.params.token);
    if (!data) {
      return res.status(404).json({ error: 'Review link is invalid or has expired.' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/public/review/:token/decision', (req, res) => {
  try {
    const data = ShareService.validateToken(req.params.token);
    if (!data) {
      return res.status(404).json({ error: 'Review link is invalid or has expired.' });
    }
    if (data.shareInfo.permissions === 'view_only') {
      return res.status(403).json({ error: 'This share link is view-only.' });
    }

    const { decision, reviewerName, reviewerOrg, comment = '', deliverableId = null } = req.body;
    if (!decision || !['approved', 'revision_requested', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Valid decision (approved, revision_requested, rejected) is required.' });
    }

    const reviewer = (reviewerName && reviewerName.trim()) 
      ? `${reviewerName.trim()}${reviewerOrg ? ` (${reviewerOrg.trim()})` : ''}` 
      : 'External Reviewer';

    ApprovalService.processDecision({
      projectId: data.project.id,
      decision,
      reviewer,
      role: 'Client Reviewer',
      comment: comment.trim(),
      deliverableId
    });

    // Notify clients via SSE
    SseService.broadcast('project:decision', {
      projectId: data.project.id,
      decision,
      reviewer,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: `Decision recorded: ${decision}`, reviewer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/public/review/:token/comments', (req, res) => {
  try {
    const data = ShareService.validateToken(req.params.token);
    if (!data) {
      return res.status(404).json({ error: 'Review link is invalid or has expired.' });
    }

    const project = WorkspaceService.getProjectById(data.project.id);
    const { content, reviewerName, reviewerOrg, deliverableId, pinX, pinY } = req.body;

    const author = (reviewerName && reviewerName.trim()) 
      ? `${reviewerName.trim()}${reviewerOrg ? ` (${reviewerOrg.trim()})` : ''}` 
      : 'Guest Reviewer';

    const comment = CommentService.addComment(project ? project.fullPath : null, data.project.id, {
      author,
      authorRole: 'Client Reviewer',
      authorAvatar: '#10B981',
      content,
      deliverableId,
      pinX,
      pinY
    });

    SseService.broadcast('comment:added', { projectId: data.project.id, comment });
    res.status(201).json({ success: true, comment });
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

    const { frontmatter, status, priority, manager, designer, department, brand, deadline, body, expectedHash } = req.body;
    const { frontmatter: existingFm, body: existingBody } = FrontmatterService.readProjectReadme(project.fullPath);

    const mergedFm = {
      ...existingFm,
      ...(frontmatter || {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(manager !== undefined ? { manager } : {}),
      ...(designer !== undefined ? { designer } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(brand !== undefined ? { brand } : {}),
      ...(deadline !== undefined ? { deadline } : {})
    };

    const result = FrontmatterService.writeProjectReadme(
      project.fullPath,
      mergedFm,
      body !== undefined && body !== null ? body : existingBody,
      expectedHash || null
    );

    // Immediately update cached in-memory project fields
    if (project) {
      if (mergedFm.manager !== undefined) project.manager = mergedFm.manager;
      if (mergedFm.status !== undefined) project.status = mergedFm.status;
      if (mergedFm.priority !== undefined) project.priority = mergedFm.priority;
      if (mergedFm.designer !== undefined) project.designer = mergedFm.designer;
      if (mergedFm.brand !== undefined) project.brand = mergedFm.brand;
      if (mergedFm.department !== undefined) project.department = mergedFm.department;
      if (mergedFm.deadline !== undefined) project.deadline = mergedFm.deadline;
      project.versionHash = result.versionHash;
    }

    AuditService.logEvent({
      actor: (req.user && (req.user.name || req.user.username)) || 'Administrator',
      role: (req.user && req.user.role) || 'Admin',
      action: 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: project.jobId || project.id,
      details: { manager: mergedFm.manager, status: mergedFm.status, priority: mergedFm.priority }
    });

    WorkspaceService.scan(true);
    SseService.broadcast('project:updated', { 
      projectId: req.params.id, 
      manager: mergedFm.manager,
      status: mergedFm.status, 
      priority: mergedFm.priority 
    });

    const refreshedProject = WorkspaceService.getProjectById(req.params.id) || project;

    res.json({
      success: true,
      project: refreshedProject,
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

    const briefMarkdown = req.body.briefMarkdown !== undefined ? req.body.briefMarkdown : (req.body.readmeBody !== undefined ? req.body.readmeBody : (req.body.body || ''));
    const expectedHash = req.body.expectedHash || null;
    const { frontmatter } = FrontmatterService.readProjectReadme(project.fullPath);

    const result = FrontmatterService.writeProjectReadme(
      project.fullPath,
      frontmatter,
      briefMarkdown,
      expectedHash
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
      const dels = DeliverableService.getProjectDeliverables(p.fullPath);
      dels.forEach(d => {
        if (d.isDeliverable) {
          const itemStatus = (p.status === 'done' || p.status === 'approved')
            ? 'approved'
            : p.status === 'revision'
              ? 'revision'
              : 'pending';

          reviewQueue.push({
            ...d,
            status: itemStatus,
            projectTitle: p.title,
            projectJobId: p.jobId,
            projectBrand: p.brand,
            projectStatus: p.status,
            projectDesigner: p.designer,
            projectPriority: p.priority,
            projectId: p.id,
            project: {
              id: p.id,
              jobId: p.jobId,
              title: p.title,
              brand: p.brand,
              designer: p.designer,
              status: p.status,
              priority: p.priority,
              deadline: p.deadline
            }
          });
        }
      });
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
// ─── COMMENTS & VISUAL FEEDBACK ANNOTATIONS ─────────────────────────

router.get('/projects/:id/comments', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    const comments = CommentService.getComments(project ? project.fullPath : null, req.params.id);
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/:id/comments', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    const comment = CommentService.addComment(project ? project.fullPath : null, req.params.id, {
      author: req.user.name || req.user.username || 'Reviewer',
      authorRole: req.user.role || 'User',
      authorAvatar: req.user.avatarColor || '#0078D4',
      content: req.body.content || req.body.note || '',
      deliverableId: req.body.deliverableId || null,
      annotation: req.body.annotation || null,
      mentions: req.body.mentions || []
    });

    SseService.broadcast('project:comment', {
      projectId: req.params.id,
      comment
    });

    res.json({ success: true, comment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/projects/:id/comments/:commentId/resolve', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    const { resolved = true } = req.body;
    const result = CommentService.resolveComment(
      project ? project.fullPath : null,
      req.params.id,
      req.params.commentId,
      resolved,
      req.user.name || 'User',
      req.user.role || 'User'
    );

    SseService.broadcast('project:comment_resolved', {
      projectId: req.params.id,
      commentId: req.params.commentId,
      resolved,
      resolvedBy: req.user.name
    });

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
      req.user.name || 'User',
      req.user.role || 'User'
    );

    SseService.broadcast('project:comment_deleted', {
      projectId: req.params.id,
      commentId: req.params.commentId
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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
    SseService.broadcast('team:updated', { member: newMember, action: 'created' });
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
    SseService.broadcast('team:updated', { member: updated, action: 'updated' });
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
    SseService.broadcast('team:updated', { deletedStaffId: req.params.id, action: 'deleted' });
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
    SseService.broadcast('team:updated', { member: newMember, action: 'created' });
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
    SseService.broadcast('team:updated', { member: updated, action: 'updated' });
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
    SseService.broadcast('company:updated', { company: saved, action: 'saved' });
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
    SseService.broadcast('company:updated', { company: saved, action: 'updated' });
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
    SseService.broadcast('company:updated', { company: saved, action: 'updated' });
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
    SseService.broadcast('company:updated', { deletedCode: req.params.code, action: 'deleted' });
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

router.get('/system/workspace-candidates', authenticateToken, (req, res) => {
  const candidates = [
    'D:\\SynologyDrive\\Creative-Team',
    'C:\\SynologyDrive\\Creative-Team',
    'E:\\SynologyDrive\\Creative-Team',
    path.join(process.env.USERPROFILE || '', 'SynologyDrive', 'Creative-Team'),
    path.join(process.env.USERPROFILE || '', 'Synology Drive', 'Creative-Team'),
    '\\\\SSNAS\\Creative-Team',
    '/volume1/Creative-Team',
    '/volume2/Creative-Team',
    path.resolve(__dirname, '../sample-workspace')
  ];

  const results = candidates.map(p => {
    let accessible = false;
    let count = 0;
    try {
      if (fs.existsSync(p)) {
        const items = fs.readdirSync(p);
        accessible = true;
        count = items.length;
      }
    } catch (e) {
      accessible = false;
    }
    return {
      path: p,
      accessible,
      itemCount: count,
      isCurrent: path.resolve(p) === path.resolve(config.WORKSPACE_ROOT)
    };
  });

  res.json({ success: true, candidates: results, current: config.WORKSPACE_ROOT });
});

router.post('/system/workspace-root', authenticateToken, (req, res) => {
  try {
    const roleLower = (req.user?.role || '').toLowerCase();
    const permissions = req.user?.permissions || [];
    const isAuthorized = roleLower.includes('admin') || roleLower.includes('ceo') || roleLower.includes('executive') || permissions.includes('admin:system_audit');
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Permission Denied. System Administrator or Executive privileges required.' });
    }

    const { workspacePath } = req.body;
    if (!workspacePath || typeof workspacePath !== 'string' || !workspacePath.trim()) {
      return res.status(400).json({ error: 'Valid workspace path is required.' });
    }

    const result = WorkspaceService.setWorkspaceRoot(
      workspacePath,
      req.user?.name || req.user?.username || 'Administrator'
    );

    res.json({
      success: true,
      message: 'Workspace root mount path updated and rescan initiated successfully.',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
