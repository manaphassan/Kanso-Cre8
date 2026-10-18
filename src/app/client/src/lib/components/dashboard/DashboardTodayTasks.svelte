<script lang="ts">
  import { journalService, type DailyNote, type BujoEntry } from '$lib/services/journalService';
  import { appState } from '$lib/stores/appState.svelte';
  import TaskRolloverModal from '$lib/components/features/TaskRolloverModal.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    dailyNote: DailyNote;
    previousTaskInfo: { hasTasks: boolean; fromDate: string; count: number; tasks: BujoEntry[] };
    onTaskUpdated: () => void;
  }

  let { dailyNote, previousTaskInfo, onTaskUpdated }: Props = $props();

  let newTaskInput = $state('');
  let showRolloverModal = $state(false);
  let isMigrating = $state(false);

  const todayTasks = $derived(
    dailyNote.entries.filter(e => e.type === 'task' || e.type === 'priority' || e.type === 'done')
  );

  const completedTaskCount = $derived(
    todayTasks.filter(t => t.completed || t.type === 'done').length
  );

  async function handleToggleTask(entryId: string) {
    const updated = await journalService.toggleTask(dailyNote.date, entryId);
    if (updated) {
      onTaskUpdated();
      appState.addToast('Task status updated.', 'success');
    }
  }

  async function handleAddTask() {
    if (!newTaskInput.trim()) return;
    const updated = await journalService.appendEntry(dailyNote.date, 'task', newTaskInput.trim());
    if (updated) {
      newTaskInput = '';
      onTaskUpdated();
      appState.addToast('Task appended to Today’s BuJo rapid log.', 'success');
    }
  }

  async function handleQuickIntention(text: string) {
    const updated = await journalService.appendEntry(dailyNote.date, 'task', text);
    if (updated) {
      onTaskUpdated();
      appState.addToast(`Appended "${text}" to daily log.`, 'success');
    }
  }

  async function handleMigrate(taskIds: string[]) {
    isMigrating = true;
    try {
      await journalService.rolloverTasksAsync(previousTaskInfo.fromDate, dailyNote.date, taskIds);
      showRolloverModal = false;
      onTaskUpdated();
      appState.addToast(`Migrated ${taskIds.length} task(s) into today.`, 'success');
    } finally {
      isMigrating = false;
    }
  }
</script>

<div class="today-tasks-container">
  <div class="tasks-header-row">
    <h3 class="tasks-title">Today's Tasks &amp; Focus</h3>
    <a href="#journal" class="open-journal-link">Open Journal →</a>
  </div>

  <!-- Intentions Chips -->
  <div class="intentions-chips-row">
    <button type="button" class="intention-chip" onclick={() => handleQuickIntention('Review client proof deck')}>+ Review proof</button>
    <button type="button" class="intention-chip" onclick={() => handleQuickIntention('Send draft invoice')}>+ Send invoice</button>
    <button type="button" class="intention-chip" onclick={() => handleQuickIntention('Morning creative sprint')}>+ Sprint</button>
  </div>

  <!-- Rollover Banner (compact single-line strip) -->
  {#if previousTaskInfo.hasTasks}
    <div class="rollover-strip">
      <span class="rollover-text"><strong>{previousTaskInfo.count} uncompleted task(s)</strong> from {previousTaskInfo.fromDate}</span>
      <button type="button" class="rollover-action-btn" onclick={() => (showRolloverModal = true)}>
        Review and migrate →
      </button>
    </div>
  {/if}

  <div class="tasks-list">
    {#if todayTasks.length === 0}
      <div class="empty-tasks-hint">No tasks for today. Rapid log below or in the journal.</div>
    {:else}
      {#each todayTasks as t}
        <div class="task-row" class:completed={t.completed || t.type === 'done'}>
          <button type="button" class="task-checkbox" onclick={() => handleToggleTask(t.id)} aria-label="Toggle task">
            {#if t.completed || t.type === 'done'}
              <Icon name="check" size={14} />
            {/if}
          </button>
          <span class="task-text">{t.content}</span>
          {#if t.type === 'priority'}
            <span class="priority-tag">* Priority</span>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Quick input -->
  <form class="task-input-row" onsubmit={(e) => { e.preventDefault(); handleAddTask(); }}>
    <input type="text" class="task-input" bind:value={newTaskInput} placeholder="• Rapid log task for today..." />
    <button type="submit" class="btn-primary-mini" disabled={!newTaskInput.trim()}>Add</button>
  </form>
</div>

{#if showRolloverModal}
  <TaskRolloverModal
    fromDate={previousTaskInfo.fromDate}
    tasks={previousTaskInfo.tasks}
    onClose={() => (showRolloverModal = false)}
    onMigrate={handleMigrate}
  />
{/if}

<style>
  .today-tasks-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .tasks-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .tasks-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .open-journal-link {
    font-size: 12px;
    color: var(--kanso-accent);
    text-decoration: none;
    font-weight: 600;
  }
  .rollover-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    font-size: 12px;
  }
  .rollover-text {
    color: var(--kanso-text-primary);
  }
  .rollover-action-btn {
    padding: 3px 8px;
    background: transparent;
    color: var(--kanso-accent);
    font-weight: 600;
    font-size: 12px;
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .rollover-action-btn:hover {
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-accent);
  }
  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 280px;
    overflow-y: auto;
  }
  .empty-tasks-hint {
    padding: 24px;
    text-align: center;
    font-size: 13px;
    color: var(--kanso-text-muted);
    background: var(--kanso-canvas);
    border: 1px dashed var(--kanso-border);
    border-radius: 6px;
  }
  .task-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
  }
  .task-row.completed .task-text {
    text-decoration: line-through;
    color: var(--kanso-text-muted);
  }
  .task-checkbox {
    width: 18px;
    height: 18px;
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    background: var(--kanso-surface);
    color: var(--kanso-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
  }
  .task-text {
    font-size: 13px;
    color: var(--kanso-text-primary);
    flex: 1;
  }
  .priority-tag {
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-danger);
  }
  .task-input-row {
    display: flex;
    gap: 8px;
  }
  .task-input {
    flex: 1;
    height: 36px;
    padding: 0 12px;
    border-radius: 6px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
    font-size: 13px;
  }
  .task-input:focus {
    outline: none;
    border-color: var(--kanso-accent);
  }
  .btn-primary-mini {
    height: 36px;
    padding: 0 16px;
    border-radius: 6px;
    background: var(--kanso-accent);
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 600;
    border: none;
    cursor: pointer;
  }
  .btn-primary-mini:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
