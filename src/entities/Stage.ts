import Phaser from 'phaser';
import { ERAS, type EraPalette } from '../style/palette';
import { lerpColor } from '../systems/color';

type PalKey = 'bg' | 'stage' | 'main' | 'secondary' | 'crowd' | 'accent';

interface Person {
  img: Phaser.GameObjects.Image;
  hand: Phaser.GameObjects.Image | null;
  baseScale: number;
  row: number;
  idx: number;
}

/**
 * Cenário do palco: fundo, piso, luzes girando, decoração por era, artista e público.
 * Toda a arte é textura gerada; aqui só se aplicam tints (com fade entre eras).
 */
export class Stage {
  private readonly scene: Phaser.Scene;
  private readonly floor: Phaser.GameObjects.Image;
  private readonly edge: Phaser.GameObjects.Rectangle;
  private readonly mirror: Phaser.GameObjects.Image;
  private readonly wire: Phaser.GameObjects.Image;
  private readonly bulbs: Phaser.GameObjects.Image[] = [];
  private readonly cones: Phaser.GameObjects.Image[] = [];
  private readonly people: Person[] = [];
  private readonly artistBody: Phaser.GameObjects.Image;
  private readonly artistHair: Phaser.GameObjects.Image;
  private readonly glitter: Phaser.GameObjects.Particles.ParticleEmitter;

  private from: EraPalette = ERAS[0];
  private to: EraPalette = ERAS[0];
  private fade = 1;
  private era = 0;
  private handsUp = false;
  private fast = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.floor = scene.add.image(640, 470, 'stage').setOrigin(0.5, 0).setDepth(1);
    this.edge = scene.add.rectangle(640, 471, 900, 3, 0xffffff).setDepth(2);
    this.mirror = scene.add
      .image(640, 470, 'mirrorGrid')
      .setOrigin(0.5, 0)
      .setDepth(2)
      .setAlpha(0.25);
    this.wire = scene.add.image(640, 72, 'lampWire').setOrigin(0.5, 0).setDepth(3).setAlpha(0);
    const bulbPos = (scene.registry.get('bulbs') as { x: number; y: number }[]) ?? [];
    for (const b of bulbPos) {
      this.bulbs.push(
        scene.add
          .image(b.x, b.y + 72, 'glow')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(3)
          .setScale(0.7)
          .setAlpha(0),
      );
    }

