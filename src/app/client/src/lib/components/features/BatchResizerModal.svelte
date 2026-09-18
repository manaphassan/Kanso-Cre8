<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import type { DeliverableItem } from '$lib/types';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentIcons, { type IconName } from '$lib/components/ui/FluentIcons.svelte';

  interface Props {
    open?: boolean;
    deliverable?: DeliverableItem | null;
    projectTitle?: string;
    onClose?: () => void;
  }

  let {
    open = $bindable(false),
    deliverable = null,
    projectTitle = '',
    onClose
  }: Props = $props();

  type AspectRatioPreset = {
    id: string;
    label: string;
    width: number;
    height: number;
    ratio: string;
    platform: string;
    icon: IconName;
    selected: boolean;
  };

  let presets = $state<AspectRatioPreset[]>([
    { id: '1x1', label: '1:1 Square', width: 1080, height: 1080, ratio: '1:1', platform: 'Instagram / FB Feed', icon: 'grid', selected: true },
    { id: '9x16', label: '9:16 Vertical Story / Reel', width: 1080, height: 1920, ratio: '9:16', platform: 'TikTok / Reels / Stories', icon: 'image', selected: true },
    { id: '16x9', label: '16:9 Landscape Video', width: 1920, height: 1080, ratio: '16:9', platform: 'YouTube / Display Banner', icon: 'video', selected: true },
    { id: '4x5', label: '4:5 Portrait Post', width: 1080, height: 1350, ratio: '4:5', platform: 'Meta Mobile Feed Ad', icon: 'file', selected: true },
    { id: '1_91x1', label: '1.91:1 Horizontal Banner', width: 1200, height: 628, ratio: '1.91:1', platform: 'Meta Link / LinkedIn Banner', icon: 'globe', selected: true }
  ]);

  type FillMode = 'ambient_blur' | 'solid_color' | 'center_crop';
  let fillMode = $state<FillMode>('ambient_blur');
  let solidColor = $state<string>('#043388');

  // Multi-Format Export Options
  type ExportFormat = 'webp' | 'png' | 'jpeg';
  let exportFormat = $state<ExportFormat>('webp');
  let webpQuality = $state<number>(85); // 60 - 100%

  // Proof Watermark Engine
  type WatermarkMode = 'none' | 'confidential' | 'studio_seal' | 'custom';
  let watermarkMode = $state<WatermarkMode>('none');
  let customWatermarkText = $state<string>('CLIENT PROOF — CONFIDENTIAL');
  let watermarkOpacity = $state<number>(0.28); // 0.15 - 0.60

  let isGeneratingZip = $state<boolean>(false);
  let renderedPreviews = $state<Record<string, string>>({});
  let activePreviewTab = $state<string>('1x1');

  $effect(() => {
    const src = deliverable?.previewUrl || deliverable?.url;
    if (open && deliverable && src) {
      generateAllPreviews();
    }
  });

  function drawWatermark(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mode: WatermarkMode,
    text: string,
    opacity: number
  ) {
    if (mode === 'none') return;
    ctx.save();
    ctx.globalAlpha = opacity;

    if (mode === 'confidential' || mode === 'custom') {
      const watermarkText = mode === 'custom' && text.trim() ? text.trim().toUpperCase() : 'CLIENT PROOF — CONFIDENTIAL';
      ctx.rotate(-28 * Math.PI / 180);
      ctx.font = `900 ${Math.round(width * 0.042)}px sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';

      const stepX = width * 0.52;
      const stepY = height * 0.20;
      for (let x = -width * 1.5; x < width * 2; x += stepX) {
        for (let y = -height * 1.5; y < height * 2; y += stepY) {
          ctx.fillText(watermarkText, x, y);
        }
      }
    } else if (mode === 'studio_seal') {
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) * 0.22;

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(3, Math.round(width * 0.004));
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 12;

      // Outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Inner circle
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
      ctx.stroke();

      // Center seal typography
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(r * 0.22)}px sans-serif`;
      ctx.fillText('KANSO CRE8', cx, cy - r * 0.2);

      ctx.font = `700 ${Math.round(r * 0.13)}px sans-serif`;
      ctx.fillText('ATELIER PROOF', cx, cy + r * 0.05);

      ctx.font = `600 ${Math.round(r * 0.10)}px monospace`;
      ctx.fillText('NOT FOR DISTRIBUTION', cx, cy + r * 0.3);
    }
    ctx.restore();
  }

  async function generateAllPreviews() {
    const src = deliverable?.previewUrl || deliverable?.url;
    if (!src) return;
    for (const preset of presets) {
      try {
        const dataUrl = await renderPresetCanvas(preset, src, fillMode, solidColor);
        renderedPreviews[preset.id] = dataUrl;
      } catch (err: any) {
        console.warn(`[BatchResizer] Failed to render preset ${preset.id}:`, err.message);
      }
    }
  }

  function renderPresetCanvas(preset: AspectRatioPreset, imgUrl: string, mode: FillMode, color: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = preset.width;
        canvas.height = preset.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 2D context unavailable'));

        const targetW = preset.width;
        const targetH = preset.height;
        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight;

        if (mode === 'ambient_blur') {
          ctx.save();
          ctx.filter = 'blur(45px) brightness(0.65)';
          const scaleBg = Math.max(targetW / srcW, targetH / srcH) * 1.3;
          const bgW = srcW * scaleBg;
          const bgH = srcH * scaleBg;
          ctx.drawImage(img, (targetW - bgW) / 2, (targetH - bgH) / 2, bgW, bgH);
          ctx.restore();

          const scaleFg = Math.min(targetW / srcW, targetH / srcH);
          const fgW = srcW * scaleFg;
          const fgH = srcH * scaleFg;
          ctx.drawImage(img, (targetW - fgW) / 2, (targetH - fgH) / 2, fgW, fgH);
        } else if (mode === 'solid_color') {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, targetW, targetH);

          const scale = Math.min(targetW / srcW, targetH / srcH);
          const drawW = srcW * scale;
          const drawH = srcH * scale;
          ctx.drawImage(img, (targetW - drawW) / 2, (targetH - drawH) / 2, drawW, drawH);
        } else if (mode === 'center_crop') {
          const scale = Math.max(targetW / srcW, targetH / srcH);
          const drawW = srcW * scale;
          const drawH = srcH * scale;
          ctx.drawImage(img, (targetW - drawW) / 2, (targetH - drawH) / 2, drawW, drawH);
        }

        // Draw Proofing Watermark on top of image
        drawWatermark(ctx, targetW, targetH, watermarkMode, customWatermarkText, watermarkOpacity);

        // Export with selected format and quality
        let mime = 'image/webp';
        let quality = webpQuality / 100;
        if (exportFormat === 'png') {
          mime = 'image/png';
          quality = 1.0;
        } else if (exportFormat === 'jpeg') {
          mime = 'image/jpeg';
          quality = webpQuality / 100;
        }

        resolve(canvas.toDataURL(mime, quality));
      };
      img.onerror = () => reject(new Error('Image failed to load for rendering'));
      img.src = imgUrl;
    });
  }

  function downloadSingle(presetId: string) {
    const dataUrl = renderedPreviews[presetId];
    if (!dataUrl || !deliverable) return;
    const ext = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${deliverable.filename.replace(/\.[^/.]+$/, '')}_${presetId}.${ext}`;
    a.click();
    appState.addToast(`Downloaded ${presetId} format (${ext.toUpperCase()})!`, 'success');
  }

  async function downloadBatchZip() {
    const selectedPresets = presets.filter(p => p.selected && renderedPreviews[p.id]);
    if (selectedPresets.length === 0) {
      appState.addToast('Please select at least one format preset', 'warning');
      return;
    }

    isGeneratingZip = true;
    try {
      for (const preset of selectedPresets) {
        downloadSingle(preset.id);
        await new Promise(r => setTimeout(r, 160));
      }
      appState.addToast(`Batch social package exported (${exportFormat.toUpperCase()})!`, 'success');
      closeModal();
    } catch (err: any) {
      appState.addToast(`Export error: ${err.message}`, 'error');
    } finally {
      isGeneratingZip = false;
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
  <div class="resizer-backdrop" onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="resizer-modal">
      <!-- Header -->
      <div class="resizer-header">
        <div class="header-left">
          <div class="resizer-icon-badge">
            <FluentIcons name="vector" size={20} color="#38BDF8" />
          </div>
          <div>
            <h2 class="modal-title">Multi-Format Asset Converter & Proofing Engine</h2>
            <p class="modal-sub">Generate social-ready multi-format packs (1:1, 9:16, 16:9, 4:5, 1.91:1) in WebP, PNG, or JPEG with ambient blur or watermark security.</p>
          </div>
        </div>
        <button class="close-btn" onclick={closeModal} title="Close Modal">
          <FluentIcons name="close" size={16} />
        </button>
      </div>

      <!-- Body Grid -->
      <div class="resizer-body">
        <!-- Controls Column -->
        <div class="controls-col">
          <!-- 1. Output Format & WebP Quality -->
          <div class="control-card">
            <div class="control-label">1. Export Format & Compression</div>
            <div class="format-toggle-group">
              <button
                type="button"
                class="format-btn"
                class:active={exportFormat === 'webp'}
                onclick={() => { exportFormat = 'webp'; generateAllPreviews(); }}
              >
                <span class="format-badge">WebP</span>
                <span class="format-desc">Ultra-light modern web</span>
              </button>
              <button
                type="button"
                class="format-btn"
                class:active={exportFormat === 'png'}
                onclick={() => { exportFormat = 'png'; generateAllPreviews(); }}
              >
                <span class="format-badge">PNG</span>
                <span class="format-desc">Lossless hi-fi master</span>
              </button>
              <button
                type="button"
                class="format-btn"
                class:active={exportFormat === 'jpeg'}
                onclick={() => { exportFormat = 'jpeg'; generateAllPreviews(); }}
              >
                <span class="format-badge">JPEG</span>
                <span class="format-desc">Universal compatibility</span>
              </button>
            </div>

            {#if exportFormat === 'webp' || exportFormat === 'jpeg'}
              <div class="quality-slider-block">
                <div class="quality-slider-header">
                  <span class="slider-title">Quality Compression:</span>
                  <span class="slider-value">{webpQuality}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  step="5"
                  bind:value={webpQuality}
                  onchange={() => generateAllPreviews()}
                  class="quality-range-slider"
                />
              </div>
            {/if}
          </div>

          <!-- 2. Proofing Watermark Engine -->
          <div class="control-card">
            <div class="control-label">2. Client Proofing Watermark</div>
            <div class="watermark-select-row">
              <select
                class="watermark-dropdown"
                bind:value={watermarkMode}
                onchange={() => generateAllPreviews()}
              >
                <option value="none">Disabled (Clean Export)</option>
                <option value="confidential">Diagonal "CONFIDENTIAL PROOF"</option>
                <option value="studio_seal">Centered Studio Seal (Kanso Verified)</option>
                <option value="custom">Custom Text Stamp</option>
              </select>
            </div>

            {#if watermarkMode === 'custom'}
              <input
                type="text"
                class="watermark-text-input"
                bind:value={customWatermarkText}
                placeholder="e.g. SAMPLE PROOF - ACME CORP"
                oninput={() => generateAllPreviews()}
              />
            {/if}

            {#if watermarkMode !== 'none'}
              <div class="quality-slider-block">
                <div class="quality-slider-header">
                  <span class="slider-title">Watermark Intensity:</span>
                  <span class="slider-value">{Math.round(watermarkOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.65"
                  step="0.05"
                  bind:value={watermarkOpacity}
                  onchange={() => generateAllPreviews()}
                  class="quality-range-slider"
                />
              </div>
            {/if}
          </div>

          <!-- 3. Canvas Fill Mode -->
          <div class="control-card">
            <div class="control-label">3. Canvas Fill Mode</div>
            <div class="fill-mode-grid">
              <button 
                class="fill-option-btn {fillMode === 'ambient_blur' ? 'active' : ''}"
                onclick={() => { fillMode = 'ambient_blur'; generateAllPreviews(); }}
              >
                <div class="fill-title">
                  <FluentIcons name="sparkles" size={13} />
                  <span style="margin-left: 6px;">Ambient Blur</span>
                </div>
                <span class="fill-desc">Smart blurred edge expansion</span>
              </button>

              <button 
                class="fill-option-btn {fillMode === 'solid_color' ? 'active' : ''}"
                onclick={() => { fillMode = 'solid_color'; generateAllPreviews(); }}
              >
                <div class="fill-title">
                  <FluentIcons name="colorPalette" size={13} />
                  <span style="margin-left: 6px;">Brand Solid Canvas</span>
                </div>
                <span class="fill-desc">Contained with brand color fill</span>
              </button>

              <button 
                class="fill-option-btn {fillMode === 'center_crop' ? 'active' : ''}"
                onclick={() => { fillMode = 'center_crop'; generateAllPreviews(); }}
              >
                <div class="fill-title">
                  <FluentIcons name="grid" size={13} />
                  <span style="margin-left: 6px;">Center Crop</span>
                </div>
                <span class="fill-desc">Full bleed focus crop</span>
              </button>
            </div>

            {#if fillMode === 'solid_color'}
              <div class="color-palette-row">
                <span class="control-label" style="margin-bottom:0;">Palette:</span>
                <button class="swatch-btn" style="background:#043388;" onclick={() => { solidColor = '#043388'; generateAllPreviews(); }} title="Deep Cobalt"></button>
                <button class="swatch-btn" style="background:#D4AF37;" onclick={() => { solidColor = '#D4AF37'; generateAllPreviews(); }} title="Royal Gold"></button>
                <button class="swatch-btn" style="background:#10B981;" onclick={() => { solidColor = '#10B981'; generateAllPreviews(); }} title="Emerald Green"></button>
                <button class="swatch-btn" style="background:#0F172A;" onclick={() => { solidColor = '#0F172A'; generateAllPreviews(); }} title="Midnight Dark"></button>
              </div>
            {/if}
          </div>

          <!-- 4. Target Aspect Ratios -->
          <div class="control-card">
            <div class="control-label">4. Target Aspect Ratios</div>
            <div class="presets-list">
              {#each presets as p}
                <div class="preset-item {activePreviewTab === p.id ? 'active-tab' : ''}">
                  <input type="checkbox" bind:checked={p.selected} class="preset-check" />
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div class="preset-info" onclick={() => activePreviewTab = p.id}>
                    <span class="preset-icon">
                      <FluentIcons name={p.icon} size={16} />
                    </span>
                    <div>
                      <div class="preset-label-row">
                        <span class="preset-label">{p.label}</span>
                        <span class="res-badge">{p.width}×{p.height}</span>
                      </div>
                      <span class="platform-meta">{p.platform}</span>
                    </div>
                  </div>
                  <button class="single-dl-btn" title="Download this format ({exportFormat.toUpperCase()})" onclick={() => downloadSingle(p.id)}>
                    <FluentIcons name="download" size={12} />
                  </button>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Live Preview Stage -->
        <div class="preview-stage-col">
          <div class="stage-tabs">
            {#each presets as p}
              <button 
                class="stage-tab {activePreviewTab === p.id ? 'active' : ''}" 
                onclick={() => activePreviewTab = p.id}
              >
                <FluentIcons name={p.icon} size={12} />
                <span style="margin-left: 5px;">{p.ratio}</span>
              </button>
            {/each}
          </div>

          <div class="stage-viewport">
            {#if renderedPreviews[activePreviewTab]}
              <img src={renderedPreviews[activePreviewTab]} alt="Live Aspect Ratio Render" class="stage-img" />
            {:else}
              <div class="stage-loading">Rendering canvas preview...</div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="resizer-footer">
        <span class="footer-tip">100% offline client-side GPU canvas. Zero telemetry or phone-home.</span>
        <div class="footer-actions">
          <FluentButton appearance="subtle" onclick={closeModal}>Cancel</FluentButton>
          <FluentButton 
            appearance="primary" 
            loading={isGeneratingZip} 
            onclick={downloadBatchZip}
          >
            <FluentIcons name="download" size={14} />
            <span style="margin-left: 6px;">Download Selected ({exportFormat.toUpperCase()})</span>
          </FluentButton>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .resizer-backdrop {
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
    z-index: 1900;
    padding: 20px;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  .resizer-modal {
    width: 95%;
    max-width: 1020px;
    height: 88vh;
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
  }

  .resizer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(15, 23, 42, 0.95);
  }

  .header-left { display: flex; align-items: center; gap: 12px; }
  .modal-title { font-size: 15px; font-weight: 800; color: #F8FAFC; }
  .modal-sub { font-size: 11.5px; color: #94A3B8; margin-top: 2px; }

  .close-btn {
    background: transparent;
    border: none;
    font-size: 16px;
    color: #94A3B8;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
  }
  .close-btn:hover { color: #FFF; background: rgba(255, 255, 255, 0.08); }

  .resizer-body {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1.15fr;
    overflow: hidden;
  }

  .controls-col {
    padding: 16px 18px;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .control-card { display: flex; flex-direction: column; gap: 7px; }
  .control-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #94A3B8; letter-spacing: 0.5px; }

  /* Format Toggle */
  .format-toggle-group {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .format-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 7px 6px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .format-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .format-btn.active {
    background: rgba(56, 189, 248, 0.15);
    border-color: #38BDF8;
  }

  .format-badge {
    font-size: 12px;
    font-weight: 800;
    color: #FFF;
  }

  .format-desc {
    font-size: 9px;
    color: #94A3B8;
    margin-top: 2px;
    text-align: center;
  }

  /* Sliders */
  .quality-slider-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    padding: 6px 10px;
  }

  .quality-slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10.5px;
  }

  .slider-title { color: #94A3B8; }
  .slider-value { color: #38BDF8; font-weight: 700; font-family: monospace; }

  .quality-range-slider {
    width: 100%;
    accent-color: #38BDF8;
    cursor: pointer;
  }

  /* Watermark */
  .watermark-select-row {
    width: 100%;
  }

  .watermark-dropdown {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #FFF;
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 11.5px;
    outline: none;
    cursor: pointer;
  }

  .watermark-dropdown option {
    background: #0F172A;
    color: #FFF;
  }

  .watermark-text-input {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #FFF;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    outline: none;
  }

  .watermark-text-input:focus {
    border-color: #38BDF8;
  }

  /* Fill mode */
  .fill-mode-grid { display: flex; flex-direction: column; gap: 5px; }
  .fill-option-btn {
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .fill-option-btn:hover { background: rgba(255, 255, 255, 0.08); }
  .fill-option-btn.active {
    background: rgba(56, 189, 248, 0.12);
    border-color: #38BDF8;
  }
  .fill-title { font-size: 11.5px; font-weight: 700; color: #FFF; }
  .fill-desc { font-size: 9.5px; color: #94A3B8; margin-top: 1px; }

  .color-palette-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .swatch-btn { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.4); cursor: pointer; }

  .presets-list { display: flex; flex-direction: column; gap: 5px; }
  .preset-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
  }
  .preset-item.active-tab { border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.06); }

  .preset-info { flex: 1; display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .preset-icon { font-size: 16px; }
  .preset-label-row { display: flex; align-items: center; gap: 6px; }
  .preset-label { font-size: 11.5px; font-weight: 700; color: #FFF; }
  .res-badge { font-size: 9.5px; background: rgba(255, 255, 255, 0.1); padding: 1px 4px; border-radius: 3px; color: #38BDF8; font-family: monospace; }
  .platform-meta { font-size: 9.5px; color: #64748B; }

  .single-dl-btn {
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: #FFF;
    padding: 4px 7px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.15s ease;
  }
  .single-dl-btn:hover { background: #38BDF8; color: #0F172A; }

  /* Preview Stage */
  .preview-stage-col {
    background: #090D16;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .stage-tabs {
    display: flex;
    background: rgba(15, 23, 42, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 8px 12px;
    gap: 6px;
    overflow-x: auto;
  }

  .stage-tab {
    padding: 5px 10px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
    color: #94A3B8;
    font-size: 10.5px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }
  .stage-tab.active { background: #043388; color: #FFF; border-color: #38BDF8; }

  .stage-viewport {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow: hidden;
  }

  .stage-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7);
  }

  .stage-loading { font-size: 12px; color: #64748B; }

  /* Footer */
  .resizer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(11, 17, 33, 0.95);
  }
  .footer-tip { font-size: 11px; color: #64748B; }
  .footer-actions { display: flex; align-items: center; gap: 10px; }

  @media (max-width: 800px) {
    .resizer-body { grid-template-columns: 1fr; }
    .preview-stage-col { display: none; }
  }
</style>
