/**
 * In-memory `VaultFs` for tests. It follows the Rust rules (path guard, name
 * checks, LF text, archive-not-delete, scan filters) so a domain test that
 * passes here behaves the same against the real vault. Case collisions are
 * reported like on Linux, the strictest of the three platforms.
 */

import {
  ARCHIVE_DIR,
  MAX_TEXT_BYTES,
  TEMP_MARKER,
  VaultPathError,
  baseName,
  hasTextExtension,
  normalizePath,
  normalizeText,
  parentPath,
  parseRelative,
  utcStamp,
  validateNewName
} from './paths';
import type { Unsubscribe, VaultEntry, VaultFs, Written, ZipOptions, ZipSummary } from './types';

interface Node {
  isDir: boolean;
  data: Uint8Array;
  modifiedMs: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class MemoryVaultFs implements VaultFs {
  private nodes = new Map<string, Node>();
  private listeners = new Set<(paths: string[]) => void>();
  /** Absolute "outside" files that `copyIn` may read, keyed by path. */
  readonly external = new Map<string, Uint8Array>();
  /** ZIP exports recorded instead of written: destination -> entry names. */
  readonly exports = new Map<string, string[]>();
  /** Generated files passed to each export. */
  readonly exportExtras = new Map<string, Array<{ name: string; text: string }>>();
  now: () => Date = () => new Date();

  constructor(files: Record<string, string> = {}) {
    for (const [path, text] of Object.entries(files)) this.put(path, text);
  }

  /** Test helper: create a file (and parents) without name checks or events. */
  put(path: string, content: string | Uint8Array): void {
    const key = normalizePath(path);
    this.mkdirs(parentPath(key));
    const data = typeof content === 'string' ? encoder.encode(content) : content;
    this.nodes.set(key, { isDir: false, data, modifiedMs: this.now().getTime() });
  }

  /** Test helper: every stored path, sorted. */
  paths(): string[] {
    return [...this.nodes.keys()].sort();
  }

  /** Test helper: delete a file or folder (the real vault only archives). */
  remove(path: string): boolean {
    const key = normalizePath(path);
    if (!this.nodes.has(key)) return false;
    for (const k of [...this.nodes.keys()]) if (k === key || k.startsWith(`${key}/`)) this.nodes.delete(k);
    return true;
  }

  private mkdirs(path: string): void {
    const segments = parseRelative(path);
    for (let i = 1; i <= segments.length; i++) {
      const key = segments.slice(0, i).join('/');
      const node = this.nodes.get(key);
      if (node && !node.isDir) throw new VaultPathError(`"${key}" is a file.`);
      if (!node) {
        this.nodes.set(key, { isDir: true, data: new Uint8Array(), modifiedMs: this.now().getTime() });
      }
    }
  }

  /** Name checks apply only to segments that do not exist yet, as in Rust. */
  private validateNew(path: string): void {
    const segments = parseRelative(path);
    for (let i = 1; i <= segments.length; i++) {
      if (!this.nodes.has(segments.slice(0, i).join('/'))) validateNewName(segments[i - 1]);
    }
  }

  private emit(paths: string[]): void {
    const batch = [...new Set(paths)].sort();
    for (const listener of this.listeners) listener(batch);
  }

  private entry(path: string, node: Node, withText: boolean): VaultEntry {
    const entry: VaultEntry = {
      path,
      isDir: node.isDir,
      size: node.isDir ? 0 : node.data.length,
      modifiedMs: node.modifiedMs
    };
    if (withText && !node.isDir && node.data.length <= MAX_TEXT_BYTES && hasTextExtension(path)) {
      entry.text = normalizeText(decoder.decode(node.data));
    }
    return entry;
  }

  private children(dir: string): string[] {
    const prefix = dir ? `${dir}/` : '';
    return [...this.nodes.keys()].filter(
      (k) => k.startsWith(prefix) && k !== dir && !k.slice(prefix.length).includes('/')
    );
  }

  private requireDir(path: string): string {
    const key = normalizePath(path);
    if (key !== '' && !this.nodes.get(key)?.isDir) {
      throw new Error(`"${path}" is not a folder in the vault.`);
    }
    return key;
  }

  async scan(prefix = ''): Promise<VaultEntry[]> {
    const start = this.requireDir(prefix);
    const out: VaultEntry[] = [];
    const walk = (dir: string) => {
      for (const child of this.children(dir)) {
        const name = baseName(child);
        const node = this.nodes.get(child)!;
        if (name.includes(TEMP_MARKER)) continue;
        if (node.isDir && (name.startsWith('.') || name === 'node_modules')) continue;
        out.push(this.entry(child, node, true));
        if (node.isDir) walk(child);
      }
    };
    walk(start);
    return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }

  async listDir(path: string): Promise<VaultEntry[]> {
    const dir = this.requireDir(path);
    return this.children(dir)
      .filter((c) => !baseName(c).includes(TEMP_MARKER))
      .sort()
      .map((c) => this.entry(c, this.nodes.get(c)!, false));
  }

  async readText(path: string): Promise<string> {
    const node = this.nodes.get(normalizePath(path));
    if (!node || node.isDir) throw new Error(`Could not read "${path}": not found`);
    return normalizeText(decoder.decode(node.data));
  }

  async writeText(path: string, content: string): Promise<Written> {
    const key = normalizePath(path);
    if (key === '') throw new Error('A file path is required.');
    const existing = this.nodes.get(key);
    if (existing?.isDir) throw new Error(`"${path}" is a folder.`);
    if (!existing) {
      this.validateNew(key);
      const name = baseName(key).toLowerCase();
      const clash = this.children(parentPath(key)).find((c) => baseName(c).toLowerCase() === name);
      if (clash) {
        throw new Error(
          `"${baseName(key)}" differs only by letter case from "${baseName(clash)}". ` +
            'Windows and macOS treat them as the same file.'
        );
      }
    }
    const text = normalizeText(content);
    this.put(key, text);
    this.emit([key]);
    return { path: key, size: encoder.encode(text).length };
  }

  async ensureDirs(paths: string[]): Promise<string[]> {
    const created: string[] = [];
    for (const path of paths) {
      const key = normalizePath(path);
      if (this.nodes.get(key)?.isDir) continue;
      this.validateNew(key);
      this.mkdirs(key);
      created.push(key);
    }
    if (created.length) this.emit(created);
    return created;
  }

  async moveToArchive(path: string): Promise<string> {
    const segments = parseRelative(path);
    if (segments.length === 0 || segments[0] === ARCHIVE_DIR) {
      throw new Error(`"${path}" cannot be archived.`);
    }
    const key = segments.join('/');
    if (!this.nodes.has(key)) throw new Error(`"${path}" does not exist.`);
    const stamp = utcStamp(this.now());
    let dest = `${ARCHIVE_DIR}/${stamp}/${key}`;
    for (let n = 2; this.nodes.has(dest); n++) dest = `${ARCHIVE_DIR}/${stamp}-${n}/${key}`;

    this.mkdirs(parentPath(dest));
    const moved = [...this.nodes.keys()].filter((k) => k === key || k.startsWith(`${key}/`));
    for (const k of moved) {
      this.nodes.set(dest + k.slice(key.length), this.nodes.get(k)!);
      this.nodes.delete(k);
    }
    this.emit([key, dest]);
    return dest;
  }

  async copyIn(source: string, dest: string, overwrite = false): Promise<Written> {
    const data = this.external.get(source);
    if (!data) throw new Error(`Could not open "${source}": not found`);
    const key = normalizePath(dest);
    if (this.nodes.has(key) && !overwrite) throw new Error(`"${dest}" already exists.`);
    if (!this.nodes.has(key)) this.validateNew(key);
    this.put(key, data);
    this.emit([key]);
    return { path: key, size: data.length };
  }

  async writeBytes(path: string, bytes: Uint8Array, overwrite = false): Promise<Written> {
    const key = normalizePath(path);
    if (this.nodes.get(key)?.isDir) throw new Error(`"${path}" is a folder.`);
    if (this.nodes.has(key) && !overwrite) throw new Error(`"${path}" already exists.`);
    if (!this.nodes.has(key)) this.validateNew(key);
    this.put(key, new Uint8Array(bytes));
    this.emit([key]);
    return { path: key, size: bytes.length };
  }

  async copyWithin(from: string, to: string, overwrite = false): Promise<Written> {
    const node = this.nodes.get(normalizePath(from));
    if (!node || node.isDir) throw new Error(`"${from}" is not a file.`);
    return this.writeBytes(to, node.data, overwrite);
  }

  async sha256(path: string): Promise<string> {
    const node = this.nodes.get(normalizePath(path));
    if (!node || node.isDir) throw new Error(`Could not read "${path}": not found`);
    const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(node.data));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async exportZip(paths: string[], dest: string, options: ZipOptions = {}): Promise<ZipSummary> {
    if (!dest.toLowerCase().endsWith('.zip')) throw new Error('The export file must end in .zip.');
    const strip = options.prefix ? `${options.prefix.replace(/^\/+|\/+$/g, '')}/` : null;
    const names = new Set<string>();
    let bytes = 0;
    for (const path of paths) {
      const key = normalizePath(path);
      const node = this.nodes.get(key);
      if (!node) throw new Error(`"${path}" does not exist.`);
      const files = node.isDir
        ? [...this.nodes.keys()].filter((k) => k.startsWith(`${key}/`) && !this.nodes.get(k)!.isDir)
        : [key];
      for (const f of files) {
        const entry = strip && f.startsWith(strip) ? f.slice(strip.length) : f;
        if (baseName(f).includes(TEMP_MARKER) || names.has(entry)) continue;
        names.add(entry);
        bytes += this.nodes.get(f)!.data.length;
      }
    }
    for (const extra of options.extras ?? []) {
      if (parseRelative(extra.name).length === 0) throw new Error('An export entry needs a name.');
      names.add(extra.name);
      bytes += encoder.encode(extra.text).length;
    }
    this.exports.set(dest, [...names].sort());
    this.exportExtras.set(dest, options.extras ?? []);
    return { files: names.size, bytes };
  }

  async onChange(listener: (paths: string[]) => void): Promise<Unsubscribe> {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
