<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { radioService, ALL_CASSETTE_STATIONS, CASSETTE_COLOR_PALETTE, type CassetteColorPreset } from '$lib/services/radioService.svelte';
  import type { CassetteRadioStation } from '$lib/types/radio';
  import { ambientAudioService } from '$lib/services/ambientAudioService.svelte';
  import AnalogVuMeter from './AnalogVuMeter.svelte';
  import CassetteSpoolWheel from './CassetteSpoolWheel.svelte';
  import CassetteTapeCard from './CassetteTapeCard.svelte';
  import CassetteBlankCard from './CassetteBlankCard.svelte';

  const stations = $derived(radioService.stations);
  const station = $derived(radioService.currentStation);
  const state = $derived(radioService.state);
  const reelProgress = $derived(radioService.reelProgress);

  // Dynamic reel diameters based on listening session progress (scaled for hero 580px cassette)
  const leftTapeDiameter = $derived(Math.round(62 + (1.0 - reelProgress) * 38));
  const rightTapeDiameter = $derived(Math.round(62 + reelProgress * 38));

  const activeShellColor = $derived(station.shellColor);

  // Analog Tuner Dial Needle Position (88.0 MHz to 108.0 MHz)
  const needlePercent = $derived.by(() => {
    const rawFreq = parseFloat(station.frequency) || 98.4;
    const ratio = (rawFreq - 88.0) / (108.0 - 88.0);
    return Math.max(3, Math.min(97, 3 + ratio * 94));
  });

  // Tape Calibration States
  let tapeFormulation = $state<'TYPE I' | 'TYPE II' | 'TYPE IV'>('TYPE II');
  let dolbyMode = $state<'OFF' | 'DOLBY B' | 'DOLBY C'>('DOLBY B');
  let mpxFilter = $state(false);
  let tapePitch = $state(0.0);

  // Real-time acoustic DSP: modulate tape hiss filter and Dolby gain dynamically
  $effect(() => {
    ambientAudioService.applyTapeFormulationAndDolby(tapeFormulation, dolbyMode);
  });

  function adjustPitch(delta: number) {
    playMechanicalClick();
    tapePitch = Math.round(Math.max(-5.0, Math.min(5.0, tapePitch + delta)) * 10) / 10;
    // Real-time audio DSP: adjust live stream playback speed & pitch
    radioService.setPlaybackRate(1 + tapePitch / 100);
  }

  // 8-Band Spectrum Analyzer Data
  const BANDS = ['60', '150', '400', '1K', '2.5K', '6K', '12K', '16K'];
  let spectrumLevels = $state<number[]>([15, 20, 25, 30, 25, 20, 15, 10]);
  let spectrumAnimId: number | null = null;
  let spectrumPhase = 0;

  onMount(() => {
    const animateSpectrum = () => {
      spectrumPhase += 0.08;
      if (state.isPlaying) {
        spectrumLevels = BANDS.map((_, i) => {
          const base = Math.sin(spectrumPhase * (1.5 + i * 0.4)) * 0.4 + 0.5;
          const noise = Math.random() * 0.25;
          const volMult = Math.max(0.2, state.volume);
          return Math.min(100, Math.max(10, Math.round((base * 0.75 + noise) * 100 * volMult)));
        });
      } else {
        spectrumLevels = [10, 10, 10, 10, 10, 10, 10, 10];
      }
      spectrumAnimId = requestAnimationFrame(animateSpectrum);
    };
    spectrumAnimId = requestAnimationFrame(animateSpectrum);

    return () => {
      if (spectrumAnimId) cancelAnimationFrame(spectrumAnimId);
    };
  });

  onDestroy(() => {
    if (spectrumAnimId) cancelAnimationFrame(spectrumAnimId);
    if (counterInterval) clearInterval(counterInterval);
  });

  function playMechanicalClick() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  // Favorite Stations Quick-Tuner Presets Management
  const FAVORITES_STORAGE_KEY = 'kanso_radio_favorite_stations';
  const LEGACY_STATION_ID_MAP: Record<string, string> = {
    'chillhop': 'lofi-cafe',
    'nightwave': 'nightwave-plaza'
  };
  const DEFAULT_FAVORITE_IDS = ['lofi-cafe', 'nightwave-plaza', 'anime-fm', 'initial-d-world', 'dragon-beats'];

  function loadFavoriteStationIds(): string[] {
    if (typeof localStorage === 'undefined') return DEFAULT_FAVORITE_IDS;
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!raw) return DEFAULT_FAVORITE_IDS;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FAVORITE_IDS;
      
      const validStationIds = new Set(ALL_CASSETTE_STATIONS.map(s => s.id));
      const migrated = parsed
        .map((id: string) => LEGACY_STATION_ID_MAP[id] || id)
        .filter((id: string) => validStationIds.has(id));
      
      const unique = Array.from(new Set(migrated));
      const result = unique.length > 0 ? unique : DEFAULT_FAVORITE_IDS;
      // Persist migrated clean IDs back to localStorage
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(result));
      } catch {}
      return result;
    } catch {
      return DEFAULT_FAVORITE_IDS;
    }
  }

  let favoriteStationIds = $state<string[]>(loadFavoriteStationIds());
  let favoriteFilter = $state<'favorites' | 'all'>('favorites');

  function toggleFavoriteStation(stationId: string) {
    playMechanicalClick();
    if (favoriteStationIds.includes(stationId)) {
      favoriteStationIds = favoriteStationIds.filter(id => id !== stationId);
    } else {
      favoriteStationIds = [...favoriteStationIds, stationId];
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteStationIds));
      } catch {}
    }
  }

  const validFavoriteStations = $derived(stations.filter(s => favoriteStationIds.includes(s.id)));

  const displayedStations = $derived.by(() => {
    if (favoriteFilter === 'favorites') {
      return validFavoriteStations.length > 0 ? validFavoriteStations : stations;
    }
    return stations;
  });

  function handleTuneStation(stId: string) {
    playMechanicalClick();
    radioService.toggle(stId);
  }

  function handleFlipSide() {
    playMechanicalClick();
    radioService.flipTapeSide();
  }

  // Mechanical 4-Digit Tape Counter
  let tapeCounter = $state(142);
  let counterInterval: any = null;

  $effect(() => {
    if (state.isPlaying && !counterInterval) {
      counterInterval = setInterval(() => {
        tapeCounter = (tapeCounter + 1) % 10000;
      }, 1800);
    } else if (!state.isPlaying && counterInterval) {
      clearInterval(counterInterval);
      counterInterval = null;
    }
  });

  const counterDigits = $derived.by(() => {
    return tapeCounter.toString().padStart(4, '0').split('');
  });

  function resetTapeCounter() {
    playMechanicalClick();
    tapeCounter = 0;
  }

  function handleFastForward() {
    playMechanicalClick();
    tapeCounter = (tapeCounter + 15) % 10000;
    // Skip to next radio station
    radioService.next();
  }

  function handleRewind() {
    playMechanicalClick();
    tapeCounter = Math.max(0, tapeCounter - 15);
    // Skip to previous radio station
    radioService.prev();
  }

  // Interactive Click-to-Tune Radio Tuner Glass Dial (88.0 - 108.0 MHz)
  function handleTunerClick(e: MouseEvent) {
    playMechanicalClick();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetMhz = 88.0 + ratio * 20.0;
    radioService.tuneClosestFrequency(targetMhz);
  }

  // ════ STATION MANAGEMENT & RECORD MODAL STATE ════
  let isRecordModalOpen = $state(false);
  let editingStation = $state<CassetteRadioStation | null>(null);
  let stationToDelete = $state<CassetteRadioStation | null>(null);
  let isManageMode = $state(false);

  // Form Fields
  let formName = $state('');
  let formStreamUrl = $state('');
  let formFrequency = $state('99.5 FM');
  let formGenre = $state('Lo-Fi / Beats');
  let formShellColor = $state(CASSETTE_COLOR_PALETTE[0].hex);
  let formDescription = $state('');
  let formFeaturedTrack = $state('');

  // Audio testing in modal
  let testStreamStatus = $state<'idle' | 'testing' | 'success' | 'error'>('idle');
  let testStreamMsg = $state('');
  let testAudio: HTMLAudioElement | null = null;

  const hasCustomStations = $derived(
    stations.some(s => s.isCustom) || stations.length !== ALL_CASSETTE_STATIONS.length
  );

  function openAddStationModal() {
    playMechanicalClick();
    editingStation = null;
    formName = '';
    formStreamUrl = '';
    formFrequency = `${(88.0 + Math.random() * 19.5).toFixed(1)} FM`;
    formGenre = 'Lo-Fi / Beats';
    formShellColor = CASSETTE_COLOR_PALETTE[Math.floor(Math.random() * CASSETTE_COLOR_PALETTE.length)].hex;
    formDescription = 'Custom recorded internet radio stream.';
    formFeaturedTrack = '';
    testStreamStatus = 'idle';
    testStreamMsg = '';
    stopTestAudio();
    isRecordModalOpen = true;
  }

  function openEditStationModal(st: CassetteRadioStation) {
    playMechanicalClick();
    editingStation = st;
    formName = st.name;
    formStreamUrl = st.streamUrl;
    formFrequency = st.frequency;
    formGenre = st.genre;
    formShellColor = st.shellColor;
    formDescription = st.description;
    formFeaturedTrack = st.featuredTrack || '';
    testStreamStatus = 'idle';
    testStreamMsg = '';
    stopTestAudio();
    isRecordModalOpen = true;
  }

  function closeRecordModal() {
    playMechanicalClick();
    stopTestAudio();
    isRecordModalOpen = false;
    editingStation = null;
  }

  function stopTestAudio() {
    if (testAudio) {
      testAudio.pause();
      testAudio.src = '';
      testAudio = null;
    }
  }

  function handleTestStream() {
    if (!formStreamUrl.trim()) {
      testStreamStatus = 'error';
      testStreamMsg = 'Please enter a stream URL first.';
      return;
    }

    stopTestAudio();
    testStreamStatus = 'testing';
    testStreamMsg = 'Connecting to audio stream...';

    try {
      const audio = new Audio();
      audio.preload = 'none';
      audio.src = formStreamUrl.trim();
      testAudio = audio;

      const timeout = setTimeout(() => {
        if (testStreamStatus === 'testing') {
          testStreamStatus = 'error';
          testStreamMsg = 'Connection timed out or stream is unreachable.';
          stopTestAudio();
        }
      }, 7000);

      audio.oncanplay = () => {
        clearTimeout(timeout);
        testStreamStatus = 'success';
        testStreamMsg = '✓ Audio stream online & verified! Broadcast ready.';
        audio.play().catch(() => {});
        setTimeout(() => {
          stopTestAudio();
        }, 3000);
      };

      audio.onerror = () => {
        clearTimeout(timeout);
        testStreamStatus = 'error';
        testStreamMsg = '⚠ Stream error: unable to decode audio format.';
        stopTestAudio();
      };

      audio.load();
    } catch (e: any) {
      testStreamStatus = 'error';
      testStreamMsg = e?.message || 'Error initializing audio test.';
    }
  }

  function handleSaveStation() {
    playMechanicalClick();
    if (!formName.trim() || !formStreamUrl.trim()) return;

    const preset = CASSETTE_COLOR_PALETTE.find(
      p => p.hex.toLowerCase() === formShellColor.toLowerCase()
    ) || CASSETTE_COLOR_PALETTE[0];

    if (editingStation) {
      radioService.updateStation(editingStation.id, {
        name: formName.trim(),
        streamUrl: formStreamUrl.trim(),
        frequency: formFrequency.trim() || '99.0 FM',
        genre: formGenre.trim() || 'Lo-Fi',
        shellColor: formShellColor,
        labelColor: preset.labelBg,
        accentColor: preset.accentHex,
        description: formDescription.trim() || 'Custom recorded studio tape stream.',
        featuredTrack: formFeaturedTrack.trim() || undefined
      });
      if (state.currentStationId === editingStation.id) {
        radioService.play(editingStation.id);
      }
    } else {
      const newSt = radioService.addStation({
        name: formName.trim(),
        streamUrl: formStreamUrl.trim(),
        frequency: formFrequency.trim() || '99.0 FM',
        genre: formGenre.trim() || 'Lo-Fi',
        shellColor: formShellColor,
        labelColor: preset.labelBg,
        accentColor: preset.accentHex,
        description: formDescription.trim() || 'Custom recorded studio tape stream.',
        featuredTrack: formFeaturedTrack.trim() || undefined
      });
      radioService.play(newSt.id);
    }

    closeRecordModal();
  }

  function openDeleteConfirmModal(st: CassetteRadioStation) {
    playMechanicalClick();
    stationToDelete = st;
  }

  function closeDeleteConfirmModal() {
    playMechanicalClick();
    stationToDelete = null;
  }

  function confirmDeleteStation() {
    playMechanicalClick();
    if (stationToDelete) {
      const deletedId = stationToDelete.id;
      radioService.deleteStation(deletedId);
      favoriteStationIds = favoriteStationIds.filter(id => id !== deletedId);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteStationIds));
        } catch {}
      }
      stationToDelete = null;
    }
  }

  function confirmResetPresets() {
    playMechanicalClick();
    if (confirm('Restore default factory cassette presets? Custom tapes will be replaced with original atelier stations.')) {
      radioService.resetToDefaultStations();
    }
  }

  // Cassette Rack Visibility Toggle
  let isRackVisible = $state(true);

  function handleToggleRack() {
    playMechanicalClick();
    isRackVisible = !isRackVisible;
  }
