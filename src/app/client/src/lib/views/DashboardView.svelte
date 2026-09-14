<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { journalService, type DailyNote, type BujoEntry } from '$lib/services/journalService';
  import { zettelService } from '$lib/services/zettelService';
  import type { ZettelTask } from '$lib/types/zettel';
  import { financeService } from '$lib/services/financeService';
  import { clientService } from '$lib/services/clientService';
  import { appState } from '$lib/stores/appState.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import type { Project } from '$lib/types';

  // --- STATE ---
  let dailyNote = $state<DailyNote>(journalService.getDailyNote());
  let newTaskInput = $state('');
  let incomeSummary = $state(financeService.getIncomeSummary());
  let clients = $state(clientService.getClients());
  let hasPreviousTasks = $state(false);
  let isMigrating = $state(false);
  let taskMode = $state<'bujo' | 'universal'>('bujo');
  let universalTasks = $state<ZettelTask[]>([]);

  onMount(async () => {
    await projectStore.loadProjects();
    await projectStore.loadDashboard();
    dailyNote = journalService.getDailyNote();
    incomeSummary = financeService.getIncomeSummary();
    clients = clientService.getClients();
    hasPreviousTasks = journalService.hasUnfinishedPreviousTasks(dailyNote.date);
    universalTasks = await zettelService.loadUniversalTasksFromDisk();
  });

  // --- DERIVED METRICS ---
  const todayTasks = $derived(
    dailyNote.entries.filter(e => e.type === 'task' || e.type === 'priority' || e.type === 'done')
  );

  const completedTaskCount = $derived(
    todayTasks.filter(t => t.completed || t.type === 'done').length
  );

  const totalIncomeWithTimer = $derived(
    incomeSummary.paid + incomeSummary.pending + timerStore.earnings
  );

  const todayFocusHours = $derived(timerStore.getTodayHours());
  const weekFocusHours = $derived(timerStore.getWeekHours());

  // --- CRAFT METRICS (DYNAMIC COMPUTATION) ---
  const firstTimeRightPercent = $derived.by(() => {
    if (projectStore.dashboardData?.slaMetrics?.firstTimeRightPercent != null) {
      return projectStore.dashboardData.slaMetrics.firstTimeRightPercent;
    }
    const completed = (projectStore.projects || []).filter(p => p.status === 'done' || p.status === 'approved');
    if (completed.length > 0) {
      const zeroRev = completed.filter(p => (p.revision || 0) === 0).length;
      return Number(((zeroRev / completed.length) * 100).toFixed(1));
    }
    return 92.4; // Canonical studio baseline
  });

  const turnaroundDays = $derived.by(() => {
    if (projectStore.dashboardData?.slaMetrics?.avgTurnaroundDays != null) {
      return projectStore.dashboardData.slaMetrics.avgTurnaroundDays;
    }
    const completed = (projectStore.projects || []).filter(p => p.status === 'done' || p.status === 'approved');
    let totalDays = 0;
    let count = 0;
    for (const p of completed) {
      if (p.created && p.deadline) {
        const start = new Date(p.created).getTime();
        const end = new Date(p.deadline).getTime();
        const diff = Math.max(0.5, (end - start) / (1000 * 60 * 60 * 24));
        totalDays += diff;
        count++;
      }
    }
    if (count > 0) {
      return Number((totalDays / count).toFixed(1));
    }
    return 2.8; // Canonical studio baseline
  });

  const avgRevisionRounds = $derived.by(() => {
    if (projectStore.dashboardData?.slaMetrics?.avgRevisionCount != null) {
      return projectStore.dashboardData.slaMetrics.avgRevisionCount;
    }
    const projects = projectStore.projects || [];
    if (projects.length > 0) {
      const totalRevs = projects.reduce((acc, p) => acc + (p.revision || 0), 0);
      return Number((totalRevs / projects.length).toFixed(1));
    }
    return 1.2; // Canonical studio baseline
  });

  // --- SMART SUGGESTIONS (CONTEXTUAL CREATIVE INTELLIGENCE) ---
  const unbilledSuggestion = $derived.by(() => {
    if (timerStore.isRunning) {
      return {
        type: 'sky',
        header: 'Live Billable Session',
        body: `Accruing +${settingsStore.settings.currencySymbol || 'RM'}${(timerStore.earnings || 0).toFixed(2)} (${timerStore.elapsedFormatted}) on [${timerStore.clientCode}]. Stop timer anytime to auto-append into draft invoice.`,
        actionText: 'Review Invoices →',
        actionHref: '#invoices',
        isPlayTrigger: false
      };
    } else if ((timerStore.earnings || 0) > 0 || timerStore.elapsedSeconds > 0) {
      return {
        type: 'sky',
        header: 'Unbilled Session Saved',
        body: `You have ${timerStore.elapsedFormatted} (+${settingsStore.settings.currencySymbol || 'RM'}${(timerStore.earnings || 0).toFixed(2)}) ready to be billed for [${timerStore.clientCode}].`,
        actionText: 'Open Invoice Studio →',
        actionHref: '#invoices',
        isPlayTrigger: false
      };
    } else if (incomeSummary.pending > 0) {
      return {
        type: 'amber',
        header: 'Pending Receivables',
        body: `${settingsStore.settings.currencySymbol || 'RM'}${incomeSummary.pending.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} awaiting client settlement. Check payment terms in Draft Invoices.`,
        actionText: 'View Invoices →',
        actionHref: '#invoices',
        isPlayTrigger: false
      };
    } else {
      return {
        type: 'sky',
        header: 'Timer Ready',
        body: `Ready for creative sprint at ${settingsStore.settings.currencySymbol || 'RM'}${timerStore.hourlyRate}/hr on [${timerStore.clientCode}]. Start timer to track billable focus in real time.`,
        actionText: 'Start Billable Timer →',
        actionHref: '#invoices',
        isPlayTrigger: true
      };
    }
  });

  const reviewSuggestion = $derived.by(() => {
    const reviewProjects = (projectStore.projects || []).filter(p => p.status === 'review');
    if (reviewProjects.length > 0) {
      const first = reviewProjects[0];
      return {
        type: 'amber',
        header: `${reviewProjects.length} Proof${reviewProjects.length > 1 ? 's' : ''} in Review`,
        body: `"${first.title}" (${first.client || first.brand}) is awaiting client signoff. Check deliverables queue for comments and revisions.`,
        actionText: 'Open Review Queue →',
        actionHref: '#projects'
      };
    }
    return {
      type: 'emerald',
      header: 'Zero Review Bottlenecks',
      body: 'All client proofs are approved or in production. No outstanding signoffs blocking delivery pipelines.',
      actionText: 'View All Projects →',
      actionHref: '#projects'
    };
  });

  const deadlineSuggestion = $derived.by(() => {
    const now = new Date();
    const candidateList = projectStore.projects && projectStore.projects.length > 0 ? projectStore.projects : activeProjects;
    const activeWithDeadlines = candidateList
      .filter(p => p.status !== 'done' && p.status !== 'approved' && p.deadline)
      .map(p => {
        const target = new Date(p.deadline!);
        const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...p, diffDays };
      })
      .sort((a, b) => a.diffDays - b.diffDays);

    if (activeWithDeadlines.length > 0) {
      const nearest = activeWithDeadlines[0];
      if (nearest.diffDays < 0) {
        return {
          type: 'rose',
          header: 'Milestone Overdue',
          body: `"${nearest.title}" (${nearest.brand}) was due ${Math.abs(nearest.diffDays)} day${Math.abs(nearest.diffDays) === 1 ? '' : 's'} ago. Review deliverable checklist in 04_WIP/.`,
          actionText: 'Check Sprint →',
          actionHref: '#projects'
        };
      } else if (nearest.diffDays <= 3) {
        return {
          type: 'rose',
          header: `Delivery Due ${nearest.diffDays === 0 ? 'Today' : `in ${nearest.diffDays}d`}`,
          body: `"${nearest.title}" (${nearest.brand}) is due ${nearest.diffDays === 0 ? 'today' : `in ${nearest.diffDays} day(s)`}. Preflight exports in 05_DELIVERABLES/ for handover.`,
          actionText: 'Inspect Deliverables →',
          actionHref: '#projects'
        };
      } else {
        return {
          type: 'sky',
          header: `Next Milestone (${nearest.diffDays}d left)`,
          body: `"${nearest.title}" (${nearest.brand}) target deadline is ${nearest.deadline}. Sprint velocity is on track.`,
          actionText: 'View Project Brief →',
          actionHref: '#projects'
        };
      }
    }

    return {
      type: 'emerald',
      header: 'Sprints On Schedule',
      body: 'No urgent project deadlines within the next 7 days. Ample studio buffer for deep craft & design iteration.',
      actionText: 'Explore Projects →',
      actionHref: '#projects'
    };
  });

  const wellnessSuggestion = $derived.by(() => {
    if (timerStore.elapsedSeconds >= 3000) {
      return {
        type: 'emerald',
        header: 'Mindful Breather Due',
        body: `You've maintained unbroken creative focus for ${(timerStore.elapsedSeconds / 60).toFixed(0)} mins. Take a 5-minute breather or box-breathing reset.`,
        actionText: 'Tune into Focus Radio →',
        isRadioTrigger: true
      };
    } else if (completedTaskCount === todayTasks.length && todayTasks.length > 0) {
      return {
        type: 'emerald',
        header: 'Daily Intentions Cleared',
        body: `All ${todayTasks.length} daily BuJo tasks completed. Reflect on key learnings or log evening thoughts in the Bullet Journal.`,
        actionText: 'Open Daily Journal →',
        actionHref: '#journal',
        isRadioTrigger: false
      };
    } else if (todayFocusHours > 4) {
      return {
        type: 'emerald',
        header: 'High Velocity Day',
        body: `${todayFocusHours}h of deep creative craft logged today. Pace yourself and maintain ergonomic posture.`,
        actionText: 'Tune into Focus Radio →',
        isRadioTrigger: true
      };
    } else {
      return {
        type: 'emerald',
        header: 'Zen Focus Sanctuary',
        body: 'Maintain alpha brainwave flow with curated lofi and ambient focus streams on the Retro Cassette Radio.',
        actionText: 'Tune into Focus Radio →',
        isRadioTrigger: true
      };
    }
  });

  // Sample Canonical Projects if projectStore is empty
  const activeProjects = $derived.by(() => {
    if (projectStore.projects && projectStore.projects.length > 0) {
      return projectStore.projects.slice(0, 6);
    }
    return [
      {
        id: 'p1',
        jobId: '202609_0001D_ACME_MobileAppIllustration',
        title: 'Cloud Dashboard & Mobile App Illustrations',
        brand: 'ACME',
        client: 'Acme Corporation',
        status: 'in-progress',
        deadline: '2026-09-18',
        progress: 75,
        designer: '0001D'
      },
      {
        id: 'p2',
        jobId: '202609_0002S_NEX_GameKeyVisual',
        title: 'Interactive 3D Motion Key Visuals',
        brand: 'NEX',
        client: 'Nexus Studio',
        status: 'review',
        deadline: '2026-09-22',
        progress: 85,
        designer: '0001D'
      },
      {
        id: 'p3',
        jobId: '202609_0003P_LUM_BrandIdentity',
        title: 'Biotech Data Intelligence Brand System',
        brand: 'LUM',
        client: 'Lumina Labs',
        status: 'in-progress',
        deadline: '2026-09-28',
        progress: 40,
        designer: '0001D'
      }
    ];
  });

  // --- ACTIONS ---
  function toggleTask(entry: BujoEntry) {
    dailyNote = journalService.toggleTask(dailyNote.date, entry.id);
  }

  async function handleToggleUniversalTask(task: ZettelTask) {
    try {
      zettelService.toggleTask(task);
      universalTasks = [...universalTasks];
    } catch (err: any) {
      appState.addToast(`Failed to toggle task: ${err.message}`, 'error');
    }
  }

  function handleAddTask(e: KeyboardEvent) {
    if (e.key === 'Enter' && newTaskInput.trim()) {
      dailyNote = journalService.addEntry(dailyNote.date, 'task', newTaskInput.trim());
      newTaskInput = '';
    }
  }

  async function handleMigrateTasks() {
    if (isMigrating) return;
    isMigrating = true;
    try {
      const res = await journalService.migratePreviousTasks(dailyNote.date);
      dailyNote = res.note;
      hasPreviousTasks = false;
      appState.addToast(res.message, 'success');
    } catch (err: any) {
      appState.addToast(`Migration failed: ${err.message}`, 'error');
    } finally {
      isMigrating = false;
    }
  }

  function getClientColor(code: string): string {
    const c = clients.find(cl => cl.code.toUpperCase() === code.toUpperCase());
    return c?.palette.primary || '#38BDF8';
  }

  function getClientAccent(code: string): string {
    const c = clients.find(cl => cl.code.toUpperCase() === code.toUpperCase());
    return c?.palette.accent || '#38BDF8';
  }

  function getDaysRemaining(deadlineStr?: string): string {
    if (!deadlineStr) return 'No date';
    const now = new Date();
    const target = new Date(deadlineStr);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Due today';
    return `${diff}d left`;
  }
