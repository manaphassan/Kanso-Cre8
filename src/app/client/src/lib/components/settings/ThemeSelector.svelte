<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';
  import type { ThemeName } from '$lib/types';

  const themeCards: { id: ThemeName; name: string; tag: string; desc: string; canvasColor: string; surfaceColor: string; accentColor: string }[] = [
    {
      id: 'dark',
      name: 'Obsidian Dark',
      tag: 'DARK MODE',
      desc: 'Organic olive obsidian canvas with tactical sage surfaces and terracotta pops. Deep, warm, zero eyestrain.',
      canvasColor: '#151813',
      surfaceColor: '#1E251A',
      accentColor: '#DE694B'
    },
    {
      id: 'light',
      name: 'Stone Paper',
      tag: 'LIGHT MODE',
      desc: 'Warm Scandinavian raw stone paper canvas with deep charcoal ink and terracotta CTAs.',
      canvasColor: '#ECE8DF',
      surfaceColor: '#F7F5F0',
      accentColor: '#DE694B'
    },
    {
      id: 'oceanic',
      name: 'Kai-Zen Blue',
      tag: 'OCEANIC CERULEAN',
      desc: 'Deep Ocean #064169 canvas with Cerulean #21A8C3 highlights, slate accents, and Poppins studio typography.',
      canvasColor: '#064169',
      surfaceColor: '#043150',
      accentColor: '#21A8C3'
    },
    {
      id: 'oceanic-light',
      name: 'Marina Light',
      tag: 'OCEANIC LIGHT',
      desc: 'Crisp light blue-grey #F0F4F8 canvas with deep ocean navy titles and Cerulean #21A8C3 actions.',
      canvasColor: '#F0F4F8',
      surfaceColor: '#FFFFFF',
      accentColor: '#21A8C3'
    },
    {
      id: 'eink',
      name: 'Paperlike E-Ink',
      tag: 'E-INK DISPLAY',
      desc: 'Optimized for low-color-depth & mono e-ink monitors: zero color jitter, pure #FFFFFF canvas, #FFFFF0 ivory cards, pure #000000 text.',
      canvasColor: '#FFFFFF',
      surfaceColor: '#FFFFF0',
      accentColor: '#2424D9'
    },
    {
      id: 'neumorphic',
      name: 'Neumorphic Clay',
      tag: 'SOFT UI LIGHT',
      desc: 'Tactile extruded surfaces and debossed inputs crafted in soft alabaster clay (#E0E5EC) with high-contrast slate text.',
      canvasColor: '#E0E5EC',
      surfaceColor: '#E0E5EC',
      accentColor: '#3B82F6'
    },
    {
      id: 'neumorphic-dark',
      name: 'Neumorphic Obsidian',
      tag: 'SOFT UI DARK',
      desc: 'Deep charcoal slate (#1E2026) with ambient extruded shadows, subtle light specular glints, and electric sky highlights.',
      canvasColor: '#1E2026',
      surfaceColor: '#1E2026',
      accentColor: '#38BDF8'
    }
  ];
</script>

<div class="card-surface">
  <div class="card-header">
    <h2 class="card-title">Lighting &amp; Visual Atmosphere</h2>
    <p class="card-subtitle">Select your atelier lighting environment. Engineered with Linear / Geist design tokens and high-contrast E-Ink support.</p>
  </div>

  <div class="themes-grid">
    {#each themeCards as t}
      <div
        class="theme-card"
        class:selected={appState.theme === t.id}
        onclick={() => appState.setTheme(t.id)}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && appState.setTheme(t.id)}
      >
        <div class="theme-card-preview" style="background: {t.canvasColor}; border: 1px solid var(--kanso-border);">
          <div class="preview-surface" style="background: {t.surfaceColor}; border: 1px solid {t.id === 'eink' ? '#000000' : 'rgba(255,255,255,0.1)'};">
            <div class="preview-dot" style="background: {t.accentColor};"></div>
            <div class="preview-line" style="background: {t.id === 'light' || t.id === 'eink' || t.id === 'neumorphic' ? '#18181B' : t.id === 'oceanic-light' ? '#064169' : '#FFFFFF'}; width: 45%;"></div>
            <div class="preview-line" style="background: {t.id === 'light' || t.id === 'eink' || t.id === 'neumorphic' ? '#64748B' : t.id === 'oceanic-light' ? '#93A3BC' : '#71717A'}; width: 70%;"></div>
          </div>
        </div>

        <div class="theme-card-info">
          <div class="theme-title-row">
            <span class="theme-name">{t.name}</span>
            <span class="theme-tag">{t.tag}</span>
          </div>
          <p class="theme-desc">{t.desc}</p>
          {#if appState.theme === t.id}
            <div class="active-pill">
              <span class="active-dot"></span>
              <span>Active Environment</span>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="typography-notice-box">
    <div class="notice-icon"><Icon name="edit" size={20} /></div>
    <div class="notice-content">
      <h4>Legible Typography Standard Active</h4>
      <p>Body copy renders comfortably at 14px–15px, and primary studio metrics render at 24px–28px font sizes for maximum readability on Retina and 4K displays.</p>
    </div>
  </div>
</div>

<style>
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; }
  .card-header { margin-bottom: 20px; }
  .card-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .card-subtitle { margin: 4px 0 0 0; font-size: 13px; color: var(--kanso-text-muted); }
  .themes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .theme-card { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; gap: 12px; }
  .theme-card:hover { border-color: var(--kanso-text-muted); }
  .theme-card.selected { border-color: var(--kanso-accent); box-shadow: 0 0 0 1px var(--kanso-accent); }
  .theme-card-preview { height: 70px; border-radius: 6px; padding: 12px; display: flex; align-items: center; justify-content: center; }
  .preview-surface { width: 100%; height: 100%; border-radius: 4px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
  .preview-dot { width: 8px; height: 8px; border-radius: 50%; }
  .preview-line { height: 4px; border-radius: 2px; }
  .theme-title-row { display: flex; justify-content: space-between; align-items: center; }
  .theme-name { font-size: 14px; font-weight: 700; color: var(--kanso-text-primary); }
  .theme-tag { font-size: 10px; font-weight: 700; color: var(--kanso-accent); }
  .theme-desc { margin: 0; font-size: 12px; color: var(--kanso-text-muted); line-height: 1.4; }
  .active-pill { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--kanso-success); margin-top: 4px; }
  .active-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--kanso-success); }
  .typography-notice-box { display: flex; gap: 16px; align-items: flex-start; padding: 16px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; }
  .notice-icon { color: var(--kanso-accent); }
  .notice-content h4 { margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: var(--kanso-text-primary); }
  .notice-content p { margin: 0; font-size: 12px; color: var(--kanso-text-muted); line-height: 1.4; }
</style>
