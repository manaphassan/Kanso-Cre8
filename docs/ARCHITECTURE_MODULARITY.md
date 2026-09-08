# Kanso Cre8 — Modular Architecture Specification

> **Architectural Paradigm**: 4-Tier Decoupled System  
> **Target**: Offline-First Creative Operations & Knowledge Workstation  
> **Core Principle**: High Cohesion, Loose Coupling, Zero Database Lock-In

---

## 🏛️ Executive Summary: Is Kanso Cre8 Modular by Design?

**Yes, fundamentally.** Kanso Cre8 is architected so that each layer functions as an independent, replaceable subsystem. Changes in one layer do not cause cascading breaking changes in other layers:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. VAULT STORAGE LAYER (Pure Markdown-as-Database)              │
│    _Clients/       _Finance/       _Zettelkasten/    2026/      │
│    Plain directories, UTF-8 Markdown, YAML Frontmatter, Media   │
├─────────────────────────────────────────────────────────────────┤
│ 2. DOMAIN SERVICES LAYER (Single-Responsibility Engines)        │
│    clientService   financeService   zettelService   radioService│
├─────────────────────────────────────────────────────────────────┤
│ 3. PLUGGABLE VIEW LAYER (Autonomous Svelte 5 Views)             │
│    ClientsView    InvoiceStudio    ZettelView       RadioView   │
│    ├─ KanbanView  ├─ Lightbox      ├─ HookDrawer    └─ Deck     │
├─────────────────────────────────────────────────────────────────┤
│ 4. ATOMIC DESIGN SYSTEM LAYER (Linear / Geist Lego Primitives)  │
│    FluentButton   FluentCard       FluentDialog     Tokens CSS  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Layer 1: Vault Storage Layer (Pure Markdown-as-Database)

### Philosophy: Zero Binary Lock-In
Unlike conventional creative management software that locks project metadata into an opaque SQLite or PostgreSQL database, **every domain in Kanso Cre8 lives in its own isolated filesystem container**:

1. **`_Clients/`**: Client dossiers (`client.md`), color swatches, contact information. Can be browsed and edited without the application running.
2. **`_Finance/`**: Independent quotes and invoices (`INV-2026-xxx.md`) stored as human-readable YAML documents.
3. **`_Zettelkasten/`**: 3-Tier atomic knowledge notes (`01_Fleeting`, `02_Literature`, `03_Permanent`). Completely decoupled from projects and clients.
4. **`[YYYY]/`**: Standardized 5-folder project vaults (`01_BRIEF` to `05_DELIVERABLES`).

### External Interoperability
Because storage is pure directories and files:
* You can open any vault file in **Obsidian**, **VS Code**, or **Typora**.
* You can synchronize across **Dropbox**, **Google Drive**, **OneDrive**, or **Synology Drive** with zero SQLite database lock conflicts.
* Deleting a client or project folder simply removes that directory on disk; there are no broken foreign keys or database migrations to manage.

---

## ⚙️ Layer 2: Domain Services Layer (`lib/services/`)

Each domain is encapsulated in an isolated TypeScript service with clean input/output boundaries:

