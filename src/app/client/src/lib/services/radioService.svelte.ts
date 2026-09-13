import type { CassetteRadioStation, RadioPlaybackState } from '$lib/types/radio';

export interface CassetteColorPreset {
  id: string;
  name: string;
  hex: string;
  role: string;
  labelBg: string;
  accentHex: string;
}

export const CASSETTE_COLOR_PALETTE: CassetteColorPreset[] = [
  {
    id: 'papaya-orange',
    name: 'Papaya Orange',
    hex: '#FF7A00',
    role: 'Primary / Main',
    labelBg: '#FFF8F0',
    accentHex: '#694A24'
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    hex: '#00B4D8',
    role: 'Info / Secondary',
    labelBg: '#F0FAFF',
    accentHex: '#FF7A00'
  },
  {
    id: 'emerald',
    name: 'Emerald',
    hex: '#49C16D',
    role: 'Success / Main',
    labelBg: '#F2FDF5',
    accentHex: '#00B4D8'
  },
  {
    id: 'starfruit',
    name: 'Starfruit',
    hex: '#FFBE0B',
    role: 'Rewards / Promo',
    labelBg: '#FFFDF0',
    accentHex: '#694A24'
  },
  {
    id: 'hyper-amber',
    name: 'Hyper Amber',
    hex: '#694A24',
    role: 'Dark Surfaces / Main',
    labelBg: '#FDF6EE',
    accentHex: '#FF7A00'
  },
  {
    id: 'dragon-fruit',
    name: 'Dragon Fruit',
    hex: '#E5383B',
    role: 'Sale / Secondary',
    labelBg: '#FFF0F1',
    accentHex: '#FFBE0B'
  },
  {
    id: 'sakura-iris',
    name: 'Sakura Iris',
    hex: '#8B5CF6',
    role: 'Anime / Creative',
    labelBg: '#FDF4FF',
    accentHex: '#FF7A00'
  },
  {
    id: 'panda-trueno',
    name: 'Panda Trueno',
    hex: '#27272A',
    role: 'Akina Drift / Eurobeat',
    labelBg: '#FFFFFF',
    accentHex: '#E5383B'
  }
];

