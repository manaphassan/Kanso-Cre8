<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    elevated?: boolean;
    hoverLift?: boolean;
    borderAccent?: string;
    padding?: string;
    style?: string;
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  }

  let {
    elevated = false,
    hoverLift = false,
    borderAccent,
    padding = '18px',
    style = '',
    class: className = '',
    onclick,
    children
  }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fluent-card {elevated ? 'card-elevated' : ''} {hoverLift ? 'card-hover-lift' : ''} {className}"
  style="padding: {padding}; {borderAccent ? `border-left: 4px solid ${borderAccent};` : ''} {style}"
  {onclick}
>
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .fluent-card {
    background-color: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E2E8F0);
    border-radius: var(--radius-lg, 12px);
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-fast, 0.15s ease);
    position: relative;
    color: var(--text-primary, #1C1C1C);
  }

  .card-elevated {
    background-color: var(--surface-card-elevated, #FFFFFF);
    box-shadow: var(--shadow-md);
  }

  .card-hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    border-color: var(--brand-accent, #21A1F7);
  }
</style>