| Domain Service | File | Single Responsibility | Dependencies |
| :--- | :--- | :--- | :--- |
| **Client Engine** | [`clientService.ts`](file:///src/app/client/src/lib/services/clientService.ts) | Parse client YAML frontmatter, manage brand color palettes (HEX, RGB, CMYK) | Pure data parsing |
| **Finance Engine** | [`financeService.ts`](file:///src/app/client/src/lib/services/financeService.ts) | Real-time invoice arithmetic, subtotal/tax calculations, PDF generation | Pure data arithmetic |
| **Knowledge Engine** | [`zettelService.ts`](file:///src/app/client/src/lib/services/zettelService.ts) | Bi-directional WikiLink indexer, `- [ ] #task` crawler and status toggle | Markdown parser |
| **Radio Engine** | [`radioService.svelte.ts`](file:///src/app/client/src/lib/services/radioService.svelte.ts) | Web Audio controller, station streaming, 33 RPM spool animation ticker | Web Audio API |

### Modularity in Practice
If the Focus Radio is streaming audio, it has zero dependencies on `zettelService.ts` or `clientService.ts`. You can refactor or replace one service without risking regressions in another.

---

## 🖥️ Layer 3: Pluggable View Layer (`lib/views/`)

The application shell (`App.svelte`) acts as a lightweight host for independent, pluggable views:

```svelte
<!-- App.svelte Route Dispatcher -->
<section class="view-pane {currentConfig.layout}">
  {#if appState.currentRoute === 'dashboard'}
    <DashboardView />
  {:else if appState.currentRoute === 'projects'}
    <ProjectsView />
  {:else if appState.currentRoute === 'clients'}
    <ClientsView />
  {:else if appState.currentRoute === 'invoices'}
    <InvoiceStudioView />
  {:else if appState.currentRoute === 'zettel'}
    <ZettelView />
  {:else if appState.currentRoute === 'radio'}
    <RadioView />
  ...
</section>
```

Each view manages its own local presentation state and interacts only with its corresponding domain service:
* **`ClientsView.svelte`**: Renders client cards and brand color swatches.
* **`InvoiceStudioView.svelte`**: Dual-pane YAML editor and live printable invoice preview.
* **`ZettelView.svelte`**: 3-Tier note browser, backlink inspector, and atomic note editor.
* **`RadioView.svelte`**: Mechanical cassette deck, station selector, and Pomodoro focus timer.

---

## 🎨 Layer 4: Atomic Design System Layer (`lib/components/ui/`)

User interface components follow the atomic design hierarchy:

1. **Atomic Primitives (`lib/components/ui/`)**:
   - `FluentButton`: General-purpose interactive button with Primary, Secondary, and Danger styles.
   - `FluentCard`: 1px hairline border elevated container using `var(--kanso-surface)`.
   - `FluentDialog`: Modal backdrop and dialogue wrapper.
   - `FluentInput` / `FluentSelect`: Form inputs following Geist spacing standards.
   - `FluentToast`: Notification feedback toast.
2. **Feature Components (`lib/components/features/` & `radio/`)**:
   - Reusable composite widgets composed of atomic primitives:
     - `ProjectKanbanView`: 5-Stage drag-and-drop card board.
     - `DeliverableLightbox`: 4K media viewer with zoom/pan inspection.
     - `CassetteTapeCard`: Skeuomorphic cassette chassis with rotating spools.
     - `MiniCassetteDock`: 40px persistent audio dock for the sidebar footer.
3. **Design Tokens (`kanso-tokens.css`)**:
   - All visual presentation is governed by CSS custom properties (`--kanso-canvas`, `--kanso-surface`, `--kanso-border`, `--kanso-text-primary`, `--kanso-accent`).
   - Switching between Dark Obsidian and Light Porcelain happens globally through CSS variables without touching component markup.

---

## 🧪 Proof of Architectural Modularity: The Retro Cassette Player

When integrating the Retro Cassette Radio (ported from the mechanical player in SS-CAM Android), the modular architecture allowed clean implementation without modifying existing business logic:

1. **Contract**: Defined `CassetteRadioStation` and `RadioPlaybackState` in [`lib/types/radio.ts`](file:///src/app/client/src/lib/types/radio.ts).
2. **Service**: Implemented audio streaming and spool angle animation in [`lib/services/radioService.svelte.ts`](file:///src/app/client/src/lib/services/radioService.svelte.ts).
3. **Components**: Created `CassetteSpoolWheel.svelte`, `CassetteTapeCard.svelte`, `CassetteDeck.svelte`, and `MiniCassetteDock.svelte` in `lib/components/radio/`.
4. **View**: Created [`RadioView.svelte`](file:///src/app/client/src/lib/views/RadioView.svelte) and registered the route in `App.svelte`.

**Result**: Complete audio focus subsystem integrated with **zero breaking changes** to Projects, Clients, Invoices, or Zettelkasten.
