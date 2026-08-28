<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import type { DeliverableItem } from '$lib/types';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

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
    icon: string;
    selected: boolean;
  };

  let presets = $state<AspectRatioPreset[]>([
    { id: '1x1', label: '1:1 Square', width: 1080, height: 1080, ratio: '1:1', platform: 'Instagram / FB Feed', icon: '🔲', selected: true },
    { id: '9x16', label: '9:16 Vertical Story / Reel', width: 1080, height: 1920, ratio: '9:16', platform: 'TikTok / Reels / Stories', icon: '📱', selected: true },
    { id: '16x9', label: '16:9 Landscape Video', width: 1920, height: 1080, ratio: '16:9', platform: 'YouTube / Display Banner', icon: '🖥️', selected: true },
    { id: '4x5', label: '4:5 Portrait Post', width: 1080, height: 1350, ratio: '4:5', platform: 'Meta Mobile Feed Ad', icon: '📄', selected: true }
  ]);

  type FillMode = 'ambient_blur' | 'solid_color' | 'center_crop';
  let fillMode = $state<FillMode>('ambient_blur');
  let solidColor = $state<string>('#043388');
  let isGeneratingZip = $state<boolean>(false);
  let renderedPreviews = $state<Record<string, string>>({});
  let activePreviewTab = $state<string>('1x1');

  $effect(() => {
    if (open && deliverable && deliverable.url) {
      generateAllPreviews();
    }
  });

  async function generateCanvas(targetW: number, targetH: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');

        if (fillMode === 'ambient_blur') {
          // 1. Draw scaled blurred background
          ctx.save();
          ctx.filter = 'blur(40px) brightness(0.65)';
          const scale = Math.max(targetW / img.width, targetH / img.height) * 1.2;
          const bgW = img.width * scale;
          const bgH = img.height * scale;
          ctx.drawImage(img, (targetW - bgW) / 2, (targetH - bgH) / 2, bgW, bgH);
          ctx.restore();

          // 2. Draw centered foreground with subtle shadow
          const containScale = Math.min(targetW / img.width, targetH / img.height) * 0.92;
          const fgW = img.width * containScale;
          const fgH = img.height * containScale;
          const fgX = (targetW - fgW) / 2;
          const fgY = (targetH - fgH) / 2;

          ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
          ctx.shadowBlur = 30;
          ctx.shadowOffsetY = 10;
          ctx.drawImage(img, fgX, fgY, fgW, fgH);

        } else if (fillMode === 'solid_color') {
          // 1. Draw solid background
          ctx.fillStyle = solidColor;
          ctx.fillRect(0, 0, targetW, targetH);

          // 2. Draw centered foreground
          const containScale = Math.min(targetW / img.width, targetH / img.height) * 0.92;
          const fgW = img.width * containScale;
          const fgH = img.height * containScale;
          const fgX = (targetW - fgW) / 2;
          const fgY = (targetH - fgH) / 2;

          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = 24;
          ctx.shadowOffsetY = 8;
          ctx.drawImage(img, fgX, fgY, fgW, fgH);

        } else if (fillMode === 'center_crop') {
          // Center crop to fill entire canvas
          const coverScale = Math.max(targetW / img.width, targetH / img.height);
          const coverW = img.width * coverScale;
          const coverH = img.height * coverScale;
          const coverX = (targetW - coverW) / 2;
          const coverY = (targetH - coverH) / 2;
          ctx.drawImage(img, coverX, coverY, coverW, coverH);
        }

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
      img.src = deliverable?.url || '';
    });
  }

  async function generateAllPreviews() {
    if (!deliverable) return;
    const results: Record<string, string> = {};
    for (const p of presets) {
      results[p.id] = await generateCanvas(p.width, p.height);
    }
    renderedPreviews = results;
  }

  function downloadSingle(presetId: string) {
    const dataUrl = renderedPreviews[presetId];
    if (!dataUrl) return;
    const baseName = (deliverable?.filename || 'Deliverable').replace(/\.[^/.]+$/, '');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${baseName}_${presetId}.png`;
    a.click();
    appState.addToast(`Downloaded ${presetId} format`, 'success');
  }

  async function downloadBatchZip() {
    isGeneratingZip = true;
    try {
      // Dynamically import JSZip or create individual downloads
      const baseName = (deliverable?.filename || 'Deliverable').replace(/\.[^/.]+$/, '');
      const selectedPresets = presets.filter(p => p.selected);

      for (const p of selectedPresets) {
        const dataUrl = renderedPreviews[p.id] || (await generateCanvas(p.width, p.height));
        if (dataUrl) {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${baseName}_SocialPack_${p.id}.png`;
          a.click();
          await new Promise(r => setTimeout(r, 250)); // stagger downloads
        }
      }
      appState.addToast(`Social Pack downloaded (${selectedPresets.length} formats)`, 'success');
    } catch (err: any) {
      appState.addToast(`Export failed: ${err.message}`, 'error');
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
          <span class="resizer-icon">📐</span>
          <div>
            <h2 class="modal-title">Smart Social Aspect Ratio Resizer</h2>
            <p class="modal-sub">Generate social-ready multi-format packs (1:1, 9:16, 16:9, 4:5) with ambient blur or brand containment.</p>
          </div>
        </div>
        <button class="close-btn" onclick={closeModal}>✕</button>
      </div>

      <!-- Body Grid -->
      <div class="resizer-body">
        <!-- Controls Column -->
        <div class="controls-col">
          <div class="control-card">
            <label class="control-label">1. Canvas Fill Mode</label>
            <div class="fill-mode-grid">
              <button 
                class="fill-option-btn {fillMode === 'ambient_blur' ? 'active' : ''}"
                onclick={() => { fillMode = 'ambient_blur'; generateAllPreviews(); }}
              >
                <span class="fill-title">✨ Ambient Blur</span>
                <span class="fill-desc">Smart blurred edge expansion</span>
              </button>

              <button 
                class="fill-option-btn {fillMode === 'solid_color' ? 'active' : ''}"
                onclick={() => { fillMode = 'solid_color'; generateAllPreviews(); }}
              >
                <span class="fill-title">🎨 Brand Solid Canvas</span>
                <span class="fill-desc">Contained with brand color fill</span>
              </button>

              <button 
                class="fill-option-btn {fillMode === 'center_crop' ? 'active' : ''}"
                onclick={() => { fillMode = 'center_crop'; generateAllPreviews(); }}
              >
                <span class="fill-title">✂️ Center Crop</span>
                <span class="fill-desc">Full bleed focus crop</span>
              </button>
            </div>

            {#if fillMode === 'solid_color'}
              <div class="color-palette-row">
                <label class="control-label" style="margin-bottom:0;">Brand Palette:</label>
                <button class="swatch-btn" style="background:#043388;" onclick={() => { solidColor = '#043388'; generateAllPreviews(); }} title="SS Prussian Blue"></button>
                <button class="swatch-btn" style="background:#D4AF37;" onclick={() => { solidColor = '#D4AF37'; generateAllPreviews(); }} title="SSH Royal Gold"></button>
                <button class="swatch-btn" style="background:#10B981;" onclick={() => { solidColor = '#10B981'; generateAllPreviews(); }} title="SSC Emerald"></button>
                <button class="swatch-btn" style="background:#0F172A;" onclick={() => { solidColor = '#0F172A'; generateAllPreviews(); }} title="OLED Dark"></button>
              </div>
            {/if}
          </div>

          <!-- Format Selector Matrix -->
          <div class="control-card">
            <label class="control-label">2. Target Aspect Ratios</label>
            <div class="presets-list">
              {#each presets as p}
                <div class="preset-item {activePreviewTab === p.id ? 'active-tab' : ''}">
                  <input type="checkbox" bind:checked={p.selected} class="preset-check" />
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div class="preset-info" onclick={() => activePreviewTab = p.id}>
                    <span class="preset-icon">{p.icon}</span>
                    <div>
                      <div class="preset-label-row">
                        <span class="preset-label">{p.label}</span>
                        <span class="res-badge">{p.width}×{p.height}</span>
                      </div>
                      <span class="platform-meta">{p.platform}</span>
                    </div>
                  </div>
                  <button class="single-dl-btn" title="Download this format" onclick={() => downloadSingle(p.id)}>⬇</button>
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
                <span>{p.icon} {p.ratio}</span>
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
        <span class="footer-tip">GPU hardware-accelerated rendering. Zero compression artifacting.</span>
        <div class="footer-actions">
          <FluentButton appearance="subtle" onclick={closeModal}>Cancel</FluentButton>
          <FluentButton 
            appearance="primary" 
            loading={isGeneratingZip} 
            onclick={downloadBatchZip}
          >
            📦 Download Selected Social Pack (PNGs)
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
    max-width: 980px;
    height: 85vh;
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
  .resizer-icon { font-size: 24px; }
  .modal-title { font-size: 16px; font-weight: 800; color: #F8FAFC; }
  .modal-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }

  .close-btn {
    background: transparent;
    border: none;
    font-size: 16px;
    color: #94A3B8;
    cursor: pointer;
    padding: 4px 8px;
  }
  .close-btn:hover { color: #FFF; }

  .resizer-body {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    overflow: hidden;
  }

  .controls-col {
    padding: 18px 20px;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .control-card { display: flex; flex-direction: column; gap: 8px; }
  .control-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94A3B8; }

  .fill-mode-grid { display: flex; flex-direction: column; gap: 6px; }
  .fill-option-btn {
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .fill-option-btn:hover { background: rgba(255, 255, 255, 0.08); }
  .fill-option-btn.active {
    background: rgba(33, 161, 247, 0.12);
    border-color: #21A1F7;
  }
  .fill-title { font-size: 12px; font-weight: 700; color: #FFF; }
  .fill-desc { font-size: 10px; color: #94A3B8; margin-top: 2px; }

  .color-palette-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
  .swatch-btn { width: 24px; height: 24px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.4); cursor: pointer; }

  .presets-list { display: flex; flex-direction: column; gap: 6px; }
  .preset-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
  }
  .preset-item.active-tab { border-color: rgba(33, 161, 247, 0.4); background: rgba(33, 161, 247, 0.06); }

  .preset-info { flex: 1; display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .preset-icon { font-size: 18px; }
  .preset-label-row { display: flex; align-items: center; gap: 8px; }
  .preset-label { font-size: 12px; font-weight: 700; color: #FFF; }
  .res-badge { font-size: 10px; background: rgba(255, 255, 255, 0.1); padding: 1px 4px; border-radius: 3px; color: #38BDF8; font-family: monospace; }
  .platform-meta { font-size: 10px; color: #64748B; }

  .single-dl-btn {
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: #FFF;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
  }
  .single-dl-btn:hover { background: #21A1F7; color: #0F172A; }

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
    gap: 8px;
  }

  .stage-tab {
    padding: 6px 12px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
    color: #94A3B8;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .stage-tab.active { background: #043388; color: #FFF; border-color: #21A1F7; }

  .stage-viewport {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
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
