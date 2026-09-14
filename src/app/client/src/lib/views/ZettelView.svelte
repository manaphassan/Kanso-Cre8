<script lang="ts">
  import { onMount } from 'svelte';
  import { zettelService } from '../services/zettelService';
  import type { ZettelNote, ZettelType, ZettelTask, BacklinkItem } from '../types/zettel';
  import MarkdownEditor from '../components/markdown/MarkdownEditor.svelte';
  import { appState } from '../stores/appState.svelte';

  let notes: ZettelNote[] = $state([]);
  let activeNote: ZettelNote | null = $state(null);
  let activeTypeFilter: 'all' | ZettelType = $state('all');
  let searchQuery = $state('');
  let showTaskDrawer = $state(false);

  // Tab: Atelier Notes vs Scratchpad.md
  let activeTab: 'notes' | 'scratchpad' = $state('notes');
  let scratchpadContent = $state('');
  let scratchpadSaved = $state(false);

  // Active Note Editable Buffer
  let activeTitle = $state('');
  let activeType: ZettelType = $state('permanent');
  let activeTags: string[] = $state([]);
  let activeContent = $state('');
  let newTagInput = $state('');
  let isEditingTitle = $state(false);
  let isDiskSyncing = $state(false);
  let showBacklinksTray = $state(false);
  let showTasksTray = $state(true);

  onMount(async () => {
    isDiskSyncing = true;
    notes = await zettelService.loadNotesFromDisk();
    if (notes.length > 0) {
      selectNote(notes[0]);
    }
    scratchpadContent = await zettelService.loadScratchpadFromDisk();
    isDiskSyncing = false;
  });

  function selectNote(note: ZettelNote) {
    activeNote = note;
    activeTitle = note.title;
    activeType = note.type;
    activeTags = [...(note.tags || [])];
    activeContent = note.content;
    isEditingTitle = false;
  }

  function handleScratchpadInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    scratchpadContent = target.value;
    zettelService.saveScratchpad(target.value);
    scratchpadSaved = true;
    setTimeout(() => { scratchpadSaved = false; }, 1400);
  }

  function handleSaveNoteContent(contentToSave?: string) {
    if (!activeNote) return;
    const finalContent = contentToSave !== undefined ? contentToSave : activeContent;
    activeNote.title = activeTitle.trim() || 'Untitled Note';
    activeNote.type = activeType;
    activeNote.tags = activeTags;
    activeNote.content = finalContent;
    activeNote.updated = new Date().toISOString().split('T')[0];

    zettelService.saveNote(activeNote);
    notes = zettelService.getNotes();
    appState.addToast(`Saved "${activeNote.title}" to Vault`, 'success');
  }

  function handleTitleBlur() {
    isEditingTitle = false;
    if (!activeTitle.trim() && activeNote) {
      activeTitle = activeNote.title;
    } else if (activeNote && activeTitle !== activeNote.title) {
      handleSaveNoteContent();
    }
  }

  function handleTypeChange(newType: ZettelType) {
    activeType = newType;
    if (activeNote) {
      activeNote.type = newType;
      handleSaveNoteContent();
    }
  }

  function addTag() {
    const trimmed = newTagInput.trim().replace(/^#/, '').toLowerCase();
    if (trimmed && !activeTags.includes(trimmed)) {
      activeTags = [...activeTags, trimmed];
      newTagInput = '';
      if (activeNote) handleSaveNoteContent();
    }
  }

  function removeTag(tagToRemove: string) {
    activeTags = activeTags.filter(t => t !== tagToRemove);
    if (activeNote) handleSaveNoteContent();
  }

  function createNewNote(type: ZettelType = 'permanent') {
    const today = new Date().toISOString().split('T')[0];
    const defaultTitle = type === 'fleeting' 
      ? `Quick Capture ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : type === 'literature'
        ? 'Swipe Reference & Notes'
        : 'Atomic Creative Insight';

    const newNote: ZettelNote = {
      id: `zettel_${Date.now()}`,
      title: defaultTitle,
      type,
      tags: [type === 'fleeting' ? 'capture' : type === 'literature' ? 'swipe' : 'concept'],
      created: today,
      updated: today,
      relatedLinks: [],
      content: `# ${defaultTitle}\n\nCapture your thought here. Connect ideas with [[WikiLinks]] or tag clients like [[ACME]] or [[NEX]].\n\n- [ ] #task Next creative step 📅 ${today}`
    };

    zettelService.saveNote(newNote);
    notes = zettelService.getNotes();
    selectNote(newNote);
    appState.addToast(`Created new ${type} note`, 'info');
  }

  function deleteCurrentNote() {
    if (!activeNote) return;
    if (confirm(`Delete "${activeNote.title}" from your vault?`)) {
      const idToDelete = activeNote.id;
      const cat = activeNote.type;
      zettelService.deleteNote(idToDelete, cat);
      notes = zettelService.getNotes();
      activeNote = notes.length > 0 ? notes[0] : null;
      if (activeNote) selectNote(activeNote);
      appState.addToast('Note deleted', 'info');
    }
  }

  function toggleTaskCompletion(task: ZettelTask) {
    zettelService.toggleTask(task);
    notes = zettelService.getNotes();
    if (activeNote) {
      const updated = zettelService.getNoteById(activeNote.id);
      if (updated) {
        activeNote = updated;
        activeContent = updated.content;
      }
    }
  }

  function copyNoteMarkdown() {
    if (!activeNote) return;
    navigator.clipboard.writeText(activeNote.content);
    appState.addToast('Markdown copied to clipboard', 'info');
  }

  function promoteScratchpadToNote() {
    if (!scratchpadContent.trim()) {
      appState.addToast('Scratchpad is empty', 'warning');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const firstLine = scratchpadContent.trim().split('\n')[0].replace(/^#+\s*/, '') || 'Scratchpad Extract';
    const newNote: ZettelNote = {
      id: `zettel_${Date.now()}`,
      title: firstLine.slice(0, 50),
      type: 'fleeting',
      tags: ['scratch-extract'],
      created: today,
      updated: today,
      relatedLinks: [],
      content: scratchpadContent
    };

    zettelService.saveNote(newNote);
    notes = zettelService.getNotes();
    activeTab = 'notes';
    selectNote(newNote);
    appState.addToast('Promoted scratchpad into new fleeting note!', 'success');
  }

  // Derived filtered notes
  const filteredNotes = $derived(
    notes.filter(n => {
      const matchType = activeTypeFilter === 'all' || n.type === activeTypeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        n.title.toLowerCase().includes(q) || 
        n.content.toLowerCase().includes(q) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q)));
      return matchType && matchSearch;
    })
  );

  const allTasks = $derived(zettelService.getAllTasks());
  const pendingTasksCount = $derived(allTasks.filter(t => !t.completed).length);

  const incomingBacklinks = $derived(
    activeNote ? zettelService.getBacklinks(activeNote.title, activeNote.id) : []
  );

  const categoryCounts = $derived({
    all: notes.length,
    permanent: notes.filter(n => n.type === 'permanent').length,
    fleeting: notes.filter(n => n.type === 'fleeting').length,
    literature: notes.filter(n => n.type === 'literature').length,
  });

  // Extract preview line
  function getPreviewSnippet(content: string): string {
    if (!content) return 'No content...';
    return content
      .split('\n')
      .map(l => l.replace(/^#+\s*/, '').replace(/^-\s*\[[ xX]\]\s*/, '').replace(/^-\s*/, '').trim())
      .filter(l => l.length > 0 && !l.startsWith('[['))[0] || 'Clean atomic note';
  }
</script>

<div class="atelier-notes-view">
  <!-- ═══════════ NOTION/EVERNOTE INSPIRED ZEN ATELIER HEADER ═══════════ -->
  <header class="atelier-notes-header">
    <div class="header-left">
      <div class="header-tag-pill">
        <span class="vault-root">_Notes/</span>
        <span class="vault-count">{notes.length} Atomic Notes</span>
      </div>
      <h1 class="atelier-title">Atelier Notes</h1>
      <p class="atelier-sub">Minimalist creative knowledge engine. Interconnected atomic notes, swipe files, and rapid scratchpad.</p>
    </div>

    <div class="header-right">
      <!-- Segmented View Switcher -->
      <div class="nav-segment-group">
        <button
          type="button"
          class="segment-btn"
          class:active={activeTab === 'notes'}
          onclick={() => activeTab = 'notes'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>Notes Canvas</span>
        </button>

        <button
          type="button"
          class="segment-btn"
          class:active={activeTab === 'scratchpad'}
          onclick={() => activeTab = 'scratchpad'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span>Scratchpad.md</span>
          {#if scratchpadContent.trim()}
            <span class="scratch-badge-dot"></span>
          {/if}
        </button>
      </div>

      {#if activeTab === 'notes'}
        <!-- Vault Tasks Quick Trigger -->
        <button
          type="button"
          class="aux-action-btn"
          onclick={() => showTaskDrawer = true}
          title="View all extracted tasks across your notes"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <span>Tasks ({pendingTasksCount})</span>
        </button>

        <!-- New Note CTA -->
        <div class="new-note-dropdown">
          <button
            type="button"
            class="primary-cta-btn"
            onclick={() => createNewNote('permanent')}
            title="Create Permanent Concept Note"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>New Note</span>
          </button>
        </div>
      {/if}
    </div>
  </header>

  <!-- ═══════════ MAIN CONTENT BODY ═══════════ -->
  {#if activeTab === 'notes'}
    <div class="atelier-workspace-grid">
      <!-- ─── LEFT COLUMN: NOTION/EVERNOTE STYLE NOTE NAVIGATOR (Sidebar) ─── -->
      <aside class="notes-sidebar-panel">
        <!-- Search Bar -->
        <div class="sidebar-search-box">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search notes, [[wikilinks]], tags..."
            class="search-input"
          />
          {#if searchQuery}
            <button
              type="button"
              class="clear-search-btn"
              onclick={() => searchQuery = ''}
              title="Clear search"
            >✕</button>
          {/if}
        </div>

        <!-- Minimalist Category Filter Pills -->
        <div class="category-filter-strip">
          <button
            type="button"
            class="filter-pill"
            class:active={activeTypeFilter === 'all'}
            onclick={() => activeTypeFilter = 'all'}
          >
            <span>All</span>
            <span class="count-tag">{categoryCounts.all}</span>
          </button>
          <button
            type="button"
            class="filter-pill permanent"
            class:active={activeTypeFilter === 'permanent'}
            onclick={() => activeTypeFilter = 'permanent'}
            title="Atomic Permanent Concepts"
          >
            <span class="dot-indicator sky"></span>
            <span>Permanent</span>
            <span class="count-tag">{categoryCounts.permanent}</span>
          </button>
          <button
            type="button"
            class="filter-pill fleeting"
            class:active={activeTypeFilter === 'fleeting'}
            onclick={() => activeTypeFilter = 'fleeting'}
            title="Quick Capture Ideas"
          >
            <span class="dot-indicator amber"></span>
            <span>Fleeting</span>
            <span class="count-tag">{categoryCounts.fleeting}</span>
          </button>
          <button
            type="button"
            class="filter-pill literature"
            class:active={activeTypeFilter === 'literature'}
            onclick={() => activeTypeFilter = 'literature'}
            title="Swipe File & References"
          >
            <span class="dot-indicator purple"></span>
            <span>Swipe</span>
            <span class="count-tag">{categoryCounts.literature}</span>
          </button>
        </div>

        <!-- Notes Card List (Evernote/Notion Clean Feed) -->
        <div class="notes-feed-list">
          {#if filteredNotes.length === 0}
            <div class="empty-feed-placeholder">
              <span class="empty-icon">📝</span>
              <p class="empty-text">No matching notes found</p>
              {#if searchQuery}
                <button type="button" class="empty-reset-btn" onclick={() => searchQuery = ''}>Clear search</button>
              {:else}
                <button type="button" class="empty-reset-btn" onclick={() => createNewNote('permanent')}>Create your first note</button>
              {/if}
            </div>
          {:else}
            {#each filteredNotes as note (note.id)}
              <button
                type="button"
                class="note-card-item"
                class:active={activeNote?.id === note.id}
                onclick={() => selectNote(note)}
              >
                <div class="card-header-row">
                  <span class="card-title truncate">{note.title}</span>
                  <span class="card-type-chip {note.type}">
                    {note.type === 'permanent' ? 'Permanent' : note.type === 'fleeting' ? 'Fleeting' : 'Swipe'}
                  </span>
                </div>

                <p class="card-snippet-text">
                  {getPreviewSnippet(note.content)}
                </p>

                <div class="card-footer-meta">
                  <span class="card-date">{note.updated || note.created}</span>
                  
                  <div class="card-badges-row">
                    {#if note.linkedClients && note.linkedClients.length > 0}
                      <span class="card-client-pill">
                        {note.linkedClients[0].replace(/[[\]]/g, '')}
                      </span>
                    {/if}
                    {#if note.tags && note.tags.length > 0}
                      <span class="card-tag-pill">#{note.tags[0]}</span>
                      {#if note.tags.length > 1}
                        <span class="card-tag-more">+{note.tags.length - 1}</span>
                      {/if}
                    {/if}
                  </div>
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </aside>

      <!-- ─── RIGHT COLUMN: NOTION DISTRACTION-FREE WORKSPACE CANVAS ─── -->
      <main class="note-editor-canvas">
        {#if activeNote}
          <!-- Canvas Top Metadata Bar -->
          <div class="canvas-top-bar">
            <!-- Classification Badge Dropdown -->
            <div class="classification-picker">
              <select
                value={activeType}
                onchange={(e) => handleTypeChange((e.target as HTMLSelectElement).value as ZettelType)}
                class="type-select-chip {activeType}"
                title="Change note classification"
              >
                <option value="permanent">● Permanent (Atomic Concept)</option>
                <option value="fleeting">● Fleeting (Quick Capture)</option>
                <option value="literature">● Swipe (Reference / Case Study)</option>
              </select>
            </div>

            <!-- Header Action Utilities -->
            <div class="canvas-actions-strip">
              <span class="updated-time-stamp" title="Last saved to local vault">
                Updated {activeNote.updated || activeNote.created}
              </span>

              <button
                type="button"
                class="icon-action-btn"
                onclick={copyNoteMarkdown}
                title="Copy raw Markdown to clipboard"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>

              <button
                type="button"
                class="icon-action-btn delete"
                onclick={deleteCurrentNote}
                title="Delete note from vault"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Direct Notion-Style Title Input -->
          <div class="note-title-container">
            <input
              type="text"
              bind:value={activeTitle}
              onblur={handleTitleBlur}
              placeholder="Untitled Note..."
              class="notion-title-input"
            />
          </div>

          <!-- Tags & Linked Clients Tray -->
          <div class="note-metadata-tags-tray">
            <!-- Client Links Pill -->
            {#if activeNote.linkedClients && activeNote.linkedClients.length > 0}
              <div class="meta-item-group">
                <span class="meta-label">Client:</span>
                {#each activeNote.linkedClients as clientRef}
                  <span class="meta-client-tag">
                    {clientRef.replace(/[[\]]/g, '')}
                  </span>
                {/each}
              </div>
            {/if}

            <!-- Tags List with Quick Add -->
            <div class="meta-item-group tags-group">
              <span class="meta-label">Tags:</span>
              {#each activeTags as tag}
                <span class="tag-pill">
                  #{tag}
                  <button type="button" class="tag-remove-x" onclick={() => removeTag(tag)}>×</button>
                </span>
              {/each}

              <div class="add-tag-form">
                <input
                  type="text"
                  bind:value={newTagInput}
                  placeholder="+ tag"
                  onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  class="add-tag-input"
                />
              </div>
            </div>
          </div>

          <!-- Notion-Grade Markdown Canvas with Full Formatting Toolbar -->
          <div class="markdown-canvas-wrapper">
            <MarkdownEditor
              bind:value={activeContent}
              placeholder="Capture atomic thought, write Markdown with live preview..."
              saveLabel="Save Note"
              onSave={handleSaveNoteContent}
            />
          </div>

          <!-- Bottom Collapsible Intelligence Bars (Tasks & Backlinks) -->
          <div class="collapsible-intelligence-section">
            <!-- Extracted Actionable Tasks -->
            {#if activeNote.extractedTasks && activeNote.extractedTasks.length > 0}
              <div class="drawer-tray-card">
                <div class="drawer-tray-header">
                  <span class="tray-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 11 12 14 22 4"></polyline>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    Actionable Tasks ({activeNote.extractedTasks.filter(t => t.completed).length}/{activeNote.extractedTasks.length})
                  </span>
                  <button
                    type="button"
                    class="tray-toggle-btn"
                    onclick={() => showTasksTray = !showTasksTray}
                  >
                    {showTasksTray ? 'Hide' : 'Show'}
                  </button>
                </div>

                {#if showTasksTray}
                  <div class="tasks-checklist">
                    {#each activeNote.extractedTasks as task}
                      <label class="task-check-row">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onchange={() => toggleTaskCompletion(task)}
                          class="task-checkbox"
                        />
                        <span class="task-desc" class:completed={task.completed}>
                          {task.description}
                        </span>
                        {#if task.dueDate}
                          <span class="task-due-chip">📅 {task.dueDate}</span>
                        {/if}
                        {#if task.priority === 'high' || task.priority === 'urgent'}
                          <span class="task-priority-chip">⏫ {task.priority}</span>
                        {/if}
                      </label>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Inbound Bi-Directional Backlinks -->
            <div class="drawer-tray-card">
              <div class="drawer-tray-header">
                <span class="tray-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                  Bi-Directional Backlinks ({incomingBacklinks.length})
                </span>
                <button
                  type="button"
                  class="tray-toggle-btn"
                  onclick={() => showBacklinksTray = !showBacklinksTray}
                >
                  {showBacklinksTray ? 'Hide' : 'Show'}
                </button>
              </div>

              {#if showBacklinksTray}
                {#if incomingBacklinks.length === 0}
                  <p class="empty-tray-msg">
                    Zero notes currently link here. Use <code class="mono-code">[[{activeNote.title}]]</code> in other notes to create links.
                  </p>
                {:else}
                  <div class="backlinks-grid">
                    {#each incomingBacklinks as bl}
                      <button
                        type="button"
                        class="backlink-card"
                        onclick={() => selectNote(bl.note)}
                      >
                        <div class="bl-card-top">
                          <span class="bl-title">{bl.note.title}</span>
                          <span class="bl-badge {bl.note.type}">{bl.note.type}</span>
                        </div>
                        <p class="bl-snippet">"{bl.snippet}"</p>
                      </button>
                    {/each}
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {:else}
          <div class="empty-canvas-state">
            <span class="empty-zen-icon">簡素</span>
            <h3>No Note Selected</h3>
            <p>Select an atomic note from the sidebar or start capturing a new idea.</p>
            <button
              type="button"
              class="primary-cta-btn"
              onclick={() => createNewNote('permanent')}
            >
              + Create New Note
            </button>
          </div>
        {/if}
      </main>
    </div>
  {:else}
    <!-- ═══════════ SCRATCHPAD MODE (_Notes/Scratchpad.md) ═══════════ -->
    <div class="scratchpad-canvas-container">
      <div class="scratchpad-header-row">
        <div class="scratchpad-meta">
          <span class="file-chip">_Notes/Scratchpad.md</span>
          <span class="scratch-stats">
            {scratchpadContent.split(/\s+/).filter(Boolean).length} words · {scratchpadContent.split('\n').length} lines
          </span>
          {#if scratchpadSaved}
            <span class="autosaved-pill">
              <span class="save-dot"></span> Saved
            </span>
          {/if}
        </div>

        <div class="scratchpad-actions">
          <button
            type="button"
            class="aux-action-btn"
            onclick={promoteScratchpadToNote}
            title="Convert Scratchpad into a permanent or fleeting note"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <span>Promote to Note</span>
          </button>

          <button
            type="button"
            class="aux-action-btn"
            onclick={() => {
              navigator.clipboard.writeText(scratchpadContent);
              appState.addToast('Scratchpad copied to clipboard', 'info');
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>

          <button
            type="button"
            class="aux-action-btn danger"
            onclick={() => {
              if (confirm('Clear entire Scratchpad?')) {
                scratchpadContent = '';
                zettelService.saveScratchpad('');
                appState.addToast('Scratchpad cleared', 'info');
              }
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <textarea
        value={scratchpadContent}
        oninput={handleScratchpadInput}
        placeholder="Type fast thoughts, meeting scribbles, clipboard dumps, prompt ideas, or temporary hex codes... Auto-saved in real-time."
        class="zen-scratchpad-textarea"
      ></textarea>

      <div class="scratchpad-footer-bar">
        <span>💡 Human-readable Markdown storage: <strong class="vault-path">_Notes/Scratchpad.md</strong></span>
        <span>Instant plain-text sync with Obsidian &amp; VS Code</span>
      </div>
    </div>
  {/if}

  <!-- ═══════════ GLOBAL VAULT TASKS MODAL DRAWER ═══════════ -->
  {#if showTaskDrawer}
    <div class="modal-backdrop" onclick={() => showTaskDrawer = false}>
      <div class="task-drawer-modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-icon">✓</span>
            <h2>Universal Vault Tasks ({allTasks.length})</h2>
          </div>
          <button type="button" class="close-btn" onclick={() => showTaskDrawer = false}>✕</button>
        </div>

        <div class="modal-body-scroll">
          {#if allTasks.length === 0}
            <p class="empty-task-text">No `- [ ] #task` items found in your notes.</p>
          {:else}
            <div class="tasks-list">
              {#each allTasks as task}
                <div class="universal-task-row">
                  <label class="task-item-label">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onchange={() => toggleTaskCompletion(task)}
                      class="task-checkbox"
                    />
                    <div class="task-info">
                      <span class="task-text" class:completed={task.completed}>
                        {task.description}
                      </span>
                      <span class="task-source">
                        From: <strong class="source-link">{task.sourceNoteTitle}</strong>
                      </span>
                    </div>
                  </label>

                  <div class="task-meta-pills">
                    {#if task.dueDate}
                      <span class="task-due-chip">📅 {task.dueDate}</span>
                    {/if}
                    {#if task.priority}
                      <span class="task-priority-chip">{task.priority}</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ═══════════ CANONICAL ATELIER DESIGN SYSTEM ═══════════ */
  .atelier-notes-view {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
    color: var(--kanso-text-primary);
  }

  /* ─── Header ─── */
  .atelier-notes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    padding-bottom: 4px;
  }
  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .header-tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-family: var(--font-mono);
  }
  .vault-root {
    color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 700;
  }
  .vault-count {
    color: var(--kanso-text-muted);
  }
  .atelier-title {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0;
    color: var(--kanso-text-primary);
  }
  .atelier-sub {
    font-size: 13px;
    color: var(--kanso-text-muted);
    margin: 0;
    line-height: 1.4;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* ─── Segment Navigation ─── */
  .nav-segment-group {
    display: inline-flex;
    padding: 3px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    gap: 2px;
  }
  .segment-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .segment-btn:hover {
    color: var(--kanso-text-primary);
  }
  .segment-btn.active {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
    border: 1px solid var(--kanso-border);
  }
  .scratch-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #F59E0B;
  }

  /* ─── Action Buttons ─── */
  .aux-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .aux-action-btn:hover {
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-text-muted);
  }
  .aux-action-btn.danger {
    color: #F43F5E;
  }
  .aux-action-btn.danger:hover {
    background: rgba(244, 63, 94, 0.1);
    border-color: #F43F5E;
  }
  .primary-cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 700;
    background: var(--kanso-accent);
    color: #09090B;
    border: none;
    cursor: pointer;
    transition: transform 0.1s ease, filter 0.15s ease;
  }
  .primary-cta-btn:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  /* ═══════════ NOTION/EVERNOTE 2-PANE WORKSPACE GRID ═══════════ */
  .atelier-workspace-grid {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 20px;
    align-items: start;
  }

  @media (max-width: 900px) {
    .atelier-workspace-grid {
      grid-template-columns: 1fr;
    }
  }

  /* ─── Sidebar Panel ─── */
  .notes-sidebar-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    padding: 14px;
  }
  .sidebar-search-box {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-icon {
    position: absolute;
    left: 10px;
    color: var(--kanso-text-muted);
    pointer-events: none;
  }
  .search-input {
    width: 100%;
    padding: 7px 28px 7px 30px;
    border-radius: 7px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-canvas);
    color: var(--kanso-text-primary);
    font-size: 12px;
    outline: none;
    transition: border-color 0.15s ease;
  }
  .search-input:focus {
    border-color: var(--kanso-accent);
  }
  .clear-search-btn {
    position: absolute;
    right: 8px;
    background: transparent;
    border: none;
    color: var(--kanso-text-muted);
    font-size: 11px;
    cursor: pointer;
  }

  /* Category Filter Strip */
  .category-filter-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    background: var(--kanso-canvas);
    padding: 3px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border);
  }
  .filter-pill {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 5px 4px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .filter-pill:hover {
    color: var(--kanso-text-primary);
  }
  .filter-pill.active {
    background: var(--kanso-surface);
    color: var(--kanso-text-primary);
    border: 1px solid var(--kanso-border);
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  .filter-pill .count-tag {
    font-size: 10px;
    opacity: 0.7;
    font-family: var(--font-mono);
  }
  .dot-indicator {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }
  .dot-indicator.sky { background: #38BDF8; }
  .dot-indicator.amber { background: #F59E0B; }
  .dot-indicator.purple { background: #A855F7; }

  /* Feed List */
  .notes-feed-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: calc(100vh - 240px);
    overflow-y: auto;
    padding-right: 2px;
  }
  .note-card-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    background: transparent;
    border: 1px solid transparent;
    border-left: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: background 0.14s ease, border-color 0.14s ease;
  }
  .note-card-item:hover {
    background: var(--kanso-surface-hover);
  }
  .note-card-item.active {
    background: rgba(56, 189, 248, 0.06);
    border-color: rgba(56, 189, 248, 0.2);
    border-left: 2px solid var(--kanso-accent);
  }
  .card-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .card-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .card-type-chip {
    font-size: 9px;
    font-family: var(--font-mono);
    text-transform: uppercase;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .card-type-chip.permanent {
    background: rgba(56, 189, 248, 0.12);
    color: #38BDF8;
  }
  .card-type-chip.fleeting {
    background: rgba(245, 158, 11, 0.12);
    color: #F59E0B;
  }
  .card-type-chip.literature {
    background: rgba(168, 85, 247, 0.12);
    color: #A855F7;
  }

  .card-snippet-text {
    font-size: 11.5px;
    color: var(--kanso-text-muted);
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 11px;
    color: var(--kanso-text-muted);
  }
  .card-date {
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .card-badges-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .card-client-pill {
    font-size: 10px;
    font-family: var(--font-mono);
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(56, 189, 248, 0.15);
    color: var(--kanso-accent);
  }
  .card-tag-pill {
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--kanso-text-muted);
    background: var(--kanso-canvas);
    padding: 1px 5px;
    border-radius: 3px;
  }
  .card-tag-more {
    font-size: 9px;
    font-family: var(--font-mono);
    color: var(--kanso-text-muted);
  }

  /* Empty Feed */
  .empty-feed-placeholder {
    padding: 30px 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .empty-icon {
    font-size: 24px;
  }
  .empty-text {
    font-size: 12px;
    color: var(--kanso-text-muted);
    margin: 0;
  }
  .empty-reset-btn {
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-accent);
    background: transparent;
    border: none;
    cursor: pointer;
    text-decoration: underline;
  }

  /* ─── Right Pane: Note Editor Canvas ─── */
  .note-editor-canvas {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: calc(100vh - 240px);
  }

  .canvas-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 12px;
  }
  .type-select-chip {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    font-family: var(--font-mono);
    border: 1px solid var(--kanso-border);
    background: var(--kanso-canvas);
    color: var(--kanso-text-primary);
    cursor: pointer;
    outline: none;
  }
  .type-select-chip.permanent { color: #38BDF8; }
  .type-select-chip.fleeting { color: #F59E0B; }
  .type-select-chip.literature { color: #A855F7; }

  .canvas-actions-strip {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .updated-time-stamp {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--kanso-text-muted);
  }
  .icon-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .icon-action-btn:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
  }
  .icon-action-btn.delete:hover {
    color: #F43F5E;
    border-color: #F43F5E;
    background: rgba(244, 63, 94, 0.1);
  }

  /* Notion-Style Title Input */
  .note-title-container {
    width: 100%;
  }
  .notion-title-input {
    width: 100%;
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--kanso-text-primary);
    background: transparent;
    border: none;
    outline: none;
    padding: 4px 0;
  }
  .notion-title-input::placeholder {
    color: var(--kanso-text-muted);
    opacity: 0.5;
  }

  /* Metadata Tray (Tags & Clients) */
  .note-metadata-tags-tray {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 6px 0 10px 0;
    border-bottom: 1px dashed var(--kanso-border);
    font-size: 11.5px;
  }
  .meta-item-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .meta-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .meta-client-tag {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(56, 189, 248, 0.15);
    color: var(--kanso-accent);
  }
  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 4px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
  }
  .tag-remove-x {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted);
    font-size: 12px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
  .tag-remove-x:hover {
    color: var(--kanso-text-primary);
  }
  .add-tag-form {
    display: inline-flex;
  }
  .add-tag-input {
    width: 60px;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px dashed var(--kanso-border);
    background: transparent;
    color: var(--kanso-text-primary);
    font-size: 11px;
    font-family: var(--font-mono);
    outline: none;
    transition: width 0.15s ease;
  }
  .add-tag-input:focus {
    width: 100px;
    border-color: var(--kanso-accent);
    border-style: solid;
  }

  /* Markdown Canvas Wrapper */
  .markdown-canvas-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* Intelligence Drawers */
  .collapsible-intelligence-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 10px;
  }
  .drawer-tray-card {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 10px 14px;
  }
  .drawer-tray-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .tray-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .tray-toggle-btn {
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-accent);
    background: transparent;
    border: none;
    cursor: pointer;
  }
  .tasks-checklist {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--kanso-border);
  }
  .task-check-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    cursor: pointer;
  }
  .task-checkbox {
    width: 14px;
    height: 14px;
    accent-color: var(--kanso-accent);
    cursor: pointer;
  }
  .task-desc {
    flex: 1;
    color: var(--kanso-text-primary);
  }
  .task-desc.completed {
    text-decoration: line-through;
    color: var(--kanso-text-muted);
  }
  .task-due-chip {
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--kanso-text-muted);
    background: var(--kanso-surface);
    padding: 1px 5px;
    border-radius: 3px;
  }
  .task-priority-chip {
    font-size: 10px;
    font-family: var(--font-mono);
    color: #F43F5E;
    font-weight: 700;
  }

  .backlinks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 8px;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--kanso-border);
  }
  .backlink-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    text-align: left;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .backlink-card:hover {
    border-color: var(--kanso-accent);
    background: var(--kanso-surface-hover);
  }
  .bl-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .bl-title {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bl-badge {
    font-size: 9px;
    font-family: var(--font-mono);
    text-transform: uppercase;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .bl-badge.permanent { color: #38BDF8; background: rgba(56, 189, 248, 0.12); }
  .bl-badge.fleeting { color: #F59E0B; background: rgba(245, 158, 11, 0.12); }
  .bl-badge.literature { color: #A855F7; background: rgba(168, 85, 247, 0.12); }
  .bl-snippet {
    font-size: 11px;
    color: var(--kanso-text-muted);
    font-family: var(--font-mono);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .empty-tray-msg {
    font-size: 11px;
    color: var(--kanso-text-muted);
    margin: 8px 0 0 0;
    font-style: italic;
  }
  .mono-code {
    color: var(--kanso-accent);
    font-family: var(--font-mono);
  }

  /* Empty Canvas State */
  .empty-canvas-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 400px;
    text-align: center;
    gap: 12px;
  }
  .empty-zen-icon {
    font-family: var(--font-display);
    font-size: 40px;
    color: var(--kanso-border);
    font-weight: 800;
  }
  .empty-canvas-state h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .empty-canvas-state p {
    margin: 0;
    font-size: 13px;
    color: var(--kanso-text-muted);
    max-width: 320px;
  }

  /* ═══════════ SCRATCHPAD MODE ═══════════ */
  .scratchpad-canvas-container {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: calc(100vh - 220px);
  }
  .scratchpad-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 12px;
  }
  .scratchpad-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .file-chip {
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 5px;
    background: rgba(245, 158, 11, 0.12);
    color: #F59E0B;
    border: 1px solid rgba(245, 158, 11, 0.25);
  }
  .scratch-stats {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--kanso-text-muted);
  }
  .autosaved-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-family: var(--font-mono);
    color: #10B981;
    background: rgba(16, 185, 129, 0.12);
    padding: 2px 6px;
    border-radius: 4px;
  }
  .save-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #10B981;
  }
  .scratchpad-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .zen-scratchpad-textarea {
    width: 100%;
    flex: 1;
    min-height: 480px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 16px;
    color: var(--kanso-text-primary);
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.6;
    outline: none;
    resize: none;
    transition: border-color 0.15s ease;
  }
  .zen-scratchpad-textarea:focus {
    border-color: var(--kanso-accent);
  }
  .scratchpad-footer-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--kanso-text-muted);
    padding-top: 4px;
  }
  .vault-path {
    color: var(--kanso-text-primary);
  }

  /* ═══════════ MODAL DRAWER ═══════════ */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .task-drawer-modal {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 14px;
    max-width: 580px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--kanso-border);
  }
  .modal-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .modal-icon {
    color: #10B981;
    font-weight: 800;
  }
  .modal-title-group h2 {
    font-size: 15px;
    font-weight: 700;
    margin: 0;
  }
  .close-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted);
    font-size: 14px;
    cursor: pointer;
  }
  .close-btn:hover {
    color: var(--kanso-text-primary);
  }
  .modal-body-scroll {
    padding: 16px 20px;
    overflow-y: auto;
    flex: 1;
  }
  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .universal-task-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
  }
  .task-item-label {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    flex: 1;
    cursor: pointer;
  }
  .task-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .task-text {
    font-size: 12.5px;
    font-weight: 500;
  }
  .task-text.completed {
    text-decoration: line-through;
    color: var(--kanso-text-muted);
  }
  .task-source {
    font-size: 10.5px;
    font-family: var(--font-mono);
    color: var(--kanso-text-muted);
  }
  .source-link {
    color: var(--kanso-accent);
  }
  .task-meta-pills {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .empty-task-text {
    font-size: 12px;
    color: var(--kanso-text-muted);
    text-align: center;
    padding: 24px 0;
    margin: 0;
  }
</style>
