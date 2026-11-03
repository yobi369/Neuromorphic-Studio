/**
 * Bio-realistic Web Audio Synthesizer for Neuromorphic Action Potentials
 * Generates brief, organic extracellular spike pops / clicks.
 */

class SpikeAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private lastSpikeTime: number = 0;
  private maxRateHz: number = 80; // Limit clicks to prevent audio clipping

  constructor() {
    // Initialized lazily on user gesture
  }

  private initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.initContext();
    }
    return !this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public playSpike(intensity: number = 0.5, pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = performance.now();
    if (now - this.lastSpikeTime < 1000 / this.maxRateHz) {
      return; // Rate limit
    }
    this.lastSpikeTime = now;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Action potential extracellular wave: fast biphasic transient (approx 1-2ms)
    osc.type = "sine";
    const baseFreq = (750 + Math.random() * 200) * pitchMultiplier;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.008);

    // Bandpass filter to mimic neural recording electrode probe
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, t);
    filter.Q.setValueAtTime(1.8, t);

    // Sharp attack, fast exponential decay
    const vol = Math.min(0.25, Math.max(0.04, intensity * 0.2));
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.009);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.01);
  }
}

export const spikeAudio = new SpikeAudioEngine();
