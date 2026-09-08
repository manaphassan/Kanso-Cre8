/**
 * Kanso Cre8 — Quotes & Invoices Service
 * Markdown & YAML Frontmatter based financial document management.
 */

import type { InvoiceDocument, InvoiceLineItem } from '../types/kanso';

const STORAGE_KEY = 'kanso_cre8_invoices';

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

  private constructor() {
    this.loadDocuments();
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
          return this.documents;
        }
      }
    } catch (e) {
      console.warn('[FinanceService] Load error, using sample data:', e);
    }
    this.documents = [...SAMPLE_INVOICES];
    this.saveDocuments();
    return this.documents;
  }

  public saveDocuments(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.documents));
    } catch (e) {
      console.error('[FinanceService] Save error:', e);
    }
  }

  public getDocuments(): InvoiceDocument[] {
    if (this.documents.length === 0) {
      this.loadDocuments();
    }
    return this.documents;
  }

  public getDocumentById(id: string): InvoiceDocument | undefined {
    return this.documents.find(d => d.id === id);
  }

  public saveDocument(doc: InvoiceDocument): void {
    const index = this.documents.findIndex(d => d.id === doc.id);
    if (index !== -1) {
      this.documents[index] = doc;
    } else {
      this.documents.unshift(doc);
    }
    this.saveDocuments();
  }

  public deleteDocument(id: string): void {
    this.documents = this.documents.filter(d => d.id !== id);
    this.saveDocuments();
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
