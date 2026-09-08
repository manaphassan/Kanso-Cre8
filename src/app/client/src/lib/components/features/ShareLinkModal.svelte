<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentIcons from '$lib/components/ui/FluentIcons.svelte';

  interface Props {
    open?: boolean;
    projectId?: string;
    projectTitle?: string;
    deliverableId?: string | null;
    onClose?: () => void;
  }

  let {
    open = $bindable(false),
    projectId = '',
    projectTitle = '',
    deliverableId = null,
    onClose
  }: Props = $props();

  let expiresInDays = $state<number>(14);
  let permissions = $state<string>('review_approve');
  let note = $state<string>('');
  let isGenerating = $state<boolean>(false);
  let generatedShare = $state<any>(null);
  let activeLinks = $state<any[]>([]);
  let isLoadingLinks = $state<boolean>(false);

  $effect(() => {
    if (open && projectId) {
      loadActiveLinks();
      generatedShare = null;
    }
  });

  async function loadActiveLinks() {
    if (!projectId) return;
    isLoadingLinks = true;
    try {
      const res = await ApiClient.getProjectShareLinks(projectId);
      activeLinks = res.links || [];
    } catch (err: any) {
      console.warn('[ShareLinkModal] loadActiveLinks error:', err.message);
    } finally {
      isLoadingLinks = false;
    }
  }

  async function handleCreateLink() {
    if (!projectId) return;
    isGenerating = true;
    try {
      const res = await ApiClient.generateShareLink({
        projectId,
        deliverableId,
        expiresInDays,
        permissions,
        note
      });
      generatedShare = res.share;
      appState.addToast('Client review link generated!', 'success');
      loadActiveLinks();
    } catch (err: any) {
      appState.addToast(`Failed to generate link: ${err.message}`, 'error');
    } finally {
      isGenerating = false;
    }
  }

  function getShareUrl(token: string): string {
    const origin = window.location.origin;
    return `${origin}/#review?token=${encodeURIComponent(token)}`;
  }

  async function copyShareUrl(token: string) {
    const url = getShareUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      appState.addToast('Review link copied to clipboard!', 'success');
    } catch (err) {
      appState.addToast(url, 'info');
    }
  }

  function shareViaWhatsApp(token: string) {
    const url = getShareUrl(token);
    const text = encodeURIComponent(`Salam, sila semak dan sahkan draf kreatif untuk ${projectTitle || 'projek ini'} di portal rasmi SuamiSihat CAM:\n\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  async function handleRevoke(token: string) {
    try {
      await ApiClient.revokeShareLink(token);
      appState.addToast('Review link revoked.', 'info');
      activeLinks = activeLinks.filter(l => l.token !== token);
      if (generatedShare?.token === token) {
        generatedShare = null;
      }
    } catch (err: any) {
      appState.addToast(`Failed to revoke link: ${err.message}`, 'error');
    }
  }

  function closeModal() {
    open = false;
    if (onClose) onClose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="share-backdrop" onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="share-modal">
      <!-- Header -->
      <div class="share-header">
        <div class="header-left">
          <div class="share-icon-badge">
            <FluentIcons name="link" size={20} color="#00CFFF" />
          </div>
          <div>
            <h2 class="modal-title">Client Review &amp; Share Links</h2>
            <p class="modal-sub">Generate secure, password-free review links for external directors or stakeholders.</p>
          </div>
        </div>
        <button class="close-btn" onclick={closeModal} title="Close Modal">
          <FluentIcons name="close" size={16} />
        </button>
      </div>

      <div class="share-body">
        <!-- Generator Form -->
        <div class="form-card">
          <div class="form-grid">
            <div class="form-field">
              <label class="field-label" for="expiry-select">Link Expiration</label>
              <select id="expiry-select" class="form-select" bind:value={expiresInDays}>
                <option value={7}>7 Days (Recommended)</option>
                <option value={14}>14 Days (Standard)</option>
                <option value={30}>30 Days (Extended)</option>
                <option value={0}>No Expiration (Permanent)</option>
              </select>
            </div>

            <div class="form-field">
              <label class="field-label" for="perm-select">Guest Permissions</label>
              <select id="perm-select" class="form-select" bind:value={permissions}>
                <option value="review_approve">Review, Drop Pins &amp; Sign-Off</option>
                <option value="view_only">View Only (Read-Only Preview)</option>
              </select>
            </div>
          </div>

          <div class="form-field" style="margin-top: 10px;">
            <label class="field-label" for="share-note">Note / Client Reference (Optional)</label>
            <input 
              id="share-note" 
              type="text" 
              class="form-input" 
              placeholder="e.g. Sent to Marketing Director for Q3 campaign sign-off" 
              bind:value={note}
            />
          </div>

          <div class="form-actions">
            <FluentButton appearance="primary" loading={isGenerating} onclick={handleCreateLink}>
              <FluentIcons name="link" size={14} />
              <span style="margin-left: 6px;">Generate Client Review Link</span>
            </FluentButton>
          </div>
        </div>

        <!-- Newly Generated Link Display -->
        {#if generatedShare}
          <div class="generated-box">
            <div class="gen-header">
              <span class="gen-badge">
                <span class="status-dot"></span>
                LINK ACTIVE
              </span>
              <span class="gen-exp">
                {generatedShare.expiresAt ? `Expires: ${new Date(generatedShare.expiresAt).toLocaleDateString()}` : 'No Expiry'}
              </span>
            </div>

            <div class="link-url-row">
              <input type="text" readonly class="url-input" value={getShareUrl(generatedShare.token)} />
              <button class="copy-btn" onclick={() => copyShareUrl(generatedShare.token)}>
                <FluentIcons name="copy" size={13} />
                <span style="margin-left: 5px;">Copy Link</span>
              </button>
            </div>

            <div class="share-quick-btns">
              <button class="whatsapp-btn" onclick={() => shareViaWhatsApp(generatedShare.token)}>
                <FluentIcons name="chat" size={13} />
                <span style="margin-left: 5px;">Share via WhatsApp</span>
              </button>
              <a href={getShareUrl(generatedShare.token)} target="_blank" rel="noreferrer" class="preview-btn">
                <FluentIcons name="externalLink" size={13} />
                <span style="margin-left: 5px;">Test Client View</span>
              </a>
            </div>
          </div>
        {/if}

        <!-- Active Links History Table -->
        <div class="history-section">
          <div class="history-title">Active Share Links for this Workspace ({activeLinks.length})</div>
          {#if isLoadingLinks}
            <div class="loading-state">Loading active share links...</div>
          {:else if activeLinks.length === 0}
            <div class="empty-state">No active client share links for this project yet.</div>
          {:else}
            <div class="links-list">
              {#each activeLinks as link}
                <div class="link-row">
                  <div class="link-info">
                    <div class="link-meta-row">
                      <span class="perm-pill {link.permissions}">{link.permissions === 'review_approve' ? 'Sign-Off Allowed' : 'View Only'}</span>
                      <span class="created-meta">Created by {link.createdBy} on {new Date(link.createdAt).toLocaleDateString()}</span>
                      <span class="access-count">
                        <FluentIcons name="eye" size={11} />
                        <span style="margin-left: 3px;">{link.accessCount || 0} views</span>
                      </span>
                    </div>
                    {#if link.note}
                      <div class="link-note">"{link.note}"</div>
                    {/if}
                  </div>
                  <div class="link-actions">
                    <button class="icon-action-btn" title="Copy Link" onclick={() => copyShareUrl(link.token)}>
                      <FluentIcons name="copy" size={13} />
                    </button>
                    <button class="icon-action-btn" title="Share WhatsApp" onclick={() => shareViaWhatsApp(link.token)}>
                      <FluentIcons name="chat" size={13} />
                    </button>
                    <button class="revoke-btn" onclick={() => handleRevoke(link.token)}>Revoke</button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="share-footer">
        <span class="security-tip">
          <FluentIcons name="lock" size={12} color="#00CFFF" />
          <span style="margin-left: 6px;">Cryptographic tokenized access — zero credentials leaked.</span>
        </span>
        <FluentButton appearance="subtle" onclick={closeModal}>Close</FluentButton>
      </div>
    </div>
  </div>
{/if}

<style>
  .share-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1850;
    padding: 20px;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  .share-modal {
    width: 95%;
    max-width: 680px;
    max-height: 85vh;
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
  }

  .share-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(15, 23, 42, 0.95);
  }

  .header-left { display: flex; align-items: center; gap: 12px; }
  .share-icon { font-size: 24px; }
  .modal-title { font-size: 16px; font-weight: 800; color: #F8FAFC; }
  .modal-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }

  .close-btn {
    background: transparent;
    border: none;
    font-size: 16px;
    color: #94A3B8;
    cursor: pointer;
    padding: 4px 8px;
  }
  .close-btn:hover { color: #FFF; }

  .share-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Form */
  .form-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 14px 16px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .form-field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; }

  .form-select, .form-input {
    background: #1E293B;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 8px 10px;
    color: #F8FAFC;
    font-size: 12px;
    outline: none;
  }
  .form-select:focus, .form-input:focus { border-color: #21A1F7; }

  .form-actions { margin-top: 14px; display: flex; justify-content: flex-end; }

  /* Generated Box */
  .generated-box {
    background: rgba(33, 161, 247, 0.1);
    border: 1px solid rgba(33, 161, 247, 0.3);
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .gen-header { display: flex; justify-content: space-between; align-items: center; }
  .gen-badge { font-size: 10px; font-weight: 900; background: #21A1F7; color: #0F172A; padding: 2px 6px; border-radius: 4px; }
  .gen-exp { font-size: 11px; color: #94A3B8; }

  .link-url-row { display: flex; gap: 8px; }
  .url-input {
    flex: 1;
    background: #090D16;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 8px 10px;
    color: #38BDF8;
    font-size: 12px;
    font-family: monospace;
    outline: none;
  }

  .copy-btn {
    padding: 8px 14px;
    background: #043388;
    color: #FFF;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }
  .copy-btn:hover { background: #0078D4; }

  .share-quick-btns { display: flex; gap: 10px; }
  .whatsapp-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    background: #25D366;
    color: #050505;
    font-size: 12px;
    font-weight: 700;
    border: none;
    cursor: pointer;
  }
  .preview-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: #FFF;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
  }

  /* History */
  .history-section { display: flex; flex-direction: column; gap: 8px; }
  .history-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #94A3B8; }
  .empty-state { font-size: 12px; color: #64748B; padding: 8px 0; }

  .links-list { display: flex; flex-direction: column; gap: 6px; }
  .link-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
  }

  .link-meta-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
  .perm-pill { font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 3px; }
  .perm-pill.review_approve { background: rgba(16, 185, 129, 0.2); color: #34D399; }
  .perm-pill.view_only { background: rgba(148, 163, 184, 0.2); color: #94A3B8; }

  .created-meta { color: #94A3B8; }
  .access-count { color: #38BDF8; font-weight: 700; }
  .link-note { font-size: 11px; color: #CBD5E1; font-style: italic; margin-top: 2px; }

  .link-actions { display: flex; align-items: center; gap: 6px; }
  .icon-action-btn {
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: #FFF;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  .revoke-btn {
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #F87171;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 6px;
    border-radius: 4px;
    cursor: pointer;
  }
  .revoke-btn:hover { background: rgba(239, 68, 68, 0.2); }

  /* Footer */
  .share-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(11, 17, 33, 0.95);
  }
  .security-tip { font-size: 11px; color: #64748B; }
</style>
