<script lang="ts">
  /** Front-panel 25-minute focus timer: amber readout plus start/pause and reset keys. */
  import { focusTimer } from '$lib/stores/focusTimer.svelte';
  import { Icon } from '$lib/components/ui';

  const label = $derived(focusTimer.isRunning ? 'Pause focus timer' : 'Start 25-minute focus timer');
</script>

<div class="focus" role="group" aria-label="Focus timer">
  <span class="caption" aria-hidden="true">FOCUS TIMER</span>
  <div class="row">
    <span class="readout" class:running={focusTimer.isRunning} aria-label="Focus time left {focusTimer.formatted}">
      {focusTimer.formatted}
    </span>
    <button type="button" class="mini-key" onclick={() => focusTimer.toggle()} aria-label={label} title={label}>
      <Icon name={focusTimer.isRunning ? 'pause' : 'play'} size={11} />
    </button>
    <button type="button" class="mini-key" onclick={() => focusTimer.reset()} aria-label="Reset focus timer" title="Reset to 25 minutes">
      <Icon name="refresh" size={11} />
    </button>
  </div>
</div>

<style>
  /* Readout artwork: fixed phosphor colours (hex allow-listed). Keys use the deck's --dk-* finish. */
  .focus {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .caption {
    font-size: 8.5px;
    letter-spacing: 0.1em;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .readout {
    min-width: 54px;
    padding: 3px 6px;
    border-radius: 2px;
    background: #050807;
    box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.9);
    color: #8A6A2E;
    font-family: var(--kanso-font-mono);
    font-size: 13px;
    letter-spacing: 0.08em;
    text-align: center;
  }

  .readout.running {
    color: #FFB547;
    text-shadow: 0 0 8px rgba(255, 181, 71, 0.7);
  }

  .mini-key {
    width: 26px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 2px;
    color: var(--dk-ink);
    background: var(--dk-key);
    box-shadow: var(--dk-key-edge);
    cursor: pointer;
  }

  .mini-key:active {
    transform: translateY(1px);
    box-shadow: var(--dk-key-pressed);
  }

  .mini-key:focus-visible {
    outline: 2px solid var(--kanso-accent);
    outline-offset: 2px;
  }
</style>
