<script lang="ts">
  import { onMount } from 'svelte';
  import { financeService } from '../services/financeService';
  import { clientService } from '../services/clientService';
  import type { InvoiceDocument, ClientProfile, InvoiceLineItem } from '../types/kanso';

  let invoices: InvoiceDocument[] = $state([]);
  let clients: ClientProfile[] = $state([]);
  let activeDoc: InvoiceDocument = $state(financeService.getDocuments()[0]);
  let viewMode: 'edit' | 'markdown' = $state('edit');
  let activeFilter: 'all' | 'draft' | 'sent' | 'paid' = $state('all');

  onMount(() => {
    clients = clientService.getClients();
    invoices = financeService.getDocuments();
    if (invoices.length > 0) {
      activeDoc = invoices[0];
    }
  });

  function selectDoc(doc: InvoiceDocument) {
    activeDoc = doc;
  }

  function handleClientSelect(e: Event) {
    const code = (e.target as HTMLSelectElement).value;
    const client = clientService.getClientByCode(code);
    if (client) {
      activeDoc.clientCode = client.code;
      activeDoc.clientName = client.name;
      activeDoc.clientContact = client.contactPerson;
      activeDoc.clientEmail = client.email;
      activeDoc.clientAddress = client.billingAddress;
      activeDoc.currency = client.currency;
      recalcTotals();
      financeService.saveDocument(activeDoc);
    }
  }

  function addLineItem() {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      description: 'Creative Design & Production Deliverable',
      quantity: 1,
      unitPrice: 500,
      amount: 500
    };
    activeDoc.items = [...activeDoc.items, newItem];
    recalcTotals();
    financeService.saveDocument(activeDoc);
  }

  function removeLineItem(index: number) {
    activeDoc.items = activeDoc.items.filter((_, i) => i !== index);
    recalcTotals();
    financeService.saveDocument(activeDoc);
  }

  function recalcTotals() {
    activeDoc.items.forEach(item => {
      item.amount = Number(item.quantity) * Number(item.unitPrice);
    });
    activeDoc.subtotal = activeDoc.items.reduce((acc, item) => acc + item.amount, 0);
    activeDoc.taxAmount = (activeDoc.subtotal * activeDoc.taxRatePercent) / 100;
    activeDoc.total = activeDoc.subtotal + activeDoc.taxAmount;
  }

  function createNewInvoice() {
    const defaultClient = clients[0] || {
      code: 'GOV',
      name: 'Govicle Sdn Bhd',
      contactPerson: 'Amirul Haziq',
      email: 'amirul@govicle.my',
      billingAddress: 'Level 15, Menara Govicle, Bangsar South, KL',
      currency: 'MYR'
    };

    const newDoc: InvoiceDocument = {
      id: `inv-${Date.now()}`,
      type: 'invoice',
      documentNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'draft',
      clientCode: defaultClient.code,
      clientName: defaultClient.name,
      clientContact: defaultClient.contactPerson,
      clientEmail: defaultClient.email,
      clientAddress: defaultClient.billingAddress,
      freelancerName: 'Harussani Design Studio',
      freelancerEmail: 'harussani.design@gmail.com',
      freelancerPhone: '+60 19-876 5432',
      freelancerAddress: 'Kuala Lumpur, Malaysia',
      paymentBank: 'Maybank Islamic',
      paymentAccount: '5140 1234 5678',
      paymentAccountName: 'Harussani Creative',
      currency: defaultClient.currency || 'MYR',
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
  }

  function triggerPrint() {
    window.print();
  }

  let filteredInvoices = $derived(
    activeFilter === 'all'
      ? invoices
      : invoices.filter(inv => inv.status === activeFilter)
  );
</script>

<div class="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn print:p-0 print:m-0 print:max-w-none">
  <!-- Top Navigation & Controls (Hidden in Print) -->
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
        Markdown-as-database invoice engine. Edit frontmatter specs and generate printable PDFs instantly.
      </p>
    </div>

    <div class="flex items-center gap-3">
      <button
        onclick={createNewInvoice}
        class="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Invoice
      </button>

      <button
        onclick={triggerPrint}
        class="inline-flex items-center gap-2 px-4 py-2 border border-border bg-card hover:bg-muted/50 text-foreground text-sm font-medium rounded-lg transition-colors shadow-sm"
      >
        <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print / Export PDF
      </button>
    </div>
  </div>

  <!-- Document Selector & Status Tabs (Hidden in Print) -->
  <div class="flex items-center justify-between gap-4 print:hidden">
    <!-- Status Filter Pills -->
    <div class="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/50 text-xs font-medium">
      <button
        onclick={() => activeFilter = 'all'}
        class="px-3 py-1.5 rounded-md transition-colors {activeFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
      >
        All ({invoices.length})
      </button>
      <button
        onclick={() => activeFilter = 'draft'}
        class="px-3 py-1.5 rounded-md transition-colors {activeFilter === 'draft' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
      >
        Drafts
      </button>
      <button
        onclick={() => activeFilter = 'sent'}
        class="px-3 py-1.5 rounded-md transition-colors {activeFilter === 'sent' ? 'bg-amber-500/10 text-amber-500 font-semibold' : 'text-muted-foreground hover:text-foreground'}"
      >
        Sent (Unpaid)
      </button>
      <button
        onclick={() => activeFilter = 'paid'}
        class="px-3 py-1.5 rounded-md transition-colors {activeFilter === 'paid' ? 'bg-emerald-500/10 text-emerald-500 font-semibold' : 'text-muted-foreground hover:text-foreground'}"
      >
        Paid
      </button>
    </div>

    <!-- Active Invoices Quick Picker -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 max-w-xl">
      {#each filteredInvoices as doc (doc.id)}
        <button
          onclick={() => selectDoc(doc)}
          class="px-3 py-1.5 rounded-lg text-xs font-mono border transition-all flex-shrink-0 flex items-center gap-2 {activeDoc?.id === doc.id ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'}"
        >
          <span>{doc.documentNumber}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full {doc.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' : doc.status === 'sent' ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-muted-foreground'}">
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
              class="px-2.5 py-1 rounded-md {viewMode === 'edit' ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground'}"
            >
              Form
            </button>
            <button
              onclick={() => viewMode = 'markdown'}
              class="px-2.5 py-1 rounded-md {viewMode === 'markdown' ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground'}"
            >
              Raw YAML
            </button>
          </div>
        </div>

        {#if viewMode === 'edit'}
          <div class="space-y-4 text-xs">
            <!-- Doc Number, Type & Status -->
            <div class="grid grid-cols-3 gap-2">
              <div class="space-y-1">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Number</label>
                <input
                  type="text"
                  bind:value={activeDoc.documentNumber}
                  oninput={() => financeService.saveDocument(activeDoc)}
                  class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Doc Type</label>
                <select
                  bind:value={activeDoc.type}
                  onchange={() => financeService.saveDocument(activeDoc)}
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
                  onchange={() => financeService.saveDocument(activeDoc)}
                  class="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground font-medium focus:outline-none focus:border-primary"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
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
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Invoice Date</label>
                <input
                  type="date"
                  bind:value={activeDoc.date}
                  onchange={() => financeService.saveDocument(activeDoc)}
                  class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Due Date</label>
                <input
                  type="date"
                  bind:value={activeDoc.dueDate}
                  onchange={() => financeService.saveDocument(activeDoc)}
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
                  class="text-[11px] text-primary hover:underline font-semibold"
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
                      oninput={() => { recalcTotals(); financeService.saveDocument(activeDoc); }}
                      placeholder="Item description..."
                      class="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
                    />
                    <button
                      onclick={() => removeLineItem(index)}
                      class="text-rose-500 hover:text-rose-700 p-1"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>

                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <span class="text-[9px] text-muted-foreground">Qty</span>
                      <input
                        type="number"
                        bind:value={item.quantity}
                        oninput={() => { recalcTotals(); financeService.saveDocument(activeDoc); }}
                        class="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
                      />
                    </div>
                    <div>
                      <span class="text-[9px] text-muted-foreground">Unit Price</span>
                      <input
                        type="number"
                        bind:value={item.unitPrice}
                        oninput={() => { recalcTotals(); financeService.saveDocument(activeDoc); }}
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

            <!-- Notes & Payment Details -->
            <div class="space-y-1 pt-2 border-t border-border">
              <label class="text-[10px] font-semibold text-muted-foreground uppercase">Payment Terms &amp; Notes</label>
              <textarea
                bind:value={activeDoc.notes}
                rows="2"
                oninput={() => financeService.saveDocument(activeDoc)}
                class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
              ></textarea>
            </div>
          </div>
        {:else}
          <!-- RAW YAML PREVIEW -->
          <pre class="p-4 bg-black/80 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto whitespace-pre leading-relaxed border border-border/40">
{financeService.toMarkdown(activeDoc)}
          </pre>
        {/if}
      </div>

      <!-- RIGHT PANE: Live Printable Invoice Preview (7 Cols) (Always printed) -->
      <div class="lg:col-span-7 bg-white text-zinc-900 rounded-xl border border-zinc-200 p-8 sm:p-12 shadow-md space-y-8 print:border-none print:shadow-none print:p-0 print:m-0">
        
        <!-- Invoice Header -->
        <div class="flex justify-between items-start border-b border-zinc-200 pb-6">
          <div>
            <h2 class="text-xl font-bold text-zinc-950 tracking-tight">{activeDoc.freelancerName}</h2>
            <p class="text-xs text-zinc-500 mt-1 leading-relaxed">
              {activeDoc.freelancerAddress}<br />
              {activeDoc.freelancerEmail} · {activeDoc.freelancerPhone}
            </p>
          </div>

          <div class="text-right">
            <span class="text-xs font-bold font-mono tracking-widest text-zinc-400 uppercase">
              {activeDoc.type.toUpperCase()}
            </span>
            <div class="text-xl font-mono font-bold text-zinc-950 mt-0.5">{activeDoc.documentNumber}</div>
            <div class="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase {activeDoc.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : activeDoc.status === 'sent' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-800'}">
              {activeDoc.status.toUpperCase()}
            </div>
          </div>
        </div>

        <!-- Billed To & Dates Grid -->
        <div class="grid grid-cols-2 gap-8 text-xs">
          <div>
            <span class="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Billed To:</span>
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
              <span class="text-zinc-400 text-[10px] uppercase font-semibold">Due Date:</span>
              <div class="font-mono font-bold text-zinc-950">{activeDoc.dueDate}</div>
            </div>
          </div>
        </div>

        <!-- Line Items Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead>
              <tr class="border-b border-zinc-200 text-zinc-400 uppercase font-semibold text-[10px] tracking-wider">
                <th class="py-2.5">Description</th>
                <th class="py-2.5 text-center w-16">Qty</th>
                <th class="py-2.5 text-right w-24">Price</th>
                <th class="py-2.5 text-right w-24">Amount ({activeDoc.currency})</th>
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

        <!-- Payment & Bank Details -->
        <div class="pt-6 border-t border-zinc-200 text-xs text-zinc-600 space-y-3 bg-zinc-50 p-4 rounded-lg">
          <div>
            <span class="font-bold text-zinc-800 uppercase tracking-wider text-[10px]">Payment Instructions:</span>
            <p class="font-mono text-zinc-700 mt-0.5">
              Bank: <strong>{activeDoc.paymentBank}</strong><br />
              Account No: <strong>{activeDoc.paymentAccount}</strong><br />
              Account Name: <strong>{activeDoc.paymentAccountName}</strong>
            </p>
          </div>

          {#if activeDoc.notes}
            <div class="text-[11px] text-zinc-500 border-t border-zinc-200/60 pt-2">
              {activeDoc.notes}
            </div>
          {/if}
        </div>

      </div>

    </div>
  {/if}
</div>
