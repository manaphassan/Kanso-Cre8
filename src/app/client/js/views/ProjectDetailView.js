/**
 * Project Detail View (Overview, Brief, Creative Direction, Copy Studio, Deliverables, Approvals, Audit Trail)
 * Microsoft Fluent System SVG Icons Compliance (Zero Emojis)
 */

const ProjectDetailView = {
  projectData: null,
  activeTab: 'overview', // 'overview' | 'brief' | 'direction' | 'copy' | 'deliverables' | 'approvals' | 'audit'

  async render(container, params = {}) {
    const projectId = params.id;
    if (params.tab) this.activeTab = params.tab;

    const svgs = window.SS_BRAND_SVGS || {};
    const getIcon = (name, size = 16, color = 'currentColor') => svgs.fluentIcon ? svgs.fluentIcon(name, size, color) : '';

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
        <div style="text-align: center; color: var(--text-secondary);">
          <div style="margin-bottom: 8px;">${getIcon('folder', 32, 'var(--brand-accent)')}</div>
          <div>Loading Project Workspace details from Synology NAS...</div>
        </div>
      </div>
    `;

    try {
      this.projectData = await ApiClient.getProject(projectId);
      const { project, deliverables } = this.projectData;

      container.innerHTML = `
        <div style="margin-bottom: 24px;">
          <!-- Header Banner -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <span class="project-job-id" style="font-size: 14px;">${project.jobId}</span>
                <span class="badge badge-brand">${project.brand}</span>
                <span class="badge badge-status-${project.status}">${project.status}</span>
                <span class="badge badge-priority-${project.priority}">${project.priority}</span>
              </div>
              <h1 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0;">${project.title}</h1>
            </div>

            <div style="display: flex; gap: 10px;">
              ${window.AppShell && window.AppShell.canApprove() ? `
                <button class="btn btn-secondary" onclick="ProjectDetailView.openDecisionModal('revision_requested')">Request Revision</button>
                <button class="btn btn-success" onclick="ProjectDetailView.openDecisionModal('approved')">Approve Project</button>
              ` : `
                <span class="badge badge-status-review" style="font-size: 12px; padding: 8px 14px;">Submitted for Manager Review</span>
              `}
            </div>
          </div>

          <!-- Project Detail Tab Navigation -->
          <div class="tab-nav">
            <button class="tab-btn ${this.activeTab === 'overview' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('overview')">
              ${getIcon('dashboard', 14)} <span>Overview</span>
            </button>
            <button class="tab-btn ${this.activeTab === 'brief' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('brief')">
              ${getIcon('copy', 14)} <span>Project Brief</span>
            </button>
            <button class="tab-btn ${this.activeTab === 'direction' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('direction')">
              ${getIcon('copy', 14)} <span>Creative Direction</span>
            </button>
            <button class="tab-btn ${this.activeTab === 'copy' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('copy')">
              ${getIcon('copy', 14)} <span>Copywriting / Script</span>
            </button>
            <button class="tab-btn ${this.activeTab === 'deliverables' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('deliverables')">
              ${getIcon('deliverables', 14)} <span>Deliverables (${deliverables.length})</span>
            </button>
            <button class="tab-btn ${this.activeTab === 'approvals' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('approvals')">
              ${getIcon('lock', 14)} <span>Approvals (${(project.approvals || []).length})</span>
            </button>
            <button class="tab-btn ${this.activeTab === 'audit' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('audit')">
              ${getIcon('admin', 14)} <span>Audit Trail</span>
            </button>
          </div>

          <!-- Tab Content View Container -->
          <div id="project-tab-content"></div>
        </div>
      `;

      this.renderCurrentTab();
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="border-color: var(--color-danger);">
          <p style="color: var(--color-danger);">Failed to load project details: ${err.message}</p>
          <button class="btn btn-sm btn-secondary" onclick="window.AppRouter.navigate('projects')">← Back to Projects Catalog</button>
        </div>
      `;
    }
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    this.renderCurrentTab();
  },

  renderCurrentTab() {
    const tabContainer = document.getElementById('project-tab-content');
    if (!tabContainer || !this.projectData) return;

    const { project, deliverables } = this.projectData;
    const svgs = window.SS_BRAND_SVGS || {};
    const getIcon = (name, size = 16, color = 'currentColor') => svgs.fluentIcon ? svgs.fluentIcon(name, size, color) : '';

    if (this.activeTab === 'overview') {
      tabContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Project Specifications</h2>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-bottom: 20px;">
              <div>
                <div class="form-label">Job ID</div>
                <div style="font-family: var(--font-mono); font-weight: 700; font-size: 15px; color: var(--brand-accent);">${project.jobId}</div>
              </div>
              <div>
                <div class="form-label">Brand / Business Unit</div>
                <div><b>${project.brand}</b></div>
              </div>
              <div>
                <div class="form-label">Assigned Designer</div>
                <div><b>${project.designer}</b></div>
              </div>
              <div>
                <div class="form-label">Managing Lead / Reviewer</div>
                <div><b>${project.manager}</b></div>
              </div>
              <div>
                <div class="form-label">Requesting Department</div>
                <div>${project.department}</div>
              </div>
              <div>
                <div class="form-label">Preset Category</div>
                <div>${project.presetType}</div>
              </div>
              <div>
                <div class="form-label">Created Date</div>
                <div>${project.created || 'N/A'}</div>
              </div>
              <div>
                <div class="form-label">Target Deadline</div>
                <div style="${project.isOverdue ? 'color: #EF4444; font-weight: 800;' : 'font-weight: 700;'}">
                  ${project.deadline || 'No deadline set'} ${project.isOverdue ? '(OVERDUE)' : ''}
                </div>
              </div>
            </div>

            <div class="card-header" style="margin-top: 10px;">
              <h2 class="card-title" style="font-size: 14px;">Topic Tags</h2>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${(project.tags || []).length > 0 
                ? project.tags.map(t => `<span class="badge" style="background: var(--surface-card-subtle); border: 1px solid var(--surface-card-border);">${t}</span>`).join('')
                : '<span style="color: var(--text-secondary); font-size: 12px;">No tags defined</span>'
              }
            </div>
          </div>

          <!-- Quick Status Changer Card -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Workflow Stage</h2>
            </div>
            <div class="form-group">
              <label class="form-label">Update Status</label>
              <select id="quick-status-select" class="form-control">
                <option value="backlog" ${project.status === 'backlog' ? 'selected' : ''}>Backlog</option>
                <option value="in-progress" ${project.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                <option value="review" ${project.status === 'review' ? 'selected' : ''}>Pending Review</option>
                <option value="revision" ${project.status === 'revision' ? 'selected' : ''}>Revision Required</option>
                <option value="approved" ${project.status === 'approved' ? 'selected' : ''}>Approved</option>
                <option value="done" ${project.status === 'done' ? 'selected' : ''}>Done / Completed</option>
                <option value="on-hold" ${project.status === 'on-hold' ? 'selected' : ''}>On Hold</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Update Priority</label>
              <select id="quick-priority-select" class="form-control">
                <option value="low" ${project.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${project.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${project.priority === 'high' ? 'selected' : ''}>High</option>
                <option value="urgent" ${project.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
            </div>
            <button class="btn btn-primary" style="width: 100%;" onclick="ProjectDetailView.saveStatusChanges()">Save Metadata to Synology NAS</button>
          </div>
        </div>
      `;
    } else if (this.activeTab === 'brief') {
      tabContainer.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Project Brief (README.md Body)</h2>
            <div style="display: flex; gap: 8px;">
              <button id="btn-edit-brief" class="btn btn-sm btn-secondary" onclick="ProjectDetailView.toggleBriefEdit(true)">Edit Brief</button>
              <button id="btn-save-brief" class="btn btn-sm btn-primary" style="display: none;" onclick="ProjectDetailView.saveBrief()">Save Brief</button>
              <button id="btn-cancel-brief" class="btn btn-sm btn-ghost" style="display: none;" onclick="ProjectDetailView.toggleBriefEdit(false)">Cancel</button>
            </div>
          </div>
          <div id="brief-display" style="line-height: 1.6; font-size: 13.5px; color: var(--text-primary);">
            ${project.readmeBody ? escapeHtml(project.readmeBody).replace(/\n/g, '<br/>') : '<i>No project brief provided in README.md</i>'}
          </div>
          <textarea id="brief-editor" class="form-control" style="display: none; min-height: 240px; font-family: var(--font-mono); font-size: 13px;">${project.readmeBody || ''}</textarea>
        </div>
      `;
    } else if (this.activeTab === 'direction') {
      const cd = project.creativeDirection || {};
      tabContainer.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Creative & Visual Direction</h2>
          </div>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label class="form-label">Visual Concept / Style Direction</label>
              <input type="text" id="cd-concept" class="form-control" value="${cd.visual_concept || ''}" placeholder="e.g. Modern Bold Minimalist, Dark Neon Accent" />
            </div>
            <div>
              <label class="form-label">Primary Color Palette Tokens</label>
              <input type="text" id="cd-colors" class="form-control" value="${cd.color_palette || ''}" placeholder="e.g. Prussian Blue #022057, SS Blue #043388, Celestial Blue #21A1F7" />
            </div>
            <div>
              <label class="form-label">Target Audience & Brand Positioning Notes</label>
              <textarea id="cd-audience" class="form-control" style="min-height: 90px;">${cd.target_audience || ''}</textarea>
            </div>
            <button class="btn btn-primary" style="width: 200px;" onclick="ProjectDetailView.saveCreativeDirection()">Save Direction</button>
          </div>
        </div>
      `;
    } else if (this.activeTab === 'copy') {
      const copy = project.copywriting || {};
      tabContainer.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Copywriting & Script Lifecycle</h2>
            <span class="badge badge-brand">${copy.status || 'draft'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label class="form-label">Main Campaign Headline / Hook</label>
              <input type="text" id="copy-headline" class="form-control" value="${copy.headline || ''}" placeholder="Enter primary hook or video intro title" />
            </div>
            <div>
              <label class="form-label">Script Body / Ad Copy / Dialogue Transcript</label>
              <textarea id="copy-body" class="form-control" style="min-height: 180px; font-family: var(--font-sans);">${copy.body_copy || ''}</textarea>
            </div>
            <div>
              <label class="form-label">Copywriting Approval Status</label>
              <select id="copy-status-select" class="form-control" style="width: 220px;">
                <option value="draft" ${copy.status === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="submitted" ${copy.status === 'submitted' ? 'selected' : ''}>Submitted for Review</option>
                <option value="approved" ${copy.status === 'approved' ? 'selected' : ''}>Approved</option>
                <option value="revision_requested" ${copy.status === 'revision_requested' ? 'selected' : ''}>Revision Requested</option>
              </select>
            </div>
            <button class="btn btn-primary" style="width: 200px;" onclick="ProjectDetailView.saveCopywriting()">Update Script Studio</button>
          </div>
        </div>
      `;
    } else if (this.activeTab === 'deliverables') {
      tabContainer.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Project Deliverables & Production Outputs</h2>
            <span style="font-size: 12px; color: var(--text-secondary);">${deliverables.length} files in NAS workspace</span>
          </div>
          ${deliverables.length === 0 ? `
            <p style="color: var(--text-secondary); font-size: 13px; text-align: center; padding: 30px;">
              No output files found in this project's <code style="font-family: var(--font-mono);">05_DELIVERABLES</code> directory.
            </p>
          ` : `
            <div class="deliverables-grid">
              ${deliverables.map(d => `
                <div class="deliverable-card">
                  <div class="deliverable-preview-box">
                    ${d.previewType === 'image'
                      ? `<img src="${d.previewUrl}" alt="${d.filename}">`
                      : `<div style="display: flex; align-items: center; justify-content: center;">${getIcon('folder', 48, 'var(--brand-accent)')}</div>`
                    }
                  </div>
                  <div class="deliverable-info">
                    <div class="deliverable-filename" title="${d.filename}">${d.filename}</div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary);">
                      <span>${d.extension ? d.extension.toUpperCase() : 'FILE'}</span>
                      <span>${d.formattedSize}</span>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                      <button class="btn btn-sm btn-primary" style="flex: 1;" onclick="ProjectDetailView.openDeliverableLightbox('${d.id}', '${d.filename}', '${d.previewUrl || ''}')">Inspect</button>
                      <a href="${d.downloadUrl}" class="btn btn-sm btn-secondary" title="Download" download>⬇️</a>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    } else if (this.activeTab === 'approvals') {
      const approvals = project.approvals || [];
      tabContainer.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Approval & Revision Decision History</h2>
          </div>
          ${approvals.length === 0 ? `
            <p style="color: var(--text-secondary); font-size: 13px; text-align: center; padding: 30px;">No approval decisions logged yet for this project.</p>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${approvals.map(appr => `
                <div style="padding: 14px; border-radius: var(--radius-md); background: var(--surface-card-subtle); border: 1px solid var(--surface-card-border); display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                      <span class="badge ${appr.decision === 'approved' ? 'badge-status-approved' : 'badge-status-revision'}">
                        ${appr.decision.toUpperCase().replace('_', ' ')}
                      </span>
                      <span style="font-weight: 700; font-size: 13px; color: var(--text-primary);">${appr.reviewerName} (${appr.reviewerRole})</span>
                    </div>
                    <p style="font-size: 12.5px; color: var(--text-secondary); margin: 4px 0 0 0;">
                      ${appr.notes || 'No review feedback provided.'}
                    </p>
                  </div>
                  <span style="font-size: 11px; color: var(--text-tertiary); white-space: nowrap;">
                    ${new Date(appr.timestamp).toLocaleString()}
                  </span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    } else if (this.activeTab === 'audit') {
      const history = project.history || [];
      tabContainer.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Project Activity Audit Trail</h2>
          </div>
          ${history.length === 0 ? `
            <p style="color: var(--text-secondary); font-size: 13px; text-align: center; padding: 30px;">No activity history recorded.</p>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${history.map(h => `
                <div style="padding: 10px 12px; border-bottom: 1px solid var(--surface-card-border); display: flex; justify-content: space-between; font-size: 12.5px;">
                  <div>
                    <span style="font-weight: 700; color: var(--text-primary);">${h.actor || 'System'}</span>
                    <span style="color: var(--text-secondary);">: ${h.action}</span>
                    ${h.details ? `<div style="font-size: 11.5px; color: var(--text-tertiary); margin-top: 2px;">${h.details}</div>` : ''}
                  </div>
                  <span style="font-size: 11px; color: var(--text-tertiary);">${new Date(h.timestamp).toLocaleString()}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    }
  },

  async saveStatusChanges() {
    const status = document.getElementById('quick-status-select').value;
    const priority = document.getElementById('quick-priority-select').value;

    try {
      await ApiClient.updateProjectStatus(this.projectData.project.id, { status, priority });
      window.showToast('Project metadata updated on Synology NAS', 'success');
      this.projectData = await ApiClient.getProject(this.projectData.project.id);
      this.renderCurrentTab();
    } catch (err) {
      window.showToast(`Update failed: ${err.message}`, 'danger');
    }
  },

  toggleBriefEdit(isEditing) {
    const display = document.getElementById('brief-display');
    const editor = document.getElementById('brief-editor');
    const btnEdit = document.getElementById('btn-edit-brief');
    const btnSave = document.getElementById('btn-save-brief');
    const btnCancel = document.getElementById('btn-cancel-brief');

    if (isEditing) {
      display.style.display = 'none';
      editor.style.display = 'block';
      btnEdit.style.display = 'none';
      btnSave.style.display = 'inline-block';
      btnCancel.style.display = 'inline-block';
    } else {
      display.style.display = 'block';
      editor.style.display = 'none';
      btnEdit.style.display = 'inline-block';
      btnSave.style.display = 'none';
      btnCancel.style.display = 'none';
    }
  },

  async saveBrief() {
    const readmeBody = document.getElementById('brief-editor').value;
    try {
      await ApiClient.updateProjectBrief(this.projectData.project.id, readmeBody);
      window.showToast('Brief updated successfully in README.md', 'success');
      this.projectData.project.readmeBody = readmeBody;
      this.toggleBriefEdit(false);
      document.getElementById('brief-display').innerHTML = escapeHtml(readmeBody).replace(/\n/g, '<br/>');
    } catch (err) {
      window.showToast(`Failed to save brief: ${err.message}`, 'danger');
    }
  },

  async saveCreativeDirection() {
    const visual_concept = document.getElementById('cd-concept').value;
    const color_palette = document.getElementById('cd-colors').value;
    const target_audience = document.getElementById('cd-audience').value;

    try {
      await ApiClient.updateCreativeDirection(this.projectData.project.id, { visual_concept, color_palette, target_audience });
      window.showToast('Creative direction saved', 'success');
      this.projectData = await ApiClient.getProject(this.projectData.project.id);
    } catch (err) {
      window.showToast(`Error: ${err.message}`, 'danger');
    }
  },

  async saveCopywriting() {
    const headline = document.getElementById('copy-headline').value;
    const body_copy = document.getElementById('copy-body').value;
    const status = document.getElementById('copy-status-select').value;

    try {
      await ApiClient.updateCopywriting(this.projectData.project.id, { headline, body_copy, status });
      window.showToast('Copywriting state updated', 'success');
      this.projectData = await ApiClient.getProject(this.projectData.project.id);
    } catch (err) {
      window.showToast(`Error: ${err.message}`, 'danger');
    }
  },

  openDecisionModal(defaultDecision) {
    const { project } = this.projectData;
    window.Modal.open({
      title: defaultDecision === 'approved' ? 'Approve Project Deliverables' : 'Request Project Revision',
      content: `
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px;">
          Submitting formal management feedback for <b>${project.jobId} - ${project.title}</b>.
        </p>
        <div class="form-group">
          <label class="form-label">Review Decision</label>
          <select id="modal-decision-select" class="form-control">
            <option value="approved" ${defaultDecision === 'approved' ? 'selected' : ''}>Approve Project & Sign Off</option>
            <option value="revision_requested" ${defaultDecision === 'revision_requested' ? 'selected' : ''}>Request Revision from Designer</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Feedback Notes / Required Changes</label>
          <textarea id="modal-decision-notes" class="form-control" style="min-height: 100px;" placeholder="Provide explicit review comments for the designer..."></textarea>
        </div>
      `,
      confirmText: 'Submit Decision to NAS',
      onConfirm: async () => {
        const decision = document.getElementById('modal-decision-select').value;
        const notes = document.getElementById('modal-decision-notes').value;

        try {
          await ApiClient.recordApproval(project.id, { decision, notes });
          window.showToast('Decision recorded and team notified', 'success');
          this.projectData = await ApiClient.getProject(project.id);
          this.renderCurrentTab();
        } catch (err) {
          window.showToast(`Error: ${err.message}`, 'danger');
        }
      }
    });
  },

  openDeliverableLightbox(id, filename, previewUrl) {
    const { project } = this.projectData;
    window.Modal.openLightbox({
      filename,
      previewUrl,
      project,
      onApprove: () => {
        window.Modal.close();
        this.openDecisionModal('approved');
      },
      onRevision: () => {
        window.Modal.close();
        this.openDecisionModal('revision_requested');
      }
    });
  }
};

window.ProjectDetailView = ProjectDetailView;
