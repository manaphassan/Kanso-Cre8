<script lang="ts">
  import { Icon } from '$lib/components/ui';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { clientService } from '$lib/services/clientService';
  import type { ClientProfile } from '$lib/types/kanso';

  let clients = $state<ClientProfile[]>([]);
  let showFilterPopover = $state(false);

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

  const activeFiltersCount = $derived(
    (projectStore.activeFilters.brand && projectStore.activeFilters.brand !== 'all' ? 1 : 0) +
    (projectStore.activeFilters.status && projectStore.activeFilters.status !== 'all' ? 1 : 0)
  );

  function resetFilters() {
    projectStore.setFilter('brand', 'all');
    projectStore.setFilter('status', 'all');
    showFilterPopover = false;
  }
</script>

<div class="filter-bar">
  <!-- Search input -->
  <div class="search-box">
    <Icon name="search" size={14} />
    <input
      type="text"
      placeholder="Search projects..."
      value={searchQuery}
      oninput={handleSearchInput}
    />
    {#if searchQuery}
      <button type="button" class="clear-search-btn" onclick={handleClearSearch} title="Clear search" aria-label="Clear search">
        <Icon name="close" size={12} />
      </button>
    {/if}
  </div>

  <!-- Filter Popover Trigger -->
  <div class="filter-popover-anchor">
    <button
      type="button"
      class="filter-trigger-btn"
      class:has-filters={activeFiltersCount > 0}
      onclick={() => (showFilterPopover = !showFilterPopover)}
      aria-label="Filter projects"
      title="Filter projects"
    >
      <Icon name="filter" size={14} />
      <span class="btn-label">Filter</span>
      {#if activeFiltersCount > 0}
        <span class="filter-badge font-mono">{activeFiltersCount}</span>
      {/if}
    </button>

    {#if showFilterPopover}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="popover-backdrop" onclick={() => (showFilterPopover = false)}></div>
      <div class="filter-popover" role="dialog" aria-label="Project filters">
        <div class="popover-section">
          <span class="section-label">Client</span>
          <div class="filter-chip-grid">
            <button
              type="button"
              class="filter-chip"
              class:selected={projectStore.activeFilters.brand === 'all'}
              onclick={() => projectStore.setFilter('brand', 'all')}
            >
              All Clients
            </button>
            {#each clients as c (c.code)}
              <button
                type="button"
                class="filter-chip font-mono"
                class:selected={projectStore.activeFilters.brand === c.code}
                onclick={() => projectStore.setFilter('brand', c.code)}
              >
                <span class="chip-swatch" style="background-color: {c.palette?.primary || 'var(--kanso-accent)'};"></span>
                <span>{c.code}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="popover-section">
          <span class="section-label">Status</span>
          <div class="filter-chip-grid">
            {#each statuses as s}
              <button
                type="button"
                class="filter-chip"
                class:selected={projectStore.activeFilters.status === s.id}
                onclick={() => projectStore.setFilter('status', s.id)}
              >
                {s.label}
              </button>
            {/each}
          </div>
        </div>

        {#if activeFiltersCount > 0}
          <div class="popover-footer">
            <button type="button" class="reset-filters-btn" onclick={resetFilters}>
              Reset filters
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 6px 12px;
    flex: 1;
    color: var(--kanso-text-muted);
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
    padding: 2px;
    display: flex;
    align-items: center;
  }
  .clear-search-btn:hover {
    color: var(--kanso-text-primary);
  }
  .filter-popover-anchor {
    position: relative;
  }
  .filter-trigger-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 12px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    color: var(--kanso-text-muted);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .filter-trigger-btn:hover, .filter-trigger-btn.has-filters {
    border-color: var(--kanso-accent);
    color: var(--kanso-text-primary);
  }
  .filter-badge {
    background: var(--kanso-accent);
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 700;
    width: 16px;
    height: 16px;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .popover-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
  }
  .filter-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 101;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 16px;
    width: 320px;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .popover-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--kanso-text-muted);
    letter-spacing: 0.04em;
  }
  .filter-chip-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    font-size: 11px;
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .filter-chip:hover {
    color: var(--kanso-text-primary);
    border-color: var(--kanso-accent);
  }
  .filter-chip.selected {
    background: var(--kanso-accent);
    color: #FFFFFF;
    border-color: var(--kanso-accent);
    font-weight: 600;
  }
  .chip-swatch {
    width: 7px;
    height: 7px;
    border-radius: 9999px;
  }
  .popover-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 8px;
    border-top: 1px solid var(--kanso-border);
  }
  .reset-filters-btn {
    background: transparent;
    border: none;
    color: var(--kanso-accent);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 2px 4px;
  }
  .reset-filters-btn:hover {
    text-decoration: underline;
  }
</style>
