const fs = require('fs');
const path = require('path');
const config = require('../config');
const AuditService = require('./AuditService');
const WorkspaceService = require('./WorkspaceService');
const FrontmatterService = require('./FrontmatterService');

class CommentService {
  /**
   * Resolves the canonical review markdown path (_review.md) for a project.
   * Comments and approvals are stored together inside the project folder as _review.md.
   * Global _Team/comments/ is permanently retired.
   */
  static getReviewPath(projectPath, projectId) {
    if (projectPath) {
      if (!fs.existsSync(projectPath)) {
        try { fs.mkdirSync(projectPath, { recursive: true }); } catch (_) {}
      }
      return path.join(projectPath, '_review.md');
    }

    if (projectId) {
      try {
        const proj = WorkspaceService.getProjectById(projectId);
        if (proj && proj.fullPath) {
          return path.join(proj.fullPath, '_review.md');
        }
      } catch (_) {}
    }

    const wsRoot = WorkspaceService.workspaceRoot || config.WORKSPACE_ROOT;
    const fallbackDir = path.join(wsRoot, '_Projects');
    if (!fs.existsSync(fallbackDir)) {
      try { fs.mkdirSync(fallbackDir, { recursive: true }); } catch (_) {}
    }
    return path.join(fallbackDir, `${projectId || 'project'}_review.md`);
  }

  /**
   * Backward-compatible alias for getReviewPath.
   */
  static getCommentsPath(projectPath, projectId) {
    return this.getReviewPath(projectPath, projectId);
  }

  /**
   * Reads the _review.md file, migrating legacy jsonl files if found.
   */
  static readReview(projectPath, projectId) {
    const reviewPath = this.getReviewPath(projectPath, projectId);

    if (fs.existsSync(reviewPath)) {
      try {
        const raw = fs.readFileSync(reviewPath, 'utf8');
        const { frontmatter, body } = FrontmatterService.parseRawContent(raw);
        const comments = Array.isArray(frontmatter.comments) ? frontmatter.comments : [];
        const approvals = Array.isArray(frontmatter.approvals) ? frontmatter.approvals : [];
        return {
          path: reviewPath,
          frontmatter,
          body,
          comments,
          approvals
        };
      } catch (err) {
        console.error(`[CommentService] Failed to read _review.md from ${reviewPath}:`, err.message);
      }
    }

    // Check for legacy _comments.jsonl in project folder to transparently migrate
    let migratedComments = [];
    if (projectPath) {
      const legacyJsonl = path.join(projectPath, '_comments.jsonl');
      if (fs.existsSync(legacyJsonl)) {
        try {
          const content = fs.readFileSync(legacyJsonl, 'utf8');
          migratedComments = content.split('\n')
            .map(l => l.trim())
            .filter(Boolean)
            .map(l => {
              try { return JSON.parse(l); } catch (_) { return null; }
            })
            .filter(Boolean);
          try { fs.unlinkSync(legacyJsonl); } catch (_) {}
        } catch (_) {}
      }
    }

    const initialFm = {
      project_id: projectId || path.basename(projectPath || ''),
      comments: migratedComments,
      approvals: []
    };

    if (migratedComments.length > 0) {
      this.writeReview(reviewPath, initialFm, null);
    }

    return {
      path: reviewPath,
      frontmatter: initialFm,
      body: '',
      comments: migratedComments,
      approvals: []
    };
  }

