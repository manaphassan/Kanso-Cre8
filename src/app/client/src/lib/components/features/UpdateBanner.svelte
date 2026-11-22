<script lang="ts">
  /** First-run question about update checks, then "new version" notices. */
  import { onMount } from 'svelte';
  import { updateStore } from '$lib/stores/updateStore.svelte';
  import { Icon } from '$lib/components/ui';

  onMount(() => {
    updateStore.load();
  });

  const info = $derived(updateStore.info);
</script>

{#if updateStore.loaded && updateStore.enabled === null}
  <div class="bar" role="region" aria-label="Update checks">
    <Icon name="download" size={14} />
    <span>Check for new versions of Kanso Cre8 once a day? Only the update file is downloaded from GitHub; none of your data is sent.</span>
    <button type="button" class="btn primary" onclick={() => updateStore.setEnabled(true)}>Yes, check</button>
    <button type="button" class="btn" onclick={() => updateStore.setEnabled(false)}>No</button>
  </div>
{:else if info?.available && !updateStore.dismissed}
  <div class="bar" role="status">
    <Icon name="download" size={14} />
    <span>Kanso Cre8 {info.version} is available (you have {info.currentVersion}).</span>
    {#if info.canInstall}
      <button type="button" class="btn primary" onclick={() => updateStore.install()} disabled={updateStore.installing}>
        {updateStore.installing ? 'Installing...' : 'Install and restart'}
      </button>
    {:else}
      <button type="button" class="btn primary" onclick={() => updateStore.openReleases()}>Download</button>
    {/if}
    <button type="button" class="dismiss" onclick={() => (updateStore.dismissed = true)} aria-label="Dismiss">
      <Icon name="close" size={13} />
    </button>
  </div>
{/if}

<style>
  .bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 0 0 12px 0; padding: 8px 12px; border: 1px solid var(--kanso-accent); border-radius: 6px; background: var(--kanso-surface); color: var(--kanso-text-primary); font-size: 12.5px; }
  .bar :global(svg) { color: var(--kanso-accent); flex-shrink: 0; }
  .bar span { flex: 1; min-width: 220px; }
  .btn { border-radius: 6px; font-size: 12px; font-weight: 600; padding: 6px 12px; cursor: pointer; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); }
  .btn.primary { background: var(--kanso-accent); border-color: var(--kanso-accent); color: var(--kanso-canvas); }
  .btn:disabled { opacity: 0.6; cursor: wait; }
  .dismiss { display: inline-flex; padding: 4px; background: none; border: 1px solid transparent; border-radius: 4px; color: var(--kanso-text-muted); cursor: pointer; }
  .dismiss:hover { color: var(--kanso-text-primary); border-color: var(--kanso-border); }
</style>
