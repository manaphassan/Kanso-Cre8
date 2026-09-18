<script lang="ts">
  import { CREATIVE_SCOPE_PRESETS, type ScopeDisciplineTemplate } from '../../data/scopeTemplates';
  import { settingsStore, getCurrencySymbol } from '../../stores/settingsStore.svelte';
  import type { InvoiceLineItem } from '../../types/kanso';

  let {
    isOpen = false,
    hourlyRate = 150,
    currency = 'USD',
    onApply,
    onClose
  }: {
    isOpen: boolean;
    hourlyRate?: number;
    currency?: string;
    onApply: (items: InvoiceLineItem[], recommendedTerms: string, mode: 'replace' | 'append') => void;
    onClose: () => void;
  } = $props();

  let selectedPresetId = $state(CREATIVE_SCOPE_PRESETS[0].id);
  let mode: 'replace' | 'append' = $state('replace');
  let updateTerms = $state(true);

  const activePreset = $derived(
    CREATIVE_SCOPE_PRESETS.find(p => p.id === selectedPresetId) || CREATIVE_SCOPE_PRESETS[0]
  );

  const calculatedItems = $derived(
    activePreset.items.map((it, idx) => {
      const unitPrice = Math.round(hourlyRate * it.unitPriceMultiplier);
      const amount = Math.round(it.quantity * unitPrice);
      return {
        id: `scope_${Date.now()}_${idx}`,
        description: it.description,
        quantity: it.quantity,
        unitPrice,
        amount
      };
    })
  );

  const totalPresetHours = $derived(
    activePreset.items.reduce((acc, it) => acc + it.quantity, 0)
  );

  const totalPresetValue = $derived(
    calculatedItems.reduce((acc, it) => acc + it.amount, 0)
  );

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  function handleApply() {
    onApply(calculatedItems, updateTerms ? activePreset.recommendedTerms : '', mode);
    onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
    <!-- Backdrop dismiss -->
    <button
      class="absolute inset-0 w-full h-full cursor-default bg-transparent border-none"
      onclick={onClose}
      aria-label="Close modal"
    ></button>

    <!-- Modal Card -->
    <div class="relative w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scaleIn">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-foreground tracking-tight">Creative Discipline Scope Presets</h2>
            <p class="text-xs text-muted-foreground">Itemized deliverables, realistic hour allocations, and payment terms for freelance creators.</p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
          aria-label="Close"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body: Two-Column Layout -->
      <div class="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
        <!-- Left: Discipline List -->
        <div class="md:col-span-4 border-r border-border p-4 space-y-2 overflow-y-auto bg-muted/10">
          <div class="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 pb-1 font-semibold">
            Select Discipline
          </div>

          {#each CREATIVE_SCOPE_PRESETS as preset}
            <button
              onclick={() => selectedPresetId = preset.id}
              class="w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 {selectedPresetId === preset.id ? 'bg-primary/10 border-primary/40 shadow-xs' : 'border-border/60 hover:border-border hover:bg-muted/40'}"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 {selectedPresetId === preset.id ? 'text-primary' : 'text-muted-foreground'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={preset.icon} />
                  </svg>
                  <span class="font-bold text-sm text-foreground">{preset.shortName}</span>
                </div>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                  {preset.items.length} tasks
                </span>
              </div>
              <div class="text-xs text-muted-foreground line-clamp-1">
                {preset.badge}
              </div>
            </button>
          {/each}
        </div>

        <!-- Right: Deliverables Detail & Customization -->
        <div class="md:col-span-8 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
          <div class="space-y-4">
            <!-- Discipline Title & Summary -->
            <div class="border-b border-border pb-3">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-foreground">{activePreset.name}</h3>
                <span class="text-xs font-mono px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 font-semibold">
                  {activePreset.badge}
                </span>
              </div>
              <p class="text-xs text-muted-foreground mt-1 leading-relaxed">
                {activePreset.description}
              </p>
            </div>

            <!-- Deliverable Tasks Table Preview -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span class="font-bold uppercase tracking-wider text-[10px]">Deliverable Scope &amp; Estimates</span>
                <span class="font-mono text-[11px]">
                  Rate: <strong>{settingsStore.formatMoney(hourlyRate, currency)}/hr</strong>
                </span>
              </div>

              <div class="border border-border rounded-lg overflow-hidden text-xs">
                <table class="w-full text-left">
                  <thead class="bg-muted/30 border-b border-border text-[10px] uppercase font-mono text-muted-foreground">
                    <tr>
                      <th class="py-2 px-3">Scope Description</th>
                      <th class="py-2 px-3 text-center w-16">Hours</th>
                      <th class="py-2 px-3 text-right w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    {#each calculatedItems as it}
                      <tr class="hover:bg-muted/20">
                        <td class="py-2.5 px-3 font-medium text-foreground leading-snug">{it.description}</td>
                        <td class="py-2.5 px-3 text-center font-mono text-muted-foreground">{it.quantity}h</td>
                        <td class="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                          {settingsStore.formatMoney(it.amount, currency)}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                  <tfoot class="bg-muted/40 border-t border-border font-mono font-bold">
                    <tr>
                      <td class="py-2 px-3">Total Estimated Scope:</td>
                      <td class="py-2 px-3 text-center">{totalPresetHours}h</td>
                      <td class="py-2 px-3 text-right text-primary">
                        {settingsStore.formatMoney(totalPresetValue, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Recommended Payment Terms -->
            <div class="p-3 bg-muted/20 border border-border/80 rounded-lg text-xs space-y-1">
              <div class="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Recommended Scope Terms</div>
              <p class="text-foreground leading-relaxed">
                {activePreset.recommendedTerms}
              </p>
            </div>
          </div>

          <!-- Options & Actions -->
          <div class="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-4 text-xs">
              <!-- Mode Selection -->
              <div class="flex items-center gap-2 bg-muted/40 p-1 rounded-md border border-border/60">
                <button
                  onclick={() => mode = 'replace'}
                  class="px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer {mode === 'replace' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
                >
                  Replace Items
                </button>
                <button
                  onclick={() => mode = 'append'}
                  class="px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer {mode === 'append' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
                >
                  Append to Existing
                </button>
              </div>

              <!-- Terms Checkbox -->
              <label class="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  bind:checked={updateTerms}
                  class="rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                />
                <span>Apply Terms to Notes</span>
              </label>
            </div>

            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onclick={onClose}
                class="px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onclick={handleApply}
                class="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg shadow-sm hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Apply Scope Preset ({totalPresetHours}h)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
