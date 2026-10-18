<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import { handleBackdropClick, handleModalKeydown } from '$lib/utils';

  interface Props {
    open?: boolean;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    confirmAppearance?: 'primary' | 'danger' | 'success';
    loading?: boolean;
    onConfirm?: () => Promise<void> | void;
    onClose?: () => void;
    onclose?: () => void;
    children?: Snippet;
    footer?: Snippet;
  }

  let {
    open = $bindable(false),
    title = 'Dialog',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmAppearance = 'primary',
    loading = false,
    onConfirm,
    onClose: onCloseProp,
    onclose: oncloseProp,
    children,
    footer
  }: Props = $props();

  const onClose = () => {
    if (oncloseProp) oncloseProp();
    if (onCloseProp) onCloseProp();
  };

  function onBackdropClick(e: MouseEvent) {
    handleBackdropClick(e, onClose);
  }

  function handleKeyDown(e: KeyboardEvent) {
    handleModalKeydown(e, onClose, open);
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={onBackdropClick}>
    <div class="modal-dialog" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">{title}</h3>
        <button class="close-btn" onclick={onClose} aria-label="Close"><Icon name="close" size={14} /></button>
      </div>

      <div class="modal-body">
        {#if children}
          {@render children()}
        {/if}
      </div>

      <div class="modal-footer">
        {#if footer}
          {@render footer()}
        {:else}
          <Button appearance="secondary" onclick={onClose}>{cancelText}</Button>
          {#if onConfirm}
            <Button appearance={confirmAppearance} {loading} onclick={onConfirm}>{confirmText}</Button>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease-out;
  }

  .modal-dialog {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-lg);
    width: 90%;
    max-width: 540px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: scaleUp 0.15s ease-out;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--kanso-border);
  }

  .modal-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-secondary);
    font-size: 14px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--kanso-radius-sm);
  }
  .close-btn:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    font-size: 13.5px;
    color: var(--kanso-text-secondary);
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 20px;
    border-top: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleUp {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
</style>
