/**
 * SS-CAM Product Landing Page — SuamiSihat™ Hero Particle & Wave Engine
 * Enhanced with: Sidebar navigation, copy-to-clipboard, active sidebar links,
 * showcase tab title sync, and smooth scroll-spy.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Animated Hero Canvas (Floating Men Symbol ♂ + Shards + Waves) ──────
  const canvas = document.getElementById('heroWaveCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let step = 0;

    function resizeCanvas() {
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
      initParticles();
    }

    function initParticles() {
      particles = [];
      const numParticles = Math.min(45, Math.floor(width / 25));
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -Math.random() * 0.5 - 0.2,
          size: Math.random() * 12 + 8,
          alpha: Math.random() * 0.4 + 0.15,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.02,
          type: Math.random() > 0.4 ? 'men' : 'shards'
        });
      }
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function drawMenSymbol(ctx, x, y, size, alpha, rotation) {
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
    }

    function drawShard(ctx, x, y, size, alpha, rotation) {
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
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      step += 0.012;
      const waves = [
        { color: 'rgba(33, 161, 247, 0.18)', speed: 0.8, amp: 35, freq: 0.008 },
        { color: 'rgba(109, 198, 236, 0.12)', speed: 1.2, amp: 25, freq: 0.01  },
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
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;
        if (p.y < -30) { p.y = height + 30; p.x = Math.random() * width; }
        if (p.x < -30) p.x = width + 30;
        if (p.x > width + 30) p.x = -30;
        if (p.type === 'men') drawMenSymbol(ctx, p.x, p.y, p.size, p.alpha, p.rotation);
        else drawShard(ctx, p.x, p.y, p.size, p.alpha, p.rotation);
      });
      requestAnimationFrame(animate);
    }

    animate();
  }

  // ── 2. Mobile Menu Toggle ────────────────────────────────────────────────
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const open = navMenu.classList.toggle('active');
      mobileToggle.setAttribute('aria-expanded', open);
    });
    navMenu.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => navMenu.classList.remove('active'));
    });
  }

  // ── 3. Sidebar Collapse Toggle ───────────────────────────────────────────
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const pageLayout = document.getElementById('page-layout');
  if (sidebarToggle && pageLayout) {
    sidebarToggle.style.display = 'flex'; // reveal the toggle button
    sidebarToggle.addEventListener('click', () => {
      pageLayout.classList.toggle('sidebar-collapsed');
    });
  }

  // ── 4. 3D Perspective Tilt on Hero Viewport ──────────────────────────────
  const heroViewport = document.getElementById('hero-viewport-frame');
  if (heroViewport) {
    heroViewport.addEventListener('mousemove', (e) => {
      const rect = heroViewport.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y - rect.height / 2) / rect.height * 2) * -5;
      const rotateY = ((x - rect.width  / 2) / rect.width  * 2) * 5;
      heroViewport.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
    });
    heroViewport.addEventListener('mouseleave', () => {
      heroViewport.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)';
    });
  }

  // ── 5. Scroll Reveal (IntersectionObserver) ──────────────────────────────
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -50px 0px', threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // ── 6. Showcase Tabs — with card title/subtitle sync ─────────────────────
  const tabBtns = document.querySelectorAll('.tab-btn');
  const showcasePanels = document.querySelectorAll('.showcase-panel');
  const cardTitle = document.getElementById('showcase-card-title');
  const cardSub   = document.getElementById('showcase-card-sub');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      showcasePanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === targetId);
      });

      // Sync card header text
      if (cardTitle && btn.dataset.title) cardTitle.innerHTML = btn.dataset.title;
      if (cardSub   && btn.dataset.sub)   cardSub.innerHTML   = btn.dataset.sub;
    });
  });

  // ── 7. Copy-to-Clipboard Code Blocks ─────────────────────────────────────
  document.querySelectorAll('.cl-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy-target');
      const codeEl   = document.getElementById(targetId);
      if (!codeEl) return;

      // Strip HTML tags for clean copy
      const text = codeEl.innerText || codeEl.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      });
    });
  });

  // ── 8. Sidebar Active Link via IntersectionObserver (scroll-spy) ─────────
  const sidebarLinks = document.querySelectorAll('.cl-sidebar-link');
  const sectionIds = ['pillars', 'design-rules', 'showcase', 'download-v4', 'wellbeing', 'specs'];

  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        sidebarLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (href === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });

  sections.forEach(section => sectionObserver.observe(section));

  // ── 9. Navbar active nav-item sync ───────────────────────────────────────
  const navItems = document.querySelectorAll('.nav-item[href^="#"]');
  const allNavSections = ['hero', 'pillars', 'design-rules', 'showcase', 'download-v4', 'wellbeing', 'specs']
    .map(id => document.getElementById(id)).filter(Boolean);

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navItems.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

  allNavSections.forEach(s => navObserver.observe(s));

});
