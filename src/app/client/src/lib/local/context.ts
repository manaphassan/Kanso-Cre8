/**
 * Everything a local route handler may use. Production builds it from Tauri
 * (`createDesktopContext`); tests build it from `MemoryVaultFs` and
 * `MemoryMachineStore` (`createMemoryContext`).
 */

import { EventBus } from './bus';
import { MemoryAiBackend, type AiBackend } from './ai';
import { MemoryMachineStore, type MachineStore } from './machine';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import type { VaultFs } from '$lib/vault/types';

export interface OpenedVault {
  /** Absolute path for display only; never written to the vault. */
  root: string;
  watch: 'native' | 'polling' | 'off';
}

export class VaultOpenError extends Error {
  constructor(
    readonly code: 'missing_root' | 'not_a_folder' | 'not_writable' | 'no_vault',
    message: string
  ) {
    super(message);
  }
}

export interface LocalContext {
  /** The open vault. Throws `VaultOpenError('no_vault')` if none is open. */
  vault(): Promise<VaultFs>;
  /** Opens (optionally creates) a folder as the vault. */
  openVault(path: string, create: boolean): Promise<OpenedVault>;
  /** Display path of the open vault, or null. */
  vaultRoot(): Promise<string | null>;
  /** Backs up legacy config files to the machine tier, then removes them from the vault. */
  retireFiles(names: string[]): Promise<Array<{ path: string; backup: string }>>;
  /** URL the webview can load for a vault file (images, video, PDF). */
  fileUrl(rel: string): Promise<string>;
  machine: MachineStore;
  /** AI through Rust; the key never reaches the webview. */
  ai: AiBackend;
  bus: EventBus;
  platform: 'win32' | 'darwin' | 'linux';
  version: string;
  now(): Date;
}

/** Test context: a memory vault that "opens" any path it was given. */
export function createMemoryContext(
  files: Record<string, string> = {},
  options: { root?: string | null; existing?: string[]; fs?: MemoryVaultFs } = {}
): LocalContext & { fs: MemoryVaultFs; machine: MemoryMachineStore; ai: MemoryAiBackend; opened: string[]; retired: string[] } {
  const fs = options.fs ?? new MemoryVaultFs(files);
  const machine = new MemoryMachineStore();
  const bus = new EventBus();
  const existing = new Set(options.existing ?? []);
  let root: string | null = options.root === undefined ? 'D:/Vault' : options.root;
  if (root) existing.add(root);
  const opened: string[] = [];
  const retired: string[] = [];
  return {
    fs,
    machine,
    ai: new MemoryAiBackend(),
    bus,
    opened,
    retired,
    platform: 'win32',
    version: '0.0.0-test',
    now: () => fs.now(),
    async vault() {
      if (!root) throw new VaultOpenError('no_vault', 'No vault is open.');
      return fs;
    },
    async openVault(path, create) {
      if (!path.trim()) throw new VaultOpenError('missing_root', 'Choose a folder for the vault.');
      if (!existing.has(path)) {
        if (!create) throw new VaultOpenError('missing_root', `Vault folder not found: ${path}`);
        existing.add(path);
      }
      root = path;
      opened.push(path);
      return { root: path, watch: 'native' };
    },
    async vaultRoot() {
      return root;
    },
    async fileUrl(rel) {
      return `asset://localhost/${encodeURI(rel)}`;
    },
    async retireFiles(names) {
      const out: Array<{ path: string; backup: string }> = [];
      for (const name of names) {
        const candidates = name.includes('/') ? [name] : [`_Team/_Config/${name}`, `_Team/${name}`];
        for (const path of candidates) {
          if (fs.remove(path)) {
            retired.push(path);
            out.push({ path, backup: `machine/backups/${path.replace(/\//g, '_')}.migrated.bak` });
          }
        }
      }
      return out;
    }
  };
}
