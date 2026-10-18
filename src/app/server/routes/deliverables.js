const express = require('express');
const router = express.Router();
const WorkspaceService = require('../services/WorkspaceService');
const DeliverableService = require('../services/DeliverableService');
const ApprovalService = require('../services/ApprovalService');
const CommentService = require('../services/CommentService');
const AuditService = require('../services/AuditService');
const SseService = require('../services/SseService');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.get('/projects/:id/comments', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const comments = CommentService.getComments(project.fullPath, project.jobId || project.id);
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/:id/comments', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const { text, authorName, authorRole, deliverableId, metadata } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });

    const newComment = CommentService.addComment(project.fullPath, project.jobId || project.id, {
      text: text.trim(),
      author: req.user ? req.user.name : (authorName || 'Guest User'),
      authorRole: req.user ? req.user.role : (authorRole || 'Client Reviewer'),
      deliverableId: deliverableId || null,
      metadata: metadata || {}
    });

    AuditService.logEvent({
      actor: newComment.author,
      role: newComment.authorRole,
      action: 'COMMENT_POSTED',
      entityType: 'DeliverableComment',
      entityId: project.jobId || project.id,
      details: { commentId: newComment.id, deliverableId: newComment.deliverableId }
    });

    SseService.broadcast('comment:added', { projectId: req.params.id, comment: newComment });
    res.status(201).json({ comment: newComment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/projects/:id/comments/:commentId/resolve', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const actor = req.user ? req.user.name : 'Lead Designer';
    const updated = CommentService.resolveComment(project.fullPath, project.jobId || project.id, req.params.commentId, actor);
    SseService.broadcast('comment:resolved', { projectId: req.params.id, comment: updated });
    res.json({ comment: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/:id/deliverables/ingest', authenticateToken, requirePermission('deliverable:create'), (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const { sourceFilePath, subfolder, overwrite } = req.body;
    if (!sourceFilePath) return res.status(400).json({ error: 'sourceFilePath is required' });
    const actor = req.user ? req.user.name : 'Studio Pipeline';
    const result = WorkspaceService.ingestFile(project.fullPath, sourceFilePath, subfolder || '01_Output', overwrite === true, actor);
    WorkspaceService.scan(true);
    SseService.broadcast('project:updated', { projectId: req.params.id });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/projects/:id/deliverables/:deliverableId/decision', authenticateToken, requirePermission('deliverable:decision'), (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const { status, note } = req.body;
    const actor = req.user ? req.user.name : 'Director';
    const role = req.user ? req.user.role : 'Manager';
    const result = ApprovalService.submitDecision(project.fullPath, req.params.deliverableId, status, actor, role, note);
    AuditService.logEvent({
      actor,
      role,
      action: `DECISION_${status.toUpperCase()}`,
      entityType: 'Deliverable',
      entityId: req.params.deliverableId,
      details: { projectId: req.params.id, note }
    });
    WorkspaceService.scan(true);
    SseService.broadcast('project:updated', { projectId: req.params.id });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/projects/:id/deliverables', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const deliverables = DeliverableService.getProjectDeliverables(project.fullPath);
    res.json({ total: deliverables.length, deliverables });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:id/deliverables/:deliverableId', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const deliverables = DeliverableService.getProjectDeliverables(project.fullPath);
    const item = deliverables.find(d => d.id === req.params.deliverableId);
    if (!item) return res.status(404).json({ error: 'Deliverable not found' });
    res.json({ deliverable: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:id/deliverables/:deliverableId/preview', (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    DeliverableService.streamDeliverablePreview(project.fullPath, req.params.deliverableId, req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
