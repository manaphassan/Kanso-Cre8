<script lang="ts">
  import type { CassetteRadioStation } from '$lib/types/radio';
  import CassetteSpoolWheel from './CassetteSpoolWheel.svelte';

  interface Props {
    station: CassetteRadioStation;
    isSelected?: boolean;
    isPlaying?: boolean;
    spoolRotation?: number;
    onclick?: () => void;
  }

  let {
    station,
    isSelected = false,
    isPlaying = false,
    spoolRotation = 0,
    onclick
  }: Props = $props();
</script>

<button
  type="button"
  class="tape-card-btn"
  class:selected={isSelected}
  style="
    background: {isSelected ? 'var(--kanso-surface-hover)' : 'var(--kanso-surface)'};
    border-color: {isSelected ? 'var(--kanso-accent)' : 'var(--kanso-border)'};
  "
  {onclick}
  aria-label="Select {station.name} Cassette"
>
  <!-- Physical Cassette Chassis Shell -->
  <div
    class="card-tape-shell"
    style="
      background: {station.shellColor};
      border-color: rgba(255, 255, 255, 0.15);
    "
  >
    <!-- Top 2 Silver Corner Screws -->
    <div class="screw top-left"><div class="screw-slot deg-45"></div></div>
    <div class="screw top-right"><div class="screw-slot deg-neg45"></div></div>

    <!-- Top Paper Sticker Label -->
    <div
      class="card-sticker-label"
      style="background: {station.labelColor}; color: #151813;"
    >
      <div class="label-left-group">
        <span
          class="label-side-badge"
          style="background: {station.shellColor};"
        >
          A
        </span>
        <span class="label-station-name" title={station.name}>
          {station.name}
        </span>
      </div>
      <span
        class="label-freq-badge"
        style="
          background: rgba(222, 105, 75, 0.12);
          color: {station.accentColor};
          border-color: rgba(222, 105, 75, 0.2);
        "
      >
        {station.frequency}
      </span>
    </div>

    <!-- Center Acrylic Tape Window & Spinning Spools -->
    <div class="card-tape-window">
      <!-- Magnetic Brown Tape Ribbon Strip -->
      <div class="card-ribbon-strip">
        <div class="card-gauge-box">
          <div class="gauge-mark"></div>
          <div class="gauge-mark sm"></div>
          <div class="gauge-mark center"></div>
          <div class="gauge-mark sm"></div>
          <div class="gauge-mark"></div>
        </div>
      </div>

      <!-- Left Supply Spool -->
      <div class="spool-slot">
        <CassetteSpoolWheel
          size={32}
          isSpinning={isPlaying && isSelected}
          rotationAngle={isPlaying && isSelected ? spoolRotation : 0}
          holeColor="#020617"
        />
      </div>

      <!-- Right Take-Up Spool -->
      <div class="spool-slot">
        <CassetteSpoolWheel
          size={32}
          isSpinning={isPlaying && isSelected}
          rotationAngle={isPlaying && isSelected ? spoolRotation : 0}
          holeColor="#020617"
        />
      </div>
    </div>

    <!-- Bottom Head-Reader Notch & 2 Bottom Corner Screws -->
    <div class="card-head-row">
      <div class="screw"><div class="screw-slot deg-12"></div></div>
      <div class="card-center-notch">
        <div class="notch-pin"></div>
        <div class="notch-pin"></div>
      </div>
      <div class="screw"><div class="screw-slot deg-neg12"></div></div>
    </div>
  </div>

  <!-- Note Card Meta Below Cassette -->
  <div class="card-meta-block">
    <div class="meta-title-row">
      <span class="meta-genre">{station.genre}</span>
      {#if isSelected && isPlaying}
        <span class="status-badge playing">
          <span class="status-dot"></span>
          PLAYING
        </span>
      {:else if isSelected}
        <span class="status-badge loaded">
          LOADED
        </span>
      {/if}
    </div>
    <p class="meta-desc">
      {station.description}
    </p>
  </div>
</button>

<style>
  .tape-card-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    border-radius: 14px;
    border: 1px solid var(--kanso-border);
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    box-sizing: border-box;
    font-family: inherit;
    position: relative;
    user-select: none;
    outline: none;
  }

  .tape-card-btn:hover {
    transform: translateY(-2px);
    background: var(--kanso-surface-hover) !important;
  }

  .tape-card-btn.selected {
    box-shadow: 0 0 0 1px var(--kanso-accent), 0 4px 12px rgba(222, 105, 75, 0.15);
  }

  /* Physical Cassette Chassis */
  .card-tape-shell {
    width: 100%;
    height: 154px;
    border-radius: 10px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
    box-sizing: border-box;
  }

  /* Slotted Silver Screws */
  .screw {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #D4D4D8;
    border: 1px solid rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    position: relative;
    flex-shrink: 0;
  }

  .screw.top-left {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 5;
  }

  .screw.top-right {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 5;
  }

  .screw-slot {
    width: 5px;
    height: 1px;
    background: #52525B;
  }

  .deg-45 { transform: rotate(45deg); }
  .deg-neg45 { transform: rotate(-45deg); }
  .deg-12 { transform: rotate(12deg); }
  .deg-neg12 { transform: rotate(-12deg); }

  /* Paper Sticker Label */
  .card-sticker-label {
    width: 100%;
    border-radius: 5px;
    padding: 5px 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    z-index: 2;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-sizing: border-box;
    gap: 6px;
  }

  .label-left-group {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
  }

  .label-side-badge {
    padding: 1px 5px;
    font-size: 10px;
    font-weight: 900;
    border-radius: 3px;
    color: #FFFFFF;
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }

  .label-station-name {
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #151813;
  }

  .label-freq-badge {
    font-size: 11px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid;
    flex-shrink: 0;
  }

  /* Tape Window */
  .card-tape-window {
    width: 100%;
    height: 58px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    margin: auto 0;
    overflow: hidden;
    box-sizing: border-box;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.6);
  }

  .card-ribbon-strip {
    position: absolute;
    left: 28px;
    right: 28px;
    height: 28px;
    background: #2E1810;
    border-radius: 3px;
    border: 1px solid rgba(120, 53, 15, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-gauge-box {
    width: 36px;
    height: 14px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 3px;
  }

  .gauge-mark {
    width: 1px;
    height: 8px;
    background: rgba(255, 255, 255, 0.4);
  }

  .gauge-mark.sm {
    height: 5px;
    background: rgba(255, 255, 255, 0.25);
  }

  .gauge-mark.center {
    height: 9px;
    background: #DE694B;
  }

  .spool-slot {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Bottom Notch */
  .card-head-row {
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 0 4px;
    box-sizing: border-box;
  }

  .card-center-notch {
    width: 90px;
    height: 8px;
    background: rgba(0, 0, 0, 0.45);
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    border-left: 1px solid rgba(255, 255, 255, 0.15);
    border-right: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .notch-pin {
    width: 4px;
    height: 3px;
    background: rgba(253, 230, 138, 0.5);
    border-radius: 1px;
  }

  /* Card Meta Information */
  .card-meta-block {
    width: 100%;
    margin-top: 10px;
    padding: 0 2px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-sizing: border-box;
  }

  .meta-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .meta-genre {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .status-badge {
    font-size: 11px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .status-badge.playing {
    background: rgba(143, 166, 131, 0.18);
    color: #8FA683;
    border: 1px solid rgba(143, 166, 131, 0.35);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #8FA683;
    animation: status-pulse 1.5s ease-in-out infinite;
  }

  @keyframes status-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }

  .status-badge.loaded {
    background: rgba(222, 105, 75, 0.12);
    color: var(--kanso-accent);
    border: 1px solid rgba(222, 105, 75, 0.3);
  }

  .meta-desc {
    font-size: 12px;
    line-height: 1.5;
    color: var(--kanso-text-muted);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
