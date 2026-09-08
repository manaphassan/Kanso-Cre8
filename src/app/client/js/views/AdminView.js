/**
 * Administration, RBAC, Staff Directory & Diagnostics View
 * Microsoft Fluent System SVG Icons Compliance (Zero Emojis)
 */

const AdminView = {
  async render(container) {
    const svgs = window.SS_BRAND_SVGS || {};
    const getIcon = (name, size = 20, color = 'currentColor') => svgs.fluentIcon ? svgs.fluentIcon(name, size, color) : '';

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
        <div style="text-align: center; color: var(--text-secondary);">
          <div style="margin-bottom: 8px;">${getIcon('admin', 32, 'var(--brand-accent)')}</div>
          <div>Loading System Diagnostics & Staff Directory...</div>
        </div>
      </div>
    `;

    try {
      const [sysStatus, usersData, auditData, rosterData] = await Promise.all([
        ApiClient.getSystemStatus(),
        ApiClient.getUsers(),
        ApiClient.getAuditLogs({ limit: 50 }),
        ApiClient.getStaffRoster()
      ]);

      const currentUser = AppState.get('currentUser');
      const roster = rosterData.roster || [];

      container.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h1 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
            ${getIcon('admin', 24, 'var(--brand-accent)')}
            <span>System Administration & Governance</span>
          </h1>
          <p style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">
            Centralized Staff Directory provisioning for SS-CAM, workspace integrity diagnostics, and global audit logs.
          </p>
        </div>

        <!-- Section 1: Centralized Staff Directory Management -->
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <div>
              <h2 class="card-title" style="display: flex; align-items: center; gap: 8px;">
                ${getIcon('people', 18, 'var(--brand-primary)')}
                <span>Centralized Staff Directory & SS-CAM Roster</span>
              </h2>
              <p style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                Registered designers and staff IDs sync automatically to SS-CAM dropdown selectors on NAS (\\_Team\\_Config\\staff_directory.json).
              </p>
            </div>
            <button class="btn btn-sm btn-primary" onclick="AdminView.openAddStaffModal()">+ Add New Staff Member</button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Full Name</th>
                  <th>Role / Specialization</th>
                  <th>Department</th>
                  <th>Default Brand</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${roster.map(m => `
                  <tr>
                    <td style="font-family: var(--font-mono); font-weight: 800; color: var(--brand-accent);">${m.staffId}</td>
                    <td style="font-weight: 700; color: var(--text-primary);">${m.name}</td>
                    <td>${m.role}</td>
                    <td>${m.department}</td>
                    <td><span class="badge badge-brand">${m.defaultBrand || 'SS'}</span></td>
                    <td>
                      <span class="badge ${m.active !== false ? 'badge-status-approved' : 'badge-status-on-hold'}">
                        ${m.active !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-ghost" onclick="AdminView.toggleStaffStatus('${m.staffId}', ${m.active !== false})">
                        ${m.active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 2: Split Grid: Workspace Diagnostics + Live RBAC Role Switcher -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
          <!-- Workspace Diagnostics -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title" style="display: flex; align-items: center; gap: 8px;">
                ${getIcon('desktop', 18, 'var(--brand-primary)')}
                <span>Workspace & NAS Diagnostics</span>
              </h2>
              <span class="badge badge-status-approved">ONLINE</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
              <div>
                <div class="form-label">Application Version</div>
                <div style="font-family: var(--font-mono); font-weight: 700;">${sysStatus.app} v${sysStatus.version}</div>
              </div>
              <div>
                <div class="form-label">Active Workspace Root</div>
                <div style="font-family: var(--font-mono); word-break: break-all; background: var(--surface-card-subtle); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--surface-card-border);">
                  ${sysStatus.workspaceRoot}
                </div>
              </div>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                <div>
                  <div class="form-label">Cached Projects</div>
                  <div style="font-weight: 800; font-size: 18px; color: var(--brand-accent);">${sysStatus.cachedProjects}</div>
                </div>
                <div>
                  <div class="form-label">System Uptime</div>
                  <div style="font-weight: 800; font-size: 18px;">${Math.floor(sysStatus.uptimeSeconds / 60)} mins</div>
                </div>
              </div>
              <div>
                <div class="form-label">Last Workspace File Scan</div>
                <div>${new Date(sysStatus.lastScan).toLocaleString()}</div>
              </div>
              <div style="margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--surface-card-border);">
                <div class="form-label">Official SuamiSihat Brand Assets Vault</div>
                <a href="https://assets.suamisihat.myds.me/" target="_blank" style="font-weight: 700; color: var(--brand-accent); font-size: 13px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                  <span>https://assets.suamisihat.myds.me/</span> ↗
                </a>
              </div>
            </div>
          </div>

          <!-- Live User & Role Switcher -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title" style="display: flex; align-items: center; gap: 8px;">
                ${getIcon('profile', 18, 'var(--brand-primary)')}
                <span>User Profile & Security</span>
              </h2>
              <button class="btn btn-sm btn-secondary" onclick="Modal.openChangePasswordModal()">Change My Password</button>
            </div>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 14px;">
              Current Active Account: <b>${currentUser ? currentUser.name : 'Unknown'}</b> (${currentUser ? currentUser.role : 'Guest'})
            </p>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${(usersData.users || []).map(u => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--surface-card-subtle); border-radius: var(--radius-md); border: 1px solid var(--surface-card-border);">
                  <div>
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 13.5px;">${u.name}</div>
                    <div style="font-size: 11.5px; color: var(--text-secondary);">${u.role} • ${u.department}</div>
                  </div>
                  <button class="btn btn-sm ${currentUser && currentUser.username === u.username ? 'btn-primary' : 'btn-secondary'}" onclick="AdminView.switchUser('${u.username}')">
                    ${currentUser && currentUser.username === u.username ? 'Active User' : 'Switch Role'}
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Section 3: Global Audit Trail -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title" style="display: flex; align-items: center; gap: 8px;">
              ${getIcon('copy', 18, 'var(--brand-primary)')}
              <span>Comprehensive System Audit Trail</span>
            </h2>
            <span style="font-size: 12px; color: var(--text-secondary);">${(auditData.logs || []).length} recent events</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${(auditData.logs || []).map(log => `
                  <tr>
                    <td style="font-size: 11.5px; color: var(--text-secondary); white-space: nowrap;">
                      ${new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style="font-weight: 700;">${log.actor}</td>
                    <td><span class="badge" style="background: rgba(0,0,0,0.06);">${log.role}</span></td>
                    <td style="font-weight: 700; color: var(--brand-accent); font-family: var(--font-mono); font-size: 11.5px;">
                      ${log.action}
                    </td>
                    <td>${log.entityType} ${log.entityId ? `(#${log.entityId})` : ''}</td>
                    <td style="font-size: 12px; color: var(--text-secondary);">
                      ${log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card"><p style="color: var(--color-danger);">${err.message}</p></div>`;
    }
  },

  openAddStaffModal() {
    window.Modal.open({
      title: 'Provision New Staff Member',
      content: `
        <div class="form-group">
          <label class="form-label">Staff ID (e.g. 0005D, 0006S, 0007V)</label>
          <input type="text" id="new-staff-id" class="form-control" placeholder="0005D" style="text-transform: uppercase; font-family: var(--font-mono); font-weight: 700;" />
        </div>
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="new-staff-name" class="form-control" placeholder="e.g. Mohammad Haris" />
        </div>
        <div class="form-group">
          <label class="form-label">Role / Specialization</label>
          <input type="text" id="new-staff-role" class="form-control" placeholder="e.g. 3D & Motion Designer" />
        </div>
        <div class="form-group">
          <label class="form-label">Department</label>
          <select id="new-staff-dept" class="form-control">
            <option value="Creative Production">Creative Production</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="Multimedia">Multimedia</option>
            <option value="Packaging & POSM">Packaging & POSM</option>
            <option value="Content & Messaging">Content & Messaging</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Default Sub-Brand</label>
          <select id="new-staff-brand" class="form-control">
            <option value="SS">SS - SuamiSihat Core</option>
            <option value="SSE">SSE - E-Commerce</option>
            <option value="SSH">SSH - Holdings</option>
            <option value="SSC">SSC - Healthcare</option>
            <option value="SSW">SSW - Wellness</option>
            <option value="SST">SST - Tech</option>
          </select>
        </div>
      `,
      confirmText: 'Save to NAS Directory',
      onConfirm: async () => {
        const staffId = document.getElementById('new-staff-id').value;
        const name = document.getElementById('new-staff-name').value;
        const role = document.getElementById('new-staff-role').value;
        const department = document.getElementById('new-staff-dept').value;
        const defaultBrand = document.getElementById('new-staff-brand').value;

        if (!staffId || !name) {
          window.showToast('Please provide both Staff ID and Full Name', 'danger');
          return;
        }

        try {
          await ApiClient.addStaffMember({ staffId, name, role, department, defaultBrand });
          window.showToast(`Staff member ${staffId} (${name}) provisioned successfully`, 'success');
          this.render(document.getElementById('view-content'));
        } catch (err) {
          window.showToast(`Error: ${err.message}`, 'danger');
        }
      }
    });
  },

  async toggleStaffStatus(staffId, currentlyActive) {
    try {
      await ApiClient.updateStaffMember(staffId, { active: !currentlyActive });
      window.showToast(`Updated status for ${staffId}`, 'info');
      this.render(document.getElementById('view-content'));
    } catch (err) {
      window.showToast(`Error: ${err.message}`, 'danger');
    }
  },

  async switchUser(username) {
    try {
      const res = await ApiClient.login(username);
      ApiClient.setToken(res.token);
      AppState.set('currentUser', res.user);
      window.showToast(`Switched active profile to ${res.user.name} (${res.user.role})`, 'info');
      this.render(document.getElementById('view-content'));
      window.AppShell.updateUserHeader();
    } catch (err) {
      window.showToast(`Error switching user: ${err.message}`, 'danger');
    }
  }
};

window.AdminView = AdminView;
