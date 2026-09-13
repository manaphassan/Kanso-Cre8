/**
 * Ambient Audio Service for Kanso Cre8 Focus Radio
 * Pure client-side procedural synthesis for:
 * 1. Lo-Fi Vinyl Crackle & Analog Tape Hiss
 * 2. 40Hz Gamma Wave Cognitive Focus Pulse
 *
 * 100% Offline, Zero Network Requests, Zero External MP3 Dependencies.
 */

class AmbientAudioService {
  isCrackleActive = $state(false);
  crackleVolume = $state(0.35);

  isGammaActive = $state(false);
  gammaVolume = $state(0.20);

  isRainActive = $state(false);
  rainVolume = $state(0.30);

  private ctx: AudioContext | null = null;

  // Vinyl Crackle Nodes
  private crackleSource: AudioBufferSourceNode | null = null;
  private crackleGain: GainNode | null = null;
  private crackleFilter: BiquadFilterNode | null = null;

  // 40Hz Gamma Oscillator Nodes
  private gammaOsc: OscillatorNode | null = null;
  private gammaGain: GainNode | null = null;

  // Studio Rain Nodes
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;

  private initContext(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  }

  // --- VINYL CRACKLE & TAPE HISS ---
  toggleCrackle() {
    if (!this.initContext() || !this.ctx) return;

    if (this.isCrackleActive) {
      this.stopCrackle();
    } else {
      this.startCrackle();
    }
  }

  setCrackleVolume(val: number) {
    this.crackleVolume = Math.max(0, Math.min(1, val));
    if (this.crackleGain && this.ctx) {
      this.crackleGain.gain.setTargetAtTime(this.crackleVolume * 0.4, this.ctx.currentTime, 0.05);
    }
  }

  private startCrackle() {
    if (!this.ctx) return;

    // Create a 5-second seamless vinyl noise buffer with natural micro-pops
    const sampleRate = this.ctx.sampleRate;
    const bufferLength = sampleRate * 5; // 5 seconds loop
    const buffer = this.ctx.createBuffer(1, bufferLength, sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferLength; i++) {
      // Brown/Pink noise base (tape hiss & surface friction)
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      let sample = lastOut * 0.15;

      // Occasional vinyl dust pop / click (random probability ~ 0.015%)
      if (Math.random() < 0.00018) {
        sample += (Math.random() * 2 - 1) * 0.85;
      }
      data[i] = sample;
    }

    this.crackleSource = this.ctx.createBufferSource();
    this.crackleSource.buffer = buffer;
    this.crackleSource.loop = true;

    // Bandpass filter to match 33 RPM physical vinyl groove resonance
    this.crackleFilter = this.ctx.createBiquadFilter();
    this.crackleFilter.type = 'bandpass';
    this.crackleFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);
    this.crackleFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.crackleGain = this.ctx.createGain();
    this.crackleGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.crackleGain.gain.exponentialRampToValueAtTime(this.crackleVolume * 0.4, this.ctx.currentTime + 0.4);

    this.crackleSource.connect(this.crackleFilter);
    this.crackleFilter.connect(this.crackleGain);
    this.crackleGain.connect(this.ctx.destination);

