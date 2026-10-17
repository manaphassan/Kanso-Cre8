<script lang="ts">
  import { licenseStore } from '$lib/stores/licenseStore.svelte';
  import { Icon } from '$lib/components/ui';

  let inputKey = $state('');
  let isActivating = $state(false);

  function handleClose() {
    licenseStore.showUpgradeModal = false;
  }

  async function handleActivate() {
    if (!inputKey.trim()) return;
    isActivating = true;
    await licenseStore.activate(inputKey.trim());
    isActivating = false;
  }

  function fillSampleKey() {
    inputKey = 'KANSO-PRO-STUDIO-2026-ALPHA-VERIFIED';
  }

  async function handleDeactivate() {
    if (!confirm('Are you sure you want to deactivate Kanso Studio Pro and revert to the free Zen tier?')) return;
    await licenseStore.deactivate();
  }
</script>

{#if licenseStore.showUpgradeModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={handleClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-surface" onclick={(e) => e.stopPropagation()}>
      <!-- Header -->
      <div class="modal-header">
        <div class="header-badge-row">
          <div class="k8-pill">
            <span class="k8-text">K8</span>
          </div>
          <span class="pro-tag">PERPETUAL LICENSE</span>
        </div>
        <h2 class="modal-title">Unlock Kanso Studio Pro</h2>
        <p class="modal-subtitle">
          Pay once ($39–$49). Own it forever. Zero monthly subscriptions. Zero database binary locks. 100% offline-first.
        </p>
      </div>

      <!-- Comparison Matrix: Sanctuary vs. Commerce -->
      <div class="comparison-grid">
        <div class="comp-col free-col">
          <div class="comp-header">
            <span class="tier-title">Kanso Zen</span>
            <span class="tier-price">Free Forever</span>
          </div>
          <p class="comp-desc">The personal creative sanctuary.</p>
          <ul class="feature-list">
            <li><Icon name="check" size={12} /> Unlimited Atomic Notes &amp; Scratchpad</li>
            <li><Icon name="check" size={12} /> Daily Bullet Journal &amp; Monthly Review</li>
            <li><Icon name="check" size={12} /> Retro Cassette Focus Radio &amp; Pomodoro</li>
            <li><Icon name="check" size={12} /> Copywriting Studio &amp; Telemetry</li>
            <li><Icon name="check" size={12} /> Pure Markdown Storage (100% Offline)</li>
          </ul>
        </div>

        <div class="comp-col pro-col">
          <div class="comp-header">
            <span class="tier-title pro">Studio Pro</span>
            <span class="tier-price pro">$39 One-Time</span>
          </div>
          <p class="comp-desc">The commercial operations engine.</p>
          <ul class="feature-list">
            <li class="highlight"><Icon name="check" size={12} /> <strong>Unlimited Client Profiles</strong> &amp; Brand Hub</li>
            <li class="highlight"><Icon name="check" size={12} /> <strong>YAML Quote &amp; Invoice Studio</strong> (PDF/Print)</li>
            <li class="highlight"><Icon name="check" size={12} /> <strong>Billable Timer</strong> &amp; Earnings Tracker</li>
            <li class="highlight"><Icon name="check" size={12} /> <strong>5-Folder Project Setup</strong></li>
            <li class="highlight"><Icon name="check" size={12} /> <strong>4K Deliverable ZIP Packaging</strong></li>
          </ul>
        </div>
      </div>

      <!-- License Status or Activation Form -->
      {#if licenseStore.isPro}
        <div class="active-license-card">
          <div class="active-status-row">
            <div class="active-status-badge">
              <span class="active-dot"></span>
              <span>STUDIO PRO ACTIVATED</span>
            </div>
            <span class="offline-badge">100% Offline Validated</span>
          </div>
          <div class="active-meta-grid">
            <div class="active-meta-item">
              <span class="meta-label">Authorized Licensee:</span>
              <span class="meta-value">{licenseStore.licensee}</span>
            </div>
            <div class="active-meta-item">
              <span class="meta-label">License Tier:</span>
              <span class="meta-value text-sky">Commercial Lifetime ($39 One-Time)</span>
            </div>
            <div class="active-meta-item">
              <span class="meta-label">Activated Key:</span>
              <code class="meta-key">{licenseStore.licenseKey ? licenseStore.licenseKey.slice(0, 14) + '...' + licenseStore.licenseKey.slice(-8) : 'KANSO-PRO-VERIFIED'}</code>
            </div>
            <div class="active-meta-item">
              <span class="meta-label">Issue Date:</span>
              <span class="meta-value">{licenseStore.issuedDate || '2026-09-01'}</span>
            </div>
          </div>
          <div class="active-actions-row">
            <button type="button" onclick={handleDeactivate} class="deactivate-btn">
              Deactivate &amp; Revert to Zen Tier
            </button>
          </div>
        </div>
      {:else}
        <!-- License Activation Form -->
        <div class="license-form-section">
          <label for="license-key-input" class="form-label">
            <span>Already have a license key?</span>
            <button type="button" class="sample-key-btn" onclick={fillSampleKey}>
              [Fill Master Alpha Key]
            </button>
          </label>
          <div class="input-row">
            <input
              id="license-key-input"
              type="text"
              bind:value={inputKey}
              placeholder="KANSO-PRO-XXXX-XXXX-VERIFIED"
              class="key-input"
            />
            <button
              type="button"
              onclick={handleActivate}
              disabled={isActivating || !inputKey.trim()}
              class="activate-btn"
            >
              {isActivating ? 'Verifying...' : 'Activate Pro'}
            </button>
          </div>
          <p class="offline-note">
            <Icon name="lock" size={13} /> Validated 100% locally via cryptographic checksum. Zero telemetry or server phone-home.
          </p>
        </div>
      {/if}

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button type="button" onclick={handleClose} class="cancel-btn">
          {licenseStore.isPro ? 'Close' : 'Keep Using Kanso Zen Free'}
        </button>
        {#if !licenseStore.isPro}
          <a
            href="https://github.com/manaphassan/Kanso-Cre8"
            target="_blank"
            rel="noopener noreferrer"
            class="buy-link-btn"
          >
            Get Lifetime License ($39) &rarr;
          </a>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(9, 9, 11, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 16px;
  }

  .modal-surface {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 16px;
    max-width: 640px;
    width: 100%;
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    box-sizing: border-box;
  }

  .modal-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .header-badge-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .k8-pill {
    background: rgba(56, 189, 248, 0.15);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: var(--kanso-accent);
    font-family: var(--kanso-font-mono);
    font-size: 11px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 6px;
  }

  .pro-tag {
    font-family: var(--kanso-font-mono);
    font-size: 11px;
    font-weight: 800;
    color: var(--kanso-warning);
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.25);
    padding: 2px 8px;
    border-radius: 6px;
    letter-spacing: 0.05em;
  }

  .modal-title {
    font-family: var(--kanso-font-display);
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--kanso-text-primary);
    margin: 0;
  }

  .modal-subtitle {
    font-size: 13.5px;
    color: var(--kanso-text-muted);
    margin: 0;
    line-height: 1.45;
  }

  .comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .comp-col {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .comp-col.pro-col {
    border-color: rgba(56, 189, 248, 0.4);
    background: rgba(56, 189, 248, 0.03);
  }

  .comp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .tier-title {
    font-size: 14px;
    font-weight: 800;
    color: var(--kanso-text-primary);
  }

  .tier-title.pro {
    color: var(--kanso-accent);
  }

  .tier-price {
    font-family: var(--kanso-font-mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-text-muted);
  }

  .tier-price.pro {
    color: var(--kanso-success);
    font-weight: 800;
  }

  .comp-desc {
    font-size: 12px;
    color: var(--kanso-text-muted);
    margin: 0;
  }

  .feature-list {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: var(--kanso-text-muted);
  }

  .feature-list li.highlight {
    color: var(--kanso-text-primary);
  }

  .license-form-section {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--kanso-text-muted);
  }

  .sample-key-btn {
    border: none;
    background: transparent;
    color: var(--kanso-accent);
    font-family: var(--kanso-font-mono);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    padding: 0;
  }

  .sample-key-btn:hover {
    text-decoration: underline;
  }

  .input-row {
    display: flex;
    gap: 8px;
  }

  .key-input {
    flex: 1;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 10px 14px;
    font-family: var(--kanso-font-mono);
    font-size: 13px;
    color: var(--kanso-text-primary);
    outline: none;
  }

  .key-input:focus {
    border-color: var(--kanso-accent);
  }

  .activate-btn {
    background: var(--kanso-accent);
    color: var(--kanso-canvas);
    border: none;
    border-radius: 8px;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
    white-space: nowrap;
  }

  .activate-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .activate-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .offline-note {
    font-size: 11.5px;
    color: var(--kanso-text-muted);
    margin: 0;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid var(--kanso-border);
    padding-top: 16px;
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .cancel-btn:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
  }

  .buy-link-btn {
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 700;
    text-decoration: none;
    transition: border-color 0.15s, color 0.15s;
  }

  .buy-link-btn:hover {
    border-color: var(--kanso-accent);
    color: var(--kanso-accent);
  }

  .active-license-card {
    background: rgba(56, 189, 248, 0.05);
    border: 1px solid rgba(56, 189, 248, 0.25);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .active-status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .active-status-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 800;
    color: var(--kanso-success);
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    padding: 3px 8px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }

  .active-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--kanso-success);
  }

  .offline-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    font-family: monospace;
  }

  .active-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    font-size: 12px;
  }

  .active-meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-label {
    font-size: 10.5px;
    color: var(--kanso-text-muted);
    text-transform: uppercase;
    font-weight: 700;
  }

  .meta-value {
    font-weight: 600;
    color: var(--kanso-text-primary);
  }

  .text-sky {
    color: var(--kanso-accent);
  }

  .meta-key {
    font-family: monospace;
    font-size: 11px;
    color: var(--kanso-text-primary);
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
  }

  .active-actions-row {
    display: flex;
    justify-content: flex-end;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .deactivate-btn {
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: var(--kanso-danger);
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .deactivate-btn:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: var(--kanso-danger);
  }

  @media (max-width: 600px) {
    .comparison-grid {
      grid-template-columns: 1fr;
    }
    .input-row {
      flex-direction: column;
    }
    .active-meta-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
