<script lang="ts">
  import MarkdownViewer from './MarkdownViewer.svelte';

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
    placeholder = 'Write Markdown brief, deliverable checklist (- [ ]), or diagrams (```mermaid)...',
    onSave,
    readonly = false,
    title = '',
    saveLabel = 'Save to Vault'
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
      code = `\`\`\`mermaid\nflowchart TD\n  Brief[📋 Creative Brief] --> Concept[🎨 Visual Concept]\n  Concept --> Proof[🔍 Client Proof Preview]\n  Proof -->|Client Approved| Deliver[✅ Final Deliverables]\n  Proof -->|Revisions| Concept\n\`\`\``;
    } else if (type === 'pie') {
      code = `\`\`\`mermaid\npie title Deliverable Media Mix\n  "Packaging Dielines" : 40\n  "Social Media Ads" : 35\n  "3D Render Assets" : 25\n\`\`\``;
    } else if (type === 'sequence') {
      code = `\`\`\`mermaid\nsequenceDiagram\n  autonumber\n  Designer->>Client: Send Proof Review Link (v1)\n  Client-->>Designer: Request Color Revision\n  Designer->>Client: Send Updated Artwork (v2)\n  Client->>Designer: Sign-Off & Approve Final\n\`\`\``;
    } else if (type === 'timeline') {
      code = `\`\`\`mermaid\ntimeline\n  title Project Milestones\n  Week 1 : Moodboard & Concept Direction\n  Week 2 : Source Files & 3D Artwork\n  Week 3 : Client Review & Revisions\n  Week 4 : Master Delivery & Invoice\n\`\`\``;
    }
    insertBlock(code);
  }

  function insertTable() {
    const table = `| Item / Deliverable | Specification / Dimensions | Status |
| :--- | :--- | :--- |
| **Packaging Box** | CMYK 300 DPI, Matt Lamination | \`Ready\` |
| **Hero Illustration** | 3840 x 2160px (16:9), PNG + Vector | \`In-Progress\` |
| **Social Carousel** | 1080 x 1350px (4:5 Ratio), 5 Slides | \`Pending\` |`;
    insertBlock(table);
  }

  function insertCallout(type: 'NOTE' | 'TIP' | 'WARNING' | 'OBJECTIVE' | 'APPROVED') {
    let callout = '';
    if (type === 'NOTE') {
      callout = `> [!NOTE]\n> Key project reference, color specification, or deliverable detail.`;
    } else if (type === 'TIP') {
      callout = `> [!TIP]\n> Creative tip: maintain 300 DPI CMYK color profile for print outputs.`;
    } else if (type === 'WARNING') {
      callout = `> [!WARNING]\n> Critical client constraint: strictly adhere to brand guidelines and font licenses.`;
    } else if (type === 'OBJECTIVE') {
      callout = `> [!NOTE]\n> **Primary Objective**: Deliver high-impact visual design and production assets.`;
    } else if (type === 'APPROVED') {
      callout = `> [!NOTE]\n> **Client Sign-off**: Approved by client for final production export.`;
    }
    insertBlock(callout);
  }

  let showDiagramMenu = $state<boolean>(false);
  let showCalloutMenu = $state<boolean>(false);
</script>

<svelte:window onclick={() => { showDiagramMenu = false; showCalloutMenu = false; }} />

