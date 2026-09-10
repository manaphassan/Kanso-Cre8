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
  <div class="flex flex-col gap-2 border-b pb-5" style="border-color: var(--kanso-border);">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
          style="
            background: var(--kanso-surface);
            border-color: var(--kanso-border);
            color: var(--kanso-accent);
          "
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="8" cy="12" r="2.5" />
            <circle cx="16" cy="12" r="2.5" />
            <path d="M8 14.5h8" />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-2xl font-bold tracking-tight" style="color: var(--kanso-text-primary);">
              Focus Radio & Cassette Deck
            </h1>
            <span
              class="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold tracking-wider uppercase border"
              style="
                background: rgba(222, 105, 75, 0.12);
                color: var(--kanso-accent);
                border-color: rgba(222, 105, 75, 0.25);
              "
            >
              HI-FI ATELIER
            </span>
          </div>
          <p class="text-sm mt-0.5" style="color: var(--kanso-text-muted);">
            Tactile mechanical cassette deck streaming curated lo-fi beats, synthwave, and ambient soundscapes.
          </p>
        </div>
      </div>
    </div>
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
      <span class="inline-flex items-center gap-1.5">
        <kbd
          class="px-2 py-0.5 rounded text-xs font-mono font-semibold border shadow-sm"
          style="
            background: var(--kanso-surface-hover);
            border-color: var(--kanso-border);
            color: var(--kanso-text-primary);
          "
        >Space</kbd>
        <span>Play / Pause</span>
      </span>
      <span class="inline-flex items-center gap-1.5">
        <kbd
          class="px-2 py-0.5 rounded text-xs font-mono font-semibold border shadow-sm"
          style="
            background: var(--kanso-surface-hover);
            border-color: var(--kanso-border);
            color: var(--kanso-text-primary);
          "
        >Next</kbd>
        <span>Next Tape</span>
      </span>
      <span class="inline-flex items-center gap-1.5">
        <kbd
          class="px-2 py-0.5 rounded text-xs font-mono font-semibold border shadow-sm"
          style="
            background: var(--kanso-surface-hover);
            border-color: var(--kanso-border);
            color: var(--kanso-text-primary);
          "
        >Prev</kbd>
        <span>Previous Tape</span>
      </span>
    </div>
    <span class="text-xs font-mono" style="color: var(--kanso-text-muted);">
      Kanso Zen Focus Engine · Zero-Latency Web Audio Stream
    </span>
  </div>
</div>
