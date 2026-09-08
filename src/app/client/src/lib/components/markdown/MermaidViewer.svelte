<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';

  interface Props {
    chartCode: string;
  }

  let { chartCode }: Props = $props();

  let container: HTMLDivElement | null = $state(null);
  let svgContent = $state<string>('');
  let renderError = $state<string | null>(null);
  let isRendering = $state<boolean>(false);

  async function renderMermaid() {
    if (!chartCode || !chartCode.trim()) {
      svgContent = '';
      renderError = null;
      return;
    }

    isRendering = true;
    renderError = null;

    try {
      // Lazy load mermaid dynamically
      const mermaidModule = await import('mermaid');
      const mermaid = mermaidModule.default;

      const isDark = appState.theme !== 'falconia';

      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'Segoe UI, sans-serif',
        themeVariables: {
          primaryColor: isDark ? '#0F1A3A' : '#EBF4FE',
          primaryTextColor: isDark ? '#F1F5F9' : '#043388',
          primaryBorderColor: isDark ? '#00CFFF' : '#043388',
          lineColor: isDark ? '#00CFFF' : '#0644B2',
          secondaryColor: isDark ? '#162450' : '#FFFFFF',
          tertiaryColor: isDark ? '#080D1F' : '#F3F4F6',
          fontFamily: 'Segoe UI, sans-serif'
        }
      });

      const cleanCode = chartCode.trim();
      const uniqueId = `mermaid-chart-${Math.random().toString(36).substring(2, 9)}`;
      const { svg } = await mermaid.render(uniqueId, cleanCode);
      svgContent = svg;
      renderError = null;
    } catch (err: any) {
      console.warn('[Mermaid Render Warning]', err.message);
      renderError = err.message || 'Diagram syntax error';
      svgContent = '';
    } finally {
      isRendering = false;
    }
  }

  $effect(() => {
    chartCode;
    appState.theme;
    renderMermaid();
  });

  onMount(() => {
    renderMermaid();
  });
</script>

<div class="mermaid-diagram-card" bind:this={container}>
  <div class="mermaid-badge">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
    <span>Mermaid Diagram</span>
  </div>

  {#if renderError}
    <div class="mermaid-error">
      <div class="err-title">Diagram Syntax Error</div>
      <pre>{renderError}</pre>
    </div>
  {:else if svgContent}
    <div class="mermaid-svg-viewport">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html svgContent}
    </div>
  {:else if isRendering}
    <div class="mermaid-loading">Rendering Diagram...</div>
  {/if}
</div>

<style>
  .mermaid-diagram-card {
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg);
    padding: 16px;
    margin: 18px 0;
    position: relative;
    box-shadow: var(--shadow-sm);
  }

  .mermaid-badge {
    position: absolute;
    top: 10px;
    right: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10.5px;
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .mermaid-svg-viewport {
    display: flex;
    justify-content: center;
    overflow-x: auto;
    padding: 12px 0 6px 0;
  }

  .mermaid-svg-viewport :global(svg) {
    max-width: 100%;
    height: auto;
  }

  .mermaid-error {
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-md);
    padding: 12px;
    color: var(--color-danger);
    font-size: 12px;
  }

  .err-title {
    font-weight: 700;
    margin-bottom: 4px;
  }

  .mermaid-error pre {
    white-space: pre-wrap;
    font-family: var(--font-mono);
    font-size: 11px;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
  }

  .mermaid-loading {
    text-align: center;
    font-size: 12px;
    color: var(--text-secondary);
    padding: 20px 0;
  }
</style>
