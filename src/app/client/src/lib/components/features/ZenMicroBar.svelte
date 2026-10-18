<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { radioService } from '$lib/services/radioService.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    currentTitle?: string;
    onOpenScratchpad?: () => void;
  }

  let { currentTitle = 'Zen Atelier', onOpenScratchpad }: Props = $props();

  const isRadioPlaying = $derived(radioService.state.isPlaying);
  const currentStation = $derived(radioService.currentStation);

  function toggleTimer() {
    if (timerStore.isRunning) {
      timerStore.pause();
    } else if (timerStore.isPaused) {
      timerStore.resume();
    } else {
      timerStore.start();
    }
  }

  function toggleRadio() {
    if (radioService.state.isPlaying) {
      radioService.pause();
    } else {
      radioService.play();
    }
  }

  function nextRadio() {
    const stations = radioService.stations;
    const currentIdx = stations.findIndex(s => s.id === radioService.state.currentStationId);
    const nextIdx = (currentIdx + 1) % stations.length;
    radioService.tuneStation(stations[nextIdx]);
  }
</script>

<div class="zen-micro-bar" role="toolbar" aria-label="Zen Mode Micro Controls">
  <!-- Zen Status & Context Indicator -->
  <div class="bar-section context-section">
    <span class="zen-pulse-indicator" title="Quiet Mode Active"></span>
    <span class="zen-mode-badge">ZEN</span>
    <span class="context-title" title={currentTitle}>{currentTitle}</span>
  </div>

  <div class="bar-divider"></div>

  <!-- Integrated Tactile Chronometer -->
  <div class="bar-section timer-section">
    <button
      type="button"
      class="timer-play-btn"
      class:running={timerStore.isRunning}
      onclick={toggleTimer}
      title={timerStore.isRunning ? 'Pause Billable Timer' : 'Start Billable Timer'}
      aria-label={timerStore.isRunning ? 'Pause Timer' : 'Start Timer'}
    >
      <Icon name={timerStore.isRunning ? 'pause' : 'play'} size={13} />
    </button>
    <span class="timer-ticker" class:pulsing={timerStore.isRunning}>{timerStore.elapsedFormatted}</span>
    {#if timerStore.earnings > 0}
      <span class="timer-earnings">{timerStore.formattedEarned}</span>
    {/if}
  </div>

  <div class="bar-divider"></div>

  <!-- Focus Radio Controls -->
  <div class="bar-section radio-section">
    <button
      type="button"
      class="radio-play-btn"
      class:playing={isRadioPlaying}
      onclick={toggleRadio}
      title={isRadioPlaying ? 'Pause Focus Radio' : 'Play Focus Radio'}
      aria-label={isRadioPlaying ? 'Pause Radio' : 'Play Radio'}
    >
      <Icon name={isRadioPlaying ? 'pause' : 'play'} size={13} />
    </button>
    <span class="station-name" title="{currentStation.name} ({currentStation.frequency})">{currentStation.name}</span>
    <button
      type="button"
      class="radio-next-btn"
      onclick={nextRadio}
      title="Next Station"
      aria-label="Next Focus Station"
    >
      <Icon name="chevronRight" size={13} />
    </button>
  </div>

  {#if onOpenScratchpad}
    <div class="bar-divider"></div>
    <button
      type="button"
      class="bar-action-btn scratchpad-btn"
      onclick={onOpenScratchpad}
      title="Quick Scratchpad (Ctrl+Shift+K)"
      aria-label="Quick Scratchpad"
    >
      <Icon name="edit" size={13} />
      <span class="action-label">Scratch</span>
    </button>
  {/if}

  <div class="bar-divider"></div>

  <!-- Exit Zen Mode Button -->
  <button
    type="button"
    class="bar-action-btn exit-btn"
    onclick={() => appState.exitZenMode()}
    title="Exit Quiet Mode (Esc or Ctrl+Shift+Z)"
    aria-label="Exit Quiet Mode"
  >
    <Icon name="close" size={13} />
    <span class="action-label">Exit</span>
    <kbd class="key-hint">ESC</kbd>
  </button>
</div>

<style>
  .zen-micro-bar {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 999px;
    padding: 6px 14px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--kanso-border);
    backdrop-filter: blur(16px);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .zen-micro-bar:hover {
    border-color: var(--kanso-accent);
    box-shadow: 0 20px 42px rgba(0, 0, 0, 0.55), 0 0 0 1px var(--kanso-accent);
  }

  .bar-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bar-divider {
    width: 1px;
    height: 16px;
    background: var(--kanso-border);
    margin: 0 4px;
  }

  .zen-pulse-indicator {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--kanso-accent);
    box-shadow: 0 0 8px var(--kanso-accent);
    animation: zenPulse 2.5s infinite ease-in-out;
  }

  @keyframes zenPulse {
    0%, 100% { opacity: 0.35; transform: scale(0.9); }
    50% { opacity: 1; transform: scale(1.15); }
  }

  .zen-mode-badge {
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.8px;
    color: var(--kanso-accent);
    padding: 1px 5px;
    border-radius: 3px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
  }

  .context-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-primary);
    max-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timer-play-btn, .radio-play-btn, .radio-next-btn {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-canvas);
    color: var(--kanso-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .timer-play-btn:hover, .radio-play-btn:hover, .radio-next-btn:hover {
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-accent);
  }

  .timer-play-btn.running, .radio-play-btn.playing {
    background: var(--kanso-accent);
    color: var(--kanso-canvas);
    border-color: var(--kanso-accent);
  }

  .timer-ticker {
    font-family: monospace;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    letter-spacing: 0.5px;
  }

  .timer-ticker.pulsing {
    color: var(--kanso-accent);
  }

  .timer-earnings {
    font-family: monospace;
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-success);
    padding: 1px 4px;
    background: var(--kanso-canvas);
    border-radius: 3px;
    border: 1px solid var(--kanso-border);
  }

  .station-name {
    font-size: 11.5px;
    color: var(--kanso-text-muted);
    font-weight: 500;
    max-width: 120px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 999px;
    padding: 4px 10px;
    color: var(--kanso-text-primary);
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .bar-action-btn:hover {
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-accent);
  }

  .bar-action-btn.exit-btn:hover {
    border-color: var(--kanso-danger);
    color: var(--kanso-danger);
  }

  .key-hint {
    font-family: monospace;
    font-size: 9px;
    color: var(--kanso-text-muted);
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 3px;
    padding: 1px 4px;
  }
</style>
