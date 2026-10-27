import Phaser from 'phaser';
import { PAL } from '../style/palette';
import { settings } from '../systems/settings';
import { pop, uiText } from '../systems/ui';
import type { GameScene } from './GameScene';
import { music } from '../systems/music';

export class PauseScene extends Phaser.Scene {
  private fxLine!: Phaser.GameObjects.Text;

  constructor() {
    super('Pause');
  }

  create(): void {
    this.add.rectangle(640, 360, 1280, 720, PAL.black, 0.6);
    const title = uiText(this, 640, 260, 'PAUSA', 64, { title: true });
    title.setScale(0.6);
    this.tweens.add({ targets: title, scale: 1, duration: 300, ease: 'Back.easeOut' });

    uiText(this, 640, 360, 'Esc / Espaço — continuar', 28, { weight: 700 });
    this.fxLine = uiText(this, 640, 408, '', 28, { weight: 700 });
    uiText(this, 640, 456, 'R — reiniciar · M — menu', 28, { weight: 700 });
    this.refresh();

    const kb = this.input.keyboard!;
    const resume = (): void => {
      this.scene.stop();
      (this.scene.get('Game') as GameScene).resumeFromPause();
    };
    kb.on('keydown-ESC', resume);
    kb.on('keydown-SPACE', resume);
    kb.on('keydown-T', () => {
      settings.reduceFx = !settings.reduceFx;
      this.refresh();
      pop(this, this.fxLine);
    });
    kb.on('keydown-R', () => {
      (this.scene.get('Game') as GameScene).restart();
    });
    kb.on('keydown-M', () => {
      music.stop();
      this.scene.stop('Game');
      this.scene.start('Title');
    });
  }

  private refresh(): void {
    this.fxLine.setText(`T — reduzir tremor/flash: ${settings.reduceFx ? 'SIM' : 'NÃO'}`);
  }
}
