<script lang="ts">
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    firstTimeRightPercent: number | null;
    turnaroundDays: number | null;
    avgRevisionRounds: number | null;
  }

  let { firstTimeRightPercent, turnaroundDays, avgRevisionRounds }: Props = $props();

  const todayFocusHours = $derived(timerStore.getTodayHours());
  const weekFocusHours = $derived(timerStore.getWeekHours());
</script>

<div class="metrics-bento-grid">
  <!-- Metric 1: Hours Today -->
  <div class="metric-card">
    <div class="metric-header">
      <span class="metric-label">Hours Logged Today</span>
      <span class="metric-icon-wrap"><Icon name="clock" size={14} /></span>
    </div>
    <div class="metric-val font-mono">{todayFocusHours.toFixed(1)}h</div>
    <span class="metric-meta">Tactile billable timer focus</span>
  </div>

  <!-- Metric 2: Hours This Week -->
  <div class="metric-card">
    <div class="metric-header">
      <span class="metric-label">Hours This Week</span>
      <span class="metric-icon-wrap"><Icon name="calendar" size={14} /></span>
    </div>
    <div class="metric-val font-mono">{weekFocusHours.toFixed(1)}h</div>
    <span class="metric-meta">Across active campaign tasks</span>
  </div>

  <!-- Metric 3: Effective Rate -->
  <div class="metric-card">
    <div class="metric-header">
      <span class="metric-label">Effective Rate</span>
      <span class="metric-icon-wrap"><Icon name="tag" size={14} /></span>
    </div>
    <div class="metric-val font-mono">{settingsStore.settings.currencySymbol || 'RM'}{timerStore.hourlyRate}/hr</div>
    <span class="metric-meta">Active studio billing velocity</span>
  </div>

  <!-- Metric 4: First-Time-Right -->
  <div class="metric-card">
    <div class="metric-header">
      <span class="metric-label">First-Time-Right</span>
      <span class="metric-icon-wrap"><Icon name="check" size={14} /></span>
    </div>
    <div class="metric-val font-mono" class:text-success={firstTimeRightPercent != null && firstTimeRightPercent >= 80}>
      {firstTimeRightPercent != null ? `${firstTimeRightPercent}%` : '—'}
    </div>
    <span class="metric-meta">Zero-revision deliverables</span>
  </div>

  <!-- Metric 5: Turnaround Velocity -->
  <div class="metric-card">
    <div class="metric-header">
      <span class="metric-label">Turnaround Velocity</span>
      <span class="metric-icon-wrap"><Icon name="trend-up" size={14} /></span>
    </div>
    <div class="metric-val font-mono">{turnaroundDays != null ? `${turnaroundDays}d` : '—'}</div>
    <span class="metric-meta">Average cycle duration</span>
  </div>

  <!-- Metric 6: Revision Rounds -->
  <div class="metric-card">
    <div class="metric-header">
      <span class="metric-label">Revision Rounds</span>
      <span class="metric-icon-wrap"><Icon name="refresh" size={14} /></span>
    </div>
    <div class="metric-val font-mono">{avgRevisionRounds != null ? avgRevisionRounds.toFixed(1) : '—'}</div>
    <span class="metric-meta">Average rounds per proof</span>
  </div>
</div>

<style>
  .metrics-bento-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  @media (max-width: 600px) {
    .metrics-bento-grid {
      grid-template-columns: 1fr;
    }
  }
  .metric-card {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .metric-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-muted);
  }
  .metric-icon-wrap {
    color: var(--kanso-text-muted);
  }
  .metric-val {
    font-size: 24px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .metric-val.text-success {
    color: var(--kanso-success);
  }
  .metric-meta {
    font-size: 11px;
    color: var(--kanso-text-muted);
  }
</style>
