<script lang="ts">
  import { Icon } from '$lib/components/ui';

  interface Props {
    open: boolean;
    formattedTime: string;
    clientCode: string;
    formattedEarned: string;
    initialNote?: string;
    onConfirm: (note: string, appendToInvoice: boolean) => void;
    onCancel: () => void;
  }

  let {
    open,
    formattedTime,
    clientCode,
    formattedEarned,
    initialNote = '',
    onConfirm,
    onCancel
  }: Props = $props();

  let note = $state('');
  let appendToInvoice = $state(true);

  $effect(() => {
    note = initialNote || '';
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onConfirm(note, appendToInvoice);
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="stop-modal-backdrop" onclick={onCancel} role="presentation">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="stop-modal-card"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stop-title"
      tabindex="-1"
    >
      <div class="stop-modal-header">
        <div class="stop-title-wrap">
          <span class="stop-badge-icon">
            <Icon name="clock" size={16} />
          </span>
          <div>
            <h3 id="stop-title" class="stop-modal-title">Session Complete</h3>
            <p class="stop-modal-sub">Log hours to creative ledger &amp; client invoice</p>
          </div>
        </div>
      </div>

      <div class="stop-metrics-bento">
        <div class="bento-box">
          <span class="bbox-label">TIME LOGGED</span>
          <span class="bbox-value time-val font-mono">{formattedTime}</span>
        </div>
        <div class="bento-box">
          <span class="bbox-label">CLIENT</span>
          <span class="bbox-value client-val font-mono">{clientCode}</span>
        </div>
        <div class="bento-box">
          <span class="bbox-label">ACCRUED EARNED</span>
          <span class="bbox-value earn-val font-mono">{formattedEarned}</span>
        </div>
      </div>

      <div class="stop-input-group">
        <label for="stop-note-input" class="stop-label">Session Deliverable Note / Summary</label>
        <input
          id="stop-note-input"
          type="text"
          bind:value={note}
          placeholder="e.g. 4K Mobile Hero 3D renders, revision round 2..."
          class="stop-input"
        />
      </div>

      <label class="stop-checkbox-row">
        <input type="checkbox" bind:checked={appendToInvoice} class="stop-checkbox" />
        <span class="checkbox-text">
          <strong>1-Click Append to Draft Invoice</strong> ({clientCode})
        </span>
      </label>

      <div class="stop-modal-actions">
        <button type="button" class="modal-btn secondary" onclick={onCancel}>Resume timer</button>
        <button type="button" class="modal-btn primary" onclick={() => onConfirm(note, appendToInvoice)}>
          Log &amp; Finish
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .stop-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .stop-modal-card {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    width: 100%;
    max-width: 440px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  }
  .stop-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .stop-title-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .stop-badge-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-accent);
  }
  .stop-modal-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .stop-modal-sub {
    margin: 2px 0 0 0;
    font-size: 12px;
    color: var(--kanso-text-muted);
  }
  .stop-metrics-bento {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .bento-box {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }
  .bbox-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted);
  }
  .bbox-value {
    font-size: 14px;
    font-weight: 700;
  }
  .time-val { color: var(--kanso-text-primary); }
  .client-val { color: var(--kanso-accent); }
  .earn-val { color: var(--kanso-success); }
  .stop-input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .stop-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-primary);
  }
  .stop-input {
    height: 36px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 0 12px;
    font-size: 13px;
    color: var(--kanso-text-primary);
  }
  .stop-input:focus {
    outline: none;
    border-color: var(--kanso-accent);
  }
  .stop-checkbox-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--kanso-text-primary);
    cursor: pointer;
  }
  .stop-checkbox {
    accent-color: var(--kanso-accent);
  }
  .stop-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 4px;
  }
  .modal-btn {
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .modal-btn.secondary {
    background: transparent;
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
  }
  .modal-btn.secondary:hover {
    color: var(--kanso-text-primary);
    border-color: var(--kanso-text-muted);
  }
  .modal-btn.primary {
    background: var(--kanso-accent);
    border: 1px solid var(--kanso-accent);
    color: #FFFFFF;
  }
  .modal-btn.primary:hover {
    opacity: 0.9;
  }
</style>
