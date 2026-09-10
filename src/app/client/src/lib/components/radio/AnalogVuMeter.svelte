<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    isPlaying?: boolean;
    volume?: number;
  }

  let { isPlaying = false, volume = 0.8 }: Props = $props();

  // Calibration mode: 1.0 (Normal) vs 1.35 (+3dB Boost)
  let sensitivityBoost = $state(1.0);
  let isBacklightHigh = $state(true);

  // Ballistics needle state (degrees: -38deg is -20dB rest, 0deg is ~ -3dB, +35deg is +3dB peak)
  let angleL = $state(-38);
  let angleR = $state(-38);
  let peakL = $state(false);
  let peakR = $state(false);

  let targetL = -38;
  let targetR = -38;
  let animId: number | null = null;
  let phase = 0;

  function toggleSensitivity() {
    sensitivityBoost = sensitivityBoost === 1.0 ? 1.35 : 1.0;
  }

  function toggleBacklight() {
    isBacklightHigh = !isBacklightHigh;
  }

  onMount(() => {
    const updateBallistics = () => {
      phase += 0.05;

      if (isPlaying) {
        // Procedural rhythmic musical signal simulation based on beat frequencies + volume
        const beat1 = Math.sin(phase * 3.2) * 0.5 + 0.5;
        const beat2 = Math.cos(phase * 4.7) * 0.5 + 0.5;
        const transientL = Math.pow(beat1, 3) * 0.85 + Math.random() * 0.15;
        const transientR = Math.pow(beat2, 3) * 0.85 + Math.random() * 0.15;

        // Map audio transient to degree scale (-38° to +35°)
        const effectiveVol = Math.max(0.1, volume) * sensitivityBoost;
        targetL = -38 + transientL * 70 * effectiveVol;
        targetR = -38 + transientR * 70 * effectiveVol;

        // Check peak overload (> 0dB is ~ +20deg)
        peakL = targetL > 18;
        peakR = targetR > 18;
      } else {
        targetL = -38;
        targetR = -38;
        peakL = false;
        peakR = false;
      }

      // Ballistic spring damping (fast attack, smooth return)
      const speedL = targetL > angleL ? 0.25 : 0.08;
      const speedR = targetR > angleR ? 0.25 : 0.08;

      angleL += (targetL - angleL) * speedL;
      angleR += (targetR - angleR) * speedR;

      animId = requestAnimationFrame(updateBallistics);
    };

    animId = requestAnimationFrame(updateBallistics);
  });

  onDestroy(() => {
    if (animId !== null) {
      cancelAnimationFrame(animId);
    }
  });
</script>

