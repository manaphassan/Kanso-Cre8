<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentIcons from '$lib/components/ui/FluentIcons.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';

  // ─── Types ────────────────────────────────────────────────────────────────
  interface CreativeOrder {
    id: string;
    title: string;
    entity: string;
    priority: string;
    format: string;
    copy: string;
    targetDate: string;
    attachmentNote?: string;
    requester: string;
    requesterRole?: string;
    status: 'pending' | 'in_progress' | 'for_approval' | 'done' | 'cancelled';
    submittedAt: string;
    updatedAt: string;
    assignedTo: string | null;
    projectId: string | null;
  }

  // ─── State ─────────────────────────────────────────────────────────────────
  let orders       = $state<CreativeOrder[]>([]);
  let isLoading    = $state(false);
  let isSubmitting = $state(false);
  let showForm     = $state(false);
  let filterStatus = $state('all');
  let activeOrderId = $state<string | null>(null);

  // Form fields
  let f_title          = $state('');
  let f_entity         = $state('');
  let f_priority       = $state('');
  let f_format         = $state('');
  let f_copy           = $state('');
  let f_targetDate     = $state('');
  let f_attachmentNote = $state('');
  let formError        = $state('');
  let submitSuccess    = $state(false);

  // ─── Computed ──────────────────────────────────────────────────────────────
  const filteredOrders = $derived(
    filterStatus === 'all'
      ? orders
      : orders.filter(o => o.status === filterStatus)
  );

  const pendingCount    = $derived(orders.filter(o => o.status === 'pending').length);
  const inProgressCount = $derived(orders.filter(o => o.status === 'in_progress').length);
  const approvalCount   = $derived(orders.filter(o => o.status === 'for_approval').length);
  const doneCount       = $derived(orders.filter(o => o.status === 'done').length);

  const ENTITIES = [
    { id: 'SSC',  label: 'SSC Clinic',    emoji: '🏥' },
    { id: 'SSE',  label: 'SSE E-Commerce',emoji: '🛒' },
    { id: 'SSH',  label: 'SSH Holding',   emoji: '🏢' },
    { id: 'SST',  label: 'SST Technology',emoji: '⚙️' },
    { id: 'SSW',  label: 'SSW Wellness',  emoji: '🌿' },
  ];

  const PRIORITIES = [
    { id: 'tier_1',  label: 'Tier 1 — Standard Sprint',     sub: '3–5 working days',    color: '#10B981', bg: 'rgba(16, 185, 129, 0.10)' },
    { id: 'tier_2',  label: 'Tier 2 — 24h Fast-Track',      sub: 'Next business day',   color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.10)' },
    { id: 'tier_3',  label: 'Tier 3 — Urgent / Same Day',   sub: 'KPI-critical only',   color: '#EF4444', bg: 'rgba(239, 68, 68, 0.10)' },
  ];

  const FORMATS = [
    { id: '9_16_video',    label: '9:16 Video',      sub: 'TikTok / Reels / Story',     icon: 'video' },
    { id: '1_1_feed',      label: '1:1 Social Feed', sub: 'Instagram / LinkedIn / FB',  icon: 'image' },
    { id: '16_9_landscape',label: '16:9 Landscape',  sub: 'YouTube / Slide / TV',       icon: 'image' },
    { id: 'print_posm',    label: 'Print POSM',      sub: 'A3/A2 Banner / X-Banner',    icon: 'pdf' },
    { id: 'print_digital', label: 'Digital Banner',  sub: 'Web / Email / Ads',          icon: 'image' },
    { id: 'other',         label: 'Other / Custom',  sub: 'Specify in copy field',      icon: 'file' },
  ];

  const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    pending:      { label: 'Pending',       color: '#94A3B8', bg: 'rgba(148,163,184,0.10)' },
    in_progress:  { label: 'In Progress',   color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
    for_approval: { label: 'For Approval',  color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
    done:         { label: 'Done',          color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
    cancelled:    { label: 'Cancelled',     color: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
  };

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  onMount(() => { loadOrders(); });

  async function loadOrders() {
    isLoading = true;
    try {
      const res = await ApiClient.request<{ success: boolean; orders: CreativeOrder[] }>('/orders');
      orders = res.orders || [];
    } catch (err: any) {
      appState.addToast('Failed to load creative orders.', 'error', 'Order Queue');
    } finally {
      isLoading = false;
    }
  }

  // ─── Form ──────────────────────────────────────────────────────────────────
  function openForm() {
    submitSuccess  = false;
    formError      = '';
    f_title        = '';
    f_entity       = '';
    f_priority     = '';
    f_format       = '';
    f_copy         = '';
    f_targetDate   = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    f_attachmentNote = '';
    showForm = true;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    formError    = '';
    isSubmitting = true;

    try {
      await ApiClient.request('/orders', {
        method: 'POST',
        body: JSON.stringify({
          title:          f_title.trim(),
          entity:         f_entity,
          priority:       f_priority,
          format:         f_format,
          copy:           f_copy.trim(),
          targetDate:     f_targetDate,
          attachmentNote: f_attachmentNote.trim(),
        }),
      });
      submitSuccess = true;
      appState.addToast('Creative request submitted! Our team will pick it up shortly.', 'success', 'Order Received');
      await loadOrders();
      setTimeout(() => { showForm = false; submitSuccess = false; }, 1400);
    } catch (err: any) {
      formError = err.message || 'Submission failed. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await ApiClient.request(`/orders/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      appState.addToast('Order status updated.', 'success');
      await loadOrders();
    } catch (err: any) {
      appState.addToast(err.message || 'Update failed.', 'error');
    }
  }

  async function cancelOrder(id: string) {
    try {
      await ApiClient.request(`/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
      appState.addToast('Order cancelled.', 'warning', 'Order Cancelled');
      await loadOrders();
    } catch (err: any) {
      appState.addToast(err.message || 'Cancel failed.', 'error');
    }
  }

  function formatDate(iso: string) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }

  function priorityLabel(id: string) {
    return PRIORITIES.find(p => p.id === id)?.label ?? id ?? '—';
  }
  function entityLabel(id: string) {
    return ENTITIES.find(e => e.id === id)?.label ?? id ?? '—';
  }
  function formatLabel(id: string) {
    return FORMATS.find(f => f.id === id)?.label ?? id ?? '—';
  }

  const isDesigner = $derived(
    ['admin', 'Art Director', 'Designer', 'Lead Designer'].includes(appState.currentUser?.role || '')
  );

  const formValid = $derived(
    f_title.trim().length > 0 &&
    f_entity.length > 0 &&
    f_priority.length > 0 &&
    f_format.length > 0 &&
    f_copy.trim().length > 0 &&
    f_targetDate.length > 0
  );
</script>

<div class="order-view-container">

  <!-- ═══ HEADER ═══════════════════════════════════════════════════════════ -->
  <div class="view-header">
    <div class="header-left">
      <div class="header-tag">
        <span class="badge-accent">Creative Operations</span>
        <span class="header-meta">{orders.length} Requests</span>
      </div>
      <h1 class="view-title">Creative Order Form</h1>
      <p class="view-subtitle">Submit a creative request in under 60 seconds. No WhatsApp, no voice notes, no lost briefs.</p>
    </div>
    <div class="header-actions">
      <FluentButton appearance="primary" size="sm" onclick={openForm}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 5px" aria-hidden="true">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
        </svg>
        + New Creative Request
      </FluentButton>
      <FluentButton appearance="secondary" size="sm" onclick={loadOrders}>
        <FluentIcons name="refresh" size={13} />
        <span style="margin-left: 5px">Refresh</span>
      </FluentButton>
    </div>
  </div>

  <!-- ═══ KPI PILLS ═════════════════════════════════════════════════════════ -->
  <div class="kpi-bar">
    {#each [
      { key: 'all',         label: 'All Requests', count: orders.length,  color: undefined },
      { key: 'pending',     label: 'Pending',       count: pendingCount,    color: '#94A3B8' },
      { key: 'in_progress', label: 'In Progress',   count: inProgressCount, color: '#3B82F6' },
      { key: 'for_approval',label: 'For Approval',  count: approvalCount,   color: '#F59E0B' },
      { key: 'done',        label: 'Done',          count: doneCount,       color: '#10B981' },
    ] as pill}
      <button
        class="kpi-pill {filterStatus === pill.key ? 'active' : ''}"
        onclick={() => filterStatus = pill.key}
        aria-pressed={filterStatus === pill.key}
      >
        {#if pill.color}
          <span class="kpi-dot" style="background: {pill.color};"></span>
        {/if}
        <span class="kpi-label">{pill.label}</span>
        <span class="kpi-count">{pill.count}</span>
      </button>
    {/each}
  </div>

  <!-- ═══ FORM MODAL ════════════════════════════════════════════════════════ -->
  {#if showForm}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="form-backdrop" onclick={(e) => { if (e.target === e.currentTarget) showForm = false; }}>
      <div class="form-sheet" role="dialog" aria-modal="true" aria-label="New Creative Request">

        {#if submitSuccess}
          <div class="success-celebration">
            <div class="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <p class="success-title">Request Submitted!</p>
            <p class="success-sub">Your creative order has been queued. The team will pick it up in your priority window.</p>
          </div>

        {:else}
          <!-- Form Header -->
          <div class="form-header">
            <div>
              <div class="form-eyebrow">Creative Operations</div>
              <h2 class="form-title">New Creative Request</h2>
              <p class="form-subtitle">Complete all 6 fields. Estimated time: &lt; 60 seconds.</p>
            </div>
            <button class="form-close-btn" onclick={() => showForm = false} aria-label="Close form">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <!-- Progress Rail -->
          <div class="form-progress">
            {#each [f_title, f_entity, f_priority, f_format, f_copy, f_targetDate] as val, i}
              <div class="prog-seg {val.trim().length > 0 ? 'filled' : ''}" aria-hidden="true"></div>
            {/each}
          </div>

          <form class="form-body" onsubmit={handleSubmit}>

            <!-- ① Title -->
            <div class="field-group">
              <label class="field-label" for="f-title">
                <span class="field-num">①</span>
                Project Title <span class="req">*</span>
              </label>
              <input
                id="f-title"
                type="text"
                class="text-input"
                bind:value={f_title}
                placeholder="e.g. ANDROLAB Alpha — TikTok Video Hook Batch"
                maxlength="120"
                required
                autocomplete="off"
              />
              <span class="char-count">{f_title.length}/120</span>
            </div>

            <!-- ② Requesting Entity -->
            <div class="field-group">
              <label class="field-label" for="f-entity-group">
                <span class="field-num">②</span>
                Requesting Entity <span class="req">*</span>
              </label>
              <div id="f-entity-group" class="chip-row" role="radiogroup" aria-label="Requesting Entity">
                {#each ENTITIES as ent}
                  <label class="choice-chip {f_entity === ent.id ? 'selected' : ''}" title={ent.label}>
                    <input type="radio" name="entity" value={ent.id} bind:group={f_entity} class="sr-only" />
                    <span class="chip-emoji">{ent.emoji}</span>
                    <span class="chip-label">{ent.id}</span>
                    <span class="chip-sublabel">{ent.label.replace(ent.id + ' ', '')}</span>
                  </label>
                {/each}
              </div>
            </div>

            <!-- ③ Priority Tier -->
            <div class="field-group">
              <label class="field-label" for="f-priority-group">
                <span class="field-num">③</span>
                Priority Tier <span class="req">*</span>
              </label>
              <div id="f-priority-group" class="priority-row" role="radiogroup" aria-label="Priority Tier">
                {#each PRIORITIES as p}
                  <label
                    class="priority-card {f_priority === p.id ? 'selected' : ''}"
                    style="--pcolor: {p.color}; --pbg: {p.bg};"
                  >
                    <input type="radio" name="priority" value={p.id} bind:group={f_priority} class="sr-only" />
                    <span class="p-dot" style="background: {p.color};" aria-hidden="true"></span>
                    <span class="p-label">{p.label}</span>
                    <span class="p-sub">{p.sub}</span>
                  </label>
                {/each}
              </div>
            </div>

            <!-- ④ Format & Size -->
            <div class="field-group">
              <label class="field-label" for="f-format-group">
                <span class="field-num">④</span>
                Format & Size <span class="req">*</span>
              </label>
              <div id="f-format-group" class="format-grid" role="radiogroup" aria-label="Format and Size">
                {#each FORMATS as fmt}
                  <label class="format-card {f_format === fmt.id ? 'selected' : ''}">
                    <input type="radio" name="format" value={fmt.id} bind:group={f_format} class="sr-only" />
                    <span class="fmt-icon" aria-hidden="true">
                      <FluentIcons name={fmt.icon as any} size={14} />
                    </span>
                    <span class="fmt-label">{fmt.label}</span>
                    <span class="fmt-sub">{fmt.sub}</span>
                  </label>
                {/each}
              </div>
            </div>

            <!-- ⑤ Copy / Script -->
            <div class="field-group">
              <label class="field-label" for="f-copy">
                <span class="field-num">⑤</span>
                The Copy / Script <span class="req">*</span>
              </label>
              <textarea
                id="f-copy"
                class="text-area"
                bind:value={f_copy}
                placeholder="Paste your headline, hook, promo price, call-to-action, or a link to the script (e.g. SSNAS doc or Google Drive)."
                rows="4"
                required
              ></textarea>
              <span class="field-hint">Include: headline, promo price, CTA, doctor name, or a doc link. The more specific, the faster the team works.</span>
            </div>

            <!-- ⑥ Target Date -->
            <div class="field-row">
              <div class="field-group" style="flex: 1;">
                <label class="field-label" for="f-date">
                  <span class="field-num">⑥</span>
                  Target Delivery Date <span class="req">*</span>
                </label>
                <input
                  id="f-date"
                  type="date"
                  class="text-input"
                  bind:value={f_targetDate}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div class="field-group" style="flex: 1;">
                <label class="field-label" for="f-attachment">
                  Asset / Reference Link
                  <span class="optional-tag">Optional</span>
                </label>
                <input
                  id="f-attachment"
                  type="text"
                  class="text-input"
                  bind:value={f_attachmentNote}
                  placeholder="\\SSNAS\folder\ or drive.google.com/..."
                />
              </div>
            </div>

            <!-- Error Banner -->
            {#if formError}
              <div class="error-banner" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {formError}
              </div>
            {/if}

            <!-- Form Actions -->
            <div class="form-footer">
              <button type="button" class="cancel-btn" onclick={() => showForm = false}>Cancel</button>
              <button
                type="submit"
                class="submit-btn {!formValid ? 'disabled' : ''}"
                disabled={!formValid || isSubmitting}
              >
                {#if isSubmitting}
                  <span class="btn-spinner" aria-hidden="true"></span>
                  Submitting…
                {:else}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                  Submit Creative Request
                {/if}
              </button>
            </div>
          </form>
        {/if}
      </div>
    </div>
  {/if}

  <!-- ═══ ORDER QUEUE TABLE ════════════════════════════════════════════════ -->
  {#if isLoading}
    <div class="state-card">
      <div class="spinner-large" aria-hidden="true"></div>
      <p class="state-title">Loading creative order queue…</p>
    </div>

  {:else if filteredOrders.length === 0}
    <div class="state-card empty-state">
      <div class="empty-icon-box" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </div>
      <p class="state-title">{filterStatus === 'all' ? 'No creative requests yet' : `No ${filterStatus.replace('_', ' ')} requests`}</p>
      <p class="state-desc">
        {filterStatus === 'all'
          ? 'Be the first to submit a creative request — it takes under 60 seconds.'
          : 'Try a different filter or submit a new request.'}
      </p>
      <FluentButton appearance="primary" size="sm" onclick={openForm}>+ New Creative Request</FluentButton>
    </div>

  {:else}
    <div class="order-queue-table">
      <table class="queue-table" aria-label="Creative Order Queue">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Project Title</th>
            <th>Entity</th>
            <th>Priority</th>
            <th>Format</th>
            <th>Target</th>
            <th>Requester</th>
            <th>Status</th>
            {#if isDesigner}
              <th style="text-align: right;">Actions</th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each filteredOrders as order (order.id)}
            {@const sm = STATUS_META[order.status] || STATUS_META['pending']}
            {@const pr = PRIORITIES.find(p => p.id === order.priority)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <tr
              class="order-row {activeOrderId === order.id ? 'expanded' : ''}"
              onclick={() => activeOrderId = activeOrderId === order.id ? null : order.id}
            >
              <td>
                <span class="order-id-badge">{order.id}</span>
              </td>
              <td>
                <span class="order-title-cell">{order.title}</span>
              </td>
              <td>
                <span class="entity-badge">{order.entity || '—'}</span>
              </td>
              <td>
                <span class="priority-badge" style="color: {pr?.color || '#94A3B8'}; background: {pr?.bg || 'transparent'};">
                  {#if order.priority === 'tier_3'}⚡{:else if order.priority === 'tier_2'}🔶{:else}🟢{/if}
                  {order.priority === 'tier_1' ? 'Sprint' : order.priority === 'tier_2' ? '24h Fast' : 'Urgent'}
                </span>
              </td>
              <td>
                <span class="format-tag">{formatLabel(order.format)}</span>
              </td>
              <td>
                <span class="date-tag">{formatDate(order.targetDate)}</span>
              </td>
              <td>
                <span class="requester-tag">{order.requester}</span>
              </td>
              <td>
                <span class="status-pill" style="color: {sm.color}; background: {sm.bg};">
                  <span class="status-dot" style="background: {sm.color};" aria-hidden="true"></span>
                  {sm.label}
                </span>
              </td>
              {#if isDesigner}
                <td style="text-align: right;" onclick={(e) => e.stopPropagation()}>
                  <div class="action-row">
                    {#if order.status === 'pending'}
                      <button class="tbl-btn tbl-btn-primary" onclick={() => updateStatus(order.id, 'in_progress')} title="Start Working">
                        <FluentIcons name="bolt" size={12} /> Start
                      </button>
                    {:else if order.status === 'in_progress'}
                      <button class="tbl-btn tbl-btn-warn" onclick={() => updateStatus(order.id, 'for_approval')} title="Send for Approval">
                        <FluentIcons name="eye" size={12} /> Review
                      </button>
                    {:else if order.status === 'for_approval'}
                      <button class="tbl-btn tbl-btn-success" onclick={() => updateStatus(order.id, 'done')} title="Mark Done">
                        <FluentIcons name="checkmark" size={12} /> Done
                      </button>
                    {/if}
                    {#if order.status !== 'done' && order.status !== 'cancelled'}
                      <button class="tbl-btn tbl-btn-danger" onclick={() => cancelOrder(order.id)} title="Cancel Order">
                        <FluentIcons name="close" size={12} />
                      </button>
                    {/if}
                  </div>
                </td>
              {/if}
            </tr>

            <!-- Expanded detail panel -->
            {#if activeOrderId === order.id}
              <tr class="order-detail-row">
                <td colspan={isDesigner ? 9 : 8}>
                  <div class="order-detail-panel">
                    <div class="detail-grid">
                      <div class="detail-block">
                        <span class="detail-label">Copy / Script</span>
                        <pre class="detail-copy">{order.copy}</pre>
                      </div>
                      {#if order.attachmentNote}
                        <div class="detail-block">
                          <span class="detail-label">Asset / Reference</span>
                          <span class="detail-value attachment-value">{order.attachmentNote}</span>
                        </div>
                      {/if}
                      <div class="detail-block">
                        <span class="detail-label">Submitted</span>
                        <span class="detail-value">{formatDate(order.submittedAt)}</span>
                      </div>
                      {#if order.assignedTo}
                        <div class="detail-block">
                          <span class="detail-label">Assigned To</span>
                          <span class="detail-value">{order.assignedTo}</span>
                        </div>
                      {/if}
                      {#if order.projectId}
                        <div class="detail-block">
                          <span class="detail-label">Project Link</span>
                          <button
                            class="proj-link-btn"
                            onclick={() => appState.navigate('project-detail', { id: order.projectId! })}
                          >
                            Open Project Workspace →
                          </button>
                        </div>
                      {/if}
                    </div>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ═══ EXPLAINER CARD ════════════════════════════════════════════════════ -->
  <div class="explainer-card">
    <div class="explainer-grid">
      <div class="explainer-col">
        <h3 class="explainer-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          For Requesters (Marketing, Clinic, BD)
        </h3>
        <ul class="explainer-list">
          <li>⚡ <strong>Under 60 seconds</strong> — 6 fields, no complicated forms.</li>
          <li>📬 <strong>Automatic Tracking</strong> — See real-time status from Pending → Done.</li>
          <li>🔍 <strong>Proof of Request</strong> — No more "I sent a WhatsApp last week" disputes.</li>
          <li>📁 <strong>Paste any SSNAS or Drive link</strong> for raw assets.</li>
        </ul>
      </div>
      <div class="explainer-divider" aria-hidden="true"></div>
      <div class="explainer-col">
        <h3 class="explainer-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981" aria-hidden="true">
            <path d="M7 14l5-5 5 5z"/>
          </svg>
          For Creative Team (Haru & Designers)
        </h3>
        <ul class="explainer-list">
          <li>🛑 <strong>No more chasing</strong> — Everything is in one place, structured.</li>
          <li>🛡️ <strong>Zero guesswork</strong> — Title, size, copy, and deadline upfront.</li>
          <li>🏃 <strong>Priority Queue</strong> — Tier 1 / Tier 2 / Tier 3 triage is automatic.</li>
          <li>🔗 <strong>Linked to Projects</strong> — Convert any order to a Project folder in one click.</li>
        </ul>
      </div>
    </div>
  </div>

</div>

<style>
  /* ─── Container ─── */
  .order-view-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-bottom: 48px;
  }

  /* ─── Header ─── */
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
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(59, 130, 246, 0.12);
    color: #60A5FA;
    border: 1px solid rgba(59, 130, 246, 0.25);
  }
  .header-meta {
    font-size: 12px;
    color: var(--text-tertiary);
    font-weight: 500;
  }
  .view-title {
    font-size: 24px;
    font-weight: 900;
    color: var(--text-primary);
    margin: 0 0 4px;
    letter-spacing: -0.5px;
  }
  .view-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }
  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  /* ─── KPI Bar ─── */
  .kpi-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .kpi-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12.5px;
    font-weight: 600;
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.13s;
  }
  .kpi-pill:hover {
    color: var(--text-primary);
    border-color: var(--brand-accent, #0078D4);
  }
  .kpi-pill.active {
    background: var(--brand-tint, rgba(0,120,212,0.1));
    color: var(--brand-accent, #0078D4);
    border-color: var(--brand-accent, #0078D4);
    font-weight: 700;
  }
  .kpi-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .kpi-count {
    font-weight: 800;
    font-size: 12px;
    opacity: 0.8;
  }

  /* ─── Form Backdrop / Sheet ─── */
  .form-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    z-index: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .form-sheet {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 16px;
    width: 100%;
    max-width: 680px;
    max-height: 92vh;
    overflow-y: auto;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
    animation: sheet-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes sheet-in {
    from { transform: scale(0.94); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }

  /* Success Celebration */
  .success-celebration {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 32px;
    text-align: center;
    animation: fade-in 0.35s ease;
  }
  @keyframes fade-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
  .success-icon {
    margin-bottom: 20px;
    animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes pop-in { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .success-title {
    font-size: 22px;
    font-weight: 900;
    color: var(--text-primary);
    margin: 0 0 8px;
  }
  .success-sub {
    font-size: 13.5px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
    max-width: 400px;
  }

  /* Form Header */
  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px 24px 0;
    gap: 12px;
  }
  .form-eyebrow {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--brand-accent, #0078D4);
    margin-bottom: 4px;
  }
  .form-title {
    font-size: 20px;
    font-weight: 900;
    color: var(--text-primary);
    margin: 0 0 4px;
  }
  .form-subtitle {
    font-size: 12.5px;
    color: var(--text-secondary);
    margin: 0;
  }
  .form-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.12s;
  }
  .form-close-btn:hover {
    background: var(--surface-card-hover, rgba(239,68,68,0.1));
    color: #EF4444;
    border-color: #EF4444;
  }

  /* Progress Bar */
  .form-progress {
    display: flex;
    gap: 4px;
    padding: 16px 24px 0;
  }
  .prog-seg {
    flex: 1;
    height: 3px;
    border-radius: 2px;
    background: var(--surface-card-border);
    transition: background 0.25s;
  }
  .prog-seg.filled {
    background: var(--brand-accent, #0078D4);
  }

  /* Form Body */
  .form-body {
    padding: 16px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
  }
  .field-row {
    display: flex;
    gap: 16px;
  }
  @media (max-width: 560px) {
    .field-row { flex-direction: column; }
  }
  .field-label {
    font-size: 12.5px;
    font-weight: 800;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .field-num {
    font-size: 13px;
    color: var(--brand-accent, #0078D4);
    font-weight: 900;
  }
  .req { color: #EF4444; font-weight: 700; }
  .optional-tag {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-tertiary);
    background: var(--surface-card-border);
    padding: 1px 5px;
    border-radius: 3px;
    margin-left: 4px;
  }
  .char-count {
    position: absolute;
    right: 8px;
    bottom: 8px;
    font-size: 10.5px;
    color: var(--text-tertiary);
    pointer-events: none;
  }
  .text-input {
    width: 100%;
    padding: 9px 12px;
    border-radius: 8px;
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card-subtle, rgba(0,0,0,0.04));
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    transition: border 0.12s;
    box-sizing: border-box;
  }
  .text-input:focus {
    outline: none;
    border-color: var(--brand-accent, #0078D4);
    box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.12);
  }
  .text-area {
    width: 100%;
    padding: 9px 12px;
    border-radius: 8px;
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card-subtle, rgba(0,0,0,0.04));
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    line-height: 1.55;
    resize: vertical;
    min-height: 90px;
    transition: border 0.12s;
    box-sizing: border-box;
  }
  .text-area:focus {
    outline: none;
    border-color: var(--brand-accent, #0078D4);
    box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.12);
  }
  .field-hint {
    font-size: 11.5px;
    color: var(--text-tertiary);
    line-height: 1.45;
  }

  /* Entity Chips */
  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .choice-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1.5px solid var(--surface-card-border);
    background: var(--surface-card);
    cursor: pointer;
    transition: all 0.13s;
    min-width: 70px;
    text-align: center;
  }
  .choice-chip:hover {
    border-color: var(--brand-accent, #0078D4);
    background: var(--brand-tint, rgba(0,120,212,0.06));
  }
  .choice-chip.selected {
    border-color: var(--brand-accent, #0078D4);
    background: var(--brand-tint, rgba(0,120,212,0.1));
    box-shadow: 0 0 0 2px rgba(0,120,212,0.18);
  }
  .chip-emoji { font-size: 18px; margin-bottom: 2px; }
  .chip-label { font-size: 12px; font-weight: 800; color: var(--text-primary); }
  .chip-sublabel { font-size: 10px; color: var(--text-tertiary); font-weight: 500; }

  /* Priority Cards */
  .priority-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .priority-card {
    flex: 1;
    min-width: 150px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1.5px solid var(--surface-card-border);
    background: var(--surface-card);
    cursor: pointer;
    transition: all 0.13s;
  }
  .priority-card:hover {
    border-color: var(--pcolor, #94A3B8);
    background: var(--pbg, transparent);
  }
  .priority-card.selected {
    border-color: var(--pcolor, #94A3B8);
    background: var(--pbg, transparent);
    box-shadow: 0 0 0 2px rgba(from var(--pcolor) r g b / 0.2);
  }
  .p-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-bottom: 2px;
  }
  .p-label { font-size: 12.5px; font-weight: 800; color: var(--text-primary); }
  .p-sub { font-size: 10.5px; color: var(--text-tertiary); font-weight: 500; }

  /* Format Grid */
  .format-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
  .format-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1.5px solid var(--surface-card-border);
    background: var(--surface-card);
    cursor: pointer;
    transition: all 0.13s;
  }
  .format-card:hover {
    border-color: var(--brand-accent, #0078D4);
    background: var(--brand-tint, rgba(0,120,212,0.06));
  }
  .format-card.selected {
    border-color: var(--brand-accent, #0078D4);
    background: var(--brand-tint, rgba(0,120,212,0.1));
    box-shadow: 0 0 0 2px rgba(0,120,212,0.15);
  }
  .fmt-icon { display: flex; margin-bottom: 2px; color: var(--brand-accent, #0078D4); }
  .fmt-label { font-size: 12.5px; font-weight: 800; color: var(--text-primary); }
  .fmt-sub { font-size: 10.5px; color: var(--text-tertiary); font-weight: 500; }

  /* Error Banner */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #EF4444;
    font-size: 13px;
    font-weight: 600;
  }

  /* Form Footer */
  .form-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    border-top: 1px solid var(--surface-card-border);
    padding-top: 16px;
    margin-top: 4px;
  }
  .cancel-btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s;
  }
  .cancel-btn:hover {
    color: var(--text-primary);
    border-color: var(--text-secondary);
  }
  .submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 20px;
    border-radius: 8px;
    border: none;
    background: var(--brand-accent, #0078D4);
    color: #fff;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.12s;
    box-shadow: 0 2px 8px rgba(0, 120, 212, 0.3);
  }
  .submit-btn:hover { background: #106EBE; }
  .submit-btn.disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ─── Queue Table ─── */
  .order-queue-table {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 12px;
    overflow: hidden;
  }
  .queue-table {
    width: 100%;
    border-collapse: collapse;
  }
  .queue-table th {
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 800;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: var(--surface-card-subtle, rgba(0,0,0,0.03));
    border-bottom: 1px solid var(--surface-card-border);
    text-align: left;
    white-space: nowrap;
  }
  .order-row {
    border-bottom: 1px solid var(--surface-card-border);
    transition: background 0.12s;
    cursor: pointer;
  }
  .order-row:hover { background: var(--surface-card-hover, rgba(0,120,212,0.03)); }
  .order-row:last-child { border-bottom: none; }
  .order-row.expanded { background: var(--brand-tint, rgba(0,120,212,0.04)); }
  .order-row td {
    padding: 11px 14px;
    font-size: 12.5px;
    color: var(--text-primary);
    vertical-align: middle;
  }
  .order-detail-row td {
    padding: 0;
    border-bottom: 1px solid var(--surface-card-border);
  }
  .order-detail-panel {
    padding: 16px 20px;
    background: var(--surface-card-subtle, rgba(0,0,0,0.025));
    border-top: 1px solid var(--surface-card-border);
  }
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
  .detail-block { display: flex; flex-direction: column; gap: 4px; }
  .detail-label { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-tertiary); }
  .detail-copy {
    font-size: 12.5px;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    margin: 0;
    line-height: 1.5;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    padding: 8px 10px;
  }
  .detail-value { font-size: 12.5px; color: var(--text-primary); font-weight: 500; }
  .attachment-value { font-family: var(--font-mono, monospace); font-size: 11.5px; word-break: break-all; }
  .proj-link-btn {
    font-size: 12px;
    font-weight: 700;
    color: var(--brand-accent, #0078D4);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-align: left;
    text-decoration: underline;
    transition: opacity 0.12s;
  }
  .proj-link-btn:hover { opacity: 0.75; }

  /* Row Badges */
  .order-id-badge {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    font-weight: 800;
    color: var(--brand-accent, #0078D4);
    background: var(--brand-tint, rgba(0,120,212,0.1));
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .order-title-cell {
    font-weight: 700;
    font-size: 13px;
    color: var(--text-primary);
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }
  .entity-badge {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-secondary);
    background: var(--surface-card-border);
    padding: 2px 7px;
    border-radius: 4px;
  }
  .priority-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
    white-space: nowrap;
  }
  .format-tag {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
  }
  .date-tag {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
  .requester-tag { font-size: 12px; color: var(--text-secondary); }
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Row Actions */
  .action-row {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    flex-wrap: nowrap;
  }
  .tbl-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 9px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 700;
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.12s;
    white-space: nowrap;
  }
  .tbl-btn:hover { border-color: currentColor; }
  .tbl-btn-primary { color: #3B82F6; }
  .tbl-btn-primary:hover { background: rgba(59,130,246,0.1); }
  .tbl-btn-warn { color: #F59E0B; }
  .tbl-btn-warn:hover { background: rgba(245,158,11,0.1); }
  .tbl-btn-success { color: #10B981; }
  .tbl-btn-success:hover { background: rgba(16,185,129,0.1); }
  .tbl-btn-danger { color: #EF4444; }
  .tbl-btn-danger:hover { background: rgba(239,68,68,0.1); }

  /* ─── State Cards ─── */
  .state-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px 24px;
    text-align: center;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 12px;
  }
  .empty-icon-box { opacity: 0.4; }
  .state-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }
  .state-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
    max-width: 380px;
  }
  .spinner-large {
    width: 36px;
    height: 36px;
    border: 3px solid var(--surface-card-border);
    border-top-color: var(--brand-accent, #0078D4);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ─── Explainer Card ─── */
  .explainer-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 12px;
    padding: 24px;
  }
  .explainer-grid {
    display: flex;
    gap: 0;
    flex-wrap: wrap;
  }
  .explainer-col {
    flex: 1;
    min-width: 260px;
    padding: 0 24px 0 0;
  }
  .explainer-col:last-child { padding: 0 0 0 24px; }
  .explainer-divider {
    width: 1px;
    background: var(--surface-card-border);
    align-self: stretch;
    flex-shrink: 0;
  }
  .explainer-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    font-weight: 900;
    color: var(--text-primary);
    margin: 0 0 14px;
  }
  .explainer-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .explainer-list li {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.45;
  }
  .explainer-list li strong {
    color: var(--text-primary);
    font-weight: 700;
  }
  @media (max-width: 640px) {
    .explainer-divider { display: none; }
    .explainer-col { padding: 0; }
    .explainer-col:last-child { padding: 16px 0 0; border-top: 1px solid var(--surface-card-border); }
    .explainer-grid { flex-direction: column; gap: 16px; }
  }

  /* ─── Accessibility ─── */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
