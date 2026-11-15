/**
 * Vault folder layout: the canonical Kanso Zen compartments.
 * Port of VaultPathService.ensureVaultStructure / getVaultStatus.
 */

import { exists, type VaultFs } from '$lib/vault/types';

export const CANONICAL_ROOTS = ['_Clients', '_Finance', '_Projects', '_Journal', '_Notes', '_Team'];

export function canonicalDirs(now: Date): string[] {
  return [
    '_Clients',
    '_Finance/Quotes',
    '_Finance/Invoices',
    `_Projects/${now.getFullYear()}`,
    '_Journal/Daily',
    '_Journal/Monthly',
    '_Journal/Yearly',
    '_Notes/01_Fleeting',
    '_Notes/02_Literature',
    '_Notes/03_Permanent',
    '_Team/_Config'
  ];
}

export const SCRATCHPAD = '_Notes/Scratchpad.md';
const SCRATCHPAD_SEED = '# Atelier Scratchpad\n\nTransient capture buffer for clipboard snippets and scratch ideas.\n';

export interface StructureResult {
  createdDirs: string[];
  createdFiles: string[];
  errors: string[];
}

/** Creates only what is missing. Never overwrites or deletes user files. */
export async function ensureVaultStructure(fs: VaultFs, now = new Date()): Promise<StructureResult> {
  const result: StructureResult = { createdDirs: [], createdFiles: [], errors: [] };
  try {
    result.createdDirs = await fs.ensureDirs(canonicalDirs(now));
  } catch (err: any) {
    result.errors.push(err.message);
  }
  try {
    if (!(await exists(fs, SCRATCHPAD))) {
      await fs.writeText(SCRATCHPAD, SCRATCHPAD_SEED);
      result.createdFiles.push(SCRATCHPAD);
    }
  } catch (err: any) {
    result.errors.push(`${SCRATCHPAD}: ${err.message}`);
  }
  return result;
}

/** Project folders: `_Projects/<YYYY>/<folder>/README.md`, from one scan. */
export async function countProjects(fs: VaultFs): Promise<number> {
  if (!(await exists(fs, '_Projects'))) return 0;
  const entries = await fs.scan('_Projects');
  return entries.filter((e) => !e.isDir && /^_Projects\/[^/]+\/[^/]+\/README\.md$/i.test(e.path)).length;
}
