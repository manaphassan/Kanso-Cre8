<script lang="ts">
  interface Props {
    active?: boolean;
    label: string;
    count?: number;
    onclick?: () => void;
  }

  let { active = false, label, count, onclick }: Props = $props();
</script>

<button class="fluent-pill" class:active {onclick}>
  <span>{label}</span>
  {#if count !== undefined}
    <span class="pill-count">{count}</span>
  {/if}
</button>

<style>
  .fluent-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: var(--kanso-radius-full);
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-secondary);
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    cursor: pointer;
    transition: all var(--kanso-duration-fast) var(--kanso-ease);
    outline: none;
  }

  .fluent-pill:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
    border-color: var(--kanso-accent);
  }

  .fluent-pill.active {
    background: var(--kanso-accent-muted);
    color: var(--kanso-accent);
    border-color: var(--kanso-accent);
    font-weight: 700;
  }

  .pill-count {
    font-size: 10.5px;
    padding: 1px 5px;
    border-radius: var(--kanso-radius-full);
    background: rgba(0, 0, 0, 0.08);
  }
</style>