export const ALL_CASSETTE_STATIONS: CassetteRadioStation[] = [
  {
    id: 'lofi-cafe',
    name: 'Chillhop Cafe',
    genre: 'Lo-Fi / Beats',
    frequency: '98.4 FM',
    streamUrl: 'https://stream.laut.fm/lofi',
    shellColor: '#FF7A00',    // Papaya Orange (Primary / Main)
    labelColor: '#FFF8F0',    // Warm Papaya Cream
    accentColor: '#694A24',   // Hyper Amber
    description: 'Warm, vinyl-crackle hip-hop beats, mellow electric piano, and slow rhythms to maintain flow state.',
    featuredTrack: 'Midnight Rain — Coffee Beats'
  },
  {
    id: 'nightwave-plaza',
    name: 'Nightwave Plaza',
    genre: 'Synthwave / Vapor',
    frequency: '102.1 FM',
    streamUrl: 'https://radio.plaza.one/mp3',
    shellColor: '#00B4D8',    // Lagoon (Info / Link)
    labelColor: '#F0FAFF',    // Lagoon Frost
    accentColor: '#FF7A00',   // Papaya Orange
    description: 'Nostalgic 80s synthesizers, aesthetic vaporwave, and retro Tokyo midnight driving soundscapes.',
    featuredTrack: 'Neon Expressway 1986 — Midnight Drive'
  },
  {
    id: 'groove-salad',
    name: 'SomaFM Groove Salad',
    genre: 'Downtempo / Ambient',
    frequency: '91.3 FM',
    streamUrl: 'https://ice6.somafm.com/groovesalad-256-mp3',
    shellColor: '#49C16D',    // Emerald (Success / Growth)
    labelColor: '#F2FDF5',    // Emerald Mist
    accentColor: '#00B4D8',   // Lagoon
    description: 'A nicely chilled plate of ambient downtempo beats and lush sound textures for deep creative sessions.',
    featuredTrack: 'Solaris Horizons — Ambient Downtempo'
  },
  {
    id: 'anime-fm',
    name: 'AnimeFM',
    genre: 'Anime OST / J-Pop',
    frequency: '93.8 FM',
    streamUrl: 'https://stream.laut.fm/animefm',
    shellColor: '#8B5CF6',    // Sakura Iris (Electric Violet)
    labelColor: '#FDF4FF',    // Sakura Cream
    accentColor: '#FF7A00',   // Papaya Orange
    description: 'Iconic anime openings, emotional endings, vocaloid classics, and high-energy Japanese pop.',
    featuredTrack: 'A Cruel Angel\'s Thesis — Evangelion OST'
  },
  {
    id: 'paris-jazz',
    name: 'Parisian Jazz',
    genre: 'Acoustic / Bossa',
    frequency: '88.5 FM',
    streamUrl: 'https://0nlineradio.radioho.st/0r-jazz?ref=radio-browser',
    shellColor: '#FFBE0B',    // Starfruit (Rewards / Promo)
    labelColor: '#FFFDF0',    // Starfruit Cream
    accentColor: '#694A24',   // Hyper Amber
    description: 'Intimate upright bass, acoustic guitar, soft brushes on snare, and smooth bossa nova melodies.',
    featuredTrack: 'Cafe de Flore — Rue Montmartre Bossa'
  },
  {
    id: 'deep-focus',
    name: 'Zen Alpha Focus',
    genre: 'Ambient / Zen',
    frequency: '95.0 FM',
    streamUrl: 'https://stream.bigfm.de/lofifocus/mp3-128/radiobrowser',
    shellColor: '#694A24',    // Hyper Amber (Deep Accent / Dark Surfaces)
    labelColor: '#FDF6EE',    // Warm Amber Paper
    accentColor: '#FF7A00',   // Papaya Orange
    description: 'Continuous subtle alpha waves, organic textures, and zero-distraction ambient soundscapes.',
    featuredTrack: '432Hz Cognitive Flow — Mindful Stream'
  },
  {
    id: 'initial-d-world',
    name: 'Initial D World Broadcast',
    genre: 'Eurobeat / Touge Drift',
    frequency: '104.5 FM',
    streamUrl: 'https://stream.laut.fm/eurobeat',
    shellColor: '#27272A',    // Panda Trueno (Akina Drift / Eurobeat)
    labelColor: '#FFFFFF',    // Fujiwara Tofu White
    accentColor: '#E5383B',   // Akina SpeedStars Red
    description: 'High-octane Super Eurobeat, downhill drift rhythms, Dave Rodgers, and legendary Akina touge anthems.',
    featuredTrack: 'Running in the 90s — Initial D Eurobeat'
  },
  {
    id: 'dragon-beats',
    name: 'Dragon Fruit Beats',
    genre: 'Future Funk / City Pop',
    frequency: '106.8 FM',
    streamUrl: 'https://stream.laut.fm/synthwave',
    shellColor: '#E5383B',    // Dragon Fruit (Sale / Error / Dynamic)
    labelColor: '#FFF0F1',    // Dragon Fruit Rose
    accentColor: '#FFBE0B',   // Starfruit Yellow
    description: 'Crisp Japanese city pop edits, future funk rhythms, and neon evening Tokyo driving soundscapes.',
    featuredTrack: 'Neo Shibuya Lights — Future City Funk'
  }
];

const STATIONS_STORAGE_KEY = 'kanso_cassette_stations_v2';

