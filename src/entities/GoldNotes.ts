import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { PAL } from '../style/palette';
import { judge, type Judgement } from '../systems/scoring';

export interface GoldResult {
  judgement: Judgement;
  deltaMs: number;
  x: number;
  y: number;
}

interface Note {
  star: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Image;
  alive: boolean;
  /** Tempo alvo (s de música). */
  hitTime: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  /** Último instante em que o jogador encostava ANTES do beat (segura até o beat). */
  earlyTouch: number | null;
}

const POOL = 10;
/** De onde as notas "saem": a artista no palco. */
const ORIGIN = { x: 640, y: 520 };

/**
 * Notas douradas. Um anel de aviso encolhe no alvo; a estrela voa no último beat e
 * chega exatamente no beat. Encostar dentro da janela julga pela distância ao beat.
 * Se o jogador já estiver encostando antes do beat, o toque "segura" e é julgado no beat
 * (ou no instante em que ele soltar, se soltar antes).
 */
export class GoldNotes {
  private readonly notes: Note[] = [];

  constructor(scene: Phaser.Scene, depth: number) {
    for (let i = 0; i < POOL; i++) {
      const ring = scene.add
        .image(0, 0, 'ring')
        .setTint(PAL.gold)
        .setDepth(depth)
        .setVisible(false);
      const star = scene.add
        .image(0, 0, 'star')
        .setDepth(depth + 1)
        .setVisible(false);
      this.notes.push({
        star,
        ring,
        alive: false,
        hitTime: 0,
        sx: 0,
        sy: 0,
        tx: 0,
        ty: 0,
        earlyTouch: null,
      });
    }
  }

  spawn(tx: number, ty: number, hitTime: number): void {
    const n = this.notes.find((it) => !it.alive);
    if (!n) return;
    let dx = tx - ORIGIN.x;
    let dy = ty - ORIGIN.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    n.alive = true;
    n.hitTime = hitTime;
    n.tx = tx;
    n.ty = ty;
    n.sx = tx - dx * BALANCE.goldFlightDistance;
    n.sy = ty - dy * BALANCE.goldFlightDistance;
    n.earlyTouch = null;
    n.ring.setPosition(tx, ty).setVisible(true);
    n.star.setVisible(true);
  }

  clearAll(): void {
    for (const n of this.notes) this.kill(n);
  }

  update(songTime: number, spb: number, px: number, py: number): GoldResult[] {
    const results: GoldResult[] = [];
    const lead = BALANCE.goldLeadBeats * spb;
    const flight = BALANCE.goldFlightBeats * spb;
    const win = BALANCE.goodWindowMs / 1000;
    const reach = BALANCE.playerCatchRadius + 11;

    for (const n of this.notes) {
      if (!n.alive) continue;
      const toHit = n.hitTime - songTime; // > 0 antes do beat

      // Visual: anel de aviso encolhe até o tamanho da estrela no beat.
      const ringT = Phaser.Math.Clamp(1 - toHit / lead, 0, 1);
      n.ring.setScale(Phaser.Math.Linear(2.4, 0.5, ringT)).setAlpha(0.25 + ringT * 0.65);

      let x = n.tx;
      let y = n.ty;
      if (toHit > flight) {
        x = n.sx;
        y = n.sy;
        n.star.setAlpha(0.3).setScale(0.6);
      } else if (toHit > 0) {
        const f = 1 - toHit / flight;
        x = Phaser.Math.Linear(n.sx, n.tx, f);
        y = Phaser.Math.Linear(n.sy, n.ty, f);
        n.star.setAlpha(0.6 + 0.4 * f).setScale(0.6 + 0.5 * f);
      } else {
        n.star.setAlpha(1).setScale(1.1 + 0.1 * Math.sin(songTime * 20));
        n.ring.setVisible(false);
      }
      n.star.setPosition(x, y).setAngle(songTime * 180);

      // Julgamento.
      const delta = songTime - n.hitTime; // < 0 cedo, > 0 tarde
      const touching = Math.hypot(px - x, py - y) <= reach;
      if (Math.abs(delta) <= win) {
        if (touching) {
          if (delta < 0) {
            n.earlyTouch = songTime;
          } else {
            results.push(this.resolve(n, n.earlyTouch !== null ? 0 : delta));
            continue;
          }
        } else if (n.earlyTouch !== null) {
          results.push(this.resolve(n, n.earlyTouch - n.hitTime));
          continue;
        }
      }
      if (delta > win) results.push(this.resolve(n, delta, true));
    }
    return results;
  }

  private resolve(n: Note, deltaSec: number, expired = false): GoldResult {
    const deltaMs = deltaSec * 1000;
    const r: GoldResult = {
      judgement: expired ? 'miss' : judge(deltaMs),
      deltaMs,
      x: n.tx,
      y: n.ty,
    };
    this.kill(n);
    return r;
  }

  private kill(n: Note): void {
    n.alive = false;
    n.star.setVisible(false);
    n.ring.setVisible(false);
  }
}
