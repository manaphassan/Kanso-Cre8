<script lang="ts">
  import { Icon } from '$lib/components/ui';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import type { ClientProfile } from '$lib/types/kanso';

  interface Props {
    open: boolean;
    client: ClientProfile | null;
    onclose: () => void;
    onsave: (client: ClientProfile) => void;
    ondelete: (id: string) => void;
  }

  let { open = false, client = null, onclose, onsave, ondelete }: Props = $props();

  let formName = $state('');
  let formCode = $state('');
  let formContact = $state('');
  let formEmail = $state('');
  let formPhone = $state('');
  let formAddress = $state('');
  let formRate = $state(180);
  let formCurrency = $state('MYR');
  let formPrimary = $state('#0EA5E9');
  let formSecondary = $state('#0284C7');
  let formDark = $state('#0F172A');
  let formAccent = $state('#38BDF8');
  let formNotes = $state('');

  $effect(() => {
    if (open) {
      if (client) {
        formName = client.name;
        formCode = client.code;
        formContact = client.contactPerson;
        formEmail = client.email;
        formPhone = client.phone || '';
        formAddress = client.billingAddress;
        formRate = client.defaultHourlyRate;
        formCurrency = client.currency;
        formPrimary = client.palette?.primary || '#0EA5E9';
        formSecondary = client.palette?.secondary || '#0284C7';
        formDark = client.palette?.dark || '#0F172A';
        formAccent = client.palette?.accent || '#38BDF8';
        formNotes = client.notes || '';
      } else {
        formName = '';
        formCode = '';
        formContact = '';
        formEmail = '';
        formPhone = '';
        formAddress = '';
        formRate = settingsStore.settings.defaultHourlyRate || 180;
        formCurrency = settingsStore.settings.currency || 'MYR';
        formPrimary = '#0EA5E9';
        formSecondary = '#0284C7';
        formDark = '#0F172A';
        formAccent = '#38BDF8';
        formNotes = '';
      }
    }
  });

  function handleSave() {
    if (!formName.trim() || !formCode.trim()) return;

    const payload: ClientProfile = {
      id: client ? client.id : formName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      contactPerson: formContact.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      billingAddress: formAddress.trim(),
      currency: formCurrency,
      defaultHourlyRate: Number(formRate),
      paymentTermsDays: client ? client.paymentTermsDays : 14,
      palette: {
        primary: formPrimary,
        secondary: formSecondary,
        dark: formDark,
        accent: formAccent
      },
      notes: formNotes.trim(),
      activeProjectsCount: client ? client.activeProjectsCount : 0,
      totalInvoiced: client ? client.totalInvoiced : 0
    };

    onsave(payload);
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b border-border pb-4">
        <h2 class="text-lg font-bold text-foreground">
          {client ? 'Edit Client Profile' : 'Add New Client Profile'}
        </h2>
        <button
          type="button"
          onclick={onclose}
          class="text-muted-foreground hover:text-foreground p-1 rounded-md"
          aria-label="Close"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <div class="space-y-4 text-sm">
        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2 space-y-1">
            <label for="client-name-input" class="text-xs font-semibold text-muted-foreground">Client Name</label>
            <input
              id="client-name-input"
              type="text"
              bind:value={formName}
              placeholder="e.g. Acme Corporation"
              class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div class="space-y-1">
            <label for="client-code-input" class="text-xs font-semibold text-muted-foreground">Code Prefix</label>
            <input
              id="client-code-input"
              type="text"
              bind:value={formCode}
              placeholder="ACME"
              maxlength="5"
              class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono uppercase focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label for="client-contact-input" class="text-xs font-semibold text-muted-foreground">Contact Person</label>
            <input
              id="client-contact-input"
              type="text"
              bind:value={formContact}
              placeholder="Sarah Jenkins"
              class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div class="space-y-1">
            <label for="client-email-input" class="text-xs font-semibold text-muted-foreground">Email</label>
            <input
              id="client-email-input"
              type="email"
              bind:value={formEmail}
              placeholder="sarah.j@acmefintech.io"
              class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label for="client-address-input" class="text-xs font-semibold text-muted-foreground">Billing Address</label>
          <textarea
            id="client-address-input"
            bind:value={formAddress}
            rows="2"
            placeholder="Full official billing address..."
            class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label for="client-rate-input" class="text-xs font-semibold text-muted-foreground">Hourly Rate</label>
            <input
              id="client-rate-input"
              type="number"
              bind:value={formRate}
              class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div class="space-y-1">
            <label for="client-currency-select" class="text-xs font-semibold text-muted-foreground">Currency</label>
            <select
              id="client-currency-select"
              bind:value={formCurrency}
              class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:border-primary"
            >
              <option value="MYR">MYR (RM)</option>
              <option value="USD">USD ($)</option>
              <option value="SGD">SGD (S$)</option>
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="CAD">CAD (CA$)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
        </div>

        <!-- Color Swatches Input -->
        <div class="space-y-2">
          <span class="text-sm font-semibold text-muted-foreground">Brand Color Palette (HEX)</span>
          <div class="grid grid-cols-4 gap-2">
            <div>
              <label for="swatch-primary" class="text-xs font-semibold text-muted-foreground block mb-1">Primary</label>
              <input id="swatch-primary" type="text" bind:value={formPrimary} class="w-full px-2 py-1.5 text-xs font-mono rounded border border-border bg-background" />
            </div>
            <div>
              <label for="swatch-secondary" class="text-xs font-semibold text-muted-foreground block mb-1">Secondary</label>
              <input id="swatch-secondary" type="text" bind:value={formSecondary} class="w-full px-2 py-1.5 text-xs font-mono rounded border border-border bg-background" />
            </div>
            <div>
              <label for="swatch-dark" class="text-xs font-semibold text-muted-foreground block mb-1">Dark</label>
              <input id="swatch-dark" type="text" bind:value={formDark} class="w-full px-2 py-1.5 text-xs font-mono rounded border border-border bg-background" />
            </div>
            <div>
              <label for="swatch-accent" class="text-xs font-semibold text-muted-foreground block mb-1">Accent</label>
              <input id="swatch-accent" type="text" bind:value={formAccent} class="w-full px-2 py-1.5 text-xs font-mono rounded border border-border bg-background" />
            </div>
          </div>
        </div>

        <div class="space-y-1">
          <label for="client-notes-input" class="text-xs font-semibold text-muted-foreground">Brand Notes &amp; Style Guidelines</label>
          <textarea
            id="client-notes-input"
            bind:value={formNotes}
            rows="2"
            placeholder="Export guidelines, tone of voice, etc."
            class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
          ></textarea>
        </div>
      </div>

      <div class="flex items-center justify-between pt-4 border-t border-border">
        {#if client}
          <button
            type="button"
            onclick={() => ondelete(client!.id)}
            class="px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg font-medium transition-colors"
          >
            Delete Client
          </button>
        {:else}
          <div></div>
        {/if}

        <div class="flex items-center gap-3">
          <button
            type="button"
            onclick={onclose}
            class="px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={handleSave}
            class="px-5 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
