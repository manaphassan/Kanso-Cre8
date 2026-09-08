/**
 * Fluent 2 User Profile View for SuamiSihat Creative Team Portal
 * Pure Vector Icons (Zero Emojis), User Details & Log Out Action
 */

const ProfileView = {
  render(container) {
    const rawUser = AppState.get('currentUser') || {};
    const staffId = rawUser.staffId || (rawUser.id && rawUser.id.startsWith('SS') ? rawUser.id : null) || (
      rawUser.username === 'harussani' ? 'SS0004' :
      rawUser.username === 'hasan' ? 'SS0001' :
      rawUser.username === 'gaddafi' ? 'SS0071' :
      rawUser.username === 'raihan' ? 'SS0073' :
      rawUser.username === 'haikal' ? 'SS0035' :
      rawUser.username === 'aliff' ? 'SS0037' : 'SS0000'
    );

    const user = {
      username: rawUser.username || 'harussani',
      name: rawUser.name || 'Harussani',
      staffId: staffId,
      role: rawUser.role || 'Art Director / Administrator',
      department: rawUser.department || 'Creative Production'
    };

    const svgs = window.SS_BRAND_SVGS || {};
    const getIcon = (name, size = 18, color = 'currentColor') => svgs.fluentIcon ? svgs.fluentIcon(name, size, color) : '';

    container.innerHTML = `
      <div class="profile-container" style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
        
        <!-- User Header Banner Card -->
        <div class="card card-hero" style="background: linear-gradient(135deg, #022057 0%, #043388 60%, #21A1F7 100%); color: #FFFFFF; border-radius: 16px; padding: 28px 32px; box-shadow: 0 12px 32px rgba(2, 32, 87, 0.25);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 20px;">
              <div style="width: 72px; height: 72px; border-radius: 20px; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(12px); border: 2px solid rgba(255, 255, 255, 0.4); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; color: #FFFFFF;">
                ${user.name ? user.name.charAt(0) : 'U'}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                  <h2 style="font-size: 24px; font-weight: 900; margin: 0; color: #FFFFFF;">${user.name}</h2>
                  <span style="padding: 3px 10px; border-radius: 20px; background: rgba(255, 255, 255, 0.25); font-size: 11.5px; font-weight: 800; letter-spacing: 0.5px;">${user.staffId}</span>
                </div>
                <div style="font-size: 14px; opacity: 0.9; font-weight: 600;">${user.role}</div>
                <div style="font-size: 12px; opacity: 0.75; margin-top: 2px;">${user.department || 'Creative Department'}</div>
              </div>
            </div>

            <!-- Logout Quick Button -->
            <button class="btn" onclick="AppShell.logout()" style="height: 42px; padding: 0 20px; font-weight: 800; font-size: 13.5px; background: rgba(239, 68, 68, 0.95); color: #FFFFFF; border: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4); display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
              ${getIcon('logout', 18, '#FFFFFF')}
              <span>Log Out of Portal</span>
            </button>
          </div>
        </div>

        <!-- Two Column Details Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 24px;">
          
          <!-- Profile & Account Details Card -->
          <div class="card" style="padding: 24px; border-radius: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 18px;">
              <h3 style="font-size: 16px; font-weight: 800; margin: 0; color: var(--brand-primary); display: flex; align-items: center; gap: 8px;">
                ${getIcon('profile', 18, 'var(--brand-primary)')}
                <span>Account Information</span>
              </h3>
              <span class="badge badge-success">Active Session</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed rgba(0,0,0,0.06);">
                <span style="color: var(--text-secondary); font-weight: 600;">Staff Full Name</span>
                <span style="font-weight: 800; color: var(--text-primary);">${user.name}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed rgba(0,0,0,0.06);">
                <span style="color: var(--text-secondary); font-weight: 600;">Staff Employee ID</span>
                <span style="font-weight: 800; color: var(--brand-accent); font-family: monospace;">${user.staffId}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed rgba(0,0,0,0.06);">
                <span style="color: var(--text-secondary); font-weight: 600;">System Authority Role</span>
                <span style="font-weight: 800; color: var(--text-primary);">${user.role}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed rgba(0,0,0,0.06);">
                <span style="color: var(--text-secondary); font-weight: 600;">Synology NAS Path</span>
                <span style="font-weight: 700; color: var(--text-secondary); font-family: monospace; font-size: 11.5px;">\\\\SSNAS\\Creative-Team</span>
              </div>
            </div>
          </div>

          <!-- Security & Access Management Card -->
          <div class="card" style="padding: 24px; border-radius: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 18px;">
              <h3 style="font-size: 16px; font-weight: 800; margin: 0; color: var(--brand-primary); display: flex; align-items: center; gap: 8px;">
                ${getIcon('lock', 18, 'var(--brand-primary)')}
                <span>Security & Password</span>
              </h3>
              <span class="badge badge-info">NAS Persisted</span>
            </div>

            <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 18px;">
              Your password is securely verified against SuamiSihat Synology NAS credentials at <code style="font-family: monospace;">_Team/_Config/user_passwords.json</code>.
            </p>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button class="btn btn-secondary" onclick="Modal.openChangePasswordModal()" style="width: 100%; height: 40px; font-weight: 800; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
                <span>Change My Password</span>
              </button>

              <button class="btn btn-danger" onclick="AppShell.logout()" style="width: 100%; height: 40px; font-weight: 800; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-top: 6px;">
                ${getIcon('logout', 18, '#FFFFFF')}
                <span>Sign Out & Lock Workspace</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    `;
  }
};

window.ProfileView = ProfileView;
