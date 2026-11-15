/**
 * "Leave with your data": the whole vault as one ZIP. Port of
 * ExportService.streamFullVault. The six canonical compartments are packed
 * file by file (so hidden files, lock files and Thumbs.db stay out, as on the
 * server) together with a generated VAULT_MANIFEST.md at the top level.
 */

import type { VaultEntry, VaultFs } from '$lib/vault/types';
import { formatBytes } from './manifest';
import { isSkippedName, type ExportResult, type ZipExtra } from './handover';

export const VAULT_COMPARTMENTS = ['_Clients', '_Finance', '_Projects', '_Journal', '_Notes', '_Team'] as const;
export const VAULT_MANIFEST_FILE = 'VAULT_MANIFEST.md';

export interface CompartmentSummary {
  name: string;
  files: number;
  bytes: number;
}

export interface VaultExportPreview {
  compartments: CompartmentSummary[];
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  manifestMd: string;
}

export interface VaultExportPlan {
  paths: string[];
  extras: ZipExtra[];
  preview: VaultExportPreview;
}

export function vaultManifestMarkdown(totalFiles: number, now: Date): string {
  return `---
title: "Kanso Cre8 - Atelier Vault Archive"
exported_at: "${now.toISOString()}"
compartments: [${VAULT_COMPARTMENTS.map((c) => `"${c}"`).join(', ')}]
total_files: ${totalFiles}
data_ownership: "100% Plain Human-Readable UTF-8 Markdown & JSON (Zero SQL / Zero Binary Locks)"
---

# Kanso Cre8 - Atelier Vault Archive

> **Zero Vendor Lock-in Guarantee: You Own Your Creative Data.**

This archive contains your complete creative operations vault. All records are stored strictly as human-readable UTF-8 \`.md\` Markdown files with YAML frontmatter, plus standard JSON profiles.

You can unpack this archive anywhere and open it immediately with **Obsidian**, **VS Code**, standard text editors, or filesystem tools.

## Included Canonical Compartments

- **\`_Clients/\`**: Multi-client dossier hubs and brand color swatch strip profiles.
- **\`_Finance/\`**: Markdown-based Quotes and Invoices with line items, tax rules, and remittance info.
- **\`_Projects/\`**: Standardized 5-folder project vaults (\`01_BRIEF/\`, \`02_SOURCE/\`, \`03_COPY/\`, \`04_WIP/\`, \`05_DELIVERABLES/\`).
- **\`_Journal/\`**: Bullet Journal system with Daily rapid logging, Monthly reviews, and Yearly retrospectives.
- **\`_Notes/\`**: Atelier Notes knowledge base (\`01_Fleeting/\`, \`02_Literature/\`, \`03_Permanent/\`) and Scratchpad.
- **\`_Team/\`**: Master Studio Profile, business registration, and payment remittance instructions.

---
*Crafted with tranquility and complete data sovereignty in Kanso Cre8.*
`;
}

function packable(entry: VaultEntry): boolean {
  return !entry.isDir && !entry.path.split('/').some(isSkippedName);
}

/** Lists every file to export (one scan per compartment that exists) and builds the manifest. */
export async function planVaultExport(fs: VaultFs, now: Date): Promise<VaultExportPlan> {
  const top = new Set((await fs.listDir('')).filter((e) => e.isDir).map((e) => e.path));
  const paths: string[] = [];
  const compartments: CompartmentSummary[] = [];
  for (const name of VAULT_COMPARTMENTS) {
    if (!top.has(name)) continue;
    const files = (await fs.scan(name)).filter(packable);
    paths.push(...files.map((f) => f.path));
    compartments.push({ name, files: files.length, bytes: files.reduce((sum, f) => sum + f.size, 0) });
  }
  const totalSizeBytes = compartments.reduce((sum, c) => sum + c.bytes, 0);
  const manifestMd = vaultManifestMarkdown(paths.length, now);
  return {
    paths,
    extras: [{ name: VAULT_MANIFEST_FILE, text: manifestMd }],
    preview: {
      compartments,
      totalFiles: paths.length,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
      manifestMd
    }
  };
}

/** Writes a planned vault export to `dest` (an absolute path from a save dialog). */
export async function exportVault(fs: VaultFs, plan: VaultExportPlan, dest: string): Promise<ExportResult> {
  const summary = await fs.exportZip(plan.paths, dest, { extras: plan.extras });
  return { success: true, files: summary.files, bytes: summary.bytes, dest };
}

/** Default name for the save dialog (same as the server's download name). */
export function suggestedVaultFilename(now: Date): string {
  return `Kanso_Vault_Archive_${now.toISOString().slice(0, 10)}.zip`;
}
