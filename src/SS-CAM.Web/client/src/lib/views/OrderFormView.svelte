<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  // ─── Types ─────────────────────────────────────────────────────────────────
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
  let orders        = $state<CreativeOrder[]>([]);
  let isLoading     = $state(false);
  let isSubmitting  = $state(false);
  let showForm      = $state(false);
  let filterStatus  = $state('all');
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

  // ─── Constants ─────────────────────────────────────────────────────────────
  const ENTITIES = [
    { id: 'SSC', label: 'Clinic',    full: 'SuamiSihat Clinic'      },
    { id: 'SSE', label: 'Commerce',  full: 'SuamiSihat E-Commerce'  },
    { id: 'SSH', label: 'Holding',   full: 'SuamiSihat Holding'     },
    { id: 'SST', label: 'Tech',      full: 'SuamiSihat Technology'  },
    { id: 'SSW', label: 'Wellness',  full: 'SuamiSihat Wellness'    },
  ];

  const PRIORITIES = [
    {
      id: 'tier_1',
      label: 'Standard',
      window: '3 – 5 working days',
      note: 'Routine campaign or scheduled content.',
    },
    {
      id: 'tier_2',
      label: 'Fast-Track',
      window: 'Next business day',
      note: 'Time-sensitive promotion or launch support.',
    },
    {
      id: 'tier_3',
      label: 'Urgent',
      window: 'Same business day',
      note: 'Critical escalation. Use only when necessary.',
    },
  ];

  const FORMATS = [
    { id: '9_16_video',     label: '9:16 Video',        sub: 'TikTok · Reels · Story'     },
    { id: '1_1_feed',       label: '1:1 Social Feed',   sub: 'Instagram · Facebook · LinkedIn' },
    { id: '16_9_landscape', label: '16:9 Landscape',    sub: 'YouTube · Slides · Display'  },
    { id: 'print_posm',     label: 'Print / POSM',      sub: 'A3 · A2 · X-Banner · Rollup'  },
    { id: 'print_digital',  label: 'Digital Banner',    sub: 'Web · Email · Paid Ads'      },
    { id: 'other',          label: 'Other',             sub: 'Specify in the brief field'  },
  ];

  const PRIORITY_COLOR: Record<string, { fg: string; bg: string; border: string }> = {
    tier_1: { fg: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
    tier_2: { fg: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
    tier_3: { fg: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
  };

  const STATUS_META: Record<string, { label: string; fg: string; bg: string }> = {
    pending:      { label: 'Pending',       fg: '#475569', bg: '#F1F5F9' },
    in_progress:  { label: 'In Progress',   fg: '#1D4ED8', bg: '#EFF6FF' },
    for_approval: { label: 'For Approval',  fg: '#92400E', bg: '#FFFBEB' },
    done:         { label: 'Completed',     fg: '#065F46', bg: '#ECFDF5' },
    cancelled:    { label: 'Cancelled',     fg: '#991B1B', bg: '#FEF2F2' },
  };

  // ─── Derived ───────────────────────────────────────────────────────────────
  const filteredOrders = $derived(
    filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)
  );

  const counts = $derived({
    all:          orders.length,
    pending:      orders.filter(o => o.status === 'pending').length,
    in_progress:  orders.filter(o => o.status === 'in_progress').length,
    for_approval: orders.filter(o => o.status === 'for_approval').length,
    done:         orders.filter(o => o.status === 'done').length,
  });

  const formFilled = $derived([f_title, f_entity, f_priority, f_format, f_copy, f_targetDate]
    .filter(v => v.trim().length > 0).length);

  const formValid = $derived(formFilled === 6);

  const isDesigner = $derived(
    ['admin', 'Art Director', 'Designer', 'Lead Designer'].includes(appState.currentUser?.role || '')
  );

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  onMount(() => { loadOrders(); });

  async function loadOrders() {
    isLoading = true;
    try {
      const res = await ApiClient.request<{ success: boolean; orders: CreativeOrder[] }>('/orders');
      orders = res.orders || [];
    } catch {
      appState.addToast('Unable to load order queue. Please refresh.', 'error', 'Connection Error');
    } finally {
      isLoading = false;
    }
  }

  function openForm() {
    formError        = '';
    submitSuccess    = false;
    f_title          = '';
    f_entity         = '';
    f_priority       = '';
    f_format         = '';
    f_copy           = '';
    f_targetDate     = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
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
      appState.addToast('Your creative request has been submitted and queued.', 'success', 'Request Received');
      await loadOrders();
      setTimeout(() => { showForm = false; submitSuccess = false; }, 1600);
    } catch (err: any) {
      formError = err.message || 'Submission failed. Please review your inputs and try again.';
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
      appState.addToast('Order has been cancelled.', 'warning', 'Cancelled');
      await loadOrders();
    } catch (err: any) {
      appState.addToast(err.message || 'Cancellation failed.', 'error');
    }
  }

  function fmtDate(iso: string) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }

  function priorityLabel(id: string) {
    return PRIORITIES.find(p => p.id === id)?.label ?? '—';
  }
  function formatLabel(id: string) {
    return FORMATS.find(f => f.id === id)?.label ?? '—';
  }
