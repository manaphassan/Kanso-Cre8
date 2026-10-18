<script lang="ts">
  import ClientsView from './ClientsView.svelte';
  import InvoiceStudioView from './InvoiceStudioView.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  interface Props {
    initialTab?: 'clients' | 'quotes' | 'invoices';
  }

  let { initialTab = 'clients' }: Props = $props();
  let activeTab = $state<'clients' | 'quotes' | 'invoices'>(initialTab);

  $effect(() => {
    if (initialTab && initialTab !== activeTab) {
      activeTab = initialTab;
    }
  });
</script>

{#snippet hubTabs()}
  <nav aria-label="Clients & Money Navigation">
    <div class="tabs-list">
      <button
        class="hub-tab-btn"
        class:active={activeTab === 'clients'}
        onclick={() => (activeTab = 'clients')}
        aria-selected={activeTab === 'clients'}
        role="tab"
      >
        <Icon name="users" size={14} />
        <span>Clients</span>
      </button>

      <button
        class="hub-tab-btn"
        class:active={activeTab === 'quotes'}
        onclick={() => (activeTab = 'quotes')}
        aria-selected={activeTab === 'quotes'}
        role="tab"
      >
        <Icon name="file" size={14} />
        <span>Quotes</span>
      </button>

      <button
        class="hub-tab-btn"
        class:active={activeTab === 'invoices'}
        onclick={() => (activeTab = 'invoices')}
        aria-selected={activeTab === 'invoices'}
        role="tab"
      >
        <Icon name="wallet" size={14} />
        <span>Invoices</span>
      </button>
    </div>
  </nav>
{/snippet}

<div class="clients-money-hub">
  <!-- ═══ ACTIVE TAB CONTENT ════════════════════════════════════════════ -->
  <div class="hub-tab-content">
    {#if activeTab === 'clients'}
      <ClientsView tabs={hubTabs} />
    {:else if activeTab === 'quotes'}
      <InvoiceStudioView initialDocType="quotes" tabs={hubTabs} />
    {:else if activeTab === 'invoices'}
      <InvoiceStudioView initialDocType="invoices" tabs={hubTabs} />
    {/if}
  </div>
</div>

<style>
  .clients-money-hub {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--kanso-canvas);
  }

  .tabs-list {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-1);
    background: var(--kanso-canvas);
    padding: 2px;
    border-radius: var(--kanso-radius-md);
    border: 1px solid var(--kanso-border);
  }

  .hub-tab-btn {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    padding: 4px 12px;
    border-radius: var(--kanso-radius-sm);
    background: transparent;
    border: none;
    color: var(--kanso-text-muted);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .hub-tab-btn:hover {
    color: var(--kanso-text-primary);
  }

  .hub-tab-btn.active {
    background: var(--kanso-surface);
    color: var(--kanso-text-primary);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .hub-tab-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
</style>
