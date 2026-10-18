<script lang="ts">
  import { onMount } from 'svelte';
  import { radioService } from '$lib/services/radioService.svelte';
  import Deck from './Deck.svelte';
  import Presets from './Presets.svelte';

  let isRackVisible = $state(true);

  const stations = $derived(radioService.stations);
  const currentStation = $derived(radioService.currentStation);
  const playbackState = $derived(radioService.state);
  const favoriteStationIds = $derived(radioService.favoriteStationIds);

  function handleRewind() {
    const idx = stations.findIndex(s => s.id === playbackState.currentStationId);
    const prev = (idx - 1 + stations.length) % stations.length;
    radioService.tune(stations[prev].id);
  }

  function handleFastForward() {
    const idx = stations.findIndex(s => s.id === playbackState.currentStationId);
    const next = (idx + 1) % stations.length;
    radioService.tune(stations[next].id);
  }

  onMount(() => {
    radioService.init();
  });
</script>

<div class="cassette-deck-view">
  <Deck
    station={currentStation}
    onRewind={handleRewind}
    onFastForward={handleFastForward}
    onToggleRack={() => (isRackVisible = !isRackVisible)}
    {isRackVisible}
  />

  {#if isRackVisible}
    <Presets
      {stations}
      currentStationId={playbackState.currentStationId}
      {favoriteStationIds}
      onTuneStation={(id) => radioService.tune(id)}
      onToggleFavorite={(id) => radioService.toggleFavorite(id)}
      onNewCustomStation={() => {
        // triggers custom station dialog in radio service or modal
      }}
    />
  {/if}
</div>

<style>
  .cassette-deck-view {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
</style>
