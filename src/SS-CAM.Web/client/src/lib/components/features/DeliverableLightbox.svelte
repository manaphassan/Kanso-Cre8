<script lang="ts">
  import type { DeliverableItem } from '$lib/types';
  import { appState } from '$lib/stores/appState.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  interface Props {
    deliverable: DeliverableItem | null;
    open?: boolean;
    onClose?: () => void;
    onApprove?: (d: DeliverableItem) => Promise<void> | void;
    onRevision?: (d: DeliverableItem) => Promise<void> | void;
  }

  let {
    deliverable,
    open = $bindable(false),
    onClose,
    onApprove,
    onRevision
  }: Props = $props();

  let isSubmitting = $state<boolean>(false);

  async function handleApprove() {
    if (!deliverable || !onApprove) return;
    isSubmitting = true;
    try {
      await onApprove(deliverable);
      if (onClose) onClose();
    } finally {
      isSubmitting = false;
    }
  }

  async function handleRevision() {
    if (!deliverable || !onRevision) return;
    isSubmitting = true;
    try {
      await onRevision(deliverable);
      if (onClose) onClose();
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if open && deliverable}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="lightbox-backdrop" onclick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
    <div class="lightbox-modal">
      <div class="lightbox-media-viewer">
        {#if deliverable.isImage}
          <img src={deliverable.previewUrl} alt={deliverable.filename} />
        {:else if deliverable.isVideo}
          <!-- svelte-ignore a11y_media_has_caption -->
          <video src={deliverable.previewUrl} controls autoplay></video>
        {:else}
          <div class="file-icon-placeholder">
            <span class="file-ext">{deliverable.ext}</span>
            <span class="file-name">{deliverable.filename}</span>
          </div>
        {/if}
      </div>

      <div class="lightbox-sidebar">
        <div class="sidebar-top">
          <div class="header-row">
            <span class="badge badge-brand">{deliverable.project?.brand || 'SS'}</span>
            <button class="close-btn" onclick={onClose}>✕ Close</button>
          </div>

          <h2 class="deliverable-title">{deliverable.filename}</h2>
          <div class="project-subtitle">
            Project: <b>{deliverable.project?.title || 'Unknown'}</b> ({deliverable.project?.jobId || ''})
          </div>

          <div class="metadata-box">
            <div class="meta-row"><span>Designer:</span> <b>{deliverable.project?.designer || 'Unassigned'}</b></div>
            <div class="meta-row"><span>Size:</span> <b>{(deliverable.sizeBytes / (1024 * 1024)).toFixed(2)} MB</b></div>
            <div class="meta-row"><span>Modified:</span> <b>{new Date(deliverable.modified).toLocaleDateString()}</b></div>
            <div class="meta-row"><span>Review Status:</span> <b class="status-{deliverable.status}">{deliverable.status.toUpperCase()}</b></div>
          </div>
        </div>

        <div class="sidebar-actions">
          {#if appState.canApprove()}
            <FluentButton appearance="danger" size="md" style="width: 100%;" loading={isSubmitting} onclick={handleRevision}>
              Request Revision
            </FluentButton>
            <FluentButton appearance="success" size="md" style="width: 100%;" loading={isSubmitting} onclick={handleApprove}>
              Approve Deliverable
            </FluentButton>
          {:else}
            <div class="non-approver-notice">
              Sign-off permissions reserved for Creative Leads and Directors.
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .lightbox-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1500;
    padding: 24px;
  }

  .lightbox-modal {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-xl);
    display: grid;
    grid-template-columns: 1fr 340px;
    width: 95%;
    max-width: 1180px;
    height: 85vh;
    overflow: hidden;
    box-shadow: var(--shadow-xl);
  }

  .lightbox-media-viewer {
    background: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 20px;
  }

  .lightbox-media-viewer img,
  .lightbox-media-viewer video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: var(--radius-md);
  }

  .file-icon-placeholder {
    color: #FFFFFF;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .file-ext {
    font-size: 32px;
    font-weight: 800;
    background: var(--brand-primary);
    padding: 10px 20px;
    border-radius: 8px;
  }
  .file-name {
    font-size: 14px;
    color: #CBD5E1;
  }

  .lightbox-sidebar {
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: var(--surface-card);
    border-left: 1px solid var(--surface-card-border);
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .close-btn {
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
  }
  .close-btn:hover { color: var(--text-primary); }

  .deliverable-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 6px;
  }

  .project-subtitle {
    font-size: 12.5px;
    color: var(--text-secondary);
    margin-bottom: 18px;
  }

  .metadata-box {
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12.5px;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    color: var(--text-secondary);
  }
  .meta-row b { color: var(--text-primary); }

  .status-approved { color: var(--color-success) !important; }
  .status-revision { color: var(--color-danger) !important; }
  .status-pending { color: var(--color-warning) !important; }

  .sidebar-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 16px;
    border-top: 1px solid var(--surface-card-border);
  }

  .non-approver-notice {
    font-size: 12px;
    color: var(--text-secondary);
    text-align: center;
    padding: 12px;
    background: var(--surface-card-subtle);
    border-radius: var(--radius-md);
    border: 1px solid var(--surface-card-border);
  }
</style>
