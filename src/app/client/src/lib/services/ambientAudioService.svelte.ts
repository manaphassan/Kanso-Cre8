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

  private ctx: AudioContext | null = null;

  // Vinyl Crackle Nodes
  private crackleSource: AudioBufferSourceNode | null = null;
  private crackleGain: GainNode | null = null;
  private crackleFilter: BiquadFilterNode | null = null;

  // 40Hz Gamma Oscillator Nodes
  private gammaOsc: OscillatorNode | null = null;
  private gammaGain: GainNode | null = null;

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
}

export const ambientAudioService = new AmbientAudioService();