<div class="markdown-editor-wrapper">
  <!-- Top Obsidian / Notion Zen Command Bar -->
  <header class="editor-header">
    <div class="header-doc-meta">
      <span class="doc-icon">📝</span>
      <span class="doc-title">{title || 'README.md'}</span>
      <span class="meta-sep">•</span>
      <span class="doc-stats">{wordCount} words</span>
      <span class="meta-sep">•</span>
      <span class="doc-stats">~{readingTime}m read</span>
    </div>

    <div class="header-actions-row">
      <!-- Segmented View Mode Switcher -->
      <div class="segmented-modes">
        <button
          type="button"
          class="mode-btn"
          class:active={mode === 'preview'}
          onclick={() => mode = 'preview'}
          title="Reader Preview Mode"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>Preview</span>
        </button>
        <button
          type="button"
          class="mode-btn"
          class:active={mode === 'split'}
          onclick={() => mode = 'split'}
          title="Side-by-Side Split Mode"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="12" y1="3" x2="12" y2="21"/>
          </svg>
          <span>Split</span>
        </button>
        <button
          type="button"
          class="mode-btn"
          class:active={mode === 'source'}
          onclick={() => mode = 'source'}
          title="Markdown Source Code Mode"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          <span>Source</span>
        </button>
      </div>

      <!-- Tactile Save CTA -->
      {#if onSave && !readonly}
        <button
          type="button"
          class="save-doc-btn"
          disabled={isSaving}
          onclick={handleSave}
          title="Save changes to Vault (Ctrl+S / ⌘S)"
        >
          {#if isSaving}
            <span class="save-spinner"></span>
            <span>Saving...</span>
          {:else}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span>{saveLabel}</span>
            <kbd class="save-kbd">⌘S</kbd>
          {/if}
        </button>
      {/if}
    </div>
  </header>

  <!-- Secondary Sleek Notion/Obsidian Typography Toolbar (Visible in Split & Source) -->
  {#if mode === 'split' || mode === 'source'}
    <div class="notion-toolbar animate-fadeIn">
      <!-- Text Styles -->
      <div class="tool-section">
        <button
          type="button"
          class="n-tool-btn font-bold"
          onclick={() => wrapSelection('**', '**', 'bold text')}
          title="Bold (⌘B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          class="n-tool-btn font-italic"
          onclick={() => wrapSelection('*', '*', 'italic text')}
          title="Italic (⌘I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          class="n-tool-btn font-strike"
          onclick={() => wrapSelection('~~', '~~', 'strikethrough')}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <button
          type="button"
          class="n-tool-btn font-mono"
          onclick={() => wrapSelection('`', '`', 'code')}
          title="Inline Code"
        >
          &lt;/&gt;
        </button>
        <button
          type="button"
          class="n-tool-btn"
          onclick={() => wrapSelection('[', '](https://)', 'link text')}
          title="Add Link (⌘K)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </button>
      </div>

      <div class="tool-sep"></div>

      <!-- Headings -->
      <div class="tool-section">
        <button
          type="button"
          class="n-tool-btn h-tag"
          onclick={() => wrapSelection('# ', '', 'Heading 1')}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          class="n-tool-btn h-tag"
          onclick={() => wrapSelection('## ', '', 'Heading 2')}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          class="n-tool-btn h-tag"
          onclick={() => wrapSelection('### ', '', 'Heading 3')}
          title="Heading 3"
        >
          H3
        </button>
        <button
          type="button"
          class="n-tool-btn"
          onclick={() => insertBlock('> Quote text here')}
          title="Blockquote"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
          </svg>
        </button>
      </div>

      <div class="tool-sep"></div>

      <!-- Lists & Structure -->
      <div class="tool-section">
        <button
          type="button"
          class="n-tool-btn"
          onclick={() => insertBlock('- Task item')}
          title="Bulleted List"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/>
          </svg>
        </button>
        <button
          type="button"
          class="n-tool-btn"
          onclick={() => insertBlock('1. Ordered step')}
          title="Numbered List"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
            <path d="M4 6h1v4M4 10h2M4 14h2l-2 2h2v2"/>
          </svg>
        </button>
        <button
          type="button"
          class="n-tool-btn n-task-btn"
          onclick={() => insertBlock('- [ ] #task Action item')}
          title="Checklist Task"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <polyline points="9 11 12 14 22 4"/>
          </svg>
          <span>Task</span>
        </button>
        <button
          type="button"
          class="n-tool-btn"
          onclick={() => insertTable()}
          title="Insert 3x3 Table"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
          </svg>
          <span>Table</span>
        </button>
        <button
          type="button"
          class="n-tool-btn"
          onclick={() => insertBlock('```\n// code snippet\n```')}
          title="Code Block"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </button>
      </div>

      <div class="tool-sep"></div>

      <!-- Notion Callout Dropdown -->
      <div class="dropdown-wrapper" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <button
          type="button"
          class="n-dropdown-trigger"
          class:is-active={showCalloutMenu}
          onclick={() => { showCalloutMenu = !showCalloutMenu; showDiagramMenu = false; }}
          title="Notion Callout Box"
        >
          <span class="trigger-icon">💡</span>
          <span>Callout</span>
          <span class="trigger-arrow">▾</span>
        </button>
        {#if showCalloutMenu}
          <div class="n-dropdown-menu">
            <button class="n-menu-item" onclick={() => { insertCallout('NOTE'); showCalloutMenu = false; }}>
              <span class="m-icon">📌</span>
              <div class="m-text">
                <span class="m-title">Note</span>
                <span class="m-desc">Key reference or spec</span>
              </div>
            </button>
            <button class="n-menu-item" onclick={() => { insertCallout('TIP'); showCalloutMenu = false; }}>
              <span class="m-icon">💡</span>
              <div class="m-text">
                <span class="m-title">Tip / Idea</span>
                <span class="m-desc">Creative recommendation</span>
              </div>
            </button>
            <button class="n-menu-item" onclick={() => { insertCallout('WARNING'); showCalloutMenu = false; }}>
              <span class="m-icon">⚠️</span>
              <div class="m-text">
                <span class="m-title">Warning</span>
                <span class="m-desc">Crucial constraint</span>
              </div>
            </button>
            <button class="n-menu-item" onclick={() => { insertCallout('OBJECTIVE'); showCalloutMenu = false; }}>
              <span class="m-icon">🎯</span>
              <div class="m-text">
                <span class="m-title">Objective</span>
                <span class="m-desc">Campaign core goal</span>
              </div>
            </button>
            <button class="n-menu-item" onclick={() => { insertCallout('APPROVED'); showCalloutMenu = false; }}>
              <span class="m-icon">✅</span>
              <div class="m-text">
                <span class="m-title">Client Sign-Off</span>
                <span class="m-desc">Approval milestone</span>
              </div>
            </button>
          </div>
        {/if}
      </div>

      <!-- Mermaid Diagram Dropdown -->
      <div class="dropdown-wrapper" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <button
          type="button"
          class="n-dropdown-trigger"
          class:is-active={showDiagramMenu}
          onclick={() => { showDiagramMenu = !showDiagramMenu; showCalloutMenu = false; }}
          title="Mermaid Diagrams"
        >
          <span class="trigger-icon">📊</span>
          <span>Diagram</span>
          <span class="trigger-arrow">▾</span>
        </button>
        {#if showDiagramMenu}
          <div class="n-dropdown-menu">
            <button class="n-menu-item" onclick={() => { insertMermaid('flow'); showDiagramMenu = false; }}>
              <span class="m-icon">🔀</span>
              <div class="m-text">
                <span class="m-title">Creative Workflow</span>
                <span class="m-desc">Brief to Final Flowchart</span>
              </div>
            </button>
            <button class="n-menu-item" onclick={() => { insertMermaid('timeline'); showDiagramMenu = false; }}>
              <span class="m-icon">⏳</span>
              <div class="m-text">
                <span class="m-title">Milestone Timeline</span>
                <span class="m-desc">Week-by-week sprint roadmap</span>
              </div>
            </button>
            <button class="n-menu-item" onclick={() => { insertMermaid('sequence'); showDiagramMenu = false; }}>
              <span class="m-icon">💬</span>
              <div class="m-text">
                <span class="m-title">Client Review Sequence</span>
                <span class="m-desc">Proof review & feedback cycle</span>
              </div>
            </button>
            <button class="n-menu-item" onclick={() => { insertMermaid('pie'); showDiagramMenu = false; }}>
              <span class="m-icon">🥧</span>
              <div class="m-text">
                <span class="m-title">Media Mix Breakdown</span>
                <span class="m-desc">Deliverables proportion chart</span>
              </div>
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

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
            <p>No document content written yet.</p>
            <p class="empty-sub">Type your creative brief, checklist, or client notes above.</p>
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
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 10px;
    overflow: hidden;
  }

  /* ── Header Zen Bar ── */
  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: var(--kanso-canvas, #09090B);
    border-bottom: 1px solid var(--kanso-border, #27272A);
    gap: 12px;
    flex-wrap: wrap;
  }

  .header-doc-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
  }

  .doc-icon {
    font-size: 13px;
  }

  .doc-title {
    font-weight: 600;
    color: var(--kanso-text-primary, #F4F4F5);
    letter-spacing: -0.01em;
  }

  .meta-sep {
    color: var(--kanso-border, #27272A);
    font-size: 10px;
  }

  .doc-stats {
    font-size: 11px;
    color: var(--kanso-text-muted, #71717A);
  }

  .header-actions-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* Segmented Modes */
  .segmented-modes {
    display: flex;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }

  .mode-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--kanso-text-muted, #71717A);
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .mode-btn:hover {
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .mode-btn.active {
    background: var(--kanso-surface-hover, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    font-weight: 600;
  }

  /* Tactile Save CTA */
  .save-doc-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
    border: none;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .save-doc-btn:hover:not(:disabled) {
    filter: brightness(1.08);
    transform: translateY(-0.5px);
  }

  .save-doc-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .save-kbd {
    display: inline-block;
    padding: 1px 4px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 3px;
    font-family: inherit;
    font-size: 9.5px;
    font-weight: 700;
  }

  .save-spinner {
    width: 11px;
    height: 11px;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── Notion Toolbar ── */
  .notion-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--kanso-surface, #18181B);
    border-bottom: 1px solid var(--kanso-border, #27272A);
    flex-wrap: wrap;
  }

  .tool-section {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .tool-sep {
    width: 1px;
    height: 16px;
    background: var(--kanso-border, #27272A);
    margin: 0 4px;
  }

  .n-tool-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 26px;
    min-width: 26px;
    padding: 0 6px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--kanso-text-muted, #71717A);
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .n-tool-btn:hover {
    background: var(--kanso-surface-hover, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .n-tool-btn.h-tag {
    font-weight: 700;
    font-size: 10.5px;
    letter-spacing: -0.02em;
  }

  .n-tool-btn.font-mono {
    font-family: monospace;
    font-size: 11px;
  }

  .n-task-btn {
    color: var(--kanso-text-primary, #F4F4F5);
    font-weight: 500;
  }

  /* Dropdown Triggers */
  .dropdown-wrapper {
    position: relative;
    display: inline-block;
  }

  .n-dropdown-trigger {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    padding: 0 8px;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 5px;
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .n-dropdown-trigger:hover,
  .n-dropdown-trigger.is-active {
    background: var(--kanso-surface-hover, #27272A);
    border-color: var(--kanso-accent, #38BDF8);
  }

  .trigger-icon {
    font-size: 11.5px;
  }

  .trigger-arrow {
    font-size: 9px;
    color: var(--kanso-text-muted, #71717A);
  }

  /* Notion Dropdown Menu */
  .n-dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 100;
    min-width: 200px;
    animation: fadeIn 0.12s ease;
  }

  .n-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: all 0.1s ease;
    width: 100%;
  }

  .n-menu-item:hover {
    background: var(--kanso-surface-hover, #27272A);
  }

  .m-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .m-text {
    display: flex;
    flex-direction: column;
  }

  .m-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .m-desc {
    font-size: 10px;
    color: var(--kanso-text-muted, #71717A);
  }

  /* Panes Layout */
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
    border-right: 1px solid var(--kanso-border, #27272A);
    background: var(--kanso-canvas, #09090B);
    min-height: 440px;
  }
  .mode-source .source-pane {
    border-right: none;
  }

  .source-pane textarea {
    width: 100%;
    min-height: 440px;
    height: 100%;
    padding: 16px 18px;
    border: none;
    outline: none;
    resize: vertical;
    overflow-y: auto;
    font-family: 'JetBrains Mono', 'Geist Mono', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.65;
    background: transparent;
    color: var(--kanso-text-primary, #F4F4F5);
    box-sizing: border-box;
  }

  .preview-pane {
    padding: 20px 24px;
    background: var(--kanso-surface, #18181B);
    min-height: 240px;
    overflow: visible;
  }

  .empty-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--kanso-text-muted, #71717A);
    text-align: center;
    padding: 40px;
  }
  .empty-preview .empty-icon { font-size: 30px; margin-bottom: 8px; opacity: 0.8; }
  .empty-preview p { font-size: 13px; font-weight: 600; color: var(--kanso-text-primary, #F4F4F5); margin: 0 0 4px 0; }
  .empty-preview .empty-sub { font-size: 11.5px; color: var(--kanso-text-muted, #71717A); margin: 0; }

  @media (max-width: 900px) {
    .editor-panes.mode-split {
      grid-template-columns: 1fr;
    }
    .source-pane {
      border-right: none;
      border-bottom: 1px solid var(--kanso-border, #27272A);
      min-height: 260px;
    }
  }
</style>
