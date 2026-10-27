// Simulação simples de balanceamento: um bot que só desvia (ignora as douradas) joga o
// beatmap e reporta quantas vezes seria atingido, por trecho.
// Uso: node tools/sim-dodge.mjs [beatInicial] [beatFinal]
// Reproduz as regras de src/systems/patterns.ts e src/config/balance.ts (mantenha em sincronia).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(readFileSync(resolve(here, '../src/config/beatmap.json'), 'utf8'));

const B = {
  arena: { left: 56, right: 1224, top: 96, bottom: 616 },
  speed: 330,
  focus: 140,
  hitbox: 5,
  bulletR: 7,
  iframes: 2,
  clear: 200,
  safeSpawn: 90,
  margin: 48,
};
const SPB = 60 / map.bpm;
const DEG = Math.PI / 180;
const from = Number(process.argv[2] ?? 0);
const to = Number(process.argv[3] ?? map.lengthBeats);
// Bot "humano": só reavalia a direção a cada REACT segundos (tempo de reação).
const REACT = Number(process.argv[4] ?? 0.15);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function expand(e, px, py) {
  const p = e.params;
  const n = (k, d) => (typeof p[k] === 'number' ? p[k] : d);
  const x = n('x', 640);
  const y = n('y', 112);
  const sp = n('speed', 150);
  const aim = Math.atan2(py - y, px - x);
  const rad = (beat, a) => ({
    beat,
    x,
    y,
    vx: Math.cos(a) * sp,
    vy: Math.sin(a) * sp,
    amp: 0,
    w: 0,
  });
  const out = [];
  if (e.pattern === 'fan') {
    const c = n('count', 5);
    const s = n('spread', 60) * DEG;
    const base = p.aim === true ? aim : n('angle', 90) * DEG;
    for (let i = 0; i < c; i++)
      out.push(rad(e.beat, c === 1 ? base : base - s / 2 + (s * i) / (c - 1)));
  } else if (e.pattern === 'ring') {
    const c = n('count', 12);
    for (let i = 0; i < c; i++) out.push(rad(e.beat, n('offset', 0) * DEG + (Math.PI * 2 * i) / c));
  } else if (e.pattern === 'aimed') {
    const c = n('count', 3);
    for (let i = 0; i < c; i++)
      out.push(rad(e.beat, aim + (i - (c - 1) / 2) * n('spacing', 10) * DEG));
  } else if (e.pattern === 'wave') {
    const lane = n('lane', 360);
    const amp = n('amp', 50);
    const w = Math.PI * 2 * n('freq', 0.8);
    for (let i = 0; i < n('count', 8); i++) {
      const b = e.beat + i * n('interval', 0.25);
      if (p.side === 'top') out.push({ beat: b, x: lane, y: 72, vx: 0, vy: sp, amp, w });
      else if (p.side === 'right') out.push({ beat: b, x: 1296, y: lane, vx: -sp, vy: 0, amp, w });
      else out.push({ beat: b, x: -16, y: lane, vx: sp, vy: 0, amp, w });
    }
  } else if (e.pattern === 'spiral') {
    const shots = Math.round(n('rate', 2) * n('beats', 4));
    for (let k = 0; k < shots; k++) {
      const t = k / n('rate', 2);
      for (let a = 0; a < n('arms', 3); a++) {
        out.push(
          rad(
            e.beat + t,
            n('offset', 0) * DEG + n('turn', 45) * DEG * t + (Math.PI * 2 * a) / n('arms', 3),
          ),
        );
      }
    }
  } else if (e.pattern === 'rain') {
    const r = mulberry32(n('seed', 1));
    const c = n('count', 16);
    for (let i = 0; i < c; i++) {
      const bx = B.arena.left + r() * (B.arena.right - B.arena.left);
      const vy = n('speedMin', 150) + r() * (n('speedMax', 200) - n('speedMin', 150));
      const vx = (r() - 0.5) * 40;
      out.push({ beat: e.beat + (i * n('beats', 4)) / c, x: bx, y: 72, vx, vy, amp: 0, w: 0 });
    }
  }
  return out;
}

function pos(b, t) {
  const age = Math.max(0, t - b.born);
  const len = Math.hypot(b.vx, b.vy) || 1;
  const wave = b.amp ? b.amp * Math.sin(b.w * age) : 0;
  return [b.x + b.vx * age + (-b.vy / len) * wave, b.y + b.vy * age + (b.vx / len) * wave];
}

