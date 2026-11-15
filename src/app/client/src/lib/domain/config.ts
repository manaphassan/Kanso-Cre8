/**
 * Vault config in `_Team/_Config/`: studio_profile.json, preferences.json,
 * license.json. Port of server/services/ConfigService.js (vault tier) and
 * its migration.
 *
 * Studio profile keys: the file stores canonical keys only (kanso-vault-schema).
 * The UI still uses the older camelCase names, so `toStudioView` adds them as
 * aliases on read and `fromStudioView` maps them back on write.
 */

import { readJson, writeJson, exists, type VaultFs } from '$lib/vault/types';

export const CONFIG_DIR = '_Team/_Config';
export const STUDIO_FILE = `${CONFIG_DIR}/studio_profile.json`;
export const PREFERENCES_FILE = `${CONFIG_DIR}/preferences.json`;
export const LICENSE_FILE = `${CONFIG_DIR}/license.json`;

/** Canonical studio profile (what is written to disk). */
export const DEFAULT_STUDIO: Record<string, any> = {
  studioName: 'Acme Design Studio',
  freelancerName: 'Alex Mercer',
  professionalTitle: 'Principal Art Director & Brand Architect',
  tagline: 'Mindful Brand Systems & Digital Craft',
  registration_no: '2026-ACME-0001',
  email: 'billing@example.com',
  address: '100 Creative Way, Suite 400, Metropolis',
  website: 'https://example.com',
  phone: '+1-555-0100',
  bankName: 'Acme Federal Bank',
  accountNumber: '0000-0000-0000',
  accountHolder: 'Acme Design Studio',
  swift_bic: 'ACMEUS33',
  duitnow_id: '00000000',
  defaultPaymentTerms: '50% Upfront Deposit - Net 14 Days - 2 Revision Rounds',
  defaultCurrency: 'USD',
  brandColor: '#0284C7',
  logo_url: '',
  signature_text: 'Alex Mercer',
  signature_url: '',
  footerNotice: 'Crafted with mindful focus & precision in Kanso Cre8.'
};

/** Legacy (UI) key -> canonical key. */
export const STUDIO_ALIASES: Record<string, string> = {
  principalName: 'freelancerName',
  businessRegNo: 'registration_no',
  billingEmail: 'email',
  studioAddress: 'address',
  paymentBank: 'bankName',
  paymentAccountNo: 'accountNumber',
  paymentAccountName: 'accountHolder',
  logo: 'logo_url',
  digitalSignature: 'signature_text'
};
const SWIFT_OR_QR = 'paymentSwiftOrQr';

export const DEFAULT_PREFERENCES: Record<string, any> = {
  theme: 'dark',
  default_project_view: 'kanban',
  density: 'comfortable',
  hourly_rate: 150,
  currency: 'USD',
  radio_favorites: [],
  pomodoro_minutes: 25
};

export const DEFAULT_LICENSE: Record<string, any> = {
  active: true,
  tier: 'free',
  licenseKey: null,
  issuedTo: 'Studio User'
};

export function parseSwiftOrQr(text: string): { swift_bic?: string; duitnow_id?: string; payment_note?: string } {
  const out: { swift_bic?: string; duitnow_id?: string; payment_note?: string } = {};
  const rest: string[] = [];
  for (const part of String(text || '').split('/').map((p) => p.trim()).filter(Boolean)) {
    const swift = part.match(/^SWIFT\s*:\s*(.*)$/i);
    const duit = part.match(/^DuitNow\s*:\s*(.*)$/i);
    if (swift) out.swift_bic = swift[1].trim();
    else if (duit) out.duitnow_id = duit[1].trim();
    else rest.push(part);
  }
  if (rest.length) out.payment_note = rest.join(' / ');
  return out;
}

export function formatSwiftOrQr(p: Record<string, any>): string {
  const parts: string[] = [];
  if (p.swift_bic) parts.push(`SWIFT: ${p.swift_bic}`);
  if (p.duitnow_id) parts.push(`DuitNow: ${p.duitnow_id}`);
  if (p.payment_note) parts.push(p.payment_note);
  return parts.join(' / ');
}

/** Any stored shape (old duplicate keys, legacy-only, canonical) -> canonical. */
export function canonicalStudio(stored: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...stored };
  for (const [legacy, canon] of Object.entries(STUDIO_ALIASES)) {
    if (legacy in out) {
      if (out[canon] === undefined || out[canon] === '') out[canon] = out[legacy];
      delete out[legacy];
    }
  }
  if (SWIFT_OR_QR in out) {
    const parsed = parseSwiftOrQr(out[SWIFT_OR_QR]);
    for (const [k, v] of Object.entries(parsed)) if (out[k] === undefined || out[k] === '') out[k] = v;
    delete out[SWIFT_OR_QR];
  }
  return out;
}

/** Canonical -> canonical plus the legacy alias keys the UI reads. */
export function toStudioView(canonical: Record<string, any>): Record<string, any> {
  const view: Record<string, any> = { ...DEFAULT_STUDIO, ...canonical };
  for (const [legacy, canon] of Object.entries(STUDIO_ALIASES)) view[legacy] = view[canon];
  view[SWIFT_OR_QR] = formatSwiftOrQr(view);
  return view;
}

