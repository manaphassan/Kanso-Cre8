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
    background-color: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-lg);
    transition: all var(--kanso-duration-fast) var(--kanso-ease);
    position: relative;
    color: var(--kanso-text-primary);
  }

  .card-elevated {
    background-color: var(--kanso-surface);
    border-color: var(--kanso-border);
  }

  .card-hover-lift:hover {
    transform: translateY(-2px);
    border-color: var(--kanso-accent);
  }
</style>
