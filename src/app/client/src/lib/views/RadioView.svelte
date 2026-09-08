<script lang="ts">
  import CassetteDeck from '$lib/components/radio/CassetteDeck.svelte';
  import { radioService } from '$lib/services/radioService.svelte';

  function handleKeydown(e: KeyboardEvent) {
    // Space to toggle play/pause when not typing in input
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      radioService.toggle();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex flex-col gap-6 p-6 w-full max-w-6xl mx-auto">
  <!-- Page Header -->
  <div class="flex flex-col gap-1 border-b pb-4" style="border-color: var(--kanso-border);">
    <div class="flex items-center gap-3">
      <span class="text-2xl">📼</span>
      <h1 class="text-xl font-bold tracking-tight" style="color: var(--kanso-text-primary);">
        Focus Radio & Cassette Deck
      </h1>
      <span
        class="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
        style="background: var(--kanso-border); color: var(--kanso-accent);"
      >
        HI-FI RETRO
      </span>
    </div>
    <p class="text-xs" style="color: var(--kanso-text-muted);">
      Tactile mechanical cassette deck streaming curated lo-fi beats, synthwave, and ambient soundscapes to maintain deep creative flow.
    </p>
  </div>

  <!-- The Cassette Deck & Rack -->
  <CassetteDeck />

  <!-- Studio Hotkeys Footer Guide -->
  <div
    class="flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-xl border text-xs font-mono"
    style="
      background: var(--kanso-surface);
      border-color: var(--kanso-border);
      color: var(--kanso-text-muted);
    "
  >
    <div class="flex items-center gap-4">
      <span><kbd class="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white">Space</kbd> Play / Pause</span>
      <span><kbd class="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white">Next</kbd> Next Tape</span>
      <span><kbd class="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white">Prev</kbd> Previous Tape</span>
    </div>
    <span class="text-[11px] text-zinc-500">
      Ported from SS-CAM Android · Zero-Latency Web Audio Stream
    </span>
  </div>
</div>
