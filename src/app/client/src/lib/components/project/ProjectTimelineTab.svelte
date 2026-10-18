<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { Button, Card, Icon } from '$lib/components/ui';
  import CaptureSnapshotModal from './CaptureSnapshotModal.svelte';
  import SnapshotDetailModal from './SnapshotDetailModal.svelte';

  interface Props {
    project: any;
  }

  let { project }: Props = $props();

  let snapshots = $state<any[]>([]);
  let loading = $state<boolean>(true);
  let captureModalOpen = $state<boolean>(false);
  let detailModalOpen = $state<boolean>(false);
  let selectedSnapshot = $state<any>(null);
  let inspectingDetails = $state<any>(null);
  let isSubmitting = $state<boolean>(false);

  async function loadSnapshots() {
    if (!project?.id) return;
    loading = true;
    try {
      const res = await ApiClient.getProjectSnapshots(project.id);
      if (res.success && Array.isArray(res.snapshots)) {
        snapshots = res.snapshots;
      }
    } catch (err: any) {
      console.error('[Timeline] Failed to load snapshots:', err);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadSnapshots();
  });

  async function handleCaptureSubmit(trigger: string, note: string) {
    if (!project?.id) return;
    isSubmitting = true;
    try {
      const res = await ApiClient.createProjectSnapshot(project.id, {
        trigger,
        note: note.trim() || 'Milestone checkpoint'
      });
      if (res.success) {
        appState.addToast(`Captured snapshot ${res.snapshot?.id || ''}`, 'success', 'Proof Round');
        captureModalOpen = false;
        await loadSnapshots();
        await projectStore.loadProjects();
      }
    } catch (err: any) {
      appState.addToast(err.message || 'Failed to capture snapshot', 'error');
    } finally {
      isSubmitting = false;
    }
  }

  async function handleInspectSnapshot(snap: any) {
    if (!project?.id) return;
    selectedSnapshot = snap;
    detailModalOpen = true;
    inspectingDetails = null;
    try {
      const res = await ApiClient.getProjectSnapshotDetails(project.id, snap.id);
      if (res.success) {
        inspectingDetails = res.snapshot;
      }
    } catch (err: any) {
      appState.addToast('Failed to load snapshot details', 'error');
    }
  }

  async function handleRollback(snapshotId: string) {
    if (!project?.id) return;
    const confirmed = confirm(
      `Are you sure you want to restore the project to snapshot ${snapshotId}? A safety backup of current state will be taken automatically before restoring.`
    );
    if (!confirmed) return;

    try {
      const res = await ApiClient.rollbackProjectSnapshot(project.id, snapshotId);
      if (res.success) {
        appState.addToast(res.message || 'Project successfully restored', 'success', 'Rollback Complete');
        detailModalOpen = false;
        await loadSnapshots();
        await projectStore.selectProject(project.id);
      }
    } catch (err: any) {
      appState.addToast(err.message || 'Failed to restore snapshot', 'error');
    }
  }

  function formatDateTime(iso: string): string {
    if (!iso) return 'N/A';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  }
</script>