// Modo "chase" (padrão): como um humano, vai atrás da próxima dourada quando está seguro.
const MODE = process.argv[5] ?? 'chase';
const CHASE = MODE !== 'dodge';
// Modo "naive": só enxerga 50 ms à frente (bot de desvio ingênuo).
const HORIZONS = MODE === 'naive' ? [0.05] : [0.05, 0.12, 0.22, 0.35];
const golds = map.events.filter((e) => e.type === 'gold');
const events = map.events.filter((e) => e.type === 'bullet' && e.beat >= from - 8 && e.beat < to);
let ei = 0;
let pending = [];
let bullets = [];
let px = 640;
let py = 420;
let inv = -1;
const hits = [];
let maxAlive = 0;
let nextDecision = 0;
let best = [0, 0];
const dt = 1 / 60;
const dirs = [];
for (const s of [B.speed, B.focus]) {
  for (let i = 0; i < 8; i++)
    dirs.push([Math.cos((i * Math.PI) / 4) * s, Math.sin((i * Math.PI) / 4) * s]);
}
dirs.push([0, 0]);

for (let t = (from - 8) * SPB; t < to * SPB; t += dt) {
  const beat = t / SPB;
  while (ei < events.length && events[ei].beat <= beat) {
    pending.push(...expand(events[ei], px, py));
    ei++;
  }
  pending.sort((a, b) => a.beat - b.beat);
  while (pending.length && pending[0].beat <= beat) {
    const s = pending.shift();
    const age = t - s.beat * SPB;
    if (Math.hypot(s.x + s.vx * age - px, s.y + s.vy * age - py) < B.safeSpawn) continue;
    bullets.push({ ...s, born: s.beat * SPB });
  }
  bullets = bullets.filter((b) => {
    const [x, y] = pos(b, t);
    return !(x < -B.margin || x > 1280 + B.margin || y < 40 || y > 720 + B.margin);
  });
  maxAlive = Math.max(maxAlive, bullets.length);

  // Bot: escolhe a direção que maximiza a menor distância prevista nos próximos 0,35 s.
  if (t >= nextDecision) {
    nextDecision = t + REACT;
    let bestScore = -Infinity;
    for (const [vx, vy] of dirs) {
      let score = Infinity;
      for (const h of HORIZONS) {
        const nx = Math.min(B.arena.right, Math.max(B.arena.left, px + vx * h));
        const ny = Math.min(B.arena.bottom, Math.max(B.arena.top, py + vy * h));
        for (const b of bullets) {
          const [bx, by] = pos(b, t + h);
          const d = Math.hypot(bx - nx, by - ny) - (h < 0.15 ? 0 : 6);
          if (d < score) score = d;
        }
        const wall = Math.min(
          nx - B.arena.left,
          B.arena.right - nx,
          ny - B.arena.top,
          B.arena.bottom - ny,
        );
        score = Math.min(score, wall + 40);
      }
      const g = CHASE ? golds.find((e) => e.beat >= beat - 0.3) : null;
      const tx = g ? g.params.x : 640;
      const ty = g ? g.params.y : 380;
      const pull = g && g.beat - beat < 2.2 ? 0.25 : 0.01;
      score = Math.min(score, 60) - Math.hypot(px + vx * 0.2 - tx, py + vy * 0.2 - ty) * pull;
      if (score > bestScore) {
        bestScore = score;
        best = [vx, vy];
      }
    }
  }
  px = Math.min(B.arena.right, Math.max(B.arena.left, px + best[0] * dt));
  py = Math.min(B.arena.bottom, Math.max(B.arena.top, py + best[1] * dt));

  if (t >= inv && beat >= from) {
    const hit = bullets.some((b) => {
      const [x, y] = pos(b, t);
      return Math.hypot(x - px, y - py) <= B.hitbox + B.bulletR;
    });
    if (hit) {
      hits.push(Math.round(beat * 10) / 10);
      inv = t + B.iframes;
      bullets = bullets.filter((b) => {
        const [x, y] = pos(b, t);
        return Math.hypot(x - px, y - py) > B.clear;
      });
    }
  }
}

console.log(
  `beats ${from}–${to}: ${hits.length} dano(s) ${hits.length ? `em ${hits.join(', ')}` : ''}`,
);
console.log(`pico de balas vivas: ${maxAlive}`);
