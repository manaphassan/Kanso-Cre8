<script lang="ts">
  import { onMount } from 'svelte';
  import { financeService } from '../services/financeService';
  import { clientService } from '../services/clientService';
  import { studioService } from '../services/studioService.svelte';
  import { licenseStore } from '../stores/licenseStore.svelte';
  import { settingsStore, SUPPORTED_CURRENCIES, getCurrencySymbol } from '../stores/settingsStore.svelte';
  import { appState } from '../stores/appState.svelte';
  import ScopeTemplateModal from '../components/features/ScopeTemplateModal.svelte';
  import type { InvoiceDocument, ClientProfile, InvoiceLineItem } from '../types/kanso';

  let docType: 'invoices' | 'quotes' = $state('invoices');
  let invoices: InvoiceDocument[] = $state([]);
  let quotes: InvoiceDocument[] = $state([]);
  let clients: ClientProfile[] = $state([]);
  let activeDoc: InvoiceDocument | null = $state(null);
  let viewMode: 'edit' | 'markdown' = $state('edit');
  let activeFilter: string = $state('all');
  let isConverting = $state(false);
  let showFiscalDrawer = $state(false);
  let showScopeModal = $state(false);
  let copiedHex: string | null = $state(null);

  const TAX_PRESETS = [
    { label: 'Exempt (0%)', rate: 0, taxLabel: 'Tax' },
    { label: 'SST 8% (Malaysia)', rate: 8, taxLabel: 'SST' },
    { label: 'SST 6% (Logistics/F&B)', rate: 6, taxLabel: 'SST' },
    { label: 'VAT 20% (UK / Europe)', rate: 20, taxLabel: 'VAT' },
    { label: 'GST 9% (Singapore)', rate: 9, taxLabel: 'GST' },
    { label: 'Sales Tax 7% (US Standard)', rate: 7, taxLabel: 'Sales Tax' },
    { label: 'Custom %', rate: -1, taxLabel: 'Tax' }
  ];

  function applyTaxPreset(preset: { label: string; rate: number; taxLabel: string }) {
    if (!activeDoc) return;
    if (preset.rate >= 0) {
      activeDoc.taxRatePercent = preset.rate;
      activeDoc.taxLabel = preset.taxLabel;
    }
    recalcTotals();
    persistActiveDoc();
  }

  function setInvoiceTheme(theme: 'geist' | 'swiss' | 'letterpress') {
    if (!activeDoc) return;
    activeDoc.theme = theme;
    persistActiveDoc();
  }

  function setDocStamp(stamp: 'paid' | 'approved' | 'draft' | 'seal' | 'none') {
    if (!activeDoc) return;
    activeDoc.stamp = stamp;
    persistActiveDoc();
  }

  function toggleClientAccent() {
    if (!activeDoc) return;
    activeDoc.showClientAccent = activeDoc.showClientAccent === false ? true : false;
    persistActiveDoc();
  }

  function copyHex(hex: string) {
    navigator.clipboard.writeText(hex);
    copiedHex = hex;
    appState.addToast(`Copied ${hex} to clipboard`, 'info');
    setTimeout(() => { copiedHex = null; }, 2000);
  }

  function handleApplyScopePreset(items: InvoiceLineItem[], recommendedTerms: string, mode: 'replace' | 'append') {
    if (!activeDoc) return;
    if (mode === 'replace') {
      activeDoc.items = items;
    } else {
      activeDoc.items = [...activeDoc.items, ...items];
    }
    if (recommendedTerms) {
      activeDoc.notes = recommendedTerms;
    }
    recalcTotals();
    persistActiveDoc();
    appState.addToast(`Applied scope preset (${items.length} deliverables)`, 'success');
  }

  function handleDownloadHtml() {
    if (!activeDoc) return;
    if (!licenseStore.isPro) {
      licenseStore.requirePro('Standalone HTML Export');
      return;
    }
    const url = `/api/finance/${activeDoc.type}/${activeDoc.documentNumber}/export-html`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.documentNumber}_${activeDoc.clientCode || 'Client'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    appState.addToast(`Exported standalone HTML for ${activeDoc.documentNumber}`, 'success');
  }

  function formatDocMoney(amount: number) {
    if (!activeDoc) return '0.00';
    return settingsStore.formatMoney(amount, activeDoc.currency);
  }

  onMount(async () => {
    await studioService.init();
    clients = clientService.getClients();
    invoices = financeService.getDocuments();
    quotes = financeService.getQuotes();

    // Async disk fetch
    await Promise.all([
      financeService.fetchDiskInvoices(),
      financeService.fetchDiskQuotes()
    ]);

    invoices = financeService.getDocuments();
    quotes = financeService.getQuotes();

    if (invoices.length > 0) {
      activeDoc = invoices[0];
    } else if (quotes.length > 0) {
      docType = 'quotes';
      activeDoc = quotes[0];
    }
  });

  function switchDocType(type: 'invoices' | 'quotes') {
    docType = type;
    activeFilter = 'all';
    if (type === 'invoices') {
      invoices = financeService.getDocuments();
      activeDoc = invoices[0] || null;
    } else {
      quotes = financeService.getQuotes();
      activeDoc = quotes[0] || null;
    }
  }

  function selectDoc(doc: InvoiceDocument) {
    activeDoc = doc;
  }

  function handleClientSelect(e: Event) {
    if (!activeDoc) return;
    const code = (e.target as HTMLSelectElement).value;
    const client = clientService.getClientByCode(code);
    if (client) {
      activeDoc.clientCode = client.code;
      activeDoc.clientName = client.name;
      activeDoc.clientContact = client.contactPerson;
      activeDoc.clientEmail = client.email;
      activeDoc.clientAddress = client.billingAddress;
      activeDoc.currency = client.currency;
      if (client.defaultHourlyRate) {
        activeDoc.hourlyRate = client.defaultHourlyRate;
      }
      recalcTotals();
      persistActiveDoc();
    }
  }

  function addLineItem() {
    if (!activeDoc) return;
    const rate = activeDoc.hourlyRate || 125;
    const newItem: InvoiceLineItem = {
      id: `item_${Date.now()}`,
      description: activeDoc.type === 'quote' ? 'Proposed Creative Deliverable & Scope' : 'Creative Design & Production Deliverable',
      quantity: 1,
      unitPrice: rate,
      amount: rate
    };
    activeDoc.items = [...activeDoc.items, newItem];
    recalcTotals();
    persistActiveDoc();
  }

  function removeLineItem(index: number) {
    if (!activeDoc) return;
    activeDoc.items = activeDoc.items.filter((_, i) => i !== index);
    recalcTotals();
    persistActiveDoc();
  }

  function recalcTotals() {
    if (!activeDoc) return;
    activeDoc.items.forEach(item => {
      item.amount = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    });
    activeDoc.subtotal = activeDoc.items.reduce((acc, item) => acc + item.amount, 0);
    const taxRate = Number(activeDoc.taxRatePercent) || 0;
    activeDoc.taxAmount = Math.round(((activeDoc.subtotal * taxRate) / 100) * 100) / 100;
    activeDoc.total = Math.round((activeDoc.subtotal + activeDoc.taxAmount) * 100) / 100;
  }

  function persistActiveDoc() {
    if (!activeDoc) return;
    if (activeDoc.type === 'quote') {
      financeService.saveQuote(activeDoc);
      quotes = financeService.getQuotes();
    } else {
      financeService.saveDocument(activeDoc);
      invoices = financeService.getDocuments();
    }
  }

  function createNewInvoice() {
    if (!licenseStore.isPro) {
      licenseStore.requirePro('Custom YAML Invoices');
      return;
    }
    const defaultClient = clients[0] || {
      code: 'ACME',
      name: 'Acme Corporation',
      contactPerson: 'Sarah Jenkins',
      email: 'operations@acme.com',
      billingAddress: '100 Innovation Way, Suite 400, San Francisco, CA 94105',
      currency: settingsStore.settings.currency || 'MYR',
      defaultHourlyRate: 180
    };

    const sp = studioService.profile;
    const nextNum = invoices.length + 1;
    const newDoc: InvoiceDocument = {
      id: `inv-${Date.now()}`,
      type: 'invoice',
      documentNumber: `INV-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'draft',
      clientCode: defaultClient.code,
      clientName: defaultClient.name,
      clientContact: defaultClient.contactPerson,
      clientEmail: defaultClient.email,
      clientAddress: defaultClient.billingAddress,
      freelancerName: sp.studioName || 'HaNa Innovation',
      freelancerEmail: sp.billingEmail || 'contact@kansocre8.local',
      freelancerPhone: sp.phone || '+60 12-345 6789',
      freelancerAddress: sp.studioAddress || 'Kuala Lumpur, Malaysia',
      paymentBank: sp.paymentBank || 'Maybank (MBBEMYKL)',
      paymentAccount: sp.paymentAccountNo || '5140-1234-5678',
      paymentAccountName: sp.paymentAccountName || sp.studioName || 'HaNa Innovation',
      currency: defaultClient.currency || sp.defaultCurrency || settingsStore.settings.currency || 'MYR',
      hourlyRate: defaultClient.defaultHourlyRate || 180,
      items: [
        {
          id: '1',
          description: 'Enterprise Cloud Dashboard UI Design & Design System Package',
          quantity: 1,
          unitPrice: 2800,
          amount: 2800
        }
      ],
      taxRatePercent: 0,
      taxLabel: 'Tax',
      tin: sp.businessRegNo || '',
      sstRegistrationNo: '',
      buyerTin: '',
      buyerSstNo: '',
      theme: 'geist',
      subtotal: 2800,
      taxAmount: 0,
      total: 2800,
      notes: sp.defaultPaymentTerms || 'Payment settlement via direct wire / ACH transfer within 14 days. Thank you!'
    };

    financeService.saveDocument(newDoc);
    invoices = financeService.getDocuments();
    activeDoc = newDoc;
    docType = 'invoices';
  }

  function createNewQuote() {
    if (!licenseStore.isPro) {
      licenseStore.requirePro('Dual-Pane Quotes Studio');
      return;
    }
    const defaultClient = clients.find(c => c.code === 'NEX') || clients[0] || {
      code: 'NEX',
      name: 'Nexus Studio',
      contactPerson: 'Alex Vance',
      email: 'hello@nexusstudio.io',
      billingAddress: '42 Shoreditch High St, Hackney, London E1 6JJ, UK',
      currency: settingsStore.settings.currency || 'MYR',
      defaultHourlyRate: 150
    };

    const sp = studioService.profile;
    const nextNum = quotes.length + 1;
    const newDoc: InvoiceDocument = {
      id: `qte-${Date.now()}`,
      type: 'quote',
      documentNumber: `QTE-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'draft',
      clientCode: defaultClient.code,
      clientName: defaultClient.name,
      clientContact: defaultClient.contactPerson,
      clientEmail: defaultClient.email,
      clientAddress: defaultClient.billingAddress,
      freelancerName: sp.studioName || 'HaNa Innovation',
      freelancerEmail: sp.billingEmail || 'contact@kansocre8.local',
      freelancerPhone: sp.phone || '+60 12-345 6789',
      freelancerAddress: sp.studioAddress || 'Kuala Lumpur, Malaysia',
      paymentBank: sp.paymentBank || 'Maybank (MBBEMYKL)',
      paymentAccount: sp.paymentAccountNo || '5140-1234-5678',
      paymentAccountName: sp.paymentAccountName || sp.studioName || 'HaNa Innovation',
      currency: defaultClient.currency || sp.defaultCurrency || settingsStore.settings.currency || 'MYR',
      hourlyRate: defaultClient.defaultHourlyRate || 150,
      items: [
        {
          id: '1',
          description: 'Key Visual Concept Artwork & Motion Blockout',
          quantity: 20,
          unitPrice: defaultClient.defaultHourlyRate || 140,
          amount: (defaultClient.defaultHourlyRate || 140) * 20
        }
      ],
      taxRatePercent: 0,
      taxLabel: 'Tax',
      tin: sp.businessRegNo || '',
      sstRegistrationNo: '',
      buyerTin: '',
      buyerSstNo: '',
      theme: 'geist',
      subtotal: (defaultClient.defaultHourlyRate || 140) * 20,
      taxAmount: 0,
      total: (defaultClient.defaultHourlyRate || 140) * 20,
      notes: sp.defaultPaymentTerms || 'Quote valid for 14 days from issue date. Includes 2 rounds of creative revisions.'
    };

    financeService.saveQuote(newDoc);
    quotes = financeService.getQuotes();
    activeDoc = newDoc;
    docType = 'quotes';
  }

  async function handleConvertQuote() {
    if (!activeDoc || activeDoc.type !== 'quote') return;
    isConverting = true;
    try {
      const res = await financeService.convertQuoteToInvoice(activeDoc.documentNumber);
      if (res && res.invoice) {
        appState.addToast(`Quote converted to Invoice ${res.invoice.documentNumber}!`, 'success');
        docType = 'invoices';
        invoices = financeService.getDocuments();
        quotes = financeService.getQuotes();
        activeDoc = res.invoice;
      } else {
        appState.addToast('Failed to convert quote to invoice.', 'error');
      }
    } catch (err: any) {
      appState.addToast(`Conversion error: ${err.message}`, 'error');
    } finally {
      isConverting = false;
    }
  }

  async function handleDeleteDocument() {
    if (!activeDoc) return;
    const confirmMsg = `Are you sure you want to delete ${activeDoc.documentNumber}? This will remove the markdown file from disk.`;
    if (!confirm(confirmMsg)) return;

    if (activeDoc.type === 'quote') {
      await financeService.deleteQuote(activeDoc.documentNumber);
      quotes = financeService.getQuotes();
      activeDoc = quotes[0] || null;
      appState.addToast('Quote deleted from disk.', 'success');
    } else {
      await financeService.deleteInvoice(activeDoc.documentNumber);
      invoices = financeService.getDocuments();
      activeDoc = invoices[0] || null;
      appState.addToast('Invoice deleted from disk.', 'success');
    }
  }

  function triggerPrint() {
    if (!licenseStore.isPro) {
      licenseStore.requirePro('Print-Ready PDF Generation');
      return;
    }
    window.print();
  }

  function getClientPalette(code: string) {
    const c = clients.find(cl => cl.code.toUpperCase() === (code || '').toUpperCase());
    return c?.palette || { primary: '#38BDF8', secondary: '#0284C7', accent: '#38BDF8' };
  }

  const currentList = $derived(docType === 'invoices' ? invoices : quotes);

  const filteredDocs = $derived(
    activeFilter === 'all'
      ? currentList
      : currentList.filter(d => d.status === activeFilter)
  );
