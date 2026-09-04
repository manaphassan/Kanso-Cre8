<script lang="ts">
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import type { Project } from '$lib/types';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';

  interface Props {
    projects: Project[];
    isAdminUser?: boolean;
    onDelete?: (project: Project) => void;
  }

  let { projects, isAdminUser = false, onDelete }: Props = $props();

  const columns = [
    { id: 'backlog', label: 'Backlog', icon: '📝', color: '#6B7280', hint: 'Ideation & briefs queued' },
    { id: 'in-progress', label: 'In Progress', icon: '⚡', color: '#0284C7', hint: 'Active design production' },
    { id: 'review', label: 'Review Queue', icon: '🔍', color: '#8764B8', hint: 'Awaiting manager / lead sign-off' },
    { id: 'revision', label: 'Revision Required', icon: '⚠️', color: '#D97706', hint: 'Feedback & changes pending' },
    { id: 'done', label: 'Approved & Done', icon: '✅', color: '#107C41', hint: 'Final deliverables signed off' },
    { id: 'on-hold', label: 'On Hold / Queued', icon: '⏸️', color: '#64748B', hint: 'Paused, archived or blocked projects' }
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

  function getPriorityBadge(priority?: string): { text: string; color: string } | null {
    switch ((priority || '').toLowerCase().trim()) {
      case 'urgent': return { text: 'P3', color: '#EF4444' };
      case 'high': return { text: 'P2', color: '#F59E0B' };
      case 'medium':
      case 'standard': return { text: 'P1', color: '#0284C7' };
      default: return null; // Low - no badge
    }
  }
</script>

<div class="kanban-board-container">
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
          {#if colProjects.length === 0}
            <div class="column-empty-dropzone">
              <span class="empty-icon">📭</span>
              <span>No {col.label.toLowerCase()} projects</span>
              <small>Drag cards here to update pipeline</small>
            </div>
          {:else}
            {#each colProjects as p (p.id)}
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
                    <FluentBadge type="brand" value={p.brand || 'SS'} />
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
                    <span class="rev-counter-pill">Rev {p.revision}</span>
                  {/if}
                </div>

                <!-- Bottom Row: Designer & Due Date -->
                <div class="card-footer-row">
                  <div class="designer-badge" title="Assigned Designer: {p.designer || 'Unassigned'}">
                    <div class="designer-avatar-circle" style="background: var(--brand-accent, #0078D4);">
                      {(p.designer || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span class="designer-name">{p.designer || 'Unassigned'}</span>
                  </div>

                  <div class="deadline-block" class:is-overdue={p.isOverdue}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>{p.deadline ? new Date(p.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No due date'}</span>
                  </div>
                </div>

                <!-- Status Selector Menu -->
                <div class="quick-status-selector-row" onclick={(e) => e.stopPropagation()}>
                  <label class="status-quick-label">Move:</label>
                  <select
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
    background: var(--surface-card-subtle, #F9FAFB);
    border: 1px solid var(--surface-card-border, #E5E7EB);
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
    border-color: #0078D4;
    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
  }

  .column-header {
    border-top: 3px solid transparent;
    padding-top: 8px;
    border-bottom: 1px solid var(--surface-card-border, #E5E7EB);
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
    color: var(--text-primary, #111827);
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
    color: var(--text-secondary, #6B7280);
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
    border: 1.5px dashed var(--surface-card-border, #E5E7EB);
    border-radius: 8px;
    color: var(--text-secondary, #9CA3AF);
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
    color: var(--text-tertiary, #9CA3AF);
  }

  /* ─── Kanban Card ─── */
  .kanban-card {
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    cursor: grab;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
  }

  .kanban-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: rgba(0, 120, 212, 0.4);
  }

  .kanban-card:active {
    cursor: grabbing;
  }

  .kanban-card.is-dragging {
    opacity: 0.4;
    border-style: dashed;
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
    color: #0078D4;
    text-decoration: none;
    cursor: pointer;
  }

  .job-id-mono:hover {
    text-decoration: underline;
    color: #005a9e;
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
    color: var(--text-primary, #111827);
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
    color: var(--brand-accent, #0078D4);
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
    background: var(--surface-card-subtle, #F3F4F6);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    color: var(--text-secondary, #4B5563);
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 500;
  }

  .rev-counter-pill {
    font-size: 10px;
    font-weight: 800;
    background: rgba(217, 119, 6, 0.12);
    color: #D97706;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .card-footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid var(--surface-card-border, #E5E7EB);
    font-size: 11.5px;
    margin-top: 2px;
  }

  .designer-badge {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .designer-avatar-circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .designer-name {
    font-weight: 600;
    color: var(--text-primary, #374151);
    max-width: 90px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .deadline-block {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-secondary, #6B7280);
    font-size: 11px;
    font-weight: 500;
  }

  .deadline-block.is-overdue {
    color: #EF4444;
    font-weight: 800;
  }

  /* Quick status selector */
  .quick-status-selector-row {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--surface-card-subtle, #F9FAFB);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 11px;
  }

  .status-quick-label {
    font-weight: 700;
    color: var(--text-secondary, #6B7280);
  }

  .status-select-native {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-primary, #111827);
    outline: none;
    cursor: pointer;
  }
</style>
