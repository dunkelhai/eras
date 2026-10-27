import Phaser from 'phaser';
import { ERAS, PAL } from '../style/palette';
import { music } from '../systems/music';
import { button, uiText } from '../systems/ui';
import type { GameScene, ResultData } from './GameScene';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    const era = ERAS[data.era] ?? ERAS[0];
    this.add.rectangle(640, 360, 1280, 720, PAL.black, 0.6);

    const title = uiText(
      this,
      640,
      data.win ? 230 : 260,
      data.win ? 'BIS! VITÓRIA' : 'SHOW ENCERRADO',
      64,
      { title: true, color: data.win ? PAL.str.gold : PAL.str.danger },
    );
    title.setScale(0.6);
    this.tweens.add({ targets: title, scale: 1, duration: 300, ease: 'Back.easeOut' });

    if (data.win) {
      const g = uiText(this, 640, 310, `NOTA ${data.grade}`, 48, {
        title: true,
        color: era.mainStr,
      });
      g.setScale(0.6);
      this.tweens.add({
        targets: g,
        scale: 1,
        duration: 300,
        delay: 200,
        ease: 'Back.easeOut',
      });
    } else {
      uiText(this, 640, 316, 'as luzes se apagaram antes do fim', 22, { color: PAL.str.muted });
    }

    const lines = [
      `PONTOS ${data.score.toLocaleString('pt-BR')}`,
      `PERFECT ${data.perfect} · GOOD ${data.good} · MISS ${data.miss}  (de ${data.goldTotal})`,
      `MAIOR COMBO ${data.maxCombo}`,
    ];
    lines.forEach((l, i) => uiText(this, 640, 380 + i * 40, l, i === 0 ? 28 : 22, { weight: 700 }));

    const retry = (): void => (this.scene.get('Game') as GameScene).restart();
    const menu = (): void => {
      music.stop();
      this.scene.stop('Game');
      this.scene.start('Title');
    };
    button(this, 640 - 136, 560, 'Tentar de novo', era.main, retry);
    button(this, 640 + 136, 560, 'Menu', era.secondary, menu);
    uiText(this, 640, 620, 'Espaço / R — tentar de novo · M / Esc — menu', 18, {
      color: PAL.str.muted,
    });

    const kb = this.input.keyboard!;
    kb.on('keydown-SPACE', retry);
    kb.on('keydown-R', retry);
    kb.on('keydown-M', menu);
    kb.on('keydown-ESC', menu);
  }
}
