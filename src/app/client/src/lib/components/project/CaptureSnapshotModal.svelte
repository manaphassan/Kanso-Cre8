<script lang="ts">
  import { Button, Icon } from '$lib/components/ui';

  interface Props {
    open: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (trigger: string, note: string) => Promise<void>;
  }

  let { open = false, isSubmitting = false, onClose, onSubmit }: Props = $props();

  let trigger = $state<string>('MANUAL_MILESTONE');
  let note = $state<string>('');

  const triggers = [
    { id: 'MANUAL_MILESTONE', label: 'Milestone / Checkpoint' },
    { id: 'CLIENT_REVIEW', label: 'Client Review Proof' },
    { id: 'INTERNAL_QA', label: 'Internal Creative Review' },
    { id: 'DELIVERABLE_EXPORT', label: 'Pre-Export Snapshot' }
  ];

  async function handleConfirm() {
    await onSubmit(trigger, note);
  }
</script>

{#if open}
  <div class="modal-backdrop" onclick={onClose} role="presentation">
    <div
      class="modal-card"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-labelledby="capture-round-title"
    >
      <div class="modal-header">
        <h3 id="capture-round-title" class="modal-title">Capture Proof Round</h3>
        <button class="icon-close-btn" onclick={onClose} aria-label="Close dialog">
          <Icon name="close" size={16} />
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="snapshot-trigger-select" class="form-label">Milestone Trigger</label>
          <select id="snapshot-trigger-select" class="form-select" bind:value={trigger}>
            {#each triggers as t}
              <option value={t.id}>{t.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="snapshot-note-textarea" class="form-label">Proof Round Notes & Changes</label>
          <textarea
            id="snapshot-note-textarea"
            class="form-textarea"
            bind:value={note}
            placeholder="Describe deliverable progress, client revisions, or design changes included in this round..."
            rows={4}
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <Button appearance="secondary" size="sm" onclick={onClose}>
          Cancel
        </Button>
        <Button appearance="primary" size="sm" disabled={isSubmitting} onclick={handleConfirm}>
          <Icon name="camera" size={14} />
          <span>{isSubmitting ? 'Capturing…' : 'Capture Milestone'}</span>
        </Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
  }
  .modal-card {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
    outline: none;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid var(--kanso-border);
  }
  .modal-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .icon-close-btn {
    background: none;
    border: none;
    color: var(--kanso-text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }
  .icon-close-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
  }
  .modal-body {
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .form-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--kanso-text-muted);
  }
  .form-select,
  .form-textarea {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    color: var(--kanso-text-primary);
    padding: 8px 12px;
    font-size: 12px;
  }
  .form-textarea {
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 18px;
    border-top: 1px solid var(--kanso-border);
  }
</style>
