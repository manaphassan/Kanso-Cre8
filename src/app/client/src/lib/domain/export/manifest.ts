/**
 * Handover document model and DELIVERY.md. Port of
 * ExportService.generateDeliveryMarkdown plus the studio and client field
 * resolution shared with the HTML summary. Template text is ASCII; values from
 * the vault (names, payment terms) pass through unchanged.
 */

import { formatSwiftOrQr } from '$lib/domain/config';

export interface HandoverAsset {
  /** ZIP entry name: the path inside the project folder. */
  relPath: string;
  filename: string;
  format: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256: string;
}

export interface StudioIdentity {
  studioName: string;
  principalName: string;
  registrationNo: string;
  billingEmail: string;
  bankName: string;
  accountNo: string;
  accountHolder: string;
  swiftOrDuitNow: string;
  paymentTerms: string;
  signed: boolean;
}

/** The client fields a handover uses (a `Client` from domain/clients fits). */
export interface HandoverClient {
  code: string;
  name: string;
}

/** Fallbacks when the README has no job id or client (the server used 0000 / ACME). */
export interface HandoverProjectInfo {
  folderName: string;
  jobId?: string;
  brand?: string;
}

export interface HandoverDoc {
  title: string;
  folderName: string;
  jobId: string;
  clientCode: string;
  clientName: string;
  designer: string;
  revision: number | string;
  assets: HandoverAsset[];
  totalBytes: number;
  totalSizeFormatted: string;
  studio: StudioIdentity;
  /** ISO timestamp. */
  generatedAt: string;
  /** YYYY-MM-DD (UTC). */
  date: string;
}

/** Same output as the server's ExportService.formatBytes (two decimals). */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${parseFloat((bytes / 1024 ** i).toFixed(2))} ${sizes[i]}`;
}

const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

/**
 * Studio fields from the studio profile view (getStudioProfile), the older
 * `remittance` block, or the server-era names, with the server's defaults.
 */
export function studioIdentity(studio: Record<string, any> | null | undefined): StudioIdentity {
  const s = studio ?? {};
  const r = s.remittance ?? {};
  const studioName = str(s.name || s.studioName) || 'Acme Design Studio';
  return {
    studioName,
    principalName: str(s.freelancer_name || s.freelancerName || s.principalName) || 'Alex Mercer',
    registrationNo: str(s.registration_no || s.businessRegNo) || '2026-ACME-0001',
    billingEmail: str(s.email || s.billingEmail) || 'billing@example.com',
    bankName: str(r.bank_name || s.bankName || s.paymentBank) || 'Acme Federal Bank',
    accountNo: str(r.account_no || s.accountNumber || s.paymentAccountNo) || '0000-0000-0000',
    accountHolder: str(r.account_holder || s.accountHolder || s.paymentAccountName) || studioName,
    swiftOrDuitNow: str(r.duitnow_id || r.swift_code || s.paymentSwiftOrQr || formatSwiftOrQr(s)) || 'ACMEUS33',
    paymentTerms: str(s.defaultPaymentTerms) || 'Net 14 Days',
    signed: Boolean(s.digitalSignature || s.signature_text || s.signature_url)
  };
}

/** Client code a project hands over to: README `client`, then `brand`, then the folder brand. */
export function clientCodeFor(frontmatter: Record<string, any>, project: Pick<HandoverProjectInfo, 'brand'>): string {
  return str(frontmatter.client || frontmatter.brand || project.brand || 'ACME').trim().toUpperCase();
}

export function jobIdFor(frontmatter: Record<string, any>, project: Pick<HandoverProjectInfo, 'jobId'>): string {
  return str(frontmatter.job_id || frontmatter.jobId || project.jobId) || '0000';
}

export function buildHandoverDoc(
  project: HandoverProjectInfo,
  frontmatter: Record<string, any>,
  assets: HandoverAsset[],
  studio: Record<string, any> | null,
  client: HandoverClient | null,
  now: Date
): HandoverDoc {
  const identity = studioIdentity(studio);
  const clientCode = client?.code || clientCodeFor(frontmatter, project);
  const totalBytes = assets.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
  const generatedAt = now.toISOString();
  return {
    title: str(frontmatter.title) || project.folderName,
    folderName: project.folderName,
    jobId: jobIdFor(frontmatter, project),
    clientCode,
    clientName: client?.name || str(frontmatter.client_name || frontmatter.client) || 'Acme Corporation',
    designer: str(frontmatter.designer) || identity.principalName,
    revision: frontmatter.revision || 1,
    assets,
    totalBytes,
    totalSizeFormatted: formatBytes(totalBytes),
    studio: identity,
    generatedAt,
    date: generatedAt.slice(0, 10)
  };
}

/** A YAML double-quoted scalar (JSON strings are valid YAML). */
const yq = (v: string): string => JSON.stringify(v);
/** Text safe inside a GFM table cell. */
const cell = (v: string | number): string => String(v).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
/** Inline code inside a table cell (backticks would end the span). */
const code = (v: string): string => `\`${cell(v).replace(/`/g, "'")}\``;

