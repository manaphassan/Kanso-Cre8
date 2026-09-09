<script lang="ts">
  import { onMount } from 'svelte';
  import { journalService, type DailyNote, type MonthlyReview, type YearlyReview, type BujoEntry } from '../services/journalService';
  import { appState } from '$lib/stores/appState.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';

  type ViewTab = 'daily' | 'monthly' | 'yearly';
  let activeTab: ViewTab = $state('daily');

  // Daily Log State
  let currentDate = $state(new Date().toISOString().split('T')[0]);
  let dailyNote: DailyNote = $state(journalService.getDailyNote());
  let newEntryText = $state('');
  let newEntryType: BujoEntry['type'] = $state('task');
  let newIntentionText = $state('');
  let showRawMarkdown = $state(false);

  // Monthly State
  let currentMonth = $state(new Date().toISOString().slice(0, 7));
  let monthlyReview: MonthlyReview = $state(journalService.getMonthlyReview());

  // Yearly State
  let currentYear = $state(new Date().getFullYear().toString());
  let yearlyReview: YearlyReview = $state(journalService.getYearlyReview());

  onMount(() => {
    loadDailyNote(currentDate);
    monthlyReview = journalService.getMonthlyReview(currentMonth);
    yearlyReview = journalService.getYearlyReview(currentYear);
  });

  function loadDailyNote(date: string) {
    currentDate = date;
    dailyNote = journalService.getDailyNote(date);
  }

  function shiftDay(days: number) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    loadDailyNote(dateStr);
  }

  function handleAddEntry() {
    if (!newEntryText.trim()) return;
    dailyNote = journalService.addEntry(currentDate, newEntryType, newEntryText.trim());
    newEntryText = '';
  }

  function handleToggleTask(taskId: string) {
    dailyNote = journalService.toggleTask(currentDate, taskId);
  }

  function handleDeleteEntry(taskId: string) {
    dailyNote = journalService.deleteEntry(currentDate, taskId);
  }

  function handleAddIntention() {
    if (!newIntentionText.trim()) return;
    dailyNote.focusIntentions = [...dailyNote.focusIntentions, newIntentionText.trim()];
    journalService.saveDailyNote(dailyNote);
    newIntentionText = '';
  }

  function handleRemoveIntention(idx: number) {
    dailyNote.focusIntentions = dailyNote.focusIntentions.filter((_, i) => i !== idx);
    journalService.saveDailyNote(dailyNote);
  }

  function handleSaveMonthly() {
    journalService.saveMonthlyReview(monthlyReview);
    appState.addToast('Monthly review saved to _Journal/Monthly/', 'success');
  }

  function handleSaveYearly() {
    journalService.saveYearlyReview(yearlyReview);
    appState.addToast('Yearly review saved to _Journal/Yearly/', 'success');
  }

  // Symbol styling helper
  function getSymbolBadge(type: BujoEntry['type']) {
    switch (type) {
      case 'priority': return { symbol: '★', label: 'Priority', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'event': return { symbol: '○', label: 'Event', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' };
      case 'note': return { symbol: '—', label: 'Note', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)' };
      case 'migrated': return { symbol: '>', label: 'Migrated', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)' };
      case 'done': return { symbol: '✓', label: 'Done', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
      default: return { symbol: '•', label: 'Task', color: '#F4F4F5', bg: 'rgba(255, 255, 255, 0.08)' };
    }
  }
</script>

<div class="bujo-page-wrap animate-fadeIn">
  <!-- Page Header -->
  <div class="bujo-header">
    <div>
      <div class="tag-row">
        <span class="badge-zen">_Journal/</span>
        <span class="meta-txt">Bullet Journal &amp; Creator's Log</span>
      </div>
      <h1 class="page-title">Creator's BuJo Sanctuary</h1>
      <p class="page-desc">
        Rapid daily logging, task migration, monthly deliverable reviews, and yearly studio vision.
      </p>
    </div>

    <!-- Tab Switcher -->
    <div class="tab-switcher">
      <button
        class="tab-btn"
        class:active={activeTab === 'daily'}
        onclick={() => (activeTab = 'daily')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
        </svg>
        Daily Rapid Log
      </button>

      <button
        class="tab-btn"
        class:active={activeTab === 'monthly'}
        onclick={() => (activeTab = 'monthly')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
        </svg>
        Monthly Review
      </button>

      <button
        class="tab-btn"
        class:active={activeTab === 'yearly'}
        onclick={() => (activeTab = 'yearly')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L1 21h22L12 2zm0 3.84L20.13 19H3.87L12 5.84zM11 10h2v4h-2zm0 6h2v2h-2z"/>
        </svg>
        Yearly Vision
      </button>
    </div>
  </div>

  <!-- ══════════ TAB 1: DAILY RAPID LOG ══════════ -->
  {#if activeTab === 'daily'}
    <!-- Date Navigator -->
    <div class="date-navigator-bar">
      <button class="nav-arrow-btn" onclick={() => shiftDay(-1)} title="Previous Day">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>

      <div class="date-title-col">
        <span class="date-label">{dailyNote.title}</span>
        <span class="file-path-hint">_Journal/Daily/{currentDate}.md</span>
      </div>

      <div class="nav-actions-right">
        <button
          class="today-btn"
          onclick={() => loadDailyNote(new Date().toISOString().split('T')[0])}
        >
          Today
        </button>
        <button class="nav-arrow-btn" onclick={() => shiftDay(1)} title="Next Day">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
        <button
          class="raw-toggle-btn"
          class:active={showRawMarkdown}
          onclick={() => (showRawMarkdown = !showRawMarkdown)}
          title="Toggle Raw Markdown Editor"
        >
          {showRawMarkdown ? 'Interactive Log' : 'Raw Markdown'}
        </button>
      </div>
    </div>

    {#if showRawMarkdown}
      <!-- RAW MARKDOWN VIEW -->
      <div class="raw-card">
        <textarea
          class="raw-textarea"
          bind:value={dailyNote.rawMarkdown}
          rows="18"
          onchange={() => journalService.saveDailyNote(dailyNote)}
        ></textarea>
      </div>
    {:else}
      <!-- TWO COLUMN LAYOUT: Intentions + Rapid Log -->
      <div class="daily-grid">
        <!-- Left Column: Daily Intentions (Focus Box) -->
        <div class="intentions-card">
          <div class="card-head">
            <span class="chead-icon">🎯</span>
            <h3 class="chead-title">Daily Intentions</h3>
          </div>
          <p class="chead-sub">3 essential outcomes to guide your creative flow today.</p>

          <div class="intentions-list">
            {#each dailyNote.focusIntentions as intention, idx}
              <div class="intention-row">
                <span class="int-dot">•</span>
                <span class="int-text">{intention}</span>
                <button
                  class="int-del-btn"
                  onclick={() => handleRemoveIntention(idx)}
                  title="Remove intention"
                >✕</button>
              </div>
            {/each}
          </div>

          <form class="add-intention-form" onsubmit={(e) => { e.preventDefault(); handleAddIntention(); }}>
            <input
              type="text"
              bind:value={newIntentionText}
              placeholder="Add key intention..."
              class="add-int-input"
            />
            <button type="submit" class="add-int-btn">+</button>
          </form>
        </div>

        <!-- Right Column: Rapid Log Entries -->
        <div class="rapid-log-card">
          <div class="card-head">
            <span class="chead-icon">⚡</span>
            <h3 class="chead-title">Rapid Log</h3>
            <span class="badge-count">{dailyNote.entries.length} items</span>
          </div>

          <!-- Quick Add Entry Bar -->
          <form class="quick-entry-bar" onsubmit={(e) => { e.preventDefault(); handleAddEntry(); }}>
            <select bind:value={newEntryType} class="entry-type-select">
              <option value="task">• [ ] Task</option>
              <option value="priority">★ Priority</option>
              <option value="event">○ Event</option>
              <option value="note">— Note</option>
            </select>

            <input
              type="text"
              bind:value={newEntryText}
              placeholder="Log task, meeting, or design insight (Enter)..."
              class="quick-entry-input"
            />

            <button type="submit" class="quick-entry-btn">Log</button>
          </form>

          <!-- Rapid Log Item List -->
          <div class="entries-list">
            {#each dailyNote.entries as entry (entry.id)}
              {@const b = getSymbolBadge(entry.type)}
              <div
                class="entry-row"
                class:is-done={entry.completed || entry.type === 'done'}
                class:is-priority={entry.type === 'priority'}
              >
                <!-- Symbol Badge -->
                {#if entry.type === 'task' || entry.type === 'priority'}
                  <button
                    class="task-check-box"
                    class:checked={entry.completed}
                    onclick={() => handleToggleTask(entry.id)}
                    title="Toggle completion"
                    aria-label="Toggle task"
                  >
                    {#if entry.completed}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    {/if}
                  </button>
                {:else}
                  <span
                    class="symbol-chip"
                    style="color: {b.color}; background: {b.bg};"
                    title={b.label}
                  >
                    {b.symbol}
                  </span>
                {/if}

                <span class="entry-text">{entry.text}</span>

                <button
                  class="entry-del-btn"
                  onclick={() => handleDeleteEntry(entry.id)}
                  title="Delete entry"
                >
                  ✕
                </button>
              </div>
            {:else}
              <div class="empty-state">
                No rapid logs recorded for this day yet. Add your first task or event above.
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

  <!-- ══════════ TAB 2: MONTHLY REVIEW ══════════ -->
  {:else if activeTab === 'monthly'}
    <div class="review-panel-wrap">
      <div class="review-card">
        <div class="card-head">
          <span class="chead-icon">📅</span>
          <div>
            <h3 class="chead-title">Monthly Retrospective &amp; Review ({monthlyReview.month})</h3>
            <p class="chead-sub">_Journal/Monthly/{monthlyReview.month}.md</p>
          </div>
        </div>

        <div class="review-sections-grid">
          <!-- Goals Section -->
          <div class="rsection">
            <h4 class="rsection-title">Core Monthly Deliverables</h4>
            <div class="rlist">
              {#each monthlyReview.deliverablesSummary as deliv}
                <div class="rlist-item">✓ {deliv}</div>
              {/each}
            </div>
          </div>

          <!-- Billable Hours Stat -->
          <div class="rsection">
            <h4 class="rsection-title">Studio Billable Hours Logged</h4>
            <div class="hours-val-display">
              <span class="hval">{monthlyReview.billableHours} hrs</span>
              <span class="hval-sub">Recorded via Billable Chronometer</span>
            </div>
          </div>
        </div>

        <!-- Reflections Input -->
        <div class="reflection-box">
          <label for="m-refl" class="rsection-title">Creative Reflection &amp; Studio Notes</label>
          <textarea
            id="m-refl"
            bind:value={monthlyReview.reflections}
            rows="5"
            class="reflection-textarea"
            placeholder="What went well this month? What can be simplified? Client feedback highlights..."
          ></textarea>
        </div>

        <div class="card-footer">
          <button class="save-btn" onclick={handleSaveMonthly}>Save Monthly Review</button>
        </div>
      </div>
    </div>

  <!-- ══════════ TAB 3: YEARLY VISION ══════════ -->
  {:else if activeTab === 'yearly'}
    <div class="review-panel-wrap">
      <div class="review-card">
        <div class="card-head">
          <span class="chead-icon">🏔️</span>
          <div>
            <h3 class="chead-title">Annual Vision &amp; Retrospective ({yearlyReview.year})</h3>
            <p class="chead-sub">_Journal/Yearly/{yearlyReview.year}.md</p>
          </div>
        </div>

        <div class="reflection-box">
          <label for="y-vision" class="rsection-title">Studio Manifesto &amp; Creative North Star</label>
          <textarea
            id="y-vision"
            bind:value={yearlyReview.vision}
            rows="4"
            class="reflection-textarea"
          ></textarea>
        </div>

        <div class="rsection" style="margin-top: 16px;">
          <h4 class="rsection-title">Key Annual Milestones Achieved</h4>
          <div class="rlist">
            {#each yearlyReview.milestones as milestone}
              <div class="rlist-item">🏆 {milestone}</div>
            {/each}
          </div>
        </div>

        <div class="card-footer">
          <button class="save-btn" onclick={handleSaveYearly}>Save Yearly Vision</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .bujo-page-wrap {
    padding: 32px;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .bujo-header {
    display: flex;
    flex-direction: column;
    gap: 16px;
    border-bottom: 1px solid var(--kanso-border, #27272A);
    padding-bottom: 20px;
  }

  @media (min-width: 768px) {
    .bujo-header {
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
    }
  }

  .tag-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .badge-zen {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-accent, #38BDF8);
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .meta-txt {
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
  }

  .page-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .page-desc {
    font-size: 13px;
    color: var(--kanso-text-muted, #71717A);
    margin: 4px 0 0 0;
  }

  .tab-switcher {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 3px;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-muted, #71717A);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-btn:hover {
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .tab-btn.active {
    background: rgba(255, 255, 255, 0.08);
    color: var(--kanso-text-primary, #F4F4F5);
  }

  /* Date Navigator Bar */
  .date-navigator-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 10px;
    padding: 10px 16px;
  }

  .nav-arrow-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    color: var(--kanso-text-primary, #F4F4F5);
    cursor: pointer;
  }

  .nav-arrow-btn:hover {
    background: var(--kanso-surface-hover, #27272A);
  }

  .date-title-col {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .date-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .file-path-hint {
    font-size: 10px;
    font-family: ui-monospace, monospace;
    color: var(--kanso-text-muted, #71717A);
  }

  .nav-actions-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .today-btn {
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-text-primary, #F4F4F5);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    cursor: pointer;
  }

  .today-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .raw-toggle-btn {
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-text-muted, #71717A);
    background: transparent;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    cursor: pointer;
  }

  .raw-toggle-btn:hover, .raw-toggle-btn.active {
    color: var(--kanso-accent, #38BDF8);
    border-color: var(--kanso-accent, #38BDF8);
  }

  /* Daily Grid */
  .daily-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }

  @media (min-width: 900px) {
    .daily-grid {
      grid-template-columns: 340px 1fr;
    }
  }

  .intentions-card, .rapid-log-card, .review-card, .raw-card {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 12px;
    padding: 20px;
  }

  .card-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .chead-icon { font-size: 18px; }

  .chead-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
  }

  .chead-sub {
    font-size: 11px;
    color: var(--kanso-text-muted, #71717A);
    margin: 0 0 16px 0;
  }

  .badge-count {
    margin-left: auto;
    font-size: 10px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.06);
    color: var(--kanso-text-muted, #71717A);
    padding: 2px 6px;
    border-radius: 9999px;
  }

  /* Intentions list */
  .intentions-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .intention-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 12px;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .int-dot {
    color: var(--kanso-accent, #38BDF8);
    font-weight: bold;
  }

  .int-text { flex: 1; }

  .int-del-btn, .entry-del-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted, #71717A);
    cursor: pointer;
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 4px;
  }

  .int-del-btn:hover, .entry-del-btn:hover {
    color: #EF4444;
  }

  .add-intention-form {
    display: flex;
    gap: 6px;
  }

  .add-int-input {
    flex: 1;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    color: #F4F4F5;
    outline: none;
  }

  .add-int-input:focus { border-color: var(--kanso-accent, #38BDF8); }

  .add-int-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    color: #F4F4F5;
    width: 32px;
    font-size: 16px;
    cursor: pointer;
  }

  /* Quick Entry Bar */
  .quick-entry-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .entry-type-select {
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 12px;
    font-weight: 600;
    padding: 6px 8px;
    outline: none;
    cursor: pointer;
  }

  .quick-entry-input {
    flex: 1;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 13px;
    color: #F4F4F5;
    outline: none;
  }

  .quick-entry-input:focus { border-color: var(--kanso-accent, #38BDF8); }

  .quick-entry-btn {
    background: var(--kanso-accent, #38BDF8);
    border: 1px solid var(--kanso-accent, #38BDF8);
    border-radius: 6px;
    color: #09090B;
    font-size: 12px;
    font-weight: 700;
    padding: 0 14px;
    cursor: pointer;
  }

  /* Entries list */
  .entries-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .entry-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 13px;
    color: var(--kanso-text-primary, #F4F4F5);
    transition: all 0.15s ease;
  }

  .entry-row:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }

  .entry-row.is-done {
    opacity: 0.6;
  }

  .entry-row.is-done .entry-text {
    text-decoration: line-through;
    color: var(--kanso-text-muted, #71717A);
  }

  .entry-row.is-priority {
    border-left: 3px solid #F59E0B;
  }

  .task-check-box {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1.5px solid var(--kanso-text-muted, #71717A);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #09090B;
    padding: 0;
  }

  .task-check-box.checked {
    background: #10B981;
    border-color: #10B981;
  }

  .symbol-chip {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: bold;
  }

  .entry-text { flex: 1; }

  .empty-state {
    padding: 30px 10px;
    text-align: center;
    color: var(--kanso-text-muted, #71717A);
    font-size: 12px;
  }

  .raw-textarea {
    width: 100%;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    color: #F4F4F5;
    font-family: ui-monospace, monospace;
    font-size: 13px;
    line-height: 1.6;
    padding: 14px;
    outline: none;
    box-sizing: border-box;
  }

  /* Review Card Styles */
  .review-panel-wrap {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .review-sections-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin: 16px 0;
  }

  @media (min-width: 768px) {
    .review-sections-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .rsection-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--kanso-text-muted, #71717A);
    margin: 0 0 8px 0;
  }

  .rlist {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rlist-item {
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .hours-val-display {
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .hval {
    font-size: 24px;
    font-weight: 800;
    color: var(--kanso-accent, #38BDF8);
  }

  .hval-sub {
    font-size: 11px;
    color: var(--kanso-text-muted, #71717A);
  }

  .reflection-textarea {
    width: 100%;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 13px;
    color: #F4F4F5;
    outline: none;
    box-sizing: border-box;
    margin-top: 4px;
  }

  .reflection-textarea:focus {
    border-color: var(--kanso-accent, #38BDF8);
  }

  .card-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--kanso-border, #27272A);
  }

  .save-btn {
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
    border: 1px solid var(--kanso-accent, #38BDF8);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    padding: 8px 16px;
    cursor: pointer;
  }

  .save-btn:hover {
    filter: brightness(1.1);
  }
</style>
