import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import type { BulletSpawn } from '../systems/patterns';

interface BulletState {
  img: Phaser.GameObjects.Image;
  alive: boolean;
  born: number;
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  nx: number;
  ny: number;
  amp: number;
  omega: number;
}

/**
 * Pool fixo de balas. A posição é ANALÍTICA em função do tempo da música
 * (x0 + v·idade + onda), então nunca desalinha do áudio mesmo com frames irregulares.
 */
export class BulletPool {
  private readonly items: BulletState[] = [];
  private aliveCount = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    for (let i = 0; i < BALANCE.bulletPoolSize; i++) {
      const img = scene.add
        .image(-100, -100, 'bullet')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(depth)
        .setVisible(false)
        .setActive(false);
      this.items.push({
        img,
        alive: false,
        born: 0,
        x0: 0,
        y0: 0,
        vx: 0,
        vy: 0,
        nx: 0,
        ny: 0,
        amp: 0,
        omega: 0,
      });
    }
  }

  get count(): number {
    return this.aliveCount;
  }

  spawn(s: BulletSpawn, bornSeconds: number): boolean {
    const b = this.items.find((it) => !it.alive);
    if (!b) return false;
    const len = Math.hypot(s.vx, s.vy) || 1;
    b.alive = true;
    b.born = bornSeconds;
    b.x0 = s.x;
    b.y0 = s.y;
    b.vx = s.vx;
    b.vy = s.vy;
    b.nx = -s.vy / len;
    b.ny = s.vx / len;
    b.amp = s.amp;
    b.omega = s.omega;
    b.img.setActive(true).setVisible(true).setAlpha(1);
    this.aliveCount++;
    return true;
  }

  update(songTime: number): void {
    const m = BALANCE.bulletDespawnMargin;
    for (const b of this.items) {
      if (!b.alive) continue;
      const age = Math.max(0, songTime - b.born);
      const wave = b.amp !== 0 ? b.amp * Math.sin(b.omega * age) : 0;
      const x = b.x0 + b.vx * age + b.nx * wave;
      const y = b.y0 + b.vy * age + b.ny * wave;
      b.img.setPosition(x, y);
      b.img.setScale(age < 0.12 ? 0.4 + (age / 0.12) * 0.6 : 1);
      if (x < -m || x > 1280 + m || y < 40 || y > 720 + m) this.kill(b);
    }
  }

  /** Há bala encostando no círculo (x, y, r)? */
  hits(x: number, y: number, r: number): boolean {
    const rr = r + BALANCE.bulletRadius;
    const rr2 = rr * rr;
    for (const b of this.items) {
      if (!b.alive) continue;
      const dx = b.img.x - x;
      const dy = b.img.y - y;
      if (dx * dx + dy * dy <= rr2) return true;
    }
    return false;
  }

  /** Remove balas num raio; devolve as posições para efeitos. */
  clearNear(x: number, y: number, radius: number): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    const r2 = radius * radius;
    for (const b of this.items) {
      if (!b.alive) continue;
      const dx = b.img.x - x;
      const dy = b.img.y - y;
      if (dx * dx + dy * dy <= r2) {
        out.push({ x: b.img.x, y: b.img.y });
        this.kill(b);
      }
    }
    return out;
  }

  clearAll(): void {
    for (const b of this.items) if (b.alive) this.kill(b);
  }

  private kill(b: BulletState): void {
    b.alive = false;
    b.img.setVisible(false).setActive(false);
    this.aliveCount--;
  }
}
