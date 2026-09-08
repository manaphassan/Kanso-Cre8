<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';
  import type { Project } from '$lib/types';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  interface Props {
    projects: Project[];
  }

  let { projects }: Props = $props();

  let activeDate = $state<Date>(new Date());

  const calendarGrid = $derived.by(() => {
    const year = activeDate.getFullYear();
    const month = activeDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalMonthDays = lastDayOfMonth.getDate();

    const today = new Date();
    const cells: Array<{
      date: Date;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      projects: Project[];
    }> = [];

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const date = new Date(year, month - 1, d);
      cells.push({
        date,
        dayNum: d,
        isCurrentMonth: false,
        isToday: false,
        projects: []
      });
    }

    // Current month days
    for (let d = 1; d <= totalMonthDays; d++) {
      const date = new Date(year, month, d);
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      
      // Match projects by deadline or created date
      const matchedProjects = projects.filter(p => {
        if (p.deadline) {
          const dDate = new Date(p.deadline);
          if (!isNaN(dDate.getTime()) && dDate.getFullYear() === year && dDate.getMonth() === month && dDate.getDate() === d) {
            return true;
          }
        }
        if (p.created) {
          const cDate = new Date(p.created);
          if (!isNaN(cDate.getTime()) && cDate.getFullYear() === year && cDate.getMonth() === month && cDate.getDate() === d) {
            return true;
          }
        }
        return false;
      });

      cells.push({
        date,
        dayNum: d,
        isCurrentMonth: true,
        isToday,
        projects: matchedProjects
      });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      cells.push({
        date,
        dayNum: d,
        isCurrentMonth: false,
        isToday: false,
        projects: []
      });
    }

    return {
      year,
      month,
      monthName: firstDayOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      cells
    };
  });

  function prevMonth() {
    activeDate = new Date(activeDate.getFullYear(), activeDate.getMonth() - 1, 1);
  }

  function nextMonth() {
    activeDate = new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 1);
  }

  function goToday() {
    activeDate = new Date();
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'done':
      case 'approved': return '#107C41';
      case 'review': return '#8764B8';
      case 'revision': return '#D97706';
      case 'in-progress': return '#0284C7';
      default: return '#6B7280';
    }
  }
</script>

<div class="calendar-view-container">
  <!-- Top Navigation & Controls -->
  <div class="calendar-header-bar">
    <div class="cal-nav-group">
      <FluentButton appearance="subtle" onclick={prevMonth} title="Previous Month">‹ Prev</FluentButton>
      <h3 class="cal-month-title">{calendarGrid.monthName}</h3>
      <FluentButton appearance="subtle" onclick={nextMonth} title="Next Month">Next ›</FluentButton>
      <FluentButton appearance="secondary" onclick={goToday}>Today</FluentButton>
    </div>

    <div class="cal-legend-row">
      <span class="legend-badge"><span class="badge-dot" style="background: #0284C7;"></span> In Progress</span>
      <span class="legend-badge"><span class="badge-dot" style="background: #8764B8;"></span> Review Queue</span>
      <span class="legend-badge"><span class="badge-dot" style="background: #D97706;"></span> Revision</span>
      <span class="legend-badge"><span class="badge-dot" style="background: #107C41;"></span> Approved/Done</span>
    </div>
  </div>

  <!-- Day Header Row -->
  <div class="calendar-grid-header">
    <span>Sun</span>
    <span>Mon</span>
    <span>Tue</span>
    <span>Wed</span>
    <span>Thu</span>
    <span>Fri</span>
    <span>Sat</span>
  </div>

  <!-- Calendar Day Cells Grid -->
  <div class="calendar-days-grid">
    {#each calendarGrid.cells as cell}
      <div
        class="cal-day-cell"
        class:is-other-month={!cell.isCurrentMonth}
        class:is-today={cell.isToday}
      >
        <div class="day-cell-top">
          <span class="day-number" class:today-num={cell.isToday}>{cell.dayNum}</span>
          {#if cell.projects.length > 0}
            <span class="day-count-badge">{cell.projects.length} due</span>
          {/if}
        </div>

        <div class="day-projects-stack">
          {#each cell.projects as p (p.id)}
            <button
              type="button"
              class="cal-project-chip"
              style="border-left-color: {getStatusColor(p.status)};"
              onclick={() => appState.navigate('project-detail', { id: p.id })}
              title="{p.jobId}: {p.title} ({p.status}) - Designer: {p.designer || 'Unassigned'}"
            >
              <span class="chip-job-id">{p.jobId || p.id}</span>
              <span class="chip-title">{p.title}</span>
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .calendar-view-container {
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    border-radius: 12px;
    padding: 16px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    flex: 1;
    min-height: calc(100vh - 220px);
    box-sizing: border-box;
  }

  .calendar-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--surface-card-border, #E5E7EB);
  }

  .cal-nav-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .cal-month-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--text-primary, #111827);
    margin: 0;
    min-width: 170px;
    text-align: center;
  }

  .cal-legend-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--text-secondary, #6B7280);
  }

  .legend-badge {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .badge-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .calendar-grid-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary, #6B7280);
    padding: 6px 0;
    background: var(--surface-card-subtle, #F9FAFB);
    border-radius: 6px;
    border: 1px solid var(--surface-card-border, #E5E7EB);
  }

  .calendar-days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    flex: 1;
    grid-auto-rows: minmax(110px, 1fr);
  }

  .cal-day-cell {
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    border-radius: 8px;
    min-height: 110px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: all 0.15s ease;
  }

  .cal-day-cell:hover {
    border-color: rgba(0, 120, 212, 0.4);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }

  .cal-day-cell.is-other-month {
    background: var(--surface-card-subtle, #F9FAFB);
    opacity: 0.45;
  }

  .cal-day-cell.is-today {
    border: 1.5px solid #0078D4;
    background: rgba(0, 120, 212, 0.02);
  }

  .day-cell-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .day-number {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-primary, #111827);
  }

  .day-number.today-num {
    background: #0078D4;
    color: #FFFFFF;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11.5px;
  }

  .day-count-badge {
    font-size: 10px;
    font-weight: 700;
    color: #0284C7;
    background: rgba(2, 132, 199, 0.12);
    padding: 1px 5px;
    border-radius: 4px;
  }

  .day-projects-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    max-height: 120px;
  }

  .cal-project-chip {
    text-align: left;
    background: var(--surface-card-subtle, #F3F4F6);
    border: 1px solid var(--surface-card-border, #E5E7EB);
    border-left: 3px solid #0078D4;
    border-radius: 4px;
    padding: 4px 6px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;
    transition: all 0.15s ease;
  }

  .cal-project-chip:hover {
    background: rgba(0, 120, 212, 0.08);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .chip-job-id {
    font-family: monospace;
    font-size: 10px;
    font-weight: 800;
    color: #0078D4;
  }

  .chip-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-primary, #111827);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }
</style>
