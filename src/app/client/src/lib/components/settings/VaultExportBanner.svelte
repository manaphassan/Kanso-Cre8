<script lang="ts">
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { pickZipDestination } from '$lib/local/dialog';
  import { Icon } from '$lib/components/ui';

  let isExporting = $state(false);

  function formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
  }

  async function exportVault() {
    if (isExporting) return;
    try {
      const { filename } = await ApiClient.getVaultExportPreview();
      const dest = await pickZipDestination('Save the vault archive', filename);
      if (!dest) return;
      isExporting = true;
      const res = await ApiClient.exportVault(dest);
      appState.addToast(`Saved ${res.filename} (${res.files} files, ${formatBytes(res.bytes)})`, 'success');
    } catch (err: any) {
      appState.addToast(`Could not export the vault: ${err?.message || err}`, 'error');
    } finally {
      isExporting = false;
    }
  }
</script>

<!-- Leave With Your Data (Data Sovereignty) -->
<div class="sovereignty-banner">
  <div class="sovereignty-text">
    <div class="sovereignty-header">
      <Icon name="download" size={15} color="var(--kanso-accent)" />
      <span class="sovereignty-title font-mono">Data Sovereignty: Leave With Your Data</span>
    </div>
    <p class="sovereignty-desc">
      Save your complete atelier vault as an unencumbered ZIP archive. All 6 compartments remain 100% human-readable UTF-8 Markdown and JSON files with zero binary database locks.
    </p>
  </div>
  <button
    type="button"
    class="export-vault-btn"
    onclick={exportVault}
    disabled={isExporting}
    aria-label="Export Full Vault Archive"
  >
    <Icon name="download" size={14} />
    <span>{isExporting ? 'Saving...' : 'Export Vault Archive (.zip)'}</span>
  </button>
</div>

<style>
  .sovereignty-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    margin-top: 12px;
  }
  @media (max-width: 768px) { .sovereignty-banner { flex-direction: column; align-items: flex-start; } }
  .sovereignty-text { display: flex; flex-direction: column; gap: 4px; }
  .sovereignty-header { display: flex; align-items: center; gap: 8px; }
  .sovereignty-title { font-size: 13px; font-weight: 700; color: var(--kanso-text-primary); }
  .sovereignty-desc { margin: 0; font-size: 11.5px; color: var(--kanso-text-muted); line-height: 1.4; max-width: 580px; }
  .export-vault-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    color: var(--kanso-text-primary);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .export-vault-btn:hover:not(:disabled) { background: var(--kanso-accent); color: var(--kanso-canvas); border-color: var(--kanso-accent); }
  .export-vault-btn:disabled { opacity: 0.6; cursor: wait; }
</style>
