<script lang="ts">
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import FluentPill from '$lib/components/ui/FluentPill.svelte';
  import { clientService } from '$lib/services/clientService';
  import type { ClientProfile } from '$lib/types/kanso';

  let clients = $state<ClientProfile[]>([]);

  $effect(() => {
    clients = clientService.getClients();
  });

  const statuses = [
    { id: 'all', label: 'All Statuses' },
    { id: 'in-progress', label: 'In Production' },
    { id: 'review', label: 'Client Proofing' },
    { id: 'revision', label: 'Revision Pending' },
    { id: 'approved', label: 'Client Approved' },
    { id: 'backlog', label: 'Backlog' },
    { id: 'on-hold', label: 'On Hold' }
  ];

  let searchQuery = $state(projectStore.activeFilters.query || '');
  let debounceTimeout: any = null;

  function handleSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      projectStore.setFilter('query', val);
    }, 120);
  }

  function handleClearSearch() {
    searchQuery = '';
    if (debounceTimeout) clearTimeout(debounceTimeout);
    projectStore.setFilter('query', '');
  }
</script>

<div class="filter-bar">
  <!-- Search input -->
  <div class="search-box">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--kanso-text-muted)" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    <input
      type="text"
      placeholder="Search projects by ID, title, client, or tags..."
      value={searchQuery}
      oninput={handleSearchInput}
    />
    {#if searchQuery}
      <button class="clear-search-btn" onclick={handleClearSearch} title="Clear search">✕</button>
    {/if}
  </div>

  <!-- Dynamic Client Filter Swatches -->
  <div class="pill-group clients-pill-group">
    <button
      type="button"
      class="client-filter-pill"
      class:active={projectStore.activeFilters.brand === 'all'}
      onclick={() => projectStore.setFilter('brand', 'all')}
    >
      <span>All Clients</span>
    </button>
    {#each clients as c (c.code)}
      <button
        type="button"
        class="client-filter-pill"
        class:active={projectStore.activeFilters.brand === c.code}
        onclick={() => projectStore.setFilter('brand', c.code)}
        title={`${c.name} (${c.code})`}
      >
        <span class="client-swatch-dot" style="background-color: {c.palette?.primary || 'var(--kanso-accent)'};"></span>
        <span class="client-code-text">{c.code}</span>
      </button>
    {/each}
  </div>

  <!-- Status pills -->
  <div class="pill-group statuses-pill-group">
    {#each statuses as s}
      <FluentPill
        label={s.label}
        active={projectStore.activeFilters.status === s.id}
        count={s.id === 'review' ? projectStore.pendingReviewCount : undefined}
        onclick={() => projectStore.setFilter('status', s.id)}
      />
    {/each}
  </div>
</div>

<style>
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--radius-lg, 10px);
    padding: 10px 14px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--radius-md, 6px);
    padding: 6px 12px;
    flex: 1;
    min-width: 240px;
  }

  .search-box input {
    border: none;
    background: transparent;
    font-size: 13px;
    color: var(--kanso-text-primary);
    width: 100%;
    outline: none;
  }

  .search-box input::placeholder {
    color: var(--kanso-text-muted);
  }

  .clear-search-btn {
    border: none;
    background: transparent;
    color: var(--kanso-text-muted);
    cursor: pointer;
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 4px;
  }

  .clear-search-btn:hover {
    color: var(--kanso-text-primary);
  }

  .pill-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  /* Client Swatch Filter Pills */
  .client-filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    border-radius: var(--radius-pill, 9999px);
    font-size: 12px;
    font-weight: 500;
    color: var(--kanso-text-muted);
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
    user-select: none;
  }

  .client-filter-pill:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
    border-color: var(--kanso-border-hover, #3f3f46);
  }

  .client-filter-pill.active {
    background: rgba(56, 189, 248, 0.12);
    color: var(--kanso-accent);
    border-color: var(--kanso-accent);
    font-weight: 600;
  }

  .client-swatch-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
  }

  .client-code-text {
    font-family: var(--font-mono, monospace);
    font-size: 11.5px;
    letter-spacing: 0.02em;
  }
</style>
