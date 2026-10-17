<script lang="ts">
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { Icon } from '$lib/components/ui';
  import type { Deliverable } from '$lib/types';
  import DeliverableLightbox from '$lib/components/features/DeliverableLightbox.svelte';
  import HandoverPackageModal from '$lib/components/features/HandoverPackageModal.svelte';

  interface Props {
    project: any;
  }

  let { project }: Props = $props();

  let selectedDeliverable = $state<Deliverable | null>(null);
  let showHandoverModal = $state(false);

  function openLightbox(d: Deliverable) {
    selectedDeliverable = d;
  }
</script>

<div class="deliverables-gallery-container">
  <div class="gallery-header">
    <div class="gallery-title-group">
      <h3>Production Output Assets</h3>
      <span class="gallery-subtitle">Found in <code>05_DELIVERABLES/</code> in local creative vault</span>
    </div>
    {#if projectStore.activeDeliverables.length > 0}
      <button
        class="handover-btn"
        onclick={() => (showHandoverModal = true)}
        title="Build 1-Click Client Handover Package (ZIP + Manifest + Checksums)"
      >
        <Icon name="download" size={13} />
        <span>Client Handover Package</span>
      </button>
    {/if}
  </div>

  {#if projectStore.activeDeliverables.length === 0}
    <div class="empty-gallery">
      <p>No output media found in <code>05_DELIVERABLES</code>.</p>
    </div>
  {:else}
    <div class="deliverables-grid">
      {#each projectStore.activeDeliverables as d}
        <div class="deliverable-card" onclick={() => openLightbox(d)} role="button" tabindex="0">
          <div class="del-preview-box">
            {#if d.isImage || d.previewType === 'image'}
              <img src={d.previewUrl} alt={d.filename} loading="lazy" />
            {:else if d.isVideo || d.previewType === 'video'}
              <div class="del-video-thumb">
                <video src={d.streamUrl || d.previewUrl} preload="metadata" muted playsinline></video>
                <span class="del-play-badge">
                  <Icon name="video" size={12} />
                  <span style="margin-left: 4px;">VIDEO</span>
                </span>
              </div>
            {:else if d.isPdf || d.previewType === 'pdf'}
              <div class="del-pdf-thumb">
                <Icon name="file" size={24} color="var(--kanso-danger)" />
                <span class="del-thumb-text">PDF DOCUMENT</span>
              </div>
            {:else}
              <div class="doc-badge">{d.ext ? d.ext.toUpperCase() : 'FILE'}</div>
            {/if}
            <span class="format-pill">{d.format || (d.ext ? d.ext.toUpperCase() : 'MEDIA')}</span>
          </div>
          <div class="del-details">
            <div class="del-filename" title={d.filename}>{d.filename}</div>
            <div class="del-meta-row">
              <span>{d.sizeFormatted || '0.00 MB'}</span>
              <span class="status-tag status-{d.status || 'review'}">{d.status || 'review'}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if selectedDeliverable}
  <DeliverableLightbox
    deliverable={selectedDeliverable}
    onClose={() => (selectedDeliverable = null)}
    onStatusChange={async (newStatus) => {
      if (selectedDeliverable) {
        await projectStore.updateDeliverableStatus(selectedDeliverable.id, newStatus);
        selectedDeliverable.status = newStatus;
      }
    }}
  />
{/if}

{#if showHandoverModal && project}
  <HandoverPackageModal
    open={showHandoverModal}
    project={project}
    onClose={() => (showHandoverModal = false)}
  />
{/if}

<style>
  .deliverables-gallery-container { padding: 16px 0; }
  .gallery-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .gallery-title-group h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .gallery-subtitle { font-size: 12px; color: var(--kanso-text-muted); }
  .handover-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--kanso-accent); color: #FFFFFF; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
  .empty-gallery { text-align: center; padding: 48px; background: var(--kanso-canvas); border: 1px dashed var(--kanso-border); border-radius: 8px; color: var(--kanso-text-muted); }
  .empty-icon-box { margin-bottom: 12px; }
  .empty-sub { font-size: 12px; margin-top: 4px; }
  .deliverables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  .deliverable-card { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.15s ease; }
  .deliverable-card:hover { border-color: var(--kanso-accent); transform: translateY(-2px); }
  .del-preview-box { height: 140px; background: var(--kanso-canvas); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
  .del-preview-box img { width: 100%; height: 100%; object-fit: cover; }
  .del-video-thumb video { width: 100%; height: 100%; object-fit: cover; }
  .del-play-badge { position: absolute; bottom: 8px; left: 8px; display: flex; align-items: center; padding: 2px 6px; background: rgba(0,0,0,0.7); color: #FFFFFF; font-size: 10px; border-radius: 4px; }
  .format-pill { position: absolute; top: 8px; right: 8px; padding: 2px 6px; background: rgba(0,0,0,0.6); color: #FFFFFF; font-size: 10px; font-weight: 700; border-radius: 4px; }
  .del-details { padding: 12px; display: flex; flex-direction: column; gap: 6px; }
  .del-filename { font-size: 13px; font-weight: 600; color: var(--kanso-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .del-meta-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--kanso-text-muted); }
  .status-tag { padding: 2px 6px; border-radius: 4px; text-transform: uppercase; font-weight: 700; font-size: 9px; }
  .status-tag.status-approved { background: var(--kanso-surface-hover); color: var(--kanso-success); border: 1px solid var(--kanso-border); }
  .status-tag.status-review { background: var(--kanso-surface-hover); color: var(--kanso-warning); border: 1px solid var(--kanso-border); }
  .status-tag.status-rejected { background: var(--kanso-surface-hover); color: var(--kanso-danger); border: 1px solid var(--kanso-border); }
  .doc-badge { font-weight: 800; font-size: 20px; color: var(--kanso-text-muted); }
  .del-pdf-thumb, .del-audio-thumb { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .del-thumb-text { font-size: 10px; font-weight: 700; color: var(--kanso-text-muted); }
</style>
