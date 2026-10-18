const express = require('express');
const router = express.Router();
const ShareService = require('../services/ShareService');
const WorkspaceService = require('../services/WorkspaceService');
const ApprovalService = require('../services/ApprovalService');
const CommentService = require('../services/CommentService');
const AuditService = require('../services/AuditService');
const SseService = require('../services/SseService');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.post('/projects/:id/share', authenticateToken, requirePermission('share:create'), (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const { label, expiresInHours } = req.body;
    const actor = req.user ? req.user.name : 'Creative Director';
    const link = ShareService.createShareLink(project.fullPath, project.jobId || project.id, {
      label: label || 'Client Review Proof',
      createdBy: actor,
      expiresInHours: expiresInHours || 72
    });
    AuditService.logEvent({
      actor,
      role: req.user ? req.user.role : 'Manager',
      action: 'SHARE_LINK_GENERATED',
      entityType: 'ShareLink',
      entityId: link.token,
      details: { projectId: req.params.id, label: link.label }
    });
    res.status(201).json({ success: true, shareLink: link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:id/share', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, shareLinks: ShareService.listShareLinks(project.fullPath) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/projects/:id/share/:token', authenticateToken, requirePermission('share:create'), (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const ok = ShareService.revokeShareLink(project.fullPath, req.params.token);
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/review/:token', (req, res) => {
  try {
    const result = ShareService.getReviewData(req.params.token);
    if (!result) return res.status(404).json({ error: 'Invalid or expired review proof link.' });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/review/:token/decision', (req, res) => {
  try {
    const { deliverableId, status, reviewerName, reviewerRole, note } = req.body;
    if (!deliverableId || !status) return res.status(400).json({ error: 'deliverableId and status are required' });
    const reviewData = ShareService.getReviewData(req.params.token);
    if (!reviewData) return res.status(404).json({ error: 'Invalid or expired review proof link.' });

    const actor = reviewerName ? `${reviewerName} (Client Proof)` : 'Client Reviewer';
    const role = reviewerRole || 'Client Stakeholder';
    const result = ApprovalService.submitDecision(reviewData.projectPath, deliverableId, status, actor, role, note);

    AuditService.logEvent({
      actor,
      role,
      action: `PUBLIC_PROOF_${status.toUpperCase()}`,
      entityType: 'Deliverable',
      entityId: deliverableId,
      details: { token: req.params.token, note }
    });

    WorkspaceService.scan(true);
    SseService.broadcast('project:updated', { projectId: reviewData.project.id });
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/review/:token/comments', (req, res) => {
  try {
    const { text, authorName, authorRole, deliverableId, metadata } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });
    const reviewData = ShareService.getReviewData(req.params.token);
    if (!reviewData) return res.status(404).json({ error: 'Invalid or expired review proof link.' });

    const newComment = CommentService.addComment(reviewData.projectPath, reviewData.project.jobId || reviewData.project.id, {
      text: text.trim(),
      author: authorName || 'Client Reviewer',
      authorRole: authorRole || 'External Reviewer',
      deliverableId: deliverableId || null,
      metadata: metadata || {}
    });

    AuditService.logEvent({
      actor: newComment.author,
      role: newComment.authorRole,
      action: 'PUBLIC_PROOF_COMMENT',
      entityType: 'DeliverableComment',
      entityId: reviewData.project.id,
      details: { commentId: newComment.id, deliverableId: newComment.deliverableId }
    });

    SseService.broadcast('comment:added', { projectId: reviewData.project.id, comment: newComment });
    res.status(201).json({ success: true, comment: newComment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
