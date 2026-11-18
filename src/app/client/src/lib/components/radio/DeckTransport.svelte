<script lang="ts">
  /** Hi-fi transport keys with an LED above each, as on a front-loading deck. */
  import { Icon } from '$lib/components/ui';
  import type { IconName } from '$lib/components/ui/Icon.svelte';

  interface Props {
    isPlaying: boolean;
    isBuffering: boolean;
    side: 'A' | 'B';
    onRewind: () => void;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    onFastForward: () => void;
    onFlip: () => void;
  }

  let { isPlaying, isBuffering, side, onRewind, onPlay, onPause, onStop, onFastForward, onFlip }: Props = $props();

  type Led = 'green' | 'amber' | null;
  const other = $derived(side === 'A' ? 'B' : 'A');
  const keys = $derived<Array<{ id: string; label: string; icon: IconName; hint: string; act: () => void; led: Led; down?: boolean }>>([
    { id: 'rew', label: 'REW', icon: 'rewind', hint: 'Previous station', act: onRewind, led: null },
    {
      id: 'play',
      label: 'PLAY',
      icon: 'play',
      hint: 'Play',
      act: onPlay,
      led: isBuffering ? 'amber' : isPlaying ? 'green' : null,
      down: isPlaying || isBuffering
    },
    { id: 'pause', label: 'PAUSE', icon: 'pause', hint: 'Pause', act: onPause, led: null },
    { id: 'stop', label: 'STOP', icon: 'stop', hint: 'Stop', act: onStop, led: null },
    { id: 'ff', label: 'FF', icon: 'fastForward', hint: 'Next station', act: onFastForward, led: null },
    { id: 'flip', label: `SIDE ${other}`, icon: 'flip', hint: `Flip to side ${other}`, act: onFlip, led: null }
  ]);
</script>

<div class="transport" role="group" aria-label="Transport">
  {#each keys as key (key.id)}
    <div class="slot">
      <span class="led {key.led ?? ''}" aria-hidden="true"></span>
      <button
        type="button"
        class="key"
        class:down={key.down}
        onclick={key.act}
        title={key.hint}
        aria-label={key.hint}
        aria-pressed={key.id === 'play' ? !!key.down : undefined}
      >
        <Icon name={key.icon} size={14} />
      </button>
      <span class="label" aria-hidden="true">{key.label}</span>
    </div>
  {/each}
</div>

<style>
  .transport {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 6px;
  }

  .slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .led {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--dk-led-off);
  }

  /* LED artwork: fixed lamp colours (hex allow-listed). */
  .led.green { background: #5CFF7A; box-shadow: 0 0 6px #5CFF7A; }
  .led.amber { background: #FFB547; box-shadow: 0 0 6px #FFB547; animation: blink 1s steps(2, start) infinite; }

  .key {
    width: 100%;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 2px;
    color: var(--dk-ink);
    background: var(--dk-key);
    box-shadow: var(--dk-key-edge);
    cursor: pointer;
    transition: transform 0.06s ease;
  }

  .key:hover { filter: brightness(1.05); }

  .key:active,
  .key.down {
    transform: translateY(1px);
    box-shadow: var(--dk-key-pressed);
  }

  .key:focus-visible {
    outline: 2px solid var(--kanso-accent);
    outline-offset: 2px;
  }

  .label {
    font-size: 8.5px;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }

  @keyframes blink {
    to { opacity: 0.25; }
  }

  @media (prefers-reduced-motion: reduce) {
    .key { transition: none; }
    .led.amber { animation: none; }
  }
</style>
