<script lang="ts">
  import { onMount } from 'svelte';
  import { radioService } from '$lib/services/radioService.svelte';
  import { Icon } from '$lib/components/ui';
  import Deck from './Deck.svelte';
  import Presets from './Presets.svelte';
  import Timer from './Timer.svelte';

  let isRackVisible = $state(true);

  const stations = $derived(radioService.stations);
  const currentStation = $derived(radioService.currentStation);
  const playbackState = $derived(radioService.state);
  const favoriteStationIds = $derived(radioService.favoriteStationIds);

  function step(delta: number) {
    const idx = stations.findIndex(s => s.id === playbackState.currentStationId);
    radioService.tune(stations[(idx + delta + stations.length) % stations.length].id);
  }

  onMount(() => {
    radioService.init();
  });
</script>

<div class="cassette-deck-view">
  <Deck station={currentStation} onRewind={() => step(-1)} onFastForward={() => step(1)} />

  <Timer />

  <div class="rack-toggle-row">
    <button
      type="button"
      class="rack-toggle"
      onclick={() => (isRackVisible = !isRackVisible)}
      aria-expanded={isRackVisible}
    >
      <Icon name={isRackVisible ? 'chevronUp' : 'chevronDown'} size={14} />
      {isRackVisible ? 'Hide tape rack' : 'Show tape rack'}
    </button>
  </div>

  {#if isRackVisible}
    <Presets
      {stations}
      currentStationId={playbackState.currentStationId}
      {favoriteStationIds}
      onTuneStation={(id) => radioService.tune(id)}
      onToggleFavorite={(id) => radioService.toggleFavorite(id)}
      onNewCustomStation={() => {}}
    />
  {/if}
</div>

<style>
  .cassette-deck-view {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--kanso-space-4);
  }

  .rack-toggle-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: calc(-1 * var(--kanso-space-2));
  }

  .rack-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 600;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--kanso-radius-sm);
    color: var(--kanso-text-muted);
    cursor: pointer;
  }

  .rack-toggle:hover {
    color: var(--kanso-text-primary);
    border-color: var(--kanso-border);
  }
</style>
