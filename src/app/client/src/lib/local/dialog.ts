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

const extensionOf = (name: string) => (name.match(/\.([^./\\]+)$/)?.[1] ?? '').toLowerCase();

function filterFor(name: string, label: string): DialogFilter[] {
  const ext = extensionOf(name);
  return ext ? [{ name: label, extensions: [ext] }] : [];
}

function requireDesktop(): void {
  if (!isDesktop()) throw new Error('Saving files works in the desktop app only.');
}

/** Asks where to save a ZIP export. Returns the chosen path, or null if cancelled. */
export async function pickZipDestination(title: string, defaultName: string): Promise<string | null> {
  requireDesktop();
  return pickSaveFile(title, defaultName, filterFor(defaultName, 'ZIP archive'));
}

/**
 * Asks where to save `text`, then writes it there. Returns the saved path,
 * or null if the user cancelled.
 */
export async function saveTextAs(title: string, defaultName: string, text: string, label = 'File'): Promise<string | null> {
  requireDesktop();
  const dest = await pickSaveFile(title, defaultName, filterFor(defaultName, label));
  if (!dest) return null;
  const invoke = await tauriInvoke();
  await invoke<number>('save_text_as', { dest, text });
  return dest;
}

/** Asks where to save a copy of the vault file `path`, then copies it there. */
export async function saveVaultFileAs(title: string, path: string, defaultName: string): Promise<string | null> {
  requireDesktop();
  const dest = await pickSaveFile(title, defaultName, filterFor(defaultName, 'File'));
  if (!dest) return null;
  const invoke = await tauriInvoke();
  await invoke<number>('save_file_as', { path, dest });
  return dest;
}
