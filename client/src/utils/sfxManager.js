/**
 * SFX Manager - Web Audio API Synthesis & Audio Asset Manager
 * Provides ultra-low latency, zero-dependency synthesized game feel sound effects
 * with optional HTML5 Audio fallback for custom mp3 files.
 */

class SFXManager {
  constructor() {
    this.ctx = null;
    this.lastHoverTime = 0;
    this.hoverThrottleMs = 50; // prevents audio buzzing when moving mouse fast across items
    this.customSounds = {};
    this.audioUnlocked = false;

    // Optional audio asset paths in /public/sounds/
    this.soundPaths = {
      hover: '/sounds/hover.mp3',
      click: '/sounds/click.mp3',
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
      explosion: '/sounds/explosion.mp3',
      alert: '/sounds/alert.mp3'
    };
  }

  // Initialize or resume native AudioContext safely
  getAudioContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlockAudio() {
    if (this.audioUnlocked) return;
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.audioUnlocked = true;
      }).catch(() => {});
    } else if (ctx && ctx.state === 'running') {
      this.audioUnlocked = true;
    }
  }

  /**
   * 1. playHover() : Un tout petit "tic" très court et subtil (~25ms).
   */
  playHover(enabled = true) {
    if (!enabled) return;
    const now = Date.now();
    if (now - this.lastHoverTime < this.hoverThrottleMs) return;
    this.lastHoverTime = now;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2200, startTime);
      osc.frequency.exponentialRampToValueAtTime(1400, startTime + 0.025);

      gain.gain.setValueAtTime(0.04, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.03);
    } catch (e) {
      console.debug('SFX Hover error:', e);
    }
  }

  /**
   * 2. playClick() : Un "pop" ou clic électronique tactile et satisfaisant (~50ms).
   */
  playClick(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      
      // Layer 1: Body tone sweep (pop)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, startTime);
      osc.frequency.exponentialRampToValueAtTime(180, startTime + 0.05);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.06);

      // Layer 2: Crisp transient click
      const snap = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snap.type = 'triangle';
      snap.frequency.setValueAtTime(1600, startTime);
      snap.frequency.exponentialRampToValueAtTime(400, startTime + 0.015);

      snapGain.gain.setValueAtTime(0.06, startTime);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.015);

      snap.connect(snapGain);
      snapGain.connect(ctx.destination);

      snap.start(startTime);
      snap.stop(startTime + 0.02);
    } catch (e) {
      console.debug('SFX Click error:', e);
    }
  }

  /**
   * 3. playSuccess() : Un "Ding" positif et cristallin (accord montant harmonique).
   */
  playSuccess(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      // Harmonious gamer triad (E6: 1318.5Hz, G#6: 1661.2Hz, B6: 1975.5Hz)
      const frequencies = [1318.5, 1661.2, 1975.5];

      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + index * 0.045; // slight melodic stagger

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.14 - index * 0.02, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.5);
      });
    } catch (e) {
      console.debug('SFX Success error:', e);
    }
  }

  /**
   * 4. playError() : Un "Buzzer" sourd et métallique (dissonance basse).
   */
  playError(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const duration = 0.35;

      // Filter to dampen highs and make it dull / heavy
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, startTime);
      filter.frequency.exponentialRampToValueAtTime(140, startTime + duration);

      // Two detuned sawtooth oscillators for buzzer grit
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(145, startTime);
      osc1.frequency.exponentialRampToValueAtTime(95, startTime + duration);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(138, startTime); // detuned
      osc2.frequency.exponentialRampToValueAtTime(90, startTime + duration);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.05);
      osc2.stop(startTime + duration + 0.05);
    } catch (e) {
      console.debug('SFX Error error:', e);
    }
  }

  /**
   * 5. playExplosion() : Un son lourd d'impact et de sub-bass (Mur de la Vengeance).
   */
  playExplosion(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const duration = 0.85;

      // 1. Heavy Sub-Bass 808 drop
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(150, startTime);
      subOsc.frequency.exponentialRampToValueAtTime(32, startTime + duration);

      subGain.gain.setValueAtTime(0.35, startTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      subOsc.start(startTime);
      subOsc.stop(startTime + duration + 0.05);

      // 2. White noise burst for impact crunch
      const bufferSize = ctx.sampleRate * 0.45;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(600, startTime);
      noiseFilter.frequency.exponentialRampToValueAtTime(80, startTime + 0.45);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(startTime);
      noise.stop(startTime + 0.5);
    } catch (e) {
      console.debug('SFX Explosion error:', e);
    }
  }

  /**
   * Extra: playAlert() / Opponent joined sound
   */
  playAlert(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const notes = [587.33, 880]; // D5 -> A5 rising alert chime

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + idx * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.4);
      });
    } catch (e) {
      console.debug('SFX Alert error:', e);
    }
  }
}

export const sfx = new SFXManager();
