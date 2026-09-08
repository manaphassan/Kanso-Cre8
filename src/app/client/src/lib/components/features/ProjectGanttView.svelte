<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';
  import type { Project } from '$lib/types';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  interface Props {
    projects: Project[];
  }

  let { projects }: Props = $props();

    const MALAYSIA_HOLIDAYS: Record<string, string> = {
    '2025-01-01': "New Year's Day",
    '2025-01-29': 'Chinese New Year (Day 1)',
    '2025-01-30': 'Chinese New Year (Day 2)',
    '2025-02-01': 'Federal Territory Day',
    '2025-02-11': 'Thaipusam',
    '2025-03-18': 'Nuzul Al-Quran',
    '2025-03-31': 'Hari Raya Aidilfitri (Day 1)',
    '2025-04-01': 'Hari Raya Aidilfitri (Day 2)',
    '2025-05-01': 'Labour Day',
    '2025-05-12': 'Wesak Day',
    '2025-06-02': "Agong's Birthday",
    '2025-06-07': 'Hari Raya Haji',
    '2025-06-27': 'Awal Muharram',
    '2025-08-31': 'National Day / Merdeka',
    '2025-09-05': 'Maulidur Rasul',
    '2025-09-16': 'Malaysia Day',
    '2025-10-20': 'Deepavali',
    '2025-12-25': 'Christmas Day',
    '2026-01-01': "New Year's Day",
    '2026-02-01': 'Federal Territory Day',
    '2026-02-02': 'Thaipusam',
    '2026-02-17': 'Chinese New Year (Day 1)',
    '2026-02-18': 'Chinese New Year (Day 2)',
    '2026-03-07': 'Nuzul Al-Quran',
    '2026-03-20': 'Hari Raya Aidilfitri (Day 1)',
    '2026-03-21': 'Hari Raya Aidilfitri (Day 2)',
    '2026-05-01': 'Labour Day',
    '2026-05-27': 'Hari Raya Haji',
    '2026-05-31': 'Wesak Day',
    '2026-06-01': "Agong's Birthday",
    '2026-06-17': 'Awal Muharram',
    '2026-08-26': 'Maulidur Rasul',
    '2026-08-31': 'National Day / Merdeka',
    '2026-09-16': 'Malaysia Day',
    '2026-11-08': 'Deepavali',
    '2026-12-25': 'Christmas Day',
    '2027-01-01': "New Year's Day",
    '2027-01-21': 'Thaipusam',
    '2027-02-01': 'Federal Territory Day',
    '2027-02-06': 'Chinese New Year (Day 1)',
    '2027-02-07': 'Chinese New Year (Day 2)',
    '2027-02-24': 'Nuzul Al-Quran',
    '2027-03-10': 'Hari Raya Aidilfitri (Day 1)',
    '2027-03-11': 'Hari Raya Aidilfitri (Day 2)',
    '2027-05-01': 'Labour Day',
    '2027-05-16': 'Hari Raya Haji',
    '2027-05-20': 'Wesak Day',
    '2027-06-06': 'Awal Muharram',
    '2027-06-07': "Agong's Birthday",
    '2027-08-16': 'Maulidur Rasul',
    '2027-08-31': 'National Day / Merdeka',
    '2027-09-16': 'Malaysia Day',
    '2027-10-29': 'Deepavali',
    '2027-12-25': 'Christmas Day'
  };

  function getHoliday(date: Date): string | undefined {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return MALAYSIA_HOLIDAYS[`${y}-${m}-${d}`];
  }

  function isOffDay(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6 || !!getHoliday(date);
  }

  function getOffDayReason(date: Date): string | null {
    const h = getHoliday(date);
    if (h) return `Public Holiday (${h})`;
    if (date.getDay() === 0) return 'Sunday';
    if (date.getDay() === 6) return 'Saturday';
    return null;
  }

  let currentDate = $state<Date>(new Date());

  // Derive active month days
  const monthInfo = $derived.by(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    const days: Array<{ day: number; date: Date; isToday: boolean; isWeekend: boolean; dayName: string }> = [];
    const today = new Date();

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dayName = date.toLocaleDateString(undefined, { weekday: 'narrow' });

      days.push({ day: d, date, isToday, isWeekend, dayName });
    }

    return {
      year,
      month,
      monthName: firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      totalDays,
      days
    };
  });

  function prevMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  }

  function nextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  function goToday() {
    currentDate = new Date();
  }

  function getProjectBarMetrics(project: Project) {
    const totalDays = monthInfo.totalDays;
    const year = monthInfo.year;
    const month = monthInfo.month;

    // Parse created or fallback
    let startDate = project.created ? new Date(project.created) : new Date(year, month, 1);
    let endDate = project.deadline ? new Date(project.deadline) : new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);

    if (isNaN(startDate.getTime())) startDate = new Date(year, month, 1);
    if (isNaN(endDate.getTime())) endDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Calculate day indexes (1-based)
    let startDay = 1;
    let endDay = totalDays;

    if (startDate.getFullYear() === year && startDate.getMonth() === month) {
      startDay = startDate.getDate();
    } else if (startDate > new Date(year, month + 1, 0)) {
      return null; // Starts in future month
    }

    if (endDate.getFullYear() === year && endDate.getMonth() === month) {
      endDay = endDate.getDate();
    } else if (endDate < new Date(year, month, 1)) {
      return null; // Ended in past month
    }

    if (endDay < startDay) endDay = startDay;

    const leftPercent = ((startDay - 1) / totalDays) * 100;
    const widthPercent = Math.max((1 / totalDays) * 100, ((endDay - startDay + 1) / totalDays) * 100);

    return {
      startDay,
      endDay,
      leftPercent,
      widthPercent,
      durationDays: Math.max(1, endDay - startDay + 1)
    };
  }

  function getStatusBarColor(status: string): string {
    switch (status) {
      case 'done':
      case 'approved':
        return '#107C41';
      case 'review':
        return '#8764B8';
      case 'revision':
        return '#D97706';
      case 'in-progress':
        return '#0284C7';
      default:
        return '#6B7280';
    }
  }

  function getProgressPercent(status: string): number {
    switch (status) {
      case 'done':
      case 'approved': return 100;
      case 'review': return 80;
      case 'revision': return 60;
      case 'in-progress': return 40;
      default: return 15;
    }
  }
