<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';

  function copyGitUrl() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('https://github.com/manaphassan/Kanso-Cre8');
      appState.addToast('Repository URL copied to clipboard: https://github.com/manaphassan/Kanso-Cre8', 'success', 'URL Copied');
    }
  }
</script>

<div class="card-surface about-hero-card">
  <div class="about-calligraphy-banner-container">
    <img
      src={appState.theme === 'light' || appState.theme === 'oceanic-light' ? 'brand/kanso-calligraphy-light.png' : 'brand/kanso-calligraphy-dark.png'}
      alt="簡素Cre8 Calligraphy Logo"
      class="about-calligraphy-banner"
    />
  </div>

  <div class="about-hero-content">
    <div class="about-titles">
      <div class="about-title-row">
        <h2 class="about-hero-title">簡素Cre8</h2>
        <span class="version-badge">v0.8.0-zen</span>
      </div>
      <p class="about-hero-subtitle">The Mindful Creative Vault — an offline-first, local-first creative operations, client hub, and knowledge engine for freelance designers.</p>
    </div>
  </div>

  <div class="git-repository-box">
    <div class="git-repo-left">
      <div class="git-icon-wrap">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
      </div>
      <div class="git-repo-meta">
        <span class="git-repo-title">Official Git Repository</span>
        <span class="git-repo-url">https://github.com/manaphassan/Kanso-Cre8</span>
      </div>
    </div>

    <div class="git-repo-actions">
      <button type="button" class="btn-secondary" onclick={copyGitUrl}>Copy URL</button>
      <a href="https://github.com/manaphassan/Kanso-Cre8" target="_blank" rel="noreferrer" class="btn-primary link-out">View on GitHub</a>
    </div>
  </div>
</div>

<style>
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; }
  .about-calligraphy-banner-container { display: flex; justify-content: center; padding: 20px 0; border-bottom: 1px solid var(--kanso-border); margin-bottom: 20px; }
  .about-calligraphy-banner { max-height: 80px; object-fit: contain; }
  .about-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .about-hero-title { margin: 0; font-size: 24px; font-weight: 800; color: var(--kanso-text-primary); }
  .version-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); border-radius: 4px; color: var(--kanso-accent); }
  .about-hero-subtitle { margin: 0; font-size: 14px; color: var(--kanso-text-muted); line-height: 1.5; }
  .git-repository-box { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; margin-top: 20px; }
  .git-repo-left { display: flex; align-items: center; gap: 12px; }
  .git-icon-wrap { color: var(--kanso-text-primary); display: flex; }
  .git-repo-meta { display: flex; flex-direction: column; gap: 2px; }
  .git-repo-title { font-size: 13px; font-weight: 700; color: var(--kanso-text-primary); }
  .git-repo-url { font-size: 12px; font-family: monospace; color: var(--kanso-text-muted); }
  .git-repo-actions { display: flex; gap: 8px; align-items: center; }
  .btn-secondary { height: 32px; padding: 0 14px; border-radius: 6px; background: var(--kanso-surface-hover); color: var(--kanso-text-primary); font-size: 12px; font-weight: 600; border: 1px solid var(--kanso-border); cursor: pointer; }
  .btn-primary { height: 32px; padding: 0 16px; border-radius: 6px; background: var(--kanso-accent); color: #FFFFFF; font-size: 12px; font-weight: 600; border: none; cursor: pointer; text-decoration: none; display: flex; align-items: center; }
</style>
