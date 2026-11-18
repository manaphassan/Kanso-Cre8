<script lang="ts">
  /**
   * Settings > AI (P3.4): one key field, Test, Clear and the model select.
   * The key goes to Rust once and is cleared from this form; the app only
   * ever learns whether a key is saved and where.
   */
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';

  type Status = Awaited<ReturnType<typeof ApiClient.getAiStatus>>;

  let status = $state<Status | null>(null);
  let keyInput = $state('');
  let busy = $state<'save' | 'test' | 'clear' | 'model' | null>(null);
  let result = $state<{ ok: boolean; text: string } | null>(null);
  let online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);

  async function refresh() {
    try {
      status = await ApiClient.getAiStatus();
    } catch (err: any) {
      result = { ok: false, text: err?.message || String(err) };
    }
  }

  async function run(kind: NonNullable<typeof busy>, work: () => Promise<void>) {
    busy = kind;
    result = null;
    try {
      await work();
    } catch (err: any) {
      result = { ok: false, text: err?.message || String(err) };
    } finally {
      busy = null;
    }
  }

  const save = () =>
    run('save', async () => {
      const res = await ApiClient.saveAiConfig({ apiKey: keyInput });
      keyInput = '';
      status = res.status;
      appState.addToast(`AI key saved in ${res.status.keychainName}.`, 'success');
    });

  const test = () =>
    run('test', async () => {
      const res = await ApiClient.testAiKey();
      result = { ok: true, text: `Connected to ${res.model}. Test reply in ${(res.elapsedMs / 1000).toFixed(1)} s.` };
    });

  const clear = () =>
    run('clear', async () => {
      status = (await ApiClient.clearAiKey()).status;
      appState.addToast('AI key removed from this computer.', 'info');
    });

  const pickModel = (model: string) =>
    run('model', async () => {
      status = (await ApiClient.saveAiConfig({ apiKey: '', preferredModel: model })).status;
    });

  onMount(() => {
    refresh();
    const update = () => (online = navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  });
</script>

<section class="ai-card" aria-labelledby="ai-title">
  <div>
    <h3 id="ai-title" class="ai-title">AI assistant</h3>
    <p class="ai-desc">
      Bring your own Gemini API key from
      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">aistudio.google.com</a>.
      It is stored in {status?.keychainName ?? 'your system keychain'}, never in the vault, and is never sent back to this window.
    </p>
  </div>

  {#if status?.storage === 'file'}
    <p class="line warn"><Icon name="warning" size={13} /> No system keyring was found, so the key is saved in app.json on this computer, readable only by your user.</p>
  {/if}

  <div class="field">
    <label for="ai-key" class="label">API key</label>
    {#if status?.configured}
      <p class="line ok"><span class="dot" aria-hidden="true"></span>Key saved in {status.storage === 'file' ? 'app.json' : status.keychainName}</p>
    {/if}
    <div class="row">
      <input
        id="ai-key"
        class="input"
        type="password"
        autocomplete="off"
        spellcheck="false"
        placeholder={status?.configured ? 'Paste a new key to replace it' : 'Paste your Gemini API key'}
        bind:value={keyInput}
        onkeydown={(e) => e.key === 'Enter' && keyInput.trim() && save()}
      />
      <button type="button" class="btn primary" onclick={save} disabled={!keyInput.trim() || busy !== null}>
        {busy === 'save' ? 'Saving...' : 'Save'}
      </button>
    </div>
    {#if status?.configured}
      <div class="row end">
        <button type="button" class="btn" onclick={test} disabled={!online || busy !== null}>{busy === 'test' ? 'Testing...' : 'Test'}</button>
        <button type="button" class="btn danger" onclick={clear} disabled={busy !== null}>Clear key</button>
      </div>
    {/if}
  </div>

  <div class="field">
    <label for="ai-model" class="label">Model</label>
    <select
      id="ai-model"
      class="input select"
      value={status?.preferredModel}
      disabled={!status || busy !== null}
      onchange={(e) => pickModel(e.currentTarget.value)}
    >
      {#each status?.availableModels ?? [] as model (model)}
        <option value={model}>{model}</option>
      {/each}
    </select>
  </div>

  {#if !online}
    <p class="line muted"><Icon name="info" size={13} /> You are offline. AI requests are off until you reconnect.</p>
  {/if}
  {#if result}
    <p class="line" class:ok={result.ok} class:bad={!result.ok} role="status">
      <Icon name={result.ok ? 'checkCircle' : 'warning'} size={13} />{result.text}
    </p>
  {/if}

  <p class="line muted">Only the text you send is shared with the AI provider.</p>
</section>

<style>
  .ai-card { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 16px; max-width: 640px; }
  .ai-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .ai-desc { margin: 4px 0 0 0; font-size: 12.5px; line-height: 1.5; color: var(--kanso-text-muted); }
  .ai-desc a { color: var(--kanso-accent); }
  .field { display: flex; flex-direction: column; gap: 8px; }
  .label { font-size: 12px; font-weight: 600; color: var(--kanso-text-primary); }
  .row { display: flex; gap: 8px; flex-wrap: wrap; }
  .row.end { justify-content: flex-end; }
  .input { flex: 1; min-width: 200px; height: 34px; padding: 0 10px; border-radius: 6px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); font-family: var(--kanso-font-mono); font-size: 13px; }
  .input:focus { outline: none; border-color: var(--kanso-accent); }
  .select { font-family: var(--kanso-font-ui); max-width: 280px; }
  .btn { border-radius: 6px; font-size: 12px; font-weight: 600; padding: 8px 14px; cursor: pointer; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); }
  .btn.primary { background: var(--kanso-accent); border-color: var(--kanso-accent); color: var(--kanso-canvas); }
  .btn.danger { border-color: var(--kanso-danger); color: var(--kanso-danger); }
  .btn:hover:not(:disabled) { opacity: 0.85; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .line { margin: 0; display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--kanso-text-primary); }
  .line.ok { color: var(--kanso-success); }
  .line.bad { color: var(--kanso-danger); }
  .line.warn { color: var(--kanso-warning); }
  .line.muted { color: var(--kanso-text-muted); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--kanso-success); }
</style>
