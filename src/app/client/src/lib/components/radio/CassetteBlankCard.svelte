<script lang="ts">
  import CassetteSpoolWheel from './CassetteSpoolWheel.svelte';

  interface Props {
    onclick?: () => void;
  }

  let { onclick }: Props = $props();
</script>

<button
  type="button"
  class="tape-card-btn blank-tape-card"
  {onclick}
  aria-label="Insert Blank Cassette C-90 · Record New Radio Station"
  title="Click to Record New Radio Stream into Cassette Rack"
>
  <!-- Physical Blank Cassette Chassis Shell -->
  <div class="card-tape-shell blank-shell">
    <!-- Top 2 Silver Corner Screws -->
    <div class="screw top-left"><div class="screw-slot deg-45"></div></div>
    <div class="screw top-right"><div class="screw-slot deg-neg45"></div></div>

    <!-- Top Paper Sticker Label -->
    <div class="card-sticker-label blank-label">
      <div class="label-left-group">
        <span class="blank-rec-dot">⏺</span>
        <span class="label-station-name">BLANK C-90</span>
      </div>
      <span class="blank-tag">UNRECORDED</span>
    </div>

    <!-- Center Acrylic Tape Window & Spools -->
    <div class="card-tape-window blank-window">
      <!-- Magnetic Brown Tape Ribbon Strip with Gauge -->
      <div class="card-ribbon-strip blank-ribbon">
        <div class="card-gauge-box">
          <div class="gauge-mark"></div>
          <div class="gauge-mark sm"></div>
          <div class="gauge-mark center rec-mark"></div>
          <div class="gauge-mark sm"></div>
          <div class="gauge-mark"></div>
        </div>
      </div>

      <!-- Supply Spool (Full Left Reel 48px) -->
      <div class="spool-slot">
        <div class="card-tape-disc blank-disc-full"></div>
        <CassetteSpoolWheel
          size={32}
          isSpinning={false}
          rotationAngle={0}
          holeColor="#020617"
        />
      </div>

      <!-- Take-Up Spool (Empty Right Reel 36px) -->
      <div class="spool-slot">
        <div class="card-tape-disc blank-disc-empty"></div>
        <CassetteSpoolWheel
          size={32}
          isSpinning={false}
          rotationAngle={0}
          holeColor="#020617"
        />
      </div>
    </div>

    <!-- Bottom Head-Reader Notch & 2 Screws -->
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
      <span class="meta-genre">+ RECORD NEW STATION</span>
      <span class="blank-rec-badge">C-90 REC</span>
    </div>
    <p class="meta-desc">
      Insert blank cassette to tune and record any custom web radio or ICY/Icecast audio stream.
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
    border: 1px dashed var(--kanso-border);
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    box-sizing: border-box;
    font-family: inherit;
    position: relative;
    user-select: none;
    outline: none;
    background: transparent;
  }

  .tape-card-btn:hover {
    transform: translateY(-2px);
    border-color: var(--kanso-accent);
    background: var(--kanso-surface-hover);
    box-shadow: 0 4px 16px rgba(222, 105, 75, 0.15);
  }

  .tape-card-btn:hover .meta-genre {
    color: var(--kanso-accent);
  }

  .tape-card-btn:hover .blank-rec-badge {
    background: var(--kanso-accent);
    color: #FFFFFF;
    border-color: var(--kanso-accent);
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
    background: #18181B;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
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
    background: #27272A;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    z-index: 2;
    border: 1px solid rgba(255, 255, 255, 0.1);
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

  .label-station-name {
    font-size: 11.5px;
    font-weight: 700;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--kanso-text-primary);
    font-family: var(--font-mono, monospace);
    letter-spacing: 0.05em;
  }

  .blank-rec-dot {
    color: #E5383B;
    font-size: 10px;
    animation: rec-pulse 1.8s infinite ease-in-out;
  }

  @keyframes rec-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.3; transform: scale(0.85); }
  }

  .blank-tag {
    font-size: 9px;
    font-family: var(--font-mono, monospace);
    font-weight: 800;
    color: var(--kanso-text-muted);
    letter-spacing: 0.05em;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  /* Tape Acrylic Window */
  .card-tape-window {
    width: 100%;
    height: 58px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.88);
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
    background: #1C1917;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.08);
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

  .gauge-mark.center.rec-mark {
    height: 9px;
    background: #E5383B;
  }

  .spool-slot {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    flex-shrink: 0;
  }

  .card-tape-disc {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, transparent 15px, #2A2A2E 16%, #18181B 88%, #09090B 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    pointer-events: none;
    z-index: 1;
  }

  .blank-disc-full {
    width: 48px;
    height: 48px;
    opacity: 0.65;
  }

  .blank-disc-empty {
    width: 36px;
    height: 36px;
    opacity: 0.35;
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
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    transition: color 0.15s ease;
  }

  .blank-rec-badge {
    font-size: 10px;
    font-family: var(--font-mono, monospace);
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 3px;
    background: rgba(222, 105, 75, 0.15);
    color: var(--kanso-accent);
    border: 1px solid rgba(222, 105, 75, 0.3);
    transition: all 0.15s ease;
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

  /* E-Ink Monochrome Overrides */
  :global([data-theme="eink"]) .tape-card-btn {
    border-style: dashed;
    border-color: #000000;
    background: #FFFFFF;
  }

  :global([data-theme="eink"]) .tape-card-btn:hover {
    background: #F4F4F5;
    border-color: #000000;
  }

  :global([data-theme="eink"]) .tape-card-btn:hover .meta-genre {
    color: #000000;
  }

  :global([data-theme="eink"]) .tape-card-btn:hover .blank-rec-badge {
    background: #000000;
    color: #FFFFFF;
    border-color: #000000;
  }

  :global([data-theme="eink"]) .card-tape-shell {
    background: #FFFFFF;
    border-color: #000000;
    box-shadow: none;
  }

  :global([data-theme="eink"]) .card-sticker-label {
    background: #FFFFFF;
    border-color: #000000;
  }

  :global([data-theme="eink"]) .label-station-name {
    color: #000000;
  }

  :global([data-theme="eink"]) .card-tape-window {
    background: #FFFFFF;
    border-color: #000000;
  }

  :global([data-theme="eink"]) .card-ribbon-strip {
    background: #FFFFFF;
    border-color: #000000;
  }

  :global([data-theme="eink"]) .card-gauge-box {
    background: #FFFFFF;
    border-color: #000000;
  }

  :global([data-theme="eink"]) .gauge-mark {
    background: #000000;
  }

  :global([data-theme="eink"]) .gauge-mark.center.rec-mark {
    background: #000000;
  }

  :global([data-theme="eink"]) .blank-rec-badge {
    background: #FFFFFF;
    color: #000000;
    border-color: #000000;
  }

  :global([data-theme="eink"]) .blank-tag {
    color: #000000;
    border-color: #000000;
    background: #FFFFFF;
  }
</style>
