import * as Tone from 'tone';
import { BEATMAP, SECONDS_PER_BEAT } from './beatmap';

/**
 * Trilha original gerada com Tone.js (120 bpm). Tudo é sintetizado; a melodia é derivada
 * algoritmicamente de tons de acorde, sem citar música existente.
 *
 * O relógio do jogo vem daqui: `songSeconds` é o tempo AUDÍVEL desde o início do Transport
 * (Transport.seconds menos o lookAhead do contexto), então visuais e julgamento ficam no
 * mesmo tempo que o som, independente do delta de frame.
 */

const midiHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

interface EraSound {
  chords: number[][];
  roots: number[];
  bassType: 'sawtooth' | 'triangle' | 'square';
  leadType: 'square' | 'triangle' | 'sawtooth';
  leadPattern: number[];
}

const ERA_SOUNDS: EraSound[] = [
  {
    // Miragem Cromada — disco: Dm7 · Gm7 · Bbmaj7 · A7sus4
    chords: [
      [50, 53, 57, 60],
      [55, 58, 62, 65],
      [53, 57, 58, 62],
      [52, 55, 57, 62],
    ],
    roots: [38, 43, 34, 33],
    bassType: 'sawtooth',
    leadType: 'square',
    leadPattern: [0, 2, 1, 3, -1, 4, 3, 1],
  },
  {
    // Sereno de Vagalume — folk: G · Em7 · Cadd9 · D
    chords: [
      [55, 59, 62, 67],
      [52, 55, 59, 62],
      [48, 52, 55, 62],
      [50, 54, 57, 62],
    ],
    roots: [43, 40, 36, 38],
    bassType: 'triangle',
    leadType: 'triangle',
    leadPattern: [2, -1, 1, 0, 3, -1, 2, -1],
  },
  {
    // Confete Supernova — glitter-pop: E · C#m · A · B
    chords: [
      [52, 56, 59, 64],
      [49, 52, 56, 61],
      [52, 57, 61, 64],
      [54, 59, 63, 66],
    ],
    roots: [40, 37, 33, 35],
    bassType: 'square',
    leadType: 'sawtooth',
    leadPattern: [4, 3, 2, 3, 1, 2, 0, -1],
  },
];

type Section = 'intro' | 'verse' | 'build' | 'drop';

class Instruments {
  readonly kick: Tone.MembraneSynth;
  readonly snare: Tone.NoiseSynth;
  readonly hat: Tone.NoiseSynth;
  readonly openHat: Tone.NoiseSynth;
  readonly crash: Tone.NoiseSynth;
  readonly riser: Tone.NoiseSynth;
  readonly riserFilter: Tone.Filter;
  readonly bass: Tone.MonoSynth;
  readonly pad: Tone.PolySynth;
  readonly pluck: Tone.PolySynth;
  readonly lead: Tone.Synth;
  readonly bell: Tone.FMSynth;
  readonly master: Tone.Volume;

  constructor() {
    const limiter = new Tone.Limiter(-1).toDestination();
    this.master = new Tone.Volume(-6).connect(limiter);
    const reverb = new Tone.Reverb({ decay: 2.4, wet: 0.28 }).connect(this.master);
    const delay = new Tone.FeedbackDelay({ delayTime: '8n.', feedback: 0.25, wet: 0.18 }).connect(
      reverb,
    );

    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.32, sustain: 0, release: 0.05 },
      volume: -2,
    }).connect(this.master);

    const snareFilter = new Tone.Filter(1900, 'bandpass').connect(reverb);
    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0 },
      volume: -6,
    }).connect(snareFilter);

    const hatFilter = new Tone.Filter(7500, 'highpass').connect(this.master);
    this.hat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.035, sustain: 0 },
      volume: -16,
    }).connect(hatFilter);
    this.openHat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.002, decay: 0.2, sustain: 0 },
      volume: -18,
    }).connect(hatFilter);

    const crashFilter = new Tone.Filter(4200, 'highpass').connect(reverb);
    this.crash = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 1.4, sustain: 0 },
      volume: -10,
    }).connect(crashFilter);

    this.riserFilter = new Tone.Filter(300, 'lowpass').connect(reverb);
    this.riser = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 3.6, decay: 0.1, sustain: 1, release: 0.2 },
      volume: -18,
    }).connect(this.riserFilter);

    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2, type: 'lowpass', rolloff: -24 },
      filterEnvelope: {
        attack: 0.005,
        decay: 0.15,
        sustain: 0.3,
        release: 0.1,
        baseFrequency: 110,
        octaves: 3,
      },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.08 },
      volume: -9,
    }).connect(this.master);

    const padFilter = new Tone.Filter(1600, 'lowpass').connect(reverb);
    this.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 18 },
      envelope: { attack: 0.35, decay: 0.3, sustain: 0.6, release: 1.0 },
      volume: -24,
    }).connect(padFilter);
    this.pad.maxPolyphony = 8;

    this.pluck = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.002, decay: 0.45, sustain: 0.04, release: 0.4 },
      volume: -12,
    }).connect(reverb);
    this.pluck.maxPolyphony = 8;

    this.lead = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.25, release: 0.15 },
      volume: -19,
    }).connect(delay);

    this.bell = new Tone.FMSynth({
      harmonicity: 3.01,
      modulationIndex: 10,
      envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.4 },
      modulationEnvelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.2 },
      volume: -17,
    }).connect(delay);
  }

  silence(time?: number): void {
    const t = time ?? Tone.now();
    this.pad.releaseAll(t);
    this.pluck.releaseAll(t);
    this.riser.triggerRelease(t);
    this.lead.triggerRelease(t);
    this.bass.triggerRelease(t);
  }
}

