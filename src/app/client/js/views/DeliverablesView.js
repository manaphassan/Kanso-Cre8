/**
 * Deliverables & Approvals Review Queue View
 * Microsoft Fluent System SVG Icons Compliance (Zero Emojis)
 */

const DeliverablesView = {
  async render(container) {
    const svgs = window.SS_BRAND_SVGS || {};
    const getIcon = (name, size = 20, color = 'currentColor') => svgs.fluentIcon ? svgs.fluentIcon(name, size, color) : '';

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
        <div style="text-align: center; color: var(--text-secondary);">
          <div style="margin-bottom: 8px;">${getIcon('deliverables', 32, 'var(--brand-accent)')}</div>
          <div>Loading Deliverable Review Queue...</div>
        </div>
      </div>
    `;

    try {
      const response = await ApiClient.getDeliverables();
      const deliverables = response.deliverables || [];

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
              ${getIcon('deliverables', 24, 'var(--brand-accent)')}
              <span>Deliverable Review Queue</span>
            </h1>
            <p style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">
              Review production exports and presentation mockups submitted by designers across all active projects.
            </p>
          </div>
          <span class="badge badge-status-review" style="font-size: 12px; padding: 6px 12px;">
            ${deliverables.length} Items Pending Management Review
          </span>
        </div>

        ${deliverables.length === 0 ? `
          <div class="card" style="text-align: center; padding: 60px 20px;">
            <div style="margin-bottom: 12px;">${getIcon('check', 40, 'var(--color-success)')}</div>
            <h3 style="color: var(--text-primary); margin-bottom: 8px;">Review Queue Empty</h3>
            <p style="color: var(--text-secondary); font-size: 13px;">No pending deliverables require management sign-off at this time.</p>
          </div>
        ` : `
          <div class="deliverables-grid">
            ${deliverables.map(d => `
              <div class="deliverable-card card-hover-lift">
                <div class="deliverable-preview-box">
                  ${d.previewType === 'image' 
                    ? `<img src="${d.previewUrl}" alt="${d.filename}">`
                    : `<div style="display: flex; align-items: center; justify-content: center;">${getIcon('folder', 48, 'var(--brand-accent)')}</div>`
                  }
                </div>

                <div class="deliverable-info">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <span class="badge badge-brand">${d.projectBrand}</span>
                    <span class="badge badge-status-${d.projectStatus}">${d.projectStatus}</span>
                  </div>

                  <div style="font-size: 11px; font-weight: 700; color: var(--brand-accent); font-family: var(--font-mono); margin-top: 4px;">
                    ${d.projectJobId} • ${d.projectTitle}
                  </div>

                  <div class="deliverable-filename" title="${d.filename}">
                    ${d.filename}
                  </div>

                  <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary);">
                    <span>${d.projectDesigner}</span>
                    <span>${d.formattedSize}</span>
                  </div>

                  <div style="display: flex; gap: 8px; margin-top: 8px;">
                    ${window.AppShell && window.AppShell.canApprove() ? `
                      <button class="btn btn-sm btn-primary" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" onclick="DeliverablesView.inspectDeliverable('${d.projectId}', '${d.id}', '${d.filename}', '${d.previewUrl || ''}')">
                        ${getIcon('eyeIcon', 14)}
                        <span>Review & Sign-off</span>
                      </button>
                    ` : `
                      <button class="btn btn-sm btn-secondary" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" onclick="DeliverablesView.inspectDeliverable('${d.projectId}', '${d.id}', '${d.filename}', '${d.previewUrl || ''}')">
                        ${getIcon('eyeIcon', 14)}
                        <span>Inspect Asset</span>
                      </button>
                    `}
                    <a href="${d.downloadUrl}" class="btn btn-sm btn-secondary" style="display: inline-flex; align-items: center; justify-content: center;" title="Download Asset" download>
                      ${getIcon('download', 14)}
                    </a>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="border-color: var(--color-danger);">
          <p style="color: var(--color-danger);">Failed to load deliverables: ${err.message}</p>
        </div>
      `;
    }
  },

  inspectDeliverable(projectId, deliverableId, filename, previewUrl) {
    ApiClient.getProject(projectId).then(res => {
      window.Modal.openLightbox({
        filename,
        previewUrl,
        project: res.project,
        onApprove: () => {
          window.Modal.close();
          ProjectDetailView.projectData = res;
          ProjectDetailView.openDecisionModal('approved');
        },
        onRevision: () => {
          window.Modal.close();
          ProjectDetailView.projectData = res;
          ProjectDetailView.openDecisionModal('revision_requested');
        }
      });
    });
  }
};

window.DeliverablesView = DeliverablesView;
