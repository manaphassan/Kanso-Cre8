<script lang="ts">
  import { licenseStore } from '$lib/stores/licenseStore.svelte';
  import { Icon } from '$lib/components/ui';

  let licenseInputKey = $state('');
</script>

<div class="card-surface license-edition-card">
  <div class="card-header">
    <div class="license-header-flex">
      <div>
        <div class="edition-badge-wrap">
          {#if licenseStore.isPro}
            <span class="edition-badge pro">KANSO STUDIO PRO · PERPETUAL</span>
          {:else}
            <span class="edition-badge zen">KANSO ZEN · FREE SANCTUARY</span>
          {/if}
        </div>
        <h2 class="card-title" style="margin-top: 6px;">Studio Edition &amp; Offline Perpetual License</h2>
      </div>
      <div class="offline-badge-pill">
        <Icon name="check" size={14} />
        <span>100% Offline Cryptographic Validation</span>
      </div>
    </div>
    <p class="card-subtitle">
      {#if licenseStore.isPro}
        Your studio is licensed under a one-time perpetual license. Commercial operations, unlimited clients, YAML invoice generation, and custom rate calculators are permanently unlocked.
      {:else}
        You are operating under the free Kanso Zen sanctuary tier. Personal journaling, atomic notes, and focus radio are free forever. Commercial operations require an offline studio key.
      {/if}
    </p>
  </div>

  {#if licenseStore.isPro}
    <div class="active-license-details">
      <div class="license-info-row">
        <div class="info-block">
          <span class="info-label">REGISTERED LICENSEE</span>
          <span class="info-value">{licenseStore.licensee}</span>
        </div>
        <div class="info-block">
          <span class="info-label">LICENSE TIER</span>
          <span class="info-value">Studio Pro (Perpetual)</span>
        </div>
        <div class="info-block">
          <span class="info-label">ACTIVATION DATE</span>
          <span class="info-value">{licenseStore.issuedDate || '2026-09-14'}</span>
        </div>
      </div>

      <div class="info-block key-block">
        <span class="info-label">ACTIVE CRYPTOGRAPHIC KEY</span>
        <div class="key-display-box">
          <code>{licenseStore.licenseKey}</code>
        </div>
      </div>

      <div class="license-actions-row">
        <button type="button" class="btn-secondary danger" onclick={() => licenseStore.deactivate()}>
          Deactivate / Revert to Free Zen Tier
        </button>
      </div>
    </div>
  {:else}
    <div class="license-activation-form">
      <div class="form-group">
        <label class="form-label" for="settings-license-key">Enter Offline Perpetual Key</label>
        <div class="license-input-wrapper">
          <input
            id="settings-license-key"
            type="text"
            class="form-input key-input font-mono"
            bind:value={licenseInputKey}
            placeholder="KANSO-PRO-XXXX-XXXX-VERIFIED"
          />
          <button
            type="button"
            class="btn-primary"
            disabled={!licenseInputKey.trim() || licenseStore.isLoading}
            onclick={async () => {
              const ok = await licenseStore.activate(licenseInputKey);
              if (ok) licenseInputKey = '';
            }}
          >
            {licenseStore.isLoading ? 'Verifying...' : 'Activate Studio Pro'}
          </button>
        </div>
        <span class="form-hint">Keys are validated offline using cryptographic checksums. Zero server calls required.</span>
      </div>

      <div class="quick-fill-row">
        <span class="quick-fill-label">Evaluation / Testing:</span>
        <button type="button" class="quick-fill-btn" onclick={() => { licenseInputKey = 'KANSO-PRO-STUDIO-2026-ALPHA-VERIFIED'; }}>
          Quick-fill Master Studio Alpha Key
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; }
  .license-header-flex { display: flex; justify-content: space-between; align-items: flex-start; }
  .edition-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
  .edition-badge.pro { background: var(--kanso-accent); color: #FFFFFF; }
  .edition-badge.zen { background: var(--kanso-surface-hover); color: var(--kanso-text-muted); border: 1px solid var(--kanso-border); }
  .offline-badge-pill { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--kanso-success); }
  .card-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .card-subtitle { margin: 8px 0 0 0; font-size: 13px; color: var(--kanso-text-muted); line-height: 1.5; }
  .active-license-details { display: flex; flex-direction: column; gap: 16px; margin-top: 20px; }
  .license-info-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .info-block { display: flex; flex-direction: column; gap: 4px; }
  .info-label { font-size: 11px; font-weight: 700; color: var(--kanso-text-muted); }
  .info-value { font-size: 14px; font-weight: 600; color: var(--kanso-text-primary); }
  .key-display-box { padding: 10px 14px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; font-family: monospace; font-size: 13px; color: var(--kanso-accent); }
  .license-actions-row { display: flex; justify-content: flex-end; }
  .license-activation-form { margin-top: 20px; display: flex; flex-direction: column; gap: 12px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-label { font-size: 12px; font-weight: 600; color: var(--kanso-text-muted); }
  .license-input-wrapper { display: flex; gap: 12px; }
  .form-input { flex: 1; height: 38px; padding: 0 12px; border-radius: 6px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); font-size: 13px; }
  .form-input:focus { outline: none; border-color: var(--kanso-accent); }
  .btn-primary { height: 38px; padding: 0 20px; border-radius: 6px; background: var(--kanso-accent); color: #FFFFFF; font-size: 13px; font-weight: 600; border: none; cursor: pointer; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary.danger { color: var(--kanso-danger); background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); padding: 8px 16px; border-radius: 6px; cursor: pointer; }
  .form-hint { font-size: 12px; color: var(--kanso-text-muted); }
  .quick-fill-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--kanso-text-muted); }
  .quick-fill-btn { background: none; border: none; color: var(--kanso-accent); cursor: pointer; text-decoration: underline; font-size: 12px; padding: 0; }
</style>
