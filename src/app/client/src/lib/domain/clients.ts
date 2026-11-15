/**
 * Clients: one folder per client, `_Clients/<CODE>_<Name>/client.md`, with the
 * record in YAML frontmatter and free-form notes in the body. Port of
 * server/services/CompanyService.js.
 *
 * The folder is the only client source: no companies.json, no JSON fallback.
 * Demo data: the server seeded or faked three sample clients when
 * DemoDataService was enabled. In the desktop app sample data is loaded into
 * the vault as real files elsewhere, so clients are exactly what is on disk
 * and an empty `_Clients/` lists no clients.
 */

import type { VaultEntry, VaultFs } from '$lib/vault/types';
import { baseName } from '$lib/vault/paths';
import { parseFrontmatter, serializeFrontmatter, validateFrontmatter } from './frontmatter';

export const CLIENTS_DIR = '_Clients';
export const CLIENT_FILE = 'client.md';
/** kanso-vault-schema: a client code is 2 to 5 uppercase letters. */
export const CLIENT_CODE = /^[A-Z]{2,5}$/;

export interface ClientPalette {
  primary: string;
  secondary?: string;
  dark?: string;
  light?: string;
  accent?: string;
  [key: string]: string | undefined;
}

/** Palette written for a client saved without one. Hex values here are data, not UI styling. */
export const DEFAULT_CLIENT_PALETTE: ClientPalette = {
  primary: '#0284C7',
  secondary: '#0052CC',
  dark: '#0A0D14',
  light: '#F8FAFC',
  accent: '#00F0FF'
};

/**
 * A client as returned by `listClients` / `getClient` and the /clients routes
 * (same keys as the server's CompanyService._normalizeClient).
 * Finance stamping uses: code, name, contactPerson, email, phone,
 * billingAddress, currency, defaultHourlyRate, paymentTermsDays, regNo, taxId.
 */
export interface Client {
  code: string;
  name: string;
  shortName: string;
  /** Slug, defaults to the lowercase code. */
  id: string;
  /** "phone / email" summary, or the frontmatter `contact` value. */
  contact: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  billingAddress: string;
  location: string;
  currency: string;
  defaultHourlyRate: number;
  paymentTermsDays: number;
  palette: ClientPalette;
  /** Primary brand colour (hex data from client.md). */
  color: string;
  tags: string[];
  status: string;
  isParent: boolean;
  establishedYear: string;
  regNo: string;
  /** Frontmatter `tax_id` (docs/SCHEMA.md); not part of the server shape. */
  taxId: string;
  /** Body without its first heading. */
  notes: string;
  folderName: string;
  /** Vault-relative path of client.md (the server returned an absolute path). */
  filePath: string;
}

const isClientFolder = (name: string) => !name.startsWith('.') && !name.startsWith('_');

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return value !== undefined && value !== null && value !== '' && Number.isFinite(n) ? n : fallback;
}

