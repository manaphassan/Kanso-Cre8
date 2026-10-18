<script lang="ts">
  import { journalService, type DailyNote, type HabitHistory } from '$lib/services/journalService';
  import { Icon } from '$lib/components/ui';

  interface Props {
    dailyNote: DailyNote;
    weeklyHabitMatrix: Array<{ date: string; dayName: string; habits: string[]; isToday: boolean }>;
    habitHistoryData: HabitHistory | null;
    onToggleHabit: (habitId: string) => Promise<void>;
    onSelectDate: (date: string) => void;
  }

  let { dailyNote, weeklyHabitMatrix, habitHistoryData, onToggleHabit, onSelectDate }: Props = $props();

  let habitViewMode = $state<'7day' | '30day'>('7day');

  const CANONICAL_HABITS = [
    { id: 'focus_deep_work', name: 'Deep Work Sprint', description: '2+ hours uninterrupted design focus', icon: 'clock' },
    { id: 'visual_research', name: 'Visual Research', description: 'Curate 3+ references or typography studies', icon: 'edit' },
    { id: 'client_touchpoint', name: 'Client Touchpoint', description: 'Async status update or proof delivery', icon: 'check' },
    { id: 'mindful_walk', name: 'Walk / Rest', description: 'Away from screens for physical recovery', icon: 'play' }
  ];
</script>

<div class="habits-bar-card">
  <div class="habits-left">
    <span class="habits-section-label">Habits</span>
    <div class="habits-pill-row">
      {#each CANONICAL_HABITS as habit}
        {@const isActive = (dailyNote.habits || []).includes(habit.id)}
        <button
          type="button"
          class="habit-toggle-pill"
          class:active={isActive}
          onclick={() => onToggleHabit(habit.id)}
          title="{habit.description} (1-click toggle)"
        >
          <span class="habit-glyph"><Icon name={habit.icon as any} size={14} /></span>
          <span class="habit-name">{habit.name}</span>
          {#if isActive}
            <span class="habit-check-mark"><Icon name="check" size={12} /></span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <div class="habit-cadence-matrix">
    <div class="matrix-header-row">
      <span class="matrix-title">Cadence Matrix</span>
      <div class="matrix-toggle-group">
        <button
          type="button"
          class="matrix-toggle-btn"
          class:active={habitViewMode === '7day'}
          onclick={() => (habitViewMode = '7day')}
        >
          7D
        </button>
        <button
          type="button"
          class="matrix-toggle-btn"
          class:active={habitViewMode === '30day'}
          onclick={() => (habitViewMode = '30day')}
        >
          30D
        </button>
      </div>
      {#if habitHistoryData && habitHistoryData.stats.currentStreak > 0}
        <span class="streak-pill" title="Consecutive days with at least 1 habit completed">
          <Icon name="trend-up" size={12} /> {habitHistoryData.stats.currentStreak}d Streak
        </span>
      {/if}
    </div>

    {#if habitViewMode === '7day'}
      {#if weeklyHabitMatrix.length > 0}
        <div class="matrix-dots-row">
          {#each weeklyHabitMatrix as day}
            {@const habitCount = (day.habits || []).length}
            <button
              type="button"
              class="matrix-day-btn"
              class:is-today={day.isToday}
              onclick={() => onSelectDate(day.date)}
              title="{day.dayName} ({day.date}): {habitCount}/4 habits completed"
            >
              <div class="matrix-dot" style="opacity: {habitCount === 0 ? 0.25 : 0.35 + habitCount * 0.16}; background: {habitCount >= 3 ? 'var(--kanso-success)' : habitCount > 0 ? 'var(--kanso-accent)' : 'var(--kanso-text-muted)'}"></div>
              <span class="matrix-day-label">{day.dayName}</span>
            </button>
          {/each}
        </div>
      {/if}
    {:else if habitHistoryData}
      <div class="matrix-heatmap-grid">
        {#each habitHistoryData.history as day}
          {@const habitCount = day.count}
          <button
            type="button"
            class="heatmap-cell"
            onclick={() => onSelectDate(day.date)}
            title="{day.date} ({day.dayName}): {habitCount}/4 habits completed"
            style="opacity: {habitCount === 0 ? 0.2 : 0.35 + habitCount * 0.16}; background: {habitCount >= 3 ? 'var(--kanso-success)' : habitCount > 0 ? 'var(--kanso-accent)' : 'var(--kanso-text-muted)'}"
          ></button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .habits-bar-card {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    margin-bottom: 20px;
  }
  @media (max-width: 900px) {
    .habits-bar-card {
      flex-direction: column;
      align-items: flex-start;
    }
  }
  .habits-left {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .habits-section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-accent);
  }
  .habits-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .habit-toggle-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 20px;
    color: var(--kanso-text-muted);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .habit-toggle-pill:hover {
    border-color: var(--kanso-accent);
    color: var(--kanso-text-primary);
  }
  .habit-toggle-pill.active {
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-accent);
    color: var(--kanso-text-primary);
  }
  .habit-glyph {
    color: var(--kanso-accent);
    display: flex;
  }
  .habit-check-mark {
    color: var(--kanso-success);
    display: flex;
  }
  .habit-cadence-matrix {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .matrix-header-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .matrix-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-text-muted);
  }
  .matrix-toggle-group {
    display: flex;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    padding: 2px;
  }
  .matrix-toggle-btn {
    padding: 2px 6px;
    background: none;
    border: none;
    font-size: 10px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    cursor: pointer;
  }
  .matrix-toggle-btn.active {
    background: var(--kanso-surface);
    color: var(--kanso-text-primary);
    border-radius: 2px;
  }
  .streak-pill {
    font-size: 10px;
    font-weight: 700;
    color: var(--kanso-warning);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .matrix-dots-row {
    display: flex;
    gap: 6px;
  }
  .matrix-day-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }
  .matrix-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
  }
  .matrix-day-label {
    font-size: 9px;
    color: var(--kanso-text-muted);
  }
  .matrix-day-btn.is-today .matrix-day-label {
    font-weight: 700;
    color: var(--kanso-accent);
  }
  .matrix-heatmap-grid {
    display: grid;
    grid-template-columns: repeat(15, 10px);
    gap: 3px;
  }
  .heatmap-cell {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    border: none;
    padding: 0;
    cursor: pointer;
  }
</style>
