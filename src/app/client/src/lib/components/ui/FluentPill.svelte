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
    border-radius: var(--radius-pill);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    cursor: pointer;
    transition: all var(--transition-fast);
    outline: none;
  }

  .fluent-pill:hover {
    background: var(--surface-card-subtle);
    color: var(--text-primary);
    border-color: var(--brand-accent);
  }

  .fluent-pill.active {
    background: var(--brand-tint);
    color: var(--brand-primary);
    border-color: var(--brand-primary);
    font-weight: 700;
  }

  [data-theme="metamorphosis"] .fluent-pill.active {
    background: rgba(0, 207, 255, 0.18);
    color: #00CFFF;
    border-color: #00CFFF;
  }

  [data-theme="catppuccin"] .fluent-pill.active {
    background: rgba(203, 166, 247, 0.18);
    color: #CBA6F7;
    border-color: #CBA6F7;
  }

  .pill-count {
    font-size: 10.5px;
    padding: 1px 5px;
    border-radius: var(--radius-pill);
    background: rgba(0, 0, 0, 0.08);
  }
</style>
