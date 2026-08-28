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

  type SortKey = 'jobId' | 'title' | 'brand' | 'designer' | 'priority' | 'status' | 'deadline' | 'revision';
  let sortKey = $state<SortKey>('jobId');
  let sortAsc = $state<boolean>(true);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = true;
    }
  }

  const sortedProjects = $derived.by(() => {
    return [...projects].sort((a, b) => {
      let valA: any = a[sortKey] || '';
      let valB: any = b[sortKey] || '';

      if (sortKey === 'revision') {
        valA = Number(a.revision || 0);
        valB = Number(b.revision || 0);
      } else if (sortKey === 'priority') {
        const pOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        valA = pOrder[(a.priority || '').toLowerCase()] || 0;
        valB = pOrder[(b.priority || '').toLowerCase()] || 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  });

  function getPriorityBadgeClass(priority?: string): string {
    switch ((priority || '').toLowerCase()) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      default: return 'priority-low';
    }
  }
</script>

<div class="table-view-container">
  <div class="table-responsive-wrapper">
    <table class="fluent-data-table">
      <thead>
        <tr>
          <th class="th-sortable" onclick={() => toggleSort('jobId')}>
            <span>Job ID</span>
            {#if sortKey === 'jobId'}
              <span class="sort-arrow">{sortAsc ? '▲' : '▼'}</span>
            {/if}
          </th>
          <th class="th-sortable" onclick={() => toggleSort('title')}>
            <span>Project Deliverable & Title</span>
            {#if sortKey === 'title'}
              <span class="sort-arrow">{sortAsc ? '▲' : '▼'}</span>
            {/if}
          </th>
          <th class="th-sortable" onclick={() => toggleSort('brand')}>
            <span>Brand</span>
            {#if sortKey === 'brand'}
              <span class="sort-arrow">{sortAsc ? '▲' : '▼'}</span>
            {/if}
          </th>
          <th class="th-sortable" onclick={() => toggleSort('designer')}>
            <span>Designer</span>
            {#if sortKey === 'designer'}
              <span class="sort-arrow">{sortAsc ? '▲' : '▼'}</span>
            {/if}
          </th>
          <th class="th-sortable" onclick={() => toggleSort('priority')}>
            <span>Priority</span>
            {#if sortKey === 'priority'}
              <span class="sort-arrow">{sortAsc ? '▲' : '▼'}</span>
            {/if}
          </th>
          <th class="th-sortable" onclick={() => toggleSort('status')}>
            <span>Pipeline Status</span>
            {#if sortKey === 'status'}
              <span class="sort-arrow">{sortAsc ? '▲' : '▼'}</span>
            {/if}
          </th>
          <th class="th-sortable" onclick={() => toggleSort('revision')}>
            <span>Revisions</span>
            {#if sortKey === 'revision'}
              <span class="sort-arrow">{sortAsc ? '▲' : '▼'}</span>
            {/if}
          </th>
          <th class="th-sortable" onclick={() => toggleSort('deadline')}>
            <span>Deadline / SLA</span>
            {#if sortKey === 'deadline'}
              <span class="sort-arrow">{sortAsc ? '▲' : '▼'}</span>
            {/if}
          </th>
          <th style="text-align: right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if sortedProjects.length === 0}
          <tr>
            <td colspan="9" class="td-empty">
              No projects found matching current filter criteria.
            </td>
          </tr>
        {:else}
          {#each sortedProjects as p (p.id)}
            <tr
              class="table-row-item"
              onclick={() => appState.navigate('project-detail', { id: p.id })}
            >
              <!-- Job ID -->
              <td class="td-job-id">
                <span class="job-mono">{p.jobId || p.id}</span>
              </td>

              <!-- Title & Preset -->
              <td class="td-title-cell">
                <div class="title-main">{p.title}</div>
                <div class="title-sub-preset">
                  {#if p.presetType}
                    <span class="preset-pill">{p.presetType}</span>
                  {/if}
                  <span class="folder-name-sub">{p.folderName || p.id}</span>
                </div>
              </td>

              <!-- Brand -->
              <td>
                <FluentBadge type="brand" value={p.brand || 'SS'} />
              </td>

              <!-- Designer -->
              <td>
                <div class="designer-cell-wrap">
                  <div class="avatar-tiny" style="background: var(--brand-accent, #0078D4);">
                    {(p.designer || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span class="designer-text">{p.designer || 'Unassigned'}</span>
                </div>
              </td>

              <!-- Priority -->
              <td>
                <span class="priority-pill {getPriorityBadgeClass(p.priority)}">
                  {p.priority || 'Normal'}
                </span>
              </td>

              <!-- Status -->
              <td onclick={(e) => e.stopPropagation()}>
                <select
                  class="status-table-select status-{p.status}"
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
              </td>

              <!-- Revisions -->
              <td style="text-align: center;">
                {#if p.revision && p.revision > 0}
                  <span class="revision-table-badge">Rev {p.revision}</span>
                {:else}
                  <span class="no-rev-label">0</span>
                {/if}
              </td>

              <!-- Deadline -->
              <td>
                {#if p.deadline}
                  <div class="deadline-table-wrap" class:is-overdue={p.isOverdue}>
                    <span>{new Date(p.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {#if p.isOverdue}
                      <span class="overdue-tag">OVERDUE</span>
                    {/if}
                  </div>
                {:else}
                  <span class="text-muted">No deadline</span>
                {/if}
              </td>

              <!-- Actions -->
              <td style="text-align: right;" onclick={(e) => e.stopPropagation()}>
                <div class="row-actions-group">
                  <button
                    type="button"
                    class="btn-action-open"
                    onclick={() => appState.navigate('project-detail', { id: p.id })}
                    title="Open Project Workspace"
                  >
                    Open ↗
                  </button>

                  {#if isAdminUser && onDelete}
                    <button
                      type="button"
                      class="btn-action-delete"
                      title="Delete Project"
                      onclick={() => onDelete(p)}
                    >
                      🗑
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

<style>
  .table-view-container {
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 220px);
    box-sizing: border-box;
  }

  .table-responsive-wrapper {
    overflow-x: auto;
    overflow-y: auto;
    width: 100%;
    flex: 1;
  }

  .fluent-data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    text-align: left;
  }

  .fluent-data-table th {
    background: var(--surface-card-subtle, #F9FAFB);
    color: var(--text-secondary, #6B7280);
    font-weight: 700;
    font-size: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--surface-card-border, #E5E7EB);
    user-select: none;
    white-space: nowrap;
  }

  .th-sortable {
    cursor: pointer;
    transition: color 0.15s;
  }

  .th-sortable:hover {
    color: var(--brand-accent, #0078D4);
  }

  .sort-arrow {
    font-size: 10px;
    margin-left: 4px;
    color: #0078D4;
  }

  .table-row-item {
    border-bottom: 1px solid var(--surface-card-border, #E5E7EB);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .table-row-item:hover {
    background: rgba(0, 120, 212, 0.04);
  }

  .fluent-data-table td {
    padding: 12px 14px;
    vertical-align: middle;
    color: var(--text-primary, #111827);
  }

  .td-job-id {
    font-family: monospace;
    font-weight: 800;
    color: #0078D4;
    font-size: 12.5px;
    white-space: nowrap;
  }

  .td-title-cell {
    max-width: 300px;
  }

  .title-main {
    font-weight: 700;
    color: var(--text-primary, #111827);
    line-height: 1.35;
  }

  .title-sub-preset {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
  }

  .preset-pill {
    font-size: 10px;
    font-weight: 600;
    background: var(--surface-card-subtle, #F3F4F6);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    padding: 1px 5px;
    border-radius: 4px;
    color: var(--text-secondary, #6B7280);
  }

  .folder-name-sub {
    font-size: 10.5px;
    color: var(--text-tertiary, #9CA3AF);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  .designer-cell-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .avatar-tiny {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .designer-text {
    font-weight: 600;
  }

  /* Priority pills */
  .priority-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 9999px;
    text-transform: capitalize;
    display: inline-block;
  }

  .priority-urgent {
    background: rgba(239, 68, 68, 0.12);
    color: #EF4444;
  }

  .priority-high {
    background: rgba(245, 158, 11, 0.12);
    color: #F59E0B;
  }

  .priority-medium {
    background: rgba(2, 132, 199, 0.12);
    color: #0284C7;
  }

  .priority-low {
    background: rgba(107, 114, 128, 0.12);
    color: #6B7280;
  }

  /* Status select inside table */
  .status-table-select {
    font-size: 11.5px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--surface-card-border, #E5E7EB);
    background: var(--surface-card, #FFFFFF);
    cursor: pointer;
    outline: none;
  }

  .status-table-select.status-done,
  .status-table-select.status-approved {
    color: #107C41;
    border-color: rgba(16, 124, 65, 0.3);
  }

  .status-table-select.status-review {
    color: #8764B8;
    border-color: rgba(135, 100, 184, 0.3);
  }

  .status-table-select.status-revision {
    color: #D97706;
    border-color: rgba(217, 119, 6, 0.3);
  }

  .status-table-select.status-in-progress {
    color: #0284C7;
    border-color: rgba(2, 132, 199, 0.3);
  }

  .revision-table-badge {
    font-size: 11px;
    font-weight: 800;
    color: #D97706;
    background: rgba(217, 119, 6, 0.12);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .no-rev-label {
    color: var(--text-tertiary, #9CA3AF);
    font-size: 12px;
  }

  .deadline-table-wrap {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
    white-space: nowrap;
  }

  .deadline-table-wrap.is-overdue {
    color: #EF4444;
    font-weight: 700;
  }

  .overdue-tag {
    font-size: 9.5px;
    font-weight: 800;
    color: #EF4444;
    background: rgba(239, 68, 68, 0.1);
    padding: 1px 4px;
    border-radius: 3px;
    display: inline-block;
    width: fit-content;
  }

  .text-muted {
    color: var(--text-tertiary, #9CA3AF);
    font-size: 12px;
  }

  .row-actions-group {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn-action-open {
    background: var(--surface-card-subtle, #F3F4F6);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    color: var(--text-primary, #111827);
    font-size: 11.5px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-action-open:hover {
    background: #0078D4;
    color: #FFFFFF;
    border-color: #0078D4;
  }

  .btn-action-delete {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 13px;
    opacity: 0.5;
    padding: 4px 6px;
    border-radius: 4px;
    transition: all 0.15s ease;
  }

  .btn-action-delete:hover {
    opacity: 1;
    background: rgba(239, 68, 68, 0.12);
  }

  .td-empty {
    text-align: center;
    padding: 48px;
    color: var(--text-secondary, #6B7280);
    font-size: 14px;
  }
</style>
