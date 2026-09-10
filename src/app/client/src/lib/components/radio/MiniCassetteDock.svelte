<script lang="ts">
  import { radioService } from '$lib/services/radioService.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import CassetteSpoolWheel from './CassetteSpoolWheel.svelte';

  const station = $derived(radioService.currentStation);
  const state = $derived(radioService.state);

  function openRadioStudio() {
    appState.navigate('radio');
  }
</script>

<div class="mini-dock-container">
  <!-- Mini Cassette Chamber Inset (Click to navigate to Radio Studio) -->
  <button
    type="button"
    class="mini-chamber-btn"
    style="
      background: {station.shellColor};
      border-color: rgba(255, 255, 255, 0.2);
    "
    onclick={openRadioStudio}
    title="Open Cassette Studio"
    aria-label="Open Radio Studio ({station.name})"
  >
    <!-- Left Mini Spool -->
    <CassetteSpoolWheel
      size={16}
      isSpinning={state.isPlaying}
      rotationAngle={state.isPlaying ? state.spoolRotation : 0}
      holeColor="#020617"
    />

    <!-- Center Mini Tape Window -->
    <div class="mini-tape-window">
      <div class="mini-red-dot"></div>
    </div>

    <!-- Right Mini Spool -->
    <CassetteSpoolWheel
      size={16}
      isSpinning={state.isPlaying}
      rotationAngle={state.isPlaying ? state.spoolRotation : 0}
      holeColor="#020617"
    />

    <span
      class="mini-freq-badge"
      style="background: {station.accentColor};"
    >
      {station.frequency}
    </span>
  </button>

  <!-- Track Title / Station Marquee -->
  <button
    type="button"
    class="mini-track-btn"
    onclick={openRadioStudio}
    title="Open Focus Radio"
  >
    <div class="mini-track-row">
      <span
        class="mini-power-dot"
        style="background: {state.isPlaying ? '#8FA683' : '#71717A'};"
      ></span>
      <span class="mini-station-name">
        {station.name}
      </span>
      <span class="mini-track-title">
        — {state.currentTrackTitle}
      </span>
    </div>
  </button>

  <!-- Quick Transport Controls -->
  <div class="mini-controls">
    <button
      type="button"
      class="mini-arrow-btn"
      onclick={() => radioService.prev()}
      aria-label="Previous Station"
      title="Previous Tape"
    >
      <svg class="mini-svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
      </svg>
    </button>

    <!-- Play / Pause Pill -->
    <button
      type="button"
      class="mini-play-btn"
      style="
        background: {state.isPlaying ? 'var(--kanso-accent)' : 'var(--kanso-surface-hover)'};
        border-color: var(--kanso-accent);
        color: {state.isPlaying ? '#FFFFFF' : 'var(--kanso-accent)'};
      "
      onclick={() => radioService.toggle()}
      aria-label={state.isPlaying ? 'Pause' : 'Play'}
    >
      {#if state.isPlaying}
        <svg class="mini-svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      {:else}
        <svg class="mini-svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      {/if}
    </button>

    <button
      type="button"
      class="mini-arrow-btn"
      onclick={() => radioService.next()}
      aria-label="Next Station"
      title="Next Tape"
    >
      <svg class="mini-svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .mini-dock-container {
    height: 40px;
    padding: 0 10px;
    border-radius: 12px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    user-select: none;
    box-sizing: border-box;
    width: 100%;
  }

  .mini-chamber-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 3px 8px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    flex-shrink: 0;
    outline: none;
    transition: filter 0.15s ease, transform 0.1s ease;
    box-sizing: border-box;
  }

  .mini-chamber-btn:hover {
    filter: brightness(1.1);
  }

  .mini-chamber-btn:active {
    transform: scale(0.97);
  }

  .mini-tape-window {
    width: 20px;
    height: 10px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mini-red-dot {
    width: 6px;
    height: 4px;
    background: #DE694B;
    border-radius: 2px;
  }

  .mini-freq-badge {
    font-size: 10.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    color: #FFFFFF;
    letter-spacing: -0.02em;
  }

  .mini-track-btn {
    flex: 1;
    min-width: 0;
    text-align: left;
    overflow: hidden;
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 0;
    outline: none;
    display: flex;
    align-items: center;
  }

  .mini-track-row {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
  }

  .mini-power-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    transition: background 0.3s ease;
  }

  .mini-station-name {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .mini-track-title {
    font-size: 12px;
    font-family: var(--font-mono, monospace);
    color: var(--kanso-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mini-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .mini-arrow-btn {
    padding: 4px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--kanso-text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .mini-arrow-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
  }

  .mini-play-btn {
    padding: 4px 6px;
    border-radius: 8px;
    border: 1px solid var(--kanso-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
    transition: transform 0.1s ease;
  }

  .mini-play-btn:active {
    transform: scale(0.94);
  }

  .mini-svg {
    width: 14px;
    height: 14px;
  }
</style>
