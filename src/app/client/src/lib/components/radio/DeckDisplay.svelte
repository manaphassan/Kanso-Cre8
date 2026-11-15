<script lang="ts">
  /** The deck's display window: status lamp, frequency, station, track and tape index. */
  import { Icon } from '$lib/components/ui';

  interface Props {
    frequency: string;
    stationName: string;
    track: string;
    status: 'playing' | 'tuning' | 'standby' | 'offline';
    index: number;
    side: 'A' | 'B';
    onResetIndex: () => void;
  }

  let { frequency, stationName, track, status, index, side, onResetIndex }: Props = $props();

  const LABELS = { playing: 'On air', tuning: 'Tuning', standby: 'Standby', offline: 'Offline' } as const;
  const digits = $derived(String(index % 10000).padStart(4, '0'));
</script>

<div class="display" role="status" aria-live="polite">
  <div class="row">
    <span class="lamp lamp-{status}" aria-hidden="true"></span>
    <span class="state">{LABELS[status]}</span>
    <span class="freq font-mono">{frequency}</span>
    <span class="side font-mono">Side {side}</span>
    <div class="index" title="Tape index">
      <span class="index-digits font-mono" aria-label="Tape index {digits}">{digits}</span>
      <button type="button" class="index-reset" onclick={onResetIndex} aria-label="Reset tape index">
        <Icon name="refresh" size={12} />
      </button>
    </div>
  </div>
  <div class="row second">
    <span class="station" title={stationName}>{stationName}</span>
    <span class="track" title={track}><Icon name="music" size={12} />{track}</span>
  </div>
</div>

<style>
  .display {
    display: flex;
    flex-direction: column;
    gap: var(--kanso-space-1);
    padding: var(--kanso-space-3) var(--kanso-space-4);
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    box-shadow: var(--neu-shadow-inset, none);
    min-width: 0;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    min-width: 0;
  }

  .second {
    justify-content: space-between;
  }

  .lamp {
    width: 8px;
    height: 8px;
    border-radius: var(--kanso-radius-full);
    background: var(--kanso-text-muted);
    flex-shrink: 0;
  }

  .lamp-playing { background: var(--kanso-success); }
  .lamp-tuning { background: var(--kanso-warning); animation: blink 1s steps(2, start) infinite; }
  .lamp-offline { background: var(--kanso-danger); }

  .state {
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .freq {
    font-size: 18px;
    font-weight: 700;
    color: var(--kanso-accent);
    margin-left: var(--kanso-space-1);
  }

  .side {
    font-size: 11px;
    color: var(--kanso-text-muted);
  }

  .index {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--kanso-space-1);
  }

  .index-digits {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--kanso-text-primary);
  }

  .index-reset {
    display: inline-flex;
    padding: 4px;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--kanso-radius-sm);
    color: var(--kanso-text-muted);
    cursor: pointer;
  }

  .index-reset:hover { color: var(--kanso-text-primary); border-color: var(--kanso-border); }

  .station {
    font-size: 13px;
    font-weight: 600;
    color: var(--kanso-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .track {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--kanso-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    max-width: 55%;
  }

  @keyframes blink {
    to { opacity: 0.25; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lamp-tuning { animation: none; }
  }
</style>
