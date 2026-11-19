<script lang="ts">
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { vaultStore } from '$lib/stores/vaultStore.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { journalService } from '$lib/services/journalService';
  import { financeService } from '$lib/services/financeService';
  import { getAppMode, type AppMode } from '$lib/local/appMode';
  import { onMount } from 'svelte';

  interface Props {
    currentVaultRoot: string;
    vaultHealth: any;
    onVaultMounted: (newRoot: string) => void;
  }

  let { currentVaultRoot, vaultHealth, onVaultMounted }: Props = $props();

  let customVaultInput = $state('');
  let isMountingVault = $state(false);
  let appMode = $state<AppMode | null>(null);

  onMount(() => {
    getAppMode().then((m) => (appMode = m)).catch(() => (appMode = null));
  });

  $effect(() => {
    customVaultInput = currentVaultRoot;
  });

  async function handleMountVault(targetPath: string) {
    if (!targetPath || !targetPath.trim()) {
      appState.addToast('Please specify a valid filesystem directory path.', 'warning');
      return;
    }
    isMountingVault = true;
    try {
      const res = await ApiClient.setWorkspaceRoot(targetPath.trim());
      if (res && res.success) {
        journalService.purgeCache();
        await financeService.resetToDisk();
        await projectStore.loadProjects();
        await projectStore.loadDashboard();
        await vaultStore.scanVault();
        onVaultMounted(res.workspaceRoot);
        appState.addToast(`Active vault mounted at ${res.workspaceRoot}`, 'success', 'Vault Mounted');
      } else {
        appState.addToast(res?.message || 'Failed to mount vault directory.', 'error');
      }
    } catch (err: any) {
      appState.addToast(`Vault mount error: ${err.message}`, 'error');
    } finally {
      isMountingVault = false;
    }
  }
</script>

<div class="card-surface">
  <div class="card-header">
    <div class="card-header-badge-row">
      <h2 class="card-title">Active Vault Mount &amp; Directory Path</h2>
      <span class="storage-pill">Pure Markdown</span>
    </div>
    <p class="card-subtitle">Direct plain-text filesystem synchronization. Connect any local NVMe, Dropbox, or Synology Drive workspace.</p>
  </div>

  <div class="active-vault-banner">
    <div class="vault-mount-meta">
      <div class="vault-status-indicator">
        <span class="status-pulse-dot"></span>
        <span class="status-text">{vaultHealth?.workspaceExists !== false ? 'Mounted & Verified' : 'Checking Path...'}</span>
      </div>
      <div class="vault-path-text" title={currentVaultRoot || vaultStore.config.rootPath}>
        {currentVaultRoot || vaultStore.config.rootPath}
      </div>
    </div>

    <div class="vault-mount-tags">
      {#if vaultHealth?.cachedProjects}
        <span class="tag-chip">{vaultHealth.cachedProjects} Projects Indexed</span>
      {/if}
      <span class="tag-chip">Lossless UTF-8</span>
      <span class="tag-chip">Universal Cloud Sync</span>
    </div>
  </div>

  {#if appMode}
    <div class="mode-row" role="status">
      <span class="mode-label">App mode</span>
      <span class="mode-value">
        {appMode.mode === 'portable' ? `Portable: ${appMode.appDir}` : 'Installed'}
      </span>
    </div>
    {#if appMode.mode === 'portable'}
      <p class="mode-note">
        Settings are kept in the Data folder beside the app. A vault on the same drive is remembered relative to the app folder, so a new drive letter does not break it.
        {#if appMode.externalDrive}You will be reminded to eject {appMode.externalDrive} when the app closes.{/if}
      </p>
    {:else if appMode.portableRefused}
      <p class="mode-note warn">{appMode.portableRefused}</p>
    {/if}
  {/if}

  <div class="custom-mount-box">
    <label class="form-label" for="custom-vault-path">Switch or Mount Custom Vault Directory</label>
    <div class="mount-input-row">
      <input
        id="custom-vault-path"
        type="text"
        class="form-input flex-1"
        bind:value={customVaultInput}
        placeholder="e.g. D:\OneDrive\Vault or /home/designer/AtelierVault"
      />
      <button
        type="button"
        class="btn-primary"
        onclick={() => handleMountVault(customVaultInput)}
        disabled={isMountingVault || !customVaultInput.trim()}
      >
        {isMountingVault ? 'Mounting...' : 'Mount & Rescan Vault'}
      </button>
    </div>
    <p class="mount-hint">
      Kanso Cre8 will instantly re-index all Markdown client profiles, project folders, and bullet journals in real-time.
    </p>
  </div>
</div>

<style>
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; }
  .card-header { margin-bottom: 20px; }
  .card-header-badge-row { display: flex; justify-content: space-between; align-items: center; }
  .card-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .storage-pill { font-size: 11px; font-weight: 600; padding: 2px 8px; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); border-radius: 4px; color: var(--kanso-accent); }
  .card-subtitle { margin: 4px 0 0 0; font-size: 13px; color: var(--kanso-text-muted); }
  .active-vault-banner { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; margin-bottom: 20px; }
  .vault-mount-meta { display: flex; flex-direction: column; gap: 4px; }
  .vault-status-indicator { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--kanso-success); }
  .status-pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--kanso-success); }
  .vault-path-text { font-size: 13px; font-family: monospace; color: var(--kanso-text-primary); }
  .vault-mount-tags { display: flex; gap: 8px; }
  .tag-chip { font-size: 11px; padding: 4px 8px; background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 4px; color: var(--kanso-text-muted); }
  .custom-mount-box { display: flex; flex-direction: column; gap: 8px; }
  .form-label { font-size: 12px; font-weight: 600; color: var(--kanso-text-muted); }
  .mount-input-row { display: flex; gap: 12px; }
  .flex-1 { flex: 1; }
  .form-input { height: 38px; padding: 0 12px; border-radius: 6px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); font-size: 13px; }
  .form-input:focus { outline: none; border-color: var(--kanso-accent); }
  .btn-primary { height: 38px; padding: 0 20px; border-radius: 6px; background: var(--kanso-accent); color: #FFFFFF; font-size: 13px; font-weight: 600; border: none; cursor: pointer; }
  .btn-primary:hover:not(:disabled) { opacity: 0.9; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .mount-hint { margin: 4px 0 0 0; font-size: 12px; color: var(--kanso-text-muted); }
  .mode-row { display: flex; gap: 12px; align-items: baseline; margin: -8px 0 6px 0; font-size: 12.5px; }
  .mode-label { font-weight: 600; color: var(--kanso-text-muted); }
  .mode-value { font-family: var(--kanso-font-mono); color: var(--kanso-text-primary); word-break: break-all; }
  .mode-note { margin: 0 0 20px 0; font-size: 12px; line-height: 1.5; color: var(--kanso-text-muted); }
  .mode-note.warn { color: var(--kanso-warning); }
</style>