</script>

<div class="gantt-container">
  <!-- Top Navigation & Timeline Controls -->
  <div class="gantt-header-bar">
    <div class="month-selector">
      <FluentButton appearance="subtle" onclick={prevMonth} title="Previous Month">‹ Prev</FluentButton>
      <h3 class="month-title">{monthInfo.monthName}</h3>
      <FluentButton appearance="subtle" onclick={nextMonth} title="Next Month">Next ›</FluentButton>
      <FluentButton appearance="secondary" onclick={goToday}>Today</FluentButton>
    </div>

    <div class="gantt-legend">
      <span class="legend-item"><span class="legend-dot" style="background: #0284C7;"></span> In Progress</span>
      <span class="legend-item"><span class="legend-dot" style="background: #8764B8;"></span> Review</span>
      <span class="legend-item"><span class="legend-dot" style="background: #D97706;"></span> Revision</span>
      <span class="legend-item"><span class="legend-dot" style="background: #107C41;"></span> Approved/Done</span>
    </div>
  </div>

  <!-- Timeline Grid Board -->
  <div class="gantt-board-wrapper">
    <div class="gantt-table">
      <!-- Header Row -->
      <div class="gantt-row gantt-head-row">
        <div class="gantt-col-left head-cell">
          <span>Project Workspace & Deliverable</span>
        </div>
        <div class="gantt-col-right timeline-header-grid" style="grid-template-columns: repeat({monthInfo.totalDays}, 1fr);">
          {#each monthInfo.days as day}
            <div class="day-head-cell" class:is-today={day.isToday} class:is-weekend={day.isWeekend}>
              <span class="day-num">{day.day}</span>
              <span class="day-letter">{day.dayName}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Project Rows -->
      {#if projects.length === 0}
        <div class="gantt-empty-state">
          No projects found in this schedule view.
        </div>
      {:else}
        {#each projects as p (p.id)}
          {@const bar = getProjectBarMetrics(p)}
          <div class="gantt-row project-data-row" onclick={() => appState.navigate('project-detail', { id: p.id })}>
            <!-- Left Info Column -->
            <div class="gantt-col-left">
              <div class="project-id-title-wrap">
                <span class="proj-job-mono">{p.jobId || p.id}</span>
                <FluentBadge type="brand" value={p.brand || 'SS'} />
                <span class="proj-row-title" title={p.title}>{p.title}</span>
              </div>
              <div class="proj-sub-meta">
                <span class="designer-sub">{p.designer || 'Unassigned'}</span>
                <span>•</span>
                <span class="status-sub" style="color: {getStatusBarColor(p.status)}; font-weight: 700;">
                  {p.status}
                </span>
                {#if p.revision && p.revision > 0}
                  <span class="rev-pill-small">Rev {p.revision}</span>
                {/if}
              </div>
            </div>

            <!-- Right Timeline Track -->
            <div class="gantt-col-right timeline-track-grid" style="grid-template-columns: repeat({monthInfo.totalDays}, 1fr);">
              <!-- Background Grid Columns -->
              {#each monthInfo.days as day}
                <div class="timeline-grid-col" class:is-today={day.isToday} class:is-weekend={day.isWeekend} class:is-holiday={day.isHoliday}></div>
              {/each}

              <!-- Project Schedule Bar -->
              {#if bar}
                <div
                  class="gantt-schedule-bar"
                  style="
                    left: {bar.leftPercent}%;
                    width: {bar.widthPercent}%;
                    background: {getStatusBarColor(p.status)};
                  "
                  title="{p.title} ({p.status}) - {bar.durationDays} day(s) scheduled"
                >
                  <div class="bar-progress-fill" style="width: {getProgressPercent(p.status)}%;"></div>
                  <div class="bar-content-label">
                    <span class="bar-title-text">{p.jobId}: {p.title}</span>
                    <span class="bar-days-pill">{bar.durationDays}d</span>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .gantt-container {
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    border-radius: 12px;
    padding: 16px;
    box-shadow: var(--shadow-sm);
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 220px);
    box-sizing: border-box;
  }

  .gantt-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--surface-card-border, #E5E7EB);
  }

  .month-selector {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .month-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--text-primary, #111827);
    margin: 0;
    min-width: 160px;
    text-align: center;
  }

  .gantt-legend {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 12px;
    color: var(--text-secondary, #6B7280);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  /* Timeline Table Grid */
  .gantt-board-wrapper {
    overflow-x: auto;
  }

  .gantt-table {
    min-width: 900px;
    display: flex;
    flex-direction: column;
  }

  .gantt-row {
    display: flex;
    border-bottom: 1px solid var(--surface-card-border, #E5E7EB);
    min-height: 52px;
  }

  .gantt-head-row {
    background: var(--surface-card-subtle, #F9FAFB);
    font-size: 12px;
    font-weight: 700;
    min-height: 44px;
    border-top: 1px solid var(--surface-card-border, #E5E7EB);
  }

  .project-data-row {
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .project-data-row:hover {
    background: rgba(0, 120, 212, 0.04);
  }

  /* Left Fixed Column */
  .gantt-col-left {
    width: 320px;
    flex-shrink: 0;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    border-right: 1.5px solid var(--surface-card-border, #E5E7EB);
    background: inherit;
    z-index: 2;
  }

  .project-id-title-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .proj-job-mono {
    font-family: monospace;
    font-size: 12px;
    font-weight: 800;
    color: #0078D4;
  }

  .proj-row-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary, #111827);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .proj-sub-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-secondary, #6B7280);
  }

  .designer-sub {
    font-weight: 600;
  }

  .rev-pill-small {
    font-size: 9.5px;
    font-weight: 800;
    background: rgba(217, 119, 6, 0.15);
    color: #D97706;
    padding: 1px 5px;
    border-radius: 4px;
  }

  /* Right Timeline Grid */
  .gantt-col-right {
    flex: 1;
    display: grid;
    position: relative;
  }

  .day-head-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 0;
    border-right: 1px solid var(--surface-card-border, #E5E7EB);
    font-size: 11px;
  }

  .day-head-cell.is-weekend {
    background: rgba(0, 0, 0, 0.02);
    color: var(--text-tertiary, #9CA3AF);
  }

  .day-head-cell.is-today {
    background: rgba(0, 120, 212, 0.12);
    color: #0078D4;
    font-weight: 800;
  }

  .day-num {
    font-weight: 700;
  }

  .day-letter {
    font-size: 9px;
    opacity: 0.7;
  }

  /* Track Grid & Columns */
  .timeline-grid-col {
    border-right: 1px solid var(--surface-card-border, #F3F4F6);
    height: 100%;
  }

  .timeline-grid-col.is-weekend {
    background: rgba(0, 0, 0, 0.015);
  }

  .timeline-grid-col.is-today {
    background: rgba(0, 120, 212, 0.05);
    border-right: 1.5px solid #0078D4;
  }

  /* Schedule Bar */
  .gantt-schedule-bar {
    position: absolute;
    top: 10px;
    bottom: 10px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    padding: 0 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    z-index: 3;
    transition: transform 0.15s ease, filter 0.15s ease;
  }

  .gantt-schedule-bar:hover {
    transform: scaleY(1.1);
    filter: brightness(1.08);
  }

  .bar-progress-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: rgba(255, 255, 255, 0.25);
    pointer-events: none;
  }

  .bar-content-label {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 6px;
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 700;
  }

  .bar-title-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-days-pill {
    background: rgba(0, 0, 0, 0.25);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 10px;
    flex-shrink: 0;
  }

  .gantt-empty-state {
    padding: 40px;
    text-align: center;
    color: var(--text-secondary, #6B7280);
    font-size: 13px;
  }

  .day-head-cell.is-holiday {
    background: rgba(239, 68, 68, 0.14) !important;
    color: #DC2626 !important;
    font-weight: 800;
  }

  .day-head-cell.is-sunday {
    color: #EF4444;
  }

  .timeline-grid-col.is-holiday {
    background: rgba(239, 68, 68, 0.08) !important;
    border-right: 1px solid rgba(239, 68, 68, 0.25);
  }

  .gantt-schedule-bar.is-conflict {
    outline: 2px solid #EF4444;
    outline-offset: 1px;
  }

  .conflict-badge {
    background: #DC2626;
    color: #FFFFFF;
    font-size: 9px;
    font-weight: 800;
    padding: 1px 4px;
    border-radius: 3px;
    white-space: nowrap;
  }

</style>
