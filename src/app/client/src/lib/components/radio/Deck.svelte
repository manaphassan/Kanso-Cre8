<script lang="ts">
  import { radioService, type RadioStation } from '$lib/services/radioService.svelte';
  import CassetteSpoolWheel from './CassetteSpoolWheel.svelte';
  import AnalogVuMeter from './AnalogVuMeter.svelte';
  import Timer from './Timer.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    station: RadioStation;
    onRewind: () => void;
    onFastForward: () => void;
    onToggleRack: () => void;
    isRackVisible: boolean;
  }

  let { station, onRewind, onFastForward, onToggleRack, isRackVisible }: Props = $props();

  const playbackState = $derived(radioService.state);

  // Mechanical Tape Counter
  let tapeCounter = $state(142);
  let counterInterval: any = null;

  $effect(() => {
    if (playbackState.isPlaying && !counterInterval) {
      counterInterval = setInterval(() => {
        tapeCounter = (tapeCounter + 1) % 10000;
      }, 1000);
    } else if (!playbackState.isPlaying && counterInterval) {
      clearInterval(counterInterval);
      counterInterval = null;
    }
  });

  const counterDigits = $derived.by(() => {
    return tapeCounter.toString().padStart(4, '0').split('');
  });

  function resetTapeCounter() {
    tapeCounter = 0;
  }

  const activeShellColor = $derived(station.shellColor || 'var(--kanso-surface)');
  const reelProgress = $derived(Math.min(1, Math.max(0, playbackState.progress || 0.35)));
  const leftTapeDiameter = $derived(50 + (1 - reelProgress) * 40);
  const rightTapeDiameter = $derived(50 + reelProgress * 40);
</script>

