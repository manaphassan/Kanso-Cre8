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

  function toggleTimer() {
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
    } else {
      isTimerRunning = true;
      timerInterval = setInterval(() => {
        if (pomodoroSeconds > 0) {
          pomodoroSeconds--;
        } else {
          clearInterval(timerInterval);
          isTimerRunning = false;
        }
      }, 1000);
    }
  }

  function resetTimer() {
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
    class="w-full rounded-2xl p-6 relative overflow-hidden border shadow-xl flex flex-col gap-6"
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
            class="w-2.5 h-2.5 rounded-full transition-colors duration-300"
            style="background: {state.isPlaying ? '#10B981' : '#71717A'}; box-shadow: {state.isPlaying ? '0 0 8px #10B981' : 'none'};"
          ></span>
          <span class="text-xs font-mono font-bold tracking-wider" style="color: var(--kanso-text-muted);">
            {state.isPlaying ? 'HI-FI STEREO // BROADCASTING' : 'STANDBY // MOTOR IDLE'}
          </span>
        </div>
      </div>

      <!-- Frequency Tuner LCD Readout -->
      <div class="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 font-mono">
        <span class="text-[11px] text-zinc-400">TUNER</span>
        <span class="text-sm font-bold text-sky-400 tracking-wider">
          {station.frequency}
        </span>
        <span class="text-xs font-semibold text-zinc-300 uppercase">
          {station.genre}
        </span>
      </div>

      <!-- Live Track Marquee Ribbon -->
      <div class="flex items-center gap-2 max-w-sm overflow-hidden px-3 py-1.5 rounded-lg bg-zinc-950/60 border border-white/5">
        <span class="text-xs text-amber-400 shrink-0">♫</span>
        <span class="text-xs font-mono truncate" style="color: var(--kanso-text-primary);">
          {state.currentTrackTitle}
        </span>
      </div>
    </div>

    <!-- Center Deck Chamber: Active Cassette Inset & Visualizer -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
      <!-- Left: Loaded Cassette Chamber Slot (7 Cols) -->
      <div class="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-xl bg-black/40 border border-white/10 relative">
        <!-- Mechanical Cassette Bay Recess -->
        <div
          class="w-full max-w-md h-52 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden shadow-2xl border"
          style="
            background: {station.shellColor};
            border-color: rgba(255, 255, 255, 0.2);
          "
        >
          <!-- Tape Label Header -->
          <div
            class="w-full rounded-md px-3 py-2 flex items-center justify-between shadow z-10"
            style="background: {station.labelColor}; color: #0F172A;"
          >
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 text-[9px] font-black rounded text-white" style="background: {station.shellColor};">
                SIDE A
              </span>
              <span class="text-xs font-bold">{station.name}</span>
            </div>
            <span class="text-xs font-mono font-bold" style="color: {station.accentColor};">
              {station.frequency}
            </span>
          </div>

          <!-- Giant Glass Tape Window with Rotating Spools -->
          <div class="w-full h-24 rounded-lg bg-black/80 border border-white/15 relative flex items-center justify-between px-10 my-auto">
            <!-- Magnetic Brown Tape Ribbon Strip -->
            <div class="absolute inset-x-12 h-12 bg-[#2E1810] rounded border border-amber-950/70 flex items-center justify-center">
              <div class="w-16 h-6 bg-black/80 rounded border border-white/10 flex items-center justify-around px-2">
                <div class="w-0.5 h-3 bg-white/40"></div>
                <div class="w-0.5 h-2 bg-white/20"></div>
                <div class="w-0.5 h-4 bg-red-500"></div>
                <div class="w-0.5 h-2 bg-white/20"></div>
                <div class="w-0.5 h-3 bg-white/40"></div>
              </div>
            </div>

            <!-- Left Spool Wheel -->
            <div class="z-10 relative">
              <CassetteSpoolWheel size={44} rotationAngle={state.isPlaying ? state.spoolRotation : 0} />
            </div>

            <!-- Right Spool Wheel -->
            <div class="z-10 relative">
              <CassetteSpoolWheel size={44} rotationAngle={state.isPlaying ? state.spoolRotation : 0} />
            </div>
          </div>

          <!-- Bottom Pins & Screws -->
          <div class="w-full flex items-center justify-between px-3 text-[10px] text-white/40 font-mono">
            <span>● HIGH BIAS 70µs</span>
            <span>JAPAN TYPE II ●</span>
          </div>
        </div>
      </div>

      <!-- Right: Transport Controls & Focus Pomodoro (5 Cols) -->
      <div class="lg:col-span-5 flex flex-col gap-6 justify-between h-full">
        <!-- Mechanical Transport Buttons Bar -->
        <div class="flex flex-col gap-3 p-4 rounded-xl bg-zinc-950/40 border border-white/5">
          <span class="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
            Transport Controls
          </span>
          <div class="flex items-center gap-3">
            <!-- Prev Button -->
            <button
              type="button"
              class="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition text-white"
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
              class="flex-1 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
              style="
                background: {state.isPlaying ? '#EF4444' : 'var(--kanso-accent)'};
                color: #FFFFFF;
              "
              onclick={() => radioService.toggle()}
              aria-label={state.isPlaying ? 'Pause Audio' : 'Play Audio'}
            >
              {#if state.isPlaying}
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                <span>PAUSE MOTOR</span>
              {:else}
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span>ENGAGE DECK</span>
              {/if}
            </button>

            <!-- Next Button -->
            <button
              type="button"
              class="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition text-white"
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
          <div class="flex items-center gap-3 pt-2">
            <button
              type="button"
              class="text-zinc-400 hover:text-white"
              onclick={() => radioService.toggleMute()}
              aria-label="Mute"
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
              class="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
              aria-label="Radio Volume Slider"
            />
            <span class="text-xs font-mono text-zinc-400 w-8 text-right">
              {Math.round(state.volume * 100)}%
            </span>
          </div>
        </div>

        <!-- Integrated Pomodoro Creative Sprint Coach -->
        <div class="p-4 rounded-xl bg-zinc-950/40 border border-white/5 flex items-center justify-between">
          <div class="flex flex-col">
            <span class="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
              Focus Sprint
            </span>
            <span class="text-2xl font-mono font-bold" style="color: var(--kanso-text-primary);">
              {timerFormatted}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold border transition"
              style="
                background: {isTimerRunning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)'};
                border-color: {isTimerRunning ? '#EF4444' : 'var(--kanso-accent)'};
                color: {isTimerRunning ? '#EF4444' : 'var(--kanso-accent)'};
              "
              onclick={toggleTimer}
            >
              {isTimerRunning ? 'PAUSE' : 'START 25M'}
            </button>
            <button
              type="button"
              class="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition"
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
      <span class="text-xs text-zinc-400">Click any tape to load into deck</span>
    </div>

    <!-- Cassette Cards Grid / Rack -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
