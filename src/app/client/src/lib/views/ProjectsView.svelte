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
  import { clientService } from '$lib/services/clientService';
  import { licenseStore } from '$lib/stores/licenseStore.svelte';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { settingsStore, getCurrencySymbol } from '$lib/stores/settingsStore.svelte';
  import type { ClientProfile } from '$lib/types/kanso';

  type ViewMode = 'cards' | 'kanban' | 'gantt' | 'calendar' | 'table';

  const initialDefaultView: ViewMode =
    (typeof localStorage !== 'undefined' && (localStorage.getItem('ss_cam_default_project_view') as ViewMode)) || 'cards';

  let defaultView = $state<ViewMode>(initialDefaultView);

  let viewMode = $state<ViewMode>(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('ss_cam_project_view') as ViewMode)) || initialDefaultView
  );

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

  function handleToggleTimer(e: Event, project: Project) {
    e.stopPropagation();
    if (timerStore.isRunning && timerStore.projectId === project.id) {
      const log = timerStore.stop();
      if (log) {
        appState.addToast(`Logged ${log.durationFormatted} (${log.earnedFormatted}) for "${project.title}"`, 'success');
      }
    } else {
      const clientRate = clientService.getClientRate(project.brand || 'ACME');
      timerStore.start({
        projectId: project.id,
        projectTitle: project.title,
        clientCode: project.brand || 'ACME',
        hourlyRate: clientRate
      });
      appState.addToast(`Started live timer for "${project.title}" (${project.brand || 'ACME'})`, 'info');
    }
  }

  function getDeadlineInfo(deadlineStr?: string): { text: string; isOverdue: boolean; isSoon: boolean } {
    if (!deadlineStr) return { text: 'No due date', isOverdue: false, isSoon: false };
    const due = new Date(deadlineStr);
    if (isNaN(due.getTime())) return { text: deadlineStr, isOverdue: false, isSoon: false };
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isSoon: false };
    }
    if (diffDays === 0) {
      return { text: 'Due today', isOverdue: false, isSoon: true };
    }
    if (diffDays === 1) {
      return { text: 'Due tomorrow', isOverdue: false, isSoon: true };
    }
    if (diffDays <= 3) {
      return { text: `${diffDays} days left`, isOverdue: false, isSoon: true };
    }
    return { text: `${diffDays} days left`, isOverdue: false, isSoon: false };
  }

  onMount(() => {
    projectStore.loadProjects();
    clientsList = clientService.getClients();
  });
</script>

