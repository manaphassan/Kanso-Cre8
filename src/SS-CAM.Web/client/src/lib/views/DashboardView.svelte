<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import DashboardRadar from '$lib/components/features/DashboardRadar.svelte';
  import type { Project, ActivityNotification } from '$lib/types';

  type DashboardLens = 'studio' | 'my-workspace';
  let activeLens = $state<DashboardLens>('studio');
  let myNotifications = $state<ActivityNotification[]>([]);
  let isLoadingPersonal = $state<boolean>(false);

  onMount(async () => {
    await projectStore.loadDashboard();
    await projectStore.loadProjects();
    await loadPersonalActivity();
  });

  async function loadPersonalActivity() {
    isLoadingPersonal = true;
    try {
      const res = await ApiClient.getNotifications(10);
      myNotifications = res.notifications || [];
    } catch (e) {
      // Fallback
    } finally {
      isLoadingPersonal = false;
    }
  }

  const kpis = $derived(projectStore.dashboardData?.kpis || {
    total: 0,
    active: 0,
    pendingReview: 0,
    revisionRequired: 0,
    completed: 0,
    overdue: 0
  });

  const workloads = $derived(projectStore.dashboardData?.designerWorkload || []);
  const slaData = $derived(projectStore.dashboardData?.slaMetrics || {
    avgTurnaroundDays: 3.5,
    firstTimeRightPercent: 85.0,
    avgRevisionCount: 0.4,
    brandVelocity: []
  });

  // "My Workspace" Derived Filters
  const currentUserName = $derived(appState.currentUser?.name || '');
  const currentUserStaffId = $derived(appState.currentUser?.staffId || '');

  const myProjects = $derived.by(() => {
    if (!projectStore.projects) return [];
    return projectStore.projects.filter(p => {
      const d = (p.designer || '').toLowerCase();
      const uName = currentUserName.toLowerCase();
      const sId = currentUserStaffId.toLowerCase();
      return (uName && d.includes(uName)) || (sId && d.includes(sId)) || p.status === 'revision' || p.status === 'in-progress';
    });
  });

  const myRevisionItems = $derived.by(() => {
    return myProjects.filter(p => p.status === 'revision');
  });

  const myActiveItems = $derived.by(() => {
    return myProjects.filter(p => p.status === 'in-progress');
  });

  const myReviewItems = $derived.by(() => {
    return myProjects.filter(p => p.status === 'review');
  });
</script>

