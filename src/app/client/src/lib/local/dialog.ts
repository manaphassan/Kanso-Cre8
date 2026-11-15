/**
 * Native dialogs through tauri-plugin-dialog (granted by `dialog:default`).
 * Called by command name so no extra npm package is needed.
 */

import { tauriInvoke } from '$lib/vault/tauriVaultFs';
import { isDesktop } from './desktop';

export interface DialogFilter {
  name: string;
  extensions: string[];
}

/** Lets the user pick a folder. Returns null if cancelled or not in the desktop app. */
export async function pickFolder(title = 'Choose your vault folder', defaultPath?: string): Promise<string | null> {
  if (!isDesktop()) return null;
  const invoke = await tauriInvoke();
  const picked = await invoke<string | string[] | null>('plugin:dialog|open', {
    options: { title, directory: true, multiple: false, defaultPath, canCreateDirectories: true }
  });
  return Array.isArray(picked) ? (picked[0] ?? null) : picked;
}

/** Lets the user pick one file. */
export async function pickFile(title: string, filters: DialogFilter[] = []): Promise<string | null> {
  if (!isDesktop()) return null;
  const invoke = await tauriInvoke();
  const picked = await invoke<string | string[] | null>('plugin:dialog|open', {
    options: { title, directory: false, multiple: false, filters }
  });
  return Array.isArray(picked) ? (picked[0] ?? null) : picked;
}

/** Asks where to save a file. Returns the chosen absolute path or null. */
export async function pickSaveFile(title: string, defaultPath: string, filters: DialogFilter[] = []): Promise<string | null> {
  if (!isDesktop()) return null;
  const invoke = await tauriInvoke();
  return invoke<string | null>('plugin:dialog|save', { options: { title, defaultPath, filters } });
}
