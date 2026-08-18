<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  onMount(() => {
    projectStore.loadProjects();
  });

  function copyPreset(template: 'tiktok' | 'facebook' | 'packaging') {
    let text = '';
    if (template === 'tiktok') {
      text = `[HOOK (0-3s)]: "Stop ignoring this one warning sign in your daily routine..."\n[PROBLEM (3-15s)]: Most men suffer in silence without realizing how easy the clinic consultation is.\n[SOLUTION (15-45s)]: SuamiSihat specialized treatment protocols.\n[CTA (45-60s)]: Click the link in bio to book your private doctor consultation today.`;
    } else if (template === 'facebook') {
      text = `Are you feeling fatigued, low on stamina, or struggling with performance?\n\nHere are 3 clinical reasons your hormone levels might be off:\n1. Chronic stress and elevated cortisol\n2. Nutrient depletion\n3. Untreated underlying conditions\n\nAt SuamiSihat Clinic, we specialize in discreet, evidence-based men's health.\n\nBook your consultation: https://suamisihat.clinic/`;
    } else if (template === 'packaging') {
      text = `• Formulated with premium Grade-A clinical herbs\n• 100% natural stamina and vitality support\n• Lab tested for purity and zero synthetic adulterants\n• Directions: Take 1 sachet daily before breakfast`;
    }

    navigator.clipboard.writeText(text);
    appState.addToast('Copy template copied to clipboard!', 'success');
  }
</script>

<div class="copy-studio-container">
  <div class="view-header">
    <div>
      <h1 class="view-title">Copywriting & Script Matrix</h1>
      <p class="view-subtitle">Manage advertising scripts, marketing copy, and campaign angles</p>
    </div>
  </div>

  <!-- Quick Templates Bar -->
  <FluentCard padding="14px 18px" class="template-deck">
    <div class="deck-left">
      <span class="badge badge-brand">AI TEMPLATES</span>
      <span class="deck-title">Quick Copy Frameworks:</span>
    </div>
    <div class="deck-actions">
      <FluentButton appearance="secondary" size="sm" onclick={() => copyPreset('tiktok')}>
        TikTok Hook Script
      </FluentButton>
      <FluentButton appearance="secondary" size="sm" onclick={() => copyPreset('facebook')}>
        Facebook Problem / Solution
      </FluentButton>
      <FluentButton appearance="secondary" size="sm" onclick={() => copyPreset('packaging')}>
        Packaging Benefit Claims
      </FluentButton>
    </div>
  </FluentCard>

  <div class="projects-copy-grid">
    {#each projectStore.projects as p}
      {@const copy = p.copywriting || { status: 'draft' }}
      <FluentCard hoverLift padding="18px">
        <div class="copy-card-header">
          <div>
            <span class="job-id">{p.jobId}</span>
            <h3 class="proj-title">{p.title}</h3>
          </div>
          <span class="badge status-pill status-{copy.status || 'draft'}">{copy.status || 'draft'}</span>
        </div>

        <div class="copy-box">
          <div class="copy-label">Headline / Hook</div>
          <div class="copy-headline">
            {copy.headline ? `"${copy.headline}"` : 'No headline defined yet'}
          </div>

          <div class="copy-label" style="margin-top: 10px;">Script Excerpt</div>
          <div class="copy-body-snippet">
            {copy.body_copy ? copy.body_copy.substring(0, 140) + '...' : 'No body copy drafted in workspace.'}
          </div>
        </div>

        <div class="copy-card-footer">
          <FluentButton appearance="secondary" size="sm" onclick={() => appState.navigate('project-detail', { id: p.jobId, tab: 'copy' })}>
            Edit in Studio →
          </FluentButton>
        </div>
      </FluentCard>
    {/each}
  </div>
</div>

<style>
  .copy-studio-container {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .view-header {
    margin-bottom: 4px;
  }

  .view-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .view-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .deck-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .deck-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .deck-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .projects-copy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  .copy-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .job-id {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 800;
    color: var(--brand-accent);
  }

  .proj-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin-top: 2px;
  }

  .copy-box {
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    padding: 12px;
    margin-bottom: 14px;
  }

  .copy-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .copy-headline {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    margin-top: 2px;
  }

  .copy-body-snippet {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 2px;
    line-height: 1.4;
  }

  .copy-card-footer {
    display: flex;
    justify-content: flex-end;
  }

  .status-pill {
    text-transform: uppercase;
    font-size: 10.5px;
  }
  .status-approved { background: #10B98120; color: #10B981; }
  .status-revision_requested { background: #EF444420; color: #EF4444; }
  .status-submitted { background: #F59E0B20; color: #F59E0B; }
  .status-draft { background: #64748B20; color: #64748B; }
</style>
