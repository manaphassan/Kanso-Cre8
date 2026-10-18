<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';
  import ProjectBriefTab from '$lib/components/project/ProjectBriefTab.svelte';
  import ProjectReviewTab from '$lib/components/project/ProjectReviewTab.svelte';
  import ProjectCopyTab from '$lib/components/project/ProjectCopyTab.svelte';
  import ProjectTimelineTab from '$lib/components/project/ProjectTimelineTab.svelte';
  import ProjectDirectionTab from '$lib/components/project/ProjectDirectionTab.svelte';
  import ProjectInspector from '$lib/components/project/ProjectInspector.svelte';

  type MainCanvasView = 'brief' | 'deliverables' | 'copywriting' | 'timeline' | 'direction';

  interface Props {
    projectId?: string;
    initialTab?: MainCanvasView;
  }

  let { projectId = '', initialTab = 'brief' }: Props = $props();

  let activeCanvasView = $state<MainCanvasView>(initialTab);

  $effect(() => {
    if (initialTab && initialTab !== activeCanvasView) {
      activeCanvasView = initialTab;
    }
  });

  const project = $derived(
    projectStore.projects.find(p => p.id === projectId) || projectStore.activeProject
  );

  onMount(async () => {
    if (projectId) {
      await projectStore.selectProject(projectId);
    }
  });

  async function handleSaveBrief(newBrief: string) {
    if (!project) return;
    await projectStore.saveProjectBrief(project.id, newBrief);
    appState.addToast('Project brief saved to 01_BRIEF/brief.md', 'success');
  }

  async function handleUpdateStatus(newStatus: any) {
    if (!project) return;
    await projectStore.updateProjectStatus(project.id, newStatus);
    appState.addToast(`Project status set to ${newStatus}`, 'success');
  }

  async function handleSaveDirection(newDir: any) {
    if (!project) return;
    await projectStore.saveProjectDirection(project.id, newDir);
  }
</script>

{#if !project}
  <div class="empty-project-detail">
    <Icon name="folder" size={32} />
    <p>Project not found or loading...</p>
    <a href="#projects" class="btn-secondary">Return to Projects</a>
  </div>
{:else}
  <div class="project-detail-layout">
    <div class="project-detail-main">
      <!-- Header -->
      <header class="detail-header">
        <div class="breadcrumb-row">
          <a href="#projects" class="breadcrumb-link">Projects</a>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current font-mono">{project.id}</span>
        </div>
        <h1 class="project-title">{project.title}</h1>
      </header>

      <!-- Tabs Bar -->
      <nav class="project-tabs-bar" aria-label="Project Tabs">
        <button
          class="tab-btn"
          class:active={activeCanvasView === 'brief'}
          onclick={() => (activeCanvasView = 'brief')}
        >
          <span>Brief</span>
        </button>
        <button
          class="tab-btn"
          class:active={activeCanvasView === 'deliverables'}
          onclick={() => (activeCanvasView = 'deliverables')}
        >
          <span>Review Queue ({projectStore.activeDeliverables.length})</span>
        </button>
        <button
          class="tab-btn"
          class:active={activeCanvasView === 'copywriting'}
          onclick={() => (activeCanvasView = 'copywriting')}
        >
          <span>Copy Studio</span>
        </button>
        <button
          class="tab-btn"
          class:active={activeCanvasView === 'timeline'}
          onclick={() => (activeCanvasView = 'timeline')}
        >
          <span>Timeline</span>
        </button>
        <button
          class="tab-btn"
          class:active={activeCanvasView === 'direction'}
          onclick={() => (activeCanvasView = 'direction')}
        >
          <span>Direction</span>
        </button>
      </nav>

      <!-- Tab Content -->
      <div class="tab-body">
        {#if activeCanvasView === 'brief'}
          <ProjectBriefTab
            briefContent={project.description || ''}
            onSave={handleSaveBrief}
          />
        {:else if activeCanvasView === 'deliverables'}
          <ProjectReviewTab {project} />
        {:else if activeCanvasView === 'copywriting'}
          <ProjectCopyTab {project} />
        {:else if activeCanvasView === 'timeline'}
          <ProjectTimelineTab {project} />
        {:else if activeCanvasView === 'direction'}
          <ProjectDirectionTab
            direction={project.direction || {}}
            onSave={handleSaveDirection}
          />
        {/if}
      </div>
    </div>

    <!-- Right Inspector -->
    <ProjectInspector
      {project}
      onUpdateStatus={handleUpdateStatus}
    />
  </div>
{/if}

<style>
  .project-detail-layout {
    display: flex;
    height: 100%;
    min-height: calc(100vh - 60px);
  }
  @media (max-width: 960px) {
    .project-detail-layout {
      flex-direction: column;
    }
  }
  .project-detail-main {
    flex: 1;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
  }
  .detail-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .breadcrumb-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }
  .breadcrumb-link {
    color: var(--kanso-accent);
    text-decoration: none;
    font-weight: 600;
  }
  .breadcrumb-sep {
    color: var(--kanso-text-muted);
  }
  .breadcrumb-current {
    color: var(--kanso-text-muted);
  }
  .project-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .project-tabs-bar {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 8px;
  }
  .tab-btn {
    padding: 8px 16px;
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--kanso-text-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .tab-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
  }
  .tab-btn.active {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface);
    border-color: var(--kanso-border);
  }
  .tab-body {
    flex: 1;
  }
  .empty-project-detail {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    height: 60vh;
    color: var(--kanso-text-muted);
  }
  .btn-secondary {
    padding: 8px 16px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    color: var(--kanso-text-primary);
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
  }
</style>
