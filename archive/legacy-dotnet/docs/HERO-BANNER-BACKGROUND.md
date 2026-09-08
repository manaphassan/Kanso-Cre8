# Hero Banner Background — Component Specification

**Design System Standard** | SuamiSihat Creative Assets Management (SS-CAM)  
**Canonical Name**: `Hero Banner Background`  
**Target Context**: Default animated background for all Hero Banners across SS-CAM Web, Portal, and Creative landing views.

---

## 1. Overview & Purpose

The **Hero Banner Background** (`HeroBanner`) is the canonical animated background design standard for SuamiSihat web surfaces. It provides a cohesive, high-performance, medical-masculine visual hierarchy featuring:

1. **SuamiSihat Deep Navy Backdrop**: Vertical primary gradient (`#022057` → `#043388` → `#021233`).
2. **Ambient Pulse Glow**: Dynamic cyan/navy radial light diffusion (`fAmbientPulse`).
3. **Triple Liquid Sine Waves**: Continuous 60fps rolling wave silhouettes, **faded to 15% maximum transparency**.
4. **Signature Particle Stream**:
   - Exactly **`69` Men's Vitality Symbols (`♂`)** (Celestial Blue `#21A1F7`).
   - Exactly **`6` Official SuamiSihat Vector Logomarks** (White & Celestial Blue `#FFFFFF` / `#6DC6EC`).
   - Particle sizes uniformly **randomized between `8px` and `24px`** with gentle upward drift and rotation.

---

## 2. Design Tokens & Visual Hierarchy

| Layer | Purpose / Style | Implementation Values |
|---|---|---|
| **Base Surface** | Full-bleed gradient background | `linear-gradient(180deg, #022057 0%, #043388 60%, #021233 100%)` |
| **Ambient Glow** | Radial light diffusion | `radial-gradient(ellipse at center, rgba(33, 161, 247, 0.28) 0%, rgba(4, 51, 136, 0.16) 50%, transparent 75%)`, `filter: blur(70px)` |
| **Wave 1 (Primary)** | Fast crest line & fill | Fill: `rgba(33, 161, 247, 0.06)`, Stroke: `rgba(33, 161, 247, 0.15)` (15% max), Amp: 38, Freq: 0.007 |
| **Wave 2 (Sky)** | Mid-speed secondary wave | Fill: `rgba(109, 198, 236, 0.04)`, Stroke: `rgba(109, 198, 236, 0.12)`, Amp: 28, Freq: 0.010 |
| **Wave 3 (Gold Accent)** | Deep slow ambient harmonic | Fill: `rgba(189, 154, 115, 0.03)`, Stroke: `rgba(189, 154, 115, 0.10)`, Amp: 46, Freq: 0.005 |
| **Particles (♂)** | 69 Men's Vitality Symbols | Stroke: `rgba(33, 161, 247, alpha)`, Size: `8px – 24px` random |
| **Particles (Logo)** | 6 SuamiSihat Dual-S Logomarks | Dual-S interlocking geometry, Size: `8px – 24px` random |

---

## 3. Canonical Reference Implementation

```html
<!-- Container for Hero Banner -->
<div class="hero-banner-container">
  <!-- Ambient Radial Glow -->
  <div class="hero-ambient-glow"></div>

  <!-- 60fps Wave & Particle Canvas -->
  <canvas id="heroWaveCanvas" class="hero-wave-canvas"></canvas>

  <!-- Foreground Hero Content -->
  <div class="hero-content">
    <!-- Hero Title, CTAs, or Cards render here -->
  </div>
</div>
```

