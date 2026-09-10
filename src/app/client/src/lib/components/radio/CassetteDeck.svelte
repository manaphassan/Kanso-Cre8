<script lang="ts">
  import { radioService, ALL_CASSETTE_STATIONS } from '$lib/services/radioService.svelte';
  import { ambientAudioService } from '$lib/services/ambientAudioService.svelte';
  import AnalogVuMeter from './AnalogVuMeter.svelte';
  import CassetteSpoolWheel from './CassetteSpoolWheel.svelte';
  import CassetteTapeCard from './CassetteTapeCard.svelte';

  const station = $derived(radioService.currentStation);
  const state = $derived(radioService.state);
  const reelProgress = $derived(radioService.reelProgress);

  // Dynamic reel diameters based on listening session progress (winding from left to right)
  const leftTapeDiameter = $derived(Math.round(56 + (1.0 - reelProgress) * 32));
  const rightTapeDiameter = $derived(Math.round(56 + reelProgress * 32));

  // Focus Timer state (25min Pomodoro)
  let pomodoroSeconds = $state(25 * 60);
  let isTimerRunning = $state(false);
  let timerInterval: any = null;

  function playPomodoroChime() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(264, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // Audio context restricted or unavailable
    }
  }

  function playMechanicalClick() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  function toggleTimer() {
    playMechanicalClick();
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
    } else {
      isTimerRunning = true;
      timerInterval = setInterval(() => {
        if (pomodoroSeconds > 0) {
          pomodoroSeconds--;
          if (pomodoroSeconds === 0) {
            clearInterval(timerInterval);
            isTimerRunning = false;
            playPomodoroChime();
          }
        } else {
          clearInterval(timerInterval);
          isTimerRunning = false;
        }
      }, 1000);
    }
  }

  function resetTimer() {
    playMechanicalClick();
    clearInterval(timerInterval);
    isTimerRunning = false;
    pomodoroSeconds = 25 * 60;
  }

  function handleFlipSide() {
    playMechanicalClick();
    radioService.flipTapeSide();
  }

  const timerFormatted = $derived.by(() => {
    const mins = Math.floor(pomodoroSeconds / 60).toString().padStart(2, '0');
    const secs = (pomodoroSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  });

  // Mechanical 4-Digit Tape Counter
  let tapeCounter = $state(142);
  let counterInterval: any = null;

  $effect(() => {
    if (state.isPlaying) {
      counterInterval = setInterval(() => {
        tapeCounter = (tapeCounter + 1) % 10000;
      }, 1000);
    } else {
      if (counterInterval) clearInterval(counterInterval);
    }
    return () => {
      if (counterInterval) clearInterval(counterInterval);
    };
  });

  const counterDigits = $derived.by(() => {
    return String(tapeCounter).padStart(4, '0').split('');
  });

  function resetTapeCounter() {
    playMechanicalClick();
    tapeCounter = 0;
  }
</script>

<div class="deck-wrapper">
  <!-- ════ MAIN MECHANICAL CASSETTE DECK CONSOLE ════ -->
  <div class="deck-main-card">
    <!-- Top Deck Header: Power, Tuner & Dual Analog VU Meters -->
    <div class="deck-top-bar">
      <!-- Left: Vintage Power LED & Station Tuner -->
      <div class="top-bar-left">
        <div class="power-indicator">
          <span
            class="power-led"
            style="
              background: {state.isPlaying ? '#8FA683' : '#71717A'};
              box-shadow: {state.isPlaying ? '0 0 10px rgba(143, 166, 131, 0.7)' : 'none'};
            "
          ></span>
          <span class="power-label">
            {state.isPlaying ? 'HI-FI 33 RPM MOTOR ACTIVE' : 'MOTOR IDLE // STANDBY'}
          </span>
        </div>

        <div class="tuner-box">
          <span class="tuner-tag">TUNER</span>
          <span class="tuner-freq">{station.frequency}</span>
          <span class="tuner-genre">{station.genre}</span>
        </div>

        <!-- Mechanical Tape Counter -->
        <div class="tape-counter-box" title="Mechanical Tape Index Counter">
          <span class="counter-tag">INDEX</span>
          <div class="counter-digits">
            {#each counterDigits as digit}
              <span class="counter-digit">{digit}</span>
            {/each}
          </div>
          <button type="button" class="counter-reset-btn" onclick={resetTapeCounter} title="Reset Index Counter">↺</button>
        </div>

        <div class="marquee-box">
          <span class="tape-disc-icon">♫</span>
          <span class="track-title-text" title={state.currentTrackTitle}>
            {state.currentTrackTitle}
          </span>
        </div>
      </div>

      <!-- Right: Dual Backlit Analog Needle VU Meters -->
      <div class="top-bar-right">
        <AnalogVuMeter isPlaying={state.isPlaying} volume={state.volume} />
      </div>
    </div>

    <!-- Center Deck Chamber: Loaded Tape & Controls -->
    <div class="deck-main-grid">
      <!-- Left: Loaded Cassette Bay Slot -->
      <div class="cassette-bay">
        <div
          class="chassis"
          style="
            background: {station.shellColor};
            border-color: rgba(255, 255, 255, 0.18);
          "
        >
          <!-- 4 Slotted Silver Screws -->
          <div class="screw top-left"><div class="screw-slot deg-45"></div></div>
          <div class="screw top-right"><div class="screw-slot deg-neg45"></div></div>

          <!-- Paper Sticker Label Header -->
          <div
            class="sticker-label"
            style="background: {station.labelColor}; color: #151813;"
          >
            <div class="sticker-left">
              <button
                type="button"
                class="sticker-side"
                style="background: {station.shellColor};"
                onclick={handleFlipSide}
                title="Click to Flip to Side {state.tapeSide === 'A' ? 'B' : 'A'}"
              >
                SIDE {state.tapeSide} ⮂
              </button>
              <span class="sticker-name">{station.name}</span>
            </div>
            <span class="sticker-freq" style="color: {station.accentColor};">
              {station.frequency}
            </span>
          </div>

          <!-- Giant Acrylic Tape Window with Dynamic Reel Tape Thickness & Moving Magnetic Ribbon -->
          <div class="acrylic-window">
            <!-- Magnetic Brown Tape Ribbon Strip with Animated Travel Layer -->
            <div class="tape-ribbon" class:is-moving={state.isPlaying}>
              <div class="ribbon-travel-layer" class:is-moving={state.isPlaying}></div>
              <div class="ribbon-glare-layer"></div>
              <div class="tape-gauge">
                <div class="gauge-mark"></div>
                <div class="gauge-mark sm"></div>
                <div class="gauge-mark center"></div>
                <div class="gauge-mark sm"></div>
                <div class="gauge-mark"></div>
              </div>
            </div>

            <!-- Left Spool Wheel with Mechanical Drive Spindle & Tape Roll -->
            <div class="spool-slot">
              <div class="deck-spindle-well" title="Supply Reel Drive Motor Spindle Well"></div>
              <div
                class="tape-roll-disc"
                class:is-spinning={state.isPlaying}
                style="width: {leftTapeDiameter}px; height: {leftTapeDiameter}px; transform: rotate({state.isPlaying ? state.spoolRotation : 0}deg);"
                title="Supply Reel ({Math.round((1 - reelProgress) * 100)}% remaining)"
              >
                <div class="tape-pack-layers"></div>
              </div>
              <CassetteSpoolWheel size={48} isSpinning={state.isPlaying} rotationAngle={state.isPlaying ? state.spoolRotation : 0} showSpindle={true} />
            </div>

            <!-- Center Reel Tape Migration Meter -->
            <div class="reel-migration-meter" title="Tape Migration ({Math.round(reelProgress * 100)}% wound)">
              <div class="migration-bar-fill" style="width: {reelProgress * 100}%;"></div>
            </div>

            <!-- Right Spool Wheel with Mechanical Drive Spindle & Tape Roll -->
            <div class="spool-slot">
              <div class="deck-spindle-well" title="Take-Up Reel Drive Motor Spindle Well"></div>
              <div
                class="tape-roll-disc"
                class:is-spinning={state.isPlaying}
                style="width: {rightTapeDiameter}px; height: {rightTapeDiameter}px; transform: rotate({state.isPlaying ? state.spoolRotation : 0}deg);"
                title="Take-Up Reel ({Math.round(reelProgress * 100)}% wound)"
              >
                <div class="tape-pack-layers"></div>
              </div>
              <CassetteSpoolWheel size={48} isSpinning={state.isPlaying} rotationAngle={state.isPlaying ? state.spoolRotation : 0} showSpindle={true} />
            </div>
          </div>

          <!-- Bottom Reader Trapezoid, Moving Ribbon Track, Capstan Spindles & Bottom Screws -->
          <div class="head-row">
            <div class="screw"><div class="screw-slot deg-12"></div></div>
            <div class="head-notch">
              <div class="bottom-tape-track" class:is-moving={state.isPlaying}></div>

              <!-- Left Capstan Spindle & Pinch Roller Unit -->
              <div class="spindle-roller-unit" title="Left Capstan Spindle & Rubber Pinch Roller">
                <div class="capstan-spindle" title="Polished Steel Capstan Spindle">
                  <div class="capstan-core"></div>
                </div>
                <div class="roller-dot" class:is-spinning={state.isPlaying} style="transform: rotate({state.isPlaying ? state.spoolRotation * 2 : 0}deg);">
                  <div class="roller-notch"></div>
                </div>
              </div>

              <!-- Magnetic Permalloy Tape Head -->
              <div class="roller-center" title="Permalloy Magnetic Tape Head">
                <div class="head-core-line"></div>
              </div>

              <!-- Right Capstan Spindle & Pinch Roller Unit -->
              <div class="spindle-roller-unit" title="Right Capstan Spindle & Rubber Pinch Roller">
                <div class="roller-dot" class:is-spinning={state.isPlaying} style="transform: rotate({state.isPlaying ? state.spoolRotation * 2 : 0}deg);">
                  <div class="roller-notch"></div>
                </div>
                <div class="capstan-spindle" title="Polished Steel Capstan Spindle">
                  <div class="capstan-core"></div>
                </div>
              </div>
            </div>
            <div class="screw"><div class="screw-slot deg-neg12"></div></div>
          </div>

          <!-- High Bias Subtitle + Quick Flip -->
          <div class="tape-bias-text">
            <span>● HIGH BIAS 70µs JAPAN</span>
            <button
              type="button"
              class="quick-flip-link"
              onclick={handleFlipSide}
              title="Flip Cassette to Side {state.tapeSide === 'A' ? 'B' : 'A'}"
            >
              FLIP TO SIDE {state.tapeSide === 'A' ? 'B' : 'A'} ⮂
            </button>
            <span>TYPE II CrO2 ●</span>
          </div>
        </div>
      </div>

      <!-- Right: Transport Controls, Atelier Acoustics & Pomodoro -->
      <div class="controls-column">
        <!-- 1. Transport Deck Controls -->
        <div class="transport-panel">
          <span class="panel-title">Transport Deck</span>
          <div class="transport-buttons">
            <button
              type="button"
              class="arrow-btn"
              onclick={() => radioService.prev()}
              aria-label="Previous Tape"
              title="Previous Tape"
            >
              <svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <!-- Play / Pause Button -->
            <button
              type="button"
              class="play-pause-btn"
              style="
                background: {state.isPlaying ? 'var(--kanso-accent)' : 'var(--kanso-surface)'};
                border: {state.isPlaying ? 'none' : '1px solid var(--kanso-accent)'};
                color: {state.isPlaying ? '#FFFFFF' : 'var(--kanso-accent)'};
              "
              onclick={() => radioService.toggle()}
              aria-label={state.isPlaying ? 'Pause Audio' : 'Play Audio'}
            >
              {#if state.isPlaying}
                <svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                <span>PAUSE MOTOR</span>
              {:else}
                <svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span>ENGAGE DECK</span>
              {/if}
            </button>

            <button
              type="button"
              class="arrow-btn"
              onclick={() => radioService.next()}
              aria-label="Next Tape"
              title="Next Tape"
            >
              <svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          <!-- Volume Fader -->
          <div class="volume-control">
            <button
              type="button"
              class="mute-icon-btn"
              onclick={() => radioService.toggleMute()}
              aria-label="Mute / Unmute"
              title={state.isMuted ? 'Unmute' : 'Mute'}
            >
              {#if state.isMuted || state.volume === 0}
                <svg class="mute-svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              {:else}
                <svg class="mute-svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              {/if}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.volume}
              oninput={(e) => radioService.setVolume(parseFloat(e.currentTarget.value))}
              class="vol-slider"
              aria-label="Radio Volume Slider"
            />
            <span class="vol-text">
              {Math.round(state.volume * 100)}%
            </span>
          </div>
        </div>

        <!-- 2. Interactive Atelier Acoustics Studio (Vinyl Crackle & 40Hz Gamma) -->
        <div class="acoustics-panel">
          <div class="acoustics-header">
            <span class="panel-title">Atelier Acoustics</span>
            <span class="acoustics-badge">WEB AUDIO API</span>
          </div>

          <div class="acoustics-grid">
            <!-- Vinyl Crackle & Surface Friction -->
            <div class="acoustics-item">
              <div class="item-head">
                <button
                  type="button"
                  class="acoustic-toggle-btn"
                  class:active={ambientAudioService.isCrackleActive}
                  onclick={() => ambientAudioService.toggleCrackle()}
                >
                  <span class="toggle-dot"></span>
                  <span>VINYL CRACKLE</span>
                </button>
                <span class="acoustic-vol-text">
                  {ambientAudioService.isCrackleActive ? `${Math.round(ambientAudioService.crackleVolume * 100)}%` : 'OFF'}
                </span>
              </div>
              {#if ambientAudioService.isCrackleActive}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientAudioService.crackleVolume}
                  oninput={(e) => ambientAudioService.setCrackleVolume(parseFloat(e.currentTarget.value))}
                  class="acoustic-slider"
                  aria-label="Vinyl Crackle Volume"
                />
              {/if}
            </div>

            <!-- 40Hz Gamma Cognitive Wave -->
            <div class="acoustics-item">
              <div class="item-head">
                <button
                  type="button"
                  class="acoustic-toggle-btn gamma"
                  class:active={ambientAudioService.isGammaActive}
                  onclick={() => ambientAudioService.toggleGamma()}
                >
                  <span class="toggle-dot gamma-dot"></span>
                  <span>40Hz GAMMA FOCUS</span>
                </button>
                <span class="acoustic-vol-text">
                  {ambientAudioService.isGammaActive ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
              {#if ambientAudioService.isGammaActive}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientAudioService.gammaVolume}
                  oninput={(e) => ambientAudioService.setGammaVolume(parseFloat(e.currentTarget.value))}
                  class="acoustic-slider"
                  aria-label="40Hz Gamma Wave Volume"
                />
              {/if}
            </div>
          </div>
        </div>

        <!-- 3. Integrated Pomodoro Sprint Coach -->
        <div class="pomodoro-panel">
          <div class="pomo-meta">
            <span class="panel-title">Focus Sprint (25M)</span>
            <span class="timer-display">{timerFormatted}</span>
          </div>
          <div class="pomo-actions">
            <button
              type="button"
              class="pomo-btn"
              style="
                background: {isTimerRunning ? 'rgba(222, 105, 75, 0.15)' : 'rgba(222, 105, 75, 0.12)'};
                border: 1px solid var(--kanso-accent);
                color: var(--kanso-accent);
              "
              onclick={toggleTimer}
            >
              {isTimerRunning ? 'PAUSE' : 'START 25M'}
            </button>
            <button
              type="button"
              class="pomo-reset-btn"
              onclick={resetTimer}
              title="Reset Timer"
              aria-label="Reset Timer"
            >
              <svg class="reset-svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ════ CASSETTE RACK / TAPE CAROUSEL ════ -->
  <div class="rack-container">
    <div class="rack-header-row">
      <h2 class="rack-title">
        📼 Studio Cassette Rack ({ALL_CASSETTE_STATIONS.length} Tapes)
      </h2>
      <span class="rack-subtitle">Click any tape to load into deck</span>
    </div>

    <!-- Cassette Cards Grid / Rack -->
    <div class="rack-cards-grid">
      {#each ALL_CASSETTE_STATIONS as st}
        <CassetteTapeCard
          station={st}
          isSelected={st.id === state.currentStationId}
          isPlaying={state.isPlaying}
          spoolRotation={state.spoolRotation}
          onclick={() => radioService.toggle(st.id)}
        />
      {/each}
    </div>
  </div>
</div>

<style>
  .deck-wrapper {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    box-sizing: border-box;
  }

  /* Main Mechanical Deck Console Card */
  .deck-main-card {
    width: 100%;
    border-radius: 16px;
    padding: 24px;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    display: flex;
    flex-direction: column;
    gap: 24px;
    box-sizing: border-box;
  }

  /* Top Bar */
  .deck-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 18px;
    flex-wrap: wrap;
  }

  .top-bar-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    flex: 1;
    min-width: 320px;
  }

  .top-bar-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .power-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .power-led {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }

  .power-label {
    font-size: 11px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted);
  }

  /* Tuner Readout Box */
  .tuner-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    font-family: var(--font-mono, monospace);
  }

  .tuner-tag {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted);
  }

  .tuner-freq {
    font-size: 13.5px;
    font-weight: 800;
    color: var(--kanso-accent);
    letter-spacing: 0.05em;
  }

  .tuner-genre {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(222, 105, 75, 0.1);
    color: var(--kanso-accent);
    border: 1px solid rgba(222, 105, 75, 0.2);
  }

  /* Mechanical Index Tape Counter */
  .tape-counter-box {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  .counter-tag {
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--kanso-text-muted);
    font-family: var(--font-mono, monospace);
  }

  .counter-digits {
    display: flex;
    gap: 1.5px;
    background: #09090B;
    padding: 2px 4px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8);
  }

  .counter-digit {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 800;
    color: #FAFAFA;
    width: 10px;
    text-align: center;
    line-height: 1;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }

  .counter-digit:last-child {
    border-right: none;
    color: var(--kanso-accent);
  }

  .counter-reset-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
    line-height: 1;
  }

  .counter-reset-btn:hover {
    background: var(--kanso-accent);
    color: #FFFFFF;
    border-color: var(--kanso-accent);
    transform: rotate(90deg);
  }

  /* Marquee Box */
  .marquee-box {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 280px;
    padding: 5px 12px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    overflow: hidden;
  }

  .tape-disc-icon {
    font-size: 12px;
    color: var(--kanso-accent);
    flex-shrink: 0;
  }

  .track-title-text {
    font-size: 11.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 600;
    color: var(--kanso-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Center Deck Chamber Grid */
  .deck-main-grid {
    display: grid;
    grid-template-columns: 7fr 5fr;
    gap: 24px;
    align-items: stretch;
    width: 100%;
    box-sizing: border-box;
  }

  @media (max-width: 960px) {
    .deck-main-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Cassette Bay */
  .cassette-bay {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    border-radius: 14px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.08);
    width: 100%;
    box-sizing: border-box;
  }

  /* Physical Cassette Chassis */
  .chassis {
    width: 100%;
    max-width: 440px;
    height: 220px;
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    box-sizing: border-box;
  }

  /* Screws */
  .screw {
    width: 10px;
    height: 10px;
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

  .screw.top-left { position: absolute; top: 10px; left: 10px; z-index: 5; }
  .screw.top-right { position: absolute; top: 10px; right: 10px; z-index: 5; }

  .screw-slot {
    width: 6px;
    height: 1.5px;
    background: #52525B;
  }

  .deg-45 { transform: rotate(45deg); }
  .deg-neg45 { transform: rotate(-45deg); }
  .deg-12 { transform: rotate(12deg); }
  .deg-neg12 { transform: rotate(-12deg); }

  /* Sticker Label */
  .sticker-label {
    width: 100%;
    border-radius: 6px;
    padding: 7px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    z-index: 2;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-sizing: border-box;
  }

  .sticker-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
  }

  .sticker-side {
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 900;
    border-radius: 4px;
    color: #FFFFFF;
    letter-spacing: 0.05em;
    flex-shrink: 0;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .sticker-side:hover {
    opacity: 0.85;
  }

  .sticker-name {
    font-size: 14px;
    font-weight: 700;
    color: #151813;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sticker-freq {
    font-size: 13px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    flex-shrink: 0;
  }

  /* Tape Acrylic Window */
  .acrylic-window {
    width: 100%;
    height: 96px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 36px;
    margin: auto 0;
    box-sizing: border-box;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .tape-ribbon {
    position: absolute;
    left: 48px;
    right: 48px;
    height: 48px;
    background: linear-gradient(180deg, #1c0e08 0%, #2f170e 45%, #25120a 60%, #150a05 100%);
    border-radius: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    border-bottom: 1px solid rgba(0, 0, 0, 0.8);
    border-left: 1px solid rgba(120, 53, 15, 0.6);
    border-right: 1px solid rgba(120, 53, 15, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6), inset 0 -2px 4px rgba(0, 0, 0, 0.6);
  }

  .ribbon-travel-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.05) 0px,
      rgba(255, 255, 255, 0.05) 1.5px,
      transparent 1.5px,
      transparent 12px,
      rgba(0, 0, 0, 0.25) 12px,
      rgba(0, 0, 0, 0.25) 15px,
      transparent 15px,
      transparent 32px
    );
    background-size: 64px 100%;
    opacity: 0.6;
    transition: opacity 0.3s ease;
  }

  .ribbon-travel-layer.is-moving {
    opacity: 0.9;
    animation: tapeRibbonTravel 1.4s linear infinite;
  }

  .ribbon-glare-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(110deg, transparent 32%, rgba(255, 255, 255, 0.07) 48%, rgba(255, 255, 255, 0.02) 52%, transparent 68%);
    z-index: 1;
  }

  @keyframes tapeRibbonTravel {
    0% {
      background-position: 0px 0;
    }
    100% {
      background-position: 64px 0;
    }
  }

  .tape-gauge {
    position: relative;
    z-index: 2;
    width: 64px;
    height: 24px;
    background: rgba(0, 0, 0, 0.85);
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 6px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  }

  .gauge-mark {
    width: 1.5px;
    height: 12px;
    background: rgba(255, 255, 255, 0.4);
  }

  .gauge-mark.sm {
    height: 8px;
    background: rgba(255, 255, 255, 0.25);
  }

  .gauge-mark.center {
    height: 14px;
    background: #DE694B;
  }

  .spool-slot {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 90px;
    height: 90px;
    flex-shrink: 0;
  }

  .deck-spindle-well {
    position: absolute;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: radial-gradient(circle, #09090B 35%, #18181B 80%, #27272A 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.9);
    z-index: 0;
    pointer-events: none;
  }

  .tape-roll-disc {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, transparent 23px, #3D2218 24%, #23110a 65%, #100804 100%);
    border: 1px solid rgba(0, 0, 0, 0.6);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
    transition: width 0.3s ease, height 0.3s ease;
    pointer-events: none;
    z-index: 1;
    overflow: hidden;
  }

  .tape-pack-layers {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background-image: repeating-radial-gradient(
      circle,
      rgba(255, 255, 255, 0.04) 0px,
      rgba(255, 255, 255, 0.04) 1.5px,
      transparent 1.5px,
      transparent 4px
    );
    opacity: 0.8;
  }

  /* Center Mini Reel Migration Progress Track */
  .reel-migration-meter {
    position: absolute;
    bottom: 8px;
    left: 110px;
    right: 110px;
    height: 3px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    overflow: hidden;
    z-index: 4;
  }

  .migration-bar-fill {
    height: 100%;
    background: var(--kanso-accent);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  /* Head Row */
  .head-row {
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 2px 6px 0;
    box-sizing: border-box;
  }

  .head-notch {
    width: 140px;
    height: 15px;
    background: rgba(0, 0, 0, 0.65);
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    border-left: 1px solid rgba(255, 255, 255, 0.2);
    border-right: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    position: relative;
    overflow: hidden;
  }

  .bottom-tape-track {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: #1f0f08;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    pointer-events: none;
  }

  .bottom-tape-track.is-moving {
    background-image: repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.1) 0px,
      rgba(255, 255, 255, 0.1) 2px,
      transparent 2px,
      transparent 10px
    );
    background-size: 32px 100%;
    animation: tapeRibbonTravel 0.8s linear infinite;
  }

  .spindle-roller-unit {
    display: flex;
    align-items: center;
    gap: 3px;
    position: relative;
    z-index: 2;
  }

  .capstan-spindle {
    width: 3.5px;
    height: 10px;
    background: linear-gradient(90deg, #64748B 0%, #F8FAFC 40%, #E2E8F0 60%, #475569 100%);
    border-radius: 1px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.8), 0 0 2px rgba(255, 255, 255, 0.5);
    position: relative;
    flex-shrink: 0;
  }

  .capstan-core {
    position: absolute;
    top: 0;
    left: 1px;
    width: 1px;
    height: 100%;
    background: rgba(255, 255, 255, 0.9);
  }

  .roller-dot {
    width: 9px;
    height: 9px;
    background: radial-gradient(circle, #e2d9bc 35%, #8b7d5a 95%);
    border-radius: 50%;
    border: 1px solid rgba(254, 243, 199, 0.4);
    position: relative;
    z-index: 2;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  }

  .roller-notch {
    position: absolute;
    top: 1px;
    left: 3.5px;
    width: 1.5px;
    height: 3px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 1px;
  }

  .roller-center {
    width: 11px;
    height: 8px;
    background: #52525B;
    border-radius: 1px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  .head-core-line {
    width: 2px;
    height: 5px;
    background: #CA8A04;
    border-radius: 0.5px;
  }

  .tape-bias-text {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    font-size: 10.5px;
    color: rgba(255, 255, 255, 0.5);
    font-family: var(--font-mono, monospace);
    letter-spacing: 0.05em;
    margin-top: 2px;
  }

  .quick-flip-link {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 10.5px;
    font-family: var(--font-mono, monospace);
    cursor: pointer;
    transition: color 0.15s ease;
    padding: 0 4px;
  }

  .quick-flip-link:hover {
    color: var(--kanso-accent);
  }

  /* Right Controls Column */
  .controls-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
    justify-content: space-between;
    height: 100%;
    box-sizing: border-box;
  }

  .transport-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    box-sizing: border-box;
  }

  .panel-title {
    font-size: 11.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--kanso-text-muted);
  }

  .transport-buttons {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .arrow-btn {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    color: var(--kanso-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
    outline: none;
  }

  .arrow-btn:hover {
    background: var(--kanso-surface-hover);
  }

  .arrow-btn:active {
    transform: scale(0.95);
  }

  .icon-svg {
    width: 20px;
    height: 20px;
  }

  .play-pause-btn {
    flex: 1;
    height: 44px;
    border-radius: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    letter-spacing: 0.05em;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    outline: none;
  }

  .play-pause-btn:active {
    transform: scale(0.96);
  }

  /* Volume Row */
  .volume-control {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-top: 2px;
    width: 100%;
  }

  .mute-icon-btn {
    background: transparent;
    border: none;
    padding: 4px;
    color: var(--kanso-text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
    transition: color 0.15s;
  }

  .mute-icon-btn:hover {
    color: var(--kanso-text-primary);
  }

  .mute-svg {
    width: 16px;
    height: 16px;
  }

  .vol-slider {
    flex: 1;
    height: 5px;
    border-radius: 4px;
    background: var(--kanso-border);
    accent-color: var(--kanso-accent);
    cursor: pointer;
    outline: none;
  }

  .vol-text {
    font-size: 11px;
    font-family: var(--font-mono, monospace);
    font-weight: 600;
    color: var(--kanso-text-muted);
    width: 34px;
    text-align: right;
  }

  /* Atelier Acoustics Studio Panel */
  .acoustics-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    box-sizing: border-box;
  }

  .acoustics-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .acoustics-badge {
    font-size: 9.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 800;
    letter-spacing: 0.05em;
    padding: 1px 6px;
    border-radius: 3px;
    background: rgba(222, 105, 75, 0.1);
    color: var(--kanso-accent);
    border: 1px solid rgba(222, 105, 75, 0.2);
  }

  .acoustics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .acoustics-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .acoustic-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
  }

  .acoustic-toggle-btn:hover {
    color: var(--kanso-text-primary);
  }

  .acoustic-toggle-btn.active {
    background: rgba(222, 105, 75, 0.14);
    color: var(--kanso-accent);
    border-color: var(--kanso-accent);
  }

  .acoustic-toggle-btn.gamma.active {
    background: rgba(143, 166, 131, 0.18);
    color: #8FA683;
    border-color: #8FA683;
  }

  .toggle-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #71717A;
    transition: all 0.2s ease;
  }

  .acoustic-toggle-btn.active .toggle-dot {
    background: var(--kanso-accent);
    box-shadow: 0 0 6px var(--kanso-accent);
  }

  .acoustic-toggle-btn.gamma.active .gamma-dot {
    background: #8FA683;
    box-shadow: 0 0 6px #8FA683;
  }

  .acoustic-vol-text {
    font-size: 10px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    color: var(--kanso-text-muted);
  }

  .acoustic-slider {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: var(--kanso-border);
    accent-color: var(--kanso-accent);
    cursor: pointer;
    outline: none;
  }

  /* Pomodoro Panel */
  .pomodoro-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    box-sizing: border-box;
  }

  .pomo-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .timer-display {
    font-size: 24px;
    font-family: var(--font-mono, monospace);
    font-weight: 800;
    color: var(--kanso-text-primary);
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .pomo-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pomo-btn {
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 11.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
  }

  .pomo-btn:active {
    transform: scale(0.95);
  }

  .pomo-reset-btn {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    color: var(--kanso-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
  }

  .pomo-reset-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
  }

  .pomo-reset-btn:active {
    transform: scale(0.95);
  }

  .reset-svg {
    width: 15px;
    height: 15px;
  }

  /* Studio Cassette Rack Container */
  .rack-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    margin-top: 8px;
    box-sizing: border-box;
  }

  .rack-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .rack-title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--kanso-text-primary);
    margin: 0;
  }

  .rack-subtitle {
    font-size: 12px;
    font-family: var(--font-mono, monospace);
    color: var(--kanso-text-muted);
  }

  /* Rack Grid */
  .rack-cards-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    width: 100%;
    box-sizing: border-box;
  }

  @media (max-width: 1100px) {
    .rack-cards-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 750px) {
    .rack-cards-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .acoustics-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .rack-cards-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
