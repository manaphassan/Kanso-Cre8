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

<div class="flex flex-col gap-6 max-w-5xl mx-auto w-full">
  <!-- ════ MAIN MECHANICAL CASSETTE DECK CONSOLE ════ -->
  <div
    class="w-full rounded-2xl p-6 relative overflow-hidden border flex flex-col gap-6"
    style="
      background: var(--kanso-surface);
      border-color: var(--kanso-border);
    "
  >
    <!-- Top Deck Header: Frequency Tuner & Ambient Status -->
    <div class="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style="border-color: var(--kanso-border);">
      <div class="flex items-center gap-3">
        <!-- Vintage Power LED -->
        <div class="flex items-center gap-2">
          <span
            class="w-2.5 h-2.5 rounded-full transition-all duration-300"
            style="
              background: {state.isPlaying ? '#8FA683' : '#71717A'};
              box-shadow: {state.isPlaying ? '0 0 10px rgba(143, 166, 131, 0.7)' : 'none'};
            "
          ></span>
          <span class="text-xs font-mono font-bold tracking-wider" style="color: var(--kanso-text-muted);">
            {state.isPlaying ? 'HI-FI STEREO // 33 RPM MOTOR ACTIVE' : 'STANDBY // MOTOR IDLE'}
          </span>
        </div>
      </div>

      <!-- Frequency Tuner LCD Readout -->
      <div
        class="flex items-center gap-3 px-3.5 py-1.5 rounded-lg border font-mono shadow-inner"
        style="
          background: var(--kanso-surface-hover);
          border-color: var(--kanso-border);
        "
      >
        <span class="text-xs font-mono font-bold tracking-wider" style="color: var(--kanso-text-muted);">TUNER</span>
        <span class="text-sm font-bold tracking-wider" style="color: var(--kanso-accent);">
          {station.frequency}
        </span>
        <span
          class="text-xs font-mono font-semibold uppercase px-2 py-0.5 rounded border"
          style="
            background: rgba(222, 105, 75, 0.1);
            color: var(--kanso-accent);
            border-color: rgba(222, 105, 75, 0.2);
          "
        >
          {station.genre}
        </span>
      </div>

      <!-- Live Track Marquee Ribbon + Animated VU Equalizer -->
      <div
        class="flex items-center gap-2.5 max-w-sm overflow-hidden px-3.5 py-1.5 rounded-lg border"
        style="
          background: var(--kanso-surface-hover);
          border-color: var(--kanso-border);
        "
      >
        <!-- Mini Animated VU Meter Bars -->
        <div class="flex items-end gap-1 h-3.5 shrink-0" aria-hidden="true">
          <span
            class="w-0.5 rounded-full transition-all duration-150 {state.isPlaying ? 'vu-bar-1' : ''}"
            style="background: var(--kanso-accent); height: {state.isPlaying ? '10px' : '3px'};"
          ></span>
          <span
            class="w-0.5 rounded-full transition-all duration-150 {state.isPlaying ? 'vu-bar-2' : ''}"
            style="background: var(--kanso-accent); height: {state.isPlaying ? '14px' : '4px'};"
          ></span>
          <span
            class="w-0.5 rounded-full transition-all duration-150 {state.isPlaying ? 'vu-bar-3' : ''}"
            style="background: var(--kanso-accent); height: {state.isPlaying ? '8px' : '3px'};"
          ></span>
          <span
            class="w-0.5 rounded-full transition-all duration-150 {state.isPlaying ? 'vu-bar-4' : ''}"
            style="background: var(--kanso-accent); height: {state.isPlaying ? '12px' : '4px'};"
          ></span>
        </div>

        <span class="text-xs font-mono font-medium truncate" style="color: var(--kanso-text-primary);">
          {state.currentTrackTitle}
        </span>
      </div>
    </div>

    <!-- Center Deck Chamber: Active Cassette Inset & Controls -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
      <!-- Left: Loaded Cassette Chamber Slot (7 Cols) -->
      <div
        class="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-xl border relative shadow-inner"
        style="
          background: var(--kanso-surface-hover);
          border-color: var(--kanso-border);
        "
      >
        <!-- Mechanical Cassette Bay Recess -->
        <div
          class="w-full max-w-md h-52 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden border shadow-lg"
          style="
            background: {station.shellColor};
            border-color: rgba(255, 255, 255, 0.18);
          "
        >
          <!-- Top 2 Silver Corner Screws -->
          <div class="absolute top-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-500/40 flex items-center justify-center shadow-sm">
            <div class="w-1.5 h-0.5 bg-zinc-600 rotate-45"></div>
          </div>
          <div class="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-500/40 flex items-center justify-center shadow-sm">
            <div class="w-1.5 h-0.5 bg-zinc-600 -rotate-45"></div>
          </div>

          <!-- Tape Label Header (Paper Sticker) -->
          <div
            class="w-full rounded-md px-3 py-2 flex items-center justify-between shadow-sm z-10 border border-black/10"
            style="background: {station.labelColor}; color: #151813;"
          >
            <div class="flex items-center gap-2">
              <span
                class="px-2 py-0.5 text-xs font-black rounded text-white tracking-widest"
                style="background: {station.shellColor};"
              >
                SIDE A
              </span>
              <span class="text-sm font-bold truncate">{station.name}</span>
            </div>
            <span class="text-xs font-mono font-bold" style="color: {station.accentColor};">
              {station.frequency}
            </span>
          </div>

          <!-- Giant Acrylic Tape Window with Rotating Spools -->
          <div class="w-full h-24 rounded-lg bg-black/80 border border-white/15 relative flex items-center justify-between px-10 my-auto shadow-inner">
            <!-- Magnetic Brown Tape Ribbon Strip -->
            <div class="absolute inset-x-12 h-12 bg-[#2E1810] rounded border border-amber-950/70 flex items-center justify-center">
              <div class="w-16 h-6 bg-black/80 rounded border border-white/10 flex items-center justify-around px-2">
                <div class="w-0.5 h-3 bg-white/40"></div>
                <div class="w-0.5 h-2 bg-white/20"></div>
                <div class="w-0.5 h-4 bg-[#DE694B]"></div>
                <div class="w-0.5 h-2 bg-white/20"></div>
                <div class="w-0.5 h-3 bg-white/40"></div>
              </div>
            </div>

            <!-- Left Spool Wheel (Rotating at 33 RPM via CSS animation) -->
            <div class="z-10 relative">
              <CassetteSpoolWheel size={44} isSpinning={state.isPlaying} rotationAngle={state.isPlaying ? state.spoolRotation : 0} />
            </div>

            <!-- Right Spool Wheel (Rotating at 33 RPM via CSS animation) -->
            <div class="z-10 relative">
              <CassetteSpoolWheel size={44} isSpinning={state.isPlaying} rotationAngle={state.isPlaying ? state.spoolRotation : 0} />
            </div>
          </div>

          <!-- Bottom Head-Reader Trapezoid & 2 Bottom Corner Screws -->
          <div class="w-full flex items-end justify-between px-2 pt-0.5">
            <div class="w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-500/40 flex items-center justify-center shadow-sm">
              <div class="w-1.5 h-0.5 bg-zinc-600 rotate-12"></div>
            </div>

            <!-- Center Roller Inset Notch (Trapezoidal head/roller) -->
            <div class="w-36 h-3 bg-black/50 rounded-t-md border-t border-x border-white/20 flex items-center justify-center gap-4">
              <div class="w-3 h-1 bg-amber-300/40 rounded-full border border-amber-200/30"></div>
              <div class="w-2 h-1.5 bg-zinc-400 rounded-sm"></div>
              <div class="w-3 h-1 bg-amber-300/40 rounded-full border border-amber-200/30"></div>
            </div>

            <div class="w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-500/40 flex items-center justify-center shadow-sm">
              <div class="w-1.5 h-0.5 bg-zinc-600 -rotate-12"></div>
            </div>
          </div>

          <!-- High Bias text ribbon -->
          <div class="w-full flex items-center justify-between px-3 text-xs text-white/50 font-mono tracking-widest mt-1">
            <span>● HIGH BIAS 70µs</span>
            <span>JAPAN TYPE II ●</span>
          </div>
        </div>
      </div>

      <!-- Right: Transport Controls & Focus Pomodoro (5 Cols) -->
      <div class="lg:col-span-5 flex flex-col gap-5 justify-between h-full">
        <!-- Mechanical Transport Controls Box -->
        <div
          class="flex flex-col gap-3.5 p-4 rounded-xl border shadow-sm"
          style="
            background: var(--kanso-surface-hover);
            border-color: var(--kanso-border);
          "
        >
          <span class="text-xs font-mono font-bold tracking-wider uppercase" style="color: var(--kanso-text-muted);">
            Transport Deck
          </span>
          <div class="flex items-center gap-3">
            <!-- Prev Button -->
            <button
              type="button"
              class="p-3 rounded-xl border transition active:scale-95 flex items-center justify-center shadow-sm"
              style="
                background: var(--kanso-surface);
                border-color: var(--kanso-border);
                color: var(--kanso-text-primary);
              "
              onclick={() => radioService.prev()}
              aria-label="Previous Tape"
              title="Previous Tape"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <!-- Main Play / Pause Button -->
            <button
              type="button"
              class="flex-1 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition shadow-md cursor-pointer"
              style="
                background: {state.isPlaying ? 'var(--kanso-accent)' : 'var(--kanso-surface)'};
                border: {state.isPlaying ? 'none' : '1px solid var(--kanso-accent)'};
                color: {state.isPlaying ? '#FFFFFF' : 'var(--kanso-accent)'};
              "
              onclick={() => radioService.toggle()}
              aria-label={state.isPlaying ? 'Pause Audio' : 'Play Audio'}
            >
              {#if state.isPlaying}
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                <span class="font-mono text-xs tracking-wider">PAUSE MOTOR</span>
              {:else}
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span class="font-mono text-xs tracking-wider">ENGAGE DECK</span>
              {/if}
            </button>

            <!-- Next Button -->
            <button
              type="button"
              class="p-3 rounded-xl border transition active:scale-95 flex items-center justify-center shadow-sm"
              style="
                background: var(--kanso-surface);
                border-color: var(--kanso-border);
                color: var(--kanso-text-primary);
              "
              onclick={() => radioService.next()}
              aria-label="Next Tape"
              title="Next Tape"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          <!-- Volume Fader -->
          <div class="flex items-center gap-3 pt-1">
            <button
              type="button"
              class="transition p-1 rounded-md"
              style="color: var(--kanso-text-muted);"
              onclick={() => radioService.toggleMute()}
              aria-label="Mute / Unmute"
              title={state.isMuted ? 'Unmute' : 'Mute'}
            >
              {#if state.isMuted || state.volume === 0}
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              {:else}
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
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
              class="w-full h-1.5 rounded-lg appearance-none cursor-pointer radio-vol-slider"
              aria-label="Radio Volume Slider"
            />
            <span class="text-xs font-mono font-medium w-9 text-right" style="color: var(--kanso-text-muted);">
              {Math.round(state.volume * 100)}%
            </span>
          </div>
        </div>

        <!-- Integrated Pomodoro Creative Sprint Coach -->
        <div
          class="p-4 rounded-xl border flex items-center justify-between shadow-sm"
          style="
            background: var(--kanso-surface-hover);
            border-color: var(--kanso-border);
          "
        >
          <div class="flex flex-col">
            <span class="text-xs font-mono font-bold tracking-wider uppercase" style="color: var(--kanso-text-muted);">
              Focus Sprint (25M)
            </span>
            <span class="text-2xl font-mono font-bold tracking-tight" style="color: var(--kanso-text-primary);">
              {timerFormatted}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition active:scale-95 cursor-pointer"
              style="
                background: {isTimerRunning ? 'rgba(222, 105, 75, 0.15)' : 'rgba(222, 105, 75, 0.12)'};
                border-color: var(--kanso-accent);
                color: var(--kanso-accent);
              "
              onclick={toggleTimer}
            >
              {isTimerRunning ? 'PAUSE' : 'START 25M'}
            </button>
            <button
              type="button"
              class="p-2 rounded-lg border transition active:scale-95 cursor-pointer"
              style="
                background: var(--kanso-surface);
                border-color: var(--kanso-border);
                color: var(--kanso-text-muted);
              "
              onclick={resetTimer}
              title="Reset Timer"
              aria-label="Reset Timer"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ════ CASSETTE RACK / TAPE CAROUSEL ════ -->
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold uppercase tracking-wider" style="color: var(--kanso-text-primary);">
        📼 Studio Cassette Rack ({ALL_CASSETTE_STATIONS.length} Tapes)
      </h2>
      <span class="text-xs font-mono" style="color: var(--kanso-text-muted);">
        Click any tape to load into deck
      </span>
    </div>

    <!-- Cassette Cards Grid / Rack -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
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
  @keyframes vu-bounce {
    0%, 100% {
      height: 3px;
    }
    50% {
      height: 14px;
    }
  }

  .vu-bar-1 {
    animation: vu-bounce 0.8s ease-in-out infinite;
  }
  .vu-bar-2 {
    animation: vu-bounce 0.6s ease-in-out infinite 0.15s;
  }
  .vu-bar-3 {
    animation: vu-bounce 0.9s ease-in-out infinite 0.3s;
  }
  .vu-bar-4 {
    animation: vu-bounce 0.7s ease-in-out infinite 0.1s;
  }

  /* Range slider styling */
  .radio-vol-slider {
    background: var(--kanso-border);
    accent-color: var(--kanso-accent);
  }
</style>
