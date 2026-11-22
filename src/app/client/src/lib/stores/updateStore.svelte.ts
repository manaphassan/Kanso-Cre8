/**
 * Update checks (P6.3). Off until the user says yes: the first run asks
 * once (`updateChecks` in the machine tier is null until then). With checks
 * on, the app looks for a new release at most once a day.
 */

import { isDesktop } from '$lib/local/desktop';
import { tauriInvoke } from '$lib/vault/tauriVaultFs';
import { appState } from './appState.svelte';

const PREF_KEY = 'updateChecks';
const LAST_KEY = 'updateLastCheck';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  version: string | null;
  notes: string | null;
  canInstall: boolean;
  releasesUrl: string;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const run = await tauriInvoke();
  try {
    return await run<T>(cmd, args);
  } catch (err: any) {
    throw new Error(typeof err === 'string' ? err : err?.message || String(err));
  }
}

class UpdateStore {
  /** null: not asked yet. */
  enabled = $state<boolean | null>(null);
  loaded = $state(false);
  checking = $state(false);
  installing = $state(false);
  info = $state<UpdateInfo | null>(null);
  error = $state('');
  dismissed = $state(false);

  async load(): Promise<void> {
    if (!isDesktop() || this.loaded) return;
    const pref = await invoke<boolean | null>('machine_get', { key: PREF_KEY }).catch(() => null);
    this.enabled = typeof pref === 'boolean' ? pref : null;
    this.loaded = true;
    if (this.enabled) await this.checkIfDue();
  }

  async setEnabled(on: boolean): Promise<void> {
    this.enabled = on;
    await invoke('machine_set', { key: PREF_KEY, value: on }).catch(() => undefined);
    if (on) await this.check(true);
  }

  private async checkIfDue(): Promise<void> {
    const last = await invoke<number | null>('machine_get', { key: LAST_KEY }).catch(() => null);
    if (typeof last === 'number' && Date.now() - last < DAY_MS) return;
    await this.check(true);
  }

  /** `quiet`: background check, so failures do not raise a toast. */
  async check(quiet = false): Promise<UpdateInfo | null> {
    this.checking = true;
    this.error = '';
    try {
      this.info = await invoke<UpdateInfo>('update_check');
      await invoke('machine_set', { key: LAST_KEY, value: Date.now() }).catch(() => undefined);
      return this.info;
    } catch (err: any) {
      this.error = err?.message || String(err);
      if (!quiet) appState.addToast(this.error, 'error');
      return null;
    } finally {
      this.checking = false;
    }
  }

  async install(): Promise<void> {
    this.installing = true;
    try {
      // Restarts the app when the update is installed.
      await invoke('update_install');
    } catch (err: any) {
      this.error = err?.message || String(err);
      appState.addToast(this.error, 'error');
    } finally {
      this.installing = false;
    }
  }

  openReleases(): Promise<void> {
    return invoke<void>('open_releases_page').catch((err) => appState.addToast(err.message, 'error'));
  }
}

export const updateStore = new UpdateStore();
