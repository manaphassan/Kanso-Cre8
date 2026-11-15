/**
 * Review decisions on a project: approve, request revision, reject.
 * Port of server/services/ApprovalService.js (processDecision and
 * stampApprovalCertificate). The decision is written to README.md frontmatter
 * and to `<project>/_review.md`; an approval also stamps
 * `05_DELIVERABLES/APPROVAL.md` with SHA-256 checksums of the delivered files.
 * The `_Team/team-notes.json` notification and the audit log are dropped
 * (retired files, D2).
 */

import type { VaultFs } from '$lib/vault/types';
import { baseName } from '$lib/vault/paths';
import { getStudioProfile } from './config';
import { serializeFrontmatter } from './frontmatter';
import { readReadme, writeReadme, type Project } from './projects';
import { addApproval } from './review';

export type Decision = 'approved' | 'revision_requested' | 'rejected';

const DECISION_ALIASES: Record<string, Decision> = {
  approve: 'approved',
  approved: 'approved',
  request_revision: 'revision_requested',
  revision_requested: 'revision_requested',
  revision: 'revision_requested',
  changes_requested: 'revision_requested',
  reject: 'rejected',
  rejected: 'rejected'
};

/** Accepts the client's verbs (`approve`, `request_revision`) and the server's (`approved`, ...). */
export function normalizeDecision(value: unknown): Decision | null {
  return DECISION_ALIASES[String(value ?? '').trim().toLowerCase()] ?? null;
}

export interface ApprovalRecord {
  id: string;
  round: number;
  decision: Decision;
  reviewer: string;
  role: string;
  comment: string;
  deliverableId: string | null;
  timestamp: string;
}

export interface DecisionInput {
  decision: Decision;
  reviewer: string;
  role?: string;
  comment?: string;
  deliverableId?: string | null;
}

export type ProjectRef = Pick<Project, 'id' | 'jobId' | 'title' | 'brand' | 'fullPath'>;

export interface DecisionResult {
  success: true;
  approvalRecord: ApprovalRecord;
  status: string;
  revision: number;
  /** Vault-relative path of APPROVAL.md when the decision was an approval. */
  certificatePath: string | null;
}

const STATUS_FOR: Record<Decision, string> = { approved: 'approved', revision_requested: 'revision', rejected: 'on-hold' };

export async function submitDecision(fs: VaultFs, project: ProjectRef, input: DecisionInput, now: Date): Promise<DecisionResult> {
  const { frontmatter } = await readReadme(fs, project.fullPath);
  const status = STATUS_FOR[input.decision];
  const revision = (Number(frontmatter.revision) || 0) + (input.decision === 'revision_requested' ? 1 : 0);
  const timestamp = now.toISOString();

  const approvalRecord: ApprovalRecord = {
    id: `appr_${now.getTime()}`,
    round: revision,
    decision: input.decision,
    reviewer: input.reviewer,
    role: input.role || 'Manager',
    comment: String(input.comment || '').trim(),
    deliverableId: input.deliverableId || null,
    timestamp
  };
  const approvals = Array.isArray(frontmatter.approvals) ? [approvalRecord, ...frontmatter.approvals] : [approvalRecord];

  // Body null: writeReadme keeps the stored body (readReadme would substitute the default brief).
  await writeReadme(fs, project.fullPath, {
    status,
    revision,
    ...(input.decision === 'approved' ? { completedAt: timestamp } : {}),
    approvals
  });

  try {
    await addApproval(fs, project.fullPath, project.jobId || project.id, approvalRecord);
  } catch (err: any) {
    console.warn('[approvals] Failed to record approval in _review.md:', err?.message);
  }

  let certificatePath: string | null = null;
  if (input.decision === 'approved') {
    certificatePath = await stampApprovalCertificate(fs, project, approvalRecord, { ...frontmatter, revision }, now);
  }
  return { success: true, approvalRecord, status, revision, certificatePath };
}

const DELIVERABLE_DIRS = ['05_DELIVERABLES', '05_Deliverables', '04_Production', 'Production', '04_Final_Exports'];

interface CertFile {
  name: string;
  format: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256: string;
}

