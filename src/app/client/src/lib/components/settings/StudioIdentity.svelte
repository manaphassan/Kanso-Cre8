<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';

  interface Props {
    studioName: string;
    principalName: string;
    professionalTitle: string;
    tagline: string;
    logo: string;
    brandColor: string;
    onUpdateLogo: (data: string) => void;
    onUpdateBrandColor: (color: string) => void;
    onUpdateField: (field: string, val: string) => void;
  }

  let {
    studioName,
    principalName,
    professionalTitle,
    tagline,
    logo,
    brandColor,
    onUpdateLogo,
    onUpdateBrandColor,
    onUpdateField
  }: Props = $props();

  let logoFileInput = $state<HTMLInputElement>();

  const avatarColors = [
    { label: 'Electric Sky', hex: '#38BDF8' },
    { label: 'Fluent Blue', hex: '#0078D4' },
    { label: 'Emerald Mint', hex: '#10B981' },
    { label: 'Amber Gold', hex: '#F59E0B' },
    { label: 'Purple Haze', hex: '#8B5CF6' },
    { label: 'Rose Crimson', hex: '#F43F5E' },
    { label: 'Porcelain Zinc', hex: '#71717A' }
  ];

  function triggerLogoUpload() {
    if (logoFileInput) logoFileInput.click();
  }

  function handleLogoSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      appState.addToast('Please select a valid image file (PNG, JPG, WEBP, SVG).', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onUpdateLogo((e.target?.result as string) || '');
      appState.addToast('Studio Logo loaded. Click "Save Studio Profile" to apply.', 'success');
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    onUpdateLogo('');
    appState.addToast('Studio Logo removed. Monogram initials will be used.', 'info');
  }
</script>

<div class="card-surface">
  <div class="card-header">
    <h2 class="card-title">1. Studio &amp; Principal Brand Identity</h2>
    <p class="card-subtitle">Your studio name, principal designer identity, and visual trade mark.</p>
  </div>

  <div class="avatar-manager-row">
    <div class="avatar-preview-wrap">
      <div class="avatar-display" style="background: {brandColor || 'var(--kanso-accent)'};">
        {#if logo}
          <img src={logo} alt={studioName || principalName} class="avatar-img" />
        {:else}
          <span class="avatar-text">{(studioName || principalName || 'H').charAt(0).toUpperCase()}</span>
        {/if}
      </div>
    </div>

    <div class="avatar-actions">
      <div class="avatar-btn-row">
        <input type="file" accept="image/*" bind:this={logoFileInput} onchange={handleLogoSelected} style="display: none;" />
        <button type="button" class="btn-secondary" onclick={triggerLogoUpload}>Upload Studio Logo</button>
        {#if logo}
          <button type="button" class="btn-secondary danger" onclick={removeLogo}>Remove Logo</button>
        {/if}
      </div>
      <p class="avatar-hint">PNG, JPG, SVG, or WEBP. Square or circle monogram recommended.</p>

      <div class="color-picker-row">
        <span class="color-label">Brand Accent Swatch:</span>
        <div class="swatches-list">
          {#each avatarColors as c}
            <button
              type="button"
              class="swatch-circle"
              class:selected={brandColor === c.hex}
              style="background: {c.hex};"
              title={c.label}
              onclick={() => onUpdateBrandColor(c.hex)}
            ></button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <div class="form-grid-2" style="margin-top: 16px;">
    <div class="form-group">
      <label class="form-label" for="studio-name-input">Studio / Trade Entity Name</label>
      <input
        id="studio-name-input"
        type="text"
        class="form-input"
        value={studioName}
        oninput={(e) => onUpdateField('studioName', (e.target as HTMLInputElement).value)}
        placeholder="e.g. HaNa Innovation"
      />
    </div>
    <div class="form-group">
      <label class="form-label" for="principal-name-input">Principal Designer / Creative Director</label>
      <input
        id="principal-name-input"
        type="text"
        class="form-input"
        value={principalName}
        oninput={(e) => onUpdateField('principalName', (e.target as HTMLInputElement).value)}
        placeholder="e.g. Harussani"
      />
    </div>
    <div class="form-group">
      <label class="form-label" for="role-input">Professional Title &amp; Practice</label>
      <input
        id="role-input"
        type="text"
        class="form-input"
        value={professionalTitle}
        oninput={(e) => onUpdateField('professionalTitle', (e.target as HTMLInputElement).value)}
        placeholder="e.g. Principal Art Director & Brand Architect"
      />
    </div>
    <div class="form-group">
      <label class="form-label" for="tagline-input">Studio Tagline / Philosophy</label>
      <input
        id="tagline-input"
        type="text"
        class="form-input"
        value={tagline}
        oninput={(e) => onUpdateField('tagline', (e.target as HTMLInputElement).value)}
        placeholder="e.g. Mindful Brand Systems & Digital Craft"
      />
    </div>
  </div>
</div>

<style>
  .card-surface {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 24px;
  }
  .card-header {
    margin-bottom: 20px;
  }
  .card-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .card-subtitle {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: var(--kanso-text-muted);
  }
  .avatar-manager-row {
    display: flex;
    gap: 20px;
    align-items: center;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--kanso-border);
  }
  .avatar-preview-wrap {
    flex-shrink: 0;
  }
  .avatar-display {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 24px;
    font-weight: 700;
    overflow: hidden;
  }
  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .avatar-actions {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .avatar-btn-row {
    display: flex;
    gap: 8px;
  }
  .avatar-hint {
    margin: 0;
    font-size: 12px;
    color: var(--kanso-text-muted);
  }
  .color-picker-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
  }
  .color-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-primary);
  }
  .swatches-list {
    display: flex;
    gap: 8px;
  }
  .swatch-circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    transition: transform 0.15s ease;
  }
  .swatch-circle:hover {
    transform: scale(1.15);
  }
  .swatch-circle.selected {
    border-color: var(--kanso-text-primary);
    transform: scale(1.15);
  }
  .form-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  @media (max-width: 768px) {
    .form-grid-2 {
      grid-template-columns: 1fr;
    }
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .form-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-muted);
  }
  .form-input {
    height: 38px;
    padding: 0 12px;
    border-radius: 6px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
    font-size: 13px;
  }
  .form-input:focus {
    outline: none;
    border-color: var(--kanso-accent);
  }
  .btn-secondary {
    height: 32px;
    padding: 0 14px;
    border-radius: 6px;
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--kanso-border);
    cursor: pointer;
  }
  .btn-secondary:hover {
    background: var(--kanso-border);
  }
  .btn-secondary.danger {
    color: var(--kanso-danger);
  }
</style>
