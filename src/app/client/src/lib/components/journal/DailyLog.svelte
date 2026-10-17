<script lang="ts">
  import { journalService, type DailyNote, type BujoEntry, type HabitHistory } from '$lib/services/journalService';
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';
  import Habits from './Habits.svelte';

  interface Props {
    dailyNote: DailyNote;
    weeklyHabitMatrix: Array<{ date: string; dayName: string; habits: string[]; isToday: boolean }>;
    habitHistoryData: HabitHistory | null;
    onDateChanged: (newDate: string) => void;
    onRefresh: () => void;
  }

  let { dailyNote, weeklyHabitMatrix, habitHistoryData, onDateChanged, onRefresh }: Props = $props();

  let newEntryText = $state('');
  let newEntryType = $state<'task' | 'note' | 'event' | 'priority'>('task');
  let reflectionText = $state('');

  $effect(() => {
    reflectionText = dailyNote.reflection || '';
  });

  async function handleToggleEntry(id: string) {
    await journalService.toggleTask(dailyNote.date, id);
    onRefresh();
  }

  async function handleAddEntry() {
    if (!newEntryText.trim()) return;
    await journalService.appendEntry(dailyNote.date, newEntryType, newEntryText.trim());
    newEntryText = '';
    onRefresh();
  }

  async function handleToggleHabit(habitId: string) {
    await journalService.toggleHabit(dailyNote.date, habitId);
    onRefresh();
  }

  async function handleSaveReflection() {
    await journalService.saveReflection(dailyNote.date, reflectionText);
    appState.addToast('Evening creative reflection saved.', 'success');
  }

  function handlePrevDay() {
    const d = new Date(dailyNote.date);
    d.setDate(d.getDate() - 1);
    onDateChanged(d.toISOString().slice(0, 10));
  }

  function handleNextDay() {
    const d = new Date(dailyNote.date);
    d.setDate(d.getDate() + 1);
    onDateChanged(d.toISOString().slice(0, 10));
  }
</script>

