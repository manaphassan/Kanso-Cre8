<script lang="ts">
  import { onMount } from 'svelte';
  import {
    journalService,
    type DailyNote,
    type MonthlyReview,
    type YearlyReview,
    type MonthlyTelemetry,
    type YearlyTelemetry,
    type BujoEntry
  } from '../services/journalService';
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
  let monthlyTelemetry: MonthlyTelemetry | null = $state(null);
  let showMonthlyRaw = $state(false);
  let newGoalText = $state('');
  let newDelivText = $state('');

  // Yearly State
  let currentYear = $state(new Date().getFullYear().toString());
  let yearlyReview: YearlyReview = $state(journalService.getYearlyReview());
  let yearlyTelemetry: YearlyTelemetry | null = $state(null);
  let showYearlyRaw = $state(false);
  let newMilestoneText = $state('');

  onMount(async () => {
    loadDailyNote(currentDate);
    await loadMonthlyData(currentMonth);
    await loadYearlyData(currentYear);
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

  async function loadMonthlyData(month: string) {
    currentMonth = month;
    monthlyReview = journalService.getMonthlyReview(month);
    const disk = await journalService.fetchDiskMonthlyReview(month);
    if (disk) monthlyReview = disk;
    monthlyTelemetry = await journalService.getMonthlyTelemetry(month);
  }

  async function loadYearlyData(year: string) {
    currentYear = year;
    yearlyReview = journalService.getYearlyReview(year);
    const disk = await journalService.fetchDiskYearlyReview(year);
    if (disk) yearlyReview = disk;
    yearlyTelemetry = await journalService.getYearlyTelemetry(year);
  }

  function shiftMonth(offset: number) {
    const parts = currentMonth.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1 + offset, 1);
    const nextMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    loadMonthlyData(nextMonth);
  }

  function shiftYear(offset: number) {
    const nextYear = String(Number(currentYear) + offset);
    loadYearlyData(nextYear);
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

  function handleAddGoal() {
    if (!newGoalText.trim()) return;
    monthlyReview.goals = [...(monthlyReview.goals || []), newGoalText.trim()];
    journalService.saveMonthlyReview(monthlyReview);
    newGoalText = '';
  }

  function handleRemoveGoal(idx: number) {
    monthlyReview.goals = (monthlyReview.goals || []).filter((_, i) => i !== idx);
    journalService.saveMonthlyReview(monthlyReview);
  }

  function handleAddDeliverable() {
    if (!newDelivText.trim()) return;
    monthlyReview.deliverablesSummary = [...(monthlyReview.deliverablesSummary || []), newDelivText.trim()];
    journalService.saveMonthlyReview(monthlyReview);
    newDelivText = '';
  }

  function handleRemoveDeliverable(idx: number) {
    monthlyReview.deliverablesSummary = (monthlyReview.deliverablesSummary || []).filter((_, i) => i !== idx);
    journalService.saveMonthlyReview(monthlyReview);
  }

  function handleAddMilestone() {
    if (!newMilestoneText.trim()) return;
    yearlyReview.milestones = [...(yearlyReview.milestones || []), newMilestoneText.trim()];
    journalService.saveYearlyReview(yearlyReview);
    newMilestoneText = '';
  }

  function handleRemoveMilestone(idx: number) {
    yearlyReview.milestones = (yearlyReview.milestones || []).filter((_, i) => i !== idx);
    journalService.saveYearlyReview(yearlyReview);
  }

  function handleSaveMonthly() {
    journalService.saveMonthlyReview(monthlyReview);
    appState.addToast(`Monthly review saved to _Journal/Monthly/${monthlyReview.month}.md`, 'success');
  }

  function handleSaveYearly() {
    journalService.saveYearlyReview(yearlyReview);
    appState.addToast(`Yearly review saved to _Journal/Yearly/${yearlyReview.year}.md`, 'success');
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
    <!-- Month Navigator Bar -->
    <div class="date-navigator-bar">
      <button class="nav-arrow-btn" onclick={() => shiftMonth(-1)} title="Previous Month">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>

      <div class="date-title-col">
        <span class="date-label">📅 {monthlyReview.title || `Monthly Review: ${currentMonth}`}</span>
        <span class="file-path-hint">_Journal/Monthly/{currentMonth}.md</span>
      </div>

      <div class="nav-actions-right">
        <button
          class="today-btn"
          onclick={() => loadMonthlyData(new Date().toISOString().slice(0, 7))}
        >
          This Month
        </button>
        <button class="nav-arrow-btn" onclick={() => shiftMonth(1)} title="Next Month">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
        <button
          class="raw-toggle-btn"
          class:active={showMonthlyRaw}
          onclick={() => (showMonthlyRaw = !showMonthlyRaw)}
          title="Toggle Raw Markdown Editor"
        >
          {showMonthlyRaw ? 'Studio Sheet' : 'Raw Markdown'}
        </button>
      </div>
    </div>

    {#if showMonthlyRaw}
      <div class="raw-card">
        <textarea
          class="raw-textarea"
          bind:value={monthlyReview.rawMarkdown}
          rows="18"
          onchange={() => journalService.saveMonthlyReview(monthlyReview)}
        ></textarea>
      </div>
    {:else}
      <!-- MONTHLY TELEMETRY BENTO -->
      {#if monthlyTelemetry}
        <div class="telemetry-bento-grid">
          <div class="bento-card">
            <span class="bento-icon">⏱️</span>
            <div class="bento-content">
              <span class="bento-val">{monthlyTelemetry.billableHours}h</span>
              <span class="bento-label">Hours Logged</span>
            </div>
          </div>

          <div class="bento-card">
            <span class="bento-icon">💵</span>
            <div class="bento-content">
              <span class="bento-val">${monthlyTelemetry.totalRevenue.toLocaleString()}</span>
              <span class="bento-label">
                ${monthlyTelemetry.paidRevenue.toLocaleString()} paid • ${monthlyTelemetry.pendingRevenue.toLocaleString()} pending
              </span>
            </div>
          </div>

          <div class="bento-card">
            <span class="bento-icon">📦</span>
            <div class="bento-content">
              <span class="bento-val">{monthlyTelemetry.deliverablesCount}</span>
              <span class="bento-label">Deliverables Handed Over</span>
            </div>
          </div>

          <div class="bento-card">
            <span class="bento-icon">🔄</span>
            <div class="bento-content">
              <span class="bento-val">{monthlyTelemetry.avgRevisionRounds}x</span>
              <span class="bento-label">Avg Revision Rounds</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- TWO COLUMN MONTHLY STUDIO LAYOUT -->
      <div class="review-sections-grid">
        <!-- Left Column: Goals & Deliverables Checklist -->
        <div class="review-col-left">
          <!-- Monthly Focus Goals -->
          <div class="rsection-box">
            <div class="card-head">
              <span class="chead-icon">🎯</span>
              <h4 class="rsection-title">Core Monthly Focus &amp; Objectives</h4>
            </div>
            <div class="rlist">
              {#each (monthlyReview.goals || []) as goal, idx}
                <div class="rlist-item">
                  <span>✓ {goal}</span>
                  <button class="item-del-btn" onclick={() => handleRemoveGoal(idx)}>✕</button>
                </div>
              {/each}
            </div>
            <form class="add-mini-form" onsubmit={(e) => { e.preventDefault(); handleAddGoal(); }}>
              <input type="text" bind:value={newGoalText} placeholder="Add focus goal..." class="mini-input" />
              <button type="submit" class="mini-add-btn">+</button>
            </form>
          </div>

          <!-- Deliverables Summary -->
          <div class="rsection-box" style="margin-top: 16px;">
            <div class="card-head">
              <span class="chead-icon">✨</span>
              <h4 class="rsection-title">Deliverables Summary</h4>
            </div>
            <div class="rlist">
              {#each (monthlyReview.deliverablesSummary || []) as deliv, idx}
                <div class="rlist-item">
                  <span>📦 {deliv}</span>
                  <button class="item-del-btn" onclick={() => handleRemoveDeliverable(idx)}>✕</button>
                </div>
              {/each}
            </div>
            <form class="add-mini-form" onsubmit={(e) => { e.preventDefault(); handleAddDeliverable(); }}>
              <input type="text" bind:value={newDelivText} placeholder="Add completed deliverable..." class="mini-input" />
              <button type="submit" class="mini-add-btn">+</button>
            </form>
          </div>
        </div>

        <!-- Right Column: Creative Reflection & Learnings -->
        <div class="review-col-right">
          <div class="rsection-box h-full flex flex-col">
            <div class="card-head">
              <span class="chead-icon">🌿</span>
              <h4 class="rsection-title">Creative Reflection &amp; Atelier Retrospective</h4>
            </div>
            <p class="chead-sub">
              Document design triumphs, workflow bottlenecks eliminated, client insights, and mindful creative adjustments.
            </p>

            <textarea
              bind:value={monthlyReview.reflections}
              rows="12"
              class="reflection-textarea flex-1"
              placeholder="What went well this month? Which client interactions were friction-free? What creative habits will you cultivate next month?"
            ></textarea>

            <div class="card-footer">
              <button class="save-btn" onclick={handleSaveMonthly}>
                Save Monthly Review (_Journal/Monthly/)
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}

  <!-- ══════════ TAB 3: YEARLY VISION ══════════ -->
  {:else if activeTab === 'yearly'}
    <!-- Year Navigator Bar -->
    <div class="date-navigator-bar">
      <button class="nav-arrow-btn" onclick={() => shiftYear(-1)} title="Previous Year">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>

      <div class="date-title-col">
        <span class="date-label">🏔️ {yearlyReview.title || `${currentYear} Studio Vision & Annual Index`}</span>
        <span class="file-path-hint">_Journal/Yearly/{currentYear}.md</span>
      </div>

      <div class="nav-actions-right">
        <button
          class="today-btn"
          onclick={() => loadYearlyData(new Date().getFullYear().toString())}
        >
          This Year
        </button>
        <button class="nav-arrow-btn" onclick={() => shiftYear(1)} title="Next Year">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
        <button
          class="raw-toggle-btn"
          class:active={showYearlyRaw}
          onclick={() => (showYearlyRaw = !showYearlyRaw)}
          title="Toggle Raw Markdown Editor"
        >
          {showYearlyRaw ? 'Studio Sheet' : 'Raw Markdown'}
        </button>
      </div>
    </div>

    {#if showYearlyRaw}
      <div class="raw-card">
        <textarea
          class="raw-textarea"
          bind:value={yearlyReview.rawMarkdown}
          rows="18"
          onchange={() => journalService.saveYearlyReview(yearlyReview)}
        ></textarea>
      </div>
    {:else}
      <!-- ANNUAL TELEMETRY BENTO -->
      {#if yearlyTelemetry}
        {@const revPercent = Math.min(100, Math.round((yearlyTelemetry.totalRevenue / (yearlyReview.revenueTarget || 150000)) * 100))}
        <div class="telemetry-bento-grid">
          <div class="bento-card bento-wide">
            <span class="bento-icon">💰</span>
            <div class="bento-content flex-1">
              <div class="flex justify-between items-baseline mb-1">
                <span class="bento-val">${yearlyTelemetry.totalRevenue.toLocaleString()}</span>
                <span class="meta-txt">Target: ${(yearlyReview.revenueTarget || 150000).toLocaleString()} ({revPercent}%)</span>
              </div>
              <!-- Progress Bar -->
              <div class="progress-track">
                <div class="progress-bar" style="width: {revPercent}%"></div>
              </div>
            </div>
          </div>

          <div class="bento-card">
            <span class="bento-icon">⏱️</span>
            <div class="bento-content">
              <span class="bento-val">{yearlyTelemetry.totalHours}h</span>
              <span class="bento-label">Effective: ${yearlyTelemetry.effectiveRate}/hr</span>
            </div>
          </div>

          <div class="bento-card">
            <span class="bento-icon">📁</span>
            <div class="bento-content">
              <span class="bento-val">{yearlyTelemetry.completedProjects}</span>
              <span class="bento-label">Completed Vaults ({yearlyTelemetry.projectsCount} total)</span>
            </div>
          </div>
        </div>

        <!-- CLIENT DISTRIBUTION STRIP -->
        {#if yearlyTelemetry.clientDistribution && yearlyTelemetry.clientDistribution.length > 0}
          <div class="rsection-box" style="margin-top: 16px;">
            <h4 class="rsection-title">Client Revenue &amp; Project Distribution</h4>
            <div class="client-dist-grid">
              {#each yearlyTelemetry.clientDistribution as c}
                <div class="client-dist-card">
                  <div class="cdist-head">
                    <span class="cdist-code">{c.clientCode}</span>
                    <span class="cdist-pct">{c.percentage}%</span>
                  </div>
                  <span class="cdist-name">{c.clientName}</span>
                  <div class="cdist-footer">
                    <span class="cdist-rev">${c.revenue.toLocaleString()}</span>
                    <span class="cdist-count">{c.count} invoices</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/if}

      <!-- ANNUAL VISION & MILESTONES -->
      <div class="review-sections-grid" style="margin-top: 16px;">
        <!-- Left: Annual Milestones -->
        <div class="review-col-left">
          <div class="rsection-box">
            <div class="card-head">
              <span class="chead-icon">🏆</span>
              <h4 class="rsection-title">Annual Milestones Achieved</h4>
            </div>
            <div class="rlist">
              {#each (yearlyReview.milestones || []) as milestone, idx}
                <div class="rlist-item">
                  <span>🏆 {milestone}</span>
                  <button class="item-del-btn" onclick={() => handleRemoveMilestone(idx)}>✕</button>
                </div>
              {/each}
            </div>
            <form class="add-mini-form" onsubmit={(e) => { e.preventDefault(); handleAddMilestone(); }}>
              <input type="text" bind:value={newMilestoneText} placeholder="Add key milestone..." class="mini-input" />
              <button type="submit" class="mini-add-btn">+</button>
            </form>
          </div>
        </div>

        <!-- Right: Studio Manifesto & North Star -->
        <div class="review-col-right">
          <div class="rsection-box h-full flex flex-col">
            <div class="card-head">
              <span class="chead-icon">🌟</span>
              <h4 class="rsection-title">Studio Manifesto &amp; Creative North Star</h4>
            </div>
            <p class="chead-sub">
              Your guiding philosophy for the year: creative principles, client selectivity, craft focus, and studio evolution.
            </p>

            <textarea
              bind:value={yearlyReview.vision}
              rows="10"
              class="reflection-textarea flex-1"
              placeholder="What is your studio vision this year? What types of projects bring the most energy and creative flow?"
            ></textarea>

            <div class="card-footer">
              <button class="save-btn" onclick={handleSaveYearly}>
                Save Yearly Vision (_Journal/Yearly/)
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .bujo-page-wrap {
    padding: 0 0 48px;
    max-width: 100%;
    width: 100%;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    box-sizing: border-box;
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
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-accent, #38BDF8);
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 2px 7px;
    border-radius: 4px;
  }

  .meta-txt {
    font-size: 12.5px;
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
    font-size: 13.5px;
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
    font-size: 12.5px;
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
    font-size: 12px;
    font-family: ui-monospace, monospace;
    color: var(--kanso-text-muted, #71717A);
  }

  .nav-actions-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .today-btn {
    padding: 4px 12px;
    font-size: 12px;
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
    padding: 4px 12px;
    font-size: 12px;
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

  .intentions-card, .rapid-log-card, .raw-card {
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
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
  }

  .chead-sub {
    font-size: 13px;
    color: var(--kanso-text-muted, #71717A);
    margin: 0 0 16px 0;
  }

  .badge-count {
    margin-left: auto;
    font-size: 12px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.06);
    color: var(--kanso-text-muted, #71717A);
    padding: 2px 7px;
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
    padding: 8px 12px;
    font-size: 13.5px;
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
    font-size: 12.5px;
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
    padding: 7px 12px;
    font-size: 13.5px;
    color: #F4F4F5;
    outline: none;
  }

  .add-int-input:focus { border-color: var(--kanso-accent, #38BDF8); }

  .add-int-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    color: #F4F4F5;
    width: 34px;
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
    font-size: 13.5px;
    font-weight: 600;
    padding: 7px 10px;
    outline: none;
    cursor: pointer;
  }

  .quick-entry-input {
    flex: 1;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 7px 14px;
    font-size: 14px;
    color: #F4F4F5;
    outline: none;
  }

  .quick-entry-input:focus { border-color: var(--kanso-accent, #38BDF8); }

  .quick-entry-btn {
    background: var(--kanso-accent, #38BDF8);
    border: 1px solid var(--kanso-accent, #38BDF8);
    border-radius: 6px;
    color: #09090B;
    font-size: 13.5px;
    font-weight: 700;
    padding: 0 16px;
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
    padding: 10px 14px;
    font-size: 14px;
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
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
  }

  .entry-text { flex: 1; }

  .empty-state {
    padding: 30px 10px;
    text-align: center;
    color: var(--kanso-text-muted, #71717A);
    font-size: 13px;
  }

  .raw-textarea {
    width: 100%;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    color: #F4F4F5;
    font-family: ui-monospace, monospace;
    font-size: 14px;
    line-height: 1.6;
    padding: 14px;
    outline: none;
    box-sizing: border-box;
  }

  /* Telemetry Bento Grid */
  .telemetry-bento-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 16px;
  }

  @media (min-width: 900px) {
    .telemetry-bento-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .bento-card {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .bento-card.bento-wide {
    grid-column: span 2;
  }

  .bento-icon {
    font-size: 20px;
  }

  .bento-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .bento-val {
    font-size: 20px;
    font-weight: 800;
    color: var(--kanso-text-primary, #F4F4F5);
    font-family: ui-monospace, monospace;
    letter-spacing: -0.02em;
  }

  .bento-label {
    font-size: 12.5px;
    color: var(--kanso-text-muted, #71717A);
  }

  .progress-track {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 9999px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: var(--kanso-accent, #38BDF8);
    border-radius: 9999px;
    transition: width 0.3s ease;
  }

  /* Review Section Boxes & Mini Forms */
  .rsection-box {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 10px;
    padding: 16px;
  }

  .review-col-left, .review-col-right {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .item-del-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted, #71717A);
    cursor: pointer;
    font-size: 12.5px;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .item-del-btn:hover {
    color: var(--kanso-danger, #EF4444);
    background: rgba(239, 68, 68, 0.1);
  }

  .add-mini-form {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .mini-input {
    flex: 1;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 7px 12px;
    font-size: 13.5px;
    color: var(--kanso-text-primary, #F4F4F5);
    outline: none;
  }

  .mini-input:focus {
    border-color: var(--kanso-accent, #38BDF8);
  }

  .mini-add-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    color: var(--kanso-text-primary, #F4F4F5);
    padding: 0 14px;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
  }

  .mini-add-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  /* Client Distribution Grid */
  .client-dist-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-top: 10px;
  }

  .client-dist-card {
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .cdist-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .cdist-code {
    font-weight: 800;
    font-size: 12px;
    color: var(--kanso-accent, #38BDF8);
  }

  .cdist-pct {
    font-size: 12px;
    font-family: ui-monospace, monospace;
    font-weight: 700;
    background: rgba(56, 189, 248, 0.12);
    color: var(--kanso-accent, #38BDF8);
    padding: 2px 7px;
    border-radius: 4px;
  }

  .cdist-name {
    font-size: 13px;
    color: var(--kanso-text-primary, #F4F4F5);
    font-weight: 600;
  }

  .cdist-footer {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .cdist-rev {
    color: var(--kanso-text-primary, #F4F4F5);
    font-family: ui-monospace, monospace;
    font-weight: 600;
  }
</style>
