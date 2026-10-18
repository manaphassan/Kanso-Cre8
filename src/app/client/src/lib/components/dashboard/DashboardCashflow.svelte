<script lang="ts">
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    incomeSummary: { paid: number; pending: number; draftCount: number };
  }

  let { incomeSummary }: Props = $props();

  const totalIncomeWithTimer = $derived(
    incomeSummary.paid + incomeSummary.pending + timerStore.earnings
  );
</script>

<section class="bento-section">
  <div class="bento-header">
    <div class="bento-title-row">
      <h2 class="bento-title">Income &amp; Studio Cashflow</h2>
    </div>
    <a href="#invoices" class="bento-action-link">Open Invoice Studio →</a>
  </div>

  <div class="cashflow-bento-grid">
    <!-- Total Pipeline Value -->
    <div class="cashflow-card total-card">
      <div class="cashflow-card-header">
        <span class="cashflow-label">Total Studio Pipeline</span>
        <span class="cashflow-icon-wrap primary"><Icon name="trend-up" size={16} /></span>
      </div>
      <div class="cashflow-value-display font-mono">
        {settingsStore.settings.currencySymbol || 'RM'}{totalIncomeWithTimer.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div class="cashflow-meta-row">
        <span>Paid + Pending + Live Accrued</span>
      </div>
    </div>

    <!-- Paid Invoices -->
    <div class="cashflow-card">
      <div class="cashflow-card-header">
        <span class="cashflow-label">Settled Revenue (Paid)</span>
        <span class="cashflow-icon-wrap success"><Icon name="check" size={16} /></span>
      </div>
      <div class="cashflow-value-display font-mono text-success">
        {settingsStore.settings.currencySymbol || 'RM'}{incomeSummary.paid.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div class="cashflow-meta-row">
        <span>Remitted to Studio Account</span>
      </div>
    </div>

    <!-- Pending Invoices -->
    <div class="cashflow-card">
      <div class="cashflow-card-header">
        <span class="cashflow-label">Awaiting Payment</span>
        <span class="cashflow-icon-wrap warning"><Icon name="clock" size={16} /></span>
      </div>
      <div class="cashflow-value-display font-mono text-warning">
        {settingsStore.settings.currencySymbol || 'RM'}{incomeSummary.pending.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div class="cashflow-meta-row">
        <span>{incomeSummary.draftCount} open invoice(s) sent</span>
      </div>
    </div>

    <!-- Live Accrued Today -->
    <div class="cashflow-card live-card">
      <div class="cashflow-card-header">
        <span class="cashflow-label">Live Accrued Today</span>
        <span class="cashflow-icon-wrap accent"><Icon name="play" size={16} /></span>
      </div>
      <div class="cashflow-value-display font-mono text-accent">
        +{settingsStore.settings.currencySymbol || 'RM'}{(timerStore.earnings || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div class="cashflow-meta-row">
        <span class="live-pulse-dot" class:is-running={timerStore.isRunning}></span>
        <span>{timerStore.isRunning ? 'Active session recording' : 'Timer standby'}</span>
      </div>
    </div>
  </div>
</section>

<style>
  .bento-section {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
  }
  .bento-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 20px;
  }
  .bento-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .bento-action-link {
    font-size: 13px;
    color: var(--kanso-accent);
    text-decoration: none;
    font-weight: 600;
  }
  .bento-action-link:hover {
    text-decoration: underline;
  }
  .cashflow-bento-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  @media (max-width: 1024px) {
    .cashflow-bento-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 600px) {
    .cashflow-bento-grid {
      grid-template-columns: 1fr;
    }
  }
  .cashflow-card {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cashflow-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cashflow-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-muted);
  }
  .cashflow-icon-wrap {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cashflow-icon-wrap.primary { background: var(--kanso-surface-hover); color: var(--kanso-text-primary); }
  .cashflow-icon-wrap.success { background: var(--kanso-surface-hover); color: var(--kanso-success); }
  .cashflow-icon-wrap.warning { background: var(--kanso-surface-hover); color: var(--kanso-warning); }
  .cashflow-icon-wrap.accent { background: var(--kanso-surface-hover); color: var(--kanso-accent); }
  .cashflow-value-display {
    font-size: 20px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .text-success { color: var(--kanso-success); }
  .text-warning { color: var(--kanso-warning); }
  .text-accent { color: var(--kanso-accent); }
  .cashflow-meta-row {
    font-size: 12px;
    color: var(--kanso-text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .live-pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--kanso-text-muted);
  }
  .live-pulse-dot.is-running {
    background: var(--kanso-accent);
    box-shadow: 0 0 6px var(--kanso-accent);
  }
</style>
