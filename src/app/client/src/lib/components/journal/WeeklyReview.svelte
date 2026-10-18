<script lang="ts">
  import { onMount } from 'svelte';
  import { journalService, type WeeklyReview, type WeeklyTelemetry } from '$lib/services/journalService';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';

  let currentWeek = $state(journalService.getISOWeek());
  let reviewData = $state<WeeklyReview | null>(null);
  let telemetry = $state<WeeklyTelemetry | null>(null);
  let isSaving = $state(false);
  let newDeliverableInput = $state('');

  async function loadWeek() {
    reviewData = journalService.getWeeklyReview(currentWeek);
    const diskReview = await journalService.fetchDiskWeeklyReview(currentWeek);
    if (diskReview) {
      reviewData = diskReview;
    }
    telemetry = await journalService.getWeeklyTelemetry();
  }

  function changeWeek(delta: number) {
    const parts = currentWeek.split('-W');
    let year = parseInt(parts[0], 10);
    let week = parseInt(parts[1], 10) + delta;
    if (week < 1) {
      year--;
      week = 52;
    } else if (week > 52) {
      year++;
      week = 1;
    }
    currentWeek = `${year}-W${String(week).padStart(2, '0')}`;
    loadWeek();
  }

  function addDeliverable() {
    if (!newDeliverableInput.trim() || !reviewData) return;
    reviewData.shippedDeliverables = [...reviewData.shippedDeliverables, newDeliverableInput.trim()];
    newDeliverableInput = '';
    autoSave();
  }

  function removeDeliverable(idx: number) {
    if (!reviewData) return;
    reviewData.shippedDeliverables = reviewData.shippedDeliverables.filter((_, i) => i !== idx);
    autoSave();
  }

  function updateTop3(index: number, val: string) {
    if (!reviewData) return;
    const top3 = [...(reviewData.nextWeekTop3 || ['', '', ''])];
    top3[index] = val;
    reviewData.nextWeekTop3 = top3;
    autoSave();
  }

  function autoSave() {
    if (!reviewData) return;
    journalService.saveWeeklyReview(reviewData);
  }

  async function handleManualSave() {
    if (!reviewData) return;
    isSaving = true;
    try {
      journalService.saveWeeklyReview(reviewData);
      appState.addToast(`Weekly review for ${currentWeek} saved to vault`, 'success');
    } catch (e) {
      appState.addToast('Failed saving weekly review', 'error');
    } finally {
      isSaving = false;
    }
  }

  function copyMarkdown() {
    if (!reviewData) return;
    const symbol = settingsStore.settings.currencySymbol || 'RM';
    const lines = [
      `# Weekly Review: ${reviewData.week}`,
      '',
      `## Telemetry & Pacing`,
      `- Focus Hours: ${reviewData.hoursLogged || telemetry?.billableHours || 0}h`,
      `- Unbilled Accrued: ${timerStore.unbilledFormatted} (+${symbol} ${timerStore.unbilledEarnings.toFixed(2)})`,
      `- Task Completion: ${telemetry?.completionRate || 100}% (${telemetry?.tasksCompleted || 0} / ${telemetry?.tasksTotal || 0})`,
      '',
      `## Shipped Deliverables`,
      ...(reviewData.shippedDeliverables || []).map(d => `- [x] ${d}`),
      '',
      `## Next Week's Top 3 Intentions`,
      ...(reviewData.nextWeekTop3 || []).map((t, i) => `${i + 1}. ${t}`),
      '',
      `## Retrospective & Reflections`,
      reviewData.reflections || 'Mindful creative cadence maintained.'
    ];
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(lines.join('\n'));
      appState.addToast('Weekly review copied to clipboard', 'info');
    }
  }

  onMount(() => {
    loadWeek();
  });
</script>

