<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import { journalService } from '$lib/services/journalService';
  import { radioService, ALL_CASSETTE_STATIONS } from '$lib/services/radioService.svelte';
  import { clientService } from '$lib/services/clientService';
  import Icon, { type IconName } from '$lib/components/ui/Icon.svelte';
  import { handleBackdropClick } from '$lib/utils';

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
  let activeFilter = $state<'all' | 'nav' | 'actions' | 'projects'>('all');
  let inputRef: HTMLInputElement | null = $state(null);

  interface PaletteAction {
    type: 'action' | 'nav' | 'timer' | 'radio';
    id: string;
    label: string;
    sublabel?: string;
    icon: IconName;
    badge?: string;
    category: string;
    execute: () => void;
  }

  // Freelance Designer Quick Actions
  const STUDIO_ACTIONS: PaletteAction[] = [
    // Timers
    {
      type: 'timer',
      id: 'timer-acme',
      label: 'Start Billable Timer: Acme Corp',
      sublabel: `${settingsStore.settings.currencySymbol || 'RM'}180/hr · Enterprise cloud & creative operations`,
      icon: 'history',
      badge: `${settingsStore.settings.currencySymbol || 'RM'}180/h`,
      category: 'Billable Timer',
      execute: () => {
        timerStore.setClient('ACME', 180);
        timerStore.start();
        appState.addToast(`Timer started: Acme Corp @ ${settingsStore.settings.currencySymbol || 'RM'}180/hr`, 'success');
      }
    },
    {
      type: 'timer',
      id: 'timer-nex',
      label: 'Start Billable Timer: Nexus Studio',
      sublabel: `${settingsStore.settings.currencySymbol || 'RM'}150/hr · Motion design & interactive visual campaigns`,
      icon: 'history',
      badge: `${settingsStore.settings.currencySymbol || 'RM'}150/h`,
      category: 'Billable Timer',
      execute: () => {
        timerStore.setClient('NEX', 150);
        timerStore.start();
        appState.addToast(`Timer started: Nexus Studio @ ${settingsStore.settings.currencySymbol || 'RM'}150/hr`, 'success');
      }
    },
    {
      type: 'timer',
      id: 'timer-lum',
      label: 'Start Billable Timer: Lumina Labs',
      sublabel: `${settingsStore.settings.currencySymbol || 'RM'}160/hr · Biotech intelligence & research UI`,
      icon: 'history',
      badge: `${settingsStore.settings.currencySymbol || 'RM'}160/h`,
      category: 'Billable Timer',
      execute: () => {
        timerStore.setClient('LUM', 160);
        timerStore.start();
        appState.addToast(`Timer started: Lumina Labs @ ${settingsStore.settings.currencySymbol || 'RM'}160/hr`, 'success');
      }
    },
    {
      type: 'timer',
      id: 'timer-stop',
      label: 'Pause / Stop Active Timer',
      sublabel: 'Save session & append to draft invoice',
      icon: 'history',
      badge: 'Stop',
      category: 'Billable Timer',
      execute: () => {
        if (timerStore.isRunning || timerStore.isPaused) {
          const log = timerStore.stop();
          if (log) {
            appState.addToast(`Session saved: ${log.durationFormatted} (${log.earnedFormatted})`, 'success');
          }
        } else {
          appState.addToast('No active timer running', 'info');
        }
      }
    },

    // Invoices & Quotes
    {
      type: 'action',
      id: 'act-invoice-new',
      label: 'Create New Invoice',
      sublabel: 'Markdown invoice in _Finance/Invoices/',
      icon: 'document',
      badge: 'Invoice',
      category: 'Quotes & Invoices',
      execute: () => appState.navigate('invoices')
    },
    {
      type: 'action',
      id: 'act-quote-new',
      label: 'Create New Quote & Proposal',
      sublabel: 'Design quotation in _Finance/Quotes/',
      icon: 'document',
      badge: 'Proposal',
      category: 'Quotes & Invoices',
      execute: () => appState.navigate('invoices')
    },
    {
      type: 'action',
      id: 'act-switch-vault',
      label: 'Switch Creative Vault (Ctrl+O)',
      sublabel: 'Mount local directory or cloud sync folder with zero locks',
      icon: 'folder',
      badge: 'Ctrl+O',
      category: 'System & Vault',
      execute: () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', ctrlKey: true, bubbles: true }));
      }
    },

    // Focus Radio Stations
    {
      type: 'radio',
      id: 'radio-chillhop',
      label: 'Tune Focus Radio: Chillhop Cafe',
      sublabel: '98.4 FM · Smooth lo-fi beats for design focus',
      icon: 'colorPalette',
      badge: '98.4 FM',
      category: 'Focus Radio',
      execute: () => {
        const station = ALL_CASSETTE_STATIONS.find(s => s.id === 'lofi-cafe');
        if (station) radioService.tuneStation(station);
        appState.addToast('Tuned to Chillhop Cafe (98.4 FM)', 'info');
      }
    },
    {
      type: 'radio',
      id: 'radio-nightwave',
      label: 'Tune Focus Radio: Nightwave Plaza',
      sublabel: '102.1 FM · Vaporwave & late-night synthwave',
      icon: 'colorPalette',
      badge: '102.1 FM',
      category: 'Focus Radio',
      execute: () => {
        const station = ALL_CASSETTE_STATIONS.find(s => s.id === 'nightwave-plaza');
        if (station) radioService.tuneStation(station);
        appState.addToast('Tuned to Nightwave Plaza (102.1 FM)', 'info');
      }
    },
    {
      type: 'radio',
      id: 'radio-animefm',
      label: 'Tune Focus Radio: AnimeFM',
      sublabel: '93.8 FM · Anime OSTs, vocaloid classics & Japanese pop',
      icon: 'colorPalette',
      badge: '93.8 FM',
      category: 'Focus Radio',
      execute: () => {
        const station = ALL_CASSETTE_STATIONS.find(s => s.id === 'anime-fm');
        if (station) radioService.tuneStation(station);
        appState.addToast('Tuned to AnimeFM (93.8 FM)', 'info');
      }
    },
    {
      type: 'radio',
      id: 'radio-initial-d',
      label: 'Tune Focus Radio: Initial D World Broadcast',
      sublabel: '104.5 FM · High-octane Super Eurobeat & Akina drift anthems',
      icon: 'colorPalette',
      badge: '104.5 FM',
      category: 'Focus Radio',
      execute: () => {
        const station = ALL_CASSETTE_STATIONS.find(s => s.id === 'initial-d-world');
        if (station) radioService.tuneStation(station);
        appState.addToast('Tuned to Initial D World Broadcast (104.5 FM)', 'info');
      }
    },
    {
      type: 'radio',
      id: 'radio-toggle',
      label: 'Toggle Focus Radio (Play / Pause)',
      sublabel: 'Engage or pause 33 RPM cassette motor',
      icon: 'colorPalette',
      badge: 'Space',
      category: 'Focus Radio',
      execute: () => radioService.toggle()
    },



    // Canonical 6-Item Navigation (⌘1 to ⌘6)
    {
      type: 'nav',
      id: 'nav-1-dashboard',
      label: 'Go to Home',
      sublabel: 'Overview, tasks, projects, and cashflow',
      icon: 'dashboard',
      badge: '⌘1',
      category: 'Navigation',
      execute: () => appState.navigate('dashboard')
    },
    {
      type: 'nav',
      id: 'nav-2-projects',
      label: 'Open Projects',
      sublabel: 'Active projects, deliverables, and briefs',
      icon: 'folder',
      badge: '⌘2',
      category: 'Navigation',
      execute: () => appState.navigate('projects')
    },
    {
      type: 'nav',
      id: 'nav-3-journal',
      label: 'Open Journal',
      sublabel: 'Daily notes, task rollover & reviews',
      icon: 'calendar',
      badge: '⌘3',
      category: 'Navigation',
      execute: () => appState.navigate('journal')
    },
    {
      type: 'nav',
      id: 'nav-4-notes',
      label: 'Open Notes',
      sublabel: 'Atomic notes, swipe files, and scratchpad',
      icon: 'file',
      badge: '⌘4',
      category: 'Navigation',
      execute: () => appState.navigate('notes')
    },
    {
      type: 'nav',
      id: 'nav-5-clients-money',
      label: 'Open Clients & Money',
      sublabel: 'Client profiles, quotes, and invoices',
      icon: 'wallet',
      badge: '⌘5',
      category: 'Navigation',
      execute: () => appState.navigate('clients')
    },
    {
      type: 'nav',
      id: 'nav-6-settings',
      label: 'Open Settings',
      sublabel: 'Vault configuration, themes & preferences',
      icon: 'settings',
      badge: '⌘6',
      category: 'Navigation',
      execute: () => appState.navigate('settings')
    },
    {
      type: 'nav',
      id: 'nav-radio-drawer',
      label: 'Open Focus Radio Drawer',
      sublabel: 'Mechanical cassette focus audio and 25-minute Pomodoro',
      icon: 'music',
      badge: 'Radio',
      category: 'Navigation',
      execute: () => { appState.radioDrawerOpen = true; }
    },
    {
      type: 'nav',
      id: 'nav-copy-studio',
      label: 'Open Copywriting Studio',
      sublabel: 'Direct-response copywriting, hooks & editorial copy',
      icon: 'sparkles',
      badge: '⌘⇧C',
      category: 'Navigation',
      execute: () => appState.navigate('copy-studio')
    },

    // System
    {
      type: 'action',
      id: 'act-rescan',
      label: 'Rescan Markdown Vault',
      sublabel: 'Reload filesystem index across _Projects, _Journal, _Notes',
      icon: 'history',
      badge: 'Sync',
      category: 'System',
      execute: () => rescanVault()
    }
  ];

  function rescanVault() {
    appState.addToast('Rescanning workspace markdown vault...', 'info');
    projectStore.loadProjects();
    projectStore.loadDashboard();
  }

  function addQuickBujoTask(text: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      journalService.addEntry(today, text, 'task');
      appState.addToast(`Added task to Bullet Journal (${today}): "${text}"`, 'success');
    } catch (e: any) {
      appState.addToast(`Failed to add task: ${e.message}`, 'error');
    }
  }

  // Combined Search Results with Category Filtering (Navigate, Actions, Projects)
  const searchResults = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const rawQ = query.trim();

    // Quick BuJo Task Creator (when typing any text)
    const bujoItem = (rawQ && (activeFilter === 'all' || activeFilter === 'actions')) ? [{
      type: 'bujo' as const,
      id: 'bujo-quick-add',
      label: `Add to Today's BuJo: "${rawQ}"`,
      sublabel: `Append rapid log task • [ ] into _Journal/Daily/`,
      badge: '↵ Add Task',
      category: 'Bullet Journal Task Capture',
      execute: () => addQuickBujoTask(rawQ)
    }] : [];

    // Filter Projects
    const projects = (activeFilter === 'all' || activeFilter === 'projects')
      ? projectStore.projects.filter(p => {
          if (!q) return activeFilter === 'projects';
          const text = `${p.jobId || ''} ${p.title || ''} ${p.designer || ''} ${p.brand || ''} ${(p.tags || []).join(' ')} ${p.status || ''}`.toLowerCase();
          return text.includes(q);
        }).slice(0, 8).map(p => ({
          type: 'project' as const,
          id: p.id,
          jobId: p.jobId || p.id,
          title: p.title || 'Untitled Project',
          brand: p.brand || 'JOM',
          designer: p.designer || '0001D',
          status: p.status || 'in-progress',
          category: 'Project Vaults',
          badge: p.jobId || p.id,
          execute: () => appState.navigate('project-detail', { id: p.id })
        }))
      : [];

    // Filter Actions & Navigation
    const actions = STUDIO_ACTIONS.filter(a => {
      if (activeFilter === 'nav') return a.type === 'nav';
      if (activeFilter === 'actions') return a.type !== 'nav';
      if (activeFilter === 'projects') return false;

      if (!q) return true; // Show all by default when query is empty
      return a.label.toLowerCase().includes(q) ||
             (a.sublabel && a.sublabel.toLowerCase().includes(q)) ||
             a.category.toLowerCase().includes(q) ||
             (a.badge && a.badge.toLowerCase().includes(q));
    });

    // Merge in natural hierarchy
    if (rawQ) {
      return [...bujoItem, ...projects, ...actions];
    }
    return [...actions, ...projects];
  });

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
    activeFilter = 'all';
    if (onClose) onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Cycle filters
      const filters: Array<'all' | 'nav' | 'actions' | 'projects'> = ['all', 'nav', 'actions', 'projects'];
      const nextIdx = (filters.indexOf(activeFilter) + 1) % filters.length;
      activeFilter = filters[nextIdx];
      selectedIndex = 0;
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
  <div class="palette-backdrop" onclick={(e) => handleBackdropClick(e, closeModal)}>
    <div class="palette-modal" role="dialog" aria-modal="true" aria-label="Kanso Zen Launcher">
      
      <!-- Search Input Bar -->
      <div class="palette-search-header">
        <div class="search-icon-box">
          <Icon name="search" size={18} color="var(--kanso-accent)" />
        </div>
        <input 
          bind:this={inputRef}
          type="text" 
          class="palette-input" 
          placeholder="Type a command, project, or task (⌘1-6)..." 
          bind:value={query}
        />
        {#if query}
          <button class="clear-btn" onclick={() => query = ''} title="Clear query">
            <Icon name="close" size={14} />
          </button>
        {/if}
        <span class="esc-badge" onclick={closeModal}>ESC</span>
      </div>

      <!-- Category Filter Pills -->
      <div class="filter-pill-bar">
        <button
          class="filter-chip"
          class:active={activeFilter === 'all'}
          onclick={() => { activeFilter = 'all'; selectedIndex = 0; }}
        >
          All
        </button>
        <button
          class="filter-chip"
          class:active={activeFilter === 'nav'}
          onclick={() => { activeFilter = 'nav'; selectedIndex = 0; }}
        >
          Navigate
        </button>
        <button
          class="filter-chip"
          class:active={activeFilter === 'actions'}
          onclick={() => { activeFilter = 'actions'; selectedIndex = 0; }}
        >
          Actions
        </button>
        <button
          class="filter-chip"
          class:active={activeFilter === 'projects'}
          onclick={() => { activeFilter = 'projects'; selectedIndex = 0; }}
        >
          Projects
        </button>
      </div>

      <!-- Results Container -->
      <div class="palette-body">
        {#if searchResults.length === 0}
          <div class="palette-empty">
            <div class="empty-icon-wrap">
              <Icon name="search" size={32} color="var(--kanso-text-muted)" />
            </div>
            <p class="empty-title">No matching studio items for "{query}"</p>
            <span class="empty-hint">Try searching by client (<code>ACME</code>, <code>NEX</code>, <code>LUM</code>), color token, or shortcut (<code>⌘1</code>).</span>
          </div>
        {:else}
          <div class="results-list">
            {#each searchResults as item, index}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div 
                class="result-row"
                class:selected={selectedIndex === index}
                onclick={() => handleSelect(item)}
                onmouseenter={() => selectedIndex = index}
              >
                {#if item.type === 'bujo'}
                  <!-- Quick BuJo Task Creator -->
                  <div class="result-icon icon-bujo">
                    <Icon name="calendar" size={16} color="var(--kanso-accent)" />
                  </div>
                  <div class="result-info">
                    <div class="result-title-row">
                      <span class="item-title font-highlight">{item.label}</span>
                    </div>
                    <div class="result-sub">{item.sublabel}</div>
                  </div>
                  <span class="action-shortcut is-cta">
                    <span>{item.badge}</span>
                  </span>

                {:else if item.type === 'project'}
                  <!-- Project Vault Item -->
                  <div class="result-icon icon-project">
                    <Icon name="folder" size={16} />
                  </div>
                  <div class="result-info">
                    <div class="result-title-row">
                      <span class="badge-brand brand-{item.brand.toLowerCase()}">{item.brand}</span>
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
                    <span>Open Vault</span>
                    <Icon name="arrowRight" size={11} />
                  </span>



                {:else}
                  <!-- General / Nav / Timer / Radio Action -->
                  <div class="result-icon icon-action">
                    <Icon name={item.icon} size={16} />
                  </div>
                  <div class="result-info">
                    <div class="result-title-row">
                      <span class="item-title">{item.label}</span>
                    </div>
                    <div class="result-sub">{item.sublabel || item.category}</div>
                  </div>
                  <span class="action-shortcut">
                    {#if item.badge}
                      <span class="action-badge-pill">{item.badge}</span>
                    {/if}
                    <span>Execute</span>
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Raycast Bottom Status Bar -->
      <div class="palette-footer">
        <div class="footer-tip">
          <kbd>↑</kbd><kbd>↓</kbd> <span>Navigate</span>
        </div>
        <div class="footer-tip">
          <kbd>↵</kbd> <span>Select</span>
        </div>
        <div class="footer-tip">
          <kbd>Tab</kbd> <span>Filter</span>
        </div>
        <div class="footer-tip">
          <kbd>ESC</kbd> <span>Dismiss</span>
        </div>
        <div class="footer-sync">
          <span class="sync-dot"></span>
          <span>Kanso Zen Launcher</span>
        </div>
      </div>

    </div>
  </div>
{/if}

<style>
  /* Centered Backdrop */
  .palette-backdrop {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.78);
    backdrop-filter: blur(14px);
    display: flex;
    align-items: center; /* PERFECT VERTICAL CENTER */
    justify-content: center; /* PERFECT HORIZONTAL CENTER */
    padding: 24px;
    z-index: 2000;
    animation: backdropFade 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
  }

  @keyframes backdropFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Centered Modal Card */
  .palette-modal {
    width: 100%;
    max-width: 700px;
    max-height: 82vh;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 
      0 32px 80px -16px rgba(0, 0, 0, 0.85),
      0 0 0 1px rgba(56, 189, 248, 0.25);
    display: flex;
    flex-direction: column;
    animation: modalScaleUp 0.16s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes modalScaleUp {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }

  /* Search Header */
  .palette-search-header {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    background: var(--kanso-canvas);
    border-bottom: 1px solid var(--kanso-border);
    gap: 14px;
  }

  .search-icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .palette-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--kanso-text-primary);
    font-size: 16px;
    font-weight: 500;
  }

  .palette-input::placeholder {
    color: var(--kanso-text-muted);
    font-size: 14px;
  }

  .clear-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted);
    cursor: pointer;
    font-size: 14px;
    padding: 4px 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-btn:hover {
    color: var(--kanso-text-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  .esc-badge {
    font-size: 10.5px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    cursor: pointer;
    letter-spacing: 0.05em;
  }



  /* Category Filter Pills */
  .filter-pill-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid var(--kanso-border);
    overflow-x: auto;
  }

  .filter-chip {
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 20px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .filter-chip:hover {
    color: var(--kanso-text-primary);
    background: rgba(255, 255, 255, 0.06);
  }

  .filter-chip.active {
    background: var(--kanso-surface-hover);
    border-color: rgba(56, 189, 248, 0.35);
    color: var(--kanso-accent);
  }

  /* Body & Results */
  .palette-body {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    max-height: 460px;
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
    border-radius: 10px;
    background: transparent;
    cursor: pointer;
    transition: all 0.1s ease;
    border: 1px solid transparent;
  }

  .result-row:hover, .result-row.selected {
    background: var(--kanso-surface-hover);
    border-color: rgba(56, 189, 248, 0.3);
  }

  .result-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--kanso-border);
    flex-shrink: 0;
    color: var(--kanso-text-primary);
  }

  .result-icon.icon-bujo {
    background: rgba(56, 189, 248, 0.12);
    border-color: rgba(56, 189, 248, 0.3);
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
    font-size: 11px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--kanso-accent-text);
    letter-spacing: 0.05em;
  }

  .badge-brand.brand-acme { background: var(--kanso-accent); }
  .badge-brand.brand-nex  { background: var(--kanso-brand-nex, var(--kanso-accent)); }
  .badge-brand.brand-lum  { background: var(--kanso-success); }

  .job-id-tag {
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-accent);
    font-family: var(--kanso-font-mono);
  }

  .item-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--kanso-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-title.font-highlight {
    color: var(--kanso-accent);
  }

  .result-sub {
    font-size: 12.5px;
    color: var(--kanso-text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-pill {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .status-in-progress { background: rgba(56, 189, 248, 0.15); color: var(--kanso-accent); }
  .status-review { background: rgba(245, 158, 11, 0.15); color: var(--kanso-warning); }
  .status-done { background: rgba(16, 185, 129, 0.15); color: var(--kanso-success); }

  .action-shortcut {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.12s ease;
  }

  .result-row.selected .action-shortcut,
  .action-shortcut.is-cta {
    opacity: 1;
    color: var(--kanso-accent);
  }

  .action-badge-pill {
    font-size: 11px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
    font-family: var(--kanso-font-mono);
  }

  /* Empty State */
  .palette-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 44px 20px;
    text-align: center;
    color: var(--kanso-text-muted);
  }

  .empty-icon-wrap {
    margin-bottom: 12px;
    opacity: 0.4;
  }

  .empty-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--kanso-text-primary);
    margin: 0 0 6px;
  }

  .empty-hint {
    font-size: 12.5px;
    color: var(--kanso-text-muted);
  }

  .empty-hint code {
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 5px;
    border-radius: 4px;
    color: var(--kanso-accent);
  }

  /* Footer */
  .palette-footer {
    display: flex;
    align-items: center;
    padding: 10px 18px;
    background: var(--kanso-canvas);
    border-top: 1px solid var(--kanso-border);
    gap: 16px;
    font-size: 12px;
    color: var(--kanso-text-muted);
    flex-wrap: wrap;
  }

  .footer-tip {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .footer-tip kbd {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    font-family: inherit;
    color: var(--kanso-text-primary);
  }

  .footer-sync {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--kanso-success);
    font-weight: 600;
    font-size: 11.5px;
  }

  .sync-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--kanso-success);
    box-shadow: 0 0 6px var(--kanso-success);
  }

  /* E-Ink High Contrast Mode Overrides */
  :global([data-theme="eink"]) .palette-modal {
    background: var(--kanso-surface) !important;
    border: 2px solid var(--kanso-border) !important;
    box-shadow: none !important;
  }

  :global([data-theme="eink"]) .palette-search-header,
  :global([data-theme="eink"]) .filter-pill-bar,
  :global([data-theme="eink"]) .palette-footer {
    background: var(--kanso-surface) !important;
    border-color: var(--kanso-border) !important;
  }

  :global([data-theme="eink"]) .filter-chip {
    border: 1px solid var(--kanso-border) !important;
    color: var(--kanso-text-primary) !important;
    background: var(--kanso-surface) !important;
  }

  :global([data-theme="eink"]) .filter-chip.active {
    background: var(--kanso-text-primary) !important;
    color: var(--kanso-surface) !important;
  }

  :global([data-theme="eink"]) .footer-sync {
    color: var(--kanso-text-primary) !important;
  }

  :global([data-theme="eink"]) .sync-dot {
    background: var(--kanso-text-primary) !important;
    box-shadow: none !important;
  }
</style>
