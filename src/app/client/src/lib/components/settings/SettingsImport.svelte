<script lang="ts">
  /**
   * Settings > Vault > Import settings (P5.4): pick a file, preview each
   * section, choose Replace or Skip, give the passphrase if the file holds
   * the AI key, and ask for the vault folder first when none is open.
   */
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { pickFolder } from '$lib/local/dialog';
  import {
    importSettings,
    inspectSettings,
    pickSettingsFile,
    SECTION_LABELS,
    type SectionId,
    type SettingsPreview
  } from '$lib/local/settingsFile';

  let path = $state<string | null>(null);
  let preview = $state<SettingsPreview | null>(null);
  let replace = $state<Partial<Record<SectionId, boolean>>>({});
  let importKey = $state(false);
  let pass = $state('');
  let busy = $state(false);
  let error = $state('');

  const present = $derived(preview?.sections.filter((s) => s.present) ?? []);
  const chosen = $derived(present.filter((s) => replace[s.id]).map((s) => s.id));
  const needsVault = $derived(!!preview && !preview.vaultOpen && chosen.some((id) => id !== 'app'));
  const fileName = $derived(path?.split(/[\\/]/).pop() ?? '');
  const platform = (p: string) => ({ windows: 'Windows', macos: 'macOS', linux: 'Linux' })[p] ?? p;

  function summary(s: SettingsPreview['sections'][number]): string {
    const { added, changed, removed } = s.changes;
    if (!added.length && !changed.length && !removed.length) return 'Same as on this computer';
    const bits = [
      added.length ? `${added.length} new` : '',
      changed.length ? `${changed.length} changed` : '',
      removed.length ? `${removed.length} removed` : ''
    ].filter(Boolean);
    return `${bits.join(', ')}: ${[...added, ...changed, ...removed].join(', ')}`;
  }

  async function load(p: string) {
    error = '';
    preview = await inspectSettings(p);
    path = p;
    replace = Object.fromEntries(preview.sections.filter((s) => s.present).map((s) => [s.id, s.id !== 'license']));
    importKey = preview.hasAiKey;
  }

  async function choose() {
    try {
      const p = await pickSettingsFile();
      if (p) await load(p);
    } catch (err: any) {
      error = err?.message || String(err);
      preview = null;
    }
  }

  async function openVault() {
    const folder = await pickFolder('Choose the vault folder on this computer');
    if (!folder || !path) return;
    try {
      await ApiClient.setWorkspaceRoot(folder);
      await load(path);
    } catch (err: any) {
      error = err?.message || String(err);
    }
  }

  async function apply() {
    if (!path) return;
    busy = true;
    error = '';
    try {
      const res = await importSettings(path, chosen, importKey ? pass : undefined);
      pass = '';
      const names = res.applied.map((id) => SECTION_LABELS[id]).join(', ') || 'nothing';
      appState.addToast(`Imported ${names}${res.aiKey ? ' and the AI key' : ''}. Reloading...`, 'success', 'Settings imported');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      error = err?.message || String(err);
    } finally {
      busy = false;
    }
  }
</script>

<section class="card" aria-labelledby="import-title">
  <div class="head">
    <div>
      <h3 id="import-title" class="title">Import settings</h3>
      <p class="desc">Bring in a settings file exported on this or another computer. Nothing changes until you press Import.</p>
    </div>
    <button type="button" class="btn" onclick={choose} disabled={busy}>{preview ? 'Choose another file...' : 'Choose file...'}</button>
  </div>

  {#if preview}
    <p class="meta">
      <strong>{fileName}</strong>, exported {preview.exportedAt.slice(0, 10)} on {platform(preview.sourcePlatform)} (Kanso Cre8 {preview.appVersion})
    </p>
    <ul class="sections">
      {#each preview.sections as s (s.id)}
        <li class:absent={!s.present}>
          <label class="row">
            <input type="checkbox" bind:checked={replace[s.id]} disabled={!s.present} />
            <span class="name">{SECTION_LABELS[s.id]}</span>
            <span class="mode">{!s.present ? 'Not in file' : replace[s.id] ? 'Replace' : 'Skip'}</span>
          </label>
          {#if s.present}<p class="detail">{summary(s)}</p>{/if}
          {#if s.removedPaths.length}<p class="detail warn">File paths from the other computer are left out: {s.removedPaths.join(', ')}</p>{/if}
        </li>
      {/each}
    </ul>

    {#if preview.recentVaultNames.length}
      <p class="detail">Vault folders used on the other computer: {preview.recentVaultNames.join(', ')}</p>
    {/if}

    {#if preview.hasAiKey}
      <div class="key">
        <label class="row"><input type="checkbox" bind:checked={importKey} /><span class="name">AI key</span><span class="mode">{importKey ? 'Import' : 'Skip'}</span></label>
        {#if importKey}
          <input class="input" type="password" autocomplete="off" placeholder="Passphrase used at export" aria-label="Passphrase" bind:value={pass} />
        {/if}
      </div>
    {/if}

    {#if needsVault}
      <div class="vault">
        <p class="detail warn">No vault is open. Choose the vault folder on this computer to import the vault sections.</p>
        <button type="button" class="btn" onclick={openVault}>Choose vault folder...</button>
      </div>
    {/if}

    <div class="actions">
      <button type="button" class="btn primary" onclick={apply} disabled={busy || needsVault || (!chosen.length && !importKey) || (importKey && !pass)}>
        {busy ? 'Importing...' : 'Import'}
      </button>
    </div>
  {/if}

  {#if error}<p class="detail bad" role="alert">{error}</p>{/if}
</section>

<style>
  .card { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
  .title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .desc { margin: 4px 0 0 0; font-size: 12.5px; color: var(--kanso-text-muted); }
  .meta { margin: 0; font-size: 12.5px; color: var(--kanso-text-primary); }
  .sections { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .sections li { padding: 10px 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; }
  .sections li.absent { opacity: 0.55; }
  .row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--kanso-text-primary); }
  .row input { accent-color: var(--kanso-accent); }
  .name { font-weight: 600; }
  .mode { margin-left: auto; font-size: 11.5px; font-weight: 600; color: var(--kanso-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .detail { margin: 4px 0 0 0; font-size: 12px; line-height: 1.45; color: var(--kanso-text-muted); word-break: break-word; }
  .detail.warn { color: var(--kanso-warning); }
  .detail.bad { color: var(--kanso-danger); }
  .key, .vault { display: flex; flex-direction: column; gap: 8px; }
  .input { height: 34px; max-width: 320px; padding: 0 10px; border-radius: 6px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); font-size: 13px; }
  .input:focus { outline: none; border-color: var(--kanso-accent); }
  .actions { display: flex; justify-content: flex-end; }
  .btn { align-self: flex-start; border-radius: 6px; font-size: 12px; font-weight: 600; padding: 8px 14px; cursor: pointer; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); }
  .btn.primary { background: var(--kanso-accent); border-color: var(--kanso-accent); color: var(--kanso-canvas); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
