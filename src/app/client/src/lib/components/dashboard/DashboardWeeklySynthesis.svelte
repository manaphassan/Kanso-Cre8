<script lang="ts">
  import type { WeeklyTelemetry } from '$lib/services/journalService';
  import { Icon } from '$lib/components/ui';

  interface Props {
    weeklyTelemetry: WeeklyTelemetry | null;
  }

  let { weeklyTelemetry }: Props = $props();
</script>

{#if weeklyTelemetry}
  <section class="bento-section weekly-synthesis-section">
    <div class="bento-header">
      <div class="bento-title-row">
        <span class="bento-badge">WEEKLY RETROSPECTIVE DECK</span>
        <h2 class="bento-title">7-Day Synthesis &amp; Momentum</h2>
      </div>
    </div>

    <div class="synthesis-grid">
      <!-- Card 1: Task Completion -->
      <div class="synthesis-card">
        <div class="synthesis-card-title-row">
          <span class="synthesis-label">Task Velocity &amp; Momentum</span>
          <span class="synthesis-rate font-mono">{weeklyTelemetry.taskCompletionRate}% Done</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: {weeklyTelemetry.taskCompletionRate}%;"></div>
        </div>
        <div class="synthesis-meta-row">
          <span>{weeklyTelemetry.completedTasks} completed · {weeklyTelemetry.totalTasks} logged</span>
        </div>
      </div>

      <!-- Card 2: Billable Velocity -->
      <div class="synthesis-card">
        <div class="synthesis-card-title-row">
          <span class="synthesis-label">Atelier Weekly Focus</span>
          <span class="synthesis-rate font-mono">{weeklyTelemetry.totalHours.toFixed(1)}h</span>
        </div>
        <div class="synthesis-meta-row">
          <span>Daily Average: {weeklyTelemetry.avgDailyHours.toFixed(1)}h/day</span>
        </div>
      </div>

      <!-- Card 3: Active Days -->
      <div class="synthesis-card">
        <div class="synthesis-card-title-row">
          <span class="synthesis-label">BuJo Logging Cadence</span>
          <span class="synthesis-rate font-mono">{weeklyTelemetry.activeDaysCount} / 7 Days</span>
        </div>
        <div class="cadence-dots-row">
          {#each weeklyTelemetry.dailyRollup as day}
            <div class="cadence-dot-wrap" title="{day.date}: {day.hours}h, {day.tasksDone}/{day.totalTasks} tasks">
              <div class="cadence-dot" class:active={day.hasNote}></div>
              <span class="cadence-label">{day.dayOfWeek}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}

<style>
  .bento-section {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
  }
  .bento-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 20px;
  }
  .bento-title-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bento-badge {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-accent);
  }
  .bento-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .synthesis-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  @media (max-width: 900px) {
    .synthesis-grid {
      grid-template-columns: 1fr;
    }
  }
  .synthesis-card {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .synthesis-card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .synthesis-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-muted);
  }
  .synthesis-rate {
    font-size: 14px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .progress-bar-track {
    height: 6px;
    background: var(--kanso-surface);
    border-radius: 3px;
    overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%;
    background: var(--kanso-accent);
    border-radius: 3px;
  }
  .synthesis-meta-row {
    font-size: 12px;
    color: var(--kanso-text-muted);
  }
  .cadence-dots-row {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
  }
  .cadence-dot-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .cadence-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
  }
  .cadence-dot.active {
    background: var(--kanso-success);
    border-color: var(--kanso-success);
  }
  .cadence-label {
    font-size: 10px;
    color: var(--kanso-text-muted);
  }
</style>
