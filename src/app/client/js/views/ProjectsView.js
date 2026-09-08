/**
 * Projects Directory View for SS-CAM Web Management Portal
 * Microsoft Fluent 2 System SVG Icons Compliance (Zero Emojis)
 */

const ProjectsView = {
  viewMode: 'grid', // 'grid' | 'table'

  async render(container, params = {}) {
    const activeFilters = {
      ...AppState.get('activeFilters'),
      ...params
    };

    const svgs = window.SS_BRAND_SVGS || {};
    const getIcon = (name, size = 16, color = 'currentColor') => svgs.fluentIcon ? svgs.fluentIcon(name, size, color) : '';

    container.innerHTML = `
      <!-- Status Quick Filter Pills -->
      <div class="filter-pills-row" id="proj-quick-pills">
        <button class="filter-pill ${(!activeFilters.status || activeFilters.status === 'all') ? 'active' : ''}" onclick="ProjectsView.selectStatusPill('all')">
          <span>All Statuses</span>
        </button>
        <button class="filter-pill ${activeFilters.status === 'in-progress' ? 'active' : ''}" onclick="ProjectsView.selectStatusPill('in-progress')">
          <span>In Progress</span>
        </button>
        <button class="filter-pill ${activeFilters.status === 'review' ? 'active' : ''}" onclick="ProjectsView.selectStatusPill('review')">
          <span>Pending Review</span>
        </button>
        <button class="filter-pill ${activeFilters.status === 'revision' ? 'active' : ''}" onclick="ProjectsView.selectStatusPill('revision')">
          <span>Revision Required</span>
        </button>
        <button class="filter-pill ${activeFilters.status === 'approved' ? 'active' : ''}" onclick="ProjectsView.selectStatusPill('approved')">
          <span>Approved</span>
        </button>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="filter-toolbar">
        <div class="filter-group">
          <input 
            type="text" 
            id="proj-search" 
            class="form-control" 
            style="min-width: 220px;" 
            placeholder="Search projects, Job ID, designer..." 
            value="${activeFilters.query || ''}"
          />

          <select id="proj-filter-status" class="form-control" style="width: 140px;">
            <option value="all" ${activeFilters.status === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="backlog" ${activeFilters.status === 'backlog' ? 'selected' : ''}>Backlog</option>
            <option value="in-progress" ${activeFilters.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
            <option value="review" ${activeFilters.status === 'review' ? 'selected' : ''}>Pending Review</option>
            <option value="revision" ${activeFilters.status === 'revision' ? 'selected' : ''}>Revision</option>
            <option value="approved" ${activeFilters.status === 'approved' ? 'selected' : ''}>Approved</option>
            <option value="done" ${activeFilters.status === 'done' ? 'selected' : ''}>Done</option>
            <option value="on-hold" ${activeFilters.status === 'on-hold' ? 'selected' : ''}>On Hold</option>
          </select>

          <select id="proj-filter-brand" class="form-control" style="width: 120px;">
            <option value="all" ${activeFilters.brand === 'all' ? 'selected' : ''}>All Brands</option>
            <option value="SS" ${activeFilters.brand === 'SS' ? 'selected' : ''}>SS</option>
            <option value="SSH" ${activeFilters.brand === 'SSH' ? 'selected' : ''}>SSH</option>
            <option value="SSC" ${activeFilters.brand === 'SSC' ? 'selected' : ''}>SSC</option>
            <option value="SSW" ${activeFilters.brand === 'SSW' ? 'selected' : ''}>SSW</option>
            <option value="SSE" ${activeFilters.brand === 'SSE' ? 'selected' : ''}>SSE</option>
            <option value="SST" ${activeFilters.brand === 'SST' ? 'selected' : ''}>SST</option>
          </select>

          <select id="proj-filter-priority" class="form-control" style="width: 130px;">
            <option value="all" ${activeFilters.priority === 'all' ? 'selected' : ''}>All Priorities</option>
            <option value="urgent" ${activeFilters.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
            <option value="high" ${activeFilters.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="medium" ${activeFilters.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low" ${activeFilters.priority === 'low' ? 'selected' : ''}>Low</option>
          </select>
        </div>

        <div class="filter-group">
          <div style="display: flex; background: var(--surface-card-subtle); border-radius: var(--radius-md); padding: 2px; border: 1px solid var(--surface-card-border);">
            <button id="btn-view-grid" class="btn btn-sm ${this.viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}" title="Grid View" style="display: inline-flex; align-items: center; gap: 6px;">
              ${getIcon('dashboard', 14)}
              <span>Grid</span>
            </button>
            <button id="btn-view-table" class="btn btn-sm ${this.viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}" title="Table View" style="display: inline-flex; align-items: center; gap: 6px;">
              ${getIcon('copy', 14)}
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Project List Container -->
      <div id="projects-list-container">
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">Loading projects from Synology NAS...</div>
      </div>
    `;

    // Wire filter events
    const triggerSearch = () => {
      const query = document.getElementById('proj-search').value.trim();
      const status = document.getElementById('proj-filter-status').value;
      const brand = document.getElementById('proj-filter-brand').value;
      const priority = document.getElementById('proj-filter-priority').value;

      AppState.set('activeFilters', { query, status, brand, priority });
      this.fetchAndRenderList(document.getElementById('projects-list-container'), { query, status, brand, priority });
    };

    document.getElementById('proj-search').addEventListener('input', debounce(triggerSearch, 300));
    document.getElementById('proj-filter-status').addEventListener('change', triggerSearch);
    document.getElementById('proj-filter-brand').addEventListener('change', triggerSearch);
    document.getElementById('proj-filter-priority').addEventListener('change', triggerSearch);

    document.getElementById('btn-view-grid').addEventListener('click', () => {
      this.viewMode = 'grid';
      document.getElementById('btn-view-grid').className = 'btn btn-sm btn-primary';
      document.getElementById('btn-view-table').className = 'btn btn-sm btn-ghost';
      triggerSearch();
    });

    document.getElementById('btn-view-table').addEventListener('click', () => {
      this.viewMode = 'table';
      document.getElementById('btn-view-grid').className = 'btn btn-sm btn-ghost';
      document.getElementById('btn-view-table').className = 'btn btn-sm btn-primary';
      triggerSearch();
    });

    await this.fetchAndRenderList(document.getElementById('projects-list-container'), activeFilters);
  },

  async fetchAndRenderList(container, filters) {
    const svgs = window.SS_BRAND_SVGS || {};
    const getIcon = (name, size = 14, color = 'currentColor') => svgs.fluentIcon ? svgs.fluentIcon(name, size, color) : '';

    try {
      const data = await ApiClient.getProjects(filters);
      const projects = data.projects || [];

      if (projects.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align: center; padding: 60px 20px;">
            <div style="margin-bottom: 12px;">${getIcon('folder', 40, 'var(--brand-accent)')}</div>
            <h3 style="margin-bottom: 8px; color: var(--text-primary);">No Projects Found</h3>
            <p style="color: var(--text-secondary); font-size: 13px; max-width: 400px; margin: 0 auto 16px auto;">
              No project directories matched your filter criteria in the Synology Creative-Team workspace.
            </p>
            <button class="btn btn-sm btn-secondary" onclick="ProjectsView.clearFilters()">Clear Filters</button>
          </div>
        `;
        return;
      }

      if (this.viewMode === 'grid') {
        container.innerHTML = `
          <div class="projects-grid">
            ${projects.map(p => `
              <div class="project-card" onclick="window.AppRouter.navigate('project-detail', { id: '${p.id}' })">
                <div class="project-card-header">
                  <div>
                    <span class="project-job-id">${p.jobId}</span>
                    <h3 class="project-card-title">${p.title}</h3>
                  </div>
                  <span class="badge badge-brand">${p.brand}</span>
                </div>

                <div class="project-meta-row">
                  <span class="badge badge-status-${p.status}">${p.status}</span>
                  <span class="badge badge-priority-${p.priority}">${p.priority}</span>
                  <span class="meta-item" style="display: inline-flex; align-items: center; gap: 4px;">
                    ${getIcon('profile', 13, 'var(--text-secondary)')}
                    <span>${p.designer}</span>
                  </span>
                </div>

                <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; display: flex; align-items: center; gap: 6px;">
                  <span>${getIcon('folder', 13, 'var(--text-secondary)')} ${p.presetType}</span>
                  <span>•</span>
                  <span>${p.department}</span>
                </div>

                <div class="project-card-footer">
                  <span style="${p.isOverdue ? 'color: #EF4444; font-weight: 700;' : ''}">
                    ${p.isOverdue ? 'Overdue' : 'Due: ' + (p.deadline || 'N/A')}
                  </span>
                  <span style="display: inline-flex; align-items: center; gap: 4px;">
                    ${getIcon('deliverables', 13, 'var(--text-secondary)')}
                    <span>${p.deliverableCount} Files</span>
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Brand</th>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Designer</th>
                  <th>Department</th>
                  <th>Deadline</th>
                  <th>Outputs</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${projects.map(p => `
                  <tr style="cursor: pointer;" onclick="window.AppRouter.navigate('project-detail', { id: '${p.id}' })">
                    <td style="font-family: var(--font-mono); font-weight: 800; color: var(--brand-accent);">${p.jobId}</td>
                    <td><span class="badge badge-brand">${p.brand}</span></td>
                    <td style="font-weight: 700; color: var(--text-primary);">${p.title}</td>
                    <td><span class="badge badge-status-${p.status}">${p.status}</span></td>
                    <td><span class="badge badge-priority-${p.priority}">${p.priority}</span></td>
                    <td>${p.designer}</td>
                    <td>${p.department}</td>
                    <td style="${p.isOverdue ? 'color: #EF4444; font-weight: 700;' : ''}">${p.deadline || 'N/A'}</td>
                    <td><b>${p.deliverableCount}</b></td>
                    <td>
                      <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); window.AppRouter.navigate('project-detail', { id: '${p.id}' })">View →</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="border-color: var(--color-danger);">
          <p style="color: var(--color-danger);">Failed to load project list: ${err.message}</p>
        </div>
      `;
    }
  },

  clearFilters() {
    AppState.set('activeFilters', { query: '', status: 'all', brand: 'all', priority: 'all' });
    this.render(document.getElementById('view-content'));
  },

  selectStatusPill(status) {
    const activeFilters = AppState.get('activeFilters') || {};
    activeFilters.status = status;
    AppState.set('activeFilters', activeFilters);
    const selectEl = document.getElementById('proj-filter-status');
    if (selectEl) selectEl.value = status;
    this.fetchAndRenderList(document.getElementById('projects-list-container'), activeFilters);
    
    // Update pills styling
    document.querySelectorAll('#proj-quick-pills .filter-pill').forEach(pill => {
      pill.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
  }
};

window.ProjectsView = ProjectsView;
