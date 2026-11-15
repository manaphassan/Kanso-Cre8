/**
 * Quotes and invoices in the vault. Port of FinanceVaultService get/save/delete.
 * One file per document; "delete" moves the file to `_Archive/`.
 *
 * New documents are stamped: empty studio fields from `_Team/_Config/studio_profile.json`
 * (getStudioProfile), empty client fields from `_Clients/<CODE>_*\/client.md` (getClient).
 * Existing documents keep what they have (an issued invoice does not change
 * when the studio profile changes).
 */

import type { VaultEntry, VaultFs } from '$lib/vault/types';
import { getClient, type Client } from '../clients';
import { getStudioProfile } from '../config';
import { addDays, dirFor, documentFilename, fileMatches, isoDay, nextDocumentNumber, type DocKind } from './numbering';
import {
  parseDocument,
  serializeDocument,
  splitDocument,
  storedId,
  studioDefaults,
  type DocumentInput,
  type Existing,
  type FinanceDocument,
  type StudioDefaults
} from './model';

interface DocFile {
  path: string;
  filename: string;
  text: string;
}

async function readFolder(fs: VaultFs, kind: DocKind): Promise<DocFile[]> {
  const dir = dirFor(kind);
  let entries: VaultEntry[] = [];
  try {
    entries = await fs.scan(dir);
  } catch {
    return []; // folder not created yet
  }
  const out: DocFile[] = [];
  for (const e of entries) {
    const filename = e.path.slice(dir.length + 1);
    if (e.isDir || filename.includes('/') || !filename.endsWith('.md')) continue;
    try {
      out.push({ path: e.path, filename, text: e.text ?? (await fs.readText(e.path)) });
    } catch {
      // unreadable file: skipped, as the server did
    }
  }
  return out;
}

const byDateDesc = (a: FinanceDocument, b: FinanceDocument) => String(b.date || '').localeCompare(String(a.date || ''));

/** Studio fallbacks for reading; never throws (missing profile -> sample defaults). */
export async function readDefaults(fs: VaultFs): Promise<StudioDefaults> {
  try {
    return studioDefaults(await getStudioProfile(fs));
  } catch {
    return {};
  }
}

export async function listDocuments(fs: VaultFs, kind: DocKind, now: Date, defaults?: StudioDefaults): Promise<FinanceDocument[]> {
  const files = await readFolder(fs, kind);
  const fallback = defaults ?? (files.length ? await readDefaults(fs) : {});
  const docs: FinanceDocument[] = [];
  for (const f of files) {
    try {
      const doc = parseDocument(f.text, f.filename, now, fallback);
      if (kind === 'quote') doc.type = 'quote';
      docs.push(doc);
    } catch {
      // skipped, as the server did
    }
  }
  return docs.sort(byDateDesc);
}

export const listInvoices = (fs: VaultFs, now: Date, defaults?: StudioDefaults) => listDocuments(fs, 'invoice', now, defaults);
export const listQuotes = (fs: VaultFs, now: Date, defaults?: StudioDefaults) => listDocuments(fs, 'quote', now, defaults);

/** Match by read id, stored id or document number (case-insensitive). */
export function findDocument(docs: FinanceDocument[], idOrNumber: string): FinanceDocument | null {
  const target = String(idOrNumber || '').toLowerCase();
  if (!target) return null;
  return (
    docs.find(
      (d) =>
        d.id.toLowerCase() === target ||
        storedId(d.id).toLowerCase() === target ||
        d.documentNumber.toLowerCase() === target
    ) ?? null
  );
}

export async function getDocument(fs: VaultFs, kind: DocKind, idOrNumber: string, now: Date): Promise<FinanceDocument | null> {
  return findDocument(await listDocuments(fs, kind, now), idOrNumber);
}

export const getInvoice = (fs: VaultFs, id: string, now: Date) => getDocument(fs, 'invoice', id, now);
export const getQuote = (fs: VaultFs, id: string, now: Date) => getDocument(fs, 'quote', id, now);

/** Next free number for the current year (e.g. `INV-2026-004`). */
export async function nextNumber(fs: VaultFs, kind: DocKind, now: Date): Promise<string> {
  const docs = await listDocuments(fs, kind, now, {});
  return nextDocumentNumber(docs.map((d) => d.documentNumber), kind, now);
}

const blank = (v: unknown) => v === undefined || v === null || v === '';

