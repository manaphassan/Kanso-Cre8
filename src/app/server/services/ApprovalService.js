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

    // If approved, stamp formal APPROVAL.md certificate in 05_DELIVERABLES/
    if (decision === 'approved') {
      this.stampApprovalCertificate(project, approvalRecord, updatedFm);
    }

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
        Author: `${reviewer} (Desktop Review)`,
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

  /**
   * Generates and stamps a formal APPROVAL.md certificate in 05_DELIVERABLES/
   * containing SHA256 checksums, approver metadata, and studio signature seal.
   */
  static stampApprovalCertificate(project, approvalRecord, frontmatter) {
    try {
      const crypto = require('crypto');
      const yaml = require('js-yaml');
      let studioProfile = {};
      try {
        const TeamService = require('./TeamService');
        studioProfile = TeamService.getStudioProfile() || {};
      } catch (e) {}

      // Locate deliverables folder
      const delivDirs = ['05_DELIVERABLES', '05_Deliverables', '04_Production', 'Production', '04_Final_Exports'];
      let targetDir = null;
      for (const dir of delivDirs) {
        const p = path.join(project.fullPath, dir);
        if (fs.existsSync(p)) {
          targetDir = p;
          break;
        }
      }

      if (!targetDir) {
        targetDir = path.join(project.fullPath, '05_DELIVERABLES');
        try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
      }

      // Read files in deliverables folder and compute SHA256 hashes
      const filesInfo = [];
      try {
        const entries = fs.readdirSync(targetDir, { withFileTypes: true });
        for (const ent of entries) {
          if (ent.isFile() && ent.name !== 'APPROVAL.md' && !ent.name.startsWith('.')) {
            const filePath = path.join(targetDir, ent.name);
            const stat = fs.statSync(filePath);
            const fileBuf = fs.readFileSync(filePath);
            const hash = crypto.createHash('sha256').update(fileBuf).digest('hex');
            const ext = path.extname(ent.name).replace('.', '').toUpperCase();
            filesInfo.push({
              name: ent.name,
              format: ext || 'FILE',
              sizeBytes: stat.size,
              sizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
              sha256: hash
            });
          }
        }
      } catch (e) {}

      const timestamp = approvalRecord.timestamp || new Date().toISOString();
      const dateOnly = timestamp.split('T')[0];
      const certId = `CERT-${project.jobId || project.id}-${Date.now().toString(36).toUpperCase()}`;

      const certificateFm = {
        type: 'deliverable_approval',
        certificateId: certId,
        projectId: project.jobId || project.id,
        projectTitle: project.title || frontmatter.title || 'Creative Project',
        clientCode: project.brand || frontmatter.brand || 'ACME',
        decision: 'approved',
        reviewer: approvalRecord.reviewer || 'Client Stakeholder',
        role: approvalRecord.role || 'Manager',
        round: approvalRecord.round || frontmatter.revision || 1,
        timestamp,
        signature: studioProfile.digitalSignature || studioProfile.principalName || 'Authorized Studio Principal',
        studioName: studioProfile.studioName || 'HaNa Innovation',
        registrationNo: studioProfile.businessRegNo || 'LLP-9921',
        files: filesInfo.map(f => ({
          filename: f.name,
          format: f.format,
          sizeBytes: f.sizeBytes,
          sha256: f.sha256
        }))
      };

      let tableRows = '';
      if (filesInfo.length > 0) {
        tableRows = filesInfo.map(f => `| \`${f.name}\` | ${f.format} | ${f.sizeFormatted} | \`${f.sha256}\` |`).join('\n');
      } else {
        tableRows = '| *No binary files indexed* | -- | -- | -- |';
      }

      const certMarkdown = `---
${yaml.dump(certificateFm).trim()}
---

# ✍️ Official Deliverable Approval & Handover Certificate

**Certificate ID**: \`${certId}\`  
**Project**: ${project.jobId || project.id} — ${project.title || frontmatter.title || 'Creative Project'}  
**Client Dossier**: [${project.brand || frontmatter.brand || 'ACME'}]  
**Formally Approved By**: ${approvalRecord.reviewer || 'Client Stakeholder'} (${approvalRecord.role || 'Manager'})  
**Approval Timestamp**: ${timestamp} (${dateOnly})  
**Revision Round**: Round ${approvalRecord.round || frontmatter.revision || 1}  
**Status**: 🟢 **APPROVED & CERTIFIED FOR PRODUCTION**

---

## 📦 Verified Deliverables & Cryptographic Signatures (SHA-256)

Every deliverable asset below was cryptographically hashed at the moment of approval to guarantee bit-for-bit authenticity, tamper-proofing, and intellectual property provenance:

| File Name | Format | File Size | Cryptographic Checksum (SHA-256) |
| :--- | :--- | :--- | :--- |
${tableRows}

---

## 🏛️ Digital Colophon & Atelier Authorization

**Studio**: ${studioProfile.studioName || 'HaNa Innovation'}  
**Business Registration No**: \`${studioProfile.businessRegNo || '202601004829 (LLP-9921)'}\`  
**Principal Art Director**: ${studioProfile.principalName || 'Harussani'}  
**Digital Signature Colophon**: *${studioProfile.digitalSignature || studioProfile.principalName || 'Harussani / HaNa Innovation'}*  
**Billing & Legal Inquiries**: ${studioProfile.billingEmail || 'harussani@hana-innovation.com'}  

> **Authenticity Notice**: This certificate was signed offline-first in **Kanso Cre8 (簡素)**. All files live as human-readable UTF-8 Markdown and local filesystem binaries under local control.
`;

      const approvalFilePath = path.join(targetDir, 'APPROVAL.md');
      fs.writeFileSync(approvalFilePath, certMarkdown, 'utf8');
      return approvalFilePath;
    } catch (err) {
      console.error('[ApprovalService] Error stamping APPROVAL.md:', err.message);
      return null;
    }
  }
}

module.exports = ApprovalService;
