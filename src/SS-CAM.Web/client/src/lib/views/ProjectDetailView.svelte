<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import type { DeliverableItem, ProjectFrontmatter } from '$lib/types';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';
  import MarkdownEditor from '$lib/components/markdown/MarkdownEditor.svelte';
  import FrontmatterPanel from '$lib/components/features/FrontmatterPanel.svelte';
  import DeliverableLightbox from '$lib/components/features/DeliverableLightbox.svelte';

  interface Props {
    projectId?: string;
  }

  let { projectId = '' }: Props = $props();

  let activeTab = $state<'brief' | 'metadata' | 'direction' | 'copy' | 'deliverables' | 'approvals'>('brief');
  let selectedDeliverable = $state<DeliverableItem | null>(null);
  let lightboxOpen = $state<boolean>(false);
  let isApproving = $state<boolean>(false);

  // Markdown and frontmatter local states
  let currentReadmeBody = $state<string>('');
  let currentFrontmatter = $state<ProjectFrontmatter>({});

  onMount(async () => {
    const id = projectId || appState.routeParams.id;
    if (id) {
      await loadProject(id);
    }
  });

  async function loadProject(id: string) {
    await projectStore.loadProjectDetail(id);
    if (projectStore.selectedProject) {
      currentReadmeBody = projectStore.selectedProject.readmeBody || '';
      currentFrontmatter = {
        status: projectStore.selectedProject.status,
        designer: projectStore.selectedProject.designer,
        brand: projectStore.selectedProject.brand,
        manager: projectStore.selectedProject.manager,
        department: projectStore.selectedProject.department,
        deadline: projectStore.selectedProject.deadline,
        priority: projectStore.selectedProject.priority,
        tags: projectStore.selectedProject.tags || [],
        creative_direction: projectStore.selectedProject.creativeDirection,
        copywriting: projectStore.selectedProject.copywriting
      };
    }
  }

  async function saveMarkdownBrief(newBody: string) {
    if (!projectStore.selectedProject) return;
    try {
      const hash = projectStore.selectedProject.versionHash || null;
      await ApiClient.updateBrief(projectStore.selectedProject.id, newBody, hash);
      appState.addToast('Markdown brief saved to Synology NAS (README.md)', 'success');
      currentReadmeBody = newBody;
      await loadProject(projectStore.selectedProject.id);
    } catch (err: any) {
      appState.addToast(`Failed to save brief: ${err.message}`, 'error');
    }
  }

  async function saveFrontmatter(updatedFm: ProjectFrontmatter) {
    if (!projectStore.selectedProject) return;
    try {
      await ApiClient.updateProject(projectStore.selectedProject.id, updatedFm);
      appState.addToast('Metadata frontmatter saved to Synology NAS', 'success');
      await loadProject(projectStore.selectedProject.id);
    } catch (err: any) {
      appState.addToast(`Failed to save metadata: ${err.message}`, 'error');
    }
  }

  async function handleQuickDecision(decision: 'approved' | 'revision_requested') {
    if (!projectStore.selectedProject) return;
    isApproving = true;
    try {
      await ApiClient.submitDecision(projectStore.selectedProject.id, { decision });
      appState.addToast(`Project status updated to ${decision}`, 'success');
      await loadProject(projectStore.selectedProject.id);
    } catch (err: any) {
      appState.addToast(`Action failed: ${err.message}`, 'error');
    } finally {
      isApproving = false;
    }
  }

  function openLightbox(d: DeliverableItem) {
    selectedDeliverable = d;
    lightboxOpen = true;
  }
</script>

