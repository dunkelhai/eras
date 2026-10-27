import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { PAL } from '../style/palette';

interface MoveKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  x: Phaser.Input.Keyboard.Key;
  shift: Phaser.Input.Keyboard.Key;
}

/** Cursor/microfone da artista: 8 direções, modo foco lento com hitbox visível. */
export class Player {
  readonly core: Phaser.GameObjects.Image;
  readonly ring: Phaser.GameObjects.Image;
  readonly hitbox: Phaser.GameObjects.Image;
  x: number = BALANCE.playerStart.x;
  y: number = BALANCE.playerStart.y;
  focus = false;
  private readonly keys: MoveKeys;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, depth: number) {
    this.scene = scene;
    this.ring = scene.add.image(this.x, this.y, 'playerRing').setDepth(depth);
    this.core = scene.add.image(this.x, this.y, 'playerCore').setDepth(depth + 1);
    this.hitbox = scene.add.image(this.x, this.y, 'hitbox').setDepth(depth + 2).setVisible(false);
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = scene.input.keyboard!.addKeys({
      up: K.UP,
      down: K.DOWN,
      left: K.LEFT,
      right: K.RIGHT,
      w: K.W,
      a: K.A,
      s: K.S,
      d: K.D,
      x: K.X,
      shift: K.SHIFT,
    }) as MoveKeys;
  }

  private accent: number = PAL.white;

  setAccent(color: number): void {
    this.accent = color;
    this.ring.setTint(color);
  }

  update(deltaMs: number, songTime: number): void {
    const k = this.keys;
    let dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    let dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    this.focus = k.x.isDown || k.shift.isDown;
    const speed = this.focus ? BALANCE.playerFocusSpeed : BALANCE.playerSpeed;
    const dt = Math.min(deltaMs, 50) / 1000;
    const a = BALANCE.arena;
    this.x = Phaser.Math.Clamp(this.x + dx * speed * dt, a.left, a.right);
    this.y = Phaser.Math.Clamp(this.y + dy * speed * dt, a.top, a.bottom);

    this.core.setPosition(this.x, this.y);
    this.ring.setPosition(this.x, this.y).setAngle(songTime * 90);
    this.ring.setScale(this.focus ? 0.75 : 1);
    this.hitbox.setPosition(this.x, this.y).setVisible(this.focus);
  }

  /** Pisca durante os i-frames. */
  setBlink(on: boolean, songTime: number): void {
    const alpha = on ? (Math.floor(songTime * 12) % 2 === 0 ? 0.25 : 0.9) : 1;
    this.core.setAlpha(alpha);
    this.ring.setAlpha(alpha);
  }

  hitFlash(): void {
    this.core.setTintFill(PAL.danger);
    this.ring.setTintFill(PAL.white);
    this.scene.time.delayedCall(80, () => {
      this.core.clearTint();
      this.ring.setTint(this.accent);
    });
  }
}
