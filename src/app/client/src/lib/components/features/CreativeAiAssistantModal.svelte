<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  interface Props {
    open?: boolean;
    brand?: string;
    projectTitle?: string;
    onInsertCopy?: (content: string) => void;
    onClose?: () => void;
  }

  let {
    open = $bindable(false),
    brand = 'ACME',
    projectTitle = '',
    onInsertCopy,
    onClose
  }: Props = $props();

  type TabType = 'hooks' | 'scripts' | 'image_prompts' | 'ultra_prompt' | 'settings';
  let activeTab = $state<TabType>('hooks');

  // Generation Inputs
  let selectedBrand = $state<string>('ACME');
  let productInput = $state<string>('');
  let audienceInput = $state<string>('B2B Founders & Design Directors');
  let angleInput = $state<string>('Pain Point & Agitation');
  let languageInput = $state<string>('English');
  let platformInput = $state<string>('Meta Feed');
  let selectedHookInput = $state<string>('');

  // Image Prompt Inputs
  let imageStyle = $state<string>('Photorealistic Commercial Studio');
  let imageEnv = $state<string>('Minimalist Dark Luxury, Volumetric Hairline Backlighting');
  let imageColors = $state<string>('var(--kanso-accent) Sky Cyan, var(--kanso-surface) Dark Zinc');

  // Output State
  let generatedOutput = $state<string>('');
  let isGenerating = $state<boolean>(false);
  let aiStatus = $state<{ configured: boolean; preferredModel: string; availableModels: string[] }>({
    configured: false,
    preferredModel: 'gemini-1.5-flash',
    availableModels: ['gemini-1.5-flash', 'gemini-1.5-pro']
  });

  // Settings State
  let newApiKey = $state<string>('');
  let newModel = $state<string>('gemini-1.5-flash');
  let isSavingSettings = $state<boolean>(false);

  $effect(() => {
    if (open) {
      selectedBrand = brand || 'ACME';
      if (projectTitle && !productInput) productInput = projectTitle;
      loadAiStatus();
    }
  });

  async function loadAiStatus() {
    try {
      const res = await ApiClient.getAiStatus();
      aiStatus = res;
      newModel = res.preferredModel || 'gemini-1.5-flash';
    } catch (e: any) {
      console.warn('[CreativeAiAssistantModal] loadAiStatus error:', e.message);
    }
  }

  async function handleGenerateHooks() {
    if (!productInput.trim()) {
      appState.addToast('Please enter a product or campaign topic', 'warning');
      return;
    }
    isGenerating = true;
    generatedOutput = '';
    try {
      const res = await ApiClient.generateAiHooks({
        brand: selectedBrand,
        product: productInput,
        audience: audienceInput,
        angle: angleInput,
        language: languageInput
      });
      generatedOutput = res.hooks;
      appState.addToast('Viral hooks composed.', 'success');
    } catch (err: any) {
      if (!aiStatus.configured) {
        activeTab = 'settings';
        appState.addToast('Please configure your Google AI Studio API key first', 'info');
      } else {
        appState.addToast(`Generation failed: ${err.message}`, 'error');
      }
    } finally {
      isGenerating = false;
    }
  }

  async function handleGenerateScript() {
    if (!productInput.trim()) {
      appState.addToast('Please enter a product or campaign topic', 'warning');
      return;
    }
    isGenerating = true;
    generatedOutput = '';
    try {
      const res = await ApiClient.generateAiScript({
        brand: selectedBrand,
        product: productInput,
        hook: selectedHookInput,
        platform: platformInput,
        language: languageInput
      });
      generatedOutput = res.script;
      appState.addToast('Advertising script generated.', 'success');
    } catch (err: any) {
      if (!aiStatus.configured) {
        activeTab = 'settings';
        appState.addToast('Please configure your Google AI Studio API key first', 'info');
      } else {
        appState.addToast(`Generation failed: ${err.message}`, 'error');
      }
    } finally {
      isGenerating = false;
    }
  }

  async function handleGenerateImagePrompts() {
    if (!productInput.trim()) {
      appState.addToast('Please enter a product name for image prompts', 'warning');
      return;
    }
    isGenerating = true;
    generatedOutput = '';
    try {
      const res = await ApiClient.generateAiImagePrompts({
        product: productInput,
        style: imageStyle,
        environment: imageEnv,
        brandColors: imageColors
      });
      generatedOutput = res.prompts;
      appState.addToast('Commercial photography prompts generated.', 'success');
    } catch (err: any) {
      if (!aiStatus.configured) {
        activeTab = 'settings';
        appState.addToast('Please configure your Google AI Studio API key first', 'info');
      } else {
        appState.addToast(`Generation failed: ${err.message}`, 'error');
      }
    } finally {
      isGenerating = false;
    }
  }

  async function handleFormatUltraPrompt() {
    try {
      const res = await ApiClient.formatUltraPrompt({
        brand: selectedBrand,
        title: productInput || projectTitle || 'Acme Operations Campaign',
        audience: audienceInput,
        goal: 'High-conversion direct response marketing asset generation'
      });
      generatedOutput = res.prompt;
    } catch (err: any) {
      console.warn('[FormatUltraPrompt] Error:', err.message);
    }
  }

  async function copyOutput() {
    if (!generatedOutput) return;
    try {
      await navigator.clipboard.writeText(generatedOutput);
      appState.addToast('Copied to clipboard.', 'success');
    } catch (e) {
      appState.addToast('Could not copy automatically', 'info');
    }
  }

  function handleInsertIntoCopy() {
    if (!generatedOutput) return;
    if (onInsertCopy) {
      onInsertCopy(`\n\n## Gemini AI Generated Content\n\n${generatedOutput}\n`);
      appState.addToast('Inserted into COPY.md editor.', 'success');
      closeModal();
    }
  }

  async function saveAiSettings() {
    isSavingSettings = true;
    try {
      const res = await ApiClient.saveAiConfig({ apiKey: newApiKey, preferredModel: newModel });
      aiStatus = res.status;
      newApiKey = '';
      appState.addToast('Gemini API configuration saved.', 'success');
      activeTab = 'hooks';
    } catch (err: any) {
      appState.addToast(`Failed to save settings: ${err.message}`, 'error');
    } finally {
      isSavingSettings = false;
    }
  }

  function closeModal() {
    open = false;
    if (onClose) onClose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="ai-backdrop" onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="ai-modal">
      <!-- Header -->
      <div class="ai-header">
        <div class="header-left">
          <div class="ai-icon-badge">
            <Icon name="sparkles" size={20} color="var(--kanso-accent)" />
          </div>
          <div>
            <div class="title-row">
              <h2 class="modal-title">Kanso Cre8 AI Studio</h2>
              <span class="model-badge {aiStatus.configured ? 'ready' : 'ready'}">
                <span class="status-dot"></span>
                {aiStatus.configured ? aiStatus.preferredModel : 'API Key Required'}
              </span>
            </div>
            <p class="modal-sub">Direct Gemini 1.5 Pro / Flash generator &amp; Gemini Ultra prompt packager.</p>
          </div>
        </div>
        <button class="close-btn" onclick={closeModal} title="Close Modal">
          <Icon name="close" size={16} />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="ai-tabs-bar">
        <button class="tab-btn {activeTab === 'hooks' ? 'active' : ''}" onclick={() => activeTab = 'hooks'}>
          <Icon name="bolt" size={14} />
          <span>Viral Hooks</span>
        </button>
        <button class="tab-btn {activeTab === 'scripts' ? 'active' : ''}" onclick={() => activeTab = 'scripts'}>
          <Icon name="file" size={14} />
          <span>Ad Scripts</span>
        </button>
        <button class="tab-btn {activeTab === 'image_prompts' ? 'active' : ''}" onclick={() => activeTab = 'image_prompts'}>
          <Icon name="image" size={14} />
          <span>3D &amp; Photo Prompts</span>
        </button>
        <button class="tab-btn {activeTab === 'ultra_prompt' ? 'active' : ''}" onclick={() => { activeTab = 'ultra_prompt'; handleFormatUltraPrompt(); }}>
          <Icon name="rocket" size={14} />
          <span>Gemini Ultra Web</span>
        </button>
        <button class="tab-btn {activeTab === 'settings' ? 'active' : ''}" onclick={() => activeTab = 'settings'}>
          <Icon name="settings" size={14} />
          <span>AI Configuration</span>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="ai-body">
        {#if activeTab === 'settings'}
          <!-- Setup Panel -->
          <div class="settings-card">
            <h3 class="card-title">Google AI Studio API Configuration</h3>
            <p class="card-sub">
              Get your free Google AI Studio API key at 
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" class="link-highlight">aistudio.google.com/app/apikey ↗</a> 
              (100% Free tier: up to 1,500 requests/day).
            </p>

            <div class="field-col" style="margin-top: 14px;">
              <label class="field-label" for="api-key-input">Gemini API Key</label>
              <input 
                id="api-key-input"
                type="password" 
                class="form-input" 
                placeholder={aiStatus.configured ? 'Configured (enter new key to replace)' : 'AIzaSy...'} 
                bind:value={newApiKey}
              />
            </div>

            <div class="field-col" style="margin-top: 12px;">
              <label class="field-label" for="model-select">Preferred AI Model</label>
              <select id="model-select" class="form-select" bind:value={newModel}>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra Fast, 15 RPM Free Tier)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Creative Reasoning)</option>
              </select>
            </div>

            <div class="settings-actions">
              <Button appearance="primary" loading={isSavingSettings} onclick={saveAiSettings}>
                <Icon name="save" size={14} />
                <span style="margin-left: 6px;">Save settings</span>
              </Button>
            </div>
          </div>

        {:else}
          <!-- Split Generator Grid -->
          <div class="generator-grid">
            <!-- Left Controls -->
            <div class="inputs-col">
              <div class="input-card">
                <div class="field-col">
                  <label class="field-label" for="brand-select">Brand Line / Client</label>
                  <select id="brand-select" class="form-select" bind:value={selectedBrand}>
                    <option value="ACME">Acme Corporation (ACME)</option>
                    <option value="NEX">Nexus Studio (NEX)</option>
                    <option value="LUM">Lumina Labs (LUM)</option>
                  </select>
                </div>

                <div class="field-col">
                  <label class="field-label" for="prod-input">Product / Campaign Focus</label>
                  <input id="prod-input" type="text" class="form-input" placeholder="e.g. Mobile Banking 3D Isometric Assets" bind:value={productInput} />
                </div>

                {#if activeTab === 'hooks' || activeTab === 'scripts'}
                  <div class="field-col">
                    <label class="field-label" for="aud-input">Target Audience</label>
                    <input id="aud-input" type="text" class="form-input" bind:value={audienceInput} />
                  </div>

                  <div class="field-col">
                    <label class="field-label" for="lang-select">Language</label>
                    <select id="lang-select" class="form-select" bind:value={languageInput}>
                      <option value="Malay">Bahasa Melayu (Santai &amp; Persuasive)</option>
                      <option value="English">English (Direct Response)</option>
                    </select>
                  </div>
                {/if}

                {#if activeTab === 'hooks'}
                  <div class="field-col">
                    <label class="field-label" for="angle-select">Core Copy Angle</label>
                    <select id="angle-select" class="form-select" bind:value={angleInput}>
                      <option value="Pain Point & Agitation">Pain Point &amp; Agitation (Fatigue, Stress, Stamina)</option>
                      <option value="Curiosity & Pattern Interrupt">Curiosity &amp; Pattern Interrupt ("Kenapa 90% Lelaki...")</option>
                      <option value="Social Proof & Transformation">Social Proof &amp; Testimonial Transformation</option>
                      <option value="Urgency & Limited Promo">Urgency &amp; Limited Ramadan/Year-End Special</option>
                    </select>
                  </div>

                  <div class="btn-block">
                    <Button appearance="primary" loading={isGenerating} onclick={handleGenerateHooks}>
                      <Icon name="bolt" size={14} />
                      <span style="margin-left: 6px;">Generate 5 Viral Hooks</span>
                    </Button>
                  </div>

                {:else if activeTab === 'scripts'}
                  <div class="field-col">
                    <label class="field-label" for="plat-select">Target Platform</label>
                    <select id="plat-select" class="form-select" bind:value={platformInput}>
                      <option value="Meta Feed Ad">Meta Feed (Facebook / Instagram Post)</option>
                      <option value="TikTok 9:16 Video Script">TikTok / Reels 9:16 Video Script</option>
                      <option value="WhatsApp Direct Response">WhatsApp Broadcast / Sales Closer</option>
                    </select>
                  </div>

                  <div class="btn-block">
                    <Button appearance="primary" loading={isGenerating} onclick={handleGenerateScript}>
                      <Icon name="file" size={14} />
                      <span style="margin-left: 6px;">Generate Complete Ad Script</span>
                    </Button>
                  </div>

                {:else if activeTab === 'image_prompts'}
                  <div class="field-col">
                    <label class="field-label" for="style-input">Photography Style</label>
                    <input id="style-input" type="text" class="form-input" bind:value={imageStyle} />
                  </div>

                  <div class="field-col">
                    <label class="field-label" for="env-input">Lighting &amp; Backdrop</label>
                    <input id="env-input" type="text" class="form-input" bind:value={imageEnv} />
                  </div>

                  <div class="btn-block">
                    <Button appearance="primary" loading={isGenerating} onclick={handleGenerateImagePrompts}>
                      <Icon name="image" size={14} />
                      <span style="margin-left: 6px;">Generate Photography Prompts</span>
                    </Button>
                  </div>

                {:else if activeTab === 'ultra_prompt'}
                  <div class="ultra-info-box">
                    <span class="info-title">How to use with Gemini Ultra:</span>
                    <p class="info-desc">Click "Copy Full Prompt" below, open your Gemini Ultra web session, and paste. It includes full client brand guidelines.</p>
                  </div>
                  <div class="btn-block">
                    <a href="https://gemini.google.com" target="_blank" rel="noreferrer" class="gemini-web-link">
                      <Icon name="externalLink" size={14} />
                      <span style="margin-left: 6px;">Open Gemini Ultra Web</span>
                    </a>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Right Output Stage -->
            <div class="output-col">
              <div class="output-header">
                <span class="out-label">AI Studio Output</span>
                {#if generatedOutput}
                  <div class="out-actions">
                    <button class="out-action-btn" onclick={copyOutput}>
                      <Icon name="copy" size={13} />
                      <span style="margin-left: 4px;">Copy</span>
                    </button>
                    {#if onInsertCopy}
                      <button class="out-action-btn insert-btn" onclick={handleInsertIntoCopy}>
                        <Icon name="edit" size={13} />
                        <span style="margin-left: 4px;">Insert to COPY.md</span>
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>

              <div class="output-viewport">
                {#if isGenerating}
                  <div class="generating-box">
                    <div class="gemini-spinner"></div>
                    <p>Gemini is composing high-converting creative copy...</p>
                  </div>
                {:else if !generatedOutput}
                  <div class="output-empty">
                    <Icon name="sparkles" size={32} color="rgba(255,255,255,0.2)" />
                    <p>Select your parameters and click generate to compose studio-grade copy and prompts.</p>
                  </div>
                {:else}
                  <textarea readonly class="output-text" value={generatedOutput}></textarea>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="ai-footer">
        <span class="footer-tip">Powered by Google Gemini 1.5 Pro/Flash · Kanso Cre8 Copywriting Engine</span>
        <Button appearance="subtle" onclick={closeModal}>Close</Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .ai-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1950;
    padding: 20px;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  .ai-modal {
    width: 95%;
    max-width: 980px;
    height: 85vh;
    background: var(--kanso-surface);
    border: 1px solid rgba(33, 161, 247, 0.3);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
  }

  .ai-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(15, 23, 42, 0.98);
  }

  .header-left { display: flex; align-items: center; gap: 12px; }
  .title-row { display: flex; align-items: center; gap: 10px; }
  .modal-title { font-size: 16px; font-weight: 800; color: var(--kanso-text-primary); }
  .model-badge { font-size: 10px; font-weight: 800; background: rgba(33, 161, 247, 0.15); color: var(--kanso-accent); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(33, 161, 247, 0.3); }
  .modal-sub { font-size: 12px; color: var(--kanso-text-muted); margin-top: 2px; }

  .close-btn { background: transparent; border: none; font-size: 16px; color: var(--kanso-text-muted); cursor: pointer; padding: 4px 8px; }
  .close-btn:hover { color: var(--kanso-accent-text); }

  .ai-tabs-bar {
    display: flex;
    background: rgba(11, 17, 33, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 8px 16px;
    gap: 8px;
    overflow-x: auto;
  }

  .tab-btn {
    padding: 6px 14px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--kanso-text-muted);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
  }
  .tab-btn:hover { color: var(--kanso-accent-text); }
  .tab-btn.active { background: var(--kanso-accent); color: var(--kanso-accent-text); border-color: var(--kanso-accent); }

  .ai-body { flex: 1; overflow: hidden; display: flex; }

  .generator-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 340px 1fr;
    overflow: hidden;
  }

  .inputs-col {
    padding: 16px;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .input-card { display: flex; flex-direction: column; gap: 12px; }
  .field-col { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kanso-text-muted); }

  .form-select, .form-input {
    background: var(--kanso-surface-hover);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 8px 10px;
    color: var(--kanso-accent-text);
    font-size: 12px;
    outline: none;
  }
  .form-select:focus, .form-input:focus { border-color: var(--kanso-accent); }

  .btn-block { margin-top: 6px; }

  .gemini-web-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 10px;
    background: var(--kanso-accent);
    color: var(--kanso-accent-text);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
  }

  .ultra-info-box {
    background: rgba(33, 161, 247, 0.08);
    border: 1px solid rgba(33, 161, 247, 0.2);
    border-radius: 8px;
    padding: 10px;
    font-size: 11px;
  }
  .info-title { font-weight: 700; color: var(--kanso-accent); display: block; margin-bottom: 2px; }
  .info-desc { color: var(--kanso-text-muted); margin: 0; line-height: 1.4; }

  /* Output Column */
  .output-col {
    background: var(--kanso-canvas);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.9);
  }
  .out-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kanso-text-muted); }
  .out-actions { display: flex; align-items: center; gap: 8px; }
  .out-action-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--kanso-accent-text);
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
  }
  .out-action-btn:hover { background: rgba(255, 255, 255, 0.15); }
  .insert-btn { background: var(--kanso-accent); border-color: var(--kanso-accent); color: var(--kanso-accent-text); }
  .insert-btn:hover { background: var(--kanso-accent); }

  .output-viewport {
    flex: 1;
    padding: 16px;
    overflow: hidden;
    display: flex;
  }

  .output-text {
    flex: 1;
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: var(--kanso-text-primary);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    font-size: 13px;
    line-height: 1.6;
    resize: none;
  }

  .generating-box, .output-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--kanso-text-muted);
    font-size: 13px;
    padding: 20px;
  }

  .gemini-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(33, 161, 247, 0.2);
    border-top-color: var(--kanso-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 12px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Settings Card */
  .settings-card {
    padding: 24px;
    max-width: 580px;
    margin: 30px auto;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }
  .card-title { font-size: 16px; font-weight: 800; color: var(--kanso-accent-text); margin-bottom: 4px; }
  .card-sub { font-size: 12px; color: var(--kanso-text-muted); line-height: 1.5; }
  .link-highlight { color: var(--kanso-accent); text-decoration: underline; }
  .settings-actions { margin-top: 18px; display: flex; justify-content: flex-end; }

  /* Footer */
  .ai-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(11, 17, 33, 0.98);
  }
  .footer-tip { font-size: 11px; color: var(--kanso-text-muted); }

  @media (max-width: 768px) {
    .generator-grid { grid-template-columns: 1fr; }
  }
</style>
