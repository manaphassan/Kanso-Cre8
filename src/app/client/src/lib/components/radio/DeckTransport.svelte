<script lang="ts">
  /** Piano-key transport: one row of keys like a real deck, plus volume. */
  import { Icon } from '$lib/components/ui';
  import type { IconName } from '$lib/components/ui/Icon.svelte';

  interface Props {
    isPlaying: boolean;
    isBuffering: boolean;
    volume: number;
    isMuted: boolean;
    side: 'A' | 'B';
    onRewind: () => void;
    onPlayPause: () => void;
    onStop: () => void;
    onFastForward: () => void;
    onFlip: () => void;
    onVolume: (v: number) => void;
    onMute: () => void;
  }

  let { isPlaying, isBuffering, volume, isMuted, side, onRewind, onPlayPause, onStop, onFastForward, onFlip, onVolume, onMute }: Props = $props();

  const keys = $derived<Array<{ id: string; label: string; icon: IconName; hint: string; act: () => void; down?: boolean; primary?: boolean }>>([
    { id: 'rew', label: 'Rew', icon: 'rewind', hint: 'Previous station', act: onRewind },
    { id: 'play', label: isPlaying ? 'Pause' : 'Play', icon: isPlaying ? 'pause' : 'play', hint: isPlaying ? 'Pause' : 'Play', act: onPlayPause, down: isPlaying || isBuffering, primary: true },
    { id: 'stop', label: 'Stop', icon: 'stop', hint: 'Stop', act: onStop },
    { id: 'ff', label: 'FF', icon: 'fastForward', hint: 'Next station', act: onFastForward },
    { id: 'flip', label: `Side ${side === 'A' ? 'B' : 'A'}`, icon: 'flip', hint: `Flip to side ${side === 'A' ? 'B' : 'A'}`, act: onFlip }
  ]);

  const level = $derived(isMuted ? 0 : volume);
</script>

<div class="transport">
  <div class="keys" role="group" aria-label="Transport">
    {#each keys as key (key.id)}
      <button
        type="button"
        class="key"
        class:down={key.down}
        class:primary={key.primary}
        onclick={key.act}
        title={key.hint}
        aria-label={key.hint}
        aria-pressed={key.primary ? key.down : undefined}
      >
        <Icon name={key.icon} size={14} />
        <span class="key-label">{key.label}</span>
      </button>
    {/each}
  </div>

  <div class="volume">
    <button type="button" class="mute" onclick={onMute} aria-label={isMuted ? 'Unmute' : 'Mute'} title={isMuted ? 'Unmute' : 'Mute'}>
      <Icon name={level === 0 ? 'volumeMute' : 'volume'} size={14} />
    </button>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={level}
      oninput={(e) => onVolume(parseFloat(e.currentTarget.value))}
      aria-label="Volume"
    />
    <span class="vol font-mono">{Math.round(level * 100)}</span>
  </div>
</div>

<style>
  .transport {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--kanso-space-3);
  }

  .keys {
    display: flex;
    flex: 1 1 320px;
    padding: 4px;
    gap: 2px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    box-shadow: var(--neu-shadow-inset, none);
  }

  .key {
    flex: 1 1 0;
    min-width: 0;
    height: 46px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-bottom-width: 3px;
    border-radius: var(--kanso-radius-sm);
    color: var(--kanso-text-primary);
    cursor: pointer;
    box-shadow: var(--neu-shadow-raised-sm, none);
    transition: transform 0.08s ease, background 0.12s ease, border-color 0.12s ease;
  }

  .key:hover { background: var(--kanso-surface-hover); }

  .key:active,
  .key.down {
    transform: translateY(2px);
    border-bottom-width: 1px;
    box-shadow: var(--neu-shadow-inset-sm, none);
  }

  .key.primary.down {
    color: var(--kanso-accent);
    border-color: var(--kanso-accent);
  }

  .key-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  .volume {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    flex: 1 1 160px;
    max-width: 220px;
  }

  .mute {
    display: inline-flex;
    padding: 6px;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--kanso-radius-sm);
    color: var(--kanso-text-muted);
    cursor: pointer;
  }

  .mute:hover { color: var(--kanso-text-primary); border-color: var(--kanso-border); }

  input[type='range'] {
    flex: 1;
    min-width: 0;
    accent-color: var(--kanso-accent);
  }

  .vol {
    width: 26px;
    text-align: right;
    font-size: 11px;
    color: var(--kanso-text-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .key { transition: none; }
  }
</style>
