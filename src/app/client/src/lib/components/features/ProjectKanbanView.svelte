<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { fetchStaffList } from '$lib/utils';
  import type { Project } from '$lib/types';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';
  import { notesService } from '$lib/services/notesService';
  import { clientService } from '$lib/services/clientService';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import type { NoteTask } from '$lib/types/notes';

  interface Props {
    projects: Project[];
    isAdminUser?: boolean;
    onDelete?: (project: Project) => void;
  }

  let { projects, isAdminUser = false, onDelete }: Props = $props();

  let showTaskBar = $state(false);
  let vaultTasks = $state<NoteTask[]>([]);

  onMount(() => {
    vaultTasks = notesService.getAllTasks();
  });

  let pendingVaultTasks = $derived(vaultTasks.filter(t => !t.completed));

  function handleToggleVaultTask(task: NoteTask) {
    notesService.toggleTask(task);
    vaultTasks = notesService.getAllTasks();
  }

  const columns = [
    { id: 'backlog', label: 'Backlog', icon: '📝', color: 'var(--kanso-text-muted)', hint: 'Project scoping & queued briefs' },
    { id: 'in-progress', label: 'In Production', icon: '⚡', color: 'var(--kanso-accent)', hint: 'Active design & asset creation' },
    { id: 'review', label: 'Client Proofing', icon: '🔍', color: 'var(--kanso-accent)', hint: 'Awaiting client review & feedback' },
    { id: 'revision', label: 'Revision Pending', icon: '⚠️', color: 'var(--kanso-warning)', hint: 'Client adjustments requested' },
    { id: 'done', label: 'Client Approved', icon: '✅', color: 'var(--kanso-success)', hint: 'Deliverables ready & billable' },
    { id: 'on-hold', label: 'On Hold / Queued', icon: '⏸️', color: 'var(--kanso-text-muted)', hint: 'Paused or parked campaigns' }
  ];

  let draggedProjectId = $state<string | null>(null);
  let dragOverColumnId = $state<string | null>(null);

  function getProjectsForColumn(colId: string): Project[] {
    if (colId === 'done') {
      return projects.filter(p => p.status === 'done' || p.status === 'approved');
    }
    if (colId === 'on-hold') {
      return projects.filter(p => p.status === 'on-hold' || p.status === 'rejected');
    }
    return projects.filter(p => p.status === colId);
  }

  function handleDragStart(e: DragEvent, project: Project) {
    draggedProjectId = project.id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', project.id);
    }
  }

  function handleDragOver(e: DragEvent, colId: string) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    dragOverColumnId = colId;
  }

  function handleDragLeave(colId: string) {
    if (dragOverColumnId === colId) {
      dragOverColumnId = null;
    }
  }

  async function handleDrop(e: DragEvent, targetColId: string) {
    e.preventDefault();
    dragOverColumnId = null;
    const projId = e.dataTransfer ? e.dataTransfer.getData('text/plain') : draggedProjectId;
    if (!projId) return;

    const project = projects.find(p => p.id === projId);
    if (!project) return;

    const newStatus = targetColId === 'done' ? 'done' : targetColId;
    if (project.status === newStatus) return;

    await projectStore.updateProjectStatus(project.id, newStatus);
    draggedProjectId = null;
  }

  const PIPELINE_ORDER = ['backlog', 'in-progress', 'review', 'revision', 'done'];

  async function moveProjectStage(e: Event, project: Project, direction: 'prev' | 'next') {
    e.stopPropagation();
    const currentStatus = project.status === 'approved' ? 'done' : (project.status === 'rejected' ? 'on-hold' : project.status);
    const currentIndex = PIPELINE_ORDER.indexOf(currentStatus);
    if (currentIndex === -1) {
      await projectStore.updateProjectStatus(project.id, 'in-progress');
      appState.addToast(`Moved ${project.jobId || project.title} to In Production`, 'info');
      return;
    }
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < PIPELINE_ORDER.length) {
      const newStatus = PIPELINE_ORDER[newIndex];
      await projectStore.updateProjectStatus(project.id, newStatus);
      const col = columns.find(c => c.id === newStatus);
      appState.addToast(`Moved ${project.jobId || project.title} → ${col?.label || newStatus}`, 'success');
    }
  }

  function handleCardTimerToggle(e: Event, project: Project) {
    e.stopPropagation();
    if (timerStore.isRunning && timerStore.projectId === project.id) {
      const log = timerStore.stop();
      if (log) {
        appState.addToast(`Logged ${log.durationFormatted} (${log.earnedFormatted}) for "${project.title}"`, 'success');
      }
    } else {
      const clientRate = clientService.getClientRate(project.brand || 'ACME');
      timerStore.start(project.id, project.title, project.brand || 'ACME', clientRate);
      appState.addToast(`Started chronometer for "${project.title}" (${settingsStore.formatMoney(clientRate, project.currency)}/hr)`, 'info');
    }
  }

  let copiedHex = $state<string | null>(null);
  function copyHex(e: Event, hex: string) {
    e.stopPropagation();
    navigator.clipboard.writeText(hex);
    copiedHex = hex;
    appState.addToast(`Copied ${hex} to clipboard`, 'info');
    setTimeout(() => { copiedHex = null; }, 2000);
  }

  function getPriorityBadge(priority?: string): { text: string; color: string } | null {
    switch ((priority || '').toLowerCase().trim()) {
      case 'urgent': return { text: 'P3', color: 'var(--kanso-danger)' };
      case 'high': return { text: 'P2', color: 'var(--kanso-warning)' };
      case 'medium':
      case 'standard': return { text: 'P1', color: 'var(--kanso-accent)' };
      default: return null; // Low - no badge
    }
  }

  let staffList = $state<any[]>([]);

  async function loadStaffList() {
    staffList = await fetchStaffList();
  }

  onMount(() => {
    loadStaffList();

    const handleTeamUpdate = () => {
      loadStaffList();
    };
    window.addEventListener('team:updated', handleTeamUpdate);
    return () => {
      window.removeEventListener('team:updated', handleTeamUpdate);
    };
  });

  function getDesignerMeta(designerName?: string): { name: string; initial: string; avatar: string | null; avatarColor: string } {
    const raw = (designerName || '').trim();
    if (!raw || raw.toLowerCase() === 'unassigned') {
      return {
        name: 'Unassigned',
        initial: '?',
        avatar: null,
        avatarColor: 'var(--kanso-text-muted)'
      };
    }

    const key = raw.toLowerCase();
    const member = staffList.find(s =>
      (s.name && s.name.toLowerCase() === key) ||
      (s.username && s.username.toLowerCase() === key) ||
      (s.staffId && s.staffId.toLowerCase() === key) ||
      (s.name && key.includes(s.name.toLowerCase()))
    );

    const isCurrentUser = Boolean(appState.currentUser && (
      (appState.currentUser.name && appState.currentUser.name.toLowerCase() === key) ||
      (appState.currentUser.username && appState.currentUser.username.toLowerCase() === key) ||
      (appState.currentUser.staffId && appState.currentUser.staffId.toLowerCase() === key) ||
      (member?.staffId && appState.currentUser.staffId && member.staffId.toLowerCase() === appState.currentUser.staffId.toLowerCase())
    ));

    let avatar: string | null = member?.avatar || (isCurrentUser ? appState.currentUser?.avatar : null) || null;

    const avatarColor = member?.avatarColor || (isCurrentUser ? appState.currentUser?.avatarColor : null) || 'var(--kanso-accent)';
    const displayName = member?.name || raw;
    const initial = displayName.charAt(0).toUpperCase();

    return {
      name: displayName,
      initial,
      avatar,
      avatarColor
    };
  }
