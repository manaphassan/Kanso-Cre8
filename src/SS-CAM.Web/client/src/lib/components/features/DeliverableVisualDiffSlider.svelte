<script lang="ts">
  import { onMount } from 'svelte';
  import type { DeliverableItem } from '$lib/types';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  interface Props {
    currentDeliverable: DeliverableItem;
    availableDeliverables?: DeliverableItem[];
    onClose?: () => void;
  }

  let {
    currentDeliverable,
    availableDeliverables = [],
    onClose
  }: Props = $props();

  type DiffMode = 'split' | 'onion' | 'side-by-side' | 'difference';

  let activeMode = $state<DiffMode>('split');
  let splitPosition = $state<number>(50); // 0 - 100 %
  let onionOpacity = $state<number>(50); // 0 - 100 %
  let zoomLevel = $state<number>(1); // 1 - 4x
  let isDraggingSlider = $state<boolean>(false);
  let isPanning = $state<boolean>(false);
  let panX = $state<number>(0);
  let panY = $state<number>(0);
  let startMouseX = $state<number>(0);
  let startMouseY = $state<number>(0);
  let containerRef: HTMLDivElement | null = $state(null);

  // Filter companion image deliverables from the same project
  const companionImages = $derived.by(() => {
    const list = availableDeliverables.filter(d => 
      (d.isImage || d.previewType === 'image' || ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.svg'].includes(d.extension || ''))
    );
    if (!list.some(d => d.id === currentDeliverable.id)) {
      return [currentDeliverable, ...list];
    }
    return list;
  });

  // Selected Deliverable Versions
  let afterDeliverable = $state<DeliverableItem>(currentDeliverable);
  let beforeDeliverable = $state<DeliverableItem | null>(null);

  // Auto-detect companion "v1" or prior version
  onMount(() => {
    afterDeliverable = currentDeliverable;
    
    // Attempt auto-match
    if (companionImages.length > 1) {
      // Look for a companion with _v1 if current is _v2, or any other file with matching prefix
      const currentName = currentDeliverable.filename.toLowerCase();
      const basePrefix = currentName.replace(/_v\d+.*$/i, '').replace(/_rev\d+.*$/i, '').replace(/_final.*$/i, '');
      
      const match = companionImages.find(d => 
        d.id !== currentDeliverable.id && 
        d.filename.toLowerCase().includes(basePrefix)
      );

      if (match) {
        beforeDeliverable = match;
      } else {
        // Default to the first companion that is not the current one
        beforeDeliverable = companionImages.find(d => d.id !== currentDeliverable.id) || null;
      }
    } else {
      beforeDeliverable = currentDeliverable;
    }
  });

  // Split-Slider Drag Mechanics
  function handleSliderMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDraggingSlider = true;
    window.addEventListener('mousemove', handleSliderMouseMove);
    window.addEventListener('mouseup', handleSliderMouseUp);
  }

  function handleSliderMouseMove(e: MouseEvent) {
    if (!isDraggingSlider || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    splitPosition = Math.round(percent * 10) / 10;
  }

  function handleSliderMouseUp() {
    isDraggingSlider = false;
    window.removeEventListener('mousemove', handleSliderMouseMove);
    window.removeEventListener('mouseup', handleSliderMouseUp);
  }

  // Touch Support for Split Slider
  function handleSliderTouchStart(e: TouchEvent) {
    isDraggingSlider = true;
  }

  function handleSliderTouchMove(e: TouchEvent) {
    if (!isDraggingSlider || !containerRef || !e.touches[0]) return;
    const rect = containerRef.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    splitPosition = Math.round(percent * 10) / 10;
  }

  function handleSliderTouchEnd() {
    isDraggingSlider = false;
  }

  // Pan & Zoom Controls
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    zoomLevel = Math.max(1, Math.min(4, Math.round((zoomLevel + delta) * 100) / 100));
    if (zoomLevel === 1) {
      panX = 0;
      panY = 0;
    }
  }

  function handlePanMouseDown(e: MouseEvent) {
    if (zoomLevel <= 1 || isDraggingSlider) return;
    isPanning = true;
    startMouseX = e.clientX - panX;
    startMouseY = e.clientY - panY;
    window.addEventListener('mousemove', handlePanMouseMove);
    window.addEventListener('mouseup', handlePanMouseUp);
  }

  function handlePanMouseMove(e: MouseEvent) {
    if (!isPanning) return;
    panX = e.clientX - startMouseX;
    panY = e.clientY - startMouseY;
  }

  function handlePanMouseUp() {
    isPanning = false;
    window.removeEventListener('mousemove', handlePanMouseMove);
    window.removeEventListener('mouseup', handlePanMouseUp);
  }

  function resetZoom() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
  }

  function setZoom(val: number) {
    zoomLevel = val;
    if (val === 1) {
      panX = 0;
      panY = 0;
    }
  }