</script>

<div class="deck-wrapper">
  <!-- ════ MAIN MECHANICAL CASSETTE DECK CONSOLE ════ -->
  <div class="deck-main-card">
    <!-- Top Deck Header: Illuminated Analog Radio Tuner Glass & Status -->
    <div class="deck-top-bar">
      <!-- Left: Power & Motor Status -->
      <div class="top-bar-left">
        <div class="power-indicator">
          <span
            class="power-led"
            style="
              background: {state.isPlaying ? '#10B981' : '#71717A'};
              box-shadow: {state.isPlaying ? '0 0 10px rgba(16, 185, 129, 0.7)' : 'none'};
            "
          ></span>
          <span class="power-label">
            {state.isPlaying ? 'HI-FI 33 RPM MOTOR ENGAGED' : 'STUDIO DECK STANDBY'}
          </span>
        </div>
      </div>

      <!-- Center: Illuminated Vintage Analog Radio Tuner Glass Band (Click to Tune!) -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="analog-tuner-glass"
        title="Analog FM Receiver Dial (Click to Tune 88.0 - 108.0 MHz)"
        onclick={handleTunerClick}
      >
        <div class="glass-glare"></div>
        <div class="tuner-scale">
          <span class="tuner-band-tag">FM STEREO</span>
          <div class="scale-ticks">
            {#each [88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108] as mhz}
              <div class="scale-mark-group">
                <span class="mark-label">{mhz}</span>
                <div class="mark-bar major"></div>
                <div class="mark-bar minor"></div>
              </div>
            {/each}
          </div>
          <span class="tuner-unit-tag">MHz</span>
        </div>

        <!-- Sliding Illuminated Tuning Needle -->
        <div class="tuner-needle" style="left: {needlePercent}%;">
          <div class="needle-glow"></div>
          <div class="needle-line"></div>
          <div class="needle-pip"></div>
        </div>

        <!-- Tuner Station Frequency Lock Callout -->
        <div class="tuner-lock-pill">
          <span class="lock-dot"></span>
          <span class="lock-freq">{station.frequency}</span>
          <span class="lock-name">— {station.name}</span>
        </div>
      </div>

      <!-- Right: Mechanical Index Counter & Live Track -->
      <div class="top-bar-right">
        <!-- Mechanical Tape Counter -->
        <div class="tape-counter-box" title="Mechanical Tape Index Counter">
          <span class="counter-tag">INDEX</span>
          <div class="counter-digits">
            {#each counterDigits as digit}
              <span class="counter-digit">{digit}</span>
            {/each}
          </div>
          <button type="button" class="counter-reset-btn" onclick={resetTapeCounter} title="Reset Index Counter">↺</button>
        </div>

        <!-- Track Marquee -->
        <div class="marquee-box">
          <span class="tape-disc-icon">♫</span>
          <span class="track-title-text" title={state.currentTrackTitle}>
            {state.currentTrackTitle}
          </span>
        </div>
      </div>
    </div>

    <!-- ════ 3-COLUMN STUDIO MASTERING CONSOLE GRID ════ -->
    <div class="deck-main-grid">
      <!-- ─── COLUMN 1: LEFT WING — SPECTRUM & TAPE CALIBRATION (270px) ─── -->
      <div class="rack-left-wing">
        <!-- 1. Real-Time 8-Band Audio Spectrum Visualizer -->
        <div class="wing-module spectrum-module">
          <div class="module-header">
            <span class="module-title">AUDIO SPECTRUM</span>
            <span class="module-badge">8-BAND PEAK</span>
          </div>

          <div class="spectrum-bars-grid">
            {#each BANDS as band, idx}
              <div class="spectrum-col">
                <div class="spectrum-meter-track">
                  <div
                    class="spectrum-meter-fill"
                    style="
                      height: {spectrumLevels[idx]}%;
                      background: {spectrumLevels[idx] > 80 ? 'linear-gradient(180deg, #E5383B, #FFBE0B, #49C16D)' : 'linear-gradient(180deg, #FFBE0B, #49C16D)'};
                    "
                  ></div>
                </div>
                <span class="spectrum-band-label">{band}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- 2. Tape Formulation Calibration -->
        <div class="wing-module formulation-module">
          <div class="module-header">
            <span class="module-title">TAPE FORMULATION</span>
            <span class="module-badge">70µs EQ</span>
          </div>
          <div class="formulation-buttons">
            {#each ['TYPE I', 'TYPE II', 'TYPE IV'] as type}
              <button
                type="button"
                class="formulation-btn"
                class:active={tapeFormulation === type}
                onclick={() => { playMechanicalClick(); tapeFormulation = type as any; }}
              >
                <span class="type-indicator"></span>
                <span>{type}</span>
                <span class="type-sub">{type === 'TYPE I' ? 'Normal' : type === 'TYPE II' ? 'CrO2' : 'Metal'}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- 3. Noise Reduction & Bias -->
        <div class="wing-module dolby-module">
          <div class="module-header">
            <span class="module-title">NOISE REDUCTION</span>
            <span class="module-badge">DOLBY NR</span>
          </div>
          <div class="dolby-buttons">
            {#each ['OFF', 'DOLBY B', 'DOLBY C'] as mode}
              <button
                type="button"
                class="dolby-btn"
                class:active={dolbyMode === mode}
                onclick={() => { playMechanicalClick(); dolbyMode = mode as any; }}
              >
                {mode}
              </button>
            {/each}
          </div>
          <div class="mpx-row">
            <button
              type="button"
              class="mpx-toggle-btn"
              class:active={mpxFilter}
              onclick={() => { playMechanicalClick(); mpxFilter = !mpxFilter; }}
            >
              <span class="mpx-dot" class:active={mpxFilter}></span>
              <span>MPX FILTER 19kHz</span>
            </button>
          </div>
        </div>

        <!-- 4. Pitch & Speed Calibration -->
        <div class="wing-module pitch-module">
          <div class="module-header">
            <span class="module-title">PITCH CALIBRATION</span>
            <span class="pitch-val">{tapePitch >= 0 ? '+' : ''}{tapePitch.toFixed(1)}%</span>
          </div>
          <div class="pitch-controls">
            <button type="button" class="pitch-btn" onclick={() => adjustPitch(-0.5)} title="Slow Down (-0.5%)">-</button>
            <div class="pitch-scale-line">
              <div class="pitch-zero-mark"></div>
              <div class="pitch-needle" style="left: {50 + (tapePitch / 5.0) * 45}%;"></div>
            </div>
            <button type="button" class="pitch-btn" onclick={() => adjustPitch(0.5)} title="Speed Up (+0.5%)">+</button>
          </div>
        </div>
      </div>

      <!-- ─── COLUMN 2: CENTER STAGE — HERO CASSETTE BAY (~600px) ─── -->
      <div class="cassette-center-stage">
        <!-- The Physical Cassette Chassis (Hero Sized 580px Width) -->
        <div
          class="chassis"
          style="
            background: {activeShellColor};
            border-color: rgba(255, 255, 255, 0.22);
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45), 0 0 30px {activeShellColor}33;
          "
        >
          <!-- 4 Corner Slotted Silver Screws -->
          <div class="screw top-left"><div class="screw-slot deg-45"></div></div>
          <div class="screw top-right"><div class="screw-slot deg-neg45"></div></div>

          <!-- Paper Sticker Label Header with Papaya Color Accent -->
          <div
            class="sticker-label"
            style="background: {station.labelColor}; color: #151813;"
          >
            <div class="sticker-left">
              <button
                type="button"
                class="sticker-side"
                style="background: {activeShellColor};"
                onclick={handleFlipSide}
                title="Click to Flip Tape (Side A: Station Name · Side B: Song Title)"
              >
                SIDE {state.tapeSide} ⮂
              </button>
              {#if state.tapeSide === 'A'}
                <div class="sticker-meta-wrap">
                  <span class="sticker-side-tag">STATION</span>
                  <span class="sticker-name" title={station.name}>{station.name}</span>
                </div>
              {:else}
                <div class="sticker-meta-wrap">
                  <span class="sticker-side-tag song-tag">NOW PLAYING</span>
                  <span class="sticker-name now-playing" title="Now Playing: {state.currentTrackTitle || station.featuredTrack}">
                    ♫ {state.currentTrackTitle || station.featuredTrack}
                  </span>
                </div>
              {/if}
            </div>
            <div class="sticker-right">
              <span
                class="sticker-freq"
                style="color: {station.accentColor};"
              >
                {station.frequency}
              </span>
            </div>
          </div>

          <!-- Giant Acrylic Tape Window with Dynamic Reel Tape Thickness & Moving Magnetic Ribbon -->
          <div class="acrylic-window">
            <!-- Magnetic Brown Tape Ribbon Strip with Animated Travel Layer -->
            <div class="tape-ribbon" class:is-moving={state.isPlaying}>
              <div class="ribbon-travel-layer" class:is-moving={state.isPlaying}></div>
              <div class="ribbon-glare-layer"></div>
              <div class="tape-gauge">
                <div class="gauge-mark"></div>
                <div class="gauge-mark sm"></div>
                <div class="gauge-mark center" style="background: {station.shellColor || '#DE694B'};"></div>
                <div class="gauge-mark sm"></div>
                <div class="gauge-mark"></div>
              </div>
            </div>

            <!-- Left Spool Wheel with Mechanical Drive Spindle & Tape Roll -->
            <div class="spool-slot">
              <div class="deck-spindle-well" title="Supply Reel Drive Motor Spindle Well"></div>
              <div
                class="tape-roll-disc"
                class:is-spinning={state.isPlaying}
                style="width: {leftTapeDiameter}px; height: {leftTapeDiameter}px; transform: rotate({state.isPlaying ? state.spoolRotation : 0}deg);"
                title="Supply Reel ({Math.round((1 - reelProgress) * 100)}% remaining)"
              >
                <div class="tape-pack-layers"></div>
              </div>
              <CassetteSpoolWheel size={56} isSpinning={state.isPlaying} rotationAngle={state.isPlaying ? state.spoolRotation : 0} showSpindle={true} />
            </div>

            <!-- Center Reel Tape Migration Meter -->
            <div class="reel-migration-meter" title="Tape Migration ({Math.round(reelProgress * 100)}% wound)">
              <div class="migration-bar-fill" style="width: {reelProgress * 100}%; background: linear-gradient(90deg, {station.shellColor || '#FF7A00'}, #FFBE0B);"></div>
            </div>

            <!-- Right Spool Wheel with Mechanical Drive Spindle & Tape Roll -->
            <div class="spool-slot">
              <div class="deck-spindle-well" title="Take-Up Reel Drive Motor Spindle Well"></div>
              <div
                class="tape-roll-disc"
                class:is-spinning={state.isPlaying}
                style="width: {rightTapeDiameter}px; height: {rightTapeDiameter}px; transform: rotate({state.isPlaying ? state.spoolRotation : 0}deg);"
                title="Take-Up Reel ({Math.round(reelProgress * 100)}% wound)"
              >
                <div class="tape-pack-layers"></div>
              </div>
              <CassetteSpoolWheel size={56} isSpinning={state.isPlaying} rotationAngle={state.isPlaying ? state.spoolRotation : 0} showSpindle={true} />
            </div>
          </div>

          <!-- Bottom Reader Trapezoid, Moving Ribbon Track, Capstan Spindles & Bottom Screws -->
          <div class="head-row">
            <div class="screw"><div class="screw-slot deg-12"></div></div>
            <div class="head-notch">
              <div class="bottom-tape-track" class:is-moving={state.isPlaying}></div>

              <!-- Left Capstan Spindle & Pinch Roller Unit -->
              <div class="spindle-roller-unit" title="Left Capstan Spindle & Rubber Pinch Roller">
                <div class="capstan-spindle" title="Polished Steel Capstan Spindle">
                  <div class="capstan-core"></div>
                </div>
                <div class="roller-dot" class:is-spinning={state.isPlaying} style="transform: rotate({state.isPlaying ? state.spoolRotation * 2 : 0}deg);">
                  <div class="roller-notch"></div>
                </div>
              </div>

              <!-- Magnetic Permalloy Tape Head -->
              <div class="roller-center" title="Permalloy Magnetic Tape Head">
                <div class="head-core-line"></div>
              </div>

              <!-- Right Capstan Spindle & Pinch Roller Unit -->
              <div class="spindle-roller-unit" title="Right Capstan Spindle & Rubber Pinch Roller">
                <div class="roller-dot" class:is-spinning={state.isPlaying} style="transform: rotate({state.isPlaying ? state.spoolRotation * 2 : 0}deg);">
                  <div class="roller-notch"></div>
                </div>
                <div class="capstan-spindle" title="Polished Steel Capstan Spindle">
                  <div class="capstan-core"></div>
                </div>
              </div>
            </div>
            <div class="screw"><div class="screw-slot deg-neg12"></div></div>
          </div>

          <!-- High Bias Subtitle + Quick Flip -->
          <div class="tape-bias-text">
            <span>● HIGH BIAS 70µs JAPAN</span>
            <button
              type="button"
              class="quick-flip-btn"
              onclick={handleFlipSide}
              title="Flip Cassette to Side {state.tapeSide === 'A' ? 'B (Song Title)' : 'A (Station Name)'}"
            >
              FLIP TO SIDE {state.tapeSide === 'A' ? 'B (SONG)' : 'A (STATION)'} ⮂
            </button>
            <span>{tapeFormulation} CrO2 ●</span>
          </div>
        </div>

        <!-- ════ MECHANICAL PIANO-KEY TRANSPORT CONTROLS ════ -->
        <div class="piano-transport-bar">
          <button
            type="button"
            class="piano-key key-rew"
            onclick={handleRewind}
            title="Previous Station (REW)"
            aria-label="Rewind to Previous Station"
          >
            <span class="piano-icon">⏪</span>
            <span class="piano-label">REW</span>
          </button>

          <button
            type="button"
            class="piano-key key-play"
            class:is-active={state.isPlaying}
            onclick={() => radioService.toggle()}
            title={state.isPlaying ? 'Pause Deck' : 'Engage Deck Playback'}
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            <span class="piano-icon">{state.isPlaying ? '⏸' : '▶'}</span>
            <span class="piano-label">{state.isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            type="button"
            class="piano-key key-stop"
            onclick={() => radioService.stop()}
            title="Stop Motor & Disengage Heads"
            aria-label="Stop"
          >
            <span class="piano-icon">⏹</span>
            <span class="piano-label">STOP</span>
          </button>

          <button
            type="button"
            class="piano-key key-ff"
            onclick={handleFastForward}
            title="Next Station (FF)"
            aria-label="Fast Forward to Next Station"
          >
            <span class="piano-icon">⏩</span>
            <span class="piano-label">FF</span>
          </button>

          <button
            type="button"
            class="piano-key key-flip"
            onclick={handleFlipSide}
            title="Flip Tape Side (Currently Side {state.tapeSide}: {state.tapeSide === 'A' ? 'Station Name' : 'Song Title'})"
            aria-label="Flip Tape Side"
          >
            <span class="piano-icon">⮂</span>
            <span class="piano-label">SIDE {state.tapeSide}</span>
            <span class="piano-sublabel">{state.tapeSide === 'A' ? 'STATION' : 'SONG'}</span>
          </button>

          <button
            type="button"
            class="piano-key key-eject"
            class:is-active={!isRackVisible}
            onclick={handleToggleRack}
            title={isRackVisible ? 'Hide Studio Cassette Rack' : 'Show Studio Cassette Rack'}
            aria-label="Toggle Cassette Rack"
          >
            <span class="piano-icon">{isRackVisible ? '▼' : '▲'}</span>
            <span class="piano-label">{isRackVisible ? 'HIDE RACK' : 'SHOW RACK'}</span>
          </button>
        </div>

        <!-- Master Output Volume Bar -->
        <div class="master-volume-bar">
          <button
            type="button"
            class="vol-icon-btn"
            onclick={() => radioService.toggleMute()}
            title={state.isMuted ? 'Unmute' : 'Mute'}
          >
            {state.isMuted || state.volume === 0 ? '🔇' : state.volume < 0.5 ? '🔉' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.volume}
            oninput={(e) => radioService.setVolume(parseFloat(e.currentTarget.value))}
            class="master-vol-slider"
            aria-label="Master Volume"
          />
          <span class="vol-num">{Math.round(state.volume * 100)}%</span>
        </div>
      </div>

      <!-- ─── COLUMN 3: RIGHT WING — VU METERS, SPRINT & AMBIENT SOUNDBOARD (340px) ─── -->
      <div class="rack-right-wing">
        <!-- 1. Dual Backlit Analog Needle VU Meters -->
        <div class="wing-module vu-module">
          <AnalogVuMeter isPlaying={state.isPlaying} volume={state.volume} />
        </div>

        <!-- 2. Favorite Stations Tuner Rack -->
        <div class="wing-module favorites-module">
          <div class="module-header">
            <div class="fav-header-left">
              <span class="module-title">FAVORITE STATIONS</span>
              <span class="module-badge">{validFavoriteStations.length} PRESETS</span>
            </div>
            <div class="fav-filter-tabs">
              <button
                type="button"
                class="fav-tab-btn"
                class:active={favoriteFilter === 'favorites'}
                onclick={() => { playMechanicalClick(); favoriteFilter = 'favorites'; }}
                title="Show Favorite Presets"
              >
                ★ FAV ({validFavoriteStations.length})
              </button>
              <button
                type="button"
                class="fav-tab-btn"
                class:active={favoriteFilter === 'all'}
                onclick={() => { playMechanicalClick(); favoriteFilter = 'all'; }}
                title="Browse All {stations.length} Radio Stations"
              >
                ALL ({stations.length})
              </button>
            </div>
          </div>

          <div class="favorites-list-scroll">
            {#if favoriteFilter === 'favorites' && favoriteStationIds.length === 0}
              <div class="fav-empty-state">
                <span class="empty-star">☆</span>
                <p class="empty-text">No favorites starred yet</p>
                <button
                  type="button"
                  class="fav-browse-all-btn"
                  onclick={() => { playMechanicalClick(); favoriteFilter = 'all'; }}
                >
                  Browse All Stations →
                </button>
              </div>
            {:else}
              {#each displayedStations as st (st.id)}
                {@const isCurrent = state.currentStationId === st.id}
                {@const isFav = favoriteStationIds.includes(st.id)}
                <div
                  class="fav-station-row"
                  class:is-active={isCurrent}
                  class:is-playing={isCurrent && state.isPlaying}
                >
                  <!-- 1-Click Tune & Play -->
                  <button
                    type="button"
                    class="fav-tune-btn"
                    onclick={() => handleTuneStation(st.id)}
                    title="Click to tune into {st.name} ({st.frequency})"
                  >
                    <span
                      class="fav-freq-pill"
                      style="
                        background: {st.shellColor}22;
                        color: {st.shellColor};
                        border: 1px solid {st.shellColor}44;
                      "
                    >
                      {st.frequency.replace(' FM', '')}
                    </span>

                    <div class="fav-meta-col">
                      <div class="fav-title-row">
                        <span class="fav-station-title">{st.name}</span>
                        {#if isCurrent}
                          <span class="fav-on-air-tag" class:pulsing={state.isPlaying}>
                            {state.isPlaying ? '● ON AIR' : 'TUNED'}
                          </span>
                        {/if}
                      </div>
                      <span class="fav-genre-text">{st.genre}</span>
                    </div>
                  </button>

                  <!-- Favorite Star Toggle -->
                  <button
                    type="button"
                    class="fav-star-btn"
                    class:is-fav={isFav}
                    onclick={(e) => { e.stopPropagation(); toggleFavoriteStation(st.id); }}
                    title={isFav ? `Remove ${st.name} from Favorites` : `Add ${st.name} to Favorites`}
                    aria-label={isFav ? `Remove ${st.name} from Favorites` : `Add ${st.name} to Favorites`}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
              {/each}
            {/if}
          </div>
        </div>

        <!-- 3. Multi-Channel Atelier Ambient Acoustics Soundboard -->
        <div class="wing-module acoustics-module">
          <div class="module-header">
            <span class="module-title">ATELIER ACOUSTICS</span>
            <span class="module-badge">WEB AUDIO</span>
          </div>

          <div class="acoustics-channels-stack">
            <!-- Channel 1: Vinyl Warmth & Crackle -->
            <div class="acoustic-channel">
              <div class="ch-info">
                <button
                  type="button"
                  class="ch-toggle-btn"
                  class:active={ambientAudioService.isCrackleActive}
                  onclick={() => ambientAudioService.toggleCrackle()}
                >
                  <span class="ch-dot" class:active={ambientAudioService.isCrackleActive}></span>
                  <span class="ch-title">VINYL CRACKLE</span>
                </button>
                <span class="ch-status">{ambientAudioService.isCrackleActive ? Math.round(ambientAudioService.crackleVolume * 100) + '%' : 'MUTED'}</span>
              </div>
              {#if ambientAudioService.isCrackleActive}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientAudioService.crackleVolume}
                  oninput={(e) => ambientAudioService.setCrackleVolume(parseFloat(e.currentTarget.value))}
                  class="ch-slider"
                  aria-label="Vinyl Crackle Volume"
                />
              {/if}
            </div>

            <!-- Channel 2: Studio Rain on Glass -->
            <div class="acoustic-channel">
              <div class="ch-info">
                <button
                  type="button"
                  class="ch-toggle-btn"
                  class:active={ambientAudioService.isRainActive}
                  onclick={() => ambientAudioService.toggleRain()}
                >
                  <span class="ch-dot rain-dot" class:active={ambientAudioService.isRainActive}></span>
                  <span class="ch-title">STUDIO RAIN</span>
                </button>
                <span class="ch-status">{ambientAudioService.isRainActive ? Math.round(ambientAudioService.rainVolume * 100) + '%' : 'MUTED'}</span>
              </div>
              {#if ambientAudioService.isRainActive}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientAudioService.rainVolume}
                  oninput={(e) => ambientAudioService.setRainVolume(parseFloat(e.currentTarget.value))}
                  class="ch-slider"
                  aria-label="Studio Rain Volume"
                />
              {/if}
            </div>

            <!-- Channel 3: 40Hz Cognitive Gamma Focus Tone -->
            <div class="acoustic-channel">
              <div class="ch-info">
                <button
                  type="button"
                  class="ch-toggle-btn"
                  class:active={ambientAudioService.isGammaActive}
                  onclick={() => ambientAudioService.toggleGamma()}
                >
                  <span class="ch-dot gamma-dot" class:active={ambientAudioService.isGammaActive}></span>
                  <span class="ch-title">40Hz GAMMA</span>
                </button>
                <span class="ch-status">{ambientAudioService.isGammaActive ? Math.round(ambientAudioService.gammaVolume * 100) + '%' : 'MUTED'}</span>
              </div>
              {#if ambientAudioService.isGammaActive}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientAudioService.gammaVolume}
                  oninput={(e) => ambientAudioService.setGammaVolume(parseFloat(e.currentTarget.value))}
                  class="ch-slider"
                  aria-label="40Hz Gamma Focus Volume"
                />
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ════ CASSETTE RACK / TAPE CAROUSEL ════ -->
  {#if isRackVisible}
    <div class="rack-container">
      <div class="rack-header-row">
        <div class="rack-header-left">
          <h2 class="rack-title">
            📼 Studio Cassette Rack ({stations.length} Tapes)
          </h2>
          <span class="rack-subtitle">Click any tape to load into the mastering deck · Blank tape to record</span>
        </div>

        <div class="rack-actions">
          <button
            type="button"
            class="rack-action-btn primary"
            onclick={openAddStationModal}
            title="Record New Tape / Add Audio Stream"
          >
            <span class="btn-icon">⏺</span>
            <span>+ Record Blank Tape</span>
          </button>

          <button
            type="button"
            class="rack-action-btn"
            class:active={isManageMode}
            onclick={() => { playMechanicalClick(); isManageMode = !isManageMode; }}
            title={isManageMode ? 'Exit Tape Management Mode' : 'Manage & Delete Tapes'}
          >
            <span class="btn-icon">⚙</span>
            <span>{isManageMode ? 'Done' : 'Manage Tapes'}</span>
          </button>

          {#if hasCustomStations}
            <button
              type="button"
              class="rack-action-btn reset"
              onclick={confirmResetPresets}
              title="Restore Factory Default Stations"
            >
              <span>↺ Reset Defaults</span>
            </button>
          {/if}
        </div>
      </div>

      <!-- Cassette Cards Grid / Rack -->
      <div class="rack-cards-grid">
        {#each stations as st (st.id)}
          <CassetteTapeCard
            station={st}
            isSelected={st.id === state.currentStationId}
            isPlaying={state.isPlaying}
            spoolRotation={state.spoolRotation}
            showManageButtons={isManageMode}
            onclick={() => radioService.toggle(st.id)}
            onedit={() => openEditStationModal(st)}
            ondelete={() => openDeleteConfirmModal(st)}
          />
        {/each}

        <!-- Tactile Blank Cassette C-90 Card (+ Record New Tape) -->
        <CassetteBlankCard onclick={openAddStationModal} />
      </div>
    </div>
  {/if}

  <!-- ════ RECORD / EDIT STATION MODAL ════ -->
  {#if isRecordModalOpen}
    <div
      class="modal-backdrop"
      onclick={(e) => { if (e.target === e.currentTarget) closeRecordModal(); }}
      role="presentation"
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="modal-dialog"
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="record-modal-title"
        onclick={(e) => e.stopPropagation()}
      >
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-subheading">STUDIO TAPE MASTERING RECORDER</span>
            <h3 id="record-modal-title" class="modal-title">
              {editingStation ? '✎ Edit Cassette Tape' : '🎙 Record Blank Cassette C-90'}
            </h3>
          </div>
          <button
            type="button"
            class="modal-close-btn"
            onclick={closeRecordModal}
            title="Close modal"
          >
            ✕
          </button>
        </div>

        <form class="modal-body" onsubmit={(e) => { e.preventDefault(); handleSaveStation(); }}>
          <!-- Field 1: Station Name -->
          <div class="form-group">
            <label for="station-name-input" class="form-label">
              Station Name <span class="required-star">*</span>
            </label>
            <input
              id="station-name-input"
              type="text"
              class="form-input"
              placeholder="e.g. Tokyo Lo-Fi Beats, Shibuya Night FM"
              bind:value={formName}
              required
            />
          </div>

          <!-- Field 2: Audio Stream URL with Live Test Button -->
          <div class="form-group">
            <label for="station-url-input" class="form-label">
              Live Audio Stream URL (MP3 / AAC / Icecast) <span class="required-star">*</span>
            </label>
            <div class="stream-input-row">
              <input
                id="station-url-input"
                type="url"
                class="form-input"
                placeholder="https://stream.example.com/live.mp3"
                bind:value={formStreamUrl}
                required
              />
              <button
                type="button"
                class="test-stream-btn"
                class:is-success={testStreamStatus === 'success'}
                class:is-error={testStreamStatus === 'error'}
                class:is-testing={testStreamStatus === 'testing'}
                onclick={handleTestStream}
                disabled={testStreamStatus === 'testing' || !formStreamUrl.trim()}
              >
                {testStreamStatus === 'testing' ? 'Testing...' : testStreamStatus === 'success' ? '✓ Tested' : '▷ Test Stream'}
              </button>
            </div>
            {#if testStreamMsg}
              <div
                class="stream-feedback"
                class:success={testStreamStatus === 'success'}
                class:error={testStreamStatus === 'error'}
                class:testing={testStreamStatus === 'testing'}
              >
                {testStreamMsg}
              </div>
            {/if}
          </div>

          <!-- Grid: Frequency + Genre -->
          <div class="form-row-2col">
            <div class="form-group">
              <label for="station-freq-input" class="form-label">Dial Frequency</label>
              <input
                id="station-freq-input"
                type="text"
                class="form-input mono"
                placeholder="104.2 FM"
                bind:value={formFrequency}
              />
            </div>
            <div class="form-group">
              <label for="station-genre-input" class="form-label">Genre / Style</label>
              <input
                id="station-genre-input"
                type="text"
                class="form-input"
                placeholder="Lo-Fi / Beats"
                bind:value={formGenre}
              />
            </div>
          </div>

          <!-- Field 4: Cassette Chassis Color -->
          <div class="form-group">
            <span class="form-label">Cassette Chassis Shell Color</span>
            <div class="modal-color-swatches">
              {#each CASSETTE_COLOR_PALETTE as preset}
                <button
                  type="button"
                  class="color-swatch-chip"
                  class:active={formShellColor.toLowerCase() === preset.hex.toLowerCase()}
                  style="background: {preset.hex};"
                  onclick={() => { playMechanicalClick(); formShellColor = preset.hex; }}
                  title="{preset.name} ({preset.role})"
                  aria-label="Select {preset.name} color"
                >
                  {#if formShellColor.toLowerCase() === preset.hex.toLowerCase()}
                    <span class="chip-check">✓</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>

          <!-- Field 5: Description & Vibe -->
          <div class="form-group">
            <label for="station-desc-input" class="form-label">Station Description</label>
            <textarea
              id="station-desc-input"
              class="form-textarea"
              rows="2"
              placeholder="Short description of the broadcast vibe..."
              bind:value={formDescription}
            ></textarea>
          </div>

          <!-- Modal Actions Footer -->
          <div class="modal-footer">
            <button
              type="button"
              class="modal-btn cancel"
              onclick={closeRecordModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="modal-btn submit"
              disabled={!formName.trim() || !formStreamUrl.trim()}
            >
              {editingStation ? '💾 Save Changes' : '⏺ Record & Insert Tape'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- ════ DELETE CONFIRMATION MODAL ════ -->
  {#if stationToDelete}
    <div
      class="modal-backdrop"
      onclick={(e) => { if (e.target === e.currentTarget) closeDeleteConfirmModal(); }}
      role="presentation"
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="modal-dialog delete-dialog"
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        onclick={(e) => e.stopPropagation()}
      >
        <div class="delete-icon-box">🗑</div>
        <h3 id="delete-dialog-title" class="delete-heading">Erase & Eject Tape?</h3>
        <p class="delete-body">
          Are you sure you want to permanently erase <strong>{stationToDelete.name}</strong> ({stationToDelete.frequency}) from your studio cassette rack?
        </p>
        <div class="modal-footer delete-footer">
          <button
            type="button"
            class="modal-btn cancel"
            onclick={closeDeleteConfirmModal}
          >
            Cancel
          </button>
          <button
            type="button"
            class="modal-btn danger"
            onclick={confirmDeleteStation}
          >
            🗑 Erase Tape
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .deck-wrapper {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    box-sizing: border-box;
  }

  /* Main Mechanical Deck Console Card */
  .deck-main-card {
    width: 100%;
    border-radius: 16px;
    padding: 24px;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  /* ════ TOP BAR & ANALOG TUNER GLASS ════ */
  .deck-top-bar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 20px;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 18px;
  }

  @media (max-width: 1100px) {
    .deck-top-bar {
      grid-template-columns: 1fr;
    }
  }

  .top-bar-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
  }

  .power-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .power-led {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }

  .power-label {
    font-size: 11px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted);
  }

  /* Illuminated Analog Radio Tuner Glass Band (Interactive Click-to-Tune) */
  .analog-tuner-glass {
    position: relative;
    height: 46px;
    background: linear-gradient(180deg, #09090B 0%, #111317 100%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.8), 0 1px 3px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    display: flex;
    align-items: center;
    padding: 0 16px;
    box-sizing: border-box;
    cursor: pointer;
    user-select: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .analog-tuner-glass:hover {
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.8), 0 0 12px rgba(255, 255, 255, 0.08);
  }

  .glass-glare {
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 60%);
    pointer-events: none;
    z-index: 3;
  }

  .tuner-scale {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    z-index: 1;
    font-family: var(--font-mono, monospace);
  }

  .tuner-band-tag,
  .tuner-unit-tag {
    font-size: 9.5px;
    font-weight: 800;
    color: var(--kanso-text-muted);
    letter-spacing: 0.08em;
  }

  .scale-ticks {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex: 1;
    margin: 0 16px;
    height: 24px;
  }

  .scale-mark-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .mark-label {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1;
  }

  .mark-bar.major {
    width: 1.5px;
    height: 10px;
    background: rgba(255, 255, 255, 0.4);
  }

  .mark-bar.minor {
    display: none;
  }

  /* The Sliding Amber Needle */
  .tuner-needle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-50%);
    transition: left 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
    z-index: 2;
    pointer-events: none;
  }

  .needle-line {
    position: absolute;
    inset: 0;
    background: #FF7A00;
    box-shadow: 0 0 8px #FF7A00, 0 0 16px rgba(255, 122, 0, 0.6);
  }

  .needle-pip {
    position: absolute;
    top: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #FFBE0B;
    box-shadow: 0 0 6px #FFBE0B;
  }

  .tuner-lock-pill {
    position: absolute;
    right: 12px;
    bottom: 4px;
    display: flex;
    align-items: center;
    gap: 5px;
    background: rgba(0, 0, 0, 0.7);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 10px;
    font-family: var(--font-mono, monospace);
    z-index: 4;
  }

  .lock-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #FF7A00;
    box-shadow: 0 0 4px #FF7A00;
  }

  .lock-freq {
    color: #FF7A00;
    font-weight: 800;
  }

  .lock-name {
    color: var(--kanso-text-muted);
  }

  .top-bar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  /* Mechanical Index Tape Counter */
  .tape-counter-box {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  .counter-tag {
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--kanso-text-muted);
    font-family: var(--font-mono, monospace);
  }

  .counter-digits {
    display: flex;
    gap: 1.5px;
    background: #09090B;
    padding: 2px 4px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8);
  }

  .counter-digit {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 800;
    color: #FAFAFA;
    width: 10px;
    text-align: center;
    line-height: 1;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }

  .counter-digit:last-child {
    border-right: none;
    color: var(--kanso-accent);
  }

  .counter-reset-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
    line-height: 1;
  }

  .counter-reset-btn:hover {
    background: var(--kanso-accent);
    color: #FFFFFF;
    border-color: var(--kanso-accent);
    transform: rotate(90deg);
  }

  /* Marquee Box */
  .marquee-box {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 240px;
    padding: 5px 12px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    overflow: hidden;
  }

  .tape-disc-icon {
    font-size: 12px;
    color: var(--kanso-accent);
    flex-shrink: 0;
  }

  .track-title-text {
    font-size: 11.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 600;
    color: var(--kanso-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ════ 3-COLUMN MASTERING DECK GRID ════ */
  .deck-main-grid {
    display: grid;
    grid-template-columns: 270px 1fr 340px;
    gap: 20px;
    align-items: stretch;
    width: 100%;
    box-sizing: border-box;
  }

  @media (max-width: 1350px) {
    .deck-main-grid {
      grid-template-columns: 260px 1fr;
    }
    .rack-right-wing {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
  }

  @media (max-width: 900px) {
    .deck-main-grid {
      grid-template-columns: 1fr;
    }
    .rack-right-wing {
      grid-template-columns: 1fr;
    }
  }

  /* ─── COLUMN 1: LEFT WING — SPECTRUM & CALIBRATION ─── */
  .rack-left-wing {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .wing-module {
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    padding: 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .module-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .module-title {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted);
    font-family: var(--font-ui, sans-serif);
  }

  .module-badge {
    font-size: 9px;
    font-weight: 800;
    color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.2);
    padding: 1.5px 5px;
    border-radius: 4px;
    font-family: var(--font-mono, monospace);
  }

  /* Spectrum Bars Grid */
  .spectrum-bars-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 6px;
    align-items: flex-end;
    height: 76px;
    background: #09090B;
    padding: 8px 6px 4px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.8);
  }

  .spectrum-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    height: 100%;
  }

  .spectrum-meter-track {
    flex: 1;
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 2px;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
  }

  .spectrum-meter-fill {
    width: 100%;
    border-radius: 2px 2px 0 0;
    transition: height 0.08s ease;
  }

  .spectrum-band-label {
    font-size: 8px;
    font-family: var(--font-mono, monospace);
    color: var(--kanso-text-muted);
    line-height: 1;
  }

  /* Tape Formulation Buttons */
  .formulation-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .formulation-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 4px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 10px;
    font-weight: 800;
  }

  .formulation-btn.active {
    background: rgba(255, 122, 0, 0.12);
    border-color: #FF7A00;
    color: #FF7A00;
  }

  .type-sub {
    font-size: 8px;
    font-weight: 600;
    opacity: 0.7;
  }

  /* Dolby Buttons */
  .dolby-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .dolby-btn {
    padding: 5px 2px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    font-size: 9.5px;
    font-weight: 800;
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .dolby-btn.active {
    background: rgba(0, 180, 216, 0.15);
    border-color: #00B4D8;
    color: #00B4D8;
  }

  .mpx-row {
    display: flex;
    width: 100%;
  }

  .mpx-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 5px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    font-size: 9.5px;
    font-weight: 700;
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mpx-toggle-btn.active {
    color: var(--kanso-text-primary);
    border-color: #49C16D;
  }

  .mpx-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #52525B;
  }

  .mpx-dot.active {
    background: #49C16D;
    box-shadow: 0 0 6px #49C16D;
  }

  /* Pitch Controls */
  .pitch-val {
    font-size: 11px;
    font-weight: 800;
    color: #FFBE0B;
    font-family: var(--font-mono, monospace);
  }

  .pitch-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pitch-btn {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pitch-btn:hover {
    background: var(--kanso-accent);
    color: #FFFFFF;
  }

  .pitch-scale-line {
    flex: 1;
    height: 6px;
    background: #09090B;
    border-radius: 3px;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .pitch-zero-mark {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(255, 255, 255, 0.4);
    transform: translateX(-50%);
  }

  .pitch-needle {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 4px;
    background: #FFBE0B;
    border-radius: 2px;
    transform: translateX(-50%);
    box-shadow: 0 0 4px #FFBE0B;
  }

  /* ─── COLUMN 2: CENTER STAGE — HERO CASSETTE BAY ─── */
  .cassette-center-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    border-radius: 14px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface-hover);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
    box-sizing: border-box;
    width: 100%;
  }

  /* Physical Cassette Chassis (Hero Sized 580px Width) */
  .chassis {
    width: 100%;
    max-width: 580px;
    height: 280px;
    border-radius: 14px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.22);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
    box-sizing: border-box;
    transition: background 0.3s ease, box-shadow 0.3s ease;
  }

  /* Screws */
  .screw {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #D4D4D8;
    border: 1px solid rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    position: relative;
    flex-shrink: 0;
  }

  .screw.top-left { position: absolute; top: 12px; left: 12px; z-index: 5; }
  .screw.top-right { position: absolute; top: 12px; right: 12px; z-index: 5; }

  .screw-slot {
    width: 7px;
    height: 1.5px;
    background: #52525B;
  }

  .deg-45 { transform: rotate(45deg); }
  .deg-neg45 { transform: rotate(-45deg); }
  .deg-12 { transform: rotate(12deg); }
  .deg-neg12 { transform: rotate(-12deg); }

  /* Sticker Label */
  .sticker-label {
    width: 100%;
    border-radius: 8px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    z-index: 2;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-sizing: border-box;
  }

  .sticker-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    overflow: hidden;
  }

  .sticker-side {
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 900;
    border-radius: 4px;
    color: #FFFFFF;
    letter-spacing: 0.05em;
    flex-shrink: 0;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .sticker-side:hover {
    opacity: 0.85;
  }

  .sticker-name {
    font-size: 15px;
    font-weight: 700;
    color: #151813;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sticker-name.now-playing {
    font-style: italic;
    letter-spacing: 0.02em;
  }

  .sticker-meta-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
  }

  .sticker-side-tag {
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.06em;
    padding: 1.5px 5px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.12);
    color: #151813;
    font-family: var(--font-mono, monospace);
    flex-shrink: 0;
  }

  .sticker-side-tag.song-tag {
    background: rgba(255, 122, 0, 0.2);
    color: #694A24;
  }

  .sticker-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .sticker-freq {
    font-size: 13.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    flex-shrink: 0;
  }

  /* Tape Acrylic Window */
  .acrylic-window {
    width: 100%;
    height: 118px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 44px;
    margin: auto 0;
    box-sizing: border-box;
    box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.7);
  }

  .tape-ribbon {
    position: absolute;
    left: 56px;
    right: 56px;
    height: 56px;
    background: linear-gradient(180deg, #1c0e08 0%, #2f170e 45%, #25120a 60%, #150a05 100%);
    border-radius: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    border-bottom: 1px solid rgba(0, 0, 0, 0.8);
    border-left: 1px solid rgba(120, 53, 15, 0.6);
    border-right: 1px solid rgba(120, 53, 15, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6), inset 0 -2px 4px rgba(0, 0, 0, 0.6);
  }

  .ribbon-travel-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.05) 0px,
      rgba(255, 255, 255, 0.05) 1.5px,
      transparent 1.5px,
      transparent 12px,
      rgba(0, 0, 0, 0.25) 12px,
      rgba(0, 0, 0, 0.25) 15px,
      transparent 15px,
      transparent 32px
    );
    background-size: 64px 100%;
    opacity: 0.6;
    transition: opacity 0.3s ease;
  }

  .ribbon-travel-layer.is-moving {
    opacity: 0.9;
    animation: tapeRibbonTravel 1.4s linear infinite;
  }

  .ribbon-glare-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(110deg, transparent 32%, rgba(255, 255, 255, 0.07) 48%, rgba(255, 255, 255, 0.02) 52%, transparent 68%);
    z-index: 1;
  }

  @keyframes tapeRibbonTravel {
    0% { background-position: 0px 0; }
    100% { background-position: 64px 0; }
  }

  .tape-gauge {
    position: relative;
    z-index: 2;
    width: 72px;
    height: 26px;
    background: rgba(0, 0, 0, 0.85);
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 6px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  }

  .gauge-mark {
    width: 1.5px;
    height: 14px;
    background: rgba(255, 255, 255, 0.4);
  }

  .gauge-mark.sm {
    height: 9px;
    background: rgba(255, 255, 255, 0.25);
  }

  .gauge-mark.center {
    height: 16px;
  }

  .spool-slot {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 104px;
    height: 104px;
    flex-shrink: 0;
  }

  .deck-spindle-well {
    position: absolute;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: radial-gradient(circle, #09090B 35%, #18181B 80%, #27272A 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.9);
  }

  .tape-roll-disc {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, #1a0e08 0%, #30170d 45%, #422013 70%, #25120a 100%);
    border: 1px solid rgba(0, 0, 0, 0.8);
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.8), inset 0 0 4px rgba(0, 0, 0, 0.9);
    transition: width 0.3s ease, height 0.3s ease;
    pointer-events: none;
  }

  .tape-pack-layers {
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    border: 1px dashed rgba(255, 255, 255, 0.08);
  }

  .reel-migration-meter {
    position: absolute;
    bottom: 8px;
    left: 45%;
    transform: translateX(-50%);
    width: 90px;
    height: 4px;
    background: rgba(0, 0, 0, 0.85);
    border-radius: 2px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 3;
  }

  .migration-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  /* Bottom Head Row */
  .head-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 4px;
    box-sizing: border-box;
    position: relative;
    z-index: 2;
  }

  .head-notch {
    flex: 1;
    margin: 0 16px;
    height: 28px;
    background: #09090B;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 16px;
    position: relative;
    overflow: hidden;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.9);
  }

  .bottom-tape-track {
    position: absolute;
    top: 4px;
    left: 0;
    right: 0;
    height: 8px;
    background: #25120a;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(0, 0, 0, 0.6);
  }

  .spindle-roller-unit {
    display: flex;
    align-items: center;
    gap: 4px;
    z-index: 2;
  }

  .capstan-spindle {
    width: 8px;
    height: 14px;
    background: linear-gradient(90deg, #A1A1AA 0%, #F4F4F5 50%, #71717A 100%);
    border-radius: 2px;
    border: 1px solid rgba(0, 0, 0, 0.5);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .capstan-core {
    width: 2px;
    height: 10px;
    background: #27272A;
  }

  .roller-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: radial-gradient(circle, #27272A 20%, #18181B 70%, #09090B 100%);
    border: 1px solid #52525B;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .roller-notch {
    width: 4px;
    height: 1.5px;
    background: #71717A;
  }

  .roller-center {
    width: 26px;
    height: 16px;
    background: linear-gradient(180deg, #71717A 0%, #D4D4D8 40%, #A1A1AA 70%, #52525B 100%);
    border-radius: 3px;
    border: 1px solid #27272A;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .head-core-line {
    width: 2px;
    height: 10px;
    background: #18181B;
  }

  .tape-bias-text {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-size: 9.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.6);
    padding: 0 4px;
    box-sizing: border-box;
  }

  .quick-flip-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 9px;
    font-weight: 800;
    color: #FFFFFF;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .quick-flip-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: #FFFFFF;
  }

  /* ════ MECHANICAL PIANO-KEY TRANSPORT BAR ════ */
  .piano-transport-bar {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
    width: 100%;
    max-width: 580px;
    margin-top: 16px;
  }

  .piano-key {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 10px 4px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border);
    background: linear-gradient(180deg, var(--kanso-surface) 0%, var(--kanso-surface-hover) 100%);
    color: var(--kanso-text-primary);
    cursor: pointer;
    transition: transform 0.1s ease, background 0.15s ease, box-shadow 0.15s ease;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .piano-key:active {
    transform: translateY(2px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .piano-icon {
    font-size: 14px;
    line-height: 1;
  }

  .piano-label {
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.05em;
    font-family: var(--font-ui, sans-serif);
  }

  .piano-sublabel {
    font-size: 7.5px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--kanso-text-muted);
    line-height: 1;
  }

  .piano-key.key-play {
    background: linear-gradient(180deg, rgba(255, 122, 0, 0.2) 0%, rgba(255, 122, 0, 0.1) 100%);
    border-color: #FF7A00;
    color: #FF7A00;
  }

  .piano-key.key-play.is-active {
    background: #FF7A00;
    color: #FFFFFF;
    box-shadow: 0 0 12px rgba(255, 122, 0, 0.5);
  }

  /* Master Volume Bar */
  .master-volume-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 580px;
    margin-top: 12px;
    padding: 6px 14px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    box-sizing: border-box;
  }

  .vol-icon-btn {
    background: transparent;
    border: none;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
  }

  .master-vol-slider {
    flex: 1;
    height: 5px;
    accent-color: var(--kanso-accent);
    cursor: pointer;
  }

  .vol-num {
    font-size: 11px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    color: var(--kanso-text-muted);
    min-width: 32px;
    text-align: right;
  }

  /* ─── COLUMN 3: RIGHT WING — VU METERS, SPRINT & SOUNDBOARD ─── */
  .rack-right-wing {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .vu-module {
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ─── Favorite Stations Quick-Tuner Rack Module ─── */
  .favorites-module {
    background: var(--kanso-surface-hover);
    padding: 12px;
    gap: 10px;
  }

  .fav-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .fav-filter-tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--kanso-surface);
    padding: 2px;
    border-radius: 6px;
    border: 1px solid var(--kanso-border);
  }

  .fav-tab-btn {
    font-size: 8.5px;
    font-weight: 800;
    font-family: var(--font-ui, sans-serif);
    letter-spacing: 0.04em;
    padding: 3px 7px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .fav-tab-btn:hover {
    color: var(--kanso-text-primary);
  }

  .fav-tab-btn.active {
    background: var(--kanso-surface-hover);
    color: var(--kanso-accent);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .favorites-list-scroll {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 196px;
    overflow-y: auto;
    padding-right: 2px;
  }

  .favorites-list-scroll::-webkit-scrollbar {
    width: 4px;
  }

  .favorites-list-scroll::-webkit-scrollbar-thumb {
    background: var(--kanso-border);
    border-radius: 2px;
  }

  .fav-station-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 4px 6px 4px 8px;
    transition: all 0.15s ease;
    gap: 6px;
  }

  .fav-station-row:hover {
    background: var(--kanso-surface-hover);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .fav-station-row.is-active {
    border-color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.06);
  }

  .fav-station-row.is-playing {
    border-color: #10B981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.15);
  }

  .fav-tune-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 3px 0;
    text-align: left;
  }

  .fav-freq-pill {
    font-size: 9.5px;
    font-weight: 800;
    font-family: var(--font-mono, monospace);
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;
    line-height: 1.2;
  }

  .fav-meta-col {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 1px;
    flex: 1;
  }

  .fav-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .fav-station-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
  }

  .fav-on-air-tag {
    font-size: 7.5px;
    font-weight: 900;
    letter-spacing: 0.05em;
    padding: 1px 4px;
    border-radius: 3px;
    background: #10B981;
    color: #FFFFFF;
    flex-shrink: 0;
    line-height: 1.2;
  }

  .fav-on-air-tag.pulsing {
    animation: pulseOnAir 1.5s infinite;
  }

  @keyframes pulseOnAir {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.75; transform: scale(0.97); }
  }

  .fav-genre-text {
    font-size: 9px;
    color: var(--kanso-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
  }

  .fav-star-btn {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--kanso-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .fav-star-btn:hover {
    color: #FFBE0B;
    background: rgba(255, 190, 11, 0.12);
  }

  .fav-star-btn.is-fav {
    color: #FFBE0B;
    text-shadow: 0 0 6px rgba(255, 190, 11, 0.5);
  }

  .fav-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px 10px;
    text-align: center;
    gap: 6px;
  }

  .empty-star {
    font-size: 24px;
    color: var(--kanso-text-muted);
  }

  .empty-text {
    font-size: 11px;
    color: var(--kanso-text-muted);
    margin: 0;
  }

  .fav-browse-all-btn {
    font-size: 10px;
    font-weight: 700;
    color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 4px;
    transition: all 0.15s ease;
  }

  .fav-browse-all-btn:hover {
    background: var(--kanso-accent);
    color: #FFFFFF;
  }

  /* Multi-Channel Atelier Soundboard */
  .acoustics-channels-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .acoustic-channel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
  }

  .ch-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .ch-toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .ch-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #52525B;
    transition: all 0.2s ease;
  }

  .ch-dot.active {
    background: #FF7A00;
    box-shadow: 0 0 6px #FF7A00;
  }

  .ch-dot.rain-dot.active {
    background: #00B4D8;
    box-shadow: 0 0 6px #00B4D8;
  }

  .ch-dot.gamma-dot.active {
    background: #49C16D;
    box-shadow: 0 0 6px #49C16D;
  }

  .ch-title {
    font-size: 10.5px;
    font-weight: 800;
    color: var(--kanso-text-primary);
    letter-spacing: 0.03em;
  }

  .ch-status {
    font-size: 9.5px;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    color: var(--kanso-text-muted);
  }

  .ch-slider {
    width: 100%;
    height: 4px;
    accent-color: var(--kanso-accent);
    cursor: pointer;
  }

  /* ════ CASSETTE RACK / TAPE CAROUSEL ════ */
  .rack-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .rack-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 12px;
  }

  .rack-header-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .rack-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--kanso-text-primary);
    margin: 0;
  }

  .rack-subtitle {
    font-size: 12px;
    color: var(--kanso-text-muted);
  }

  .rack-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .rack-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    font-family: inherit;
    padding: 6px 12px;
    border-radius: 6px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .rack-action-btn:hover {
    color: var(--kanso-text-primary);
    border-color: var(--kanso-text-muted);
    background: var(--kanso-surface-hover);
  }

  .rack-action-btn.primary {
    background: rgba(222, 105, 75, 0.12);
    border-color: rgba(222, 105, 75, 0.35);
    color: var(--kanso-accent);
  }

  .rack-action-btn.primary:hover {
    background: var(--kanso-accent);
    color: #FFFFFF;
    border-color: var(--kanso-accent);
  }

  .rack-action-btn.active {
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-accent);
    color: var(--kanso-text-primary);
  }

  .rack-action-btn.reset {
    font-size: 11px;
  }

  .btn-icon {
    font-size: 11px;
  }

  .rack-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    width: 100%;
  }

  /* ════ RECORD / EDIT STATION MODAL ════ */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
  }

  .modal-dialog {
    width: 100%;
    max-width: 520px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
    animation: modal-pop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes modal-pop {
    0% { transform: scale(0.95); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 14px;
  }

  .modal-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .modal-subheading {
    font-size: 10px;
    font-family: var(--font-mono, monospace);
    font-weight: 800;
    color: var(--kanso-text-muted);
    letter-spacing: 0.08em;
  }

  .modal-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--kanso-text-primary);
    margin: 0;
  }

  .modal-close-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    transition: all 0.15s ease;
  }

  .modal-close-btn:hover {
    color: var(--kanso-text-primary);
    border-color: var(--kanso-text-muted);
    background: var(--kanso-surface-hover);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .required-star {
    color: #E5383B;
  }

  .form-input,
  .form-textarea {
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .form-input:focus,
  .form-textarea:focus {
    border-color: var(--kanso-accent);
    box-shadow: 0 0 0 1px var(--kanso-accent);
  }

  .form-input.mono {
    font-family: var(--font-mono, monospace);
  }

  .stream-input-row {
    display: flex;
    gap: 8px;
  }

  .test-stream-btn {
    flex-shrink: 0;
    padding: 0 14px;
    border-radius: 8px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .test-stream-btn:hover:not(:disabled) {
    border-color: var(--kanso-accent);
    color: var(--kanso-accent);
  }

  .test-stream-btn.is-testing {
    opacity: 0.7;
    cursor: wait;
  }

  .test-stream-btn.is-success {
    background: rgba(16, 185, 129, 0.15);
    border-color: #10B981;
    color: #10B981;
  }

  .test-stream-btn.is-error {
    background: rgba(229, 56, 59, 0.15);
    border-color: #E5383B;
    color: #E5383B;
  }

  .stream-feedback {
    font-size: 11.5px;
    font-family: var(--font-mono, monospace);
    padding: 4px 8px;
    border-radius: 4px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
  }

  .stream-feedback.success {
    color: #10B981;
    border-color: rgba(16, 185, 129, 0.35);
    background: rgba(16, 185, 129, 0.08);
  }

  .stream-feedback.error {
    color: #E5383B;
    border-color: rgba(229, 56, 59, 0.35);
    background: rgba(229, 56, 59, 0.08);
  }

  .stream-feedback.testing {
    color: #FFBE0B;
    border-color: rgba(255, 190, 11, 0.35);
    background: rgba(255, 190, 11, 0.08);
  }

  .form-row-2col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .modal-color-swatches {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 4px 0;
  }

  .color-swatch-chip {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, border-color 0.15s ease;
    padding: 0;
  }

  .color-swatch-chip:hover {
    transform: scale(1.15);
    border-color: rgba(255, 255, 255, 0.7);
  }

  .color-swatch-chip.active {
    border-color: #FFFFFF;
    transform: scale(1.15);
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
  }

  .chip-check {
    font-size: 11px;
    font-weight: 900;
    color: #FFFFFF;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid var(--kanso-border);
    padding-top: 16px;
    margin-top: 4px;
  }

  .modal-btn {
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
  }

  .modal-btn.cancel {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
  }

  .modal-btn.cancel:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
  }

  .modal-btn.submit {
    background: var(--kanso-accent);
    border: 1px solid var(--kanso-accent);
    color: #FFFFFF;
  }

  .modal-btn.submit:hover:not(:disabled) {
    opacity: 0.9;
    box-shadow: 0 2px 10px rgba(222, 105, 75, 0.35);
  }

  .modal-btn.submit:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ════ DELETE CONFIRMATION DIALOG ════ */
  .delete-dialog {
    max-width: 420px;
    text-align: center;
    align-items: center;
    gap: 12px;
  }

  .delete-icon-box {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(229, 56, 59, 0.12);
    border: 1px solid rgba(229, 56, 59, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }

  .delete-heading {
    font-size: 17px;
    font-weight: 800;
    color: var(--kanso-text-primary);
    margin: 0;
  }

  .delete-body {
    font-size: 13px;
    line-height: 1.5;
    color: var(--kanso-text-muted);
    margin: 0;
  }

  .delete-body strong {
    color: var(--kanso-text-primary);
  }

  .delete-footer {
    width: 100%;
    justify-content: center;
    border-top: none;
    padding-top: 8px;
  }

  .modal-btn.danger {
    background: #E5383B;
    border: 1px solid #E5383B;
    color: #FFFFFF;
  }

  .modal-btn.danger:hover {
    opacity: 0.9;
    box-shadow: 0 2px 8px rgba(229, 56, 59, 0.4);
  }

  /* E-Ink Monochrome Overrides */
  :global([data-theme="eink"]) .modal-dialog {
    border: 2px solid #000000 !important;
    background: #FFFFFF !important;
    color: #000000 !important;
    box-shadow: none !important;
  }

  :global([data-theme="eink"]) .modal-btn.submit {
    background: #000000 !important;
    color: #FFFFFF !important;
    border-color: #000000 !important;
  }

  :global([data-theme="eink"]) .modal-btn.danger {
    background: #000000 !important;
    color: #FFFFFF !important;
    border-color: #000000 !important;
  }
</style>
