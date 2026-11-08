// CS Interactive Lab - Web Audio API Sound Synthesizer
class SoundController {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.15;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq = 440, type = 'sine', duration = 0.05, gainScale = 1.0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      const targetGain = this.volume * gainScale;
      gain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (err) {
      // Audio playback error guard
    }
  }

  playSortTone(value, min = 5, max = 100) {
    // Map value to pentatonic frequencies (150Hz - 900Hz)
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
    const freq = 160 + ratio * 850;
    this.playTone(freq, 'triangle', 0.035, 0.7);
  }

  playClick() {
    this.playTone(800, 'sine', 0.02, 0.4);
  }

  playSuccess() {
    if (this.muted) return;
    const chords = [523.25, 659.25, 783.99, 1046.50]; // C Major
    chords.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.15, 0.8);
      }, idx * 60);
    });
  }

  playDeadlockAlert() {
    this.playTone(180, 'sawtooth', 0.3, 1.2);
  }

  playPacketTick() {
    this.playTone(1200, 'sine', 0.015, 0.3);
  }
}

window.soundController = new SoundController();
