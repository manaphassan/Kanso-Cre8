/** App mode from Rust (`app_mode`): installed or portable, and where data lives. */

import { tauriInvoke } from '$lib/vault/tauriVaultFs';
import { isDesktop } from './desktop';

export interface AppMode {
  mode: 'installed' | 'portable';
  appDir: string;
  machineDir: string;
  webviewDataDir: string | null;
  /** Why `portable.ini` was ignored (macOS, or the app is in a cloud sync folder). */
  portableRefused: string | null;
  /** Drive or mount the portable app runs from, when it is not the system drive. */
  externalDrive: string | null;
}

export async function getAppMode(): Promise<AppMode | null> {
  if (!isDesktop()) return null;
  const invoke = await tauriInvoke();
  return invoke<AppMode>('app_mode');
}
