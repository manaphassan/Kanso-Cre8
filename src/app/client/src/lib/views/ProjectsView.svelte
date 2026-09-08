<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import type { Project } from '$lib/types';
  import ProjectFilterBar from '$lib/components/features/ProjectFilterBar.svelte';
  import ProjectKanbanView from '$lib/components/features/ProjectKanbanView.svelte';
  import ProjectGanttView from '$lib/components/features/ProjectGanttView.svelte';
  import ProjectCalendarView from '$lib/components/features/ProjectCalendarView.svelte';
  import ProjectTableView from '$lib/components/features/ProjectTableView.svelte';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';
  import FluentDialog from '$lib/components/ui/FluentDialog.svelte';
  import FluentIcons from '$lib/components/ui/FluentIcons.svelte';

  type ViewMode = 'cards' | 'kanban' | 'gantt' | 'calendar' | 'table';

  let defaultView = $state<ViewMode>(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('ss_cam_default_project_view') as ViewMode)) || 'cards'
  );

  let viewMode = $state<ViewMode>(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('ss_cam_project_view') as ViewMode)) || defaultView
  );

  let projectToDelete = $state<Project | null>(null);
  let showDeleteModal = $state<boolean>(false);
  let isDeleting = $state<boolean>(false);

  const isAdminUser = $derived.by(() => {
    const role = (appState.currentUser?.role || '').toLowerCase();
    return role.includes('admin') || role.includes('director') || role.includes('lead') || role.includes('manager') || role.includes('executive');
  });

  function setViewMode(mode: ViewMode) {
    viewMode = mode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ss_cam_project_view', mode);
    }
  }

  function saveAsDefaultView() {
    defaultView = viewMode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ss_cam_default_project_view', viewMode);
      localStorage.setItem('ss_cam_project_view', viewMode);
    }
    const viewLabels: Record<ViewMode, string> = {
      cards: 'Cards Grid',
      kanban: 'Kanban Board',
      gantt: 'Gantt Timeline',
      calendar: 'Calendar View',
      table: 'Data Table'
    };
    appState.addToast(`Saved ${viewLabels[viewMode]} as your default opening view.`, 'success');
  }

  function handleDeleteRequest(project: Project) {
    projectToDelete = project;
    showDeleteModal = true;
  }

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
  <!-- View Header & View Switcher -->
  <div class="view-header">
    <div class="header-titles">
      <h1 class="view-title">Project Manager</h1>
      <p class="view-subtitle">Coordinate creative campaigns, Kanban pipelines, Gantt timelines, and production schedules</p>
    </div>

    <!-- View Controls & Default Action -->
    <div class="view-controls-wrap">
      <!-- Segmented View Mode Switcher -->
      <div class="view-switcher-segmented">
        <button
          type="button"
          class="seg-view-btn"
          class:is-active={viewMode === 'cards'}
          onclick={() => setViewMode('cards')}
          title="Visual Cards Grid"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 11h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zm10 0h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zM4 21h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zm10 0h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1z"/>
          </svg>
          <span>Cards</span>
        </button>

        <button
          type="button"
          class="seg-view-btn"
          class:is-active={viewMode === 'kanban'}
          onclick={() => setViewMode('kanban')}
          title="Kanban Pipeline Board"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h4v16H4V4zm6 0h4v10h-4V4zm6 0h4v13h-4V4z"/>
          </svg>
          <span>Kanban</span>
        </button>

        <button
          type="button"
          class="seg-view-btn"
          class:is-active={viewMode === 'gantt'}
          onclick={() => setViewMode('gantt')}
          title="Gantt Timeline Schedule"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 5h10v3H4V5zm6 6h10v3H10v-3zm-4 6h12v3H6v-3z"/>
          </svg>
          <span>Gantt</span>
        </button>

        <button
          type="button"
          class="seg-view-btn"
          class:is-active={viewMode === 'calendar'}
          onclick={() => setViewMode('calendar')}
          title="Production Calendar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
          </svg>
          <span>Calendar</span>
        </button>

        <button
          type="button"
          class="seg-view-btn"
          class:is-active={viewMode === 'table'}
          onclick={() => setViewMode('table')}
          title="High Density Data Table"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h18v18H3V3zm2 4v3h14V7H5zm0 5v3h14v-3H5zm0 5v2h14v-2H5z"/>
          </svg>
          <span>Table</span>
        </button>
      </div>

      <!-- Save Default View Action Button -->
      {#if viewMode === defaultView}
        <div class="default-view-badge" title="This view is set as your default opening view for Project Manager">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
          <span>Default View</span>
        </div>
      {:else}
        <button
          type="button"
          class="save-default-btn"
          onclick={saveAsDefaultView}
          title="Save {viewMode.toUpperCase()} as your default opening view"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <span>Save as Default</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Shared Filter Bar -->
  <ProjectFilterBar />

  <!-- Dynamic View Render -->
  {#if projectStore.isLoading}
    <div class="loading-box">
      <div class="loading-spinner-orbit"></div>
      <span>Syncing Projects with Synology NAS Workspace...</span>
    </div>
  {:else if projectStore.filteredProjects.length === 0}
    <div class="empty-box">
      <div class="empty-emoji">
        <FluentIcons name="folder" size={40} color="rgba(255,255,255,0.3)" />
      </div>
      <h3>No projects found</h3>
      <p>No creative production records match the current filter selection.</p>
    </div>
  {:else if viewMode === 'kanban'}
    <ProjectKanbanView
      projects={projectStore.filteredProjects}
      {isAdminUser}
      onDelete={handleDeleteRequest}
    />
  {:else if viewMode === 'gantt'}
    <ProjectGanttView
      projects={projectStore.filteredProjects}
    />
  {:else if viewMode === 'calendar'}
    <ProjectCalendarView
      projects={projectStore.filteredProjects}
    />
  {:else if viewMode === 'table'}
    <ProjectTableView
      projects={projectStore.filteredProjects}
      {isAdminUser}
      onDelete={handleDeleteRequest}
    />
  {:else}
    <!-- Default Cards Grid View -->
    <div class="projects-grid">
      {#each projectStore.filteredProjects as p (p.id)}
        <div
          class="project-card-wrapper"
          onclick={() => appState.navigate('project-detail', { id: p.id })}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && appState.navigate('project-detail', { id: p.id })}
        >
          <FluentCard hoverLift padding="16px">
            <div class="card-top">
              <div class="job-id-wrap">
                <span class="job-id-chip">{p.jobId || p.id}</span>
                {#if isAdminUser}
                  <button
                    type="button"
                    class="card-quick-delete-btn"
                    title="Delete project & all subfolders"
                    onclick={(e) => {
                      e.stopPropagation();
                      handleDeleteRequest(p);
                    }}
                  >
                    <FluentIcons name="delete" size={13} />
                  </button>
                {/if}
              </div>
              <div class="badges-row">
                <FluentBadge type="brand" value={p.brand || 'SS'} />
                <FluentBadge type="status" value={p.status} />
              </div>
            </div>

            <a
              href="#project-detail/{encodeURIComponent(p.id)}"
              class="project-card-title"
              onclick={(e) => { e.stopPropagation(); appState.navigate('project-detail', { id: p.id }); }}
            >
              {p.title}
            </a>

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
        <div class="warning-title">
          <FluentIcons name="warning" size={16} color="#EF4444" />
          <span style="margin-left: 6px;">Irreversible Filesystem Operation</span>
        </div>
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
    gap: 16px;
    width: 100%;
    flex: 1;
    min-height: 0;
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
  }

  .view-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary, #111827);
    margin: 0;
  }

  .view-subtitle {
    font-size: 13px;
    color: var(--text-secondary, #6B7280);
    margin: 4px 0 0 0;
  }

  .view-controls-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* ─── View Mode Switcher Segmented Control ─── */
  .view-switcher-segmented {
    display: flex;
    align-items: center;
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    padding: 3px;
    border-radius: 8px;
    gap: 2px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .save-default-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    color: var(--text-secondary, #6B7280);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: all 0.15s ease;
  }

  .save-default-btn:hover {
    background: rgba(0, 120, 212, 0.08);
    border-color: #0078D4;
    color: #0078D4;
  }

  .default-view-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    background: rgba(16, 124, 65, 0.08);
    border: 1px solid rgba(16, 124, 65, 0.25);
    color: #107C41;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    user-select: none;
  }

  .seg-view-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary, #6B7280);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .seg-view-btn:hover {
    color: var(--text-primary, #111827);
    background: rgba(0, 0, 0, 0.04);
  }

  .seg-view-btn.is-active {
    background: var(--brand-accent, #0078D4);
    color: #FFFFFF;
    box-shadow: 0 1px 3px rgba(0, 120, 212, 0.3);
  }

  /* ─── Cards Grid ─── */
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
    font-family: monospace;
    font-weight: 800;
    font-size: 13px;
    color: var(--brand-accent, #0078D4);
  }

  .badges-row {
    display: flex;
    gap: 4px;
  }

  .project-card-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary, #111827);
    margin-bottom: 12px;
    line-height: 1.35;
    display: block;
    text-decoration: none;
    cursor: pointer;
    transition: color 0.15s ease;
  }

  .project-card-title:hover {
    color: var(--brand-accent, #0078D4);
    text-decoration: underline;
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

  .meta-key { color: var(--text-secondary, #6B7280); }
  .meta-val { font-weight: 600; color: var(--text-primary, #111827); }
  .is-overdue { color: #EF4444; font-weight: 800; }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--surface-card-border, #E5E7EB);
  }

  .tag-pill {
    font-size: 11px;
    padding: 1px 6px;
    background: var(--surface-card-subtle, #F3F4F6);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    border-radius: 9999px;
    color: var(--text-secondary, #6B7280);
  }

  .tag-more {
    font-size: 10.5px;
    color: var(--text-tertiary, #9CA3AF);
  }

  .loading-box {
    text-align: center;
    padding: 60px 0;
    color: var(--text-secondary, #6B7280);
    font-size: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .loading-spinner-orbit {
    width: 28px;
    height: 28px;
    border: 3px solid rgba(0, 120, 212, 0.2);
    border-top-color: #0078D4;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-box {
    text-align: center;
    padding: 60px 24px;
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    border-radius: 12px;
  }

  .empty-emoji {
    font-size: 40px;
    margin-bottom: 8px;
  }

  .empty-box h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary, #111827);
  }

  .empty-box p {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary, #6B7280);
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
    color: var(--text-primary, #111827);
  }
  .delete-warning-banner {
    background: rgba(196, 43, 28, 0.08);
    border: 1px solid #C42B1C;
    border-radius: 8px;
    padding: 14px;
  }
  .warning-title {
    font-weight: 700;
    font-size: 0.95rem;
    color: #C42B1C;
    margin-bottom: 6px;
  }
  .warning-text {
    font-size: 0.85rem;
    color: var(--text-primary, #111827);
    margin: 0 0 8px 0;
    line-height: 1.4;
  }
  .subfolder-list {
    margin: 0;
    padding-left: 18px;
    font-size: 0.8rem;
    color: var(--text-secondary, #6B7280);
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .subfolder-list code {
    font-family: monospace;
    color: #C42B1C;
    background: rgba(196, 43, 28, 0.06);
    padding: 1px 4px;
    border-radius: 3px;
  }
  .delete-target-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: var(--surface-card-subtle, #F9FAFB);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    border-radius: 8px;
    font-size: 0.88rem;
  }
  .target-label {
    font-weight: 600;
    color: var(--text-secondary, #6B7280);
  }
  .target-val {
    color: var(--text-primary, #111827);
  }
</style>