  /**
   * Writes frontmatter and human-readable body to _review.md atomically.
   */
  static writeReview(reviewPath, frontmatter, body = null) {
    const comments = Array.isArray(frontmatter.comments) ? frontmatter.comments : [];
    const approvals = Array.isArray(frontmatter.approvals) ? frontmatter.approvals : [];

    let finalBody = body;
    if (!finalBody || !finalBody.trim()) {
      let md = `# Project Review & Approvals\n\n`;

      md += `## Approvals History\n`;
      if (approvals.length === 0) {
        md += `_No formal approvals recorded yet._\n\n`;
      } else {
        for (const appr of approvals) {
          const dateStr = (appr.timestamp || '').split('T')[0] || 'Pending';
          const decision = (appr.decision || 'approved').toUpperCase();
          md += `- **Round ${appr.round || 1} [${decision}]** by ${appr.reviewer || 'Reviewer'} (${appr.role || 'Manager'}) on ${dateStr}: *${appr.comment || 'No comment provided.'}*\n`;
        }
        md += `\n`;
      }

      md += `## Comments Thread\n`;
      if (comments.length === 0) {
        md += `_No review comments posted yet._\n`;
      } else {
        for (const c of comments) {
          const dateStr = (c.timestamp || '').split('T')[0] || '';
          const status = c.resolved ? ' *(Resolved)*' : '';
          md += `- **${c.author || 'User'}** (${dateStr})${status}: ${c.content}\n`;
        }
      }
      finalBody = md;
    }

    const content = FrontmatterService.serializeContent(frontmatter, finalBody);
    const tempFile = `${reviewPath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const dir = path.dirname(reviewPath);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    }

    fs.writeFileSync(tempFile, content, 'utf8');
    try {
      fs.renameSync(tempFile, reviewPath);
    } catch (_) {
      fs.writeFileSync(reviewPath, content, 'utf8');
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }

  /**
   * Retrieves all comments for a project from _review.md.
   */
  static getComments(projectPath, projectId) {
    const review = this.readReview(projectPath, projectId);
    return [...review.comments].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Appends a new comment to the project's _review.md.
   */
  static addComment(projectPath, projectId, {
    author = 'Designer',
    authorRole = 'User',
    authorAvatar = '#043388',
    content = '',
    deliverableId = null,
    annotation = null,
    mentions = []
  }) {
    if (!content.trim()) {
      throw new Error('Comment content cannot be empty');
    }

    // Extract @mentions from content if not explicitly provided
    const extractedMentions = (content.match(/@([a-zA-Z0-9_-]+)/g) || [])
      .map(m => m.substring(1).toLowerCase());
    const allMentions = Array.from(new Set([...mentions, ...extractedMentions]));

    const comment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      deliverableId: deliverableId || null,
      annotation: annotation || null,
      author,
      authorRole,
      authorAvatar,
      content: content.trim(),
      mentions: allMentions,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    const review = this.readReview(projectPath, projectId);
    const updatedComments = [...review.comments, comment];
    const updatedFm = {
      ...review.frontmatter,
      project_id: projectId || review.frontmatter.project_id,
      comments: updatedComments
    };

    try {
      this.writeReview(review.path, updatedFm, null);

      // Record in Audit Trail
      AuditService.logEvent({
        actor: author,
        role: authorRole,
        action: 'COMMENT_POSTED',
        entityType: 'Project',
        entityId: projectId,
        details: {
          commentId: comment.id,
          deliverableId: comment.deliverableId,
          mentions: allMentions,
          snippet: content.length > 60 ? content.substring(0, 60) + '...' : content
        }
      });

      return comment;
    } catch (err) {
      console.error(`[CommentService] Failed to save comment to ${review.path}:`, err.message);
      throw new Error(`Failed to save comment to _review.md: ${err.message}`);
    }
  }

  /**
   * Toggles resolved status of a comment in _review.md.
   */
  static resolveComment(projectPath, projectId, commentId, resolved = true, actor = 'System', role = 'User') {
    const review = this.readReview(projectPath, projectId);
    let found = false;

    const updatedComments = review.comments.map(item => {
      if (item.id === commentId) {
        found = true;
        return {
          ...item,
          resolved,
          resolvedBy: resolved ? actor : null,
          resolvedAt: resolved ? new Date().toISOString() : null
        };
      }
      return item;
    });

    if (!found) {
      throw new Error(`Comment with ID ${commentId} not found`);
    }

    const updatedFm = {
      ...review.frontmatter,
      comments: updatedComments
    };

    try {
      this.writeReview(review.path, updatedFm, null);

      AuditService.logEvent({
        actor,
        role,
        action: resolved ? 'COMMENT_RESOLVED' : 'COMMENT_REOPENED',
        entityType: 'Project',
        entityId: projectId,
        details: { commentId }
      });

      return { success: true, commentId, resolved };
    } catch (err) {
      console.error(`[CommentService] Failed to resolve comment ${commentId}:`, err.message);
      throw err;
    }
  }

  /**
   * Deletes a comment from _review.md.
   */
  static deleteComment(projectPath, projectId, commentId, actor = 'System', role = 'User') {
    const review = this.readReview(projectPath, projectId);
    let found = false;

    for (const item of review.comments) {
      if (item.id === commentId) {
        if (role !== 'Admin' && item.author !== actor) {
          throw new Error('Unauthorized to delete this comment');
        }
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`Comment with ID ${commentId} not found`);
    }

    const filteredComments = review.comments.filter(item => item.id !== commentId);
    const updatedFm = {
      ...review.frontmatter,
      comments: filteredComments
    };

    try {
      this.writeReview(review.path, updatedFm, null);

      AuditService.logEvent({
        actor,
        role,
        action: 'COMMENT_DELETED',
        entityType: 'Project',
        entityId: projectId,
        details: { commentId }
      });

      return { success: true, commentId };
    } catch (err) {
      console.error(`[CommentService] Failed to delete comment ${commentId}:`, err.message);
      throw err;
    }
  }

  /**
   * Retrieves all approvals for a project from _review.md.
   */
  static getApprovals(projectPath, projectId) {
    const review = this.readReview(projectPath, projectId);
    return review.approvals || [];
  }

  /**
   * Appends an approval record to _review.md.
   */
  static addApproval(projectPath, projectId, approvalRecord) {
    const review = this.readReview(projectPath, projectId);
    const updatedApprovals = [approvalRecord, ...(review.approvals || [])];
    const updatedFm = {
      ...review.frontmatter,
      project_id: projectId || review.frontmatter.project_id,
      approvals: updatedApprovals
    };

    this.writeReview(review.path, updatedFm, null);
    return approvalRecord;
  }

  /**
   * Aggregates recent activity & notifications across the workspace.
   */
  static getNotifications(username = '', limit = 25) {
    try {
      const auditLogs = AuditService.getLogs({ limit: 100 });
      const notifications = [];

      for (const log of auditLogs) {
        const action = (log.action || '').toUpperCase();
        let isRelevant = false;
        let type = 'info';
        let title = '';
        let message = '';
        let route = 'projects';
        let routeId = log.entityId;

        if (action.includes('COMMENT')) {
          if (log.entityId && !WorkspaceService.getProjectById(log.entityId)) {
            continue;
          }
          const mentions = (log.details && log.details.mentions) || [];
          const userLower = (username || '').toLowerCase();
          const isMentioned = mentions.some(m => m.toLowerCase() === userLower);
          
          type = isMentioned ? 'mention' : 'comment';
          title = isMentioned ? `Mentioned by ${log.actor}` : `Comment by ${log.actor}`;
          message = log.details?.snippet || `New comment on project ${log.entityId}`;
          route = 'project-detail';
          isRelevant = true;
        } else if (action.includes('REVISION')) {
          if (log.entityId && !WorkspaceService.getProjectById(log.entityId)) {
            continue;
          }
          type = 'revision';
          title = `Revision Requested on ${log.entityId}`;
          message = log.details?.feedback || log.details?.reason || `${log.actor} requested revisions.`;
          route = 'project-detail';
          isRelevant = true;
        } else if (action.includes('APPROV')) {
          if (log.entityId && !WorkspaceService.getProjectById(log.entityId)) {
            continue;
          }
          type = 'approval';
          title = `Project Approved: ${log.entityId}`;
          message = `${log.actor} signed off and approved deliverables.`;
          route = 'project-detail';
          isRelevant = true;
        } else if (action.includes('CREATE') || action.includes('PROVISION')) {
          type = 'system';
          title = `${log.action.replace('_', ' ')}`;
          message = `${log.actor} updated ${log.entityType} ${log.entityId}`;
          route = 'admin';
          isRelevant = true;
        }

        if (isRelevant) {
          notifications.push({
            id: `notif_${log.id}`,
            type,
            title,
            message,
            timestamp: log.timestamp,
            actor: log.actor,
            role: log.role,
            route,
            routeId,
            unread: true
          });
        }

        if (notifications.length >= limit) break;
      }

      return notifications;
    } catch (err) {
      console.error('[CommentService] getNotifications error:', err.message);
      return [];
    }
  }
}

module.exports = CommentService;
