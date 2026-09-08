<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    appearance?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (e: MouseEvent) => void;
    title?: string;
    style?: string;
    class?: string;
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
    font-family: var(--font-family);
    font-weight: 600;
    border-radius: var(--radius-md);
    cursor: pointer;
    border: 1px solid transparent;
    transition: all var(--transition-fast);
    outline: none;
    user-select: none;
    text-decoration: none;
    white-space: nowrap;
  }

  .fluent-btn:focus-visible {
    box-shadow: 0 0 0 2px var(--bg-app), 0 0 0 4px var(--brand-accent);
  }

  /* Sizes */
  .btn-sm { padding: 4px 10px; font-size: 12px; }
  .btn-md { padding: 7px 14px; font-size: 13px; }
  .btn-lg { padding: 10px 18px; font-size: 14px; }

  /* 10% Accent Layer */
  .btn-primary {
    background: var(--brand-primary);
    color: var(--text-inverted);
    border-color: var(--brand-primary);
    box-shadow: var(--shadow-sm);
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--brand-secondary);
    box-shadow: var(--brand-glow);
  }

  /* 30% Secondary Layer */
  .btn-secondary {
    background: var(--surface-card);
    color: var(--text-primary);
    border-color: var(--surface-card-border);
  }
  .btn-secondary:hover:not(:disabled) {
    background: var(--surface-card-subtle);
    border-color: var(--brand-accent);
    color: var(--brand-accent);
  }

  .btn-ghost {
    background: transparent;
    color: var(--text-secondary);
    border-color: transparent;
  }
  .btn-ghost:hover:not(:disabled) {
    background: var(--surface-card-hover);
    color: var(--text-primary);
  }

  .btn-danger {
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border-color: var(--color-danger-border);
  }
  .btn-danger:hover:not(:disabled) {
    background: var(--color-danger);
    color: #FFFFFF;
  }

  .btn-success {
    background: var(--color-success-bg);
    color: var(--color-success);
    border-color: var(--color-success-border);
  }
  .btn-success:hover:not(:disabled) {
    background: var(--color-success);
    color: #FFFFFF;
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
