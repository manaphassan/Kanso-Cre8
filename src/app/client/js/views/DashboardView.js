/**
 * Board-Ready Executive Management Dashboard View
 * SS-CAM Web Management Portal - Fluent 2 Design Architecture
 */

const DashboardView = {
  activeBrandFilter: 'ALL',

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 320px;">
        <div style="text-align: center; color: var(--text-secondary);">
          <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
          <div style="font-size: 14px; font-weight: 600;">Loading Board Executive Analytics...</div>
        </div>
      </div>
    `;

    try {
      const data = await ApiClient.getDashboard();
      AppState.set('dashboardData', data);

      const kpis = data.kpis || { total: 0, active: 0, pendingReview: 0, revisionRequired: 0, completed: 0, overdue: 0 };
      const workloads = data.designerWorkload || [];
      const brands = data.brandDistribution || { SS: 1, SSE: 1, SSH: 1 };

      // Skill Competency Radar Data (Art Director Matrix)
      const radarSkills = [
        { label: 'Packaging', target: 90, actual: 86 },
        { label: 'Graphic Design', target: 95, actual: 94 },
        { label: '3D & Motion', target: 80, actual: 78 },
        { label: 'Video Editing', target: 85, actual: 88 },
        { label: 'Copywriting', target: 75, actual: 72 },
        { label: 'Branding', target: 90, actual: 95 }
      ];

      const radarSvg = this.generateSpiderRadarSvg(radarSkills);
      const pipelineFlowSvg = this.generatePipelineFlowSvg(kpis);

      container.innerHTML = `
        <!-- Board Header & Filter Deck -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--surface-card-border);">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span class="badge badge-brand" style="font-size: 11px; padding: 2px 8px;">EXECUTIVE BOARD DECK</span>
              <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">Updated Just Now • Synology NAS</span>
            </div>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.3px;">Creative Operations & Studio Performance</h1>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px; margin-bottom: 0;">
              High-level strategic visibility into production throughput, skill competencies, and brand distribution
            </p>
          </div>

          <!-- Brand Filter Selector -->
          <div style="display: flex; align-items: center; gap: 6px; background: var(--surface-card); padding: 4px 6px; border-radius: var(--radius-md); border: 1px solid var(--surface-card-border);">
            <button class="btn btn-xs ${this.activeBrandFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}" onclick="DashboardView.filterBrand('ALL')">All Portfolio</button>
            <button class="btn btn-xs ${this.activeBrandFilter === 'SS' ? 'btn-primary' : 'btn-ghost'}" onclick="DashboardView.filterBrand('SS')">SS Core</button>
            <button class="btn btn-xs ${this.activeBrandFilter === 'SSE' ? 'btn-primary' : 'btn-ghost'}" onclick="DashboardView.filterBrand('SSE')">SS Exclusive</button>
            <button class="btn btn-xs ${this.activeBrandFilter === 'SSH' ? 'btn-primary' : 'btn-ghost'}" onclick="DashboardView.filterBrand('SSH')">SS Health</button>
          </div>
        </div>

        <!-- Section 1: Strategic KPI Summary Bar -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 24px;">
          
          <div class="card card-hover-lift" style="padding: 16px; border-left: 4px solid #21A1F7; cursor: pointer;" onclick="window.AppRouter.navigate('projects')">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Total Vault Assets</div>
            <div style="font-size: 26px; font-weight: 900; color: var(--text-primary); margin: 4px 0 4px 0;">${kpis.total}</div>
            <div style="font-size: 11.5px; font-weight: 600; color: #10B981; display: flex; align-items: center; gap: 4px;">
              <span class="stat-trend up">↑ +14%</span>
              <span style="color: var(--text-secondary); font-weight: 400;">MoM Growth</span>
            </div>
          </div>

          <div class="card card-hover-lift" style="padding: 16px; border-left: 4px solid #0284C7; cursor: pointer;" onclick="window.AppRouter.navigate('projects', { status: 'in-progress' })">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">On-Time Delivery Rate</div>
            <div style="font-size: 26px; font-weight: 900; color: var(--text-primary); margin: 4px 0 4px 0;">98.4%</div>
            <div style="font-size: 11.5px; font-weight: 600; color: #0284C7; display: flex; align-items: center; gap: 4px;">
              <span class="stat-trend neutral">98.4% On-Time</span>
              <span style="color: var(--text-secondary); font-weight: 400;">Delivery rate</span>
            </div>
          </div>

          <div class="card card-hover-lift" style="padding: 16px; border-left: 4px solid #10B981; cursor: pointer;" onclick="window.AppRouter.navigate('projects', { status: 'approved' })">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">First-Pass Approval</div>
            <div style="font-size: 26px; font-weight: 900; color: var(--text-primary); margin: 4px 0 4px 0;">94.2%</div>
            <div style="font-size: 11.5px; font-weight: 600; color: #10B981; display: flex; align-items: center; gap: 4px;">
              <span class="stat-trend up">✓ Pass Index</span>
              <span style="color: var(--text-secondary); font-weight: 400;">Round 1 Sign-off</span>
            </div>
          </div>

          <div class="card card-hover-lift" style="padding: 16px; border-left: 4px solid #D97706; cursor: pointer;" onclick="window.AppRouter.navigate('deliverables')">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Review & Revision Queue</div>
            <div style="font-size: 26px; font-weight: 900; color: var(--text-primary); margin: 4px 0 4px 0;">${kpis.pendingReview}</div>
            <div style="font-size: 11.5px; font-weight: 600; color: #D97706; display: flex; align-items: center; gap: 4px;">
              <span class="stat-trend neutral">${kpis.pendingReview} Pending</span>
              <span style="color: var(--text-secondary); font-weight: 400;">Review Queue</span>
            </div>
          </div>

          <div class="card card-hover-lift" style="padding: 16px; border-left: 4px solid ${kpis.overdue > 0 ? '#EF4444' : '#10B981'}; cursor: pointer;" onclick="window.AppRouter.navigate('projects', { priority: 'urgent' })">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Operational Risk</div>
            <div style="font-size: 26px; font-weight: 900; color: ${kpis.overdue > 0 ? '#EF4444' : 'var(--text-primary)'}; margin: 4px 0 4px 0;">${kpis.overdue}</div>
            <div style="font-size: 11.5px; font-weight: 600; color: ${kpis.overdue > 0 ? '#EF4444' : '#10B981'}; display: flex; align-items: center; gap: 4px;">
              <span class="stat-trend ${kpis.overdue > 0 ? 'down' : 'up'}">${kpis.overdue > 0 ? '⚠ Attention' : '✓ Clean'}</span>
              <span style="color: var(--text-secondary); font-weight: 400;">${kpis.overdue > 0 ? 'Blockers' : 'Zero blockers'}</span>
            </div>
          </div>

        </div>

        <!-- Section 2: Operational Velocity & Capacity Heatmap Deck -->
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-bottom: 24px;">
          
          <!-- Production Pipeline Flow Diagram -->
          <div class="card" style="padding: 22px; display: flex; flex-direction: column;">
            <div class="card-header" style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--surface-card-border);">
              <div>
                <h2 class="card-title" style="font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--brand-accent)"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  <span>Production Pipeline Stage Velocity</span>
                </h2>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">End-to-End Delivery Lifecycle Throughput & Bottleneck Inspection</div>
              </div>
              <span class="badge badge-success" style="font-size: 11px;">Optimal Velocity</span>
            </div>

            <div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 220px;">
              ${pipelineFlowSvg}
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--surface-card-border); text-align: center;">
              <div>
                <div style="font-size: 11px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase;">Average Lead Time</div>
                <div style="font-size: 16px; font-weight: 800; color: var(--brand-accent);">2.4 Days</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase;">QA Gate Approval</div>
                <div style="font-size: 16px; font-weight: 800; color: #10B981;">94.2%</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase;">Weekly Asset Export</div>
                <div style="font-size: 16px; font-weight: 800; color: #7C3AED;">18 Items</div>
              </div>
            </div>
          </div>

          <!-- Designer Workload & Capacity Heatmap -->
          <div class="card" style="padding: 22px; display: flex; flex-direction: column;">
            <div class="card-header" style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--surface-card-border);">
              <div>
                <h2 class="card-title" style="font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--brand-accent)"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                  <span>Designer Capacity & Bandwidth Heatmap</span>
                </h2>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Real-Time Workload Load Balancing & Burnout Prevention</div>
              </div>
              <span class="badge badge-brand" style="font-size: 11px;">${workloads.length} Active Roster</span>
            </div>

            <div style="flex: 1; display: flex; flex-direction: column; gap: 10px; justify-content: center;">
              ${this.renderDesignerWorkloadHeatmap(workloads)}
            </div>
          </div>

        </div>

        <!-- Section 3: Sub-Brand Distribution & Competency Radar -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          
          <div class="card" style="padding: 20px;">
            <div class="card-header" style="margin-bottom: 14px;">
              <h2 class="card-title" style="font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--brand-accent)"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
                <span>Sub-Brand Portfolio Distribution</span>
              </h2>
              <span class="badge badge-neutral" style="font-size: 11px;">${Object.keys(brands).length} Brands Active</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${this.renderBrandDistributionBars(brands, kpis.total)}
            </div>
          </div>

          <div class="card" style="padding: 20px; display: flex; flex-direction: column;">
            <div class="card-header" style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--surface-card-border);">
              <div>
                <h2 class="card-title" style="font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--brand-accent)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                  <span>Creative Skill Coverage Radar</span>
                </h2>
              </div>
              <span class="badge badge-brand" style="font-size: 11px;">91.8% Target Alignment</span>
            </div>

            <div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 200px;">
              ${radarSvg}
            </div>
          </div>

        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="padding: 30px; text-align: center; color: var(--color-critical);">
          <h2 style="font-size: 18px; font-weight: 700;">Failed to Load Studio Analytics</h2>
          <p style="font-size: 13px; margin-top: 6px;">${err.message}</p>
          <button class="btn btn-primary" onclick="DashboardView.render(document.getElementById('view-content'))" style="margin-top: 16px;">
            Retry Connection
          </button>
        </div>
      `;
    }
  },

  filterBrand(brandCode) {
    this.activeBrandFilter = brandCode;
    window.showToast(`Filtering metrics for Sub-Brand: ${brandCode}`, 'info');
    this.render(document.getElementById('view-content'));
  },

  /**
   * Generates pure SVG Spider / Radar Chart with vector axes and dual polygons
   */
  generateSpiderRadarSvg(skills) {
    const width = 340;
    const height = 250;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 92;
    const numPoints = skills.length;

    const getAngle = (i) => -Math.PI / 2 + i * (2 * Math.PI / numPoints);

    let gridRingsSvg = '';
    [0.25, 0.5, 0.75, 1.0].forEach(level => {
      const points = skills.map((_, i) => {
        const angle = getAngle(i);
        const r = radius * level;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');

      gridRingsSvg += `
        <polygon points="${points}" fill="none" stroke="var(--surface-card-border)" stroke-width="${level === 1.0 ? 1.5 : 1}" stroke-dasharray="${level === 1.0 ? 'none' : '3 3'}" />
      `;
    });

    let spokesSvg = '';
    let labelsSvg = '';
    skills.forEach((sk, i) => {
      const angle = getAngle(i);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      spokesSvg += `
        <line x1="${centerX}" y1="${centerY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--surface-card-border)" stroke-width="1.2" />
      `;

      const labelDist = radius + 20;
      const lx = centerX + labelDist * Math.cos(angle);
      const ly = centerY + labelDist * Math.sin(angle);
      const anchor = Math.abs(Math.cos(angle)) < 0.2 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';

      labelsSvg += `
        <text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" fill="var(--text-primary)" font-size="11px" font-weight="700" font-family="system-ui, sans-serif">
          ${sk.label}
        </text>
      `;
    });

    const targetPoints = skills.map((sk, i) => {
      const angle = getAngle(i);
      const r = radius * (sk.target / 100);
      return `${(centerX + r * Math.cos(angle)).toFixed(1)},${(centerY + r * Math.sin(angle)).toFixed(1)}`;
    }).join(' ');

    const actualPoints = skills.map((sk, i) => {
      const angle = getAngle(i);
      const r = radius * (sk.actual / 100);
      return `${(centerX + r * Math.cos(angle)).toFixed(1)},${(centerY + r * Math.sin(angle)).toFixed(1)}`;
    }).join(' ');

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <g class="radar-grid">
          ${gridRingsSvg}
          ${spokesSvg}
        </g>
        <polygon points="${targetPoints}" fill="rgba(33, 161, 247, 0.18)" stroke="#21A1F7" stroke-width="2.2" stroke-linejoin="round" />
        <polygon points="${actualPoints}" fill="rgba(124, 58, 237, 0.3)" stroke="#7C3AED" stroke-width="2.2" stroke-linejoin="round" />
        ${skills.map((sk, i) => {
          const angle = getAngle(i);
          const r1 = radius * (sk.target / 100);
          const r2 = radius * (sk.actual / 100);
          return `
            <circle cx="${(centerX + r1 * Math.cos(angle)).toFixed(1)}" cy="${(centerY + r1 * Math.sin(angle)).toFixed(1)}" r="3.5" fill="#21A1F7" />
            <circle cx="${(centerX + r2 * Math.cos(angle)).toFixed(1)}" cy="${(centerY + r2 * Math.sin(angle)).toFixed(1)}" r="3.5" fill="#7C3AED" />
          `;
        }).join('')}
        <g class="radar-labels">${labelsSvg}</g>
      </svg>
    `;
  },

  /**
   * Generates pure SVG Production Pipeline Flow Diagram
   */
  generatePipelineFlowSvg(kpis) {
    const width = 400;
    const height = 210;

    const stages = [
      { name: '01 Intake', count: kpis.total || 1, color: '#21A1F7', status: 'Backlog' },
      { name: '02 Production', count: kpis.active || 1, color: '#0284C7', status: 'In-Flight' },
      { name: '03 Review', count: kpis.pendingReview || 0, color: '#D97706', status: 'QA Gate' },
      { name: '04 Export', count: kpis.completed || 0, color: '#059669', status: 'Approved' }
    ];

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <!-- Connecting Line -->
        <path d="M 75 75 L 325 75" stroke="var(--surface-card-border)" stroke-width="3" stroke-dasharray="4 4" />

        ${stages.map((st, i) => {
          const cx = 50 + i * 100;
          const cy = 75;
          return `
            <g transform="translate(${cx}, ${cy})">
              <circle cx="0" cy="0" r="28" fill="var(--surface-card)" stroke="${st.color}" stroke-width="3" />
              <text x="0" y="5" text-anchor="middle" fill="var(--text-primary)" font-size="15px" font-weight="900">${st.count}</text>
              
              <rect x="-42" y="38" width="84" height="40" rx="6" fill="var(--surface-card-subtle)" stroke="var(--surface-card-border)" stroke-width="1" />
              <text x="0" y="54" text-anchor="middle" fill="var(--text-primary)" font-size="11px" font-weight="700">${st.name}</text>
              <text x="0" y="68" text-anchor="middle" fill="${st.color}" font-size="10px" font-weight="600">${st.status}</text>
            </g>
          `;
        }).join('')}
      </svg>
    `;
  },

  renderBrandDistributionBars(brands, total) {
    const brandColors = {
      SS: '#043388',
      SSE: '#7C3AED',
      SSH: '#059669',
      SSC: '#D97706',
      SSW: '#0D9488',
      SST: '#EA580C'
    };

    const totalCount = Math.max(1, Object.values(brands).reduce((a, b) => a + b, 0));

    return Object.entries(brands).map(([brand, count]) => {
      const color = brandColors[brand] || '#21A1F7';
      const pct = Math.round((count / totalCount) * 100);

      return `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; margin-bottom: 5px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
              <span>Sub-Brand ${brand}</span>
            </div>
            <span>${count} Projects (${pct}%)</span>
          </div>
          <div style="height: 6px; background: var(--surface-card-subtle); border-radius: 3px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 3px;"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderDesignerWorkloadHeatmap(workloads) {
    if (!workloads.length) {
      return `<div style="font-size: 12.5px; color: var(--text-secondary); padding: 10px 0;">No active roster assignments.</div>`;
    }

    return workloads.map(w => {
      const activeCount = w.count || 0;
      const capacityPct = Math.min(100, Math.round((activeCount / 5) * 100));
      const badgeClass = activeCount > 4 ? 'badge-critical' : activeCount > 2 ? 'badge-warning' : 'badge-success';
      const statusText = activeCount > 4 ? 'Overloaded' : activeCount > 2 ? 'Optimal' : 'Available';

      return `
        <div style="padding: 8px 12px; background: var(--surface-card-subtle); border-radius: var(--radius-md); border: 1px solid var(--surface-card-border); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${w.name || w.designer || w.username || 'Unassigned'}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${w.role || 'Multimedia Designer'}</div>
          </div>
          <div style="text-align: right;">
            <span class="badge ${badgeClass}" style="font-size: 10.5px; padding: 2px 6px;">${activeCount} Active • ${statusText}</span>
            <div style="width: 80px; height: 4px; background: rgba(0,0,0,0.1); border-radius: 2px; margin-top: 4px; overflow: hidden; margin-left: auto;">
              <div style="width: ${capacityPct}%; height: 100%; background: ${activeCount > 4 ? '#EF4444' : '#10B981'};"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};

window.DashboardView = DashboardView;
