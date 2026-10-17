<script lang="ts">
  import { journalService, type DailyNote, type BujoEntry } from '$lib/services/journalService';
  import { notesService } from '$lib/services/notesService';
  import { appState } from '$lib/stores/appState.svelte';
  import type { NoteTask } from '$lib/types/notes';
  import TaskRolloverModal from '$lib/components/features/TaskRolloverModal.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    dailyNote: DailyNote;
    previousTaskInfo: { hasTasks: boolean; fromDate: string; count: number; tasks: BujoEntry[] };
    universalTasks: NoteTask[];
    onTaskUpdated: () => void;
  }

  let { dailyNote, previousTaskInfo, universalTasks, onTaskUpdated }: Props = $props();

  let newTaskInput = $state('');
  let taskMode = $state<'bujo' | 'universal'>('bujo');
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

  async function handleToggleUniversalTask(task: NoteTask) {
    const updated = await notesService.toggleUniversalTask(task.filepath, task.lineIndex, task.completed);
    if (updated) {
      onTaskUpdated();
      appState.addToast(`Task ${!task.completed ? 'completed' : 'uncompleted'}.`, 'success');
    }
  }
</script>

<div class="today-tasks-container">
  <div class="tasks-header-row">
    <div class="tasks-title-wrap">
      <span class="bento-badge">BULLET JOURNAL RAPID LOG</span>
      <h3 class="tasks-title">Today's Tasks &amp; Focus</h3>
    </div>
    <div class="task-mode-toggle">
      <button type="button" class="mode-btn" class:active={taskMode === 'bujo'} onclick={() => (taskMode = 'bujo')}>BuJo ({todayTasks.length})</button>
      <button type="button" class="mode-btn" class:active={taskMode === 'universal'} onclick={() => (taskMode = 'universal')}>Notes ({universalTasks.length})</button>
    </div>
  </div>

  <!-- Intentions Chips -->
  <div class="intentions-chips-row">
    <button type="button" class="intention-chip" onclick={() => handleQuickIntention('Review client proof deck')}>+ Review proof</button>
    <button type="button" class="intention-chip" onclick={() => handleQuickIntention('Send draft invoice')}>+ Send invoice</button>
    <button type="button" class="intention-chip" onclick={() => handleQuickIntention('Morning creative sprint')}>+ Sprint</button>
    <a href="#journal" class="open-journal-link">Open Full Journal →</a>
  </div>

  <!-- Rollover Banner -->
  {#if previousTaskInfo.hasTasks}
    <div class="rollover-alert-banner">
      <div class="rollover-text">
        <strong>{previousTaskInfo.count} uncompleted task(s)</strong> from {previousTaskInfo.fromDate}
      </div>
      <button type="button" class="rollover-action-btn" onclick={() => (showRolloverModal = true)}>
        Review and migrate
      </button>
    </div>
  {/if}

  {#if taskMode === 'bujo'}
    <div class="tasks-list">
      {#if todayTasks.length === 0}
        <div class="empty-tasks-hint">Zero tasks scheduled for today. Rapid log below or pull from Notes.</div>
      {:else}
        {#each todayTasks as t}
          <div class="task-row" class:completed={t.completed || t.type === 'done'}>
            <button type="button" class="task-checkbox" onclick={() => handleToggleTask(t.id)}>
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
  {:else}
    <div class="tasks-list">
      {#if universalTasks.length === 0}
        <div class="empty-tasks-hint">Zero active markdown tasks found across atelier notes.</div>
      {:else}
        {#each universalTasks as ut}
          <div class="task-row" class:completed={ut.completed}>
            <button type="button" class="task-checkbox" onclick={() => handleToggleUniversalTask(ut)}>
              {#if ut.completed}
                <Icon name="check" size={14} />
              {/if}
            </button>
            <div class="universal-task-info">
              <span class="task-text">{ut.text}</span>
              <span class="task-source-doc font-mono">{ut.noteTitle}</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

{#if showRolloverModal}
  <TaskRolloverModal
    fromDate={previousTaskInfo.fromDate}
    tasks={previousTaskInfo.tasks}
    onClose={() => (showRolloverModal = false)}
    onMigrate={async (taskIds) => {
      isMigrating = true;
      try {
        await journalService.rolloverTasksAsync(previousTaskInfo.fromDate, dailyNote.date, taskIds);
        showRolloverModal = false;
        onTaskUpdated();
        appState.addToast(`Migrated ${taskIds.length} task(s) into today.`, 'success');
      } finally {
        isMigrating = false;
      }
    }}
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
  .tasks-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .bento-badge {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-accent);
  }
  .tasks-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .task-mode-toggle {
    display: flex;
    gap: 4px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 2px;
  }
  .mode-btn {
    padding: 4px 10px;
    background: none;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    cursor: pointer;
  }
  .mode-btn.active {
    background: var(--kanso-surface);
    color: var(--kanso-text-primary);
  }
  .intentions-chips-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .intention-chip {
    padding: 4px 10px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    font-size: 12px;
    color: var(--kanso-text-muted);
    cursor: pointer;
  }
  .intention-chip:hover {
    color: var(--kanso-text-primary);
    border-color: var(--kanso-accent);
  }
  .open-journal-link {
    font-size: 12px;
    color: var(--kanso-accent);
    text-decoration: none;
    font-weight: 600;
    margin-left: auto;
  }
  .rollover-alert-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-warning);
    border-radius: 6px;
    font-size: 12px;
  }
  .rollover-action-btn {
    padding: 4px 10px;
    background: var(--kanso-warning);
    color: #000000;
    font-weight: 600;
    border: none;
    border-radius: 4px;
    cursor: pointer;
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
  .universal-task-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }
  .task-source-doc {
    font-size: 10px;
    color: var(--kanso-text-muted);
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
