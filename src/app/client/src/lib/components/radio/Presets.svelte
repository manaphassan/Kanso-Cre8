<script lang="ts">
  import { radioService, type RadioStation } from '$lib/services/radioService.svelte';
  import { ambientAudioService } from '$lib/services/ambientAudioService.svelte';
  import CassetteTapeCard from './CassetteTapeCard.svelte';
  import CassetteBlankCard from './CassetteBlankCard.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    stations: RadioStation[];
    currentStationId: string;
    favoriteStationIds: string[];
    onTuneStation: (id: string) => void;
    onToggleFavorite: (id: string) => void;
    onNewCustomStation: () => void;
  }

  let {
    stations,
    currentStationId,
    favoriteStationIds,
    onTuneStation,
    onToggleFavorite,
    onNewCustomStation
  }: Props = $props();

  let searchQuery = $state('');

  const filteredStations = $derived(
    stations.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.genre.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<div class="presets-container card-surface">
  <div class="presets-header">
    <div class="presets-titles">
      <span class="presets-badge">STUDIO CASSETTE RACK</span>
      <h3 class="presets-title">Curated Focus Streams &amp; Mixtapes</h3>
    </div>

    <div class="presets-actions">
      <input
        type="text"
        class="search-input"
        placeholder="Filter stations..."
        bind:value={searchQuery}
      />
      <button type="button" class="btn-new-tape" onclick={onNewCustomStation}>
        + Custom Tape
      </button>
    </div>
  </div>

  <!-- Ambient Soundboard Mini Bar -->
  <div class="soundboard-strip">
    <span class="soundboard-label">AMBIENT ACOUSTICS:</span>
    <button
      type="button"
      class="soundboard-chip"
      class:active={ambientAudioService.isCrackleActive}
      onclick={() => ambientAudioService.toggleCrackle()}
    >
      Vinyl Crackle {ambientAudioService.isCrackleActive ? 'ON' : 'OFF'}
    </button>
    <button
      type="button"
      class="soundboard-chip"
      class:active={ambientAudioService.isRainActive}
      onclick={() => ambientAudioService.toggleRain()}
    >
      Studio Rain {ambientAudioService.isRainActive ? 'ON' : 'OFF'}
    </button>
    <button
      type="button"
      class="soundboard-chip"
      class:active={ambientAudioService.isGammaActive}
      onclick={() => ambientAudioService.toggleGamma()}
    >
      40Hz Gamma {ambientAudioService.isGammaActive ? 'ON' : 'OFF'}
    </button>
  </div>

  <!-- Stations Cards Grid -->
  <div class="rack-cards-grid">
    {#each filteredStations as st (st.id)}
      <CassetteTapeCard
        station={st}
        isSelected={currentStationId === st.id}
        onclick={() => onTuneStation(st.id)}
      />
    {/each}

    <!-- Blank Tape Card -->
    <CassetteBlankCard onclick={onNewCustomStation} />
  </div>
</div>

<style>
  .card-surface {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 24px;
    margin-top: 24px;
  }
  .presets-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .presets-titles {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .presets-badge {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-accent);
  }
  .presets-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .presets-actions {
    display: flex;
    gap: 8px;
  }
  .search-input {
    height: 32px;
    padding: 0 12px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    color: var(--kanso-text-primary);
    font-size: 12px;
  }
  .btn-new-tape {
    height: 32px;
    padding: 0 14px;
    background: var(--kanso-accent);
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 600;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  .soundboard-strip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    margin-bottom: 20px;
  }
  .soundboard-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-text-muted);
  }
  .soundboard-chip {
    padding: 4px 10px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    cursor: pointer;
  }
  .soundboard-chip.active {
    color: var(--kanso-accent);
    border-color: var(--kanso-accent);
  }
  .rack-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }
</style>