<div class="daily-log-view">
  <!-- Day Navigator Bar -->
  <div class="day-nav-bar card-surface">
    <div class="day-nav-left">
      <button type="button" class="btn-icon" onclick={handlePrevDay} title="Previous Day">◀</button>
      <input type="date" class="date-picker-input font-mono" value={dailyNote.date} onchange={(e) => onDateChanged((e.target as HTMLInputElement).value)} />
      <button type="button" class="btn-icon" onclick={handleNextDay} title="Next Day">▶</button>
      <button type="button" class="btn-secondary" onclick={() => onDateChanged(new Date().toISOString().slice(0, 10))}>Today</button>
    </div>
    <div class="day-nav-meta">
      <span class="nav-bujo-stat font-mono">{(dailyNote.entries || []).length} items logged</span>
    </div>
  </div>

  <!-- Habits Bar -->
  <Habits
    {dailyNote}
    {weeklyHabitMatrix}
    {habitHistoryData}
    onToggleHabit={handleToggleHabit}
    onSelectDate={onDateChanged}
  />

  <!-- Main Log Card -->
  <div class="card-surface log-card">
    <div class="log-header">
      <h3 class="log-title">Rapid Log · BuJo Specification</h3>
      <span class="log-sub">• [ ] Task &nbsp; [x] Done &nbsp; - Note &nbsp; o Event &nbsp; * Priority</span>
    </div>

    <div class="entries-list">
      {#if (dailyNote.entries || []).length === 0}
        <div class="empty-log-state">Zero rapid log entries for this day. Record tasks, notes, or milestones below.</div>
      {:else}
        {#each dailyNote.entries as item}
          <div class="entry-row type-{item.type}" class:completed={item.completed}>
            {#if item.type === 'task' || item.type === 'priority' || item.type === 'done'}
              <button type="button" class="entry-checkbox" onclick={() => handleToggleEntry(item.id)}>
                {#if item.completed || item.type === 'done'}
                  <Icon name="check" size={12} />
                {/if}
              </button>
            {:else if item.type === 'note'}
              <span class="entry-bullet note-bullet">-</span>
            {:else if item.type === 'event'}
              <span class="entry-bullet event-bullet">o</span>
            {/if}

            <span class="entry-content">{item.content}</span>
            {#if item.type === 'priority'}
              <span class="priority-badge">* Priority</span>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <!-- Rapid log input -->
    <form class="entry-input-form" onsubmit={(e) => { e.preventDefault(); handleAddEntry(); }}>
      <select class="type-select" bind:value={newEntryType}>
        <option value="task">• Task</option>
        <option value="priority">* Priority Task</option>
        <option value="note">- Note</option>
        <option value="event">o Event</option>
      </select>
      <input type="text" class="entry-text-input" bind:value={newEntryText} placeholder="Rapid log item (e.g. Calligraphy brand deck review)..." />
      <button type="submit" class="btn-primary" disabled={!newEntryText.trim()}>Append</button>
    </form>
  </div>

  <!-- Creative Reflection -->
  <div class="card-surface reflection-card">
    <div class="reflection-header">
      <h3 class="log-title">Evening Creative Reflection</h3>
      <button type="button" class="btn-primary-mini" onclick={handleSaveReflection}>Save reflection</button>
    </div>
    <textarea class="reflection-textarea" rows="3" bind:value={reflectionText} placeholder="Mindful notes on today's craft, client interactions, or energy levels..."></textarea>
  </div>
</div>

<style>
  .daily-log-view { display: flex; flex-direction: column; gap: 16px; }
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 20px; }
  .day-nav-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; }
  .day-nav-left { display: flex; align-items: center; gap: 8px; }
  .btn-icon { width: 30px; height: 30px; border-radius: 4px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; }
  .date-picker-input { height: 30px; padding: 0 10px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 4px; color: var(--kanso-text-primary); font-size: 13px; }
  .btn-secondary { height: 30px; padding: 0 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 4px; color: var(--kanso-text-primary); font-size: 12px; font-weight: 600; cursor: pointer; }
  .day-nav-meta { font-size: 12px; color: var(--kanso-text-muted); }
  .log-header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
  .log-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--kanso-text-primary); }
  .log-sub { font-size: 11px; color: var(--kanso-text-muted); font-family: monospace; }
  .entries-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .empty-log-state { padding: 32px; text-align: center; font-size: 13px; color: var(--kanso-text-muted); background: var(--kanso-canvas); border: 1px dashed var(--kanso-border); border-radius: 6px; }
  .entry-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; font-size: 13px; }
  .entry-row.completed .entry-content { text-decoration: line-through; color: var(--kanso-text-muted); }
  .entry-checkbox { width: 18px; height: 18px; border-radius: 4px; border: 1px solid var(--kanso-border); background: var(--kanso-surface); color: var(--kanso-accent); display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .entry-bullet { font-weight: 800; font-family: monospace; width: 18px; text-align: center; color: var(--kanso-accent); }
  .entry-content { flex: 1; color: var(--kanso-text-primary); }
  .priority-badge { font-size: 11px; font-weight: 700; color: var(--kanso-danger); }
  .entry-input-form { display: flex; gap: 8px; }
  .type-select { height: 38px; padding: 0 10px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; color: var(--kanso-text-primary); font-size: 12px; font-weight: 600; }
  .entry-text-input { flex: 1; height: 38px; padding: 0 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; color: var(--kanso-text-primary); font-size: 13px; }
  .entry-text-input:focus { outline: none; border-color: var(--kanso-accent); }
  .btn-primary { padding: 0 18px; height: 38px; background: var(--kanso-accent); color: #FFFFFF; font-size: 12px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; }
  .reflection-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .reflection-textarea { width: 100%; padding: 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; color: var(--kanso-text-primary); font-size: 13px; box-sizing: border-box; }
  .btn-primary-mini { padding: 4px 12px; background: var(--kanso-accent); color: #FFFFFF; font-size: 11px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; }
</style>
