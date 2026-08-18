<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import ProjectFilterBar from '$lib/components/features/ProjectFilterBar.svelte';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';
  import FluentDialog from '$lib/components/ui/FluentDialog.svelte';

  let projectToDelete = $state<any>(null);
  let showDeleteModal = $state<boolean>(false);
  let isDeleting = $state<boolean>(false);

  const isAdminUser = $derived.by(() => {
    const role = (appState.currentUser?.role || '').toLowerCase();
    return role.includes('admin') || role.includes('director') || role.includes('lead') || role.includes('manager') || role.includes('executive');
  });

  async function confirmDeleteProject() {
    if (!projectToDelete) return;
    isDeleting = true;
    try {
      await ApiClient.deleteProject(projectToDelete.id);
      appState.addToast(`Project ${projectToDelete.jobId || projectToDelete.title} deleted successfully.`, 'success');
      showDeleteModal = false;
      projectToDelete = null;
      await projectStore.loadProjects();
      await projectStore.loadDashboard();
    } catch (err: any) {
      appState.addToast(`Failed to delete project: ${err.message}`, 'error');
    } finally {
      isDeleting = false;
    }
  }

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
              <div class="job-id-wrap">
                <span class="job-id-chip">{p.jobId}</span>
                {#if isAdminUser}
                  <button
                    type="button"
                    class="card-quick-delete-btn"
                    title="Delete project & all subfolders"
                    onclick={(e) => {
                      e.stopPropagation();
                      projectToDelete = p;
                      showDeleteModal = true;
                    }}
                  >
                    🗑
                  </button>
                {/if}
              </div>
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

  <!-- Admin Delete Confirmation Dialog -->
  <FluentDialog
    bind:open={showDeleteModal}
    title="Delete Project & Files"
    confirmText="Permanently Delete"
    confirmAppearance="danger"
    loading={isDeleting}
    onConfirm={confirmDeleteProject}
    onClose={() => { showDeleteModal = false; projectToDelete = null; }}
  >
    <div class="delete-dialog-body">
      <div class="delete-warning-banner">
        <div class="warning-title">⚠️ Irreversible Filesystem Operation</div>
        <p class="warning-text">
          This will permanently delete the project directory and <strong>all 5 subfolders</strong> on Synology NAS:
        </p>
        <ul class="subfolder-list">
          <li><code>01_BRIEF_ASSETS/</code></li>
          <li><code>02_SOURCE_FILES/</code></li>
          <li><code>03_COPYWRITING/</code></li>
          <li><code>04_WORK_IN_PROGRESS/</code></li>
          <li><code>05_DELIVERABLES/</code></li>
        </ul>
      </div>
      {#if projectToDelete}
        <div class="delete-target-info">
          <span class="target-label">Target Project:</span>
          <span class="target-val"><strong>{projectToDelete.jobId || projectToDelete.id}</strong> — {projectToDelete.title}</span>
        </div>
      {/if}
    </div>
  </FluentDialog>
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

  .job-id-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .card-quick-delete-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 12px;
    opacity: 0.5;
    padding: 2px 4px;
    border-radius: 4px;
    transition: opacity 0.15s, background 0.15s;
  }
  .card-quick-delete-btn:hover {
    opacity: 1;
    background: rgba(196, 43, 28, 0.12);
  }

  /* ═══ DELETE DIALOG ═════════════════════════════════════════════ */
  .delete-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: var(--text-primary);
  }
  .delete-warning-banner {
    background: rgba(196, 43, 28, 0.08);
    border: 1px solid var(--color-danger, #C42B1C);
    border-radius: var(--radius-md, 8px);
    padding: 14px;
  }
  .warning-title {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--color-danger, #C42B1C);
    margin-bottom: 6px;
  }
  .warning-text {
    font-size: 0.85rem;
    color: var(--text-primary);
    margin: 0 0 8px 0;
    line-height: 1.4;
  }
  .subfolder-list {
    margin: 0;
    padding-left: 18px;
    font-size: 0.8rem;
    color: var(--text-secondary);
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .subfolder-list code {
    font-family: var(--font-mono);
    color: var(--color-danger, #C42B1C);
    background: rgba(196, 43, 28, 0.06);
    padding: 1px 4px;
    border-radius: 3px;
  }
  .delete-target-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md, 8px);
    font-size: 0.88rem;
  }
  .target-label {
    font-weight: 600;
    color: var(--text-secondary);
  }
  .target-val {
    color: var(--text-primary);
  }
</style>