</script>

<div class="invoice-studio-container space-y-6 animate-fadeIn print:p-0 print:m-0 print:max-w-none">
  <!-- Top Navigation & Actions (Hidden in Print) -->
  <div class="view-header print:hidden">
    <div class="header-titles">
      <div class="header-tag">
        <span class="tag-badge">_Finance/</span>
        <span class="tag-meta">{invoices.length} Invoices · {quotes.length} Quotes · Pure Markdown Storage</span>
      </div>
      <h1 class="view-title">Quotes &amp; Invoices</h1>
      <p class="view-subtitle">
        Offline-first Markdown financial desk. Pure <code class="font-mono text-primary text-xs">_Finance/Quotes/</code> &amp; <code class="font-mono text-primary text-xs">_Finance/Invoices/</code> storage.
      </p>
    </div>

    <div class="header-actions">
      {#if docType === 'invoices'}
        <button
          onclick={createNewInvoice}
          class="action-cta-btn"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Invoice</span>
        </button>
      {:else}
        <button
          onclick={createNewQuote}
          class="action-cta-btn"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Quote</span>
        </button>
      {/if}

      <button
        onclick={() => showScopeModal = true}
        class="inline-flex items-center gap-2 px-3.5 py-2 border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold rounded-lg transition-all shadow-xs cursor-pointer"
        title="Apply tailored scope templates for UI/UX, 3D/Motion, Brand Identity, etc."
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>⚡ Scope Presets</span>
      </button>

      <button
        onclick={handleDownloadHtml}
        class="inline-flex items-center gap-2 px-3.5 py-2 border border-border bg-card hover:bg-muted/50 text-foreground text-sm font-medium rounded-lg transition-colors shadow-xs cursor-pointer"
        title="Download self-contained offline HTML invoice"
      >
        <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Export HTML</span>
      </button>

      <button
        onclick={triggerPrint}
        class="inline-flex items-center gap-2 px-4 py-2 border border-border bg-card hover:bg-muted/50 text-foreground text-sm font-medium rounded-lg transition-colors shadow-xs cursor-pointer"
      >
        <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print / Save PDF
      </button>
    </div>
  </div>

  <!-- Primary Tab Switcher: Invoices vs Quotes (Hidden in Print) -->
  <div class="flex items-center justify-between gap-4 border-b border-border pb-3 print:hidden">
    <div class="flex items-center gap-2">
      <button
        onclick={() => switchDocType('invoices')}
        class="px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 {docType === 'invoices' ? 'bg-primary/15 text-primary border border-primary/30 shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}"
      >
        <span>📄 Invoices</span>
        <span class="px-1.5 py-0.2 rounded-full text-xs font-mono bg-primary/20">{invoices.length}</span>
      </button>
      <button
        onclick={() => switchDocType('quotes')}
        class="px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 {docType === 'quotes' ? 'bg-primary/15 text-primary border border-primary/30 shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}"
      >
        <span>📑 Quotes &amp; Proposals</span>
        <span class="px-1.5 py-0.2 rounded-full text-xs font-mono bg-primary/20">{quotes.length}</span>
      </button>
    </div>

    <div class="text-xs text-muted-foreground font-mono flex items-center gap-2">
      <span>Vault Dir:</span>
      <span class="text-primary font-semibold px-2 py-0.5 rounded bg-muted/50 border border-border/60">
        {docType === 'invoices' ? '_Finance/Invoices/' : '_Finance/Quotes/'}
      </span>
    </div>
  </div>

  <!-- Document Selector & Status Tabs (Hidden in Print) -->
  <div class="flex items-center justify-between gap-4 print:hidden">
    <!-- Status Filter Pills -->
    <div class="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/50 text-xs font-medium">
      <button
        onclick={() => activeFilter = 'all'}
        class="px-3 py-1.5 rounded-md transition-colors cursor-pointer {activeFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
      >
        All ({currentList.length})
      </button>
      <button
        onclick={() => activeFilter = 'draft'}
        class="px-3 py-1.5 rounded-md transition-colors cursor-pointer {activeFilter === 'draft' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
      >
        Drafts
      </button>
      <button
        onclick={() => activeFilter = 'sent'}
        class="px-3 py-1.5 rounded-md transition-colors cursor-pointer {activeFilter === 'sent' ? 'bg-amber-500/10 text-amber-500 font-semibold' : 'text-muted-foreground hover:text-foreground'}"
      >
        Sent
      </button>
      {#if docType === 'invoices'}
        <button
          onclick={() => activeFilter = 'paid'}
          class="px-3 py-1.5 rounded-md transition-colors cursor-pointer {activeFilter === 'paid' ? 'bg-emerald-500/10 text-emerald-500 font-semibold' : 'text-muted-foreground hover:text-foreground'}"
        >
          Paid
        </button>
      {:else}
        <button
          onclick={() => activeFilter = 'accepted'}
          class="px-3 py-1.5 rounded-md transition-colors cursor-pointer {activeFilter === 'accepted' ? 'bg-emerald-500/10 text-emerald-500 font-semibold' : 'text-muted-foreground hover:text-foreground'}"
        >
          Accepted
        </button>
      {/if}
    </div>

    <!-- Active Documents Quick Picker -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 max-w-xl">
      {#each filteredDocs as doc, idx (doc.id ? `${doc.id}_${idx}` : idx)}
        <button
          onclick={() => selectDoc(doc)}
          class="px-3 py-1.5 rounded-lg text-sm font-mono border transition-all flex-shrink-0 flex items-center gap-2 cursor-pointer {activeDoc?.id === doc.id ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'}"
        >
          <span>{doc.documentNumber}</span>
          <span class="text-xs px-2 py-0.5 rounded-full {doc.status === 'paid' || doc.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-500' : doc.status === 'sent' ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-muted-foreground'}">
            {doc.clientCode}
          </span>
        </button>
      {/each}
    </div>
  </div>

  {#if activeDoc}
    <!-- Main Dual-Pane Studio Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- LEFT PANE: Markdown & Frontmatter Editor (5 Cols) (Hidden in Print) -->
      <div class="lg:col-span-5 rounded-xl border border-border bg-card p-6 shadow-sm space-y-6 print:hidden">
        <div class="flex items-center justify-between border-b border-border pb-4">
          <h2 class="text-base font-bold text-foreground flex items-center gap-2">
            <span>⚙️ Frontmatter Specs</span>
            <span class="text-xs font-mono text-muted-foreground">({activeDoc.documentNumber}.md)</span>
          </h2>

          <div class="flex items-center gap-1.5 text-xs">
            <button
              onclick={() => viewMode = 'edit'}
              class="px-2.5 py-1 rounded-md cursor-pointer {viewMode === 'edit' ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground'}"
            >
              Form
            </button>
            <button
              onclick={() => viewMode = 'markdown'}
              class="px-2.5 py-1 rounded-md cursor-pointer {viewMode === 'markdown' ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground'}"
            >
              Raw YAML
            </button>
          </div>
        </div>

        {#if viewMode === 'edit'}
          <div class="space-y-4 text-sm">
            <!-- Quote Action Banner if viewing a Quote -->
            {#if activeDoc.type === 'quote'}
              <div class="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                <div>
                  <div class="text-sm font-bold text-foreground">Quote Actions</div>
                  <div class="text-xs text-muted-foreground">Convert to draft invoice on client acceptance</div>
                </div>
                {#if activeDoc.linkedInvoiceId}
                  <span class="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                    ✓ {activeDoc.linkedInvoiceId}
                  </span>
                {:else}
                  <button
                    onclick={handleConvertQuote}
                    disabled={isConverting}
                    class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <span>⚡ Convert to Invoice</span>
                  </button>
                {/if}
              </div>
            {/if}

            <!-- Doc Number, Type, Status & Currency -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div class="space-y-1">
                <label class="text-xs font-semibold text-muted-foreground uppercase">Number</label>
                <input
                  type="text"
                  bind:value={activeDoc.documentNumber}
                  oninput={persistActiveDoc}
                  class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div class="space-y-1">
                <label class="text-xs font-semibold text-muted-foreground uppercase">Doc Type</label>
                <select
                  bind:value={activeDoc.type}
                  onchange={persistActiveDoc}
                  class="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="invoice">Invoice</option>
                  <option value="quote">Quote</option>
                </select>
              </div>

              <div class="space-y-1">
                <label class="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                <select
                  bind:value={activeDoc.status}
                  onchange={persistActiveDoc}
                  class="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground font-medium focus:outline-none focus:border-primary"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  {#if activeDoc.type === 'quote'}
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                    <option value="expired">Expired</option>
                  {:else}
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  {/if}
                </select>
              </div>

              <div class="space-y-1">
                <label class="text-xs font-semibold text-muted-foreground uppercase">Currency</label>
                <select
                  bind:value={activeDoc.currency}
                  onchange={() => { recalcTotals(); persistActiveDoc(); }}
                  class="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                >
                  {#each SUPPORTED_CURRENCIES as c}
                    <option value={c.code}>{c.code} ({c.symbol})</option>
                  {/each}
                </select>
              </div>
            </div>

            <!-- Client Picker -->
            <div class="space-y-1">
              <label class="text-xs font-semibold text-muted-foreground uppercase">Assign Client</label>
              <select
                value={activeDoc.clientCode}
                onchange={handleClientSelect}
                class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground font-semibold focus:outline-none focus:border-primary"
              >
                {#each clients as client}
                  <option value={client.code}>[{client.code}] {client.name}</option>
                {/each}
              </select>
            </div>

            <!-- Dates -->
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <label class="text-xs font-semibold text-muted-foreground uppercase">Issue Date</label>
                <input
                  type="date"
                  bind:value={activeDoc.date}
                  onchange={persistActiveDoc}
                  class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs font-semibold text-muted-foreground uppercase">
                  {activeDoc.type === 'quote' ? 'Valid Until' : 'Payment Due Date'}
                </label>
                <input
                  type="date"
                  bind:value={activeDoc.dueDate}
                  onchange={persistActiveDoc}
                  class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <!-- Line Items Builder -->
            <div class="space-y-2 pt-2 border-t border-border">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-muted-foreground uppercase">Line Items</span>
                <div class="flex items-center gap-3">
                  <button
                    onclick={() => showScopeModal = true}
                    class="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>⚡ Scope Preset</span>
                  </button>
                  <button
                    onclick={addLineItem}
                    class="text-xs text-primary hover:underline font-semibold cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {#each activeDoc.items as item, index}
                <div class="p-2.5 bg-muted/20 border border-border/50 rounded-lg space-y-2">
                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      bind:value={item.description}
                      oninput={() => { recalcTotals(); persistActiveDoc(); }}
                      placeholder="Item description..."
                      class="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
                    />
                    <button
                      onclick={() => removeLineItem(index)}
                      class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>

                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <span class="text-xs text-muted-foreground font-semibold">Hours / Qty</span>
                      <input
                        type="number"
                        bind:value={item.quantity}
                        oninput={() => { recalcTotals(); persistActiveDoc(); }}
                        class="w-full px-2.5 py-1.5 rounded border border-border bg-background text-foreground text-sm font-mono"
                      />
                    </div>
                    <div>
                      <span class="text-xs text-muted-foreground font-semibold">Rate ({getCurrencySymbol(activeDoc.currency)})</span>
                      <input
                        type="number"
                        bind:value={item.unitPrice}
                        oninput={() => { recalcTotals(); persistActiveDoc(); }}
                        class="w-full px-2.5 py-1.5 rounded border border-border bg-background text-foreground text-sm font-mono"
                      />
                    </div>
                    <div>
                      <span class="text-xs text-muted-foreground font-semibold">Amount</span>
                      <div class="px-2.5 py-1.5 bg-muted/40 rounded text-foreground font-mono text-sm font-semibold">
                        {formatDocMoney(item.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>

            <!-- Tax & Fiscal Presets -->
            <div class="space-y-2 pt-2 border-t border-border">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-muted-foreground uppercase">Fiscal Tax Preset</span>
                <span class="text-xs font-mono text-primary font-semibold">{activeDoc.taxLabel || 'Tax'}: {activeDoc.taxRatePercent}%</span>
              </div>

              <!-- Quick Presets -->
              <div class="flex flex-wrap gap-1.5">
                {#each TAX_PRESETS as preset}
                  <button
                    type="button"
                    onclick={() => applyTaxPreset(preset)}
                    class="px-2 py-1 rounded text-xs font-mono transition-all border cursor-pointer {activeDoc.taxRatePercent === preset.rate && (preset.rate === 0 || activeDoc.taxLabel === preset.taxLabel) ? 'bg-primary/20 text-primary border-primary/50 font-bold shadow-xs' : 'bg-muted/30 text-muted-foreground border-border hover:text-foreground hover:bg-muted/60'}"
                  >
                    {preset.label}
                  </button>
                {/each}
              </div>

              <div class="grid grid-cols-3 gap-2 pt-1">
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground uppercase">Tax Label</label>
                  <input
                    type="text"
                    bind:value={activeDoc.taxLabel}
                    oninput={persistActiveDoc}
                    placeholder="e.g. SST, VAT"
                    class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground uppercase">Rate (%)</label>
                  <input
                    type="number"
                    bind:value={activeDoc.taxRatePercent}
                    oninput={() => { recalcTotals(); persistActiveDoc(); }}
                    class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background font-mono text-foreground text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground uppercase">Rate Ref</label>
                  <input
                    type="number"
                    bind:value={activeDoc.hourlyRate}
                    oninput={persistActiveDoc}
                    class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background font-mono text-foreground text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <!-- Fiscal & e-Invoicing Identifiers Drawer -->
            <div class="pt-2 border-t border-border">
              <button
                type="button"
                onclick={() => showFiscalDrawer = !showFiscalDrawer}
                class="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase hover:text-foreground cursor-pointer py-1"
              >
                <span class="flex items-center gap-1.5">
                  <span>🏛️ e-Invoicing &amp; Tax Identifiers</span>
                  {#if activeDoc.tin || activeDoc.sstRegistrationNo}
                    <span class="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">Active</span>
                  {/if}
                </span>
                <span class="text-xs">{showFiscalDrawer ? '▲ Hide' : '▼ Expand'}</span>
              </button>

              {#if showFiscalDrawer}
                <div class="space-y-2 pt-2 text-xs">
                  <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1">
                      <label class="font-semibold text-muted-foreground">Studio TIN (e.g. LHDN)</label>
                      <input
                        type="text"
                        bind:value={activeDoc.tin}
                        oninput={persistActiveDoc}
                        placeholder="C25891024090"
                        class="w-full px-2 py-1.5 rounded border border-border bg-background text-foreground font-mono text-xs"
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="font-semibold text-muted-foreground">Studio SST No</label>
                      <input
                        type="text"
                        bind:value={activeDoc.sstRegistrationNo}
                        oninput={persistActiveDoc}
                        placeholder="W10-1808-32000012"
                        class="w-full px-2 py-1.5 rounded border border-border bg-background text-foreground font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1">
                      <label class="font-semibold text-muted-foreground">Buyer TIN</label>
                      <input
                        type="text"
                        bind:value={activeDoc.buyerTin}
                        oninput={persistActiveDoc}
                        placeholder="C10293847560"
                        class="w-full px-2 py-1.5 rounded border border-border bg-background text-foreground font-mono text-xs"
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="font-semibold text-muted-foreground">Buyer SST No</label>
                      <input
                        type="text"
                        bind:value={activeDoc.buyerSstNo}
                        oninput={persistActiveDoc}
                        placeholder="B01-1904-41000088"
                        class="w-full px-2 py-1.5 rounded border border-border bg-background text-foreground font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              {/if}
            </div>

            <!-- Notes & Terms Details -->
            <div class="space-y-1 pt-2 border-t border-border">
              <label class="text-xs font-semibold text-muted-foreground uppercase">
                {activeDoc.type === 'quote' ? 'Proposal Validity & Revision Terms' : 'Payment Terms & Notes'}
              </label>
              <textarea
                bind:value={activeDoc.notes}
                rows="2"
                oninput={persistActiveDoc}
                class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
              ></textarea>
            </div>

            <!-- Delete Document Action -->
            <div class="pt-4 border-t border-border flex items-center justify-between">
              <button
                onclick={handleDeleteDocument}
                class="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Delete {activeDoc.type === 'quote' ? 'Quote' : 'Invoice'}
              </button>
              <span class="text-xs text-muted-foreground font-mono">
                {activeDoc.documentNumber}.md
              </span>
            </div>
          </div>
        {:else}
          <!-- RAW YAML PREVIEW -->
          <pre class="p-4 bg-black/80 text-emerald-400 font-mono text-sm rounded-lg overflow-x-auto whitespace-pre leading-relaxed border border-border/40">
{financeService.toMarkdown(activeDoc)}
          </pre>
        {/if}
      </div>

      <!-- RIGHT PANE: Live Printable Preview (7 Cols) (Always printed) -->
      <div class="lg:col-span-7 space-y-3">
        <!-- Theme & Branding Switcher Toolbar (Hidden in Print) -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-2.5 rounded-xl print:hidden text-xs">
          <div class="flex flex-wrap items-center gap-3">
            <!-- Theme -->
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Theme:</span>
              <div class="inline-flex rounded-lg p-0.5 bg-muted border border-border">
                <button
                  type="button"
                  onclick={() => setInvoiceTheme('geist')}
                  class="px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer {(activeDoc.theme || 'geist') === 'geist' ? 'bg-background text-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
                >
                  Geist
                </button>
                <button
                  type="button"
                  onclick={() => setInvoiceTheme('swiss')}
                  class="px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer {activeDoc.theme === 'swiss' ? 'bg-background text-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
                >
                  Swiss
                </button>
                <button
                  type="button"
                  onclick={() => setInvoiceTheme('letterpress')}
                  class="px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer {activeDoc.theme === 'letterpress' ? 'bg-background text-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
                >
                  Letterpress
                </button>
              </div>
            </div>

            <!-- Official Stamps -->
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Stamp:</span>
              <div class="inline-flex rounded-lg p-0.5 bg-muted border border-border">
                <button
                  type="button"
                  onclick={() => setDocStamp('none')}
                  class="px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer {(activeDoc.stamp || 'none') === 'none' ? 'bg-background text-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
                >
                  None
                </button>
                <button
                  type="button"
                  onclick={() => setDocStamp('paid')}
                  class="px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer {activeDoc.stamp === 'paid' ? 'bg-rose-500/15 text-rose-500 font-bold border border-rose-500/30' : 'text-muted-foreground hover:text-foreground'}"
                >
                  PAID
                </button>
                <button
                  type="button"
                  onclick={() => setDocStamp('approved')}
                  class="px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer {activeDoc.stamp === 'approved' ? 'bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30' : 'text-muted-foreground hover:text-foreground'}"
                >
                  APPROVED
                </button>
                <button
                  type="button"
                  onclick={() => setDocStamp('draft')}
                  class="px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer {activeDoc.stamp === 'draft' ? 'bg-zinc-500/15 text-zinc-300 font-bold border border-zinc-500/30' : 'text-muted-foreground hover:text-foreground'}"
                >
                  DRAFT
                </button>
                <button
                  type="button"
                  onclick={() => setDocStamp('seal')}
                  class="px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer {activeDoc.stamp === 'seal' ? 'bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30' : 'text-muted-foreground hover:text-foreground'}"
                >
                  SEAL
                </button>
              </div>
            </div>

            <!-- Client Accent Toggle -->
            <button
              type="button"
              onclick={toggleClientAccent}
              class="px-2 py-1 rounded-md border text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer {activeDoc.showClientAccent ? 'bg-primary/15 text-primary border-primary/30 font-semibold' : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'}"
              title="Display client brand swatches and custom accent styling"
            >
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background: {getClientPalette(activeDoc.clientCode).primary}"></span>
              <span>Client Swatches</span>
            </button>
          </div>

          <div class="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span class="font-semibold text-foreground">{activeDoc.currency} ({getCurrencySymbol(activeDoc.currency)})</span>
            <span>·</span>
            <span>{activeDoc.taxLabel || 'Tax'} {activeDoc.taxRatePercent}%</span>
          </div>
        </div>

        <!-- Document Paper Preview Card -->
        <div class="invoice-paper-card theme-{activeDoc.theme || 'geist'} rounded-xl border p-8 sm:p-12 shadow-md space-y-8 print:border-none print:shadow-none print:p-0 print:m-0 relative overflow-hidden">
          
          <!-- Tactile Official Rubber Stamp -->
          {#if activeDoc.stamp && activeDoc.stamp !== 'none'}
            {#if activeDoc.stamp === 'paid'}
              <div class="tactile-stamp stamp-paid animate-scaleIn">
                PAID
              </div>
            {:else if activeDoc.stamp === 'approved'}
              <div class="tactile-stamp stamp-approved animate-scaleIn">
                APPROVED
              </div>
            {:else if activeDoc.stamp === 'draft'}
              <div class="tactile-stamp stamp-draft animate-scaleIn">
                DRAFT
              </div>
            {:else if activeDoc.stamp === 'seal'}
              <div class="tactile-stamp stamp-seal animate-scaleIn">
                <div class="seal-ring">
                  <span class="seal-code">{activeDoc.clientCode || 'KANSO'}</span>
                  <span class="seal-word">OFFICIAL</span>
                  <span class="seal-year">{new Date().getFullYear()}</span>
                </div>
              </div>
            {/if}
          {/if}

          <!-- Client Brand Swatch Bar (if enabled) -->
          {#if activeDoc.showClientAccent}
            {@const palette = getClientPalette(activeDoc.clientCode)}
            <div class="client-swatch-strip flex items-center justify-between pb-3 mb-2 border-b border-dashed border-border/70 text-[11px] font-mono print:hidden">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-muted-foreground uppercase font-bold text-[10px] tracking-wider">Client Swatches:</span>
                <div class="inline-flex items-center gap-1.5 flex-wrap">
                  {#each [
                    { label: 'Primary', color: palette.primary },
                    { label: 'Secondary', color: palette.secondary },
                    { label: 'Dark', color: palette.dark },
                    { label: 'Accent', color: palette.accent }
                  ] as swatch}
                    <button
                      type="button"
                      onclick={() => copyHex(swatch.color)}
                      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border/80 bg-background hover:bg-muted/50 text-[10px] text-foreground transition-colors cursor-pointer"
                      title="Click to copy {swatch.label} ({swatch.color})"
                    >
                      <span class="w-2.5 h-2.5 rounded-full border border-black/15 flex-shrink-0" style="background: {swatch.color}"></span>
                      <span>{swatch.color}</span>
                    </button>
                  {/each}
                </div>
              </div>
              {#if copiedHex}
                <span class="text-xs font-semibold text-emerald-500 animate-fadeIn">✓ Copied {copiedHex}!</span>
              {/if}
            </div>
          {/if}

          <!-- Document Header -->
          <div class="doc-header-row flex justify-between items-start border-b pb-6">
            <div class="flex items-start gap-4">
              {#if studioService.profile.logo}
                <img
                  src={studioService.profile.logo}
                  alt={activeDoc.freelancerName}
                  class="studio-logo w-14 h-14 object-contain rounded-md border p-1 flex-shrink-0"
                />
              {/if}
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="studio-title text-2xl font-bold tracking-tight">{activeDoc.freelancerName}</h2>
                  {#if studioService.profile.businessRegNo}
                    <span class="reg-pill text-xs font-mono font-semibold px-2 py-0.5 rounded border">
                      {studioService.profile.businessRegNo}
                    </span>
                  {/if}
                </div>
                {#if studioService.profile.tagline}
                  <div class="studio-tagline text-xs font-medium tracking-wide mt-0.5">
                    {studioService.profile.tagline}
                  </div>
                {/if}
                <p class="studio-details text-sm mt-1 leading-relaxed">
                  {activeDoc.freelancerAddress}<br />
                  {activeDoc.freelancerEmail} · {activeDoc.freelancerPhone}
                  {#if studioService.profile.website}
                    · <span class="font-mono">{studioService.profile.website}</span>
                  {/if}
                </p>

                {#if activeDoc.tin || activeDoc.sstRegistrationNo}
                  <div class="fiscal-badge-row flex items-center gap-2 mt-2 flex-wrap text-[11px] font-mono">
                    {#if activeDoc.tin}
                      <span class="fiscal-chip px-2 py-0.5 rounded border">
                        TIN: <strong>{activeDoc.tin}</strong>
                      </span>
                    {/if}
                    {#if activeDoc.sstRegistrationNo}
                      <span class="fiscal-chip px-2 py-0.5 rounded border">
                        SST: <strong>{activeDoc.sstRegistrationNo}</strong>
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>

            <div class="text-right">
              <span class="doc-type-badge text-sm font-bold font-mono tracking-widest uppercase" style="color: {getClientPalette(activeDoc.clientCode).primary}">
                {activeDoc.type === 'quote' ? 'CREATIVE PROPOSAL & QUOTE' : 'COMMERCIAL INVOICE'}
              </span>
              <div class="doc-number text-2xl font-mono font-bold mt-0.5">{activeDoc.documentNumber}</div>
              
              <div class="mt-2 flex flex-col items-end gap-1">
                <span class="status-badge inline-block px-2.5 py-0.5 rounded text-xs font-bold font-mono uppercase {activeDoc.status === 'paid' || activeDoc.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : activeDoc.status === 'sent' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-800'}">
                  {activeDoc.status.toUpperCase()}
                </span>

                {#if activeDoc.linkedInvoiceId}
                  <span class="text-xs font-mono font-semibold text-emerald-700">
                    ✓ Generated: {activeDoc.linkedInvoiceId}
                  </span>
                {/if}

                {#if activeDoc.linkedQuoteId}
                  <span class="text-xs font-mono text-zinc-500">
                    Quote Ref: {activeDoc.linkedQuoteId}
                  </span>
                {/if}
              </div>
            </div>
          </div>

          <!-- Billed To & Dates Grid -->
          <div class="grid grid-cols-2 gap-8 text-sm">
            <div>
              <span class="section-label font-bold uppercase tracking-wider text-xs">Client / Recipient:</span>
              <h3 class="client-name font-bold text-base mt-1">{activeDoc.clientName}</h3>
              <p class="client-details mt-0.5 leading-relaxed">
                Attn: {activeDoc.clientContact}<br />
                {activeDoc.clientEmail}<br />
                {activeDoc.clientAddress}
              </p>

              {#if activeDoc.buyerTin || activeDoc.buyerSstNo}
                <div class="fiscal-badge-row flex items-center gap-2 mt-2 flex-wrap text-[11px] font-mono">
                  {#if activeDoc.buyerTin}
                    <span class="fiscal-chip px-2 py-0.5 rounded border">
                      Buyer TIN: <strong>{activeDoc.buyerTin}</strong>
                    </span>
                  {/if}
                  {#if activeDoc.buyerSstNo}
                    <span class="fiscal-chip px-2 py-0.5 rounded border">
                      Buyer SST: <strong>{activeDoc.buyerSstNo}</strong>
                    </span>
                  {/if}
                </div>
              {/if}
            </div>

            <div class="space-y-2 text-right">
              <div>
                <span class="section-label text-xs uppercase font-semibold">Date of Issue:</span>
                <div class="font-mono font-medium">{activeDoc.date}</div>
              </div>
              <div>
                <span class="section-label text-xs uppercase font-semibold">
                  {activeDoc.type === 'quote' ? 'Proposal Valid Until:' : 'Payment Due Date:'}
                </span>
                <div class="due-date font-mono font-bold">{activeDoc.dueDate}</div>
              </div>
            </div>
          </div>

          <!-- Line Items Table -->
          <div class="overflow-x-auto">
            <table class="doc-table w-full text-sm text-left">
              <thead>
                <tr class="table-header-row border-b uppercase font-semibold text-xs tracking-wider">
                  <th class="py-2.5">Scope &amp; Description</th>
                  <th class="py-2.5 text-center w-16">Hours / Qty</th>
                  <th class="py-2.5 text-right w-28">Rate ({getCurrencySymbol(activeDoc.currency)})</th>
                  <th class="py-2.5 text-right w-32">Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                {#each activeDoc.items as item}
                  <tr>
                    <td class="py-3 font-medium item-desc">{item.description}</td>
                    <td class="py-3 text-center font-mono item-qty">{item.quantity}</td>
                    <td class="py-3 text-right font-mono item-rate">{formatDocMoney(item.unitPrice)}</td>
                    <td class="py-3 text-right font-bold font-mono item-amount">{formatDocMoney(item.amount)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Summary & Totals -->
          <div class="flex justify-end pt-4 border-t text-sm">
            <div class="w-68 space-y-2">
              <div class="flex justify-between summary-line">
                <span>Subtotal:</span>
                <span class="font-mono font-medium">{formatDocMoney(activeDoc.subtotal)}</span>
              </div>
              {#if activeDoc.taxRatePercent > 0}
                <div class="flex justify-between summary-line">
                  <span>{activeDoc.taxLabel || 'Tax'} ({activeDoc.taxRatePercent}%):</span>
                  <span class="font-mono font-medium">{formatDocMoney(activeDoc.taxAmount)}</span>
                </div>
              {/if}
              <div class="total-line flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total Due:</span>
                <span class="font-mono">{formatDocMoney(activeDoc.total)}</span>
              </div>
            </div>
          </div>

          <!-- Terms, Banking & Instructions -->
          <div class="doc-instructions-box pt-6 border-t text-sm space-y-3 p-5 rounded-lg">
            {#if activeDoc.type === 'invoice'}
              <div>
                <span class="section-label font-bold uppercase tracking-wider text-xs">Payment Settlement Instructions:</span>
                <p class="font-mono mt-1 leading-relaxed">
                  Bank: <strong>{activeDoc.paymentBank || studioService.profile.paymentBank}</strong><br />
                  Account No: <strong>{activeDoc.paymentAccount || studioService.profile.paymentAccountNo}</strong><br />
                  Account Name: <strong>{activeDoc.paymentAccountName || studioService.profile.paymentAccountName || studioService.profile.studioName}</strong>
                  {#if studioService.profile.paymentSwiftOrQr}
                    <br />Routing / Swift: <strong>{studioService.profile.paymentSwiftOrQr}</strong>
                  {/if}
                </p>
              </div>
            {:else}
              <div>
                <span class="section-label font-bold uppercase tracking-wider text-xs">Quote Acceptance Terms:</span>
                <p class="mt-1 leading-relaxed">
                  {studioService.profile.defaultPaymentTerms || 'To accept this proposal, reply with formal approval or signed purchase order. Work begins upon deposit settlement.'}
                </p>
              </div>
            {/if}

            {#if activeDoc.notes}
              <div class="notes-block text-xs border-t pt-2">
                {activeDoc.notes}
              </div>
            {/if}
          </div>

          <!-- Digital Signature & Footer Note -->
          <div class="pt-6 border-t flex items-end justify-between text-xs">
            <div class="max-w-sm">
              <div class="font-semibold uppercase tracking-wider text-[10px]">Footer Note</div>
              <p class="footer-notice mt-0.5 italic leading-normal">
                {studioService.profile.footerNotice || 'Crafted with mindful focus & precision in Kanso Cre8.'}
              </p>
            </div>

            <div class="text-right flex flex-col items-end">
              <div class="text-[10px] font-bold uppercase tracking-wider mb-1">
                Authorized Signature &amp; Seal
              </div>
              {#if studioService.profile.digitalSignature}
                {#if studioService.profile.digitalSignature.startsWith('data:image') || studioService.profile.digitalSignature.startsWith('http')}
                  <img
                    src={studioService.profile.digitalSignature}
                    alt="Signature"
                    class="h-10 object-contain max-w-[140px] my-1"
                  />
                {:else}
                  <div class="font-serif italic text-lg px-3 py-1 border-b min-w-[140px] text-center">
                    {studioService.profile.digitalSignature}
                  </div>
                {/if}
              {:else}
                <div class="font-serif italic text-lg px-3 py-1 border-b min-w-[140px] text-center">
                  {studioService.profile.principalName || 'Principal Director'}
                </div>
              {/if}
              <div class="text-[11px] font-semibold mt-1">
                {studioService.profile.principalName || activeDoc.freelancerName}
              </div>
              <div class="text-[10px] opacity-75">
                {studioService.profile.professionalTitle || 'Principal Art Director'}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  {:else}
    <div class="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
      No documents found in this view. Click "New {docType === 'invoices' ? 'Invoice' : 'Quote'}" to create your first document.
    </div>
  {/if}

  <!-- Creative Discipline Scope Presets Modal -->
  <ScopeTemplateModal
    isOpen={showScopeModal}
    hourlyRate={activeDoc ? (activeDoc.hourlyRate || 150) : 150}
    currency={activeDoc ? activeDoc.currency : 'MYR'}
    onApply={handleApplyScopePreset}
    onClose={() => showScopeModal = false}
  />
</div>

<style>
  /* ══════════════════════════════════════════════════════════════════════════
     PRINTABLE INVOICE THEMES: GEIST MINIMALIST, SWISS MODERNIST, LETTERPRESS
     ══════════════════════════════════════════════════════════════════════════ */

  /* 1. GEIST MINIMALIST (Default Tech & Studio Aesthetic) */
  .invoice-paper-card.theme-geist {
    background: #ffffff;
    color: #18181b;
    border-color: #e4e4e7;
    font-family: var(--font-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  }
  .theme-geist .doc-header-row,
  .theme-geist .table-header-row,
  .theme-geist .border-t,
  .theme-geist .border-b {
    border-color: #e4e4e7;
  }
  .theme-geist .studio-logo {
    background: #fafafa;
    border-color: #e4e4e7;
  }
  .theme-geist .studio-title {
    color: #09090b;
  }
  .theme-geist .reg-pill,
  .theme-geist .fiscal-chip {
    background: #f4f4f5;
    color: #52525b;
    border-color: #e4e4e7;
  }
  .theme-geist .studio-details,
  .theme-geist .client-details,
  .theme-geist .summary-line {
    color: #71717a;
  }
  .theme-geist .section-label,
  .theme-geist .table-header-row {
    color: #a1a1aa;
  }
  .theme-geist .total-line {
    border-color: #d4d4d8;
    color: #09090b;
  }
  .theme-geist .doc-instructions-box {
    background: #fafafa;
    border-color: #e4e4e7;
    color: #52525b;
  }

  /* 2. SWISS MODERNIST (Josef Müller-Brockmann / Stark Asymmetric Contrast) */
  .invoice-paper-card.theme-swiss {
    background: #ffffff;
    color: #000000;
    border: 1px solid #000000;
    border-top: 8px solid #000000;
    border-radius: 0;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
  .theme-swiss .doc-header-row {
    border-bottom: 3px solid #000000;
  }
  .theme-swiss .studio-title {
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -0.03em;
    color: #000000;
  }
  .theme-swiss .studio-logo {
    border-radius: 0;
    border: 2px solid #000000;
    background: #ffffff;
  }
  .theme-swiss .reg-pill,
  .theme-swiss .fiscal-chip {
    border-radius: 0;
    background: #000000;
    color: #ffffff;
    border: 1px solid #000000;
    font-weight: 700;
  }
  .theme-swiss .section-label,
  .theme-swiss .table-header-row {
    color: #000000;
    font-weight: 800;
    letter-spacing: 0.12em;
  }
  .theme-swiss .table-header-row {
    border-bottom: 2px solid #000000;
  }
  .theme-swiss .doc-table tbody tr {
    border-bottom: 1px solid #e0e0e0;
  }
  .theme-swiss .total-line {
    border-top: 3px solid #000000;
    color: #000000;
    font-weight: 900;
    font-size: 1.25rem;
  }
  .theme-swiss .doc-instructions-box {
    border-radius: 0;
    background: #f4f4f4;
    border: 1px solid #000000;
    color: #111111;
  }
  .theme-swiss .status-badge {
    border-radius: 0;
    border: 1px solid #000000;
  }

  /* 3. CLASSIC LETTERPRESS (Warm Parchment & Editorial Refined Serif) */
  .invoice-paper-card.theme-letterpress {
    background: #fdfbf7;
    color: #2c2724;
    border: 2px solid #8c827a;
    border-radius: 4px;
    font-family: Georgia, 'Times New Roman', Times, serif;
    box-shadow: 0 4px 20px rgba(70, 60, 50, 0.08);
  }
  .theme-letterpress .doc-header-row {
    border-bottom: 3px double #8c827a;
  }
  .theme-letterpress .studio-title {
    font-family: 'Times New Roman', Times, Georgia, serif;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #1a1614;
  }
  .theme-letterpress .studio-logo {
    border-radius: 2px;
    border: 1px solid #8c827a;
    background: #fdfbf7;
  }
  .theme-letterpress .reg-pill,
  .theme-letterpress .fiscal-chip {
    border-radius: 2px;
    background: #f4efe6;
    color: #4a4039;
    border: 1px solid #b8aea4;
  }
  .theme-letterpress .section-label,
  .theme-letterpress .table-header-row {
    color: #7a6e65;
    font-family: 'Times New Roman', Times, Georgia, serif;
    letter-spacing: 0.08em;
  }
  .theme-letterpress .table-header-row {
    border-bottom: 2px solid #8c827a;
  }
  .theme-letterpress .doc-table tbody tr {
    border-bottom: 1px dashed #d8cebe;
  }
  .theme-letterpress .total-line {
    border-top: 3px double #8c827a;
    color: #1a1614;
    font-weight: 700;
  }
  .theme-letterpress .doc-instructions-box {
    border-radius: 2px;
    background: #f8f3eb;
    border: 1px solid #c8bea8;
    color: #38302a;
  }
  .theme-letterpress .status-badge {
    border-radius: 2px;
    border: 1px solid #8c827a;
  }
  .theme-letterpress .footer-notice {
    font-family: Georgia, serif;
    color: #5a5048;
  }

  /* 4. TACTILE OFFICIAL RUBBER STAMPS */
  .tactile-stamp {
    position: absolute;
    top: 130px;
    right: 48px;
    z-index: 20;
    pointer-events: none;
    user-select: none;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-weight: 900;
    text-transform: uppercase;
    text-align: center;
    mix-blend-mode: multiply;
    opacity: 0.88;
  }
  .stamp-paid {
    color: #dc2626;
    border: 4px double #dc2626;
    padding: 6px 18px;
    font-size: 26px;
    letter-spacing: 0.25em;
    border-radius: 6px;
    transform: rotate(-12deg);
    box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.15);
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
    color: #6b7280;
    border: 3px dashed #6b7280;
    padding: 6px 20px;
    font-size: 22px;
    letter-spacing: 0.28em;
    border-radius: 4px;
    transform: rotate(-15deg);
  }
  .stamp-seal {
    color: #d97706;
    border: 3px solid #d97706;
    border-radius: 50%;
    width: 86px;
    height: 86px;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: rotate(8deg);
  }
  .stamp-seal .seal-ring {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 9px;
    letter-spacing: 0.1em;
    line-height: 1.2;
  }
  .stamp-seal .seal-word {
    font-size: 12px;
    font-weight: 900;
  }

  /* 5. PRINT MEDIA OPTIMIZATIONS */
  @page {
    size: A4 portrait;
    margin: 12mm 15mm;
  }
  @media print {
    body {
      background: #ffffff !important;
    }
    .invoice-paper-card {
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .doc-table tr,
    .doc-instructions-box,
    .doc-header-row,
    .totals-box {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
</style>
