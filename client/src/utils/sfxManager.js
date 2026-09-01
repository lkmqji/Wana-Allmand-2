/**
 * SFX Manager - Web Audio API Synthesis & Audio Asset Manager
 * Provides ultra-low latency, zero-dependency synthesized game feel sound effects
 * with distinct volume staging:
 * - Social & UI: Low volume (~50% of gameplay)
 * - Gameplay & Duel: Medium volume
 * - Progression & Victory: Normal / full volume
 */

class SFXManager {
  constructor() {
    this.ctx = null;
    this.lastHoverTime = 0;
    this.hoverThrottleMs = 50; // prevents audio buzzing when moving mouse fast
    this.lastTimeWarningTime = 0;
    this.audioUnlocked = false;

    // Master and SFX volume controls (0 to 1) with boosted overall app gain
    this.masterVolume = 0.5;
    this.sfxVolume = 0.5;
    this.masterBaseMultiplier = 1.35; // +35% total volume output boost across the application
    this.sfxBaseMultiplier = 1.85; // Boosted base volume for distinct, punchy procedural SFX
    this.masterGainNode = null;
    this.sfxGainNode = null;
    this.compressorNode = null;

    // Optional audio asset paths in /public/sounds/
    this.soundPaths = {
      hover: '/sounds/hover.mp3',
      click: '/sounds/click.mp3',
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
      explosion: '/sounds/explosion.mp3',
      alert: '/sounds/alert.mp3',
      messageSent: '/sounds/message_sent.mp3',
      messageReceived: '/sounds/message_received.mp3',
      notification: '/sounds/notification.mp3',
      reactionBurst: '/sounds/reaction_burst.mp3',
      countdownTick: '/sounds/countdown_tick.mp3',
      countdownGo: '/sounds/countdown_go.mp3',
      timeWarning: '/sounds/time_warning.mp3',
      opponentAnswered: '/sounds/opponent_answered.mp3',
      freeze: '/sounds/freeze.mp3',
      victory: '/sounds/victory.mp3',
      defeat: '/sounds/defeat.mp3',
      levelUp: '/sounds/levelup.mp3'
    };
  }

  // Initialize or resume native AudioContext safely with GainNode pipeline & Anti-Clipping Compressor
  getAudioContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGainNode = this.ctx.createGain();
        this.sfxGainNode = this.ctx.createGain();
        
        // Anti-clipping limiter / compressor to ensure clear, punchy sound without distortion
        this.compressorNode = this.ctx.createDynamicsCompressor();
        this.compressorNode.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
        this.compressorNode.knee.setValueAtTime(8, this.ctx.currentTime);
        this.compressorNode.ratio.setValueAtTime(12, this.ctx.currentTime);
        this.compressorNode.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressorNode.release.setValueAtTime(0.15, this.ctx.currentTime);
        
        this.masterGainNode.gain.setValueAtTime(this.masterVolume * this.masterBaseMultiplier, this.ctx.currentTime);
        this.sfxGainNode.gain.setValueAtTime(this.sfxVolume * this.sfxBaseMultiplier, this.ctx.currentTime);

