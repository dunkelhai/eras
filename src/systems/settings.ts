/** Estado global simples (sem save). */
export const DEBUG = new URLSearchParams(window.location.search).get('debug') === '1';

export const settings = {
  /** Acessibilidade: sem tremor de tela e flashes com alpha máx. 0.3. */
  reduceFx: false,
};

export function shakeScale(): number {
  return settings.reduceFx ? 0 : 1;
}

export function flashAlpha(alpha: number): number {
  return settings.reduceFx ? Math.min(alpha, 0.25) : alpha;
}