function sectionOf(localBeat: number, buildAt: number, dropAt: number): Section {
  if (localBeat < 16) return 'intro';
  if (localBeat < buildAt) return 'verse';
  if (localBeat < dropAt) return 'build';
  return 'drop';
}

export class Music {
  private inst: Instruments | null = null;
  private scheduled = false;
  private lastEra = -1;
  private audioOk = false;
  // Relógio de reserva (sem áudio, ex.: navegador headless).
  private fallbackStart = 0;
  private fallbackPausedAt: number | null = null;

  /** Chamar dentro do gesto do usuário (Espaço na tela de título). */
  async unlock(): Promise<void> {
    try {
      await Tone.start();
      this.audioOk = Tone.getContext().state === 'running';
    } catch {
      this.audioOk = false;
    }
  }

  get hasAudio(): boolean {
    return this.audioOk;
  }

  private ensure(): Instruments {
    if (!this.inst) this.inst = new Instruments();
    const tr = Tone.getTransport();
    if (!this.scheduled) {
      tr.bpm.value = BEATMAP.bpm;
      tr.scheduleRepeat((time) => this.tick(time), '16n', 0);
      this.scheduled = true;
    }
    return this.inst;
  }

  start(): void {
    this.fallbackStart = performance.now();
    this.fallbackPausedAt = null;
    if (!this.audioOk) return;
    const inst = this.ensure();
    const tr = Tone.getTransport();
    tr.stop();
    inst.silence();
    inst.master.volume.value = -6;
    tr.position = 0;
    this.lastEra = -1;
    tr.start('+0.05');
  }

  /** Tempo audível (s) desde o início do Transport (inclui a contagem). */
  get songSeconds(): number {
    if (!this.audioOk) {
      const now = this.fallbackPausedAt ?? performance.now();
      return (now - this.fallbackStart) / 1000;
    }
    return Math.max(0, Tone.getTransport().seconds - Tone.getContext().lookAhead);
  }

  pause(): void {
    if (this.fallbackPausedAt === null) this.fallbackPausedAt = performance.now();
    if (!this.audioOk) return;
    Tone.getTransport().pause();
    this.inst?.silence();
  }

  resume(): void {
    if (this.fallbackPausedAt !== null) {
      this.fallbackStart += performance.now() - this.fallbackPausedAt;
      this.fallbackPausedAt = null;
    }
    if (!this.audioOk) return;
    Tone.getTransport().start('+0.02');
  }

  /** Para a música com um "desligar" descendente (derrota). */
  stop(powerDown = false): void {
    this.fallbackPausedAt = this.fallbackPausedAt ?? performance.now();
    if (!this.audioOk || !this.inst) return;
    const tr = Tone.getTransport();
    tr.stop();
    const inst = this.inst;
    inst.silence();
    if (powerDown) {
      const t = Tone.now() + 0.02;
      inst.lead.triggerAttackRelease(660, 0.7, t);
      inst.lead.frequency.exponentialRampToValueAtTime(40, t + 0.7);
      inst.kick.triggerAttackRelease(40, 0.4, t);
    }
  }

