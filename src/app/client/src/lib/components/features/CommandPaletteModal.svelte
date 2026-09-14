<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import type { ThemeName } from '$lib/types';
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
  let activeFilter = $state<'all' | 'themes' | 'actions' | 'swatches' | 'projects' | 'nav'>('all');
  let inputRef: HTMLInputElement | null = $state(null);

  // Canonical Studio Themes for Quick Switcher Strip & Palette
  const THEME_OPTIONS: Array<{
    id: ThemeName;
    name: string;
    label: string;
    sublabel: string;
    swatchBg: string;
    swatchBorder: string;
    swatchAccent: string;
  }> = [
    {
      id: 'dark',
      name: 'Obsidian',
      label: 'Obsidian Dark',
      sublabel: 'Vorxs Olive Obsidian',
      swatchBg: '#151813',
      swatchBorder: '#272F22',
      swatchAccent: '#DE694B'
    },
    {
      id: 'light',
      name: 'Stone',
      label: 'Stone Paper',
      sublabel: 'Vorxs Stone Paper',
      swatchBg: '#ECE8DF',
      swatchBorder: '#D8D3C5',
      swatchAccent: '#DE694B'
    },
    {
      id: 'oceanic',
      name: 'Kai-Zen',
      label: 'Kai-Zen Blue',
      sublabel: 'Oceanic Cerulean',
      swatchBg: '#064169',
      swatchBorder: '#0F5485',
      swatchAccent: '#21A8C3'
    },
    {
      id: 'oceanic-light',
      name: 'Marina',
      label: 'Marina Light',
      sublabel: 'Kai-Zen Daylight',
      swatchBg: '#F0F4F8',
      swatchBorder: '#CBD5E1',
      swatchAccent: '#21A8C3'
    },
    {
      id: 'eink',
      name: 'E-Ink',
      label: 'Paperlike E-Ink',
      sublabel: 'High-Contrast Monochrome',
      swatchBg: '#FFFFFF',
      swatchBorder: '#000000',
      swatchAccent: '#000000'
    },
    {
      id: 'neumorphic',
      name: 'Soft Clay',
      label: 'Neumorphic Clay',
      sublabel: 'Tactile Soft UI Light',
      swatchBg: '#E0E5EC',
      swatchBorder: '#CBD5E1',
      swatchAccent: '#3B82F6'
    },
    {
      id: 'neumorphic-dark',
      name: 'Soft Obsidian',
      label: 'Neumorphic Obsidian',
      sublabel: 'Tactile Soft UI Dark',
      swatchBg: '#1E2026',
      swatchBorder: '#333742',
      swatchAccent: '#38BDF8'
    }
  ];

  // Brand Palette Swatches for 1-Click Copy (Canonical Brand Tokens + Kanso Tokens)
  const BRAND_PALETTES = [
    { type: 'token' as const, name: 'Acme Ocean Blue', code: '#0284C7', brand: 'ACME', description: 'Acme Corp Brand Primary' },
    { type: 'token' as const, name: 'Acme Deep Sky', code: '#0369A1', brand: 'ACME', description: 'Acme Corp Deep Sky' },
    { type: 'token' as const, name: 'Acme Electric Cyan', code: '#38BDF8', brand: 'ACME', description: 'Acme Corp Active Accent' },
    { type: 'token' as const, name: 'Nexus Purple Haze', code: '#8B5CF6', brand: 'NEX', description: 'Nexus Studio Brand Primary' },
    { type: 'token' as const, name: 'Nexus Deep Violet', code: '#6D28D9', brand: 'NEX', description: 'Nexus Studio Deep Violet' },
    { type: 'token' as const, name: 'Nexus Electric Glow', code: '#A855F7', brand: 'NEX', description: 'Nexus Studio Vivid Accent' },
    { type: 'token' as const, name: 'Lumina Emerald Mint', code: '#10B981', brand: 'LUM', description: 'Lumina Labs Brand Primary' },
    { type: 'token' as const, name: 'Lumina Forest Deep', code: '#047857', brand: 'LUM', description: 'Lumina Labs Deep Forest' },
    { type: 'token' as const, name: 'Lumina Amber Gold', code: '#F59E0B', brand: 'LUM', description: 'Lumina Labs Warm Accent' },
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
      id: 'timer-acme',
      label: 'Start Billable Timer: Acme Corp',
      sublabel: '$150/hr · Enterprise cloud & creative operations',
      icon: 'history',
      badge: '$150/h',
      category: 'Billable Timer',
      execute: () => {
        timerStore.setClient('ACME', 150);
        timerStore.start();
        appState.addToast('Timer started: Acme Corp @ $150/hr', 'success');
      }
    },
    {
      type: 'timer',
      id: 'timer-nex',
      label: 'Start Billable Timer: Nexus Studio',
      sublabel: '£140/hr · Motion design & interactive 3D visual campaigns',
      icon: 'history',
      badge: '£140/h',
      category: 'Billable Timer',
      execute: () => {
        timerStore.setClient('NEX', 140);
        timerStore.start();
        appState.addToast('Timer started: Nexus Studio @ £140/hr', 'success');
      }
    },
    {
      type: 'timer',
      id: 'timer-lum',
      label: 'Start Billable Timer: Lumina Labs',
      sublabel: 'S$160/hr · Biotech intelligence & generative research UI',
      icon: 'history',
      badge: 'S$160/h',
      category: 'Billable Timer',
      execute: () => {
        timerStore.setClient('LUM', 160);
        timerStore.start();
        appState.addToast('Timer started: Lumina Labs @ S$160/hr', 'success');
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

    // Studio Theme Switching (Kai-Zen / Dark / Light / E-Ink)
    {
      type: 'action',
      id: 'theme-oceanic',
      label: 'Switch Theme: Kai-Zen (海禅 — Oceanic Cerulean)',
      sublabel: 'Deep Ocean #064169 with vibrant Cerulean #21A8C3 & Poppins typography',
      icon: 'sparkles',
      badge: 'Theme',
      category: 'Themes',
      execute: () => {
        appState.setTheme('oceanic');
        appState.addToast('Switched to Kai-Zen (海禅 Oceanic Zen)', 'success');
      }
    },
    {
      type: 'action',
      id: 'theme-oceanic-light',
      label: 'Switch Theme: Kai-Zen Daylight (Marina White)',
      sublabel: 'Light blue-grey #F0F4F8 with Cerulean #21A8C3 & Ocean Navy titles',
      icon: 'sparkles',
      badge: 'Theme',
      category: 'Themes',
      execute: () => {
        appState.setTheme('oceanic-light');
        appState.addToast('Switched to Kai-Zen Daylight', 'success');
      }
    },
    {
      type: 'action',
      id: 'theme-dark',
      label: 'Switch Theme: Vorxs Olive Obsidian (Dark)',
      sublabel: 'Organic olive obsidian canvas with tactical terracotta pops',
      icon: 'colorPalette',
      badge: 'Theme',
      category: 'Themes',
      execute: () => {
        appState.setTheme('dark');
        appState.addToast('Switched to Vorxs Dark Mode', 'success');
      }
    },
    {
      type: 'action',
      id: 'theme-light',
      label: 'Switch Theme: Vorxs Stone Paper (Light)',
      sublabel: 'Scandinavian raw stone paper canvas with deep charcoal ink',
      icon: 'colorPalette',
      badge: 'Theme',
      category: 'Themes',
      execute: () => {
        appState.setTheme('light');
        appState.addToast('Switched to Vorxs Light Mode', 'success');
      }
    },
    {
      type: 'action',
      id: 'theme-eink',
      label: 'Switch Theme: Paperlike E-Ink (ampresent High Contrast)',
      sublabel: 'Pure white #FFFFFF canvas, pure #000000 text, zero color jitter for E-Ink monitors',
      icon: 'colorPalette',
      badge: 'Theme',
      category: 'Themes',
      execute: () => {
        appState.setTheme('eink');
        appState.addToast('Switched to Paperlike E-Ink Mode', 'success');
      }
    },
    {
      type: 'action',
      id: 'theme-neumorphic',
      label: 'Switch Theme: Neumorphic Clay (Soft UI Light)',
      sublabel: 'Tactile extruded surfaces in soft alabaster clay with electric azure CTAs',
      icon: 'colorPalette',
      badge: 'Theme',
      category: 'Themes',
      execute: () => {
        appState.setTheme('neumorphic');
        appState.addToast('Switched to Neumorphic Clay Mode', 'success');
      }
    },
    {
      type: 'action',
      id: 'theme-neumorphic-dark',
      label: 'Switch Theme: Neumorphic Obsidian (Soft UI Dark)',
      sublabel: 'Deep charcoal slate with ambient extruded shadows and electric sky glints',
      icon: 'colorPalette',
      badge: 'Theme',
      category: 'Themes',
      execute: () => {
        appState.setTheme('neumorphic-dark');
        appState.addToast('Switched to Neumorphic Obsidian Mode', 'success');
      }
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
      label: 'Open Project Manager',
      sublabel: 'Coordinate creative campaigns, Kanban pipelines & Gantt schedules',
      icon: 'folder',
      badge: '⌘2',
      category: 'Navigation',
      execute: () => appState.navigate('projects')
    },
    {
      type: 'nav',
      id: 'nav-3-deliverables',
      label: 'Open Review Queue',
      sublabel: 'Inspect, approve, and manage creative deliverables',
      icon: 'sparkles',
      badge: '⌘3',
      category: 'Navigation',
      execute: () => appState.navigate('deliverables')
    },
    {
      type: 'nav',
      id: 'nav-4-journal',
      label: 'Open Bullet Journal (BuJo Rapid Log)',
      sublabel: 'Daily notes, task rollover & monthly reviews',
      icon: 'calendar',
      badge: '⌘4',
      category: 'Navigation',
      execute: () => appState.navigate('journal')
    },
    {
      type: 'nav',
      id: 'nav-5-clients',
      label: 'Open Clients & Brand Hub',
      sublabel: 'Client profiles, brand palettes & billing rates',
      icon: 'users',
      badge: '⌘5',
      category: 'Navigation',
      execute: () => appState.navigate('clients')
    },
    {
      type: 'nav',
      id: 'nav-6-invoices',
      label: 'Open Quotes & Invoices',
      sublabel: 'Plain Markdown invoices, proposals & RM billing',
      icon: 'document',
      badge: '⌘6',
      category: 'Navigation',
      execute: () => appState.navigate('invoices')
    },
    {
      type: 'nav',
      id: 'nav-7-zettel',
      label: 'Open Atelier Notes',
      sublabel: 'Second brain, fleeting notes & universal #tasks',
      icon: 'document',
      badge: '⌘7',
      category: 'Navigation',
      execute: () => appState.navigate('zettel')
    },
    {
      type: 'nav',
      id: 'nav-8-radio',
      label: 'Open Focus Radio',
      sublabel: 'Hi-Fi retro mechanical tape player & Pomodoro',
      icon: 'colorPalette',
      badge: '⌘8',
      category: 'Navigation',
      execute: () => appState.navigate('radio')
    },
    {
      type: 'nav',
      id: 'nav-9-settings',
      label: 'Open Studio Settings',
      sublabel: 'Vault configuration, lighting themes & preferences',
      icon: 'settings',
      badge: '⌘9',
      category: 'Navigation',
      execute: () => appState.navigate('settings')
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

    // Filter Actions, Themes & Navigation
    const actions = STUDIO_ACTIONS.filter(a => {
      if (activeFilter === 'themes') return a.category === 'Themes';
      if (activeFilter === 'nav') return a.type === 'nav';
      if (activeFilter === 'actions') return a.type !== 'nav' && a.category !== 'Themes';
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
      const filters: Array<'all' | 'themes' | 'actions' | 'swatches' | 'projects' | 'nav'> = ['all', 'themes', 'actions', 'swatches', 'projects', 'nav'];
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
    <div class="palette-modal" role="dialog" aria-modal="true" aria-label="Kanso Zen Launcher">
      
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

      <!-- Quick Theme Switcher Strip -->
      <div class="quick-theme-strip" role="radiogroup" aria-label="Quick Theme Switcher">
        <span class="quick-theme-label">Theme:</span>
        <div class="quick-theme-chips">
          {#each THEME_OPTIONS as t}
            <button
              type="button"
              class="quick-theme-btn"
              class:active={appState.theme === t.id}
              role="radio"
              aria-checked={appState.theme === t.id}
              title="{t.label} ({t.sublabel})"
              onclick={() => {
                appState.setTheme(t.id);
                appState.addToast(`Switched to ${t.label}`, 'success');
              }}
            >
              <span 
                class="theme-preview-dot" 
                style="background: {t.swatchBg}; border-color: {t.swatchBorder};"
              >
                <span class="theme-dot-accent" style="background: {t.swatchAccent};"></span>
              </span>
              <span class="theme-name">{t.name}</span>
              {#if appState.theme === t.id}
                <span class="active-check">✓</span>
              {/if}
            </button>
          {/each}
        </div>
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
          class:active={activeFilter === 'themes'}
          onclick={() => { activeFilter = 'themes'; selectedIndex = 0; }}
        >
          🎭 Themes
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

  /* Quick Theme Switcher Strip */
  .quick-theme-strip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 18px;
    background: var(--kanso-canvas, #09090B);
    border-bottom: 1px solid var(--kanso-border, #27272A);
    font-size: 11.5px;
    overflow-x: auto;
  }

  .quick-theme-label {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--kanso-text-muted, #71717A);
    flex-shrink: 0;
  }

  .quick-theme-chips {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: nowrap;
  }

  .quick-theme-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 9px;
    border-radius: 6px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
    white-space: nowrap;
  }

  .quick-theme-btn:hover {
    background: var(--kanso-surface-hover, #27272A);
    border-color: rgba(56, 189, 248, 0.35);
  }

  .quick-theme-btn.active {
    background: var(--kanso-surface-hover, #27272A);
    border-color: var(--kanso-accent, #38BDF8);
    box-shadow: 0 0 0 1px var(--kanso-accent, #38BDF8);
  }

  .theme-preview-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .theme-dot-accent {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }

  .theme-name {
    font-size: 11px;
  }

  .active-check {
    font-size: 10px;
    font-weight: 800;
    color: var(--kanso-accent, #38BDF8);
    line-height: 1;
  }

  /* Category Filter Pills */
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

  /* E-Ink High Contrast Mode Overrides */
  :global([data-theme="eink"]) .palette-modal {
    background: #FFFFFF !important;
    border: 2px solid #000000 !important;
    box-shadow: none !important;
  }

  :global([data-theme="eink"]) .palette-search-header,
  :global([data-theme="eink"]) .quick-theme-strip,
  :global([data-theme="eink"]) .filter-pill-bar,
  :global([data-theme="eink"]) .palette-footer {
    background: #FFFFFF !important;
    border-color: #000000 !important;
  }

  :global([data-theme="eink"]) .quick-theme-btn {
    background: #FFFFFF !important;
    border: 1px solid #000000 !important;
    color: #000000 !important;
  }

  :global([data-theme="eink"]) .quick-theme-btn.active {
    background: #000000 !important;
    color: #FFFFFF !important;
    border-color: #000000 !important;
  }

  :global([data-theme="eink"]) .quick-theme-btn.active .active-check {
    color: #FFFFFF !important;
  }

  :global([data-theme="eink"]) .quick-theme-btn.active .theme-name {
    color: #FFFFFF !important;
  }

  :global([data-theme="eink"]) .filter-chip {
    border: 1px solid #000000 !important;
    color: #000000 !important;
    background: #FFFFFF !important;
  }

  :global([data-theme="eink"]) .filter-chip.active {
    background: #000000 !important;
    color: #FFFFFF !important;
  }

  :global([data-theme="eink"]) .footer-sync {
    color: #000000 !important;
  }

  :global([data-theme="eink"]) .sync-dot {
    background: #000000 !important;
    box-shadow: none !important;
  }
</style>
