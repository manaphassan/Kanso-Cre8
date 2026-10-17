<script lang="ts">
  import { onMount } from 'svelte';
  import { journalService } from '$lib/services/journalService';
  import { appState } from '$lib/stores/appState.svelte';

  let currentMonth = $state(new Date().toISOString().slice(0, 7));
  let monthlyData = $state<any>(null);

  async function loadMonth() {
    monthlyData = await journalService.getMonthlyReview(currentMonth);
  }

  onMount(() => {
    loadMonth();
  });
</script>

<div class="monthly-view card-surface">
  <div class="monthly-header">
    <div class="monthly-titles">
      <span class="monthly-badge">MONTHLY RETROSPECTIVE</span>
      <h3 class="monthly-title">Monthly Deliverables &amp; Creative Review</h3>
    </div>
    <input type="month" class="month-picker font-mono" bind:value={currentMonth} onchange={loadMonth} />
  </div>

  <div class="monthly-grid">
    <div class="metric-card">
      <span class="metric-label">Completed Deliverables</span>
      <span class="metric-val font-mono">{monthlyData?.completedDeliverables || 0}</span>
      <span class="metric-meta">Across approved campaigns</span>
    </div>
    <div class="metric-card">
      <span class="metric-label">Total Focus Hours</span>
      <span class="metric-val font-mono">{(monthlyData?.totalHours || 0).toFixed(1)}h</span>
      <span class="metric-meta">Billable timer telemetry</span>
    </div>
    <div class="metric-card">
      <span class="metric-label">Completed BuJo Tasks</span>
      <span class="metric-val font-mono">{monthlyData?.completedTasks || 0}</span>
      <span class="metric-meta">From rapid logging logs</span>
    </div>
  </div>

  <div class="monthly-reflection-box">
    <h4 class="box-title">Creative Retrospective &amp; Notes</h4>
    <p class="box-content">{monthlyData?.reflection || 'No monthly retrospective logged yet. Synthesize milestones, client relationships, and design breakthroughs.'}</p>
  </div>
</div>

<style>
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; }
  .monthly-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .monthly-titles { display: flex; flex-direction: column; gap: 4px; }
  .monthly-badge { font-size: 11px; font-weight: 700; color: var(--kanso-accent); }
  .monthly-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--kanso-text-primary); }
  .month-picker { height: 32px; padding: 0 10px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; color: var(--kanso-text-primary); font-size: 13px; }
  .monthly-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  @media (max-width: 768px) { .monthly-grid { grid-template-columns: 1fr; } }
  .metric-card { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
  .metric-label { font-size: 12px; font-weight: 600; color: var(--kanso-text-muted); }
  .metric-val { font-size: 24px; font-weight: 700; color: var(--kanso-text-primary); }
  .metric-meta { font-size: 11px; color: var(--kanso-text-muted); }
  .monthly-reflection-box { padding: 16px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; }
  .box-title { margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: var(--kanso-text-primary); }
  .box-content { margin: 0; font-size: 13px; color: var(--kanso-text-muted); line-height: 1.5; }
</style>