</script>

<div class="deck-container">
  <!-- Top Executive Header -->
  <header class="view-header">
    <div class="header-titles">
      <div class="header-tag">
        <span class="tag-badge">_Deck/</span>
        <span class="tag-meta">Studio Operations &amp; Telemetry</span>
      </div>
      <h1 class="view-title">Studio Deck</h1>
      <p class="view-subtitle">
        Mindful creative operations — real-time billable pulse, BuJo task rapid log, and design metrics.
      </p>
    </div>

    <!-- Active Timer Indicator Pill & Quick Links -->
    <div class="header-actions">
      {#if timerStore.isRunning}
        <div class="timer-pill running">
          <span class="pulse-dot"></span>
          <span class="timer-client">[{timerStore.clientCode}]</span>
          <span class="timer-ticker">{timerStore.elapsedFormatted || '00:00:00'}</span>
          <span class="timer-amount">(+{settingsStore.settings.currencySymbol || 'RM'}&nbsp;{(timerStore.earnings || 0).toFixed(2)})</span>
        </div>
      {:else}
        <div class="timer-pill idle">
          <span class="idle-dot"></span>
          <span>Timer Idle</span>
        </div>
      {/if}

      <a href="#journal" class="action-cta-btn" style="text-decoration: none;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span>Bullet Journal</span>
      </a>
    </div>
  </header>

  <!-- 1. TOTAL INCOME & CASHFLOW BENTO -->
  <section class="bento-section">
    <div class="section-header-row">
      <h2 class="section-title">
        <span>💰 Total Income &amp; Studio Cashflow</span>
      </h2>
      <a href="#invoices" class="section-link">View Invoice Studio &rarr;</a>
    </div>

    <div class="cashflow-grid">
      <!-- Total Pipeline Value -->
      <div class="cashflow-card">
        <div class="card-top-row">
          <span class="card-meta-label">Total Pipeline Value</span>
          <span class="card-pill sky">ALL FUNDS</span>
        </div>
        <div class="card-amount primary">
          {settingsStore.settings.currencySymbol} {totalIncomeWithTimer.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p class="card-sub">Settled + Pending + Accrued</p>
      </div>

      <!-- Paid Invoices -->
      <div class="cashflow-card">
        <div class="card-top-row">
          <span class="card-meta-label">Settled &amp; Paid</span>
          <span class="card-pill emerald">CLEARED</span>
        </div>
        <div class="card-amount emerald">
          {settingsStore.settings.currencySymbol} {incomeSummary.paid.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p class="card-sub">Deposited directly to studio bank</p>
      </div>

      <!-- Pending Invoices -->
      <div class="cashflow-card">
        <div class="card-top-row">
          <span class="card-meta-label">Pending Invoices</span>
          <span class="card-pill amber">AWAITING</span>
        </div>
        <div class="card-amount amber">
          {settingsStore.settings.currencySymbol} {incomeSummary.pending.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p class="card-sub">Sent proofs &amp; signed drafts</p>
      </div>

      <!-- Live Accrued Today -->
      <div class="cashflow-card">
        <div class="card-top-row">
          <span class="card-meta-label">Live Accrued Today</span>
          {#if timerStore.isRunning}
            <span class="card-pill emerald-pulse">RECORDING</span>
          {:else}
            <span class="card-pill muted">READY</span>
          {/if}
        </div>
        <div class="card-amount accent">
          +{settingsStore.settings.currencySymbol} {(timerStore.earnings || 0).toFixed(2)}
        </div>
        <p class="card-sub">{timerStore.elapsedFormatted || '00:00:00'} logged today</p>
      </div>
    </div>
  </section>

  <!-- 2-COLUMN MAIN BODY: Tasks & Craft Metrics -->
  <div class="main-two-col">
    <!-- LEFT: TODAY'S TASKS (BuJo Rapid Log) -->
    <div class="tasks-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">
            <span>⚡ Tasks</span>
            {#if taskMode === 'bujo'}
              <span class="panel-title-sub">({dailyNote.date})</span>
            {:else}
              <span class="panel-title-sub">(_Notes/ Rollup)</span>
            {/if}
          </h2>
          <p class="panel-subtitle">
            {#if taskMode === 'bujo'}
              Synced in real-time with BuJo Daily Notes (<code class="path-code">_Journal/Daily/</code>)
            {:else}
              Discovered from all atomic cards across <code class="path-code">_Notes/</code>
            {/if}
          </p>
        </div>

        <div class="panel-header-controls">
          <div class="mode-switcher">
            <button
              onclick={() => (taskMode = 'bujo')}
              class="mode-btn"
              class:active={taskMode === 'bujo'}
            >
              Daily ({todayTasks.length})
            </button>
            <button
              onclick={() => (taskMode = 'universal')}
              class="mode-btn"
              class:active={taskMode === 'universal'}
            >
              Universal ({universalTasks.length})
            </button>
          </div>
          <span class="counter-badge">
            {#if taskMode === 'bujo'}
              {completedTaskCount}/{todayTasks.length}
            {:else}
              {universalTasks.filter(t => t.completed).length}/{universalTasks.length}
            {/if}
          </span>
        </div>
      </div>

      {#if taskMode === 'bujo'}
        <!-- Daily Intentions Chips -->
        {#if dailyNote.focusIntentions && dailyNote.focusIntentions.length > 0}
          <div class="intentions-row">
            <span class="intentions-label">🎯 Intentions:</span>
            {#each dailyNote.focusIntentions as intention}
              <span class="intention-chip">{intention}</span>
            {/each}
          </div>
        {/if}

        <!-- Rollover banner -->
        {#if hasPreviousTasks}
          <div class="rollover-banner">
            <div class="rollover-text">
              <span class="bujo-symbol">• [>]</span>
              <span>Unfinished tasks from yesterday detected</span>
            </div>
            <button
              onclick={handleMigrateTasks}
              disabled={isMigrating}
              class="migrate-btn"
            >
              {#if isMigrating}
                <span>Migrating...</span>
              {:else}
                <span>Migrate to Today &rarr;</span>
              {/if}
            </button>
          </div>
        {/if}

        <!-- Task Items List -->
        <div class="task-list">
          {#each todayTasks as entry (entry.id)}
            <div class="task-row">
              <input
                type="checkbox"
                checked={entry.completed || entry.type === 'done'}
                onchange={() => toggleTask(entry)}
                class="task-check"
              />
              <span class="task-label" class:completed={entry.completed || entry.type === 'done'}>
                {entry.text}
              </span>
              {#if entry.type === 'priority'}
                <span class="priority-badge">* Priority</span>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Quick Task Input -->
        <div class="task-adder-row">
          <div class="input-wrap">
            <span class="input-symbol" aria-hidden="true">• [ ]</span>
            <input
              type="text"
              bind:value={newTaskInput}
              onkeydown={handleAddTask}
              placeholder="Add task to today's rapid log (Press Enter)..."
              class="task-text-input"
            />
          </div>
          <span class="input-hint">
            Standard BuJo symbols: • Task, * Priority, o Event, - Note
          </span>
        </div>
      {:else}
        <!-- Universal Notes Task Rollup List -->
        {#if universalTasks.length === 0}
          <div class="empty-state-box">
            No active <code>#task</code> items found in <code class="path-code">_Notes/</code>.
          </div>
        {:else}
          <div class="task-list">
            {#each universalTasks as uTask (uTask.id)}
              <div class="task-row">
                <input
                  type="checkbox"
                  checked={uTask.completed}
                  onchange={() => handleToggleUniversalTask(uTask)}
                  class="task-check"
                />
                <span class="task-label" class:completed={uTask.completed}>
                  {uTask.description || uTask.rawText}
                </span>
                <span class="wikilink-badge">
                  [[{uTask.sourceNoteTitle || uTask.sourceNoteId}]]
                </span>
                {#if uTask.priority === 'urgent' || uTask.priority === 'high'}
                  <span class="priority-badge">* {uTask.priority}</span>
                {/if}
                {#if uTask.dueDate}
                  <span class="due-badge">📅 {uTask.dueDate}</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
        <div class="rollup-footer">
          <span>Synced directly to disk notes in <code class="path-code">_Notes/</code></span>
          <a href="#zettel" class="section-link">Open Atelier Notes &rarr;</a>
        </div>
      {/if}
    </div>

    <!-- RIGHT: DESIGN METRICS BENTO -->
    <div class="metrics-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">
            <span>📐 Design Craft Metrics</span>
          </h2>
          <p class="panel-subtitle">
            Atelier turnaround efficiency, revision velocity, and focused billable hours.
          </p>
        </div>
      </div>

      <div class="metrics-grid">
        <!-- Metric 1: Hours Logged Today -->
        <div class="metric-card">
          <span class="metric-label">Focus Today</span>
          <div class="metric-value">{todayFocusHours}h</div>
          <span class="metric-sub emerald">
            {timerStore.isRunning ? 'Active session recording' : 'Recorded in session deck'}
          </span>
        </div>

        <!-- Metric 2: Hours This Week -->
        <div class="metric-card">
          <span class="metric-label">Weekly Velocity</span>
          <div class="metric-value">{weekFocusHours}h</div>
          <span class="metric-sub sky">
            {weekFocusHours >= 40 ? '40h target achieved' : `${Math.round((weekFocusHours / 40) * 100)}% of 40h goal`}
          </span>
        </div>

        <!-- Metric 3: Effective Rate -->
        <div class="metric-card">
          <span class="metric-label">Effective Rate</span>
          <div class="metric-value">{settingsStore.settings.currencySymbol || 'RM'} {timerStore.hourlyRate}/hr</div>
          <span class="metric-sub muted">Tier: [{timerStore.clientCode}]</span>
        </div>

        <!-- Metric 4: First-Time-Right -->
        <div class="metric-card">
          <span class="metric-label">First-Time-Right</span>
          <div class="metric-value {firstTimeRightPercent >= 90 ? 'emerald' : firstTimeRightPercent >= 75 ? 'sky' : 'amber'}">
            {firstTimeRightPercent}%
          </div>
          <span class="metric-sub {firstTimeRightPercent >= 90 ? 'emerald' : firstTimeRightPercent >= 75 ? 'sky' : 'amber'}">
            {firstTimeRightPercent >= 90 ? 'Zero-revision excellence' : firstTimeRightPercent >= 75 ? 'Healthy approval velocity' : 'Client revision alert'}
          </span>
        </div>

        <!-- Metric 5: Turnaround Velocity -->
        <div class="metric-card">
          <span class="metric-label">Turnaround Speed</span>
          <div class="metric-value">{turnaroundDays}d</div>
          <span class="metric-sub muted">Concept to signoff</span>
        </div>

        <!-- Metric 6: Revision Rounds -->
        <div class="metric-card">
          <span class="metric-label">Avg Revisions</span>
          <div class="metric-value {avgRevisionRounds <= 1.5 ? 'emerald' : 'amber'}">
            {avgRevisionRounds} {avgRevisionRounds === 1 ? 'round' : 'rounds'}
          </div>
          <span class="metric-sub {avgRevisionRounds <= 1.5 ? 'emerald' : 'amber'}">
            {avgRevisionRounds <= 1.5 ? 'Low-friction signoffs' : 'Active feedback cycles'}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- 3. PROJECT STATUS AT A GLANCE (Visual Card Deck) -->
  <section class="bento-section">
    <div class="section-header-row">
      <div>
        <h2 class="section-title">
          <span>🎨 Active Projects at a Glance</span>
        </h2>
        <p class="panel-subtitle">
          Real-time delivery pipeline, client stage badges, and deadline countdowns.
        </p>
      </div>

      <a href="#projects" class="section-link">
        View All Projects ({activeProjects.length}) &rarr;
      </a>
    </div>

    <div class="projects-grid">
      {#each activeProjects as project (project.id)}
        <div class="project-card">
          <div class="project-card-top">
            <div class="project-tags-row">
              <span
                class="client-code-tag"
                style="background-color: {getClientColor(project.brand)}"
              >
                {project.brand}
              </span>

              <span class="stage-tag {project.status}">
                {project.status.replace('-', ' ')}
              </span>
            </div>

            <div class="project-titles-wrap">
              <h3 class="project-title">{project.title}</h3>
              <p class="project-job-id">{project.jobId}</p>
            </div>

            <div class="progress-wrap">
              <div class="progress-labels">
                <span>Progress</span>
                <span>{project.progress ?? 60}%</span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-bar"
                  style="width: {project.progress ?? 60}%; background-color: {getClientColor(project.brand)}"
                ></div>
              </div>
            </div>
          </div>

          <div class="project-card-footer">
            <span class="deadline-label">
              📅 {project.deadline || 'No deadline'}
            </span>
            <span class="days-remaining">
              {getDaysRemaining(project.deadline)}
            </span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- 4. SMART SUGGESTIONS (Creative Operations Intelligence) -->
  <section class="suggestions-panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">
          <span>💡 Smart Creative Suggestions</span>
        </h2>
        <p class="panel-subtitle">
          Contextual studio intelligence: live billable hours, review bottlenecks, approaching milestones, and mindful flow.
        </p>
      </div>
    </div>

    <div class="suggestions-grid">
      <!-- Suggestion 1: Unbilled / Live Cashflow -->
      <div class="suggestion-card">
        <div class="suggestion-header {unbilledSuggestion.type}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 16 14" />
          </svg>
          <span>{unbilledSuggestion.header}</span>
        </div>
        <p class="suggestion-body">
          {unbilledSuggestion.body}
        </p>
        {#if unbilledSuggestion.isPlayTrigger}
          <button
            type="button"
            onclick={() => timerStore.start()}
            class="suggestion-btn"
          >
            {unbilledSuggestion.actionText}
          </button>
        {:else}
          <a href={unbilledSuggestion.actionHref} class="suggestion-action">{unbilledSuggestion.actionText}</a>
        {/if}
      </div>

      <!-- Suggestion 2: Unreviewed Proofs -->
      <div class="suggestion-card">
        <div class="suggestion-header {reviewSuggestion.type}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>{reviewSuggestion.header}</span>
        </div>
        <p class="suggestion-body">
          {reviewSuggestion.body}
        </p>
        <a href={reviewSuggestion.actionHref} class="suggestion-action">{reviewSuggestion.actionText}</a>
      </div>

      <!-- Suggestion 3: Approaching Deadlines -->
      <div class="suggestion-card">
        <div class="suggestion-header {deadlineSuggestion.type}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{deadlineSuggestion.header}</span>
        </div>
        <p class="suggestion-body">
          {deadlineSuggestion.body}
        </p>
        <a href={deadlineSuggestion.actionHref} class="suggestion-action">{deadlineSuggestion.actionText}</a>
      </div>

      <!-- Suggestion 4: Mindful Creative Wellness -->
      <div class="suggestion-card">
        <div class="suggestion-header {wellnessSuggestion.type}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
          <span>{wellnessSuggestion.header}</span>
        </div>
        <p class="suggestion-body">
          {wellnessSuggestion.body}
        </p>
        {#if wellnessSuggestion.isRadioTrigger}
          <button
            type="button"
            onclick={() => window.dispatchEvent(new CustomEvent('kanso:play-radio'))}
            class="suggestion-btn"
          >
            {wellnessSuggestion.actionText}
          </button>
        {:else}
          <a href={wellnessSuggestion.actionHref} class="suggestion-action">{wellnessSuggestion.actionText}</a>
        {/if}
      </div>
    </div>
  </section>
</div>

<style>
  /* ═══ STUDIO DECK CONTAINER: 100% FULL WIDTH ═════════════════════ */
  .deck-container {
    max-width: 100%;
    margin: 0;
    padding: 0 0 48px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    box-sizing: border-box;
    width: 100%;
  }

  /* ═══ HEADER ════════════════════════════════════════════════════ */
  .deck-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--kanso-border, #27272A);
    padding-bottom: 20px;
    flex-wrap: wrap;
  }
  .header-left-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .header-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .deck-icon-badge {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.25);
    color: var(--kanso-accent, #38BDF8);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .deck-title {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
  }
  .deck-badge {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 9999px;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.28);
    color: var(--kanso-accent, #38BDF8);
    letter-spacing: 0.05em;
  }
  .deck-subtitle {
    font-size: 13.5px;
    color: var(--kanso-text-muted, #71717A);
    margin: 0;
  }
  .header-right-col {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Timer Status Pill */
  .timer-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 10px;
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 700;
  }
  .timer-pill.running {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10B981;
  }
  .timer-pill.idle {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-muted, #71717A);
  }
  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 6px #10B981;
  }
  .idle-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #71717A;
  }
  .timer-amount {
    color: #6EE7B7;
  }

  /* Quick Link Button */
  .quick-link-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border, #27272A);
    background: var(--kanso-surface, #18181B);
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s, border-color 0.15s;
  }
  .quick-link-btn:hover {
    background: var(--kanso-surface-hover, #27272A);
    border-color: var(--kanso-accent, #38BDF8);
  }

  /* ═══ BENTO SECTIONS ═════════════════════════════════════════════ */
  .bento-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .section-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .section-title {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--kanso-text-muted, #71717A);
    margin: 0;
  }
  .section-link {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-accent, #38BDF8);
    text-decoration: none;
    transition: opacity 0.14s;
  }
  .section-link:hover {
    opacity: 0.85;
    text-decoration: underline;
  }

  /* ═══ 1. CASHFLOW GRID ══════════════════════════════════════════ */
  .cashflow-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .cashflow-card {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s;
  }
  .cashflow-card:hover {
    border-color: rgba(56, 189, 248, 0.35);
  }
  .card-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .card-meta-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--kanso-text-muted, #71717A);
  }
  .card-pill {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 4px;
    letter-spacing: 0.04em;
  }
  .card-pill.sky {
    background: rgba(56, 189, 248, 0.12);
    color: #38BDF8;
    border: 1px solid rgba(56, 189, 248, 0.25);
  }
  .card-pill.emerald {
    background: rgba(16, 185, 129, 0.12);
    color: #10B981;
    border: 1px solid rgba(16, 185, 129, 0.25);
  }
  .card-pill.emerald-pulse {
    background: rgba(16, 185, 129, 0.15);
    color: #10B981;
    border: 1px solid rgba(16, 185, 129, 0.3);
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .card-pill.amber {
    background: rgba(245, 158, 11, 0.12);
    color: #F59E0B;
    border: 1px solid rgba(245, 158, 11, 0.25);
  }
  .card-pill.muted {
    background: var(--kanso-surface-hover, #27272A);
    color: var(--kanso-text-muted, #71717A);
    border: 1px solid var(--kanso-border, #27272A);
  }
  .card-amount {
    font-family: var(--font-mono, monospace);
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  .card-amount.primary { color: var(--kanso-text-primary, #F4F4F5); }
  .card-amount.emerald { color: #10B981; }
  .card-amount.amber   { color: #F59E0B; }
  .card-amount.accent  { color: var(--kanso-accent, #38BDF8); }
  .card-sub {
    font-size: 13px;
    color: var(--kanso-text-muted, #71717A);
    margin: 0;
  }

  /* ═══ 2. MAIN 2-COLUMN SECTION ═════════════════════════════════ */
  .main-two-col {
    display: grid;
    grid-template-columns: 7fr 5fr;
    gap: 24px;
    align-items: start;
  }

  /* Panels */
  .tasks-panel, .metrics-panel, .suggestions-panel {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--kanso-border, #27272A);
    padding-bottom: 14px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .panel-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .panel-title-sub {
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    font-weight: 400;
    color: var(--kanso-text-muted, #71717A);
  }
  .panel-subtitle {
    font-size: 13px;
    color: var(--kanso-text-muted, #71717A);
    margin: 3px 0 0 0;
  }
  .path-code {
    font-family: var(--font-mono, monospace);
    color: var(--kanso-accent, #38BDF8);
    font-size: 12.5px;
  }

  .panel-header-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .mode-switcher {
    display: flex;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    padding: 2px;
    border-radius: 8px;
    gap: 2px;
  }
  .mode-btn {
    border: none;
    background: transparent;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--kanso-text-muted, #71717A);
    cursor: pointer;
    transition: all 0.14s;
  }
  .mode-btn.active {
    background: rgba(56, 189, 248, 0.15);
    color: var(--kanso-accent, #38BDF8);
    font-weight: 700;
  }
  .counter-badge {
    font-family: var(--font-mono, monospace);
    font-size: 12.5px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(56, 189, 248, 0.1);
    color: var(--kanso-accent, #38BDF8);
    border: 1px solid rgba(56, 189, 248, 0.2);
  }

  /* Intentions row */
  .intentions-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .intentions-label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--kanso-text-muted, #71717A);
  }
  .intention-chip {
    font-size: 13px;
    padding: 4px 10px;
    border-radius: 6px;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
  }

  /* Rollover banner */
  .rollover-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-radius: 8px;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.25);
    color: #FCD34D;
    font-size: 13px;
  }
  .rollover-text {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .bujo-symbol {
    font-family: var(--font-mono, monospace);
    font-weight: 800;
    background: rgba(245, 158, 11, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
  }
  .migrate-btn {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #FDE68A;
    font-size: 12.5px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .migrate-btn:hover {
    background: rgba(245, 158, 11, 0.25);
  }

  /* Task lists */
  .task-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .task-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    transition: border-color 0.14s;
  }
  .task-row:hover {
    border-color: rgba(56, 189, 248, 0.3);
  }
  .task-check {
    width: 17px;
    height: 17px;
    accent-color: var(--kanso-accent, #38BDF8);
    cursor: pointer;
  }
  .task-label {
    font-size: 14px;
    color: var(--kanso-text-primary, #F4F4F5);
    flex: 1;
    font-weight: 500;
  }
  .task-label.completed {
    text-decoration: line-through;
    color: var(--kanso-text-muted, #71717A);
  }
  .priority-badge {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(239, 68, 68, 0.12);
    color: #F87171;
    border: 1px solid rgba(239, 68, 68, 0.25);
  }
  .wikilink-badge {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    color: var(--kanso-accent, #38BDF8);
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.2);
    padding: 2px 7px;
    border-radius: 4px;
  }
  .due-badge {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    color: #F59E0B;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
    padding: 2px 7px;
    border-radius: 4px;
  }

  /* Task adder */
  .task-adder-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 4px;
  }
  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-symbol {
    position: absolute;
    left: 12px;
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    color: var(--kanso-text-muted, #71717A);
    pointer-events: none;
  }
  .task-text-input {
    width: 100%;
    padding: 10px 14px 10px 42px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border, #27272A);
    background: var(--kanso-canvas, #09090B);
    color: var(--kanso-text-primary, #F4F4F5);
    font-family: var(--font-mono, monospace);
    font-size: 14px;
    outline: none;
    transition: border-color 0.14s;
    box-sizing: border-box;
  }
  .task-text-input:focus {
    border-color: var(--kanso-accent, #38BDF8);
  }
  .input-hint {
    font-size: 12.5px;
    color: var(--kanso-text-muted, #71717A);
  }

  .empty-state-box {
    padding: 24px;
    text-align: center;
    font-size: 13px;
    color: var(--kanso-text-muted, #71717A);
    border: 1px dashed var(--kanso-border, #27272A);
    border-radius: 8px;
  }
  .rollup-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: var(--kanso-text-muted, #71717A);
    padding-top: 4px;
  }

  /* ═══ CRAFT METRICS BENTO ══════════════════════════════════════ */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .metric-card {
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .metric-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--kanso-text-muted, #71717A);
  }
  .metric-value {
    font-family: var(--font-mono, monospace);
    font-size: 24px;
    font-weight: 800;
    color: var(--kanso-text-primary, #F4F4F5);
    letter-spacing: -0.02em;
  }
  .metric-value.emerald { color: #10B981; }
  .metric-value.sky     { color: #38BDF8; }
  .metric-value.amber   { color: #F59E0B; }
  .metric-sub {
    font-size: 12.5px;
    font-weight: 500;
  }
  .metric-sub.emerald { color: #10B981; }
  .metric-sub.sky     { color: #38BDF8; }
  .metric-sub.amber   { color: #F59E0B; }
  .metric-sub.muted   { color: var(--kanso-text-muted, #71717A); }

  /* ═══ 3. ACTIVE PROJECTS GRID ══════════════════════════════════ */
  .projects-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }
  .project-card {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
    transition: border-color 0.15s;
  }
  .project-card:hover {
    border-color: rgba(56, 189, 248, 0.4);
  }
  .project-card-top {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .project-tags-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .client-code-tag {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 800;
    color: #FFFFFF;
    padding: 3px 8px;
    border-radius: 6px;
    letter-spacing: 0.04em;
  }
  .stage-tag {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .stage-tag.in-progress {
    background: rgba(56, 189, 248, 0.12);
    color: #38BDF8;
    border: 1px solid rgba(56, 189, 248, 0.25);
  }
  .stage-tag.review {
    background: rgba(245, 158, 11, 0.12);
    color: #F59E0B;
    border: 1px solid rgba(245, 158, 11, 0.25);
  }
  .stage-tag.revision {
    background: rgba(239, 68, 68, 0.12);
    color: #F87171;
    border: 1px solid rgba(239, 68, 68, 0.25);
  }
  .stage-tag.done {
    background: rgba(16, 185, 129, 0.12);
    color: #10B981;
    border: 1px solid rgba(16, 185, 129, 0.25);
  }
  .project-titles-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .project-title {
    font-size: 15.5px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
    line-height: 1.35;
  }
  .project-job-id {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .progress-wrap {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .progress-labels {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
  }
  .progress-track {
    width: 100%;
    height: 6px;
    border-radius: 9999px;
    background: var(--kanso-canvas, #09090B);
    overflow: hidden;
  }
  .progress-bar {
    height: 100%;
    border-radius: 9999px;
    transition: width 0.3s ease;
  }
  .project-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--kanso-border, #27272A);
    padding-top: 12px;
    font-size: 13px;
  }
  .deadline-label {
    color: var(--kanso-text-muted, #71717A);
  }
  .days-remaining {
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  /* ═══ 4. SMART SUGGESTIONS ══════════════════════════════════════ */
  .suggestions-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .suggestion-card {
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 10px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .suggestion-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
  }
  .suggestion-header.sky     { color: #38BDF8; }
  .suggestion-header.amber   { color: #F59E0B; }
  .suggestion-header.rose    { color: #F87171; }
  .suggestion-header.emerald { color: #10B981; }

  .suggestion-body {
    font-size: 13.5px;
    color: var(--kanso-text-muted, #71717A);
    line-height: 1.5;
    margin: 0;
    flex: 1;
  }
  .suggestion-action {
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-accent, #38BDF8);
    text-decoration: none;
    display: inline-block;
  }
  .suggestion-action:hover {
    text-decoration: underline;
  }
  .suggestion-btn {
    border: none;
    background: transparent;
    padding: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-accent, #38BDF8);
    text-align: left;
    cursor: pointer;
  }
  .suggestion-btn:hover {
    text-decoration: underline;
  }

  /* ═══ RESPONSIVE BREAKPOINTS: FULL-WIDTH SPACE SCALING ═════════ */
  @media (min-width: 1440px) {
    .metrics-grid { grid-template-columns: repeat(3, 1fr); }
    .projects-grid { grid-template-columns: repeat(3, 1fr); }
  }

  @media (min-width: 1800px) {
    .projects-grid { grid-template-columns: repeat(4, 1fr); }
    .suggestions-grid { grid-template-columns: repeat(4, 1fr); }
  }

  @media (max-width: 1100px) {
    .cashflow-grid { grid-template-columns: repeat(2, 1fr); }
    .main-two-col  { grid-template-columns: 1fr; }
    .projects-grid { grid-template-columns: repeat(2, 1fr); }
    .suggestions-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 700px) {
    .deck-container { padding: 0 0 24px; gap: 20px; }
    .cashflow-grid  { grid-template-columns: 1fr; }
    .projects-grid  { grid-template-columns: 1fr; }
    .suggestions-grid { grid-template-columns: repeat(2, 1fr); }
    .metrics-grid   { grid-template-columns: 1fr; }
  }
</style>
