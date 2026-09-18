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

    const normalizeDate = (d, fallback) => {
      if (!d) return fallback || new Date().toISOString().split('T')[0];
      if (d instanceof Date) return d.toISOString().split('T')[0];
      const s = String(d).trim();
      return s.includes('T') ? s.split('T')[0] : s;
    };

    const dateStr = normalizeDate(fm.date);
    const dueDateStr = normalizeDate(fm.dueDate || fm.due_date || fm.validUntil || fm.valid_until, dateStr);
    const validUntilStr = normalizeDate(fm.validUntil || fm.valid_until || fm.dueDate || fm.due_date, dateStr);

    const fileBase = path.basename(filename || '', '.md');
    const rawId = fm.id || docNumber.toLowerCase();
    const docId = fileBase && fileBase !== rawId ? `${rawId}__${fileBase}` : rawId;

    return {
      id: docId,
      type: fm.type || (docNumber.startsWith('QTE') ? 'quote' : 'invoice'),
      documentNumber: docNumber,
      date: dateStr,
      dueDate: dueDateStr,
      validUntil: validUntilStr,
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
      taxLabel: fm.tax_label || fm.taxLabel || 'Tax',
      tin: fm.tin || fm.freelancer_tin || fm.freelancerTin || '',
      sstRegistrationNo: fm.sst_registration_no || fm.sstRegistrationNo || '',
      buyerTin: fm.buyer_tin || fm.buyerTin || '',
      buyerSstNo: fm.buyer_sst_no || fm.buyerSstNo || '',
      theme: fm.theme || 'geist',
      stamp: fm.stamp || 'none',
      showClientAccent: fm.show_client_accent !== undefined ? Boolean(fm.show_client_accent) : (fm.showClientAccent !== undefined ? Boolean(fm.showClientAccent) : true),
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
      tax_label: doc.taxLabel || 'Tax',
      total,
      notes: doc.notes || '',
      linked_project_id: doc.linkedProjectId || '',
      theme: doc.theme || 'geist'
    };

    if (doc.clientContact) fm.client_contact = doc.clientContact;
    if (doc.clientAddress) fm.client_address = doc.clientAddress;
    if (doc.tin) fm.tin = doc.tin;
    if (doc.sstRegistrationNo) fm.sst_registration_no = doc.sstRegistrationNo;
    if (doc.buyerTin) fm.buyer_tin = doc.buyerTin;
    if (doc.buyerSstNo) fm.buyer_sst_no = doc.buyerSstNo;
    if (doc.freelancerName) fm.freelancer_name = doc.freelancerName;
    if (doc.freelancerEmail) fm.freelancer_email = doc.freelancerEmail;
    if (doc.freelancerPhone) fm.freelancer_phone = doc.freelancerPhone;
    if (doc.freelancerAddress) fm.freelancer_address = doc.freelancerAddress;
    if (doc.paymentBank) fm.payment_bank = doc.paymentBank;
    if (doc.paymentAccount) fm.payment_account = doc.paymentAccount;
    if (doc.paymentAccountName) fm.payment_account_name = doc.paymentAccountName;
    if (doc.linkedQuoteId) fm.linked_quote_id = doc.linkedQuoteId;
    if (doc.linkedInvoiceId) fm.linked_invoice_id = doc.linkedInvoiceId;
    if (doc.validUntil) fm.valid_until = doc.validUntil;
    if (doc.stamp) fm.stamp = doc.stamp;
    if (doc.showClientAccent !== undefined) fm.show_client_accent = Boolean(doc.showClientAccent);

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

      return invoices.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    } catch (e) {
      console.warn('[FinanceVaultService] getInvoices error:', e.message);
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

      return quotes.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    } catch (e) {
      console.warn('[FinanceVaultService] getQuotes error:', e.message);
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

  static generateStandaloneHtml(doc, studioProfile = {}) {
    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const currency = doc.currency || 'USD';
    const isJpy = currency === 'JPY';
    const fmt = (n) => {
      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: isJpy ? 0 : 2,
          maximumFractionDigits: isJpy ? 0 : 2
        }).format(Number(n) || 0);
      } catch (e) {
        return `${currency} ${(Number(n) || 0).toFixed(isJpy ? 0 : 2)}`;
      }
    };

    const theme = doc.theme || 'geist';
    const isQuote = doc.type === 'quote';
    const docTitle = isQuote ? 'Creative Proposal & Quote' : 'Commercial Invoice';
    const stamp = doc.stamp && doc.stamp !== 'none' ? doc.stamp.toLowerCase() : null;

    const clientCode = (doc.clientCode || '').toUpperCase();
    let clientAccent = '#0284C7';
    if (clientCode === 'ACME') clientAccent = '#0284C7';
    else if (clientCode === 'NEX') clientAccent = '#8B5CF6';
    else if (clientCode === 'LUM') clientAccent = '#10B981';

    let stampHtml = '';
    if (stamp === 'paid') {
      stampHtml = `<div class="tactile-stamp stamp-paid">PAID</div>`;
    } else if (stamp === 'approved') {
      stampHtml = `<div class="tactile-stamp stamp-approved">APPROVED</div>`;
    } else if (stamp === 'draft') {
      stampHtml = `<div class="tactile-stamp stamp-draft">DRAFT</div>`;
    } else if (stamp === 'seal') {
      stampHtml = `<div class="tactile-stamp stamp-seal"><div class="seal-ring"><span class="seal-code">${escapeHtml(doc.clientCode || 'KANSO')}</span><span class="seal-word">OFFICIAL</span><span class="seal-year">${new Date().getFullYear()}</span></div></div>`;
    }

    const itemsRows = (doc.items || []).map(it => `
      <tr>
        <td class="col-desc">${escapeHtml(it.description)}</td>
        <td class="col-qty">${it.quantity}</td>
        <td class="col-rate">${fmt(it.unitPrice)}</td>
        <td class="col-amount">${fmt(it.amount)}</td>
      </tr>
    `).join('');

    const logoHtml = studioProfile.logo
      ? `<img src="${studioProfile.logo}" alt="${escapeHtml(doc.freelancerName)}" class="studio-logo" />`
      : '';

    const signatureHtml = studioProfile.digitalSignature
      ? (studioProfile.digitalSignature.startsWith('data:image') || studioProfile.digitalSignature.startsWith('http')
          ? `<img src="${studioProfile.digitalSignature}" alt="Signature" class="sig-img" />`
          : `<div class="sig-text">${escapeHtml(studioProfile.digitalSignature)}</div>`)
      : `<div class="sig-text">${escapeHtml(studioProfile.principalName || 'Principal Director')}</div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.documentNumber)} — ${escapeHtml(doc.clientName)}</title>
  <style>
    :root {
      --client-accent: ${clientAccent};
      --bg-page: #F4F4F5;
      --paper-bg: #FFFFFF;
      --text-main: #18181B;
      --text-muted: #71717A;
      --border-color: #E4E4E7;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-serif: Georgia, Cambria, 'Times New Roman', Times, serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg-page);
      color: var(--text-main);
      font-family: var(--font-sans);
      line-height: 1.5;
      padding: 40px 20px;
      -webkit-font-smoothing: antialiased;
    }

    .doc-container {
      max-width: 820px;
      margin: 0 auto;
      position: relative;
    }

    .paper-card {
      background: var(--paper-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 48px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      position: relative;
      overflow: hidden;
    }

    /* Tactile Rubber Stamps */
    .tactile-stamp {
      position: absolute;
      top: 140px;
      right: 48px;
      z-index: 20;
      pointer-events: none;
      user-select: none;
      font-family: var(--font-mono);
      font-weight: 900;
      text-transform: uppercase;
      text-align: center;
      mix-blend-mode: multiply;
      opacity: 0.88;
    }
    .stamp-paid {
      color: #DC2626;
      border: 4px double #DC2626;
      padding: 6px 18px;
      font-size: 26px;
      letter-spacing: 0.25em;
      border-radius: 6px;
      transform: rotate(-12deg);
      box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.2);
    }
    .stamp-approved {
      color: #059669;
      border: 4px double #059669;
      padding: 6px 18px;
      font-size: 24px;
      letter-spacing: 0.22em;
      border-radius: 6px;
      transform: rotate(-10deg);
    }
    .stamp-draft {
      color: #6B7280;
      border: 3px dashed #6B7280;
      padding: 6px 20px;
      font-size: 22px;
      letter-spacing: 0.28em;
      border-radius: 4px;
      transform: rotate(-15deg);
    }
    .stamp-seal {
      color: #D97706;
      border: 3px solid #D97706;
      border-radius: 50%;
      width: 90px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(8deg);
    }
    .seal-ring {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 10px;
      letter-spacing: 0.1em;
      line-height: 1.2;
    }
    .seal-word { font-size: 13px; font-weight: bold; }

    /* Client Swatch Bar */
    .swatch-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px dashed var(--border-color);
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-muted);
    }
    .swatch-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border-radius: 9999px;
      border: 1px solid var(--border-color);
      background: #FAFAFA;
    }
    .swatch-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    /* Header */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .studio-brand { display: flex; gap: 16px; align-items: flex-start; }
    .studio-logo { width: 56px; height: 56px; object-fit: contain; border-radius: 8px; border: 1px solid var(--border-color); padding: 4px; }
    .studio-title { font-size: 22px; font-weight: 800; tracking-tight; }
    .studio-tagline { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .studio-contact { font-size: 13px; color: var(--text-muted); margin-top: 6px; line-height: 1.4; }
    .doc-meta-right { text-align: right; }
    .doc-type-label { font-size: 12px; font-family: var(--font-mono); font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--client-accent); }
    .doc-number { font-size: 24px; font-family: var(--font-mono); font-weight: 800; margin-top: 2px; }
    .doc-status { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-family: var(--font-mono); font-weight: 700; text-transform: uppercase; margin-top: 6px; background: #F4F4F5; color: #3F3F46; }

    /* Client & Dates Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
      font-size: 13px;
    }
    .info-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 4px; }
    .client-name { font-size: 16px; font-weight: 700; }
    .client-contact { color: var(--text-muted); margin-top: 4px; line-height: 1.4; }
    .dates-right { text-align: right; display: flex; flex-direction: column; gap: 8px; }
    .date-val { font-family: var(--font-mono); font-weight: 600; }

    /* Fiscal Row */
    .fiscal-row { display: flex; gap: 8px; margin-top: 6px; font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); }
    .fiscal-chip { padding: 2px 6px; border: 1px solid var(--border-color); border-radius: 4px; background: #FAFAFA; }

    /* Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .items-table th {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 2px solid var(--border-color);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid var(--border-color);
    }
    .col-desc { font-weight: 500; }
    .col-qty { text-align: center; font-family: var(--font-mono); width: 80px; }
    .col-rate { text-align: right; font-family: var(--font-mono); width: 120px; }
    .col-amount { text-align: right; font-family: var(--font-mono); font-weight: 700; width: 140px; }

    /* Totals */
    .totals-box {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
      font-size: 14px;
    }
    .totals-list { width: 280px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .total-row.grand {
      border-top: 2px solid var(--border-color);
      margin-top: 6px;
      padding-top: 10px;
      font-size: 18px;
      font-weight: 800;
      color: var(--text-main);
    }

    /* Instructions & Terms */
    .terms-box {
      background: #FAFAFA;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 32px;
      font-size: 12px;
      line-height: 1.6;
    }
    .terms-title { font-weight: 700; text-transform: uppercase; font-size: 11px; margin-bottom: 6px; letter-spacing: 0.05em; }

    /* Footer & Signature */
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 24px;
      border-top: 1px solid var(--border-color);
      font-size: 11px;
      color: var(--text-muted);
    }
    .sig-block { text-align: right; }
    .sig-img { height: 44px; object-fit: contain; margin-top: 4px; }
    .sig-text { font-family: var(--font-serif); font-style: italic; font-size: 18px; border-bottom: 1px solid var(--border-color); padding: 4px 16px; margin-top: 4px; }

    /* Print media */
    @page { size: A4 portrait; margin: 12mm 15mm; }
    @media print {
      body { background: #FFFFFF; padding: 0; }
      .paper-card { border: none; box-shadow: none; padding: 0; }
      .print-btn { display: none; }
      tr, .terms-box, .footer-row { break-inside: avoid; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }

    /* Print toolbar button (screen only) */
    .print-toolbar {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      background: #18181B;
      color: #FFFFFF;
      border: none;
    }
    .btn:hover { background: #27272A; }

    /* Theme Overrides */
    .theme-swiss {
      border-top: 8px solid #000000 !important;
      border-radius: 0 !important;
    }
    .theme-swiss .studio-title, .theme-swiss .doc-number, .theme-swiss .client-name {
      text-transform: uppercase;
      letter-spacing: -0.02em;
    }
    .theme-swiss .items-table th {
      background: #000000;
      color: #FFFFFF;
    }

    .theme-letterpress {
      background: #FDFBF7 !important;
      border-color: #D6D3CD !important;
      font-family: var(--font-serif);
    }
    .theme-letterpress .studio-title, .theme-letterpress .client-name {
      font-family: var(--font-serif);
      color: #27272A;
    }
    .theme-letterpress .items-table th {
      border-bottom: 2px solid #8C827A;
      color: #52525B;
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <div class="print-toolbar print-btn">
      <button onclick="window.print()" class="btn">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
        Print / Save PDF
      </button>
    </div>

    <div class="paper-card theme-${theme}">
      ${stampHtml}

      ${doc.showClientAccent ? `
      <div class="swatch-bar">
        <span>Client Palette:</span>
        <div class="swatch-pill">
          <span class="swatch-dot" style="background: ${clientAccent};"></span>
          <span>${clientCode}: ${clientAccent}</span>
        </div>
      </div>
      ` : ''}

      <div class="header-row">
        <div class="studio-brand">
          ${logoHtml}
          <div>
            <h1 class="studio-title">${escapeHtml(doc.freelancerName || studioProfile.studioName || 'Creative Studio')}</h1>
            ${studioProfile.tagline ? `<div class="studio-tagline">${escapeHtml(studioProfile.tagline)}</div>` : ''}
            <div class="studio-contact">
              ${escapeHtml(doc.freelancerAddress || studioProfile.studioAddress || '')}<br>
              ${escapeHtml(doc.freelancerEmail || studioProfile.billingEmail || '')}
              ${doc.freelancerPhone ? ` · ${escapeHtml(doc.freelancerPhone)}` : ''}
            </div>
            ${(doc.tin || doc.sstRegistrationNo) ? `
              <div class="fiscal-row">
                ${doc.tin ? `<span class="fiscal-chip">TIN: <strong>${escapeHtml(doc.tin)}</strong></span>` : ''}
                ${doc.sstRegistrationNo ? `<span class="fiscal-chip">SST: <strong>${escapeHtml(doc.sstRegistrationNo)}</strong></span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="doc-meta-right">
          <div class="doc-type-label">${docTitle}</div>
          <div class="doc-number">${escapeHtml(doc.documentNumber)}</div>
          <div class="doc-status">${escapeHtml(doc.status)}</div>
        </div>
      </div>

      <div class="info-grid">
        <div>
          <div class="info-label">Billed To</div>
          <div class="client-name">${escapeHtml(doc.clientName)}</div>
          <div class="client-contact">
            ${doc.clientContact ? `Attn: ${escapeHtml(doc.clientContact)}<br>` : ''}
            ${doc.clientEmail ? `${escapeHtml(doc.clientEmail)}<br>` : ''}
            ${escapeHtml(doc.clientAddress || '')}
          </div>
          ${(doc.buyerTin || doc.buyerSstNo) ? `
            <div class="fiscal-row">
              ${doc.buyerTin ? `<span class="fiscal-chip">Buyer TIN: <strong>${escapeHtml(doc.buyerTin)}</strong></span>` : ''}
              ${doc.buyerSstNo ? `<span class="fiscal-chip">Buyer SST: <strong>${escapeHtml(doc.buyerSstNo)}</strong></span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="dates-right">
          <div>
            <div class="info-label">Issue Date</div>
            <div class="date-val">${escapeHtml(doc.date)}</div>
          </div>
          <div>
            <div class="info-label">${isQuote ? 'Valid Until' : 'Due Date'}</div>
            <div class="date-val">${escapeHtml(doc.dueDate)}</div>
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
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="totals-box">
        <div class="totals-list">
          <div class="total-row">
            <span>Subtotal:</span>
            <span style="font-family: var(--font-mono); font-weight: 600;">${fmt(doc.subtotal)}</span>
          </div>
          ${doc.taxRatePercent > 0 ? `
          <div class="total-row">
            <span>${escapeHtml(doc.taxLabel || 'Tax')} (${doc.taxRatePercent}%):</span>
            <span style="font-family: var(--font-mono); font-weight: 600;">${fmt(doc.taxAmount)}</span>
          </div>
          ` : ''}
          <div class="total-row grand">
            <span>Total:</span>
            <span style="font-family: var(--font-mono);">${fmt(doc.total)}</span>
          </div>
        </div>
      </div>

      <div class="terms-box">
        <div class="terms-title">${isQuote ? 'Proposal Acceptance Terms' : 'Remittance Instructions'}</div>
        ${!isQuote ? `
          <p style="font-family: var(--font-mono);">
            Bank: <strong>${escapeHtml(doc.paymentBank || studioProfile.paymentBank || '')}</strong><br>
            Account: <strong>${escapeHtml(doc.paymentAccount || studioProfile.paymentAccountNo || '')}</strong> (${escapeHtml(doc.paymentAccountName || studioProfile.paymentAccountName || doc.freelancerName)})<br>
            ${studioProfile.paymentSwiftOrQr ? `Routing / SWIFT: <strong>${escapeHtml(studioProfile.paymentSwiftOrQr)}</strong>` : ''}
          </p>
        ` : `
          <p>${escapeHtml(studioProfile.defaultPaymentTerms || 'To accept this proposal, reply with formal approval or signed purchase order. Work begins upon initial deposit settlement.')}</p>
        `}
        ${doc.notes ? `<p style="margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 8px;">${escapeHtml(doc.notes)}</p>` : ''}
      </div>

      <div class="footer-row">
        <div>
          ${escapeHtml(studioProfile.footerNotice || 'Crafted with mindful focus & precision in Kanso Cre8.')}
        </div>
        <div class="sig-block">
          <div style="text-transform: uppercase; font-size: 10px; font-weight: 700; margin-bottom: 4px;">Authorized Seal &amp; Signature</div>
          ${signatureHtml}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}

module.exports = FinanceVaultService;

