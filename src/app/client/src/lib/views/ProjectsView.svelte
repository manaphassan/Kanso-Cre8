<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import type { Project } from '$lib/types';
  import ProjectFilterBar from '$lib/components/features/ProjectFilterBar.svelte';
  import ProjectKanbanView from '$lib/components/features/ProjectKanbanView.svelte';
  import ProjectTableView from '$lib/components/features/ProjectTableView.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { clientService } from '$lib/services/clientService';
  import { licenseStore } from '$lib/stores/licenseStore.svelte';
  import { settingsStore, getCurrencySymbol } from '$lib/stores/settingsStore.svelte';
  import type { ClientProfile } from '$lib/types/kanso';

  type ViewMode = 'kanban' | 'table';

  const initialView: ViewMode = settingsStore.settings.defaultProjectView === 'table' ? 'table' : 'kanban';
  let viewMode = $state<ViewMode>(initialView);

  let projectToDelete = $state<Project | null>(null);
  let showDeleteModal = $state<boolean>(false);
  let isDeleting = $state<boolean>(false);

  // New Project Scaffolder State
  let showNewProjectModal = $state<boolean>(false);
  let isSubmitting = $state<boolean>(false);
  let npTitle = $state('');
  let npClientCode = $state('ACME');
  let npDeliverableType = $state('Graphic / Print');
  let npPriority = $state<'low' | 'normal' | 'high' | 'urgent'>('normal');
  let npDeadline = $state(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  let npBudget = $state(1750);
  let npCurrency = $state(settingsStore.settings.currency || 'MYR');
  let npDescription = $state('');
  let clientsList = $state<ClientProfile[]>([]);

  const isAdminUser = $derived.by(() => {
    const role = (appState.currentUser?.role || '').toLowerCase();
    return role.includes('admin') || role.includes('director') || role.includes('lead') || role.includes('manager') || role.includes('executive');
  });

  function setViewMode(mode: ViewMode) {
    viewMode = mode;
    settingsStore.updateSettings({ defaultProjectView: mode });
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

  function openNewProjectModal() {
    if (!licenseStore.isPro && projectStore.projects.length >= 2) {
      licenseStore.requirePro('Unlimited 5-Folder Project Scaffolding');
      return;
    }
    clientsList = clientService.getClients();
    if (clientsList.length > 0 && !clientsList.some(c => c.code === npClientCode)) {
      npClientCode = clientsList[0].code;
    }
    npCurrency = settingsStore.settings.currency || 'MYR';
    showNewProjectModal = true;
  }

  async function handleCreateProject() {
    if (!npTitle.trim()) {
      appState.addToast('Please provide a project title.', 'warning');
      return;
    }
    isSubmitting = true;
    try {
      const selectedClient = clientsList.find(c => c.code === npClientCode);
      await projectStore.createProject({
        title: npTitle.trim(),
        clientCode: npClientCode,
        clientName: selectedClient ? selectedClient.name : npClientCode,
        deliverableType: npDeliverableType,
        priority: npPriority,
        deadline: npDeadline,
        budget: Number(npBudget) || 0,
        currency: npCurrency || settingsStore.settings.currency || 'MYR',
        description: npDescription.trim()
      });
      showNewProjectModal = false;
      npTitle = '';
      npDescription = '';
    } catch (err: any) {
      // Handled in store
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    projectStore.loadProjects();
    clientsList = clientService.getClients();
  });
</script>

<div class="projects-container">
  <!-- View Header & Controls -->
  <div class="view-header">
    <div class="header-titles">
      <div class="header-tag">
        <span class="tag-badge">_Projects/</span>
        <span class="tag-meta">Active Vaults</span>
      </div>
      <h1 class="view-title">Projects</h1>
      <p class="view-subtitle">Coordinate creative campaigns, Kanban pipelines, and production schedules</p>
    </div>

    <!-- View Switcher & Action -->
    <div class="view-controls-wrap">
      <!-- Segmented View Mode Switcher: Kanban and Table only -->
      <div class="view-switcher-segmented" role="tablist" aria-label="Project view mode">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'kanban'}
          class="seg-view-btn"
          class:is-active={viewMode === 'kanban'}
          onclick={() => setViewMode('kanban')}
          title="Kanban Board"
        >
          <Icon name="kanban" size={14} />
          <span>Kanban</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'table'}
          class="seg-view-btn"
          class:is-active={viewMode === 'table'}
          onclick={() => setViewMode('table')}
          title="Table View"
        >
          <Icon name="table" size={14} />
          <span>Table</span>
        </button>
      </div>

      <!-- New Project Action Button -->
      <button
        type="button"
        class="new-project-header-btn"
        onclick={openNewProjectModal}
        title="Scaffold a new 5-folder project vault"
      >
        <Icon name="plus" size={14} />
        <span>New Project</span>
      </button>
    </div>
  </div>

  <!-- Shared Filter Bar (Popover) -->
  <ProjectFilterBar />

  <!-- Dynamic View Render: Kanban or Table -->
  {#if projectStore.isLoading}
    <div class="loading-box">
      <div class="loading-spinner-orbit"></div>
      <span>Syncing Projects with Creative Vault...</span>
    </div>
  {:else if projectStore.filteredProjects.length === 0}
    <div class="empty-box">
      <div class="empty-icon-wrap">
        <Icon name="folder" size={32} />
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
  {:else}
    <ProjectTableView
      projects={projectStore.filteredProjects}
      {isAdminUser}
      onDelete={handleDeleteRequest}
    />
  {/if}

  <!-- Admin Delete Confirmation Dialog -->
  <Dialog
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
          <Icon name="alert" size={16} />
          <span>Irreversible Filesystem Operation</span>
        </div>
        <p class="warning-text">
          This will permanently delete the project directory and <strong>all 5 subfolders</strong> from the vault:
        </p>
        <ul class="subfolder-list">
          <li><code>01_BRIEF/</code></li>
          <li><code>02_SOURCE/</code></li>
          <li><code>03_COPY/</code></li>
          <li><code>04_WIP/</code></li>
          <li><code>05_DELIVERABLES/</code></li>
        </ul>
      </div>

      {#if projectToDelete}
        <div class="delete-target-card">
          <div class="target-title">{projectToDelete.title}</div>
          <div class="target-meta font-mono">
            {projectToDelete.jobId} · {projectToDelete.brand} · {projectToDelete.status.toUpperCase()}
          </div>
        </div>
      {/if}
    </div>
  </Dialog>

  <!-- New Project Scaffolder Modal -->
  <Dialog
    bind:open={showNewProjectModal}
    title="Scaffold New Project Vault"
    confirmText="Create 5-Folder Project"
    confirmAppearance="primary"
    loading={isSubmitting}
    onConfirm={handleCreateProject}
    onClose={() => (showNewProjectModal = false)}
  >
    <div class="scaffold-form-body">
      <div class="scaffold-form-row">
        <div class="form-field flex-1">
          <label class="form-label" for="np-client">Client Account</label>
          <select id="np-client" bind:value={npClientCode} class="form-input form-select font-mono">
            {#each clientsList as c}
              <option value={c.code}>{c.name} ({c.code})</option>
            {/each}
          </select>
        </div>

        <div class="form-field flex-1">
          <label class="form-label" for="np-type">Deliverable Type</label>
          <select id="np-type" bind:value={npDeliverableType} class="form-input form-select">
            <option value="Graphic / Print">Graphic / Print (D)</option>
            <option value="UI/UX Design">UI/UX Interface (W)</option>
            <option value="3D Assets">3D Renders / Assets (3)</option>
            <option value="Video">Video / Motion (V)</option>
            <option value="Brand Identity">Brand Identity (P)</option>
          </select>
        </div>
      </div>

      <div class="form-field">
        <label class="form-label" for="np-title">Project Title</label>
        <input
          id="np-title"
          type="text"
          bind:value={npTitle}
          placeholder="e.g. Mobile Banking 3D Isometric Illustrations"
          class="form-input"
        />
      </div>

      <div class="scaffold-form-row-3">
        <div class="form-field">
          <label class="form-label" for="np-priority">Priority</label>
          <select id="np-priority" bind:value={npPriority} class="form-input form-select">
            <option value="normal">Normal</option>
            <option value="low">Low</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label" for="np-deadline">Deadline</label>
          <input
            id="np-deadline"
            type="date"
            bind:value={npDeadline}
            class="form-input font-mono"
          />
        </div>

        <div class="form-field">
          <label class="form-label" for="np-budget">Budget ({getCurrencySymbol(npCurrency)} {npCurrency})</label>
          <input
            id="np-budget"
            type="number"
            bind:value={npBudget}
            class="form-input font-mono"
          />
        </div>
      </div>

      <div class="form-field">
        <label class="form-label" for="np-description">Creative Brief &amp; Scope</label>
        <textarea
          id="np-description"
          bind:value={npDescription}
          rows="3"
          placeholder="Campaign objectives, target dimensions, visual style notes, and milestones..."
          class="form-input"
        ></textarea>
      </div>
    </div>
  </Dialog>
</div>

<style>
  .projects-container { display: flex; flex-direction: column; gap: 16px; width: 100%; flex: 1; min-height: 0; }
  .view-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
  .header-titles { display: flex; flex-direction: column; gap: 4px; }
  .header-tag { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; }
  .tag-badge { color: var(--kanso-accent); font-family: var(--kanso-font-mono); }
  .tag-meta { color: var(--kanso-text-muted); }
  .view-title { margin: 0; font-size: 24px; font-weight: 700; color: var(--kanso-text-primary); }
  .view-subtitle { margin: 0; font-size: 13px; color: var(--kanso-text-muted); }
  .view-controls-wrap { display: flex; align-items: center; gap: 10px; }
  .view-switcher-segmented { display: flex; background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 2px; gap: 2px; }
  .seg-view-btn { display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 4px; border: none; background: transparent; color: var(--kanso-text-muted); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.12s ease; }
  .seg-view-btn:hover { color: var(--kanso-text-primary); }
  .seg-view-btn.is-active { background: var(--kanso-canvas); color: var(--kanso-text-primary); border: 1px solid var(--kanso-border); }
  .new-project-header-btn { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 14px; background: var(--kanso-accent); color: #FFFFFF; border: 1px solid var(--kanso-accent); border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; }
  .new-project-header-btn:hover { opacity: 0.9; }
  .loading-box { text-align: center; padding: 60px 0; color: var(--kanso-text-muted); font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .loading-spinner-orbit { width: 24px; height: 24px; border: 2px solid var(--kanso-border); border-top-color: var(--kanso-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty-box { text-align: center; padding: 60px 24px; background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; }
  .empty-icon-wrap { color: var(--kanso-text-muted); margin-bottom: 8px; }
  .empty-box h3 { margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: var(--kanso-text-primary); }
  .empty-box p { margin: 0; font-size: 12px; color: var(--kanso-text-muted); }
  .delete-dialog-body { display: flex; flex-direction: column; gap: 14px; }
  .delete-warning-banner { background: var(--kanso-canvas); border: 1px solid var(--kanso-danger); border-radius: 6px; padding: 12px; font-size: 12px; }
  .warning-title { display: flex; align-items: center; gap: 6px; color: var(--kanso-danger); font-weight: 700; margin-bottom: 6px; }
  .warning-text { margin: 0 0 8px 0; color: var(--kanso-text-muted); }
  .subfolder-list { margin: 0; padding-left: 20px; color: var(--kanso-text-muted); }
  .delete-target-card { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 12px; }
  .target-title { font-size: 14px; font-weight: 700; color: var(--kanso-text-primary); }
  .target-meta { font-size: 11px; color: var(--kanso-text-muted); margin-top: 4px; }
  .scaffold-form-body { display: flex; flex-direction: column; gap: 14px; }
  .scaffold-form-row { display: flex; gap: 12px; }
  .scaffold-form-row-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .form-field { display: flex; flex-direction: column; gap: 4px; }
  .flex-1 { flex: 1; }
  .form-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kanso-text-muted); letter-spacing: 0.04em; }
  .form-input { height: 34px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 0 10px; font-size: 12px; color: var(--kanso-text-primary); }
  .form-input:focus { outline: none; border-color: var(--kanso-accent); }
  .form-select { cursor: pointer; }
  textarea.form-input { height: auto; padding: 8px 10px; resize: vertical; }
</style>
