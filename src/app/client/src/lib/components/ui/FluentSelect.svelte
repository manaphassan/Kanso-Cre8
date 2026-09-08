<script lang="ts">
  interface OptionItem {
    value: string;
    label: string;
  }

  interface Props {
    value?: string;
    options?: (OptionItem | string)[];
    label?: string;
    disabled?: boolean;
    onchange?: (e: Event) => void;
    style?: string;
    class?: string;
  }

  let {
    value = $bindable(''),
    options = [],
    label,
    disabled = false,
    onchange,
    style = '',
    class: className = ''
  }: Props = $props();
</script>

<div class="fluent-select-wrapper {className}" {style}>
  {#if label}
    <label class="fluent-label">{label}</label>
  {/if}
  <select class="fluent-select" bind:value {disabled} {onchange}>
    {#each options as opt}
      {#if typeof opt === 'string'}
        <option value={opt}>{opt}</option>
      {:else}
        <option value={opt.value}>{opt.label}</option>
      {/if}
    {/each}
  </select>
</div>

<style>
  .fluent-select-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  .fluent-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .fluent-select {
    width: 100%;
    padding: 8px 12px;
    font-family: var(--font-family);
    font-size: 13px;
    color: var(--text-primary);
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    outline: none;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .fluent-select:focus {
    border-color: var(--brand-accent);
    box-shadow: 0 0 0 2px var(--brand-tint);
  }

  .fluent-select:disabled {
    background: var(--surface-card-subtle);
    color: var(--text-tertiary);
    cursor: not-allowed;
  }
</style>