export function normalizeClient(fm: Record<string, any>, body: string, folderName: string, filePath: string): Client {
  const code = String(fm.code || folderName.split('_')[0] || '').toUpperCase();
  const name = String(fm.name || folderName.replace(/^[A-Z0-9]+_/, '').replace(/_/g, ' '));
  const contactPerson = String(fm.contact_person || fm.contactPerson || '');
  const email = String(fm.email || '');
  const phone = String(fm.phone || '');
  const contact = fm.contact ? String(fm.contact) : contactPerson ? [phone, email].filter(Boolean).join(' / ') : '';
  const address = String(fm.billing_address || fm.address || '');
  const palette: ClientPalette =
    fm.palette && typeof fm.palette === 'object'
      ? { ...fm.palette }
      : { ...DEFAULT_CLIENT_PALETTE, primary: fm.color || DEFAULT_CLIENT_PALETTE.primary };
  return {
    code,
    name,
    shortName: String(fm.shortName || fm.code || folderName.split('_')[0]),
    id: String(fm.id || code.toLowerCase()),
    contact,
    contactPerson,
    email,
    phone,
    address,
    billingAddress: address,
    location: String(fm.location || (address ? address.split(',').slice(-2).join(',').trim() : '')),
    currency: String(fm.currency || 'USD'),
    defaultHourlyRate: toNumber(fm.default_hourly_rate ?? fm.defaultHourlyRate, 150),
    paymentTermsDays: toNumber(fm.payment_terms_days ?? fm.paymentTermsDays, 14),
    palette,
    color: String(palette.primary || fm.color || DEFAULT_CLIENT_PALETTE.primary),
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    status: String(fm.status || 'active'),
    isParent: fm.isParent !== undefined ? Boolean(fm.isParent) : code === 'ACME',
    establishedYear: String(fm.establishedYear || '2026'),
    regNo: String(fm.regNo || fm.registration_no || ''),
    taxId: String(fm.tax_id || ''),
    notes: (body || '').replace(/^#\s+[^\n]+/, '').trim(),
    folderName,
    filePath
  };
}

function sortClients(list: Client[]): Client[] {
  // Same order as the server: ACME first, then by code.
  return list.sort((a, b) => {
    if (a.code === 'ACME') return -1;
    if (b.code === 'ACME') return 1;
    return a.code.localeCompare(b.code);
  });
}

async function scanClients(fs: VaultFs): Promise<VaultEntry[]> {
  try {
    return await fs.scan(CLIENTS_DIR);
  } catch {
    return []; // no _Clients folder yet
  }
}

/** Every `_Clients/<folder>/client.md`, from one scan. */
export async function listClients(fs: VaultFs): Promise<Client[]> {
  const entries = await scanClients(fs);
  const files = new Map(entries.filter((e) => !e.isDir).map((e) => [e.path, e]));
  const folders = entries.filter((e) => e.isDir && !e.path.slice(CLIENTS_DIR.length + 1).includes('/'));
  const out: Client[] = [];
  for (const folder of folders) {
    const folderName = baseName(folder.path);
    if (!isClientFolder(folderName)) continue;
    const filePath = `${folder.path}/${CLIENT_FILE}`;
    const file = files.get(filePath);
    if (!file) continue;
    try {
      const text = file.text ?? (await fs.readText(filePath));
      const { frontmatter, body } = parseFrontmatter(text);
      out.push(normalizeClient(frontmatter, body, folderName, filePath));
    } catch (err: any) {
      console.warn(`[clients] Could not read ${filePath}:`, err?.message);
    }
  }
  return sortClients(out);
}

/** The client with this code (case-insensitive), or null. */
export async function getClient(fs: VaultFs, code: string): Promise<Client | null> {
  if (!code) return null;
  const clean = String(code).trim().toUpperCase();
  return (await listClients(fs)).find((c) => c.code === clean) ?? null;
}

/** Existing folder for a code: the first `<CODE>_...` folder, any letter case. */
async function findClientFolder(fs: VaultFs, code: string): Promise<string | null> {
  let children: VaultEntry[] = [];
  try {
    children = await fs.listDir(CLIENTS_DIR);
  } catch {
    return null;
  }
  const match = children.find((e) => e.isDir && baseName(e.path).toUpperCase().startsWith(`${code}_`));
  return match ? baseName(match.path) : null;
}

/** Body fields accepted by `saveClient` (camelCase from the UI or snake_case from the file). */
export type ClientInput = Record<string, any>;

/** Creates or updates `client.md`. Unknown frontmatter keys and the body are kept. */
export async function saveClient(fs: VaultFs, input: ClientInput, now: Date): Promise<Client> {
  if (!input || !input.code || !input.name) throw new Error('Company code and name are required.');
  const code = String(input.code).trim().toUpperCase();
  const name = String(input.name).trim();
  if (!CLIENT_CODE.test(code)) throw new Error(`Client code must be 2 to 5 letters (A-Z), got: "${code}"`);
  if (!name) throw new Error('Company code and name are required.');

  const folderName = (await findClientFolder(fs, code)) ?? `${code}_${name.replace(/[^a-zA-Z0-9]/g, '') || 'Client'}`;
  const filePath = `${CLIENTS_DIR}/${folderName}/${CLIENT_FILE}`;

  let existing: Record<string, any> = {};
  let body = `# ${name} (${code})\n\n## Creative Direction\nMindful craft and studio design systems.\n`;
  try {
    const parsed = parseFrontmatter(await fs.readText(filePath));
    existing = parsed.frontmatter || {};
    if (parsed.body && parsed.body.trim()) body = parsed.body;
  } catch {
    // new client
  }

  const palette: ClientPalette = {
    ...(input.palette || existing.palette || { ...DEFAULT_CLIENT_PALETTE, primary: input.color || DEFAULT_CLIENT_PALETTE.primary })
  };
  if (input.color) palette.primary = input.color;

  const merged: Record<string, any> = {
    ...existing,
    id: existing.id || code.toLowerCase(),
    name,
    code,
    shortName: input.shortName || existing.shortName || code,
    contact_person: input.contactPerson || input.contact_person || input.contact || existing.contact_person || '',
    email: input.email || existing.email || '',
    phone: input.phone || existing.phone || '',
    billing_address: input.billingAddress || input.billing_address || input.address || existing.billing_address || '',
    location: input.location || existing.location || '',
    currency: input.currency || existing.currency || 'USD',
    default_hourly_rate: toNumber(input.defaultHourlyRate ?? input.default_hourly_rate, toNumber(existing.default_hourly_rate, 150)),
    payment_terms_days: toNumber(input.paymentTermsDays ?? input.payment_terms_days, toNumber(existing.payment_terms_days, 14)),
    palette,
    tags: input.tags || existing.tags || ['client'],
    status: input.status || existing.status || 'active',
    isParent: input.isParent !== undefined ? Boolean(input.isParent) : code === 'ACME' || Boolean(existing.isParent),
    establishedYear: input.establishedYear || existing.establishedYear || String(now.getFullYear()),
    regNo: input.regNo || input.registration_no || existing.regNo || '',
    updatedAt: now.toISOString()
  };
  // A hand-written `color:` key stays in step with the palette.
  if (merged.color !== undefined) merged.color = palette.primary;

  const validation = validateFrontmatter('client', merged);
  if (!validation.valid) throw new Error(validation.errors.join('; '));

  await fs.writeText(filePath, serializeFrontmatter(validation.data, body));
  return normalizeClient(validation.data, body, folderName, filePath);
}

/** "Delete" = move the client folder to `_Archive/`. */
export async function deleteClient(
  fs: VaultFs,
  code: string
): Promise<{ success: true; deletedCode: string; archivedTo: string }> {
  if (!code) throw new Error('Company code is required.');
  const clean = String(code).trim().toUpperCase();
  const folder = await findClientFolder(fs, clean);
  if (!folder) throw new Error(`Company with code "${code}" not found.`);
  const archivedTo = await fs.moveToArchive(`${CLIENTS_DIR}/${folder}`);
  return { success: true, deletedCode: clean, archivedTo };
}
