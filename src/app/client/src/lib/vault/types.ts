/**
 * The storage interface every domain service uses. Production runs on
 * `TauriVaultFs` (Rust commands, guarded to the open vault); tests run on
 * `MemoryVaultFs`. Paths are vault-relative with forward slashes.
 */

export interface VaultEntry {
  path: string;
  isDir: boolean;
  size: number;
  modifiedMs: number | null;
  /** Present for small .md/.json/.txt/.yml files returned by `scan`. */
  text?: string;
}

export interface Written {
  path: string;
  size: number;
}

export interface ZipSummary {
  files: number;
  bytes: number;
}

export type Unsubscribe = () => void;

export interface VaultFs {
  /** Every file and folder under `prefix` (default: whole vault) in one call. */
  scan(prefix?: string): Promise<VaultEntry[]>;
  /** Immediate children of a folder, without contents. */
  listDir(path: string): Promise<VaultEntry[]>;
  readText(path: string): Promise<string>;
  /** Atomic write; creates parent folders; LF line endings, no BOM. */
  writeText(path: string, content: string): Promise<Written>;
  /** Creates folders; returns the ones that did not exist. */
  ensureDirs(paths: string[]): Promise<string[]>;
  /** Moves to `_Archive/<UTC stamp>/<path>`; returns the new path. Never deletes. */
  moveToArchive(path: string): Promise<string>;
  /** Copies a file the user picked (absolute path) into the vault. */
  copyIn(source: string, dest: string, overwrite?: boolean): Promise<Written>;
  sha256(path: string): Promise<string>;
  /** Writes a ZIP of vault paths to an absolute destination chosen by the user. */
  exportZip(paths: string[], dest: string): Promise<ZipSummary>;
  /** Called with vault-relative paths after changes settle. */
  onChange(listener: (paths: string[]) => void): Promise<Unsubscribe>;
}

/** True when `path` exists. Uses one listing of the parent folder. */
export async function exists(fs: VaultFs, path: string): Promise<boolean> {
  const segments = path.split('/').filter((s) => s && s !== '.');
  if (segments.length === 0) return true;
  try {
    const children = await fs.listDir(segments.slice(0, -1).join('/'));
    const target = segments.join('/');
    return children.some((c) => c.path === target);
  } catch {
    return false;
  }
}

/** Reads and parses a JSON file; returns `fallback` when missing or invalid. */
export async function readJson<T>(fs: VaultFs, path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readText(path)) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(fs: VaultFs, path: string, value: unknown): Promise<Written> {
  return fs.writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}
