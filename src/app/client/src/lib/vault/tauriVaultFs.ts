/**
 * Production `VaultFs`: every call is a Rust command (src-tauri/src/vault,
 * archive.rs, watch.rs), granted by permissions/kanso.toml and guarded to the
 * open vault. Errors from Rust arrive as plain sentences.
 */

import type { VaultEntry, VaultFs, Written, ZipSummary, Unsubscribe } from './types';

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
type Listen = <T>(event: string, handler: (e: { payload: T }) => void) => Promise<Unsubscribe>;

export interface VaultOpened {
  root: string;
  watch: 'native' | 'polling' | 'off';
}

export const VAULT_CHANGED_EVENT = 'vault:changed';

async function tauriInvoke(): Promise<Invoke> {
  const core = await import('@tauri-apps/api/core');
  return core.invoke as Invoke;
}

async function tauriListen(): Promise<Listen> {
  const event = await import('@tauri-apps/api/event');
  return event.listen as unknown as Listen;
}

export class TauriVaultFs implements VaultFs {
  constructor(
    private readonly invokeFn: () => Promise<Invoke> = tauriInvoke,
    private readonly listenFn: () => Promise<Listen> = tauriListen
  ) {}

  private async call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const invoke = await this.invokeFn();
    try {
      return await invoke<T>(cmd, args);
    } catch (err) {
      throw new Error(typeof err === 'string' ? err : (err as Error)?.message ?? String(err));
    }
  }

  /** Opens a folder as the vault and starts the watcher. */
  open(path: string): Promise<VaultOpened> {
    return this.call('vault_open', { path });
  }

  root(): Promise<string | null> {
    return this.call('vault_root');
  }

  scan(prefix = ''): Promise<VaultEntry[]> {
    return this.call('vault_scan', { prefix });
  }

  listDir(path: string): Promise<VaultEntry[]> {
    return this.call('list_dir', { path });
  }

  readText(path: string): Promise<string> {
    return this.call('read_text', { path });
  }

  writeText(path: string, content: string): Promise<Written> {
    return this.call('write_text_atomic', { path, content });
  }

  ensureDirs(paths: string[]): Promise<string[]> {
    return this.call('ensure_dirs', { paths });
  }

  moveToArchive(path: string): Promise<string> {
    return this.call('move_to_archive', { path });
  }

  copyIn(source: string, dest: string, overwrite = false): Promise<Written> {
    return this.call('copy_into_vault', { source, dest, overwrite });
  }

  sha256(path: string): Promise<string> {
    return this.call('sha256_file', { path });
  }

  exportZip(paths: string[], dest: string): Promise<ZipSummary> {
    return this.call('export_zip', { paths, dest });
  }

  async onChange(listener: (paths: string[]) => void): Promise<Unsubscribe> {
    const listen = await this.listenFn();
    return listen<{ paths: string[] }>(VAULT_CHANGED_EVENT, (e) => listener(e.payload.paths));
  }
}
