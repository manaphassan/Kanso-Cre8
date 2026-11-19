<script lang="ts">
  /**
   * "Vault is also open on <device>" (P5.6). Sends a heartbeat every 60 s
   * while the window is open. A warning, never a lock; dismissing hides it
   * until a different computer shows up.
   */
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { HEARTBEAT_MS } from '$lib/domain/presence';
  import { Icon } from '$lib/components/ui';

  let other = $state<{ label: string; heartbeatAt: string } | null>(null);
  let dismissedFor = $state<string | null>(null);

  async function beat() {
    try {
      other = (await ApiClient.presenceHeartbeat()).other;
    } catch {
      other = null;
    }
  }

  onMount(() => {
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    const onUpdate = (e: Event) => {
      if ((e as CustomEvent).detail?.workspaceRoot) beat();
    };
    window.addEventListener('workspace:updated', onUpdate);
    return () => {
      clearInterval(id);
      window.removeEventListener('workspace:updated', onUpdate);
    };
  });
</script>

{#if other && dismissedFor !== other.label}
  <div class="presence" role="status">
    <Icon name="warning" size={14} />
    <span>Vault is also open on <strong>{other.label}</strong>. Edit one file on one computer at a time to avoid sync conflicts.</span>
    <button type="button" class="dismiss" onclick={() => (dismissedFor = other?.label ?? null)} aria-label="Dismiss">
      <Icon name="close" size={13} />
    </button>
  </div>
{/if}

<style>
  .presence {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px 0;
    padding: 8px 12px;
    border: 1px solid var(--kanso-warning);
    border-radius: 6px;
    background: var(--kanso-surface);
    color: var(--kanso-text-primary);
    font-size: 12.5px;
  }

  .presence :global(svg) { color: var(--kanso-warning); flex-shrink: 0; }

  .presence span { flex: 1; }

  .dismiss {
    display: inline-flex;
    padding: 4px;
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--kanso-text-muted);
    cursor: pointer;
  }

  .dismiss:hover { color: var(--kanso-text-primary); border-color: var(--kanso-border); }
</style>
