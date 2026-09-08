/**
 * Official SuamiSihat Brand Vector Logomark & Microsoft Fluent System SVG Icons
 */

const SS_BRAND_SVGS = {
  // Official Interlocking Dual-S Logomark
  logomark: (size = 64) => `
    <svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Upper Deep Blue S Arc & Interlocking Loop -->
      <path d="M 100 20 C 144.18 20 180 55.82 180 100 L 140 100 C 140 77.91 122.09 60 100 60 C 77.91 60 60 77.91 60 100 C 60 115 70 128 85 135 L 60 168 C 30 150 20 125 20 100 C 20 55.82 55.82 20 100 20 Z" fill="#043388"/>
      <!-- Interlocking Dark Core Loop -->
      <path d="M 100 60 C 112 60 122 70 122 82 C 122 96 102 112 90 124 L 115 152 C 135 130 152 106 152 82 C 152 53 129 30 100 30 L 100 60 Z" fill="#022057"/>
      <!-- Lower Celestial Light Blue S Arc & Interlocking Loop -->
      <path d="M 100 180 C 55.82 180 20 144.18 20 100 L 60 100 C 60 122.09 77.91 140 100 140 C 122.09 140 140 122.09 140 100 C 140 85 130 72 115 65 L 140 32 C 170 50 180 75 180 100 C 180 144.18 144.18 180 100 180 Z" fill="#21A1F7"/>
      <!-- Interlocking Light Core Loop -->
      <path d="M 100 140 C 88 140 78 130 78 118 C 78 104 98 88 110 76 L 85 48 C 65 70 48 94 48 118 C 48 147 71 170 100 170 L 100 140 Z" fill="#6DC6EC"/>
    </svg>
  `,

  // Shattered Fragment Vector (Celestial Blue)
  shatteredFragment: (size = 120, color = '#21A1F7', opacity = 0.15) => `
    <svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity};">
      <path d="M 100 20 C 144.18 20 180 55.82 180 100 L 140 100 C 140 77.91 122.09 60 100 60 C 88 60 78 68 72 78 L 42 50 C 56 32 76 20 100 20 Z" fill="${color}"/>
      <path d="M 100 60 C 112 60 122 70 122 82 C 122 96 102 112 90 124 L 65 96 C 75 84 85 76 100 60 Z" fill="${color}"/>
      <path d="M 60 168 C 40 152 28 128 24 100 L 60 100 C 62 118 72 134 86 144 L 60 168 Z" fill="${color}"/>
    </svg>
  `,

  // High-Resolution Vector Men's Symbol (Mars ♂)
  mensSymbol: (size = 100, color = '#21A1F7', opacity = 0.25) => `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity};">
      <circle cx="38" cy="62" r="26" stroke="${color}" stroke-width="9" fill="none"/>
      <path d="M 58 42 L 88 12" stroke="${color}" stroke-width="9" stroke-linecap="round"/>
      <path d="M 56 12 H 88 V 44" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,

  // Vector Eye Icon (Password Toggle)
  eyeIcon: (size = 18, color = '#666666') => `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `,

  // Vector Lightning Bolt Icon
  lightningIcon: (size = 14, color = '#043388') => `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="none" style="display: inline-block; vertical-align: middle;">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  `,

  // Microsoft Fluent System Icons Dictionary (Clean Vector SVGs - No Emojis)
  fluentIcon: (name, size = 18, color = 'currentColor') => {
    const paths = {
      dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
      folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
      deliverables: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
      people: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
      copy: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
      profile: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
      admin: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z',
      desktop: 'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z',
      download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
      lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
      logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
      sync: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
      menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
      check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
    };

    const d = paths[name] || paths.dashboard;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="display: inline-block; vertical-align: middle;">
        <path d="${d}"/>
      </svg>
    `;
  }
};

window.SS_BRAND_SVGS = SS_BRAND_SVGS;
