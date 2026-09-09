const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const config = require('../config');

class FinanceVaultService {
  static getFinanceRootDir() {
    let wsRoot = config.WORKSPACE_ROOT;
    try {
      const WorkspaceService = require('./WorkspaceService');
      if (WorkspaceService && WorkspaceService.workspaceRoot) {
        wsRoot = WorkspaceService.workspaceRoot;
      }
    } catch (e) {}
    return path.join(wsRoot, '_Finance');
  }

  static getInvoicesDir() {
    const dir = path.join(this.getFinanceRootDir(), 'Invoices');
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    return dir;
  }

  static getQuotesDir() {
    const dir = path.join(this.getFinanceRootDir(), 'Quotes');
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    return dir;
  }

  static parseInvoiceMarkdown(rawContent, filename) {
    let body = (rawContent || '').replace(/^\uFEFF/, '');
    let fm = {};

    const fmMatch = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (fmMatch) {
      try {
        fm = yaml.load(fmMatch[1]) || {};
      } catch (e) {
        try {
          // If unquoted colon caused YAML syntax error in description, auto-quote description: lines
          const sanitizedYaml = fmMatch[1].replace(/^( +-\s*description:\s*)(.*)$/gm, (m, p1, p2) => {
            const trimmed = p2.trim();
            if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return m;
            return `${p1}"${trimmed.replace(/"/g, '\\"')}"`;
          });
          fm = yaml.load(sanitizedYaml) || {};
        } catch (e2) {
          console.warn('[FinanceVaultService] YAML parse error:', e.message);
        }
      }
      body = fmMatch[2] || '';
    }

    const docNumber = fm.documentNumber || fm.id || path.basename(filename, '.md');
    const items = (fm.items || []).map((it, idx) => ({
      id: it.id || `item_${idx + 1}`,
      description: it.description || 'Creative Services',
      quantity: Number(it.quantity !== undefined ? it.quantity : (it.hours !== undefined ? it.hours : 1)),
      unitPrice: Number(it.unitPrice !== undefined ? it.unitPrice : (it.rate !== undefined ? it.rate : 0)),
      amount: Number(it.amount !== undefined ? it.amount : 0)
    }));

    const subtotal = Number(fm.subtotal !== undefined ? fm.subtotal : items.reduce((sum, it) => sum + it.amount, 0));
    const taxRatePercent = Number(fm.taxRatePercent !== undefined ? fm.taxRatePercent : (fm.tax_percent !== undefined ? fm.tax_percent : 0));
    const taxAmount = Number(fm.taxAmount !== undefined ? fm.taxAmount : (fm.tax_amount !== undefined ? fm.tax_amount : (subtotal * taxRatePercent / 100)));
    const total = Number(fm.total !== undefined ? fm.total : (subtotal + taxAmount));

    return {
      id: fm.id || docNumber.toLowerCase(),
      type: fm.type || (docNumber.startsWith('QTE') ? 'quote' : 'invoice'),
      documentNumber: docNumber,
      date: fm.date || new Date().toISOString().split('T')[0],
      dueDate: fm.dueDate || fm.due_date || fm.validUntil || fm.valid_until || new Date().toISOString().split('T')[0],
      validUntil: fm.validUntil || fm.valid_until || fm.dueDate || fm.due_date || new Date().toISOString().split('T')[0],
      status: fm.status || 'draft',
      clientCode: fm.clientCode || fm.client_code || 'ACME',
      clientName: fm.clientName || fm.client_name || 'Acme Corporation',
      clientContact: fm.clientContact || fm.client_contact || '',
      clientEmail: fm.clientEmail || fm.client_email || '',
      clientAddress: fm.clientAddress || fm.client_address || '',
      freelancerName: fm.freelancerName || 'Harusssani Creative Vault',
      freelancerEmail: fm.freelancerEmail || 'contact@kansocre8.local',
      freelancerPhone: fm.freelancerPhone || '',
      freelancerAddress: fm.freelancerAddress || '',
      paymentBank: fm.paymentBank || 'First Creative Bank',
      paymentAccount: fm.paymentAccount || '9876-5432-1098',
      paymentAccountName: fm.paymentAccountName || 'Harusssani Manaphassan',
      currency: fm.currency || 'USD',
      hourlyRate: Number(fm.hourlyRate || fm.hourly_rate || 125),
      items,
      taxRatePercent,
      subtotal,
      taxAmount,
      total,
      notes: fm.notes || body.trim(),
      linkedProjectId: fm.linkedProjectId || fm.linked_project_id || '',
      linkedQuoteId: fm.linkedQuoteId || fm.linked_quote_id || '',
      linkedInvoiceId: fm.linkedInvoiceId || fm.linked_invoice_id || '',
      rawMarkdown: rawContent
    };
  }

