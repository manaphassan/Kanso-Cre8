<script lang="ts">
  /**
   * The cassette deck faceplate, styled after a 1980s front-loading hi-fi
   * deck: brushed silver in light themes, black with gold lettering in dark
   * themes. Cassette door on the left; fluorescent display, transport keys,
   * focus timer and volume knob on the right.
   */
  import { radioService, type RadioStation } from '$lib/services/radioService.svelte';
  import { Icon } from '$lib/components/ui';
  import CassetteShell from './CassetteShell.svelte';
  import DeckDisplay from './DeckDisplay.svelte';
  import DeckFocusTimer from './DeckFocusTimer.svelte';
  import DeckKnob from './DeckKnob.svelte';
  import DeckTransport from './DeckTransport.svelte';

  interface Props {
    station: RadioStation;
    onRewind: () => void;
    onFastForward: () => void;
  }

  let { station, onRewind, onFastForward }: Props = $props();

  const playback = $derived(radioService.state);
  const OFFLINE_TITLE = 'Stream Unavailable (Click Next)';

  const status = $derived<'playing' | 'tuning' | 'standby' | 'offline'>(
    playback.isBuffering ? 'tuning'
      : playback.isPlaying ? 'playing'
      : playback.currentTrackTitle === OFFLINE_TITLE ? 'offline'
      : 'standby'
  );

  const track = $derived(
    status === 'offline' ? 'Station is offline. Press FF for the next one.'
      : playback.currentTrackTitle && playback.currentTrackTitle !== 'Ready to Play' ? playback.currentTrackTitle
      : station.featuredTrack || 'Press Play to tune in'
  );

  // Mechanical tape counter: one count per second of play.
  let tapeIndex = $state(0);
  $effect(() => {
    if (!playback.isPlaying) return;
    const id = setInterval(() => (tapeIndex = (tapeIndex + 1) % 10000), 1000);
    return () => clearInterval(id);
  });

  const level = $derived(playback.isMuted ? 0 : playback.volume);
</script>

<section class="deck" aria-label="Cassette deck">
  <header class="top">
    <span class="brand">KANSO</span>
    <span class="model">STEREO CASSETTE DECK<b>TC-K8</b></span>
  </header>

  <div class="body">
    <div class="left">
      <div class="door">
        <div class="window">
          <CassetteShell
            name={station.name}
            genre={station.genre}
            frequency={station.frequency}
            side={playback.tapeSide}
            shellColor={station.shellColor}
            labelColor={station.labelColor}
            isPlaying={playback.isPlaying}
            progress={radioService.reelProgress}
          />
        </div>
      </div>
      <div class="caption" aria-hidden="true"><span>AUTO REVERSE</span><span>C-90</span></div>
    </div>

    <div class="right">
      <DeckDisplay
        frequency={station.frequency}
        stationName={station.name}
        {track}
        {status}
        index={tapeIndex}
        side={playback.tapeSide}
        volume={level}
        onResetIndex={() => (tapeIndex = 0)}
      />

      <DeckTransport
        isPlaying={playback.isPlaying}
        isBuffering={playback.isBuffering}
        side={playback.tapeSide}
        {onRewind}
        onPlay={() => radioService.play()}
        onPause={() => radioService.pause()}
        onStop={() => radioService.stop()}
        {onFastForward}
        onFlip={() => radioService.flipSide()}
      />

      <div class="controls">
        <DeckFocusTimer />

        <div class="volume">
          <button
            type="button"
            class="mini-key"
            onclick={() => radioService.toggleMute()}
            aria-label={playback.isMuted ? 'Unmute' : 'Mute'}
            title={playback.isMuted ? 'Unmute' : 'Mute'}
            aria-pressed={playback.isMuted}
          >
            <Icon name={level === 0 ? 'volumeMute' : 'volume'} size={12} />
          </button>
          <DeckKnob label="Volume" value={playback.volume} onchange={(v) => radioService.setVolume(v)} />
        </div>
      </div>
    </div>
  </div>

  <footer class="bottom" aria-hidden="true">
    <span class="power">POWER<span class="power-led" class:on={playback.isPlaying || playback.isBuffering}></span></span>
    <span>33 RPM FOCUS RADIO</span>
    <span class="phones">PHONES<span class="jack"></span></span>
  </footer>
</section>

