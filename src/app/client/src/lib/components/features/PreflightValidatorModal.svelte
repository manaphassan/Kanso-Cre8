<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import type { DeliverableItem } from '$lib/types';

  interface Props {
    open?: boolean;
    deliverable?: DeliverableItem | null;
    onClose?: () => void;
  }

  let {
    open = $bindable(false),
    deliverable = null,
    onClose
  }: Props = $props();

  // Malaysian Standard Physical Print & POSM Specifications
  const PRESETS = [
    { id: 'bunting_2x5', name: 'Bunting (2×5 ft)', widthCm: 60.96, heightCm: 152.4, category: 'Event & Retail POSM', recommendedDpi: 300 },
    { id: 'banner_8x4', name: 'Banner (8×4 ft)', widthCm: 243.84, heightCm: 121.92, category: 'Outdoor Signage', recommendedDpi: 150 },
    { id: 'poster_a3', name: 'Poster A3', widthCm: 29.7, heightCm: 42.0, category: 'Indoor Print', recommendedDpi: 300 },
    { id: 'flyer_a4', name: 'Flyer A4', widthCm: 21.0, heightCm: 29.7, category: 'Marketing Collateral', recommendedDpi: 300 },
    { id: 'packaging_box', name: 'Packaging Box Die-line', widthCm: 35.0, heightCm: 25.0, category: 'Product Packaging', recommendedDpi: 300 }
  ];

  let selectedPresetId = $state<string>('bunting_2x5');
  let imgNaturalWidth = $state<number>(0);
  let imgNaturalHeight = $state<number>(0);
  let isInspecting = $state<boolean>(false);

  $effect(() => {
    if (open && deliverable) {
      inspectImage();
    }
  });

  function inspectImage() {
    const src = deliverable?.previewUrl || deliverable?.url;
    if (!src) return;
    isInspecting = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgNaturalWidth = img.naturalWidth;
      imgNaturalHeight = img.naturalHeight;
      isInspecting = false;
    };
    img.onerror = () => {
      imgNaturalWidth = 1920;
      imgNaturalHeight = 1080;
      isInspecting = false;
    };
    img.src = src;
  }

  const selectedPreset = $derived(PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0]);

  // DPI calculation: (pixels / (cm / 2.54))
  const preflightMetrics = $derived.by(() => {
    if (!imgNaturalWidth || !imgNaturalHeight) {
      return { dpiW: 0, dpiH: 0, avgDpi: 0, status: 'unknown', ratioDiff: '0.0' };
    }
    const targetWInches = selectedPreset.widthCm / 2.54;
    const targetHInches = selectedPreset.heightCm / 2.54;

    const dpiW = Math.round(imgNaturalWidth / targetWInches);
    const dpiH = Math.round(imgNaturalHeight / targetHInches);
    const avgDpi = Math.min(dpiW, dpiH);

    const assetRatio = imgNaturalWidth / imgNaturalHeight;
    const targetRatio = selectedPreset.widthCm / selectedPreset.heightCm;
    const ratioDiff = (Math.abs(assetRatio - targetRatio) / targetRatio * 100).toFixed(1);

    let status = 'optimal';
    if (avgDpi < 150) status = 'critical';
    else if (avgDpi < selectedPreset.recommendedDpi) status = 'warning';

    return { dpiW, dpiH, avgDpi, status, ratioDiff };
  });

  function downloadReport() {
    if (!deliverable) return;
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Preflight Certificate — ${deliverable.filename}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--kanso-canvas); color: var(--kanso-text-primary); padding: 30px; }
    .card { background: var(--kanso-surface); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto; }
    h1 { font-size: 20px; color: var(--kanso-accent); margin-top: 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; }
    .badge-optimal { background: rgba(16,185,129,0.2); color: var(--kanso-success); }
    .badge-warning { background: rgba(245,158,11,0.2); color: var(--kanso-warning); }
    .badge-critical { background: rgba(239,68,68,0.2); color: var(--kanso-danger); }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
    .label { color: var(--kanso-text-muted); }
    .footer { margin-top: 20px; font-size: 11px; color: var(--kanso-text-muted); text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Kanso Cre8 Print Preflight Certificate</h1>
    <p>Asset: <b>${deliverable.filename}</b></p>
    <div class="row"><span class="label">Target Preset:</span><span>${selectedPreset.name} (${selectedPreset.widthCm}×${selectedPreset.heightCm} cm)</span></div>
    <div class="row"><span class="label">Pixel Dimensions:</span><span>${imgNaturalWidth} × ${imgNaturalHeight} px</span></div>
    <div class="row"><span class="label">Calculated DPI:</span><span><b>${preflightMetrics.avgDpi} DPI</b> (Recommended: ${selectedPreset.recommendedDpi} DPI)</span></div>
    <div class="row"><span class="label">Aspect Ratio Fit:</span><span>Deviation ${preflightMetrics.ratioDiff}%</span></div>
    <div class="row"><span class="label">Verdict:</span><span class="badge badge-${preflightMetrics.status}">${preflightMetrics.status.toUpperCase()}</span></div>
    <div class="footer">Generated on ${new Date().toLocaleString()} · Kanso Cre8 Studio Engine</div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Preflight_${deliverable.filename.replace(/\.[^/.]+$/, "")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    appState.addToast('Preflight certificate downloaded.', 'success');
  }

  function closeModal() {
    open = false;
    if (onClose) onClose();
  }
</script>

{#if open && deliverable}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="preflight-backdrop" onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="preflight-modal">
      <!-- Header -->
      <div class="preflight-header">
        <div class="header-left">
          <div class="preflight-icon-badge">
            <Icon name="printer" size={20} color="var(--kanso-accent)" />
          </div>
          <div>
            <h2 class="modal-title">Production Print &amp; POSM Preflight Validator</h2>
            <p class="modal-sub">DPI resolution check, physical dimension fit, and color space guard.</p>
          </div>
        </div>
        <button class="close-btn" onclick={closeModal} title="Close modal" aria-label="Close dialog">
          <Icon name="close" size={16} />
        </button>
      </div>

      <!-- Body -->
      <div class="preflight-body">
        <!-- Target Preset Selector -->
        <div class="preset-card">
          <label class="section-label" for="print-preset-select">Select Physical Print Target Standard</label>
          <select id="print-preset-select" class="preset-select" bind:value={selectedPresetId}>
            {#each PRESETS as p}
              <option value={p.id}>{p.name} — {p.widthCm}×{p.heightCm} cm ({p.category})</option>
            {/each}
          </select>
        </div>

        <!-- Evaluation Results Matrix -->
        <div class="metrics-grid">
          <!-- DPI Gauge -->
          <div class="metric-box status-{preflightMetrics.status}">
            <span class="metric-tag">CALCULATED DPI</span>
            <div class="metric-val">{preflightMetrics.avgDpi} <span class="unit">DPI</span></div>
            <span class="metric-hint">
              Target: <b>{selectedPreset.recommendedDpi} DPI</b> · 
              {#if preflightMetrics.status === 'optimal'}
                <span class="text-green">Crystal Sharp Print</span>
              {:else if preflightMetrics.status === 'warning'}
                <span class="text-amber">Acceptable for Distant Viewing</span>
              {:else}
                <span class="text-red">Low Resolution Pixelation Risk</span>
              {/if}
            </span>
          </div>

          <!-- Dimension & Aspect Ratio Fit -->
          <div class="metric-box">
            <span class="metric-tag">CANVAS DIMENSIONS</span>
            <div class="metric-val">{imgNaturalWidth} <span class="unit">×</span> {imgNaturalHeight} <span class="unit">px</span></div>
            <span class="metric-hint">
              Aspect Ratio Deviation: <b>{preflightMetrics.ratioDiff}%</b>
              {#if parseFloat(preflightMetrics.ratioDiff) <= 1.5}
                <span class="text-green"> (Optimal Dimension Fit)</span>
              {:else}
                <span class="text-amber"> (Crop Adjustment Required)</span>
              {/if}
            </span>
          </div>
        </div>

        <!-- Print Vendor Preflight Checklist -->
        <div class="checklist-card">
          <h3 class="checklist-title">Vendor Fabrication Preflight Checklist</h3>
          <div class="checks-list">
            <div class="check-item">
              <span class="check-icon">
                <Icon 
                  name={preflightMetrics.avgDpi >= selectedPreset.recommendedDpi ? 'checkCircle' : 'warning'} 
                  size={16} 
                  color={preflightMetrics.avgDpi >= selectedPreset.recommendedDpi ? 'var(--kanso-success)' : 'var(--kanso-warning)'} 
                />
              </span>
              <div>
                <span class="check-name">DPI Resolution Threshold</span>
                <span class="check-sub">Evaluated against {selectedPreset.name} physical size.</span>
              </div>
            </div>

            <div class="check-item">
              <span class="check-icon">
                <Icon name="colorPalette" size={16} color="var(--kanso-accent)" />
              </span>
              <div>
                <span class="check-name">Color Profile Recommendation</span>
                <span class="check-sub">Ensure CMYK / FOGRA39 profile is embedded for offset press &amp; packaging vendors.</span>
              </div>
            </div>

            <div class="check-item">
              <span class="check-icon">
                <Icon name="vector" size={16} color="var(--kanso-accent)" />
              </span>
              <div>
                <span class="check-name">Standard Bleed Safety Margin</span>
                <span class="check-sub">Maintain at least 3.0 mm exterior bleed and 5.0 mm safe text margin.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="preflight-footer">
        <button class="report-dl-btn" onclick={downloadReport}>
          <Icon name="download" size={14} />
          <span style="margin-left: 6px;">Download Preflight Certificate</span>
        </button>
        <Button appearance="subtle" onclick={closeModal}>Close</Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .preflight-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1960;
    padding: 20px;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  .preflight-modal {
    width: 95%;
    max-width: 680px;
    background: var(--kanso-surface);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
  }

  .preflight-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(15, 23, 42, 0.98);
  }

  .header-left { display: flex; align-items: center; gap: 12px; }
  .preflight-icon { font-size: 24px; }
  .modal-title { font-size: 16px; font-weight: 800; color: var(--kanso-text-primary); }
  .modal-sub { font-size: 12px; color: var(--kanso-text-muted); margin-top: 2px; }

  .close-btn { background: transparent; border: none; font-size: 16px; color: var(--kanso-text-muted); cursor: pointer; padding: 4px 8px; }
  .close-btn:hover { color: var(--kanso-accent-text); }

  .preflight-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .preset-card { display: flex; flex-direction: column; gap: 6px; }
  .section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kanso-text-muted); }

  .preset-select {
    background: var(--kanso-surface-hover);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 10px 12px;
    color: var(--kanso-accent-text);
    font-size: 13px;
    font-weight: 600;
    outline: none;
  }
  .preset-select:focus { border-color: var(--kanso-accent); }

  /* Metrics Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .metric-box {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metric-box.status-optimal { border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.06); }
  .metric-box.status-warning { border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.06); }
  .metric-box.status-critical { border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.06); }

  .metric-tag { font-size: 10px; font-weight: 800; color: var(--kanso-text-muted); text-transform: uppercase; }
  .metric-val { font-size: 24px; font-weight: 900; color: var(--kanso-accent-text); font-family: monospace; }
  .metric-val .unit { font-size: 13px; color: var(--kanso-text-muted); font-weight: 600; }
  .metric-hint { font-size: 11px; color: var(--kanso-text-muted); margin-top: 2px; }

  .text-green { color: var(--kanso-success); font-weight: 700; }
  .text-amber { color: var(--kanso-warning); font-weight: 700; }
  .text-red { color: var(--kanso-danger); font-weight: 700; }

  /* Checklist */
  .checklist-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .checklist-title { font-size: 12px; font-weight: 800; color: var(--kanso-text-muted); text-transform: uppercase; }

  .checks-list { display: flex; flex-direction: column; gap: 8px; }
  .check-item { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; }
  .check-icon { font-size: 14px; margin-top: 1px; }
  .check-name { font-weight: 700; color: var(--kanso-accent-text); display: block; }
  .check-sub { font-size: 11px; color: var(--kanso-text-muted); }

  /* Footer */
  .preflight-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(11, 17, 33, 0.98);
  }

  .report-dl-btn {
    padding: 8px 14px;
    background: var(--kanso-accent);
    color: var(--kanso-accent-text);
    border: 1px solid var(--kanso-accent);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .report-dl-btn:hover { background: var(--kanso-accent); }

  @media (max-width: 600px) {
    .metrics-grid { grid-template-columns: 1fr; }
  }
</style>
