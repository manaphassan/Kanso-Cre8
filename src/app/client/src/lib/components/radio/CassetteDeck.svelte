<script lang="ts">
  import { radioService, ALL_CASSETTE_STATIONS } from '$lib/services/radioService.svelte';
  import CassetteSpoolWheel from './CassetteSpoolWheel.svelte';
  import CassetteTapeCard from './CassetteTapeCard.svelte';

  const station = $derived(radioService.currentStation);
  const state = $derived(radioService.state);

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

  const timerFormatted = $derived.by(() => {
    const mins = Math.floor(pomodoroSeconds / 60).toString().padStart(2, '0');
    const secs = (pomodoroSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  });
</script>

<div class="deck-wrapper">
  <!-- ════ MAIN MECHANICAL CASSETTE DECK CONSOLE ════ -->
  <div class="deck-main-card">
    <!-- Top Deck Header: Frequency Tuner & Status -->
    <div class="deck-top-bar">
      <!-- Vintage Power LED -->
      <div class="power-indicator">
        <span
          class="power-led"
          style="
            background: {state.isPlaying ? '#8FA683' : '#71717A'};
            box-shadow: {state.isPlaying ? '0 0 10px rgba(143, 166, 131, 0.7)' : 'none'};
          "
        ></span>
        <span class="power-label">
          {state.isPlaying ? 'HI-FI STEREO // 33 RPM MOTOR ACTIVE' : 'STANDBY // MOTOR IDLE'}
        </span>
      </div>

      <!-- Center Tuner Readout -->
      <div class="tuner-box">
        <span class="tuner-tag">TUNER</span>
        <span class="tuner-freq">{station.frequency}</span>
        <span class="tuner-genre">{station.genre}</span>
      </div>

      <!-- Live Track & VU Equalizer -->
      <div class="marquee-box">
        <div class="vu-meter-bars" aria-hidden="true">
          <span class="vu-bar {state.isPlaying ? 'vu-bar-1' : ''}"></span>
          <span class="vu-bar {state.isPlaying ? 'vu-bar-2' : ''}"></span>
          <span class="vu-bar {state.isPlaying ? 'vu-bar-3' : ''}"></span>
          <span class="vu-bar {state.isPlaying ? 'vu-bar-4' : ''}"></span>
        </div>
        <span class="track-title-text" title={state.currentTrackTitle}>
          {state.currentTrackTitle}
        </span>
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
              <span class="sticker-side" style="background: {station.shellColor};">SIDE A</span>
              <span class="sticker-name">{station.name}</span>
            </div>
            <span class="sticker-freq" style="color: {station.accentColor};">
              {station.frequency}
            </span>
          </div>

          <!-- Giant Acrylic Tape Window -->
          <div class="acrylic-window">
            <!-- Magnetic Brown Tape Ribbon Strip -->
            <div class="tape-ribbon">
              <div class="tape-gauge">
                <div class="gauge-mark"></div>
                <div class="gauge-mark sm"></div>
                <div class="gauge-mark center"></div>
                <div class="gauge-mark sm"></div>
                <div class="gauge-mark"></div>
              </div>
            </div>

            <!-- Left Spool Wheel (33 RPM rotating) -->
            <div class="spool-slot">
              <CassetteSpoolWheel size={48} isSpinning={state.isPlaying} rotationAngle={state.isPlaying ? state.spoolRotation : 0} />
            </div>

            <!-- Right Spool Wheel (33 RPM rotating) -->
            <div class="spool-slot">
              <CassetteSpoolWheel size={48} isSpinning={state.isPlaying} rotationAngle={state.isPlaying ? state.spoolRotation : 0} />
            </div>
          </div>

          <!-- Bottom Reader Trapezoid & 2 Bottom Screws -->
          <div class="head-row">
            <div class="screw"><div class="screw-slot deg-12"></div></div>
            <div class="head-notch">
              <div class="roller-dot"></div>
              <div class="roller-center"></div>
              <div class="roller-dot"></div>
            </div>
            <div class="screw"><div class="screw-slot deg-neg12"></div></div>
          </div>

          <!-- High Bias Subtitle -->
          <div class="tape-bias-text">
            <span>● HIGH BIAS 70µs</span>
            <span>JAPAN TYPE II ●</span>
          </div>
        </div>
      </div>

      <!-- Right: Transport Controls & Pomodoro -->
      <div class="controls-column">
        <!-- Transport Deck Controls -->
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

        <!-- Integrated Pomodoro Sprint Coach -->
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
    gap: 16px;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 16px;
    flex-wrap: wrap;
  }

  .power-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .power-led {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }

  .power-label {
    font-size: 12px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted);
  }

  /* Tuner Readout Box */
  .tuner-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    font-family: var(--font-mono, monospace);
  }

  .tuner-tag {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted);
  }

  .tuner-freq {
    font-size: 14px;
    font-weight: 800;
    color: var(--kanso-accent);
    letter-spacing: 0.05em;
  }

  .tuner-genre {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(222, 105, 75, 0.1);
    color: var(--kanso-accent);
    border: 1px solid rgba(222, 105, 75, 0.2);
  }

  /* Marquee Box + VU Equalizer */
  .marquee-box {
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 360px;
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    overflow: hidden;
  }

  .vu-meter-bars {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 14px;
    flex-shrink: 0;
  }

  .vu-bar {
    width: 2.5px;
    height: 3px;
    border-radius: 1px;
    background: var(--kanso-accent);
    transition: height 0.15s ease;
  }

  @keyframes vu-bounce {
    0%, 100% { height: 3px; }
    50% { height: 14px; }
  }

  .vu-bar-1 { animation: vu-bounce 0.8s ease-in-out infinite; }
  .vu-bar-2 { animation: vu-bounce 0.6s ease-in-out infinite 0.15s; }
  .vu-bar-3 { animation: vu-bounce 0.9s ease-in-out infinite 0.3s; }
  .vu-bar-4 { animation: vu-bounce 0.7s ease-in-out infinite 0.1s; }

  .track-title-text {
    font-size: 12px;
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

  @media (max-width: 900px) {
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
    height: 216px;
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
    padding: 2px 7px;
    font-size: 11px;
    font-weight: 900;
    border-radius: 4px;
    color: #FFFFFF;
    letter-spacing: 0.1em;
    flex-shrink: 0;
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
    padding: 0 40px;
    margin: auto 0;
    box-sizing: border-box;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .tape-ribbon {
    position: absolute;
    left: 48px;
    right: 48px;
    height: 48px;
    background: #2E1810;
    border-radius: 4px;
    border: 1px solid rgba(120, 53, 15, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tape-gauge {
    width: 64px;
    height: 24px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 6px;
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
    height: 12px;
    background: rgba(0, 0, 0, 0.5);
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    border-left: 1px solid rgba(255, 255, 255, 0.2);
    border-right: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
  }

  .roller-dot {
    width: 10px;
    height: 3.5px;
    background: rgba(253, 230, 138, 0.4);
    border-radius: 2px;
    border: 1px solid rgba(254, 243, 199, 0.3);
  }

  .roller-center {
    width: 8px;
    height: 5px;
    background: #71717A;
    border-radius: 1px;
  }

  .tape-bias-text {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    font-family: var(--font-mono, monospace);
    letter-spacing: 0.1em;
    margin-top: 2px;
  }

  /* Right Controls Column */
  .controls-column {
    display: flex;
    flex-direction: column;
    gap: 20px;
    justify-content: space-between;
    height: 100%;
    box-sizing: border-box;
  }

  .transport-panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    box-sizing: border-box;
  }

  .panel-title {
    font-size: 12px;
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
    width: 46px;
    height: 46px;
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
    height: 46px;
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
    gap: 12px;
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
    width: 18px;
    height: 18px;
  }

  .vol-slider {
    flex: 1;
    height: 6px;
    border-radius: 4px;
    background: var(--kanso-border);
    accent-color: var(--kanso-accent);
    cursor: pointer;
    outline: none;
  }

  .vol-text {
    font-size: 12px;
    font-family: var(--font-mono, monospace);
    font-weight: 600;
    color: var(--kanso-text-muted);
    width: 36px;
    text-align: right;
  }

  /* Pomodoro Panel */
  .pomodoro-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
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
    font-size: 26px;
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
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 12px;
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
    width: 36px;
    height: 36px;
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
    width: 16px;
    height: 16px;
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
  }

  @media (max-width: 480px) {
    .rack-cards-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
