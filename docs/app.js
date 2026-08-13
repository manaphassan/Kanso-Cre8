/**
 * SS-CAM Product Landing Page — App Logic
 * SuamiSihat Official Workstation Suite
 */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Theme Toggle (SuamiSihat Dark Navy vs Light)
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  const themeIcon = themeToggle ? themeToggle.querySelector('.theme-icon') : null;

  if (themeToggle && themeIcon) {
    themeToggle.addEventListener('click', () => {
      if (body.classList.contains('theme-ss-navy')) {
        body.classList.remove('theme-ss-navy');
        body.classList.add('theme-ss-light');
        themeIcon.textContent = '☀️';
      } else {
        body.classList.remove('theme-ss-light');
        body.classList.add('theme-ss-navy');
        themeIcon.textContent = '🌙';
      }
    });
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

  // 3. App Tour Showcase Tabs
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
