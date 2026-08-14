/**
 * SS-CAM Product Landing Page — Official SuamiSihat™ Design System App Logic
 * Reference: https://assets.suamisihat.myds.me/
 */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Interactive Sine Wave Canvas Animation for SuamiSihat Hero
  const canvas = document.getElementById('heroWaveCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let step = 0;

    function resizeCanvas() {
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function drawWave() {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      
      step += 0.015;

      const lines = [
        { color: 'rgba(33, 161, 247, 0.25)', speed: 0.8, amp: 40, freq: 0.008 },
        { color: 'rgba(109, 198, 236, 0.20)', speed: 1.2, amp: 30, freq: 0.01 },
        { color: 'rgba(189, 154, 115, 0.15)', speed: 0.5, amp: 50, freq: 0.006 }
      ];

      lines.forEach((line) => {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 1.5;

        for (let x = 0; x <= width; x += 10) {
          const y = Math.sin(x * line.freq + step * line.speed) * line.amp + height / 2;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      ctx.restore();
      requestAnimationFrame(drawWave);
    }

    drawWave();
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
