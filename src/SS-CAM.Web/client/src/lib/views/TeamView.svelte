<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';

  let teamMembers = $state<any[]>([]);
  let isLoading = $state<boolean>(true);

  onMount(async () => {
    try {
      const res = await ApiClient.getTeam();
      teamMembers = res.team || [];
    } catch {
      teamMembers = [];
    } finally {
      isLoading = false;
    }
  });
</script>

<div class="team-view-container">
  <div class="view-header">
    <div>
      <h1 class="view-title">Team Directory & Studio Workload</h1>
      <p class="view-subtitle">Creative personnel assignments and active project capacity</p>
    </div>
  </div>

  {#if isLoading}
    <div class="loading-state">Loading team directory from Synology NAS...</div>
  {:else}
    <div class="team-grid">
      {#each teamMembers as member}
        <FluentCard hoverLift padding="20px">
          <div class="member-top">
            <div class="member-avatar">{member.name.charAt(0)}</div>
            <div class="member-meta">
              <h3 class="member-name">{member.name}</h3>
              <div class="member-role">{member.role} • {member.staffId || ''}</div>
            </div>
          </div>

          <div class="member-stats-box">
            <div class="stat-col">
              <span class="num">{member.activeProjects || 0}</span>
              <span class="lbl">Active</span>
            </div>
            <div class="stat-col">
              <span class="num">{member.reviewQueue || 0}</span>
              <span class="lbl">Review</span>
            </div>
            <div class="stat-col">
              <span class="num">{member.completedCount || 0}</span>
              <span class="lbl">Done</span>
            </div>
          </div>

          <div class="dept-row">
            <span>Department:</span>
            <b>{member.department || 'Creative Operations'}</b>
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

  .view-header { margin-bottom: 4px; }
  .view-title { font-size: 24px; font-weight: 800; color: var(--text-primary); }
  .view-subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }

  .team-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .member-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .member-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--brand-primary);
    color: #FFFFFF;
    font-size: 18px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .member-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .member-role {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .member-stats-box {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    padding: 10px;
    text-align: center;
    margin-bottom: 14px;
  }

  .num {
    display: block;
    font-size: 16px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .lbl {
    font-size: 10.5px;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .dept-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-secondary);
    padding-top: 8px;
    border-top: 1px solid var(--surface-card-border);
  }
  .dept-row b { color: var(--text-primary); }

  .loading-state {
    text-align: center;
    padding: 40px 0;
    color: var(--text-secondary);
  }
</style>
