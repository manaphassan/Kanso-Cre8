/**
 * Standalone printable HTML for a quote or invoice. Port of
 * FinanceVaultService.generateStandaloneHtml. Pure: no fs, no clock.
 *
 * `studio` is the studio profile as getStudioProfile returns it (canonical
 * keys; the server's legacy keys are read as fallbacks). `client` supplies the
 * accent colour (palette primary in client.md) and missing contact fields.
 */

import { DEFAULT_CLIENT_PALETTE, type Client } from '../clients';
import { escapeHtml } from '../export/summaryHtml';
import type { FinanceDocument } from './model';
import { clientPart, fileStem } from './numbering';
import { documentCss } from './htmlStyle';

type Studio = Record<string, any> | null | undefined;

const HEX = /^#[0-9a-fA-F]{3,8}$/;

/** First non-empty value as a string. */
const pick = (...values: unknown[]) => String(values.find((v) => v !== undefined && v !== null && v !== '') ?? '');

export function formatMoney(amount: unknown, currency: string): string {
  const digits = currency === 'JPY' ? 0 : 2;
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(digits)}`;
  }
}

/** Download name, e.g. `INV-2026-001_ACME.html`. */
export const documentHtmlFilename = (doc: Pick<FinanceDocument, 'documentNumber' | 'clientCode'>) =>
  `${fileStem(doc.documentNumber)}_${clientPart(doc.clientCode)}.html`;

/** Accent colour: the client's palette, else the default palette (only hex values reach the CSS). */
export function clientAccent(client: Client | null | undefined): string {
  const color = String(client?.color || client?.palette?.primary || '');
  return HEX.test(color) ? color : DEFAULT_CLIENT_PALETTE.primary;
}

function stampHtml(doc: FinanceDocument): string {
  const stamp = doc.stamp && doc.stamp !== 'none' ? doc.stamp.toLowerCase() : '';
  if (stamp === 'paid' || stamp === 'approved' || stamp === 'draft') {
    return `<div class="tactile-stamp stamp-${stamp}">${stamp.toUpperCase()}</div>`;
  }
  if (stamp === 'seal') {
    const year = /^\d{4}/.exec(doc.date || '')?.[0] ?? '';
    return `<div class="tactile-stamp stamp-seal"><div class="seal-ring"><span class="seal-code">${escapeHtml(doc.clientCode || 'KANSO')}</span><span class="seal-word">OFFICIAL</span><span class="seal-year">${year}</span></div></div>`;
  }
  return '';
}

const isImageSource = (src: string) => /^(data:image\/|https?:\/\/|asset:)/i.test(src);

function signatureHtml(s: Record<string, any>): string {
  const image = pick(s.signature_url, s.digitalSignature && isImageSource(s.digitalSignature) ? s.digitalSignature : '');
  if (image && isImageSource(image)) return `<img src="${escapeHtml(image)}" alt="Signature" class="sig-img" />`;
  const text = pick(s.signature_text, s.digitalSignature, s.freelancerName, s.principalName, 'Principal Director');
  return `<div class="sig-text">${escapeHtml(text)}</div>`;
}

function remittanceHtml(doc: FinanceDocument, s: Record<string, any>): string {
  const routing = [
    s.swift_bic ? `SWIFT: ${s.swift_bic}` : '',
    s.duitnow_id ? `DuitNow: ${s.duitnow_id}` : ''
  ].filter(Boolean).join(' / ') || pick(s.paymentSwiftOrQr);
  return `<p class="terms-mono">
            Bank: <strong>${escapeHtml(pick(doc.paymentBank, s.bankName, s.paymentBank))}</strong><br>
            Account: <strong>${escapeHtml(pick(doc.paymentAccount, s.accountNumber, s.paymentAccountNo))}</strong> (${escapeHtml(pick(doc.paymentAccountName, s.accountHolder, s.paymentAccountName, doc.freelancerName))})<br>
            ${routing ? `Routing / SWIFT: <strong>${escapeHtml(routing)}</strong>` : ''}
          </p>`;
}

function itemsHtml(doc: FinanceDocument, money: (n: unknown) => string): string {
  return (doc.items || [])
    .map(
      (it) => `
          <tr>
            <td class="col-desc">${escapeHtml(it.description)}</td>
            <td class="col-qty">${escapeHtml(it.quantity)}</td>
            <td class="col-rate">${money(it.unitPrice)}</td>
            <td class="col-amount">${money(it.amount)}</td>
          </tr>`
    )
    .join('');
}

export function renderDocumentHtml(doc: FinanceDocument, studio: Studio, client: Client | null): string {
  const s = studio || {};
  const currency = doc.currency || 'USD';
  const money = (n: unknown) => escapeHtml(formatMoney(n, currency));
  const isQuote = doc.type === 'quote';
  const theme = /^[a-z0-9-]+$/i.test(doc.theme || '') ? doc.theme : 'geist';
  const accent = clientAccent(client);
  const clientCode = String(doc.clientCode || '').toUpperCase();

  const logo = pick(s.logo_url, s.logo);
  const logoHtml = logo && isImageSource(logo) ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(doc.freelancerName)}" class="studio-logo" />` : '';
  const tagline = pick(s.tagline);
  const clientContact = pick(doc.clientContact, client?.contactPerson);
  const clientEmail = pick(doc.clientEmail, client?.email);
  const clientAddress = pick(doc.clientAddress, client?.billingAddress);
  const until = isQuote ? pick(doc.validUntil, doc.dueDate) : doc.dueDate;

  const swatch = doc.showClientAccent
    ? `
      <div class="swatch-bar">
        <span>Client Palette:</span>
        <div class="swatch-pill">
          <span class="swatch-dot"></span>
          <span>${escapeHtml(clientCode)}: ${accent}</span>
        </div>
      </div>`
    : '';

  const fiscal = doc.tin || doc.sstRegistrationNo
    ? `<div class="fiscal-row">
              ${doc.tin ? `<span class="fiscal-chip">TIN: <strong>${escapeHtml(doc.tin)}</strong></span>` : ''}
              ${doc.sstRegistrationNo ? `<span class="fiscal-chip">SST: <strong>${escapeHtml(doc.sstRegistrationNo)}</strong></span>` : ''}
            </div>`
    : '';

  const buyerFiscal = doc.buyerTin || doc.buyerSstNo
    ? `<div class="fiscal-row">
            ${doc.buyerTin ? `<span class="fiscal-chip">Buyer TIN: <strong>${escapeHtml(doc.buyerTin)}</strong></span>` : ''}
            ${doc.buyerSstNo ? `<span class="fiscal-chip">Buyer SST: <strong>${escapeHtml(doc.buyerSstNo)}</strong></span>` : ''}
          </div>`
    : '';

  const tax = Number(doc.taxRatePercent) > 0
    ? `
          <div class="total-row">
            <span>${escapeHtml(doc.taxLabel || 'Tax')} (${escapeHtml(doc.taxRatePercent)}%):</span>
            <span class="money">${money(doc.taxAmount)}</span>
          </div>`
    : '';

  const terms = isQuote
    ? `<p>${escapeHtml(pick(s.defaultPaymentTerms, 'To accept this proposal, reply with formal approval or signed purchase order. Work begins upon initial deposit settlement.'))}</p>`
    : remittanceHtml(doc, s);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.documentNumber)} - ${escapeHtml(doc.clientName)}</title>
  <style>${documentCss(accent)}</style>
