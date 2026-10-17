<script lang="ts">
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import type { Project } from '$lib/types';
  import { Icon } from '$lib/components/ui';

  const activeProjects = $derived(
    (projectStore.projects || []).filter(p => p.status !== 'archived').slice(0, 4)
  );

  function getClientColor(clientCode?: string): string {
    if (clientCode === 'ACME') return 'var(--kanso-accent)';
    if (clientCode === 'NEX') return 'var(--kanso-success)';
    if (clientCode === 'LUM') return 'var(--kanso-warning)';
    return 'var(--kanso-text-muted)';
  }
</script>

<section class="bento-section">
  <div class="bento-header">
    <div class="bento-title-row">
      <span class="bento-badge">ACTIVE CAMPAIGNS</span>
      <h2 class="bento-title">Project Status at a Glance</h2>
    </div>
    <a href="#projects" class="bento-action-link">Open Project Manager →</a>
  </div>

  {#if activeProjects.length === 0}
    <div class="empty-projects-card">
      <p>No active projects in progress. Create your first campaign in Project Manager.</p>
      <a href="#projects" class="btn-primary-mini">New Project</a>
    </div>
  {:else}
    <div class="projects-glance-grid">
      {#each activeProjects as p}
        <div class="project-glance-card">
          <div class="card-top-row">
            <span class="client-swatch-badge" style="border-left: 3px solid {getClientColor(p.clientCode)};">
              {p.clientCode || 'GEN'}
            </span>
            <span class="status-pill status-{p.status}">{p.status}</span>
          </div>

          <h4 class="project-glance-title">{p.title}</h4>

          <div class="progress-container">
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: {p.progress || 0}%;"></div>
            </div>
            <span class="progress-text font-mono">{p.progress || 0}%</span>
          </div>

          <div class="card-bottom-row">
            <span class="deadline-text">Due: {p.deadline || 'Ongoing'}</span>
            <a href="#projects/{p.id}" class="card-inspect-link">View Project →</a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .bento-section {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
  }
  .bento-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 20px;
  }
  .bento-title-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bento-badge {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-accent);
  }
  .bento-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .bento-action-link {
    font-size: 13px;
    color: var(--kanso-accent);
    text-decoration: none;
    font-weight: 600;
  }
  .projects-glance-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  @media (max-width: 1024px) {
    .projects-glance-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 600px) {
    .projects-glance-grid {
      grid-template-columns: 1fr;
    }
  }
  .project-glance-card {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .card-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .client-swatch-badge {
    font-size: 11px;
    font-weight: 700;
    font-family: monospace;
    padding: 2px 6px;
    background: var(--kanso-surface);
    color: var(--kanso-text-primary);
    border-radius: 0 4px 4px 0;
  }
  .status-pill {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--kanso-surface);
    color: var(--kanso-text-muted);
  }
  .project-glance-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .progress-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .progress-bar-track {
    flex: 1;
    height: 6px;
    background: var(--kanso-surface);
    border-radius: 3px;
    overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%;
    background: var(--kanso-accent);
    border-radius: 3px;
  }
  .progress-text {
    font-size: 11px;
    color: var(--kanso-text-muted);
  }
  .card-bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
    font-size: 11px;
  }
  .deadline-text {
    color: var(--kanso-text-muted);
  }
  .card-inspect-link {
    color: var(--kanso-accent);
    text-decoration: none;
    font-weight: 600;
  }
  .empty-projects-card {
    padding: 32px;
    text-align: center;
    background: var(--kanso-canvas);
    border: 1px dashed var(--kanso-border);
    border-radius: 6px;
    color: var(--kanso-text-muted);
  }
  .btn-primary-mini {
    display: inline-block;
    padding: 6px 16px;
    background: var(--kanso-accent);
    color: #FFFFFF;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    margin-top: 8px;
  }
</style>
