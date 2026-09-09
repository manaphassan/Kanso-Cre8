/**
 * Kanso Cre8 — Quotes & Invoices Service
 * Markdown & YAML Frontmatter based financial document management.
 */

import type { InvoiceDocument, InvoiceLineItem } from '../types/kanso';
import { ApiClient } from './api';

const STORAGE_KEY = 'kanso_cre8_invoices';
const QUOTES_STORAGE_KEY = 'kanso_cre8_quotes';

export const SAMPLE_QUOTES: InvoiceDocument[] = [
  {
    id: 'qte-2026-001',
    type: 'quote',
    documentNumber: 'QTE-2026-001',
    date: '2026-09-08',
    dueDate: '2026-09-22',
    validUntil: '2026-09-22',
    status: 'draft',
    clientCode: 'NEX',
    clientName: 'Nexus Studio',
    clientContact: 'Alex Rivera',
    clientEmail: 'billing@nexusstudio.io',
    clientAddress: '550 Howard St, San Francisco, CA 94105',
    freelancerName: 'Harusssani Creative Vault',
    freelancerEmail: 'contact@kansocre8.local',
    freelancerPhone: '+1 (555) 019-2834',
    freelancerAddress: 'San Francisco, CA',
    paymentBank: 'First Creative Bank',
    paymentAccount: '9876-5432-1098',
    paymentAccountName: 'Harusssani Manaphassan',
    currency: 'USD',
    hourlyRate: 140,
    items: [
      {
        id: 'it_1',
        description: 'Cyberpunk Game Launch Key Visuals & Motion Blockout',
        quantity: 20,
        unitPrice: 140,
        amount: 2800
      },
      {
        id: 'it_2',
        description: 'Kinetic Typography Teaser Reel (15s & 30s Deliverables)',
        quantity: 15,
        unitPrice: 140,
        amount: 2100
      }
    ],
    taxRatePercent: 0,
    subtotal: 4900,
    taxAmount: 0,
    total: 4900,
    notes: 'Estimate valid for 14 days from issue date. Includes 2 rounds of creative revisions.'
  }
];

export const SAMPLE_INVOICES: InvoiceDocument[] = [
  {
    id: 'inv-2026-001',
    type: 'invoice',
    documentNumber: 'INV-2026-001',
    date: '2026-09-09',
    dueDate: '2026-09-23',
    status: 'sent',
    clientCode: 'ACME',
    clientName: 'Acme Corporation',
    clientContact: 'Sarah Jenkins',
    clientEmail: 'billing@acmefintech.io',
    clientAddress: '100 Market St, Suite 400, San Francisco, CA 94105',
    freelancerName: 'Harusssani Creative Vault',
    freelancerEmail: 'contact@kansocre8.local',
    freelancerPhone: '+1 (555) 019-2834',
    freelancerAddress: 'San Francisco, CA',
    paymentBank: 'First Creative Bank',
    paymentAccount: '9876-5432-1098',
    paymentAccountName: 'Harusssani Manaphassan',
    currency: 'USD',
    items: [
      {
        id: '1',
        description: '50% Project Deposit: Mobile Banking 3D Isometric Illustrations (3 Sets)',
        quantity: 1,
        unitPrice: 1750,
        amount: 1750
      },
      {
        id: '2',
        description: 'Design System Asset Kit & Custom SVG Icon Pack (16 Icons)',
        quantity: 1,
        unitPrice: 500,
        amount: 500
      }
    ],
    taxRatePercent: 8,
    subtotal: 2250,
    taxAmount: 180,
    total: 2430,
    notes: 'Payment is due within 14 days of invoice date via direct wire or ACH transfer. Thank you for your business!',
    linkedProjectId: '202609_0001_ACME_MobileAppIllustration'
  },
  {
    id: 'inv-2026-002',
    type: 'invoice',
    documentNumber: 'INV-2026-002',
    date: '2026-09-05',
    dueDate: '2026-09-19',
    status: 'paid',
    clientCode: 'NEX',
    clientName: 'Nexus Studio',
    clientContact: 'Marcus Vance',
    clientEmail: 'marcus@nexusstudio.io',
    clientAddress: '540 Arts District Blvd, Los Angeles, CA 90013',
    freelancerName: 'Harusssani Creative Vault',
    freelancerEmail: 'contact@kansocre8.local',
    freelancerPhone: '+1 (555) 019-2834',
    freelancerAddress: 'San Francisco, CA',
    paymentBank: 'First Creative Bank',
    paymentAccount: '9876-5432-1098',
    paymentAccountName: 'Harusssani Manaphassan',
    currency: 'USD',
    items: [
      {
        id: '1',
        description: 'Key Visual Concept Artwork & Launch Motion Graphics (9:16 + 1:1)',
        quantity: 1,
        unitPrice: 2200,
        amount: 2200
      }
    ],
    taxRatePercent: 0,
    subtotal: 2200,
    taxAmount: 0,
    total: 2200,
    notes: 'Approved & Signed off. Receipt generated automatically upon settlement.',
    linkedProjectId: '202609_0002_NEX_GameKeyVisual'
  }
];

