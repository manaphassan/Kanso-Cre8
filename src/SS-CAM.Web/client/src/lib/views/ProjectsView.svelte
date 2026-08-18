<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import ProjectFilterBar from '$lib/components/features/ProjectFilterBar.svelte';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';

  onMount(() => {
    projectStore.loadProjects();
  });
</script>

<div class="projects-container">
  <div class="view-header">
    <div>
      <h1 class="view-title">Project Catalog & Workspace Vault</h1>
      <p class="view-subtitle">Browse and manage active creative campaigns across Synology storage</p>
    </div>
  </div>

  <ProjectFilterBar />

  {#if projectStore.isLoading}
    <div class="loading-box">Loading Projects from Synology NAS...</div>
  {:else if projectStore.filteredProjects.length === 0}
    <div class="empty-box">No projects match the selected filters.</div>
  {:else}
    <div class="projects-grid">
      {#each projectStore.filteredProjects as p}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="project-card-wrapper" onclick={() => appState.navigate('project-detail', { id: p.id })}>
          <FluentCard hoverLift padding="16px">
            <div class="card-top">
              <span class="job-id-chip">{p.jobId}</span>
              <div class="badges-row">
                <FluentBadge type="brand" value={p.brand} />
                <FluentBadge type="status" value={p.status} />
              </div>
            </div>

            <h3 class="project-card-title">{p.title}</h3>

            <div class="meta-rows">
              <div class="meta-row">
                <span class="meta-key">Designer:</span>
                <span class="meta-val">{p.designer || 'Unassigned'}</span>
              </div>
              <div class="meta-row">
                <span class="meta-key">Deadline:</span>
                <span class="meta-val" class:is-overdue={p.isOverdue}>{p.deadline || 'None'}</span>
              </div>
            </div>

            {#if p.tags && p.tags.length > 0}
              <div class="card-tags">
                {#each p.tags.slice(0, 3) as t}
                  <span class="tag-pill">{t}</span>
                {/each}
                {#if p.tags.length > 3}
                  <span class="tag-more">+{p.tags.length - 3}</span>
                {/if}
              </div>
            {/if}
          </FluentCard>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .projects-container {
    display: flex;
    flex-direction: column;
  }

  .view-header {
    margin-bottom: 16px;
  }

  .view-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .view-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .project-card-wrapper {
    cursor: pointer;
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .job-id-chip {
    font-family: var(--font-mono);
    font-weight: 800;
    font-size: 13px;
    color: var(--brand-accent);
  }

  .badges-row {
    display: flex;
    gap: 4px;
  }

  .project-card-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 12px;
    line-height: 1.35;
  }

  .meta-rows {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12.5px;
    margin-bottom: 12px;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
  }

  .meta-key { color: var(--text-secondary); }
  .meta-val { font-weight: 600; color: var(--text-primary); }
  .is-overdue { color: var(--color-danger); font-weight: 800; }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--surface-card-border);
  }

  .tag-pill {
    font-size: 11px;
    padding: 1px 6px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-pill);
    color: var(--text-secondary);
  }

  .tag-more {
    font-size: 10.5px;
    color: var(--text-tertiary);
  }

  .loading-box, .empty-box {
    text-align: center;
    padding: 40px 0;
    color: var(--text-secondary);
    font-size: 14px;
  }
</style>
