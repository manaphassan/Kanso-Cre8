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
  class="relative flex flex-col items-center p-3 rounded-2xl transition-all duration-200 text-left select-none cursor-pointer focus:outline-none"
  class:selected={isSelected}
  style="
    background: var(--kanso-surface);
    border: 1.5px solid {isSelected ? station.accentColor : 'var(--kanso-border)'};
    box-shadow: {isSelected ? `0 0 16px ${station.accentColor}33` : 'none'};
    width: 280px;
  "
  {onclick}
  aria-label="Select {station.name} Cassette"
>
  <!-- Physical Cassette Chassis Shell -->
  <div
    class="w-full h-40 rounded-xl p-2.5 flex flex-col justify-between relative overflow-hidden border shadow-inner transition-transform"
    style="
      background: {station.shellColor};
      border-color: rgba(255, 255, 255, 0.15);
    "
  >
    <!-- Top 2 Silver Corner Screws -->
    <div class="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-500/40 flex items-center justify-center shadow-sm">
      <div class="w-1.5 h-0.5 bg-zinc-600 rotate-45"></div>
    </div>
    <div class="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-500/40 flex items-center justify-center shadow-sm">
      <div class="w-1.5 h-0.5 bg-zinc-600 -rotate-45"></div>
    </div>

    <!-- Top Paper Sticker Label -->
    <div
      class="w-full rounded-md px-2.5 py-1.5 flex items-center justify-between shadow-sm z-10 border border-black/10"
      style="background: {station.labelColor}; color: #0F172A;"
    >
      <div class="flex items-center gap-2 overflow-hidden">
        <!-- Side A Badge -->
        <span
          class="px-2 py-0.5 text-xs font-black rounded tracking-widest text-white shrink-0"
          style="background: {station.shellColor};"
        >
          SIDE A
        </span>
        <span class="text-sm font-bold truncate leading-tight tracking-tight">
          {station.name}
        </span>
      </div>
      <span
        class="text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0"
        style="background: {station.accentColor}22; color: {station.accentColor};"
      >
        {station.frequency}
      </span>
    </div>

    <!-- Center Acrylic Tape Window & Spinning Spools -->
    <div
      class="w-full h-16 rounded-lg bg-slate-950/90 border border-white/10 relative flex items-center justify-between px-6 overflow-hidden my-auto"
    >
      <!-- Magnetic Brown Tape Ribbon Strip -->
      <div class="absolute inset-x-8 h-8 bg-[#331D15] rounded border border-amber-950/60 opacity-90 flex items-center justify-center">
        <!-- Center Tape Level Gauge Ruler -->
        <div class="w-10 h-4 bg-black/70 rounded-sm border border-white/10 flex items-center justify-around px-1">
          <div class="w-0.5 h-2 bg-white/30"></div>
          <div class="w-0.5 h-1.5 bg-white/20"></div>
          <div class="w-0.5 h-2.5 bg-red-500/80"></div>
          <div class="w-0.5 h-1.5 bg-white/20"></div>
          <div class="w-0.5 h-2 bg-white/30"></div>
        </div>
      </div>

      <!-- Left Supply Spool Gear Wheel -->
      <div class="z-10 relative">
        <CassetteSpoolWheel
          size={32}
          isSpinning={isPlaying && isSelected}
          rotationAngle={isPlaying && isSelected ? spoolRotation : 0}
          holeColor="#020617"
        />
      </div>

      <!-- Right Take-Up Spool Gear Wheel -->
      <div class="z-10 relative">
        <CassetteSpoolWheel
          size={32}
          isSpinning={isPlaying && isSelected}
          rotationAngle={isPlaying && isSelected ? spoolRotation : 0}
          holeColor="#020617"
        />
      </div>
    </div>

    <!-- Bottom Head-Reader Trapezoid & 2 Bottom Corner Screws -->
    <div class="w-full flex items-end justify-between px-2 pt-1">
      <div class="w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-500/40 flex items-center justify-center shadow-sm">
        <div class="w-1.5 h-0.5 bg-zinc-600 rotate-12"></div>
      </div>

      <!-- Center Roller Inset Notch -->
      <div class="w-28 h-2.5 bg-black/40 rounded-t-md border-t border-x border-white/10 flex items-center justify-center gap-3">
        <div class="w-2 h-1 bg-amber-200/40 rounded-full"></div>
        <div class="w-2 h-1 bg-amber-200/40 rounded-full"></div>
      </div>

      <div class="w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-500/40 flex items-center justify-center shadow-sm">
        <div class="w-1.5 h-0.5 bg-zinc-600 -rotate-12"></div>
      </div>
    </div>
  </div>

  <!-- Note Card Meta Below Cassette -->
  <div class="w-full mt-2.5 px-1 flex flex-col gap-1">
    <div class="flex items-center justify-between text-sm font-semibold">
      <span style="color: var(--kanso-text-primary);">{station.genre}</span>
      {#if isSelected && isPlaying}
        <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          PLAYING
        </span>
      {:else if isSelected}
        <span class="text-xs font-mono text-zinc-400">LOADED</span>
      {/if}
    </div>
    <p class="text-xs leading-relaxed line-clamp-2" style="color: var(--kanso-text-muted);">
      {station.description}
    </p>
  </div>
</button>

<style>
  .selected {
    transform: translateY(-2px);
  }
</style>