<style>
  /*
   * Deck faceplate artwork: fixed metal, glass and lamp colours (hex
   * allow-listed as retro cassette mechanical artwork). The two finishes are
   * local --dk-* variables, read by the child components.
   */
  .deck {
    --dk-ink: #2A2A2C;
    --dk-muted: #5E5E5C;
    --dk-face:
      repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.07) 0 1px, rgba(0, 0, 0, 0.04) 1px 2px, rgba(255, 255, 255, 0) 2px 3px),
      linear-gradient(180deg, #E4E4E2 0%, #C9C9C7 45%, #B9B9B7 100%);
    --dk-face-edge: 0 1px 0 rgba(255, 255, 255, 0.5) inset, 0 -1px 0 rgba(0, 0, 0, 0.3) inset, 0 12px 28px rgba(0, 0, 0, 0.35);
    --dk-rule: rgba(0, 0, 0, 0.18);
    --dk-key: linear-gradient(180deg, #F4F4F2, #CFCFCC);
    --dk-key-edge: 0 1px 0 #FFFFFF inset, 0 0 0 1px #8E8E8B, 0 2px 0 #9A9A97;
    --dk-key-pressed: 0 0 0 1px #6F6F6C, inset 0 1px 3px rgba(0, 0, 0, 0.35);
    --dk-knob:
      repeating-conic-gradient(rgba(0, 0, 0, 0.05) 0 4deg, rgba(255, 255, 255, 0.08) 4deg 8deg),
      radial-gradient(circle at 35% 30%, #FBFBFA, #B4B4B1 70%, #8D8D8A);
    --dk-knob-edge: 0 0 0 1px #77776F, 0 3px 4px rgba(0, 0, 0, 0.35);
    --dk-led-off: #4A4A47;

    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 18px 10px;
    border-radius: 6px;
    color: var(--dk-ink);
    background: var(--dk-face);
    box-shadow: var(--dk-face-edge);
    font-family: var(--kanso-font-ui);
  }

  :global(html.dark) .deck {
    --dk-ink: #D8C48A;
    --dk-muted: #8F8160;
    --dk-face:
      repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.035) 0 1px, rgba(0, 0, 0, 0.08) 1px 2px, rgba(255, 255, 255, 0) 2px 3px),
      linear-gradient(180deg, #2B2B2E 0%, #1C1C1E 55%, #141415 100%);
    --dk-face-edge: 0 1px 0 rgba(255, 255, 255, 0.12) inset, 0 12px 28px rgba(0, 0, 0, 0.6);
    --dk-rule: rgba(255, 255, 255, 0.07);
    --dk-key: linear-gradient(180deg, #3A3A3D, #232325);
    --dk-key-edge: 0 1px 0 rgba(255, 255, 255, 0.15) inset, 0 0 0 1px #000000, 0 2px 0 #000000;
    --dk-key-pressed: 0 0 0 1px #000000, inset 0 1px 3px rgba(0, 0, 0, 0.7);
    --dk-knob:
      repeating-conic-gradient(rgba(255, 255, 255, 0.04) 0 4deg, rgba(0, 0, 0, 0.1) 4deg 8deg),
      radial-gradient(circle at 35% 30%, #4A4A4D, #1D1D1F 75%);
    --dk-knob-edge: 0 0 0 1px #000000, 0 3px 4px rgba(0, 0, 0, 0.6);
    --dk-led-off: #2C2C2A;
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }

  .brand {
    font-weight: 800;
    font-size: 19px;
    letter-spacing: 0.32em;
  }

  .model {
    font-size: 10px;
    letter-spacing: 0.18em;
    text-align: right;
  }

  .model b {
    font-size: 13px;
    letter-spacing: 0.08em;
    margin-left: 6px;
  }

  :global(html.dark) .model b::after {
    content: ' ES';
  }

  .body {
    display: grid;
    grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
    gap: 16px;
  }

  .left,
  .right {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .door {
    flex: 1;
    display: flex;
    padding: 10px;
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.05));
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35), 0 1px 0 rgba(255, 255, 255, 0.35);
  }

  /* Smoked window with a glass highlight over the cassette. */
  .window {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    padding: 12px 10px;
    border-radius: 3px;
    overflow: hidden;
    background: linear-gradient(160deg, #2A2E33 0%, #121417 60%, #0B0C0E 100%);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.8);
  }

  .window::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(115deg, rgba(255, 255, 255, 0.16) 0 18%, rgba(255, 255, 255, 0) 32%);
  }

  .caption {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    letter-spacing: 0.12em;
    color: var(--dk-muted);
  }

  .controls {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
  }

  .mini-key {
    width: 26px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 2px;
    color: var(--dk-ink);
    background: var(--dk-key);
    box-shadow: var(--dk-key-edge);
    cursor: pointer;
  }

  .mini-key:active,
  .mini-key[aria-pressed='true'] {
    transform: translateY(1px);
    box-shadow: var(--dk-key-pressed);
  }

  .mini-key:focus-visible {
    outline: 2px solid var(--kanso-accent);
    outline-offset: 2px;
  }

  .volume {
    display: flex;
    align-items: flex-end;
    gap: 10px;
  }

  .volume .mini-key {
    margin-bottom: 16px;
  }

  .bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 8px;
    border-top: 1px solid var(--dk-rule);
    font-size: 8.5px;
    letter-spacing: 0.12em;
    color: var(--dk-muted);
  }

  .power,
  .phones {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .power-led {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--dk-led-off);
  }

  .power-led.on {
    background: #FF4D3A;
    box-shadow: 0 0 6px #FF4D3A;
  }

  .jack {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: radial-gradient(circle, #000000 0 3px, #777777 4px 5px, #BBBBBB 6px);
  }

  @media (max-width: 560px) {
    .body {
      grid-template-columns: minmax(0, 1fr);
    }

    .door {
      max-width: 320px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }
  }
</style>
