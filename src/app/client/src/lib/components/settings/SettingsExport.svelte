<script lang="ts">
  /** Settings > Vault > Export settings (P5.3). */
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { exportSettings, SECTION_LABELS, type SectionId } from '$lib/local/settingsFile';

  const NOTES: Partial<Record<SectionId, string>> = {
    studio_profile: 'Includes your bank details.',
    app: 'AI model, device name and vault folder names. Never full paths.'
  };

  let chosen = $state<Record<SectionId, boolean>>({ preferences: true, studio_profile: true, app: true, license: false });
  let includeKey = $state(false);
  let pass = $state('');
  let confirm = $state('');
  let keySaved = $state(false);
  let busy = $state(false);

  const sections = $derived((Object.keys(chosen) as SectionId[]).filter((id) => chosen[id]));
  const passError = $derived(
    !includeKey ? '' : pass.length < 12 ? 'Use at least 12 characters.' : pass !== confirm ? 'The passphrases do not match.' : ''
  );

  onMount(() => {
    ApiClient.getAiStatus().then((s) => (keySaved = s.configured)).catch(() => (keySaved = false));
  });

  async function run() {
    busy = true;
    try {
      const res = await exportSettings(sections, includeKey ? pass : undefined);
      if (!res) return;
      const parts = [`${res.sections.length} section(s)`];
      if (res.aiKey) parts.push('the encrypted AI key');
      if (res.missing.length) parts.push(`skipped ${res.missing.map((m) => SECTION_LABELS[m]).join(', ')} (not found)`);
      if (res.removedPaths.length) parts.push(`left out ${res.removedPaths.length} file path(s)`);
      appState.addToast(`Saved ${parts.join(', ')}.`, 'success', 'Settings exported');
      pass = confirm = '';
    } catch (err: any) {
      appState.addToast(err?.message || String(err), 'error');
    } finally {
      busy = false;
    }
  }
</script>

<section class="card" aria-labelledby="export-title">
  <div>
    <h3 id="export-title" class="title">Export settings</h3>
    <p class="desc">Save your preferences and studio profile to a file you can import on another computer (Windows, macOS or Linux). Vault content stays in the vault folder.</p>
  </div>

  <fieldset class="list">
    <legend class="sr-only">Sections to export</legend>
    {#each Object.keys(chosen) as id (id)}
      {@const sid = id as SectionId}
      <label class="row">
        <input type="checkbox" bind:checked={chosen[sid]} />
        <span class="name">{SECTION_LABELS[sid]}</span>
        {#if NOTES[sid]}<span class="note">{NOTES[sid]}</span>{/if}
      </label>
    {/each}
    <label class="row">
      <input type="checkbox" bind:checked={includeKey} disabled={!keySaved} />
      <span class="name">AI key (encrypted)</span>
      <span class="note">{keySaved ? 'Protected by a passphrase you choose.' : 'No AI key is saved on this computer.'}</span>
    </label>
  </fieldset>

  {#if includeKey}
    <div class="pass">
      <label class="label" for="export-pass">Passphrase</label>
      <input id="export-pass" class="input" type="password" autocomplete="new-password" bind:value={pass} />
      <label class="label" for="export-confirm">Repeat passphrase</label>
      <input id="export-confirm" class="input" type="password" autocomplete="new-password" bind:value={confirm} />
      <p class="hint" class:bad={pass.length > 0 && passError !== ''}>
        {passError || 'You need this passphrase to import the key. It cannot be recovered.'}
      </p>
    </div>
  {/if}

  <div class="actions">
    <button type="button" class="btn primary" onclick={run} disabled={busy || sections.length === 0 || passError !== ''}>
      {busy ? 'Exporting...' : 'Export settings...'}
    </button>
  </div>
</section>

<style>
  .card { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .desc { margin: 4px 0 0 0; font-size: 12.5px; line-height: 1.5; color: var(--kanso-text-muted); max-width: 620px; }
  .list { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: 13px; color: var(--kanso-text-primary); cursor: pointer; }
  .row input { accent-color: var(--kanso-accent); }
  .name { font-weight: 600; }
  .note { font-size: 12px; color: var(--kanso-text-muted); }
  .pass { display: grid; grid-template-columns: max-content minmax(0, 320px); gap: 8px 12px; align-items: center; }
  .label { font-size: 12px; font-weight: 600; color: var(--kanso-text-muted); }
  .input { height: 34px; padding: 0 10px; border-radius: 6px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); font-size: 13px; }
  .input:focus { outline: none; border-color: var(--kanso-accent); }
  .hint { grid-column: 1 / -1; margin: 0; font-size: 12px; color: var(--kanso-text-muted); }
  .hint.bad { color: var(--kanso-danger); }
  .actions { display: flex; justify-content: flex-end; }
  .btn { border-radius: 6px; font-size: 12px; font-weight: 600; padding: 8px 14px; cursor: pointer; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); }
  .btn.primary { background: var(--kanso-accent); border-color: var(--kanso-accent); color: var(--kanso-canvas); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
