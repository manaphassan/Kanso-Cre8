/**
 * Kanso Cre8 — Universal Type Definitions
 * Offline-First Markdown-as-Database Architecture
 */

export interface ClientPalette {
  primary: string;
  secondary: string;
  dark: string;
  light?: string;
  accent: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  code: string; // e.g. "GOV", "JOM", "SSH"
  contactPerson: string;
  email: string;
  phone?: string;
  billingAddress: string;
  currency: string; // "MYR", "USD", "SGD", etc.
  defaultHourlyRate: number;
  paymentTermsDays: number;
  palette: ClientPalette;
  notes?: string;
  activeProjectsCount?: number;
  totalInvoiced?: number;
}

export interface ProjectFrontmatter {
  id: string; // e.g. "202609_0001_GOV"
  title: string;
  client: string;
  client_code: string;
  status: 'backlog' | 'in-progress' | 'review' | 'revision' | 'done';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  due_date: string;
  budget?: number;
  currency?: string;
  quote_ref?: string;
  invoice_ref?: string;
  canva_url?: string;
  figma_url?: string;
  revisions_count?: number;
  tags?: string[];
  designer?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceDocument {
  id: string;
  type: 'quote' | 'invoice';
  documentNumber: string; // e.g. "INV-2026-001" or "QUOTE-2026-001"
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  
  // Client info
  clientCode: string;
  clientName: string;
  clientContact: string;
  clientEmail: string;
  clientAddress: string;

  // Freelancer info
  freelancerName: string;
  freelancerEmail: string;
  freelancerPhone: string;
  freelancerAddress: string;
  paymentBank: string;
  paymentAccount: string;
  paymentAccountName: string;

  // Items & Calculations
  currency: string;
  items: InvoiceLineItem[];
  taxRatePercent: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string;
  linkedProjectId?: string;
}
