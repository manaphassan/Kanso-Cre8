<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';

  let selectedProject = $state<any>(null);
  let isEditorOpen = $state<boolean>(false);
  let draftHeadline = $state<string>('');
  let draftBodyCopy = $state<string>('');
  let draftCta = $state<string>('');
  let isSavingCopy = $state<boolean>(false);

  // Platform limits definitions
  const PLATFORMS = {
    tiktok: { name: 'TikTok Ads Hook', maxChars: 100, optimal: 80, desc: 'Visible on-screen before video tap' },
    metaHeadline: { name: 'Meta Ads Headline', maxChars: 40, optimal: 30, desc: 'Bold title next to CTA button' },
    metaBody: { name: 'Meta Primary Copy', maxChars: 125, optimal: 100, desc: 'Primary text before "...See more"' },
    ecommerce: { name: 'Shopee / Lazada Title', maxChars: 120, optimal: 90, desc: 'Search-indexed marketplace title' }
  };

  onMount(async () => {
    await projectStore.loadProjects();
  });

  function openCopyEditor(project: any) {
    selectedProject = project;
    draftHeadline = project.copywriting?.headline || '';
    draftBodyCopy = project.copywriting?.body_copy || project.copywriting?.content || '';
    draftCta = project.copywriting?.cta || 'Dapatkan Sekarang';
    isEditorOpen = true;
  }

  function closeCopyEditor() {
    isEditorOpen = false;
    selectedProject = null;
  }

  async function handleSaveCopy() {
    if (!selectedProject) return;
    isSavingCopy = true;
    try {
      const fullCopyMarkdown = `# ${draftHeadline || selectedProject.title}\n\n## Headline / Hook\n${draftHeadline}\n\n## Body Copy\n${draftBodyCopy}\n\n## Call To Action\n${draftCta}\n`;
      await ApiClient.updateCopywriting(selectedProject.id || selectedProject.jobId, fullCopyMarkdown);
      
      // Update local store
      if (selectedProject.copywriting) {
        selectedProject.copywriting.headline = draftHeadline;
        selectedProject.copywriting.body_copy = draftBodyCopy;
        selectedProject.copywriting.cta = draftCta;
        selectedProject.copywriting.status = 'ready';
      }
      
      appState.addToast(`Copywriting saved to COPY.md on Synology NAS`, 'success', 'Saved');
      closeCopyEditor();
    } catch (err: any) {
      appState.addToast(`Failed to save copy: ${err.message}`, 'error');
    } finally {
      isSavingCopy = false;
    }
  }

  function copyPreset(template: 'tiktok' | 'facebook' | 'packaging') {
    let text = '';
    if (template === 'tiktok') {
      text = `[HOOK (0-3s)]: "Stop ignoring this one warning sign in your daily routine..."\n[PROBLEM (3-15s)]: Most men suffer in silence without realizing how easy the clinic consultation is.\n[SOLUTION (15-45s)]: SuamiSihat specialized treatment protocols.\n[CTA (45-60s)]: Click the link in bio to book your private doctor consultation today.`;
    } else if (template === 'facebook') {
      text = `Are you feeling fatigued, low on stamina, or struggling with performance?\n\nHere are 3 clinical reasons your hormone levels might be off:\n1. Chronic stress and elevated cortisol\n2. Nutrient depletion\n3. Untreated underlying conditions\n\nAt SuamiSihat Clinic, we specialize in discreet, evidence-based men's health.\n\nBook your consultation: https://suamisihat.clinic/`;
    } else if (template === 'packaging') {
      text = `• Formulated with premium Grade-A clinical herbs\n• 100% natural stamina and vitality support\n• Lab tested for purity and zero synthetic adulterants\n• Directions: Take 1 sachet daily before breakfast`;
    }

    navigator.clipboard.writeText(text);
    appState.addToast('Copy framework copied to clipboard!', 'success');
  }

  function getCharStatus(current: number, max: number) {
    const ratio = current / max;
    if (ratio > 1) return 'exceeded';
    if (ratio >= 0.8) return 'warning';
    return 'good';
  }
</script>

