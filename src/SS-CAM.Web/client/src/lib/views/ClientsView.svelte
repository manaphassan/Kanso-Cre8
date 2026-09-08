<script lang="ts">
  import { onMount } from 'svelte';
  import { clientService } from '../services/clientService';
  import type { ClientProfile } from '../types/kanso';

  let clients: ClientProfile[] = $state([]);
  let copiedSwatch: string | null = $state(null);
  let selectedClient: ClientProfile | null = $state(null);
  let isEditingClient = $state(false);

  // Form State
  let formName = $state('');
  let formCode = $state('');
  let formContact = $state('');
  let formEmail = $state('');
  let formPhone = $state('');
  let formAddress = $state('');
  let formRate = $state(120);
  let formCurrency = $state('MYR');
  let formPrimary = $state('#0EA5E9');
  let formSecondary = $state('#0284C7');
  let formDark = $state('#0F172A');
  let formAccent = $state('#38BDF8');
  let formNotes = $state('');

  onMount(() => {
    clients = clientService.getClients();
  });

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    copiedSwatch = `${label}: ${text}`;
    setTimeout(() => {
      copiedSwatch = null;
    }, 2000);
  }

  function openNewClientModal() {
    selectedClient = null;
    formName = '';
    formCode = '';
    formContact = '';
    formEmail = '';
    formPhone = '';
    formAddress = '';
    formRate = 120;
    formCurrency = 'MYR';
    formPrimary = '#0EA5E9';
    formSecondary = '#0284C7';
    formDark = '#0F172A';
    formAccent = '#38BDF8';
    formNotes = '';
    isEditingClient = true;
  }

  function openEditClientModal(client: ClientProfile) {
    selectedClient = client;
    formName = client.name;
    formCode = client.code;
    formContact = client.contactPerson;
    formEmail = client.email;
    formPhone = client.phone || '';
    formAddress = client.billingAddress;
    formRate = client.defaultHourlyRate;
    formCurrency = client.currency;
    formPrimary = client.palette.primary;
    formSecondary = client.palette.secondary;
    formDark = client.palette.dark;
    formAccent = client.palette.accent;
    formNotes = client.notes || '';
    isEditingClient = true;
  }

  function saveClientForm() {
    if (!formName || !formCode) return;

    const payload: ClientProfile = {
      id: selectedClient ? selectedClient.id : formName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: formName,
      code: formCode.toUpperCase(),
      contactPerson: formContact,
      email: formEmail,
      phone: formPhone,
      billingAddress: formAddress,
      currency: formCurrency,
      defaultHourlyRate: Number(formRate),
      paymentTermsDays: selectedClient ? selectedClient.paymentTermsDays : 14,
      palette: {
        primary: formPrimary,
        secondary: formSecondary,
        dark: formDark,
        accent: formAccent
      },
      notes: formNotes,
      activeProjectsCount: selectedClient ? selectedClient.activeProjectsCount : 0,
      totalInvoiced: selectedClient ? selectedClient.totalInvoiced : 0
    };

    if (selectedClient) {
      clientService.updateClient(payload);
    } else {
      clientService.addClient(payload);
    }

    clients = clientService.getClients();
    isEditingClient = false;
  }

  function deleteClient(id: string) {
    if (confirm('Are you sure you want to remove this client profile?')) {
      clientService.deleteClient(id);
      clients = clientService.getClients();
    }
  }
</script>

