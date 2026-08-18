<script lang="ts">
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import FluentPill from '$lib/components/ui/FluentPill.svelte';

  const brands = ['all', 'SS', 'SSE', 'SSH'];
  const statuses = [
    { id: 'all', label: 'All Statuses' },
    { id: 'review', label: 'Review Queue' },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'approved', label: 'Approved' },
    { id: 'backlog', label: 'Backlog' }
  ];
</script>

<div class="filter-bar">
  <!-- Search input -->
  <div class="search-box">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-tertiary)"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
    <input
      type="text"
      placeholder="Search projects by ID, title, designer or tags..."
      bind:value={projectStore.activeFilters.query}
    />
    {#if projectStore.activeFilters.query}
      <button class="clear-search-btn" onclick={() => projectStore.setFilter('query', '')}>✕</button>
    {/if}
  </div>

  <!-- Brand pills -->
  <div class="pill-group">
    {#each brands as b}
      <FluentPill
        label={b === 'all' ? 'All Brands' : b}
        active={projectStore.activeFilters.brand === b}
        onclick={() => projectStore.setFilter('brand', b)}
      />
    {/each}
  </div>

  <!-- Status pills -->
  <div class="pill-group">
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
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg);
    padding: 10px 14px;
    box-shadow: var(--shadow-sm);
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    padding: 6px 12px;
    flex: 1;
    min-width: 240px;
  }

  .search-box input {
    border: none;
    background: transparent;
    font-size: 13px;
    color: var(--text-primary);
    width: 100%;
    outline: none;
  }

  .clear-search-btn {
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 11px;
  }

  .pill-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
</style>