</script>

<div class="diff-viewer-wrapper">
  <!-- Top Diff Control Bar -->
  <div class="diff-toolbar">
    <div class="toolbar-section mode-selector">
      <span class="toolbar-label">Mode:</span>
      <button 
        class="mode-btn {activeMode === 'split' ? 'active' : ''}" 
        onclick={() => activeMode = 'split'}
        title="Curtain Split Slider"
      >
        <span class="btn-icon">↔️</span>
        <span>Split Scrub</span>
      </button>
      <button 
        class="mode-btn {activeMode === 'onion' ? 'active' : ''}" 
        onclick={() => activeMode = 'onion'}
        title="Onion Skin Opacity Blend"
      >
        <span class="btn-icon">👁️</span>
        <span>Onion Skin</span>
      </button>
      <button 
        class="mode-btn {activeMode === 'side-by-side' ? 'active' : ''}" 
        onclick={() => activeMode = 'side-by-side'}
        title="Side-by-Side Synchronized Dual View"
      >
        <span class="btn-icon">♊</span>
        <span>Side-by-Side</span>
      </button>
      <button 
        class="mode-btn {activeMode === 'difference' ? 'active' : ''}" 
        onclick={() => activeMode = 'difference'}
        title="Pixel Difference (Invert Highlight)"
      >
        <span class="btn-icon">⚡</span>
        <span>Pixel Diff</span>
      </button>
    </div>

    <!-- Zoom & Reset Tools -->
    <div class="toolbar-section zoom-tools">
      <span class="toolbar-label">Zoom:</span>
      <button class="zoom-btn" onclick={() => setZoom(1)} class:active={zoomLevel === 1}>Fit</button>
      <button class="zoom-btn" onclick={() => setZoom(1.5)} class:active={zoomLevel === 1.5}>150%</button>
      <button class="zoom-btn" onclick={() => setZoom(2)} class:active={zoomLevel === 2}>200%</button>
      <button class="zoom-btn" onclick={() => setZoom(3)} class:active={zoomLevel === 3}>300%</button>
      {#if zoomLevel > 1}
        <button class="reset-btn" onclick={resetZoom} title="Reset Pan & Zoom">↺ Reset</button>
      {/if}
    </div>
  </div>

  <!-- Version Selector Bar -->
  <div class="version-bar">
    <div class="version-pair">
      <div class="version-col base-col">
        <span class="version-tag tag-before">BEFORE (Base)</span>
        <select 
          class="version-select" 
          value={beforeDeliverable?.id || ''} 
          onchange={(e) => {
            const targetId = (e.target as HTMLSelectElement).value;
            beforeDeliverable = companionImages.find(d => d.id === targetId) || null;
          }}
        >
          {#each companionImages as d}
            <option value={d.id}>{d.filename} ({d.folder || '05_DELIVERABLES'})</option>
          {/each}
        </select>
      </div>

      <div class="version-swap-icon">➔</div>

      <div class="version-col after-col">
        <span class="version-tag tag-after">AFTER (Compare)</span>
        <select 
          class="version-select" 
          value={afterDeliverable.id} 
          onchange={(e) => {
            const targetId = (e.target as HTMLSelectElement).value;
            const match = companionImages.find(d => d.id === targetId);
            if (match) afterDeliverable = match;
          }}
        >
          {#each companionImages as d}
            <option value={d.id}>{d.filename} ({d.folder || '05_DELIVERABLES'})</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Active Slider / Opacity Meter -->
    {#if activeMode === 'onion'}
      <div class="slider-control-box">
        <span class="slider-label">Opacity Blend: <b>{onionOpacity}%</b></span>
        <input 
          type="range" 
          min="0" 
          max="100" 
          bind:value={onionOpacity} 
          class="blend-range"
        />
        <span class="slider-hint">0% = Before · 100% = After</span>
      </div>
    {:else if activeMode === 'split'}
      <div class="slider-control-box">
        <span class="slider-label">Split Position: <b>{Math.round(splitPosition)}%</b></span>
        <input 
          type="range" 
          min="0" 
          max="100" 
          bind:value={splitPosition} 
          class="blend-range"
        />
      </div>
    {/if}
  </div>

  <!-- Main Comparison Canvas Area -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="diff-canvas-container mode-{activeMode}" 
    bind:this={containerRef}
    onwheel={handleWheel}
    onmousedown={handlePanMouseDown}
    style="cursor: {zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'};"
  >
    {#if !beforeDeliverable}
      <div class="no-companion-state">
        <span class="empty-icon">📂</span>
        <p>No companion deliverable selected for comparison.</p>
        <span class="empty-sub">Please select a base image from the dropdown above.</span>
      </div>
    {:else}
      <!-- MODE 1: Split Scrub Slider -->
      {#if activeMode === 'split'}
        <div 
          class="canvas-layer-wrapper"
          style="transform: translate({panX}px, {panY}px) scale({zoomLevel});"
        >
          <!-- Base Image (Underneath / Left) -->
          <img 
            src={beforeDeliverable.previewUrl} 
            alt="Before Version" 
            class="diff-img base-img"
            draggable="false"
          />

          <!-- Compare Image (Top Layer, Clipped) -->
          <div 
            class="clipped-layer"
            style="clip-path: inset(0 0 0 {splitPosition}%);"
          >
            <img 
              src={afterDeliverable.previewUrl} 
              alt="After Version" 
              class="diff-img after-img"
              draggable="false"
            />
          </div>

          <!-- Draggable Split Divider -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <div 
            class="split-divider"
            style="left: {splitPosition}%;"
            onmousedown={handleSliderMouseDown}
            ontouchstart={handleSliderTouchStart}
            ontouchmove={handleSliderTouchMove}
            ontouchend={handleSliderTouchEnd}
          >
            <div class="divider-line"></div>
            <div class="divider-handle">
              <span class="handle-arrows">‹ ›</span>
            </div>
          </div>

          <!-- Floating Badges -->
          <div class="canvas-badge badge-left" style="opacity: {splitPosition > 15 ? 1 : 0};">
            ◀ BEFORE: {beforeDeliverable.filename}
          </div>
          <div class="canvas-badge badge-right" style="opacity: {splitPosition < 85 ? 1 : 0};">
            AFTER: {afterDeliverable.filename} ▶
          </div>
        </div>

      <!-- MODE 2: Onion Skin Opacity Blend -->
      {:else if activeMode === 'onion'}
        <div 
          class="canvas-layer-wrapper"
          style="transform: translate({panX}px, {panY}px) scale({zoomLevel});"
        >
          <!-- Base Image -->
          <img 
            src={beforeDeliverable.previewUrl} 
            alt="Before Version" 
            class="diff-img base-img"
            draggable="false"
          />

          <!-- Compare Image with Opacity -->
          <img 
            src={afterDeliverable.previewUrl} 
            alt="After Version" 
            class="diff-img after-img overlay-onion"
            style="opacity: {onionOpacity / 100};"
            draggable="false"
          />

          <div class="canvas-badge badge-center">
            Onion Skin Blend: {onionOpacity}% After ({100 - onionOpacity}% Before)
          </div>
        </div>

      <!-- MODE 3: Side-by-Side Dual View -->
      {:else if activeMode === 'side-by-side'}
        <div class="side-by-side-grid">
          <div class="side-col">
            <div class="side-header">
              <span class="side-tag before-tag">BEFORE</span>
              <span class="side-title">{beforeDeliverable.filename}</span>
            </div>
            <div class="side-viewport">
              <img 
                src={beforeDeliverable.previewUrl} 
                alt="Before" 
                class="diff-img"
                style="transform: translate({panX}px, {panY}px) scale({zoomLevel});"
                draggable="false"
              />
            </div>
          </div>

          <div class="side-col">
            <div class="side-header">
              <span class="side-tag after-tag">AFTER</span>
              <span class="side-title">{afterDeliverable.filename}</span>
            </div>
            <div class="side-viewport">
              <img 
                src={afterDeliverable.previewUrl} 
                alt="After" 
                class="diff-img"
                style="transform: translate({panX}px, {panY}px) scale({zoomLevel});"
                draggable="false"
              />
            </div>
          </div>
        </div>

      <!-- MODE 4: Pixel Difference Highlight -->
      {:else if activeMode === 'difference'}
        <div 
          class="canvas-layer-wrapper"
          style="transform: translate({panX}px, {panY}px) scale({zoomLevel});"
        >
          <img 
            src={beforeDeliverable.previewUrl} 
            alt="Base" 
            class="diff-img base-img"
            draggable="false"
          />
          <img 
            src={afterDeliverable.previewUrl} 
            alt="Difference" 
            class="diff-img after-img overlay-diff"
            draggable="false"
          />
          <div class="canvas-badge badge-center">
            ⚡ Difference Map: Unchanged areas appear black; modified pixels light up.
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .diff-viewer-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: #090D14;
    color: #F8FAFC;
    overflow: hidden;
    user-select: none;
  }

  /* Toolbar */
  .diff-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: rgba(15, 23, 42, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    gap: 16px;
    flex-wrap: wrap;
    z-index: 10;
  }

  .toolbar-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toolbar-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #94A3B8;
  }

  .mode-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #CBD5E1;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #FFFFFF;
  }

  .mode-btn.active {
    background: var(--brand-primary, #043388);
    border-color: #21A1F7;
    color: #FFFFFF;
    box-shadow: 0 0 10px rgba(33, 161, 247, 0.3);
  }

  .zoom-tools {
    gap: 6px;
  }

  .zoom-btn {
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #94A3B8;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .zoom-btn.active, .zoom-btn:hover {
    background: rgba(33, 161, 247, 0.2);
    border-color: #21A1F7;
    color: #FFFFFF;
  }

  .reset-btn {
    padding: 4px 8px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 4px;
    color: #F87171;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  /* Version Selector Bar */
  .version-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: rgba(11, 17, 33, 0.9);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    gap: 16px;
    flex-wrap: wrap;
    z-index: 9;
  }

  .version-pair {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .version-col {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 200px;
  }

  .version-tag {
    font-size: 10px;
    font-weight: 800;
    padding: 3px 6px;
    border-radius: 4px;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  .tag-before {
    background: rgba(245, 158, 11, 0.2);
    color: #FBBF24;
    border: 1px solid rgba(245, 158, 11, 0.4);
  }

  .tag-after {
    background: rgba(16, 185, 129, 0.2);
    color: #34D399;
    border: 1px solid rgba(16, 185, 129, 0.4);
  }

  .version-select {
    flex: 1;
    background: #1E293B;
    color: #F8FAFC;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 12px;
    outline: none;
  }

  .version-swap-icon {
    font-size: 14px;
    color: #64748B;
    font-weight: 900;
  }

  .slider-control-box {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .slider-label {
    font-size: 11px;
    color: #CBD5E1;
    white-space: nowrap;
  }

  .blend-range {
    width: 140px;
    cursor: pointer;
    accent-color: #21A1F7;
  }

  .slider-hint {
    font-size: 10px;
    color: #64748B;
  }

  /* Main Canvas Container */
  .diff-canvas-container {
    position: relative;
    flex: 1;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, #131B2E 0%, #080B12 100%);
  }

  .canvas-layer-wrapper {
    position: relative;
    max-width: 90%;
    max-height: 90%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.05s ease-out;
  }

  .diff-img {
    max-width: 100%;
    max-height: calc(100vh - 240px);
    object-fit: contain;
    display: block;
    border-radius: 4px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }

  /* Clipped Layer for Split Scrub */
  .clipped-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
  }

  .clipped-layer .diff-img {
    width: 100%;
    height: 100%;
  }

  /* Split Divider Line & Handle */
  .split-divider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-50%);
    cursor: ew-resize;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .divider-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #21A1F7;
    box-shadow: 0 0 8px #21A1F7;
  }

  .divider-handle {
    position: relative;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #043388;
    border: 2px solid #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 900;
  }

  /* Overlay Modes */
  .overlay-onion {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .overlay-diff {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    mix-blend-mode: difference;
    pointer-events: none;
  }

  /* Floating Badges */
  .canvas-badge {
    position: absolute;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.3px;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #FFFFFF;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 15;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .badge-left {
    bottom: 16px;
    left: 16px;
    color: #FBBF24;
    border-color: rgba(245, 158, 11, 0.3);
  }

  .badge-right {
    bottom: 16px;
    right: 16px;
    color: #34D399;
    border-color: rgba(16, 185, 129, 0.3);
  }

  .badge-center {
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
  }

  /* Side by Side Grid */
  .side-by-side-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
    height: 100%;
    gap: 12px;
    padding: 12px;
    box-sizing: border-box;
  }

  .side-col {
    display: flex;
    flex-direction: column;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    overflow: hidden;
  }

  .side-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .side-tag {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .before-tag { background: #D97706; color: #FFF; }
  .after-tag { background: #059669; color: #FFF; }

  .side-title {
    font-size: 11px;
    color: #94A3B8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .side-viewport {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 12px;
  }

  .side-viewport .diff-img {
    max-height: calc(100vh - 280px);
  }

  /* Empty State */
  .no-companion-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #94A3B8;
    text-align: center;
    padding: 40px;
  }

  .empty-icon {
    font-size: 40px;
    margin-bottom: 12px;
  }

  .empty-sub {
    font-size: 12px;
    color: #64748B;
    margin-top: 4px;
  }
</style>
