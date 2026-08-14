/**
 * SS-CAM Product Landing Page — SuamiSihat™ Hero Particle & Wave Engine
 * Floating Men Symbol (♂), Shattering Logo Shards & Segoe Fluent Icons Integration
 */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Animated SS Logo with Floating Men Symbol (♂) & Shatter Faded Background Canvas
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
          vy: -Math.random() * 0.5 - 0.2, // Drifting upwards
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
      // Circle
      ctx.beginPath();
      ctx.arc(0, r * 0.4, r, 0, Math.PI * 2);
      ctx.stroke();

      // Arrow stem pointing top-right
      const arrowLen = size * 0.6;
      const startX = r * 0.7;
      const startY = -r * 0.3;
      const endX = startX + arrowLen * 0.7;
      const endY = startY - arrowLen * 0.7;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Arrow head
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

        // Wrap around canvas edges
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

      requestAnimationFrame(animate);
    }

    animate();
  }

  // 2. Mobile Menu Navigation
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    navMenu.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // 3. Interactive 3D Perspective Tilt on Hero Viewport
  const heroViewport = document.getElementById('hero-viewport-frame');
  if (heroViewport) {
    heroViewport.addEventListener('mousemove', (e) => {
      const rect = heroViewport.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      heroViewport.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
    });

    heroViewport.addEventListener('mouseleave', () => {
      heroViewport.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)';
    });
  }

  // 4. Scroll-Triggered Reveal Animations (IntersectionObserver)
  const revealElements = document.querySelectorAll('.reveal');
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.15
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => revealObserver.observe(el));

  // 5. App Tour Showcase Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const showcasePanels = document.querySelectorAll('.showcase-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      showcasePanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

});
