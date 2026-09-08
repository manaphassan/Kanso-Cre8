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

  let priorityText = $derived.by(() => {
    if (type !== 'priority') return value;
    switch (value.toLowerCase().trim()) {
      case 'urgent': return 'P3';
      case 'high': return 'P2';
      case 'medium':
      case 'standard': return 'P1';
      default: return ''; // Low has no badge
    }
  });

  let badgeClass = $derived.by(() => {
    if (type === 'brand') return 'badge-brand';
    if (type === 'status') return `badge-status-${value.toLowerCase().replace(/\s+/g, '-')}`;
    if (type === 'priority') {
      const p = value.toLowerCase().trim();
      if (p === 'urgent') return 'badge-priority-urgent';
      if (p === 'high') return 'badge-priority-high';
      if (p === 'medium' || p === 'standard') return 'badge-priority-medium';
      return '';
    }
    return '';
  });
</script>

{#if type !== 'priority' || priorityText}
  <span class="badge {badgeClass} {className}" {style}>
    {#if children}
      {@render children()}
    {:else}
      {priorityText}
    {/if}
  </span>
{/if}

