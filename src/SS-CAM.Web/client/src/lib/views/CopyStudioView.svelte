<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';
  import CreativeAiAssistantModal from '$lib/components/features/CreativeAiAssistantModal.svelte';

  let selectedProject = $state<any>(null);
  let isEditorOpen = $state<boolean>(false);
  let draftHeadline = $state<string>('');
  let draftBodyCopy = $state<string>('');
  let draftCta = $state<string>('');
  let isSavingCopy = $state<boolean>(false);
  let showAiModal = $state<boolean>(false);

  type MockupPlatform = 'whatsapp' | 'meta' | 'tiktok';
  let activeMockupTab = $state<MockupPlatform>('whatsapp');
  let metaSeeMoreExpanded = $state<boolean>(false);

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
    activeMockupTab = 'whatsapp';
    metaSeeMoreExpanded = false;
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

  function insertSnippet(type: 'hook' | 'problem' | 'solution' | 'disclaimer' | 'cta') {
    if (type === 'hook') {
      draftHeadline = '🔥 3 Tanda Tenaga Lelaki Merosot & Rawatan Pantas';
    } else if (type === 'problem') {
      draftBodyCopy += (draftBodyCopy ? '\n\n' : '') + '⚠️ Ramai lelaki abaikan simptom awal seperti cepat letih, hilang fokus, dan prestasi menurun akibat tekanan kerja.';
    } else if (type === 'solution') {
      draftBodyCopy += (draftBodyCopy ? '\n\n' : '') + '💡 Formula klinikal SuamiSihat dirumus khas dengan herba gred-A untuk menyokong kecergasan optimum secara 100% semulajadi.';
    } else if (type === 'disclaimer') {
      draftBodyCopy += (draftBodyCopy ? '\n\n' : '') + '📋 *Penafian*: Hasil rawatan mungkin berbeza mengikut individu. Disahkan bebas bahan kimia terlarang.';
    } else if (type === 'cta') {
      draftCta = 'Tempah Sesi Konsultasi Percuma';
    }
    appState.addToast('Snippet inserted into editor', 'info');
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

  function formatWhatsAppText(text: string) {
    if (!text) return '<i>Taipkan teks mesej di sebelah kiri...</i>';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/~([^~]+)~/g, '<del>$1</del>')
      .replace(/\n/g, '<br/>');
  }
</script>

