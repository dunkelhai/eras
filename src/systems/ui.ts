import Phaser from 'phaser';
import { FONT_TITLE, FONT_UI, PAL } from '../style/palette';

export function uiText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  opts: { color?: string; weight?: 600 | 700; title?: boolean } = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: opts.title ? FONT_TITLE : FONT_UI,
      fontSize: `${size}px`,
      fontStyle: opts.title ? 'normal' : String(opts.weight ?? 600),
      color: opts.color ?? PAL.str.ui,
      stroke: PAL.str.dark,
      strokeThickness: size >= 40 ? 6 : 4,
      align: 'center',
    })
    .setOrigin(0.5);
}

/** Pop de UI padrão: 1.0 → 1.1 → 1.0 em 140 ms. */
export function pop(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform): void {
  scene.tweens.add({
    targets: target,
    scale: 1.1,
    duration: 70,
    yoyo: true,
    ease: 'Quad.easeOut',
  });
}

/** Botão retangular (240×56, raio 10) clicável. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  accent: number,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(PAL.uiBg, 0.7).fillRoundedRect(-120, -28, 240, 56, 10);
  g.lineStyle(3, accent, 1).strokeRoundedRect(-120, -28, 240, 56, 10);
  const t = uiText(scene, 0, 0, label, 26, { weight: 700 });
  const c = scene.add.container(x, y, [g, t]).setSize(240, 56);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => pop(scene, c));
  c.on('pointerdown', onClick);
  return c;
}
