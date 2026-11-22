<script lang="ts">
  /** Settings > About: the update-check switch and a manual check. */
  import { onMount } from 'svelte';
  import { updateStore } from '$lib/stores/updateStore.svelte';
  import { APP_VERSION } from '$lib/version';

  onMount(() => {
    updateStore.load();
  });

  const info = $derived(updateStore.info);
</script>

<section class="card" aria-labelledby="updates-title">
  <div class="head">
    <div>
      <h3 id="updates-title" class="title">Updates</h3>
      <p class="desc">You have Kanso Cre8 {APP_VERSION}. Updates are signed; an update without the Kanso Cre8 signature is never installed.</p>
    </div>
    <button type="button" class="btn" onclick={() => updateStore.check()} disabled={updateStore.checking}>
      {updateStore.checking ? 'Checking...' : 'Check now'}
    </button>
  </div>

  <label class="row">
    <input type="checkbox" checked={updateStore.enabled === true} onchange={(e) => updateStore.setEnabled(e.currentTarget.checked)} />
    <span>Check for new versions once a day</span>
  </label>

  {#if info}
    {#if info.available}
      <div class="row">
        <span class="ok">Version {info.version} is available.</span>
        {#if info.canInstall}
          <button type="button" class="btn primary" onclick={() => updateStore.install()} disabled={updateStore.installing}>
            {updateStore.installing ? 'Installing...' : 'Install and restart'}
          </button>
        {:else}
          <button type="button" class="btn primary" onclick={() => updateStore.openReleases()}>Download from the releases page</button>
        {/if}
      </div>
      {#if !info.canInstall}<p class="desc">The portable edition is updated by replacing its folder; your Data folder can be copied over.</p>{/if}
    {:else}
      <p class="desc">Kanso Cre8 is up to date.</p>
    {/if}
  {:else if updateStore.error}
    <p class="desc bad" role="status">{updateStore.error}</p>
  {/if}
</section>

<style>
  .card { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 12px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
  .title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .desc { margin: 4px 0 0 0; font-size: 12.5px; line-height: 1.5; color: var(--kanso-text-muted); }
  .desc.bad { color: var(--kanso-danger); }
  .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--kanso-text-primary); }
  .row input { accent-color: var(--kanso-accent); }
  .ok { color: var(--kanso-success); font-weight: 600; }
  .btn { border-radius: 6px; font-size: 12px; font-weight: 600; padding: 8px 14px; cursor: pointer; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); }
  .btn.primary { background: var(--kanso-accent); border-color: var(--kanso-accent); color: var(--kanso-canvas); }
  .btn:disabled { opacity: 0.6; cursor: wait; }
</style>
