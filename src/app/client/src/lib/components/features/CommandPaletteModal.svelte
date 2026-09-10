<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentIcons, { type IconName } from '$lib/components/ui/FluentIcons.svelte';

  interface Props {
    open?: boolean;
    onClose?: () => void;
  }

  let {
    open = $bindable(false),
    onClose
  }: Props = $props();

  let query = $state<string>('');
  let selectedIndex = $state<number>(0);
  let inputRef: HTMLInputElement | null = $state(null);

  // Design Tokens & Brand Colors for 1-Click Copy
  const BRAND_PALETTE = [
    { type: 'token', name: 'Kanso Canvas (#09090B)', code: '#09090B', brand: 'KANSO', description: 'Master Zen canvas background' },
    { type: 'token', name: 'Kanso Surface (#18181B)', code: '#18181B', brand: 'KANSO', description: 'Studio card & panel surface' },
    { type: 'token', name: 'Kanso Accent (#38BDF8)', code: '#38BDF8', brand: 'KANSO', description: 'Electric sky CTA & active focus' },
    { type: 'token', name: 'Kanso Border (#27272A)', code: '#27272A', brand: 'KANSO', description: 'Hairline 1px border elevation' },
    { type: 'token', name: 'Acme Blue (ACME)', code: '#0284C7', brand: 'ACME', description: 'Acme Corporation brand primary' },
    { type: 'token', name: 'Nexus Violet (NEX)', code: '#8B5CF6', brand: 'NEX', description: 'Nexus Studio creative violet' },
    { type: 'token', name: 'Lumina Emerald (LUM)', code: '#10B981', brand: 'LUM', description: 'Lumina Labs brand accent' },
  ];

  interface QuickAction {
    type: 'action';
    id: string;
    label: string;
    icon: IconName;
    category: string;
    execute: () => void;
  }

  // Quick Action Commands
  const QUICK_ACTIONS: QuickAction[] = [
    { type: 'action', id: 'nav-dashboard', label: 'Go to Studio Deck', icon: 'dashboard', category: 'Navigation (⌘1)', execute: () => appState.navigate('dashboard') },
    { type: 'action', id: 'nav-projects', label: 'Open Project Vaults', icon: 'folder', category: 'Navigation (⌘2)', execute: () => appState.navigate('projects') },
    { type: 'action', id: 'nav-journal', label: 'Open Bullet Journal (BuJo Rapid Log)', icon: 'calendar', category: 'Navigation (⌘3)', execute: () => appState.navigate('journal') },
    { type: 'action', id: 'nav-review', label: 'Go to Review Queue', icon: 'checkCircle', category: 'Navigation (⌘4)', execute: () => appState.navigate('deliverables') },
    { type: 'action', id: 'nav-invoices', label: 'Open Quotes & Invoices Studio', icon: 'document', category: 'Navigation (⌘5)', execute: () => appState.navigate('invoices') },
    { type: 'action', id: 'nav-zettel', label: 'Open Atelier Notes & Knowledge', icon: 'document', category: 'Navigation (⌘6)', execute: () => appState.navigate('zettel') },
    { type: 'action', id: 'nav-clients', label: 'Open Clients & Brands Hub', icon: 'users', category: 'Navigation (⌘7)', execute: () => appState.navigate('clients') },
    { type: 'action', id: 'nav-radio', label: 'Open Focus Radio & Cassette Deck', icon: 'colorPalette', category: 'Navigation (⌘8)', execute: () => appState.navigate('radio') },
    { type: 'action', id: 'nav-copy', label: 'Open Copywriting Studio', icon: 'sparkles', category: 'AI Tools', execute: () => appState.navigate('copy-studio') },
    { type: 'action', id: 'nav-settings', label: 'Open Studio Settings & Storage', icon: 'settings', category: 'System (⌘9)', execute: () => appState.navigate('settings') },
    { type: 'action', id: 'theme-dark', label: 'Switch to Dark Theme (Studio Obsidian)', icon: 'colorPalette', category: 'Theme', execute: () => setAppTheme('dark') },
    { type: 'action', id: 'theme-light', label: 'Switch to Light Theme (Atelier Paper)', icon: 'colorPalette', category: 'Theme', execute: () => setAppTheme('light') },
    { type: 'action', id: 'theme-eink', label: 'Switch to E-Ink Theme (Zen Monochrome)', icon: 'colorPalette', category: 'Theme', execute: () => setAppTheme('eink') },
    { type: 'action', id: 'act-theme', label: 'Cycle Theme (Dark → Light → E-Ink)', icon: 'colorPalette', category: 'Theme', execute: () => toggleTheme() },
    { type: 'action', id: 'act-rescan', label: 'Rescan Markdown Vault', icon: 'history', category: 'System', execute: () => rescanVault() },
  ];

  function setAppTheme(theme: 'dark' | 'light' | 'eink') {
    appState.setTheme(theme);
    const names = { dark: 'Studio Obsidian (Dark)', light: 'Atelier Paper (Light)', eink: 'Zen Monochrome (E-Ink)' };
    appState.addToast(`Theme set to ${names[theme]}`, 'info');
  }

  function toggleTheme() {
    const next = appState.cycleTheme();
    const names: Record<string, string> = { dark: 'Studio Obsidian (Dark)', light: 'Atelier Paper (Light)', eink: 'Zen Monochrome (E-Ink)' };
    appState.addToast(`Theme switched to ${names[next] || next}`, 'info');
  }

  function rescanVault() {
    appState.addToast('Rescanning workspace markdown vault...', 'info');
    projectStore.loadProjects();
    projectStore.loadDashboard();
  }

  // Combined Fuzzy Search Results
  const searchResults = $derived.by(() => {
    const q = query.trim().toLowerCase();

    // 1. Filter Projects
    const projects = projectStore.projects.filter(p => {
      if (!q) return false;
      const text = `${p.jobId || ''} ${p.title || ''} ${p.designer || ''} ${p.brand || ''} ${(p.tags || []).join(' ')} ${p.status || ''}`.toLowerCase();
      return text.includes(q);
    }).slice(0, 5).map(p => ({
      type: 'project' as const,
      id: p.id,
      jobId: p.jobId || p.id,
      title: p.title || 'Untitled Project',
      brand: p.brand || 'SS',
      designer: p.designer || 'Unassigned',
      status: p.status || 'in-progress',
      execute: () => appState.navigate('project-detail', { id: p.id })
    }));

    // 2. Filter Tokens & Colors
    const tokens = BRAND_PALETTE.filter(t => {
      if (!q) return false;
      return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.brand.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }).slice(0, 4).map(t => ({
      ...t,
      execute: () => copyToken(t.code, t.name)
    }));

    // 3. Filter Actions (all available when query empty for touch users)
    const actions = QUICK_ACTIONS.filter(a => {
      if (!q) return true; // Show all actions by default when query is empty
      return a.label.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
    });

    return [...projects, ...tokens, ...(q ? actions.slice(0, 8) : actions)];
  });

  async function copyToken(code: string, name: string) {
    try {
      await navigator.clipboard.writeText(code);
      appState.addToast(`Copied ${code} (${name}) to clipboard`, 'success');
    } catch (err) {
      appState.addToast(`Code: ${code}`, 'info');
    }
  }

  function handleSelect(item: any) {
    if (!item) return;
    if (item.execute) {
      item.execute();
    }
    closeModal();
  }

  function closeModal() {
    open = false;
    query = '';
    selectedIndex = 0;
    if (onClose) onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length > 0) {
        selectedIndex = (selectedIndex + 1) % searchResults.length;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length > 0) {
        selectedIndex = (selectedIndex - 1 + searchResults.length) % searchResults.length;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0 && searchResults[selectedIndex]) {
        handleSelect(searchResults[selectedIndex]);
      }
    }
  }

  $effect(() => {
    if (open) {
      setTimeout(() => {
        if (inputRef) inputRef.focus();
      }, 50);
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="palette-backdrop" onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="palette-modal">
      <!-- Search Input Bar -->
      <div class="palette-search-header">
        <FluentIcons name="search" size={18} color="#94A3B8" />
        <input 
          bind:this={inputRef}
          type="text" 
          class="palette-input" 
          placeholder="Search projects (0001D), team (@alex), brand colors (#0284C7), or actions..." 
          bind:value={query}
        />
        {#if query}
          <button class="clear-btn" onclick={() => query = ''} title="Clear query">
            <FluentIcons name="close" size={14} />
          </button>
        {/if}
        <span class="esc-badge" onclick={closeModal}>ESC</span>
      </div>

      <!-- Results Container -->
      <div class="palette-body">
        {#if searchResults.length === 0}
          <div class="palette-empty">
            <FluentIcons name="search" size={36} color="rgba(255,255,255,0.2)" />
            <p style="margin-top: 10px;">No matching projects, tokens, or actions found for "{query}"</p>
            <span class="empty-hint">Try searching by Job ID (e.g. <code>0001D</code>), brand (<code>ACME</code>), or command (<code>review</code>).</span>
          </div>
        {:else}
          <div class="results-list">
            {#each searchResults as item, index}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div 
                class="result-row {selectedIndex === index ? 'selected' : ''}"
                onclick={() => handleSelect(item)}
                onmouseenter={() => selectedIndex = index}
              >
                {#if item.type === 'project'}
                  <div class="result-icon icon-project">
                    <FluentIcons name="folder" size={16} />
                  </div>
                  <div class="result-info">
                    <div class="result-title-row">
                      <span class="badge-brand">{item.brand}</span>
                      <span class="job-id-tag">{item.jobId}</span>
                      <span class="item-title">{item.title}</span>
                    </div>
                    <div class="result-sub">
                      <span>Designer: <b>{item.designer}</b></span>
                      <span>·</span>
                      <span class="status-pill status-{item.status}">{item.status}</span>
                    </div>
                  </div>
                  <span class="action-shortcut">
                    <span>Open Project</span>
                    <FluentIcons name="arrowRight" size={11} />
                  </span>

                {:else if item.type === 'token'}
                  <div class="color-swatch-box" style="background: {item.code};"></div>
                  <div class="result-info">
                    <div class="result-title-row">
                      <span class="item-title">{item.name}</span>
                      <code class="hex-badge">{item.code}</code>
                    </div>
                    <div class="result-sub">{item.description}</div>
                  </div>
                  <span class="action-shortcut">
                    <span>Copy Hex</span>
                    <FluentIcons name="copy" size={11} />
                  </span>

                {:else if item.type === 'action'}
                  <div class="result-icon icon-action">
                    <FluentIcons name={item.icon} size={16} />
                  </div>
                  <div class="result-info">
                    <div class="result-title-row">
                      <span class="item-title">{item.label}</span>
                    </div>
                    <div class="result-sub">{item.category}</div>
                  </div>
                  <span class="action-shortcut">
                    <span>Execute</span>
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer Quick Tips -->
      <div class="palette-footer">
        <div class="footer-tip">
          <kbd>↑</kbd><kbd>↓</kbd> <span>Navigate</span>
        </div>
        <div class="footer-tip">
          <kbd>↵</kbd> <span>Select</span>
        </div>
        <div class="footer-tip">
          <kbd>ESC</kbd> <span>Dismiss</span>
        </div>
        <div class="footer-sync">
          <span class="sync-dot"></span>
          <span>Synology Vault Live Index</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .palette-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
    z-index: 2000;
    animation: fadeIn 0.12s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .palette-modal {
    width: 90%;
    max-width: 680px;
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(33, 161, 247, 0.2);
    display: flex;
    flex-direction: column;
    max-height: 70vh;
  }

  /* Search Header */
  .palette-search-header {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    background: rgba(15, 23, 42, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    gap: 12px;
  }

  .search-icon {
    color: #21A1F7;
    flex-shrink: 0;
  }

  .palette-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #FFFFFF;
    font-size: 15px;
    font-weight: 500;
  }

  .palette-input::placeholder {
    color: #64748B;
    font-size: 13px;
  }

  .clear-btn {
    background: transparent;
    border: none;
    color: #94A3B8;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 6px;
    border-radius: 4px;
  }

  .clear-btn:hover {
    color: #FFFFFF;
    background: rgba(255, 255, 255, 0.1);
  }

  .esc-badge {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #94A3B8;
    cursor: pointer;
  }

  /* Body & Results */
  .palette-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    max-height: 420px;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .result-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    transition: all 0.1s ease;
    border: 1px solid transparent;
  }

  .result-row:hover, .result-row.selected {
    background: rgba(33, 161, 247, 0.12);
    border-color: rgba(33, 161, 247, 0.3);
  }

  .result-icon {
    font-size: 16px;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    flex-shrink: 0;
  }

  .color-swatch-box {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .result-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }

  .result-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
  }

  .badge-brand {
    font-size: 12.5px;
    font-weight: 800;
    padding: 3px 7px;
    border-radius: 4px;
    background: var(--brand-primary, #043388);
    color: #FFFFFF;
  }

  .job-id-tag {
    font-size: 13px;
    font-weight: 700;
    color: #21A1F7;
    font-family: monospace;
  }

  .item-title {
    font-size: 15px;
    font-weight: 600;
    color: #F8FAFC;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hex-badge {
    font-size: 12.5px;
    font-weight: 700;
    padding: 2px 7px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    color: #38BDF8;
  }

  .result-sub {
    font-size: 13.5px;
    color: #94A3B8;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-pill {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 4px;
  }

  .status-in-progress { background: rgba(0, 120, 212, 0.2); color: #60A5FA; }
  .status-review { background: rgba(245, 158, 11, 0.2); color: #FBBF24; }
  .status-revision { background: rgba(217, 119, 6, 0.2); color: #FB923C; }
  .status-approved, .status-done { background: rgba(16, 185, 129, 0.2); color: #34D399; }

  .action-shortcut {
    font-size: 12px;
    font-weight: 600;
    color: #64748B;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .result-row.selected .action-shortcut {
    opacity: 1;
    color: #21A1F7;
  }

  /* Empty State */
  .palette-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: #94A3B8;
  }

  .empty-emoji {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .empty-hint {
    font-size: 13px;
    color: #64748B;
    margin-top: 4px;
  }

  .empty-hint code {
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 4px;
    border-radius: 3px;
    color: #21A1F7;
  }

  /* Footer */
  .palette-footer {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    background: rgba(11, 17, 33, 0.95);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    gap: 16px;
    font-size: 13px;
    color: #94A3B8;
  }

  .footer-tip {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .footer-tip kbd {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 2px 7px;
    font-size: 12px;
    font-family: inherit;
    color: #CBD5E1;
  }

  .footer-sync {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #10B981;
    font-weight: 600;
  }

  .sync-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 6px #10B981;
  }
</style>