</head>
<body>
  <div class="doc-container">
    <div class="print-toolbar print-btn">
      <button onclick="window.print()" class="btn">Print / Save PDF</button>
    </div>

    <div class="paper-card theme-${theme}">
      ${stampHtml(doc)}
      ${swatch}

      <div class="header-row">
        <div class="studio-brand">
          ${logoHtml}
          <div>
            <h1 class="studio-title">${escapeHtml(pick(doc.freelancerName, s.studioName, 'Creative Studio'))}</h1>
            ${tagline ? `<div class="studio-tagline">${escapeHtml(tagline)}</div>` : ''}
            <div class="studio-contact">
              ${escapeHtml(pick(doc.freelancerAddress, s.address, s.studioAddress))}<br>
              ${escapeHtml(pick(doc.freelancerEmail, s.email, s.billingEmail))}
              ${doc.freelancerPhone ? ` &middot; ${escapeHtml(doc.freelancerPhone)}` : ''}
            </div>
            ${fiscal}
          </div>
        </div>

        <div class="doc-meta-right">
          <div class="doc-type-label">${isQuote ? 'Creative Proposal &amp; Quote' : 'Commercial Invoice'}</div>
          <div class="doc-number">${escapeHtml(doc.documentNumber)}</div>
          <div class="doc-status">${escapeHtml(doc.status)}</div>
        </div>
      </div>

      <div class="info-grid">
        <div>
          <div class="info-label">Billed To</div>
          <div class="client-name">${escapeHtml(doc.clientName)}</div>
          <div class="client-contact">
            ${clientContact ? `Attn: ${escapeHtml(clientContact)}<br>` : ''}
            ${clientEmail ? `${escapeHtml(clientEmail)}<br>` : ''}
            ${escapeHtml(clientAddress)}
          </div>
          ${buyerFiscal}
        </div>

        <div class="dates-right">
          <div>
            <div class="info-label">Issue Date</div>
            <div class="date-val">${escapeHtml(doc.date)}</div>
          </div>
          <div>
            <div class="info-label">${isQuote ? 'Valid Until' : 'Due Date'}</div>
            <div class="date-val">${escapeHtml(until)}</div>
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Deliverable &amp; Scope</th>
            <th class="col-qty">Hours / Qty</th>
            <th class="col-rate">Rate</th>
            <th class="col-amount">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml(doc, money)}
        </tbody>
      </table>

      <div class="totals-box">
        <div class="totals-list">
          <div class="total-row">
            <span>Subtotal:</span>
            <span class="money">${money(doc.subtotal)}</span>
          </div>${tax}
          <div class="total-row grand">
            <span>Total:</span>
            <span class="money">${money(doc.total)}</span>
          </div>
        </div>
      </div>

      <div class="terms-box">
        <div class="terms-title">${isQuote ? 'Proposal Acceptance Terms' : 'Remittance Instructions'}</div>
        ${terms}
        ${doc.notes ? `<p class="terms-notes">${escapeHtml(doc.notes)}</p>` : ''}
      </div>

      <div class="footer-row">
        <div>${escapeHtml(pick(s.footerNotice, 'Crafted with mindful focus & precision in Kanso Cre8.'))}</div>
        <div class="sig-block">
          <div class="sig-label">Authorized Seal &amp; Signature</div>
          ${signatureHtml(s)}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;
}
