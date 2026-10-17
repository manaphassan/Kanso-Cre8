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
    class: className = '',
    id = 'fluent-sel-' + Math.random().toString(36).substring(2, 9)
  }: Props & { id?: string } = $props();
</script>

<div class="fluent-select-wrapper {className}" {style}>
  {#if label}
    <label class="fluent-label" for={id}>{label}</label>
  {/if}
  <select {id} class="fluent-select" bind:value {disabled} {onchange}>
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
    color: var(--kanso-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .fluent-select {
    width: 100%;
    padding: 8px 12px;
    font-family: var(--kanso-font-ui);
    font-size: 13px;
    color: var(--kanso-text-primary);
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    outline: none;
    cursor: pointer;
    transition: all var(--kanso-duration-fast) var(--kanso-ease);
  }

  .fluent-select:focus {
    border-color: var(--kanso-accent);
  }

  .fluent-select:disabled {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-muted);
    cursor: not-allowed;
  }
</style>
