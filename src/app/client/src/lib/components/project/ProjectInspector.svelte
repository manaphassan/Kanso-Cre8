<script lang="ts">
  import { Icon } from '$lib/components/ui';

  interface Props {
    project: any;
    onUpdateStatus: (status: any) => Promise<void>;
  }

  let { project, onUpdateStatus }: Props = $props();

  const statuses = [
    { id: 'draft', label: 'Draft' },
    { id: 'wip', label: 'In Progress' },
    { id: 'review', label: 'In Review' },
    { id: 'approved', label: 'Approved' },
    { id: 'done', label: 'Completed' },
    { id: 'archived', label: 'Archived' }
  ];
</script>

<aside class="project-inspector">
  <div class="inspector-header">
    <h3 class="inspector-title">Project Inspector</h3>
    <span class="inspector-id font-mono">{project.id}</span>
  </div>

  <div class="inspector-body">
    <!-- Status Selector -->
    <div class="inspector-group">
      <span class="inspector-label">Production Stage</span>
      <select
        class="form-select font-mono"
        value={project.status || 'draft'}
        onchange={(e) => onUpdateStatus((e.target as HTMLSelectElement).value)}
      >
        {#each statuses as s}
          <option value={s.id}>{s.label}</option>
        {/each}
      </select>
    </div>

    <!-- Client Dossier -->
    <div class="inspector-group">
      <span class="inspector-label">Client Dossier</span>
      <div class="inspector-row">
        <span class="client-badge font-mono">{project.clientCode || 'ACME'}</span>
        <span class="client-name">{project.client || 'Client Account'}</span>
      </div>
    </div>

    <!-- Deadline -->
    <div class="inspector-group">
      <span class="inspector-label">Target Deadline</span>
      <div class="inspector-row font-mono">
        <Icon name="calendar" size={14} />
        <span>{project.deadline || 'Ongoing / Open'}</span>
      </div>
    </div>

    <!-- Standardized 5-Folder Structure -->
    <div class="inspector-group">
      <span class="inspector-label">Canonical Project Vault</span>
      <div class="canonical-folder-list">
        <div class="folder-row"><Icon name="folder" size={12} /> <span class="font-mono">01_BRIEF/</span></div>
        <div class="folder-row"><Icon name="folder" size={12} /> <span class="font-mono">02_SOURCE/</span></div>
        <div class="folder-row"><Icon name="folder" size={12} /> <span class="font-mono">03_COPY/</span></div>
        <div class="folder-row"><Icon name="folder" size={12} /> <span class="font-mono">04_WIP/</span></div>
        <div class="folder-row"><Icon name="folder" size={12} /> <span class="font-mono">05_DELIVERABLES/</span></div>
      </div>
    </div>
  </div>
</aside>

<style>
  .project-inspector {
    width: 280px;
    background: var(--kanso-surface);
    border-left: 1px solid var(--kanso-border);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  @media (max-width: 960px) {
    .project-inspector {
      width: 100%;
      border-left: none;
      border-top: 1px solid var(--kanso-border);
    }
  }
  .inspector-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--kanso-border); }
  .inspector-title { margin: 0; font-size: 14px; font-weight: 700; color: var(--kanso-text-primary); }
  .inspector-id { font-size: 11px; color: var(--kanso-accent); }
  .inspector-body { display: flex; flex-direction: column; gap: 16px; }
  .inspector-group { display: flex; flex-direction: column; gap: 6px; }
  .inspector-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--kanso-text-muted); }
  .inspector-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--kanso-text-primary); }
  .client-badge { padding: 2px 6px; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); border-radius: 4px; font-size: 11px; font-weight: 700; color: var(--kanso-accent); }
  .client-name { font-weight: 600; }
  .form-select { height: 34px; padding: 0 10px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; color: var(--kanso-text-primary); font-size: 12px; font-weight: 600; }
  .canonical-folder-list { display: flex; flex-direction: column; gap: 4px; padding: 8px 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; }
  .folder-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--kanso-text-muted); }
</style>