  /** Pula para um tempo de música (s, contando a contagem) — usado pelo debug. */
  seek(seconds: number): void {
    this.fallbackStart = (this.fallbackPausedAt ?? performance.now()) - seconds * 1000;
    if (!this.audioOk || !this.inst) return;
    this.inst.silence();
    Tone.getTransport().seconds = seconds;
  }

  private tick(time: number): void {
    const inst = this.inst;
    if (!inst) return;
    const tr = Tone.getTransport();
    const step = Math.round(tr.getTicksAtTime(time) / (tr.PPQ / 4));
    const s = step - BEATMAP.countInBeats * 4;
    const sub = ((s % 4) + 4) % 4;

    // Contagem: 4 batidas de baqueta.
    if (s < 0) {
      if (sub === 0) inst.hat.triggerAttackRelease('32n', time, 1);
      if (sub === 0) inst.snare.triggerAttackRelease('64n', time, 0.25);
      return;
    }
    const len = BEATMAP.lengthBeats;
    const beat = Math.floor(s / 4);
    if (beat > len) return;
    if (beat === len) {
      if (sub === 0) {
        const final = ERA_SOUNDS[2];
        inst.crash.triggerAttackRelease('2n', time);
        inst.kick.triggerAttackRelease(midiHz(28), '8n', time);
        inst.pad.triggerAttackRelease(final.chords[0].map(midiHz), '1m', time);
        inst.bass.triggerAttackRelease(midiHz(final.roots[0]), '2n', time);
      }
      return;
    }

    const eras = BEATMAP.eras;
    let era = 0;
    eras.forEach((e, i) => {
      if (beat >= e.startBeat) era = i;
    });
    const span = eras[era];
    const lb = beat - span.startBeat;
    const sec = sectionOf(lb, span.buildBeat - span.startBeat, span.dropBeat - span.startBeat);
    const bar = Math.floor(lb / 4);
    const bb = lb % 4;
    const snd = ERA_SOUNDS[era];
    const chord = snd.chords[bar % 4];
    const root = snd.roots[bar % 4];
    const eighth = bb * 2 + (sub >= 2 ? 1 : 0);
    const onEighth = sub === 0 || sub === 2;

    if (era !== this.lastEra) {
      inst.bass.oscillator.type = snd.bassType;
      inst.lead.oscillator.type = snd.leadType;
      this.lastEra = era;
    }

    // Marcos: crash no começo da era e no drop; riser durante a subida.
    if (sub === 0 && (lb === 0 || beat === span.dropBeat)) {
      inst.crash.triggerAttackRelease('2n', time);
      if (beat === span.dropBeat) {
        inst.riser.triggerRelease(time);
        inst.riserFilter.frequency.cancelScheduledValues(time);
        inst.riserFilter.frequency.setValueAtTime(300, time);
      }
    }
    if (sub === 0 && beat === span.buildBeat) {
      inst.riserFilter.frequency.cancelScheduledValues(time);
      inst.riserFilter.frequency.setValueAtTime(300, time);
      inst.riserFilter.frequency.exponentialRampToValueAtTime(
        9000,
        time + (span.dropBeat - span.buildBeat) * SECONDS_PER_BEAT,
      );
      inst.riser.triggerAttack(time);
    }

    if (era === 0) this.disco(inst, sec, bar, bb, sub, eighth, onEighth, chord, root, time);
    else if (era === 1) this.folk(inst, sec, bar, bb, sub, eighth, onEighth, chord, root, time);
    else this.glitter(inst, sec, bar, bb, sub, eighth, onEighth, chord, root, time);

    // Rufar da subida (todas as eras): colcheias e depois semicolcheias.
    if (sec === 'build') {
      const lbBuild = lb - (span.buildBeat - span.startBeat);
      const vel = 0.25 + (lbBuild / 8) * 0.6;
      if (lbBuild < 4 ? onEighth : true) inst.snare.triggerAttackRelease('32n', time, vel);
    }

    // Lead no refrão.
    if (sec === 'drop' && onEighth) {
      const idx = snd.leadPattern[eighth % 8];
      if (idx >= 0) {
        const tones = [...chord, ...chord.map((n) => n + 12)];
        inst.lead.triggerAttackRelease(midiHz(tones[idx] + 12), '8n', time, 0.8);
      }
    }
  }