export function generateDeliveryMarkdown(doc: HandoverDoc): string {
  const s = doc.studio;
  const rows = doc.assets
    .map((a) => `| ${code(a.relPath)} | **${cell(a.format)}** | ${cell(a.sizeFormatted)} | ${code(a.sha256)} |`)
    .join('\n');
  return `---
title: ${yq(`Creative Handover - ${doc.title}`)}
job_id: ${yq(doc.jobId)}
client: ${yq(doc.clientCode)}
client_name: ${yq(doc.clientName)}
delivered_date: ${yq(doc.date)}
total_assets: ${doc.assets.length}
total_size: ${yq(doc.totalSizeFormatted)}
designer: ${yq(doc.designer)}
status: "delivered"
---

# Creative Handover Package: ${doc.title}

> **Official Creative Deliverables Handover Manifest (DELIVERY.md)**  
> Generated by **Kanso Cre8** - The Mindful Creative Vault.  
> Timestamp: \`${doc.generatedAt}\`

---

## Project & Client Dossier

| Field | Value |
| :--- | :--- |
| **Job ID** | ${code(doc.jobId)} |
| **Project Title** | **${cell(doc.title)}** |
| **Client Entity** | **${cell(doc.clientName)}** (${code(doc.clientCode)}) |
| **Lead Designer** | ${cell(doc.designer)} |
| **Final Revision** | Rev ${cell(doc.revision)} |
| **Handover Status** | \`DELIVERED - SIGNED OFF\` |
| **Total Artifacts** | **${doc.assets.length} items** (${doc.totalSizeFormatted}) |

---

## Verified Asset Manifest & Cryptographic Hashes

Every production asset has been cryptographically signed with a **SHA-256** checksum to guarantee fidelity and prevent corruption during distribution.

| Asset File | Format | File Size | SHA-256 Cryptographic Checksum |
| :--- | :---: | :---: | :--- |
${rows}

---

## Remittance & Studio Identity

| Atelier Profile | Remittance Details |
| :--- | :--- |
| **Studio** | **${cell(s.studioName)}** |
| **Registration No** | ${code(s.registrationNo)} |
| **Billing Email** | ${code(s.billingEmail)} |
| **Bank Name** | **${cell(s.bankName)}** |
| **Account No** | ${code(s.accountNo)} |
| **Account Holder** | ${cell(s.accountHolder)} |
| **SWIFT / DuitNow** | ${code(s.swiftOrDuitNow)} |
| **Payment Terms** | ${cell(s.paymentTerms)} |

---

## Authorized Handover Sign-Off

This creative package certifies the final production handover of all deliverables outlined above. All assets are formatted to client specification and ready for immediate deployment.

**Principal Art Director:** ${s.principalName}  
**Studio Signature:** *${s.signed ? '[Digital Signature Verified]' : s.studioName}*  
**Date:** ${doc.date}  

---
*Generated locally with 100% data sovereignty in Kanso Cre8.*
`;
}
