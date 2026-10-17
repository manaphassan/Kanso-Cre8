<script lang="ts">
  import { settingsStore } from '$lib/stores/settingsStore.svelte';

  interface Props {
    studioName: string;
    principalName: string;
    tagline: string;
    logo: string;
    brandColor: string;
    businessRegNo: string;
    billingEmail: string;
    studioAddress: string;
    phone: string;
    paymentBank: string;
    paymentAccountNo: string;
    defaultCurrency: string;
  }

  let {
    studioName,
    principalName,
    tagline,
    logo,
    brandColor,
    businessRegNo,
    billingEmail,
    studioAddress,
    phone,
    paymentBank,
    paymentAccountNo,
    defaultCurrency
  }: Props = $props();
</script>

<div class="card-surface stationery-preview-card">
  <div class="stationery-preview-header">
    <div class="preview-title-row">
      <span class="preview-badge">LIVE INVOICE &amp; LETTERHEAD PREVIEW</span>
      <span class="preview-sub">Master identity auto-stamped on Invoices, Quotations, and Approval packages</span>
    </div>
    <span class="currency-badge">{defaultCurrency || settingsStore.settings.currency || 'MYR'} BASE</span>
  </div>

  <div class="stationery-sheet-preview">
    <div class="sheet-header-left">
      <div class="sheet-logo-monogram" style="background: {brandColor || 'var(--kanso-accent)'};">
        {#if logo}
          <img src={logo} alt={studioName || principalName} class="sheet-logo-img" />
        {:else}
          <span>{(studioName || principalName || 'H').charAt(0).toUpperCase()}</span>
        {/if}
      </div>
      <div class="sheet-title-col">
        <h3 class="sheet-studio-name">{studioName || 'Studio Brand Name'}</h3>
        {#if tagline}
          <p class="sheet-tagline">{tagline}</p>
        {/if}
        <div class="sheet-meta-row">
          {#if businessRegNo}
            <span class="sheet-reg-tag">REG: {businessRegNo}</span>
          {/if}
          <span class="sheet-loc-tag">{studioAddress || 'City, Country'}</span>
          <span class="sheet-contact-tag">{billingEmail || 'billing@studio.com'} · {phone || '+00 000 0000'}</span>
        </div>
      </div>
    </div>

    <div class="sheet-header-right">
      <div class="doc-type-pill">OFFICIAL INVOICE PREVIEW</div>
      <div class="sheet-doc-no font-mono">INV-2026-001</div>
      {#if paymentBank}
        <div class="sheet-bank-pill font-mono text-xs">
          {paymentBank} · {paymentAccountNo}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .card-surface {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
  }
  .stationery-preview-card {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
  }
  .stationery-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--kanso-border);
  }
  .preview-title-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .preview-badge {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-accent);
  }
  .preview-sub {
    font-size: 12px;
    color: var(--kanso-text-muted);
  }
  .currency-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    color: var(--kanso-text-primary);
  }
  .stationery-sheet-preview {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
  }
  .sheet-header-left {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  .sheet-logo-monogram {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 20px;
    color: #FFFFFF;
    overflow: hidden;
  }
  .sheet-logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .sheet-title-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sheet-studio-name {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .sheet-tagline {
    margin: 0;
    font-size: 13px;
    color: var(--kanso-text-muted);
  }
  .sheet-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    color: var(--kanso-text-muted);
    margin-top: 4px;
  }
  .sheet-reg-tag, .sheet-loc-tag, .sheet-contact-tag {
    background: var(--kanso-surface);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--kanso-border);
  }
  .sheet-header-right {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .doc-type-pill {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 2px 8px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    color: var(--kanso-accent);
  }
  .sheet-doc-no {
    font-size: 14px;
    font-weight: 600;
    color: var(--kanso-text-primary);
  }
  .sheet-bank-pill {
    font-size: 12px;
    color: var(--kanso-text-muted);
  }
</style>