</script>

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- LAYOUT CONTAINER                                                          -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->
<div class="view-wrap">

  <!-- ─── PAGE HEADER ──────────────────────────────────────────────────────── -->
  <div class="page-header">
    <div class="page-header-text">
      <div class="page-kicker">Creative Operations</div>
      <h1 class="page-title">Creative Request Form</h1>
      <p class="page-desc">
        Submit structured creative briefs to the design team.
        Complete all required fields — total time under 60 seconds.
      </p>
    </div>
    <div class="page-actions">
      <FluentButton appearance="secondary" size="sm" onclick={loadOrders}>Refresh</FluentButton>
      <FluentButton appearance="primary" size="sm" onclick={openForm}>New Request</FluentButton>
    </div>
  </div>

  <!-- ─── STATUS FILTER TABS ────────────────────────────────────────────────── -->
  <div class="filter-row" role="tablist" aria-label="Filter by order status">
    {#each [
      { key: 'all',          label: 'All Requests'  },
      { key: 'pending',      label: 'Pending'       },
      { key: 'in_progress',  label: 'In Progress'   },
      { key: 'for_approval', label: 'For Approval'  },
      { key: 'done',         label: 'Completed'     },
    ] as tab}
      <button
        class="filter-tab {filterStatus === tab.key ? 'active' : ''}"
        role="tab"
        aria-selected={filterStatus === tab.key}
        onclick={() => filterStatus = tab.key}
      >
        {tab.label}
        <span class="tab-count">{counts[tab.key as keyof typeof counts]}</span>
      </button>
    {/each}
  </div>

  <!-- ─── FORM MODAL ──────────────────────────────────────────────────────── -->
  {#if showForm}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="modal-backdrop"
      onclick={(e) => { if (e.target === e.currentTarget) showForm = false; }}
    >
      <div class="modal-panel" role="dialog" aria-modal="true" aria-label="New Creative Request">

        {#if submitSuccess}
          <!-- ── Success State ── -->
          <div class="success-state">
            <div class="success-mark" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <h2 class="success-heading">Request Submitted</h2>
            <p class="success-body">
              Your creative brief has been added to the design queue.
              The team will acknowledge within your selected priority window.
            </p>
          </div>

        {:else}
          <!-- ── Modal Header ── -->
          <div class="modal-header">
            <div>
              <div class="modal-kicker">Creative Operations · New Brief</div>
              <h2 class="modal-title">Creative Request Form</h2>
            </div>
            <button
              class="close-btn"
              type="button"
              onclick={() => showForm = false}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <!-- ── Progress Indicator ── -->
          <div class="progress-bar" aria-label="Form completion: {formFilled} of 6 fields">
            {#each Array(6) as _, i}
              <div class="progress-seg {i < formFilled ? 'filled' : ''}"></div>
            {/each}
            <span class="progress-label">{formFilled} / 6</span>
          </div>

          <!-- ── Form ── -->
          <form class="form-body" onsubmit={handleSubmit} novalidate>

            <!-- 1. Project Title -->
            <div class="field">
              <label class="field-label" for="f-title">
                Project Title
                <span class="req-mark" aria-hidden="true">*</span>
              </label>
              <input
                id="f-title"
                class="input"
                type="text"
                bind:value={f_title}
                placeholder="e.g. ANDROLAB Alpha — TikTok Hook Batch, September 2026"
                maxlength="120"
                autocomplete="off"
                required
              />
              <span class="char-hint" aria-live="polite">{f_title.length} / 120</span>
            </div>

            <!-- 2. Requesting Entity -->
            <div class="field">
              <div class="field-label" id="entity-label">
                Requesting Entity
                <span class="req-mark" aria-hidden="true">*</span>
              </div>
              <div class="seg-group" role="radiogroup" aria-labelledby="entity-label">
                {#each ENTITIES as ent}
                  <label
                    class="seg-btn {f_entity === ent.id ? 'selected' : ''}"
                    title={ent.full}
                  >
                    <input
                      type="radio"
                      name="f-entity"
                      value={ent.id}
                      bind:group={f_entity}
                      class="sr-only"
                    />
                    <span class="seg-code">{ent.id}</span>
                    <span class="seg-sub">{ent.label}</span>
                  </label>
                {/each}
              </div>
            </div>

            <!-- 3. Priority Tier -->
            <div class="field">
              <div class="field-label" id="priority-label">
                Priority Tier
                <span class="req-mark" aria-hidden="true">*</span>
              </div>
              <div class="card-group" role="radiogroup" aria-labelledby="priority-label">
                {#each PRIORITIES as p}
                  {@const sel = f_priority === p.id}
                  <label class="option-card {sel ? 'selected' : ''}">
                    <input
                      type="radio"
                      name="f-priority"
                      value={p.id}
                      bind:group={f_priority}
                      class="sr-only"
                    />
                    <div class="option-card-inner">
                      <div class="option-header">
                        <span class="option-dot {p.id}" aria-hidden="true"></span>
                        <span class="option-label">{p.label}</span>
                      </div>
                      <span class="option-window">{p.window}</span>
                      <span class="option-note">{p.note}</span>
                    </div>
                  </label>
                {/each}
              </div>
            </div>

            <!-- 4. Format & Size -->
            <div class="field">
              <div class="field-label" id="format-label">
                Format &amp; Size
                <span class="req-mark" aria-hidden="true">*</span>
              </div>
              <div class="format-grid" role="radiogroup" aria-labelledby="format-label">
                {#each FORMATS as fmt}
                  <label class="format-item {f_format === fmt.id ? 'selected' : ''}">
                    <input
                      type="radio"
                      name="f-format"
                      value={fmt.id}
                      bind:group={f_format}
                      class="sr-only"
                    />
                    <span class="fmt-label">{fmt.label}</span>
                    <span class="fmt-sub">{fmt.sub}</span>
                  </label>
                {/each}
              </div>
            </div>

            <!-- 5. Brief / Copy -->
            <div class="field">
              <label class="field-label" for="f-copy">
                Brief &amp; Copy
                <span class="req-mark" aria-hidden="true">*</span>
              </label>
              <textarea
                id="f-copy"
                class="textarea"
                bind:value={f_copy}
                placeholder="Include: headline, promotion price, call-to-action, doctor name, and any specific messaging guidelines. You may also paste a SSNAS folder path or Google Drive link to your raw assets."
                rows="5"
                required
              ></textarea>
              <p class="field-hint">
                The more complete this field, the fewer clarification rounds required.
              </p>
            </div>

            <!-- 6. Target Date + Reference Link -->
            <div class="field-row">
              <div class="field" style="flex: 1; min-width: 0;">
                <label class="field-label" for="f-date">
                  Target Delivery Date
                  <span class="req-mark" aria-hidden="true">*</span>
                </label>
                <input
                  id="f-date"
                  class="input"
                  type="date"
                  bind:value={f_targetDate}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div class="field" style="flex: 1; min-width: 0;">
                <label class="field-label" for="f-ref">
                  Asset Reference
                  <span class="optional-label">Optional</span>
                </label>
                <input
                  id="f-ref"
                  class="input"
                  type="text"
                  bind:value={f_attachmentNote}
                  placeholder="\\SSNAS\Creative-Team\... or drive.google.com/..."
                />
              </div>
            </div>

            <!-- Error -->
            {#if formError}
              <div class="error-msg" role="alert">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {formError}
              </div>
            {/if}

            <!-- Footer Actions -->
            <div class="modal-footer">
              <button type="button" class="btn-ghost" onclick={() => showForm = false}>
                Cancel
              </button>
              <button
                type="submit"
                class="btn-primary {formValid && !isSubmitting ? '' : 'disabled'}"
                disabled={!formValid || isSubmitting}
              >
                {#if isSubmitting}
                  <span class="spinner" aria-hidden="true"></span>
                  Submitting…
                {:else}
                  Submit Request
                {/if}
              </button>
            </div>
          </form>
        {/if}
      </div>
    </div>
  {/if}

  <!-- ─── ORDER TABLE ──────────────────────────────────────────────────────── -->
  {#if isLoading}
    <div class="state-shell">
      <div class="loading-spinner" aria-label="Loading"></div>
      <p class="state-label">Loading order queue…</p>
    </div>

  {:else if filteredOrders.length === 0}
    <div class="state-shell empty">
      <div class="empty-icon" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <p class="state-label">
        {filterStatus === 'all' ? 'No creative requests on record.' : `No ${STATUS_META[filterStatus]?.label ?? filterStatus} orders.`}
      </p>
      <p class="state-sub">Submit the first request or adjust the status filter.</p>
      {#if filterStatus === 'all'}
        <FluentButton appearance="primary" size="sm" onclick={openForm}>New Request</FluentButton>
      {/if}
    </div>

  {:else}
    <div class="table-shell">
      <table class="order-table" aria-label="Creative order queue">
        <thead>
          <tr>
            <th scope="col">Order ID</th>
            <th scope="col">Project Title</th>
            <th scope="col">Entity</th>
            <th scope="col">Priority</th>
            <th scope="col">Format</th>
            <th scope="col">Target Date</th>
            <th scope="col">Submitted by</th>
            <th scope="col">Status</th>
            {#if isDesigner}<th scope="col" class="col-actions">Actions</th>{/if}
          </tr>
        </thead>
        <tbody>
          {#each filteredOrders as order (order.id)}
            {@const sm  = STATUS_META[order.status] ?? STATUS_META.pending}
            {@const pr  = PRIORITY_COLOR[order.priority]}
            {@const expanded = activeOrderId === order.id}
            <tr
              class="order-row {expanded ? 'row-open' : ''}"
              aria-expanded={expanded}
              tabindex="0"
              role="button"
              onclick={() => activeOrderId = expanded ? null : order.id}
              onkeydown={(e) => e.key === 'Enter' && (activeOrderId = expanded ? null : order.id)}
            >
              <td>
                <span class="id-tag">{order.id}</span>
              </td>
              <td>
                <span class="title-cell">{order.title}</span>
              </td>
              <td>
                <span class="entity-tag">{order.entity}</span>
              </td>
              <td>
                {#if pr}
                  <span
                    class="priority-tag"
                    style="color: {pr.fg}; background: {pr.bg}; border-color: {pr.border};"
                  >{priorityLabel(order.priority)}</span>
                {:else}
                  <span class="priority-tag">—</span>
                {/if}
              </td>
              <td>
                <span class="meta-cell">{formatLabel(order.format)}</span>
              </td>
              <td>
                <span class="meta-cell">{fmtDate(order.targetDate)}</span>
              </td>
              <td>
                <span class="meta-cell">{order.requester}</span>
              </td>
              <td>
                <span
                  class="status-tag"
                  style="color: {sm.fg}; background: {sm.bg};"
                >{sm.label}</span>
              </td>
              {#if isDesigner}
                <td class="col-actions" onclick={(e) => e.stopPropagation()}>
                  <div class="action-cluster">
                    {#if order.status === 'pending'}
                      <button class="act-btn act-blue" onclick={() => updateStatus(order.id, 'in_progress')} title="Start">Start</button>
                    {:else if order.status === 'in_progress'}
                      <button class="act-btn act-amber" onclick={() => updateStatus(order.id, 'for_approval')} title="Send for Approval">Review</button>
                    {:else if order.status === 'for_approval'}
                      <button class="act-btn act-green" onclick={() => updateStatus(order.id, 'done')} title="Mark Completed">Complete</button>
                    {/if}
                    {#if order.status !== 'done' && order.status !== 'cancelled'}
                      <button class="act-btn act-red" onclick={() => cancelOrder(order.id)} title="Cancel Order">Cancel</button>
                    {/if}
                  </div>
                </td>
              {/if}
            </tr>

            {#if expanded}
              <tr class="detail-row">
                <td colspan={isDesigner ? 9 : 8}>
                  <div class="detail-panel">
                    <div class="detail-grid">
                      <div class="detail-col wide">
                        <span class="detail-label">Brief &amp; Copy</span>
                        <pre class="detail-copy">{order.copy}</pre>
                      </div>
                      {#if order.attachmentNote}
                        <div class="detail-col">
                          <span class="detail-label">Asset Reference</span>
                          <span class="detail-mono">{order.attachmentNote}</span>
                        </div>
                      {/if}
                      <div class="detail-col">
                        <span class="detail-label">Date Submitted</span>
                        <span class="detail-val">{fmtDate(order.submittedAt)}</span>
                      </div>
                      {#if order.assignedTo}
                        <div class="detail-col">
                          <span class="detail-label">Assigned Designer</span>
                          <span class="detail-val">{order.assignedTo}</span>
                        </div>
                      {/if}
                      {#if order.projectId}
                        <div class="detail-col">
                          <span class="detail-label">Project Folder</span>
                          <button
                            class="proj-link"
                            onclick={() => appState.navigate('project-detail', { id: order.projectId! })}
                          >Open Workspace</button>
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

  <!-- ─── INFO STRIP ───────────────────────────────────────────────────────── -->
  <div class="info-strip">
    <div class="info-block">
      <h3 class="info-heading">For Requesters</h3>
      <ul class="info-list">
        <li>Complete all six fields accurately to avoid revision cycles.</li>
        <li>Select a priority tier that reflects your actual deadline, not urgency preference.</li>
        <li>Include raw asset links (SSNAS path or Google Drive) where applicable.</li>
        <li>Track your request status in real-time through this queue.</li>
      </ul>
    </div>
    <div class="info-divider" aria-hidden="true"></div>
    <div class="info-block">
      <h3 class="info-heading">For Design Team</h3>
      <ul class="info-list">
        <li>All briefs arrive structured — title, format, copy, and deadline are pre-defined.</li>
        <li>Progress orders through <strong>Start → For Review → Complete</strong> to reflect live status.</li>
        <li>Link a project folder once the workspace has been created on SSNAS.</li>
        <li>Urgent Tier 3 requests require documented justification in the audit log.</li>
      </ul>
    </div>
  </div>

</div>

<style>
  /* ── Layout ── */
  .view-wrap {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-bottom: 48px;
    font-family: var(--font-family);
  }

  /* ── Page Header ── */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
  }
  .page-kicker {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: var(--brand-accent);
    margin-bottom: 6px;
  }
  .page-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 5px;
    letter-spacing: -0.3px;
  }
  .page-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.55;
    max-width: 540px;
  }
  .page-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    align-items: center;
  }

  /* ── Filter Tabs ── */
  .filter-row {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid var(--surface-card-border);
    padding-bottom: 1px;
    flex-wrap: wrap;
  }
  .filter-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-tertiary);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color var(--transition-fast), border-color var(--transition-fast);
    margin-bottom: -1px;
    white-space: nowrap;
  }
  .filter-tab:hover  { color: var(--text-primary); }
  .filter-tab.active {
    color: var(--brand-accent);
    border-bottom-color: var(--brand-accent);
    font-weight: 700;
  }
  .tab-count {
    font-size: 11px;
    font-weight: 700;
    color: inherit;
    background: var(--surface-card-border);
    padding: 1px 6px;
    border-radius: var(--radius-pill);
    opacity: 0.8;
  }
  .filter-tab.active .tab-count {
    background: rgba(33, 161, 247, 0.15);
  }

  /* ── Modal Backdrop ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(2, 32, 87, 0.55);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    z-index: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal-panel {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 660px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-xl);
    animation: panel-enter 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
  }
  @keyframes panel-enter {
    from { transform: translateY(12px) scale(0.97); opacity: 0; }
    to   { transform: translateY(0)    scale(1);    opacity: 1; }
  }

  /* ── Success State ── */
  .success-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 56px 40px;
    gap: 14px;
    animation: fade-up 0.3s ease;
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .success-mark {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--color-success-bg);
    color: var(--color-success);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
  }
  .success-heading {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
  .success-body {
    font-size: 13.5px;
    color: var(--text-secondary);
    margin: 0;
    max-width: 380px;
    line-height: 1.55;
  }

  /* ── Modal Header ── */
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px 24px 0;
    gap: 12px;
  }
  .modal-kicker {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--brand-accent);
    margin-bottom: 5px;
  }
  .modal-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
  .close-btn {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-md);
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    color: var(--text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all var(--transition-fast);
  }
  .close-btn:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border-color: var(--color-danger-border);
  }

  /* ── Progress Bar ── */
  .progress-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 14px 24px 0;
  }
  .progress-seg {
    flex: 1;
    height: 2px;
    background: var(--surface-card-border);
    border-radius: 2px;
    transition: background var(--transition-fast);
  }
  .progress-seg.filled {
    background: var(--brand-accent);
  }
  .progress-label {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--text-tertiary);
    margin-left: 8px;
    white-space: nowrap;
    min-width: 28px;
    text-align: right;
  }

  /* ── Form Body ── */
  .form-body {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 7px;
    position: relative;
  }
  .field-row {
    display: flex;
    gap: 16px;
  }
  @media (max-width: 580px) {
    .field-row { flex-direction: column; }
  }
  .field-label {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 5px;
    user-select: none;
  }
  .req-mark {
    color: var(--color-danger);
    font-weight: 700;
    line-height: 1;
  }
  .optional-label {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--text-tertiary);
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    padding: 1px 5px;
    border-radius: 4px;
  }
  .char-hint {
    position: absolute;
    right: 0;
    bottom: -18px;
    font-size: 10.5px;
    color: var(--text-tertiary);
    pointer-events: none;
  }

  /* Text Inputs */
  .input, .textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card-subtle);
    color: var(--text-primary);
    font-size: 13px;
    font-family: var(--font-family);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }
  .input::placeholder, .textarea::placeholder { color: var(--text-tertiary); }
  .input:focus, .textarea:focus {
    outline: none;
    border-color: var(--brand-accent);
    box-shadow: 0 0 0 3px rgba(33, 161, 247, 0.14);
    background: var(--surface-card);
  }
  .textarea {
    resize: vertical;
    min-height: 100px;
    line-height: 1.55;
  }
  .field-hint {
    font-size: 11.5px;
    color: var(--text-tertiary);
    line-height: 1.45;
    margin-top: 1px;
  }

  /* Segmented Entity Selector */
  .seg-group {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .seg-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 14px;
    min-width: 70px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--surface-card-border);
    background: var(--surface-card);
    cursor: pointer;
    text-align: center;
    transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
  }
  .seg-btn:hover {
    border-color: var(--brand-accent);
  }
  .seg-btn.selected {
    border-color: var(--brand-accent);
    background: rgba(33, 161, 247, 0.07);
    box-shadow: 0 0 0 2px rgba(33, 161, 247, 0.18);
  }
  .seg-code {
    font-size: 13px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: 0.3px;
  }
  .seg-sub {
    font-size: 10px;
    font-weight: 500;
    color: var(--text-tertiary);
    margin-top: 1px;
  }

  /* Priority Cards */
  .card-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .option-card {
    flex: 1;
    min-width: 140px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--surface-card-border);
    background: var(--surface-card);
    cursor: pointer;
    transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
    overflow: hidden;
  }
  .option-card:hover { border-color: var(--brand-secondary); }
  .option-card.selected {
    border-color: var(--brand-accent);
    background: rgba(33, 161, 247, 0.05);
    box-shadow: 0 0 0 2px rgba(33, 161, 247, 0.18);
  }
  .option-card-inner {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
  }
  .option-header {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 2px;
  }
  .option-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .option-dot.tier_1 { background: var(--color-success); }
  .option-dot.tier_2 { background: var(--color-warning); }
  .option-dot.tier_3 { background: var(--color-danger); }
  .option-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .option-window {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-secondary);
  }
  .option-note {
    font-size: 11px;
    color: var(--text-tertiary);
    line-height: 1.4;
  }

  /* Format Grid */
  .format-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
    gap: 8px;
  }
  .format-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--surface-card-border);
    background: var(--surface-card);
    cursor: pointer;
    transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
  }
  .format-item:hover { border-color: var(--brand-accent); }
  .format-item.selected {
    border-color: var(--brand-accent);
    background: rgba(33, 161, 247, 0.06);
    box-shadow: 0 0 0 2px rgba(33, 161, 247, 0.16);
  }
  .fmt-label {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .fmt-sub {
    font-size: 10.5px;
    color: var(--text-tertiary);
    line-height: 1.4;
  }

  /* Error */
  .error-msg {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: var(--radius-md);
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    color: var(--color-danger);
    font-size: 13px;
    font-weight: 600;
  }

  /* Modal Footer */
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    padding-top: 16px;
    border-top: 1px solid var(--surface-card-border);
    margin-top: 2px;
  }
  .btn-ghost {
    padding: 8px 16px;
    border-radius: var(--radius-md);
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font-family);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .btn-ghost:hover {
    color: var(--text-primary);
    border-color: var(--text-tertiary);
  }
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 20px;
    border-radius: var(--radius-md);
    border: none;
    background: var(--brand-primary);
    color: #FFFFFF;
    font-size: 13.5px;
    font-weight: 700;
    font-family: var(--font-family);
    cursor: pointer;
    transition: background var(--transition-fast), box-shadow var(--transition-fast);
    box-shadow: var(--shadow-md);
  }
  .btn-primary:hover:not(.disabled) { background: var(--brand-secondary); box-shadow: var(--shadow-lg); }
  .btn-primary.disabled { opacity: 0.42; cursor: not-allowed; }
  .spinner {
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #FFFFFF;
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Table ── */
  .table-shell {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  .order-table {
    width: 100%;
    border-collapse: collapse;
  }
  .order-table thead tr {
    border-bottom: 1px solid var(--surface-card-border);
    background: var(--surface-card-subtle);
  }
  .order-table th {
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    white-space: nowrap;
  }
  .order-row {
    border-bottom: 1px solid var(--surface-card-border);
    cursor: pointer;
    transition: background var(--transition-fast);
    outline: none;
  }
  .order-row:last-of-type { border-bottom: none; }
  .order-row:hover   { background: var(--surface-card-hover); }
  .order-row:focus-visible { box-shadow: inset 0 0 0 2px var(--brand-accent); }
  .order-row.row-open { background: rgba(33, 161, 247, 0.04); }
  .order-table td {
    padding: 11px 14px;
    font-size: 12.5px;
    color: var(--text-primary);
    vertical-align: middle;
  }
  .col-actions { text-align: right; }

  /* Cell Types */
  .id-tag {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--brand-accent);
    background: rgba(33, 161, 247, 0.09);
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    white-space: nowrap;
  }
  .title-cell {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 13px;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }
  .entity-tag {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-brand);
    background: rgba(4, 51, 136, 0.08);
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    letter-spacing: 0.3px;
  }
  .priority-tag {
    display: inline-block;
    font-size: 11.5px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .meta-cell {
    color: var(--text-secondary);
    font-size: 12.5px;
  }
  .status-tag {
    display: inline-flex;
    align-items: center;
    gap: 0;
    font-size: 11.5px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    white-space: nowrap;
  }

  /* Row Actions */
  .action-cluster {
    display: flex;
    justify-content: flex-end;
    gap: 5px;
    flex-wrap: nowrap;
  }
  .act-btn {
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 11.5px;
    font-weight: 700;
    font-family: var(--font-family);
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }
  .act-blue  { color: #1D4ED8; }
  .act-blue:hover  { background: #EFF6FF; border-color: #BFDBFE; }
  .act-amber { color: #92400E; }
  .act-amber:hover { background: #FFFBEB; border-color: #FDE68A; }
  .act-green { color: #065F46; }
  .act-green:hover { background: #ECFDF5; border-color: #A7F3D0; }
  .act-red   { color: var(--color-danger); }
  .act-red:hover   { background: var(--color-danger-bg); border-color: var(--color-danger-border); }

  /* Expanded Detail Panel */
  .detail-row td { padding: 0; border-bottom: 1px solid var(--surface-card-border); }
  .detail-panel {
    padding: 16px 20px;
    background: var(--surface-card-subtle);
    border-top: 1px solid var(--surface-card-border);
  }
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .detail-col { display: flex; flex-direction: column; gap: 5px; }
  .detail-col.wide { grid-column: 1 / -1; }
  .detail-label {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-tertiary);
  }
  .detail-copy {
    font-size: 13px;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
    font-family: var(--font-family);
    margin: 0;
    line-height: 1.55;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    padding: 10px 12px;
  }
  .detail-val  { font-size: 13px; color: var(--text-primary); font-weight: 500; }
  .detail-mono {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--text-secondary);
    word-break: break-all;
  }
  .proj-link {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--brand-accent);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-align: left;
    text-decoration: underline;
    transition: opacity var(--transition-fast);
    font-family: var(--font-family);
  }
  .proj-link:hover { opacity: 0.7; }

  /* ── State Shells ── */
  .state-shell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 60px 24px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg);
    text-align: center;
  }
  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 2.5px solid var(--surface-card-border);
    border-top-color: var(--brand-accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  .empty-icon { color: var(--text-tertiary); opacity: 0.4; }
  .state-label {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
  .state-sub {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
    max-width: 360px;
  }

  /* ── Info Strip ── */
  .info-strip {
    display: flex;
    gap: 0;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg);
    padding: 24px;
    flex-wrap: wrap;
  }
  .info-block {
    flex: 1;
    min-width: 240px;
    padding-right: 24px;
  }
  .info-block:last-child { padding-right: 0; padding-left: 24px; }
  .info-divider {
    width: 1px;
    background: var(--surface-card-border);
    align-self: stretch;
    flex-shrink: 0;
  }
  .info-heading {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--surface-card-border);
  }
  .info-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .info-list li {
    font-size: 12.5px;
    color: var(--text-secondary);
    line-height: 1.5;
    padding-left: 14px;
    position: relative;
  }
  .info-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 7px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--brand-accent);
    flex-shrink: 0;
  }
  .info-list li strong { color: var(--text-primary); font-weight: 700; }
  @media (max-width: 640px) {
    .info-divider { display: none; }
    .info-block, .info-block:last-child { padding: 0; }
    .info-block:last-child { padding-top: 20px; border-top: 1px solid var(--surface-card-border); }
    .info-strip { flex-direction: column; gap: 20px; }
  }

  /* ── Utility ── */
  .sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
