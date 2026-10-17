<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';

  interface Props {
    direction: any;
    onSave: (newDir: any) => Promise<void>;
  }

  let { direction, onSave }: Props = $props();

  let isEditing = $state(false);
  let editDirection = $state(JSON.parse(JSON.stringify(direction || {})));

  async function handleSave() {
    await onSave(editDirection);
    isEditing = false;
    appState.addToast('Art Direction matrix saved.', 'success');
  }
</script>

<div class="direction-container card-surface">
  <div class="form-section-header">
    <div class="header-titles">
      <h3>Creative &amp; Visual Direction Matrix</h3>
      <p>Core visual tone, typography mood, and brand guidelines for designers.</p>
    </div>
    <div class="header-actions">
      {#if !isEditing}
        <button type="button" class="btn-secondary" onclick={() => (isEditing = true)}>Edit Direction</button>
      {:else}
        <button type="button" class="btn-primary" onclick={handleSave}>Save direction</button>
        <button type="button" class="btn-secondary" onclick={() => (isEditing = false)}>Cancel</button>
      {/if}
    </div>
  </div>

  <div class="direction-grid">
    <!-- Visual Tone -->
    <div class="dir-block">
      <span class="dir-label">Visual Tone &amp; Vibe</span>
      {#if isEditing}
        <input type="text" class="form-input" bind:value={editDirection.visualTone} placeholder="e.g. Minimalist, Tactile, Japanese Modernism" />
      {:else}
        <div class="dir-value">{direction?.visualTone || 'Unspecified visual tone'}</div>
      {/if}
    </div>

    <!-- Typography -->
    <div class="dir-block">
      <span class="dir-label">Typography Hierarchy</span>
      {#if isEditing}
        <input type="text" class="form-input" bind:value={editDirection.typography} placeholder="e.g. Title: Red Hat Display, Body: Nunito" />
      {:else}
        <div class="dir-value">{direction?.typography || 'Default Atelier standard typography'}</div>
      {/if}
    </div>

    <!-- Color Palette -->
    <div class="dir-block" style="grid-column: span 2;">
      <span class="dir-label">Brand Palette &amp; Colors</span>
      {#if isEditing}
        <input type="text" class="form-input font-mono" bind:value={editDirection.palette} placeholder="e.g. #09090B, #18181B, #38BDF8, #F4F4F5" />
      {:else}
        <div class="dir-value font-mono">{direction?.palette || 'var(--kanso-canvas), var(--kanso-surface), var(--kanso-accent)'}</div>
      {/if}
    </div>

    <!-- Notes -->
    <div class="dir-block" style="grid-column: span 2;">
      <span class="dir-label">Creative Mandate &amp; Notes</span>
      {#if isEditing}
        <textarea class="form-textarea" rows="4" bind:value={editDirection.notes} placeholder="Art direction notes, client guardrails, constraints..."></textarea>
      {:else}
        <div class="dir-value notes-text">{direction?.notes || 'No specific creative restrictions configured for this project vault.'}</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; }
  .form-section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 1px solid var(--kanso-border); padding-bottom: 16px; }
  .header-titles h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .header-titles p { margin: 4px 0 0 0; font-size: 12px; color: var(--kanso-text-muted); }
  .header-actions { display: flex; gap: 8px; }
  .direction-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
  @media (max-width: 768px) { .direction-grid { grid-template-columns: 1fr; } }
  .dir-block { display: flex; flex-direction: column; gap: 6px; }
  .dir-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kanso-accent); }
  .dir-value { font-size: 14px; color: var(--kanso-text-primary); padding: 10px 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; }
  .notes-text { line-height: 1.5; white-space: pre-wrap; }
  .form-input, .form-textarea { padding: 10px 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; color: var(--kanso-text-primary); font-size: 13px; }
  .form-input:focus, .form-textarea:focus { outline: none; border-color: var(--kanso-accent); }
  .btn-primary { padding: 6px 16px; background: var(--kanso-accent); color: #FFFFFF; font-size: 12px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; }
  .btn-secondary { padding: 6px 14px; background: var(--kanso-surface-hover); color: var(--kanso-text-primary); font-size: 12px; font-weight: 600; border: 1px solid var(--kanso-border); border-radius: 6px; cursor: pointer; }
</style>
