import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { ResultScene } from './scenes/ResultScene';
import { TitleScene } from './scenes/TitleScene';
import { PAL } from './style/palette';
import { music } from './systems/music';
import { DEBUG } from './systems/settings';

async function waitFonts(): Promise<void> {
  const loads = Promise.all([
    document.fonts.load('108px "Bungee"'),
    document.fonts.load('700 28px "Rajdhani"'),
    document.fonts.load('600 20px "Rajdhani"'),
  ]).then(() => document.fonts.ready);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 4000));
  await Promise.race([loads, timeout]);
}

async function boot(): Promise<void> {
  await waitFonts();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: PAL.str.uiBg,
    antialias: true,
    roundPixels: true,
    fps: { target: 60 },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, GameScene, PauseScene, ResultScene],
  });
  const w = window as unknown as { __game: Phaser.Game; __music?: typeof music };
  w.__game = game;
  if (DEBUG) w.__music = music;
}

void boot();
