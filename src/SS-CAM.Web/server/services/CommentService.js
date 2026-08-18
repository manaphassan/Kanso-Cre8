const fs = require('fs');
const path = require('path');
const config = require('../config');
const AuditService = require('./AuditService');
const TeamService = require('./TeamService');

class CommentService {
  /**
   * Resolves the comments file path for a project.
   * Priority: <projectDir>/_comments.jsonl -> fallback: _Team/comments/<projectId>.jsonl
   */
  static getCommentsPath(projectPath, projectId) {
    if (projectPath && fs.existsSync(projectPath)) {
      return path.join(projectPath, '_comments.jsonl');
    }
    const teamCommentsDir = path.join(config.WORKSPACE_ROOT, '_Team', 'comments');
    if (!fs.existsSync(teamCommentsDir)) {
      try {
        fs.mkdirSync(teamCommentsDir, { recursive: true });
      } catch (err) {
        console.warn('[CommentService] Failed to create team comments directory:', err.message);
      }
    }
    return path.join(teamCommentsDir, `${projectId}.jsonl`);
  }

  /**
   * Retrieves all comments for a project.
   */
  static getComments(projectPath, projectId) {
    const filePath = this.getCommentsPath(projectPath, projectId);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (err) {
      console.error(`[CommentService] Failed to read comments from ${filePath}:`, err.message);
      return [];
    }
  }

  /**
   * Appends a new comment to the project's comment thread.
   */
  static addComment(projectPath, projectId, {
    author = 'Designer',
    authorRole = 'User',
    authorAvatar = '#043388',
    content = '',
    deliverableId = null,
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
      author,
      authorRole,
      authorAvatar,
      content: content.trim(),
      mentions: allMentions,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    const filePath = this.getCommentsPath(projectPath, projectId);
    try {
      const line = JSON.stringify(comment) + '\n';
      fs.appendFileSync(filePath, line, 'utf8');

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
      console.error(`[CommentService] Failed to save comment to ${filePath}:`, err.message);
      throw new Error(`Failed to save comment to NAS: ${err.message}`);
    }
  }

  /**
   * Toggles resolved status of a comment.
   */
  static resolveComment(projectPath, projectId, commentId, resolved = true, actor = 'System', role = 'User') {
    const filePath = this.getCommentsPath(projectPath, projectId);
    if (!fs.existsSync(filePath)) {
      throw new Error('No comments found for this project');
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      let found = false;
      const updatedLines = lines.map(line => {
        try {
          const item = JSON.parse(line);
          if (item.id === commentId) {
            item.resolved = resolved;
            item.resolvedBy = resolved ? actor : null;
            item.resolvedAt = resolved ? new Date().toISOString() : null;
            found = true;
          }
          return JSON.stringify(item);
        } catch (e) {
          return line;
        }
      });

      if (!found) {
        throw new Error(`Comment with ID ${commentId} not found`);
      }

      fs.writeFileSync(filePath, updatedLines.join('\n') + '\n', 'utf8');

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
   * Deletes a comment.
   */
  static deleteComment(projectPath, projectId, commentId, actor = 'System', role = 'User') {
    const filePath = this.getCommentsPath(projectPath, projectId);
    if (!fs.existsSync(filePath)) {
      throw new Error('No comments found for this project');
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      let deleted = false;
      const filteredLines = lines.filter(line => {
        try {
          const item = JSON.parse(line);
          if (item.id === commentId) {
            // Verify permission: Author or Admin
            if (role !== 'Admin' && item.author !== actor) {
              throw new Error('Unauthorized to delete this comment');
            }
            deleted = true;
            return false;
          }
          return true;
        } catch (e) {
          return true;
        }
      });

      if (!deleted) {
        throw new Error(`Comment with ID ${commentId} not found`);
      }

      fs.writeFileSync(filePath, filteredLines.join('\n') + (filteredLines.length > 0 ? '\n' : ''), 'utf8');

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
          const mentions = (log.details && log.details.mentions) || [];
          const userLower = (username || '').toLowerCase();
          const isMentioned = mentions.some(m => m.toLowerCase() === userLower);
          
          type = isMentioned ? 'mention' : 'comment';
          title = isMentioned ? `Mentioned by ${log.actor}` : `Comment by ${log.actor}`;
          message = log.details?.snippet || `New comment on project ${log.entityId}`;
          route = 'project-detail';
          isRelevant = true;
        } else if (action.includes('REVISION')) {
          type = 'revision';
          title = `Revision Requested on ${log.entityId}`;
          message = log.details?.feedback || log.details?.reason || `${log.actor} requested revisions.`;
          route = 'project-detail';
          isRelevant = true;
        } else if (action.includes('APPROV')) {
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
