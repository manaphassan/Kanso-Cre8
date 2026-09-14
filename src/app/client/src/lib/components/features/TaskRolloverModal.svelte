<script lang="ts">
  import type { BujoEntry } from '$lib/services/journalService';

  interface Props {
    open?: boolean;
    fromDate: string;
    toDate: string;
    tasks: BujoEntry[];
    onRollover: (selectedTaskIds: string[]) => Promise<void> | void;
    onRolloverAll: () => Promise<void> | void;
    onClose: () => void;
  }

  let {
    open = $bindable(false),
    fromDate = '',
    toDate = '',
    tasks = [],
    onRollover,
    onRolloverAll,
    onClose
  }: Props = $props();

  let selectedTaskIds = $state<string[]>([]);
  let isSubmitting = $state<boolean>(false);

  // Initialize all tasks as selected by default for speed
  $effect(() => {
    if (open && tasks.length > 0) {
      selectedTaskIds = tasks.map(t => t.id);
    }
  });

  const isAllSelected = $derived(
    tasks.length > 0 && selectedTaskIds.length === tasks.length
  );

  function toggleSelectAll() {
    if (isAllSelected) {
      selectedTaskIds = [];
    } else {
      selectedTaskIds = tasks.map(t => t.id);
    }
  }

  function toggleTask(id: string) {
    if (selectedTaskIds.includes(id)) {
      selectedTaskIds = selectedTaskIds.filter(tId => tId !== id);
    } else {
      selectedTaskIds = [...selectedTaskIds, id];
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open && !isSubmitting) {
      onClose();
    }
  }

  async function handleRolloverSelected() {
    if (selectedTaskIds.length === 0 || isSubmitting) return;
    isSubmitting = true;
    try {
      await onRollover(selectedTaskIds);
      open = false;
    } finally {
      isSubmitting = false;
    }
  }

  async function handleRolloverAll() {
    if (tasks.length === 0 || isSubmitting) return;
    isSubmitting = true;
    try {
      await onRolloverAll();
      open = false;
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={() => { if (!isSubmitting) onClose(); }}>
    <!-- Modal Dialog Window -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="modal-window"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rollover-modal-title"
      tabindex="-1"
    >
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-badge-row">
          <span class="bujo-symbol-badge">• [&gt;]</span>
          <span class="header-vault-path">_Journal/Daily/</span>
        </div>
        <h2 id="rollover-modal-title" class="modal-title">Morning BuJo Task Rollover</h2>
        <p class="modal-subtitle">
          Carry open creative tasks from <strong class="date-highlight">{fromDate}</strong> into today's rapid log (<strong class="date-highlight">{toDate}</strong>).
        </p>
      </div>

      <!-- Selection Controls Bar -->
      <div class="selection-bar">
        <label class="select-all-label">
          <input
            type="checkbox"
            checked={isAllSelected}
            onchange={toggleSelectAll}
            disabled={isSubmitting}
            class="custom-check"
          />
          <span>Select All ({tasks.length})</span>
        </label>

        <span class="selection-meta">
          {selectedTaskIds.length} of {tasks.length} selected
        </span>
      </div>

      <!-- Task Items List -->
      <div class="task-list-scroll">
        {#if tasks.length === 0}
          <div class="empty-tasks-message">
            <span>🍵 All tasks from {fromDate} were completed.</span>
          </div>
        {:else}
          {#each tasks as task (task.id)}
            {@const isChecked = selectedTaskIds.includes(task.id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="task-item-row"
              class:selected={isChecked}
              onclick={() => toggleTask(task.id)}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onchange={() => toggleTask(task.id)}
                onclick={(e) => e.stopPropagation()}
                disabled={isSubmitting}
                class="custom-check"
              />

              <div class="task-content">
                <span class="task-text">{task.text}</span>
                <div class="task-badges">
                  {#if task.type === 'priority'}
                    <span class="type-pill priority">* Priority</span>
                  {:else}
                    <span class="type-pill standard">• Task</span>
                  {/if}
                  {#if task.time}
                    <span class="time-pill">{task.time}</span>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Modal Footer Controls -->
      <div class="modal-footer">
        <button
          type="button"
          class="btn-secondary"
          onclick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <div class="footer-actions-right">
          <button
            type="button"
            class="btn-all"
            onclick={handleRolloverAll}
            disabled={isSubmitting || tasks.length === 0}
          >
            • [&gt;] Rollover All ({tasks.length})
          </button>

          <button
            type="button"
            class="btn-primary"
            onclick={handleRolloverSelected}
            disabled={isSubmitting || selectedTaskIds.length === 0}
          >
            {#if isSubmitting}
              <span class="spinner-sm"></span>
              <span>Migrating...</span>
            {:else}
              <span>• [&gt;] Rollover Selected ({selectedTaskIds.length})</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 1.5rem;
    animation: fadeIn 0.15s ease-out;
  }

  .modal-window {
    width: 100%;
    max-width: 560px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-header {
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid var(--kanso-border, #27272A);
    background: var(--kanso-canvas, #09090B);
  }

  .header-badge-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .bujo-symbol-badge {
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--kanso-accent, #38BDF8);
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .header-vault-path {
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    color: var(--kanso-text-muted, #71717A);
  }

  .modal-title {
    margin: 0 0 0.35rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--kanso-text-primary, #F4F4F5);
    letter-spacing: -0.01em;
  }

  .modal-subtitle {
    margin: 0;
    font-size: 0.875rem;
    color: var(--kanso-text-muted, #71717A);
    line-height: 1.45;
  }

  .date-highlight {
    color: var(--kanso-text-primary, #F4F4F5);
    font-family: var(--font-mono, monospace);
  }

  .selection-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    background: var(--kanso-surface, #18181B);
    border-bottom: 1px solid var(--kanso-border, #27272A);
    font-size: 0.8125rem;
  }

  .select-all-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
    color: var(--kanso-text-primary, #F4F4F5);
    font-weight: 500;
  }

  .selection-meta {
    color: var(--kanso-text-muted, #71717A);
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
  }

  .task-list-scroll {
    max-height: 280px;
    overflow-y: auto;
    padding: 0.75rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .task-item-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 0.85rem;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease;
  }

  .task-item-row:hover {
    background: var(--kanso-surface-hover, #27272A);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .task-item-row.selected {
    border-color: rgba(56, 189, 248, 0.4);
    background: rgba(56, 189, 248, 0.04);
  }

  .custom-check {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    accent-color: var(--kanso-accent, #38BDF8);
    cursor: pointer;
    border-radius: 4px;
  }

  .task-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .task-text {
    font-size: 0.875rem;
    color: var(--kanso-text-primary, #F4F4F5);
    word-break: break-word;
    line-height: 1.35;
  }

  .task-badges {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .type-pill {
    font-size: 0.6875rem;
    font-family: var(--font-mono, monospace);
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 500;
  }

  .type-pill.priority {
    color: #F59E0B;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.25);
  }

  .type-pill.standard {
    color: var(--kanso-text-muted, #71717A);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--kanso-border, #27272A);
  }

  .time-pill {
    font-size: 0.6875rem;
    font-family: var(--font-mono, monospace);
    color: var(--kanso-text-muted, #71717A);
  }

  .empty-tasks-message {
    padding: 2rem;
    text-align: center;
    color: var(--kanso-text-muted, #71717A);
    font-size: 0.875rem;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    background: var(--kanso-canvas, #09090B);
    border-top: 1px solid var(--kanso-border, #27272A);
  }

  .footer-actions-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-secondary {
    padding: 0.5rem 0.875rem;
    background: transparent;
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-muted, #71717A);
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .btn-secondary:hover:not(:disabled) {
    color: var(--kanso-text-primary, #F4F4F5);
    background: var(--kanso-surface-hover, #27272A);
  }

  .btn-all {
    padding: 0.5rem 0.875rem;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .btn-all:hover:not(:disabled) {
    background: var(--kanso-surface-hover, #27272A);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--kanso-accent, #38BDF8);
    border: 1px solid transparent;
    color: #09090B;
    font-weight: 600;
    border-radius: 6px;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.35);
  }

  .btn-primary:disabled,
  .btn-all:disabled,
  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner-sm {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(9, 9, 11, 0.3);
    border-top-color: #09090B;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { transform: translateY(12px) scale(0.98); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
