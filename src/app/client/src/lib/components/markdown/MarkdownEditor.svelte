<script lang="ts">
  import MarkdownViewer from './MarkdownViewer.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  interface Props {
    value?: string;
    placeholder?: string;
    onSave?: (newContent: string) => Promise<void> | void;
    readonly?: boolean;
    title?: string;
    saveLabel?: string;
  }

  let {
    value = $bindable(''),
    placeholder = 'Write Markdown document, checklist (- [ ]), or diagrams (```mermaid)...',
    onSave,
    readonly = false,
    title = '',
    saveLabel = 'Save Document'
  }: Props = $props();

  let mode = $state<'split' | 'preview' | 'source'>('preview');
  let isSaving = $state<boolean>(false);
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  // Statistics derived
  const wordCount = $derived.by(() => {
    return (value || '').trim().split(/\s+/).filter(Boolean).length;
  });

  const charCount = $derived((value || '').length);
  const readingTime = $derived(Math.max(1, Math.ceil(wordCount / 200)));

  async function handleSave() {
    if (!onSave) return;
    isSaving = true;
    try {
      await onSave(value);
    } finally {
      isSaving = false;
    }
  }

  function wrapSelection(prefix: string, suffix: string = prefix, defaultPlaceholder: string = 'text') {
    if (readonly || !textareaEl) {
      value += `${prefix}${defaultPlaceholder}${suffix}`;
      return;
    }

    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    const selected = value.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selected}${suffix}`;

    value = value.substring(0, start) + replacement + value.substring(end);

    setTimeout(() => {
      if (textareaEl) {
        textareaEl.focus();
        textareaEl.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      }
    }, 10);
  }

  function insertBlock(block: string) {
    if (readonly || !textareaEl) {
      value += `\n${block}\n`;
      return;
    }
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const needsLeadingNewline = before.length > 0 && !before.endsWith('\n\n');
    const prefix = needsLeadingNewline ? '\n\n' : '';

    value = before + prefix + block + '\n\n' + after;

    setTimeout(() => {
      if (textareaEl) {
        textareaEl.focus();
        const newPos = start + prefix.length + block.length + 2;
        textareaEl.setSelectionRange(newPos, newPos);
      }
    }, 10);
  }

  function insertMermaid(type: 'flow' | 'pie' | 'sequence' | 'timeline') {
    let code = '';
    if (type === 'flow') {
      code = `\`\`\`mermaid\nflowchart TD\n  Brief[📋 Creative Brief] --> Concept[🎨 Visual Concept]\n  Concept --> Review{🔍 Art Director Review}\n  Review -->|Approved| Master[✅ Final Assets]\n  Review -->|Revision Required| Concept\n\`\`\``;
    } else if (type === 'pie') {
      code = `\`\`\`mermaid\npie title Deliverable Media Mix\n  "Packaging Dielines" : 40\n  "Social Media Ads" : 35\n  "3D Render Assets" : 25\n\`\`\``;
    } else if (type === 'sequence') {
      code = `\`\`\`mermaid\nsequenceDiagram\n  autonumber\n  Designer->>Manager: Submit Deliverable (v1)\n  Manager-->>Designer: Request Revision (Dieline Bleed)\n  Designer->>Manager: Submit Updated Artwork (v2)\n  Manager->>NAS: Sign-Off & Archive Deliverable\n\`\`\``;
    } else if (type === 'timeline') {
      code = `\`\`\`mermaid\ntimeline\n  title Campaign Creative Milestones\n  Week 1 : Moodboard & Direction\n  Week 2 : Dielines & 3D Render\n  Week 3 : Video Scripts & Copy\n  Week 4 : Final Master Export\n\`\`\``;
    }
    insertBlock(code);
  }

  function insertTable() {
    const table = `| Item / Feature | Specification / Requirement | Status |
| :--- | :--- | :--- |
| **Packaging Box** | CMYK 300 DPI, Matt Lamination + Gold Foil | \`Ready\` |
| **Bottle Label** | 80mm x 45mm Waterproof Vinyl | \`In-Progress\` |
| **Social Carousel** | 1080 x 1350px (4:5 Ratio), 5 Slides | \`Pending\` |`;
    insertBlock(table);
  }

  function insertCallout(type: 'NOTE' | 'IMPORTANT' | 'WARNING' | 'TIP') {
    const callout = `> [!${type}]\n> Enter critical campaign requirements, compliance checks, or brand guidelines here.`;
    insertBlock(callout);
  }
  let showDiagramMenu = $state<boolean>(false);
  let showCalloutMenu = $state<boolean>(false);
