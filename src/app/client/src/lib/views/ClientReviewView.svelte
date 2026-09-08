<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import type { DeliverableItem } from '$lib/types';
  import DeliverableLightbox from '$lib/components/features/DeliverableLightbox.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentIcons from '$lib/components/ui/FluentIcons.svelte';

  let token = $state<string>('');
  let isLoading = $state<boolean>(true);
  let errorMsg = $state<string>('');
  let reviewData = $state<any>(null);

  // Lightbox & Inspection State
  let selectedDeliverable = $state<DeliverableItem | null>(null);
  let lightboxOpen = $state<boolean>(false);

  // Decision Form
  let reviewerName = $state<string>('');
  let reviewerOrg = $state<string>('');
  let decisionComment = $state<string>('');
  let isSubmitting = $state<boolean>(false);
  let submittedResult = $state<any>(null);

  onMount(async () => {
    // Extract token from hash query parameter e.g. #review?token=XYZ
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(window.location.search);
    let extractedToken = urlParams.get('token');

    if (!extractedToken && hash.includes('token=')) {
      const qIndex = hash.indexOf('?');
      if (qIndex !== -1) {
        const hashParams = new URLSearchParams(hash.substring(qIndex));
        extractedToken = hashParams.get('token');
      }
    }

    token = extractedToken || '';
    if (!token) {
      errorMsg = 'No review token provided in URL.';
      isLoading = false;
      return;
    }

    await loadReviewData();
  });

  async function loadReviewData() {
    isLoading = true;
    errorMsg = '';
    try {
      const data = await ApiClient.getPublicReview(token);
      reviewData = data;
    } catch (err: any) {
      errorMsg = err.message || 'Review link is invalid or has expired.';
    } finally {
      isLoading = false;
    }
  }

  function openLightbox(d: DeliverableItem) {
    selectedDeliverable = {
      ...d,
      project: {
        jobId: reviewData?.project?.jobId || '',
        title: reviewData?.project?.title || '',
        brand: reviewData?.project?.brand || 'SS',
        designer: reviewData?.project?.designer || '',
        status: reviewData?.project?.status || '',
        priority: 'high',
        deadline: reviewData?.project?.deadline || ''
      }
    };
    lightboxOpen = true;
  }

  async function handleDecision(decision: 'approved' | 'revision_requested') {
    if (!reviewerName.trim()) {
      alert('Please enter your Name before submitting your decision.');
      return;
    }

    isSubmitting = true;
    try {
      const res = await ApiClient.submitPublicDecision(token, {
        decision,
        reviewerName: reviewerName.trim(),
        reviewerOrg: reviewerOrg.trim() || undefined,
        comment: decisionComment.trim()
      });
      submittedResult = {
        decision,
        reviewer: res.reviewer,
        timestamp: new Date().toLocaleString()
      };
    } catch (err: any) {
      alert(`Decision submission failed: ${err.message}`);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="client-portal-shell">
  <!-- Minimalist Header -->
  <header class="portal-header">
    <div class="header-content">
      <div class="brand-row">
        <img src="brand/suamisihat-logo-on-dark.svg" alt="SuamiSihat" class="portal-logo" />
        <span class="portal-badge">CLIENT REVIEW PORTAL</span>
      </div>
      {#if reviewData?.shareInfo}
        <div class="header-perm-pill {reviewData.shareInfo.permissions}">
          {#if reviewData.shareInfo.permissions === 'review_approve'}
            <FluentIcons name="checkCircle" size={13} color="#10B981" />
            <span style="margin-left: 5px;">Formal Approval Enabled</span>
          {:else}
            <FluentIcons name="search" size={13} />
            <span style="margin-left: 5px;">View-Only Preview</span>
          {/if}
        </div>
      {/if}
    </div>
  </header>

  <!-- Main Body -->
  <main class="portal-main">
    {#if isLoading}
      <div class="state-card loading-card">
        <div class="spinner"></div>
        <h2>Loading Campaign Review Workspace...</h2>
        <p>Connecting to secure SuamiSihat Synology NAS vault.</p>
      </div>

    {:else if errorMsg}
      <div class="state-card error-card">
        <div class="state-icon">
          <FluentIcons name="warning" size={32} color="#F59E0B" />
        </div>
        <h2>Review Link Expired or Invalid</h2>
        <p>{errorMsg}</p>
        <span class="error-hint">Please contact your SuamiSihat Creative Account Lead to request a new review link.</span>
      </div>

    {:else if submittedResult}
      <div class="state-card success-card">
        <div class="state-icon">
          <FluentIcons
            name={submittedResult.decision === 'approved' ? 'checkCircle' : 'warning'}
            size={36}
            color={submittedResult.decision === 'approved' ? '#10B981' : '#F59E0B'}
          />
        </div>
        <h2>Decision Recorded Successfully</h2>
        <p>
          Thank you, <b>{submittedResult.reviewer}</b>. Your feedback has been logged in the SuamiSihat master audit ledger.
        </p>
        <div class="decision-receipt">
          <div class="receipt-row"><span>Status:</span> <b>{submittedResult.decision.toUpperCase()}</b></div>
          <div class="receipt-row"><span>Recorded At:</span> <b>{submittedResult.timestamp}</b></div>
          <div class="receipt-row"><span>Project:</span> <b>{reviewData?.project?.title} ({reviewData?.project?.jobId})</b></div>
        </div>
        <button class="back-btn" onclick={() => submittedResult = null}>Return to Deliverables</button>
      </div>

    {:else if reviewData}
      <!-- Project Metadata Banner -->
      <section class="project-hero">
        <div class="hero-left">
          <div class="hero-tags">
            <span class="brand-tag">{reviewData.project.brand || 'SS'}</span>
            <span class="job-id">{reviewData.project.jobId}</span>
            <span class="rev-tag">Rev {reviewData.project.revision || 1}</span>
          </div>
          <h1 class="project-title">{reviewData.project.title}</h1>
          <p class="designer-meta">Lead Creative: <b>{reviewData.project.designer || 'Creative Team'}</b> · Target Deadline: <b>{reviewData.project.deadline || 'Immediate'}</b></p>
        </div>
      </section>

      <!-- Deliverables Review Matrix -->
      <section class="deliverables-section">
        <div class="section-header-row">
          <h2 class="section-title">Creative Deliverables for Review ({reviewData.deliverables.length})</h2>
          <span class="section-hint">Click any asset to inspect in full resolution, drop markup pins, or compare versions.</span>
        </div>

        <div class="deliverables-grid">
          {#each reviewData.deliverables as d}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="deliverable-card" onclick={() => openLightbox(d)}>
              <div class="media-thumb-box">
                {#if d.isImage}
                  <img src={d.url} alt={d.filename} class="thumb-img" />
                {:else if d.isVideo}
                  <video src={d.url} class="thumb-video" preload="metadata" muted></video>
                  <span class="play-badge">
                    <FluentIcons name="video" size={11} />
                    <span style="margin-left: 3px;">VIDEO</span>
                  </span>
                {:else if d.isPdf}
                  <div class="pdf-thumb-box">
                    <FluentIcons name="file" size={24} color="#EF4444" />
                    <span style="margin-top: 4px;">PDF Export</span>
                  </div>
                {:else}
                  <div class="pdf-thumb-box">
                    <FluentIcons name="folder" size={24} color="#21A1F7" />
                    <span style="margin-top: 4px;">Master Asset</span>
                  </div>
                {/if}
              </div>
              <div class="card-info">
                <span class="card-filename">{d.filename}</span>
                <div class="card-sub-row">
                  <span class="card-folder">{d.folder}</span>
                  <span class="inspect-tag">
                    <FluentIcons name="search" size={10} />
                    <span style="margin-left: 3px;">Inspect</span>
                  </span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Decision Submission Deck -->
      {#if reviewData.shareInfo.permissions === 'review_approve'}
        <section class="decision-deck">
          <div class="deck-header">
            <div class="deck-icon">
              <FluentIcons name="edit" size={18} color="#21A1F7" />
            </div>
            <div>
              <h3 class="deck-title">Client Sign-Off &amp; Decision</h3>
              <p class="deck-sub">Enter your details to formally approve or request design revisions.</p>
            </div>
          </div>

          <div class="decision-inputs-grid">
            <div class="input-col">
              <label class="input-label" for="reviewer-name">Your Full Name *</label>
              <input id="reviewer-name" type="text" class="portal-input" placeholder="e.g. Dato' Roslan / Sarah Chen" bind:value={reviewerName} />
            </div>

            <div class="input-col">
              <label class="input-label" for="reviewer-org">Organization / Department (Optional)</label>
              <input id="reviewer-org" type="text" class="portal-input" placeholder="e.g. Marketing Directorate" bind:value={reviewerOrg} />
            </div>
          </div>

          <div class="input-col" style="margin-top: 12px;">
            <label class="input-label" for="decision-comment">Comments &amp; Revision Notes (Optional)</label>
            <textarea id="decision-comment" class="portal-textarea" rows="3" placeholder="Provide any specific feedback, copy revisions, or sign-off notes..." bind:value={decisionComment}></textarea>
          </div>

          <div class="decision-action-buttons">
            <FluentButton appearance="secondary" size="lg" loading={isSubmitting} onclick={() => handleDecision('revision_requested')}>
              <FluentIcons name="warning" size={14} color="#F59E0B" />
              <span style="margin-left: 6px;">Request Revisions</span>
            </FluentButton>
            <FluentButton appearance="primary" size="lg" loading={isSubmitting} onclick={() => handleDecision('approved')}>
              <FluentIcons name="checkCircle" size={14} color="#10B981" />
              <span style="margin-left: 6px;">Approve &amp; Sign-Off Deliverables</span>
            </FluentButton>
          </div>
        </section>
      {/if}
    {/if}
  </main>

  <!-- Lightbox Modal with Visual Diff Slider & Pin Annotation -->
  {#if selectedDeliverable}
    <DeliverableLightbox
      deliverable={selectedDeliverable}
      bind:open={lightboxOpen}
      onClose={() => lightboxOpen = false}
    />
  {/if}
</div>

<style>
  .client-portal-shell {
    min-height: 100vh;
    background: #090D16;
    color: #F8FAFC;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    flex-direction: column;
  }

  /* Header */
  .portal-header {
    background: #0F172A;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 14px 28px;
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand-row { display: flex; align-items: center; gap: 12px; }
  .portal-logo { height: 28px; }
  .portal-badge {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1px;
    background: rgba(33, 161, 247, 0.15);
    color: #38BDF8;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid rgba(33, 161, 247, 0.3);
  }

  .header-perm-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
  }
  .header-perm-pill.review_approve { background: rgba(16, 185, 129, 0.2); color: #34D399; }
  .header-perm-pill.view_only { background: rgba(148, 163, 184, 0.2); color: #94A3B8; }

  /* Main */
  .portal-main {
    flex: 1;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    padding: 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Hero */
  .project-hero {
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 20px 24px;
  }

  .hero-tags { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .brand-tag { font-size: 11px; font-weight: 800; background: #043388; color: #FFF; padding: 2px 6px; border-radius: 4px; }
  .job-id { font-size: 13px; font-weight: 800; font-family: monospace; color: #38BDF8; }
  .rev-tag { font-size: 11px; font-weight: 700; background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 4px; }

  .project-title { font-size: 22px; font-weight: 800; color: #FFF; margin: 4px 0; }
  .designer-meta { font-size: 12px; color: #94A3B8; }

  /* Deliverables Grid */
  .deliverables-section { display: flex; flex-direction: column; gap: 14px; }
  .section-header-row { display: flex; flex-direction: column; gap: 2px; }
  .section-title { font-size: 16px; font-weight: 800; color: #F8FAFC; }
  .section-hint { font-size: 12px; color: #64748B; }

  .deliverables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .deliverable-card {
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .deliverable-card:hover {
    border-color: #38BDF8;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .media-thumb-box {
    width: 100%;
    height: 180px;
    background: #090D16;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .thumb-img, .thumb-video { width: 100%; height: 100%; object-fit: contain; }
  .play-badge {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.8);
    color: #FFF;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
  }
  .pdf-thumb-box { font-size: 14px; font-weight: 700; color: #94A3B8; }

  .card-info { padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
  .card-filename { font-size: 13px; font-weight: 700; color: #FFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card-sub-row { display: flex; justify-content: space-between; align-items: center; }
  .card-folder { font-size: 11px; color: #64748B; }
  .inspect-tag { font-size: 11px; color: #38BDF8; font-weight: 700; }

  /* Decision Deck */
  .decision-deck {
    background: #0F172A;
    border: 1px solid rgba(33, 161, 247, 0.3);
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  }

  .deck-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .deck-icon { font-size: 24px; }
  .deck-title { font-size: 16px; font-weight: 800; color: #FFF; }
  .deck-sub { font-size: 12px; color: #94A3B8; }

  .decision-inputs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .input-col { display: flex; flex-direction: column; gap: 4px; }
  .input-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94A3B8; }

  .portal-input, .portal-textarea {
    background: #1E293B;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 10px 12px;
    color: #FFF;
    font-size: 13px;
    outline: none;
    font-family: inherit;
  }
  .portal-input:focus, .portal-textarea:focus { border-color: #38BDF8; }

  .decision-action-buttons {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  /* States */
  .state-card {
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 60px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 540px;
    margin: 60px auto;
  }

  .state-icon { font-size: 48px; margin-bottom: 12px; }
  .state-card h2 { font-size: 18px; font-weight: 800; color: #FFF; margin-bottom: 6px; }
  .state-card p { font-size: 13px; color: #94A3B8; }
  .error-hint { font-size: 11px; color: #64748B; margin-top: 10px; }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: #38BDF8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .decision-receipt {
    margin-top: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 12px 16px;
    width: 100%;
    text-align: left;
    font-size: 12px;
  }
  .receipt-row { display: flex; justify-content: space-between; margin-bottom: 4px; color: #94A3B8; }
  .receipt-row b { color: #FFF; }

  .back-btn {
    margin-top: 16px;
    padding: 8px 16px;
    background: #043388;
    color: #FFF;
    border: none;
    border-radius: 6px;
    font-weight: 700;
    cursor: pointer;
  }

  @media (max-width: 768px) {
    .decision-inputs-grid { grid-template-columns: 1fr; }
    .decision-action-buttons { flex-direction: column-reverse; }
  }
</style>
