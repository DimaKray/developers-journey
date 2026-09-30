// Web Audio API procedural sound synthesis for comic effects
// Zero external files needed, instant playback, customizable frequencies & dynamics.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private muted: boolean = false;
  private initialized: boolean = false;
  private listeners: Set<(muted: boolean) => void> = new Set();
  private lastTypeTime: number = 0;
  private lastPageTurn: number = 0;

  private userInteracted: boolean = false;

  constructor() {
    try {
      const saved = localStorage.getItem('comic_sound_muted');
      if (saved !== null) this.muted = saved === 'true';
    } catch {
      // Storage can be blocked (privacy modes): just keep the default.
    }
  }

  private initCtx() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime);

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch {
      // Web Audio fallback
    }
  }

  /**
   * Call ONLY from a real user gesture (click, key, touchend). Browsers refuse to start an AudioContext otherwise
   * and print "The AudioContext was not allowed to start" on every attempt. `wheel` / `touchstart` do not count as gestures.
   */
  public unlock() {
    const ua = (navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (ua && !ua.hasBeenActive) return; // no gesture yet: do not touch the AudioContext
    this.userInteracted = true;
    this.initCtx();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.unlock();
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime, 0.05);
    }
    try {
      localStorage.setItem('comic_sound_muted', String(this.muted));
    } catch {
      // ignore: the preference just won't persist
    }
    this.listeners.forEach((fn) => fn(this.muted));
    if (!this.muted) {
      this.playPop();
    }
    return this.muted;
  }

  public subscribe(fn: (muted: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private canPlay(): boolean {
    // The context is created and resumed in unlock() only (inside a user gesture). Here we just check, never start it.
    if (this.muted || !this.userInteracted || !this.ctx || !this.compressor) return false;
    return this.ctx.state === 'running';
  }

  // --- SOUND EFFECTS ---

  /** Book opening whoosh / rustle */
  public playBookOpen() {
    if (!this.canPlay() || !this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.2);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    filter.Q.setValueAtTime(1.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);

    noise.start(now);
  }

  /** Page swipe transition */
  public playPageTurn() {
    const time = Date.now();
    if (time - this.lastPageTurn < 250) return;
    this.lastPageTurn = time;

    if (!this.canPlay() || !this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.22);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /** Mechanical keyboard click for typing terminal */
  public playTyping() {
    const time = Date.now();
    if (time - this.lastTypeTime < 55) return;
    this.lastTypeTime = time;

    if (!this.canPlay() || !this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = 1200 + Math.random() * 800;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  /** Error glitch / buzzer for TS Error */
  public playErrorGlitch() {
    if (!this.canPlay() || !this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(160, now);
    osc2.frequency.setValueAtTime(168, now);
    osc1.frequency.linearRampToValueAtTime(80, now + 0.28);
    osc2.frequency.linearRampToValueAtTime(84, now + 0.28);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.compressor);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  /** Impact crack / thud ("ТРЕСЬ!") */
  public playThud() {
    if (!this.canPlay() || !this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.3);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /** Radiant crystal shimmer / divine arpeggio for magical sword ("ЕВРИКА!") */
  public playSwordChime() {
    if (!this.canPlay() || !this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.compressor) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      const noteStart = now + idx * 0.05;
      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.7);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(noteStart);
      osc.stop(noteStart + 0.75);
    });
  }

  /** Skill power-up ping on staircase steps */
  public playSkillPing(stepIndex: number = 0) {
    if (!this.canPlay() || !this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;

    const scale = [440, 493.88, 554.37, 587.33, 659.25, 739.99, 880];
    const baseFreq = scale[stepIndex % scale.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /** Monster growl & electric storm */
  public playMonsterGrowl() {
    if (!this.canPlay() || !this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.4);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  /** Sword Slash impact ("БУМ!") */
  public playSwordSlash() {
    if (!this.canPlay() || !this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(now);
    osc.stop(now + 0.22);

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(180, now + 0.05);
    sub.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    subGain.gain.setValueAtTime(0.4, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    sub.connect(subGain);
    subGain.connect(this.compressor);

    sub.start(now + 0.05);
    sub.stop(now + 0.38);
  }

  /** Summit triumphant chord */
  public playSummitFanfare() {
    if (!this.canPlay() || !this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;

    const chord = [261.63, 329.63, 392.0, 523.25, 587.33, 659.25, 783.99];
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.compressor) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const t = now + idx * 0.08;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(t);
      osc.stop(t + 1.25);
    });
  }

  /** UI click/hover pop */
  public playPop() {
    if (!this.canPlay() || !this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(now);
    osc.stop(now + 0.065);
  }
}

export const sound = new SoundEngine();
