<script lang="ts">
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    vaultExists: boolean;
    missing: string[];
    onRepaired: () => void | Promise<void>;
  }

  let { vaultExists, missing, onRepaired }: Props = $props();
  let isRepairing = $state(false);

  async function repair() {
    isRepairing = true;
    try {
      const res = await ApiClient.repairVaultStructure();
      const created = (res.createdDirs?.length || 0) + (res.createdFiles?.length || 0);
      if (res.errors?.length) {
        appState.addToast(`Repair incomplete: ${res.errors[0]}`, 'error', 'Vault Repair');
      } else {
        appState.addToast(
          created ? `Restored ${created} missing folder(s)/file(s).` : 'Vault structure already complete.',
          'success',
          'Vault Repaired'
        );
      }
      await onRepaired();
    } catch (err: any) {
      appState.addToast(`Repair error: ${err.message}`, 'error');
    } finally {
      isRepairing = false;
    }
  }
</script>

{#if !vaultExists || missing.length > 0}
  <div class="repair-bar">
    <span class="repair-text">
      {vaultExists ? `${missing.length} vault folder(s) missing: ${missing.join(', ')}` : 'Vault directory not found.'}
    </span>
    <button type="button" class="repair-btn" onclick={repair} disabled={isRepairing}>
      <Icon name="check" size={14} />
      <span>{isRepairing ? 'Repairing...' : 'Repair Vault Structure'}</span>
    </button>
  </div>
{/if}

<style>
  .repair-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-warning); border-radius: 6px; padding: 12px 16px; }
  .repair-text { font-size: 12.5px; font-weight: 600; color: var(--kanso-warning); }
  .repair-btn { display: inline-flex; align-items: center; gap: 8px; border-radius: 6px; font-size: 12px; font-weight: 600; padding: 8px 14px; cursor: pointer; border: 1px solid transparent; background: var(--kanso-accent); color: var(--kanso-canvas); }
  .repair-btn:hover { opacity: 0.9; }
  .repair-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
