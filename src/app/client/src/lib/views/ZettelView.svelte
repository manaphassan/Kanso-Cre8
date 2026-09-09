<script lang="ts">
  import { onMount } from 'svelte';
  import { zettelService } from '../services/zettelService';
  import type { ZettelNote, ZettelType, ZettelTask } from '../types/zettel';

  let notes: ZettelNote[] = $state([]);
  let activeNote: ZettelNote = $state(zettelService.getNotes()[0]);
  let activeTypeFilter: 'all' | ZettelType = $state('all');
  let searchQuery = $state('');
  let isEditing = $state(false);
  let showTaskDrawer = $state(false);

  // Atelier Notes vs Scratchpad
  let activeTab: 'notes' | 'scratchpad' = $state('notes');
  let scratchpadContent = $state('');
  let scratchpadSaved = $state(false);

  // Form State
  let editTitle = $state('');
  let editType: ZettelType = $state('permanent');
  let editTags = $state('');
  let editContent = $state('');
  let isDiskSyncing = $state(false);

  onMount(async () => {
    isDiskSyncing = true;
    notes = await zettelService.loadNotesFromDisk();
    if (notes.length > 0) {
      selectNote(notes[0]);
    }
    scratchpadContent = await zettelService.loadScratchpadFromDisk();
    isDiskSyncing = false;
  });

  function handleScratchpadInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    scratchpadContent = target.value;
    zettelService.saveScratchpad(target.value);
    scratchpadSaved = true;
    setTimeout(() => { scratchpadSaved = false; }, 1500);
  }

  function selectNote(note: ZettelNote) {
    activeNote = note;
    editTitle = note.title;
    editType = note.type;
    editTags = note.tags.join(', ');
    editContent = note.content;
    isEditing = false;
  }

  function handleSave() {
    if (!editTitle) return;

    activeNote.title = editTitle;
    activeNote.type = editType;
    activeNote.tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    activeNote.content = editContent;

    zettelService.saveNote(activeNote);
    notes = zettelService.getNotes();
    isEditing = false;
  }

  function createNewNote(type: ZettelType = 'permanent') {
    const newNote: ZettelNote = {
      id: `zettel_${Date.now()}`,
      title: type === 'fleeting' ? `Quick Capture ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'New Atomic Concept',
      type,
      tags: [type === 'fleeting' ? 'quick-capture' : 'atomic-idea'],
      created: new Date().toISOString().split('T')[0],
      updated: new Date().toISOString().split('T')[0],
      relatedLinks: [],
      content: `# ${type === 'fleeting' ? 'Quick Capture' : 'New Atomic Concept'}\n\nWrite your atomic thought here. Link to clients with [[ACME]] or [[NEX]].\n\n- [ ] #task Next immediate action 📅 ${new Date().toISOString().split('T')[0]}`
    };

    zettelService.saveNote(newNote);
    notes = zettelService.getNotes();
    selectNote(newNote);
    isEditing = true;
  }

  function deleteNote(id: string) {
    if (confirm('Delete this atomic note?')) {
      zettelService.deleteNote(id);
      notes = zettelService.getNotes();
      if (notes.length > 0) selectNote(notes[0]);
    }
  }

  function toggleTaskCompletion(task: ZettelTask) {
    zettelService.toggleTask(task);
    notes = zettelService.getNotes();
    const updated = zettelService.getNoteById(activeNote.id);
    if (updated) activeNote = updated;
  }

  let filteredNotes = $derived(
    notes.filter(n => {
      const matchType = activeTypeFilter === 'all' || n.type === activeTypeFilter;
      const matchSearch = !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    })
  );

  let allTasks = $derived(zettelService.getAllTasks());
</script>

