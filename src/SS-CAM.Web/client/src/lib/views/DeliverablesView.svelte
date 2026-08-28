<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import type { DeliverableItem } from '$lib/types';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import DeliverableLightbox from '$lib/components/features/DeliverableLightbox.svelte';

  let selectedDeliverable = $state<DeliverableItem | null>(null);
  let lightboxOpen = $state<boolean>(false);
  let filterStatus = $state<string>('all');
  let searchQuery = $state<string>('');
  let filterBrand = $state<string>('all');

  onMount(async () => {
    await projectStore.loadDeliverables();
  });

  function openLightbox(d: DeliverableItem) {
    selectedDeliverable = d;
    lightboxOpen = true;
  }

  const filteredDeliverables = $derived(
    projectStore.deliverables.filter(d => {
      const status = d.status || 'pending';
      const brand = d.project?.brand || d.projectBrand || 'SS';
      const filename = d.filename || '';
      const projTitle = d.project?.title || d.projectTitle || '';
      const jobId = d.project?.jobId || d.projectJobId || '';
      const designer = d.project?.designer || d.projectDesigner || '';

      if (filterStatus !== 'all' && status !== filterStatus) return false;
      if (filterBrand !== 'all' && brand !== filterBrand) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = filename.toLowerCase().includes(q) ||
                        projTitle.toLowerCase().includes(q) ||
                        jobId.toLowerCase().includes(q) ||
                        designer.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    })
  );

  const pendingCount = $derived(projectStore.deliverables.filter(d => (d.status || 'pending') === 'pending').length);
  const revisionCount = $derived(projectStore.deliverables.filter(d => d.status === 'revision').length);
  const approvedCount = $derived(projectStore.deliverables.filter(d => d.status === 'approved').length);
  const availableBrands = $derived(Array.from(new Set(projectStore.deliverables.map(d => d.project?.brand || d.projectBrand || 'SS'))).filter(Boolean));
</script>

