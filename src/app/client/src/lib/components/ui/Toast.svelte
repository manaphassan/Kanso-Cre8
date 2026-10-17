<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';
</script>

<div class="toast-container">
  {#each appState.toasts as toast (toast.id)}
    <div class="toast-item toast-{toast.type}">
      <div class="toast-indicator"></div>
      <div class="toast-content">
        {#if toast.title}
          <div class="toast-title">{toast.title}</div>
        {/if}
        <div class="toast-message">{toast.message}</div>
      </div>
      <button class="toast-close" onclick={() => appState.removeToast(toast.id)}>✕</button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 2000;
    max-width: 380px;
    pointer-events: none;
  }

  .toast-item {
    pointer-events: auto;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    padding: 12px 14px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    animation: slideIn 0.2s ease-out;
  }

  .toast-indicator {
    width: 4px;
    height: 100%;
    border-radius: var(--kanso-radius-full);
    background: var(--kanso-accent);
  }

  .toast-success .toast-indicator { background: var(--kanso-success); }
  .toast-warning .toast-indicator { background: var(--kanso-warning); }
  .toast-error .toast-indicator { background: var(--kanso-danger); }
  .toast-info .toast-indicator { background: var(--kanso-accent); }

  .toast-content {
    flex: 1;
  }

  .toast-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    margin-bottom: 2px;
  }

  .toast-message {
    font-size: 12.5px;
    color: var(--kanso-text-secondary);
    line-height: 1.4;
  }

  .toast-close {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted);
    font-size: 12px;
    cursor: pointer;
    padding: 2px 4px;
  }
  .toast-close:hover {
    color: var(--kanso-text-primary);
  }

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
</style>
