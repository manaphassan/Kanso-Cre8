/**
 * Licence state for the UI (D3: free Kanso Zen tier plus a paid Studio Pro
 * tier). Keys are Ed25519-signed and verified in Rust (`license.rs`); this
 * store only shows the result. Fully offline: no activation server.
 */

import { activateLicense, deactivateLicense, licenseStatus, type LicenseStatus } from '$lib/local/license';
import { appState } from './appState.svelte';

export type LicenseTier = 'zen' | 'pro';

class LicenseStore {
  tier = $state<LicenseTier>('zen');
  licenseKey = $state<string>('');
  licensee = $state<string>('');
  issuedDate = $state<string>('');
  status = $state<LicenseStatus['status']>('unlicensed');
  /** Why a stored key was rejected, as a sentence. */
  message = $state<string>('');
  showUpgradeModal = $state<boolean>(false);
  isLoading = $state<boolean>(false);

  isPro = $derived(this.tier === 'pro' && this.status === 'valid');

  constructor() {
    if (typeof window !== 'undefined') {
      this.refresh();
      // The licence lives in the vault, so re-read it when the vault changes.
      window.addEventListener('workspace:updated', () => this.refresh());
    }
  }

  private apply(s: LicenseStatus): void {
    this.status = s.status;
    this.tier = s.tier;
    this.licenseKey = s.key ?? '';
    this.licensee = s.license?.licensee ?? '';
    this.issuedDate = s.license?.issued ?? '';
    this.message = s.message ?? '';
  }

  async refresh(): Promise<void> {
    try {
      this.apply(await licenseStatus());
    } catch {
      // Outside the desktop app: stay on the free tier.
    }
  }

  async activate(key: string): Promise<boolean> {
    this.isLoading = true;
    try {
      this.apply(await activateLicense(key));
      appState.addToast(`Kanso Studio Pro activated. Welcome, ${this.licensee}.`, 'success');
      this.showUpgradeModal = false;
      return true;
    } catch (err: any) {
      appState.addToast(err?.message || String(err), 'error');
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  async deactivate(): Promise<void> {
    try {
      this.apply(await deactivateLicense());
      appState.addToast('Back on Kanso Zen, the free edition.', 'info');
    } catch (err: any) {
      appState.addToast(err?.message || String(err), 'error');
    }
  }

  /** True when the Studio Pro licence is valid. */
  requirePro(_featureName?: string): boolean {
    return this.isPro;
  }
}

export const licenseStore = new LicenseStore();
