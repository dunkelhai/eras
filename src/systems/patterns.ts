import { BALANCE } from '../config/balance';
import type { BeatEvent } from './beatmap';
import { mulberry32 } from './rng';

/** Uma bala a nascer: posição, velocidade (px/s) e onda opcional perpendicular. */
export interface BulletSpawn {
  beat: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  amp: number;
  omega: number;
}

const DEG = Math.PI / 180;
const W = 1280;

function num(p: BeatEvent['params'], key: string, fallback: number): number {
  const v = p[key];
  return typeof v === 'number' ? v : fallback;
}

function radial(
  beat: number,
  x: number,
  y: number,
  angleRad: number,
  speed: number,
): BulletSpawn {
  return {
    beat,
    x,
    y,
    vx: Math.cos(angleRad) * speed,
    vy: Math.sin(angleRad) * speed,
    amp: 0,
    omega: 0,
  };
}

/**
 * Expande um evento de bala em balas individuais (algumas no futuro, ex.: espiral e chuva).
 * `px,py` é a posição atual do jogador, usada pelos padrões mirados.
 */
export function expandPattern(e: BeatEvent, px: number, py: number): BulletSpawn[] {
  const p = e.params;
  const out: BulletSpawn[] = [];
  const x = num(p, 'x', 640);
  const y = num(p, 'y', 112);
  const speed = num(p, 'speed', 150);
  const aimAngle = Math.atan2(py - y, px - x);

  switch (e.pattern) {
    case 'fan': {
      const n = num(p, 'count', 5);
      const spread = num(p, 'spread', 60) * DEG;
      const base = p.aim === true ? aimAngle : num(p, 'angle', 90) * DEG;
      for (let i = 0; i < n; i++) {
        const a = n === 1 ? base : base - spread / 2 + (spread * i) / (n - 1);
        out.push(radial(e.beat, x, y, a, speed));
      }
      break;
    }
    case 'ring': {
      const n = num(p, 'count', 12);
      const off = num(p, 'offset', 0) * DEG;
      for (let i = 0; i < n; i++) out.push(radial(e.beat, x, y, off + (Math.PI * 2 * i) / n, speed));
      break;
    }
    case 'aimed': {
      const n = num(p, 'count', 3);
      const spacing = num(p, 'spacing', 10) * DEG;
      for (let i = 0; i < n; i++) {
        out.push(radial(e.beat, x, y, aimAngle + (i - (n - 1) / 2) * spacing, speed));
      }
      break;
    }
    case 'wave': {
      const n = num(p, 'count', 8);
      const interval = num(p, 'interval', 0.25);
      const lane = num(p, 'lane', 360);
      const amp = num(p, 'amp', 50);
      const omega = Math.PI * 2 * num(p, 'freq', 0.8);
      const side = p.side;
      for (let i = 0; i < n; i++) {
        const b = e.beat + i * interval;
        if (side === 'top') out.push({ beat: b, x: lane, y: 72, vx: 0, vy: speed, amp, omega });
        else if (side === 'right')
          out.push({ beat: b, x: W + 16, y: lane, vx: -speed, vy: 0, amp, omega });
        else out.push({ beat: b, x: -16, y: lane, vx: speed, vy: 0, amp, omega });
      }
      break;
    }
    case 'spiral': {
      const arms = num(p, 'arms', 3);
      const rate = num(p, 'rate', 2);
      const beats = num(p, 'beats', 4);
      const turn = num(p, 'turn', 45) * DEG;
      const off = num(p, 'offset', 0) * DEG;
      const shots = Math.round(rate * beats);
      for (let k = 0; k < shots; k++) {
        const t = k / rate;
        for (let a = 0; a < arms; a++) {
          out.push(radial(e.beat + t, x, y, off + turn * t + (Math.PI * 2 * a) / arms, speed));
        }
      }
      break;
    }
    case 'rain': {
      const n = num(p, 'count', 16);
      const beats = num(p, 'beats', 4);
      const smin = num(p, 'speedMin', 150);
      const smax = num(p, 'speedMax', 200);
      const rnd = mulberry32(num(p, 'seed', 1));
      const { left, right } = BALANCE.arena;
      for (let i = 0; i < n; i++) {
        const bx = left + rnd() * (right - left);
        const vy = smin + rnd() * (smax - smin);
        const vx = (rnd() - 0.5) * 40;
        out.push({ beat: e.beat + (i * beats) / n, x: bx, y: 72, vx, vy, amp: 0, omega: 0 });
      }
      break;
    }
    default:
      break;
  }
  return out;
}
