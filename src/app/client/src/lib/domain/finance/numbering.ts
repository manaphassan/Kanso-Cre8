/**
 * Finance folders, document numbers and filenames (kanso-vault-schema):
 * `_Finance/Quotes/QUOTE-YYYY-NNN_<CODE>.md` and
 * `_Finance/Invoices/INV-YYYY-NNN_<CODE>.md`, one file per document.
 */

export type DocKind = 'quote' | 'invoice';

export const FINANCE_DIR = '_Finance';
export const QUOTES_DIR = `${FINANCE_DIR}/Quotes`;
export const INVOICES_DIR = `${FINANCE_DIR}/Invoices`;

export const PREFIX: Record<DocKind, string> = { quote: 'QUOTE', invoice: 'INV' };
/** Prefixes counted when numbering; `QTE` is the server's older quote prefix. */
const COUNTED: Record<DocKind, string[]> = { quote: ['QUOTE', 'QTE'], invoice: ['INV'] };

export const dirFor = (kind: DocKind) => (kind === 'quote' ? QUOTES_DIR : INVOICES_DIR);

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** Local calendar date `YYYY-MM-DD` of `now`. */
export function isoDay(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** `YYYY-MM-DD` plus whole days (calendar arithmetic, time zone independent). */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * Next number for the year of `now`: highest existing `PREFIX-YYYY-NNN` + 1.
 * (The server used "count of documents + 1", which repeats a number after a delete.)
 */
export function nextDocumentNumber(existing: string[], kind: DocKind, now: Date): string {
  const year = String(now.getFullYear());
  const re = new RegExp(`^(?:${COUNTED[kind].join('|')})-${year}-(\\d+)`, 'i');
  let max = 0;
  for (const number of existing) {
    const m = re.exec(String(number || ''));
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
  }
  return `${PREFIX[kind]}-${year}-${pad(max + 1, 3)}`;
}

/** Filename-safe document number (the number itself is kept as is in frontmatter). */
export const fileStem = (documentNumber: string) => String(documentNumber).replace(/[^A-Za-z0-9.-]/g, '_');

/** Client code part of the filename: uppercase alphanumerics, default ACME (as the server). */
export const clientPart = (clientCode: string) => String(clientCode || 'ACME').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'ACME';

export const documentFilename = (documentNumber: string, clientCode: string) =>
  `${fileStem(documentNumber)}_${clientPart(clientCode)}.md`;

/** True when a filename (without `.md`) belongs to this document number. */
export function fileMatches(base: string, documentNumber: string, id?: string): boolean {
  const stem = fileStem(documentNumber);
  return base === stem || base.startsWith(`${stem}_`) || (Boolean(id) && base === id);
}