    const coneX = [200, 520, 760, 1080];
    coneX.forEach((x) => {
      this.cones.push(
        scene.add
          .image(x, 0, 'cone')
          .setOrigin(0.5, 0)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.18)
          .setDepth(4),
      );
    });

    this.artistBody = scene.add.image(640, 600, 'artistBody').setOrigin(0.5, 1).setDepth(6);
    this.artistHair = scene.add.image(640, 600, 'artistHair').setOrigin(0.5, 1).setDepth(7);

    // Público: 2 fileiras de silhuetas.
    const rows = [
      { y: 676, count: 22, scale: 1.0, depth: 8 },
      { y: 724, count: 18, scale: 1.3, depth: 9 },
    ];
    rows.forEach((r, ri) => {
      const step = 1320 / r.count;
      for (let i = 0; i < r.count; i++) {
        const x = -20 + step * i + (ri === 1 ? step / 2 : 0) + Phaser.Math.Between(-6, 6);
        const s = r.scale * Phaser.Math.FloatBetween(0.9, 1.1);
        const img = scene.add.image(x, r.y, 'person').setOrigin(0.5, 1).setScale(s).setDepth(r.depth);
        let hand: Phaser.GameObjects.Image | null = null;
        if (i % 3 === ri) {
          hand = scene.add
            .image(x + (i % 2 ? 14 : -14) * s, r.y - 52 * s, 'hand')
            .setOrigin(0.5, 1)
            .setScale(s)
            .setAngle(i % 2 ? 12 : -12)
            .setDepth(r.depth - 0.5)
            .setVisible(false);
        }
        this.people.push({ img, hand, baseScale: s, row: ri, idx: i });
      }
    });

    this.glitter = scene.add.particles(0, 0, 'glitter', {
      x: { min: 0, max: 1280 },
      y: { min: 80, max: 600 },
      lifespan: 1800,
      frequency: 60,
      quantity: 1,
      alpha: {
        onUpdate: (_p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) =>
          Math.sin(t * Math.PI) * (0.4 + 0.6 * Math.abs(Math.sin(t * 18))),
      },
      scale: { min: 0.7, max: 1.2 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      maxAliveParticles: 60,
    });
    this.glitter.setDepth(5);

    this.applyColors();
  }

  get currentEra(): number {
    return this.era;
  }

  /** Muda a era; `instant` pula o fade de 600 ms. */
  setEra(index: number, instant = false): void {
    const cur = this.colorsNow();
    this.from = { ...ERAS[this.era], ...cur };
    this.to = ERAS[index];
    this.era = index;
    this.fade = 0;
    if (instant) {
      this.fade = 1;
      this.applyColors();
    } else {
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 600,
        onUpdate: (tw) => {
          this.fade = tw.getValue() ?? 1;
          this.applyColors();
        },
      });
    }
    if (index === 2) this.glitter.start();
    else this.glitter.stop();
    this.handsUp = false;
  }

  setSection(drop: boolean, build: boolean): void {
    this.handsUp = drop;
    this.fast = build;
    for (const p of this.people) p.hand?.setVisible(drop);
  }

  /** Chamado a cada batida (vem do relógio de áudio). */
  onBeat(beat: number): void {
    this.people.forEach((p) => {
      this.scene.tweens.add({
        targets: p.img,
        scaleY: p.baseScale * 1.08,
        duration: 70,
        delay: p.idx * 10,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
      if (p.hand && this.handsUp) {
        this.scene.tweens.add({
          targets: p.hand,
          y: p.hand.y - 8,
          duration: 90,
          delay: p.idx * 10,
          yoyo: true,
        });
      }
    });
    this.scene.tweens.add({
      targets: [this.artistBody, this.artistHair],
      scaleY: 1.04,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    if (this.era === 1) {
      this.bulbs.forEach((b, i) => {
        if ((i + beat) % 2 === 0) b.setScale(0.9);
      });
    }
  }

  update(songBeat: number): void {
    const speed = this.fast ? 2 : 1;
    this.cones.forEach((c, i) => {
      const phase = i * 0.9;
      c.setAngle(25 * Math.sin((Math.PI * songBeat * speed) / 2 + phase));
    });
    for (const b of this.bulbs) b.setScale(Math.max(0.7, b.scale - 0.01));
  }

  colorsNow(): Record<PalKey, number> {
    const t = this.fade;
    const keys: PalKey[] = ['bg', 'stage', 'main', 'secondary', 'crowd', 'accent'];
    const out = {} as Record<PalKey, number>;
    for (const k of keys) out[k] = lerpColor(this.from[k], this.to[k], t);
    return out;
  }

  private applyColors(): void {
    const c = this.colorsNow();
    this.scene.cameras.main.setBackgroundColor(c.bg);
    this.floor.setTint(c.stage);
    this.edge.setFillStyle(c.secondary, 0.8);
    this.mirror.setTint(c.accent);
    this.wire.setTint(c.accent);
    this.cones.forEach((cone, i) => cone.setTint(i % 2 === 0 ? c.main : c.secondary));
    const back = lerpColor(c.crowd, c.bg, 0.45);
    for (const p of this.people) {
      const col = p.row === 0 ? back : c.crowd;
      p.img.setTint(col);
      p.hand?.setTint(col);
    }
    this.artistBody.setTint(c.main);
    this.artistHair.setTint(c.accent);
    for (const b of this.bulbs) b.setTint(c.main);
    this.glitter.setParticleTint(c.accent);

    // Decoração exclusiva de cada era (crossfade).
    const w = (i: number): number =>
      (this.from === ERAS[i] || this.from.name === ERAS[i].name ? 1 - this.fade : 0) +
      (this.to === ERAS[i] ? this.fade : 0);
    this.mirror.setAlpha(0.25 * Math.min(1, w(0)));
    this.wire.setAlpha(0.6 * Math.min(1, w(1)));
    for (const b of this.bulbs) b.setAlpha(0.55 * Math.min(1, w(1)));
  }
}
