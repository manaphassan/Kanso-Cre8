<script lang="ts">
  import CassetteDeck from '$lib/components/radio/CassetteDeck.svelte';
  import { radioService } from '$lib/services/radioService.svelte';

  function handleKeydown(e: KeyboardEvent) {
    // Space to toggle play/pause when not typing in input
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      radioService.toggle();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="radio-page-container">
  <!-- Page Header -->
  <header class="view-header">
    <div class="header-titles">
      <div class="header-tag">
        <span class="tag-badge">_Radio/</span>
        <span class="tag-meta">Mechanical Hi-Fi Focus Deck · 33 RPM</span>
      </div>
      <h1 class="view-title">Focus Radio</h1>
      <p class="view-subtitle">
        Tactile mechanical cassette deck streaming curated lo-fi beats, synthwave, and ambient soundscapes.
      </p>
    </div>
  </header>

  <!-- The Cassette Deck & Rack -->
  <CassetteDeck />

  <!-- Studio Hotkeys Footer Guide -->
  <footer class="radio-hotkeys-footer">
    <div class="hotkeys-left">
      <span class="hotkey-item">
        <kbd class="hotkey-kbd">Space</kbd>
        <span>Play / Pause</span>
      </span>
      <span class="hotkey-item">
        <kbd class="hotkey-kbd">Next</kbd>
        <span>Next Tape</span>
      </span>
      <span class="hotkey-item">
        <kbd class="hotkey-kbd">Prev</kbd>
        <span>Previous Tape</span>
      </span>
    </div>
    <span class="footer-meta">
      Kanso Zen Focus Engine · Zero-Latency Web Audio Stream
    </span>
  </footer>
</div>

<style>
  .radio-page-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 0 0 48px;
    width: 100%;
    max-width: 100%;
    margin: 0;
    box-sizing: border-box;
  }

  .radio-page-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 20px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    color: var(--kanso-accent);
    flex-shrink: 0;
  }

  .header-icon {
    width: 22px;
    height: 22px;
  }

  .header-text-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .header-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .header-title {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--kanso-text-primary);
    margin: 0;
    line-height: 1.2;
  }

  .header-badge {
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: rgba(222, 105, 75, 0.12);
    color: var(--kanso-accent);
    border: 1px solid rgba(222, 105, 75, 0.25);
  }

  .header-subtitle {
    font-size: 14px;
    color: var(--kanso-text-muted);
    margin: 0;
    line-height: 1.5;
  }

  .radio-hotkeys-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 18px;
    border-radius: 12px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    color: var(--kanso-text-muted);
    font-size: 12px;
    font-family: var(--font-mono, monospace);
  }

  .hotkeys-left {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .hotkey-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--kanso-text-muted);
  }

  .hotkey-kbd {
    padding: 2px 8px;
    border-radius: 5px;
    font-size: 12px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .footer-meta {
    font-size: 12px;
    font-family: var(--font-mono, monospace);
    color: var(--kanso-text-muted);
  }

  @media (max-width: 768px) {
    .radio-page-container {
      padding: 16px;
      gap: 16px;
    }
    .header-title {
      font-size: 20px;
    }
    .radio-hotkeys-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
  }
</style>
