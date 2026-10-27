import { BALANCE } from '../config/balance';

export type Judgement = 'perfect' | 'good' | 'miss';
export type Grade = 'S' | 'A' | 'B';

/** Julga um toque numa nota dourada pela distância (ms) até o beat alvo. */
export function judge(deltaMs: number): Judgement {
  const d = Math.abs(deltaMs);
  if (d <= BALANCE.perfectWindowMs) return 'perfect';
  if (d <= BALANCE.goodWindowMs) return 'good';
  return 'miss';
}

export function comboMultiplier(combo: number): number {
  let mult = 1;
  for (const step of BALANCE.comboSteps) {
    if (combo >= step.min) mult = step.mult;
  }
  return mult;
}

/** Pontos de um acerto. `comboBefore` é o combo antes desta nota. */
export function notePoints(j: Judgement, comboBefore: number): number {
  if (j === 'miss') return 0;
  const base = j === 'perfect' ? BALANCE.scorePerfect : BALANCE.scoreGood;
  return base * comboMultiplier(comboBefore);
}

/** Pontuação máxima: todas as notas Perfect com combo contínuo. */
export function maxScore(goldCount: number): number {
  let total = 0;
  for (let i = 0; i < goldCount; i++) total += notePoints('perfect', i);
  return total;
}

export function grade(score: number, goldCount: number): Grade {
  const max = maxScore(goldCount);
  const pct = max > 0 ? score / max : 1;
  if (pct >= BALANCE.gradeS) return 'S';
  if (pct >= BALANCE.gradeA) return 'A';
  return 'B';
}
