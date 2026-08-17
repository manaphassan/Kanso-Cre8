/**
 * Fluent 2 Login View for SuamiSihat Creative Team Portal
 * Featuring 69 Liquid Water Flow Particle Stream (Men's Symbols ♂ & Logomarks, 16px to 180px)
 */

const LoginView = {
  render(container) {
    const svgs = window.SS_BRAND_SVGS || { logomark: () => '', shatteredFragment: () => '', mensSymbol: () => '' };

    // Generate 69 Flowing Water Stream Particles
    let particlesHtml = '';
    const totalParticles = 69;
    const sizes = [16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 120, 150, 180];
    const colors = ['#21A1F7', '#6DC6EC', '#FFFFFF', '#043388', '#022057'];

    for (let i = 0; i < totalParticles; i++) {
      const type = i % 3; // 0 & 1 = Men's Symbol (♂), 2 = Fragment/Logomark
      const size = sizes[i % sizes.length];
      const opacity = (0.08 + (i % 5) * 0.05).toFixed(2);
      const top = ((i * 13) % 100);
      const left = ((i * 17) % 96);
      const duration = (8 + (i % 7) * 2).toFixed(1);
      const delay = (i * 0.25).toFixed(1);
      const color = colors[i % colors.length];

      let innerContent = '';
      if (type === 0 || type === 1) {
        innerContent = svgs.mensSymbol(size, color, opacity);
      } else if (i % 6 === 0) {
        innerContent = `<img src="public/brand/ss-logomark-full.png" style="width: ${size}px; height: auto; opacity: ${opacity};" alt="" />`;
      } else {
        innerContent = `<img src="public/brand/ss-shattered-fragment.png" style="width: ${size}px; height: auto; opacity: ${opacity};" alt="" />`;
      }

      particlesHtml += `
        <div class="water-flow-particle" style="top: ${top}%; left: ${left}%; animation-duration: ${duration}s; animation-delay: ${delay}s;">
          ${innerContent}
        </div>
      `;
    }

    container.innerHTML = `
      <style>
        @keyframes ssHeroGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Fluid Water Flow Liquid Stream Animation */
        @keyframes liquidWaterFlow {
          0% { transform: translate(0px, 0px) rotate(0deg); }
          25% { transform: translate(30px, -50px) rotate(10deg); }
          50% { transform: translate(-25px, -110px) rotate(-8deg); }
          75% { transform: translate(35px, -170px) rotate(15deg); }
          100% { transform: translate(0px, -230px) rotate(0deg); }
        }

        .login-hero-bg {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #022057 0%, #043388 40%, #21a1f7 85%, #022057 100%);
          background-size: 400% 400%;
          animation: ssHeroGradient 14s ease infinite;
          overflow: hidden;
          z-index: 1000;
        }

        /* Flowing Water Particles (69 Items ranging from 16px to 180px) */
        .water-flow-particle {
          position: absolute;
          user-select: none;
          pointer-events: auto;
          cursor: pointer;
          animation: liquidWaterFlow infinite linear;
          transition: transform 0.3s cubic-bezier(0.1, 0.9, 0.2, 1.0), opacity 0.3s ease, filter 0.3s ease;
          filter: drop-shadow(0 0 12px rgba(33, 161, 247, 0.35));
        }

        .water-flow-particle:hover {
          transform: scale(1.4) rotate(15deg) !important;
          opacity: 0.95 !important;
          filter: drop-shadow(0 0 35px #21A1F7) brightness(1.25) !important;
          z-index: 100;
        }

        /* Card Logo Interactive Hover */
        .card-header-logo-interactive {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.1, 0.9, 0.2, 1.0), filter 0.3s ease;
        }

        .card-header-logo-interactive:hover {
          transform: scale(1.12) rotate(-5deg);
          filter: drop-shadow(0 8px 25px rgba(33, 161, 247, 0.65));
        }

        /* Static Glassmorphism Login Card */
        .login-card-static {
          width: 100%;
          max-width: 430px;
          padding: 36px 32px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 24px 60px rgba(2, 32, 87, 0.45), 0 0 40px rgba(33, 161, 247, 0.25);
          position: relative;
          z-index: 10;
        }
      </style>

      <div class="login-hero-bg">
        <!-- 69 Flowing Water Particles Stream -->
        ${particlesHtml}

        <!-- Static Glassmorphism Card -->
        <div class="login-card-static">
          
          <!-- Exact SuamiSihat Interlocking Dual-S Logomark PNG Header -->
          <div style="text-align: center; margin-bottom: 26px;">
            <div class="card-header-logo-interactive">
              <img src="public/brand/ss-logomark-full.png" alt="SuamiSihat Logo" style="height: 68px; width: auto;" />
            </div>
            <h1 style="font-size: 22px; font-weight: 900; color: #022057; margin: 0; letter-spacing: -0.3px;">SuamiSihat Creative Portal</h1>
            <p style="font-size: 13px; color: #575756; margin-top: 6px; font-weight: 500;">
              Production Management & Creative Assets System
            </p>
          </div>

          <!-- Alert Banner -->
          <div id="login-alert" style="display: none; padding: 10px 14px; border-radius: 8px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #DC2626; font-size: 12.5px; font-weight: 600; margin-bottom: 18px;"></div>

          <form id="login-form" onsubmit="LoginView.handleLogin(event)">
            <!-- User Profile Selector -->
            <div class="form-group" style="margin-bottom: 18px;">
              <label class="form-label" style="font-weight: 700; color: #022057; font-size: 13px;">Select Account Profile</label>
              <select id="login-user" class="form-control" style="height: 42px; font-weight: 600; border-radius: 8px; border: 1px solid #CCCCCC; background: #FFFFFF; color: #1A1A1A;">
                <option value="hasan">Hasan - SS0001</option>
                <option value="gaddafi">Gaddafi - SS0071</option>
                <option value="raihan">Raihan - SS0073</option>
                <option value="harussani">Harussani - SS0004</option>
                <option value="haikal">Haikal - SS0035</option>
                <option value="aliff">Aliff - SS0037</option>
                <option value="admin">Admin - SS0000</option>
              </select>
            </div>

            <!-- Password Input -->
            <div class="form-group" style="margin-bottom: 22px;">
              <label class="form-label" style="font-weight: 700; color: #022057; font-size: 13px; margin-bottom: 6px;">Password</label>
              <div style="position: relative;">
                <input type="password" id="login-password" class="form-control" value="" placeholder="Enter password" style="height: 42px; padding-right: 40px; border-radius: 8px; border: 1px solid #CCCCCC; background: #FFFFFF; color: #1A1A1A;" required />
                <button type="button" onclick="LoginView.togglePasswordVisibility()" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #666666; display: flex; align-items: center; justify-content: center; padding: 2px;" title="Toggle Password Visibility">
                  ${svgs.eyeIcon ? svgs.eyeIcon(18, '#666666') : ''}
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button type="submit" id="login-submit-btn" class="btn" style="width: 100%; height: 44px; font-size: 14.5px; font-weight: 800; background: linear-gradient(90deg, #022057 0%, #043388 50%, #21A1F7 100%); color: #FFFFFF; border: none; border-radius: 10px; box-shadow: 0 4px 16px rgba(4, 51, 136, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
              <span>Sign In to Portal</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>

          <!-- Footer Metadata & Brand Assets Link -->
          <div style="margin-top: 26px; text-align: center; font-size: 11.5px; color: #666666; border-top: 1px solid rgba(0, 0, 0, 0.08); padding-top: 16px;">
            SuamiSihat Creative Team System • v1.0.0<br/>
            Connected to Synology NAS (<code style="font-family: monospace;">\\SSNAS\Creative-Team</code>)<br/>
            <a href="https://assets.suamisihat.myds.me/" target="_blank" style="color: #043388; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-top: 6px;">
              ${svgs.lightningIcon ? svgs.lightningIcon(14, '#043388') : ''}
              <span>Open SuamiSihat Brand Guidelines Vault ↗</span>
            </a>
          </div>
        </div>
      </div>
    `;
  },

  togglePasswordVisibility() {
    const input = document.getElementById('login-password');
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  },

  async handleLogin(event) {
    event.preventDefault();
    const alertEl = document.getElementById('login-alert');
    const submitBtn = document.getElementById('login-submit-btn');

    const username = document.getElementById('login-user').value;
    const password = document.getElementById('login-password').value;

    alertEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Authenticating...</span>';

    try {
      const res = await ApiClient.login(username, password);
      ApiClient.setToken(res.token);
      AppState.set('currentUser', res.user);

      window.showToast(`Welcome back, ${res.user.name}! (${res.user.role})`, 'success');

      // Reload page cleanly to mount AppShell with saved auth session
      location.reload();
    } catch (err) {
      alertEl.textContent = `${err.message || 'Invalid username or password.'}`;
      alertEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Sign In to Portal</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    }
  }
};

window.LoginView = LoginView;
