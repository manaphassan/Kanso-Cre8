<script lang="ts">
  import MarkdownViewer from './MarkdownViewer.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  interface Props {
    value?: string;
    placeholder?: string;
    onSave?: (newContent: string) => Promise<void> | void;
    readonly?: boolean;
  }

  let {
    value = $bindable(''),
    placeholder = 'Write Markdown brief, checklist (- [ ]), or diagrams (```mermaid)...',
    onSave,
    readonly = false
  }: Props = $props();

  let mode = $state<'split' | 'preview' | 'source'>('split');
  let isSaving = $state<boolean>(false);

  async function handleSave() {
    if (!onSave) return;
    isSaving = true;
    try {
      await onSave(value);
    } finally {
      isSaving = false;
    }
  }

  function insertTemplate(type: 'mermaid_flow' | 'callout_note' | 'task_list') {
    if (readonly) return;
    let snippet = '';
    if (type === 'mermaid_flow') {
      snippet = `\n\`\`\`mermaid\ngraph TD\n  A[Creative Brief] --> B[Design Concept]\n  B --> C{Manager Review}\n  C -->|Approved| D[Final Assets]\n  C -->|Revision| B\n\`\`\`\n`;
    } else if (type === 'callout_note') {
      snippet = `\n> [!NOTE]\n> Enter critical campaign specifications or guidelines here.\n`;
    } else if (type === 'task_list') {
      snippet = `\n- [ ] Task 1: Concept moodboard\n- [ ] Task 2: Vector illustrations\n- [ ] Task 3: Packaging print dieline\n`;
    }
    value += snippet;
  }
</script>

<div class="markdown-editor-wrapper">
  <!-- Toolbar -->
  <div class="editor-toolbar">
    <div class="toolbar-left">
      <div class="mode-pills">
        <button class="mode-pill" class:active={mode === 'preview'} onclick={() => mode = 'preview'}>Preview</button>
        <button class="mode-pill" class:active={mode === 'split'} onclick={() => mode = 'split'}>Split</button>
        <button class="mode-pill" class:active={mode === 'source'} onclick={() => mode = 'source'}>Source</button>
      </div>

      {#if !readonly && mode !== 'preview'}
        <div class="template-shortcuts">
          <button class="shortcut-btn" onclick={() => insertTemplate('mermaid_flow')}>+ Mermaid Flow</button>
          <button class="shortcut-btn" onclick={() => insertTemplate('callout_note')}>+ Callout Note</button>
          <button class="shortcut-btn" onclick={() => insertTemplate('task_list')}>+ Task List</button>
        </div>
      {/if}
    </div>

    {#if onSave && !readonly}
      <div class="toolbar-right">
        <FluentButton appearance="primary" size="sm" loading={isSaving} onclick={handleSave}>
          Save Markdown
        </FluentButton>
      </div>
    {/if}
  </div>

  <!-- Content Split Area -->
  <div class="editor-panes mode-{mode}">
    {#if mode === 'split' || mode === 'source'}
      <div class="source-pane">
        <textarea
          bind:value
          {placeholder}
          disabled={readonly}
          spellcheck="false"
        ></textarea>
      </div>
    {/if}

    {#if mode === 'split' || mode === 'preview'}
      <div class="preview-pane">
        <MarkdownViewer content={value} />
      </div>
    {/if}
  </div>
</div>

<style>
  .markdown-editor-wrapper {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-sm);
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: var(--surface-card-subtle);
    border-bottom: 1px solid var(--surface-card-border);
    gap: 12px;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .mode-pills {
    display: flex;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    padding: 2px;
  }

  .mode-pill {
    border: none;
    background: transparent;
    padding: 3px 10px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .mode-pill.active {
    background: var(--brand-primary);
    color: var(--text-inverted);
  }

  .template-shortcuts {
    display: flex;
    gap: 6px;
  }

  .shortcut-btn {
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    font-size: 11px;
    color: var(--text-secondary);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-weight: 600;
  }
  .shortcut-btn:hover {
    color: var(--brand-accent);
    border-color: var(--brand-accent);
  }

  .editor-panes {
    display: grid;
    min-height: 380px;
  }

  .editor-panes.mode-split {
    grid-template-columns: 1fr 1fr;
  }

  .editor-panes.mode-source,
  .editor-panes.mode-preview {
    grid-template-columns: 1fr;
  }

  .source-pane {
    border-right: 1px solid var(--surface-card-border);
    display: flex;
  }

  .source-pane textarea {
    width: 100%;
    height: 100%;
    min-height: 380px;
    padding: 16px;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--surface-card);
    border: none;
    outline: none;
    resize: vertical;
  }

  .preview-pane {
    padding: 16px 20px;
    overflow-y: auto;
    max-height: 600px;
    background: var(--surface-card-subtle);
  }
</style>
