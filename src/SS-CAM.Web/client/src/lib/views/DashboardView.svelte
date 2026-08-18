<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';
  import DashboardRadar from '$lib/components/features/DashboardRadar.svelte';

  onMount(() => {
    projectStore.loadDashboard();
  });

  const kpis = $derived(projectStore.dashboardData?.kpis || {
    total: 0,
    active: 0,
    pendingReview: 0,
    revisionRequired: 0,
    completed: 0,
    overdue: 0
  });

  const workloads = $derived(projectStore.dashboardData?.designerWorkload || []);
</script>

<div class="dashboard-container">
  <!-- Board Header -->
  <div class="board-header">
    <div>
      <div class="header-tag">
        <span class="badge badge-brand">EXECUTIVE BOARD DECK</span>
        <span class="header-meta">Updated Just Now • Synology NAS</span>
      </div>
      <h1 class="header-title">Creative Operations & Studio Performance</h1>
      <p class="header-desc">
        High-level strategic visibility into production throughput, skill competencies, and brand distribution
      </p>
    </div>

    <div class="header-actions">
      <FluentButton appearance="secondary" size="sm" onclick={() => projectStore.loadDashboard()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
        <span>Refresh Metrics</span>
      </FluentButton>
    </div>
  </div>

  <!-- KPI Summary Bar (60:30:10 Discipline) -->
  <div class="kpi-grid">
    <FluentCard hoverLift borderAccent="#21A1F7" onclick={() => appState.navigate('projects')}>
      <div class="kpi-label">Total Vault Assets</div>
      <div class="kpi-value">{kpis.total}</div>
      <div class="kpi-trend text-accent">Active Storage</div>
    </FluentCard>

    <FluentCard hoverLift borderAccent="#0284C7" onclick={() => appState.navigate('projects', { status: 'in-progress' })}>
      <div class="kpi-label">Active in Production</div>
      <div class="kpi-value">{kpis.active}</div>
      <div class="kpi-trend text-primary">In Pipeline</div>
    </FluentCard>

    <FluentCard hoverLift borderAccent="#D97706" onclick={() => appState.navigate('deliverables')}>
      <div class="kpi-label">Review Queue</div>
      <div class="kpi-value">{kpis.pendingReview}</div>
      <div class="kpi-trend" style="color: #D97706;">Pending Sign-Off</div>
    </FluentCard>

    <FluentCard hoverLift borderAccent="#EF4444" onclick={() => appState.navigate('projects', { status: 'revision' })}>
      <div class="kpi-label">Revision Required</div>
      <div class="kpi-value">{kpis.revisionRequired}</div>
      <div class="kpi-trend" style="color: #EF4444;">Needs Action</div>
    </FluentCard>

    <FluentCard hoverLift borderAccent="#10B981" onclick={() => appState.navigate('projects', { status: 'approved' })}>
      <div class="kpi-label">Approved & Completed</div>
      <div class="kpi-value">{kpis.completed}</div>
      <div class="kpi-trend" style="color: #10B981;">Ready for Release</div>
    </FluentCard>
  </div>

  <!-- Two-Column Operational Grid -->
  <div class="analytics-grid">
    <!-- Left Column: Competency Radar -->
    <FluentCard elevated>
      <div class="card-section-header">
        <div>
          <h2>Art Director Skill Competency Matrix</h2>
          <p>Multi-dimensional studio balance and design output readiness</p>
        </div>
      </div>
      <DashboardRadar />
    </FluentCard>

    <!-- Right Column: Designer Workload -->
    <FluentCard elevated>
      <div class="card-section-header">
        <div>
          <h2>Designer Production Load</h2>
          <p>Real-time asset distribution across creative staff</p>
        </div>
      </div>

      <div class="workload-list">
        {#each workloads as w}
          <div class="workload-row">
            <div class="workload-user">
              <div class="avatar-chip">{(w?.name || 'U').charAt(0)}</div>
              <div>
                <div class="user-name">{w?.name || 'Staff Member'}</div>
                <div class="user-role">{w?.role || 'Designer'}</div>
              </div>
            </div>

            <div class="workload-stats">
              <span class="stat-pill stat-active">{w.activeCount || 0} Active</span>
              <span class="stat-pill stat-review">{w.reviewCount || 0} Review</span>
              <span class="stat-pill stat-done">{w.doneCount || 0} Done</span>
            </div>
          </div>
        {:else}
          <div class="empty-state">No workload data recorded yet.</div>
        {/each}
      </div>
    </FluentCard>
  </div>
</div>

<style>
  .dashboard-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--surface-card-border);
  }

  .header-tag {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .header-meta {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .header-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .header-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
  }

  .kpi-label {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .kpi-value {
    font-size: 28px;
    font-weight: 900;
    color: var(--text-primary);
    margin: 6px 0;
  }

  .kpi-trend {
    font-size: 11.5px;
    font-weight: 600;
  }

  .analytics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .card-section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .workload-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .workload-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
  }

  .workload-user {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .avatar-chip {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--brand-primary);
    color: #FFFFFF;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }

  .user-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .user-role {
    font-size: 11.5px;
    color: var(--text-secondary);
  }

  .workload-stats {
    display: flex;
    gap: 6px;
  }

  .stat-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-pill);
  }

  .stat-active { background: #0284C720; color: #0284C7; }
  .stat-review { background: #D9770620; color: #D97706; }
  .stat-done { background: #10B98120; color: #10B981; }

  .empty-state {
    text-align: center;
    color: var(--text-tertiary);
    font-size: 13px;
    padding: 30px 0;
  }

  @media (max-width: 900px) {
    .analytics-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
