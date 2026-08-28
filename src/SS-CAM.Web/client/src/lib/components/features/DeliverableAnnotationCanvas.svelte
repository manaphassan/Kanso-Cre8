<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  interface AnnotationItem {
    id: string;
    projectId: string;
    deliverableId: string;
    author: string;
    authorRole?: string;
    authorAvatar?: string;
    content: string;
    timestamp: string;
    resolved: boolean;
    resolvedBy?: string;
    annotation?: {
      x: number;
      y: number;
      pinNumber?: number;
      priority?: 'normal' | 'critical';
    };
  }

  interface Props {
    projectId: string;
    deliverableId: string;
    mediaUrl: string;
    mediaType?: 'image' | 'video' | 'pdf' | 'other';
    altText?: string;
    readOnly?: boolean;
    onAnnotationsCountChange?: (count: number) => void;
  }

  let {
    projectId,
    deliverableId,
    mediaUrl,
    mediaType = 'image',
    altText = 'Deliverable Media',
    readOnly = false,
    onAnnotationsCountChange
  }: Props = $props();

  let annotations = $state<AnnotationItem[]>([]);
  let isAnnotateMode = $state<boolean>(false);
  let isZoomed = $state<boolean>(false);
  let selectedPinId = $state<string | null>(null);

  // New Pin Composer Draft
  let pendingPin = $state<{ x: number; y: number; pinNumber: number } | null>(null);
  let newPinContent = $state<string>('');
  let newPinPriority = $state<'normal' | 'critical'>('normal');
  let isSavingPin = $state<boolean>(false);

  let imageContainer: HTMLDivElement;

  onMount(async () => {
    await loadAnnotations();
    window.addEventListener('project:comment', handleSseComment as EventListener);
    window.addEventListener('project:comment_resolved', handleSseCommentResolved as EventListener);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('project:comment', handleSseComment as EventListener);
      window.removeEventListener('project:comment_resolved', handleSseCommentResolved as EventListener);
    }
  });

  async function loadAnnotations() {
    if (!projectId) return;
    try {
      const res = await ApiClient.getComments(projectId);
      if (res && res.comments) {
        // Filter strictly to comments for this deliverable that have annotation coordinates
        annotations = res.comments.filter(
          (c: any) => c.deliverableId === deliverableId && c.annotation && typeof c.annotation.x === 'number'
        );
        if (onAnnotationsCountChange) {
          onAnnotationsCountChange(annotations.length);
        }
      }
    } catch (e) {
      console.warn('[DeliverableAnnotationCanvas] loadAnnotations error:', e);
    }
  }

  function handleSseComment(e: CustomEvent) {
    if (e.detail?.projectId === projectId) {
      loadAnnotations();
    }
  }

  function handleSseCommentResolved(e: CustomEvent) {
    if (e.detail?.projectId === projectId) {
      loadAnnotations();
    }
  }

  function handleMediaClick(e: MouseEvent) {
    if (!isAnnotateMode || readOnly) return;
    if (!imageContainer) return;

    const rect = imageContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    const nextPinNumber = annotations.length + 1;
    pendingPin = {
      x: parseFloat(xPercent.toFixed(1)),
      y: parseFloat(yPercent.toFixed(1)),
      pinNumber: nextPinNumber
    };
    newPinContent = '';
    newPinPriority = 'normal';
  }

  async function savePendingPin() {
    if (!pendingPin || !newPinContent.trim() || !projectId) return;
    isSavingPin = true;
    try {
      const res = await ApiClient.addComment(projectId, {
        content: newPinContent.trim(),
        deliverableId,
        annotation: {
          x: pendingPin.x,
          y: pendingPin.y,
          pinNumber: pendingPin.pinNumber,
          priority: newPinPriority
        }
      });

      if (res && res.comment) {
        annotations = [...annotations, res.comment];
        if (onAnnotationsCountChange) {
          onAnnotationsCountChange(annotations.length);
        }
        appState.addToast(`Feedback Pin #${pendingPin.pinNumber} posted`, 'success');
      }
      pendingPin = null;
      newPinContent = '';
    } catch (err: any) {
      appState.addToast(`Failed to save feedback pin: ${err.message}`, 'error');
    } finally {
      isSavingPin = false;
    }
  }

  function cancelPendingPin() {
    pendingPin = null;
    newPinContent = '';
  }

  async function toggleResolvePin(pin: AnnotationItem, e: MouseEvent) {
    e.stopPropagation();
    try {
      const newStatus = !pin.resolved;
      await ApiClient.resolveComment(projectId, pin.id, newStatus);
      pin.resolved = newStatus;
      appState.addToast(newStatus ? `Pin #${pin.annotation?.pinNumber || ''} marked resolved` : 'Pin reopened', 'info');
    } catch (err: any) {
      appState.addToast(`Failed to update pin: ${err.message}`, 'error');
    }
  }

  async function deletePin(pinId: string, e: MouseEvent) {
    e.stopPropagation();
    try {
      await ApiClient.deleteComment(projectId, pinId);
      annotations = annotations.filter(a => a.id !== pinId);
      if (selectedPinId === pinId) selectedPinId = null;
      if (onAnnotationsCountChange) {
        onAnnotationsCountChange(annotations.length);
      }
      appState.addToast('Feedback pin deleted', 'info');
    } catch (err: any) {
      appState.addToast(`Failed to delete pin: ${err.message}`, 'error');
    }
  }

  const activePinsCount = $derived(annotations.filter(a => !a.resolved).length);
  const resolvedPinsCount = $derived(annotations.filter(a => a.resolved).length);
