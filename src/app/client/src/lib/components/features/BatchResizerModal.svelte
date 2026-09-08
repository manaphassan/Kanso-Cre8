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
    { id: '4x5', label: '4:5 Portrait Post', width: 1080, height: 1350, ratio: '4:5', platform: 'Meta Mobile Feed Ad', icon: 'file', selected: true }
  ]);

  type FillMode = 'ambient_blur' | 'solid_color' | 'center_crop';
  let fillMode = $state<FillMode>('ambient_blur');
  let solidColor = $state<string>('#043388');
  let isGeneratingZip = $state<boolean>(false);
  let renderedPreviews = $state<Record<string, string>>({});
  let activePreviewTab = $state<string>('1x1');

  $effect(() => {
    const src = deliverable?.previewUrl || deliverable?.url;
    if (open && deliverable && src) {
      generateAllPreviews();
    }
  });

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

        resolve(canvas.toDataURL('image/png', 0.95));
      };
      img.onerror = () => reject(new Error('Image failed to load for rendering'));
      img.src = imgUrl;
    });
  }

  function downloadSingle(presetId: string) {
    const dataUrl = renderedPreviews[presetId];
    if (!dataUrl || !deliverable) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${deliverable.filename.replace(/\.[^/.]+$/, '')}_${presetId}.png`;
    a.click();
    appState.addToast(`Downloaded ${presetId} format!`, 'success');
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
        await new Promise(r => setTimeout(r, 150));
      }
      appState.addToast('Batch social package exported!', 'success');
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
            <FluentIcons name="vector" size={20} color="#00CFFF" />
          </div>
          <div>
            <h2 class="modal-title">Smart Social Aspect Ratio Resizer</h2>
            <p class="modal-sub">Generate social-ready multi-format packs (1:1, 9:16, 16:9, 4:5) with ambient blur or brand containment.</p>
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
          <div class="control-card">
            <div class="control-label">1. Canvas Fill Mode</div>
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
                <span class="control-label" style="margin-bottom:0;">Brand Palette:</span>
                <button class="swatch-btn" style="background:#043388;" onclick={() => { solidColor = '#043388'; generateAllPreviews(); }} title="SS Prussian Blue"></button>
                <button class="swatch-btn" style="background:#D4AF37;" onclick={() => { solidColor = '#D4AF37'; generateAllPreviews(); }} title="SSH Royal Gold"></button>
                <button class="swatch-btn" style="background:#10B981;" onclick={() => { solidColor = '#10B981'; generateAllPreviews(); }} title="SSC Emerald"></button>
                <button class="swatch-btn" style="background:#0F172A;" onclick={() => { solidColor = '#0F172A'; generateAllPreviews(); }} title="OLED Dark"></button>
              </div>
            {/if}
          </div>

          <!-- Format Selector Matrix -->
          <div class="control-card">
            <div class="control-label">2. Target Aspect Ratios</div>
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
                  <button class="single-dl-btn" title="Download this format" onclick={() => downloadSingle(p.id)}>
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
        <span class="footer-tip">GPU hardware-accelerated rendering. Zero compression artifacting.</span>
        <div class="footer-actions">
          <FluentButton appearance="subtle" onclick={closeModal}>Cancel</FluentButton>
          <FluentButton 
            appearance="primary" 
            loading={isGeneratingZip} 
            onclick={downloadBatchZip}
          >
            <FluentIcons name="download" size={14} />
            <span style="margin-left: 6px;">Download Selected Social Pack</span>
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