/**
 * A UI update (legacy and/or canonical keys) -> canonical changes. When both
 * names are sent, the legacy one wins only if it differs from the current
 * value, i.e. the user edited that field.
 */
export function fromStudioView(update: Record<string, any>, current: Record<string, any>): Record<string, any> {
  const view = toStudioView(current);
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(update)) {
    if (key in STUDIO_ALIASES || key === SWIFT_OR_QR) continue;
    out[key] = value;
  }
  for (const [legacy, canon] of Object.entries(STUDIO_ALIASES)) {
    if (legacy in update && update[legacy] !== view[legacy]) out[canon] = update[legacy];
  }
  if (SWIFT_OR_QR in update && update[SWIFT_OR_QR] !== view[SWIFT_OR_QR]) {
    const parsed = parseSwiftOrQr(update[SWIFT_OR_QR]);
    out.swift_bic = parsed.swift_bic ?? '';
    out.duitnow_id = parsed.duitnow_id ?? '';
    out.payment_note = parsed.payment_note ?? '';
  }
  return out;
}

export async function getStudioProfile(fs: VaultFs): Promise<Record<string, any>> {
  const stored = await readJson<Record<string, any>>(fs, STUDIO_FILE, {});
  return toStudioView(canonicalStudio(stored));
}

export async function saveStudioProfile(fs: VaultFs, update: Record<string, any>): Promise<Record<string, any>> {
  const stored = canonicalStudio(await readJson<Record<string, any>>(fs, STUDIO_FILE, {}));
  const merged = { ...DEFAULT_STUDIO, ...stored, ...fromStudioView(update, stored) };
  await writeJson(fs, STUDIO_FILE, merged);
  return toStudioView(merged);
}

export async function getPreferences(fs: VaultFs): Promise<Record<string, any>> {
  return { ...DEFAULT_PREFERENCES, ...(await readJson(fs, PREFERENCES_FILE, {})) };
}

export async function savePreferences(fs: VaultFs, update: Record<string, any>): Promise<Record<string, any>> {
  const merged = { ...(await getPreferences(fs)), ...update };
  await writeJson(fs, PREFERENCES_FILE, merged);
  return merged;
}

export async function getLicenseState(fs: VaultFs): Promise<Record<string, any>> {
  return { ...DEFAULT_LICENSE, ...(await readJson(fs, LICENSE_FILE, {})) };
}

export async function saveLicenseState(fs: VaultFs, update: Record<string, any>): Promise<Record<string, any>> {
  const merged = { ...(await getLicenseState(fs)), ...update };
  await writeJson(fs, LICENSE_FILE, merged);
  return merged;
}

export interface MigrationResult {
  actions: string[];
  /** Legacy files that should now be retired (backed up to the machine tier, then removed). */
  retire: string[];
  errors: string[];
}

export const RETIRED_FILES = [
  'user_passwords.json',
  'staff_directory.json',
  'team-notes.json',
  'companies.json',
  'timer.json',
  'theme.txt',
  'license.key',
  'ai-config.json',
  'audit-log.jsonl',
  'share-tokens.json'
];
export const RETIRED_DIR = '_Team/comments';

/**
 * Idempotent config migration (kanso-vault-schema): theme.txt and license.key
 * fold into JSON, studio keys become canonical, and the list of legacy files
 * to retire is returned. User `.md` content is never touched.
 */
export async function migrateVaultConfig(fs: VaultFs): Promise<MigrationResult> {
  const actions: string[] = [];
  const errors: string[] = [];
  const retire: string[] = [];

  try {
    if (await exists(fs, `${CONFIG_DIR}/theme.txt`)) {
      const theme = (await fs.readText(`${CONFIG_DIR}/theme.txt`)).trim().toLowerCase();
      if (theme) {
        await savePreferences(fs, { theme });
        actions.push(`Migrated theme.txt ('${theme}') into preferences.json`);
      }
    }
  } catch (err: any) {
    errors.push(`Failed to migrate theme.txt: ${err.message}`);
  }

  try {
    if (await exists(fs, `${CONFIG_DIR}/license.key`)) {
      const key = (await fs.readText(`${CONFIG_DIR}/license.key`)).trim();
      if (key) {
        await saveLicenseState(fs, { active: true, tier: 'pro', licenseKey: key });
        actions.push('Migrated license.key into license.json');
      }
    }
  } catch (err: any) {
    errors.push(`Failed to migrate license.key: ${err.message}`);
  }

  try {
    if (await exists(fs, STUDIO_FILE)) {
      const stored = await readJson<Record<string, any>>(fs, STUDIO_FILE, {});
      const canonical = canonicalStudio(stored);
      if (JSON.stringify(canonical) !== JSON.stringify(stored)) {
        await writeJson(fs, STUDIO_FILE, canonical);
        actions.push('Normalized studio_profile.json to canonical keys');
      }
    }
  } catch (err: any) {
    errors.push(`Failed to normalize studio_profile.json: ${err.message}`);
  }

  for (const name of RETIRED_FILES) {
    if ((await exists(fs, `${CONFIG_DIR}/${name}`)) || (await exists(fs, `_Team/${name}`))) retire.push(name);
  }
  if (await exists(fs, RETIRED_DIR)) retire.push(RETIRED_DIR);
  return { actions, retire, errors };
}
