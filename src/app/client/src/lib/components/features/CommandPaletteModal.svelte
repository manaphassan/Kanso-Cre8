<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import { journalService } from '$lib/services/journalService';
  import { radioService, ALL_CASSETTE_STATIONS } from '$lib/services/radioService.svelte';
  import { clientService } from '$lib/services/clientService';
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
  let activeFilter = $state<'all' | 'actions' | 'swatches' | 'projects' | 'nav'>('all');
  let inputRef: HTMLInputElement | null = $state(null);

  // Brand Palette Swatches for 1-Click Copy (Malaysian Demo + Kanso Tokens)
  const BRAND_PALETTES = [
    { type: 'token' as const, name: 'JomParking Orange', code: '#FF6600', brand: 'JOM', description: 'JomParking™ Brand Primary' },
    { type: 'token' as const, name: 'JomParking Deep Navy', code: '#0A192F', brand: 'JOM', description: 'JomParking™ Deep Charcoal' },
    { type: 'token' as const, name: 'JomParking Bay Cyan', code: '#00C2FF', brand: 'JOM', description: 'JomParking™ Smart Bay Accent' },
    { type: 'token' as const, name: 'Govicle Royal Blue', code: '#1E40AF', brand: 'GOV', description: 'Govicle® Enterprise Telematics' },
    { type: 'token' as const, name: 'Govicle Tech Teal', code: '#0D9488', brand: 'GOV', description: 'Govicle® EV Mobility Fleet' },
    { type: 'token' as const, name: 'Govicle EV Emerald', code: '#10B981', brand: 'GOV', description: 'Govicle® Green Eco Fleet' },
    { type: 'token' as const, name: 'SuamiSihat Forest', code: '#059669', brand: 'SS', description: 'SuamiSihat™ Healthcare Primary' },
    { type: 'token' as const, name: 'SuamiSihat Botanical', code: '#047857', brand: 'SS', description: 'SuamiSihat™ Botanical Deep' },
    { type: 'token' as const, name: 'SuamiSihat Vitality Gold', code: '#F59E0B', brand: 'SS', description: 'SuamiSihat™ Wellness Accent' },
    { type: 'token' as const, name: 'Kanso Electric Sky', code: '#38BDF8', brand: 'KANSO', description: 'Studio CTA & Active Focus' },
    { type: 'token' as const, name: 'Kanso Studio Obsidian', code: '#09090B', brand: 'KANSO', description: 'Pure Zen Canvas Dark' },
    { type: 'token' as const, name: 'Kanso Surface Panel', code: '#18181B', brand: 'KANSO', description: 'Studio Card Surface' },
  ];

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
      id: 'timer-jom',
      label: 'Start Billable Timer: JomParking™',
      sublabel: 'RM 180/hr · Smart city parking & QR merchant UI',
      icon: 'history',
      badge: 'RM 180/h',
      category: 'Billable Chronometer',
      execute: () => {
        timerStore.setClient('JOM', 180);
        timerStore.start();
        appState.addToast('Timer started: JomParking™ @ RM 180/hr', 'success');
      }
    },
    {
      type: 'timer',
      id: 'timer-gov',
      label: 'Start Billable Timer: Govicle®',
      sublabel: 'RM 220/hr · Enterprise fleet telematics & EV charging',
      icon: 'history',
      badge: 'RM 220/h',
      category: 'Billable Chronometer',
      execute: () => {
        timerStore.setClient('GOV', 220);
        timerStore.start();
        appState.addToast('Timer started: Govicle® @ RM 220/hr', 'success');
      }
    },
    {
      type: 'timer',
      id: 'timer-ss',
      label: 'Start Billable Timer: SuamiSihat™',
      sublabel: 'RM 160/hr · Men\'s holistic health portal UI',
      icon: 'history',
      badge: 'RM 160/h',
      category: 'Billable Chronometer',
      execute: () => {
        timerStore.setClient('SS', 160);
        timerStore.start();
        appState.addToast('Timer started: SuamiSihat™ @ RM 160/hr', 'success');
      }
    },
    {
      type: 'timer',
      id: 'timer-stop',
      label: 'Pause / Stop Active Timer',
      sublabel: 'Save session & append to draft invoice',
      icon: 'history',
      badge: 'Stop',
      category: 'Billable Chronometer',
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
      label: 'Create New Invoice in RM (Ringgit Malaysia)',
      sublabel: 'Offline-first Markdown invoice in _Finance/Invoices/',
      icon: 'document',
      badge: 'RM Draft',
      category: 'Quotes & Invoices',
      execute: () => appState.navigate('invoices')
    },
    {
      type: 'action',
      id: 'act-quote-new',
      label: 'Create New Quote & Proposal in RM',
      sublabel: 'Formal design quotation in _Finance/Quotes/',
      icon: 'document',
      badge: 'Proposal',
      category: 'Quotes & Invoices',
      execute: () => appState.navigate('invoices')
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
        const station = ALL_CASSETTE_STATIONS.find(s => s.id === 'chillhop');
        if (station) radioService.tuneStation(station);
        appState.addToast('Tuned to Chillhop Cafe (98.4 FM)', 'info');
      }
    },
    {
      type: 'radio',
      id: 'radio-nightwave',
      label: 'Tune Focus Radio: Nightwave Plaza',
      sublabel: '101.2 FM · Vaporwave & late-night synthwave',
      icon: 'colorPalette',
      badge: '101.2 FM',
      category: 'Focus Radio',
      execute: () => {
        const station = ALL_CASSETTE_STATIONS.find(s => s.id === 'nightwave');
        if (station) radioService.tuneStation(station);
        appState.addToast('Tuned to Nightwave Plaza (101.2 FM)', 'info');
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

    // Strict Ascending Navigation (⌘1 to ⌘9)
    {
      type: 'nav',
      id: 'nav-1-dashboard',
      label: 'Go to Studio Deck',
      sublabel: 'Executive dashboard, daily pulse & active cashflow',
      icon: 'dashboard',
      badge: '⌘1',
      category: 'Navigation',
      execute: () => appState.navigate('dashboard')
    },
    {
      type: 'nav',
      id: 'nav-2-projects',
      label: 'Open Project Vaults',
      sublabel: 'Standardized 5-folder project vaults & proofs',
      icon: 'folder',
      badge: '⌘2',
      category: 'Navigation',
      execute: () => appState.navigate('projects')
    },
    {
      type: 'nav',
      id: 'nav-3-journal',
      label: 'Open Bullet Journal (BuJo Rapid Log)',
      sublabel: 'Daily notes, task rollover & monthly reviews',
      icon: 'calendar',
      badge: '⌘3',
      category: 'Navigation',
      execute: () => appState.navigate('journal')
    },
    {
      type: 'nav',
      id: 'nav-4-clients',
      label: 'Open Clients & Brands Hub',
      sublabel: 'JomParking, Govicle, SuamiSihat & brand palettes',
      icon: 'users',
      badge: '⌘4',
      category: 'Navigation',
      execute: () => appState.navigate('clients')
    },
    {
      type: 'nav',
      id: 'nav-5-invoices',
      label: 'Open Quotes & Invoices Studio',
      sublabel: 'Plain Markdown invoices, proposals & RM billing',
      icon: 'document',
      badge: '⌘5',
      category: 'Navigation',
      execute: () => appState.navigate('invoices')
    },
    {
      type: 'nav',
      id: 'nav-6-zettel',
      label: 'Open Atelier Notes & Knowledge',
      sublabel: 'Second brain, fleeting notes & universal #tasks',
      icon: 'document',
      badge: '⌘6',
      category: 'Navigation',
      execute: () => appState.navigate('zettel')
    },
    {
      type: 'nav',
      id: 'nav-7-copy',
      label: 'Open Copywriting Studio',
      sublabel: 'Direct-response copywriting, hooks & editorial copy',
      icon: 'sparkles',
      badge: '⌘7',
      category: 'Navigation',
      execute: () => appState.navigate('copy-studio')
    },
    {
      type: 'nav',
      id: 'nav-8-radio',
      label: 'Open Focus Radio & Cassette Deck',
      sublabel: 'Hi-Fi retro mechanical tape player & Pomodoro',
      icon: 'colorPalette',
      badge: '⌘8',
      category: 'Navigation',
      execute: () => appState.navigate('radio')
    },
    {
      type: 'nav',
      id: 'nav-9-settings',
      label: 'Open Studio Settings & Storage',
      sublabel: 'Vault configuration, currency & sound effects',
      icon: 'settings',
      badge: '⌘9',
      category: 'Navigation',
      execute: () => appState.navigate('settings')
    },

    // Themes & System
    {
      type: 'action',
      id: 'theme-dark',
      label: 'Switch to Dark Theme (Studio Obsidian)',
      sublabel: 'Linear dark palette #09090B for deep night work',
      icon: 'colorPalette',
      badge: 'Dark',
      category: 'Theme',
      execute: () => setAppTheme('dark')
    },
    {
      type: 'action',
      id: 'theme-light',
      label: 'Switch to Light Theme (Atelier Paper)',
      sublabel: 'Clean daylight paper #F8FAFC for morning clarity',
      icon: 'colorPalette',
      badge: 'Light',
      category: 'Theme',
      execute: () => setAppTheme('light')
    },
    {
      type: 'action',
      id: 'theme-eink',
      label: 'Switch to E-Ink Theme (Zen Monochrome)',
      sublabel: 'High-contrast typography for distraction-free craft',
      icon: 'colorPalette',
      badge: 'E-Ink',
      category: 'Theme',
      execute: () => setAppTheme('eink')
    },
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

  function setAppTheme(theme: 'dark' | 'light' | 'eink') {
    appState.setTheme(theme);
    const names = { dark: 'Studio Obsidian (Dark)', light: 'Atelier Paper (Light)', eink: 'Zen Monochrome (E-Ink)' };
    appState.addToast(`Theme set to ${names[theme]}`, 'info');
  }

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

  async function copyToken(code: string, name: string) {
    try {
      await navigator.clipboard.writeText(code);
      appState.addToast(`Copied ${code} (${name}) to clipboard`, 'success');
    } catch (err) {
      appState.addToast(`Code: ${code}`, 'info');
    }
  }

  // Combined Search Results with Raycast Category Filtering
  const searchResults = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const rawQ = query.trim();

    // Quick BuJo Task Creator (when typing any text)
    const bujoItem = rawQ ? [{
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
        }).slice(0, 6).map(p => ({
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

    // Filter Tokens & Brand Colors
    const swatches = (activeFilter === 'all' || activeFilter === 'swatches')
      ? BRAND_PALETTES.filter(t => {
          if (!q) return activeFilter === 'swatches';
          return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.brand.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
        }).slice(0, 6).map(t => ({
          ...t,
          category: 'Brand Swatches',
          badge: t.code,
          execute: () => copyToken(t.code, t.name)
        }))
      : [];

    // Filter Actions & Navigation
    const actions = STUDIO_ACTIONS.filter(a => {
      if (activeFilter === 'nav') return a.type === 'nav';
      if (activeFilter === 'actions') return a.type !== 'nav';
      if (activeFilter === 'swatches' || activeFilter === 'projects') return false;

      if (!q) return true; // Show all by default when query is empty
      return a.label.toLowerCase().includes(q) ||
             (a.sublabel && a.sublabel.toLowerCase().includes(q)) ||
             a.category.toLowerCase().includes(q) ||
             (a.badge && a.badge.toLowerCase().includes(q));
    });

    // Merge in natural Raycast hierarchy
    if (rawQ) {
      return [...bujoItem, ...projects, ...swatches, ...actions];
    }
    return [...swatches, ...actions, ...projects];
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
      const filters: Array<'all' | 'actions' | 'swatches' | 'projects' | 'nav'> = ['all', 'actions', 'swatches', 'projects', 'nav'];
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
  <div class="palette-backdrop" onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="palette-modal" role="dialog" aria-modal="true" aria-label="Command Palette">
      
      <!-- Search Input Bar -->
      <div class="palette-search-header">
        <div class="search-icon-box">
          <FluentIcons name="search" size={18} color="var(--kanso-accent, #38BDF8)" />
        </div>
        <input 
          bind:this={inputRef}
          type="text" 
          class="palette-input" 
          placeholder="Type a task, color (#FF6600), project, or command (⌘1-9)..." 
          bind:value={query}
        />
        {#if query}
          <button class="clear-btn" onclick={() => query = ''} title="Clear query">
            <FluentIcons name="close" size={14} />
          </button>
        {/if}
        <span class="esc-badge" onclick={closeModal}>ESC</span>
      </div>

      <!-- Raycast Category Filter Pills -->
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
          class:active={activeFilter === 'actions'}
          onclick={() => { activeFilter = 'actions'; selectedIndex = 0; }}
        >
          ⚡ Actions
        </button>
        <button
          class="filter-chip"
          class:active={activeFilter === 'swatches'}
          onclick={() => { activeFilter = 'swatches'; selectedIndex = 0; }}
        >
          🎨 Swatches
        </button>
        <button
          class="filter-chip"
          class:active={activeFilter === 'projects'}
          onclick={() => { activeFilter = 'projects'; selectedIndex = 0; }}
        >
          📁 Projects
        </button>
        <button
          class="filter-chip"
          class:active={activeFilter === 'nav'}
          onclick={() => { activeFilter = 'nav'; selectedIndex = 0; }}
        >
          🧭 Nav (⌘1-9)
        </button>
      </div>

      <!-- Results Container -->
      <div class="palette-body">
        {#if searchResults.length === 0}
          <div class="palette-empty">
            <div class="empty-icon-wrap">
              <FluentIcons name="search" size={32} color="var(--kanso-text-muted)" />
            </div>
            <p class="empty-title">No matching studio items for "{query}"</p>
            <span class="empty-hint">Try searching by client (<code>JOM</code>, <code>GOV</code>, <code>SS</code>), hex (<code>#FF6600</code>), or shortcut (<code>⌘1</code>).</span>
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
                    <FluentIcons name="calendar" size={16} color="var(--kanso-accent, #38BDF8)" />
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
                    <FluentIcons name="folder" size={16} />
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
                    <FluentIcons name="arrowRight" size={11} />
                  </span>

                {:else if item.type === 'token'}
                  <!-- Brand Color Swatch 1-Click Copy -->
                  <div class="color-swatch-box" style="background: {item.code};"></div>
                  <div class="result-info">
                    <div class="result-title-row">
                      <span class="item-title">{item.name}</span>
                      <code class="hex-badge">{item.code}</code>
                    </div>
                    <div class="result-sub">{item.description}</div>
                  </div>
                  <span class="action-shortcut">
                    <span>Copy HEX</span>
                    <FluentIcons name="copy" size={11} />
                  </span>

                {:else}
                  <!-- General / Nav / Timer / Radio Action -->
                  <div class="result-icon icon-action">
                    <FluentIcons name={item.icon} size={16} />
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
          <span>Kanso Zen Raycast Deck</span>
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
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
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
    background: var(--kanso-canvas, #09090B);
    border-bottom: 1px solid var(--kanso-border, #27272A);
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
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 16px;
    font-weight: 500;
  }

  .palette-input::placeholder {
    color: var(--kanso-text-muted, #71717A);
    font-size: 14px;
  }

  .clear-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted, #71717A);
    cursor: pointer;
    font-size: 14px;
    padding: 4px 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-btn:hover {
    color: var(--kanso-text-primary, #F4F4F5);
    background: rgba(255, 255, 255, 0.08);
  }

  .esc-badge {
    font-size: 10.5px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-muted, #71717A);
    cursor: pointer;
    letter-spacing: 0.05em;
  }

  /* Raycast Filter Pills */
  .filter-pill-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid var(--kanso-border, #27272A);
    overflow-x: auto;
  }

  .filter-chip {
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 20px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--kanso-text-muted, #71717A);
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .filter-chip:hover {
    color: var(--kanso-text-primary, #F4F4F5);
    background: rgba(255, 255, 255, 0.06);
  }

  .filter-chip.active {
    background: var(--kanso-surface-hover, #27272A);
    border-color: rgba(56, 189, 248, 0.35);
    color: var(--kanso-accent, #38BDF8);
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
    background: var(--kanso-surface-hover, #27272A);
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
    border: 1px solid var(--kanso-border, #27272A);
    flex-shrink: 0;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .result-icon.icon-bujo {
    background: rgba(56, 189, 248, 0.12);
    border-color: rgba(56, 189, 248, 0.3);
  }

  .color-swatch-box {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
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
    color: #FFFFFF;
    letter-spacing: 0.05em;
  }

  .badge-brand.brand-jom { background: #FF6600; }
  .badge-brand.brand-gov { background: #1E40AF; }
  .badge-brand.brand-ss  { background: #059669; }

  .job-id-tag {
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-accent, #38BDF8);
    font-family: var(--font-mono, monospace);
  }

  .item-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--kanso-text-primary, #F4F4F5);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-title.font-highlight {
    color: var(--kanso-accent, #38BDF8);
  }

  .hex-badge {
    font-size: 12px;
    font-weight: 700;
    padding: 2px 6px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    color: var(--kanso-accent, #38BDF8);
    font-family: var(--font-mono, monospace);
  }

  .result-sub {
    font-size: 12.5px;
    color: var(--kanso-text-muted, #71717A);
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

  .status-in-progress { background: rgba(56, 189, 248, 0.15); color: #38BDF8; }
  .status-review { background: rgba(245, 158, 11, 0.15); color: #FBBF24; }
  .status-done { background: rgba(16, 185, 129, 0.15); color: #34D399; }

  .action-shortcut {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-muted, #71717A);
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.12s ease;
  }

  .result-row.selected .action-shortcut,
  .action-shortcut.is-cta {
    opacity: 1;
    color: var(--kanso-accent, #38BDF8);
  }

  .action-badge-pill {
    font-size: 11px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    font-family: var(--font-mono, monospace);
  }

  /* Empty State */
  .palette-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 44px 20px;
    text-align: center;
    color: var(--kanso-text-muted, #71717A);
  }

  .empty-icon-wrap {
    margin-bottom: 12px;
    opacity: 0.4;
  }

  .empty-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0 0 6px;
  }

  .empty-hint {
    font-size: 12.5px;
    color: var(--kanso-text-muted, #71717A);
  }

  .empty-hint code {
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 5px;
    border-radius: 4px;
    color: var(--kanso-accent, #38BDF8);
  }

  /* Footer */
  .palette-footer {
    display: flex;
    align-items: center;
    padding: 10px 18px;
    background: var(--kanso-canvas, #09090B);
    border-top: 1px solid var(--kanso-border, #27272A);
    gap: 16px;
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
    flex-wrap: wrap;
  }

  .footer-tip {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .footer-tip kbd {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    font-family: inherit;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .footer-sync {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--kanso-success, #10B981);
    font-weight: 600;
    font-size: 11.5px;
  }

  .sync-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--kanso-success, #10B981);
    box-shadow: 0 0 6px var(--kanso-success, #10B981);
  }
</style>