<div class="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
        <span class="p-2 rounded-lg bg-sky-500/10 text-sky-400">
          <svg width="24" height="24" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </span>
        Atelier Notes &amp; Knowledge
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        Interconnected creative second brain (<span class="font-mono text-xs text-primary">_Notes/</span>). Capture fleeting ideas, link clients via [[WikiLinks]], and rapid-scratch temporary notes.
      </p>
    </div>

    <div class="flex items-center gap-3">
      <!-- Mode Toggle -->
      <div class="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border">
        <button
          onclick={() => activeTab = 'notes'}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all {activeTab === 'notes' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
        >
          <svg class="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Atelier Notes
        </button>
        <button
          onclick={() => activeTab = 'scratchpad'}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all {activeTab === 'scratchpad' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
        >
          <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Scratchpad.md
        </button>
      </div>

      {#if activeTab === 'notes'}
        <button
          onclick={() => showTaskDrawer = !showTaskDrawer}
          class="inline-flex items-center gap-2 px-3.5 py-2 border border-border bg-card hover:bg-muted/50 text-foreground text-xs font-semibold rounded-lg transition-colors shadow-sm"
        >
          <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Vault Tasks ({allTasks.filter(t => !t.completed).length})
        </button>

        <button
          onclick={() => createNewNote('permanent')}
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-colors shadow-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Atomic Note
        </button>
      {/if}
    </div>
  </div>

  {#if activeTab === 'notes'}

  <!-- Main Split-Pane Workspace -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
    
    <!-- LEFT COLUMN: Note List & Classification Filter (4 Cols) -->
    <div class="lg:col-span-4 rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      <!-- Search Input -->
      <div class="relative">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search notes, [[wikilinks]], tags..."
          class="w-full px-3 py-2 pl-8 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
        />
        <svg class="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- 3-Tier Classification Filter Tabs -->
      <div class="grid grid-cols-4 gap-1 p-1 bg-muted/40 rounded-lg border border-border/40 text-[11px] font-medium text-center">
        <button
          onclick={() => activeTypeFilter = 'all'}
          class="py-1 rounded-md transition-colors {activeTypeFilter === 'all' ? 'bg-card text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
        >
          All
        </button>
        <button
          onclick={() => activeTypeFilter = 'permanent'}
          class="py-1 rounded-md transition-colors {activeTypeFilter === 'permanent' ? 'bg-sky-500/10 text-sky-400 font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
          title="Atomic permanent ideas"
        >
          Permanent
        </button>
        <button
          onclick={() => activeTypeFilter = 'fleeting'}
          class="py-1 rounded-md transition-colors {activeTypeFilter === 'fleeting' ? 'bg-amber-500/10 text-amber-400 font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
          title="Quick capture notes"
        >
          Fleeting
        </button>
        <button
          onclick={() => activeTypeFilter = 'literature'}
          class="py-1 rounded-md transition-colors {activeTypeFilter === 'literature' ? 'bg-purple-500/10 text-purple-400 font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
          title="Swipe files & references"
        >
          Swipe
        </button>
      </div>

      <!-- Notes List Items -->
      <div class="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {#each filteredNotes as note (note.id)}
          <button
            onclick={() => selectNote(note)}
            class="w-full text-left p-3 rounded-lg border transition-all space-y-1.5 {activeNote?.id === note.id ? 'border-primary bg-primary/5 shadow-xs' : 'border-border/60 hover:bg-muted/30'}"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-semibold text-foreground text-xs line-clamp-1">
                {note.title}
              </span>
              <span class="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold {note.type === 'permanent' ? 'bg-sky-500/10 text-sky-400' : note.type === 'fleeting' ? 'bg-amber-500/10 text-amber-400' : 'bg-purple-500/10 text-purple-400'}">
                {note.type}
              </span>
            </div>

            <!-- Tags & Client Pills -->
            <div class="flex items-center gap-1.5 flex-wrap">
              {#each note.tags as tag}
                <span class="text-[9px] font-mono text-muted-foreground bg-muted/50 px-1 rounded">#{tag}</span>
              {/each}
              {#if note.linkedClients && note.linkedClients.length > 0}
                <span class="text-[9px] font-mono text-primary bg-primary/10 px-1 rounded font-bold">
                  {note.linkedClients[0]}
                </span>
              {/if}
            </div>

            <!-- Preview Snippet -->
            <p class="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
              {note.content.replace(/^#+ .*/gm, '').trim()}
            </p>
          </button>
        {/each}
      </div>
    </div>

    <!-- RIGHT COLUMN: Active Note Editor & Canvas (8 Cols) -->
    <div class="lg:col-span-8 rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
      {#if activeNote}
        <!-- Top Action Bar -->
        <div class="flex items-center justify-between border-b border-border pb-4">
          <div class="flex items-center gap-3">
            <span class="text-xs font-mono uppercase px-2 py-0.5 rounded font-bold {activeNote.type === 'permanent' ? 'bg-sky-500/10 text-sky-400' : activeNote.type === 'fleeting' ? 'bg-amber-500/10 text-amber-400' : 'bg-purple-500/10 text-purple-400'}">
              {activeNote.type} note
            </span>
            <span class="text-xs text-muted-foreground font-mono">
              Updated: {activeNote.updated}
            </span>
          </div>

          <div class="flex items-center gap-2">
            {#if isEditing}
              <button
                onclick={handleSave}
                class="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors"
              >
                Save Note
              </button>
            {:else}
              <button
                onclick={() => isEditing = true}
                class="px-3 py-1.5 border border-border hover:bg-muted/50 text-foreground text-xs font-semibold rounded-md transition-colors"
              >
                Edit
              </button>
            {/if}

            <button
              onclick={() => deleteNote(activeNote.id)}
              class="text-rose-500 hover:text-rose-700 p-1.5 rounded-md hover:bg-rose-500/10"
              title="Delete note"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {#if isEditing}
          <!-- Edit Form -->
          <div class="space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div class="col-span-2 space-y-1">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Note Title</label>
                <input
                  type="text"
                  bind:value={editTitle}
                  class="w-full px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm font-semibold focus:outline-none focus:border-primary"
                />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase">Classification</label>
                <select
                  bind:value={editType}
                  class="w-full px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
                >
                  <option value="permanent">Permanent (Atomic)</option>
                  <option value="fleeting">Fleeting (Capture)</option>
                  <option value="literature">Literature (Swipe)</option>
                </select>
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-semibold text-muted-foreground uppercase">Tags (comma separated)</label>
              <input
                type="text"
                bind:value={editTags}
                placeholder="copywriting, hooks, branding..."
                class="w-full px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-semibold text-muted-foreground uppercase">Markdown Content</label>
              <textarea
                bind:value={editContent}
                rows="14"
                class="w-full p-4 rounded-lg border border-border bg-background text-foreground font-mono text-xs leading-relaxed focus:outline-none focus:border-primary"
              ></textarea>
            </div>
          </div>
        {:else}
          <!-- Rendered View -->
          <div class="space-y-6">
            <h2 class="text-xl font-bold text-foreground">{activeNote.title}</h2>

            <!-- WikiLinks & Client Intelligence Tray -->
            {#if (activeNote.linkedClients && activeNote.linkedClients.length > 0) || (activeNote.relatedLinks && activeNote.relatedLinks.length > 0)}
              <div class="p-3 bg-muted/20 border border-border/50 rounded-lg flex items-center gap-4 text-xs">
                {#if activeNote.linkedClients && activeNote.linkedClients.length > 0}
                  <div class="flex items-center gap-1.5">
                    <span class="text-muted-foreground font-semibold">Client:</span>
                    {#each activeNote.linkedClients as clientLink}
                      <span class="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold">
                        {clientLink}
                      </span>
                    {/each}
                  </div>
                {/if}

                {#if activeNote.relatedLinks && activeNote.relatedLinks.length > 0}
                  <div class="flex items-center gap-1.5">
                    <span class="text-muted-foreground font-semibold">Connected Notes:</span>
                    {#each activeNote.relatedLinks as rel}
                      <span class="px-2 py-0.5 rounded bg-muted/60 text-foreground font-mono text-[11px]">
                        {rel}
                      </span>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Note Content -->
            <div class="prose prose-invert max-w-none text-xs text-foreground/90 font-mono leading-relaxed whitespace-pre-wrap bg-background/50 p-6 rounded-lg border border-border/40">
{activeNote.content}
            </div>

            <!-- Extracted Actionable Tasks Section -->
            {#if activeNote.extractedTasks && activeNote.extractedTasks.length > 0}
              <div class="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-3">
                <h3 class="text-xs font-bold text-foreground flex items-center gap-2">
                  <span class="text-emerald-500">✓</span>
                  Extracted Actionable Tasks ({activeNote.extractedTasks.filter(t => t.completed).length}/{activeNote.extractedTasks.length})
                </h3>

                <div class="space-y-2">
                  {#each activeNote.extractedTasks as task}
                    <label class="flex items-center gap-3 p-2 bg-card rounded-lg border border-border/40 cursor-pointer hover:border-primary/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onchange={() => toggleTaskCompletion(task)}
                        class="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer"
                      />
                      <span class="text-xs {task.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'} flex-1">
                        {task.description}
                      </span>
                      {#if task.dueDate}
                        <span class="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          📅 {task.dueDate}
                        </span>
                      {/if}
                      {#if task.priority === 'high'}
                        <span class="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-bold">
                          ⏫ high
                        </span>
                      {/if}
                    </label>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </div>

  </div>
  {:else}
  <!-- SCRATCHPAD VIEW (_Notes/Scratchpad.md) -->
  <div class="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4 animate-fadeIn">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-xs font-semibold">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          _Notes/Scratchpad.md
        </div>

        <span class="text-xs font-mono text-muted-foreground">
          {scratchpadContent.split(/\s+/).filter(Boolean).length} words · {scratchpadContent.split('\n').length} lines
        </span>

        {#if scratchpadSaved}
          <span class="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded animate-pulse">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Auto-saved
          </span>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <button
          onclick={() => {
            navigator.clipboard.writeText(scratchpadContent);
            scratchpadSaved = true;
            setTimeout(() => { scratchpadSaved = false; }, 1200);
          }}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-muted/50 text-foreground text-xs font-semibold rounded-md transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy Content
        </button>

        <button
          onclick={() => {
            if (confirm('Clear Scratchpad content?')) {
              scratchpadContent = '';
              zettelService.saveScratchpad('');
            }
          }}
          class="px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-semibold rounded-md transition-colors"
        >
          Clear
        </button>
      </div>
    </div>

    <textarea
      value={scratchpadContent}
      oninput={handleScratchpadInput}
      rows="20"
      placeholder="Type instant thoughts, meeting scratch notes, clipboard dumps, or temporary hex codes..."
      class="w-full p-5 rounded-lg border border-border bg-background text-foreground font-mono text-xs leading-relaxed focus:outline-none focus:border-primary shadow-inner"
    ></textarea>

    <div class="p-3 bg-muted/20 border border-border/50 rounded-lg flex items-center justify-between text-[11px] text-muted-foreground font-mono">
      <span>💡 Saved to local Markdown storage engine: <strong class="text-foreground">_Notes/Scratchpad.md</strong></span>
      <span>Supports [[WikiLinks]] &amp; BuJo tasks</span>
    </div>
  </div>
  {/if}

  <!-- Global Vault Task Drawer Modal -->
  {#if showTaskDrawer}
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-border pb-3">
          <h2 class="text-sm font-bold text-foreground flex items-center gap-2">
            <span>📋 All Vault Tasks (Zettelkasten Rollup)</span>
          </h2>
          <button onclick={() => showTaskDrawer = false} class="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div class="space-y-2">
          {#each allTasks as task}
            <div class="p-3 bg-background border border-border/60 rounded-lg flex items-center justify-between gap-3 text-xs">
              <div class="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onchange={() => toggleTaskCompletion(task)}
                  class="w-4 h-4 rounded text-primary cursor-pointer"
                />
                <div>
                  <div class="{task.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}">
                    {task.description}
                  </div>
                  <div class="text-[10px] text-muted-foreground font-mono mt-0.5">
                    Source: <span class="text-primary">{task.sourceNoteTitle}</span>
                  </div>
                </div>
              </div>

              {#if task.dueDate}
                <span class="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                  {task.dueDate}
                </span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
