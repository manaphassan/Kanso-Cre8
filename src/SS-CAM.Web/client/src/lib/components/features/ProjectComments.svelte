<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import type { ProjectComment, DeliverableItem } from '$lib/types';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  interface Props {
    projectId: string;
    deliverables?: DeliverableItem[];
    comments?: ProjectComment[];
    onCommentAdded?: (comment: ProjectComment) => void;
  }

  let { projectId, deliverables = [], comments = $bindable([]), onCommentAdded }: Props = $props();

  let newCommentText = $state<string>('');
  let selectedDeliverableTag = $state<string>('');
  let filterDeliverable = $state<string>('all');
  let filterResolved = $state<'all' | 'unresolved' | 'resolved'>('all');
  let isSubmitting = $state<boolean>(false);
  let isLoading = $state<boolean>(false);

  // Mention dropdown & roster profiles
  let teamMembers = $state<Array<{ username: string; name: string; role: string; staffId: string; avatar?: string; avatarColor?: string }>>([]);
  let showMentionDropdown = $state<boolean>(false);
  let mentionQuery = $state<string>('');
  let mentionCursorPos = $state<number>(0);

  onMount(async () => {
    await loadTeamRoster();
    if (!comments || comments.length === 0) {
      await refreshComments();
    }
  });

  async function loadTeamRoster() {
    try {
      const res = await ApiClient.getStaffAccounts();
      if (res && res.users) {
        teamMembers = res.users.map((u: any) => ({
          username: u.username,
          name: u.name,
          role: u.role,
          staffId: u.staffId,
          avatar: u.avatar || '',
          avatarColor: u.avatarColor || '#0078D4'
        }));
      }
    } catch (e) {
      // Non-critical fallback
    }
  }

  async function refreshComments() {
    if (!projectId) return;
    isLoading = true;
    try {
      const res = await ApiClient.getComments(projectId);
      comments = res.comments || [];
    } catch (err: any) {
      appState.addToast(`Failed to load comments: ${err.message}`, 'error');
    } finally {
      isLoading = false;
    }
  }

  const filteredComments = $derived.by(() => {
    let list = comments || [];
    if (filterDeliverable !== 'all') {
      list = list.filter(c => c.deliverableId === filterDeliverable);
    }
    if (filterResolved === 'unresolved') {
      list = list.filter(c => !c.resolved);
    } else if (filterResolved === 'resolved') {
      list = list.filter(c => c.resolved);
    }
    return list;
  });

  const matchingMentions = $derived.by(() => {
    if (!mentionQuery) return teamMembers.slice(0, 5);
    const q = mentionQuery.toLowerCase();
    return teamMembers.filter(m => 
      m.username.toLowerCase().includes(q) || 
      m.name.toLowerCase().includes(q) ||
      m.staffId.toLowerCase().includes(q)
    ).slice(0, 5);
  });

  function handleTextInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    const val = textarea.value;
    const pos = textarea.selectionStart;
    mentionCursorPos = pos;

    // Check if cursor is right after an '@'
    const textBefore = val.slice(0, pos);
    const match = textBefore.match(/@([a-zA-Z0-9_-]*)$/);

    if (match) {
      showMentionDropdown = true;
      mentionQuery = match[1];
    } else {
      showMentionDropdown = false;
    }
  }

  function insertMention(username: string) {
    const textBefore = newCommentText.slice(0, mentionCursorPos);
    const textAfter = newCommentText.slice(mentionCursorPos);
    const replaced = textBefore.replace(/@([a-zA-Z0-9_-]*)$/, `@${username} `);
    newCommentText = replaced + textAfter;
    showMentionDropdown = false;
  }

  async function handleSubmitComment() {
    if (!newCommentText.trim() || isSubmitting) return;

    isSubmitting = true;
    try {
      const res = await ApiClient.addComment(
        projectId,
        newCommentText,
        selectedDeliverableTag || null
      );
      if (res.comment) {
        comments = [...comments, res.comment];
        if (onCommentAdded) onCommentAdded(res.comment);
        newCommentText = '';
        selectedDeliverableTag = '';
        appState.addToast('Comment posted to project NAS thread', 'success');
      }
    } catch (err: any) {
      appState.addToast(`Failed to post comment: ${err.message}`, 'error');
    } finally {
      isSubmitting = false;
    }
  }

  async function toggleResolve(comment: ProjectComment) {
    try {
      const targetState = !comment.resolved;
      await ApiClient.resolveComment(projectId, comment.id, targetState);
      comment.resolved = targetState;
      comments = [...comments];
      appState.addToast(targetState ? 'Thread marked as resolved' : 'Thread reopened', 'info');
    } catch (err: any) {
      appState.addToast(`Failed to update comment: ${err.message}`, 'error');
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await ApiClient.deleteComment(projectId, commentId);
      comments = comments.filter(c => c.id !== commentId);
      appState.addToast('Comment deleted', 'info');
    } catch (err: any) {
      appState.addToast(`Failed to delete comment: ${err.message}`, 'error');
    }
  }

  function formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMin = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
