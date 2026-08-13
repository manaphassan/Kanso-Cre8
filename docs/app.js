/**
 * SS-CAM GitHub Pages — Interactive Sandbox & App Logic
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

  // 3. Dynamic Sandbox: Live Job ID Generator
  const brandSelect = document.getElementById('demo-brand-select');
  const nameInput = document.getElementById('demo-name-input');
  const jobOutput = document.getElementById('demo-job-output');
  const btnCopyJob = document.getElementById('btn-copy-job');

  function updateJobOutput() {
    if (!jobOutput) return;
    const now = new Date();
    const yearMonth = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');
    const brand = brandSelect ? brandSelect.value : 'SS';
    let rawName = nameInput ? nameInput.value.trim() : 'brand_campaign';
    if (!rawName) rawName = 'project';
    const cleanName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    jobOutput.textContent = `${yearMonth}_0001A_${brand}_${cleanName}`;
  }

  if (brandSelect) brandSelect.addEventListener('change', updateJobOutput);
  if (nameInput) nameInput.addEventListener('input', updateJobOutput);
  if (btnCopyJob && jobOutput) {
    btnCopyJob.addEventListener('click', () => {
      navigator.clipboard.writeText(jobOutput.textContent);
      btnCopyJob.textContent = 'Copied!';
      setTimeout(() => { btnCopyJob.textContent = 'Copy'; }, 1500);
    });
  }

  // 4. Dynamic Sandbox: Interactive Color Swatch Inspector
  const swatchTiles = document.querySelectorAll('.swatch-tile');
  const demoSwatchTile = document.getElementById('demo-swatch-tile');
  const demoSwatchName = document.getElementById('demo-swatch-name');
  const demoHex = document.getElementById('demo-hex');
  const demoRgb = document.getElementById('demo-rgb');
  const demoCmyk = document.getElementById('demo-cmyk');
  const demoPantone = document.getElementById('demo-pantone');
  const demoStatus = document.getElementById('demo-swatch-status');

  swatchTiles.forEach(tile => {
    tile.addEventListener('click', () => {
      swatchTiles.forEach(t => t.classList.remove('active'));
      tile.classList.add('active');

      const hex = tile.getAttribute('data-hex');
      const rgb = tile.getAttribute('data-rgb');
      const cmyk = tile.getAttribute('data-cmyk');
      const pantone = tile.getAttribute('data-pantone');
      const name = tile.getAttribute('data-name');

      if (demoSwatchTile) demoSwatchTile.style.background = hex;
      if (demoSwatchName) demoSwatchName.textContent = name;
      if (demoHex) demoHex.textContent = hex;
      if (demoRgb) demoRgb.textContent = rgb;
      if (demoCmyk) demoCmyk.textContent = cmyk;
      if (demoPantone) demoPantone.textContent = pantone;

      navigator.clipboard.writeText(hex);
      if (demoStatus) demoStatus.textContent = `✓ Copied ${name} (${hex}) to clipboard!`;
    });
  });

  // 5. Dynamic Sandbox: JAKIM Waktu Solat API Integration
  const solatSelect = document.getElementById('solat-zone-select');
  const timeFajr = document.getElementById('time-fajr');
  const timeDhuhr = document.getElementById('time-dhuhr');
  const timeAsr = document.getElementById('time-asr');
  const timeMaghrib = document.getElementById('time-maghrib');
  const timeIsha = document.getElementById('time-isha');

  async function fetchSolatTimes(zoneCode) {
    try {
      const response = await fetch(`https://api.waktusolat.app/v2/solat/${zoneCode}`);
      if (!response.ok) throw new Error('Network response failed');
      const data = await response.json();
      if (data && data.prayers && data.prayers.length > 0) {
        const todaySolat = data.prayers[0]; // Today's prayer times
        if (timeFajr) timeFajr.textContent = format12H(todaySolat.fajr);
        if (timeDhuhr) timeDhuhr.textContent = format12H(todaySolat.dhuhr);
        if (timeAsr) timeAsr.textContent = format12H(todaySolat.asr);
        if (timeMaghrib) timeMaghrib.textContent = format12H(todaySolat.maghrib);
        if (timeIsha) timeIsha.textContent = format12H(todaySolat.isha);
      }
    } catch (e) {
      console.log('Solat API fallback triggered:', e.message);
    }
  }

  function format12H(timestamp) {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  if (solatSelect) {
    solatSelect.addEventListener('change', (e) => fetchSolatTimes(e.target.value));
    fetchSolatTimes(solatSelect.value); // Initial fetch
  }

  // 6. Dynamic Sandbox: 16s Box Breathing Coach
  const breathCircle = document.getElementById('breath-circle');
  const breathText = document.getElementById('breath-phase-text');
  const btnStartBreath = document.getElementById('btn-start-breath');
  let breathInterval = null;

  if (btnStartBreath && breathCircle && breathText) {
    btnStartBreath.addEventListener('click', () => {
      if (breathInterval) {
        clearInterval(breathInterval);
        breathInterval = null;
        breathCircle.className = 'breathing-circle';
        breathText.textContent = 'Ready';
        btnStartBreath.textContent = 'Start 16s Reset';
        return;
      }

      btnStartBreath.textContent = 'Stop Timer';
      runBoxBreathingCycle();
    });
  }

  function runBoxBreathingCycle() {
    let step = 0;
    const phases = [
      { text: 'Inhale 4s', expand: true },
      { text: 'Hold 4s', expand: true },
      { text: 'Exhale 4s', expand: false },
      { text: 'Hold 4s', expand: false }
    ];

    function stepCycle() {
      const current = phases[step % 4];
      breathText.textContent = current.text;
      if (current.expand) {
        breathCircle.classList.add('expand');
        breathCircle.classList.remove('contract');
      } else {
        breathCircle.classList.add('contract');
        breathCircle.classList.remove('expand');
      }
      step++;
    }

    stepCycle();
    breathInterval = setInterval(stepCycle, 4000);
  }

  // 7. App Tour Showcase Tabs
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
