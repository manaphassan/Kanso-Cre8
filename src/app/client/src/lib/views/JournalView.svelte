<script lang="ts">
  import { onMount } from 'svelte';
  import { journalService, type DailyNote, type HabitHistory } from '$lib/services/journalService';
  import DailyLog from '$lib/components/journal/DailyLog.svelte';
  import WeeklyReview from '$lib/components/journal/WeeklyReview.svelte';
  import Monthly from '$lib/components/journal/Monthly.svelte';
  import Yearly from '$lib/components/journal/Yearly.svelte';

  type ViewTab = 'daily' | 'weekly' | 'monthly' | 'yearly';
  let activeTab = $state<ViewTab>('daily');

  let currentDate = $state(new Date().toISOString().slice(0, 10));
  let dailyNote = $state<DailyNote>(journalService.getDailyNote(currentDate));
  let weeklyHabitMatrix = $state<Array<{ date: string; dayName: string; habits: string[]; isToday: boolean }>>([]);
  let habitHistoryData = $state<HabitHistory | null>(null);

  async function loadData() {
    dailyNote = journalService.getDailyNote(currentDate);
    weeklyHabitMatrix = await journalService.getWeeklyHabitMatrix(currentDate);
    habitHistoryData = await journalService.getHabitHistory(30);
  }

  function handleDateChange(newDate: string) {
    currentDate = newDate;
    loadData();
  }

  onMount(() => {
    loadData();
  });
</script>

<div class="journal-view-container">
  <header class="journal-header">
    <div class="header-titles">
      <div class="header-tag">
        <span class="tag-badge">_Journal/</span>
        <span class="tag-meta">Bullet Journal · Rapid Logging · Habit Cadence</span>
      </div>
      <h1 class="view-title">Bullet Journal</h1>
      <p class="view-subtitle">Rapid daily logs, mindful studio craft habits, and reflective retrospectives.</p>
    </div>
  </header>

  <!-- Navigation Tabs -->
  <nav class="journal-tabs-bar" aria-label="Journal Navigation">
    <button
      class="tab-btn"
      class:active={activeTab === 'daily'}
      onclick={() => (activeTab = 'daily')}
    >
      <span>Daily Log</span>
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === 'weekly'}
      onclick={() => (activeTab = 'weekly')}
    >
      <span>Weekly Review</span>
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === 'monthly'}
      onclick={() => (activeTab = 'monthly')}
    >
      <span>Monthly Review</span>
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === 'yearly'}
      onclick={() => (activeTab = 'yearly')}
    >
      <span>Yearly Vision</span>
    </button>
  </nav>

  <div class="tab-body">
    {#if activeTab === 'daily'}
      <DailyLog
        {dailyNote}
        {weeklyHabitMatrix}
        {habitHistoryData}
        onDateChanged={handleDateChange}
        onRefresh={loadData}
      />
    {:else if activeTab === 'weekly'}
      <WeeklyReview />
    {:else if activeTab === 'monthly'}
      <Monthly />
    {:else if activeTab === 'yearly'}
      <Yearly />
    {/if}
  </div>
</div>

<style>
  .journal-view-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .journal-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .header-tag {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  .tag-badge {
    font-weight: 700;
    color: var(--kanso-accent);
    font-family: monospace;
  }
  .tag-meta {
    color: var(--kanso-text-muted);
  }
  .view-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .view-subtitle {
    margin: 0;
    font-size: 13px;
    color: var(--kanso-text-muted);
  }
  .journal-tabs-bar {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 8px;
  }
  .tab-btn {
    padding: 8px 16px;
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--kanso-text-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .tab-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
  }
  .tab-btn.active {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface);
    border-color: var(--kanso-border);
  }
</style>
