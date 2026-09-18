<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentIcons from '$lib/components/ui/FluentIcons.svelte';

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
      videoTimestamp?: number;
      timecodeFormatted?: string;
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
  let pinFilter = $state<'all' | 'open' | 'critical' | 'resolved'>('all');

  // Video State
  let videoElem = $state<HTMLVideoElement | null>(null);
  let videoCurrentTime = $state<number>(0);
  let videoDuration = $state<number>(0);
  let isVideoPlaying = $state<boolean>(false);
  let isVideoMuted = $state<boolean>(false);

  // New Pin Composer Draft
  let pendingPin = $state<{
    x: number;
    y: number;
    pinNumber: number;
    videoTimestamp?: number;
    timecodeFormatted?: string;
  } | null>(null);

  let newPinContent = $state<string>('');
  let newPinPriority = $state<'normal' | 'critical'>('normal');
  let isSavingPin = $state<boolean>(false);

  let imageContainer: HTMLDivElement;

  function formatTimecode(sec: number): string {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

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

  function toggleAnnotateMode() {
    if (readOnly) return;
    isAnnotateMode = !isAnnotateMode;
    if (isAnnotateMode && mediaType === 'video' && videoElem && !videoElem.paused) {
      videoElem.pause();
      isVideoPlaying = false;
    }
    if (!isAnnotateMode) {
      pendingPin = null;
    }
  }

  function handleMediaClick(e: MouseEvent) {
    if (!isAnnotateMode || readOnly) return;
    if (!imageContainer) return;

    // Pause video if playing
    if (mediaType === 'video' && videoElem && !videoElem.paused) {
      videoElem.pause();
      isVideoPlaying = false;
    }

    const rect = imageContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    const nextPinNumber = annotations.length + 1;
    const curTime = mediaType === 'video' ? (videoElem?.currentTime || 0) : undefined;
    const timeFormatted = curTime !== undefined ? formatTimecode(curTime) : undefined;

    pendingPin = {
      x: parseFloat(xPercent.toFixed(1)),
      y: parseFloat(yPercent.toFixed(1)),
      pinNumber: nextPinNumber,
      videoTimestamp: curTime,
      timecodeFormatted: timeFormatted
    };
    newPinContent = '';
    newPinPriority = 'normal';
  }

  function addMarkerAtCurrentTime() {
    if (readOnly) return;
    if (videoElem && !videoElem.paused) {
      videoElem.pause();
      isVideoPlaying = false;
    }
    isAnnotateMode = true;
    const nextPinNumber = annotations.length + 1;
    const curTime = videoElem?.currentTime || 0;
    pendingPin = {
      x: 50,
      y: 50,
      pinNumber: nextPinNumber,
      videoTimestamp: curTime,
      timecodeFormatted: formatTimecode(curTime)
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
          priority: newPinPriority,
          videoTimestamp: pendingPin.videoTimestamp,
          timecodeFormatted: pendingPin.timecodeFormatted
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

  function selectPin(pin: AnnotationItem) {
    selectedPinId = selectedPinId === pin.id ? null : pin.id;
    if (mediaType === 'video' && videoElem && typeof pin.annotation?.videoTimestamp === 'number') {
      videoElem.currentTime = pin.annotation.videoTimestamp;
      videoCurrentTime = pin.annotation.videoTimestamp;
    }
  }

  // Video Controls
  function togglePlayPause() {
    if (!videoElem) return;
    if (videoElem.paused) {
      videoElem.play();
      isVideoPlaying = true;
    } else {
      videoElem.pause();
      isVideoPlaying = false;
    }
  }

  function handleVideoTimeUpdate() {
    if (!videoElem) return;
    videoCurrentTime = videoElem.currentTime;
  }

  function handleVideoLoadedMetadata() {
    if (!videoElem) return;
    videoDuration = videoElem.duration;
  }

  function handleScrubberInput(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (videoElem) {
      videoElem.currentTime = val;
      videoCurrentTime = val;
    }
  }

  const activePinsCount = $derived(annotations.filter(a => !a.resolved).length);
  const criticalPinsCount = $derived(annotations.filter(a => !a.resolved && a.annotation?.priority === 'critical').length);
  const resolvedPinsCount = $derived(annotations.filter(a => a.resolved).length);

  const visiblePins = $derived(
    annotations.filter(a => {
      if (pinFilter === 'open') return !a.resolved;
      if (pinFilter === 'critical') return !a.resolved && a.annotation?.priority === 'critical';
      if (pinFilter === 'resolved') return a.resolved;
      return true;
    })
  );

  const videoTimelinePins = $derived(
    annotations.filter(a => typeof a.annotation?.videoTimestamp === 'number')
  );
</script>

<div class="annotation-canvas-root">
  <!-- Top Toolbar -->
  <div class="canvas-toolbar">
    <div class="toolbar-left">
      <button
        type="button"
        class="mode-toggle-btn"
        class:active={isAnnotateMode}
        onclick={toggleAnnotateMode}
        disabled={readOnly}
      >
        <FluentIcons name="pin" size={14} />
        <span style="margin-left: 6px;">{isAnnotateMode ? 'Annotation Mode: Active' : (mediaType === 'video' ? 'Click Frame to Pin' : 'Drop Feedback Pin')}</span>
      </button>

      {#if mediaType === 'video'}
        <button
          type="button"
          class="quick-marker-btn"
          onclick={addMarkerAtCurrentTime}
          disabled={readOnly}
          title="Add timestamped review pin at current video playback position"
        >
          <span>⏱️ Pin at {formatTimecode(videoCurrentTime)}</span>
        </button>
      {/if}

      <!-- Filter Pills -->
      <div class="filter-pills-row">
        <button
          type="button"
          class="filter-pill"
          class:active={pinFilter === 'all'}
          onclick={() => (pinFilter = 'all')}
        >
          All ({annotations.length})
        </button>
        <button
          type="button"
          class="filter-pill"
          class:active={pinFilter === 'open'}
          onclick={() => (pinFilter = 'open')}
        >
          <span class="dot-open"></span>
          Open ({activePinsCount})
        </button>
        {#if criticalPinsCount > 0}
          <button
            type="button"
            class="filter-pill critical"
            class:active={pinFilter === 'critical'}
            onclick={() => (pinFilter = 'critical')}
          >
            <span class="dot-critical"></span>
            Critical ({criticalPinsCount})
          </button>
        {/if}
        {#if resolvedPinsCount > 0}
          <button
            type="button"
            class="filter-pill resolved"
            class:active={pinFilter === 'resolved'}
            onclick={() => (pinFilter = 'resolved')}
          >
            ✓ Resolved ({resolvedPinsCount})
          </button>
        {/if}
      </div>
    </div>

    <div class="toolbar-right">
      {#if mediaType !== 'video'}
        <button
          type="button"
          class="zoom-btn"
          onclick={() => (isZoomed = !isZoomed)}
          title="Toggle Fit / 100% Zoom"
        >
          <FluentIcons name="search" size={12} />
          <span style="margin-left: 5px;">{isZoomed ? 'Fit Screen' : '100% Zoom'}</span>
        </button>
      {/if}
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
      {#if mediaType === 'video'}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          bind:this={videoElem}
          src={mediaUrl}
          class="base-video"
          ontimeupdate={handleVideoTimeUpdate}
          onloadedmetadata={handleVideoLoadedMetadata}
          onplay={() => (isVideoPlaying = true)}
          onpause={() => (isVideoPlaying = false)}
          onended={() => (isVideoPlaying = false)}
          playsinline
        ></video>
      {:else}
        <img src={mediaUrl} alt={altText} class="base-image" />
      {/if}

      <!-- Render Existing Feedback Pins -->
      {#each visiblePins as pin, idx}
        {@const pinNum = pin.annotation?.pinNumber || idx + 1}
        {@const isCritical = pin.annotation?.priority === 'critical'}
        {@const isSelected = selectedPinId === pin.id}
        {@const hasTimecode = typeof pin.annotation?.videoTimestamp === 'number'}
        
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="pin-marker"
          class:is-critical={isCritical}
          class:is-resolved={pin.resolved}
          class:is-selected={isSelected}
          style="left: {pin.annotation?.x}%; top: {pin.annotation?.y}%;"
          onclick={(e) => { e.stopPropagation(); selectPin(pin); }}
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
                  <span class="author-avatar" style="background: {pin.authorAvatar || '#0284C7'};">
                    {(pin.author || 'U').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <div class="author-name">{pin.author}</div>
                    <div class="pin-time">
                      {new Date(pin.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {#if hasTimecode}
                        <span class="timecode-badge">⏱️ {pin.annotation?.timecodeFormatted || formatTimecode(pin.annotation?.videoTimestamp || 0)}</span>
                      {/if}
                    </div>
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
                  <FluentIcons name={pin.resolved ? 'history' : 'checkCircle'} size={12} />
                  <span style="margin-left: 4px;">{pin.resolved ? 'Reopen' : 'Mark Resolved'}</span>
                </button>

                <button
                  type="button"
                  class="delete-action-btn"
                  onclick={(e) => deletePin(pin.id, e)}
                  title="Delete this pin"
                >
                  <FluentIcons name="delete" size={13} />
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
              <div class="composer-title-wrap">
                <span class="composer-title">Add Feedback Pin #{pendingPin.pinNumber}</span>
                {#if pendingPin.timecodeFormatted}
                  <span class="timecode-pill">⏱️ {pendingPin.timecodeFormatted}</span>
                {/if}
              </div>
              <button type="button" class="close-composer-btn" onclick={cancelPendingPin} title="Cancel">
                <FluentIcons name="close" size={14} />
              </button>
            </div>

            <textarea
              bind:value={newPinContent}
              placeholder="e.g. Adjust typography pacing, brighten contrast on logo, trim 1s intro..."
              class="composer-textarea"
              rows="3"
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
                <FluentButton appearance="subtle" size="sm" onclick={cancelPendingPin}>Cancel</FluentButton>
                <FluentButton
                  appearance="primary"
                  size="sm"
                  loading={isSavingPin}
                  disabled={!newPinContent.trim()}
                  onclick={savePendingPin}
                >
                  Save Pin
                </FluentButton>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Video Playback & Annotation Scrubber Bar -->
  {#if mediaType === 'video'}
    <div class="video-scrubber-deck">
      <div class="playback-controls-row">
        <button
          type="button"
          class="play-btn"
          onclick={togglePlayPause}
          title={isVideoPlaying ? 'Pause Video' : 'Play Video'}
        >
          {#if isVideoPlaying}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          {:else}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          {/if}
        </button>

        <span class="timecode-ticker">
          <span class="cur-time">{formatTimecode(videoCurrentTime)}</span>
          <span class="slash">/</span>
          <span class="dur-time">{formatTimecode(videoDuration)}</span>
        </span>

        <!-- Timeline Scrubber with Pin Markers -->
        <div class="timeline-track-wrap">
          <input
            type="range"
            min="0"
            max={videoDuration || 100}
            step="0.05"
            value={videoCurrentTime}
            oninput={handleScrubberInput}
            class="timeline-slider"
          />

          <!-- Render Marker Dots on Scrubber -->
          <div class="scrubber-markers-layer">
            {#each videoTimelinePins as pin}
              {@const posPct = (pin.annotation!.videoTimestamp! / Math.max(0.1, videoDuration)) * 100}
              {@const isCritical = pin.annotation?.priority === 'critical'}
              {@const isResolved = pin.resolved}
              <button
                type="button"
                class="scrubber-pin-dot"
                class:is-critical={isCritical}
                class:is-resolved={isResolved}
                style="left: {posPct}%;"
                onclick={(e) => { e.stopPropagation(); selectPin(pin); }}
                title="Pin #{pin.annotation?.pinNumber}: {pin.annotation?.timecodeFormatted} - {pin.content.substring(0, 30)}..."
              ></button>
            {/each}
          </div>
        </div>

        <button
          type="button"
          class="add-timecode-btn"
          onclick={addMarkerAtCurrentTime}
          title="Add Feedback Pin at Current Video Time"
        >
          <FluentIcons name="pin" size={12} />
          <span>Mark Frame</span>
        </button>
      </div>
    </div>
  {/if}

  {#if isAnnotateMode && !pendingPin}
    <div class="annotate-hint-bar">
      <span>💡 <b>Tip:</b> Click anywhere on the {mediaType === 'video' ? 'video frame' : 'design'} above to drop a review pin.</span>
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
    background: var(--kanso-canvas, #09090B);
    overflow: hidden;
  }

  /* Toolbar */
  .canvas-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: var(--kanso-surface, #18181B);
    border-bottom: 1px solid var(--kanso-border, #27272A);
    z-index: 20;
  }

  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mode-toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--kanso-surface-hover, #27272A);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .mode-toggle-btn:hover {
    border-color: var(--kanso-accent, #38BDF8);
  }
  .mode-toggle-btn.active {
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
    border-color: var(--kanso-accent, #38BDF8);
  }

  .quick-marker-btn {
    display: flex;
    align-items: center;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: var(--kanso-accent, #38BDF8);
    padding: 4px 9px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    font-family: monospace;
    cursor: pointer;
  }
  .quick-marker-btn:hover {
    background: rgba(56, 189, 248, 0.2);
  }

  .filter-pills-row {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    padding: 2px 6px;
    border-radius: 6px;
  }

  .filter-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: none;
    color: var(--kanso-text-muted, #71717A);
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.12s;
  }
  .filter-pill:hover, .filter-pill.active {
    color: var(--kanso-text-primary, #F4F4F5);
    background: var(--kanso-surface-hover, #27272A);
  }
  .filter-pill.critical.active {
    color: #EF4444;
  }
  .filter-pill.resolved.active {
    color: #10B981;
  }

  .dot-open { width: 6px; height: 6px; border-radius: 50%; background: #38BDF8; }
  .dot-critical { width: 6px; height: 6px; border-radius: 50%; background: #EF4444; }

  .zoom-btn {
    background: var(--kanso-surface-hover, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    border: 1px solid var(--kanso-border, #27272A);
    padding: 4px 8px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
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

  .base-image, .base-video {
    display: block;
    max-width: 100%;
    max-height: calc(82vh - 120px);
    object-fit: contain;
    border-radius: 6px;
    user-select: none;
    border: 1px solid var(--kanso-border, #27272A);
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
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #0284C7;
    color: #FFFFFF;
    font-size: 11.5px;
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
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid #EF4444;
    animation: pulseRadar 2s infinite;
    pointer-events: none;
  }
  .pulse-ring.active {
    border-color: #38BDF8;
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
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.6);
    padding: 12px;
    z-index: 500;
    cursor: default;
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
    color: var(--kanso-text-primary, #F4F4F5);
  }
  .pin-time {
    font-size: 10px;
    color: var(--kanso-text-muted, #71717A);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .timecode-badge {
    font-family: monospace;
    color: var(--kanso-accent, #38BDF8);
    font-weight: 700;
  }
  .critical-badge {
    font-size: 9px;
    font-weight: 800;
    background: rgba(239, 68, 68, 0.2);
    color: #EF4444;
    padding: 2px 5px;
    border-radius: 3px;
  }

  .pin-content-text {
    font-size: 12px;
    color: var(--kanso-text-primary, #F4F4F5);
    line-height: 1.4;
    margin: 0 0 10px 0;
    word-break: break-word;
  }

  .popover-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--kanso-border, #27272A);
    padding-top: 8px;
  }
  .resolve-action-btn {
    background: var(--kanso-surface-hover, #27272A);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 11px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
  }
  .resolve-action-btn.is-resolved {
    background: rgba(16, 185, 129, 0.2);
    color: #10B981;
    border-color: rgba(16, 185, 129, 0.4);
  }

  .delete-action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 13px;
    color: var(--kanso-text-muted, #71717A);
    padding: 4px;
    border-radius: 4px;
  }
  .delete-action-btn:hover {
    color: #EF4444;
  }

  /* Pin Composer Card */
  .pin-composer-card {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 290px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.6);
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
  .composer-title-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .composer-title {
    font-size: 12px;
    font-weight: 800;
    color: var(--kanso-text-primary, #F4F4F5);
  }
  .timecode-pill {
    font-size: 10px;
    font-family: monospace;
    background: rgba(56, 189, 248, 0.15);
    color: var(--kanso-accent, #38BDF8);
    padding: 1px 5px;
    border-radius: 4px;
  }
  .close-composer-btn {
    border: none;
    background: transparent;
    color: var(--kanso-text-muted, #71717A);
    cursor: pointer;
    font-size: 12px;
  }

  .composer-textarea {
    width: 100%;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 8px;
    font-size: 12px;
    font-family: inherit;
    color: var(--kanso-text-primary, #F4F4F5);
    background: var(--kanso-canvas, #09090B);
    resize: none;
    box-sizing: border-box;
    outline: none;
  }
  .composer-textarea:focus {
    border-color: var(--kanso-accent, #38BDF8);
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
    color: var(--kanso-text-muted, #71717A);
  }
  .priority-option {
    display: flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
  }
  .priority-option.critical {
    color: #EF4444;
  }
  .composer-btn-row {
    display: flex;
    gap: 6px;
  }

  /* Video Scrubber Deck */
  .video-scrubber-deck {
    background: var(--kanso-surface, #18181B);
    border-top: 1px solid var(--kanso-border, #27272A);
    padding: 10px 16px;
    z-index: 20;
  }
  .playback-controls-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .play-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--kanso-surface-hover, #27272A);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .play-btn:hover {
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
  }
  .timecode-ticker {
    font-family: monospace;
    font-size: 11.5px;
    color: var(--kanso-text-primary, #F4F4F5);
    display: flex;
    gap: 4px;
    min-width: 90px;
  }
  .timecode-ticker .slash { color: var(--kanso-text-muted, #71717A); }
  .timecode-ticker .dur-time { color: var(--kanso-text-muted, #71717A); }

  .timeline-track-wrap {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }
  .timeline-slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #27272A;
    outline: none;
    cursor: pointer;
    accent-color: var(--kanso-accent, #38BDF8);
  }
  .scrubber-markers-layer {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    height: 12px;
  }
  .scrubber-pin-dot {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--kanso-accent, #38BDF8);
    border: 1.5px solid #09090B;
    cursor: pointer;
    pointer-events: auto;
    transition: transform 0.12s;
  }
  .scrubber-pin-dot:hover {
    transform: translate(-50%, -50%) scale(1.4);
  }
  .scrubber-pin-dot.is-critical {
    background: #EF4444;
  }
  .scrubber-pin-dot.is-resolved {
    background: #10B981;
  }

  .add-timecode-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    background: var(--kanso-surface-hover, #27272A);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 11px;
    font-weight: 700;
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
  }
  .add-timecode-btn:hover {
    border-color: var(--kanso-accent, #38BDF8);
    color: var(--kanso-accent, #38BDF8);
  }

  .annotate-hint-bar {
    position: absolute;
    bottom: 58px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(24, 24, 27, 0.92);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 20px;
    backdrop-filter: blur(8px);
    z-index: 10;
    pointer-events: none;
  }
</style>