</script>

<div class="kanban-board-container">
  <!-- Universal Task Rollup Bar -->
  <div class="vault-task-rollup-bar">
    <div class="task-rollup-left">
      <span class="task-rollup-icon">📋</span>
      <span class="task-rollup-title">Vault Task Rollup</span>
      <span class="task-rollup-badge">{pendingVaultTasks.length} active tasks</span>
    </div>
    <button
      type="button"
      class="task-rollup-toggle-btn"
      onclick={() => showTaskBar = !showTaskBar}
    >
      {showTaskBar ? 'Hide Tasks ▲' : 'Show Tasks ▼'}
    </button>
  </div>

  {#if showTaskBar}
    <div class="vault-tasks-shelf">
      {#if vaultTasks.length === 0}
        <div class="tasks-empty">No inline tasks found. Add <code>- [ ] #task Action item</code> in notes or briefs.</div>
      {:else}
        <div class="tasks-chips-grid">
          {#each vaultTasks as task}
            <label class="task-chip-card" class:is-done={task.completed}>
              <input
                type="checkbox"
                checked={task.completed}
                onchange={() => handleToggleVaultTask(task)}
                class="task-chip-check"
              />
              <span class="task-chip-desc">{task.description}</span>
              {#if task.dueDate}
                <span class="task-chip-date">📅 {task.dueDate}</span>
              {/if}
              {#if task.priority && task.priority !== 'normal'}
                <span class="task-chip-priority" class:is-high={task.priority === 'high' || task.priority === 'urgent'}>
                  {task.priority}
                </span>
              {/if}
              <span class="task-chip-source">({task.sourceNoteTitle})</span>
            </label>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <div class="kanban-columns-grid">
    {#each columns as col}
      {@const colProjects = getProjectsForColumn(col.id)}
      <div
        class="kanban-column"
        class:is-drag-over={dragOverColumnId === col.id}
        ondragover={(e) => handleDragOver(e, col.id)}
        ondragleave={() => handleDragLeave(col.id)}
        ondrop={(e) => handleDrop(e, col.id)}
        role="region"
        aria-label={col.label}
      >
        <!-- Column Header -->
        <div class="column-header" style="border-top-color: {col.color};">
          <div class="col-title-wrap">
            <span class="col-icon">{col.icon}</span>
            <h3 class="col-title">{col.label}</h3>
            <span class="col-count-pill" style="background: {col.color}1A; color: {col.color};">
              {colProjects.length}
            </span>
          </div>
          <p class="col-hint">{col.hint}</p>
        </div>

        <!-- Cards List -->
        <div class="column-cards-list">
          {#if dragOverColumnId === col.id}
            <div class="column-drop-placeholder">
              <span>↓ Drop to move to {col.label}</span>
            </div>
          {/if}

          {#if colProjects.length === 0 && dragOverColumnId !== col.id}
            <div class="column-empty-dropzone">
              <span class="empty-icon">📭</span>
              <span>No {col.label.toLowerCase()} projects</span>
              <small>Drag cards here to update pipeline</small>
            </div>
          {:else}
            {#each colProjects as p (p.id)}
              {@const dMeta = getDesignerMeta(p.designer)}
              {@const client = clientService.getClientByCode(p.brand || 'ACME')}
              {@const clientColor = client?.palette?.primary || 'var(--kanso-accent)'}
              {@const currentStageIdx = PIPELINE_ORDER.indexOf(p.status === 'approved' ? 'done' : (p.status === 'rejected' ? 'on-hold' : p.status))}
              <div
                class="kanban-card"
                draggable="true"
                class:is-dragging={draggedProjectId === p.id}
                ondragstart={(e) => handleDragStart(e, p)}
                ondragend={() => { draggedProjectId = null; dragOverColumnId = null; }}
                onclick={() => appState.navigate('project-detail', { id: p.id })}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && appState.navigate('project-detail', { id: p.id })}
              >
                <!-- Top Row: Job ID, Brand & Quick Delete -->
                <div class="card-meta-header">
                  <div class="job-id-pill">
                    <a
                      href="#project-detail/{encodeURIComponent(p.id)}"
                      class="job-id-mono"
                      onclick={(e) => { e.stopPropagation(); appState.navigate('project-detail', { id: p.id }); }}
                    >
                      {p.jobId || p.id}
                    </a>
                    <FluentBadge type="brand" value={p.brand || 'ACME'}>{p.brand || 'ACME'}</FluentBadge>
                  </div>

                  <div class="card-action-group">
                    {#if getPriorityBadge(p.priority)}
                      {@const badge = getPriorityBadge(p.priority)}
                      <span
                        class="priority-dot-badge"
                        style="background: {badge.color}18; color: {badge.color}; border-color: {badge.color}40;"
                        title="Priority: {badge.text}"
                      >
                        ● {badge.text}
                      </span>
                    {/if}
                    {#if isAdminUser && onDelete}
                      <button
                        type="button"
                        class="quick-delete-btn"
                        title="Delete project"
                        onclick={(e) => {
                          e.stopPropagation();
                          onDelete(p);
                        }}
                      >
                        🗑
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- Title -->
                <a
                  href="#project-detail/{encodeURIComponent(p.id)}"
                  class="card-project-title"
                  title={p.title}
                  onclick={(e) => { e.stopPropagation(); appState.navigate('project-detail', { id: p.id }); }}
                >
                  {p.title}
                </a>

                <!-- Preset & Tags -->
                <div class="card-preset-row">
                  {#if p.presetType}
                    <span class="preset-tag">{p.presetType}</span>
                  {/if}
                  {#if p.revision && p.revision > 0}
                    <span
                      class="rev-counter-pill"
                      class:rev-warning={p.revision >= 3}
                      title={p.revision >= 3 ? `High revision rounds (${p.revision}) — verify scope & billable hours` : `Revision round ${p.revision}`}
                    >
                      {p.revision >= 3 ? '⚠️ ' : ''}Rev {p.revision}
                    </span>
                  {/if}
                </div>

                <!-- Bottom Row: Client Swatch & Due Date -->
                <div class="card-footer-row">
                  <button
                    type="button"
                    class="client-swatch-chip"
                    title="Click to copy HEX {clientColor} to clipboard"
                    onclick={(e) => copyHex(e, clientColor)}
                  >
                    <span class="client-color-dot" style="background: {clientColor};"></span>
                    <span class="client-name-label">{client?.name || p.brand || 'Client'}</span>
                    {#if copiedHex === clientColor}
                      <span class="swatch-copied-label">Copied!</span>
                    {/if}
                  </button>

                  <div class="deadline-block" class:is-overdue={p.isOverdue}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>{p.deadline ? new Date(p.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No due date'}</span>
                  </div>
                </div>

                <!-- Stage Fast-Travel & Billable Chronometer Row -->
                <div class="card-quick-actions" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    class="stage-nav-btn prev"
                    title="Move to previous stage"
                    disabled={currentStageIdx <= 0}
                    onclick={(e) => moveProjectStage(e, p, 'prev')}
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    class="card-timer-btn"
                    class:is-active={timerStore.isRunning && timerStore.projectId === p.id}
                    title={timerStore.isRunning && timerStore.projectId === p.id ? 'Stop Active Chronometer' : 'Track Time on this Project'}
                    onclick={(e) => handleCardTimerToggle(e, p)}
                  >
                    {timerStore.isRunning && timerStore.projectId === p.id ? '⏸ Pause Timer' : '▶ Track Time'}
                  </button>

                  <button
                    type="button"
                    class="stage-nav-btn next"
                    title="Move to next stage"
                    disabled={currentStageIdx >= PIPELINE_ORDER.length - 1 || currentStageIdx === -1}
                    onclick={(e) => moveProjectStage(e, p, 'next')}
                  >
                    →
                  </button>
                </div>

                <!-- Status Selector Menu -->
                <div class="quick-status-selector-row" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
                  <label class="status-quick-label" for="move-status-{p.id}">Move:</label>
                  <select
                    id="move-status-{p.id}"
                    class="status-select-native"
                    value={p.status}
                    onchange={async (e) => {
                      const target = (e.target as HTMLSelectElement).value;
                      if (target !== p.status) {
                        await projectStore.updateProjectStatus(p.id, target);
                      }
                    }}
                  >
                    <option value="backlog">Backlog</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review Queue</option>
                    <option value="revision">Revision Required</option>
                    <option value="done">Approved & Done</option>
                  </select>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .kanban-board-container {
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .kanban-columns-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(230px, 1fr));
    gap: 14px;
    width: 100%;
    flex: 1;
    min-height: calc(100vh - 220px);
    align-items: stretch;
  }

  .kanban-column {
    background: var(--kanso-surface, var(--kanso-surface-hover));
    border: 1px solid var(--kanso-border, var(--kanso-border));
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    min-height: 100%;
    box-sizing: border-box;
    transition: all 0.2s ease;
  }

  .kanban-column.is-drag-over {
    background: rgba(0, 120, 212, 0.08);
    border-color: var(--kanso-accent);
    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
  }

  .column-header {
    border-top: 3px solid transparent;
    padding-top: 8px;
    border-bottom: 1px solid var(--kanso-border, var(--kanso-border));
    padding-bottom: 10px;
  }

  .col-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .col-icon {
    font-size: 15px;
  }

  .col-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    margin: 0;
    flex: 1;
  }

  .col-count-pill {
    font-size: 11px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 9999px;
  }

  .col-hint {
    font-size: 11px;
    color: var(--kanso-text-secondary);
    margin: 4px 0 0 0;
  }

  .column-cards-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .column-empty-dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 32px 12px;
    border: 1.5px dashed var(--kanso-border);
    border-radius: 8px;
    color: var(--kanso-text-secondary);
    font-size: 12px;
    text-align: center;
    margin: auto 0;
  }

  .column-empty-dropzone .empty-icon {
    font-size: 22px;
    margin-bottom: 4px;
  }

  .column-empty-dropzone small {
    font-size: 10.5px;
    color: var(--kanso-text-muted);
  }

  .column-drop-placeholder {
    border: 2px dashed var(--kanso-accent);
    background: rgba(56, 189, 248, 0.08);
    border-radius: 8px;
    padding: 12px;
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-accent);
    animation: pulseDropzone 1.5s ease-in-out infinite;
    margin-bottom: 4px;
  }

  @keyframes pulseDropzone {
    0%, 100% { opacity: 0.75; transform: scale(0.99); }
    50% { opacity: 1; transform: scale(1); }
  }

  /* ─── Kanban Card ─── */
  .kanban-card {
    background: var(--kanso-surface, var(--kanso-surface));
    border: 1px solid var(--kanso-border, var(--kanso-border));
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    cursor: grab;
    transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease, border-color 0.15s ease;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
  }

  .kanban-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    border-color: rgba(56, 189, 248, 0.4);
  }

  .kanban-card:active {
    cursor: grabbing;
  }

  .kanban-card.is-dragging {
    opacity: 0.75;
    transform: rotate(1.5deg) scale(1.02);
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
    border-color: var(--kanso-accent);
    border-style: dashed;
    z-index: 10;
  }

  .card-meta-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .job-id-pill {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .job-id-mono {
    font-family: monospace;
    font-size: 12px;
    font-weight: 800;
    color: var(--kanso-accent);
    text-decoration: none;
    cursor: pointer;
  }

  .job-id-mono:hover {
    text-decoration: underline;
    color: var(--kanso-accent);
  }

  .card-action-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .priority-dot-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid;
    text-transform: capitalize;
  }

  .quick-delete-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    border-radius: 4px;
    opacity: 0.5;
    transition: all 0.15s;
  }

  .quick-delete-btn:hover {
    opacity: 1;
    background: rgba(239, 68, 68, 0.15);
  }

  .card-project-title {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    margin: 0;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-decoration: none;
    cursor: pointer;
    transition: color 0.15s ease;
  }

  .card-project-title:hover {
    color: var(--kanso-accent);
    text-decoration: underline;
  }

  .card-preset-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .preset-tag {
    font-size: 10.5px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-secondary);
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 500;
  }

  .rev-counter-pill {
    font-size: 10px;
    font-weight: 800;
    background: rgba(217, 119, 6, 0.12);
    color: var(--kanso-warning);
    padding: 1px 6px;
    border-radius: 4px;
    transition: all 0.15s ease;
  }

  .rev-counter-pill.rev-warning {
    background: rgba(239, 68, 68, 0.15);
    color: var(--kanso-danger);
    border: 1px solid rgba(239, 68, 68, 0.3);
    animation: subtleBlink 3s ease-in-out infinite;
  }

  @keyframes subtleBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.75; }
  }

  .card-footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid var(--kanso-border);
    font-size: 11.5px;
    margin-top: 2px;
  }

  .client-swatch-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    padding: 2px 4px;
    margin-left: -4px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    transition: all 0.15s ease;
  }

  .client-swatch-chip:hover {
    background: var(--kanso-surface-hover, rgba(255, 255, 255, 0.05));
  }

  .client-swatch-chip:hover .client-name-label {
    color: var(--kanso-text-primary);
  }

  .client-color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  }

  .client-name-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }

  .swatch-copied-label {
    font-size: 9.5px;
    font-weight: 700;
    color: var(--kanso-success);
    background: rgba(16, 185, 129, 0.15);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .deadline-block {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--kanso-text-secondary);
    font-size: 11px;
    font-weight: 500;
  }

  .deadline-block.is-overdue {
    color: var(--kanso-danger);
    font-weight: 800;
  }

  /* Fast-Travel Stage Nav & Chronometer Row */
  .card-quick-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 6px;
    border-top: 1px dashed var(--kanso-border);
  }

  .stage-nav-btn {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .stage-nav-btn:hover:not(:disabled) {
    background: var(--kanso-surface-hover);
    color: var(--kanso-accent);
    border-color: var(--kanso-accent);
  }

  .stage-nav-btn:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }

  .card-timer-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    font-size: 10.5px;
    font-weight: 600;
    padding: 3px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .card-timer-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-border);
  }

  .card-timer-btn.is-active {
    background: rgba(16, 185, 129, 0.12);
    border-color: var(--kanso-success);
    color: var(--kanso-success);
    font-weight: 700;
    animation: pulseTimerBtn 2s ease-in-out infinite;
  }

  @keyframes pulseTimerBtn {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  /* Quick status selector */
  .quick-status-selector-row {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 11px;
  }

  .status-quick-label {
    font-weight: 700;
    color: var(--kanso-text-secondary);
  }

  .status-select-native {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-text-primary);
    outline: none;
    cursor: pointer;
  }

  /* ═══ VAULT TASK ROLLUP ═══════════════════════════════════════ */
  .vault-task-rollup-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 8px 14px;
    margin-bottom: 12px;
  }

  .task-rollup-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .task-rollup-icon {
    font-size: 14px;
  }

  .task-rollup-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .task-rollup-badge {
    font-size: 11px;
    font-weight: 600;
    font-family: monospace;
    background: rgba(56, 189, 248, 0.12);
    color: var(--kanso-accent);
    padding: 1px 6px;
    border-radius: 4px;
  }

  .task-rollup-toggle-btn {
    background: transparent;
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .task-rollup-toggle-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
  }

  .vault-tasks-shelf {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 14px;
  }

  .tasks-empty {
    font-size: 12px;
    color: var(--kanso-text-muted);
    text-align: center;
    padding: 12px;
  }

  .tasks-chips-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .task-chip-card {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 11px;
    color: var(--kanso-text-primary);
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .task-chip-card:hover {
    border-color: var(--kanso-accent);
  }

  .task-chip-card.is-done {
    opacity: 0.5;
  }

  .task-chip-card.is-done .task-chip-desc {
    text-decoration: line-through;
    color: var(--kanso-text-muted);
  }

  .task-chip-check {
    cursor: pointer;
  }

  .task-chip-desc {
    font-weight: 500;
  }

  .task-chip-date {
    font-family: monospace;
    font-size: 10px;
    color: var(--kanso-text-muted);
    background: var(--kanso-surface);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .task-chip-priority {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--kanso-warning);
    background: rgba(245, 158, 11, 0.12);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .task-chip-priority.is-high {
    color: var(--kanso-danger);
    background: rgba(239, 68, 68, 0.12);
  }

  .task-chip-source {
    font-size: 9px;
    color: var(--kanso-accent);
    opacity: 0.8;
  }
</style>