function loadStoredStations(): CassetteRadioStation[] {
  if (typeof localStorage === 'undefined') return [...ALL_CASSETTE_STATIONS];
  try {
    const raw = localStorage.getItem(STATIONS_STORAGE_KEY);
    if (!raw) return [...ALL_CASSETTE_STATIONS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('[RadioService] Failed to load stations from localStorage:', err);
  }
  return [...ALL_CASSETTE_STATIONS];
}

class RadioService {
  stations = $state<CassetteRadioStation[]>(loadStoredStations());

  state = $state<RadioPlaybackState>({
    currentStationId: loadStoredStations()[0]?.id || ALL_CASSETTE_STATIONS[0].id,
    isPlaying: false,
    isBuffering: false,
    volume: 0.8,
    isMuted: false,
    currentTrackTitle: 'Ready to Play',
    spoolRotation: 0,
    tapeSide: 'A',
    sessionElapsedSeconds: 420 // Initial 7 min elapsed for authentic tape presence
  });

  private audio: HTMLAudioElement | null = null;
  private animFrameId: number | null = null;
  private elapsedInterval: any = null;
  private metadataInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  private initAudio() {
    this.audio = new Audio();
    this.audio.preload = 'none';
    this.audio.volume = this.state.volume;

    this.audio.addEventListener('playing', () => {
      this.state.isPlaying = true;
      this.state.isBuffering = false;
      this.startSpoolAnimation();
      this.startElapsedTimer();
      this.startMetadataPolling();
    });

    this.audio.addEventListener('waiting', () => {
      this.state.isBuffering = true;
    });

    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.state.isBuffering = false;
      this.stopSpoolAnimation();
      this.stopElapsedTimer();
      this.stopMetadataPolling();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('[RadioService] Audio stream error, retrying...', e);
      this.state.isPlaying = false;
      this.state.isBuffering = false;
      this.state.currentTrackTitle = 'Stream Unavailable (Click Next)';
      this.stopSpoolAnimation();
      this.stopElapsedTimer();
      this.stopMetadataPolling();
    });
  }

  get currentStation(): CassetteRadioStation {
    return this.stations.find(s => s.id === this.state.currentStationId) ?? this.stations[0] ?? ALL_CASSETTE_STATIONS[0];
  }

  get reelProgress(): number {
    // 45 minute standard C-90 tape side (2700 seconds)
    const sideSeconds = 45 * 60;
    const progress = Math.min(1.0, (this.state.sessionElapsedSeconds % sideSeconds) / sideSeconds);
    return this.state.tapeSide === 'A' ? progress : 1.0 - progress;
  }

  private persistStations() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(this.stations));
      } catch (err) {
        console.warn('[RadioService] Failed to persist stations:', err);
      }
    }
  }

  addStation(data: Omit<CassetteRadioStation, 'id'> & { id?: string }): CassetteRadioStation {
    const id = data.id || `custom-${Date.now()}`;
    const newStation: CassetteRadioStation = {
      ...data,
      id,
      isCustom: true
    };
    this.stations = [...this.stations, newStation];
    this.persistStations();
    return newStation;
  }

  updateStation(id: string, updates: Partial<CassetteRadioStation>) {
    this.stations = this.stations.map(st => st.id === id ? { ...st, ...updates } : st);
    this.persistStations();
  }

  deleteStation(id: string) {
    this.stations = this.stations.filter(st => st.id !== id);
    if (this.stations.length === 0) {
      this.stations = [...ALL_CASSETTE_STATIONS];
    }
    if (this.state.currentStationId === id) {
      this.play(this.stations[0].id);
    }
    this.persistStations();
  }

  resetToDefaultStations() {
    this.stations = [...ALL_CASSETTE_STATIONS];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STATIONS_STORAGE_KEY);
    }
    if (!this.stations.some(s => s.id === this.state.currentStationId)) {
      this.play(this.stations[0].id);
    }
  }

  async fetchNowPlayingMetadata(): Promise<void> {
    const station = this.currentStation;
    if (!station || !station.streamUrl) return;

    try {
      const res = await fetch(`/api/radio/now-playing?stationId=${encodeURIComponent(station.id)}&streamUrl=${encodeURIComponent(station.streamUrl)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success && data.trackTitle) {
        if (this.state.currentStationId === station.id) {
          this.state.currentTrackTitle = data.trackTitle;
        }
      }
    } catch {
      // Quiet background failure fallback
    }
  }

  startMetadataPolling() {
    this.stopMetadataPolling();
    this.fetchNowPlayingMetadata();
    this.metadataInterval = setInterval(() => {
      if (this.state.isPlaying) {
        this.fetchNowPlayingMetadata();
      }
    }, 10000);
  }

  stopMetadataPolling() {
    if (this.metadataInterval) {
      clearInterval(this.metadataInterval);
      this.metadataInterval = null;
    }
  }

  flipTapeSide() {
    this.state.tapeSide = this.state.tapeSide === 'A' ? 'B' : 'A';
  }

  play(stationId?: string) {
    if (!this.audio) return;
    const targetId = stationId ?? this.state.currentStationId;
    const station = this.stations.find(s => s.id === targetId) ?? this.stations[0] ?? ALL_CASSETTE_STATIONS[0];

    const isChangingStation = this.state.currentStationId !== station.id || !this.audio.src;
    this.state.currentStationId = station.id;

    if (isChangingStation) {
      this.state.isBuffering = true;
      this.state.currentTrackTitle = `Tuning into ${station.name}...`;
      this.audio.src = station.streamUrl;
      this.audio.load();
      this.fetchNowPlayingMetadata();
    }

    this.audio.play()
      .then(() => {
        this.state.isPlaying = true;
        this.startMetadataPolling();
      })
      .catch((err) => {
        console.warn('[RadioService] Autoplay prevented or stream failed:', err);
        this.state.isPlaying = false;
        this.state.isBuffering = false;
      });
  }

  pause() {
    if (this.audio) {
      this.audio.pause();
    }
    this.stopMetadataPolling();
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.state.isPlaying = false;
    this.state.isBuffering = false;
    this.stopSpoolAnimation();
    this.stopElapsedTimer();
    this.stopMetadataPolling();
  }

  setPlaybackRate(rate: number) {
    const clamped = Math.max(0.8, Math.min(1.2, rate));
    if (this.audio) {
      this.audio.playbackRate = clamped;
    }
  }

  tuneStation(station: CassetteRadioStation) {
    this.play(station.id);
  }

  tuneClosestFrequency(mhz: number): CassetteRadioStation {
    let closestStation = this.stations[0] || ALL_CASSETTE_STATIONS[0];
    let minDiff = 999;
    for (const st of this.stations) {
      const freq = parseFloat(st.frequency) || 98.4;
      const diff = Math.abs(freq - mhz);
      if (diff < minDiff) {
        minDiff = diff;
        closestStation = st;
      }
    }
    this.play(closestStation.id);
    return closestStation;
  }

  toggle(stationId?: string) {
    if (stationId && stationId !== this.state.currentStationId) {
      this.play(stationId);
      return;
    }
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  next() {
    const idx = this.stations.findIndex(s => s.id === this.state.currentStationId);
    const nextIdx = (idx + 1) % this.stations.length;
    this.play(this.stations[nextIdx].id);
  }

  prev() {
    const idx = this.stations.findIndex(s => s.id === this.state.currentStationId);
    const prevIdx = (idx - 1 + this.stations.length) % this.stations.length;
    this.play(this.stations[prevIdx].id);
  }

  setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    if (this.audio) {
      this.audio.volume = clamped;
    }
  }

  toggleMute() {
    this.state.isMuted = !this.state.isMuted;
    if (this.audio) {
      this.audio.muted = this.state.isMuted;
    }
  }

  private startSpoolAnimation() {
    if (this.animFrameId !== null) return;
    const animate = () => {
      if (this.state.isPlaying) {
        this.state.spoolRotation = (this.state.spoolRotation + 2.5) % 360;
        this.animFrameId = requestAnimationFrame(animate);
      } else {
        this.animFrameId = null;
      }
    };
    this.animFrameId = requestAnimationFrame(animate);
  }

  private stopSpoolAnimation() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private startElapsedTimer() {
    if (this.elapsedInterval) return;
    this.elapsedInterval = setInterval(() => {
      if (this.state.isPlaying) {
        this.state.sessionElapsedSeconds++;
      }
    }, 1000);
  }

  private stopElapsedTimer() {
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
  }
}

export const radioService = new RadioService();