<div class="copy-studio-container">
  <!-- View Header -->
  <div class="view-header">
    <div>
      <h1 class="view-title">Copywriting &amp; Script Studio</h1>
      <p class="view-subtitle">Live marketing copy matrix, social ad character limit validators, and Synology NAS <code>COPY.md</code> sync.</p>
    </div>
  </div>

  <!-- Social Ad SLA Platform Limits Bar -->
  <div class="platform-gauges-grid">
    <div class="gauge-card">
      <div class="gauge-icon">🎵</div>
      <div class="gauge-info">
        <div class="gauge-name">TikTok Ads Hook</div>
        <div class="gauge-meta">Max <b>100 chars</b> (0–3s visual cutoff)</div>
      </div>
    </div>
    <div class="gauge-card">
      <div class="gauge-icon">📱</div>
      <div class="gauge-info">
        <div class="gauge-name">Meta Ad Headline</div>
        <div class="gauge-meta">Max <b>40 chars</b> before truncation</div>
      </div>
    </div>
    <div class="gauge-card">
      <div class="gauge-icon">📄</div>
      <div class="gauge-info">
        <div class="gauge-name">Meta Primary Copy</div>
        <div class="gauge-meta">Optimal <b>125 chars</b> before "...See more"</div>
      </div>
    </div>
    <div class="gauge-card">
      <div class="gauge-icon">🛍️</div>
      <div class="gauge-info">
        <div class="gauge-name">Shopee / Lazada Title</div>
        <div class="gauge-meta">Max <b>120 chars</b> marketplace index</div>
      </div>
    </div>
  </div>

  <!-- Quick Templates Bar -->
  <FluentCard padding="14px 18px">
    <div class="deck-wrapper">
      <div class="deck-left">
        <span class="badge-framework">⚡ FRAMEWORKS</span>
        <span class="deck-title">Quick Ad Copy Frameworks:</span>
      </div>
      <div class="deck-actions">
        <FluentButton appearance="secondary" size="sm" onclick={() => copyPreset('tiktok')}>
          🎵 TikTok Hook Script
        </FluentButton>
        <FluentButton appearance="secondary" size="sm" onclick={() => copyPreset('facebook')}>
          📘 Facebook Problem/Solution
        </FluentButton>
        <FluentButton appearance="secondary" size="sm" onclick={() => copyPreset('packaging')}>
          🌿 Packaging Benefit Claims
        </FluentButton>
      </div>
    </div>
  </FluentCard>

  <!-- Projects Copywriting Matrix Grid -->
  <div class="projects-copy-grid">
    {#each projectStore.projects as p}
      {@const copy = p.copywriting || { status: 'draft' }}
      {@const headlineLen = (copy.headline || '').length}
      {@const bodyLen = (copy.body_copy || copy.content || '').length}
      
      <FluentCard hoverLift padding="18px">
        <div class="copy-card-header">
          <div>
            <div class="job-meta-row">
              <span class="job-id">{p.jobId}</span>
              <span class="brand-chip brand-{(p.brand || 'SS').toLowerCase()}">{p.brand || 'SS'}</span>
            </div>
            <h3 class="proj-title">{p.title}</h3>
          </div>
          <span class="badge status-pill status-{copy.status || 'draft'}">{copy.status || 'draft'}</span>
        </div>

        <div class="copy-box">
          <div class="copy-header-row">
            <span class="copy-label">Headline / Hook</span>
            <span class="char-pill {getCharStatus(headlineLen, 40)}">
              {headlineLen}/40 chars
            </span>
          </div>
          <div class="copy-headline">
            {copy.headline ? `"${copy.headline}"` : 'No headline drafted yet.'}
          </div>

          <div class="copy-header-row" style="margin-top: 12px;">
            <span class="copy-label">Primary Body Copy</span>
            <span class="char-pill {getCharStatus(bodyLen, 125)}">
              {bodyLen} chars
            </span>
          </div>
          <div class="copy-body-snippet">
            {copy.body_copy ? copy.body_copy.substring(0, 130) + (copy.body_copy.length > 130 ? '...' : '') : 'No body copy drafted in workspace.'}
          </div>
        </div>

        <div class="copy-card-footer">
          <FluentButton appearance="primary" size="sm" onclick={() => openCopyEditor(p)}>
            ✍️ Edit Copy &amp; Limits
          </FluentButton>
        </div>
      </FluentCard>
    {/each}
  </div>

  <!-- Live Copy Editor Modal -->
  {#if isEditorOpen && selectedProject}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="editor-backdrop" onclick={(e) => { if (e.target === e.currentTarget) closeCopyEditor(); }}>
      <div class="editor-modal">
        <div class="modal-header">
          <div>
            <span class="job-id">{selectedProject.jobId}</span>
            <h2 class="modal-title">{selectedProject.title}</h2>
          </div>
          <button class="close-modal-btn" onclick={closeCopyEditor}>✕</button>
        </div>

        <div class="modal-body">
          <!-- Headline Input + Live Gauges -->
          <div class="input-section">
            <div class="section-label-row">
              <label class="field-label" for="headline-input">Headline / Video Hook</label>
              <div class="limits-chips">
                <span class="limit-chip {getCharStatus(draftHeadline.length, 40)}">
                  Meta Headline: {draftHeadline.length}/40
                </span>
                <span class="limit-chip {getCharStatus(draftHeadline.length, 100)}">
                  TikTok Hook: {draftHeadline.length}/100
                </span>
              </div>
            </div>
            <input
              id="headline-input"
              type="text"
              bind:value={draftHeadline}
              placeholder="e.g. 3 Tanda Tenaga Menurun &amp; Rawatan Mudah di Klinik"
              class="fluent-input"
            />
          </div>

          <!-- Body Copy Textarea + Live Gauges -->
          <div class="input-section">
            <div class="section-label-row">
              <label class="field-label" for="body-input">Body Copy &amp; Script Matrix</label>
              <div class="limits-chips">
                <span class="limit-chip {getCharStatus(draftBodyCopy.length, 125)}">
                  Meta Primary: {draftBodyCopy.length}/125 chars
                </span>
                <span class="limit-chip {getCharStatus(draftBodyCopy.length, 120)}">
                  Shopee: {draftBodyCopy.length}/120
                </span>
              </div>
            </div>
            <textarea
              id="body-input"
              bind:value={draftBodyCopy}
              placeholder="Enter full advertising script or marketplace product description..."
              class="fluent-textarea"
              rows="7"
            ></textarea>
          </div>

          <!-- CTA Input -->
          <div class="input-section">
            <label class="field-label" for="cta-input">Call To Action (CTA)</label>
            <input
              id="cta-input"
              type="text"
              bind:value={draftCta}
              placeholder="e.g. Tempah Sesi Konsultasi Percuma"
              class="fluent-input"
            />
          </div>
        </div>

        <div class="modal-footer">
          <FluentButton appearance="subtle" onclick={closeCopyEditor}>
            Cancel
          </FluentButton>
          <FluentButton appearance="primary" loading={isSavingCopy} onclick={handleSaveCopy}>
            💾 Save to COPY.md on NAS
          </FluentButton>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .copy-studio-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-bottom: 30px;
  }

  .view-header { margin-bottom: 2px; }
  .view-title { font-size: 26px; font-weight: 800; color: var(--text-primary); }
  .view-subtitle { font-size: 13.5px; color: var(--text-secondary); margin-top: 4px; }

  /* Platform limits grid */
  .platform-gauges-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  .gauge-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: var(--shadow-sm);
  }
  .gauge-icon { font-size: 22px; flex-shrink: 0; }
  .gauge-name { font-size: 12.5px; font-weight: 800; color: var(--text-primary); }
  .gauge-meta { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

  /* Deck */
  .deck-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .deck-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .badge-framework {
    font-size: 10.5px;
    font-weight: 900;
    background: var(--brand-tint, rgba(0, 120, 212, 0.1));
    color: var(--text-brand, #043388);
    padding: 3px 8px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  .deck-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .deck-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* Projects grid */
  .projects-copy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 18px;
  }

  .copy-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .job-meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .job-id {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 800;
    color: var(--brand-accent, #0078D4);
  }
  .brand-chip {
    font-size: 10px;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 3px;
  }
  .brand-ss  { background: #EBF4FE; color: #043388; }
  .brand-ssh { background: #02205720; color: #022057; }
  .brand-ssc { background: #04338820; color: #043388; }
  .brand-ssw { background: #21A1F720; color: #0284C7; }
  .brand-sse { background: #107C4120; color: #107C41; }
  .brand-sst { background: #8764B820; color: #8764B8; }

  .proj-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin-top: 4px;
  }

  .copy-box {
    background: var(--surface-card-subtle, #F8FAFC);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    padding: 12px;
    margin-bottom: 14px;
  }

  .copy-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .copy-label {
    font-size: 11px;
    font-weight: 800;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .char-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
  }
  .char-pill.good { background: #ECFDF5; color: #059669; }
  .char-pill.warning { background: #FFFBEB; color: #D97706; }
  .char-pill.exceeded { background: #FEF2F2; color: #DC2626; font-weight: 800; }

  .copy-headline {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-primary);
    margin-top: 4px;
  }
  .copy-body-snippet {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
    line-height: 1.4;
  }

  .copy-card-footer {
    display: flex;
    justify-content: flex-end;
  }

  .status-pill {
    text-transform: uppercase;
    font-size: 10.5px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .status-ready { background: #10B98120; color: #10B981; }
  .status-draft { background: #64748B20; color: #64748B; }

  /* Modal */
  .editor-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 20px;
  }
  .editor-modal {
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg, 12px);
    width: 100%;
    max-width: 680px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .modal-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--surface-card-border);
    background: var(--surface-card-subtle);
  }
  .modal-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--text-primary);
    margin-top: 2px;
  }
  .close-modal-btn {
    background: transparent;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: var(--text-secondary);
  }

  .modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 70vh;
    overflow-y: auto;
  }
  .input-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .section-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .field-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
  }
  .limits-chips {
    display: flex;
    gap: 6px;
  }
  .limit-chip {
    font-size: 10.5px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .limit-chip.good { background: #ECFDF5; color: #059669; }
  .limit-chip.warning { background: #FFFBEB; color: #D97706; }
  .limit-chip.exceeded { background: #FEF2F2; color: #DC2626; }

  .fluent-input {
    width: 100%;
    height: 38px;
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-sm);
    padding: 0 12px;
    font-size: 13px;
    font-family: inherit;
    color: var(--text-primary);
    background: var(--surface-card);
    outline: none;
    box-sizing: border-box;
  }
  .fluent-input:focus, .fluent-textarea:focus {
    border-color: var(--brand-accent, #0078D4);
  }
  .fluent-textarea {
    width: 100%;
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    font-size: 13px;
    font-family: inherit;
    color: var(--text-primary);
    background: var(--surface-card);
    outline: none;
    box-sizing: border-box;
    resize: vertical;
  }

  .modal-footer {
    padding: 14px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid var(--surface-card-border);
    background: var(--surface-card-subtle);
  }

  @media (max-width: 900px) {
    .platform-gauges-grid { grid-template-columns: 1fr 1fr; }
  }
</style>