<div class="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
        <span class="p-2 rounded-lg bg-primary/10 text-primary">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </span>
        Clients &amp; Brand Hub
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        Manage your freelance client profiles, brand color swatches, contact info, and billing rates.
      </p>
    </div>

    <button
      onclick={openNewClientModal}
      class="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors shadow-sm"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add New Client
    </button>
  </div>

  <!-- Toast Notification for Copied Swatch -->
  {#if copiedSwatch}
    <div class="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-emerald-600 text-white rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-bounce">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      Copied to clipboard: {copiedSwatch}
    </div>
  {/if}

  <!-- Clients Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {#each clients as client (client.id)}
      <div class="group relative rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/50 transition-all space-y-6 flex flex-col justify-between">
        <div class="space-y-4">
          <!-- Client Card Top -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-base"
                style="background-color: {client.palette.primary}"
              >
                {client.code}
              </div>
              <div>
                <h3 class="font-semibold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
                  {client.name}
                </h3>
                <span class="text-xs text-muted-foreground font-mono">
                  Prefix: [{client.code}] · {client.currency} {client.defaultHourlyRate}/hr
                </span>
              </div>
            </div>

            <!-- Actions Dropdown / Edit Button -->
            <button
              onclick={() => openEditClientModal(client)}
              class="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted/50 transition-colors"
              title="Edit client"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          <!-- Contact Details -->
          <div class="bg-muted/30 rounded-lg p-3.5 space-y-2 text-xs text-muted-foreground border border-border/50">
            <div class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span class="text-foreground font-medium">{client.contactPerson}</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href="mailto:{client.email}" class="hover:underline text-primary truncate">{client.email}</a>
            </div>
            {#if client.billingAddress}
              <div class="flex items-start gap-2 pt-1 border-t border-border/30">
                <svg class="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span class="line-clamp-2 leading-relaxed">{client.billingAddress}</span>
              </div>
            {/if}
          </div>

          <!-- Brand Palette Swatches -->
          <div class="space-y-2">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand Palette (Click to Copy)</span>
            <div class="grid grid-cols-4 gap-2">
              <!-- Primary -->
              <button
                onclick={() => copyToClipboard(client.palette.primary, 'Primary')}
                class="flex flex-col items-center p-2 rounded-lg border border-border/60 hover:scale-105 transition-transform bg-background"
                title="Copy Primary: {client.palette.primary}"
              >
                <div class="w-full h-7 rounded-md mb-1.5 shadow-inner" style="background-color: {client.palette.primary}"></div>
                <span class="text-[10px] font-mono text-muted-foreground font-semibold">{client.palette.primary}</span>
              </button>

              <!-- Secondary -->
              <button
                onclick={() => copyToClipboard(client.palette.secondary, 'Secondary')}
                class="flex flex-col items-center p-2 rounded-lg border border-border/60 hover:scale-105 transition-transform bg-background"
                title="Copy Secondary: {client.palette.secondary}"
              >
                <div class="w-full h-7 rounded-md mb-1.5 shadow-inner" style="background-color: {client.palette.secondary}"></div>
                <span class="text-[10px] font-mono text-muted-foreground font-semibold">{client.palette.secondary}</span>
              </button>

              <!-- Dark -->
              <button
                onclick={() => copyToClipboard(client.palette.dark, 'Dark')}
                class="flex flex-col items-center p-2 rounded-lg border border-border/60 hover:scale-105 transition-transform bg-background"
                title="Copy Dark: {client.palette.dark}"
              >
                <div class="w-full h-7 rounded-md mb-1.5 shadow-inner" style="background-color: {client.palette.dark}"></div>
                <span class="text-[10px] font-mono text-muted-foreground font-semibold">{client.palette.dark}</span>
              </button>

              <!-- Accent -->
              <button
                onclick={() => copyToClipboard(client.palette.accent, 'Accent')}
                class="flex flex-col items-center p-2 rounded-lg border border-border/60 hover:scale-105 transition-transform bg-background"
                title="Copy Accent: {client.palette.accent}"
              >
                <div class="w-full h-7 rounded-md mb-1.5 shadow-inner" style="background-color: {client.palette.accent}"></div>
                <span class="text-[10px] font-mono text-muted-foreground font-semibold">{client.palette.accent}</span>
              </button>
            </div>
          </div>

          <!-- Notes / Style Specs -->
          {#if client.notes}
            <div class="p-3 bg-muted/20 rounded-lg text-xs text-muted-foreground italic border-l-2 border-primary">
              "{client.notes}"
            </div>
          {/if}
        </div>

        <!-- Card Footer Quick Metrics -->
        <div class="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div>
            <span class="text-foreground font-bold">{client.activeProjectsCount || 0}</span> Active Projects
          </div>
          <div>
            Total Invoiced: <span class="text-foreground font-bold">{client.currency} {(client.totalInvoiced || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Client Edit / Add Modal -->
  {#if isEditingClient}
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-border pb-4">
          <h2 class="text-lg font-bold text-foreground">
            {selectedClient ? 'Edit Client Profile' : 'Add New Client Profile'}
          </h2>
          <button
            onclick={() => isEditingClient = false}
            class="text-muted-foreground hover:text-foreground p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4 text-sm">
          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2 space-y-1">
              <label class="text-xs font-semibold text-muted-foreground">Client Name</label>
              <input
                type="text"
                bind:value={formName}
                placeholder="e.g. Govicle Sdn Bhd"
                class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-semibold text-muted-foreground">Code Prefix</label>
              <input
                type="text"
                bind:value={formCode}
                placeholder="GOV"
                maxlength="5"
                class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono uppercase focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs font-semibold text-muted-foreground">Contact Person</label>
              <input
                type="text"
                bind:value={formContact}
                placeholder="Amirul Haziq"
                class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-semibold text-muted-foreground">Email</label>
              <input
                type="email"
                bind:value={formEmail}
                placeholder="amirul@govicle.my"
                class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-muted-foreground">Billing Address</label>
            <textarea
              bind:value={formAddress}
              rows="2"
              placeholder="Full official billing address..."
              class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs font-semibold text-muted-foreground">Hourly Rate</label>
              <input
                type="number"
                bind:value={formRate}
                class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-semibold text-muted-foreground">Currency</label>
              <input
                type="text"
                bind:value={formCurrency}
                placeholder="MYR"
                class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <!-- Color Swatches Input -->
          <div class="space-y-2">
            <label class="text-xs font-semibold text-muted-foreground">Brand Color Palette (HEX)</label>
            <div class="grid grid-cols-4 gap-2">
              <div>
                <span class="text-[10px] text-muted-foreground">Primary</span>
                <input type="text" bind:value={formPrimary} class="w-full px-2 py-1 text-xs font-mono rounded border border-border bg-background" />
              </div>
              <div>
                <span class="text-[10px] text-muted-foreground">Secondary</span>
                <input type="text" bind:value={formSecondary} class="w-full px-2 py-1 text-xs font-mono rounded border border-border bg-background" />
              </div>
              <div>
                <span class="text-[10px] text-muted-foreground">Dark</span>
                <input type="text" bind:value={formDark} class="w-full px-2 py-1 text-xs font-mono rounded border border-border bg-background" />
              </div>
              <div>
                <span class="text-[10px] text-muted-foreground">Accent</span>
                <input type="text" bind:value={formAccent} class="w-full px-2 py-1 text-xs font-mono rounded border border-border bg-background" />
              </div>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-muted-foreground">Brand Notes &amp; Style Guidelines</label>
            <textarea
              bind:value={formNotes}
              rows="2"
              placeholder="Export guidelines, tone of voice, etc."
              class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
            ></textarea>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-border">
          {#if selectedClient}
            <button
              onclick={() => deleteClient(selectedClient!.id)}
              class="px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg font-medium transition-colors"
            >
              Delete Client
            </button>
          {:else}
            <div></div>
          {/if}

          <div class="flex items-center gap-3">
            <button
              onclick={() => isEditingClient = false}
              class="px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onclick={saveClientForm}
              class="px-5 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
            >
              Save Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