<div class="vu-meter-housing" class:high-glow={isBacklightHigh}>
  <!-- Top Bar Controls: Dual Calibration & Backlight Toggle -->
  <div class="meter-head-controls">
    <div class="channel-indicators">
      <span class="ch-badge">CH-L</span>
      <span class="ch-badge">CH-R</span>
    </div>
    <div class="meter-actions">
      <button
        type="button"
        class="meter-action-btn"
        class:active={sensitivityBoost > 1.0}
        onclick={toggleSensitivity}
        title="Toggle Meter Sensitivity (+3dB)"
      >
        {sensitivityBoost > 1.0 ? '+3dB BOOST' : 'NORM 0dB'}
      </button>
      <button
        type="button"
        class="meter-action-btn"
        onclick={toggleBacklight}
        title="Toggle Meter Warm Filament Backlight"
      >
        💡 {isBacklightHigh ? 'WARM' : 'DIM'}
      </button>
    </div>
  </div>

  <!-- Dual Analog Galvanometer Meters Container -->
  <div class="meters-row">
    <!-- LEFT CHANNEL METER -->
    <div class="single-meter">
      <svg class="meter-dial-svg" viewBox="0 0 140 85">
        <defs>
          <radialGradient id="meterGlowL" cx="50%" cy="85%" r="70%">
            <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#151813" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Dial Face Background Plate -->
        <rect x="2" y="2" width="136" height="81" rx="6" class="dial-plate" fill="url(#meterGlowL)" />

        <!-- Scale Arc: Normal Zone (-20dB to 0dB) -->
        <path d="M 18 64 A 65 65 0 0 1 96 22" fill="none" class="scale-arc-normal" stroke-width="2.5" />
        <!-- Scale Arc: Red Peak Overload Zone (0dB to +3dB) -->
        <path d="M 96 22 A 65 65 0 0 1 124 38" fill="none" stroke="#EF4444" stroke-width="3" />

        <!-- Scale Markings & Text -->
        <!-- -20dB -->
        <line x1="22" y1="60" x2="28" y2="56" class="tick" stroke-width="1.5" />
        <text x="32" y="62" class="dial-num">-20</text>

        <!-- -10dB -->
        <line x1="42" y1="44" x2="48" y2="42" class="tick" stroke-width="1.5" />
        <text x="50" y="47" class="dial-num">-10</text>

        <!-- -5dB -->
        <line x1="68" y1="31" x2="72" y2="33" class="tick" stroke-width="1.5" />
        <text x="69" y="41" class="dial-num">-5</text>

        <!-- 0dB (Red boundary line) -->
        <line x1="96" y1="21" x2="96" y2="28" stroke="#EF4444" stroke-width="2" />
        <text x="94" y="38" class="dial-num zero">0</text>

        <!-- +3dB -->
        <line x1="123" y1="36" x2="119" y2="40" stroke="#EF4444" stroke-width="2" />
        <text x="114" y="52" class="dial-num red">+3</text>

        <!-- VU Label Mark -->
        <text x="70" y="60" text-anchor="middle" class="dial-brand">VU</text>
        <text x="70" y="70" text-anchor="middle" class="dial-sub">DECIBELS</text>

        <!-- Needle Galvanometer Pointer -->
        <g transform="rotate({angleL} 70 82)">
          <!-- Needle shadow -->
          <line x1="70.5" y1="82.5" x2="70.5" y2="18" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" />
          <!-- Needle Arm -->
          <line x1="70" y1="82" x2="70" y2="17" class="needle-arm" stroke-width="1.5" stroke-linecap="round" />
          <!-- Needle Tip Indicator -->
          <circle cx="70" cy="17" r="1" fill="#DE694B" />
        </g>

        <!-- Center Needle Pivot Screw & Cap -->
        <circle cx="70" cy="82" r="7" class="needle-pivot" />
        <circle cx="70" cy="82" r="2.5" fill="#71717A" />
      </svg>

      <!-- Peak LED Indicator -->
      <div class="meter-footer-info">
        <span class="meter-ch-name">LEFT</span>
        <div class="peak-led-wrapper">
          <span class="peak-led" class:peaking={peakL}></span>
          <span class="peak-text">PEAK</span>
        </div>
      </div>
    </div>

    <!-- RIGHT CHANNEL METER -->
    <div class="single-meter">
      <svg class="meter-dial-svg" viewBox="0 0 140 85">
        <defs>
          <radialGradient id="meterGlowR" cx="50%" cy="85%" r="70%">
            <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#151813" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Dial Face Background Plate -->
        <rect x="2" y="2" width="136" height="81" rx="6" class="dial-plate" fill="url(#meterGlowR)" />

        <!-- Scale Arc: Normal Zone (-20dB to 0dB) -->
        <path d="M 18 64 A 65 65 0 0 1 96 22" fill="none" class="scale-arc-normal" stroke-width="2.5" />
        <!-- Scale Arc: Red Peak Overload Zone (0dB to +3dB) -->
        <path d="M 96 22 A 65 65 0 0 1 124 38" fill="none" stroke="#EF4444" stroke-width="3" />

        <!-- Scale Markings & Text -->
        <line x1="22" y1="60" x2="28" y2="56" class="tick" stroke-width="1.5" />
        <text x="32" y="62" class="dial-num">-20</text>

        <line x1="42" y1="44" x2="48" y2="42" class="tick" stroke-width="1.5" />
        <text x="50" y="47" class="dial-num">-10</text>

        <line x1="68" y1="31" x2="72" y2="33" class="tick" stroke-width="1.5" />
        <text x="69" y="41" class="dial-num">-5</text>

        <line x1="96" y1="21" x2="96" y2="28" stroke="#EF4444" stroke-width="2" />
        <text x="94" y="38" class="dial-num zero">0</text>

        <line x1="123" y1="36" x2="119" y2="40" stroke="#EF4444" stroke-width="2" />
        <text x="114" y="52" class="dial-num red">+3</text>

        <text x="70" y="60" text-anchor="middle" class="dial-brand">VU</text>
        <text x="70" y="70" text-anchor="middle" class="dial-sub">DECIBELS</text>

        <!-- Needle Pointer -->
        <g transform="rotate({angleR} 70 82)">
          <line x1="70.5" y1="82.5" x2="70.5" y2="18" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" />
          <line x1="70" y1="82" x2="70" y2="17" class="needle-arm" stroke-width="1.5" stroke-linecap="round" />
          <circle cx="70" cy="17" r="1" fill="#DE694B" />
        </g>

        <!-- Center Needle Pivot -->
        <circle cx="70" cy="82" r="7" class="needle-pivot" />
        <circle cx="70" cy="82" r="2.5" fill="#71717A" />
      </svg>

      <!-- Peak LED Indicator -->
      <div class="meter-footer-info">
        <span class="meter-ch-name">RIGHT</span>
        <div class="peak-led-wrapper">
          <span class="peak-led" class:peaking={peakR}></span>
          <span class="peak-text">PEAK</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .vu-meter-housing {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
    width: 100%;
    max-width: 380px;
  }

  .meter-head-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .channel-indicators {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ch-badge {
    font-size: 10px;
    font-family: var(--font-mono, monospace);
    font-weight: 800;
    color: var(--kanso-text-muted);
    letter-spacing: 0.05em;
  }

  .meter-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .meter-action-btn {
    font-size: 10px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
  }

  .meter-action-btn:hover {
    color: var(--kanso-text-primary);
    border-color: var(--kanso-accent);
  }

  .meter-action-btn.active {
    background: rgba(222, 105, 75, 0.15);
    color: var(--kanso-accent);
    border-color: var(--kanso-accent);
  }

  .meters-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    width: 100%;
  }

  .single-meter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .meter-dial-svg {
    width: 100%;
    height: auto;
    border-radius: 6px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    overflow: hidden;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.35);
  }

  /* Dial Elements */
  .dial-plate {
    stroke: var(--kanso-border);
    stroke-width: 1;
  }

  .scale-arc-normal {
    stroke: var(--kanso-text-muted);
  }

  .tick {
    stroke: var(--kanso-text-muted);
  }

  .dial-num {
    font-size: 8px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    fill: var(--kanso-text-muted);
  }

  .dial-num.zero {
    fill: var(--kanso-text-primary);
    font-weight: 900;
  }

  .dial-num.red {
    fill: #EF4444;
    font-weight: 900;
  }

  .dial-brand {
    font-size: 11px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    fill: var(--kanso-text-primary);
    letter-spacing: 0.15em;
  }

  .dial-sub {
    font-size: 6px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    fill: var(--kanso-text-muted);
    letter-spacing: 0.15em;
  }

  .needle-arm {
    stroke: #DE694B;
  }

  .needle-pivot {
    fill: #3F3F46;
    stroke: #27272A;
    stroke-width: 1;
  }

  /* Meter Footer */
  .meter-footer-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 4px;
    box-sizing: border-box;
  }

  .meter-ch-name {
    font-size: 9.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 800;
    color: var(--kanso-text-muted);
    letter-spacing: 0.05em;
  }

  .peak-led-wrapper {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .peak-led {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #52525B;
    transition: all 0.08s ease;
  }

  .peak-led.peaking {
    background: #EF4444;
    box-shadow: 0 0 8px #EF4444;
  }

  .peak-text {
    font-size: 8.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 800;
    color: var(--kanso-text-muted);
    letter-spacing: 0.05em;
  }
</style>
