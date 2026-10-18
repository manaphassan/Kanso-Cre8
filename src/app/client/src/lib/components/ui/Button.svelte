<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    appearance?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'subtle';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (e: MouseEvent) => void;
    title?: string;
    style?: string;
    class?: string;
    'aria-label'?: string;
    children?: Snippet;
  }

  let {
    appearance = 'secondary',
    size = 'md',
    disabled = false,
    loading = false,
    type = 'button',
    onclick,
    title,
    style = '',
    class: className = '',
    'aria-label': ariaLabel,
    children
  }: Props = $props();
</script>

<button
  {type}
  class="fluent-btn btn-{appearance} btn-{size} {className}"
  {disabled}
  {title}
  {style}
  {onclick}
  aria-label={ariaLabel}
>
  {#if loading}
    <span class="spinner"></span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .fluent-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: var(--kanso-font-ui);
    font-weight: 600;
    border-radius: var(--kanso-radius-md);
    cursor: pointer;
    border: 1px solid transparent;
    transition: all var(--kanso-duration-fast) var(--kanso-ease);
    outline: none;
    user-select: none;
    text-decoration: none;
    white-space: nowrap;
  }

  .fluent-btn:focus-visible {
    box-shadow: 0 0 0 2px var(--kanso-canvas), 0 0 0 4px var(--kanso-accent);
  }

  /* Sizes */
  .btn-xs { padding: 2px 8px; font-size: 11px; height: 24px; }
  .btn-sm { padding: 4px 10px; font-size: 12px; }
  .btn-md { padding: 7px 14px; font-size: 13px; }
  .btn-lg { padding: 10px 18px; font-size: 14px; }

  .btn-subtle {
    background: transparent;
    color: var(--kanso-text-secondary);
    border-color: transparent;
  }
  .btn-subtle:hover:not(:disabled) {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
  }

  /* 10% Accent Layer */
  .btn-primary {
    background: var(--kanso-accent);
    color: var(--kanso-accent-text);
    border-color: var(--kanso-accent);
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--kanso-accent-hover);
  }

  /* 30% Secondary Layer */
  .btn-secondary {
    background: var(--kanso-surface);
    color: var(--kanso-text-primary);
    border-color: var(--kanso-border);
  }
  .btn-secondary:hover:not(:disabled) {
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-accent);
    color: var(--kanso-accent);
  }

  .btn-ghost {
    background: transparent;
    color: var(--kanso-text-secondary);
    border-color: transparent;
  }
  .btn-ghost:hover:not(:disabled) {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
  }

  .btn-danger {
    background: var(--kanso-danger-muted);
    color: var(--kanso-danger);
    border-color: var(--kanso-danger);
  }
  .btn-danger:hover:not(:disabled) {
    background: var(--kanso-danger);
    color: var(--kanso-accent-text);
  }

  .btn-success {
    background: var(--kanso-success-muted);
    color: var(--kanso-success);
    border-color: var(--kanso-success);
  }
  .btn-success:hover:not(:disabled) {
    background: var(--kanso-success);
    color: var(--kanso-accent-text);
  }

  .fluent-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