<div class="deliverables-view-container">
  <!-- View Header -->
  <div class="view-header">
    <div class="header-left">
      <div class="header-tag">
        <span class="badge-accent">Synology Vault</span>
        <span class="header-meta">{projectStore.deliverables.length} Total Master Outputs</span>
      </div>
      <h1 class="view-title">Deliverables & Review Queue</h1>
      <p class="view-subtitle">Inspect, approve, and manage creative outputs across campaign projects in real time</p>
    </div>

    <div class="header-actions">
      <FluentButton appearance="secondary" size="sm" onclick={() => projectStore.loadDeliverables()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
        </svg>
        <span>Refresh Queue</span>
      </FluentButton>
    </div>
  </div>

  <!-- Summary KPI Bar -->
  <div class="deliverable-kpi-bar">
    <button class="kpi-pill {filterStatus === 'all' ? 'active' : ''}" onclick={() => filterStatus = 'all'}>
      <span class="kpi-label">All Deliverables</span>
      <span class="kpi-count">{projectStore.deliverables.length}</span>
    </button>
    <button class="kpi-pill pill-pending {filterStatus === 'pending' ? 'active' : ''}" onclick={() => filterStatus = 'pending'}>
      <span class="kpi-label">Pending Sign-off</span>
      <span class="kpi-count">{pendingCount}</span>
    </button>
    <button class="kpi-pill pill-revision {filterStatus === 'revision' ? 'active' : ''}" onclick={() => filterStatus = 'revision'}>
      <span class="kpi-label">Revision Required</span>
      <span class="kpi-count">{revisionCount}</span>
    </button>
    <button class="kpi-pill pill-approved {filterStatus === 'approved' ? 'active' : ''}" onclick={() => filterStatus = 'approved'}>
      <span class="kpi-label">Approved & Released</span>
      <span class="kpi-count">{approvedCount}</span>
    </button>
  </div>

  <!-- Filter & Search Toolbar -->
  <div class="deliverable-toolbar">
    <div class="search-box">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        type="text"
        placeholder="Filter deliverables by filename, job ID, designer..."
        bind:value={searchQuery}
      />
      {#if searchQuery}
        <button class="clear-search" onclick={() => searchQuery = ''}>✕</button>
      {/if}
    </div>

    <div class="filter-group">
      <select bind:value={filterBrand} class="brand-select">
        <option value="all">All Brands ({availableBrands.length})</option>
        {#each availableBrands as b}
          <option value={b}>{b} Holding</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Main Deliverables Grid -->
  {#if projectStore.isLoading}
    <div class="state-card">
      <div class="spinner-large"></div>
      <p class="state-title">Scanning Synology Vault Deliverables...</p>
      <p class="state-desc">Indexing high-resolution renders, mockups, and PDFs from active campaigns.</p>
    </div>
  {:else if filteredDeliverables.length === 0}
    <div class="state-card empty-state">
      <div class="empty-icon">📂</div>
      <p class="state-title">No deliverables match the active filter</p>
      <p class="state-desc">Try clearing your search query or selecting "All Deliverables".</p>
      <FluentButton appearance="secondary" size="sm" onclick={() => { filterStatus = 'all'; searchQuery = ''; filterBrand = 'all'; }}>
        Reset Filters
      </FluentButton>
    </div>
  {:else}
    <div class="deliverables-grid">
      {#each filteredDeliverables as d}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="del-card-wrapper" onclick={() => openLightbox(d)}>
          <FluentCard hoverLift padding="12px" class="del-card">
            <!-- Preview Box -->
            <div class="del-preview-box">
              {#if (d.isImage || d.previewType === 'image') && d.previewUrl}
                <img
                  src={d.previewUrl}
                  alt={d.filename}
                  loading="lazy"
                  onerror={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              {:else if d.isVideo || d.previewType === 'video'}
                <div class="media-badge-icon video-icon">🎬 VIDEO</div>
              {:else if d.isPdf || d.previewType === 'pdf'}
                <div class="media-badge-icon pdf-icon">📄 PDF</div>
              {:else}
                <div class="doc-icon">{(d.ext || d.extension || (d.filename ? d.filename.split('.').pop() : '') || 'FILE').replace('.', '').toUpperCase()}</div>
              {/if}

              <!-- Status Tag Overlay -->
              <span class="preview-status-tag status-{(d.status || 'pending')}">
                {(d.status || 'pending').toUpperCase()}
              </span>
            </div>

            <!-- Card Body -->
            <div class="del-body">
              <div class="del-top">
                <span class="job-id">{d.project?.jobId || d.projectJobId || 'JOB'}</span>
                <span class="brand-pill">{d.project?.brand || d.projectBrand || 'SS'}</span>
              </div>

              <h3 class="del-title" title={d.filename}>{d.filename}</h3>
              <p class="del-proj-name" title={d.project?.title || d.projectTitle || 'Unknown Project'}>
                {d.project?.title || d.projectTitle || 'Unknown Project'}
              </p>

              <div class="del-meta-row">
                <span class="meta-designer">👤 {d.project?.designer || d.projectDesigner || 'Unassigned'}</span>
                <span class="meta-size">{d.sizeBytes ? (d.sizeBytes / (1024 * 1024)).toFixed(2) : '0.00'} MB</span>
              </div>

              <div class="del-actions" onclick={(e) => e.stopPropagation()}>
                <FluentButton appearance="secondary" size="xs" onclick={() => openLightbox(d)}>
                  Inspect & Sign-Off
                </FluentButton>
                {#if d.downloadUrl}
                  <a href={d.downloadUrl} download={d.filename} class="download-link" title="Download Output File">
                    ⬇
                  </a>
                {/if}
              </div>
            </div>
          </FluentCard>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Review & Approval Lightbox Modal -->
  <DeliverableLightbox
    deliverable={selectedDeliverable}
    bind:open={lightboxOpen}
    onClose={() => lightboxOpen = false}
    onApprove={async (d) => {
      const projId = d.project?.id || d.projectId || d.project?.jobId || d.projectJobId;
      if (projId) {
        await ApiClient.submitDecision(projId, { decision: 'approved', deliverableId: d.id });
        appState.addToast(`Deliverable "${d.filename}" approved!`, 'success', 'Sign-Off Recorded');
        await projectStore.loadDeliverables();
      }
    }}
    onRevision={async (d) => {
      const projId = d.project?.id || d.projectId || d.project?.jobId || d.projectJobId;
      if (projId) {
        await ApiClient.submitDecision(projId, { decision: 'revision_requested', deliverableId: d.id });
        appState.addToast(`Revision requested for "${d.filename}"`, 'warning', 'Revision Logged');
        await projectStore.loadDeliverables();
      }
    }}
  />
</div>

<style>
  .deliverables-view-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-bottom: 40px;
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
  }

  .header-tag {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  .badge-accent {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(4, 51, 136, 0.15);
    color: var(--brand-accent);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(33, 161, 247, 0.3);
  }

  .header-meta {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-tertiary);
  }

  .view-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }

  .view-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  /* Summary KPI Bar */
  .deliverable-kpi-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .kpi-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    transition: all 0.15s ease;
  }

  .kpi-pill:hover {
    background: var(--surface-card-hover);
    border-color: var(--brand-accent);
    color: var(--text-primary);
  }

  .kpi-pill.active {
    background: rgba(33, 161, 247, 0.12);
    border-color: var(--brand-accent);
    color: var(--brand-accent);
  }

  .kpi-count {
    background: var(--surface-card-subtle);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 700;
  }

  .kpi-pill.pill-pending.active {
    background: rgba(217, 119, 6, 0.12);
    border-color: #D97706;
    color: #D97706;
  }
  .kpi-pill.pill-revision.active {
    background: rgba(239, 68, 68, 0.12);
    border-color: #EF4444;
    color: #EF4444;
  }
  .kpi-pill.pill-approved.active {
    background: rgba(16, 185, 129, 0.12);
    border-color: #10B981;
    color: #10B981;
  }

  /* Toolbar */
  .deliverable-toolbar {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .search-box {
    flex: 1;
    min-width: 260px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    padding: 8px 14px;
    color: var(--text-secondary);
  }

  .search-box input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 13.5px;
  }

  .clear-search {
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 12px;
  }

  .brand-select {
    padding: 8px 14px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  /* Grid & Cards */
  .deliverables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 18px;
  }

  .del-card-wrapper {
    cursor: pointer;
  }

  .del-preview-box {
    height: 180px;
    background: #000000;
    border-radius: var(--radius-md);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .del-preview-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .doc-icon, .media-badge-icon {
    font-size: 16px;
    font-weight: 800;
    color: #FFFFFF;
    background: var(--brand-primary);
    padding: 12px 24px;
    border-radius: 8px;
    letter-spacing: 1px;
  }

  .video-icon { background: #7C3AED; }
  .pdf-icon { background: #DC2626; }

  .preview-status-tag {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.5px;
    padding: 3px 8px;
    border-radius: 4px;
    backdrop-filter: blur(8px);
  }

  .status-approved { background: rgba(16, 185, 129, 0.85); color: #FFFFFF; }
  .status-revision { background: rgba(239, 68, 68, 0.85); color: #FFFFFF; }
  .status-pending { background: rgba(217, 119, 6, 0.85); color: #FFFFFF; }

  .del-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .del-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .job-id {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--brand-accent);
  }

  .brand-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    color: var(--text-secondary);
  }

  .del-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 2px 0 0 0;
  }

  .del-proj-name {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 6px;
  }

  .del-meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    color: var(--text-tertiary);
    font-weight: 600;
    padding: 6px 0;
    border-top: 1px solid var(--surface-card-border);
  }

  .del-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 8px;
  }

  .download-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 12px;
    transition: all 0.15s ease;
  }

  .download-link:hover {
    background: var(--surface-card-hover);
    color: var(--brand-accent);
    border-color: var(--brand-accent);
  }

  /* State Cards */
  .state-card {
    text-align: center;
    padding: 60px 20px;
    background: var(--surface-card);
    border: 1px dashed var(--surface-card-border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .empty-icon {
    font-size: 40px;
    margin-bottom: 4px;
  }

  .state-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .state-desc {
    font-size: 13px;
    color: var(--text-secondary);
    max-width: 420px;
    margin-bottom: 12px;
  }

  .spinner-large {
    width: 32px;
    height: 32px;
    border: 3px solid var(--surface-card-border);
    border-top-color: var(--brand-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 8px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
