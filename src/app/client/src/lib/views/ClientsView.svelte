<script lang="ts">
  import { Icon } from '$lib/components/ui';
  import { onMount } from 'svelte';
  import { clientService } from '../services/clientService';
  import { timerStore } from '../stores/timerStore.svelte';
  import { settingsStore, getCurrencySymbol } from '../stores/settingsStore.svelte';
  import ClientEditModal from '$lib/components/features/ClientEditModal.svelte';
  import type { ClientProfile } from '../types/kanso';
  import type { Snippet } from 'svelte';

  let { tabs }: { tabs?: Snippet } = $props();

  let clients: ClientProfile[] = $state([]);
  let copiedSwatch: string | null = $state(null);
  let selectedClient: ClientProfile | null = $state(null);
  let isEditingClient = $state(false);

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
    isEditingClient = true;
  }

  function openEditClientModal(client: ClientProfile) {
    selectedClient = client;
    isEditingClient = true;
  }

  function handleSaveClient(payload: ClientProfile) {
    if (selectedClient) {
      clientService.updateClient(payload);
    } else {
      clientService.addClient(payload);
    }
    clients = clientService.getClients();
    isEditingClient = false;
  }

  function handleDeleteClient(id: string) {
    if (confirm('Are you sure you want to remove this client profile?')) {
      clientService.deleteClient(id);
      clients = clientService.getClients();
      isEditingClient = false;
    }
  }
</script>

<div class="clients-view-container space-y-8 animate-fadeIn">
  <!-- Standard Canonical Atelier Header -->
  <div class="view-header">
    <div class="header-titles">
      <div class="header-tag">
        <span class="tag-badge">_Clients/</span>
        <span class="tag-meta">{clients.length} Client Profiles &amp; Brand Swatches</span>
      </div>
      <h1 class="view-title">Clients &amp; Brand Hub</h1>
      <p class="view-subtitle">
        Manage your freelance client profiles, brand color swatches, contact info, and billing rates.
      </p>
    </div>

    <div class="header-actions">
      {@render tabs?.()}
      <button
        onclick={openNewClientModal}
        class="action-cta-btn"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Add client</span>
      </button>
    </div>
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
                <span class="text-xs font-mono text-muted-foreground font-semibold">{client.palette.primary}</span>
              </button>

              <!-- Secondary -->
              <button
                onclick={() => copyToClipboard(client.palette.secondary, 'Secondary')}
                class="flex flex-col items-center p-2 rounded-lg border border-border/60 hover:scale-105 transition-transform bg-background"
                title="Copy Secondary: {client.palette.secondary}"
              >
                <div class="w-full h-7 rounded-md mb-1.5 shadow-inner" style="background-color: {client.palette.secondary}"></div>
                <span class="text-xs font-mono text-muted-foreground font-semibold">{client.palette.secondary}</span>
              </button>

              <!-- Dark -->
              <button
                onclick={() => copyToClipboard(client.palette.dark, 'Dark')}
                class="flex flex-col items-center p-2 rounded-lg border border-border/60 hover:scale-105 transition-transform bg-background"
                title="Copy Dark: {client.palette.dark}"
              >
                <div class="w-full h-7 rounded-md mb-1.5 shadow-inner" style="background-color: {client.palette.dark}"></div>
                <span class="text-xs font-mono text-muted-foreground font-semibold">{client.palette.dark}</span>
              </button>

              <!-- Accent -->
              <button
                onclick={() => copyToClipboard(client.palette.accent, 'Accent')}
                class="flex flex-col items-center p-2 rounded-lg border border-border/60 hover:scale-105 transition-transform bg-background"
                title="Copy Accent: {client.palette.accent}"
              >
                <div class="w-full h-7 rounded-md mb-1.5 shadow-inner" style="background-color: {client.palette.accent}"></div>
                <span class="text-xs font-mono text-muted-foreground font-semibold">{client.palette.accent}</span>
              </button>
            </div>
          </div>

          <!-- Notes / Style Specs -->
          {#if client.notes}
            <div class="p-3 bg-muted/20 rounded-lg text-xs text-muted-foreground italic border-l-2 border-primary">
              "{client.notes}"
            </div>
          {/if}

          <!-- 1-Click Billable Timer Action -->
          <div class="pt-2">
            {#if timerStore.isRunning && timerStore.clientCode === client.code}
              <div class="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span class="text-xs font-mono font-bold text-emerald-400 flex-1">
                  Active: {timerStore.elapsedFormatted || '00:00:00'} (+{settingsStore.settings.currencySymbol || 'RM'} {(timerStore.earnings || 0).toFixed(2)})
                </span>
                <button
                  onclick={() => timerStore.stop()}
                  class="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold rounded transition-colors"
                >
                  Stop
                </button>
              </div>
            {:else}
              <button
                onclick={() => timerStore.start(client.code, client.defaultHourlyRate)}
                class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all shadow-xs group-hover:border-primary"
              >
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span>Start Billable Timer ({client.currency || settingsStore.settings.currencySymbol || 'RM'} {client.defaultHourlyRate}/hr)</span>
              </button>
            {/if}
          </div>
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
  <ClientEditModal
    open={isEditingClient}
    client={selectedClient}
    onclose={() => (isEditingClient = false)}
    onsave={handleSaveClient}
    ondelete={handleDeleteClient}
  />
</div>