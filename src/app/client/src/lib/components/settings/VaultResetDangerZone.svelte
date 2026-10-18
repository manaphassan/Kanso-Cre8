<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { vaultStore } from '$lib/stores/vaultStore.svelte';
  import { Icon } from '$lib/components/ui';
  import VaultResetModal from './VaultResetModal.svelte';

  interface Props {
    onReset?: () => void;
  }

  let { onReset }: Props = $props();

  let showModal = $state(false);
  let vaultPath = $state('');
  let totalFiles = $state(0);
  let formattedSize = $state('0 B');

  async function loadVaultMeta() {
    try {
      const res = await ApiClient.getVaultHealth();
      if (res && res.success && res.report) {
        vaultPath = res.report.workspaceRoot || vaultStore.config.rootPath;
        totalFiles = res.report.storageSummary?.totalFiles || 0;
        formattedSize = res.report.storageSummary?.formattedTotalSize || '0 B';
      }
    } catch {
      vaultPath = vaultStore.config.rootPath || '';
    }
  }

  function openResetModal() {
    showModal = true;
  }

  function closeResetModal() {
    showModal = false;
  }

  async function handleResetSuccess() {
    closeResetModal();
    await projectStore.loadProjects();
    await projectStore.loadDashboard();
    await vaultStore.scanVault();
    await loadVaultMeta();
    onReset?.();
  }

  onMount(() => {
    loadVaultMeta();
  });
</script>

<div class="card-surface danger-zone-card">
  <div class="danger-header">
    <div class="badge-row">
      <span class="danger-pill">
        <Icon name="alert" size={12} />
        <span>DANGER ZONE</span>
      </span>
      <span class="safe-pill">Archive First (Zero Loss)</span>
    </div>
    <h3 class="danger-title">Reset Vault Structure</h3>
    <p class="danger-subtitle">
      Re-scaffolds the 6 canonical directories (<code>_Clients</code>, <code>_Finance</code>, <code>_Projects</code>, <code>_Journal</code>, <code>_Notes</code>, <code>_Team</code>). All current files are safely relocated to <code>_Archive/reset-&lt;timestamp&gt;/</code> before rebuilding.
    </p>
  </div>

  <div class="vault-stats-banner">
    <div class="stat-col">
      <span class="stat-label">Vault Path</span>
      <span class="stat-val path-val" title={vaultPath}>{vaultPath || '(Unknown)'}</span>
    </div>
    <div class="stat-col">
      <span class="stat-label">Tracked Files</span>
      <span class="stat-val">{totalFiles} items</span>
    </div>
    <div class="stat-col">
      <span class="stat-label">Storage Footprint</span>
      <span class="stat-val">{formattedSize}</span>
    </div>
  </div>

  <div class="action-footer">
    <p class="footer-note">
      Non-canonical files (e.g. personal folders, custom markdown) are left untouched.
    </p>
    <button type="button" class="btn-danger-outline" onclick={openResetModal}>
      <Icon name="trash" size={14} />
      <span>Reset Vault Structure...</span>
    </button>
  </div>
</div>

<VaultResetModal
  open={showModal}
  {vaultPath}
  {totalFiles}
  {formattedSize}
  onClose={closeResetModal}
  onSuccess={handleResetSuccess}
/>

<style>
  .card-surface {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-lg);
    padding: var(--kanso-space-5);
  }

  .danger-zone-card {
    border-color: var(--kanso-border);
    background: var(--kanso-surface);
  }

  .danger-header {
    margin-bottom: var(--kanso-space-4);
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

  .safe-pill {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    background: var(--kanso-surface-hover);
    color: var(--kanso-success);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-sm);
  }

  .danger-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .danger-subtitle {
    margin: var(--kanso-space-1) 0 0;
    font-size: 13px;
    color: var(--kanso-text-muted);
    line-height: 1.5;
  }

  .danger-subtitle code {
    font-family: var(--kanso-font-mono);
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
    padding: 1px 4px;
    border-radius: var(--kanso-radius-xs);
  }

  .vault-stats-banner {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--kanso-space-3);
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    padding: var(--kanso-space-3) var(--kanso-space-4);
    margin-bottom: var(--kanso-space-4);
  }

  .stat-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }

  .stat-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted);
  }

  .stat-val {
    font-size: 13px;
    font-weight: 600;
    color: var(--kanso-text-primary);
  }

  .stat-val.path-val {
    font-family: var(--kanso-font-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .action-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--kanso-space-3);
    padding-top: var(--kanso-space-3);
    border-top: 1px solid var(--kanso-border);
  }

  .footer-note {
    margin: 0;
    font-size: 12px;
    color: var(--kanso-text-muted);
  }

  .btn-danger-outline {
    height: 34px;
    padding: 0 var(--kanso-space-4);
    display: inline-flex;
    align-items: center;
    gap: var(--kanso-space-2);
    background: transparent;
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    color: var(--kanso-danger);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .btn-danger-outline:hover {
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-danger);
  }

  @media (max-width: 768px) {
    .vault-stats-banner {
      grid-template-columns: 1fr;
    }
    .action-footer {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