/** Fills empty studio and client fields of a new document. */
export function stampDocument(doc: DocumentInput, studio: Record<string, any>, client: Client | null, now: Date): DocumentInput {
  const out: DocumentInput = { ...doc };
  const set = (key: string, value: unknown) => {
    if (blank(out[key]) && !blank(value)) out[key] = value;
  };
  for (const [key, value] of Object.entries(studioDefaults(studio))) set(key, value);
  if (client) {
    set('clientName', client.name);
    set('clientContact', client.contactPerson);
    set('clientEmail', client.email);
    set('clientAddress', client.billingAddress);
    set('currency', client.currency);
    set('hourlyRate', client.defaultHourlyRate || undefined);
  }
  set('currency', studio?.defaultCurrency);
  const given = /^\d{4}-\d{2}-\d{2}/.exec(String(out.date || ''));
  const date = given ? given[0] : isoDay(now);
  set('date', date);
  set('dueDate', addDays(date, client?.paymentTermsDays ?? 14));
  return out;
}

export interface SaveResult {
  document: FinanceDocument;
  path: string;
  created: boolean;
  /** Where the previous file went when the client code (and so the filename) changed. */
  archivedFrom?: string;
}

/**
 * Creates or replaces the file for `input.documentNumber`. Missing number ->
 * next free number (the server used a random one). Throws on empty input.
 */
export async function saveDocument(fs: VaultFs, kind: DocKind, input: DocumentInput, now: Date): Promise<SaveResult> {
  if (!input || typeof input !== 'object') throw new Error(`${kind === 'quote' ? 'Quote' : 'Invoice'} data is required.`);
  const files = await readFolder(fs, kind);
  const documentNumber = String(input.documentNumber || storedId(input.id) || '').trim() ||
    nextDocumentNumber(files.map((f) => String(splitDocument(f.text).frontmatter.documentNumber || f.filename)), kind, now);

  let doc: DocumentInput = {
    ...input,
    type: kind,
    documentNumber,
    id: storedId(input.id) || documentNumber.toLowerCase(),
    clientCode: String(input.clientCode || 'ACME').trim().toUpperCase()
  };

  const previous = files.find((f) => fileMatches(f.filename.replace(/\.md$/, ''), documentNumber));
  let existing: Existing | null = null;
  if (previous) {
    const { frontmatter, body } = splitDocument(previous.text);
    existing = { frontmatter, body };
  } else {
    const studio = await getStudioProfile(fs).catch(() => ({}) as Record<string, any>);
    const client = await getClient(fs, String(doc.clientCode)).catch(() => null);
    doc = stampDocument(doc, studio, client, now);
  }

  const filename = documentFilename(documentNumber, String(doc.clientCode));
  const path = `${dirFor(kind)}/${filename}`;
  const text = serializeDocument(doc, kind, now, existing);

  let archivedFrom: string | undefined;
  if (previous && previous.path !== path) {
    // Client code changed: the old filename is archived, never deleted.
    const caseOnly = previous.path.toLowerCase() === path.toLowerCase();
    if (caseOnly) await fs.moveToArchive(previous.path);
    await fs.writeText(path, text);
    if (!caseOnly) await fs.moveToArchive(previous.path);
    archivedFrom = previous.path;
  } else {
    await fs.writeText(path, text);
  }

  const document = parseDocument(text, filename, now, await readDefaults(fs));
  if (kind === 'quote') document.type = 'quote';
  return { document, path, created: !previous, archivedFrom };
}

export const saveInvoice = async (fs: VaultFs, input: DocumentInput, now: Date) => (await saveDocument(fs, 'invoice', input, now)).document;
export const saveQuote = async (fs: VaultFs, input: DocumentInput, now: Date) => (await saveDocument(fs, 'quote', input, now)).document;

/** Archives the document's file. Returns the archive path, or null when not found. */
export async function archiveDocument(fs: VaultFs, kind: DocKind, idOrNumber: string, now: Date): Promise<string | null> {
  const doc = await getDocument(fs, kind, idOrNumber, now);
  if (!doc) return null;
  const files = (await readFolder(fs, kind)).map((f) => ({ ...f, base: f.filename.replace(/\.md$/, '') }));
  // The read id is `<storedId>__<file base>` (or just the base): archive exactly that file.
  const base = doc.id.includes('__') ? doc.id.slice(doc.id.indexOf('__') + 2) : storedId(doc.id);
  const file = files.find((f) => f.base === base) ?? files.find((f) => fileMatches(f.base, doc.documentNumber, storedId(doc.id)));
  return file ? fs.moveToArchive(file.path) : null;
}

export const deleteInvoice = (fs: VaultFs, id: string, now: Date) => archiveDocument(fs, 'invoice', id, now);
export const deleteQuote = (fs: VaultFs, id: string, now: Date) => archiveDocument(fs, 'quote', id, now);
