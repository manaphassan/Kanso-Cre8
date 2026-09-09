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

  // Sample Canonical Projects if projectStore is empty
  const activeProjects = $derived.by(() => {
    if (projectStore.projects && projectStore.projects.length > 0) {
      return projectStore.projects.slice(0, 6);
    }
    return [
      {
        id: 'p1',
        jobId: '202609_0001D_ACME_MobileAppIllustration',
        title: 'Mobile Banking 3D Isometric Illustrations',
        brand: 'ACME',
        client: 'Acme Corporation',
        status: 'in-progress',
        deadline: '2026-09-18',
        progress: 65,
        designer: '0001D'
      },
      {
        id: 'p2',
        jobId: '202609_0002D_NEX_GameKeyVisual',
        title: 'Cyberpunk Game Launch Key Visuals & Motion',
        brand: 'NEX',
        client: 'Nexus Studio',
        status: 'review',
        deadline: '2026-09-22',
        progress: 85,
        designer: '0001D'
      },
      {
        id: 'p3',
        jobId: '202609_0003D_LUM_SyntheticBrandSystem',
        title: 'Synthetic Intelligence Brand Identity & Assets',
        brand: 'LUM',
        client: 'Lumina Labs',
        status: 'in-progress',
        deadline: '2026-09-28',
        progress: 30,
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
      const updated = await zettelService.toggleTask(task.id);
      universalTasks = universalTasks.map(t => t.id === task.id ? updated : t);
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

<div class="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
  <!-- Top Executive Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
    <div>
      <div class="flex items-center gap-3">
        <span class="p-2 rounded-lg bg-primary/10 text-primary">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </span>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">
          Studio Deck
        </h1>
        <span class="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
          EXECUTIVE VIEW
        </span>
      </div>
      <p class="text-sm text-muted-foreground mt-1">
        Mindful creative operations — real-time billable pulse, BuJo task rapid log, and design metrics.
      </p>
    </div>

    <!-- Active Timer Indicator Pill -->
    <div class="flex items-center gap-3">
      {#if timerStore.isRunning}
        <div class="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold shadow-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>[{timerStore.clientCode}]</span>
          <span>{timerStore.elapsedFormatted || '00:00:00'}</span>
          <span class="text-emerald-300">(+${(timerStore.earnings || 0).toFixed(2)})</span>
        </div>
      {:else}
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground text-xs font-mono">
          <span class="w-2 h-2 rounded-full bg-zinc-500"></span>
          <span>Timer Idle</span>
        </div>
      {/if}

      <a
        href="#journal"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground text-xs font-semibold transition-colors shadow-2xs"
      >
        <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        Bullet Journal
      </a>
    </div>
  </div>

  <!-- 1. TOTAL INCOME & CASHFLOW BENTO -->
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <span>💰 Total Income &amp; Studio Cashflow</span>
      </h2>
      <a href="#invoices" class="text-xs text-primary hover:underline font-medium">View Invoice Studio &rarr;</a>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Cashflow -->
      <div class="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground font-medium">Total Pipeline Value</span>
          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold">ALL FUNDS</span>
        </div>
        <div class="text-2xl font-bold font-mono text-foreground tracking-tight">
          ${totalIncomeWithTimer.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p class="text-[11px] text-muted-foreground">
          Settled + Pending + Accrued
        </p>
      </div>

      <!-- Paid Invoices -->
      <div class="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground font-medium">Settled &amp; Paid</span>
          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">CLEARED</span>
        </div>
        <div class="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
          ${incomeSummary.paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p class="text-[11px] text-muted-foreground">
          Deposited directly to studio bank
        </p>
      </div>

      <!-- Pending Invoices -->
      <div class="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground font-medium">Pending Invoices</span>
          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">AWAITING</span>
        </div>
        <div class="text-2xl font-bold font-mono text-amber-400 tracking-tight">
          ${incomeSummary.pending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p class="text-[11px] text-muted-foreground">
          Sent proofs &amp; signed milestone drafts
        </p>
      </div>

      <!-- Live Accrued Today -->
      <div class="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground font-medium">Live Accrued Today</span>
          {#if timerStore.isRunning}
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold animate-pulse">RECORDING</span>
          {:else}
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">READY</span>
          {/if}
        </div>
        <div class="text-2xl font-bold font-mono text-sky-400 tracking-tight">
          +${(timerStore.earnings || 0).toFixed(2)}
        </div>
        <p class="text-[11px] text-muted-foreground">
          {timerStore.elapsedFormatted || '00:00:00'} logged today
        </p>
      </div>
    </div>
  </div>

  <!-- 2-COLUMN MAIN BODY: Tasks & Metrics -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
    
    <!-- LEFT: TODAY'S TASKS (BuJo Rapid Log) (7 Cols) -->
    <div class="lg:col-span-7 rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
      <div class="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 class="text-base font-bold text-foreground flex items-center gap-2">
            <span>⚡ Tasks</span>
            {#if taskMode === 'bujo'}
              <span class="text-xs font-mono font-normal text-muted-foreground">({dailyNote.date})</span>
            {:else}
              <span class="text-xs font-mono font-normal text-muted-foreground">(_Notes/ Rollup)</span>
            {/if}
          </h2>
          <p class="text-xs text-muted-foreground mt-0.5">
            {#if taskMode === 'bujo'}
              Synced in real-time with BuJo Daily Notes (<span class="font-mono text-primary">_Journal/Daily/</span>)
            {:else}
              Discovered from all atomic cards across <span class="font-mono text-primary">_Notes/</span>
            {/if}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center p-0.5 rounded-lg border border-border bg-background">
            <button
              onclick={() => taskMode = 'bujo'}
              class="px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer {taskMode === 'bujo' ? 'bg-primary/20 text-primary font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
            >
              Daily ({todayTasks.length})
            </button>
            <button
              onclick={() => taskMode = 'universal'}
              class="px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer {taskMode === 'universal' ? 'bg-primary/20 text-primary font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
            >
              Universal ({universalTasks.length})
            </button>
          </div>
          <span class="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono font-bold">
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
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase">🎯 Intentions:</span>
            {#each dailyNote.focusIntentions as intention}
              <span class="text-xs px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-foreground font-medium">
                {intention}
              </span>
            {/each}
          </div>
        {/if}

        <!-- Task Items List -->
        {#if hasPreviousTasks}
          <div class="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 animate-fadeIn">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">• [>]</span>
              <span>Unfinished tasks from yesterday detected</span>
            </div>
            <button
              onclick={handleMigrateTasks}
              disabled={isMigrating}
              class="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {#if isMigrating}
                <span>Migrating...</span>
              {:else}
                <span>Migrate to Today &rarr;</span>
              {/if}
            </button>
          </div>
        {/if}

        <div class="space-y-2.5">
          {#each todayTasks as entry (entry.id)}
            <div class="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/40 transition-colors group">
              <input
                type="checkbox"
                checked={entry.completed || entry.type === 'done'}
                onchange={() => toggleTask(entry)}
                class="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer"
              />
              <span class="text-xs flex-1 {(entry.completed || entry.type === 'done') ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}">
                {entry.text}
              </span>
              {#if entry.type === 'priority'}
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold">
                  * Priority
                </span>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Quick Task Adder Input -->
        <div class="pt-2">
          <div class="relative">
            <input
              type="text"
              bind:value={newTaskInput}
              onkeydown={handleAddTask}
              placeholder="Add task to today's rapid log (Press Enter)..."
              class="w-full px-3.5 py-2.5 pl-9 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:border-primary transition-colors font-mono"
            />
            <span class="text-muted-foreground text-xs absolute left-3 top-3">
              • [ ]
            </span>
          </div>
          <span class="text-[10px] text-muted-foreground mt-1 block">
            Uses standard BuJo notation: • Task, * Priority, o Event, - Note
          </span>
        </div>
      {:else}
        <!-- Universal Notes Task Rollup List -->
        {#if universalTasks.length === 0}
          <div class="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            No active `#task` items found in <code class="font-mono text-primary">_Notes/</code>.
          </div>
        {:else}
          <div class="space-y-2.5">
            {#each universalTasks as uTask (uTask.id)}
              <div class="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/40 transition-colors group">
                <input
                  type="checkbox"
                  checked={uTask.completed}
                  onchange={() => handleToggleUniversalTask(uTask)}
                  class="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer"
                />
                <span class="text-xs flex-1 {uTask.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}">
                  {uTask.text}
                </span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/50 border border-border text-muted-foreground">
                  [[{uTask.sourceTitle || uTask.sourceNoteId}]]
                </span>
                {#if uTask.priority === 'urgent' || uTask.priority === 'high'}
                  <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold">
                    * {uTask.priority}
                  </span>
                {/if}
                {#if uTask.dueDate}
                  <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">
                    📅 {uTask.dueDate}
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
        <div class="pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Synced directly to disk notes in <code class="font-mono text-primary">_Notes/</code></span>
          <a href="#zettel" class="text-primary hover:underline">Open Atelier Notes &rarr;</a>
        </div>
      {/if}
    </div>

    <!-- RIGHT: DESIGN METRICS BENTO (5 Cols) -->
    <div class="lg:col-span-5 rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
      <div class="border-b border-border pb-4">
        <h2 class="text-base font-bold text-foreground flex items-center gap-2">
          <span>📐 Design Craft Metrics</span>
        </h2>
        <p class="text-xs text-muted-foreground mt-0.5">
          Atelier turnaround efficiency, revision velocity, and focused billable hours.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3.5">
        <!-- Metric 1: Hours Logged Today -->
        <div class="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
          <span class="text-[11px] text-muted-foreground font-medium">Focus Today</span>
          <div class="text-xl font-bold font-mono text-foreground">
            {todayFocusHours}h
          </div>
          <span class="text-[10px] text-emerald-400 font-medium">Recorded in session deck</span>
        </div>

        <!-- Metric 2: Hours This Week -->
        <div class="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
          <span class="text-[11px] text-muted-foreground font-medium">Weekly Velocity</span>
          <div class="text-xl font-bold font-mono text-foreground">
            {weekFocusHours}h
          </div>
          <span class="text-[10px] text-sky-400 font-medium">On track (40h goal)</span>
        </div>

        <!-- Metric 3: Effective Rate -->
        <div class="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
          <span class="text-[11px] text-muted-foreground font-medium">Effective Rate</span>
          <div class="text-xl font-bold font-mono text-foreground">
            ${timerStore.hourlyRate}/hr
          </div>
          <span class="text-[10px] text-muted-foreground">Active client tier</span>
        </div>

        <!-- Metric 4: First-Time-Right -->
        <div class="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
          <span class="text-[11px] text-muted-foreground font-medium">First-Time-Right</span>
          <div class="text-xl font-bold font-mono text-emerald-400">
            92.4%
          </div>
          <span class="text-[10px] text-emerald-400 font-medium">High proof accuracy</span>
        </div>

        <!-- Metric 5: Turnaround Velocity -->
        <div class="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
          <span class="text-[11px] text-muted-foreground font-medium">Turnaround Speed</span>
          <div class="text-xl font-bold font-mono text-foreground">
            2.8 days
          </div>
          <span class="text-[10px] text-muted-foreground">Concept to signoff</span>
        </div>

        <!-- Metric 6: Revision Rounds -->
        <div class="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
          <span class="text-[11px] text-muted-foreground font-medium">Avg Revisions</span>
          <div class="text-xl font-bold font-mono text-foreground">
            1.2 rounds
          </div>
          <span class="text-[10px] text-emerald-400 font-medium">Low friction workflow</span>
        </div>
      </div>
    </div>

  </div>

  <!-- 3. PROJECT STATUS AT A GLANCE (Visual Card Deck) -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-bold text-foreground flex items-center gap-2">
          <span>🎨 Active Projects at a Glance</span>
        </h2>
        <p class="text-xs text-muted-foreground mt-0.5">
          Real-time delivery pipeline, client stage badges, and deadline countdowns.
        </p>
      </div>

      <a href="#projects" class="text-xs text-primary hover:underline font-medium">
        View All Projects ({activeProjects.length}) &rarr;
      </a>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      {#each activeProjects as project (project.id)}
        <div class="p-5 rounded-xl border border-border bg-card shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between space-y-4">
          <div class="space-y-3">
            <!-- Header with Client Code Badge and Stage Badge -->
            <div class="flex items-center justify-between">
              <span
                class="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold text-white shadow-xs"
                style="background-color: {getClientColor(project.brand)}"
              >
                {project.brand}
              </span>

              <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold {
                project.status === 'in-progress' ? 'bg-sky-500/10 text-sky-400' :
                project.status === 'review' ? 'bg-amber-500/10 text-amber-400' :
                project.status === 'revision' ? 'bg-rose-500/10 text-rose-400' :
                'bg-emerald-500/10 text-emerald-400'
              }">
                {project.status.replace('-', ' ')}
              </span>
            </div>

            <!-- Title & Job ID -->
            <div>
              <h3 class="text-sm font-bold text-foreground leading-snug line-clamp-2">
                {project.title}
              </h3>
              <p class="text-[10px] font-mono text-muted-foreground mt-1 truncate">
                {project.jobId}
              </p>
            </div>

            <!-- Progress Bar -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Progress</span>
                <span>{project.progress || 60}%</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  style="width: {project.progress || 60}%; background-color: {getClientColor(project.brand)}"
                ></div>
              </div>
            </div>
          </div>

          <!-- Footer with Deadline Countdown -->
          <div class="pt-3 border-t border-border flex items-center justify-between text-xs">
            <span class="text-muted-foreground text-[11px]">
              📅 {project.deadline || 'No deadline'}
            </span>
            <span class="font-mono text-[11px] font-bold text-foreground">
              {getDaysRemaining(project.deadline)}
            </span>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- 4. SMART SUGGESTIONS (Creative Operations Intelligence) -->
  <div class="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
    <div class="border-b border-border pb-3">
      <h2 class="text-base font-bold text-foreground flex items-center gap-2">
        <span>💡 Smart Creative Suggestions</span>
      </h2>
      <p class="text-xs text-muted-foreground mt-0.5">
        Contextual studio intelligence: approaching deadlines, unreviewed proofs, and unbilled work.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Suggestion 1: Unbilled Hours -->
      <div class="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
        <div class="flex items-center gap-2 text-xs font-bold text-sky-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Unbilled Focus Sessions</span>
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed">
          You have recorded billable sessions today. Stop timer to append line items into draft invoice.
        </p>
        <a href="#invoices" class="inline-block text-[11px] text-primary hover:underline font-semibold">
          Review Draft Invoices &rarr;
        </a>
      </div>

      <!-- Suggestion 2: Unreviewed Proofs -->
      <div class="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
        <div class="flex items-center gap-2 text-xs font-bold text-amber-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Awaiting Client Signoff</span>
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed">
          Nexus Studio key visuals are in review stage. Ping Marcus Vance for feedback on reel cuts.
        </p>
        <a href="#clients" class="inline-block text-[11px] text-primary hover:underline font-semibold">
          Open Client Dossier &rarr;
        </a>
      </div>

      <!-- Suggestion 3: Approaching Deadlines -->
      <div class="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
        <div class="flex items-center gap-2 text-xs font-bold text-rose-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Delivery Approaching</span>
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed">
          Acme Corp 3D Illustrations due in 9 days. Preflight export checklist ready in 04_WIP/.
        </p>
        <a href="#projects" class="inline-block text-[11px] text-primary hover:underline font-semibold">
          Check Deliverables &rarr;
        </a>
      </div>

      <!-- Suggestion 4: Mindful Creative Wellness -->
      <div class="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
        <div class="flex items-center gap-2 text-xs font-bold text-emerald-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Zen Focus Wellness</span>
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed">
          Take a 5-minute breather after 50 minutes of deep craft. Listen to Retro Cassette Radio below.
        </p>
        <button
          onclick={() => window.dispatchEvent(new CustomEvent('kanso:play-radio'))}
          class="inline-block text-[11px] text-primary hover:underline font-semibold text-left"
        >
          Tune into Focus Radio &rarr;
        </button>
      </div>
    </div>
  </div>
</div>
