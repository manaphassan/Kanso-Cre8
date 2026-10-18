<script lang="ts">
  import type { InvoiceDocument } from '$lib/types/kanso';
  import { financeService } from '$lib/services/financeService';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    quote: InvoiceDocument;
    onClose: () => void;
    onConverted: (result: { quote: InvoiceDocument; project: any; invoice: InvoiceDocument }) => void;
  }

  let { quote, onClose, onConverted }: Props = $props();

  let projectTitle = $state(
    quote.items && quote.items[0]?.description
      ? quote.items[0].description
      : ((quote as any).title || `Sprint ${quote.documentNumber}`)
  );
  let deliverableType = $state('Brand Identity');
  let deadline = $state(
    quote.validUntil || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  let depositMode = $state<'full' | 'half'>('full');
  let isConverting = $state(false);

  const totalAmount = $derived(quote.total || quote.subtotal || 0);
  const invoiceAmount = $derived(depositMode === 'half' ? Math.round(totalAmount * 0.5 * 100) / 100 : totalAmount);

  async function handleConvert() {
    if (!projectTitle.trim()) {
      appState.addToast('Please enter a project title.', 'warning');
      return;
    }
    isConverting = true;
    try {
      const res = await financeService.convertQuoteFull({
        quoteId: quote.documentNumber,
        projectTitle: projectTitle.trim(),
        depositPercentage: depositMode === 'half' ? 50 : 100,
        deadline,
        deliverableType,
        description: quote.notes || `Generated from Quote ${quote.documentNumber}`
      });

      if (res && res.project && res.invoice) {
        // Refresh local project cache
        projectStore.loadProjects();
        appState.addToast(
          `Project "${res.project.title || projectTitle}" and Invoice "${res.invoice.documentNumber}" created!`,
          'success'
        );
        onConverted(res);
      } else {
        appState.addToast('Conversion failed. Please check server logs.', 'error');
      }
    } catch (err: any) {
      appState.addToast(`Conversion error: ${err.message}`, 'error');
    } finally {
      isConverting = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal-backdrop" onclick={onClose} role="presentation">
  <div
    class="modal-card"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    aria-labelledby="convert-quote-title"
  >
    <!-- Modal Header -->
    <header class="modal-header">
      <div class="header-titles">
        <span class="header-badge">Quote {quote.documentNumber}</span>
        <h2 id="convert-quote-title" class="header-title">Convert to Project & Invoice</h2>
        <p class="header-subtitle">
          Scaffold a standardized 5-folder project vault and generate an initial invoice in one unified flow.
        </p>
      </div>
      <button
        class="close-btn"
        onclick={onClose}
        aria-label="Close conversion dialog"
      >
        <Icon name="close" size={16} />
      </button>
    </header>

    <!-- Modal Form Body -->
    <div class="modal-body">
      <!-- Client Info Row -->
      <div class="info-row">
        <span class="info-label">Client</span>
        <span class="info-value font-mono">
          {quote.clientName || quote.clientCode} ({quote.clientCode})
        </span>
      </div>

      <!-- Project Title Input -->
      <div class="form-group">
        <label for="convert-proj-title" class="field-label">Project Title</label>
        <input
          id="convert-proj-title"
          type="text"
          bind:value={projectTitle}
          class="field-input"
          placeholder="e.g. Mobile Banking App 3D Visuals"
        />
      </div>

      <!-- Grid: Discipline & Target Deadline -->
      <div class="grid-two">
        <div class="form-group">
          <label for="convert-discipline" class="field-label">Deliverable Discipline</label>
          <select id="convert-discipline" bind:value={deliverableType} class="field-select">
            <option value="Brand Identity">Brand Identity (P)</option>
            <option value="UI/UX">UI/UX Design (D)</option>
            <option value="Video">Motion & 3D (V)</option>
            <option value="Social Media">Social Media (S)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="convert-deadline" class="field-label">Target Deadline</label>
          <input
            id="convert-deadline"
            type="date"
            bind:value={deadline}
            class="field-input font-mono"
          />
        </div>
      </div>

      <!-- Invoice Schedule Selector -->
      <div class="form-group">
        <span class="field-label" id="invoice-schedule-label">Initial Invoice Schedule</span>
        <div class="schedule-pills" role="radiogroup" aria-labelledby="invoice-schedule-label">
          <button
            type="button"
            class="pill-choice"
            class:active={depositMode === 'full'}
            onclick={() => (depositMode = 'full')}
            role="radio"
            aria-checked={depositMode === 'full'}
            aria-label="100% Full Project Invoice"
          >
            <span class="pill-title">100% Full Invoice</span>
            <span class="pill-desc">Bill complete project upfront</span>
          </button>
          <button
            type="button"
            class="pill-choice"
            class:active={depositMode === 'half'}
            onclick={() => (depositMode = 'half')}
            role="radio"
            aria-checked={depositMode === 'half'}
            aria-label="50% Initial Deposit Invoice"
          >
            <span class="pill-title">50% Initial Deposit</span>
            <span class="pill-desc">Bill half now, balance upon completion</span>
          </button>
        </div>
      </div>

      <!-- Financial Summary Bento -->
      <div class="summary-bento">
        <div class="summary-tile">
          <span class="summary-label">Quote Value</span>
          <span class="summary-val font-mono">
            {quote.currency} {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div class="summary-tile highlight">
          <span class="summary-label">Initial Invoice Total</span>
          <span class="summary-val font-mono">
            {quote.currency} {invoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>

    <!-- Modal Footer Actions -->
    <footer class="modal-footer">
      <button
        type="button"
        class="btn-ghost"
        onclick={onClose}
        disabled={isConverting}
        aria-label="Cancel conversion"
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn-primary"
        onclick={handleConvert}
        disabled={isConverting}
        aria-label="Execute project scaffolding and invoice creation"
      >
        <Icon name="bolt" size={14} />
        <span>{isConverting ? 'Scaffolding...' : 'Scaffold Project & Generate Invoice'}</span>
      </button>
    </footer>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .modal-card {
    background: var(--kanso-surface); border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-lg, 12px); width: 100%; max-width: 520px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); display: flex; flex-direction: column; overflow: hidden;
  }
  .modal-header {
    padding: 18px 24px; border-bottom: 1px solid var(--kanso-border);
    display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  }
  .header-badge {
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--kanso-accent); margin-bottom: 4px; display: inline-block;
  }
  .header-title {
    margin: 0 0 4px 0; font-size: 18px; font-weight: 600; color: var(--kanso-text-primary);
  }
  .header-subtitle {
    margin: 0; font-size: 12px; line-height: 1.5; color: var(--kanso-text-muted);
  }
  .close-btn {
    background: transparent; border: none; color: var(--kanso-text-muted);
    cursor: pointer; padding: 6px; border-radius: var(--kanso-radius-sm, 4px);
    display: flex; align-items: center; justify-content: center; transition: color 0.15s ease, background 0.15s ease;
  }
  .close-btn:hover { color: var(--kanso-text-primary); background: var(--kanso-surface-hover); }
  .modal-body {
    padding: 18px 24px; display: flex; flex-direction: column; gap: 14px;
  }
  .info-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border); border-radius: var(--kanso-radius-md, 8px);
  }
  .info-label { font-size: 12px; color: var(--kanso-text-muted); font-weight: 500; }
  .info-value { font-size: 13px; color: var(--kanso-text-primary); font-weight: 600; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-size: 12px; font-weight: 600; color: var(--kanso-text-primary); }
  .field-input, .field-select {
    width: 100%; padding: 8px 12px; background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border); border-radius: var(--kanso-radius-md, 6px);
    color: var(--kanso-text-primary); font-size: 13px; transition: border-color 0.15s ease;
  }
  .field-input:focus, .field-select:focus { outline: none; border-color: var(--kanso-accent); }
  .grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .schedule-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .pill-choice {
    padding: 10px 12px; background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border); border-radius: var(--kanso-radius-md, 8px);
    cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 2px;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .pill-choice:hover { border-color: var(--kanso-border-hover, var(--kanso-accent)); }
  .pill-choice.active { border-color: var(--kanso-accent); background: var(--kanso-surface-hover); }
  .pill-title { font-size: 13px; font-weight: 600; color: var(--kanso-text-primary); }
  .pill-desc { font-size: 11px; color: var(--kanso-text-muted); }
  .summary-bento { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
  .summary-tile {
    padding: 10px 14px; background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border); border-radius: var(--kanso-radius-md, 8px);
    display: flex; flex-direction: column; gap: 4px;
  }
  .summary-tile.highlight { border-color: var(--kanso-accent); }
  .summary-label { font-size: 11px; color: var(--kanso-text-muted); font-weight: 500; }
  .summary-val { font-size: 15px; font-weight: 700; color: var(--kanso-text-primary); }
  .summary-tile.highlight .summary-val { color: var(--kanso-accent); }
  .modal-footer {
    padding: 14px 24px; background: var(--kanso-canvas);
    border-top: 1px solid var(--kanso-border); display: flex;
    align-items: center; justify-content: flex-end; gap: 12px;
  }
  .btn-ghost {
    background: transparent; border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted); font-size: 13px; font-weight: 500;
    padding: 8px 16px; border-radius: var(--kanso-radius-md, 6px); cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .btn-ghost:hover:not(:disabled) { color: var(--kanso-text-primary); background: var(--kanso-surface-hover); }
  .btn-primary {
    background: var(--kanso-accent); color: var(--kanso-canvas); border: none;
    font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: var(--kanso-radius-md, 6px);
    cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: opacity 0.15s ease;
  }
  .btn-primary:hover:not(:disabled) { opacity: 0.9; }
  .btn-primary:disabled, .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
