// Gera src/config/beatmap.json de forma determinística.
// Uso: node tools/gen-beatmap.mjs
// O JSON é o que o jogo lê; este script só existe para facilitar o balanceamento.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ERA_LEN = 80;
const ERAS = [0, 1, 2].map((i) => ({
  startBeat: i * ERA_LEN,
  buildBeat: i * ERA_LEN + 40,
  dropBeat: i * ERA_LEN + 48,
}));
const LENGTH = ERA_LEN * 3;

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
const rnd = mulberry32(20261027);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const round = (v) => Math.round(v);

const events = [];
const bullet = (beat, pattern, params) => events.push({ beat, type: 'bullet', pattern, params });
const fx = (beat, pattern, params = {}) => events.push({ beat, type: 'fx', pattern, params });

const L = { x: 200, y: 112 };
const C = { x: 640, y: 112 };
const R = { x: 1080, y: 112 };

// ---------- Notas douradas ----------
const goldBeats = new Set();
const addGolds = (from, to, step) => {
  for (let b = from; b < to; b += step) goldBeats.add(b);
};
// Era I
addGolds(4, 16, 2);
addGolds(16, 40, 2);
addGolds(40, 48, 1);
addGolds(48, 78, 2);
// Era II
addGolds(84, 96, 2);
addGolds(96, 120, 2);
addGolds(120, 128, 1);
addGolds(128, 158, 2);
// Era III
addGolds(164, 176, 2);
addGolds(176, 200, 2);
addGolds(200, 208, 1);
addGolds(208, 232, 2);
addGolds(232, 239, 1);

const sortedGold = [...goldBeats].sort((a, b) => a - b);
let gx = 640;
let gy = 380;
let prevBeat = 0;
for (const b of sortedGold) {
  const gap = Math.max(1, b - prevBeat);
  const maxStep = Math.min(320, 120 * gap);
  const minStep = Math.min(maxStep * 0.5, 60 * gap);
  let nx = gx;
  let ny = gy;
  for (let tries = 0; tries < 40; tries++) {
    const ang = rnd() * Math.PI * 2;
    const dist = minStep + rnd() * (maxStep - minStep);
    nx = gx + Math.cos(ang) * dist;
    ny = gy + Math.sin(ang) * dist;
    if (nx > 170 && nx < 1110 && ny > 170 && ny < 560) break;
  }
  gx = Math.min(1110, Math.max(170, nx));
  gy = Math.min(560, Math.max(170, ny));
  events.push({ beat: b, type: 'gold', pattern: 'star', params: { x: round(gx), y: round(gy) } });
  prevBeat = b;
}

// ---------- Era I — leques radiais ----------
for (let b = 4; b < 16; b += 4) {
  const e = b % 8 === 4 ? L : R;
  bullet(b, 'fan', { x: e.x, y: e.y, count: 5, spread: 50, aim: true, speed: 150 });
}
for (let b = 16; b < 40; b += 2) {
  const e = (b / 2) % 2 === 0 ? L : R;
  bullet(b, 'fan', {
    x: e.x,
    y: e.y,
    count: 7,
    spread: 80,
    aim: b % 4 === 0,
    angle: 90,
    speed: 165,
  });
}
for (let b = 40; b < 48; b++) {
  const e = pick([L, C, R]);
  bullet(b, 'aimed', { x: e.x, y: e.y, count: 3, spacing: 12, speed: 210 });
}
for (let b = 48; b < 80; b += 4) {
  bullet(b, 'ring', { x: C.x, y: 200, count: 16, speed: 140, offset: (b * 7) % 23 });
  const e = b % 8 === 0 ? L : R;
  bullet(b + 2, 'fan', { x: e.x, y: e.y, count: 7, spread: 70, aim: true, speed: 175 });
}

