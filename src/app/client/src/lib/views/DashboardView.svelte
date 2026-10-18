<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { journalService, type DailyNote, type BujoEntry, type WeeklyTelemetry } from '$lib/services/journalService';
  import { notesService } from '$lib/services/notesService';
  import type { NoteTask } from '$lib/types/notes';
  import { financeService } from '$lib/services/financeService';
  import { clientService } from '$lib/services/clientService';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import DashboardCashflow from '$lib/components/dashboard/DashboardCashflow.svelte';
  import DashboardTodayTasks from '$lib/components/dashboard/DashboardTodayTasks.svelte';
  import DashboardMetricsBento from '$lib/components/dashboard/DashboardMetricsBento.svelte';
  import DashboardProjectGlance from '$lib/components/dashboard/DashboardProjectGlance.svelte';
  import DashboardSmartSuggestions from '$lib/components/dashboard/DashboardSmartSuggestions.svelte';

  let dailyNote = $state<DailyNote>(journalService.getDailyNote());
  let incomeSummary = $state(financeService.getIncomeSummary());
  let previousTaskInfo = $state<{ hasTasks: boolean; fromDate: string; count: number; tasks: BujoEntry[] }>({ hasTasks: false, fromDate: '', count: 0, tasks: [] });
  let universalTasks = $state<NoteTask[]>([]);

  async function refreshDashboardData() {
    dailyNote = journalService.getDailyNote();
    incomeSummary = financeService.getIncomeSummary();
    previousTaskInfo = await journalService.checkPendingRolloverAsync(dailyNote.date);
    universalTasks = await notesService.loadUniversalTasksFromDisk();
  }

  onMount(async () => {
    await projectStore.loadProjects();
    await projectStore.loadDashboard();
    await refreshDashboardData();
  });

  const firstTimeRightPercent = $derived.by(() => {
    if (projectStore.dashboardData?.slaMetrics?.firstTimeRightPercent != null) {
      return projectStore.dashboardData.slaMetrics.firstTimeRightPercent;
    }
    const completed = (projectStore.projects || []).filter(p => p.status === 'done' || p.status === 'approved');
    if (completed.length > 0) {
      const zeroRev = completed.filter(p => (p.revision || 0) === 0).length;
      return Number(((zeroRev / completed.length) * 100).toFixed(1));
    }
    return null;
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
    return count > 0 ? Number((totalDays / count).toFixed(1)) : null;
  });


  const unbilledSuggestion = $derived.by(() => {
    if (timerStore.isRunning) {
      return {
        type: 'sky',
        header: 'Live Billable Session',
        body: `Accruing +${settingsStore.settings.currencySymbol || 'RM'}${(timerStore.earnings || 0).toFixed(2)} on [${timerStore.clientCode}]. Stop timer to append to invoice.`,
        actionText: 'Review Invoices →',
        actionHref: '#invoices'
      };
    } else if (timerStore.unbilledCount > 0) {
      return {
        type: 'amber',
        header: 'Unbilled Atelier Time',
        body: `${timerStore.unbilledCount} session(s) (${timerStore.unbilledFormatted}, +${settingsStore.settings.currencySymbol || 'RM'}${timerStore.unbilledEarnings.toFixed(2)}) ready to append to invoice.`,
        actionText: 'Review Invoices →',
        actionHref: '#invoices'
      };
    } else if (incomeSummary.pending > 0) {
      return {
        type: 'amber',
        header: 'Pending Receivables',
        body: `${settingsStore.settings.currencySymbol || 'RM'}${incomeSummary.pending.toFixed(2)} awaiting client settlement.`,
        actionText: 'View Invoices →',
        actionHref: '#invoices'
      };
    } else {
      return {
        type: 'sky',
        header: 'Timer Ready',
        body: `Ready for sprint at ${settingsStore.settings.currencySymbol || 'RM'}${timerStore.hourlyRate}/hr on [${timerStore.clientCode}].`,
        actionText: 'Open Invoices →',
        actionHref: '#invoices'
      };
    }
  });

  const reviewSuggestion = $derived.by(() => {
    const reviewProjects = (projectStore.projects || []).filter(p => p.status === 'review');
    if (reviewProjects.length > 0) {
      const first = reviewProjects[0];
      return {
        type: 'amber',
        header: 'Unreviewed Proof Round',
        body: `"${first.title}" has deliverables in review queue.`,
        actionText: 'Inspect Proofs →',
        actionHref: `#projects/${first.id}`
      };
    }
    return {
      type: 'teal',
      header: 'Review Queue Clear',
      body: 'All client proofs approved. Workspace is primed for new briefs.',
      actionText: 'Create Project →',
      actionHref: '#projects'
    };
  });

  const deadlineSuggestion = $derived.by(() => {
    const urgent = (projectStore.projects || []).filter(p => p.deadline && p.status !== 'done' && p.status !== 'approved');
    if (urgent.length > 0) {
      const first = urgent[0];
      return {
        type: 'amber',
        header: 'Approaching Milestone',
        body: `"${first.title}" is due on ${first.deadline}.`,
        actionText: 'Open Kanban →',
        actionHref: '#projects'
      };
    }
    return {
      type: 'teal',
      header: 'Schedule on Track',
      body: 'All active project deadlines comfortably spaced.',
      actionText: 'View Timeline →',
      actionHref: '#projects'
    };
  });

  const wellnessSuggestion = $derived({
    type: 'teal',
    header: 'Focus & Cadence',
    body: 'Mindful zen pacing. Take a 5-minute break between deep focus sessions.',
    actionText: 'Tune Radio →',
    actionHref: '#radio'
  });
</script>

<div class="deck-container">
  <!-- Top Executive Header -->
  <header class="deck-header">
    <div class="header-titles">
      <h1 class="view-title">Home</h1>
      <p class="view-subtitle">Daily overview, active projects, and cashflow.</p>
    </div>
  </header>

  <!-- 1 & 2. Main 2-Column Grid: Today Tasks & Metrics Bento -->
  <div class="deck-main-grid">
    <div class="deck-column-left card-surface">
      <DashboardTodayTasks
        {dailyNote}
        {previousTaskInfo}
        onTaskUpdated={refreshDashboardData}
      />
    </div>

    <div class="deck-column-right card-surface">
      <div class="bento-header-compact">
        <h3 class="bento-title-compact">This week</h3>
      </div>
      <DashboardMetricsBento
        {firstTimeRightPercent}
        {turnaroundDays}
      />
    </div>
  </div>

  <!-- 3. Projects Status at a Glance -->
  <DashboardProjectGlance />

  <!-- 4. Smart Suggestions (one-line strip) -->
  <DashboardSmartSuggestions
    {unbilledSuggestion}
    {reviewSuggestion}
    {deadlineSuggestion}
    {wellnessSuggestion}
  />

  <!-- 5. Total Income & Cashflow -->
  <DashboardCashflow {incomeSummary} />
</div>

<style>
  .deck-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .deck-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header-titles {
    display: flex;
    flex-direction: column;
    gap: 4px;
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
  .deck-main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  @media (max-width: 900px) {
    .deck-main-grid {
      grid-template-columns: 1fr;
    }
  }
  .card-surface {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 24px;
  }
  .bento-title-compact {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
</style>
