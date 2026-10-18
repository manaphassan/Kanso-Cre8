<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';

  let syncConflicts = $state<any[]>([]);
  let isScanningConflicts = $state(false);
  let resolvingConflictPath = $state<string | null>(null);

  export async function scanConflicts() {
    isScanningConflicts = true;
    try {
      const res = await ApiClient.getSyncConflicts();
      if (res && res.success) {
        syncConflicts = res.conflicts || [];
        if (syncConflicts.length === 0) {
          appState.addToast('No sync conflicts found across active vault.', 'success', 'Vault Clean');
        } else {
          appState.addToast(`Discovered ${syncConflicts.length} cloud sync conflict(s).`, 'warning', 'Sync Conflicts');
        }
      }
    } catch (err: any) {
      appState.addToast(`Sync scan error: ${err.message}`, 'error');
    } finally {
      isScanningConflicts = false;
    }
  }

  async function handleResolveConflict(conflictPath: string, resolution: 'keep_local' | 'keep_cloud' | 'archive') {
    resolvingConflictPath = conflictPath;
    try {
      const res = await ApiClient.resolveSyncConflict(conflictPath, resolution);
      if (res && res.success) {
        appState.addToast(res.message || 'Conflict resolved successfully.', 'success', 'Conflict Resolved');
        await scanConflicts();
      }
    } catch (err: any) {
      appState.addToast(`Resolve error: ${err.message}`, 'error');
    } finally {
      resolvingConflictPath = null;
    }
  }

  onMount(() => {
    scanConflicts();
  });
</script>

<div class="card-surface sync-conflict-banner-container" class:has-conflicts={syncConflicts.length > 0}>
  {#if syncConflicts.length > 0}
    <div class="sync-banner-header">
      <div class="sync-banner-lead">
        <span class="sync-banner-glyph alert"><Icon name="alert" size={16} /></span>
        <div>
          <div class="sync-banner-title">{syncConflicts.length} Cloud Sync Conflict{syncConflicts.length === 1 ? '' : 's'} Detected</div>
          <div class="sync-banner-subtitle">Resolve to maintain single source of truth across Dropbox, OneDrive, or local drive.</div>
        </div>
      </div>
      <button type="button" class="scan-btn compact" onclick={scanConflicts} disabled={isScanningConflicts}>
        <span>{isScanningConflicts ? 'Scanning...' : 'Rescan'}</span>
      </button>
    </div>

    <div class="conflicts-list-compact">
      {#each syncConflicts as conflict}
        <div class="conflict-item-compact">
          <div class="conflict-info-compact">
            <div class="conflict-name-compact">{conflict.filename}</div>
            <div class="conflict-path-compact">{conflict.relPath}</div>
          </div>
          <div class="conflict-actions-compact">
            <button type="button" class="btn-resolve-compact keep-local" onclick={() => handleResolveConflict(conflict.conflictPath, 'keep_local')} disabled={resolvingConflictPath === conflict.conflictPath}>Keep Base</button>
            <button type="button" class="btn-resolve-compact keep-cloud" onclick={() => handleResolveConflict(conflict.conflictPath, 'keep_cloud')} disabled={resolvingConflictPath === conflict.conflictPath}>Adopt Cloud</button>
            <button type="button" class="btn-resolve-compact archive" onclick={() => handleResolveConflict(conflict.conflictPath, 'archive')} disabled={resolvingConflictPath === conflict.conflictPath}>Archive</button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="sync-banner-pristine">
      <div class="sync-banner-lead">
        <span class="clean-icon-pill-mini"><Icon name="check" size={12} /></span>
        <div>
          <span class="clean-title-inline">Cloud Sync: Pristine</span>
          <span class="clean-desc-inline">— No conflicted copies or collisions detected across active vault.</span>
        </div>
      </div>
      <button type="button" class="scan-btn compact" onclick={scanConflicts} disabled={isScanningConflicts}>
        <span>{isScanningConflicts ? 'Scanning...' : 'Scan Sync Conflicts'}</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 20px; }
  .sync-conflict-banner-container.has-conflicts { border-color: var(--kanso-warning); }
  .sync-banner-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .sync-banner-lead { display: flex; gap: 12px; align-items: center; }
  .sync-banner-glyph.alert { color: var(--kanso-warning); }
  .sync-banner-title { font-size: 14px; font-weight: 700; color: var(--kanso-text-primary); }
  .sync-banner-subtitle { font-size: 12px; color: var(--kanso-text-muted); }
  .scan-btn { padding: 6px 14px; border-radius: 6px; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); font-size: 12px; font-weight: 600; cursor: pointer; }
  .scan-btn:hover { background: var(--kanso-border); }
  .conflicts-list-compact { display: flex; flex-direction: column; gap: 8px; }
  .conflict-item-compact { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; }
  .conflict-name-compact { font-size: 13px; font-weight: 600; color: var(--kanso-text-primary); font-family: monospace; }
  .conflict-path-compact { font-size: 11px; color: var(--kanso-text-muted); }
  .conflict-actions-compact { display: flex; gap: 6px; }
  .btn-resolve-compact { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid var(--kanso-border); background: var(--kanso-surface); color: var(--kanso-text-primary); cursor: pointer; }
  .btn-resolve-compact:hover { background: var(--kanso-surface-hover); }
  .btn-resolve-compact.keep-local { color: var(--kanso-accent); }
  .sync-banner-pristine { display: flex; justify-content: space-between; align-items: center; }
  .clean-icon-pill-mini { width: 20px; height: 20px; border-radius: 50%; background: var(--kanso-success); color: #FFFFFF; display: flex; align-items: center; justify-content: center; }
  .clean-title-inline { font-size: 13px; font-weight: 700; color: var(--kanso-text-primary); }
  .clean-desc-inline { font-size: 12px; color: var(--kanso-text-muted); margin-left: 4px; }
</style>
