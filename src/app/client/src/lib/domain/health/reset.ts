/**
 * Archive-first vault reset. Port of VaultPathService.resetVaultStructure:
 * every canonical compartment moves to `_Archive/<UTC stamp>/`, then the
 * empty layout is recreated. Files outside the compartments are untouched.
 */

import { CANONICAL_ROOTS, ensureVaultStructure } from '$lib/domain/vaultLayout';
import type { VaultFs } from '$lib/vault/types';

/** Last segment of the vault's display path (`D:\Studio\Vault` -> `Vault`). */
export function vaultFolderName(root: string | null | undefined): string {
  return String(root || '').split(/[\\/]/).filter(Boolean).pop() ?? '';
}

export class ConfirmationError extends Error {}

export interface ResetResult {
  success: true;
  message: string;
  root: string;
  /** Archive folder holding the moved compartments, or null when none existed. */
  archivePath: string | null;
  archived: string[];
  repaired: string[];
  errors: string[];
}

export async function resetVaultStructure(
  fs: VaultFs,
  root: string,
  confirmationName: string,
  now: Date
): Promise<ResetResult> {
  const expected = vaultFolderName(root);
  const typed = typeof confirmationName === 'string' ? confirmationName.trim() : '';
  if (!expected || typed.toLowerCase() !== expected.toLowerCase()) {
    throw new ConfirmationError(`Confirmation failed: typed folder name "${typed}" does not match "${expected}".`);
  }

  const top = new Set((await fs.listDir('')).filter((e) => e.isDir).map((e) => e.path));
  const archived: string[] = [];
  for (const folder of CANONICAL_ROOTS) {
    if (top.has(folder)) archived.push(await fs.moveToArchive(folder));
  }

  const repair = await ensureVaultStructure(fs, now);
  const first = archived[0];
  return {
    success: true,
    message: 'Vault structure reset successfully with canonical items archived.',
    root,
    archivePath: first ? first.slice(0, first.lastIndexOf('/')) : null,
    archived,
    repaired: [...repair.createdDirs, ...repair.createdFiles],
    errors: repair.errors
  };
}
