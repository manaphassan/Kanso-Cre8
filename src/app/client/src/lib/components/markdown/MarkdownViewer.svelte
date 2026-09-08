<script lang="ts">
  import { MarkdownService, type MarkdownToken } from '$lib/services/markdown';
  import MermaidViewer from './MermaidViewer.svelte';

  interface Props {
    content: string;
    class?: string;
  }

  let { content, class: className = '' }: Props = $props();

  // Tokenize content into standard markdown vs Mermaid code blocks
  let tokens = $derived.by<MarkdownToken[]>(() => {
    if (!content) return [];
    return MarkdownService.tokenize(content);
  });
</script>

<div class="markdown-body {className}">
  {#if !content || content.trim() === ''}
    <div class="empty-markdown">
      <i>No Markdown content provided.</i>
    </div>
  {:else}
    {#each tokens as token}
      {#if token.type === 'code' && token.lang === 'mermaid'}
        <MermaidViewer chartCode={token.text || ''} />
      {:else}
        <!-- Render sanitized standard markdown block -->
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html MarkdownService.renderToHtml(token.raw || '')}
      {/if}
    {/each}
  {/if}
</div>

<style>
  .empty-markdown {
    color: var(--text-tertiary);
    font-size: 13px;
    padding: 12px 0;
  }
</style>
