<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentIcons from '$lib/components/ui/FluentIcons.svelte';

  interface Props {
    open?: boolean;
    brand?: string;
    projectTitle?: string;
    onInsertCopy?: (content: string) => void;
    onClose?: () => void;
  }

  let {
    open = $bindable(false),
    brand = 'SSH',
    projectTitle = '',
    onInsertCopy,
    onClose
  }: Props = $props();

  type TabType = 'hooks' | 'scripts' | 'image_prompts' | 'ultra_prompt' | 'settings';
  let activeTab = $state<TabType>('hooks');

  // Generation Inputs
  let selectedBrand = $state<string>('SSH');
  let productInput = $state<string>('');
  let audienceInput = $state<string>('Men aged 28-55');
  let angleInput = $state<string>('Pain Point & Agitation');
  let languageInput = $state<string>('Malay');
  let platformInput = $state<string>('Meta Feed');
  let selectedHookInput = $state<string>('');

  // Image Prompt Inputs
  let imageStyle = $state<string>('Photorealistic Commercial Studio');
  let imageEnv = $state<string>('Minimalist Dark Luxury, Volumetric Gold Backlighting');
  let imageColors = $state<string>('#D4AF37 Gold, #043388 Navy Blue');

  // Output State
  let generatedOutput = $state<string>('');
  let isGenerating = $state<boolean>(false);
  let aiStatus = $state<{ configured: boolean; maskedKey: string; preferredModel: string; availableModels: string[] }>({
    configured: false,
    maskedKey: '',
    preferredModel: 'gemini-1.5-flash',
    availableModels: ['gemini-1.5-flash', 'gemini-1.5-pro']
  });

  // Settings State
  let newApiKey = $state<string>('');
  let newModel = $state<string>('gemini-1.5-flash');
  let isSavingSettings = $state<boolean>(false);

  $effect(() => {
    if (open) {
      selectedBrand = brand || 'SSH';
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
      appState.addToast('Viral hooks composed!', 'success');
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
      appState.addToast('Advertising script generated!', 'success');
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
      appState.addToast('Commercial photography prompts generated!', 'success');
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
        title: productInput || projectTitle || 'SuamiSihat Creative Campaign',
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
      appState.addToast('Copied to clipboard!', 'success');
    } catch (e) {
      appState.addToast('Could not copy automatically', 'info');
    }
  }

  function handleInsertIntoCopy() {
    if (!generatedOutput) return;
    if (onInsertCopy) {
      onInsertCopy(`\n\n## Gemini AI Generated Content\n\n${generatedOutput}\n`);
      appState.addToast('Inserted into COPY.md editor!', 'success');
      closeModal();
    }
  }

  async function saveAiSettings() {
    isSavingSettings = true;
    try {
      const res = await ApiClient.saveAiConfig({ apiKey: newApiKey, preferredModel: newModel });
      aiStatus = res.status;
      newApiKey = '';
      appState.addToast('Gemini API configuration saved!', 'success');
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
            <FluentIcons name="sparkles" size={20} color="#00CFFF" />
          </div>
          <div>
            <div class="title-row">
              <h2 class="modal-title">SuamiSihat Creative AI Studio</h2>
              <span class="model-badge {aiStatus.configured ? 'ready' : 'required'}">
                <span class="status-dot"></span>
                {aiStatus.configured ? aiStatus.preferredModel : 'API Key Required'}
              </span>
            </div>
            <p class="modal-sub">Direct Gemini 1.5 Pro / Flash generator &amp; Gemini Ultra prompt packager.</p>
          </div>
        </div>
        <button class="close-btn" onclick={closeModal} title="Close Modal">
          <FluentIcons name="close" size={16} />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="ai-tabs-bar">
        <button class="tab-btn {activeTab === 'hooks' ? 'active' : ''}" onclick={() => activeTab = 'hooks'}>
          <FluentIcons name="bolt" size={14} />
          <span>Viral Hooks</span>
        </button>
        <button class="tab-btn {activeTab === 'scripts' ? 'active' : ''}" onclick={() => activeTab = 'scripts'}>
          <FluentIcons name="file" size={14} />
          <span>Ad Scripts</span>
        </button>
        <button class="tab-btn {activeTab === 'image_prompts' ? 'active' : ''}" onclick={() => activeTab = 'image_prompts'}>
          <FluentIcons name="image" size={14} />
          <span>3D &amp; Photo Prompts</span>
        </button>
        <button class="tab-btn {activeTab === 'ultra_prompt' ? 'active' : ''}" onclick={() => { activeTab = 'ultra_prompt'; handleFormatUltraPrompt(); }}>
          <FluentIcons name="rocket" size={14} />
          <span>Gemini Ultra Web</span>
        </button>
        <button class="tab-btn {activeTab === 'settings' ? 'active' : ''}" onclick={() => activeTab = 'settings'}>
          <FluentIcons name="settings" size={14} />
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
                placeholder={aiStatus.configured ? `Configured: ${aiStatus.maskedKey}` : 'AIzaSy...'} 
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
              <FluentButton appearance="primary" loading={isSavingSettings} onclick={saveAiSettings}>
                <FluentIcons name="save" size={14} />
                <span style="margin-left: 6px;">Save Configuration</span>
              </FluentButton>
            </div>
          </div>

        {:else}
          <!-- Split Generator Grid -->
          <div class="generator-grid">
            <!-- Left Controls -->
            <div class="inputs-col">
              <div class="input-card">
                <div class="field-col">
                  <label class="field-label" for="brand-select">Brand Line</label>
                  <select id="brand-select" class="form-select" bind:value={selectedBrand}>
                    <option value="SSH">SuamiSihat Holding (SSH)</option>
                    <option value="SSC">SuamiSihat Care (SSC)</option>
                    <option value="SSW">SuamiSihat Wellness (SSW)</option>
                    <option value="SSE">SuamiSihat Ecommerce (SSE)</option>
                    <option value="SST">SuamiSihat Technology (SST)</option>
                  </select>
                </div>

                <div class="field-col">
                  <label class="field-label" for="prod-input">Product / Campaign Focus</label>
                  <input id="prod-input" type="text" class="form-input" placeholder="e.g. SuamiSihat Gold Maca Extract" bind:value={productInput} />
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
                    <FluentButton appearance="primary" loading={isGenerating} onclick={handleGenerateHooks}>
                      <FluentIcons name="bolt" size={14} />
                      <span style="margin-left: 6px;">Generate 5 Viral Hooks</span>
                    </FluentButton>
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
                    <FluentButton appearance="primary" loading={isGenerating} onclick={handleGenerateScript}>
                      <FluentIcons name="file" size={14} />
                      <span style="margin-left: 6px;">Generate Complete Ad Script</span>
                    </FluentButton>
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
                    <FluentButton appearance="primary" loading={isGenerating} onclick={handleGenerateImagePrompts}>
                      <FluentIcons name="image" size={14} />
                      <span style="margin-left: 6px;">Generate Photography Prompts</span>
                    </FluentButton>
                  </div>

                {:else if activeTab === 'ultra_prompt'}
                  <div class="ultra-info-box">
                    <span class="info-title">How to use with Gemini Ultra:</span>
                    <p class="info-desc">Click "Copy Full Prompt" below, open your Gemini Ultra web session, and paste. It includes full SuamiSihat brand guidelines.</p>
                  </div>
                  <div class="btn-block">
                    <a href="https://gemini.google.com" target="_blank" rel="noreferrer" class="gemini-web-link">
                      <FluentIcons name="externalLink" size={14} />
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
                      <FluentIcons name="copy" size={13} />
                      <span style="margin-left: 4px;">Copy</span>
                    </button>
                    {#if onInsertCopy}
                      <button class="out-action-btn insert-btn" onclick={handleInsertIntoCopy}>
                        <FluentIcons name="edit" size={13} />
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
                    <FluentIcons name="sparkles" size={32} color="rgba(255,255,255,0.2)" />
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
        <span class="footer-tip">Powered by Google Gemini 1.5 Pro/Flash · SuamiSihat Brand Copywriting Engine</span>
        <FluentButton appearance="subtle" onclick={closeModal}>Close</FluentButton>
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
    background: #0F172A;
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
  .ai-icon { font-size: 24px; }
  .title-row { display: flex; align-items: center; gap: 10px; }
  .modal-title { font-size: 16px; font-weight: 800; color: #F8FAFC; }
  .model-badge { font-size: 10px; font-weight: 800; background: rgba(33, 161, 247, 0.15); color: #38BDF8; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(33, 161, 247, 0.3); }
  .modal-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }

  .close-btn { background: transparent; border: none; font-size: 16px; color: #94A3B8; cursor: pointer; padding: 4px 8px; }
  .close-btn:hover { color: #FFF; }

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
    color: #94A3B8;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
  }
  .tab-btn:hover { color: #FFF; }
  .tab-btn.active { background: #043388; color: #FFF; border-color: #21A1F7; }

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
  .field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94A3B8; }

  .form-select, .form-input {
    background: #1E293B;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 8px 10px;
    color: #FFF;
    font-size: 12px;
    outline: none;
  }
  .form-select:focus, .form-input:focus { border-color: #38BDF8; }

  .btn-block { margin-top: 6px; }

  .gemini-web-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 10px;
    background: #043388;
    color: #FFF;
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
  .info-title { font-weight: 700; color: #38BDF8; display: block; margin-bottom: 2px; }
  .info-desc { color: #CBD5E1; margin: 0; line-height: 1.4; }

  /* Output Column */
  .output-col {
    background: #090D16;
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
  .out-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94A3B8; }
  .out-actions { display: flex; align-items: center; gap: 8px; }
  .out-action-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #FFF;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
  }
  .out-action-btn:hover { background: rgba(255, 255, 255, 0.15); }
  .insert-btn { background: #043388; border-color: #21A1F7; color: #FFF; }
  .insert-btn:hover { background: #0078D4; }

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
    color: #F8FAFC;
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
    color: #64748B;
    font-size: 13px;
    padding: 20px;
  }
  .empty-sparkle { font-size: 32px; margin-bottom: 8px; }

  .gemini-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(33, 161, 247, 0.2);
    border-top-color: #38BDF8;
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
  .card-title { font-size: 16px; font-weight: 800; color: #FFF; margin-bottom: 4px; }
  .card-sub { font-size: 12px; color: #94A3B8; line-height: 1.5; }
  .link-highlight { color: #38BDF8; text-decoration: underline; }
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
  .footer-tip { font-size: 11px; color: #64748B; }

  @media (max-width: 768px) {
    .generator-grid { grid-template-columns: 1fr; }
  }
</style>
