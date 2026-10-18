const express = require('express');
const router = express.Router();
const WorkspaceService = require('../services/WorkspaceService');
const FrontmatterService = require('../services/FrontmatterService');
const CopywritingService = require('../services/CopywritingService');
const SnapshotService = require('../services/SnapshotService');
const ExportService = require('../services/ExportService');
const DeliverableService = require('../services/DeliverableService');
const AuditService = require('../services/AuditService');
const CommentService = require('../services/CommentService');
const SseService = require('../services/SseService');
const WebhookService = require('../services/WebhookService');
const { authenticateToken, requirePermission } = require('../middleware/auth');

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

router.post('/projects', authenticateToken, (req, res) => {
  try {
    const actor = (req.user && (req.user.name || req.user.username)) || 'creator';
    const result = WorkspaceService.scaffoldProject(req.body, actor);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/projects/:id', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const deliverables = DeliverableService.getProjectDeliverables(project.fullPath);
    const auditLogs = AuditService.getLogs({ entityId: project.jobId || project.id, limit: 20 });
    const comments = CommentService.getComments(project.fullPath, project.jobId || project.id);
    res.json({ project, deliverables, auditLogs, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const handleExport = (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    let selectedFiles = req.query.files ? req.query.files.split(',').map(s => s.trim()).filter(Boolean) : null;
    ExportService.streamProjectHandover(project.fullPath, req.params.id, res, {
      includeWip: req.query.wip === 'true',
      includeBrief: req.query.brief !== 'false',
      includeCopy: req.query.copy !== 'false',
      includeManifest: req.query.manifest !== 'false',
      selectedFiles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/projects/:id/export', handleExport);
router.get('/projects/:id/export/zip', handleExport);

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

router.get('/projects/:id/snapshots', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, snapshots: SnapshotService.getSnapshots(project.fullPath) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/:id/snapshot', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const { trigger, note } = req.body;
    const actor = req.user ? req.user.name : 'Designer';
    const snapshot = SnapshotService.createSnapshot(project.fullPath, trigger || 'MANUAL_MILESTONE', actor, note);
    res.status(201).json({ success: true, snapshot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/:id/rollback', authenticateToken, requirePermission('project:edit'), (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const { snapshotId } = req.body;
    if (!snapshotId) return res.status(400).json({ error: 'snapshotId is required' });
    const actor = req.user ? req.user.name : 'Lead Designer';
    const result = SnapshotService.rollback(project.fullPath, snapshotId, actor);
    WebhookService.dispatch('PROJECT_ROLLBACK', {
      projectId: project.id,
      jobId: project.jobId,
      projectTitle: project.title,
      actor,
      snapshotId,
      brand: project.brand
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/:id/reassign', authenticateToken, (req, res) => {
  try {
    const { newDesigner, reason } = req.body;
    const actor = req.user ? req.user.name : 'Studio Lead';
    const role = req.user ? req.user.role : 'Manager';
    const result = WorkspaceService.reassignProject(req.params.id, newDesigner, reason, actor, role);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/projects/:id', authenticateToken, requirePermission('project:edit'), (req, res) => {
  try {
    const actor = (req.user && (req.user.name || req.user.username)) || 'Administrator';
    const role = (req.user && req.user.role) || 'Admin';
    const result = WorkspaceService.updateProject(req.params.id, req.body, actor, role);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/projects/:id/brief', authenticateToken, requirePermission('brief:edit'), (req, res) => {
  try {
    const briefMarkdown = req.body.briefMarkdown !== undefined ? req.body.briefMarkdown : (req.body.readmeBody !== undefined ? req.body.readmeBody : (req.body.body || ''));
    const actor = req.user ? req.user.name : 'Designer';
    const result = WorkspaceService.updateProjectBrief(req.params.id, briefMarkdown, req.body.expectedHash, actor);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/projects/:id/direction', authenticateToken, requirePermission('direction:edit'), (req, res) => {
  try {
    const actor = req.user ? req.user.name : 'Lead Designer';
    const result = WorkspaceService.updateProjectDirection(req.params.id, req.body, actor);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/projects/:id/copywriting', authenticateToken, (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    const result = CopywritingService.getCopywriting(project ? project.fullPath : null, req.params.id, project ? project.title : '');
    res.json({ success: true, copywriting: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/projects/:id/copywriting', authenticateToken, requirePermission('copy:view'), (req, res) => {
  try {
    const project = WorkspaceService.getProjectById(req.params.id);
    const { body, content } = req.body;
    const result = CopywritingService.updateCopywriting(
      project ? project.fullPath : null,
      req.params.id,
      body !== undefined ? body : content || '',
      req.user ? req.user.name : 'Copywriter',
      req.user ? req.user.role : 'Copywriter'
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