  private disco(
    inst: Instruments,
    sec: Section,
    bar: number,
    bb: number,
    sub: number,
    eighth: number,
    onEighth: boolean,
    chord: number[],
    root: number,
    time: number,
  ): void {
    const full = sec === 'verse' || sec === 'drop';
    if (sub === 0 && (full || (sec === 'build' && bar < 11))) {
      inst.kick.triggerAttackRelease(midiHz(31), '8n', time);
    }
    if (full && sub === 2) inst.openHat.triggerAttackRelease('16n', time);
    if (sec === 'drop' && (sub === 1 || sub === 3)) inst.hat.triggerAttackRelease('32n', time, 0.5);
    if (sec === 'drop' && sub === 0 && (bb === 1 || bb === 3)) {
      inst.snare.triggerAttackRelease('16n', time);
    }
    if (full && onEighth) {
      const n = eighth % 2 === 0 ? root : root + 12;
      inst.bass.triggerAttackRelease(midiHz(n), '16n', time);
    }
    if (bb === 0 && sub === 0 && sec !== 'build') {
      inst.pad.triggerAttackRelease(chord.map(midiHz), '1m', time);
    }
  }

  private folk(
    inst: Instruments,
    sec: Section,
    _bar: number,
    bb: number,
    sub: number,
    eighth: number,
    onEighth: boolean,
    chord: number[],
    root: number,
    time: number,
  ): void {
    const full = sec === 'verse' || sec === 'drop';
    if (sub === 0 && full && (bb === 0 || bb === 2)) {
      inst.kick.triggerAttackRelease(midiHz(33), '8n', time, 0.8);
    }
    if (sec === 'drop' && bb === 3 && sub === 2) {
      inst.kick.triggerAttackRelease(midiHz(33), '8n', time, 0.6);
    }
    if (sec === 'drop' && sub === 0 && (bb === 1 || bb === 3)) {
      inst.snare.triggerAttackRelease('16n', time, 0.7);
    }
    if (full && onEighth) inst.hat.triggerAttackRelease('32n', time, eighth % 2 ? 0.4 : 0.8);
    if (full && sub === 0 && (bb === 0 || bb === 2)) {
      inst.bass.triggerAttackRelease(midiHz(bb === 0 ? root : root + 7), '4n', time);
    }
    // Dedilhado.
    if (onEighth && sec !== 'build') {
      const order = [0, 2, 1, 3, 2, 1, 3, 2];
      const n = chord[order[eighth % 8] % chord.length];
      inst.pluck.triggerAttackRelease(midiHz(n + 12), '8n', time, 0.7);
    }
    if (sec === 'drop' && sub === 0 && (bb === 0 || bb === 2)) {
      chord.forEach((n, i) => inst.pluck.triggerAttackRelease(midiHz(n), '4n', time + i * 0.012));
    }
  }

  private glitter(
    inst: Instruments,
    sec: Section,
    _bar: number,
    bb: number,
    sub: number,
    _eighth: number,
    onEighth: boolean,
    chord: number[],
    root: number,
    time: number,
  ): void {
    const full = sec === 'verse' || sec === 'drop';
    if (sub === 0 && (full || sec === 'build')) inst.kick.triggerAttackRelease(midiHz(30), '8n', time);
    if (sec === 'drop') inst.hat.triggerAttackRelease('32n', time, sub % 2 ? 0.45 : 0.8);
    else if (sec === 'verse' && onEighth) inst.hat.triggerAttackRelease('32n', time, 0.6);
    if (sub === 0 && bb === 3 && sec === 'verse') inst.snare.triggerAttackRelease('16n', time);
    if (sub === 0 && (bb === 1 || bb === 3) && sec === 'drop') {
      inst.snare.triggerAttackRelease('16n', time);
    }
    if (full && (sub === 0 || sub === 3)) {
      inst.bass.triggerAttackRelease(midiHz(sub === 0 ? root : root + 12), '16n', time);
    }
    // Arpejo de sinos.
    if (sec === 'intro' || sec === 'drop' || (sec === 'verse' && onEighth)) {
      const tones = [...chord, chord[0] + 12];
      const order = [0, 1, 2, 3, 4, 3, 2, 1];
      const idx = order[(bb * 4 + sub) % 8];
      inst.bell.triggerAttackRelease(midiHz(tones[idx] + 12), '16n', time, 0.6);
    }
    if (bb === 0 && sub === 0 && (sec === 'intro' || sec === 'drop')) {
      inst.pad.triggerAttackRelease(chord.map(midiHz), '1m', time);
    }
  }
}

/** Instância única: os sintetizadores são criados uma vez e reaproveitados nos reinícios. */
export const music = new Music();
