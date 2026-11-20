import { Language, TRANSLATIONS } from './i18n';
import { JanitorId, WingConfig } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private voicesHooked: boolean = false;
  private lastSpokenKey: string = '';
  private lastSpokenAt: number = 0;

  private ttsBuffers = new Map<string, AudioBuffer>();
  private ttsInFlight = new Map<string, Promise<AudioBuffer | null>>();
  private ttsFailedKeys = new Set<string>();
  private activeSpeechSource: AudioBufferSourceNode | null = null;
  private speechToken: number = 0;
  private prefetchedLangs = new Set<Language>();

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopSpeech();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private getOrCreateCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    const ctx = this.getOrCreateCtx();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  private hookVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!this.voicesHooked) {
      this.voicesHooked = true;
      const load = () => {
        try {
          this.cachedVoices = window.speechSynthesis.getVoices();
        } catch {
          this.cachedVoices = [];
        }
      };
      load();
      window.speechSynthesis.addEventListener?.('voiceschanged', load);
    } else if (this.cachedVoices.length === 0) {
      try {
        this.cachedVoices = window.speechSynthesis.getVoices();
      } catch {
        // ignore
      }
    }
  }

  public unlock() {
    this.ensureCtx();
    this.hookVoices();
  }

  public stopSpeech() {
    this.speechToken += 1;
    if (this.activeSpeechSource) {
      try {
        this.activeSpeechSource.stop();
        this.activeSpeechSource.disconnect();
      } catch {
        // already stopped
      }
      this.activeSpeechSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  private ttsCacheKey(text: string, lang: Language, chaser: JanitorId): string {
    return `${lang}:${chaser}:${text.trim()}`;
  }

  private async fetchTtsBuffer(
    text: string,
    lang: Language,
    chaser: JanitorId
  ): Promise<AudioBuffer | null> {
    const clean = text.trim();
    if (!clean) return null;
    const key = this.ttsCacheKey(clean, lang, chaser);

    const cached = this.ttsBuffers.get(key);
    if (cached) return cached;
    if (this.ttsFailedKeys.has(key)) return null;

    const existing = this.ttsInFlight.get(key);
    if (existing) return existing;

    const job = (async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean, lang, chaser }),
        });
        if (!res.ok) {
          if (res.status >= 400 && res.status < 500) {
            this.ttsFailedKeys.add(key);
          }
          return null;
        }
        const rawBytes = await res.arrayBuffer();
        const ctx = this.getOrCreateCtx();
        if (!ctx) return null;
        const decoded = await ctx.decodeAudioData(rawBytes);
        this.ttsBuffers.set(key, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.ttsInFlight.delete(key);
      }
    })();

    this.ttsInFlight.set(key, job);
    return job;
  }

  public prefetchLines(lang: Language) {
    if (typeof window === 'undefined' || this.prefetchedLangs.has(lang)) return;
    this.prefetchedLangs.add(lang);

    const t = TRANSLATIONS[lang];
    const queue: Array<{ text: string; chaser: JanitorId }> = [
      { text: t.cStopThere, chaser: 'GOCA' },
      { text: t.cHoldStill, chaser: 'GOCA' },
      { text: t.cTakeThis, chaser: 'GOCA' },
      { text: t.cGotcha, chaser: 'GOCA' },
      { text: t.cOuchBack, chaser: 'GOCA' },
      { text: t.cChaserTired, chaser: 'GOCA' },
    ];

    void (async () => {
      for (const item of queue) {
        await this.fetchTtsBuffer(item.text, lang, item.chaser);
      }
    })();
  }

  public prefetchWingLines(wing: WingConfig, lang: Language) {
    if (typeof window === 'undefined') return;
    const t = TRANSLATIONS[lang];
    const stages = wing.chaseStages ?? [{ chaser: wing.janitor, meters: wing.targetMeters }];
    const queue: Array<{ text: string; chaser: JanitorId }> = [];

    for (const st of stages) {
      if (st.chaser === 'GOCA') {
        queue.push(
          { text: t.cStopThere, chaser: 'GOCA' },
          { text: t.cHoldStill, chaser: 'GOCA' },
          { text: t.cTakeThis, chaser: 'GOCA' },
          { text: t.cGotcha, chaser: 'GOCA' },
          { text: t.cOuchBack, chaser: 'GOCA' }
        );
      } else if (st.chaser === 'ZIR') {
        queue.push(
          { text: t.cStopThere, chaser: 'ZIR' },
          { text: t.cHoldStillZir, chaser: 'ZIR' },
          { text: t.cTakeThis, chaser: 'ZIR' },
          { text: t.cGotchaZir, chaser: 'ZIR' },
          { text: t.cChaserTired, chaser: 'ZIR' },
          { text: t.cOuchBack, chaser: 'ZIR' }
        );
      } else if (st.chaser === 'DIREKTORKA') {
        queue.push(
          { text: t.cStopThereDir, chaser: 'DIREKTORKA' },
          { text: t.cHoldStillDir, chaser: 'DIREKTORKA' },
          { text: t.cTakeThisDir, chaser: 'DIREKTORKA' },
          { text: t.cGotchaDir, chaser: 'DIREKTORKA' },
          { text: t.cOuchBack, chaser: 'DIREKTORKA' }
        );
      }
    }

    void (async () => {
      for (const item of queue) {
        await this.fetchTtsBuffer(item.text, lang, item.chaser);
      }
    })();
  }

  private playDecodedSpeech(buf: AudioBuffer, chaser: JanitorId) {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    // Slight husky warmth boost without distorting natural Serbian pronunciation
    const body = ctx.createBiquadFilter();
    body.type = 'lowshelf';
    body.frequency.value = 340;
    body.gain.value = chaser === 'GOCA' ? 3.5 : 2.0;

    const gain = ctx.createGain();
    gain.gain.value = 1.25;

    src.connect(body);
    body.connect(gain);
    gain.connect(ctx.destination);

    src.onended = () => {
      if (this.activeSpeechSource === src) {
        this.activeSpeechSource = null;
      }
    };

    this.activeSpeechSource = src;
    src.start(0);
  }

  private pickGruffFemaleVoice(lang: Language): SpeechSynthesisVoice | null {
    this.hookVoices();
    const voices = this.cachedVoices;
    if (!voices.length) return null;

    const femaleHint = (v: SpeechSynthesisVoice) =>
      /(female|woman|žensk|jelena|milica|ivana|ana|lana|sara|maja|marija|zira|hazel|samantha|victoria|karen|susan|aria|jenny|sonia|libby|natasha|google us english|google uk english female)/i.test(
        v.name
      );
    const maleHint = (v: SpeechSynthesisVoice) =>
      /(\bmale\b|\bman\b|david|mark|george|daniel|ryan|guy|petar|marko|nikola|luka|ivan|stefan)/i.test(
        v.name
      );

    if (lang === 'sr') {
      const srVoices = voices.filter((v) => /^(sr|hr|bs|sh)/i.test(v.lang));
      const srFemale = srVoices.find((v) => femaleHint(v) || !maleHint(v));
      if (srFemale) return srFemale;
      if (srVoices.length > 0) return srVoices[0];
    }

    const enVoices = voices.filter((v) => /^en/i.test(v.lang));
    const enFemale = enVoices.find((v) => femaleHint(v)) ?? enVoices.find((v) => !maleHint(v));
    if (enFemale) return enFemale;
    if (enVoices.length > 0) return enVoices[0];

    return voices.find((v) => femaleHint(v)) ?? voices[0];
  }

  private speakFallback(clean: string, lang: Language, chaser: JanitorId) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = lang === 'sr' ? 'sr-RS' : 'en-US';
        const chosenVoice = this.pickGruffFemaleVoice(lang);
        if (chosenVoice) utterance.voice = chosenVoice;
        utterance.pitch = chaser === 'GOCA' ? 0.72 : chaser === 'DIREKTORKA' ? 0.79 : 0.84;
        utterance.rate = chaser === 'DIREKTORKA' ? 1.12 : 1.04;
        utterance.volume = 1.0;

        if (synth.speaking || synth.pending) synth.cancel();
        synth.speak(utterance);
        return;
      } catch {
        // ignore
      }
    }
    this.playGruffFallbackVoice(chaser);
  }

  // Speaks every line shown in Goca/Žir/Direktorka's speech bubble fluently via cached Gemini TTS
  public speakBubble(
    text: string | null | undefined,
    lang: Language,
    chaser: JanitorId = 'GOCA',
    force: boolean = false
  ) {
    if (this.muted || !text) return;
    const clean = text.trim();
    if (!clean) return;

    const now = performance.now();
    const key = this.ttsCacheKey(clean, lang, chaser);
    if (!force && key === this.lastSpokenKey && now - this.lastSpokenAt < 900) {
      return;
    }
    this.lastSpokenKey = key;
    this.lastSpokenAt = now;

    this.stopSpeech();
    const myToken = this.speechToken;

    const cached = this.ttsBuffers.get(key);
    if (cached) {
      this.playDecodedSpeech(cached, chaser);
      return;
    }

    void this.fetchTtsBuffer(clean, lang, chaser).then((buf) => {
      if (this.muted || myToken !== this.speechToken) return;
      if (buf) {
        this.playDecodedSpeech(buf, chaser);
      } else {
        this.speakFallback(clean, lang, chaser);
      }
    });
  }

  private playGruffFallbackVoice(chaser: JanitorId) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const baseF = chaser === 'GOCA' ? 142 : chaser === 'DIREKTORKA' ? 158 : 165;
    for (let i = 0; i < 2; i++) {
      const start = now + i * 0.14;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseF + i * 18, start);
      osc.frequency.exponentialRampToValueAtTime(baseF * 0.82, start + 0.11);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(680, start);
      filter.Q.setValueAtTime(3.8, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.13);
    }
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak: number = 0.14,
    delay: number = 0
  ) {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 256;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  public playSwipe() {
    this.playTone(260, 420, 0.08, 'sine', 0.08);
  }

  public playJump() {
    this.playTone(240, 580, 0.16, 'triangle', 0.13);
  }

  public playSlide() {
    this.playTone(360, 140, 0.15, 'sawtooth', 0.06);
  }

  public playPickup(combo: number) {
    const base = 520 + Math.min(combo, 12) * 32;
    this.playTone(base, base * 1.35, 0.11, 'sine', 0.11);
  }

  public playApple() {
    this.playTone(440, 660, 0.1, 'triangle', 0.12, 0);
    this.playTone(660, 880, 0.14, 'triangle', 0.12, 0.08);
  }

  public playSchoolBell() {
    for (let i = 0; i < 4; i++) {
      this.playTone(1180, 1140, 0.12, 'triangle', 0.14, i * 0.075);
      this.playTone(1760, 1720, 0.12, 'sine', 0.08, i * 0.075);
    }
  }

  public playLockerSlam() {
    this.playTone(150, 52, 0.14, 'square', 0.09);
  }

  public playSmash() {
    this.playTone(220, 75, 0.16, 'sawtooth', 0.14);
    this.playTone(620, 880, 0.12, 'triangle', 0.1, 0.03);
  }

  public playHit() {
    this.playTone(180, 65, 0.24, 'sawtooth', 0.16);
    this.playTone(130, 55, 0.24, 'square', 0.1, 0.04);
  }

  // Viral internet "AAAGH!" / "OOF" impact groan when slamming into a table or obstacle
  public playObstacleAgh() {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    this.playTone(155, 44, 0.14, 'triangle', 0.22, 0);
    this.playTone(95, 38, 0.16, 'square', 0.12, 0);

    const dur = 0.56;
    const glottal = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const shaper = ctx.createWaveShaper();

    glottal.type = 'sawtooth';
    glottal.frequency.setValueAtTime(215, now + 0.02);
    glottal.frequency.exponentialRampToValueAtTime(165, now + 0.16);
    glottal.frequency.exponentialRampToValueAtTime(92, now + 0.42);
    glottal.frequency.exponentialRampToValueAtTime(64, now + dur);

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(108, now + 0.02);
    subOsc.frequency.exponentialRampToValueAtTime(46, now + dur);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(30, now);
    lfoGain.gain.setValueAtTime(14, now);
    lfo.connect(lfoGain);
    lfoGain.connect(glottal.frequency);

    shaper.curve = this.makeDistortionCurve(22);

    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(790, now + 0.02);
    f1.frequency.exponentialRampToValueAtTime(460, now + dur);
    f1.Q.setValueAtTime(4.8, now);

    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1240, now + 0.02);
    f2.frequency.exponentialRampToValueAtTime(860, now + dur);
    f2.Q.setValueAtTime(5.5, now);

    const f3 = ctx.createBiquadFilter();
    f3.type = 'bandpass';
    f3.frequency.setValueAtTime(2450, now + 0.02);
    f3.Q.setValueAtTime(6.0, now);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.45, now + 0.045);
    masterGain.gain.setValueAtTime(0.4, now + 0.2);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const noiseLen = Math.floor(ctx.sampleRate * dur);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, now + 0.02);
    noiseGain.gain.linearRampToValueAtTime(0.22, now + 0.32);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    glottal.connect(shaper);
    subOsc.connect(shaper);
    noise.connect(noiseGain);
    noiseGain.connect(shaper);

    shaper.connect(f1);
    shaper.connect(f2);
    shaper.connect(f3);

    f1.connect(masterGain);
    f2.connect(masterGain);
    f3.connect(masterGain);
    masterGain.connect(ctx.destination);

    glottal.start(now + 0.015);
    subOsc.start(now + 0.015);
    lfo.start(now + 0.015);
    noise.start(now + 0.015);

    glottal.stop(now + dur + 0.02);
    subOsc.stop(now + dur + 0.02);
    lfo.stop(now + dur + 0.02);
    noise.stop(now + dur + 0.02);
  }

  public playWingClear() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.02, 0.18, 'triangle', 0.13, idx * 0.09);
    });
  }

  public playGameOver() {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 0.94, 0.22, 'sawtooth', 0.09, idx * 0.14);
    });
  }

  public playAimLock() {
    this.playTone(720, 880, 0.09, 'sine', 0.09);
  }

  public playBroomThrow() {
    this.playTone(460, 170, 0.18, 'triangle', 0.12);
  }

  public playTaunt() {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    this.playTone(540, 720, 0.09, 'triangle', 0.14, 0);
    this.playTone(680, 560, 0.09, 'triangle', 0.14, 0.09);

    const start = now + 0.16;
    const dur = 0.44;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(125, start);
    osc.frequency.exponentialRampToValueAtTime(84, start + dur);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(34, start);
    lfoGain.gain.setValueAtTime(420, start);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(920, start);
    filter.Q.setValueAtTime(4.2, start);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.24, start + 0.03);
    gain.gain.setValueAtTime(0.22, start + dur - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    lfo.start(start);
    osc.stop(start + dur + 0.02);
    lfo.stop(start + dur + 0.02);
  }
}

export const sound = new SoundEngine();