// ---------- Era II — ondas senoidais lentas ----------
const lanes = [190, 300, 410, 520];
for (let b = 84; b < 96; b += 4) {
  bullet(b, 'wave', {
    side: b % 8 === 4 ? 'left' : 'right',
    lane: pick(lanes),
    count: 8,
    interval: 0.25,
    speed: 120,
    amp: 50,
    freq: 0.8,
  });
}
for (let b = 96; b < 120; b += 2) {
  bullet(b, 'wave', {
    side: (b / 2) % 2 === 0 ? 'left' : 'right',
    lane: pick(lanes),
    count: 9,
    interval: 0.25,
    speed: 125,
    amp: 60,
    freq: 0.7,
  });
  if (b % 8 === 0) {
    bullet(b, 'wave', {
      side: 'top',
      lane: 260 + round(rnd() * 760),
      count: 7,
      interval: 0.25,
      speed: 110,
      amp: 70,
      freq: 0.6,
    });
  }
}
for (let b = 120; b < 128; b += 2) {
  bullet(b, 'wave', {
    side: 'left',
    lane: lanes[(b / 2) % 4],
    count: 8,
    interval: 0.25,
    speed: 140,
    amp: 45,
    freq: 0.9,
  });
  bullet(b + 1, 'wave', {
    side: 'right',
    lane: lanes[(b / 2 + 2) % 4],
    count: 8,
    interval: 0.25,
    speed: 140,
    amp: 45,
    freq: 0.9,
  });
}
for (let b = 128; b < 160; b += 2) {
  bullet(b, 'wave', {
    side: (b / 2) % 2 === 0 ? 'left' : 'right',
    lane: pick(lanes),
    count: 10,
    interval: 0.25,
    speed: 130,
    amp: 65,
    freq: 0.7,
  });
  if (b % 8 === 0) {
    const gap = round(rnd() * 3);
    for (let c = 0; c < 5; c++) {
      if (c === gap || c === gap + 1) continue;
      bullet(b, 'wave', {
        side: 'top',
        lane: 200 + c * 220,
        count: 5,
        interval: 0.25,
        speed: 115,
        amp: 40,
        freq: 0.8,
      });
    }
  }
}

// ---------- Era III — espirais e chuva densa ----------
const SP = { x: 640, y: 250 };
bullet(164, 'spiral', {
  x: SP.x,
  y: SP.y,
  arms: 2,
  rate: 2,
  beats: 8,
  turn: 40,
  speed: 120,
  offset: 0,
});
bullet(172, 'spiral', {
  x: SP.x,
  y: SP.y,
  arms: 2,
  rate: 2,
  beats: 4,
  turn: -40,
  speed: 120,
  offset: 90,
});
for (let b = 176; b < 200; b += 8) {
  bullet(b, 'rain', { count: 16, beats: 4, speedMin: 150, speedMax: 200, seed: b });
  bullet(b + 4, 'spiral', {
    x: SP.x,
    y: SP.y,
    arms: 3,
    rate: 2,
    beats: 4,
    turn: b % 16 === 0 ? 45 : -45,
    speed: 125,
    offset: b,
  });
}
for (let b = 200; b < 208; b++) {
  const e = pick([L, C, R]);
  bullet(b, 'aimed', { x: e.x, y: e.y, count: 3, spacing: 10, speed: 220 });
}
for (let b = 208; b < 232; b += 8) {
  bullet(b, 'spiral', {
    x: SP.x,
    y: SP.y,
    arms: 4,
    rate: 2,
    beats: 8,
    turn: (b / 8) % 2 === 0 ? 35 : -35,
    speed: 125,
    offset: b * 3,
  });
  bullet(b, 'rain', { count: 22, beats: 8, speedMin: 160, speedMax: 220, seed: b + 1 });
}
bullet(232, 'rain', { count: 10, beats: 6, speedMin: 140, speedMax: 180, seed: 999 });

// ---------- FX ----------
ERAS.forEach((e, i) => {
  fx(e.startBeat, 'era', { era: i });
  fx(e.buildBeat, 'build', { era: i });
  fx(e.dropBeat, 'drop', { era: i });
});
fx(LENGTH, 'end');

events.sort((a, b) => a.beat - b.beat || a.type.localeCompare(b.type));

const map = {
  bpm: 120,
  countInBeats: 4,
  lengthBeats: LENGTH,
  tailBeats: 3,
  eras: ERAS,
  events,
};

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/config/beatmap.json');
writeFileSync(out, JSON.stringify(map, null, 2) + '\n');
const golds = events.filter((e) => e.type === 'gold').length;
console.log(`beatmap: ${events.length} eventos, ${golds} notas douradas -> ${out}`);