<div class="dashboard-container">
  <!-- Board Header with Lens Switcher -->
  <div class="board-header">
    <div class="header-left-col">
      <div class="header-tag">
        <span class="badge badge-brand">
          {activeLens === 'studio' ? 'EXECUTIVE BOARD DECK' : 'PERSONAL CREATIVE DESK'}
        </span>
        <span class="header-meta">Synology Vault Live • {currentUserName} ({appState.currentUser?.role})</span>
      </div>
      <h1 class="header-title">
        {activeLens === 'studio' ? 'Creative Operations & Studio Performance' : 'My Production Workspace'}
      </h1>
      <p class="header-desc">
        {activeLens === 'studio' 
          ? 'High-level strategic visibility into production throughput, skill competencies, and brand distribution' 
          : 'Focused view of your active tasks, urgent revision requests, and direct team feedback'}
      </p>
    </div>

    <!-- Lens Switcher & Actions -->
    <div class="header-actions">
      <div class="lens-switcher">
        <button
          class="lens-btn"
          class:active={activeLens === 'studio'}
          onclick={() => (activeLens = 'studio')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>
          Studio Overview
        </button>
        <button
          class="lens-btn"
          class:active={activeLens === 'my-workspace'}
          onclick={() => (activeLens = 'my-workspace')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          My Workspace
          {#if myRevisionItems.length > 0}
            <span class="lens-alert-pill">{myRevisionItems.length}</span>
          {/if}
        </button>
      </div>

      <FluentButton appearance="secondary" size="sm" onclick={() => { projectStore.loadDashboard(); loadPersonalActivity(); }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
        <span>Refresh</span>
      </FluentButton>
    </div>
  </div>

  <!-- ═══════════ STUDIO EXECUTIVE DECK LENS ═══════════ -->
  {#if activeLens === 'studio'}
    <!-- KPI Summary Bar -->
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
                <div class="avatar-chip">{(w.designer || 'D').charAt(0)}</div>
                <div class="user-info-col">
                  <div class="user-name">{w.designer || 'Unassigned'}</div>
                  <div class="user-role">{w.total || 0} Total Projects</div>
                </div>
              </div>

              <div class="workload-mid-col">
                <div class="capacity-bar-container">
                  <div class="capacity-bar-fill" style="width: {w.capacityPercent || 0}%; background: {w.capacityColor || '#10B981'};"></div>
                </div>
                <span class="badge-capacity" style="color: {w.capacityColor || '#10B981'}; border-color: {w.capacityColor || '#10B981'};">
                  {w.capacityStatus || 'Optimal'}
                </span>
              </div>

              <div class="workload-stats">
                <span class="stat-pill stat-active">{w.active || 0} Active</span>
                <span class="stat-pill stat-review">{w.inReview || 0} Review</span>
                <span class="stat-pill stat-done">{w.completed || 0} Done</span>
              </div>
            </div>
          {:else}
            <div class="empty-state">No workload data recorded yet.</div>
          {/each}
        </div>
      </FluentCard>
    </div>

    <!-- Operational SLA & Creative Velocity Section -->
    <div class="sla-analytics-grid">
      <FluentCard elevated>
        <div class="sla-card-inner">
          <div class="sla-icon-box" style="background: rgba(16, 185, 129, 0.12); color: #10B981;">
            🎯
          </div>
          <div>
            <div class="sla-meta-label">FIRST-TIME RIGHT RATE</div>
            <div class="sla-value" style="color: #10B981;">{slaData.firstTimeRightPercent || 85.0}%</div>
            <div class="sla-desc">Signed off with 0 revision rounds</div>
          </div>
        </div>
      </FluentCard>

      <FluentCard elevated>
        <div class="sla-card-inner">
          <div class="sla-icon-box" style="background: rgba(4, 51, 136, 0.12); color: var(--brand-primary, #043388);">
            ⚡
          </div>
          <div>
            <div class="sla-meta-label">AVG TURNAROUND VELOCITY</div>
            <div class="sla-value">{slaData.avgTurnaroundDays || 3.5} Days</div>
            <div class="sla-desc">Brief kickoff to final delivery</div>
          </div>
        </div>
      </FluentCard>

      <FluentCard elevated>
        <div class="sla-card-inner">
          <div class="sla-icon-box" style="background: rgba(217, 119, 6, 0.12); color: #D97706;">
            🔄
          </div>
          <div>
            <div class="sla-meta-label">AVG REVISION ROUNDS</div>
            <div class="sla-value">{slaData.avgRevisionCount || 0.4} Revs</div>
            <div class="sla-desc">Average iterations per project</div>
          </div>
        </div>
      </FluentCard>
    </div>

  <!-- ═══════════ MY WORKSPACE LENS ═══════════ -->
  {:else}
    <!-- Personal KPI Strips -->
    <div class="personal-kpi-grid">
      <div class="personal-kpi-card highlight-revision">
        <div class="pkpi-meta">
          <span class="pkpi-icon">🔴</span>
          <span class="pkpi-title">Revisions Requiring Action</span>
        </div>
        <div class="pkpi-count">{myRevisionItems.length}</div>
        <span class="pkpi-desc">Deliverables awaiting updates</span>
      </div>

      <div class="personal-kpi-card highlight-active">
        <div class="pkpi-meta">
          <span class="pkpi-icon">⚡</span>
          <span class="pkpi-title">In Production</span>
        </div>
        <div class="pkpi-count">{myActiveItems.length}</div>
        <span class="pkpi-desc">Current active deliverables</span>
      </div>

      <div class="personal-kpi-card highlight-review">
        <div class="pkpi-meta">
          <span class="pkpi-icon">⏳</span>
          <span class="pkpi-title">Under Review</span>
        </div>
        <div class="pkpi-count">{myReviewItems.length}</div>
        <span class="pkpi-desc">Awaiting manager sign-off</span>
      </div>
    </div>

    <!-- Personal Two-Column Layout -->
    <div class="my-workspace-grid">
      <!-- Left: Assigned Projects & Action Queue -->
      <div class="my-queue-column">
        <FluentCard elevated>
          <div class="card-section-header">
            <div>
              <h2>My Priority Production Queue</h2>
              <p>Direct assignments and deliverables under your custody</p>
            </div>
          </div>

          {#if myProjects.length === 0}
            <div class="empty-workspace-state">
              <div class="empty-icon">☕</div>
              <p class="empty-title">All tasks cleared</p>
              <p class="empty-desc">You have no active projects or pending revisions assigned right now.</p>
            </div>
          {:else}
            <div class="project-queue-list">
              {#each myProjects as proj (proj.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="queue-card" onclick={() => appState.navigate('project-detail', { id: proj.id })}>
                  <div class="queue-card-header">
                    <div class="queue-id-tag">{proj.jobId || proj.id}</div>
                    <span class="status-pill status-{proj.status}">{proj.status}</span>
                  </div>
                  <h4 class="queue-title">{proj.title}</h4>
                  <div class="queue-footer">
                    <span class="queue-brand">Brand: {proj.brand || 'SS'}</span>
                    <span class="queue-deadline">📅 {proj.deadline || 'No deadline'}</span>
                    <span class="queue-action-link">Open Workspace →</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </FluentCard>
      </div>

      <!-- Right: Direct Mentions & Discussion Highlights -->
      <div class="my-activity-column">
        <FluentCard elevated>
          <div class="card-section-header">
            <div>
              <h2>Mentions & Discussion Feed</h2>
              <p>Recent collaboration notes directed to you</p>
            </div>
          </div>

          {#if myNotifications.length === 0}
            <div class="empty-workspace-state">
              <div class="empty-icon">💬</div>
              <p class="empty-title">No recent mentions</p>
              <p class="empty-desc">Team comments mentioning you will appear here.</p>
            </div>
          {:else}
            <div class="personal-activity-list">
              {#each myNotifications.slice(0, 6) as notif (notif.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  class="personal-activity-card"
                  onclick={() => {
                    if (notif.route === 'project-detail' && notif.routeId) {
                      appState.navigate('project-detail', { id: notif.routeId });
                    }
                  }}
                >
                  <div class="pact-header">
                    <span class="pact-title">{notif.title}</span>
                    <span class="pact-actor">{notif.actor}</span>
                  </div>
                  <p class="pact-message">{notif.message}</p>
                </div>
              {/each}
            </div>
          {/if}
        </FluentCard>
      </div>
    </div>
  {/if}
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
    flex-wrap: wrap;
    gap: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--surface-card-border);
  }

  .header-left-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .header-tag {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .badge-brand {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    background: rgba(33, 161, 247, 0.15);
    color: #21A1F7;
    padding: 2px 8px;
    border-radius: var(--radius-sm, 4px);
    border: 1px solid rgba(33, 161, 247, 0.3);
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
    margin: 0;
  }

  .header-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  /* Lens Switcher */
  .lens-switcher {
    display: flex;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    padding: 2px;
    box-shadow: var(--shadow-sm);
  }

  .lens-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: none;
    background: transparent;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.14s;
    font-family: inherit;
  }
  .lens-btn:hover {
    color: var(--text-primary);
  }
  .lens-btn.active {
    background: var(--brand-primary, #043388);
    color: #FFFFFF;
    box-shadow: var(--shadow-sm);
  }

  .lens-alert-pill {
    font-size: 10px;
    font-weight: 800;
    background: #EF4444;
    color: #FFFFFF;
    padding: 1px 5px;
    border-radius: 9999px;
  }

  /* Studio Lens KPIs */
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
  .text-accent { color: var(--brand-accent, #21A1F7); }
  .text-primary { color: var(--brand-primary, #043388); }

  .analytics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .card-section-header h2 {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 2px 0;
  }
  .card-section-header p {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 0 0 16px 0;
  }

  .workload-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .workload-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: var(--bg-app);
    border-radius: 8px;
    border: 1px solid var(--surface-card-border);
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
    background: var(--brand-primary, #043388);
    color: #FFFFFF;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-info-col {
    display: flex;
    flex-direction: column;
  }
  .user-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
  .user-role { font-size: 11px; color: var(--text-secondary); }

  .workload-mid-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 110px;
  }

  .capacity-bar-container {
    width: 100%;
    height: 5px;
    border-radius: 3px;
    background: var(--surface-card-border, #E2E8F0);
    overflow: hidden;
  }
  .capacity-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .badge-capacity {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid currentColor;
    background: rgba(255, 255, 255, 0.05);
  }

  .workload-stats {
    display: flex;
    gap: 6px;
  }

  .stat-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
  }
  .stat-active { background: #EBF4FE; color: #043388; border: 1px solid #BFDBFE; }
  .stat-review { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
  .stat-done { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }

  /* ═══════════ SLA ANALYTICS GRID STYLES ═══════════ */
  .sla-analytics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: -8px;
  }

  .sla-card-inner {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 16px;
  }

  .sla-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  .sla-meta-label {
    font-size: 10px;
    font-weight: 800;
    color: var(--text-tertiary, #94A3B8);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .sla-value {
    font-size: 22px;
    font-weight: 900;
    color: var(--text-primary);
    margin: 2px 0;
  }

  .sla-desc {
    font-size: 11.5px;
    color: var(--text-secondary);
  }

  /* ═══════════ MY WORKSPACE LENS STYLES ═══════════ */
  .personal-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }

  .personal-kpi-card {
    padding: 16px 20px;
    border-radius: 12px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .personal-kpi-card.highlight-revision {
    border-left: 4px solid #EF4444;
  }
  .personal-kpi-card.highlight-active {
    border-left: 4px solid #0284C7;
  }
  .personal-kpi-card.highlight-review {
    border-left: 4px solid #F59E0B;
  }

  .pkpi-meta {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pkpi-icon { font-size: 14px; }
  .pkpi-title { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
  .pkpi-count { font-size: 32px; font-weight: 900; color: var(--text-primary); margin: 4px 0; }
  .pkpi-desc { font-size: 11.5px; color: var(--text-tertiary); }

  .my-workspace-grid {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 20px;
  }

  .project-queue-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .queue-card {
    padding: 14px 16px;
    background: var(--surface-card-subtle, #F8FAFC);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.14s;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .queue-card:hover {
    background: var(--surface-card);
    border-color: var(--brand-accent);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .queue-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .queue-id-tag {
    font-family: monospace;
    font-size: 11.5px;
    font-weight: 800;
    color: var(--text-brand, #043388);
    background: var(--brand-tint, #EBF4FE);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .status-pill {
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 4px;
  }
  .status-revision { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
  .status-in-progress { background: #EBF4FE; color: #043388; border: 1px solid #BFDBFE; }
  .status-review { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
  .status-approved { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }

  .queue-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .queue-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11.5px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .queue-action-link {
    font-weight: 700;
    color: var(--text-brand, #043388);
  }

  .personal-activity-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .personal-activity-card {
    padding: 10px 12px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.12s;
  }
  .personal-activity-card:hover {
    background: var(--surface-card);
    border-color: var(--brand-accent);
  }

  .pact-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }
  .pact-title { font-size: 12px; font-weight: 700; color: var(--text-primary); }
  .pact-actor { font-size: 10.5px; color: var(--text-tertiary); }
  .pact-message { font-size: 11.5px; color: var(--text-secondary); margin: 0; line-height: 1.35; }

  .empty-workspace-state {
    text-align: center;
    padding: 36px 16px;
    background: var(--bg-app);
    border-radius: 8px;
    border: 1px dashed var(--surface-card-border);
  }
  .empty-workspace-state .empty-icon { font-size: 28px; margin-bottom: 4px; }
  .empty-workspace-state .empty-title { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 0 0 2px 0; }
  .empty-workspace-state .empty-desc { font-size: 12px; color: var(--text-secondary); margin: 0; }

  @media (max-width: 900px) {
    .analytics-grid, .my-workspace-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
