const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const WorkspaceService = require('./WorkspaceService');
const DeliverableService = require('./DeliverableService');

class ShareService {
  constructor() {
    this.memoryTokens = new Map();
  }

  getTokensFilePath() {
    const root = WorkspaceService.workspaceRoot || config.WORKSPACE_ROOT;
    const teamDir = path.join(root, '_Team');
    if (!fs.existsSync(teamDir)) {
      try { fs.mkdirSync(teamDir, { recursive: true }); } catch (e) {}
    }
    return path.join(teamDir, 'share-tokens.json');
  }

  loadTokens() {
    const filePath = this.getTokensFilePath();
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.memoryTokens.clear();
          for (const item of parsed) {
            this.memoryTokens.set(item.token, item);
          }
        }
      } catch (err) {
        console.warn('[ShareService] Could not read share-tokens.json:', err.message);
      }
    }
    return Array.from(this.memoryTokens.values());
  }

  saveTokens() {
    const filePath = this.getTokensFilePath();
    const list = Array.from(this.memoryTokens.values());
    try {
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.warn('[ShareService] Could not save share-tokens.json:', err.message);
    }
  }

  createShareToken({
    projectId,
    deliverableId = null,
    createdBy = 'Designer',
    expiresInDays = 14,
    permissions = 'review_approve', // 'view_only' | 'review_approve'
    note = ''
  }) {
    this.loadTokens();
    const project = WorkspaceService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found.`);
    }

    const token = crypto.randomBytes(24).toString('base64url');
    const createdAt = new Date();
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date(createdAt.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const tokenRecord = {
      token,
      projectId: project.id,
      jobId: project.jobId || project.id,
      projectTitle: project.title,
      brand: project.brand || 'SS',
      deliverableId,
      createdBy,
      permissions,
      note,
      createdAt: createdAt.toISOString(),
      expiresAt,
      active: true,
      accessCount: 0,
      lastAccessedAt: null
    };

    this.memoryTokens.set(token, tokenRecord);
    this.saveTokens();

    return tokenRecord;
  }

  validateToken(token) {
    if (!token) return null;
    this.loadTokens();
    const record = this.memoryTokens.get(token);
    if (!record || !record.active) {
      return null;
    }

    if (record.expiresAt) {
      const expiry = new Date(record.expiresAt);
      if (new Date() > expiry) {
        record.active = false;
        this.saveTokens();
        return null;
      }
    }

    // Update access stats
    record.accessCount = (record.accessCount || 0) + 1;
    record.lastAccessedAt = new Date().toISOString();
    this.saveTokens();

    // Retrieve scoped project and deliverables
    const project = WorkspaceService.getProjectById(record.projectId);
    if (!project) return null;

    let deliverables = DeliverableService.getProjectDeliverables(project.fullPath);
    if (record.deliverableId) {
      deliverables = deliverables.filter(d => d.id === record.deliverableId || d.filename === record.deliverableId);
    }

    return {
      shareInfo: {
        token: record.token,
        permissions: record.permissions,
        expiresAt: record.expiresAt,
        createdBy: record.createdBy,
        note: record.note
      },
      project: {
        id: project.id,
        jobId: project.jobId || project.id,
        title: project.title,
        brand: project.brand,
        designer: project.designer,
        status: project.status,
        deadline: project.deadline,
        revision: project.revision || 1,
        creative_direction: project.creative_direction || {},
        copywriting: project.copywriting || {}
      },
      deliverables
    };
  }

  getProjectShareLinks(projectId) {
    this.loadTokens();
    return Array.from(this.memoryTokens.values())
      .filter(t => t.projectId === projectId && t.active)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  revokeToken(token) {
    this.loadTokens();
    const record = this.memoryTokens.get(token);
    if (record) {
      record.active = false;
      this.saveTokens();
      return true;
    }
    return false;
  }
}

module.exports = new ShareService();
