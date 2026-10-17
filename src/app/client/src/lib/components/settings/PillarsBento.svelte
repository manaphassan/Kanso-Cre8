<script lang="ts">
  import { Icon } from '$lib/components/ui';
</script>

<div class="pillars-bento-grid">
  <div class="pillar-card">
    <div class="pillar-icon"><Icon name="folder" size={24} /></div>
    <h3 class="pillar-title">Pure Markdown Storage</h3>
    <p class="pillar-desc">Zero SQL or SQLite binary files. 100% human-readable UTF-8 files and YAML frontmatter openable anytime in VS Code or Obsidian.</p>
  </div>

  <div class="pillar-card">
    <div class="pillar-icon"><Icon name="clock" size={24} /></div>
    <h3 class="pillar-title">Live Billable Timer</h3>
    <p class="pillar-desc">Real-time design rate timer with live accrued earnings, active client color palette, and seamless logging to draft invoices.</p>
  </div>

  <div class="pillar-card">
    <div class="pillar-icon"><Icon name="music" size={24} /></div>
    <h3 class="pillar-title">Mechanical Focus Audio</h3>
    <p class="pillar-desc">Faithful dual-spool mechanical cassette deck rotating at 33 RPM, integrated Web Audio DSP, and Lo-Fi streams.</p>
  </div>

  <div class="pillar-card">
    <div class="pillar-icon"><Icon name="target" size={24} /></div>
    <h3 class="pillar-title">Precision Typography</h3>
    <p class="pillar-desc">Strict mathematical hierarchy: Red Hat Display for expressive titles &ge; 24pt, and Nunito for UI clarity &lt; 24pt.</p>
  </div>
</div>

<style>
  .pillars-bento-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  @media (max-width: 768px) { .pillars-bento-grid { grid-template-columns: 1fr; } }
  .pillar-card { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
  .pillar-icon { color: var(--kanso-accent); margin-bottom: 4px; }
  .pillar-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--kanso-text-primary); }
  .pillar-desc { margin: 0; font-size: 13px; color: var(--kanso-text-muted); line-height: 1.45; }
</style>
