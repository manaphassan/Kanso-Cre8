<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';

  interface Props {
    businessRegNo: string;
    billingEmail: string;
    studioAddress: string;
    website: string;
    phone: string;
    defaultCurrency: string;
    paymentBank: string;
    paymentAccountNo: string;
    paymentAccountName: string;
    paymentSwiftOrQr: string;
    defaultPaymentTerms: string;
    digitalSignature: string;
    footerNotice: string;
    isSavingProfile: boolean;
    onUpdateSignature: (sig: string) => void;
    onUpdateCurrency: (curr: string) => void;
    onUpdateField: (field: string, val: string) => void;
    onSave: () => void;
  }

  let {
    businessRegNo,
    billingEmail,
    studioAddress,
    website,
    phone,
    defaultCurrency,
    paymentBank,
    paymentAccountNo,
    paymentAccountName,
    paymentSwiftOrQr,
    defaultPaymentTerms,
    digitalSignature,
    footerNotice,
    isSavingProfile,
    onUpdateSignature,
    onUpdateCurrency,
    onUpdateField,
    onSave
  }: Props = $props();

  let signatureFileInput = $state<HTMLInputElement>();

  function triggerSignatureUpload() {
    if (signatureFileInput) signatureFileInput.click();
  }

  function handleSignatureSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      appState.addToast('Please select a valid image file (PNG, WEBP).', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onUpdateSignature((e.target?.result as string) || '');
      appState.addToast('Digital Signature loaded.', 'success');
    };
    reader.readAsDataURL(file);
  }

  function removeSignature() {
    onUpdateSignature('');
    appState.addToast('Digital Signature removed.', 'info');
  }
</script>

<div class="card-surface">
  <div class="card-header">
    <h2 class="card-title">2. Business Registry &amp; Client Communication</h2>
    <p class="card-subtitle">Official commercial registration, tax credentials, and billing coordinates.</p>
  </div>
  <div class="form-grid-2">
    <div class="form-group">
      <label class="form-label" for="business-reg-input">Business Reg No. / Tax ID</label>
      <input id="business-reg-input" type="text" class="form-input font-mono" value={businessRegNo} oninput={(e) => onUpdateField('businessRegNo', (e.target as HTMLInputElement).value)} placeholder="e.g. 2026-ACME-0001" />
    </div>
    <div class="form-group">
      <label class="form-label" for="billing-email-input">Official Business &amp; Billing Email</label>
      <input id="billing-email-input" type="email" class="form-input" value={billingEmail} oninput={(e) => onUpdateField('billingEmail', (e.target as HTMLInputElement).value)} placeholder="e.g. billing@example.com" />
    </div>
    <div class="form-group">
      <label class="form-label" for="address-input">Studio Location / Physical Atelier Base</label>
      <input id="address-input" type="text" class="form-input" value={studioAddress} oninput={(e) => onUpdateField('studioAddress', (e.target as HTMLInputElement).value)} placeholder="e.g. Metropolis, USA" />
    </div>
    <div class="form-group">
      <label class="form-label" for="website-input">Studio Website / Portfolio URL</label>
      <input id="website-input" type="url" class="form-input font-mono" value={website} oninput={(e) => onUpdateField('website', (e.target as HTMLInputElement).value)} placeholder="e.g. https://example.com" />
    </div>
    <div class="form-group">
      <label class="form-label" for="phone-input">Direct Phone / WhatsApp / Telegram</label>
      <input id="phone-input" type="tel" class="form-input font-mono" value={phone} oninput={(e) => onUpdateField('phone', (e.target as HTMLInputElement).value)} placeholder="e.g. +1-555-0100" />
    </div>
    <div class="form-group">
      <label class="form-label" for="currency-select">Default Invoicing Currency</label>
      <select id="currency-select" class="form-select font-mono" value={defaultCurrency} onchange={(e) => onUpdateCurrency((e.target as HTMLSelectElement).value)}>
        <option value="MYR">MYR (RM) — Malaysian Ringgit</option>
        <option value="USD">USD ($) — United States Dollar</option>
        <option value="SGD">SGD (S$) — Singapore Dollar</option>
        <option value="GBP">GBP (£) — British Pound Sterling</option>
        <option value="EUR">EUR (€) — Euro</option>
        <option value="AUD">AUD (A$) — Australian Dollar</option>
        <option value="CAD">CAD (CA$) — Canadian Dollar</option>
        <option value="JPY">JPY (¥) — Japanese Yen</option>
      </select>
    </div>
  </div>
</div>

