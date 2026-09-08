/**
 * Team Workload & Capacity View
 * Pure Microsoft Fluent System SVG Icons (Zero Emojis)
 */

const TeamView = {
  async render(container) {
    const svgs = window.SS_BRAND_SVGS || {};
    const getIcon = (name, size = 20, color = 'currentColor') => svgs.fluentIcon ? svgs.fluentIcon(name, size, color) : '';

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
        <div style="text-align: center; color: var(--text-secondary);">
          <div style="margin-bottom: 8px;">${getIcon('people', 32, 'var(--brand-accent)')}</div>
          <div>Loading Realtime Team Capacity Metrics from NAS...</div>
        </div>
      </div>
    `;

    try {
      const response = await ApiClient.getTeam();
      const team = response.team || [];

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
              ${getIcon('people', 24, 'var(--brand-accent)')}
              <span>Creative Team & Workload Allocation</span>
            </h1>
            <p style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">
              Monitor designer bandwidth, active tasks, in-review deliverables, and queue aging across workstations.
            </p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">
          ${team.map(member => {
            const w = member.workload;
            return `
              <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 44px; height: 44px; border-radius: var(--radius-pill); background: ${member.avatarColor || '#0078D4'}; color: #FFFFFF; font-weight: 800; font-size: 15px; display: flex; align-items: center; justify-content: center;">
                      ${member.staffId}
                    </div>
                    <div style="flex: 1;">
                      <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">${member.name}</h3>
                      <div style="font-size: 12px; color: var(--text-secondary);">${member.role}</div>
                      <div style="font-size: 11px; color: var(--text-tertiary);">${member.department}</div>
                    </div>
                    <span class="badge" style="background: ${member.capacityColor}20; color: ${member.capacityColor}; border: 1px solid ${member.capacityColor}40;">
                      ${member.capacityStatus}
                    </span>
                  </div>

                  <!-- Workload Metric Grid -->
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; text-align: center;">
                    <div style="background: var(--surface-card-subtle); padding: 8px; border-radius: var(--radius-md);">
                      <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">ACTIVE</div>
                      <div style="font-size: 18px; font-weight: 800; color: var(--brand-accent);">${w.active}</div>
                    </div>
                    <div style="background: var(--surface-card-subtle); padding: 8px; border-radius: var(--radius-md);">
                      <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">IN REVIEW</div>
                      <div style="font-size: 18px; font-weight: 800; color: #D97706;">${w.inReview}</div>
                    </div>
                    <div style="background: var(--surface-card-subtle); padding: 8px; border-radius: var(--radius-md);">
                      <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">OVERDUE</div>
                      <div style="font-size: 18px; font-weight: 800; color: ${w.overdue > 0 ? '#EF4444' : 'var(--text-tertiary)'};">${w.overdue}</div>
                    </div>
                  </div>

                  <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                    <div>• In Production: <b>${w.inProgress}</b></div>
                    <div>• Revisions in Progress: <b>${w.revision}</b></div>
                    <div>• Total Lifetime Completed: <b>${w.completed}</b></div>
                  </div>
                </div>

                <div style="padding-top: 12px; border-top: 1px solid var(--surface-card-border);">
                  <button class="btn btn-sm btn-secondary" style="width: 100%;" onclick="window.AppRouter.navigate('projects', { designer: '${member.staffId}' })">
                    View Assigned Projects (${w.active}) →
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="border-color: var(--color-danger);">
          <p style="color: var(--color-danger);">Failed to load team data: ${err.message}</p>
        </div>
      `;
    }
  }
};

window.TeamView = TeamView;