/** Writes APPROVAL.md into the deliverables folder. Returns its path, or null on failure (as the server). */
export async function stampApprovalCertificate(
  fs: VaultFs,
  project: ProjectRef,
  record: ApprovalRecord,
  frontmatter: Record<string, any>,
  now: Date
): Promise<string | null> {
  try {
    const studio = await getStudioProfile(fs).catch(() => ({}) as Record<string, any>);
    const children = await fs.listDir(project.fullPath);
    const dirNames = new Set(children.filter((c) => c.isDir).map((c) => baseName(c.path)));
    const targetDir = `${project.fullPath}/${DELIVERABLE_DIRS.find((d) => dirNames.has(d)) ?? '05_DELIVERABLES'}`;
    await fs.ensureDirs([targetDir]);

    const files: CertFile[] = [];
    for (const entry of await fs.listDir(targetDir)) {
      const name = baseName(entry.path);
      if (entry.isDir || name === 'APPROVAL.md' || name.startsWith('.')) continue;
      const dot = name.lastIndexOf('.');
      files.push({
        name,
        format: (dot > 0 ? name.slice(dot + 1) : '').toUpperCase() || 'FILE',
        sizeBytes: entry.size,
        sizeFormatted: `${(entry.size / (1024 * 1024)).toFixed(2)} MB`,
        sha256: await fs.sha256(entry.path)
      });
    }

    const timestamp = record.timestamp || now.toISOString();
    const dateOnly = timestamp.split('T')[0];
    const jobId = project.jobId || project.id;
    const certId = `CERT-${jobId}-${now.getTime().toString(36).toUpperCase()}`;
    const projectTitle = project.title || frontmatter.title || 'Creative Project';
    const clientCode = project.brand || frontmatter.brand || 'ACME';
    const reviewer = record.reviewer || 'Client Stakeholder';
    const role = record.role || 'Manager';
    const round = record.round || frontmatter.revision || 1;
    const studioName = studio.studioName || 'Acme Design Studio';
    const registrationNo = studio.registration_no || '2026-ACME-0001';
    const principal = studio.freelancerName || 'Alex Mercer';
    const signature = studio.signature_text || principal || 'Authorized Studio Principal';

    const certFrontmatter = {
      type: 'deliverable_approval',
      certificateId: certId,
      projectId: jobId,
      projectTitle,
      clientCode,
      decision: 'approved',
      reviewer,
      role,
      round,
      timestamp,
      signature,
      studioName,
      registrationNo,
      files: files.map((f) => ({ filename: f.name, format: f.format, sizeBytes: f.sizeBytes, sha256: f.sha256 }))
    };

    const rows = files.length
      ? files.map((f) => `| \`${f.name}\` | ${f.format} | ${f.sizeFormatted} | \`${f.sha256}\` |`).join('\n')
      : '| *No binary files indexed* | -- | -- | -- |';

    const body = `# Official Deliverable Approval & Handover Certificate

**Certificate ID**: \`${certId}\`  
**Project**: ${jobId} - ${projectTitle}  
**Client Dossier**: [${clientCode}]  
**Formally Approved By**: ${reviewer} (${role})  
**Approval Timestamp**: ${timestamp} (${dateOnly})  
**Revision Round**: Round ${round}  
**Status**: **APPROVED & CERTIFIED FOR PRODUCTION**

---

## Verified Deliverables & Cryptographic Signatures (SHA-256)

Every deliverable asset below was cryptographically hashed at the moment of approval to guarantee bit-for-bit authenticity, tamper-proofing, and intellectual property provenance:

| File Name | Format | File Size | Cryptographic Checksum (SHA-256) |
| :--- | :--- | :--- | :--- |
${rows}

---

## Digital Colophon & Atelier Authorization

**Studio**: ${studioName}  
**Business Registration No**: \`${registrationNo}\`  
**Principal Art Director**: ${principal}  
**Digital Signature Colophon**: *${signature}*  
**Billing & Legal Inquiries**: ${studio.email || 'billing@example.com'}  

> **Authenticity Notice**: This certificate was signed offline-first in **Kanso Cre8**. All files live as human-readable UTF-8 Markdown and local filesystem binaries under local control.
`;

    const path = `${targetDir}/APPROVAL.md`;
    await fs.writeText(path, serializeFrontmatter(certFrontmatter, body));
    return path;
  } catch (err: any) {
    console.error('[approvals] Error stamping APPROVAL.md:', err?.message);
    return null;
  }
}
