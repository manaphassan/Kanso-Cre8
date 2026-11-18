<script lang="ts">
  /**
   * The deck's fluorescent display: mode indicators, tape counter, station,
   * live track title and the L/R level meter.
   */
  import { Icon } from '$lib/components/ui';
  import DeckMeter from './DeckMeter.svelte';

  interface Props {
    frequency: string;
    stationName: string;
    track: string;
    status: 'playing' | 'tuning' | 'standby' | 'offline';
    index: number;
    side: 'A' | 'B';
    volume: number;
    onResetIndex: () => void;
  }

  let { frequency, stationName, track, status, index, side, volume, onResetIndex }: Props = $props();

  const digits = $derived(String(index % 10000).padStart(4, '0'));
  const indicators = $derived([
    { label: 'PLAY', on: status === 'playing' },
    { label: 'TUNE', on: status === 'tuning' },
    { label: 'NO SIG', on: status === 'offline', alert: true },
    { label: `SIDE ${side}`, on: true }
  ]);
</script>

<div class="fl">
  <div class="row">
    <div class="ind" aria-hidden="true">
      {#each indicators as ind (ind.label)}
        <span class:on={ind.on} class:alert={ind.alert}>{ind.label}</span>
      {/each}
    </div>
    <div class="counter">
      <span class="digits" aria-label="Tape counter {digits}">{digits}</span>
      <button type="button" class="reset" onclick={onResetIndex} aria-label="Reset tape counter" title="Reset tape counter">
        <Icon name="refresh" size={11} />
      </button>
    </div>
  </div>
  <div role="status" aria-live="polite">
    <div class="station" title={stationName}>{frequency}  {stationName}</div>
    <div class="track" title={track}>{track}</div>
  </div>
  <DeckMeter isPlaying={status === 'playing'} {volume} />
</div>

<style>
  /* Fluorescent display artwork: fixed phosphor colours (hex allow-listed). */
  .fl {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    padding: 9px 12px;
    background: #050807;
    border-radius: 3px;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.25);
    color: #59F2DC;
    font-family: var(--kanso-font-mono);
    text-shadow: 0 0 6px rgba(89, 242, 220, 0.7);
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .ind {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
    font-size: 9px;
    letter-spacing: 0.1em;
  }

  .ind span {
    color: #12302C;
    text-shadow: none;
  }

  .ind span.on {
    color: #59F2DC;
    text-shadow: 0 0 6px rgba(89, 242, 220, 0.7);
  }

  .ind span.alert.on {
    color: #FF6A4D;
    text-shadow: 0 0 6px rgba(255, 106, 77, 0.7);
  }

  .counter {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .digits {
    font-size: 22px;
    letter-spacing: 0.12em;
    color: #FFB547;
    text-shadow: 0 0 8px rgba(255, 181, 71, 0.7);
  }

  .reset {
    display: inline-flex;
    padding: 3px;
    background: none;
    border: 1px solid transparent;
    border-radius: 2px;
    color: #2E6F66;
    cursor: pointer;
  }

  .reset:hover,
  .reset:focus-visible {
    color: #59F2DC;
    border-color: #12302C;
  }

  .station,
  .track {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .station {
    font-size: 15px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: pre;
  }

  .track {
    font-size: 11px;
    opacity: 0.85;
    margin-bottom: 4px;
  }
</style>
