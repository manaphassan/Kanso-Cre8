<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { vaultStore } from '$lib/stores/vaultStore.svelte';

  interface Props {
    onChanged?: () => void;
  }

  let { onChanged }: Props = $props();

  let status = $state<Awaited<ReturnType<typeof ApiClient.getDemoDataStatus>> | null>(null);
  let busy = $state(false);
  let confirming = $state(false);
  let typed = $state('');

  const folderName = $derived((status?.workspaceRoot || '').split(/[\\/]/).filter(Boolean).pop() || '');

  async function refresh() {
    try {
      status = await ApiClient.getDemoDataStatus();
    } catch {
      status = null;
    }
  }

  async function reloadApp() {
    await projectStore.loadProjects();
    await projectStore.loadDashboard();
    await vaultStore.scanVault();
    await refresh();
    onChanged?.();
  }

  async function load() {
    busy = true;
    try {
      await ApiClient.loadDemoData();
      await reloadApp();
      appState.addToast('Sample clients, projects, quote and notes added.', 'success', 'Demo Data Loaded');
    } catch (err: any) {
      appState.addToast(`Could not load demo data: ${err.message}`, 'error');
    } finally {
      busy = false;
    }
  }

  async function clearAll() {
    busy = true;
    try {
      const res = await ApiClient.clearDemoData(typed.trim());
      confirming = false;
      typed = '';
      await reloadApp();
      const skipped = res.skipped?.length ? ` ${res.skipped.length} kept (your own files).` : '';
      appState.addToast(`Removed ${res.removed.length} demo item(s).${skipped}`, 'success', 'Vault Cleaned');
    } catch (err: any) {
      appState.addToast(err.message, 'error');
    } finally {
      busy = false;
    }
  }

  onMount(refresh);
</script>

<div class="demo-card">
  <div class="demo-head">
    <div>
      <h3 class="demo-title">Demo Data</h3>
      <p class="demo-desc">
        Sample profiles (Acme Corp, Nexus Studio, Lumina Labs) with 3 projects, a quote and starter notes.
        {status?.present ? 'Currently present in this vault.' : 'Your vault is clean.'}
      </p>
    </div>
    <div class="demo-actions">
      <button type="button" class="demo-btn" onclick={load} disabled={busy || !status}>Load Demo Data</button>
      <button type="button" class="demo-btn danger" onclick={() => (confirming = true)} disabled={busy || !status?.present}>
        Remove Demo Data
      </button>
    </div>
  </div>

  {#if confirming && status}
    <div class="confirm-box">
      <p class="confirm-text">
        This permanently deletes {status.items.length} demo item(s) ({status.totalFiles} files):
        {status.items.map((i) => i.label).join(', ')}. Your own clients, projects and notes are not touched.
      </p>
      <label class="confirm-label" for="demo-confirm">Type <strong>{folderName}</strong> to confirm</label>
      <div class="confirm-row">
        <input id="demo-confirm" class="confirm-input" bind:value={typed} autocomplete="off" />
        <button type="button" class="demo-btn danger" onclick={clearAll} disabled={busy || typed.trim() !== folderName}>
          {busy ? 'Removing...' : 'Delete Demo Data'}
        </button>
        <button type="button" class="demo-btn" onclick={() => { confirming = false; typed = ''; }} disabled={busy}>Cancel</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .demo-card { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .demo-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
  .demo-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .demo-desc { margin: 4px 0 0 0; font-size: 12.5px; color: var(--kanso-text-muted); max-width: 560px; }
  .demo-actions { display: flex; gap: 8px; }
  .demo-btn { border-radius: 6px; font-size: 12px; font-weight: 600; padding: 8px 14px; cursor: pointer; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); }
  .demo-btn.danger { border-color: var(--kanso-danger); color: var(--kanso-danger); }
  .demo-btn:hover:not(:disabled) { opacity: 0.85; }
  .demo-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .confirm-box { background: var(--kanso-canvas); border: 1px solid var(--kanso-danger); border-radius: 6px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
  .confirm-text { margin: 0; font-size: 12.5px; color: var(--kanso-text-primary); line-height: 1.4; }
  .confirm-label { font-size: 12px; color: var(--kanso-text-muted); }
  .confirm-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .confirm-input { flex: 1; min-width: 160px; height: 34px; padding: 0 10px; border-radius: 6px; background: var(--kanso-surface); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); font-size: 13px; }
  .confirm-input:focus { outline: none; border-color: var(--kanso-danger); }
</style>
