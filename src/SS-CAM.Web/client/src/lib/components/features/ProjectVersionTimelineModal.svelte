<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  interface Props {
    open?: boolean;
    projectId?: string;
    projectTitle?: string;
    onClose?: () => void;
    onRollbackSuccess?: () => void;
  }

  let {
    open = $bindable(false),
    projectId = '',
    projectTitle = '',
    onClose,
    onRollbackSuccess
  }: Props = $props();

  let snapshots = $state<any[]>([]);
  let isLoading = $state<boolean>(false);
  let isRollingBack = $state<string | null>(null);
  let isCapturing = $state<boolean>(false);
  let customNote = $state<string>('');

  $effect(() => {
    if (open && projectId) {
      loadSnapshots();
    }
  });

  async function loadSnapshots() {
    if (!projectId) return;
    isLoading = true;
    try {
      const res = await ApiClient.getProjectSnapshots(projectId);
      snapshots = res.snapshots || [];
    } catch (err: any) {
      console.warn('[VersionTimeline] Failed to load snapshots:', err.message);
    } finally {
      isLoading = false;
    }
  }

  async function handleCreateSnapshot() {
    if (!projectId) return;
    isCapturing = true;
    try {
      await ApiClient.createProjectSnapshot(projectId, {
        trigger: 'MANUAL_USER_SNAPSHOT',
        note: customNote.trim() || 'Manual studio milestone snapshot'
      });
      customNote = '';
      appState.addToast('Version snapshot captured!', 'success');
      loadSnapshots();
    } catch (err: any) {
      appState.addToast(`Failed to capture snapshot: ${err.message}`, 'error');
    } finally {
      isCapturing = false;
    }
  }

  async function handleRollback(snap: any) {
    if (!confirm(`Are you sure you want to rollback to Revision ${snap.revision} (${new Date(snap.timestamp).toLocaleString()})?\n\nThis will restore README.md and COPY.md to this snapshot state. A safety backup will be created automatically.`)) {
      return;
    }

    isRollingBack = snap.id;
    try {
      const res = await ApiClient.rollbackProject(projectId, snap.id);
      appState.addToast(res.message || 'Project rolled back successfully!', 'success');
      loadSnapshots();
      if (onRollbackSuccess) onRollbackSuccess();
    } catch (err: any) {
      appState.addToast(`Rollback failed: ${err.message}`, 'error');
    } finally {
      isRollingBack = null;
    }
  }

  function closeModal() {
    open = false;
    if (onClose) onClose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="timeline-backdrop" onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="timeline-modal">
      <!-- Header -->
      <div class="timeline-header">
        <div class="header-left">
          <span class="timeline-icon">📜</span>
          <div>
            <h2 class="modal-title">Creative Version Timeline &amp; Rollback</h2>
            <p class="modal-sub">Audit-backed revision milestones for <b>{projectTitle || projectId}</b>.</p>
          </div>
        </div>
        <button class="close-btn" onclick={closeModal}>✕</button>
      </div>

      <!-- Body -->
      <div class="timeline-body">
        <!-- Manual Snapshot Creator Bar -->
        <div class="capture-bar">
          <input 
            type="text" 
            class="capture-input" 
            placeholder="Add note for this milestone (e.g. Pre-Ramadan campaign final copy)..." 
            bind:value={customNote}
          />
          <FluentButton appearance="primary" size="sm" loading={isCapturing} onclick={handleCreateSnapshot}>
            📸 Capture Snapshot Now
          </FluentButton>
        </div>

        <!-- Visual Milestone Tree -->
        <div class="tree-container">
          {#if isLoading}
            <div class="loading-box">Loading revision timeline...</div>
          {:else if snapshots.length === 0}
            <div class="empty-box">
              <span class="empty-icon">🌳</span>
              <p>No historical snapshots captured yet.</p>
              <span class="empty-sub">Snapshots are automatically created during client reviews, decisions, and manual saves.</span>
            </div>
          {:else}
            <div class="milestones-list">
              {#each snapshots as snap, index}
                <div class="milestone-card {index === 0 ? 'is-latest' : ''}">
                  <div class="milestone-indicator">
                    <div class="circle-node">{snap.revision || 1}</div>
                    {#if index < snapshots.length - 1}
                      <div class="connector-line"></div>
                    {/if}
                  </div>

                  <div class="milestone-content">
                    <div class="milestone-top">
                      <div class="rev-tags">
                        <span class="rev-badge">Rev {snap.revision || 1}</span>
                        <span class="status-pill status-{snap.status || 'in-progress'}">{snap.status || 'in-progress'}</span>
                        {#if index === 0}
                          <span class="latest-tag">CURRENT STATE</span>
                        {/if}
                      </div>
                      <span class="timestamp-meta">{new Date(snap.timestamp).toLocaleString()}</span>
                    </div>

                    <div class="milestone-note">"{snap.note || 'Milestone checkpoint'}"</div>

                    <div class="milestone-meta-row">
                      <span class="actor-tag">👤 {snap.actor || 'Designer'}</span>
                      <span class="trigger-tag">⚡ {snap.trigger || 'SNAPSHOT'}</span>
                      <span class="snap-id-tag">{snap.id}</span>
                    </div>

                    {#if index !== 0}
                      <div class="rollback-action-row">
                        <button 
                          class="rollback-btn" 
                          disabled={isRollingBack === snap.id}
                          onclick={() => handleRollback(snap)}
                        >
                          {isRollingBack === snap.id ? 'Restoring...' : '🔄 Rollback to this Revision'}
                        </button>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer -->
      <div class="timeline-footer">
        <span class="security-tip">🔒 Pre-rollback safety backups are created automatically prior to any restoration.</span>
        <FluentButton appearance="subtle" onclick={closeModal}>Close</FluentButton>
      </div>
    </div>
  </div>
{/if}

<style>
  .timeline-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1960;
    padding: 20px;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  .timeline-modal {
    width: 95%;
    max-width: 780px;
    height: 85vh;
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
  }

  .timeline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(15, 23, 42, 0.98);
  }

  .header-left { display: flex; align-items: center; gap: 12px; }
  .timeline-icon { font-size: 24px; }
  .modal-title { font-size: 16px; font-weight: 800; color: #F8FAFC; }
  .modal-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }

  .close-btn { background: transparent; border: none; font-size: 16px; color: #94A3B8; cursor: pointer; padding: 4px 8px; }
  .close-btn:hover { color: #FFF; }

  .timeline-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .capture-bar {
    display: flex;
    gap: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 10px 12px;
  }

  .capture-input {
    flex: 1;
    background: #1E293B;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 8px 12px;
    color: #FFF;
    font-size: 12.5px;
    outline: none;
  }
  .capture-input:focus { border-color: #38BDF8; }

  /* Tree */
  .tree-container { display: flex; flex-direction: column; gap: 12px; }
  .loading-box, .empty-box {
    text-align: center;
    padding: 40px 20px;
    color: #64748B;
    font-size: 13px;
  }
  .empty-icon { font-size: 36px; display: block; margin-bottom: 6px; }
  .empty-sub { font-size: 11px; color: #475569; display: block; margin-top: 4px; }

  .milestones-list { display: flex; flex-direction: column; gap: 0; }
  .milestone-card {
    display: flex;
    gap: 14px;
    position: relative;
  }

  .milestone-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 32px;
    flex-shrink: 0;
  }

  .circle-node {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #043388;
    border: 2px solid #21A1F7;
    color: #FFF;
    font-size: 11px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  .connector-line {
    flex: 1;
    width: 2px;
    background: rgba(255, 255, 255, 0.15);
    margin: 4px 0;
    min-height: 40px;
  }

  .milestone-content {
    flex: 1;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .milestone-card.is-latest .milestone-content {
    border-color: rgba(33, 161, 247, 0.4);
    background: rgba(33, 161, 247, 0.05);
  }

  .milestone-top { display: flex; justify-content: space-between; align-items: center; }
  .rev-tags { display: flex; align-items: center; gap: 8px; }
  .rev-badge { font-size: 11px; font-weight: 800; background: #043388; color: #FFF; padding: 2px 6px; border-radius: 4px; }
  .status-pill { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
  .status-pill.status-approved { background: rgba(16, 185, 129, 0.2); color: #10B981; }
  .status-pill.status-revision { background: rgba(239, 68, 68, 0.2); color: #EF4444; }
  .status-pill.status-in-progress { background: rgba(245, 158, 11, 0.2); color: #F59E0B; }

  .latest-tag { font-size: 9px; font-weight: 900; background: #10B981; color: #0F172A; padding: 2px 5px; border-radius: 3px; }
  .timestamp-meta { font-size: 11px; color: #64748B; }

  .milestone-note { font-size: 13px; color: #F8FAFC; font-weight: 600; font-style: italic; }

  .milestone-meta-row { display: flex; align-items: center; gap: 12px; font-size: 11px; color: #94A3B8; margin-top: 2px; }
  .snap-id-tag { font-family: monospace; font-size: 10px; color: #64748B; }

  .rollback-action-row { margin-top: 6px; display: flex; justify-content: flex-end; }
  .rollback-btn {
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #F87171;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .rollback-btn:hover { background: rgba(239, 68, 68, 0.2); }

  /* Footer */
  .timeline-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(11, 17, 33, 0.98);
  }
  .security-tip { font-size: 11px; color: #64748B; }
</style>