```css
/* =========================================================
   HERO BANNER BACKGROUND STYLES
========================================================= */
.hero-banner-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, #022057 0%, #043388 60%, #021233 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-ambient-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.hero-ambient-glow::before {
  content: '';
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 560px;
  background: radial-gradient(ellipse at center, rgba(33, 161, 247, 0.28) 0%, rgba(4, 51, 136, 0.16) 50%, transparent 75%);
  filter: blur(70px);
  animation: fAmbientPulse 8s ease-in-out infinite alternate;
}

@keyframes fAmbientPulse {
  0% { opacity: 0.55; transform: translateX(-50%) scale(0.92); }
  100% { opacity: 1; transform: translateX(-50%) scale(1.12); }
}

.hero-wave-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

.hero-content {
  position: relative;
  z-index: 10;
}
```

```javascript
// =========================================================
// HERO BANNER CANVAS ENGINE (60 FPS)
// =========================================================
(function initHeroBannerBackground() {
  const canvas = document.getElementById('heroWaveCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  let step = 0;
  let animFrameId = null;

  // Strict Brand Ratios
  const MEN_SYMBOL_COUNT = 69;
  const LOGOMARK_COUNT = 6;
  const getRandomSize = () => Math.random() * 16 + 8; // 8px to 24px

  // Official SuamiSihat Vector Logomark Path
  const officialLogomarkSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="50 50 330 330" width="330" height="330" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">
      <path d="M202.379,278.213c-0.214,-0.189 -0.428,-0.405 -0.631,-0.606l-26.461,-26.461l21.408,-21.408l26.461,26.461c5.91,5.911 15.497,5.911 21.406,0c5.697,-5.695 5.9,-14.818 0.606,-20.775c-0.189,-0.214 -0.404,-0.428 -0.606,-0.631l-42.814,-42.814c-0.201,-0.201 -0.415,-0.415 -0.606,-0.629c-5.292,-5.959 -5.089,-15.08 0.606,-20.777c5.911,-5.911 15.497,-5.911 21.408,0l42.814,42.814c0.201,0.201 0.415,0.415 0.606,0.629c4.649,4.817 8.015,10.419 10.121,16.353c3.437,9.763 3.437,20.467 -0.013,30.243l-0.012,0.012c-0.511,1.511 -1.129,2.984 -1.83,4.448c-2.046,4.28 -4.793,8.312 -8.266,11.903c-0.191,0.214 -0.405,0.428 -0.606,0.631c-0.203,0.201 -0.417,0.417 -0.631,0.606c-3.592,3.473 -7.623,6.219 -11.905,8.266l-0.012,0.012c-1.463,0.702 -2.926,1.308 -4.437,1.821l-0.012,0.012c-9.775,3.448 -20.479,3.448 -30.243,0.012c-5.934,-2.106 -11.534,-5.471 -16.352,-10.121Zm-5.043,-139.763l-0.012,0.012c-1.511,0.512 -2.985,1.13 -4.448,1.832c2.046,-4.282 4.793,-8.313 8.266,-11.905c0.189,-0.214 0.404,-0.428 0.606,-0.629c0.203,-0.203 0.417,-0.417 0.631,-0.608c3.592,-3.471 7.623,-6.219 11.903,-8.266c1.463,-0.7 2.938,-1.32 4.448,-1.83l0.013,-0.012c9.775,-3.45 20.479,-3.45 30.242,-0.013c5.934,2.106 11.536,5.471 16.353,10.121c0.214,0.191 0.427,0.405 0.629,0.608l16.353,16.352l-21.408,21.408l-16.352,-16.353c-0.203,-0.203 -0.417,-0.417 -0.631,-0.606c-4.816,-4.651 -10.417,-8.017 -16.352,-10.121c-9.765,-3.437 -20.467,-3.437 -30.243,0.012Zm159.834,84.786l-0.03,-0.018l-47.295,0c-7.14,-16.876 -19.615,-28.375 -19.615,-28.375l-2.018,-2.017l65.734,0l0,-0.053l33.863,0c0.451,5.068 0.695,10.205 0.695,15.394c0,93.918 -76.423,170.342 -170.342,170.342c-46.989,0 -89.574,-19.134 -120.387,-50.017l21.436,-21.436c25.312,25.312 60.266,40.982 98.891,40.982c72.062,0 131.398,-54.497 139.039,-124.526l0.03,-0.277Z" fill="#FFFFFF"/>
      <path d="M248.975,288.322l0.012,-0.012c1.511,-0.512 2.974,-1.119 4.437,-1.821c-2.035,4.27 -4.781,8.302 -8.254,11.893c-0.189,0.214 -0.404,0.428 -0.606,0.631c-0.203,0.201 -0.417,0.415 -0.631,0.606c-3.592,3.473 -7.623,6.219 -11.903,8.264c-1.463,0.703 -2.938,1.321 -4.448,1.832l-0.012,0.012c-9.776,3.45 -20.48,3.45 -30.243,0.013c-5.934,-2.106 -11.536,-5.471 -16.353,-10.121c-0.214,-0.191 -0.428,-0.405 -0.629,-0.606l-26.461,-26.462l21.406,-21.406l26.461,26.461c0.203,0.203 0.417,0.417 0.631,0.606c4.816,4.651 10.417,8.015 16.352,10.121c9.765,3.437 20.467,3.437 30.243,-0.012Zm-30.872,-220.025c-72.062,0 -131.398,54.497 -139.039,124.528l0.008,0.015l89.457,0c-2.295,-8.763 -1.936,-18.08 1.097,-26.68l0.013,-0.012c0.511,-1.511 1.129,-2.985 1.83,-4.448c2.046,-4.28 4.793,-8.312 8.266,-11.903c0.191,-0.214 0.405,-0.428 0.606,-0.631c0.203,-0.203 0.417,-0.417 0.631,-0.606c3.592,-3.473 7.623,-6.221 11.892,-8.254l0.013,-0.012c1.461,-0.702 2.938,-1.32 4.447,-1.832l0.013,-0.012c9.775,-3.448 20.479,-3.448 30.242,-0.012c5.934,2.104 11.536,5.47 16.353,10.121c0.214,0.189 0.428,0.404 0.629,0.606l16.353,16.352l-21.406,21.408l-16.353,-16.353c-5.911,-5.91 -15.495,-5.91 -21.406,0c-5.697,5.697 -5.9,14.819 -0.608,20.777c0.191,0.214 0.405,0.428 0.608,0.631l42.812,42.814c0.203,0.201 0.417,0.415 0.606,0.629c5.293,5.957 5.091,15.08 -0.606,20.777c-5.91,5.911 -15.495,5.911 -21.406,0l-32.977,-32.977l-141.751,0c-0.437,-4.961 -0.674,-9.979 -0.674,-15.053c0,-49.295 21.07,-93.745 54.65,-124.88l-0.018,-0.02c0.185,-0.171 0.382,-0.333 0.568,-0.504c0.995,-0.914 2.02,-1.797 3.035,-2.689c0.977,-0.855 1.947,-1.717 2.944,-2.549c1.064,-0.891 2.153,-1.753 3.241,-2.62c0.987,-0.786 1.97,-1.575 2.975,-2.339c1.124,-0.855 2.269,-1.684 3.415,-2.512c1.008,-0.728 2.017,-1.456 3.041,-2.163c1.171,-0.809 2.359,-1.592 3.55,-2.371c1.038,-0.679 2.079,-1.354 3.134,-2.012c1.211,-0.755 2.435,-1.488 3.667,-2.213c1.071,-0.631 2.147,-1.254 3.232,-1.862c1.246,-0.697 2.501,-1.376 3.765,-2.043c1.11,-0.585 2.227,-1.158 3.353,-1.718c1.269,-0.634 2.544,-1.254 3.83,-1.855c1.157,-0.542 2.321,-1.066 3.493,-1.582c1.285,-0.568 2.573,-1.125 3.877,-1.661c1.206,-0.498 2.423,-0.97 3.643,-1.44c1.295,-0.498 2.592,-0.992 3.901,-1.458c1.264,-0.451 2.539,-0.873 3.817,-1.295c1.293,-0.427 2.587,-0.855 3.893,-1.252c1.33,-0.404 2.674,-0.771 4.018,-1.143c1.28,-0.354 2.559,-0.715 3.852,-1.04c1.407,-0.354 2.83,-0.667 4.252,-0.985c1.255,-0.28 2.506,-0.575 3.771,-0.829c1.507,-0.301 3.03,-0.554 4.552,-0.814c1.203,-0.208 2.4,-0.435 3.611,-0.616c1.651,-0.245 3.318,-0.435 4.982,-0.634c1.107,-0.132 2.206,-0.292 3.32,-0.402c1.908,-0.189 3.834,-0.313 5.758,-0.44c0.891,-0.058 1.776,-0.148 2.671,-0.193c2.832,-0.142 5.682,-0.217 8.549,-0.217c2.783,0 5.549,0.068 8.299,0.199c0.86,0.041 1.708,0.13 2.564,0.185c1.881,0.12 3.763,0.229 5.626,0.409c1.041,0.1 2.066,0.254 3.101,0.372c1.664,0.191 3.333,0.364 4.98,0.603c1.092,0.16 2.168,0.371 3.254,0.55c1.57,0.259 3.15,0.498 4.707,0.801c1.127,0.219 2.236,0.491 3.356,0.731c1.493,0.321 2.995,0.623 4.473,0.984c1.14,0.277 2.259,0.606 3.389,0.908c1.438,0.382 2.883,0.745 4.305,1.163c1.152,0.339 2.282,0.73 3.424,1.092c1.376,0.437 2.758,0.852 4.117,1.323c1.176,0.409 2.331,0.865 3.498,1.298c1.297,0.481 2.603,0.942 3.885,1.453c1.211,0.484 2.394,1.017 3.592,1.527c1.206,0.514 2.425,1.008 3.62,1.55c1.244,0.565 2.46,1.178 3.689,1.773c1.117,0.539 2.246,1.058 3.348,1.621c1.28,0.654 2.531,1.356 3.793,2.041c1.017,0.554 2.048,1.084 3.053,1.657c1.316,0.75 2.601,1.547 3.895,2.331c0.919,0.557 1.853,1.092 2.76,1.666c1.348,0.852 2.661,1.748 3.982,2.636c0.822,0.552 1.657,1.082 2.468,1.648c1.374,0.959 2.715,1.962 4.059,2.961c0.723,0.537 1.461,1.054 2.176,1.601c1.394,1.068 2.751,2.181 4.111,3.29c0.633,0.517 1.282,1.015 1.906,1.542c1.402,1.176 2.765,2.397 4.129,3.62c0.483,0.433 0.985,0.845 1.465,1.285l-0.02,0.02c0,0 2.082,1.855 5.368,5.144l-21.474,21.474c-25.312,-25.311 -60.265,-40.98 -98.889,-40.98Z" fill="#6DC6EC"/>
    </svg>
  `;

  const logomarkImg = new Image();
  logomarkImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(officialLogomarkSvg);

  const resize = () => {
    width = canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
    height = canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
    initParticles();
  };

  const initParticles = () => {
    particles = [];

    // 1. Exactly 6 SuamiSihat Logomarks (8px to 24px)
    for (let i = 0; i < LOGOMARK_COUNT; i++) {
      particles.push({
        x: (width / (LOGOMARK_COUNT + 1)) * (i + 1) + (Math.random() - 0.5) * 80,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -Math.random() * 0.4 - 0.2,
        size: getRandomSize(),
        alpha: Math.random() * 0.3 + 0.45,
        rotation: (Math.random() - 0.5) * 0.35,
        vRot: (Math.random() - 0.5) * 0.012,
        type: 'logomark'
      });
    }

    // 2. Exactly 69 Men's Vitality Symbols (8px to 24px)
    for (let i = 0; i < MEN_SYMBOL_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.5 - 0.2,
        size: getRandomSize(),
        alpha: Math.random() * 0.35 + 0.15,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.02,
        type: 'men'
      });
    }
  };

  window.addEventListener('resize', resize);
  resize();

  function drawLogo(c, x, y, size, alpha, rotation) {
    c.save();
    c.translate(x, y);
    c.rotate(rotation);
    c.globalAlpha = alpha;
    if (logomarkImg.complete && logomarkImg.naturalWidth > 0) {
      c.drawImage(logomarkImg, -size / 2, -size / 2, size, size);
    }
    c.restore();
  }

  function drawMen(c, x, y, size, alpha, rotation) {
    c.save();
    c.translate(x, y);
    c.rotate(rotation);
    c.strokeStyle = `rgba(33, 161, 247, ${alpha})`;
    c.lineWidth = Math.max(1.1, size * 0.08);

    const r = size * 0.35;
    c.beginPath();
    c.arc(0, r * 0.4, r, 0, Math.PI * 2);
    c.stroke();

    const arrowLen = size * 0.6;
    const startX = r * 0.7;
    const startY = -r * 0.3;
    const endX = startX + arrowLen * 0.7;
    const endY = startY - arrowLen * 0.7;

    c.beginPath();
    c.moveTo(startX, startY);
    c.lineTo(endX, endY);
    c.stroke();

    const headLen = size * 0.25;
    c.beginPath();
    c.moveTo(endX - headLen, endY);
    c.lineTo(endX, endY);
    c.lineTo(endX, endY + headLen);
    c.stroke();

    c.restore();
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Triple Sine Wave Layers (Faded to 15% Max Transparency)
    step += 0.012;
    const waves = [
      { color: 'rgba(33, 161, 247, 0.06)', stroke: 'rgba(33, 161, 247, 0.15)', speed: 0.8, amp: 38, freq: 0.007, yRatio: 0.62 },
      { color: 'rgba(109, 198, 236, 0.04)', stroke: 'rgba(109, 198, 236, 0.12)', speed: 1.2, amp: 28, freq: 0.010, yRatio: 0.56 },
      { color: 'rgba(189, 154, 115, 0.03)', stroke: 'rgba(189, 154, 115, 0.10)', speed: 0.5, amp: 46, freq: 0.005, yRatio: 0.68 }
    ];

    waves.forEach((w) => {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 10) {
        const y = Math.sin(x * w.freq + step * w.speed) * w.amp + height * w.yRatio;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = w.color;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = w.stroke;
      ctx.lineWidth = 1.4;
      for (let x = 0; x <= width; x += 10) {
        const y = Math.sin(x * w.freq + step * w.speed) * w.amp + height * w.yRatio;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // Floating Particles
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vRot;

      if (p.y < -30) {
        p.y = height + 30;
        p.x = Math.random() * width;
        p.size = getRandomSize();
      }
      if (p.x < -30) p.x = width + 30;
      if (p.x > width + 30) p.x = -30;

      if (p.type === 'logomark') {
        drawLogo(ctx, p.x, p.y, p.size, p.alpha, p.rotation);
      } else if (p.type === 'men') {
        drawMen(ctx, p.x, p.y, p.size, p.alpha, p.rotation);
      }
    });

    animFrameId = requestAnimationFrame(animate);
  }

  animate();
})();
```

---

## 4. Governance & Compliance Checklist

- [x] **Canonical Naming**: Must always be referred to as `Hero Banner Background` (or `HeroBanner`).
- [x] **Strict Counts**: 69 Men's Vitality Symbols (`♂`) + 6 SuamiSihat Vector Logomarks.
- [x] **Size Boundary**: Uniformly randomized strictly from `8px` to `24px`.
- [x] **Transparency Standard**: Wave line strokes and fills must remain soft and faded at `15%` maximum opacity to prevent competing with foreground text or CTA buttons.
- [x] **60 FPS Hardware Acceleration**: Must execute on clean `requestAnimationFrame` loop without blocking main thread.
