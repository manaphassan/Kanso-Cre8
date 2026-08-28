<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import type { TeamMember } from '$lib/types';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  let teamMembers = $state<TeamMember[]>([]);
  let isLoading = $state<boolean>(true);
  let isRefreshing = $state<boolean>(false);
  let lastRefreshed = $state<Date>(new Date());

  // Search & Filtering States
  let searchQuery = $state<string>('');
  let selectedDept = $state<string>('all');
  let selectedCapacity = $state<string>('all');
  let sortBy = $state<'hierarchy' | 'name' | 'workload-desc' | 'workload-asc'>('hierarchy');

  async function loadTeam(silent = false) {
    if (!silent) isLoading = true;
    else isRefreshing = true;

    try {
      const res = await ApiClient.getTeam();
      teamMembers = res.team || [];
      lastRefreshed = new Date();
    } catch (err: any) {
      console.error('[TeamView] Failed to load team directory:', err);
      if (!silent) teamMembers = [];
      appState.addToast(`Failed to load team: ${err.message}`, 'error');
    } finally {
      isLoading = false;
      isRefreshing = false;
    }
  }

  onMount(() => {
    loadTeam();

    const handleRealtimeUpdate = () => {
      loadTeam(true);
    };

    window.addEventListener('team:updated', handleRealtimeUpdate);
    window.addEventListener('workspace:updated', handleRealtimeUpdate);

    return () => {
      window.removeEventListener('team:updated', handleRealtimeUpdate);
      window.removeEventListener('workspace:updated', handleRealtimeUpdate);
    };
  });

  // Extract unique departments for filter pills
  const departments = $derived.by(() => {
    const set = new Set<string>();
    teamMembers.forEach(m => {
      if (m.department && m.department.trim()) {
        set.add(m.department.trim());
      }
    });
    return Array.from(set);
  });

  // Studio-Wide High-Level Summary Metrics
  const studioMetrics = $derived.by(() => {
    const totalCreatives = teamMembers.length;
    let totalActive = 0;
    let totalInReview = 0;
    let totalRevisions = 0;
    let totalCompleted = 0;
    let overloadedCount = 0;
    let availableCount = 0;

    teamMembers.forEach(m => {
      const w = m.workload || { active: 0, inReview: 0, revision: 0, completed: 0 };
      totalActive += w.active || 0;
      totalInReview += w.inReview || 0;
      totalRevisions += w.revision || 0;
      totalCompleted += w.completed || 0;

      if (m.capacityStatus === 'Overloaded') overloadedCount++;
      else if (m.capacityStatus === 'Available') availableCount++;
    });

    const avgLoad = totalCreatives > 0 ? (totalActive / totalCreatives).toFixed(1) : '0';

    let healthStatus = 'Optimal';
    let healthColor = '#10B981';
    if (overloadedCount > 0) {
      healthStatus = `${overloadedCount} Overloaded`;
      healthColor = '#EF4444';
    } else if (Number(avgLoad) >= 3.5) {
      healthStatus = 'Peak Capacity';
      healthColor = '#F59E0B';
    } else if (totalActive === 0) {
      healthStatus = 'Available';
      healthColor = '#21A1F7';
    }

    return {
      totalCreatives,
      totalActive,
      totalQueue: totalInReview + totalRevisions,
      totalCompleted,
      avgLoad,
      overloadedCount,
      availableCount,
      healthStatus,
      healthColor
    };
  });

  // Filtered & Sorted Team Members
  const filteredTeam = $derived.by(() => {
    let list = [...teamMembers];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m => {
        const nameMatch = m.name?.toLowerCase().includes(q);
        const staffMatch = m.staffId?.toLowerCase().includes(q);
        const roleMatch = m.role?.toLowerCase().includes(q);
        const deptMatch = m.department?.toLowerCase().includes(q);
        const emailMatch = m.email?.toLowerCase().includes(q);
        const brandMatch = m.defaultBrand?.toLowerCase().includes(q);
        return nameMatch || staffMatch || roleMatch || deptMatch || emailMatch || brandMatch;
      });
    }

    // 2. Department Filter
    if (selectedDept !== 'all') {
      list = list.filter(m => (m.department || '').toLowerCase() === selectedDept.toLowerCase());
    }

    // 3. Capacity Status Filter
    if (selectedCapacity !== 'all') {
      list = list.filter(m => (m.capacityStatus || '').toLowerCase() === selectedCapacity.toLowerCase());
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'workload-desc') {
        return (b.workload?.active || 0) - (a.workload?.active || 0);
      } else if (sortBy === 'workload-asc') {
        return (a.workload?.active || 0) - (b.workload?.active || 0);
      }
      // Default: Hierarchy / Staff ID
      return (a.staffId || '').localeCompare(b.staffId || '');
    });

    return list;
  });

  function parseRoles(roleString?: string, rolesArray?: string[]): string[] {
    if (Array.isArray(rolesArray) && rolesArray.length > 0) return rolesArray;
    if (!roleString) return ['Designer'];
    return roleString.split(',').map(r => r.trim()).filter(Boolean);
  }

  function filterByDesignerInProjects(designerName: string) {
    projectStore.resetFilters();
    projectStore.setFilter('designer', designerName);
    appState.navigate('projects');
  }

  function copyStaffId(staffId: string) {
    navigator.clipboard.writeText(staffId);
    appState.addToast(`Staff ID ${staffId} copied to clipboard`, 'success');
  }
