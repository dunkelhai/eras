import Phaser from 'phaser';

class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create(): void {
    this.add.text(640, 360, 'eras', { fontFamily: 'Bungee', fontSize: '64px' }).setOrigin(0.5);
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#0a0614',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene],
});

(window as unknown as { __game: Phaser.Game }).__game = game;
