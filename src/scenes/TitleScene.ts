import Phaser from 'phaser';
import { ERAS, PAL } from '../style/palette';
import { music } from '../systems/music';
import { DEBUG } from '../systems/settings';
import { uiText } from '../systems/ui';

export class TitleScene extends Phaser.Scene {
  private starting = false;
  private onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'Enter') this.begin();
  };

  constructor() {
    super('Title');
  }

  create(): void {
    this.starting = false;
    const era = ERAS[0];
    this.cameras.main.setBackgroundColor(era.bg);
    this.cameras.main.fadeIn(250);

    // Fundo animado: cones de luz e brilhos.
    const cones = [260, 640, 1020].map((x, i) =>
      this.add
        .image(x, 0, 'cone')
        .setOrigin(0.5, 0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.16)
        .setTint(i % 2 === 0 ? era.main : era.secondary),
    );
    cones.forEach((c, i) =>
      this.tweens.add({
        targets: c,
        angle: { from: -22, to: 22 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 250,
      }),
    );
    this.add.particles(0, 0, 'glitter', {
      x: { min: 0, max: 1280 },
      y: { min: 0, max: 720 },
      lifespan: 2000,
      frequency: 80,
      alpha: { start: 0.9, end: 0 },
      tint: [era.main, era.secondary, ERAS[2].accent],
      blendMode: Phaser.BlendModes.ADD,
      maxAliveParticles: 40,
    });

    const title = uiText(this, 640, 220, 'ERAS', 108, { title: true, color: era.mainStr });
    title.setShadow(0, 0, era.mainStr, 24, true, true);
    this.tweens.add({
      targets: title,
      scale: 1.04,
      duration: 250,
      yoyo: true,
      repeat: -1,
      repeatDelay: 250,
      ease: 'Quad.easeOut',
    });
    uiText(this, 640, 300, 'a turnê de Nara Lume em três eras', 28, { color: era.secondaryStr });

    const press = uiText(this, 640, 430, 'pressione ESPAÇO', 32, { weight: 700 });
    this.tweens.add({ targets: press, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });

    const controls = [
      'Setas / WASD — mover (8 direções)',
      'X / Shift — foco lento (mostra a hitbox)',
      'Desvie das notas vermelhas · encoste nas douradas NO BEAT',
      'Esc — pausa · R — reiniciar',
    ];
    controls.forEach((line, i) => uiText(this, 640, 500 + i * 30, line, 21, { color: PAL.str.ui }));
    if (DEBUG) {
      uiText(this, 640, 640, 'DEBUG: F1 vitória · F2 derrota · F3 próxima era · I invencível', 18, {
        color: PAL.str.muted,
      });
    }
    uiText(this, 640, 690, 'v0.1 · arte e música geradas por código', 16).setAlpha(0.5);

    window.addEventListener('keydown', this.onKey);
    this.input.on('pointerdown', () => this.begin());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.onKey);
    });
  }

  private begin(): void {
    if (this.starting) return;
    this.starting = true;
    // Tone.start() é chamado dentro do gesto do usuário (handler nativo de keydown).
    const unlock = music.unlock();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      void unlock.finally(() => this.scene.start('Game'));
    });
  }
}