<div class="weekly-view card-surface">
  <!-- Header: Week Navigation & Actions -->
  <div class="weekly-header">
    <div class="weekly-titles">
      <span class="weekly-badge">WEEKLY RITUAL &amp; RETROSPECTIVE</span>
      <div class="week-picker-row">
        <button type="button" class="nav-arrow-btn" onclick={() => changeWeek(-1)} title="Previous week" aria-label="Previous week">
          <Icon name="chevronLeft" size={14} />
        </button>
        <span class="current-week-display font-mono">{currentWeek}</span>
        <button type="button" class="nav-arrow-btn" onclick={() => changeWeek(1)} title="Next week" aria-label="Next week">
          <Icon name="chevronRight" size={14} />
        </button>
      </div>
    </div>

    <div class="header-actions">
      <button type="button" class="action-btn secondary" onclick={copyMarkdown} title="Copy as Markdown" aria-label="Copy review Markdown">
        <Icon name="copy" size={13} />
        <span>Copy Markdown</span>
      </button>
      <button type="button" class="action-btn primary" onclick={handleManualSave} disabled={isSaving}>
        <Icon name="check" size={13} />
        <span>{isSaving ? 'Saving...' : 'Save Review'}</span>
      </button>
    </div>
  </div>

  <!-- Bento Telemetry Row -->
  <div class="weekly-grid">
    <div class="metric-card">
      <span class="metric-label">Shipped Deliverables</span>
      <span class="metric-val font-mono">{reviewData?.shippedDeliverables?.length || 0}</span>
      <span class="metric-meta">Approved client milestones</span>
    </div>
    <div class="metric-card">
      <span class="metric-label">Hours Logged</span>
      <span class="metric-val font-mono">{reviewData?.hoursLogged || telemetry?.billableHours || 0}h</span>
      <span class="metric-meta">Chronometer &amp; billable time</span>
    </div>
    <div class="metric-card highlight-metric">
      <span class="metric-label">Unbilled Atelier Time</span>
      <span class="metric-val text-warning font-mono">{timerStore.unbilledFormatted}</span>
      <span class="metric-meta">+{settingsStore.settings.currencySymbol || 'RM'} {timerStore.unbilledEarnings.toFixed(2)} accrued</span>
    </div>
    <div class="metric-card">
      <span class="metric-label">BuJo Task Velocity</span>
      <span class="metric-val font-mono">{telemetry?.completionRate || 100}%</span>
      <span class="metric-meta">{telemetry?.tasksCompleted || 0} / {telemetry?.tasksTotal || 0} tasks closed</span>
    </div>
  </div>

  <!-- Shipped Work & Deliverables -->
  <div class="section-card">
    <div class="section-header-row">
      <h4 class="section-title">Shipped Deliverables This Week</h4>
      <span class="section-subtitle">Verified proofs and creative assets delivered to client vaults</span>
    </div>

    <div class="deliverables-list">
      {#each (reviewData?.shippedDeliverables || []) as item, idx}
        <div class="deliverable-item">
          <span class="check-pill" aria-hidden="true"><Icon name="check" size={12} /></span>
          <span class="item-text font-mono">{item}</span>
          <button type="button" class="item-remove-btn" onclick={() => removeDeliverable(idx)} title="Remove item" aria-label="Remove item">
            <Icon name="close" size={11} />
          </button>
        </div>
      {/each}

      <div class="add-item-row">
        <input
          type="text"
          class="add-item-input"
          placeholder="Log shipped deliverable (e.g. 4K Hero Key Visual - ACME)..."
          bind:value={newDeliverableInput}
          onkeydown={(e) => { if (e.key === 'Enter') addDeliverable(); }}
        />
        <button type="button" class="add-item-btn" onclick={addDeliverable}>
          <Icon name="plus" size={12} />
          <span>Add</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Next Week's Top 3 Focus Intentions -->
  <div class="section-card">
    <div class="section-header-row">
      <h4 class="section-title">Next Week's Top 3 Intentions</h4>
      <span class="section-subtitle">Mindful priorities to focus on when opening the atelier Monday morning</span>
    </div>

    <div class="top3-grid">
      {#each [0, 1, 2] as i}
        <div class="top3-box">
          <span class="top3-rank font-mono">0{i + 1}</span>
          <input
            type="text"
            class="top3-input"
            value={reviewData?.nextWeekTop3?.[i] || ''}
            placeholder={i === 0 ? 'Top Priority Brief / Client Milestone' : (i === 1 ? 'Secondary Critical Deliverable' : 'Strategic Atelier / System Craft')}
            oninput={(e) => updateTop3(i, (e.target as HTMLInputElement).value)}
          />
        </div>
      {/each}
    </div>
  </div>

  <!-- Mindful Creative Retrospective & Notes -->
  <div class="section-card">
    <div class="section-header-row">
      <h4 class="section-title">Creative Retrospective &amp; Pacing</h4>
      <span class="section-subtitle">Synthesize weekly discoveries, friction points, and zen calibrations</span>
    </div>

    <textarea
      class="reflection-textarea"
      rows="4"
      bind:value={reviewData!.reflections}
      oninput={autoSave}
      placeholder="What worked with flow this week? What caused friction or noise? Any revision patterns to calibrate?"
    ></textarea>
  </div>
</div>

<style>
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
  .weekly-header { display: flex; justify-content: space-between; align-items: center; }
  .weekly-titles { display: flex; flex-direction: column; gap: 6px; }
  .weekly-badge { font-size: 11px; font-weight: 700; color: var(--kanso-accent); letter-spacing: 0.05em; }
  .week-picker-row { display: flex; align-items: center; gap: 8px; }
  .current-week-display { font-size: 18px; font-weight: 700; color: var(--kanso-text-primary); }
  .nav-arrow-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-muted); cursor: pointer; transition: all 0.12s ease; }
  .nav-arrow-btn:hover { background: var(--kanso-surface-hover); color: var(--kanso-text-primary); }
  .header-actions { display: flex; align-items: center; gap: 8px; }
  .action-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.12s ease; }
  .action-btn.primary { background: var(--kanso-accent); border: 1px solid var(--kanso-accent); color: var(--kanso-canvas); }
  .action-btn.primary:hover:not(:disabled) { opacity: 0.9; }
  .action-btn.secondary { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); }
  .action-btn.secondary:hover { background: var(--kanso-surface-hover); }
  .weekly-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  @media (max-width: 900px) { .weekly-grid { grid-template-columns: repeat(2, 1fr); } }
  .metric-card { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
  .metric-card.highlight-metric { border-color: var(--kanso-border); }
  .metric-label { font-size: 11px; font-weight: 600; color: var(--kanso-text-muted); }
  .metric-val { font-size: 20px; font-weight: 700; color: var(--kanso-text-primary); }
  .text-warning { color: var(--kanso-warning); }
  .metric-meta { font-size: 10.5px; color: var(--kanso-text-muted); }
  .section-card { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .section-header-row { display: flex; flex-direction: column; gap: 2px; }
  .section-title { margin: 0; font-size: 13.5px; font-weight: 700; color: var(--kanso-text-primary); }
  .section-subtitle { font-size: 11px; color: var(--kanso-text-muted); }
  .deliverables-list { display: flex; flex-direction: column; gap: 6px; }
  .deliverable-item { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 4px; }
  .check-pill { display: flex; align-items: center; color: var(--kanso-success); }
  .item-text { flex: 1; font-size: 12px; color: var(--kanso-text-primary); }
  .item-remove-btn { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 4px; background: transparent; border: none; color: var(--kanso-text-muted); cursor: pointer; }
  .item-remove-btn:hover { background: var(--kanso-surface-hover); color: var(--kanso-text-primary); }
  .add-item-row { display: flex; gap: 8px; margin-top: 4px; }
  .add-item-input { flex: 1; height: 30px; padding: 0 10px; background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 4px; font-size: 12px; color: var(--kanso-text-primary); }
  .add-item-btn { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 12px; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); border-radius: 4px; font-size: 11px; font-weight: 600; color: var(--kanso-text-primary); cursor: pointer; }
  .add-item-btn:hover { background: var(--kanso-surface); }
  .top3-grid { display: flex; flex-direction: column; gap: 8px; }
  .top3-box { display: flex; align-items: center; gap: 10px; background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 4px; padding: 6px 10px; }
  .top3-rank { font-size: 12px; font-weight: 700; color: var(--kanso-accent); }
  .top3-input { flex: 1; height: 26px; background: transparent; border: none; font-size: 12px; color: var(--kanso-text-primary); outline: none; }
  .reflection-textarea { width: 100%; box-sizing: border-box; background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 4px; padding: 10px; font-size: 12.5px; line-height: 1.6; color: var(--kanso-text-primary); resize: vertical; }
  .reflection-textarea:focus { border-color: var(--kanso-accent); outline: none; }
</style>