export class FinanceService {
  private static instance: FinanceService;
  private documents: InvoiceDocument[] = [];
  private quotes: InvoiceDocument[] = [];

  private constructor() {
    this.loadDocuments();
    this.loadQuotes();
  }

  public static getInstance(): FinanceService {
    if (!FinanceService.instance) {
      FinanceService.instance = new FinanceService();
    }
    return FinanceService.instance;
  }

  public loadDocuments(): InvoiceDocument[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.documents = parsed;
          this.fetchDiskInvoices();
          return this.documents;
        }
      }
    } catch (e) {
      console.warn('[FinanceService] Load error, using sample data:', e);
    }
    this.documents = [...SAMPLE_INVOICES];
    this.saveDocuments();
    this.fetchDiskInvoices();
    return this.documents;
  }

  public async fetchDiskInvoices(): Promise<InvoiceDocument[]> {
    try {
      const res = await ApiClient.getInvoices();
      if (res && res.success && Array.isArray(res.invoices) && res.invoices.length > 0) {
        this.documents = res.invoices as InvoiceDocument[];
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.documents));
        }
        return this.documents;
      }
    } catch (e) {
      // Offline local-first fallback
    }
    return this.documents;
  }

  public saveDocuments(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.documents));
    } catch (e) {
      console.error('[FinanceService] Save error:', e);
    }
  }

  public loadQuotes(): InvoiceDocument[] {
    try {
      const stored = localStorage.getItem(QUOTES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.quotes = parsed;
          this.fetchDiskQuotes();
          return this.quotes;
        }
      }
    } catch (e) {
      console.warn('[FinanceService] Load quotes error, using sample data:', e);
    }
    this.quotes = [...SAMPLE_QUOTES];
    this.saveQuotes();
    this.fetchDiskQuotes();
    return this.quotes;
  }

  public async fetchDiskQuotes(): Promise<InvoiceDocument[]> {
    try {
      const res = await ApiClient.getQuotes();
      if (res && res.success && Array.isArray(res.quotes) && res.quotes.length > 0) {
        this.quotes = res.quotes as InvoiceDocument[];
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(this.quotes));
        }
        return this.quotes;
      }
    } catch (e) {}
    return this.quotes;
  }

  public saveQuotes(): void {
    try {
      localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(this.quotes));
    } catch (e) {}
  }

  public getDocuments(): InvoiceDocument[] {
    if (this.documents.length === 0) {
      this.loadDocuments();
    }
    return this.documents;
  }

  public getInvoices(): InvoiceDocument[] {
    return this.getDocuments().filter(d => d.type === 'invoice');
  }

  public getQuotes(): InvoiceDocument[] {
    if (this.quotes.length === 0) {
      this.loadQuotes();
    }
    return this.quotes;
  }

  public getQuoteById(id: string): InvoiceDocument | undefined {
    return this.getQuotes().find(q => q.id === id || q.documentNumber === id);
  }

  public saveInvoice(doc: InvoiceDocument): void {
    this.saveDocument(doc);
  }

  public saveQuote(quote: InvoiceDocument): void {
    quote.type = 'quote';
    const idx = this.quotes.findIndex(q => q.id === quote.id || q.documentNumber === quote.documentNumber);
    if (idx !== -1) {
      this.quotes[idx] = quote;
    } else {
      this.quotes.unshift(quote);
    }
    this.saveQuotes();
    ApiClient.saveQuote(quote).catch(() => {});
  }

  public getDocumentById(id: string): InvoiceDocument | undefined {
    return this.documents.find(d => d.id === id) || this.quotes.find(q => q.id === id);
  }

  public saveDocument(doc: InvoiceDocument): void {
    if (doc.type === 'quote') {
      return this.saveQuote(doc);
    }
    const index = this.documents.findIndex(d => d.id === doc.id);
    if (index !== -1) {
      this.documents[index] = doc;
    } else {
      this.documents.unshift(doc);
    }
    this.saveDocuments();

    // Persist asynchronously to physical vault
    ApiClient.saveInvoice(doc).catch(() => {});
  }

  public async deleteQuote(id: string): Promise<void> {
    this.quotes = this.quotes.filter(q => q.id !== id && q.documentNumber !== id);
    this.saveQuotes();
    try {
      await ApiClient.deleteQuote(id);
    } catch (e) {}
  }

  public async deleteInvoice(id: string): Promise<void> {
    this.documents = this.documents.filter(d => d.id !== id && d.documentNumber !== id);
    this.saveDocuments();
    try {
      await ApiClient.deleteInvoice(id);
    } catch (e) {}
  }

  public async convertQuoteToInvoice(quoteId: string): Promise<{ quote: InvoiceDocument; invoice: InvoiceDocument } | null> {
    try {
      const res = await ApiClient.convertQuoteToInvoice(quoteId);
      if (res && res.success) {
        const quote = res.quote as InvoiceDocument;
        const invoice = res.invoice as InvoiceDocument;

        const qIdx = this.quotes.findIndex(q => q.id === quote.id || q.documentNumber === quote.documentNumber);
        if (qIdx !== -1) this.quotes[qIdx] = quote;
        this.saveQuotes();

        const invIdx = this.documents.findIndex(d => d.id === invoice.id || d.documentNumber === invoice.documentNumber);
        if (invIdx !== -1) {
          this.documents[invIdx] = invoice;
        } else {
          this.documents.unshift(invoice);
        }
        this.saveDocuments();

        return { quote, invoice };
      }
    } catch (err) {
      console.warn('[FinanceService] convertQuoteToInvoice failed:', err);
    }
    return null;
  }

  public deleteDocument(id: string): void {
    this.deleteInvoice(id);
    this.deleteQuote(id);
  }

  public async appendSession(clientCode: string, sessionLog: any): Promise<InvoiceDocument | null> {
    try {
      const res = await ApiClient.appendSessionToInvoice(clientCode, sessionLog);
      if (res && res.success && res.invoice) {
        const inv = res.invoice as InvoiceDocument;
        const idx = this.documents.findIndex(d => d.id === inv.id || d.documentNumber === inv.documentNumber);
        if (idx !== -1) {
          this.documents[idx] = inv;
        } else {
          this.documents.unshift(inv);
        }
        this.saveDocuments();
        return inv;
      }
    } catch (err) {
      console.warn('[FinanceService] Disk append failed, using local append fallback:', err);
    }

    // Local fallback
    const draftInv = this.documents.find(inv => inv.clientCode === clientCode && (inv.status === 'draft' || inv.status === 'sent')) || this.documents[0];
    if (draftInv) {
      const durationHours = Math.max(0.1, Math.round((sessionLog.durationSeconds / 3600) * 100) / 100);
      const lineAmount = Math.round(durationHours * (sessionLog.hourlyRate || draftInv.hourlyRate || 125) * 100) / 100;

      draftInv.items.push({
        id: `item_${Date.now()}`,
        description: `${sessionLog.projectTitle || 'Design Sprint'}: ${sessionLog.note || 'Creative session'} (${sessionLog.durationFormatted || `${durationHours}h`})`,
        quantity: durationHours,
        unitPrice: sessionLog.hourlyRate || draftInv.hourlyRate || 125,
        amount: lineAmount
      });
      draftInv.subtotal = draftInv.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      draftInv.total = draftInv.subtotal + (draftInv.taxAmount || 0);
      this.saveDocument(draftInv);
      return draftInv;
    }
    return null;
  }

  public getIncomeSummary(): { paid: number; pending: number; total: number } {
    const invoices = this.getDocuments().filter(d => d.type === 'invoice');
    const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const pending = invoices.filter(i => i.status === 'sent' || i.status === 'draft').reduce((s, i) => s + (i.total || 0), 0);
    return { paid, pending, total: paid + pending };
  }

  /**
   * Serializes the document into standard YAML frontmatter + Markdown
   */
  public toMarkdown(doc: InvoiceDocument): string {
    const yaml = [
      '---',
      `type: "${doc.type}"`,
      `document_number: "${doc.documentNumber}"`,
      `date: ${doc.date}`,
      `due_date: ${doc.dueDate}`,
      `status: "${doc.status}"`,
      `client_code: "${doc.clientCode}"`,
      `client_name: "${doc.clientName}"`,
      `client_contact: "${doc.clientContact}"`,
      `client_email: "${doc.clientEmail}"`,
      `client_address: "${doc.clientAddress.replace(/\n/g, ', ')}"`,
      `freelancer_name: "${doc.freelancerName}"`,
      `freelancer_email: "${doc.freelancerEmail}"`,
      `payment_bank: "${doc.paymentBank}"`,
      `payment_account: "${doc.paymentAccount}"`,
      `payment_account_name: "${doc.paymentAccountName}"`,
      `currency: "${doc.currency}"`,
      'items:',
      ...doc.items.map(i => `  - description: "${i.description}"\n    quantity: ${i.quantity}\n    unit_price: ${i.unitPrice}\n    amount: ${i.amount}`),
      `tax_rate_percent: ${doc.taxRatePercent}`,
      `subtotal: ${doc.subtotal}`,
      `tax_amount: ${doc.taxAmount}`,
      `total: ${doc.total}`,
      `notes: "${doc.notes.replace(/\n/g, ' ')}"`,
      doc.validUntil ? `valid_until: ${doc.validUntil}` : '',
      doc.linkedQuoteId ? `linked_quote_id: "${doc.linkedQuoteId}"` : '',
      doc.linkedInvoiceId ? `linked_invoice_id: "${doc.linkedInvoiceId}"` : '',
      doc.linkedProjectId ? `linked_project_id: "${doc.linkedProjectId}"` : '',
      '---',
      '',
      `# ${doc.type.toUpperCase()} #${doc.documentNumber}`,
      `Billed to: ${doc.clientName} (${doc.clientContact})`,
      `Total Amount: ${doc.currency} ${doc.total.toFixed(2)}`
    ].filter(Boolean).join('\n');

    return yaml;
  }
}

export const financeService = FinanceService.getInstance();
