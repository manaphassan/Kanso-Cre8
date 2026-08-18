<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    type?: 'brand' | 'status' | 'priority' | 'custom';
    value?: string;
    style?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    type = 'custom',
    value = '',
    style = '',
    class: className = '',
    children
  }: Props = $props();

  let badgeClass = $derived.by(() => {
    if (type === 'brand') return 'badge-brand';
    if (type === 'status') return `badge-status-${value.toLowerCase().replace(/\s+/g, '-')}`;
    if (type === 'priority') return `badge-priority-${value.toLowerCase()}`;
    return '';
  });
</script>

<span class="badge {badgeClass} {className}" {style}>
  {#if children}
    {@render children()}
  {:else}
    {value}
  {/if}
</span>