<div class="projects-container">
  <!-- View Header & View Switcher -->
  <div class="view-header">
    <div class="header-titles">
      <div class="header-tag">
        <span class="tag-badge">_Projects/</span>
        <span class="tag-meta">Active Vaults &amp; Schedules</span>
      </div>
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

      <!-- New Project Action Button -->
      <button
        type="button"
        class="new-project-header-btn"
        onclick={openNewProjectModal}
        title="Scaffold a new 5-folder project vault"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 4v16m8-8H4" />
        </svg>
        <span>New Project</span>
      </button>
    </div>
  </div>

  <!-- Shared Filter Bar -->
  <ProjectFilterBar />

  <!-- Dynamic View Render -->
  {#if projectStore.isLoading}
    <div class="loading-box">
      <div class="loading-spinner-orbit"></div>
      <span>Syncing Projects with Creative Vault...</span>
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
    <!-- Default Cards Grid View (Single Freelance Designer POV) -->
    <div class="projects-grid">
      {#each projectStore.filteredProjects as p (p.id)}
        {@const client = clientService.getClientByCode(p.brand || 'ACME')}
        {@const deadlineInfo = getDeadlineInfo(p.deadline)}
        {@const isTimerActive = timerStore.isRunning && timerStore.projectId === p.id}
        <div
          class="project-card-wrapper"
          class:timer-active-card={isTimerActive}
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
                <div class="client-badge-pill" title={client?.name || p.brand || 'Client'}>
                  <span class="client-badge-dot" style="background-color: {client?.palette?.primary || 'var(--kanso-accent)'};"></span>
                  <span>{p.brand || 'ACME'}</span>
                </div>
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

            <!-- Freelance Meta: Deliverables & Deadline Urgency -->
            <div class="freelance-meta-row">
              <div class="meta-item" title="Deliverables status">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>{p.deliverablesCount ? `${p.deliverablesCount} files` : (p.status === 'done' || p.status === 'approved' ? 'Deliverables ready' : 'Scope defined')}</span>
              </div>

              <div class="meta-item deadline-item" class:is-overdue={deadlineInfo.isOverdue} class:is-soon={deadlineInfo.isSoon}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>{deadlineInfo.text}</span>
              </div>
            </div>

            <!-- Tactile 1-Click Billable Chronometer & Tag Bar -->
            <div class="card-footer-action-bar">
              <button
                type="button"
                class="card-timer-btn"
                class:is-active={isTimerActive}
                onclick={(e) => handleToggleTimer(e, p)}
                title={isTimerActive ? 'Stop Live Timer' : 'Start Live Timer for this project'}
              >
                {#if isTimerActive}
                  <span class="pulsing-record-dot"></span>
                  <span class="timer-ticker-label">{timerStore.formattedTime}</span>
                  <span class="timer-stop-icon">■ Stop</span>
                {:else}
                  <span class="timer-play-icon">▶</span>
                  <span>Start Timer</span>
                {/if}
              </button>

              {#if p.tags && p.tags.length > 0}
                <div class="card-tags">
                  {#each p.tags.slice(0, 2) as t}
                    <span class="tag-pill">{t}</span>
                  {/each}
                </div>
              {/if}
            </div>
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
        <div class="delete-target-info">
          <span class="target-label">Target Project:</span>
          <span class="target-val"><strong>{projectToDelete.jobId || projectToDelete.id}</strong> — {projectToDelete.title}</span>
        </div>
      {/if}
    </div>
  </FluentDialog>

  <!-- New Project Scaffolding Dialog -->
  <FluentDialog
    bind:open={showNewProjectModal}
    title="Scaffold 5-Folder Project Vault"
    confirmText="Scaffold Vault"
    confirmAppearance="primary"
    loading={isSubmitting}
    onConfirm={handleCreateProject}
    onClose={() => { showNewProjectModal = false; }}
  >
    <div class="scaffold-dialog-body">
      <!-- Info banner with 5-folder preview -->
      <div class="scaffold-preview-banner">
        <div class="preview-title">
          <span>📁 Standardized Vault Structure</span>
        </div>
        <p class="preview-text">
          Instantly generates canonical 5-folder hierarchy and <code>README.md</code> with YAML frontmatter specs:
        </p>
        <div class="folder-tree-box">
          <div class="tree-root">📂 {new Date().getFullYear()}/{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}_[JOBID]_{npClientCode}_{npTitle.replace(/[^a-zA-Z0-9]/g, '_') || 'Project'}/</div>
          <div class="tree-branch">├── 01_BRIEF/ <span class="tree-desc">(References &amp; logos)</span></div>
          <div class="tree-branch">├── 02_SOURCE/ <span class="tree-desc">(Master design vectors)</span></div>
          <div class="tree-branch">├── 03_COPY/COPY.md <span class="tree-desc">(Headlines &amp; copy)</span></div>
          <div class="tree-branch">├── 04_WIP/ <span class="tree-desc">(Draft review renders)</span></div>
          <div class="tree-branch">├── 05_DELIVERABLES/ <span class="tree-desc">(Client final packages)</span></div>
          <div class="tree-branch">└── README.md <span class="tree-desc">(YAML frontmatter specs)</span></div>
        </div>
      </div>

      <!-- Form Inputs -->
      <div class="scaffold-form-grid">
        <div class="form-field">
          <label class="form-label" for="np-client">Client</label>
          <select id="np-client" bind:value={npClientCode} class="form-input form-select">
            {#each clientsList as c}
              <option value={c.code}>[{c.code}] {c.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-field">
          <label class="form-label" for="np-deliverable-type">Deliverable Type</label>
          <select id="np-deliverable-type" bind:value={npDeliverableType} class="form-input form-select">
            <option value="Graphic / Print">Graphic / Print (D)</option>
            <option value="Social Media">Social Media (S)</option>
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

  /* Client Badge Pill */
  .client-badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 7px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--radius-pill, 9999px);
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-text-primary);
    font-family: var(--font-mono, monospace);
  }

  .client-badge-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
  }

  /* Freelance Meta Row */
  .freelance-meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: var(--kanso-text-muted);
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--kanso-border);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .deadline-item.is-overdue {
    color: var(--kanso-danger, #ef4444);
    font-weight: 700;
  }

  .deadline-item.is-soon {
    color: var(--kanso-warning, #f59e0b);
    font-weight: 600;
  }

  /* Card Footer & Timer Action */
  .card-footer-action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .card-timer-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--radius-md, 6px);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .card-timer-btn:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
    border-color: var(--kanso-accent);
  }

  .card-timer-btn.is-active {
    background: rgba(16, 185, 129, 0.12);
    border-color: #10B981;
    color: #10B981;
  }

  .pulsing-record-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    animation: pulse 1.2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.3); }
  }

  .timer-play-icon {
    font-size: 9px;
  }

  .timer-stop-icon {
    font-size: 10px;
    font-weight: 800;
  }

  .timer-ticker-label {
    font-family: var(--font-mono, monospace);
    font-size: 11.5px;
    font-weight: 700;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag-pill {
    font-size: 11px;
    padding: 2px 6px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: 9999px;
    color: var(--kanso-text-muted);
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

  /* ═══ NEW PROJECT BUTTON & SCAFFOLD DIALOG ═════════════════════ */
  .new-project-header-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
    font-weight: 700;
    font-size: 0.8rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  .new-project-header-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .scaffold-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .scaffold-preview-banner {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .preview-title {
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--kanso-accent, #38BDF8);
  }

  .preview-text {
    font-size: 0.8rem;
    color: var(--kanso-text-muted, #71717A);
    margin: 0;
    line-height: 1.4;
  }

  .preview-text code {
    font-family: monospace;
    color: var(--kanso-text-primary, #F4F4F5);
    background: var(--kanso-surface-hover, #27272A);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .folder-tree-box {
    font-family: monospace;
    font-size: 0.72rem;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 8px 10px;
    line-height: 1.5;
  }

  .tree-root {
    color: var(--kanso-accent, #38BDF8);
    font-weight: 700;
  }

  .tree-branch {
    padding-left: 12px;
    color: var(--kanso-text-muted, #71717A);
  }

  .tree-desc {
    color: var(--kanso-text-muted, #52525B);
  }

  .scaffold-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .scaffold-form-row-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted, #71717A);
  }

  .form-input {
    width: 100%;
    padding: 7px 10px;
    border-radius: 6px;
    border: 1px solid var(--kanso-border, #27272A);
    background: var(--kanso-surface, #18181B);
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 0.8rem;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s ease;
  }

  .form-input:focus {
    border-color: var(--kanso-accent, #38BDF8);
  }

  .form-select {
    cursor: pointer;
  }
</style>
