<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { vaultStore } from '$lib/stores/vaultStore.svelte';
  import VaultMount from './VaultMount.svelte';
  import VaultTree from './VaultTree.svelte';
  import SyncConflictDoctor from './SyncConflictDoctor.svelte';

  let currentVaultRoot = $state(vaultStore.config.rootPath || '');
  let vaultHealth = $state<any>(null);

  async function loadVaultStatus() {
    try {
      const health = await ApiClient.getSystemHealth().catch(() => null);
      if (health && health.success) {
        vaultHealth = health;
        currentVaultRoot = health.workspaceRoot || vaultStore.config.rootPath;
      }
    } catch {
      /* graceful fallback */
    }
  }

  onMount(() => {
    loadVaultStatus();
  });
</script>

<div class="settings-grid">
  <VaultMount
    {currentVaultRoot}
    {vaultHealth}
    onVaultMounted={(newRoot) => {
      currentVaultRoot = newRoot;
      loadVaultStatus();
    }}
  />

  <VaultTree {currentVaultRoot} />

  <SyncConflictDoctor />
</div>

<style>
  .settings-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
</style>