<div class="card-surface" style="margin-top: 24px;">
  <div class="card-header">
    <h2 class="card-title">3. Bank &amp; Payment Details</h2>
    <p class="card-subtitle">Bank transfer instructions, account numbers, payment terms, and your digital signature.</p>
  </div>
  <div class="form-grid-2">
    <div class="form-group">
      <label class="form-label" for="bank-input">Bank Name &amp; SWIFT/BIC</label>
      <input id="bank-input" type="text" class="form-input" value={paymentBank} oninput={(e) => onUpdateField('paymentBank', (e.target as HTMLInputElement).value)} placeholder="e.g. Maybank (SWIFT: MBBEMYKL)" />
    </div>
    <div class="form-group">
      <label class="form-label" for="acc-no-input">Bank Account Number / IBAN</label>
      <input id="acc-no-input" type="text" class="form-input font-mono" value={paymentAccountNo} oninput={(e) => onUpdateField('paymentAccountNo', (e.target as HTMLInputElement).value)} placeholder="e.g. 5140-1234-5678" />
    </div>
    <div class="form-group">
      <label class="form-label" for="acc-name-input">Beneficiary / Account Holder Name</label>
      <input id="acc-name-input" type="text" class="form-input" value={paymentAccountName} oninput={(e) => onUpdateField('paymentAccountName', (e.target as HTMLInputElement).value)} placeholder="e.g. HaNa Innovation" />
    </div>
    <div class="form-group">
      <label class="form-label" for="swift-qr-input">Payment QR / Reference</label>
      <input id="swift-qr-input" type="text" class="form-input font-mono" value={paymentSwiftOrQr} oninput={(e) => onUpdateField('paymentSwiftOrQr', (e.target as HTMLInputElement).value)} placeholder="e.g. DuitNow QR: payment@studio.com" />
    </div>
    <div class="form-group" style="grid-column: span 2;">
      <label class="form-label" for="terms-input">Standard Payment Terms</label>
      <input id="terms-input" type="text" class="form-input" value={defaultPaymentTerms} oninput={(e) => onUpdateField('defaultPaymentTerms', (e.target as HTMLInputElement).value)} placeholder="e.g. 50% Upfront Deposit • Net 14 Days" />
    </div>
  </div>

  <div class="avatar-manager-row" style="margin-top: 16px;">
    <div class="avatar-preview-wrap">
      <div class="signature-display">
        {#if digitalSignature}
          <img src={digitalSignature} alt="Authorized Sign-off Seal" class="signature-img" />
        {:else}
          <span class="signature-placeholder font-mono text-xs">NO SEAL</span>
        {/if}
      </div>
    </div>
    <div class="avatar-actions">
      <div class="avatar-btn-row">
        <input type="file" accept="image/png,image/webp" bind:this={signatureFileInput} onchange={handleSignatureSelected} style="display: none;" />
        <button type="button" class="btn-secondary" onclick={triggerSignatureUpload}>Upload Signature</button>
        {#if digitalSignature}
          <button type="button" class="btn-secondary danger" onclick={removeSignature}>Remove</button>
        {/if}
      </div>
      <p class="avatar-hint">Transparent PNG or WEBP. Stamped onto approved Quotes and Proposals.</p>
    </div>
  </div>

  <div class="form-group" style="margin-top: 16px;">
    <label class="form-label" for="footer-notice-input">Invoice Footer Note &amp; Watermark</label>
    <input id="footer-notice-input" type="text" class="form-input" value={footerNotice} oninput={(e) => onUpdateField('footerNotice', (e.target as HTMLInputElement).value)} placeholder="e.g. Crafted with mindful focus & precision in Kanso Cre8." />
  </div>

  <div class="form-actions-row" style="margin-top: 20px;">
    <button type="button" class="btn-primary" onclick={onSave} disabled={isSavingProfile}>
      {isSavingProfile ? 'Synchronizing...' : 'Save Studio Profile'}
    </button>
  </div>
</div>

<style>
  .card-surface {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 24px;
  }
  .card-header { margin-bottom: 20px; }
  .card-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .card-subtitle { margin: 4px 0 0 0; font-size: 13px; color: var(--kanso-text-muted); }
  .avatar-manager-row { display: flex; gap: 20px; align-items: center; padding-bottom: 20px; border-bottom: 1px solid var(--kanso-border); }
  .avatar-preview-wrap { flex-shrink: 0; }
  .signature-display { width: 120px; height: 60px; border: 1px dashed var(--kanso-border); border-radius: 6px; display: flex; align-items: center; justify-content: center; background: var(--kanso-canvas); overflow: hidden; }
  .signature-img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .signature-placeholder { color: var(--kanso-text-muted); }
  .avatar-actions { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .avatar-btn-row { display: flex; gap: 8px; }
  .avatar-hint { margin: 0; font-size: 12px; color: var(--kanso-text-muted); }
  .form-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  @media (max-width: 768px) { .form-grid-2 { grid-template-columns: 1fr; } }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-label { font-size: 12px; font-weight: 600; color: var(--kanso-text-muted); }
  .form-input, .form-select { height: 38px; padding: 0 12px; border-radius: 6px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); font-size: 13px; }
  .form-input:focus, .form-select:focus { outline: none; border-color: var(--kanso-accent); }
  .btn-primary { height: 38px; padding: 0 20px; border-radius: 6px; background: var(--kanso-accent); color: #FFFFFF; font-size: 13px; font-weight: 600; border: none; cursor: pointer; }
  .btn-primary:hover:not(:disabled) { opacity: 0.9; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary { height: 32px; padding: 0 14px; border-radius: 6px; background: var(--kanso-surface-hover); color: var(--kanso-text-primary); font-size: 12px; font-weight: 600; border: 1px solid var(--kanso-border); cursor: pointer; }
  .btn-secondary:hover { background: var(--kanso-border); }
  .btn-secondary.danger { color: var(--kanso-danger); }
  .form-actions-row { display: flex; justify-content: flex-end; }
</style>