</script>

<div class="annotation-canvas-root">
  <!-- Top Toolbar -->
  <div class="canvas-toolbar">
    <div class="toolbar-left">
      <button
        type="button"
        class="mode-toggle-btn"
        class:active={isAnnotateMode}
        onclick={() => (isAnnotateMode = !isAnnotateMode)}
        title="Toggle Pinpoint Annotation Mode"
      >
        <span class="btn-icon">📍</span>
        <span>{isAnnotateMode ? 'Annotation Mode: ON' : 'Drop Feedback Pin'}</span>
      </button>

      {#if annotations.length > 0}
        <div class="pins-counter-pill">
          <span class="active-dot"></span>
          <b>{activePinsCount}</b> Open
          {#if resolvedPinsCount > 0}
            <span class="resolved-text">· {resolvedPinsCount} Resolved</span>
          {/if}
        </div>
      {/if}
    </div>

    <div class="toolbar-right">
      <button
        type="button"
        class="zoom-btn"
        onclick={() => (isZoomed = !isZoomed)}
        title="Toggle Fit / 100% Zoom"
      >
        {isZoomed ? '🔍 Fit' : '🔍 100%'}
      </button>
    </div>
  </div>

  <!-- Media & Pin Layer Viewport -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="media-layer-viewport"
    class:annotate-cursor={isAnnotateMode}
    class:is-zoomed={isZoomed}
    onclick={handleMediaClick}
  >
    <div class="media-container" bind:this={imageContainer}>
      <img src={mediaUrl} alt={altText} class="base-image" />

      <!-- Render Existing Feedback Pins -->
      {#each annotations as pin, idx}
        {@const pinNum = pin.annotation?.pinNumber || idx + 1}
        {@const isCritical = pin.annotation?.priority === 'critical'}
        {@const isSelected = selectedPinId === pin.id}
        
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="pin-marker"
          class:is-critical={isCritical}
          class:is-resolved={pin.resolved}
          class:is-selected={isSelected}
          style="left: {pin.annotation?.x}%; top: {pin.annotation?.y}%;"
          onclick={(e) => { e.stopPropagation(); selectedPinId = isSelected ? null : pin.id; }}
        >
          <div class="pin-badge">
            {#if pin.resolved}
              ✓
            {:else}
              {pinNum}
            {/if}
          </div>

          {#if !pin.resolved && isCritical}
            <div class="pulse-ring"></div>
          {/if}

          <!-- Pin Hover / Selected Popover Card -->
          {#if isSelected}
            <div class="pin-popover" onclick={(e) => e.stopPropagation()}>
              <div class="popover-header">
                <div class="popover-author">
                  <span class="author-avatar" style="background: {pin.authorAvatar || 'var(--brand-primary)'};">
                    {(pin.author || 'U').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <div class="author-name">{pin.author}</div>
                    <div class="pin-time">{new Date(pin.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                {#if isCritical}
                  <span class="critical-badge">CRITICAL</span>
                {/if}
              </div>

              <div class="popover-body">
                <p class="pin-content-text">{pin.content}</p>
              </div>

              <div class="popover-actions">
                <button
                  type="button"
                  class="resolve-action-btn"
                  class:is-resolved={pin.resolved}
                  onclick={(e) => toggleResolvePin(pin, e)}
                >
                  {pin.resolved ? '↩ Reopen' : '✓ Mark Resolved'}
                </button>

                <button
                  type="button"
                  class="delete-action-btn"
                  onclick={(e) => deletePin(pin.id, e)}
                  title="Delete this pin"
                >
                  🗑️
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}

      <!-- Render Pending Pin Being Created -->
      {#if pendingPin}
        <div
          class="pin-marker pending-marker"
          style="left: {pendingPin.x}%; top: {pendingPin.y}%;"
          onclick={(e) => e.stopPropagation()}
        >
          <div class="pin-badge">{pendingPin.pinNumber}</div>
          <div class="pulse-ring active"></div>

          <!-- Pin Note Composer Popover -->
          <div class="pin-composer-card">
            <div class="composer-header">
              <span class="composer-title">Add Feedback Pin #{pendingPin.pinNumber}</span>
              <button type="button" class="close-composer-btn" onclick={cancelPendingPin}>✕</button>
            </div>

            <textarea
              bind:value={newPinContent}
              placeholder="e.g. Adjust headline alignment by 12px, fix logo contrast..."
              class="composer-textarea"
              rows="3"
              autofocus
            ></textarea>

            <div class="composer-footer">
              <div class="priority-selector">
                <label class="priority-option">
                  <input type="radio" bind:group={newPinPriority} value="normal" />
                  <span>Normal</span>
                </label>
                <label class="priority-option critical">
                  <input type="radio" bind:group={newPinPriority} value="critical" />
                  <span>Critical</span>
                </label>
              </div>

              <div class="composer-btn-row">
                <FluentButton appearance="subtle" size="sm" onclick={cancelPendingPin}>
                  Cancel
                </FluentButton>
                <FluentButton
                  appearance="primary"
                  size="sm"
                  loading={isSavingPin}
                  disabled={!newPinContent.trim()}
                  onclick={savePendingPin}
                >
                  Post Pin
                </FluentButton>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>

  {#if isAnnotateMode && !pendingPin}
    <div class="annotate-hint-bar">
      <span>💡 <b>Tip:</b> Click anywhere on the design above to drop a feedback pin for the designer.</span>
    </div>
  {/if}
</div>

<style>
  .annotation-canvas-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
    background: #090D16;
    overflow: hidden;
  }

  .canvas-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: rgba(15, 23, 42, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    z-index: 20;
  }

  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mode-toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #F8FAFC;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .mode-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }
  .mode-toggle-btn.active {
    background: var(--brand-accent, #21A1F7);
    color: #FFFFFF;
    border-color: var(--brand-accent, #21A1F7);
    box-shadow: 0 0 12px rgba(33, 161, 247, 0.4);
  }

  .pins-counter-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #E2E8F0;
    font-size: 11.5px;
    padding: 4px 10px;
    border-radius: 20px;
  }
  .active-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #F59E0B;
  }
  .resolved-text {
    color: #94A3B8;
  }

  .zoom-btn {
    background: rgba(0, 0, 0, 0.5);
    color: #CBD5E1;
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 4px 10px;
    border-radius: 5px;
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .zoom-btn:hover {
    color: #FFFFFF;
    background: rgba(255, 255, 255, 0.1);
  }

  /* Viewport and Media */
  .media-layer-viewport {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    position: relative;
    padding: 16px;
  }
  .media-layer-viewport.annotate-cursor {
    cursor: crosshair;
  }

  .media-container {
    position: relative;
    display: inline-block;
    max-width: 100%;
    max-height: 100%;
  }

  .base-image {
    display: block;
    max-width: 100%;
    max-height: calc(88vh - 120px);
    object-fit: contain;
    border-radius: 6px;
    user-select: none;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  }
  .is-zoomed .base-image {
    max-width: none;
    max-height: none;
  }

  /* Pins */
  .pin-marker {
    position: absolute;
    transform: translate(-50%, -50%);
    cursor: pointer;
    z-index: 100;
  }
  .pin-marker.is-selected {
    z-index: 300;
  }

  .pin-badge {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #0284C7;
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    border: 2px solid #FFFFFF;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .pin-marker:hover .pin-badge,
  .pin-marker.is-selected .pin-badge {
    transform: scale(1.2);
    background: #0369A1;
  }

  .pin-marker.is-critical .pin-badge {
    background: #DC2626;
  }
  .pin-marker.is-resolved .pin-badge {
    background: #10B981;
    border-color: #D1FAE5;
  }

  .pulse-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2px solid #EF4444;
    animation: pulseRadar 2s infinite;
    pointer-events: none;
  }
  .pulse-ring.active {
    border-color: #21A1F7;
  }
  @keyframes pulseRadar {
    0% { transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
  }

  /* Popover */
  .pin-popover {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 260px;
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #CBD5E1);
    border-radius: 10px;
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25);
    padding: 12px;
    z-index: 500;
    cursor: default;
    animation: dropPopover 0.15s ease-out;
  }
  @keyframes dropPopover {
    from { opacity: 0; transform: translate(-50%, -6px); }
    to   { opacity: 1; transform: translate(-50%, 0); }
  }

  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .popover-author {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .author-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .author-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary, #0F172A);
  }
  .pin-time {
    font-size: 10px;
    color: var(--text-secondary, #64748B);
  }
  .critical-badge {
    font-size: 9px;
    font-weight: 900;
    background: #FEE2E2;
    color: #DC2626;
    padding: 2px 5px;
    border-radius: 3px;
  }

  .pin-content-text {
    font-size: 12px;
    color: var(--text-primary, #1E293B);
    line-height: 1.4;
    margin: 0 0 10px 0;
    word-break: break-word;
  }

  .popover-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--surface-card-border, #E2E8F0);
    padding-top: 8px;
  }
  .resolve-action-btn {
    background: #F1F5F9;
    border: 1px solid #CBD5E1;
    color: #334155;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.12s;
  }
  .resolve-action-btn:hover {
    background: #E2E8F0;
  }
  .resolve-action-btn.is-resolved {
    background: #DCFCE7;
    border-color: #86EFAC;
    color: #15803D;
  }

  .delete-action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 13px;
    padding: 4px;
    border-radius: 4px;
    opacity: 0.6;
    transition: opacity 0.12s;
  }
  .delete-action-btn:hover {
    opacity: 1;
    background: #FEE2E2;
  }

  /* Pin Composer Card */
  .pin-composer-card {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 290px;
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #CBD5E1);
    border-radius: 10px;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
    padding: 14px;
    z-index: 600;
    cursor: default;
  }
  .composer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .composer-title {
    font-size: 12.5px;
    font-weight: 800;
    color: var(--text-primary, #0F172A);
  }
  .close-composer-btn {
    border: none;
    background: transparent;
    color: #64748B;
    cursor: pointer;
    font-size: 12px;
  }

  .composer-textarea {
    width: 100%;
    border: 1px solid var(--surface-card-border, #CBD5E1);
    border-radius: 6px;
    padding: 8px;
    font-size: 12px;
    font-family: inherit;
    color: var(--text-primary, #0F172A);
    background: #FFFFFF;
    resize: none;
    box-sizing: border-box;
    outline: none;
  }
  .composer-textarea:focus {
    border-color: var(--brand-accent, #21A1F7);
    box-shadow: 0 0 0 2px rgba(33, 161, 247, 0.2);
  }

  .composer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
  }
  .priority-selector {
    display: flex;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    color: #475569;
  }
  .priority-option {
    display: flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
  }
  .priority-option.critical {
    color: #DC2626;
  }
  .composer-btn-row {
    display: flex;
    gap: 6px;
  }

  .annotate-hint-bar {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #F8FAFC;
    font-size: 11.5px;
    padding: 6px 14px;
    border-radius: 20px;
    backdrop-filter: blur(8px);
    z-index: 10;
    pointer-events: none;
    animation: fadeIn 0.2s ease;
  }
</style>
