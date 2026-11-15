/**
 * Test helper: the canonical sample vault (src/app/sample-workspace) loaded
 * into a MemoryVaultFs. Text files only; binary deliverables become small
 * placeholder bytes so listings and sizes still work.
 */

import { MemoryVaultFs } from './memoryVaultFs';

const TEXT = import.meta.glob('../../../../sample-workspace/**/*.{md,json,jsonl,txt}', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const BINARY = import.meta.glob('../../../../sample-workspace/**/*.{png,jpg,svg,pdf,mp4}', {
  query: '?url',
  import: 'default',
  eager: true
}) as Record<string, string>;

const PREFIX = '../../../../sample-workspace/';

/** Vault-relative paths of every sample file. */
export const SAMPLE_PATHS = [...Object.keys(TEXT), ...Object.keys(BINARY)].map((k) => k.slice(PREFIX.length)).sort();

export function sampleVault(now = new Date(Date.UTC(2026, 8, 15, 9, 0, 0))): MemoryVaultFs {
  const fs = new MemoryVaultFs();
  fs.now = () => now;
  for (const [key, text] of Object.entries(TEXT)) fs.put(key.slice(PREFIX.length), text);
  for (const key of Object.keys(BINARY)) fs.put(key.slice(PREFIX.length), new Uint8Array(64));
  return fs;
}
