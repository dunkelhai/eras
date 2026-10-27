/** TODAS as constantes de balanceamento do jogo ficam aqui. */

export const BALANCE = {
  // Arena onde o cursor da artista pode andar (abaixo do HUD, acima do público).
  arena: { left: 56, right: 1224, top: 96, bottom: 616 },
  playerStart: { x: 640, y: 420 },

  // Movimento (px/s). Diagonal é normalizada.
  playerSpeed: 330,
  playerFocusSpeed: 140,

  // Colisão.
  playerHitboxRadius: 5,
  playerCatchRadius: 28,
  bulletRadius: 7,

  // Vida.
  lives: 3,
  iframesMs: 2000,
  /** Ao levar dano, balas num raio em volta do jogador somem (misericórdia). */
  hitClearRadius: 200,
  /** Balas que nasceriam a menos disto do jogador não são criadas (justiça). */
  safeSpawnRadius: 90,

  // Julgamento das notas douradas (ms em relação ao beat).
  perfectWindowMs: 100,
  goodWindowMs: 200,

  // Pontuação.
  scorePerfect: 300,
  scoreGood: 100,
  /** Multiplicador por faixa de combo: a partir de `min` notas seguidas. */
  comboSteps: [
    { min: 0, mult: 1 },
    { min: 10, mult: 2 },
    { min: 25, mult: 3 },
    { min: 50, mult: 4 },
  ],
  /** Nota final por % da pontuação máxima possível (todas Perfect, combo nunca quebrado). */
  gradeS: 0.85,
  gradeA: 0.6,

  // Notas douradas: anel de aviso aparece `goldLeadBeats` antes; a estrela voa no último beat.
  goldLeadBeats: 2,
  goldFlightBeats: 1,
  goldFlightDistance: 200,

  // Balas.
  bulletPoolSize: 250,
  bulletDespawnMargin: 48,

  // Áudio / relógio.
  /** dt máximo (s) aplicado num frame — evita teleporte após travadas. */
  maxSongDt: 0.1,

  // Performance: se o fps médio ficar abaixo disto por alguns segundos, o bloom é desligado.
  bloomMinFps: 50,
} as const;

export type ComboStep = (typeof BALANCE.comboSteps)[number];
