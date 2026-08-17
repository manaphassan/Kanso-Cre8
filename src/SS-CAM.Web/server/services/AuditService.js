const fs = require('fs');
const path = require('path');
const config = require('../config');

class AuditService {
  static getAuditLogPath() {
    const teamDir = path.join(config.WORKSPACE_ROOT, '_Team');
    if (!fs.existsSync(teamDir)) {
      try {
        fs.mkdirSync(teamDir, { recursive: true });
      } catch (err) {
        console.error('[AuditService] Failed to create _Team folder:', err.message);
      }
    }
    return path.join(teamDir, 'audit-log.jsonl');
  }

  /**
   * Records an action to the append-only JSONL audit log.
   * @param {Object} entry { actor, role, action, entityType, entityId, details }
   */
  static logEvent({ actor = 'System', role = 'System', action, entityType, entityId, details = {} }) {
    try {
      const logPath = this.getAuditLogPath();
      const event = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        actor,
        role,
        action,
        entityType,
        entityId,
        details
      };

      const line = JSON.stringify(event) + '\n';
      fs.appendFileSync(logPath, line, 'utf8');
      return event;
    } catch (err) {
      console.error('[AuditService] logEvent failed:', err.message);
      return null;
    }
  }

  /**
   * Retrieves recent audit logs, optionally filtered.
   */
  static getLogs({ limit = 100, entityId = null, action = null } = {}) {
    const logPath = this.getAuditLogPath();
    if (!fs.existsSync(logPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      let events = lines.map(line => {
        try { return JSON.parse(line); } catch (e) { return null; }
      }).filter(Boolean);

      if (entityId) {
        events = events.filter(e => e.entityId === entityId);
      }
      if (action) {
        events = events.filter(e => e.action.toLowerCase().includes(action.toLowerCase()));
      }

      // Return newest first
      events.reverse();
      return events.slice(0, limit);
    } catch (err) {
      console.error('[AuditService] getLogs failed:', err.message);
      return [];
    }
  }
}

module.exports = AuditService;
