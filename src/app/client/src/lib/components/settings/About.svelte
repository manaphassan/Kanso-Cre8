<script lang="ts">
  import AboutHero from './AboutHero.svelte';
  import PillarsBento from './PillarsBento.svelte';
  import EditionLicense from './EditionLicense.svelte';
</script>

<div class="settings-grid">
  <AboutHero />
  <EditionLicense />
  <PillarsBento />
</div>

<style>
  .settings-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
</style>
