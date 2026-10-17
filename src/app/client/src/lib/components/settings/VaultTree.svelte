<script lang="ts">
  import { Icon } from '$lib/components/ui';

  interface Props {
    currentVaultRoot: string;
  }

  let { currentVaultRoot }: Props = $props();

  let expandedNodes = $state<Record<string, boolean>>({
    'clients': true,
    'finance': true,
    'projects': true,
    'projects-2026': true,
    'journal': true,
    'notes': true
  });

  function toggleNode(nodeKey: string) {
    expandedNodes[nodeKey] = !expandedNodes[nodeKey];
  }
</script>

<div class="card-surface canonical-tree-card">
  <div class="card-header">
    <div class="card-header-badge-row">
      <h2 class="card-title">Canonical Kanso Zen Vault Layout</h2>
      <span class="storage-pill">Filesystem Architecture</span>
    </div>
    <p class="card-subtitle">Strict 5-domain pure Markdown structure. Every document lives as a readable UTF-8 file.</p>
  </div>

  <div class="vault-tree-view">
    <div class="tree-root-bar">
      <span class="tree-root-icon"><Icon name="package" size={16} /></span>
      <span class="tree-root-path">{currentVaultRoot || 'Vault Root'}</span>
      <span class="tree-root-badge">Canonical Zen Specification</span>
    </div>

    <div class="tree-branches">
      <!-- Clients -->
      <div class="tree-node-group">
        <button type="button" class="tree-node-header" onclick={() => toggleNode('clients')}>
          <span class="tree-chevron" class:expanded={expandedNodes['clients']}>▶</span>
          <span class="folder-glyph"><Icon name="folder" size={14} /></span>
          <span class="folder-name">_Clients/</span>
          <span class="folder-role">Client Profiles &amp; Brand Hub</span>
          <span class="folder-count">ACME · NEX · LUM</span>
        </button>
        {#if expandedNodes['clients']}
          <div class="tree-children">
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">ACME_AcmeCorp/</span> <span class="leaf-desc">Acme Corporation profile (client.md)</span></div>
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">NEX_NexusStudio/</span> <span class="leaf-desc">Nexus Studio profile</span></div>
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">LUM_LuminaLabs/</span> <span class="leaf-desc">Lumina Labs profile</span></div>
          </div>
        {/if}
      </div>

      <!-- Finance -->
      <div class="tree-node-group">
        <button type="button" class="tree-node-header" onclick={() => toggleNode('finance')}>
          <span class="tree-chevron" class:expanded={expandedNodes['finance']}>▶</span>
          <span class="folder-glyph"><Icon name="folder" size={14} /></span>
          <span class="folder-name">_Finance/</span>
          <span class="folder-role">Finance &amp; Invoicing Studio</span>
        </button>
        {#if expandedNodes['finance']}
          <div class="tree-children">
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">Quotes/</span> <span class="leaf-desc">Fee proposals &amp; quotations (.md)</span></div>
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">Invoices/</span> <span class="leaf-desc">Dual-pane YAML invoices (.md)</span></div>
          </div>
        {/if}
      </div>

      <!-- Projects -->
      <div class="tree-node-group">
        <button type="button" class="tree-node-header" onclick={() => toggleNode('projects')}>
          <span class="tree-chevron" class:expanded={expandedNodes['projects']}>▶</span>
          <span class="folder-glyph"><Icon name="folder" size={14} /></span>
          <span class="folder-name">_Projects/</span>
          <span class="folder-role">Campaign Projects Vault</span>
        </button>
        {#if expandedNodes['projects']}
          <div class="tree-children">
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">2026/</span> <span class="leaf-desc">Standardized 5-folder project vaults</span></div>
          </div>
        {/if}
      </div>

      <!-- Journal -->
      <div class="tree-node-group">
        <button type="button" class="tree-node-header" onclick={() => toggleNode('journal')}>
          <span class="tree-chevron" class:expanded={expandedNodes['journal']}>▶</span>
          <span class="folder-glyph"><Icon name="folder" size={14} /></span>
          <span class="folder-name">_Journal/</span>
          <span class="folder-role">Bullet Journal (BuJo) System</span>
        </button>
        {#if expandedNodes['journal']}
          <div class="tree-children">
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">Daily/</span> <span class="leaf-desc">Rapid logs (• [ ] Task, [x] Done)</span></div>
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">Monthly/</span> <span class="leaf-desc">Completed deliverables &amp; hours</span></div>
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">Yearly/</span> <span class="leaf-desc">Annual creative vision</span></div>
          </div>
        {/if}
      </div>

      <!-- Notes -->
      <div class="tree-node-group">
        <button type="button" class="tree-node-header" onclick={() => toggleNode('notes')}>
          <span class="tree-chevron" class:expanded={expandedNodes['notes']}>▶</span>
          <span class="folder-glyph"><Icon name="folder" size={14} /></span>
          <span class="folder-name">_Notes/</span>
          <span class="folder-role">Atelier Knowledge Engine</span>
        </button>
        {#if expandedNodes['notes']}
          <div class="tree-children">
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">01_Fleeting/</span> <span class="leaf-desc">Instant creative brainstorms</span></div>
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">02_Literature/</span> <span class="leaf-desc">Design books &amp; typography notes</span></div>
            <div class="tree-leaf"><span class="file-glyph"><Icon name="folder" size={14} /></span> <span class="leaf-name">03_Permanent/</span> <span class="leaf-desc">Atomic principles &amp; studio laws</span></div>
            <div class="tree-leaf highlight"><span class="file-glyph"><Icon name="file" size={14} /></span> <span class="leaf-name font-bold">Scratchpad.md</span> <span class="leaf-desc">Instant clipboard capture buffer</span></div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; }
  .card-header { margin-bottom: 20px; }
  .card-header-badge-row { display: flex; justify-content: space-between; align-items: center; }
  .card-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .storage-pill { font-size: 11px; font-weight: 600; padding: 2px 8px; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); border-radius: 4px; color: var(--kanso-accent); }
  .card-subtitle { margin: 4px 0 0 0; font-size: 13px; color: var(--kanso-text-muted); }
  .vault-tree-view { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 16px; }
  .tree-root-bar { display: flex; align-items: center; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--kanso-border); margin-bottom: 12px; }
  .tree-root-icon { color: var(--kanso-accent); }
  .tree-root-path { font-size: 13px; font-weight: 700; color: var(--kanso-text-primary); font-family: monospace; }
  .tree-root-badge { font-size: 10px; padding: 2px 6px; background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 4px; color: var(--kanso-text-muted); margin-left: auto; }
  .tree-branches { display: flex; flex-direction: column; gap: 8px; }
  .tree-node-group { display: flex; flex-direction: column; gap: 4px; }
  .tree-node-header { display: flex; align-items: center; gap: 8px; background: none; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; text-align: left; width: 100%; color: var(--kanso-text-primary); }
  .tree-node-header:hover { background: var(--kanso-surface-hover); }
  .tree-chevron { font-size: 9px; color: var(--kanso-text-muted); transition: transform 0.15s ease; }
  .tree-chevron.expanded { transform: rotate(90deg); }
  .folder-glyph { color: var(--kanso-accent); display: flex; }
  .folder-name { font-size: 13px; font-weight: 600; font-family: monospace; }
  .folder-role { font-size: 12px; color: var(--kanso-text-muted); margin-left: 8px; }
  .folder-count { font-size: 11px; color: var(--kanso-text-muted); margin-left: auto; font-family: monospace; }
  .tree-children { padding-left: 28px; display: flex; flex-direction: column; gap: 4px; }
  .tree-leaf { display: flex; align-items: center; gap: 8px; padding: 4px 8px; font-size: 12px; color: var(--kanso-text-primary); border-radius: 4px; }
  .tree-leaf.highlight { background: var(--kanso-surface); border: 1px solid var(--kanso-border); }
  .file-glyph { color: var(--kanso-text-muted); display: flex; }
  .leaf-name { font-family: monospace; font-weight: 500; }
  .leaf-desc { font-size: 11px; color: var(--kanso-text-muted); margin-left: 8px; }
</style>
