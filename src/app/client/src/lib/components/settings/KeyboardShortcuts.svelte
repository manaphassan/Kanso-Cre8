<script lang="ts">
  const shortcutList = [
    { key: '⌘ 1', label: 'Home', desc: 'Overview, today tasks & cashflow' },
    { key: '⌘ 2', label: 'Projects', desc: 'Active projects & schedules' },
    { key: '⌘ 3', label: 'Journal', desc: 'Daily log, monthly & yearly review' },
    { key: '⌘ 4', label: 'Notes', desc: 'Notes & scratchpad' },
    { key: '⌘ 5', label: 'Clients & Money', desc: 'Client profiles, quotes & invoices' },
    { key: '⌘ 6', label: 'Settings', desc: 'Preferences, themes & vault' },
    { key: '⌘ K', label: 'Command Palette', desc: 'Instant search across entire vault' },
    { key: '⌘ ⇧ T', label: 'Toggle Billable Timer', desc: 'Start, pause, or resume billable timer' },
    { key: '⌘ ⇧ K', label: 'Quick Scratchpad', desc: 'Instant capture into Scratchpad.md' },
    { key: '⌘ ⇧ Z', label: 'Quiet Mode', desc: 'Toggle distraction-free mode with floating micro-bar' },
    { key: 'Esc', label: 'Exit Quiet Mode', desc: 'Return to full view and navigation' },
    { key: 'Space', label: 'Focus Radio Play/Pause', desc: 'Toggle lo-fi cassette stream on/off' }
  ];
</script>

<div class="card-surface">
  <div class="card-header">
    <h2 class="card-title">Keyboard Shortcuts &amp; Hotkeys</h2>
    <p class="card-subtitle">Tactile keyboard shortcuts designed for flow state and fast navigation.</p>
  </div>

  <div class="shortcuts-table-wrap">
    <table class="shortcuts-table">
      <thead>
        <tr>
          <th style="width: 160px;">Shortcut</th>
          <th style="width: 200px;">Action</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {#each shortcutList as sc}
          <tr>
            <td><kbd class="shortcut-kbd">{sc.key}</kbd></td>
            <td class="action-label">{sc.label}</td>
            <td class="action-desc">{sc.desc}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; margin-top: 24px; }
  .card-header { margin-bottom: 20px; }
  .card-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .card-subtitle { margin: 4px 0 0 0; font-size: 13px; color: var(--kanso-text-muted); }
  .shortcuts-table-wrap { overflow-x: auto; }
  .shortcuts-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
  .shortcuts-table th { padding: 10px 12px; border-bottom: 1px solid var(--kanso-border); color: var(--kanso-text-muted); font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .shortcuts-table td { padding: 12px; border-bottom: 1px solid var(--kanso-border); }
  .shortcut-kbd { display: inline-block; padding: 2px 8px; font-family: monospace; font-size: 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 4px; color: var(--kanso-text-primary); }
  .action-label { font-weight: 600; color: var(--kanso-text-primary); }
  .action-desc { color: var(--kanso-text-muted); }
</style>