  static serializeDocument(doc, defaultType = 'invoice') {
    const type = doc.type || defaultType;
    const subtotal = doc.items && doc.items.length
      ? doc.items.reduce((sum, it) => sum + (it.amount || ((it.quantity || 1) * (it.unitPrice || 0))), 0)
      : (doc.subtotal || 0);
    const taxRatePercent = doc.taxRatePercent || 0;
    const taxAmount = Math.round((subtotal * taxRatePercent / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    const fm = {
      id: doc.id || doc.documentNumber,
      documentNumber: doc.documentNumber || doc.id,
      type,
      client_code: doc.clientCode,
      client_name: doc.clientName,
      client_email: doc.clientEmail || '',
      date: doc.date,
      due_date: doc.dueDate || doc.validUntil,
      status: doc.status || 'draft',
      currency: doc.currency || 'USD',
      hourly_rate: doc.hourlyRate || 125,
      items: (doc.items || []).map(it => ({
        description: it.description,
        hours: it.quantity,
        rate: it.unitPrice,
        amount: Math.round(((it.quantity || 1) * (it.unitPrice || 0)) * 100) / 100
      })),
      subtotal,
      tax_percent: taxRatePercent,
      tax_amount: taxAmount,
      total,
      notes: doc.notes || '',
      linked_project_id: doc.linkedProjectId || ''
    };

    if (doc.linkedQuoteId) fm.linked_quote_id = doc.linkedQuoteId;
    if (doc.linkedInvoiceId) fm.linked_invoice_id = doc.linkedInvoiceId;
    if (doc.validUntil) fm.valid_until = doc.validUntil;

    let md = `---\n${yaml.dump(fm).trim()}\n---\n\n`;
    const label = type === 'quote' ? 'Quote' : 'Invoice';
    md += `# ${label} ${doc.documentNumber}: ${doc.clientName}\n\n`;
    if (doc.notes) {
      md += `${doc.notes}\n`;
    }

    return md;
  }

  static serializeInvoice(inv) {
    return this.serializeDocument(inv, 'invoice');
  }

  static getInvoices() {
    const dir = this.getInvoicesDir();
    if (!fs.existsSync(dir)) return [];

    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      const invoices = [];

      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          invoices.push(this.parseInvoiceMarkdown(raw, file));
        } catch (e) {
          console.warn(`[FinanceVaultService] Failed to read invoice ${file}:`, e.message);
        }
      }

      return invoices.sort((a, b) => b.date.localeCompare(a.date));
    } catch (e) {
      return [];
    }
  }

  static getInvoice(idOrDocNumber) {
    const invoices = this.getInvoices();
    return invoices.find(inv => 
      inv.id === idOrDocNumber || 
      inv.documentNumber.toLowerCase() === idOrDocNumber.toLowerCase()
    ) || null;
  }

  static saveInvoice(invData) {
    if (!invData) throw new Error('Invoice data is required.');

    const docNumber = invData.documentNumber || invData.id || `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    invData.documentNumber = docNumber;
    if (!invData.id) invData.id = docNumber.toLowerCase();

    // Clean filename
    const clientPart = (invData.clientCode || 'ACME').replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${docNumber}_${clientPart}.md`;
    const filePath = path.join(this.getInvoicesDir(), filename);

    const serialized = this.serializeInvoice(invData);
    fs.writeFileSync(filePath, serialized, 'utf8');

    return this.parseInvoiceMarkdown(serialized, filename);
  }

  static appendSessionToInvoice(clientCode, sessionLog) {
    if (!clientCode || !sessionLog) {
      throw new Error('Client code and session log are required.');
    }

    const invoices = this.getInvoices();
    // Prefer active draft or sent invoice for this client
    let targetInv = invoices.find(inv => 
      inv.clientCode.toUpperCase() === clientCode.toUpperCase() && 
      (inv.status === 'draft' || inv.status === 'sent')
    );

    if (!targetInv) {
      // Create new draft invoice
      const nextNum = invoices.length + 1;
      const docNum = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
      targetInv = {
        id: docNum.toLowerCase(),
        documentNumber: docNum,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'draft',
        clientCode: clientCode.toUpperCase(),
        clientName: clientCode.toUpperCase() === 'ACME' ? 'Acme Corporation' : (clientCode.toUpperCase() === 'NEX' ? 'Nexus Studio' : 'Lumina Labs'),
        currency: 'USD',
        hourlyRate: sessionLog.hourlyRate || 125,
        items: [],
        taxRatePercent: 0,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        notes: 'Itemized creative work chronometer session log.'
      };
    }

    // Add session line item
    const durationHours = Math.max(0.1, Math.round((sessionLog.durationSeconds / 3600) * 100) / 100);
    const lineAmount = Math.round(durationHours * (sessionLog.hourlyRate || targetInv.hourlyRate || 125) * 100) / 100;

    targetInv.items.push({
      id: `item_session_${Date.now()}`,
      description: `${sessionLog.projectTitle || 'Creative Sprint'}: ${sessionLog.note || 'Focus chronometer session'} (${sessionLog.durationFormatted || `${durationHours}h`})`,
      quantity: durationHours,
      unitPrice: sessionLog.hourlyRate || targetInv.hourlyRate || 125,
      amount: lineAmount
    });

    targetInv.subtotal = targetInv.items.reduce((sum, it) => sum + it.amount, 0);
    targetInv.taxAmount = Math.round((targetInv.subtotal * (targetInv.taxRatePercent || 0) / 100) * 100) / 100;
    targetInv.total = targetInv.subtotal + targetInv.taxAmount;

    return this.saveInvoice(targetInv);
  }

  static ensureQuotesSeeded() {
    const dir = this.getQuotesDir();
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      if (files.length === 0) {
        const sampleQuote = {
          id: 'qte-2026-001',
          type: 'quote',
          documentNumber: 'QTE-2026-001',
          clientCode: 'NEX',
          clientName: 'Nexus Studio',
          clientContact: 'Alex Rivera',
          clientEmail: 'billing@nexusstudio.io',
          clientAddress: '550 Howard St, San Francisco, CA 94105',
          date: '2026-09-08',
          dueDate: '2026-09-22',
          validUntil: '2026-09-22',
          status: 'draft',
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
          subtotal: 4900,
          taxRatePercent: 0,
          taxAmount: 0,
          total: 4900,
          notes: 'Estimate valid for 14 days from issue date. Includes 2 rounds of creative revisions.'
        };
        this.saveQuote(sampleQuote);
      }
    } catch (e) {}
  }

  static getQuotes() {
    this.ensureQuotesSeeded();
    const dir = this.getQuotesDir();
    if (!fs.existsSync(dir)) return [];

    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      const quotes = [];

      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          const parsed = this.parseInvoiceMarkdown(raw, file);
          parsed.type = 'quote';
          quotes.push(parsed);
        } catch (e) {
          console.warn(`[FinanceVaultService] Failed to read quote ${file}:`, e.message);
        }
      }

      return quotes.sort((a, b) => b.date.localeCompare(a.date));
    } catch (e) {
      return [];
    }
  }

  static getQuote(idOrDocNumber) {
    const quotes = this.getQuotes();
    const target = String(idOrDocNumber).toLowerCase();
    return quotes.find(q =>
      String(q.id).toLowerCase() === target ||
      String(q.documentNumber).toLowerCase() === target
    ) || null;
  }

  static saveQuote(quoteData) {
    if (!quoteData) throw new Error('Quote data is required.');

    const docNumber = quoteData.documentNumber || quoteData.id || `QTE-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    quoteData.documentNumber = docNumber;
    if (!quoteData.id) quoteData.id = docNumber.toLowerCase();
    quoteData.type = 'quote';

    const clientPart = (quoteData.clientCode || 'ACME').replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${docNumber}_${clientPart}.md`;
    const filePath = path.join(this.getQuotesDir(), filename);

    const serialized = this.serializeDocument(quoteData, 'quote');
    fs.writeFileSync(filePath, serialized, 'utf8');

    const parsed = this.parseInvoiceMarkdown(serialized, filename);
    parsed.type = 'quote';
    return parsed;
  }

  static deleteQuote(idOrDocNumber) {
    const dir = this.getQuotesDir();
    const quote = this.getQuote(idOrDocNumber);
    if (!quote) return false;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const p = path.join(dir, file);
      if (file.startsWith(quote.documentNumber) || path.basename(file, '.md') === quote.id) {
        try { fs.unlinkSync(p); return true; } catch (e) {}
      }
    }
    return false;
  }

  static deleteInvoice(idOrDocNumber) {
    const dir = this.getInvoicesDir();
    const invoice = this.getInvoice(idOrDocNumber);
    if (!invoice) return false;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const p = path.join(dir, file);
      if (file.startsWith(invoice.documentNumber) || path.basename(file, '.md') === invoice.id) {
        try { fs.unlinkSync(p); return true; } catch (e) {}
      }
    }
    return false;
  }

  static convertQuoteToInvoice(quoteId) {
    const quote = this.getQuote(quoteId);
    if (!quote) {
      throw new Error(`Quote "${quoteId}" not found in _Finance/Quotes/.`);
    }

    quote.status = 'accepted';

    const invoices = this.getInvoices();
    const nextNum = invoices.length + 1;
    const invNumber = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

    const newInvoice = {
      ...quote,
      id: invNumber.toLowerCase(),
      type: 'invoice',
      documentNumber: invNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'draft',
      linkedQuoteId: quote.documentNumber,
      notes: quote.notes ? `${quote.notes}\n\n(Generated from Quote ${quote.documentNumber})` : `Generated from Quote ${quote.documentNumber}`
    };

    const savedInvoice = this.saveInvoice(newInvoice);

    quote.linkedInvoiceId = savedInvoice.documentNumber;
    this.saveQuote(quote);

    return {
      success: true,
      quote,
      invoice: savedInvoice
    };
  }
}

module.exports = FinanceVaultService;
