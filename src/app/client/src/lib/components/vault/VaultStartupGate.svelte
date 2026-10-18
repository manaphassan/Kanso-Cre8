<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { vaultStore } from '$lib/stores/vaultStore.svelte';
  import { Icon } from '$lib/components/ui';
  import VaultStartupActions from './VaultStartupActions.svelte';

  interface VaultStatus {
    ok: boolean;
    status?: 'ok' | 'missing_root' | 'not_writable' | 'repair_failed';
    reason?: 'missing_root' | 'not_writable' | 'repair_failed';
    message?: string;
    root: string;
    repaired: string[];
    errors?: string[];
  }

  let isBlocked = $state(false);
  let statusData = $state<VaultStatus | null>(null);
  let chosenPath = $state('');
  let isRetrying = $state(false);
  let isMounting = $state(false);
  let isCreating = $state(false);
  let actionError = $state('');

  export async function checkStatus(): Promise<boolean> {
    isRetrying = true;
    actionError = '';
    try {
      const res = await ApiClient.getVaultStatus();
      if (res && (res.status === 'ok' || res.ok === true)) {
        if (isBlocked) {
          appState.addToast('Vault verified and connected.', 'success', 'Vault Ready');
          await reloadApp();
        } else if (res.repaired?.length) {
          appState.addToast(`Restored ${res.repaired.length} missing vault folder(s).`, 'info', 'Vault Repaired');
        }
        isBlocked = false;
        statusData = null;
        return true;
      } else {
        statusData = res;
        chosenPath = res?.root || '';
        isBlocked = true;
        return false;
      }
    } catch (err: any) {
      statusData = {
        ok: false,
        status: 'repair_failed',
        reason: 'repair_failed',
        message: err.message || 'Failed to connect to backend server.',
        root: '',
        repaired: [],
        errors: [err.message]
      };
      isBlocked = true;
      return false;
    } finally {
      isRetrying = false;
    }
  }

  async function reloadApp() {
    try {
      await projectStore.loadProjects();
      await projectStore.loadDashboard();
      await vaultStore.scanVault();
    } catch (_) {}
  }

  async function handleBrowse() {
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri && tauri.dialog && typeof tauri.dialog.open === 'function') {
        const selected = await tauri.dialog.open({ directory: true, multiple: false });
        if (selected && typeof selected === 'string') {
          chosenPath = selected;
          return;
        }
      }
    } catch (_) {}

    try {
      const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        const selected = await invoke<string>('pick_folder');
        if (selected) {
          chosenPath = selected;
          return;
        }
      }
    } catch (_) {}

    const input = prompt('Enter or paste target vault directory path:', chosenPath);
    if (input !== null && input.trim()) {
      chosenPath = input.trim();
    }
  }

  async function handleMountChosen() {
    if (!chosenPath || !chosenPath.trim()) {
      actionError = 'Please specify a folder path.';
      return;
    }
    isMounting = true;
    actionError = '';
    try {
      const res = await ApiClient.setWorkspaceRoot(chosenPath.trim(), false);
      if (res && res.success) {
        await checkStatus();
      } else {
        actionError = res?.message || 'Failed to mount specified folder.';
      }
    } catch (err: any) {
      actionError = err.message || 'Error mounting folder.';
    } finally {
      isMounting = false;
    }
  }

  async function handleCreateAndMountHere() {
    const target = statusData?.root || chosenPath;
    if (!target) {
      actionError = 'Target directory path is missing.';
      return;
    }
    isCreating = true;
    actionError = '';
    try {
      const res = await ApiClient.setWorkspaceRoot(target.trim(), true);
      if (res && res.success) {
        await checkStatus();
      } else {
        actionError = res?.message || 'Failed to create and mount folder.';
      }
    } catch (err: any) {
      actionError = err.message || 'Error creating folder.';
    } finally {
      isCreating = false;
    }
  }

  onMount(() => {
    checkStatus();
  });
</script>

