<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import type { DeliverableItem } from '$lib/types';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';
  import DeliverableLightbox from '$lib/components/features/DeliverableLightbox.svelte';

  let selectedDeliverable = $state<DeliverableItem | null>(null);
  let lightboxOpen = $state<boolean>(false);

  onMount(() => {
    projectStore.loadDeliverables();
  });

  function openLightbox(d: DeliverableItem) {
    selectedDeliverable = d;
    lightboxOpen = true;
  }
</script>

<div class="deliverables-view-container">
  <div class="view-header">
    <div>
      <h1 class="view-title">Deliverables & Review Queue</h1>
      <p class="view-subtitle">Review, inspect and sign-off on design outputs across all campaign projects</p>
    </div>
  </div>

  {#if projectStore.isLoading}
    <div class="loading-state">Loading deliverables from Synology NAS...</div>
  {:else if projectStore.deliverables.length === 0}
    <div class="empty-state">No deliverables found in the review queue.</div>
  {:else}
    <div class="deliverables-grid">
      {#each projectStore.deliverables as d}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="del-card-wrapper" onclick={() => openLightbox(d)}>
          <FluentCard hoverLift padding="14px">
            <div class="del-preview-box">
              {#if d.isImage}
                <img src={d.previewUrl} alt={d.filename} />
              {:else}
                <div class="doc-icon">{d.ext.toUpperCase()}</div>
              {/if}
            </div>

            <div class="del-body">
              <div class="del-top">
                <span class="job-id">{d.project?.jobId || 'N/A'}</span>
                <FluentBadge type="brand" value={d.project?.brand || 'SS'} />
              </div>
              <h3 class="del-title">{d.filename}</h3>
              <p class="del-proj-name">{d.project?.title || 'Unknown Project'}</p>
              <div class="del-foot">
                <span>{(d.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                <span class="status-{d.status}">{d.status.toUpperCase()}</span>
              </div>
            </div>
          </FluentCard>
        </div>
      {/each}
    </div>
  {/if}

  <DeliverableLightbox
    deliverable={selectedDeliverable}
    bind:open={lightboxOpen}
    onClose={() => lightboxOpen = false}
    onApprove={async (d) => {
      const projId = d.project?.id || d.project?.jobId;
      if (projId) {
        await ApiClient.submitDecision(projId, { decision: 'approved', deliverableId: d.id });
        appState.addToast(`Deliverable ${d.filename} approved!`, 'success');
        await projectStore.loadDeliverables();
      }
    }}
    onRevision={async (d) => {
      const projId = d.project?.id || d.project?.jobId;
      if (projId) {
        await ApiClient.submitDecision(projId, { decision: 'revision_requested', deliverableId: d.id });
        appState.addToast(`Revision requested for ${d.filename}`, 'warning');
        await projectStore.loadDeliverables();
      }
    }}
  />
</div>

<style>
  .deliverables-view-container {
    display: flex;
    flex-direction: column;
  }

  .view-header {
    margin-bottom: 20px;
  }

  .view-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .view-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .deliverables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  .del-card-wrapper {
    cursor: pointer;
  }

  .del-preview-box {
    height: 160px;
    background: #000000;
    border-radius: var(--radius-md);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .del-preview-box img {
    max-width: 100%;
    max-height: 100%;
    object-fit: cover;
  }

  .doc-icon {
    font-size: 28px;
    font-weight: 800;
    color: #FFFFFF;
    background: var(--brand-primary);
    padding: 10px 20px;
    border-radius: 8px;
  }

  .del-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .job-id {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--brand-accent);
  }

  .del-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }

  .del-proj-name {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 8px;
  }

  .del-foot {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    color: var(--text-tertiary);
    font-weight: 600;
    padding-top: 8px;
    border-top: 1px solid var(--surface-card-border);
  }

  .status-approved { color: var(--color-success); }
  .status-revision { color: var(--color-danger); }
  .status-pending { color: var(--color-warning); }

  .loading-state, .empty-state {
    text-align: center;
    padding: 50px 0;
    color: var(--text-secondary);
  }
</style>