        this.sfxGainNode.connect(this.masterGainNode);
        this.masterGainNode.connect(this.compressorNode);
        this.compressorNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Returns destination for all synthesized SFX through the master/sfx gain pipeline
  getDestination() {
    const ctx = this.getAudioContext();
    if (!ctx) return null;
    if (!this.sfxGainNode || !this.masterGainNode) {
      this.masterGainNode = ctx.createGain();
      this.sfxGainNode = ctx.createGain();
      this.compressorNode = ctx.createDynamicsCompressor();
      this.compressorNode.threshold.setValueAtTime(-1.0, ctx.currentTime);
      this.compressorNode.knee.setValueAtTime(8, ctx.currentTime);
      this.compressorNode.ratio.setValueAtTime(12, ctx.currentTime);
      this.compressorNode.attack.setValueAtTime(0.003, ctx.currentTime);
      this.compressorNode.release.setValueAtTime(0.15, ctx.currentTime);

      this.masterGainNode.gain.setValueAtTime(this.masterVolume * this.masterBaseMultiplier, ctx.currentTime);
      this.sfxGainNode.gain.setValueAtTime(this.sfxVolume * this.sfxBaseMultiplier, ctx.currentTime);
      this.sfxGainNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.compressorNode);
      this.compressorNode.connect(ctx.destination);
    }
    return this.sfxGainNode;
  }

  setVolumes({ master, sfx } = {}) {
    if (master !== undefined) this.setMasterVolume(master);
    if (sfx !== undefined) this.setSfxVolume(sfx);
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, Number(val)));
    if (this.ctx && this.masterGainNode) {
      try {
        this.masterGainNode.gain.setValueAtTime(this.masterVolume * this.masterBaseMultiplier, this.ctx.currentTime);
      } catch (e) {
        console.debug('Error setting master gain:', e);
      }
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(val)));
    if (this.ctx && this.sfxGainNode) {
      try {
        this.sfxGainNode.gain.setValueAtTime(this.sfxVolume * this.sfxBaseMultiplier, this.ctx.currentTime);
      } catch (e) {
        console.debug('Error setting SFX gain:', e);
      }
    }
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

  suspend() {
    if (this.ctx && this.ctx.state === 'running') {
      return this.ctx.suspend().catch((e) => {
        console.debug('SFX AudioContext suspend notice:', e);
      });
    }
    return Promise.resolve();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume().catch((e) => {
        console.debug('SFX AudioContext resume notice:', e);
      });
    }
    return Promise.resolve();
  }

  // Dispose and close AudioContext safely
  dispose() {
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close();
      } catch (e) {
        console.debug('Error closing AudioContext:', e);
      }
      this.ctx = null;
      this.masterGainNode = null;
      this.sfxGainNode = null;
      this.compressorNode = null;
      this.audioUnlocked = false;
    }
  }

  // ==========================================
  // 1. BASE UI SOUNDS
  // ==========================================

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
      gain.connect(this.getDestination() || ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.03);
    } catch (e) {
      console.debug('SFX Hover error:', e);
    }
  }

  playClick(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, startTime);
      osc.frequency.exponentialRampToValueAtTime(180, startTime + 0.05);

      gain.gain.setValueAtTime(0.10, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

      osc.connect(gain);
      gain.connect(this.getDestination() || ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.06);

      const snap = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snap.type = 'triangle';
      snap.frequency.setValueAtTime(1600, startTime);
      snap.frequency.exponentialRampToValueAtTime(400, startTime + 0.015);

      snapGain.gain.setValueAtTime(0.05, startTime);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.015);

      snap.connect(snapGain);
      snapGain.connect(this.getDestination() || ctx.destination);

      snap.start(startTime);
      snap.stop(startTime + 0.02);
    } catch (e) {
      console.debug('SFX Click error:', e);
    }
  }

  playSuccess(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const frequencies = [1318.5, 1661.2, 1975.5]; // E6, G#6, B6

      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + index * 0.045;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.14 - index * 0.02, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.45);

        osc.connect(gain);
        gain.connect(this.getDestination() || ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.5);
      });
    } catch (e) {
      console.debug('SFX Success error:', e);
    }
  }

  playPitchUp(enabled = true, comboLevel = 0) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const startTime = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Base frequency C4, goes up a semitone per comboLevel
      const C4 = 261.63;
      const baseFreq = C4 * Math.pow(1.05946, comboLevel * 2); // 2 semitones per combo
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, startTime + 0.1);
      
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);
      
      osc.connect(gain);
      gain.connect(this.getDestination() || ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    } catch (e) {
      console.debug('SFX PitchUp error:', e);
    }
  }

  playError(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const duration = 0.35;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, startTime);
      filter.frequency.exponentialRampToValueAtTime(140, startTime + duration);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(145, startTime);
      osc1.frequency.exponentialRampToValueAtTime(95, startTime + duration);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(138, startTime);
      osc2.frequency.exponentialRampToValueAtTime(90, startTime + duration);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.getDestination() || ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.05);
      osc2.stop(startTime + duration + 0.05);
    } catch (e) {
      console.debug('SFX Error error:', e);
    }
  }

  playExplosion(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const duration = 0.85;

      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(150, startTime);
      subOsc.frequency.exponentialRampToValueAtTime(32, startTime + duration);

      subGain.gain.setValueAtTime(0.35, startTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      subOsc.connect(subGain);
      subGain.connect(this.getDestination() || ctx.destination);

      subOsc.start(startTime);
      subOsc.stop(startTime + duration + 0.05);

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
      noiseGain.connect(this.getDestination() || ctx.destination);

      noise.start(startTime);
      noise.stop(startTime + 0.5);
    } catch (e) {
      console.debug('SFX Explosion error:', e);
    }
  }

  playAlert(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const notes = [587.33, 880];

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
        gain.connect(this.getDestination() || ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.4);
      });
    } catch (e) {
      console.debug('SFX Alert error:', e);
    }
  }

  // ==========================================
  // 2. SONS SOCIAUX & UI (Volume bas: ~0.04-0.08)
  // ==========================================

  /**
   * 1. playMessageSent() : Petit "Swoosh" aigu ascendant (très léger).
   */
  playMessageSent(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, startTime);
      osc.frequency.exponentialRampToValueAtTime(1750, startTime + 0.09);

      // Volume bas 50%
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.055, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.10);

      osc.connect(gain);
      gain.connect(this.getDestination() || ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.11);
    } catch (e) {
      console.debug('SFX MessageSent error:', e);
    }
  }

  /**
   * 2. playMessageReceived() : "Blip" doux et clair (style Discord/Messenger).
   */
  playMessageReceived(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const notes = [659.25, 987.77]; // E5 -> B5

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        // Volume bas 50%
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.06, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.16);

        osc.connect(gain);
        gain.connect(this.getDestination() || ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.18);
      });
    } catch (e) {
      console.debug('SFX MessageReceived error:', e);
    }
  }

  /**
   * 3. playNotification() : Carillon très doux pour les Toasts globaux.
   */
  playNotification(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const notes = [880, 1108.73]; // A5 -> C#6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.07, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.32);

        osc.connect(gain);
        gain.connect(this.getDestination() || ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.35);
      });
    } catch (e) {
      console.debug('SFX Notification error:', e);
    }
  }

  /**
   * 4. playReactionBurst() : Bruit pétillant / bulles (volée d'émojis Telegram).
   */
  playReactionBurst(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const popPitches = [750, 1050, 1350, 1650, 1950];

      popPitches.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const popStart = startTime + idx * 0.035;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, popStart);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.35, popStart + 0.03);

        gain.gain.setValueAtTime(0.001, popStart);
        gain.gain.linearRampToValueAtTime(0.045, popStart + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, popStart + 0.035);

        osc.connect(gain);
        gain.connect(this.getDestination() || ctx.destination);

        osc.start(popStart);
        osc.stop(popStart + 0.04);
      });
    } catch (e) {
      console.debug('SFX ReactionBurst error:', e);
    }
  }

  // ==========================================
  // 3. SONS DE GAMEPLAY (Volume moyen: ~0.12-0.20)
  // ==========================================

  /**
   * 5. playCountdownTick() : Un "Bip" grave et court (pour le 3... 2... 1...).
   */
  playCountdownTick(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, startTime); // A4
      osc.frequency.exponentialRampToValueAtTime(330, startTime + 0.06);

      gain.gain.setValueAtTime(0.14, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);

      osc.connect(gain);
      gain.connect(this.getDestination() || ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.07);
    } catch (e) {
      console.debug('SFX CountdownTick error:', e);
    }
  }

  /**
   * 6. playCountdownGo() : Un "BEEP!" plus long et aigu (pour le GO!).
   */
  playCountdownGo(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, startTime); // A5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, startTime + 0.18); // C6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760, startTime);
      osc2.frequency.exponentialRampToValueAtTime(2093, startTime + 0.18);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.20, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.getDestination() || ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + 0.30);
      osc2.stop(startTime + 0.30);
    } catch (e) {
      console.debug('SFX CountdownGo error:', e);
    }
  }

  /**
   * 7. playTimeWarning() : Battement de cœur rapide ou "Tic-Tac" angoissant (< 3s).
   */
  playTimeWarning(enabled = true) {
    if (!enabled) return;
    const now = Date.now();
    if (now - this.lastTimeWarningTime < 380) return; // limit pulse frequency
    this.lastTimeWarningTime = now;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      
      // Low heartbeat pulse
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(100, startTime);
      subOsc.frequency.exponentialRampToValueAtTime(45, startTime + 0.12);

      subGain.gain.setValueAtTime(0.22, startTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      subOsc.connect(subGain);
      subGain.connect(this.getDestination() || ctx.destination);

      subOsc.start(startTime);
      subOsc.stop(startTime + 0.13);

      // High crisp clock click
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();

      click.type = 'triangle';
      click.frequency.setValueAtTime(2000, startTime);
      click.frequency.exponentialRampToValueAtTime(800, startTime + 0.03);

      clickGain.gain.setValueAtTime(0.08, startTime);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.03);

      click.connect(clickGain);
      clickGain.connect(this.getDestination() || ctx.destination);

      click.start(startTime);
      click.stop(startTime + 0.04);
    } catch (e) {
      console.debug('SFX TimeWarning error:', e);
    }
  }

  /**
   * 8. playOpponentAnswered() : Un "clac" sourd pour la pression.
   */
  playOpponentAnswered(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, startTime);
      osc.frequency.exponentialRampToValueAtTime(75, startTime + 0.08);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, startTime);

      gain.gain.setValueAtTime(0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getDestination() || ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.10);
    } catch (e) {
      console.debug('SFX OpponentAnswered error:', e);
    }
  }

  /**
   * 9. playFreeze() : Bruit de verre brisé ou vent glacial (pouvoir 🥶).
   */
  playFreeze(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      const crystalPitches = [2400, 3100, 3900, 4600];

      crystalPitches.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = startTime + idx * 0.035;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, start + 0.35);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

        osc.connect(gain);
        gain.connect(this.getDestination() || ctx.destination);

        osc.start(start);
        osc.stop(start + 0.38);
      });
    } catch (e) {
      console.debug('SFX Freeze error:', e);
    }
  }

  // ==========================================
  // 4. SONS DE PROGRESSION & RÉSULTATS (Volume normal: ~0.20-0.30)
  // ==========================================

  /**
   * 10. playVictory() : Fanfare triomphale / accord majeur joyeux (Gagnant).
   */
  playVictory(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      // C5, E5, G5, C6 triumphant fanfare
      const notes = [
        { freq: 523.25, time: 0, dur: 0.12 },
        { freq: 659.25, time: 0.10, dur: 0.12 },
        { freq: 783.99, time: 0.20, dur: 0.14 },
        { freq: 1046.50, time: 0.32, dur: 0.65 },
        { freq: 1318.51, time: 0.32, dur: 0.65 } // harmonic top 3rd
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + time;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + dur);

        osc.connect(gain);
        gain.connect(this.getDestination() || ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + dur + 0.05);
      });
    } catch (e) {
      console.debug('SFX Victory error:', e);
    }
  }

  /**
   * 11. playDefeat() : Accord descendant triste ou sombre (Perdant).
   */
  playDefeat(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      // G4 -> Eb4 -> C4 somber minor decay
      const notes = [
        { freq: 392.00, time: 0, dur: 0.25 },
        { freq: 311.13, time: 0.22, dur: 0.28 },
        { freq: 261.63, time: 0.46, dur: 0.55 }
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + time;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, noteStart);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, noteStart);
        filter.frequency.exponentialRampToValueAtTime(120, noteStart + dur);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.getDestination() || ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + dur + 0.05);
      });
    } catch (e) {
      console.debug('SFX Defeat error:', e);
    }
  }

  /**
   * 12. playLevelUp() : Accord magistral majestueux (Palier XP franchi).
   */
  playLevelUp(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;
      // Majestic ascending sweep: F4, A4, C5, F5, A5, C6
      const arpeggio = [349.23, 440.00, 523.25, 698.46, 880.00, 1046.50];

      arpeggio.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + idx * 0.07;
        const dur = idx === arpeggio.length - 1 ? 0.75 : 0.22;

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.16, noteStart + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + dur);

        osc.connect(gain);
        gain.connect(this.getDestination() || ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + dur + 0.05);
      });
    } catch (e) {
      console.debug('SFX LevelUp error:', e);
    }
  }

  /**
   * 13. playGameStart() : Accord cinématographique percutant de lancement d'arène.
   */
  playGameStart(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const startTime = ctx.currentTime;

      // 1. Sub-bass punch
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(120, startTime);
      sub.frequency.exponentialRampToValueAtTime(40, startTime + 0.4);
      subGain.gain.setValueAtTime(0.25, startTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      sub.connect(subGain);
      subGain.connect(this.getDestination() || ctx.destination);
      sub.start(startTime);
      sub.stop(startTime + 0.45);

      // 2. High energetic power chime arpeggio (C4, G4, C5, E5, G5, C6)
      const chord = [261.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + idx * 0.04;
        const dur = 0.55;

        osc.type = idx >= 4 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + dur);

        osc.connect(gain);
        gain.connect(this.getDestination() || ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + dur + 0.05);
      });
    } catch (e) {
      console.debug('SFX GameStart error:', e);
    }
  }
}

export const sfx = new SFXManager();