</script>

<div class="team-view-container">
  <!-- ═══ ART DIRECTOR STUDIO HERO HEADER ═══════════════════════ -->
  <div class="team-hero-header">
    <div class="hero-text-col">
      <div class="hero-tag">
        <span class="live-pulse-badge">
          <span class="pulse-dot"></span>
          REALTIME TELEMETRY
        </span>
        <span class="hero-meta">Synology NAS Vault • Synced {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </div>
      <h1 class="hero-title">Team Directory & Studio Workload</h1>
      <p class="hero-subtitle">
        Creative personnel capacity, real-time task allocations, bottleneck detection, and active project dispatching.
      </p>
    </div>

    <div class="hero-actions">
      <FluentButton
        appearance="secondary"
        onclick={() => loadTeam(true)}
        disabled={isRefreshing}
        title="Sync live team data from Synology Vault"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="refresh-icon"
          class:spinning={isRefreshing}
          aria-hidden="true"
        >
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
        </svg>
        {isRefreshing ? 'Syncing...' : 'Refresh Telemetry'}
      </FluentButton>

      {#if appState.hasPermission('admin:manage_users') || appState.currentUser?.role?.toLowerCase().includes('admin') || appState.currentUser?.role?.toLowerCase().includes('director')}
        <FluentButton
          appearance="primary"
          onclick={() => appState.navigate('admin')}
          title="Manage Staff Directory & User Accounts"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Manage Staff Roster
        </FluentButton>
      {/if}
    </div>
  </div>

  <!-- ═══ 4 STUDIO CAPACITY KPI TILES ═══════════════════════════ -->
  <div class="kpi-grid">
    <FluentCard hoverLift padding="16px" borderAccent="var(--brand-accent)">
      <div class="kpi-card-content">
        <div class="kpi-icon-wrap bg-blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        </div>
        <div class="kpi-meta">
          <span class="kpi-label">Active Creatives</span>
          <div class="kpi-num-row">
            <span class="kpi-num">{studioMetrics.totalCreatives}</span>
            <span class="kpi-sub">on active roster</span>
          </div>
          <span class="kpi-footnote">{studioMetrics.availableCount} available for dispatch</span>
        </div>
      </div>
    </FluentCard>

    <FluentCard hoverLift padding="16px" borderAccent="#0284C7">
      <div class="kpi-card-content">
        <div class="kpi-icon-wrap bg-azure">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
        </div>
        <div class="kpi-meta">
          <span class="kpi-label">In-Flight Tasks</span>
          <div class="kpi-num-row">
            <span class="kpi-num">{studioMetrics.totalActive}</span>
            <span class="kpi-sub">active projects</span>
          </div>
          <span class="kpi-footnote">Avg: {studioMetrics.avgLoad} tasks per designer</span>
        </div>
      </div>
    </FluentCard>

    <FluentCard hoverLift padding="16px" borderAccent="#F59E0B">
      <div class="kpi-card-content">
        <div class="kpi-icon-wrap bg-amber">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <div class="kpi-meta">
          <span class="kpi-label">Review & Revisions</span>
          <div class="kpi-num-row">
            <span class="kpi-num">{studioMetrics.totalQueue}</span>
            <span class="kpi-sub">queued milestones</span>
          </div>
          <span class="kpi-footnote">Pending sign-off & updates</span>
        </div>
      </div>
    </FluentCard>

    <FluentCard hoverLift padding="16px" borderAccent={studioMetrics.healthColor}>
      <div class="kpi-card-content">
        <div class="kpi-icon-wrap" style="background: rgba(16, 185, 129, 0.12); color: {studioMetrics.healthColor};">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div class="kpi-meta">
          <span class="kpi-label">Studio Capacity</span>
          <div class="kpi-num-row">
            <span class="kpi-num" style="color: {studioMetrics.healthColor}; font-size: 18px;">
              {studioMetrics.healthStatus}
            </span>
          </div>
          <span class="kpi-footnote">{studioMetrics.totalCompleted} completed assets delivered</span>
        </div>
      </div>
    </FluentCard>
  </div>

  <!-- ═══ INTERACTIVE FILTER & SEARCH BAR ═══════════════════════ -->
  <FluentCard padding="14px 18px">
    <div class="filter-bar-layout">
      <!-- Search Input -->
      <div class="search-wrap">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" class="search-icon" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          type="search"
          class="filter-search-input"
          placeholder="Search by designer name, staff ID (SS0004), role, or department…"
          bind:value={searchQuery}
          aria-label="Filter team members"
        />
        {#if searchQuery}
          <button type="button" class="clear-search-btn" onclick={() => (searchQuery = '')}>×</button>
        {/if}
      </div>

      <!-- Department Filter Pills -->
      <div class="filter-pills-row">
        <span class="filter-label">Dept:</span>
        <button
          type="button"
          class="pill-btn"
          class:active={selectedDept === 'all'}
          onclick={() => (selectedDept = 'all')}
        >
          All
        </button>
        {#each departments as dept}
          <button
            type="button"
            class="pill-btn"
            class:active={selectedDept === dept}
            onclick={() => (selectedDept = dept)}
          >
            {dept}
          </button>
        {/each}
      </div>

      <!-- Capacity Filter Pills -->
      <div class="filter-pills-row">
        <span class="filter-label">Status:</span>
        <button
          type="button"
          class="pill-btn"
          class:active={selectedCapacity === 'all'}
          onclick={() => (selectedCapacity = 'all')}
        >
          All
        </button>
        <button
          type="button"
          class="pill-btn status-avail"
          class:active={selectedCapacity === 'available'}
          onclick={() => (selectedCapacity = 'available')}
        >
          Available
        </button>
        <button
          type="button"
          class="pill-btn status-norm"
          class:active={selectedCapacity === 'normal'}
          onclick={() => (selectedCapacity = 'normal')}
        >
          Normal
        </button>
        <button
          type="button"
          class="pill-btn status-high"
          class:active={selectedCapacity === 'high workload'}
          onclick={() => (selectedCapacity = 'high workload')}
        >
          High Load
        </button>
        <button
          type="button"
          class="pill-btn status-over"
          class:active={selectedCapacity === 'overloaded'}
          onclick={() => (selectedCapacity = 'overloaded')}
        >
          Overloaded
        </button>
      </div>

      <!-- Sort Dropdown -->
      <div class="sort-wrap">
        <span class="filter-label">Sort:</span>
        <select class="sort-select" bind:value={sortBy}>
          <option value="hierarchy">Hierarchy / Staff ID</option>
          <option value="name">Name (A–Z)</option>
          <option value="workload-desc">Workload (Highest First)</option>
          <option value="workload-asc">Workload (Lowest First)</option>
        </select>
      </div>
    </div>

    <div class="filter-summary-row">
      <span class="showing-count">
        Showing <b>{filteredTeam.length}</b> of <b>{teamMembers.length}</b> creative personnel
      </span>
      {#if searchQuery || selectedDept !== 'all' || selectedCapacity !== 'all'}
        <button
          type="button"
          class="reset-filters-link"
          onclick={() => { searchQuery = ''; selectedDept = 'all'; selectedCapacity = 'all'; }}
        >
          Reset Filters
        </button>
      {/if}
    </div>
  </FluentCard>

  <!-- ═══ TEAM MEMBERS GRID ═══════════════════════════════════════ -->
  {#if isLoading}
    <div class="loading-grid">
      {#each Array(4) as _}
        <div class="skeleton-card">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-lines">
            <div class="skeleton-line full"></div>
            <div class="skeleton-line half"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if filteredTeam.length === 0}
    <FluentCard padding="48px">
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3 class="empty-title">No team members match your criteria</h3>
        <p class="empty-desc">Try clearing your search query or selecting "All" departments and statuses.</p>
        <FluentButton
          appearance="secondary"
          onclick={() => { searchQuery = ''; selectedDept = 'all'; selectedCapacity = 'all'; }}
        >
          Reset All Filters
        </FluentButton>
      </div>
    </FluentCard>
  {:else}
    <div class="team-grid">
      {#each filteredTeam as member (member.staffId || member.username)}
        {@const w = member.workload || { total: 0, active: 0, inProgress: 0, inReview: 0, revision: 0, overdue: 0, completed: 0, capacityPercent: 0 }}
        {@const roles = parseRoles(member.role, member.roles)}
        {@const avatarBg = member.avatarColor || '#0078D4'}

        <FluentCard hoverLift padding="20px">
          <!-- Card Header & Identity -->
          <div class="member-card-header">
            <div class="avatar-wrap">
              <div class="member-avatar" style="background: {avatarBg};">
                {(member.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span
                class="online-dot"
                style="background: {member.capacityColor || '#10B981'};"
                title="Capacity: {member.capacityStatus}"
              ></span>
            </div>

            <div class="member-identity">
              <div class="name-row">
                <h3 class="member-name">{member.name}</h3>
                <button
                  type="button"
                  class="staff-id-badge"
                  onclick={() => copyStaffId(member.staffId)}
                  title="Click to copy Staff ID"
                >
                  {member.staffId}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
                </button>
              </div>

              <!-- Roles Pills -->
              <div class="roles-row">
                {#each roles as r}
                  <span class="role-pill">{r}</span>
                {/each}
              </div>

              <!-- Department & Brand -->
              <div class="dept-brand-row">
                <span class="dept-text">{member.department || 'Creative Production'}</span>
                {#if member.defaultBrand}
                  <span class="brand-tag">[{member.defaultBrand}]</span>
                {/if}
              </div>
            </div>

            <!-- Capacity Badge -->
            <div class="capacity-badge-wrap">
              <span
                class="capacity-badge"
                style="background: {member.capacityColor}18; color: {member.capacityColor}; border-color: {member.capacityColor}40;"
              >
                <span class="capacity-dot" style="background: {member.capacityColor};"></span>
                {member.capacityStatus}
              </span>
            </div>
          </div>

          <!-- Capacity Meter Bar -->
          <div class="capacity-meter-section">
            <div class="meter-labels">
              <span class="meter-title" title="Weighted by Category Complexity (Graphic 1.0, Video 2.0, Brand 2.5)">Capacity Load</span>
              <span class="meter-count">
                <b>{w.weightedLoad !== undefined ? w.weightedLoad : (w.active || 0)}</b> / 5.0 pts ({w.capacityPercent || 0}%)
              </span>
            </div>
            <div class="meter-track">
              <div
                class="meter-fill"
                style="width: {(w.capacityPercent && w.capacityPercent > 0) ? Math.min(100, w.capacityPercent) : 0}%; background: {member.capacityColor || '#10B981'};"
              ></div>
            </div>
          </div>

          <!-- Workload Matrix Grid (6 Metrics) -->
          <div class="workload-matrix">
            <div class="matrix-cell active-cell">
              <span class="cell-num">{w.active || 0}</span>
              <span class="cell-lbl">Active</span>
            </div>
            <div class="matrix-cell">
              <span class="cell-num">{w.inProgress || 0}</span>
              <span class="cell-lbl">In Progress</span>
            </div>
            <div class="matrix-cell">
              <span class="cell-num">{w.inReview || 0}</span>
              <span class="cell-lbl">In Review</span>
            </div>
            <div class="matrix-cell" class:has-revision={(w.revision || 0) > 0}>
              <span class="cell-num">{w.revision || 0}</span>
              <span class="cell-lbl">Revision</span>
            </div>
            <div class="matrix-cell" class:is-overdue={(w.overdue || 0) > 0}>
              <span class="cell-num">{w.overdue || 0}</span>
              <span class="cell-lbl">Overdue</span>
            </div>
            <div class="matrix-cell completed-cell">
              <span class="cell-num">{w.completed || 0}</span>
              <span class="cell-lbl">Delivered</span>
            </div>
          </div>

          <!-- Assigned Projects Section -->
          {#if member.assignedProjects && member.assignedProjects.length > 0}
            <div class="assigned-projects-section">
              <div class="assigned-header">
                <span class="assigned-title">Active Projects ({member.assignedProjects.length})</span>
                {#if (member.totalAssignedCount || 0) > member.assignedProjects.length}
                  <span class="assigned-more">+{member.totalAssignedCount! - member.assignedProjects.length} more</span>
                {/if}
              </div>

              <div class="projects-chip-list">
                {#each member.assignedProjects as proj}
                  <a
                    href="#project-detail/{proj.id}"
                    class="project-preview-chip"
                    title="{proj.jobId}: {proj.title} · {proj.presetType || 'Graphic'} ({proj.slaDays || 3}d SLA)"
                  >
                    <span class="chip-brand">[{proj.brand}]</span>
                    <span class="chip-job">{proj.jobId}</span>
                    <span class="chip-title">{proj.title}</span>
                    {#if proj.shortLabel || proj.slaDays}
                      <span class="chip-sla" title="Category SLA: {proj.slaDays || 3} days target">{proj.shortLabel || 'Graphic'} · {proj.slaDays || 3}d</span>
                    {/if}
                    <span class="chip-status status-{proj.status}">{proj.status}</span>
                  </a>
                {/each}
              </div>
            </div>
          {:else}
            <div class="no-projects-box">
              <span>No in-flight projects assigned currently. Ready for dispatch.</span>
            </div>
          {/if}

          <!-- Card Footer Actions -->
          <div class="card-footer-actions">
            <button
              type="button"
              class="footer-btn primary-action"
              onclick={() => filterByDesignerInProjects(member.name)}
              title="View all projects assigned to {member.name} in Project Manager"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              View in Project Manager ↗
            </button>

            {#if member.email}
              <a
                href="mailto:{member.email}"
                class="footer-btn secondary-action"
                title="Send email to {member.email}"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                Email
              </a>
            {/if}
          </div>
        </FluentCard>
      {/each}
    </div>
  {/if}
</div>

<style>
  .team-view-container {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  /* ═══ HERO HEADER ═════════════════════════════════════════════ */
  .team-hero-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg, 12px);
    padding: 20px 24px;
    box-shadow: var(--shadow-sm);
  }

  .hero-tag {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  .live-pulse-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 9999px;
    font-size: 10.5px;
    font-weight: 800;
    color: #059669;
    letter-spacing: 0.5px;
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 8px #10B981;
    animation: livePulse 2s infinite;
  }

  @keyframes livePulse {
    0% { transform: scale(0.95); opacity: 0.8; }
    50% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0.8; }
  }

  .hero-meta {
    font-size: 12px;
    color: var(--text-tertiary);
    font-weight: 500;
  }

  .hero-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.3px;
    margin: 0;
  }

  .hero-subtitle {
    font-size: 13.5px;
    color: var(--text-secondary);
    margin: 4px 0 0 0;
    max-width: 720px;
    line-height: 1.45;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .refresh-icon.spinning {
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ═══ KPI GRID ════════════════════════════════════════════════ */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  @media (max-width: 1024px) {
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .kpi-grid { grid-template-columns: 1fr; }
    .team-hero-header { flex-direction: column; }
  }

  .kpi-card-content {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .kpi-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .kpi-icon-wrap.bg-blue  { background: rgba(4, 51, 136, 0.10); color: var(--brand-primary); }
  .kpi-icon-wrap.bg-azure { background: rgba(33, 161, 247, 0.12); color: #0284C7; }
  .kpi-icon-wrap.bg-amber { background: rgba(245, 158, 11, 0.12); color: #D97706; }

  .kpi-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .kpi-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-tertiary);
  }

  .kpi-num-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .kpi-num {
    font-size: 22px;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .kpi-sub {
    font-size: 11.5px;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .kpi-footnote {
    font-size: 11px;
    color: var(--text-tertiary);
    margin-top: 2px;
  }

  /* ═══ FILTER BAR ══════════════════════════════════════════════ */
  .filter-bar-layout {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
  }

  .search-wrap {
    position: relative;
    flex: 1 1 280px;
    min-width: 240px;
  }

  .search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    pointer-events: none;
  }

  .filter-search-input {
    width: 100%;
    height: 36px;
    padding: 0 30px 0 32px;
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md, 8px);
    background: var(--surface-card-subtle);
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
    transition: all 0.15s ease;
  }
  .filter-search-input:focus {
    border-color: var(--brand-accent);
    background: var(--surface-card);
    box-shadow: 0 0 0 2px rgba(33, 161, 247, 0.2);
  }

  .clear-search-btn {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-tertiary);
    font-size: 16px;
    cursor: pointer;
    line-height: 1;
  }

  .filter-pills-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .filter-label {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .pill-btn {
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card-subtle);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
    padding: 5px 11px;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.14s ease;
  }
  .pill-btn:hover {
    background: var(--surface-card-hover);
    color: var(--text-primary);
  }
  .pill-btn.active {
    background: var(--brand-primary);
    color: #FFFFFF;
    border-color: var(--brand-primary);
    box-shadow: 0 2px 6px rgba(4, 51, 136, 0.25);
  }

  .pill-btn.status-avail.active { background: #10B981; border-color: #10B981; }
  .pill-btn.status-norm.active  { background: #0284C7; border-color: #0284C7; }
  .pill-btn.status-high.active  { background: #F59E0B; border-color: #F59E0B; }
  .pill-btn.status-over.active  { background: #EF4444; border-color: #EF4444; }

  .sort-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  .sort-select {
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md, 8px);
    background: var(--surface-card-subtle);
    color: var(--text-primary);
    font-size: 12.5px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  .filter-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--surface-card-border);
    font-size: 12px;
  }

  .showing-count {
    color: var(--text-secondary);
  }
  .showing-count b {
    color: var(--text-primary);
  }

  .reset-filters-link {
    background: none;
    border: none;
    color: var(--brand-accent);
    font-weight: 700;
    cursor: pointer;
    font-size: 12px;
  }
  .reset-filters-link:hover {
    text-decoration: underline;
  }

  /* ═══ TEAM GRID ═══════════════════════════════════════════════ */
  .team-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 16px;
  }

  @media (max-width: 480px) {
    .team-grid { grid-template-columns: 1fr; }
  }

  .member-card-header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 14px;
  }

  .avatar-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .member-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    color: #FFFFFF;
    font-size: 20px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .online-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    border: 2px solid var(--surface-card);
  }

  .member-identity {
    flex: 1;
    min-width: 0;
  }

  .name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .member-name {
    font-size: 16px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.25;
  }

  .staff-id-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    padding: 1px 6px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.14s ease;
  }
  .staff-id-badge:hover {
    background: var(--brand-tint);
    border-color: var(--brand-accent);
    color: var(--brand-primary);
  }

  .roles-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }

  .role-pill {
    font-size: 11px;
    font-weight: 700;
    color: var(--brand-primary);
    background: rgba(4, 51, 136, 0.08);
    padding: 2px 7px;
    border-radius: 4px;
  }

  .dept-brand-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    color: var(--text-tertiary);
    margin-top: 4px;
  }

  .brand-tag {
    font-weight: 800;
    color: var(--text-secondary);
  }

  .capacity-badge-wrap {
    flex-shrink: 0;
  }

  .capacity-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 9999px;
    border: 1px solid;
    text-transform: capitalize;
    letter-spacing: 0.2px;
  }

  .capacity-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  /* ═══ CAPACITY METER ══════════════════════════════════════════ */
  .capacity-meter-section {
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md, 8px);
    padding: 8px 12px;
    margin-bottom: 12px;
  }

  .meter-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    margin-bottom: 5px;
  }

  .meter-title {
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .meter-count {
    color: var(--text-secondary);
    font-size: 11.5px;
  }
  .meter-count b {
    color: var(--text-primary);
  }

  .meter-track {
    width: 100%;
    height: 6px;
    background: var(--surface-card-border);
    border-radius: 9999px;
    overflow: hidden;
  }

  .meter-fill {
    height: 100%;
    border-radius: 9999px;
    transition: width 0.4s ease;
  }

  /* ═══ WORKLOAD MATRIX ═════════════════════════════════════════ */
  .workload-matrix {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md, 8px);
    padding: 8px 4px;
    text-align: center;
    margin-bottom: 12px;
  }

  .matrix-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2px 2px;
    border-right: 1px solid var(--surface-card-border);
  }
  .matrix-cell:last-child {
    border-right: none;
  }

  .matrix-cell.active-cell .cell-num {
    color: var(--brand-primary);
  }

  .matrix-cell.has-revision .cell-num {
    color: #D97706;
  }

  .matrix-cell.is-overdue .cell-num {
    color: #EF4444;
  }

  .matrix-cell.completed-cell .cell-num {
    color: #059669;
  }

  .cell-num {
    font-size: 15px;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.1;
  }

  .cell-lbl {
    font-size: 9.5px;
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.2px;
    margin-top: 3px;
  }

  /* ═══ ASSIGNED PROJECTS PREVIEW ═══════════════════════════════ */
  .assigned-projects-section {
    margin-bottom: 14px;
    padding-top: 8px;
    border-top: 1px solid var(--surface-card-border);
  }

  .assigned-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 6px;
  }

  .assigned-more {
    color: var(--brand-accent);
    font-size: 10.5px;
  }

  .projects-chip-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .project-preview-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    text-decoration: none;
    color: var(--text-primary);
    font-size: 12px;
    transition: all 0.14s ease;
  }
  .project-preview-chip:hover {
    background: var(--brand-tint);
    border-color: var(--brand-accent);
    transform: translateX(2px);
  }

  .chip-brand {
    font-size: 10.5px;
    font-weight: 800;
    color: var(--brand-primary);
  }

  .chip-job {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    font-weight: 800;
    color: var(--text-secondary);
  }

  .chip-title {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 600;
  }

  .chip-sla {
    font-size: 9.5px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(33, 161, 247, 0.12);
    color: var(--brand-accent);
    border: 1px solid rgba(33, 161, 247, 0.25);
    white-space: nowrap;
  }

  .chip-status {
    font-size: 9.5px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-secondary);
  }

  .chip-status.status-in-progress { background: rgba(33, 161, 247, 0.15); color: #0284C7; }
  .chip-status.status-review      { background: rgba(245, 158, 11, 0.15); color: #D97706; }
  .chip-status.status-revision    { background: rgba(239, 68, 68, 0.15); color: #DC2626; }
  .chip-status.status-done,
  .chip-status.status-approved    { background: rgba(16, 185, 129, 0.15); color: #059669; }

  .no-projects-box {
    padding: 10px;
    background: var(--surface-card-subtle);
    border: 1px dashed var(--surface-card-border);
    border-radius: 6px;
    text-align: center;
    font-size: 11.5px;
    color: var(--text-tertiary);
    margin-bottom: 14px;
  }

  /* ═══ FOOTER ACTIONS ══════════════════════════════════════════ */
  .card-footer-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--surface-card-border);
  }

  .footer-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 700;
    padding: 6px 12px;
    border-radius: var(--radius-md, 6px);
    border: 1px solid transparent;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.14s ease;
  }

  .primary-action {
    flex: 1;
    background: var(--brand-tint);
    color: var(--brand-primary);
    border-color: rgba(4, 51, 136, 0.15);
  }
  .primary-action:hover {
    background: var(--brand-primary);
    color: #FFFFFF;
  }

  .secondary-action {
    background: var(--surface-card-subtle);
    color: var(--text-secondary);
    border-color: var(--surface-card-border);
  }
  .secondary-action:hover {
    background: var(--surface-card-hover);
    color: var(--text-primary);
  }

  /* ═══ LOADING & EMPTY STATES ═══════════════════════════════════ */
  .loading-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 16px;
  }

  .skeleton-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg, 12px);
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    animation: pulse 1.5s infinite ease-in-out;
  }

  .skeleton-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--surface-card-border);
  }

  .skeleton-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skeleton-line {
    height: 12px;
    background: var(--surface-card-border);
    border-radius: 4px;
  }
  .skeleton-line.full { width: 80%; }
  .skeleton-line.half { width: 45%; }

  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }

  .empty-state {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .empty-icon { font-size: 36px; }
  .empty-title { font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0; }
  .empty-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 8px 0; max-width: 400px; }
</style>
