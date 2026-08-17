/**
 * Fluent 2 Login View for SuamiSihat Creative Team Portal
 * Featuring 69 Liquid Water Flow Particle Stream (Men's Symbols ♂ & Logomarks, 16px to 180px)
 */

const LoginView = {
  render(container) {
    const svgs = window.SS_BRAND_SVGS || { logomark: () => '', shatteredFragment: () => '', mensSymbol: () => '' };

    container.innerHTML = `
      <style>
        @keyframes fAmbientPulse {
          0% { opacity: 0.6; transform: translateX(-50%) scale(0.95); }
          100% { opacity: 1; transform: translateX(-50%) scale(1.1); }
        }

        .login-hero-bg {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #022057 0%, #043388 60%, #021233 100%);
          overflow: hidden;
          z-index: 1000;
        }

        .login-ambient-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }

        .login-ambient-glow::before {
          content: '';
          position: absolute;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 500px;
          background: radial-gradient(ellipse at center, rgba(33, 161, 247, 0.22) 0%, rgba(4, 51, 136, 0.15) 50%, transparent 75%);
          filter: blur(60px);
          animation: fAmbientPulse 8s ease-in-out infinite alternate;
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

      <div class="login-hero-bg" id="login-hero-viewport">
        <!-- Animated Background Canvas matching docs/index.html & docs/app.js -->
        <canvas id="heroWaveCanvas" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; opacity: 0.85;"></canvas>

        <!-- Ambient Radial Glow matching docs/index.html -->
        <div class="login-ambient-glow"></div>

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
            Connected to Synology NAS (<code style="font-family: monospace;">\\\\SSNAS\\Creative-Team</code>)<br/>
            <a href="https://assets.suamisihat.myds.me/" target="_blank" style="color: #043388; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-top: 6px;">
              ${svgs.lightningIcon ? svgs.lightningIcon(14, '#043388') : ''}
              <span>Open SuamiSihat Brand Guidelines Vault ↗</span>
            </a>
          </div>
        </div>
      </div>
    `;

    // Initialize Hero Wave & Particle Engine matching docs/index.html & docs/app.js
    setTimeout(() => {
      this.initHeroWaveCanvas();
    }, 50);
  },

  initHeroWaveCanvas() {
    const canvas = document.getElementById('heroWaveCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let step = 0;
    let animFrameId = null;

    const resizeCanvas = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.min(45, Math.floor(width / 25));
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -Math.random() * 0.5 - 0.2, // Drifting upwards
          size: Math.random() * 12 + 8,
          alpha: Math.random() * 0.4 + 0.15,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.02,
          type: Math.random() > 0.4 ? 'men' : 'shards'
        });
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const drawMenSymbol = (ctx, x, y, size, alpha, rotation) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.strokeStyle = `rgba(33, 161, 247, ${alpha})`;
      ctx.lineWidth = 1.8;

      const r = size * 0.35;
      ctx.beginPath();
      ctx.arc(0, r * 0.4, r, 0, Math.PI * 2);
      ctx.stroke();

      const arrowLen = size * 0.6;
      const startX = r * 0.7;
      const startY = -r * 0.3;
      const endX = startX + arrowLen * 0.7;
      const endY = startY - arrowLen * 0.7;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const headLen = size * 0.25;
      ctx.beginPath();
      ctx.moveTo(endX - headLen, endY);
      ctx.lineTo(endX, endY);
      ctx.lineTo(endX, endY + headLen);
      ctx.stroke();

      ctx.restore();
    };

    const drawShard = (ctx, x, y, size, alpha, rotation) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = `rgba(189, 154, 115, ${alpha * 0.7})`;

      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.lineTo(size / 3, size / 2);
      ctx.lineTo(-size / 3, size / 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background sine wave layers
      step += 0.012;
      const waves = [
        { color: 'rgba(33, 161, 247, 0.18)', speed: 0.8, amp: 35, freq: 0.008 },
        { color: 'rgba(109, 198, 236, 0.12)', speed: 1.2, amp: 25, freq: 0.01 },
        { color: 'rgba(189, 154, 115, 0.10)', speed: 0.5, amp: 45, freq: 0.006 }
      ];

      waves.forEach((w) => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 1.5;
        for (let x = 0; x <= width; x += 12) {
          const y = Math.sin(x * w.freq + step * w.speed) * w.amp + height * 0.55;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Update & Draw Floating Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        if (p.y < -30) {
          p.y = height + 30;
          p.x = Math.random() * width;
        }
        if (p.x < -30) p.x = width + 30;
        if (p.x > width + 30) p.x = -30;

        if (p.type === 'men') {
          drawMenSymbol(ctx, p.x, p.y, p.size, p.alpha, p.rotation);
        } else {
          drawShard(ctx, p.x, p.y, p.size, p.alpha, p.rotation);
        }
      });

      animFrameId = requestAnimationFrame(animate);
    };

    animate();

    this._cleanupWaveCanvas = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
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

      if (this._cleanupWaveCanvas) this._cleanupWaveCanvas();

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
