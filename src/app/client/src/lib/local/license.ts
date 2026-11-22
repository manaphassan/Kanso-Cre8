/** Licence through Rust (`license.rs`): verification never happens in the webview. */

import { tauriInvoke } from '$lib/vault/tauriVaultFs';
import { isDesktop } from './desktop';

export interface LicenseStatus {
  status: 'valid' | 'invalid' | 'unlicensed';
  tier: 'pro' | 'zen';
  license: { id: string; licensee: string; email: string | null; tier: 'pro'; issued: string } | null;
  message: string | null;
  key: string | null;
}

async function call(cmd: string, args?: Record<string, unknown>): Promise<LicenseStatus> {
  if (!isDesktop()) throw new Error('Licences work in the desktop app only.');
  const invoke = await tauriInvoke();
  try {
    return await invoke<LicenseStatus>(cmd, args);
  } catch (err: any) {
    throw new Error(typeof err === 'string' ? err : err?.message || String(err));
  }
}

export const licenseStatus = () => call('license_status');
export const activateLicense = (key: string) => call('license_activate', { key });
export const deactivateLicense = () => call('license_deactivate');
