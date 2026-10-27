/** Paleta única do jogo (STYLE_GUIDE §4). Nunca use hex solto nas cenas. */

export const PAL = {
  danger: 0xff2d55,
  dangerCore: 0xffffff,
  gold: 0xffd447,
  goldCore: 0xfff6d0,
  player: 0xffffff,
  ui: 0xf5f5ff,
  uiBg: 0x0a0614,
  black: 0x000000,
  white: 0xffffff,
  str: {
    danger: '#ff2d55',
    gold: '#ffd447',
    ui: '#f5f5ff',
    uiBg: '#0a0614',
    dark: '#0a0614',
    muted: '#a9a3c9',
  },
} as const;

export interface EraPalette {
  /** Nome inventado da era (STYLE_GUIDE §4). */
  readonly name: string;
  readonly roman: string;
  readonly bg: number;
  readonly stage: number;
  readonly main: number;
  readonly secondary: number;
  readonly crowd: number;
  readonly accent: number;
  readonly mainStr: string;
  readonly secondaryStr: string;
}

export const ERAS: readonly EraPalette[] = [
  {
    name: 'Miragem Cromada',
    roman: 'I',
    bg: 0x12002b,
    stage: 0x2a0f5c,
    main: 0xff3ec8,
    secondary: 0x21e6ff,
    crowd: 0x8a5cff,
    accent: 0xc0c0d8,
    mainStr: '#ff3ec8',
    secondaryStr: '#21e6ff',
  },
  {
    name: 'Sereno de Vagalume',
    roman: 'II',
    bg: 0x1a1410,
    stage: 0x3a2a1e,
    main: 0xe0a96d,
    secondary: 0x7fa36b,
    crowd: 0x5a4636,
    accent: 0xf3e3c3,
    mainStr: '#e0a96d',
    secondaryStr: '#7fa36b',
  },
  {
    name: 'Confete Supernova',
    roman: 'III',
    bg: 0x0b1030,
    stage: 0x2b2470,
    main: 0xff8ad8,
    secondary: 0x7df9ff,
    crowd: 0xb38cff,
    accent: 0xfff3fa,
    mainStr: '#ff8ad8',
    secondaryStr: '#7df9ff',
  },
];

export const FONT_TITLE = 'Bungee';
export const FONT_UI = 'Rajdhani';
