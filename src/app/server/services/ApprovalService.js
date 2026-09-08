const fs = require('fs');
const path = require('path');
const config = require('../config');
const FrontmatterService = require('./FrontmatterService');
const AuditService = require('./AuditService');
const WorkspaceService = require('./WorkspaceService');

class ApprovalService {
  /**
   * Submits a formal manager decision (approve, revision_requested, reject) for a project.
   * @param {Object} param0 
   */
  static processDecision({
    projectId,
    decision, // 'approved' | 'revision_requested' | 'rejected'
    reviewer,
    role = 'Manager',
    comment = '',
    deliverableId = null
  }) {
    const project = WorkspaceService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const { frontmatter, body, versionHash } = FrontmatterService.readProjectReadme(project.fullPath);

    let newStatus = 'review';
    let newRevision = frontmatter.revision || 0;

    if (decision === 'approved') {
      newStatus = 'approved';
    } else if (decision === 'revision_requested') {
      newStatus = 'revision';
      newRevision += 1;
    } else if (decision === 'rejected') {
      newStatus = 'on-hold';
    }

    const approvals = Array.isArray(frontmatter.approvals) ? [...frontmatter.approvals] : [];
    const approvalRecord = {
      id: `appr_${Date.now()}`,
      round: newRevision,
      decision,
      reviewer,
      role,
      comment: comment.trim(),
      deliverableId,
      timestamp: new Date().toISOString()
    };
    approvals.unshift(approvalRecord);

    const updatedFm = {
      ...frontmatter,
      status: newStatus,
      revision: newRevision,
      ...(decision === 'approved' ? { completedAt: new Date().toISOString() } : {}),
      approvals
    };

    // Save atomically back to README.md
    FrontmatterService.writeProjectReadme(project.fullPath, updatedFm, body);

    // Audit log
    AuditService.logEvent({
      actor: reviewer,
      role,
      action: `PROJECT_${decision.toUpperCase()}`,
      entityType: 'Project',
      entityId: project.jobId || project.id,
      details: {
        projectId: project.id,
        round: newRevision,
        comment,
        status: newStatus
      }
    });

    // Notify team via _Team/team-notes.json so SS-CAM picks it up
    this.postTeamNotification(project, decision, reviewer, comment, newRevision);

    // Trigger workspace rescan
    WorkspaceService.scan();

    return {
      success: true,
      project: WorkspaceService.getProjectById(projectId),
      approvalRecord
    };
  }

  /**
   * Posts notification to shared _Team/team-notes.json for SS-CAM desktop clients.
   */
  static postTeamNotification(project, decision, reviewer, comment, revision) {
    try {
      if (process.env.NODE_ENV === 'test') return;
      if (!project || project.id === '9998A' || project.jobId === '9998A') return;
      const rootDir = WorkspaceService.workspaceRoot || config.WORKSPACE_ROOT;
      if (rootDir.includes('temp-') || (project.fullPath && project.fullPath.includes('temp-'))) return;

      const teamDir = path.join(rootDir, '_Team');
      if (!fs.existsSync(teamDir)) fs.mkdirSync(teamDir, { recursive: true });
      const notesPath = path.join(teamDir, 'team-notes.json');

      let notes = [];
      if (fs.existsSync(notesPath)) {
        try {
          notes = JSON.parse(fs.readFileSync(notesPath, 'utf8')) || [];
        } catch (e) {
          notes = [];
        }
      }

      const decisionTitle = decision === 'approved' 
        ? '✅ APPROVED' 
        : decision === 'revision_requested' 
          ? `⚠️ REVISION REQUIRED (Round ${revision})` 
          : '⛔ ON HOLD';

      const content = `${decisionTitle} - ${project.jobId} ${project.title}\nBy: ${reviewer}\nNote: ${comment || 'No comment provided.'}`;

      const newNote = {
        Id: `note_${Date.now()}`,
        Author: `${reviewer} (Web Portal)`,
        StaffId: 'MGMT',
        Content: content,
        Timestamp: new Date().toISOString(),
        Pinned: decision === 'revision_requested'
      };

      notes.unshift(newNote);
      if (notes.length > 200) notes = notes.slice(0, 200);

      fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2), 'utf8');
    } catch (err) {
      console.error('[ApprovalService] postTeamNotification error:', err.message);
    }
  }
}

module.exports = ApprovalService;