<div class="timeline-container">
  <!-- Timeline Topbar -->
  <div class="timeline-header">
    <div class="header-info">
      <h3 class="timeline-title">Proof Round Timeline</h3>
      <p class="timeline-sub">Versioned checkpoints, client proof history, and immutable milestone backups</p>
    </div>
    <div class="header-actions">
      <Button appearance="primary" size="sm" onclick={() => (captureModalOpen = true)}>
        <Icon name="plus" size={14} />
        <span>Capture Proof Round</span>
      </Button>
    </div>
  </div>

  <!-- Timeline Stream -->
  {#if loading}
    <div class="timeline-empty">
      <p>Loading proof round history...</p>
    </div>
  {:else if snapshots.length === 0}
    <div class="timeline-empty">
      <p>No proof rounds captured yet for this project.</p>
      <Button appearance="secondary" size="sm" onclick={() => (captureModalOpen = true)}>
        <Icon name="camera" size={14} />
        <span>Capture Initial Checkpoint</span>
      </Button>
    </div>
  {:else}
    <div class="timeline-track">
      {#each snapshots as snap, index}
        <div class="timeline-item">
          <!-- Timeline Connector Node -->
          <div class="node-column">
            <div class="node-circle" class:latest={index === 0}></div>
            {#if index < snapshots.length - 1}
              <div class="node-line"></div>
            {/if}
          </div>

          <!-- Card Content -->
          <div class="card-column">
            <Card>
              <div class="snapshot-card-header">
                <div class="header-meta">
                  <span class="rev-badge">Rev {snap.revision || 1}</span>
                  <span class="trigger-pill">{snap.trigger || 'MANUAL'}</span>
                  <span class="timestamp font-mono">{formatDateTime(snap.timestamp)}</span>
                </div>
                <div class="card-controls">
                  <Button appearance="ghost" size="sm" onclick={() => handleInspectSnapshot(snap)} title="Inspect Snapshot Files">
                    <Icon name="file" size={14} />
                    <span>Inspect</span>
                  </Button>
                  <Button appearance="ghost" size="sm" onclick={() => handleRollback(snap.id)} title="Restore project to this snapshot">
                    <Icon name="refresh" size={14} />
                    <span>Restore</span>
                  </Button>
                </div>
              </div>

              <div class="snapshot-body">
                <p class="snapshot-note">{snap.note || 'Milestone snapshot'}</p>
                <div class="snapshot-footer-meta">
                  <span class="actor-info">Actor: {snap.actor || 'Designer'}</span>
                  {#if snap.deliverableCount !== undefined}
                    <span class="meta-sep">•</span>
                    <span>{snap.deliverableCount} Deliverable{snap.deliverableCount === 1 ? '' : 's'}</span>
                  {/if}
                  <span class="meta-sep">•</span>
                  <span class="snap-id font-mono">{snap.id}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<CaptureSnapshotModal
  open={captureModalOpen}
  isSubmitting={isSubmitting}
  onClose={() => (captureModalOpen = false)}
  onSubmit={handleCaptureSubmit}
/>

<SnapshotDetailModal
  open={detailModalOpen}
  snapshot={selectedSnapshot}
  details={inspectingDetails}
  onClose={() => (detailModalOpen = false)}
  onRollback={handleRollback}
/>

<style>
  .timeline-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 16px;
  }
  .timeline-title {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .timeline-sub {
    margin: 0;
    font-size: 12px;
    color: var(--kanso-text-muted);
  }
  .timeline-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 20px;
    background: var(--kanso-surface);
    border: 1px dashed var(--kanso-border);
    border-radius: 8px;
    color: var(--kanso-text-muted);
    font-size: 13px;
  }
  .timeline-track {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .timeline-item {
    display: flex;
    gap: 16px;
    position: relative;
  }
  .node-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 20px;
    padding-top: 14px;
    position: relative;
  }
  .node-circle {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--kanso-border);
    border: 2px solid var(--kanso-canvas);
    z-index: 2;
  }
  .node-circle.latest {
    background: var(--kanso-accent);
    box-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
  }
  .node-line {
    position: absolute;
    top: 24px;
    bottom: -16px;
    width: 2px;
    background: var(--kanso-border);
    z-index: 1;
  }
  .card-column {
    flex: 1;
  }
  .snapshot-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 10px;
    margin-bottom: 10px;
  }
  .header-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .rev-badge {
    padding: 2px 6px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-accent);
  }
  .trigger-pill {
    padding: 2px 8px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    font-size: 10.5px;
    font-weight: 600;
    color: var(--kanso-text-secondary);
    text-transform: uppercase;
  }
  .timestamp {
    font-size: 11px;
    color: var(--kanso-text-muted);
  }
  .card-controls {
    display: flex;
    gap: 6px;
  }
  .snapshot-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .snapshot-note {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--kanso-text-primary);
  }
  .snapshot-footer-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--kanso-text-muted);
  }
  .meta-sep {
    opacity: 0.5;
  }
  .snap-id {
    opacity: 0.7;
  }
</style>
