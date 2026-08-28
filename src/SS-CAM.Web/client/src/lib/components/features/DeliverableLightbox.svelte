<script lang="ts">
  import type { DeliverableItem } from '$lib/types';
  import { appState } from '$lib/stores/appState.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import DeliverableAnnotationCanvas from '$lib/components/features/DeliverableAnnotationCanvas.svelte';

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
  let isImageZoomed = $state<boolean>(false);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open && onClose) {
      onClose();
    }
  }

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

<svelte:window onkeydown={handleKeydown} />

{#if open && deliverable}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="lightbox-backdrop" onclick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
    <div class="lightbox-modal">
      <!-- Media Viewer Left Pane -->
      <div class="lightbox-media-viewer">
        {#if deliverable.isImage || deliverable.previewType === 'image'}
          <DeliverableAnnotationCanvas
            projectId={deliverable.project?.id || deliverable.projectId || deliverable.project?.jobId || deliverable.projectJobId || ''}
            deliverableId={deliverable.id || deliverable.filename}
            mediaUrl={deliverable.previewUrl}
            altText={deliverable.filename}
          />
        {:else if deliverable.isVideo || deliverable.previewType === 'video'}
          <div class="video-wrapper">
            <!-- svelte-ignore a11y_media_has_caption -->
            <video src={deliverable.streamUrl || deliverable.previewUrl} controls autoplay playsinline></video>
          </div>
        {:else if deliverable.isPdf || deliverable.previewType === 'pdf'}
          <div class="pdf-wrapper">
            <iframe src={deliverable.previewUrl} title={deliverable.filename} class="pdf-iframe"></iframe>
          </div>
        {:else if deliverable.isAudio || deliverable.previewType === 'audio'}
          <div class="audio-wrapper">
            <div class="audio-disc">🎧</div>
            <div class="audio-track-title">{deliverable.filename}</div>
            <!-- svelte-ignore a11y_media_has_caption -->
            <audio src={deliverable.streamUrl || deliverable.previewUrl} controls autoplay class="audio-player"></audio>
          </div>
        {:else}
          <div class="file-icon-placeholder">
            <span class="file-ext">{(deliverable.ext || deliverable.extension || (deliverable.filename ? deliverable.filename.split('.').pop() : '') || 'FILE').replace('.', '').toUpperCase()}</span>
            <span class="file-name">{deliverable.filename}</span>
            <p class="file-hint">Raw asset file. Use the download link in the sidebar to view locally.</p>
          </div>
        {/if}
      </div>

      <!-- Metadata & Decision Sidebar Right Pane -->
      <div class="lightbox-sidebar">
        <div class="sidebar-top">
          <div class="header-row">
            <span class="badge badge-brand">{deliverable.project?.brand || deliverable.projectBrand || 'SS'}</span>
            <button class="close-btn" onclick={onClose} aria-label="Close dialog">✕ Close</button>
          </div>

          <h2 class="deliverable-title" title={deliverable.filename}>{deliverable.filename}</h2>
          <div class="project-subtitle">
            Project: <b>{deliverable.project?.title || deliverable.projectTitle || 'Campaign Project'}</b>
            {#if deliverable.project?.jobId || deliverable.projectJobId}
              <span class="job-pill">{deliverable.project?.jobId || deliverable.projectJobId}</span>
            {/if}
          </div>

          <div class="metadata-box">
            <div class="meta-row">
              <span>Designer (Assignee):</span>
              <b>{deliverable.project?.designer || deliverable.projectDesigner || 'Unassigned'}</b>
            </div>
            <div class="meta-row">
              <span>Storage Directory:</span>
              <b><code>{deliverable.folder || deliverable.folderLabel || '05_DELIVERABLES'}</code></b>
            </div>
            <div class="meta-row">
              <span>Format & Type:</span>
              <b>{deliverable.format || (deliverable.ext ? deliverable.ext.toUpperCase() : 'Output Media')}</b>
            </div>
            <div class="meta-row">
              <span>File Size:</span>
              <b>{deliverable.sizeFormatted || (deliverable.sizeBytes ? (deliverable.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : '0.00 MB')}</b>
            </div>
            <div class="meta-row">
              <span>Modified:</span>
              <b>{deliverable.modified ? new Date(deliverable.modified).toLocaleDateString() : 'N/A'}</b>
            </div>
            <div class="meta-row">
              <span>Review Status:</span>
              <b class="status-tag status-{(deliverable.status || 'pending')}">{(deliverable.status || 'pending').toUpperCase()}</b>
            </div>
          </div>
        </div>

        <div class="sidebar-actions">
          <a
            href={deliverable.downloadUrl || `/api/deliverables/download?id=${deliverable.id}`}
            download={deliverable.filename}
            class="download-btn"
            title="Download full quality asset"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            <span>Download Master Asset</span>
          </a>

          {#if appState.canApprove()}
            <div class="decision-group">
              <FluentButton appearance="danger" size="md" style="width: 100%;" loading={isSubmitting} onclick={handleRevision}>
                ⚠️ Request Revision
              </FluentButton>
              <FluentButton appearance="success" size="md" style="width: 100%;" loading={isSubmitting} onclick={handleApprove}>
                ✓ Approve Deliverable
              </FluentButton>
            </div>
          {:else}
            <div class="non-approver-notice">
              Sign-off decisions are logged by Art Directors and Project Leads.
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
    background: rgba(0, 0, 0, 0.88);
    backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1500;
    padding: 24px;
    animation: fadeIn 0.16s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  .lightbox-modal {
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E2E8F0);
    border-radius: var(--radius-xl, 16px);
    display: grid;
    grid-template-columns: 1fr 360px;
    width: 95%;
    max-width: 1240px;
    height: 88vh;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .lightbox-media-viewer {
    background: #090D16;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    padding: 16px;
  }

  .image-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    position: relative;
  }

  .image-wrapper img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 6px;
    cursor: zoom-in;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .image-wrapper.zoomed img {
    max-width: none;
    max-height: none;
    cursor: zoom-out;
  }

  .zoom-toggle-btn {
    position: absolute;
    bottom: 16px;
    right: 16px;
    background: rgba(0, 0, 0, 0.75);
    color: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: all 0.15s;
  }
  .zoom-toggle-btn:hover {
    background: rgba(0, 0, 0, 0.95);
    border-color: #FFFFFF;
  }

  .video-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .video-wrapper video {
    max-width: 100%;
    max-height: 100%;
    border-radius: 8px;
    outline: none;
  }

  .pdf-wrapper {
    width: 100%;
    height: 100%;
  }
  .pdf-iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 8px;
    background: #FFFFFF;
  }

  .audio-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: #FFFFFF;
  }
  .audio-disc {
    font-size: 64px;
    animation: spin 8s linear infinite;
  }
  .audio-track-title {
    font-size: 16px;
    font-weight: 700;
    color: #E2E8F0;
  }
  .audio-player {
    width: 320px;
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
    font-size: 28px;
    font-weight: 900;
    background: var(--brand-primary, #043388);
    padding: 12px 24px;
    border-radius: 10px;
    letter-spacing: 1px;
  }
  .file-name {
    font-size: 15px;
    font-weight: 700;
    color: #F8FAFC;
  }
  .file-hint {
    font-size: 12.5px;
    color: #94A3B8;
    max-width: 320px;
  }

  .lightbox-sidebar {
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: var(--surface-card, #FFFFFF);
    border-left: 1px solid var(--surface-card-border, #E2E8F0);
    overflow-y: auto;
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .badge-brand {
    font-size: 11px;
    font-weight: 800;
    background: var(--brand-tint, #EBF4FE);
    color: var(--text-brand, #043388);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .close-btn {
    border: none;
    background: transparent;
    color: var(--text-secondary, #64748B);
    font-size: 13px;
    cursor: pointer;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.12s;
  }
  .close-btn:hover {
    color: var(--text-primary, #0F172A);
    background: var(--bg-app, #F1F5F9);
  }

  .deliverable-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--text-primary, #0F172A);
    margin-bottom: 6px;
    line-height: 1.3;
    word-break: break-word;
  }

  .project-subtitle {
    font-size: 13px;
    color: var(--text-secondary, #64748B);
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .job-pill {
    font-size: 11px;
    font-weight: 800;
    background: #E2E8F0;
    color: #334155;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .metadata-box {
    background: var(--surface-card-subtle, #F8FAFC);
    border: 1px solid var(--surface-card-border, #E2E8F0);
    border-radius: var(--radius-md, 8px);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 12.5px;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text-secondary, #64748B);
  }
  .meta-row b {
    color: var(--text-primary, #0F172A);
    font-weight: 700;
    text-align: right;
    max-width: 60%;
    word-break: break-word;
  }
  .meta-row code {
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 11px;
  }

  .status-tag {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .status-approved { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
  .status-revision { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
  .status-pending { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }

  .sidebar-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 18px;
    border-top: 1px solid var(--surface-card-border, #E2E8F0);
  }

  .download-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--surface-card-subtle, #F8FAFC);
    color: var(--text-primary, #0F172A);
    border: 1px solid var(--surface-card-border, #CBD5E1);
    border-radius: var(--radius-md, 8px);
    padding: 9px 14px;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.14s;
  }
  .download-btn:hover {
    background: #E2E8F0;
    border-color: #94A3B8;
  }

  .decision-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .non-approver-notice {
    font-size: 12px;
    color: var(--text-secondary, #64748B);
    text-align: center;
    padding: 10px;
    background: var(--surface-card-subtle, #F8FAFC);
    border-radius: var(--radius-md, 8px);
    border: 1px solid var(--surface-card-border, #E2E8F0);
  }
</style>