    this.crackleSource.start();
    this.isCrackleActive = true;
  }

  private stopCrackle() {
    if (this.crackleGain && this.ctx) {
      this.crackleGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.1);
      setTimeout(() => {
        try {
          this.crackleSource?.stop();
          this.crackleSource?.disconnect();
          this.crackleFilter?.disconnect();
          this.crackleGain?.disconnect();
        } catch {}
        this.crackleSource = null;
        this.crackleFilter = null;
        this.crackleGain = null;
      }, 150);
    }
    this.isCrackleActive = false;
  }

  applyTapeFormulationAndDolby(formulation: 'TYPE I' | 'TYPE II' | 'TYPE IV', dolby: 'OFF' | 'DOLBY B' | 'DOLBY C') {
    if (!this.ctx || !this.crackleFilter || !this.crackleGain) return;

    let targetFreq = 2400;
    let targetQ = 1.2;
    if (formulation === 'TYPE I') {
      targetFreq = 2000;
      targetQ = 0.9;
    } else if (formulation === 'TYPE IV') {
      targetFreq = 2800;
      targetQ = 1.5;
    }

    let dolbyGainMult = 1.0;
    if (dolby === 'DOLBY B') {
      targetFreq *= 0.75;
      dolbyGainMult = 0.6; // -40% hiss
    } else if (dolby === 'DOLBY C') {
      targetFreq *= 0.5;
      dolbyGainMult = 0.3; // -70% hiss
    }

    this.crackleFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.crackleFilter.Q.setTargetAtTime(targetQ, this.ctx.currentTime, 0.08);
    this.crackleGain.gain.setTargetAtTime(this.crackleVolume * 0.4 * dolbyGainMult, this.ctx.currentTime, 0.08);
  }

  // --- 40Hz GAMMA FOCUS WAVE ---
  toggleGamma() {
    if (!this.initContext() || !this.ctx) return;

    if (this.isGammaActive) {
      this.stopGamma();
    } else {
      this.startGamma();
    }
  }

  setGammaVolume(val: number) {
    this.gammaVolume = Math.max(0, Math.min(1, val));
    if (this.gammaGain && this.ctx) {
      this.gammaGain.gain.setTargetAtTime(this.gammaVolume * 0.25, this.ctx.currentTime, 0.05);
    }
  }

  private startGamma() {
    if (!this.ctx) return;

    this.gammaOsc = this.ctx.createOscillator();
    this.gammaOsc.type = 'sine';
    this.gammaOsc.frequency.setValueAtTime(40, this.ctx.currentTime); // 40Hz pure gamma wave

    this.gammaGain = this.ctx.createGain();
    this.gammaGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.gammaGain.gain.exponentialRampToValueAtTime(this.gammaVolume * 0.25, this.ctx.currentTime + 0.5);

    this.gammaOsc.connect(this.gammaGain);
    this.gammaGain.connect(this.ctx.destination);

    this.gammaOsc.start();
    this.isGammaActive = true;
  }

  private stopGamma() {
    if (this.gammaGain && this.ctx) {
      this.gammaGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
      setTimeout(() => {
        try {
          this.gammaOsc?.stop();
          this.gammaOsc?.disconnect();
          this.gammaGain?.disconnect();
        } catch {}
        this.gammaOsc = null;
        this.gammaGain = null;
      }, 200);
    }
    this.isGammaActive = false;
  }

  // --- STUDIO RAIN ON GLASS ---
  toggleRain() {
    if (!this.initContext() || !this.ctx) return;

    if (this.isRainActive) {
      this.stopRain();
    } else {
      this.startRain();
    }
  }

  setRainVolume(val: number) {
    this.rainVolume = Math.max(0, Math.min(1, val));
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(this.rainVolume * 0.35, this.ctx.currentTime, 0.05);
    }
  }

  private startRain() {
    if (!this.ctx) return;

    const sampleRate = this.ctx.sampleRate;
    const bufferLength = sampleRate * 4; // 4 seconds loop
    const buffer = this.ctx.createBuffer(1, bufferLength, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferLength; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter approximation
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      let pink = b0 + b1 + b2 + white * 0.5362;

      // Soft droplets modulation
      if (Math.random() < 0.0003) {
        pink += (Math.random() * 2 - 1) * 0.6;
      }
      data[i] = pink * 0.12;
    }

    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = buffer;
    this.rainSource.loop = true;

    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'lowpass';
    this.rainFilter.frequency.setValueAtTime(950, this.ctx.currentTime); // Gentle rain through studio glass
    this.rainFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.rainGain.gain.exponentialRampToValueAtTime(this.rainVolume * 0.35, this.ctx.currentTime + 0.5);

    this.rainSource.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.ctx.destination);

    this.rainSource.start();
    this.isRainActive = true;
  }

  private stopRain() {
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.15);
      setTimeout(() => {
        try {
          this.rainSource?.stop();
          this.rainSource?.disconnect();
          this.rainFilter?.disconnect();
          this.rainGain?.disconnect();
        } catch {}
        this.rainSource = null;
        this.rainFilter = null;
        this.rainGain = null;
      }, 200);
    }
    this.isRainActive = false;
  }
}

export const ambientAudioService = new AmbientAudioService();
