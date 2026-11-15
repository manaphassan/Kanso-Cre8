/**
 * Desktop runtime: the local router and the Tauri-backed context. In the
 * desktop app every `ApiClient` call is served here; the Node server is only
 * used by the browser dev setup until MASTER_PLAN Phase 4 removes it.
 */

import pkg from '../../../../package.json';
import { EventBus } from './bus';
import { VaultOpenError, type LocalContext, type OpenedVault } from './context';
import { TauriMachineStore } from './machine';
import { LocalRouter } from './router';
import { registerRoutes } from './routes';
import { CommandError, TauriVaultFs, tauriInvoke } from '$lib/vault/tauriVaultFs';

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

function detectPlatform(): LocalContext['platform'] {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Windows/i.test(ua)) return 'win32';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'darwin';
  return 'linux';
}

export function createDesktopContext(): LocalContext {
  const fs = new TauriVaultFs();
  let opened: OpenedVault | null = null;
  return {
    machine: new TauriMachineStore(tauriInvoke),
    bus: new EventBus(),
    platform: detectPlatform(),
    version: pkg.version,
    now: () => new Date(),
    async vault() {
      if (!opened) throw new VaultOpenError('no_vault', 'No vault is open. Choose a vault folder first.');
      return fs;
    },
    async openVault(path, create) {
      try {
        opened = await fs.open(path, create);
        return opened;
      } catch (err) {
        const e = err as CommandError;
        const code = e.code === 'not_writable' || e.code === 'not_a_folder' ? e.code : 'missing_root';
        throw new VaultOpenError(code, e.message);
      }
    },
    async vaultRoot() {
      return opened?.root ?? null;
    },
    retireFiles(names) {
      return fs.retire(names);
    }
  };
}

let instance: { ctx: LocalContext; router: LocalRouter } | null = null;

export function desktopApi() {
  if (!instance) {
    const ctx = createDesktopContext();
    const router = new LocalRouter(ctx);
    registerRoutes(router);
    instance = { ctx, router };
    // Files changed on disk (Obsidian, sync clients, another window) refresh
    // the UI the same way the server's SSE broadcast did.
    new TauriVaultFs()
      .onChange((paths) => ctx.bus.emit('workspace:updated', { reason: 'vault_changed', paths }))
      .catch((err) => console.warn('[desktop] vault watcher unavailable:', err));
  }
  return instance;
}
