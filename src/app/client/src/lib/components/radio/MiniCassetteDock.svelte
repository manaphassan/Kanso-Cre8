<script lang="ts">
  import { radioService } from '$lib/services/radioService.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import CassetteSpoolWheel from './CassetteSpoolWheel.svelte';

  const station = $derived(radioService.currentStation);
  const state = $derived(radioService.state);

  function openRadioStudio() {
    appState.navigate('radio');
  }
</script>

<div
  class="h-10 px-2.5 rounded-xl border flex items-center justify-between gap-2.5 shadow-sm select-none transition-all"
  style="
    background: var(--kanso-surface);
    border-color: var(--kanso-border);
  "
>
  <!-- Mini Cassette Chamber Inset (Click to navigate to Radio Studio) -->
  <button
    type="button"
    class="flex items-center gap-2 px-2 py-0.5 rounded-lg border text-left hover:brightness-110 active:scale-98 transition shrink-0 cursor-pointer"
    style="
      background: {station.shellColor};
      border-color: rgba(255, 255, 255, 0.2);
    "
    onclick={openRadioStudio}
    title="Open Cassette Studio"
    aria-label="Open Radio Studio ({station.name})"
  >
    <!-- Left Mini Spool -->
    <CassetteSpoolWheel
      size={16}
      isSpinning={state.isPlaying}
      rotationAngle={state.isPlaying ? state.spoolRotation : 0}
      holeColor="#020617"
    />

    <!-- Center Mini Tape Window -->
    <div class="w-5 h-2.5 bg-black/60 rounded-sm border border-white/10 flex items-center justify-center">
      <div class="w-1.5 h-1 bg-[#DE694B] rounded-full"></div>
    </div>

    <!-- Right Mini Spool -->
    <CassetteSpoolWheel
      size={16}
      isSpinning={state.isPlaying}
      rotationAngle={state.isPlaying ? state.spoolRotation : 0}
      holeColor="#020617"
    />

    <span
      class="text-xs font-mono font-bold px-1.5 py-0.5 rounded text-white tracking-tight"
      style="background: {station.accentColor};"
    >
      {station.frequency}
    </span>
  </button>

  <!-- Track Title / Station Marquee -->
  <button
    type="button"
    class="flex-1 min-w-0 text-left overflow-hidden cursor-pointer"
    onclick={openRadioStudio}
    title="Open Focus Radio"
  >
    <div class="flex items-center gap-2">
      <span
        class="w-2 h-2 rounded-full shrink-0 transition-colors"
        style="background: {state.isPlaying ? '#8FA683' : '#71717A'};"
      ></span>
      <span class="text-xs font-semibold truncate" style="color: var(--kanso-text-primary);">
        {station.name}
      </span>
      <span class="text-xs font-mono truncate hidden md:inline" style="color: var(--kanso-text-muted);">
        — {state.currentTrackTitle}
      </span>
    </div>
  </button>

  <!-- Quick Transport Controls -->
  <div class="flex items-center gap-1.5 shrink-0">
    <button
      type="button"
      class="p-1 rounded-md transition cursor-pointer hover:bg-[var(--kanso-surface-hover)]"
      style="color: var(--kanso-text-muted);"
      onclick={() => radioService.prev()}
      aria-label="Previous Station"
      title="Previous Tape"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
      </svg>
    </button>

    <!-- Play / Pause Pill -->
    <button
      type="button"
      class="p-1.5 rounded-lg font-bold flex items-center justify-center active:scale-95 transition cursor-pointer shadow-sm"
      style="
        background: {state.isPlaying ? 'var(--kanso-accent)' : 'var(--kanso-surface-hover)'};
        border: 1px solid var(--kanso-accent);
        color: {state.isPlaying ? '#FFFFFF' : 'var(--kanso-accent)'};
      "
      onclick={() => radioService.toggle()}
      aria-label={state.isPlaying ? 'Pause' : 'Play'}
    >
      {#if state.isPlaying}
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      {:else}
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      {/if}
    </button>

    <button
      type="button"
      class="p-1 rounded-md transition cursor-pointer hover:bg-[var(--kanso-surface-hover)]"
      style="color: var(--kanso-text-muted);"
      onclick={() => radioService.next()}
      aria-label="Next Station"
      title="Next Tape"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
      </svg>
    </button>
  </div>
</div>
