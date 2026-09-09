<script lang="ts">
  import { onMount } from 'svelte';
  import { financeService } from '../services/financeService';
  import { clientService } from '../services/clientService';
  import { appState } from '../stores/appState.svelte';
  import type { InvoiceDocument, ClientProfile, InvoiceLineItem } from '../types/kanso';

  let docType: 'invoices' | 'quotes' = $state('invoices');
  let invoices: InvoiceDocument[] = $state([]);
  let quotes: InvoiceDocument[] = $state([]);
  let clients: ClientProfile[] = $state([]);
  let activeDoc: InvoiceDocument | null = $state(null);
  let viewMode: 'edit' | 'markdown' = $state('edit');
  let activeFilter: string = $state('all');
  let isConverting = $state(false);

  onMount(async () => {
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
    activeDoc.taxAmount = (activeDoc.subtotal * (activeDoc.taxRatePercent || 0)) / 100;
    activeDoc.total = activeDoc.subtotal + activeDoc.taxAmount;
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
    const defaultClient = clients[0] || {
      code: 'ACME',
      name: 'Acme Corporation',
      contactPerson: 'Sarah Jenkins',
      email: 'billing@acmefintech.io',
      billingAddress: '100 Market St, Suite 400, San Francisco, CA 94105',
      currency: 'USD',
      defaultHourlyRate: 125
    };

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
      freelancerName: 'Harusssani Creative Vault',
      freelancerEmail: 'contact@kansocre8.local',
      freelancerPhone: '+1 (555) 019-2834',
      freelancerAddress: 'San Francisco, CA',
      paymentBank: 'First Creative Bank',
      paymentAccount: '9876-5432-1098',
      paymentAccountName: 'Harusssani Manaphassan',
      currency: defaultClient.currency || 'USD',
      hourlyRate: defaultClient.defaultHourlyRate || 125,
      items: [
        {
          id: '1',
          description: 'Brand Identity & Visual Asset Package',
          quantity: 1,
          unitPrice: 1500,
          amount: 1500
        }
      ],
      taxRatePercent: 0,
      subtotal: 1500,
      taxAmount: 0,
      total: 1500,
      notes: 'Payment due within 14 days of invoice date. Thank you for your partnership!'
    };

    financeService.saveDocument(newDoc);
    invoices = financeService.getDocuments();
    activeDoc = newDoc;
    docType = 'invoices';
  }

  function createNewQuote() {
    const defaultClient = clients.find(c => c.code === 'NEX') || clients[0] || {
      code: 'NEX',
      name: 'Nexus Studio',
      contactPerson: 'Alex Rivera',
      email: 'billing@nexusstudio.io',
      billingAddress: '550 Howard St, San Francisco, CA 94105',
      currency: 'USD',
      defaultHourlyRate: 140
    };

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
      freelancerName: 'Harusssani Creative Vault',
      freelancerEmail: 'contact@kansocre8.local',
      freelancerPhone: '+1 (555) 019-2834',
      freelancerAddress: 'San Francisco, CA',
      paymentBank: 'First Creative Bank',
      paymentAccount: '9876-5432-1098',
      paymentAccountName: 'Harusssani Manaphassan',
      currency: defaultClient.currency || 'USD',
      hourlyRate: defaultClient.defaultHourlyRate || 140,
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
      subtotal: (defaultClient.defaultHourlyRate || 140) * 20,
      taxAmount: 0,
      total: (defaultClient.defaultHourlyRate || 140) * 20,
      notes: 'Quote valid for 14 days from issue date. Includes 2 rounds of creative revisions.'
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

<div class="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn print:p-0 print:m-0 print:max-w-none">
  <!-- Top Navigation & Actions (Hidden in Print) -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6 print:hidden">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
        <span class="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </span>
        Quotes &amp; Invoice Studio
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        Offline-first Markdown financial desk. Pure <code class="font-mono text-primary text-xs">_Finance/Quotes/</code> &amp; <code class="font-mono text-primary text-xs">_Finance/Invoices/</code> storage.
      </p>
    </div>

    <div class="flex items-center gap-3">
      {#if docType === 'invoices'}
        <button
          onclick={createNewInvoice}
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </button>
      {:else}
        <button
          onclick={createNewQuote}
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Quote
        </button>
      {/if}

      <button
        onclick={triggerPrint}
        class="inline-flex items-center gap-2 px-4 py-2 border border-border bg-card hover:bg-muted/50 text-foreground text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
      >
        <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print / Export PDF
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
      {#each filteredDocs as doc (doc.id)}
        <button
          onclick={() => selectDoc(doc)}
          class="px-3 py-1.5 rounded-lg text-xs font-mono border transition-all flex-shrink-0 flex items-center gap-2 cursor-pointer {activeDoc?.id === doc.id ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'}"
        >
          <span>{doc.documentNumber}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full {doc.status === 'paid' || doc.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-500' : doc.status === 'sent' ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-muted-foreground'}">
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
          <h2 class="text-sm font-bold text-foreground flex items-center gap-2">
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
          <div class="space-y-4 text-xs">
            <!-- Quote Action Banner if viewing a Quote -->
            {#if activeDoc.type === 'quote'}
              <div class="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                <div>
                  <div class="text-xs font-bold text-foreground">Quote Actions</div>
                  <div class="text-[11px] text-muted-foreground">Convert to draft invoice on client acceptance</div>
                </div>
                {#if activeDoc.linkedInvoiceId}
                  <span class="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold">
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

            <!-- Doc Number, Type & Status -->
            <div class="grid grid-cols-3 gap-2">
              <div class="space-y-1">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Number</label>
                <input
                  type="text"
                  bind:value={activeDoc.documentNumber}
                  oninput={persistActiveDoc}
                  class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Doc Type</label>
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
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Status</label>
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
            </div>

            <!-- Client Picker -->
            <div class="space-y-1">
              <label class="text-[10px] font-semibold text-muted-foreground uppercase">Assign Client</label>
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
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Issue Date</label>
                <input
                  type="date"
                  bind:value={activeDoc.date}
                  onchange={persistActiveDoc}
                  class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">
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
                <span class="text-[10px] font-semibold text-muted-foreground uppercase">Line Items</span>
                <button
                  onclick={addLineItem}
                  class="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  + Add Item
                </button>
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
                      <span class="text-[9px] text-muted-foreground">Hours / Qty</span>
                      <input
                        type="number"
                        bind:value={item.quantity}
                        oninput={() => { recalcTotals(); persistActiveDoc(); }}
                        class="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
                      />
                    </div>
                    <div>
                      <span class="text-[9px] text-muted-foreground">Rate ({activeDoc.currency})</span>
                      <input
                        type="number"
                        bind:value={item.unitPrice}
                        oninput={() => { recalcTotals(); persistActiveDoc(); }}
                        class="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
                      />
                    </div>
                    <div>
                      <span class="text-[9px] text-muted-foreground">Amount</span>
                      <div class="px-2 py-1 bg-muted/40 rounded text-foreground font-mono text-xs font-semibold">
                        {item.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>

            <!-- Tax Rate Input -->
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <div class="space-y-1">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Tax Rate (%)</label>
                <input
                  type="number"
                  bind:value={activeDoc.taxRatePercent}
                  oninput={() => { recalcTotals(); persistActiveDoc(); }}
                  class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Hourly Rate Ref</label>
                <input
                  type="number"
                  bind:value={activeDoc.hourlyRate}
                  oninput={persistActiveDoc}
                  class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <!-- Notes & Terms Details -->
            <div class="space-y-1 pt-2 border-t border-border">
              <label class="text-[10px] font-semibold text-muted-foreground uppercase">
                {activeDoc.type === 'quote' ? 'Proposal Validity & Revision Terms' : 'Payment Terms & Notes'}
              </label>
              <textarea
                bind:value={activeDoc.notes}
                rows="2"
                oninput={persistActiveDoc}
                class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
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
              <span class="text-[10px] text-muted-foreground font-mono">
                {activeDoc.documentNumber}.md
              </span>
            </div>
          </div>
        {:else}
          <!-- RAW YAML PREVIEW -->
          <pre class="p-4 bg-black/80 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto whitespace-pre leading-relaxed border border-border/40">
{financeService.toMarkdown(activeDoc)}
          </pre>
        {/if}
      </div>

      <!-- RIGHT PANE: Live Printable Preview (7 Cols) (Always printed) -->
      <div class="lg:col-span-7 bg-white text-zinc-900 rounded-xl border border-zinc-200 p-8 sm:p-12 shadow-md space-y-8 print:border-none print:shadow-none print:p-0 print:m-0">
        
        <!-- Document Header -->
        <div class="flex justify-between items-start border-b border-zinc-200 pb-6">
          <div>
            <h2 class="text-xl font-bold text-zinc-950 tracking-tight">{activeDoc.freelancerName}</h2>
            <p class="text-xs text-zinc-500 mt-1 leading-relaxed">
              {activeDoc.freelancerAddress}<br />
              {activeDoc.freelancerEmail} · {activeDoc.freelancerPhone}
            </p>
          </div>

          <div class="text-right">
            <span class="text-xs font-bold font-mono tracking-widest uppercase" style="color: {getClientPalette(activeDoc.clientCode).primary}">
              {activeDoc.type === 'quote' ? 'CREATIVE PROPOSAL & QUOTE' : 'COMMERCIAL INVOICE'}
            </span>
            <div class="text-xl font-mono font-bold text-zinc-950 mt-0.5">{activeDoc.documentNumber}</div>
            
            <div class="mt-2 flex flex-col items-end gap-1">
              <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase {activeDoc.status === 'paid' || activeDoc.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : activeDoc.status === 'sent' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-800'}">
                {activeDoc.status.toUpperCase()}
              </span>

              {#if activeDoc.linkedInvoiceId}
                <span class="text-[10px] font-mono font-semibold text-emerald-700">
                  ✓ Generated: {activeDoc.linkedInvoiceId}
                </span>
              {/if}

              {#if activeDoc.linkedQuoteId}
                <span class="text-[10px] font-mono text-zinc-500">
                  Quote Ref: {activeDoc.linkedQuoteId}
                </span>
              {/if}
            </div>
          </div>
        </div>

        <!-- Billed To & Dates Grid -->
        <div class="grid grid-cols-2 gap-8 text-xs">
          <div>
            <span class="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Client / Recipient:</span>
            <h3 class="font-bold text-zinc-900 text-sm mt-1">{activeDoc.clientName}</h3>
            <p class="text-zinc-600 mt-0.5 leading-relaxed">
              Attn: {activeDoc.clientContact}<br />
              {activeDoc.clientEmail}<br />
              {activeDoc.clientAddress}
            </p>
          </div>

          <div class="space-y-2 text-right">
            <div>
              <span class="text-zinc-400 text-[10px] uppercase font-semibold">Date of Issue:</span>
              <div class="font-mono font-medium text-zinc-900">{activeDoc.date}</div>
            </div>
            <div>
              <span class="text-zinc-400 text-[10px] uppercase font-semibold">
                {activeDoc.type === 'quote' ? 'Proposal Valid Until:' : 'Payment Due Date:'}
              </span>
              <div class="font-mono font-bold text-zinc-950">{activeDoc.dueDate}</div>
            </div>
          </div>
        </div>

        <!-- Line Items Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead>
              <tr class="border-b border-zinc-200 text-zinc-400 uppercase font-semibold text-[10px] tracking-wider">
                <th class="py-2.5">Scope &amp; Description</th>
                <th class="py-2.5 text-center w-16">Hours / Qty</th>
                <th class="py-2.5 text-right w-24">Rate</th>
                <th class="py-2.5 text-right w-28">Amount ({activeDoc.currency})</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
              {#each activeDoc.items as item}
                <tr>
                  <td class="py-3 font-medium text-zinc-900">{item.description}</td>
                  <td class="py-3 text-center text-zinc-600 font-mono">{item.quantity}</td>
                  <td class="py-3 text-right text-zinc-600 font-mono">{item.unitPrice.toFixed(2)}</td>
                  <td class="py-3 text-right font-bold text-zinc-950 font-mono">{item.amount.toFixed(2)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Summary & Totals -->
        <div class="flex justify-end pt-4 border-t border-zinc-200 text-xs">
          <div class="w-56 space-y-2">
            <div class="flex justify-between text-zinc-500">
              <span>Subtotal:</span>
              <span class="font-mono font-medium text-zinc-900">{activeDoc.currency} {activeDoc.subtotal.toFixed(2)}</span>
            </div>
            {#if activeDoc.taxRatePercent > 0}
              <div class="flex justify-between text-zinc-500">
                <span>Tax ({activeDoc.taxRatePercent}%):</span>
                <span class="font-mono font-medium text-zinc-900">{activeDoc.currency} {activeDoc.taxAmount.toFixed(2)}</span>
              </div>
            {/if}
            <div class="flex justify-between text-base font-bold text-zinc-950 pt-2 border-t border-zinc-300">
              <span>Total:</span>
              <span class="font-mono">{activeDoc.currency} {activeDoc.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Terms, Banking & Instructions -->
        <div class="pt-6 border-t border-zinc-200 text-xs text-zinc-600 space-y-3 bg-zinc-50 p-4 rounded-lg">
          {#if activeDoc.type === 'invoice'}
            <div>
              <span class="font-bold text-zinc-800 uppercase tracking-wider text-[10px]">Payment Settlement Instructions:</span>
              <p class="font-mono text-zinc-700 mt-0.5">
                Bank: <strong>{activeDoc.paymentBank}</strong><br />
                Account No: <strong>{activeDoc.paymentAccount}</strong><br />
                Account Name: <strong>{activeDoc.paymentAccountName}</strong>
              </p>
            </div>
          {:else}
            <div>
              <span class="font-bold text-zinc-800 uppercase tracking-wider text-[10px]">Quote Acceptance Terms:</span>
              <p class="text-zinc-700 mt-0.5 leading-relaxed">
                To accept this proposal, reply with formal approval or signed purchase order. Work begins upon deposit settlement.
              </p>
            </div>
          {/if}

          {#if activeDoc.notes}
            <div class="text-[11px] text-zinc-500 border-t border-zinc-200/60 pt-2">
              {activeDoc.notes}
            </div>
          {/if}
        </div>

      </div>

    </div>
  {:else}
    <div class="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
      No documents found in this view. Click "New {docType === 'invoices' ? 'Invoice' : 'Quote'}" to create your first document.
    </div>
  {/if}
</div>
