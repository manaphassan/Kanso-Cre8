/**
 * Settings export and import (P5.3, P5.4). The file is built, read and
 * applied in Rust (`settings.rs`); the AI key and passphrase handling never
 * leave Rust except for the passphrase the user types here.
 */

import { tauriInvoke } from '$lib/vault/tauriVaultFs';
import { isDesktop } from './desktop';
import { pickFile, pickSaveFile } from './dialog';

export type SectionId = 'preferences' | 'studio_profile' | 'app' | 'license';

export interface ExportReport {
  sections: SectionId[];
  missing: SectionId[];
  removedPaths: string[];
  aiKey: boolean;
}

export interface SectionPreview {
  id: SectionId;
  present: boolean;
  changes: { added: string[]; changed: string[]; removed: string[] };
  removedPaths: string[];
}

export interface SettingsPreview {
  appVersion: string;
  exportedAt: string;
  sourcePlatform: string;
  sections: SectionPreview[];
  hasAiKey: boolean;
  vaultOpen: boolean;
  recentVaultNames: string[];
}

export interface ImportReport {
  applied: SectionId[];
  aiKey: boolean;
  removedPaths: string[];
}

export const SECTION_LABELS: Record<SectionId, string> = {
  preferences: 'Preferences',
  studio_profile: 'Studio profile',
  app: 'App settings',
  license: 'Licence'
};

const FILTER = [{ name: 'Kanso Cre8 settings', extensions: ['json'] }];

async function call<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  if (!isDesktop()) throw new Error('Settings files work in the desktop app only.');
  const invoke = await tauriInvoke();
  try {
    return await invoke<T>(cmd, args);
  } catch (err: any) {
    throw new Error(typeof err === 'string' ? err : err?.message || String(err));
  }
}

export function defaultSettingsFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `kanso-settings-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** Asks where to save, then exports. Returns null if the user cancelled. */
export async function exportSettings(sections: SectionId[], passphrase?: string): Promise<(ExportReport & { dest: string }) | null> {
  const dest = await pickSaveFile('Export settings', defaultSettingsFileName(), FILTER);
  if (!dest) return null;
  const report = await call<ExportReport>('settings_export', { input: { dest, sections, passphrase: passphrase || null } });
  return { ...report, dest };
}

/** Asks for a settings file. Returns its path, or null if cancelled. */
export function pickSettingsFile(): Promise<string | null> {
  return pickFile('Import settings', FILTER);
}

export function inspectSettings(path: string): Promise<SettingsPreview> {
  return call<SettingsPreview>('settings_inspect', { path });
}

export function importSettings(path: string, sections: SectionId[], passphrase?: string): Promise<ImportReport> {
  return call<ImportReport>('settings_import', { input: { path, sections, passphrase: passphrase || null } });
}
