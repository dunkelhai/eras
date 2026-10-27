import raw from '../config/beatmap.json';
import { BALANCE } from '../config/balance';

export type EventType = 'bullet' | 'gold' | 'fx';

export interface BeatEvent {
  beat: number;
  type: EventType;
  pattern: string;
  params: Record<string, number | string | boolean>;
}

export interface EraSpan {
  startBeat: number;
  buildBeat: number;
  dropBeat: number;
}

export interface Beatmap {
  bpm: number;
  countInBeats: number;
  lengthBeats: number;
  tailBeats: number;
  eras: EraSpan[];
  events: BeatEvent[];
}

export const BEATMAP = raw as unknown as Beatmap;
export const SECONDS_PER_BEAT = 60 / BEATMAP.bpm;

export const GOLD_COUNT = BEATMAP.events.filter((e) => e.type === 'gold').length;

/** Beat em que o evento precisa ser disparado (douradas nascem antes do beat alvo). */
export function triggerBeat(e: BeatEvent): number {
  return e.type === 'gold' ? e.beat - BALANCE.goldLeadBeats : e.beat;
}

export function eraAtBeat(beat: number): number {
  let era = 0;
  BEATMAP.eras.forEach((e, i) => {
    if (beat >= e.startBeat) era = i;
  });
  return era;
}

/** Fila de eventos ordenada por beat de disparo, com cursor e busca (seek). */
export class BeatScheduler {
  private readonly queue: BeatEvent[];
  private cursor = 0;

  constructor(events: BeatEvent[]) {
    this.queue = [...events].sort((a, b) => triggerBeat(a) - triggerBeat(b));
  }

  /** Devolve todos os eventos cujo beat de disparo já passou. */
  due(beat: number): BeatEvent[] {
    const out: BeatEvent[] = [];
    while (this.cursor < this.queue.length && triggerBeat(this.queue[this.cursor]) <= beat) {
      out.push(this.queue[this.cursor]);
      this.cursor++;
    }
    return out;
  }

  seek(beat: number): void {
    this.cursor = this.queue.findIndex((e) => triggerBeat(e) >= beat);
    if (this.cursor < 0) this.cursor = this.queue.length;
  }
}