</script>

<svelte:window onclick={() => { showDiagramMenu = false; showCalloutMenu = false; }} />

<div class="markdown-editor-wrapper">
  <!-- Top ClickUp-Style Command Toolbar -->
  <div class="editor-toolbar">
    <div class="toolbar-primary-row">
      <!-- Left: Formatting & Block Tools -->
      <div class="toolbar-group typography-group">
        {#if title}
          <span class="doc-title-tag">{title}</span>
        {/if}

        <button class="tool-btn font-bold" onclick={() => wrapSelection('**', '**', 'bold text')} title="Bold (Ctrl+B)">B</button>
        <button class="tool-btn font-italic" onclick={() => wrapSelection('*', '*', 'italic text')} title="Italic (Ctrl+I)">I</button>
        <button class="tool-btn font-code" onclick={() => wrapSelection('`', '`', 'code')} title="Inline Code">&lt;/&gt;</button>

        <span class="tool-divider"></span>

        <button class="tool-btn" onclick={() => wrapSelection('# ', '', 'Heading 1')} title="Heading 1">H1</button>
        <button class="tool-btn" onclick={() => wrapSelection('## ', '', 'Heading 2')} title="Heading 2">H2</button>
        <button class="tool-btn" onclick={() => insertBlock('- [ ] New task item')} title="Checklist Task Checkbox">☑ Task</button>
        <button class="tool-btn" onclick={() => insertTable()} title="Insert 3x3 Table">▦ Table</button>

        <span class="tool-divider"></span>

        <!-- Diagram Dropdown -->
        <div class="dropdown-wrapper" onclick={(e) => e.stopPropagation()}>
          <button class="tool-dropdown-btn" class:active={showDiagramMenu} onclick={() => { showDiagramMenu = !showDiagramMenu; showCalloutMenu = false; }}>
            <span>📊 Diagram</span>
            <span class="arrow-icon">▾</span>
          </button>
          {#if showDiagramMenu}
            <div class="dropdown-menu">
              <button class="dropdown-item" onclick={() => { insertMermaid('flow'); showDiagramMenu = false; }}>Flowchart</button>
              <button class="dropdown-item" onclick={() => { insertMermaid('pie'); showDiagramMenu = false; }}>Media Mix Pie</button>
              <button class="dropdown-item" onclick={() => { insertMermaid('sequence'); showDiagramMenu = false; }}>Approval Sequence</button>
              <button class="dropdown-item" onclick={() => { insertMermaid('timeline'); showDiagramMenu = false; }}>Timeline</button>
            </div>
          {/if}
        </div>

        <!-- Callout Dropdown -->
        <div class="dropdown-wrapper" onclick={(e) => e.stopPropagation()}>
          <button class="tool-dropdown-btn" class:active={showCalloutMenu} onclick={() => { showCalloutMenu = !showCalloutMenu; showDiagramMenu = false; }}>
            <span>💡 Callout</span>
            <span class="arrow-icon">▾</span>
          </button>
          {#if showCalloutMenu}
            <div class="dropdown-menu">
              <button class="dropdown-item" onclick={() => { insertCallout('NOTE'); showCalloutMenu = false; }}>📌 Note</button>
              <button class="dropdown-item" onclick={() => { insertCallout('IMPORTANT'); showCalloutMenu = false; }}>⚠️ Important</button>
              <button class="dropdown-item" onclick={() => { insertCallout('TIP'); showCalloutMenu = false; }}>💡 Tip</button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Right: Stats, Mode Switcher & Save CTA -->
      <div class="toolbar-group action-group">
        <div class="stats-badge">
          <span>{wordCount}w</span>
          <span class="stat-dot">•</span>
          <span>~{readingTime}m read</span>
        </div>

        <div class="mode-pills">
          <button class="mode-pill" class:active={mode === 'preview'} onclick={() => mode = 'preview'}>Preview</button>
          <button class="mode-pill" class:active={mode === 'split'} onclick={() => mode = 'split'}>Split</button>
          <button class="mode-pill" class:active={mode === 'source'} onclick={() => mode = 'source'}>Source</button>
        </div>

        {#if onSave && !readonly}
          <FluentButton appearance="primary" size="sm" loading={isSaving} onclick={handleSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
            <span style="margin-left: 5px;">{saveLabel}</span>
          </FluentButton>
        {/if}
      </div>
    </div>
  </div>

  <!-- Content Split Area -->
  <div class="editor-panes mode-{mode}">
    {#if mode === 'split' || mode === 'source'}
      <div class="source-pane">
        <textarea
          bind:this={textareaEl}
          bind:value
          {placeholder}
          disabled={readonly}
          spellcheck="false"
          onkeydown={(e) => {
            if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSave();
            }
          }}
        ></textarea>
      </div>
    {/if}

    {#if mode === 'split' || mode === 'preview'}
      <div class="preview-pane">
        {#if value && value.trim()}
          <MarkdownViewer content={value} />
        {:else}
          <div class="empty-preview">
            <span class="empty-icon">📝</span>
            <p>No Markdown content written yet.</p>
            <p class="empty-sub">Type in the editor or use the toolbar above to populate your creative document.</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .markdown-editor-wrapper {
    display: flex;
    flex-direction: column;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg, 12px);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .editor-toolbar {
    background: var(--surface-card-subtle, #F8FAFC);
    border-bottom: 1px solid var(--surface-card-border);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .toolbar-primary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    gap: 8px;
    flex-wrap: wrap;
  }

  .dropdown-wrapper {
    position: relative;
    display: inline-block;
  }

  .tool-dropdown-btn {
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    color: var(--text-primary);
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.12s;
    font-family: inherit;
  }

  .tool-dropdown-btn:hover, .tool-dropdown-btn.active {
    background: var(--bg-app);
    border-color: var(--brand-accent);
    color: var(--brand-primary, #043388);
  }

  .arrow-icon {
    font-size: 9px;
    opacity: 0.6;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E2E8F0);
    border-radius: 8px;
    box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.15));
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 100;
    min-width: 160px;
  }

  .dropdown-item {
    text-align: left;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary);
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.1s;
    font-family: inherit;
  }

  .dropdown-item:hover {
    background: var(--brand-tint, rgba(0, 120, 212, 0.08));
    color: var(--brand-primary, #0078D4);
  }

  .stats-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-tertiary);
    font-size: 11px;
    font-weight: 600;
  }
  .stat-dot { opacity: 0.5; }

  /* Mode Switcher */
  .mode-pills {
    display: flex;
    background: var(--bg-app);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    overflow: hidden;
  }

  .mode-pill {
    border: none;
    background: transparent;
    padding: 4px 10px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.12s;
    font-family: inherit;
  }
  .mode-pill.active {
    background: var(--brand-primary, #043388);
    color: #FFFFFF;
  }

  /* Panes Layout: Wraps frame to content naturally */
  .editor-panes {
    display: grid;
    min-height: 280px;
  }
  .editor-panes.mode-split {
    grid-template-columns: 1fr 1fr;
  }
  .editor-panes.mode-source {
    grid-template-columns: 1fr;
  }
  .editor-panes.mode-preview {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .source-pane {
    display: flex;
    border-right: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    min-height: 480px;
  }
  .mode-source .source-pane {
    border-right: none;
  }

  .source-pane textarea {
    width: 100%;
    min-height: 480px;
    height: 100%;
    padding: 16px;
    border: none;
    outline: none;
    resize: vertical;
    overflow-y: auto;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    background: transparent;
    color: var(--text-primary);
    box-sizing: border-box;
  }

  .preview-pane {
    padding: 20px 24px;
    background: var(--surface-card);
    min-height: 240px;
    overflow: visible;
  }

  .empty-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
    text-align: center;
    padding: 40px;
  }
  .empty-preview .empty-icon { font-size: 32px; margin-bottom: 8px; }
  .empty-preview p { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; }
  .empty-preview .empty-sub { font-size: 12px; color: var(--text-tertiary); margin: 0; }

  @media (max-width: 900px) {
    .editor-panes.mode-split {
      grid-template-columns: 1fr;
    }
    .source-pane {
      border-right: none;
      border-bottom: 1px solid var(--surface-card-border);
      min-height: 280px;
    }
  }
</style>
