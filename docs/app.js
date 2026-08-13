/**
 * SS-CAM GitHub Pages Landing Page — Interactive Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Theme Toggle (Fluent Dark vs Light)
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  const themeIcon = themeToggle ? themeToggle.querySelector('.theme-icon') : null;

  if (themeToggle && themeIcon) {
    themeToggle.addEventListener('click', () => {
      if (body.classList.contains('theme-fluent-dark')) {
        body.classList.remove('theme-fluent-dark');
        body.classList.add('theme-fluent-light');
        themeIcon.textContent = '☀️';
      } else {
        body.classList.remove('theme-fluent-light');
        body.classList.add('theme-fluent-dark');
        themeIcon.textContent = '🌙';
      }
    });
  }

  // 2. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Close menu when clicking links
    navMenu.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // 3. Interactive App Showcase / Tour Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const showcasePanels = document.querySelectorAll('.showcase-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');

      // Update active tab button
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active panel
      showcasePanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  // 4. Smooth Scroll for Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

});
