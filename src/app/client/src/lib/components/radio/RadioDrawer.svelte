<script lang="ts">
  import CassetteDeck from './CassetteDeck.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open = $bindable(false), onclose }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (open && e.key === 'Escape') {
      e.preventDefault();
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="radio-drawer-backdrop" onclick={onclose} role="presentation">
    <div
      class="radio-drawer-panel"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.key === 'Escape' && onclose()}
      role="dialog"
      aria-modal="true"
      aria-label="Focus Radio Cassette Deck"
    >
      <div class="radio-drawer-header">
        <div class="drawer-title-group">
          <span class="drawer-tag">_Radio/</span>
          <h2 class="drawer-title">Focus Radio</h2>
          <span class="drawer-subtitle">33 RPM Studio Cassette Deck</span>
        </div>
        <button class="drawer-close-btn" onclick={onclose} aria-label="Close Radio Drawer" title="Close Drawer (Esc)">
          <Icon name="close" size={16} />
        </button>
      </div>

      <div class="radio-drawer-body">
        <CassetteDeck />
      </div>
    </div>
  </div>
{/if}

<style>
  .radio-drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 500;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: flex-end;
    align-items: stretch;
    animation: fadeIn 0.15s ease-out;
  }

  .radio-drawer-panel {
    width: 620px;
    max-width: 100vw;
    height: 100vh;
    background: var(--kanso-canvas);
    border-left: 1px solid var(--kanso-border);
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
    animation: slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  .radio-drawer-header {
    height: 52px;
    padding: 0 var(--kanso-space-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--kanso-surface);
    border-bottom: 1px solid var(--kanso-border);
    flex-shrink: 0;
  }

  .drawer-title-group {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
  }

  .drawer-tag {
    font-family: var(--kanso-font-mono);
    font-size: 11px;
    color: var(--kanso-accent);
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    padding: 1px 6px;
    border-radius: var(--kanso-radius-sm);
  }

  .drawer-title {
    font-size: 14px;
    font-weight: 700;
    margin: 0;
    color: var(--kanso-text-primary);
  }

  .drawer-subtitle {
    font-size: 11.5px;
    color: var(--kanso-text-muted);
  }

  .drawer-close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--kanso-radius-md);
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .drawer-close-btn:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
    border-color: var(--kanso-border);
  }

  .radio-drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--kanso-space-4);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  @media (max-width: 640px) {
    .radio-drawer-panel {
      width: 100vw;
    }
    .drawer-subtitle {
      display: none;
    }
  }
</style>