<div class="project-detail-container">
  {#if projectStore.isLoading && !projectStore.selectedProject}
    <div class="loading-state">Loading project workspace from Synology NAS...</div>
  {:else if !projectStore.selectedProject}
    <div class="error-state">
      <p>Project not found or workspace could not be accessed.</p>
      <FluentButton appearance="secondary" onclick={() => appState.navigate('projects')}>
        ← Back to Projects Catalog
      </FluentButton>
    </div>
  {:else}
    {@const p = projectStore.selectedProject}

    <!-- Detail Header -->
    <div class="detail-header">
      <div class="header-left">
        <div class="header-chips">
          <span class="job-id-tag">{p.jobId}</span>
          <FluentBadge type="brand" value={p.brand} />
          <FluentBadge type="status" value={p.status} />
          <FluentBadge type="priority" value={p.priority} />
        </div>
        <h1 class="project-title">{p.title}</h1>
      </div>

      <div class="header-actions">
        {#if appState.canApprove()}
          <FluentButton
            appearance="danger"
            size="md"
            loading={isApproving}
            onclick={() => handleQuickDecision('revision_requested')}
          >
            Request Revision
          </FluentButton>
          <FluentButton
            appearance="success"
            size="md"
            loading={isApproving}
            onclick={() => handleQuickDecision('approved')}
          >
            Approve Project
          </FluentButton>
        {:else}
          <span class="badge badge-status-review">In Review Workflow</span>
        {/if}
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tab-bar">
      <button class="tab-item" class:active={activeTab === 'brief'} onclick={() => activeTab = 'brief'}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -2px; margin-right: 4px;"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
        <span>Markdown Brief & Diagram</span>
      </button>
      <button class="tab-item" class:active={activeTab === 'metadata'} onclick={() => activeTab = 'metadata'}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -2px; margin-right: 4px;"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/></svg>
        <span>Frontmatter Metadata</span>
      </button>
      <button class="tab-item" class:active={activeTab === 'deliverables'} onclick={() => activeTab = 'deliverables'}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -2px; margin-right: 4px;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
        <span>Deliverables ({projectStore.activeDeliverables.length})</span>
      </button>
      <button class="tab-item" class:active={activeTab === 'direction'} onclick={() => activeTab = 'direction'}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -2px; margin-right: 4px;"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.36 19.64 10.63 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>
        <span>Creative Direction</span>
      </button>
      <button class="tab-item" class:active={activeTab === 'copy'} onclick={() => activeTab = 'copy'}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -2px; margin-right: 4px;"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        <span>Copywriting Studio</span>
      </button>
      <button class="tab-item" class:active={activeTab === 'approvals'} onclick={() => activeTab = 'approvals'}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -2px; margin-right: 4px;"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
        <span>Approvals ({p.approvals?.length || 0})</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-viewport">
      {#if activeTab === 'brief'}
        <!-- Obsidian-Style Markdown & Mermaid Live Editor -->
        <MarkdownEditor
          bind:value={currentReadmeBody}
          onSave={saveMarkdownBrief}
        />
      {:else if activeTab === 'metadata'}
        <!-- Frontmatter GUI Panel -->
        <FrontmatterPanel
          bind:frontmatter={currentFrontmatter}
          onSave={saveFrontmatter}
        />
      {:else if activeTab === 'deliverables'}
        <!-- Deliverables Grid -->
        <div class="deliverables-section">
          {#if projectStore.activeDeliverables.length === 0}
            <FluentCard>
              <div class="empty-deliverables">
                <p>No output files found in <code>05_DELIVERABLES</code>.</p>
              </div>
            </FluentCard>
          {:else}
            <div class="deliverables-grid">
              {#each projectStore.activeDeliverables as d}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="deliverable-item" onclick={() => openLightbox(d)}>
                  <FluentCard hoverLift padding="12px">
                    <div class="del-preview">
                      {#if d.isImage}
                        <img src={d.previewUrl} alt={d.filename} />
                      {:else}
                        <div class="doc-placeholder">{d.ext.toUpperCase()}</div>
                      {/if}
                    </div>
                    <div class="del-info">
                      <div class="del-name">{d.filename}</div>
                      <div class="del-meta">{(d.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {d.status}</div>
                    </div>
                  </FluentCard>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {:else if activeTab === 'direction'}
        <FluentCard>
          <h3>Creative & Visual Direction</h3>
          <p style="margin-bottom: 16px;">Set visual concepts, tone, and brand positioning.</p>
          <div class="form-vertical">
            <div>
              <label class="form-label">Visual Concept / Style Direction</label>
              <input
                type="text"
                class="form-input"
                bind:value={currentFrontmatter.creative_direction!.visual_concept}
                placeholder="e.g. Modern Bold Minimalist, Dark Neon Accent"
              />
            </div>
            <div>
              <label class="form-label">Primary Color Palette Tokens</label>
              <input
                type="text"
                class="form-input"
                bind:value={currentFrontmatter.creative_direction!.color_palette}
                placeholder="e.g. Prussian Blue #022057, SS Blue #043388"
              />
            </div>
            <div>
              <label class="form-label">Target Audience Notes</label>
              <textarea
                class="form-textarea"
                bind:value={currentFrontmatter.creative_direction!.target_audience}
              ></textarea>
            </div>
            <FluentButton appearance="primary" onclick={() => saveFrontmatter(currentFrontmatter)}>
              Save Creative Direction
            </FluentButton>
          </div>
        </FluentCard>
      {:else if activeTab === 'copy'}
        <FluentCard>
          <h3>Copywriting & Ad Scripts</h3>
          <p style="margin-bottom: 16px;">Manage ad headlines, hooks, and script transcripts.</p>
          <div class="form-vertical">
            <div>
              <label class="form-label">Main Campaign Headline / Hook</label>
              <input
                type="text"
                class="form-input"
                bind:value={currentFrontmatter.copywriting!.headline}
                placeholder="Enter primary hook"
              />
            </div>
            <div>
              <label class="form-label">Script Body / Ad Copy</label>
              <textarea
                class="form-textarea"
                style="min-height: 140px;"
                bind:value={currentFrontmatter.copywriting!.body_copy}
              ></textarea>
            </div>
            <FluentButton appearance="primary" onclick={() => saveFrontmatter(currentFrontmatter)}>
              Update Copywriting Studio
            </FluentButton>
          </div>
        </FluentCard>
      {:else if activeTab === 'approvals'}
        <FluentCard>
          <h3>Approval Sign-off Audit Trail</h3>
          <div class="approvals-timeline">
            {#each (p.approvals || []) as a}
              <div class="approval-entry">
                <div class="app-actor"><b>{a.actor}</b> ({a.role})</div>
                <div class="app-decision status-{a.decision}">{a.decision.toUpperCase()}</div>
                <div class="app-time">{new Date(a.timestamp).toLocaleString()}</div>
                {#if a.comment}
                  <div class="app-comment">"{a.comment}"</div>
                {/if}
              </div>
            {:else}
              <p class="empty-approvals">No formal approval decisions recorded yet.</p>
            {/each}
          </div>
        </FluentCard>
      {/if}
    </div>

    <!-- Lightbox Modal -->
    <DeliverableLightbox
      deliverable={selectedDeliverable}
      bind:open={lightboxOpen}
      onClose={() => lightboxOpen = false}
      onApprove={async (d) => {
        await ApiClient.submitDecision(p.id, { decision: 'approved', deliverableId: d.id });
        appState.addToast(`Deliverable ${d.filename} approved`, 'success');
        await loadProject(p.id);
      }}
      onRevision={async (d) => {
        await ApiClient.submitDecision(p.id, { decision: 'revision_requested', deliverableId: d.id });
        appState.addToast(`Revision requested for ${d.filename}`, 'warning');
        await loadProject(p.id);
      }}
    />
  {/if}
</div>

<style>
  .project-detail-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--surface-card-border);
  }

  .header-chips {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .job-id-tag {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 800;
    color: var(--brand-accent);
  }

  .project-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .header-actions {
    display: flex;
    gap: 10px;
  }

  .tab-bar {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--surface-card-border);
    overflow-x: auto;
  }

  .tab-item {
    padding: 8px 16px;
    border: none;
    background: transparent;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .tab-item:hover {
    color: var(--text-primary);
  }

  .tab-item.active {
    color: var(--brand-primary);
    border-bottom-color: var(--brand-primary);
    font-weight: 700;
  }

  [data-theme="metamorphosis"] .tab-item.active {
    color: #00CFFF;
    border-bottom-color: #00CFFF;
  }

  [data-theme="catppuccin"] .tab-item.active {
    color: #CBA6F7;
    border-bottom-color: #CBA6F7;
  }

  .deliverables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .deliverable-item {
    cursor: pointer;
  }

  .del-preview {
    height: 140px;
    background: #000000;
    border-radius: var(--radius-md);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }

  .del-preview img {
    max-width: 100%;
    max-height: 100%;
    object-fit: cover;
  }

  .doc-placeholder {
    font-size: 24px;
    font-weight: 800;
    color: #FFFFFF;
    background: var(--brand-primary);
    padding: 10px 18px;
    border-radius: 6px;
  }

  .del-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .del-meta {
    font-size: 11.5px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .form-vertical {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 680px;
  }

  .form-label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: 8px 12px;
    font-family: var(--font-family);
    font-size: 13px;
    color: var(--text-primary);
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    outline: none;
  }

  .form-textarea {
    min-height: 90px;
    resize: vertical;
  }

  .approvals-timeline {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 14px;
  }

  .approval-entry {
    padding: 12px 16px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12.5px;
  }

  .empty-deliverables, .empty-approvals, .loading-state, .error-state {
    text-align: center;
    padding: 40px 0;
    color: var(--text-secondary);
  }
</style>