<div class="copy-studio-container">
  <!-- View Header -->
  <div class="view-header">
    <div>
      <h1 class="view-title">Copywriting &amp; Script Studio</h1>
      <p class="view-subtitle">Live advertising copy matrix, social platform character limit validators, and Synology NAS <code>COPY.md</code> sync.</p>
    </div>
    <button class="ai-launch-btn" onclick={() => showAiModal = true}>
      ✨ Gemini Creative AI
    </button>
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
            ✍️ Edit Copy &amp; Live Preview
          </FluentButton>
        </div>
      </FluentCard>
    {/each}
  </div>

  <!-- Live Copy Editor Split Modal -->
  {#if isEditorOpen && selectedProject}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="editor-backdrop" onclick={(e) => { if (e.target === e.currentTarget) closeCopyEditor(); }}>
      <div class="editor-modal-split">
        <!-- Modal Top Header -->
        <div class="modal-header">
          <div class="modal-header-left">
            <span class="badge-brand">{selectedProject.brand || 'SS'}</span>
            <span class="job-id-lg">{selectedProject.jobId}</span>
            <h2 class="modal-title">{selectedProject.title}</h2>
          </div>
          <div class="modal-header-right">
            <button class="close-modal-btn" onclick={closeCopyEditor}>✕ Close</button>
          </div>
        </div>

        <!-- Modal Split Body -->
        <div class="modal-split-body">
          <!-- LEFT PANE: Editor & Snippet Matrix -->
          <div class="editor-left-pane">
            <div class="pane-headline">
              <span class="pane-title">📝 COPYWRITING EDITOR</span>
              <span class="pane-sub">Writes to <code>03_COPYWRITING/COPY.md</code></span>
            </div>

            <!-- Quick Snippet Inserters -->
            <div class="snippet-drawer">
              <span class="snippet-label">Quick Snippets:</span>
              <button class="snippet-btn ai-snippet-btn" onclick={() => showAiModal = true}>✨ Gemini AI Generator</button>
              <button class="snippet-btn" onclick={() => insertSnippet('hook')}>+ Viral Hook</button>
              <button class="snippet-btn" onclick={() => insertSnippet('problem')}>+ Agitation</button>
              <button class="snippet-btn" onclick={() => insertSnippet('solution')}>+ Solution</button>
              <button class="snippet-btn" onclick={() => insertSnippet('disclaimer')}>+ Medical Disclaimer</button>
              <button class="snippet-btn" onclick={() => insertSnippet('cta')}>+ Action CTA</button>
            </div>

            <!-- Headline Input + Live Gauges -->
            <div class="input-section">
              <div class="section-label-row">
                <label class="field-label" for="headline-input">Headline / Hook</label>
                <div class="limits-chips">
                  <span class="limit-chip {getCharStatus(draftHeadline.length, 40)}">
                    Meta Headline: {draftHeadline.length}/40
                  </span>
                  <span class="limit-chip {getCharStatus(draftHeadline.length, 100)}">
                    TikTok: {draftHeadline.length}/100
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
                <label class="field-label" for="body-input">Body Copy &amp; Script Matrix (Markdown Supported)</label>
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
                placeholder="Enter full advertising script or WhatsApp message (supports *bold*, _italic_, ~strike~)..."
                class="fluent-textarea"
                rows="8"
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

          <!-- RIGHT PANE: Interactive Mockup Live Simulator -->
          <div class="mockup-right-pane">
            <!-- Mockup Platform Tabs -->
            <div class="mockup-tabs">
              <button 
                class="mockup-tab {activeMockupTab === 'whatsapp' ? 'active' : ''}" 
                onclick={() => activeMockupTab = 'whatsapp'}
              >
                <span>💬 WhatsApp Bubble</span>
              </button>
              <button 
                class="mockup-tab {activeMockupTab === 'meta' ? 'active' : ''}" 
                onclick={() => activeMockupTab = 'meta'}
              >
                <span>📱 Meta Feed Ad</span>
              </button>
              <button 
                class="mockup-tab {activeMockupTab === 'tiktok' ? 'active' : ''}" 
                onclick={() => activeMockupTab = 'tiktok'}
              >
                <span>🎵 TikTok 9:16</span>
              </button>
            </div>

            <div class="mockup-viewport">
              <!-- 1. WHATSAPP MOCKUP -->
              {#if activeMockupTab === 'whatsapp'}
                <div class="whatsapp-mockup-wrapper">
                  <div class="whatsapp-header">
                    <div class="wa-avatar">SS</div>
                    <div class="wa-user">
                      <div class="wa-name">SuamiSihat Official</div>
                      <div class="wa-status">Online</div>
                    </div>
                  </div>

                  <div class="whatsapp-chat-body">
                    <div class="wa-message-bubble">
                      {#if draftHeadline}
                        <div class="wa-headline">*{draftHeadline}*</div>
                      {/if}
                      <div class="wa-content">
                        {@html formatWhatsAppText(draftBodyCopy)}
                      </div>
                      {#if draftCta}
                        <div class="wa-cta-box">
                          👉 <b>{draftCta}</b>
                        </div>
                      {/if}
                      <div class="wa-meta">
                        <span>10:42 AM</span>
                        <span class="wa-ticks">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

              <!-- 2. META / FACEBOOK AD MOCKUP -->
              {:else if activeMockupTab === 'meta'}
                <div class="meta-mockup-wrapper">
                  <div class="meta-card-header">
                    <div class="meta-page-avatar">SS</div>
                    <div class="meta-page-info">
                      <div class="meta-page-name">SuamiSihat Care</div>
                      <div class="meta-ad-label">Sponsored · 🌐</div>
                    </div>
                    <button class="meta-more-btn">•••</button>
                  </div>

                  <div class="meta-primary-text">
                    {#if metaSeeMoreExpanded || draftBodyCopy.length <= 125}
                      {draftBodyCopy || 'Enter your primary advertising copy to preview live feed card presentation.'}
                    {:else}
                      {draftBodyCopy.substring(0, 125)}...
                      <button class="see-more-link" onclick={() => metaSeeMoreExpanded = true}>See more</button>
                    {/if}
                  </div>

                  <div class="meta-media-preview">
                    <div class="meta-media-placeholder">
                      <span class="media-icon">🖼️</span>
                      <span>Campaign Creative Proof</span>
                    </div>
                  </div>

                  <div class="meta-bottom-bar">
                    <div class="meta-text-col">
                      <span class="meta-domain">SUAMISIHAT.COM</span>
                      <div class="meta-headline">{draftHeadline || 'Campaign Headline'}</div>
                    </div>
                    <button class="meta-cta-btn">{draftCta || 'Learn More'}</button>
                  </div>
                </div>

              <!-- 3. TIKTOK 9:16 MOCKUP -->
              {:else if activeMockupTab === 'tiktok'}
                <div class="tiktok-mockup-wrapper">
                  <div class="tiktok-overlay">
                    <!-- Right Actions Sidebar -->
                    <div class="tiktok-sidebar">
                      <div class="tt-avatar">SS</div>
                      <div class="tt-action"><span>❤️</span><small>42.8K</small></div>
                      <div class="tt-action"><span>💬</span><small>1.2K</small></div>
                      <div class="tt-action"><span>🔖</span><small>3.4K</small></div>
                      <div class="tt-action"><span>↗️</span><small>Share</small></div>
                      <div class="tt-music-disc">🎵</div>
                    </div>

                    <!-- Bottom Caption -->
                    <div class="tiktok-bottom">
                      <div class="tt-username">@suamisihat.official</div>
                      <div class="tt-caption">
                        {draftHeadline ? draftHeadline : (draftBodyCopy ? draftBodyCopy.substring(0, 100) : 'TikTok hook caption overlay (0-3s visual limit)...')}
                      </div>
                      <div class="tt-music-track">
                        <span>🎶 Original Sound - SuamiSihat Creative</span>
                      </div>
                      {#if draftCta}
                        <div class="tt-cta-pill">
                          <span>🔗 {draftCta}</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Modal Bottom Footer -->
        <div class="modal-footer">
          <FluentButton appearance="subtle" onclick={closeCopyEditor}>
            Cancel
          </FluentButton>
          <FluentButton appearance="primary" loading={isSavingCopy} onclick={handleSaveCopy}>
            💾 Save COPY.md to Synology Vault
          </FluentButton>
        </div>
      </div>
    </div>
  {/if}

  <!-- Creative AI Studio Modal -->
  <CreativeAiAssistantModal
    bind:open={showAiModal}
    brand={selectedProject?.brand || 'SSH'}
    projectTitle={selectedProject?.title}
    onInsertCopy={(text) => {
      draftBodyCopy += text;
    }}
  />
</div>

<style>
  .copy-studio-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-bottom: 30px;
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }
  .view-title { font-size: 26px; font-weight: 800; color: var(--text-primary); }
  .view-subtitle { font-size: 13.5px; color: var(--text-secondary); margin-top: 4px; }

  .ai-launch-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #043388, #21A1F7);
    color: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(33, 161, 247, 0.35);
    transition: all 0.15s ease;
  }
  .ai-launch-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(33, 161, 247, 0.5);
  }

  .ai-snippet-btn {
    background: rgba(33, 161, 247, 0.15) !important;
    border-color: #21A1F7 !important;
    color: #38BDF8 !important;
    font-weight: 800 !important;
  }
  .ai-snippet-btn:hover {
    background: #21A1F7 !important;
    color: #0F172A !important;
  }

  /* Platform limits grid */
  .platform-gauges-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .gauge-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E2E8F0);
    border-radius: var(--radius-lg, 12px);
  }

  .gauge-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(33, 161, 247, 0.1);
    border-radius: 8px;
    flex-shrink: 0;
  }

  .gauge-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
  .gauge-meta { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

  /* Framework Deck */
  .deck-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .deck-left { display: flex; align-items: center; gap: 10px; }
  .badge-framework {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    background: #043388;
    color: #FFFFFF;
  }
  .deck-title { font-size: 13px; font-weight: 700; color: var(--text-primary); }
  .deck-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* Projects Grid */
  .projects-copy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
  }

  .copy-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .job-meta-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .job-id { font-size: 11px; font-weight: 800; font-family: monospace; color: var(--brand-accent); }
  .brand-chip {
    font-size: 10px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(33, 161, 247, 0.15);
    color: var(--brand-accent);
  }
  .proj-title { font-size: 15px; font-weight: 700; color: var(--text-primary); line-height: 1.3; }

  .copy-box {
    background: var(--bg-app, #F8FAFC);
    border: 1px solid var(--surface-card-border, #E2E8F0);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 14px;
  }

  .copy-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .copy-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); }
  .char-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
  }
  .char-pill.good { background: rgba(16, 185, 129, 0.15); color: #10B981; }
  .char-pill.warning { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
  .char-pill.exceeded { background: rgba(239, 68, 68, 0.15); color: #EF4444; }

  .copy-headline { font-size: 13px; font-weight: 600; color: var(--text-primary); font-style: italic; }
  .copy-body-snippet { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }

  .copy-card-footer { display: flex; justify-content: flex-end; }

  /* SPLIT MODAL */
  .editor-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1600;
    padding: 24px;
  }

  .editor-modal-split {
    width: 95%;
    max-width: 1180px;
    height: 88vh;
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E2E8F0);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid var(--surface-card-border, #E2E8F0);
    background: var(--surface-card, #FFFFFF);
  }

  .modal-header-left { display: flex; align-items: center; gap: 10px; }
  .badge-brand {
    font-size: 11px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    background: #043388;
    color: #FFFFFF;
  }
  .job-id-lg { font-size: 14px; font-weight: 800; font-family: monospace; color: var(--brand-accent); }
  .modal-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }

  .close-modal-btn {
    background: none;
    border: none;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .modal-split-body {
    flex: 1;
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    overflow: hidden;
  }

  /* Left Pane: Editor */
  .editor-left-pane {
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    border-right: 1px solid var(--surface-card-border, #E2E8F0);
  }

  .pane-headline { display: flex; flex-direction: column; gap: 2px; }
  .pane-title { font-size: 12px; font-weight: 800; letter-spacing: 0.5px; color: var(--brand-accent); }
  .pane-sub { font-size: 11px; color: var(--text-secondary); }

  .snippet-drawer {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding: 8px 12px;
    background: rgba(33, 161, 247, 0.06);
    border: 1px dashed rgba(33, 161, 247, 0.3);
    border-radius: 8px;
  }

  .snippet-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
  .snippet-btn {
    padding: 3px 8px;
    border-radius: 4px;
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #CBD5E1);
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .snippet-btn:hover { background: #043388; color: #FFFFFF; border-color: #043388; }

  .input-section { display: flex; flex-direction: column; gap: 6px; }
  .section-label-row { display: flex; align-items: center; justify-content: space-between; }
  .field-label { font-size: 12px; font-weight: 700; color: var(--text-primary); }

  .limits-chips { display: flex; gap: 6px; }
  .limit-chip {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
  }
  .limit-chip.good { background: rgba(16, 185, 129, 0.15); color: #10B981; }
  .limit-chip.warning { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
  .limit-chip.exceeded { background: rgba(239, 68, 68, 0.15); color: #EF4444; }

  .fluent-input, .fluent-textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    background: var(--bg-app, #F8FAFC);
    border: 1px solid var(--surface-card-border, #CBD5E1);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-primary);
    outline: none;
    font-family: inherit;
  }
  .fluent-input:focus, .fluent-textarea:focus {
    border-color: var(--brand-accent);
    box-shadow: 0 0 0 3px rgba(33, 161, 247, 0.15);
  }

  /* Right Pane: Live Mockup */
  .mockup-right-pane {
    background: #090D16;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .mockup-tabs {
    display: flex;
    background: rgba(15, 23, 42, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 6px 12px;
    gap: 8px;
  }

  .mockup-tab {
    padding: 6px 12px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
    color: #94A3B8;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .mockup-tab.active {
    background: #043388;
    color: #FFFFFF;
    border-color: #21A1F7;
  }

  .mockup-viewport {
    flex: 1;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  /* WhatsApp Simulator */
  .whatsapp-mockup-wrapper {
    width: 100%;
    max-width: 380px;
    background: #0B141A;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .whatsapp-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #1F2C34;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .wa-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #00A884;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    color: #FFF;
    font-size: 12px;
  }
  .wa-name { font-size: 13px; font-weight: 700; color: #E9EDEF; }
  .wa-status { font-size: 11px; color: #8696A0; }

  .whatsapp-chat-body {
    padding: 16px 14px;
    background: radial-gradient(circle at center, #111B21 0%, #0B141A 100%);
    min-height: 280px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .wa-message-bubble {
    background: #005C4B;
    color: #E9EDEF;
    padding: 10px 12px;
    border-radius: 8px 0 8px 8px;
    align-self: flex-end;
    max-width: 90%;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    font-size: 13px;
    line-height: 1.4;
  }

  .wa-headline { font-weight: 700; margin-bottom: 4px; color: #FFF; }
  .wa-content { word-break: break-word; }
  .wa-cta-box {
    margin-top: 8px;
    padding: 6px 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    font-size: 12px;
    color: #53BDEB;
  }
  .wa-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    font-size: 10px;
    color: #8696A0;
    margin-top: 4px;
  }
  .wa-ticks { color: #53BDEB; font-weight: 900; }

  /* Meta Feed Ad Simulator */
  .meta-mockup-wrapper {
    width: 100%;
    max-width: 380px;
    background: #242526;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .meta-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
  }
  .meta-page-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #1877F2;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    color: #FFF;
    font-size: 13px;
  }
  .meta-page-name { font-size: 13px; font-weight: 700; color: #E4E6EB; }
  .meta-ad-label { font-size: 11px; color: #B0B3B8; }
  .meta-more-btn { margin-left: auto; background: none; border: none; color: #B0B3B8; cursor: pointer; }

  .meta-primary-text {
    padding: 0 14px 10px 14px;
    font-size: 13px;
    color: #E4E6EB;
    line-height: 1.4;
  }
  .see-more-link {
    background: none;
    border: none;
    color: #B0B3B8;
    font-weight: 700;
    cursor: pointer;
    padding: 0;
  }

  .meta-media-preview {
    width: 100%;
    height: 180px;
    background: #18191A;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .meta-media-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #B0B3B8;
    font-size: 12px;
    gap: 6px;
  }
  .media-icon { font-size: 28px; }

  .meta-bottom-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: #3A3B3C;
  }
  .meta-text-col { display: flex; flex-direction: column; }
  .meta-domain { font-size: 10px; color: #B0B3B8; }
  .meta-headline { font-size: 13px; font-weight: 700; color: #E4E6EB; }
  .meta-cta-btn {
    padding: 6px 12px;
    background: #E4E6EB;
    color: #050505;
    font-size: 12px;
    font-weight: 700;
    border: none;
    border-radius: 6px;
  }

  /* TikTok 9:16 Simulator */
  .tiktok-mockup-wrapper {
    width: 220px;
    height: 380px;
    background: #000;
    border-radius: 20px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.2);
  }

  .tiktok-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 12px;
    box-sizing: border-box;
    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%);
  }

  .tiktok-sidebar {
    position: absolute;
    right: 8px;
    bottom: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .tt-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #FE2C55;
    font-size: 10px;
    font-weight: 900;
    color: #FFF;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tt-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 14px;
  }
  .tt-action small { font-size: 9px; color: #FFF; font-weight: 700; }
  .tt-music-disc {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #25F4EE;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    animation: spin 3s linear infinite;
  }

  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .tiktok-bottom {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 36px;
  }

  .tt-username { font-size: 11px; font-weight: 800; color: #FFF; }
  .tt-caption { font-size: 11px; color: #EEE; line-height: 1.3; }
  .tt-music-track { font-size: 9px; color: #CCC; }
  .tt-cta-pill {
    margin-top: 4px;
    background: rgba(254, 44, 85, 0.9);
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    color: #FFF;
    align-self: flex-start;
  }

  /* Modal Footer */
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 14px 24px;
    border-top: 1px solid var(--surface-card-border, #E2E8F0);
    background: var(--surface-card, #FFFFFF);
    gap: 10px;
  }

  @media (max-width: 900px) {
    .modal-split-body { grid-template-columns: 1fr; }
    .mockup-right-pane { display: none; }
    .platform-gauges-grid { grid-template-columns: 1fr 1fr; }
  }
</style>
