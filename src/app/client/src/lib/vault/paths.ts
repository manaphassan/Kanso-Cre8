/**
 * Vault path and filename rules, mirrored from the Rust layer
 * (src-tauri/src/vault/guard.rs and src-tauri/src/names.rs) so the domain
 * layer and the in-memory test vault reject exactly what the app rejects.
 */

export class VaultPathError extends Error {}

const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001f\u007f]/;
const RESERVED = new Set(['CON', 'PRN', 'AUX', 'NUL']);

/** Splits a vault-relative path ("a/b/c.md") into segments. Empty = root. */
export function parseRelative(rel: string): string[] {
  if (rel.includes('\\') || rel.includes('\0')) {
    throw new VaultPathError(`Paths use '/' and may not contain '\\' or NUL: ${rel}`);
  }
  const trimmed = rel.replace(/\/+$/, '');
  if (trimmed === '') return [];
  if (trimmed.startsWith('/') || /^[A-Za-z]:/.test(trimmed)) {
    throw new VaultPathError(`Paths must be relative to the vault: ${rel}`);
  }
  const segments: string[] = [];
  for (const raw of trimmed.split('/')) {
    if (raw === '' || raw === '.') continue;
    if (raw === '..') throw new VaultPathError(`Paths may not use '..': ${rel}`);
    segments.push(raw);
  }
  return segments;
}

/** Normal form used as a key: segments joined with '/'. */
export function normalizePath(rel: string): string {
  return parseRelative(rel).join('/');
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join('/'));
}

export function parentPath(rel: string): string {
  return parseRelative(rel).slice(0, -1).join('/');
}

export function baseName(rel: string): string {
  const segments = parseRelative(rel);
  return segments[segments.length - 1] ?? '';
}

/** Throws if a name the app is about to create would break on any OS. */
export function validateNewName(name: string): void {
  if (name === '' || name === '.' || name === '..') {
    throw new VaultPathError(`"${name}" is not a valid file name.`);
  }
  if (FORBIDDEN.test(name)) {
    throw new VaultPathError(`"${name}" contains a character Windows does not allow.`);
  }
  if (/[. ]$/.test(name)) {
    throw new VaultPathError(`"${name}" ends with a dot or space, which Windows does not allow.`);
  }
  const stem = name.split('.')[0].trimEnd().toUpperCase();
  if (RESERVED.has(stem) || /^(COM|LPT)[1-9]$/.test(stem)) {
    throw new VaultPathError(`"${name}" is a reserved name on Windows.`);
  }
  if (new TextEncoder().encode(name).length > 255) {
    throw new VaultPathError(`"${name}" is longer than 255 bytes.`);
  }
}

/** UTF-8 without BOM, LF line endings. */
export function normalizeText(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

export const TEMP_MARKER = '.kanso-tmp-';
export const ARCHIVE_DIR = '_Archive';
export const TEXT_EXTENSIONS = ['md', 'json', 'txt', 'yml', 'yaml'];
export const MAX_TEXT_BYTES = 1024 * 1024;

export function hasTextExtension(rel: string): boolean {
  const name = baseName(rel);
  const dot = name.lastIndexOf('.');
  return dot > 0 && TEXT_EXTENSIONS.includes(name.slice(dot + 1).toLowerCase());
}

/** UTC `YYYYMMDD-HHMMSS`, the archive folder stamp used by Rust. */
export function utcStamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}-` +
    `${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`
  );
}
