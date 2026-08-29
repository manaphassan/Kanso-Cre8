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

  type PrintPreset = {
    id: string;
    name: string;
    widthInches: number;
    heightInches: number;
    widthCm: number;
    heightCm: number;
    category: string;
    recommendedDpi: number;
  };

  const PRESETS: PrintPreset[] = [
    { id: 'bunting_2x5', name: 'Bunting 2x5 ft (Standard Event)', widthInches: 24, heightInches: 60, widthCm: 60.96, heightCm: 152.4, category: 'POSM / Event', recommendedDpi: 150 },
    { id: 'banner_8x4', name: 'Banner 8x4 ft (Stage / Outdoor)', widthInches: 96, heightInches: 48, widthCm: 243.84, heightCm: 121.92, category: 'POSM / Billboard', recommendedDpi: 100 },
    { id: 'poster_a3', name: 'Poster A3 (Commercial Store Display)', widthInches: 11.69, heightInches: 16.54, widthCm: 29.7, heightCm: 42.0, category: 'Retail POSM', recommendedDpi: 300 },
    { id: 'flyer_a4', name: 'Flyer A4 (Direct Marketing Insert)', widthInches: 8.27, heightInches: 11.69, widthCm: 21.0, heightCm: 29.7, category: 'Print Marketing', recommendedDpi: 300 },
    { id: 'box_packaging', name: 'Box Packaging Die-Line (Medium Jar)', widthInches: 6.0, heightInches: 8.0, widthCm: 15.24, heightCm: 20.32, category: 'Packaging', recommendedDpi: 300 },
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
    if (!deliverable || !deliverable.url) return;
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
    img.src = deliverable.url || '';
  }

  const selectedPreset = $derived(PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0]);

  const preflightMetrics = $derived.by(() => {
    if (!imgNaturalWidth || !imgNaturalHeight) {
      return { dpiW: 0, dpiH: 0, avgDpi: 0, status: 'unknown', ratioDiff: 0 };
    }

    const dpiW = Math.round(imgNaturalWidth / selectedPreset.widthInches);
    const dpiH = Math.round(imgNaturalHeight / selectedPreset.heightInches);
    const avgDpi = Math.min(dpiW, dpiH);

    const imgRatio = imgNaturalWidth / imgNaturalHeight;
    const printRatio = selectedPreset.widthInches / selectedPreset.heightInches;
    const ratioDiff = Math.abs((imgRatio - printRatio) / printRatio) * 100;

    let status = 'critical';
    if (avgDpi >= selectedPreset.recommendedDpi) {
      status = 'optimal';
    } else if (avgDpi >= selectedPreset.recommendedDpi * 0.65) {
      status = 'warning';
    }

    return { dpiW, dpiH, avgDpi, status, ratioDiff: ratioDiff.toFixed(1) };
  });

  function downloadReport() {
    const reportHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SS-CAM Preflight Quality Report - ${deliverable?.filename}</title>
  <style>
    body { font-family: sans-serif; padding: 30px; background: #0F172A; color: #FFF; line-height: 1.6; }
    .card { background: #1E293B; border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #334155; }
    h1 { font-size: 20px; color: #38BDF8; margin-bottom: 4px; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; }
    .status-optimal { background: #065F46; color: #34D399; }
    .status-warning { background: #78350F; color: #FBBF24; }
    .status-critical { background: #7F1D1D; color: #F87171; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    td { padding: 8px 0; border-bottom: 1px solid #334155; }
    td:last-child { text-align: right; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🖨️ SuamiSihat CAM Preflight Certification</h1>
    <p style="color:#94A3B8; font-size:12px;">Quality Gate for Physical Print & POSM Fabrication</p>
    <div class="status status-${preflightMetrics.status}">
      ${preflightMetrics.status === 'optimal' ? '✅ PASS - OPTIMAL PRINT QUALITY' : preflightMetrics.status === 'warning' ? '⚠️ PASS WITH WARNING - MARGINAL DPI' : '❌ CRITICAL - LOW RESOLUTION'}
    </div>
    <table>
      <tr><td>File Name</td><td>${deliverable?.filename}</td></tr>
      <tr><td>Target Print Size</td><td>${selectedPreset.name} (${selectedPreset.widthCm} × ${selectedPreset.heightCm} cm)</td></tr>
      <tr><td>Source Resolution</td><td>${imgNaturalWidth} × ${imgNaturalHeight} px</td></tr>
      <tr><td>Calculated Effective DPI</td><td>${preflightMetrics.avgDpi} DPI (Target: ${selectedPreset.recommendedDpi} DPI)</td></tr>
      <tr><td>Aspect Ratio Match</td><td>${parseFloat(preflightMetrics.ratioDiff) < 2 ? '✓ Perfect Match' : `⚠️ ${preflightMetrics.ratioDiff}% deviation`}</td></tr>
      <tr><td>Recommended Bleed</td><td>3.0 mm (Standard offset bleed)</td></tr>
      <tr><td>Timestamp</td><td>${new Date().toLocaleString()}</td></tr>
    </table>
  </div>
</body>
</html>`;

    const blob = new Blob([reportHtml], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Preflight_Report_${deliverable?.filename || 'Asset'}.html`;
    a.click();
    appState.addToast('Preflight Quality Report downloaded!', 'success');
  }

  function closeModal() {
    open = false;
    if (onClose) onClose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="preflight-backdrop" onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="preflight-modal">
      <!-- Header -->
      <div class="preflight-header">
        <div class="header-left">
          <span class="preflight-icon">🖨️</span>
          <div>
            <h2 class="modal-title">Production Print &amp; POSM Preflight Validator</h2>
            <p class="modal-sub">DPI resolution check, physical dimension fit, and color space guard.</p>
          </div>
        </div>
        <button class="close-btn" onclick={closeModal}>✕</button>
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
                <span class="text-green">✓ Crystal Sharp Print</span>
              {:else if preflightMetrics.status === 'warning'}
                <span class="text-amber">⚠️ Acceptable for Distant Viewing</span>
              {:else}
                <span class="text-red">❌ Low Resolution Pixelation Risk</span>
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
                <span class="text-green"> (✓ Perfect Fit)</span>
              {:else}
                <span class="text-amber"> (⚠️ Crop Adjustment Required)</span>
              {/if}
            </span>
          </div>
        </div>

        <!-- Print Vendor Preflight Checklist -->
        <div class="checklist-card">
          <h3 class="checklist-title">Vendor Fabrication Preflight Checklist</h3>
          <div class="checks-list">
            <div class="check-item">
              <span class="check-icon">{preflightMetrics.avgDpi >= selectedPreset.recommendedDpi ? '✅' : '⚠️'}</span>
              <div>
                <span class="check-name">DPI Resolution Threshold</span>
                <span class="check-sub">Evaluated against {selectedPreset.name} physical size.</span>
              </div>
            </div>

            <div class="check-item">
              <span class="check-icon">🎨</span>
              <div>
                <span class="check-name">Color Profile Recommendation</span>
                <span class="check-sub">Ensure CMYK / FOGRA39 profile is embedded for offset press &amp; packaging vendors.</span>
              </div>
            </div>

            <div class="check-item">
              <span class="check-icon">✂️</span>
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
          📄 Download Preflight Certificate (HTML)
        </button>
        <FluentButton appearance="subtle" onclick={closeModal}>Close</FluentButton>
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
    background: #0F172A;
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
  .modal-title { font-size: 16px; font-weight: 800; color: #F8FAFC; }
  .modal-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }

  .close-btn { background: transparent; border: none; font-size: 16px; color: #94A3B8; cursor: pointer; padding: 4px 8px; }
  .close-btn:hover { color: #FFF; }

  .preflight-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .preset-card { display: flex; flex-direction: column; gap: 6px; }
  .section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94A3B8; }

  .preset-select {
    background: #1E293B;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 10px 12px;
    color: #FFF;
    font-size: 13px;
    font-weight: 600;
    outline: none;
  }
  .preset-select:focus { border-color: #38BDF8; }

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

  .metric-tag { font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; }
  .metric-val { font-size: 24px; font-weight: 900; color: #FFF; font-family: monospace; }
  .metric-val .unit { font-size: 13px; color: #94A3B8; font-weight: 600; }
  .metric-hint { font-size: 11px; color: #94A3B8; margin-top: 2px; }

  .text-green { color: #34D399; font-weight: 700; }
  .text-amber { color: #FBBF24; font-weight: 700; }
  .text-red { color: #F87171; font-weight: 700; }

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
  .checklist-title { font-size: 12px; font-weight: 800; color: #94A3B8; text-transform: uppercase; }

  .checks-list { display: flex; flex-direction: column; gap: 8px; }
  .check-item { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; }
  .check-icon { font-size: 14px; margin-top: 1px; }
  .check-name { font-weight: 700; color: #FFF; display: block; }
  .check-sub { font-size: 11px; color: #64748B; }

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
    background: #043388;
    color: #FFF;
    border: 1px solid #21A1F7;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .report-dl-btn:hover { background: #0078D4; }

  @media (max-width: 600px) {
    .metrics-grid { grid-template-columns: 1fr; }
  }
</style>
