import type { CassetteRadioStation, RadioPlaybackState } from '$lib/types/radio';

export const ALL_CASSETTE_STATIONS: CassetteRadioStation[] = [
  {
    id: 'lofi-cafe',
    name: 'Chillhop Cafe',
    genre: 'Lo-Fi / Beats',
    frequency: '98.4 FM',
    streamUrl: 'https://stream.laut.fm/lofi',
    shellColor: '#242C20',    // Nordic Olive Obsidian
    labelColor: '#F5F3EC',    // Warm Paper
    accentColor: '#DE694B',   // Vorxs Terracotta
    description: 'Warm, vinyl-crackle hip-hop beats, mellow electric piano, and slow rhythms to maintain flow state.'
  },
  {
    id: 'nightwave-plaza',
    name: 'Nightwave Plaza',
    genre: 'Synthwave / Vapor',
    frequency: '102.1 FM',
    streamUrl: 'https://radio.plaza.one/mp3',
    shellColor: '#1E1B33',    // Deep Indigo Night
    labelColor: '#FDF4FF',    // Vapor Frost
    accentColor: '#E11D48',   // Neon Rose
    description: 'Nostalgic 80s synthesizers, aesthetic vaporwave, and retro Tokyo midnight driving soundscapes.'
  },
  {
    id: 'groove-salad',
    name: 'SomaFM Groove Salad',
    genre: 'Downtempo / Ambient',
    frequency: '91.3 FM',
    streamUrl: 'https://ice6.somafm.com/groovesalad-256-mp3',
    shellColor: '#1A2920',    // Pine Forest
    labelColor: '#EDF5EE',    // Sage Mist
    accentColor: '#8FA683',   // Vorxs Sage Green
    description: 'A nicely chilled plate of ambient downtempo beats and lush sound textures for deep creative sessions.'
  },
  {
    id: 'paris-jazz',
    name: 'Parisian Jazz',
    genre: 'Acoustic / Bossa',
    frequency: '88.5 FM',
    streamUrl: 'https://0nlineradio.radioho.st/0r-jazz?ref=radio-browser',
    shellColor: '#362216',    // Warm Cognac Walnut
    labelColor: '#FEF6E4',    // Vintage Parchment
    accentColor: '#D97706',   // Vintage Amber
    description: 'Intimate upright bass, acoustic guitar, soft brushes on snare, and smooth bossa nova melodies.'
  },
  {
    id: 'deep-focus',
    name: 'Zen Alpha Focus',
    genre: 'Ambient / Zen',
    frequency: '95.0 FM',
    streamUrl: 'https://stream.bigfm.de/lofifocus/mp3-128/radiobrowser',
    shellColor: '#191D17',    // Deep Olive Noir
    labelColor: '#E6E4DC',    // Stone Muted
    accentColor: '#9CA3AF',   // Scandinavian Zinc
    description: 'Continuous subtle alpha waves, organic textures, and zero-distraction ambient soundscapes.'
  }
];

class RadioService {
  state = $state<RadioPlaybackState>({
    currentStationId: ALL_CASSETTE_STATIONS[0].id,
    isPlaying: false,
    isBuffering: false,
    volume: 0.8,
    isMuted: false,
    currentTrackTitle: 'Ready to Play',
    spoolRotation: 0
  });

  private audio: HTMLAudioElement | null = null;
  private animFrameId: number | null = null;

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
    });

    this.audio.addEventListener('waiting', () => {
      this.state.isBuffering = true;
    });

    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.state.isBuffering = false;
      this.stopSpoolAnimation();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('[RadioService] Audio stream error, retrying...', e);
      this.state.isPlaying = false;
      this.state.isBuffering = false;
      this.state.currentTrackTitle = 'Stream Unavailable (Click Next)';
      this.stopSpoolAnimation();
    });
  }

  get currentStation(): CassetteRadioStation {
    return ALL_CASSETTE_STATIONS.find(s => s.id === this.state.currentStationId) ?? ALL_CASSETTE_STATIONS[0];
  }

  play(stationId?: string) {
    if (!this.audio) return;
    const targetId = stationId ?? this.state.currentStationId;
    const station = ALL_CASSETTE_STATIONS.find(s => s.id === targetId) ?? ALL_CASSETTE_STATIONS[0];

    const isChangingStation = this.state.currentStationId !== station.id || !this.audio.src;
    this.state.currentStationId = station.id;

    if (isChangingStation) {
      this.state.isBuffering = true;
      this.state.currentTrackTitle = `Tuning into ${station.name}...`;
      this.audio.src = station.streamUrl;
      this.audio.load();
    }

    this.audio.play()
      .then(() => {
        this.state.isPlaying = true;
        this.state.currentTrackTitle = `${station.name} (${station.frequency})`;
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
    const idx = ALL_CASSETTE_STATIONS.findIndex(s => s.id === this.state.currentStationId);
    const nextIdx = (idx + 1) % ALL_CASSETTE_STATIONS.length;
    this.play(ALL_CASSETTE_STATIONS[nextIdx].id);
  }

  prev() {
    const idx = ALL_CASSETTE_STATIONS.findIndex(s => s.id === this.state.currentStationId);
    const prevIdx = (idx - 1 + ALL_CASSETTE_STATIONS.length) % ALL_CASSETTE_STATIONS.length;
    this.play(ALL_CASSETTE_STATIONS[prevIdx].id);
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
}

export const radioService = new RadioService();
