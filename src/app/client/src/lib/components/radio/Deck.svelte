<script lang="ts">
  /**
   * The cassette deck faceplate: display window, cassette bay, VU meters and
   * one row of transport keys, as on a real deck.
   */
  import { radioService, type RadioStation } from '$lib/services/radioService.svelte';
  import AnalogVuMeter from './AnalogVuMeter.svelte';
  import CassetteShell from './CassetteShell.svelte';
  import DeckDisplay from './DeckDisplay.svelte';
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

  // Mechanical tape index: one count per second of play.
  let tapeIndex = $state(0);
  $effect(() => {
    if (!playback.isPlaying) return;
    const id = setInterval(() => (tapeIndex = (tapeIndex + 1) % 10000), 1000);
    return () => clearInterval(id);
  });
</script>

<section class="deck" aria-label="Cassette deck">
  <DeckDisplay
    frequency={station.frequency}
    stationName={station.name}
    {track}
    {status}
    index={tapeIndex}
    side={playback.tapeSide}
    onResetIndex={() => (tapeIndex = 0)}
  />

  <div class="bay">
    <div class="door">
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

  <div class="meters">
    <AnalogVuMeter isPlaying={playback.isPlaying} volume={playback.isMuted ? 0 : playback.volume} />
  </div>

  <DeckTransport
    isPlaying={playback.isPlaying}
    isBuffering={playback.isBuffering}
    volume={playback.volume}
    isMuted={playback.isMuted}
    side={playback.tapeSide}
    {onRewind}
    onPlayPause={() => radioService.toggle()}
    onStop={() => radioService.stop()}
    {onFastForward}
    onFlip={() => radioService.flipSide()}
    onVolume={(v) => radioService.setVolume(v)}
    onMute={() => radioService.toggleMute()}
  />
</section>

<style>
  .deck {
    display: flex;
    flex-direction: column;
    gap: var(--kanso-space-4);
    padding: var(--kanso-space-4);
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-lg);
    box-shadow: var(--neu-shadow-raised, none);
  }

  /* The cassette sits behind a recessed door, as in a real deck well. */
  .bay {
    padding: var(--kanso-space-3);
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    box-shadow: var(--neu-shadow-inset, none);
  }

  .door {
    max-width: 440px;
    margin: 0 auto;
  }

  .meters {
    display: flex;
    justify-content: center;
  }
</style>
