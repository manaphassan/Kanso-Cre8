<script lang="ts">
  import { onMount } from 'svelte';
  import { journalService } from '$lib/services/journalService';

  let currentYear = $state('2026');
  let yearlyData = $state<any>(null);

  async function loadYear() {
    yearlyData = await journalService.getYearlyIndex(currentYear);
  }

  onMount(() => {
    loadYear();
  });
</script>

<div class="yearly-view card-surface">
  <div class="yearly-header">
    <div class="yearly-titles">
      <span class="yearly-badge">ANNUAL VISION &amp; ARCHIVE</span>
      <h3 class="yearly-title">{currentYear} Annual Atelier Index</h3>
    </div>
    <select class="year-select font-mono" bind:value={currentYear} onchange={loadYear}>
      <option value="2026">2026</option>
      <option value="2025">2025</option>
    </select>
  </div>

  <div class="yearly-vision-box">
    <h4 class="vision-title">Annual Creative Mandate &amp; Vision</h4>
    <p class="vision-text">{yearlyData?.vision || 'Cultivate mindful craft, uncompromising quality, and sustainable freelance operations with 100% human-readable plain Markdown vaults.'}</p>
  </div>

  <div class="yearly-milestones-grid">
    <div class="milestone-card">
      <span class="milestone-badge">Q1</span>
      <h4 class="milestone-title">Brand Identity Systems</h4>
      <p class="milestone-desc">Core client system delivery with Acme Corp &amp; Lumina Labs.</p>
    </div>
    <div class="milestone-card">
      <span class="milestone-badge">Q2</span>
      <h4 class="milestone-title">Typography &amp; Press Kits</h4>
      <p class="milestone-desc">Bespoke font hierarchy specifications and print-ready deliverables.</p>
    </div>
    <div class="milestone-card">
      <span class="milestone-badge">Q3</span>
      <h4 class="milestone-title">Digital Packaging &amp; 3D</h4>
      <p class="milestone-desc">Tactile visual directions and motion graphics review pipeline.</p>
    </div>
    <div class="milestone-card">
      <span class="milestone-badge">Q4</span>
      <h4 class="milestone-title">Annual Retrospective</h4>
      <p class="milestone-desc">Year-end creative review, archival, and financial reconciliations.</p>
    </div>
  </div>
</div>

<style>
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; }
  .yearly-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .yearly-titles { display: flex; flex-direction: column; gap: 4px; }
  .yearly-badge { font-size: 11px; font-weight: 700; color: var(--kanso-accent); }
  .yearly-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--kanso-text-primary); }
  .year-select { height: 32px; padding: 0 10px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; color: var(--kanso-text-primary); font-size: 13px; font-weight: 700; }
  .yearly-vision-box { padding: 16px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; margin-bottom: 24px; }
  .vision-title { margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: var(--kanso-text-primary); }
  .vision-text { margin: 0; font-size: 13px; color: var(--kanso-text-muted); line-height: 1.5; }
  .yearly-milestones-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  @media (max-width: 900px) { .yearly-milestones-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) { .yearly-milestones-grid { grid-template-columns: 1fr; } }
  .milestone-card { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
  .milestone-badge { font-size: 11px; font-weight: 800; color: var(--kanso-accent); font-family: monospace; }
  .milestone-title { margin: 0; font-size: 14px; font-weight: 700; color: var(--kanso-text-primary); }
  .milestone-desc { margin: 0; font-size: 12px; color: var(--kanso-text-muted); line-height: 1.4; }
</style>
