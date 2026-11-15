<script lang="ts">
  /**
   * The cassette, drawn as one scalable SVG (cassette artwork: hex colours are
   * allowed here). Two 6-spoke spools sit on fixed hubs inside the clear tape
   * window and turn at 33 RPM while playing; the tape packs grow and shrink
   * with `progress` and are clipped by the window, so they never overlap.
   */
  interface Props {
    name: string;
    genre: string;
    frequency: string;
    side: 'A' | 'B';
    shellColor?: string;
    labelColor?: string;
    isPlaying: boolean;
    /** 0 = all tape on the left spool, 1 = all on the right. */
    progress: number;
  }

  let { name, genre, frequency, side, shellColor = '#2A2A2E', labelColor = '#F7F5F0', isPlaying, progress }: Props = $props();

  const HUB_L = { x: 128, y: 120 };
  const HUB_R = { x: 272, y: 120 };
  const HUB_R_PX = 21;
  const PACK_MIN = 24;
  const PACK_SPAN = 44;

  const p = $derived(Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0)));
  const packLeft = $derived(PACK_MIN + PACK_SPAN * (1 - p));
  const packRight = $derived(PACK_MIN + PACK_SPAN * p);

  const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}...` : text);
  const title = $derived(clip(name || 'Blank tape', 28));
  const subtitle = $derived(clip(genre || '', 38));

  // Six drive teeth around the hub bore, 60 degrees apart.
  const teeth = [0, 60, 120, 180, 240, 300];
  // Unique ids so several cassettes on one page do not share a clip path.
  const uid = `cs-${Math.random().toString(36).slice(2, 8)}`;
</script>

<svg
  class="cassette"
  class:playing={isPlaying}
  viewBox="0 0 400 252"
  role="img"
  aria-label="Cassette {title}, side {side}{isPlaying ? ', playing' : ''}"
>
  <defs>
    <clipPath id="{uid}-window">
      <rect x="66" y="82" width="268" height="76" rx="38" />
    </clipPath>
    <radialGradient id="{uid}-tape" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4A2C1C" />
      <stop offset="85%" stop-color="#2B170D" />
      <stop offset="100%" stop-color="#1A0D06" />
    </radialGradient>
    <linearGradient id="{uid}-glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.16" />
      <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.03" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Shell -->
  <rect x="2" y="2" width="396" height="248" rx="14" fill={shellColor} />
  <rect x="2" y="2" width="396" height="248" rx="14" fill="none" stroke="#000000" stroke-opacity="0.35" stroke-width="2" />
  <rect x="7" y="7" width="386" height="238" rx="11" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" />

  <!-- Four corner screws -->
  {#each [[18, 18, 45], [382, 18, -45], [18, 234, 12], [382, 234, -12]] as [cx, cy, deg]}
    <g transform="translate({cx} {cy}) rotate({deg})">
      <circle r="6" fill="#C9CBD1" stroke="#5B5E66" stroke-width="1" />
      <rect x="-4" y="-0.9" width="8" height="1.8" rx="0.9" fill="#3A3C42" />
    </g>
  {/each}

  <!-- Paper label -->
  <rect x="28" y="20" width="344" height="152" rx="8" fill={labelColor} />
  <rect x="28" y="20" width="344" height="24" rx="8" fill="#000000" fill-opacity="0.04" />
  <rect x="38" y="28" width="46" height="18" rx="3" fill="#1F1F23" />
  <text class="side" x="61" y="41" text-anchor="middle">SIDE {side}</text>
  <text class="title" x="94" y="41">{title}</text>
  <text class="freq" x="362" y="41" text-anchor="end">{frequency}</text>
  <text class="genre" x="94" y="60">{subtitle}</text>
  <line x1="40" y1="70" x2="360" y2="70" stroke="#000000" stroke-opacity="0.12" />

  <!-- Clear tape window with tape packs and spools -->
  <rect x="62" y="78" width="276" height="84" rx="42" fill="#000000" fill-opacity="0.18" />
  <rect x="66" y="82" width="268" height="76" rx="38" fill="#0E0E10" />
  <g clip-path="url(#{uid}-window)">
    <circle cx={HUB_L.x} cy={HUB_L.y} r={packLeft} fill="url(#{uid}-tape)" />
    <circle cx={HUB_R.x} cy={HUB_R.y} r={packRight} fill="url(#{uid}-tape)" />
    <!-- Tape running from both packs down to the head -->
    <line x1={HUB_L.x} y1={HUB_L.y + packLeft} x2="200" y2="160" stroke="#2B170D" stroke-width="2" />
    <line x1={HUB_R.x} y1={HUB_R.y + packRight} x2="200" y2="160" stroke="#2B170D" stroke-width="2" />
  </g>

  {#each [HUB_L, HUB_R] as hub}
    <g transform="translate({hub.x} {hub.y})">
      <g class="spool">
        <circle r={HUB_R_PX} fill="#F2F2F0" stroke="#000000" stroke-opacity="0.3" />
        <circle r={HUB_R_PX - 3} fill="none" stroke="#000000" stroke-opacity="0.08" />
        <circle r="10" fill="#141416" />
        {#each teeth as deg}
          <rect x="-1.8" y="-10" width="3.6" height="4.5" rx="1" fill="#F2F2F0" transform="rotate({deg})" />
        {/each}
        {#each teeth as deg}
          <circle cx="0" cy="-15.5" r="2" fill="#141416" fill-opacity="0.85" transform="rotate({deg + 30})" />
        {/each}
      </g>
    </g>
  {/each}

  <rect x="66" y="82" width="268" height="76" rx="38" fill="url(#{uid}-glass)" pointer-events="none" />
  <rect x="66" y="82" width="268" height="76" rx="38" fill="none" stroke="#FFFFFF" stroke-opacity="0.22" />

  <!-- Trapezoid head opening with pinch rollers -->
  <path d="M100 250 L122 196 L278 196 L300 250 Z" fill="#000000" fill-opacity="0.22" />
  <path d="M122 196 L278 196" stroke="#FFFFFF" stroke-opacity="0.14" />
  <circle cx="146" cy="226" r="8" fill="#141416" />
  <circle cx="254" cy="226" r="8" fill="#141416" />
  <g transform="translate(146 226)"><g class="roller"><circle r="4" fill="#5B5E66" /><rect x="-0.8" y="-4" width="1.6" height="8" fill="#2A2C31" /></g></g>
  <g transform="translate(254 226)"><g class="roller"><circle r="4" fill="#5B5E66" /><rect x="-0.8" y="-4" width="1.6" height="8" fill="#2A2C31" /></g></g>
  <rect x="176" y="214" width="16" height="12" rx="2" fill="#141416" />
  <rect x="208" y="214" width="16" height="12" rx="2" fill="#141416" />
  <rect x="194" y="218" width="12" height="8" rx="1.5" fill="#9A9DA5" />
</svg>

<style>
  .cassette {
    display: block;
    width: 100%;
    height: auto;
    filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35));
  }

  .title {
    font-family: var(--kanso-font-ui);
    font-size: 15px;
    font-weight: 700;
    fill: #1A1A1C;
  }

  .genre {
    font-family: var(--kanso-font-ui);
    font-size: 11px;
    fill: #55565C;
  }

  .side,
  .freq {
    font-family: var(--kanso-font-mono);
    font-size: 10px;
    font-weight: 700;
  }

  .side {
    fill: #F2F2F0;
  }

  .freq {
    font-size: 12px;
    fill: #1A1A1C;
  }

  /* 33 RPM: one turn every 1.818 s. */
  .spool,
  .roller {
    transform-box: fill-box;
    transform-origin: center;
  }

  .playing .spool {
    animation: spin 1.818s linear infinite;
  }

  .playing .roller {
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(-360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .playing .spool,
    .playing .roller {
      animation: none;
    }
  }
</style>