<div class="deck-main-card">
  <!-- Top Bar -->
  <div class="deck-top-bar">
    <div class="station-meta-left">
      <span class="lock-tag">TUNED</span>
      <span class="lock-freq font-mono">{station.frequency}</span>
      <span class="lock-name">— {station.name}</span>
    </div>

    <!-- Tape Counter & Track Title -->
    <div class="deck-top-right">
      <div class="track-title-ticker font-mono" title={playbackState.currentTrackTitle || station.featuredTrack}>
        <Icon name="music" size={12} />
        <span>{playbackState.currentTrackTitle || station.featuredTrack}</span>
      </div>

      <div class="tape-counter-box" title="Mechanical Tape Index Counter">
        <span class="counter-tag">INDEX</span>
        <div class="counter-digits">
          {#each counterDigits as digit}
            <span class="counter-digit font-mono">{digit}</span>
          {/each}
        </div>
        <button type="button" class="counter-reset-btn" onclick={resetTapeCounter} title="Reset Index Counter">↺</button>
      </div>
    </div>
  </div>

  <!-- Main Bay & Wings -->
  <div class="deck-body-layout">
    <!-- Left Wing: VU Meter & Pomodoro Timer -->
    <div class="deck-wing-left">
      <AnalogVuMeter isPlaying={playbackState.isPlaying} volume={playbackState.volume} />
      <Timer />
    </div>

    <!-- Center Stage: Mechanical Cassette Bay -->
    <div class="cassette-center-stage">
      <div
        class="chassis"
        style="background: {activeShellColor}; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);"
      >
        <!-- 4 Corner Silver Screws -->
        <div class="screw top-left"><div class="screw-slot deg-45"></div></div>
        <div class="screw top-right"><div class="screw-slot deg-neg45"></div></div>
        <div class="screw bottom-left"><div class="screw-slot deg-12"></div></div>
        <div class="screw bottom-right"><div class="screw-slot deg-neg12"></div></div>

        <!-- Paper Sticker Label -->
        <div class="sticker-label" style="background: {station.labelColor || '#F7F5F0'}; color: #151813;">
          <div class="sticker-left">
            <span class="sticker-side font-mono">SIDE {playbackState.tapeSide}</span>
            <div class="sticker-meta-wrap">
              <span class="sticker-name">{station.name}</span>
              <span class="sticker-genre">{station.genre}</span>
            </div>
          </div>
          <div class="sticker-right">
            <span class="sticker-freq font-mono">{station.frequency}</span>
          </div>
        </div>

        <!-- Acrylic Window with Dual Spool Wheels at 33 RPM -->
        <div class="acrylic-window">
          <div class="tape-ribbon" class:is-moving={playbackState.isPlaying}>
            <div class="ribbon-travel-layer" class:is-moving={playbackState.isPlaying}></div>
          </div>

          <!-- Left Spool -->
          <div class="spool-slot">
            <div class="deck-spindle-well"></div>
            <div
              class="tape-roll-disc"
              class:is-spinning={playbackState.isPlaying}
              style="width: {leftTapeDiameter}px; height: {leftTapeDiameter}px; transform: rotate({playbackState.isPlaying ? playbackState.spoolRotation : 0}deg);"
            ></div>
            <CassetteSpoolWheel size={56} isSpinning={playbackState.isPlaying} rotationAngle={playbackState.isPlaying ? playbackState.spoolRotation : 0} showSpindle={true} />
          </div>

          <!-- Tape Migration Progress Bar -->
          <div class="reel-migration-meter">
            <div class="migration-bar-fill" style="width: {reelProgress * 100}%;"></div>
          </div>

          <!-- Right Spool -->
          <div class="spool-slot">
            <div class="deck-spindle-well"></div>
            <div
              class="tape-roll-disc"
              class:is-spinning={playbackState.isPlaying}
              style="width: {rightTapeDiameter}px; height: {rightTapeDiameter}px; transform: rotate({playbackState.isPlaying ? playbackState.spoolRotation : 0}deg);"
            ></div>
            <CassetteSpoolWheel size={56} isSpinning={playbackState.isPlaying} rotationAngle={playbackState.isPlaying ? playbackState.spoolRotation : 0} showSpindle={true} />
          </div>
        </div>

        <!-- Bottom Reader Trapezoid -->
        <div class="head-row">
          <div class="head-notch">
            <div class="roller-dot" class:is-spinning={playbackState.isPlaying} style="transform: rotate({playbackState.isPlaying ? playbackState.spoolRotation * 2 : 0}deg);"></div>
            <div class="roller-center"><div class="head-core-line"></div></div>
            <div class="roller-dot" class:is-spinning={playbackState.isPlaying} style="transform: rotate({playbackState.isPlaying ? playbackState.spoolRotation * 2 : 0}deg);"></div>
          </div>
        </div>
      </div>

      <!-- Piano-Key Transport Controls -->
      <div class="piano-transport-bar">
        <button type="button" class="piano-key" onclick={onRewind} title="Previous Station (REW)">
          <span>⏪ REW</span>
        </button>
        <button type="button" class="piano-key key-play" class:is-active={playbackState.isPlaying} onclick={() => radioService.toggle()} title="Play / Pause">
          <span>{playbackState.isPlaying ? '⏸ PAUSE' : '▶ PLAY'}</span>
        </button>
        <button type="button" class="piano-key" onclick={() => radioService.stop()} title="Stop Deck">
          <span>⏹ STOP</span>
        </button>
        <button type="button" class="piano-key" onclick={onFastForward} title="Next Station (FF)">
          <span>⏩ FF</span>
        </button>
        <button type="button" class="piano-key" onclick={() => radioService.flipSide()} title="Flip Side A/B">
          <span>⮂ SIDE {playbackState.tapeSide}</span>
        </button>
        <button type="button" class="piano-key" onclick={onToggleRack} title="Toggle Cassette Rack">
          <span>{isRackVisible ? '▲ HIDE RACK' : '▼ SHOW RACK'}</span>
        </button>
      </div>

      <!-- Volume Bar -->
      <div class="master-volume-bar">
        <button type="button" class="vol-icon-btn" onclick={() => radioService.toggleMute()}>
          <Icon name={playbackState.isMuted || playbackState.volume === 0 ? 'volumeMute' : 'volume'} size={14} />
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={playbackState.volume}
          oninput={(e) => radioService.setVolume(parseFloat(e.currentTarget.value))}
          class="master-vol-slider"
        />
        <span class="vol-num font-mono">{Math.round(playbackState.volume * 100)}%</span>
      </div>
    </div>
  </div>
</div>

<style>
  .deck-main-card { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; }
  .deck-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--kanso-border); }
  .station-meta-left { display: flex; align-items: center; gap: 8px; }
  .lock-tag { font-size: 10px; font-weight: 700; color: var(--kanso-success); background: var(--kanso-canvas); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--kanso-border); }
  .lock-freq { font-size: 13px; font-weight: 700; color: var(--kanso-accent); }
  .lock-name { font-size: 13px; font-weight: 600; color: var(--kanso-text-primary); }
  .deck-top-right { display: flex; align-items: center; gap: 16px; }
  .track-title-ticker { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--kanso-text-muted); max-width: 280px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .tape-counter-box { display: flex; align-items: center; gap: 4px; padding: 2px 8px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 4px; }
  .counter-tag { font-size: 9px; font-weight: 700; color: var(--kanso-text-muted); }
  .counter-digits { display: flex; gap: 1px; }
  .counter-digit { font-size: 12px; font-weight: 700; color: var(--kanso-text-primary); }
  .counter-reset-btn { background: none; border: none; font-size: 10px; color: var(--kanso-text-muted); cursor: pointer; }
  .deck-body-layout { display: grid; grid-template-columns: 240px 1fr; gap: 24px; align-items: center; }
  @media (max-width: 860px) { .deck-body-layout { grid-template-columns: 1fr; } }
  .deck-wing-left { display: flex; flex-direction: column; gap: 16px; }
  .cassette-center-stage { display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .chassis { width: 100%; max-width: 520px; border-radius: 12px; border: 1px solid var(--kanso-border); padding: 16px; position: relative; display: flex; flex-direction: column; gap: 12px; }
  .screw { position: absolute; width: 10px; height: 10px; border-radius: 50%; background: #C0C0C0; box-shadow: inset 1px 1px 2px #FFFFFF, inset -1px -1px 2px #555555; }
  .screw-slot { width: 6px; height: 1.5px; background: #333333; position: absolute; top: 4px; left: 2px; }
  .screw.top-left { top: 8px; left: 8px; }
  .screw.top-right { top: 8px; right: 8px; }
  .screw.bottom-left { bottom: 8px; left: 8px; }
  .screw.bottom-right { bottom: 8px; right: 8px; }
  .sticker-label { border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; }
  .sticker-left { display: flex; align-items: center; gap: 8px; }
  .sticker-side { font-size: 10px; font-weight: 700; padding: 2px 6px; background: #333333; color: #FFFFFF; border-radius: 3px; }
  .sticker-meta-wrap { display: flex; flex-direction: column; }
  .sticker-name { font-size: 13px; font-weight: 700; color: #151813; }
  .sticker-genre { font-size: 11px; color: #444444; }
  .sticker-freq { font-size: 12px; font-weight: 700; color: var(--kanso-accent); }
  .acrylic-window { height: 100px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; padding: 0 40px; position: relative; overflow: hidden; }
  .spool-slot { position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; }
  .reel-migration-meter { width: 80px; height: 4px; background: rgba(0,0,0,0.5); border-radius: 2px; overflow: hidden; }
  .migration-bar-fill { height: 100%; background: var(--kanso-accent); }
  .head-row { display: flex; justify-content: center; margin-top: 4px; }
  .head-notch { width: 140px; height: 24px; background: #18181B; border-radius: 4px 4px 0 0; display: flex; justify-content: space-around; align-items: center; padding: 0 10px; }
  .roller-dot { width: 12px; height: 12px; border-radius: 50%; background: #444444; }
  .roller-center { width: 24px; height: 14px; background: #888888; border-radius: 2px; }
  .piano-transport-bar { display: flex; gap: 6px; width: 100%; max-width: 520px; }
  .piano-key { flex: 1; height: 38px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; color: var(--kanso-text-primary); font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; }
  .piano-key:hover { background: var(--kanso-surface-hover); }
  .piano-key.key-play.is-active { background: var(--kanso-accent); color: #FFFFFF; border-color: var(--kanso-accent); }
  .master-volume-bar { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 520px; }
  .vol-icon-btn { background: none; border: none; color: var(--kanso-text-muted); cursor: pointer; display: flex; }
  .master-vol-slider { flex: 1; height: 4px; border-radius: 2px; accent-color: var(--kanso-accent); }
  .vol-num { font-size: 11px; color: var(--kanso-text-muted); width: 34px; text-align: right; }
</style>