{#if isBlocked && statusData}
  <div class="startup-gate-overlay" role="alertdialog" aria-modal="true" aria-labelledby="gate-title">
    <div class="startup-gate-modal">
      <div class="gate-header">
        <div class="gate-badge">
          <Icon name="alert" size={14} />
          <span>VAULT RELOCATION REQUIRED</span>
        </div>
        <h2 id="gate-title" class="gate-title">Vault Directory Unavailable</h2>
        <p class="gate-subtitle">
          The configured local vault could not be mounted. Kanso Cre8 does not silently auto-create folders on absent drives.
        </p>
      </div>

      <div class="gate-body">
        {#if actionError}
          <div class="gate-alert-error" role="alert">
            <Icon name="alert" size={14} />
            <span>{actionError}</span>
          </div>
        {/if}

        <div class="failing-path-card">
          <div class="path-header">
            <span class="path-label">Configured Vault Location</span>
            <span class="reason-pill reason-{statusData.status || statusData.reason || 'missing'}">
              {statusData.status || statusData.reason || 'missing_root'}
            </span>
          </div>
          <div class="path-display" title={statusData.root || 'None'}>
            <code>{statusData.root || '(No path set)'}</code>
          </div>
          <p class="reason-description">
            {#if statusData.status === 'missing_root' || statusData.reason === 'missing_root'}
              Directory not found on disk. If an external drive was disconnected or a cloud sync folder is pending, reconnect it and retry.
            {:else if statusData.status === 'not_writable' || statusData.reason === 'not_writable'}
              Directory is read-only or not writable. Check disk space and folder permissions.
            {:else if statusData.status === 'repair_failed' || statusData.reason === 'repair_failed'}
              Directory verification failed: {statusData.message || 'Permissions error.'}
            {:else}
              {statusData.message || 'Vault directory is not accessible.'}
            {/if}
          </p>
        </div>

        <VaultStartupActions
          {chosenPath}
          {isRetrying}
          {isMounting}
          {isCreating}
          hasRoot={Boolean(statusData.root)}
          onRetry={checkStatus}
          onBrowse={handleBrowse}
          onMountChosen={handleMountChosen}
          onCreateAndMountHere={handleCreateAndMountHere}
          onPathChange={(p) => (chosenPath = p)}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .startup-gate-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    padding: var(--kanso-space-4);
  }

  .startup-gate-modal {
    width: 100%;
    max-width: 620px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-lg);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .gate-header {
    padding: var(--kanso-space-5) var(--kanso-space-5) var(--kanso-space-3);
    border-bottom: 1px solid var(--kanso-border);
  }

  .gate-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--kanso-space-1);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-warning);
    background: var(--kanso-surface-hover);
    padding: 3px 8px;
    border-radius: var(--kanso-radius-sm);
    margin-bottom: var(--kanso-space-2);
  }

  .gate-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .gate-subtitle {
    margin: var(--kanso-space-1) 0 0;
    font-size: 13px;
    color: var(--kanso-text-muted);
    line-height: 1.5;
  }

  .gate-body {
    padding: var(--kanso-space-5);
    display: flex;
    flex-direction: column;
    gap: var(--kanso-space-4);
  }

  .gate-alert-error {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    padding: var(--kanso-space-3);
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-danger);
    border-radius: var(--kanso-radius-md);
    color: var(--kanso-danger);
    font-size: 13px;
  }

  .failing-path-card {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    padding: var(--kanso-space-4);
    display: flex;
    flex-direction: column;
    gap: var(--kanso-space-2);
  }

  .path-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .path-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--kanso-text-muted);
  }

  .reason-pill {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: var(--kanso-radius-sm);
    background: var(--kanso-surface);
    color: var(--kanso-warning);
    border: 1px solid var(--kanso-border);
  }

  .reason-pill.reason-not_writable {
    color: var(--kanso-danger);
  }

  .path-display {
    padding: var(--kanso-space-2) var(--kanso-space-3);
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-sm);
    overflow-x: auto;
  }

  .path-display code {
    font-family: var(--kanso-font-mono);
    font-size: 12px;
    color: var(--kanso-text-primary);
  }

  .reason-description {
    margin: 0;
    font-size: 12px;
    color: var(--kanso-text-muted);
    line-height: 1.4;
  }
</style>
