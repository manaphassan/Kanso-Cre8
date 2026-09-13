<script lang="ts">
  import { licenseStore } from '$lib/stores/licenseStore.svelte';

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
            <li>✓ Unlimited Atomic Notes &amp; Scratchpad</li>
            <li>✓ Daily Bullet Journal &amp; Monthly Review</li>
            <li>✓ Retro Cassette Focus Radio &amp; Pomodoro</li>
            <li>✓ Copywriting Studio &amp; Telemetry</li>
            <li>✓ Pure Markdown Storage (100% Offline)</li>
          </ul>
        </div>

        <div class="comp-col pro-col">
          <div class="comp-header">
            <span class="tier-title pro">Studio Pro</span>
            <span class="tier-price pro">$39 One-Time</span>
          </div>
          <p class="comp-desc">The commercial operations engine.</p>
          <ul class="feature-list">
            <li class="highlight">✓ <strong>Unlimited Client Dossiers</strong> &amp; Brand Hub</li>
            <li class="highlight">✓ <strong>YAML Quote &amp; Invoice Studio</strong> (PDF/Print)</li>
            <li class="highlight">✓ <strong>Billable Chronometer</strong> Rate Accrual</li>
            <li class="highlight">✓ <strong>5-Folder Project Scaffolder</strong></li>
            <li class="highlight">✓ <strong>4K Deliverable ZIP Packaging</strong></li>
          </ul>
        </div>
      </div>

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
          🔒 Validated 100% locally via cryptographic checksum. Zero telemetry or server phone-home.
        </p>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button type="button" onclick={handleClose} class="cancel-btn">
          Keep Using Kanso Zen Free
        </button>
        <a
          href="https://github.com/manaphassan/Kanso-Cre8"
          target="_blank"
          rel="noopener noreferrer"
          class="buy-link-btn"
        >
          Get Lifetime License ($39) &rarr;
        </a>
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
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
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
    color: var(--kanso-accent, #38BDF8);
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 6px;
  }

  .pro-tag {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    font-weight: 800;
    color: #F59E0B;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.25);
    padding: 2px 8px;
    border-radius: 6px;
    letter-spacing: 0.05em;
  }

  .modal-title {
    font-family: var(--font-display, sans-serif);
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
  }

  .modal-subtitle {
    font-size: 13.5px;
    color: var(--kanso-text-muted, #71717A);
    margin: 0;
    line-height: 1.45;
  }

  .comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .comp-col {
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
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
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .tier-title.pro {
    color: var(--kanso-accent, #38BDF8);
  }

  .tier-price {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-text-muted, #71717A);
  }

  .tier-price.pro {
    color: #10B981;
    font-weight: 800;
  }

  .comp-desc {
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
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
    color: var(--kanso-text-muted, #71717A);
  }

  .feature-list li.highlight {
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .license-form-section {
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
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
    color: var(--kanso-text-muted, #71717A);
  }

  .sample-key-btn {
    border: none;
    background: transparent;
    color: var(--kanso-accent, #38BDF8);
    font-family: var(--font-mono, monospace);
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
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 10px 14px;
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    color: var(--kanso-text-primary, #F4F4F5);
    outline: none;
  }

  .key-input:focus {
    border-color: var(--kanso-accent, #38BDF8);
  }

  .activate-btn {
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
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
    color: var(--kanso-text-muted, #71717A);
    margin: 0;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid var(--kanso-border, #27272A);
    padding-top: 16px;
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-muted, #71717A);
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .cancel-btn:hover {
    background: var(--kanso-surface-hover, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .buy-link-btn {
    background: var(--kanso-surface-hover, #27272A);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 700;
    text-decoration: none;
    transition: border-color 0.15s, color 0.15s;
  }

  .buy-link-btn:hover {
    border-color: var(--kanso-accent, #38BDF8);
    color: var(--kanso-accent, #38BDF8);
  }

  @media (max-width: 600px) {
    .comparison-grid {
      grid-template-columns: 1fr;
    }
    .input-row {
      flex-direction: column;
    }
  }
</style>
