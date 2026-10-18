<script lang="ts">
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    open: boolean;
    vaultPath: string;
    totalFiles: number;
    formattedSize: string;
    onClose: () => void;
    onSuccess: (archivePath: string) => void;
  }

  let { open, vaultPath, totalFiles, formattedSize, onClose, onSuccess }: Props = $props();

  let typedConfirm = $state('');
  let isResetting = $state(false);
  let errorMessage = $state('');

  const folderName = $derived(
    vaultPath ? vaultPath.split(/[\\/]/).filter(Boolean).pop() || '' : ''
  );

  const isConfirmed = $derived(
    folderName.length > 0 && typedConfirm.trim().toLowerCase() === folderName.toLowerCase()
  );

  $effect(() => {
    if (open) {
      typedConfirm = '';
      errorMessage = '';
    }
  });

  async function handleReset() {
    if (!isConfirmed) return;
    isResetting = true;
    errorMessage = '';
    try {
      const res = await ApiClient.resetVaultStructure(typedConfirm.trim());
      if (res && res.success) {
        appState.addToast(
          `Vault reset complete. Existing items moved to ${res.archivePath || '_Archive'}.`,
          'success',
          'Vault Reset'
        );
        onSuccess(res.archivePath || '_Archive');
      } else {
        errorMessage = res?.message || 'Failed to reset vault structure.';
      }
    } catch (err: any) {
      errorMessage = err.message || 'Error executing vault reset.';
    } finally {
      isResetting = false;
    }
  }
</script>

{#if open}
  <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
    <div class="modal-card">
      <div class="modal-header">
        <div class="badge-row">
          <span class="danger-pill">
            <Icon name="alert" size={12} />
            <span>CONFIRMATION REQUIRED</span>
          </span>
        </div>
        <h3 id="reset-modal-title" class="modal-title">Reset Canonical Structure</h3>
        <p class="modal-sub">
          This operation archives current canonical folders into <code>_Archive/</code> and sets up clean template files.
        </p>
      </div>

      <div class="modal-body">
        {#if errorMessage}
          <div class="error-banner" role="alert">
            <Icon name="alert" size={14} />
            <span>{errorMessage}</span>
          </div>
        {/if}

        <div class="confirmation-info-box">
          <div class="info-row">
            <span class="info-k">Target Vault</span>
            <code class="info-v">{vaultPath}</code>
          </div>
          <div class="info-row">
            <span class="info-k">Files to Archive</span>
            <span class="info-v">{totalFiles} files ({formattedSize})</span>
          </div>
          <div class="info-row">
            <span class="info-k">Archive Location</span>
            <code class="info-v">_Archive/reset-&lt;timestamp&gt;/</code>
          </div>
        </div>

        <div class="input-block">
          <label for="confirm-folder-input" class="confirm-label">
            To proceed, type the folder name <code>{folderName}</code> below:
          </label>
          <input
            id="confirm-folder-input"
            type="text"
            class="confirm-input"
            placeholder={folderName}
            bind:value={typedConfirm}
            autocomplete="off"
            spellcheck="false"
          />
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" onclick={onClose} disabled={isResetting}>
          Cancel
        </button>
        <button
          type="button"
          class="btn-confirm-danger"
          onclick={handleReset}
          disabled={!isConfirmed || isResetting}
        >
          <Icon name="trash" size={14} />
          <span>{isResetting ? 'Archiving & Resetting...' : 'Archive & Reset Structure'}</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    padding: var(--kanso-space-4);
  }

  .modal-card {
    width: 100%;
    max-width: 520px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-lg);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    padding: var(--kanso-space-5) var(--kanso-space-5) var(--kanso-space-3);
    border-bottom: 1px solid var(--kanso-border);
  }

  .badge-row {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    margin-bottom: var(--kanso-space-2);
  }

  .danger-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--kanso-space-1);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 2px 8px;
    background: var(--kanso-surface-hover);
    color: var(--kanso-danger);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-sm);
  }

  .modal-title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .modal-sub {
    margin: var(--kanso-space-1) 0 0;
    font-size: 12.5px;
    color: var(--kanso-text-muted);
    line-height: 1.4;
  }

  .modal-sub code {
    font-family: var(--kanso-font-mono);
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
    padding: 1px 4px;
    border-radius: var(--kanso-radius-xs);
  }

  .modal-body {
    padding: var(--kanso-space-5);
    display: flex;
    flex-direction: column;
    gap: var(--kanso-space-4);
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    padding: var(--kanso-space-3);
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-danger);
    border-radius: var(--kanso-radius-md);
    color: var(--kanso-danger);
    font-size: 12.5px;
  }

  .confirmation-info-box {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    padding: var(--kanso-space-3) var(--kanso-space-4);
    display: flex;
    flex-direction: column;
    gap: var(--kanso-space-2);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    gap: var(--kanso-space-2);
  }

  .info-k {
    color: var(--kanso-text-muted);
    font-weight: 500;
  }

  .info-v {
    color: var(--kanso-text-primary);
    font-weight: 600;
    text-align: right;
    word-break: break-all;
  }

  .info-v code,
  code.info-v {
    font-family: var(--kanso-font-mono);
    font-size: 11.5px;
  }

  .input-block {
    display: flex;
    flex-direction: column;
    gap: var(--kanso-space-2);
  }

  .confirm-label {
    font-size: 12.5px;
    color: var(--kanso-text-primary);
  }

  .confirm-label code {
    font-family: var(--kanso-font-mono);
    font-weight: 700;
    color: var(--kanso-danger);
    background: var(--kanso-surface-hover);
    padding: 1px 5px;
    border-radius: var(--kanso-radius-xs);
  }

  .confirm-input {
    height: 38px;
    padding: 0 var(--kanso-space-3);
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    color: var(--kanso-text-primary);
    font-family: var(--kanso-font-mono);
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .confirm-input:focus {
    border-color: var(--kanso-danger);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--kanso-space-2);
    padding: var(--kanso-space-4) var(--kanso-space-5);
    background: var(--kanso-surface);
    border-top: 1px solid var(--kanso-border);
  }

  .btn-cancel {
    height: 34px;
    padding: 0 var(--kanso-space-3);
    background: transparent;
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    color: var(--kanso-text-muted);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-cancel:hover:not(:disabled) {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
  }

  .btn-confirm-danger {
    height: 34px;
    padding: 0 var(--kanso-space-4);
    display: inline-flex;
    align-items: center;
    gap: var(--kanso-space-2);
    background: var(--kanso-danger);
    border: 1px solid var(--kanso-danger);
    border-radius: var(--kanso-radius-md);
    color: var(--kanso-surface);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .btn-confirm-danger:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-confirm-danger:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