</script>

<div class="comments-container">
  <!-- Top Control Bar -->
  <div class="comments-header">
    <div class="header-title-group">
      <h3 class="section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
        </svg>
        In-Project Discussion & Revision Feedback
      </h3>
      <span class="thread-count">{comments.length} comments</span>
    </div>

    <!-- Filters -->
    <div class="filter-controls">
      {#if deliverables.length > 0}
        <select class="filter-select" bind:value={filterDeliverable}>
          <option value="all">All Deliverables ({comments.length})</option>
          {#each deliverables as d}
            <option value={d.id}>{d.name} ({d.format})</option>
          {/each}
        </select>
      {/if}

      <div class="resolved-segmented">
        <button
          class="seg-btn"
          class:active={filterResolved === 'all'}
          onclick={() => (filterResolved = 'all')}
        >All</button>
        <button
          class="seg-btn"
          class:active={filterResolved === 'unresolved'}
          onclick={() => (filterResolved = 'unresolved')}
        >Open</button>
        <button
          class="seg-btn"
          class:active={filterResolved === 'resolved'}
          onclick={() => (filterResolved = 'resolved')}
        >Resolved</button>
      </div>

      <button class="refresh-btn" onclick={refreshComments} title="Refresh comments" aria-label="Refresh comments">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Timeline Feed -->
  <div class="timeline-feed">
    {#if isLoading}
      <div class="loading-state">Loading comments from NAS…</div>
    {:else if filteredComments.length === 0}
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <p class="empty-title">No comments yet</p>
        <p class="empty-desc">
          Start the conversation, request specific revisions, or tag team members with <code class="tag-code">@username</code>.
        </p>
      </div>
    {:else}
      <div class="comments-list">
        {#each filteredComments as comment (comment.id)}
          {@const authorMember = teamMembers.find(m => (m.name && m.name.toLowerCase() === (comment.author || '').toLowerCase()) || (m.username && m.username.toLowerCase() === (comment.author || '').toLowerCase()) || (m.staffId && m.staffId.toLowerCase() === (comment.author || '').toLowerCase()))}
          {@const isPhoto = comment.authorAvatar && (comment.authorAvatar.startsWith('data:') || comment.authorAvatar.startsWith('http') || comment.authorAvatar.startsWith('/'))}
          {@const avatarSrc = isPhoto ? comment.authorAvatar : (authorMember?.avatar || '')}
          {@const avatarBg = (!isPhoto && comment.authorAvatar) ? comment.authorAvatar : (authorMember?.avatarColor || '#043388')}
          <div class="comment-card" class:is-resolved={comment.resolved}>
            <div class="comment-avatar" style="background: {avatarBg};">
              {#if avatarSrc}
                <img src={avatarSrc} alt={comment.author} class="avatar-photo" />
              {:else}
                {getInitials(comment.author)}
              {/if}
            </div>

            <div class="comment-content-wrap">
              <div class="comment-header-row">
                <div class="author-meta">
                  <span class="author-name">{comment.author}</span>
                  <span class="role-tag role-{comment.authorRole?.toLowerCase() || 'user'}">{comment.authorRole}</span>
                  {#if comment.deliverableId}
                    <span class="deliverable-tag">
                      🎯 {deliverables.find(d => d.id === comment.deliverableId)?.name || comment.deliverableId}
                    </span>
                  {/if}
                </div>

                <div class="comment-actions-right">
                  <span class="comment-time">{formatTime(comment.timestamp)}</span>
                  <button
                    class="btn-resolve"
                    class:resolved={comment.resolved}
                    onclick={() => toggleResolve(comment)}
                    title={comment.resolved ? 'Reopen comment thread' : 'Mark as resolved'}
                  >
                    {#if comment.resolved}
                      ✓ Resolved
                    {:else}
                      ○ Resolve
                    {/if}
                  </button>

                  {#if appState.currentUser?.role === 'admin' || appState.currentUser?.name === comment.author}
                    <button class="btn-delete" onclick={() => handleDelete(comment.id)} title="Delete comment">
                      ✕
                    </button>
                  {/if}
                </div>
              </div>

              <!-- Comment Body with Highlighted Mentions -->
              <div class="comment-body">
                {#each comment.content.split(/(@[a-zA-Z0-9_-]+)/g) as segment}
                  {#if segment.startsWith('@')}
                    <span class="mention-chip">{segment}</span>
                  {:else}
                    {segment}
                  {/if}
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Composer Box -->
  <div class="composer-container">
    <div class="composer-header">
      <span class="composer-prompt">Add Feedback or Comment</span>
      {#if deliverables.length > 0}
        <select class="deliverable-link-select" bind:value={selectedDeliverableTag}>
          <option value="">Attach to General Project</option>
          {#each deliverables as d}
            <option value={d.id}>🎯 {d.name} ({d.format})</option>
          {/each}
        </select>
      {/if}
    </div>

    <div class="textarea-relative-wrap">
      <textarea
        class="composer-textarea"
        placeholder="Type a message, suggest changes, or tag a colleague using @username..."
        rows="3"
        bind:value={newCommentText}
        oninput={handleTextInput}
        onkeydown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmitComment();
          }
        }}
      ></textarea>

      <!-- Autocomplete Dropdown -->
      {#if showMentionDropdown && matchingMentions.length > 0}
        <div class="mention-dropdown">
          <div class="mention-dropdown-title">Team Members</div>
          {#each matchingMentions as member}
            <button class="mention-item" onclick={() => insertMention(member.username)}>
              <div class="mention-avatar" style="background: {member.avatarColor || '#043388'};">
                {#if member.avatar}
                  <img src={member.avatar} alt={member.name} class="avatar-photo" />
                {:else}
                  {getInitials(member.name)}
                {/if}
              </div>
              <div class="mention-info">
                <span class="m-name">{member.name}</span>
                <span class="m-username">@{member.username} · {member.role}</span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="composer-footer">
      <span class="keyboard-hint">Press <b>Ctrl + Enter</b> to post</span>
      <FluentButton
        appearance="primary"
        onclick={handleSubmitComment}
        disabled={!newCommentText.trim() || isSubmitting}
      >
        {isSubmitting ? 'Posting…' : 'Post Comment'}
      </FluentButton>
    </div>
  </div>
</div>

<style>
  .comments-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg, 12px);
    padding: 20px 24px;
    box-shadow: var(--shadow-sm);
  }

  .comments-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--surface-card-border);
  }

  .header-title-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .section-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .thread-count {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-brand, #043388);
    background: var(--brand-tint, #EBF4FE);
    padding: 2px 8px;
    border-radius: 9999px;
    border: 1px solid #BFDBFE;
  }

  .filter-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-select {
    font-size: 12px;
    padding: 5px 10px;
    border-radius: 6px;
    border: 1px solid var(--surface-card-border);
    background: var(--bg-app);
    color: var(--text-primary);
    font-family: inherit;
    outline: none;
  }

  .resolved-segmented {
    display: flex;
    background: var(--bg-app);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    overflow: hidden;
  }

  .seg-btn {
    border: none;
    background: transparent;
    padding: 4px 10px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.12s;
  }
  .seg-btn.active {
    background: var(--brand-primary, #043388);
    color: #FFFFFF;
  }

  .refresh-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid var(--surface-card-border);
    background: var(--bg-app);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.12s;
  }
  .refresh-btn:hover {
    color: var(--text-primary);
    border-color: var(--brand-accent);
  }

  /* Feed */
  .timeline-feed {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 480px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .empty-state {
    text-align: center;
    padding: 36px 16px;
    background: var(--bg-app);
    border-radius: 8px;
    border: 1px dashed var(--surface-card-border);
  }
  .empty-icon { font-size: 28px; margin-bottom: 6px; }
  .empty-title { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; }
  .empty-desc { font-size: 12px; color: var(--text-secondary); margin: 0; }
  .tag-code { font-family: monospace; background: var(--brand-tint); color: var(--text-brand); padding: 1px 4px; border-radius: 4px; }

  .loading-state {
    text-align: center;
    padding: 24px;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .comments-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .comment-card {
    display: flex;
    gap: 12px;
    padding: 12px 14px;
    background: var(--surface-card-subtle, #F8FAFC);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    transition: background 0.12s;
  }
  .comment-card.is-resolved {
    opacity: 0.75;
    background: var(--bg-app);
  }

  .comment-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }
  .comment-avatar img.avatar-photo,
  .mention-avatar img.avatar-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }

  .comment-content-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .comment-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }

  .author-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .author-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .role-tag {
    font-size: 10px;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .role-admin { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
  .role-manager { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
  .role-user { background: #EBF4FE; color: #043388; border: 1px solid #BFDBFE; }

  .deliverable-tag {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    background: var(--bg-app);
    border: 1px solid var(--surface-card-border);
    padding: 1px 7px;
    border-radius: 4px;
  }

  .comment-actions-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .comment-time {
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .btn-resolve {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--surface-card-border);
    background: var(--bg-app);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.12s;
  }
  .btn-resolve:hover {
    background: #ECFDF5;
    color: #047857;
    border-color: #A7F3D0;
  }
  .btn-resolve.resolved {
    background: #ECFDF5;
    color: #047857;
    border-color: #A7F3D0;
  }

  .btn-delete {
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    border-radius: 4px;
  }
  .btn-delete:hover {
    color: #EF4444;
    background: #FEF2F2;
  }

  .comment-body {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .mention-chip {
    font-weight: 700;
    color: var(--text-brand, #043388);
    background: var(--brand-tint, #EBF4FE);
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid #BFDBFE;
  }

  /* Composer */
  .composer-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 14px;
    border-top: 1px solid var(--surface-card-border);
  }

  .composer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .composer-prompt {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .deliverable-link-select {
    font-size: 11.5px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--surface-card-border);
    background: var(--bg-app);
    color: var(--text-secondary);
    outline: none;
  }

  .textarea-relative-wrap {
    position: relative;
  }

  .composer-textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--surface-card-border);
    background: var(--bg-app);
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .composer-textarea:focus {
    border-color: var(--brand-accent);
    box-shadow: 0 0 0 3px rgba(33, 161, 247, 0.15);
  }

  .composer-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .keyboard-hint {
    font-size: 11px;
    color: var(--text-tertiary);
  }
  .keyboard-hint b { color: var(--text-secondary); }

  /* Mention Dropdown */
  .mention-dropdown {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 12px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    min-width: 220px;
    z-index: 100;
    overflow: hidden;
  }

  .mention-dropdown-title {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-tertiary);
    padding: 6px 10px 4px;
    background: var(--bg-app);
    border-bottom: 1px solid var(--surface-card-border);
  }

  .mention-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
    font-family: inherit;
  }
  .mention-item:hover {
    background: var(--surface-card-subtle);
  }

  .mention-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--brand-primary, #043388);
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .mention-info {
    display: flex;
    flex-direction: column;
  }
  .m-name { font-size: 12px; font-weight: 700; color: var(--text-primary); }
  .m-username { font-size: 10.5px; color: var(--text-secondary); }
</style>
