import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { BulletPool } from '../entities/BulletPool';
import { GoldNotes, type GoldResult } from '../entities/GoldNotes';
import { Player } from '../entities/Player';
import { Stage } from '../entities/Stage';
import { ERAS, PAL } from '../style/palette';
import {
  BEATMAP,
  BeatScheduler,
  GOLD_COUNT,
  SECONDS_PER_BEAT,
  eraAtBeat,
  type BeatEvent,
} from '../systems/beatmap';
import { music } from '../systems/music';
import { expandPattern, type BulletSpawn } from '../systems/patterns';
import { comboMultiplier, grade, notePoints } from '../systems/scoring';
import { DEBUG, flashAlpha, shakeScale } from '../systems/settings';
import { pop, uiText } from '../systems/ui';

export interface RunState {
  score: number;
  combo: number;
  maxCombo: number;
  lives: number;
  perfect: number;
  good: number;
  miss: number;
  era: number;
  beat: number;
  over: boolean;
  invincible: boolean;
}

export interface ResultData {
  win: boolean;
  score: number;
  grade: string;
  perfect: number;
  good: number;
  miss: number;
  maxCombo: number;
  goldTotal: number;
  era: number;
}

const D = {
  bullets: 25,
  golds: 20,
  player: 30,
  fx: 35,
  text: 40,
  flash: 80,
  vignette: 90,
  hud: 100,
};

export class GameScene extends Phaser.Scene {
  /** Estado da partida (exposto para o QA via `__game.scene.getScene('Game').state`). */
  state!: RunState;
  private stage!: Stage;
  private player!: Player;
  private bullets!: BulletPool;
  private golds!: GoldNotes;
  private scheduler!: BeatScheduler;
  private pending: BulletSpawn[] = [];
  private lastBeat = -999;
  private songTime = 0;
  private invulnUntil = -1;
  private lowFpsMs = 0;
  private bloomOn = false;

  private flash!: Phaser.GameObjects.Rectangle;
  private goldFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dangerFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confettiColors: number[] = [];

  private hudLives: Phaser.GameObjects.Image[] = [];
  private hudScore!: Phaser.GameObjects.Text;
  private hudCombo!: Phaser.GameObjects.Text;
  private hudEra!: Phaser.GameObjects.Text;
  private hudProgress!: Phaser.GameObjects.Rectangle;
  private hudDebug!: Phaser.GameObjects.Text;
  private countText!: Phaser.GameObjects.Text;
  private showFps = false;

  constructor() {
    super('Game');
  }

  create(): void {
    this.state = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      lives: BALANCE.lives,
      perfect: 0,
      good: 0,
      miss: 0,
      era: 0,
      beat: -BEATMAP.countInBeats,
      over: false,
      invincible: false,
    };
    this.pending = [];
    this.lastBeat = -999;
    this.songTime = -BEATMAP.countInBeats * SECONDS_PER_BEAT;
    this.invulnUntil = -1;
    this.lowFpsMs = 0;
    this.showFps = false;
    this.hudLives = [];

    this.cameras.main.fadeIn(250);
    this.stage = new Stage(this);
    this.stage.setEra(0, true);
    this.bullets = new BulletPool(this, D.bullets);
    this.golds = new GoldNotes(this, D.golds);
    this.player = new Player(this, D.player);
    this.player.setAccent(ERAS[0].secondary);
    this.scheduler = new BeatScheduler(BEATMAP.events);

    this.createFx();
    this.createHud();
    this.add.image(640, 360, 'vignette').setDepth(D.vignette);

    this.bloomOn = false;
    if (this.renderer.type === Phaser.WEBGL) {
      this.cameras.main.postFX.addBloom(PAL.white, 1, 1, 0.8, 0.55, 4);
      this.bloomOn = true;
    }

    this.bindKeys();
    music.start();
  }

  // ---------------------------------------------------------------- setup

  private createFx(): void {
    this.flash = this.add
      .rectangle(640, 360, 1280, 720, PAL.white)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(D.flash);
    this.goldFx = this.add.particles(0, 0, 'spark', {
      lifespan: { min: 250, max: 450 },
      speed: { min: 120, max: 260 },
      scale: { start: 1, end: 0 },
      tint: PAL.gold,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.goldFx.setDepth(D.fx);
    this.dangerFx = this.add.particles(0, 0, 'shard', {
      lifespan: { min: 250, max: 450 },
      speed: { min: 120, max: 260 },
      scale: { start: 1.4, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: PAL.danger,
      emitting: false,
    });
    this.dangerFx.setDepth(D.fx);
    this.confettiColors = [ERAS[0].main, ERAS[0].secondary, ERAS[0].accent];
    this.confetti = this.add.particles(0, 0, 'confetti', {
      x: { min: 0, max: 1280 },
      y: { min: 60, max: 120 },
      lifespan: 1600,
      speedX: { min: -90, max: 90 },
      speedY: { min: 60, max: 260 },
      gravityY: 160,
      rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 },
      tint: { onEmit: () => Phaser.Utils.Array.GetRandom(this.confettiColors) as number },
      emitting: false,
    });
    this.confetti.setDepth(D.fx);
  }

  private createHud(): void {
    const panel = this.add.graphics().setDepth(D.hud);
    panel.fillStyle(PAL.black, 0.45);
    panel.fillRoundedRect(32, 12, 220, 52, 12);
    panel.fillRoundedRect(1028, 12, 220, 52, 12);
    panel.fillRoundedRect(440, 8, 400, 64, 12);

    uiText(this, 92, 38, 'VIDAS', 20, { weight: 700 }).setDepth(D.hud);
    for (let i = 0; i < BALANCE.lives; i++) {
      this.hudLives.push(
        this.add
          .image(160 + i * 30, 38, 'playerCore')
          .setScale(0.6)
          .setDepth(D.hud),
      );
    }
    uiText(this, 1090, 38, 'PONTOS', 20, { weight: 700 }).setDepth(D.hud);
    this.hudScore = uiText(this, 1232, 38, '0', 28, { weight: 700 })
      .setOrigin(1, 0.5)
      .setDepth(D.hud);
    this.hudEra = uiText(this, 640, 24, '', 20, { weight: 700 }).setDepth(D.hud);
    this.hudCombo = uiText(this, 640, 50, '', 28, { weight: 700 }).setDepth(D.hud);
    this.add.rectangle(640, 68, 360, 4, PAL.ui, 0.2).setDepth(D.hud);
    this.hudProgress = this.add
      .rectangle(460, 68, 360, 4, PAL.ui, 0.9)
      .setOrigin(0, 0.5)
      .setScale(0, 1)
      .setDepth(D.hud);
    this.hudDebug = uiText(this, 48, 92, '', 16, { color: PAL.str.muted })
      .setOrigin(0, 0.5)
      .setDepth(D.hud);
    this.countText = uiText(this, 640, 300, '', 88, { title: true }).setDepth(D.text);
    this.refreshHud();
  }

  private bindKeys(): void {
    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.openPause());
    kb.on('keydown-R', () => this.restart());
    const onHidden = (): void => this.openPause();
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden);
      kb.removeAllListeners();
    });
    if (!DEBUG) return;
    kb.addCapture('F1,F2,F3,F4');
    kb.on('keydown-F1', () => this.win());
    kb.on('keydown-F2', () => this.lose());
    kb.on('keydown-F3', () => this.skipEra());
    kb.on('keydown-F4', () => {
      this.showFps = !this.showFps;
    });
    kb.on('keydown-I', () => {
      this.state.invincible = !this.state.invincible;
    });
  }

  // ---------------------------------------------------------------- loop

  update(_time: number, delta: number): void {
    if (this.state.over) return;
    const spb = SECONDS_PER_BEAT;
    const t = music.songSeconds - BEATMAP.countInBeats * spb;
    this.songTime = t;
    const beat = t / spb;
    this.state.beat = beat;

    const bi = Math.floor(beat);
    if (bi !== this.lastBeat) {
      this.lastBeat = bi;
      this.onBeat(bi);
    }

    for (const e of this.scheduler.due(beat)) this.handleEvent(e);
    while (this.pending.length > 0 && this.pending[0].beat <= beat) {
      this.spawnBullet(this.pending.shift()!, t);
    }

    this.player.update(delta, t);
    this.stage.update(beat);
    this.bullets.update(t);

    for (const r of this.golds.update(t, spb, this.player.x, this.player.y)) this.onGold(r);

    const blinking = t < this.invulnUntil;
    this.player.setBlink(blinking, t);
    if (
      !blinking &&
      !this.state.invincible &&
      t >= 0 &&
      this.bullets.hits(this.player.x, this.player.y, BALANCE.playerHitboxRadius)
    ) {
      this.damage();
      if (this.state.over) return;
    }

    if (beat >= BEATMAP.lengthBeats + BEATMAP.tailBeats) {
      this.win();
      return;
    }

    this.hudProgress.setScale(Phaser.Math.Clamp(beat / BEATMAP.lengthBeats, 0, 1), 1);
    this.checkPerf(delta);
    if (DEBUG) {
      const tags = [];
      if (this.state.invincible) tags.push('INVENCÍVEL');
      if (this.showFps) tags.push(`${Math.round(this.game.loop.actualFps)} fps`);
      tags.push(`beat ${Math.floor(beat)} · balas ${this.bullets.count}`);
      const s = tags.join(' · ');
      if (this.hudDebug.text !== s) this.hudDebug.setText(s);
    }
  }

  private onBeat(bi: number): void {
    if (bi < 0) {
      this.countText.setText(String(-bi)).setAlpha(1).setScale(1.3);
      this.tweens.add({ targets: this.countText, scale: 1, duration: 200, ease: 'Back.easeOut' });
      return;
    }
    if (bi === 0) {
      this.countText.setText('VAI!');
      this.tweens.add({ targets: this.countText, alpha: 0, scale: 1.4, duration: 500 });
    }
    this.stage.onBeat(bi);
  }

  private handleEvent(e: BeatEvent): void {
    if (e.type === 'gold') {
      const x = Number(e.params.x);
      const y = Number(e.params.y);
      this.golds.spawn(x, y, e.beat * SECONDS_PER_BEAT);
      return;
    }
    if (e.type === 'bullet') {
      const spawns = expandPattern(e, this.player.x, this.player.y);
      this.pending.push(...spawns);
      this.pending.sort((a, b) => a.beat - b.beat);
      return;
    }
    switch (e.pattern) {
      case 'era':
        this.changeEra(Number(e.params.era));
        break;
      case 'build':
        this.stage.setSection(false, true);
        break;
      case 'drop':
        this.stage.setSection(true, false);
        this.dropFx();
        break;
      default:
        break;
    }
  }

  private spawnBullet(s: BulletSpawn, t: number): void {
    // Posição atual (com compensação de atraso) para checar a distância segura.
    const age = Math.max(0, t - s.beat * SECONDS_PER_BEAT);
    const x = s.x + s.vx * age;
    const y = s.y + s.vy * age;
    if (Math.hypot(x - this.player.x, y - this.player.y) < BALANCE.safeSpawnRadius) return;
    this.bullets.spawn(s, s.beat * SECONDS_PER_BEAT);
  }

  // ---------------------------------------------------------------- gameplay

  private onGold(r: GoldResult): void {
    const st = this.state;
    if (r.judgement === 'miss') {
      st.miss++;
      if (st.combo > 0) this.shakeCombo();
      st.combo = 0;
      this.judgeText(r.x, r.y, 'MISS', PAL.str.muted, '');
    } else {
      const pts = notePoints(r.judgement, st.combo);
      st.score += pts;
      st.combo++;
      st.maxCombo = Math.max(st.maxCombo, st.combo);
      if (r.judgement === 'perfect') st.perfect++;
      else st.good++;
      this.goldFx.explode(10, r.x, r.y);
      const label = r.judgement === 'perfect' ? 'PERFECT' : 'GOOD';
      const color = r.judgement === 'perfect' ? PAL.str.gold : PAL.str.ui;
      this.judgeText(r.x, r.y, label, color, `+${pts}`);
      if (r.judgement === 'perfect') this.cameras.main.shake(90, 0.003 * shakeScale());
      pop(this, this.hudScore);
      pop(this, this.hudCombo);
    }
    this.refreshHud();
  }

  private judgeText(x: number, y: number, label: string, color: string, pts: string): void {
    const t = uiText(this, x, y - 34, label, 28, { weight: 700, color }).setDepth(D.text);
    t.setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t,
      y: y - 74,
      alpha: 0,
      delay: 160,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
    if (pts) {
      const p = uiText(this, x, y - 6, pts, 20, { weight: 700, color: PAL.str.gold }).setDepth(
        D.text,
      );
      this.tweens.add({
        targets: p,
        y: y - 46,
        alpha: 0,
        duration: 600,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private damage(): void {
    const st = this.state;
    st.lives--;
    this.invulnUntil = this.songTime + BALANCE.iframesMs / 1000;
    this.cameras.main.shake(180, 0.007 * shakeScale());
    this.player.hitFlash();
    this.dangerFx.explode(12, this.player.x, this.player.y);
    this.bullets.clearNear(this.player.x, this.player.y, BALANCE.hitClearRadius);
    if (st.combo > 0) this.shakeCombo();
    st.combo = 0;
    this.refreshHud();
    const icon = this.hudLives[st.lives];
    if (icon) {
      this.tweens.add({
        targets: icon,
        scale: 1.2,
        alpha: 0.15,
        duration: 200,
        ease: 'Quad.easeOut',
      });
    }
    if (st.lives <= 0) this.lose();
  }

  private shakeCombo(): void {
    const c = this.hudCombo;
    this.tweens.add({
      targets: c,
      x: { from: 637, to: 643 },
      duration: 40,
      yoyo: true,
      repeat: 3,
      onComplete: () => c.setX(640),
    });
  }

  private changeEra(index: number): void {
    const st = this.state;
    st.era = index;
    const era = ERAS[index];
    if (index !== this.stage.currentEra) this.stage.setEra(index);
    this.player.setAccent(era.secondary);
    this.confettiColors = [era.main, era.secondary, era.accent];
    if (this.lastBeat > 0) {
      this.screenFlash(0.6);
      this.confetti.explode(40);
    }
    this.refreshHud();

    const banner = uiText(this, 640, 280, `ERA ${era.roman}`, 64, {
      title: true,
      color: era.mainStr,
    }).setDepth(D.text);
    const name = uiText(this, 640, 336, era.name, 32, {
      weight: 700,
      color: era.secondaryStr,
    }).setDepth(D.text);
    for (const t of [banner, name]) {
      t.setAlpha(0).setScale(0.6);
      this.tweens.add({ targets: t, alpha: 0.9, scale: 1, duration: 300, ease: 'Back.easeOut' });
      this.tweens.add({
        targets: t,
        alpha: 0,
        delay: 1500,
        duration: 500,
        onComplete: () => t.destroy(),
      });
    }
  }

  private dropFx(): void {
    this.screenFlash(0.7);
    this.cameras.main.shake(150, 0.006 * shakeScale());
    this.confetti.explode(60);
  }

  private screenFlash(alpha: number): void {
    this.flash.setAlpha(flashAlpha(alpha));
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 180 });
  }

  private refreshHud(): void {
    const st = this.state;
    const era = ERAS[st.era];
    const eraLabel = `ERA ${era.roman} · ${era.name.toUpperCase()}`;
    if (this.hudEra.text !== eraLabel) this.hudEra.setText(eraLabel).setColor(era.mainStr);
    const combo = `COMBO ${st.combo}  ×${comboMultiplier(st.combo)}`;
    if (this.hudCombo.text !== combo) this.hudCombo.setText(combo);
    const score = st.score.toLocaleString('pt-BR');
    if (this.hudScore.text !== score) this.hudScore.setText(score);
    this.hudLives.forEach((img, i) => {
      if (i < st.lives) img.setAlpha(1).setScale(0.6);
    });
  }

  private checkPerf(delta: number): void {
    if (!this.bloomOn) return;
    if (this.game.loop.actualFps < BALANCE.bloomMinFps) this.lowFpsMs += delta;
    else this.lowFpsMs = 0;
    if (this.lowFpsMs > 3000) {
      // Plano B do guia: sem bloom de câmera, glow só no jogador.
      this.cameras.main.postFX.clear();
      this.player.core.preFX?.addGlow(PAL.white, 4, 0);
      this.bloomOn = false;
    }
  }

  // ---------------------------------------------------------------- flow

  private resumedAt = 0;

  private openPause(): void {
    if (this.state.over || !this.scene.isActive()) return;
    if (performance.now() - this.resumedAt < 250) return;
    music.pause();
    this.scene.launch('Pause');
    this.scene.pause();
  }

  resumeFromPause(): void {
    this.resumedAt = performance.now();
    this.scene.resume();
    music.resume();
  }

  restart(): void {
    music.stop();
    this.scene.stop('Pause');
    this.scene.stop('Result');
    this.scene.restart();
  }

  private skipEra(): void {
    if (this.state.over) return;
    const cur = eraAtBeat(Math.max(0, this.state.beat));
    const next =
      cur + 1 < BEATMAP.eras.length ? BEATMAP.eras[cur + 1].startBeat : BEATMAP.lengthBeats - 8;
    music.seek((next + BEATMAP.countInBeats) * SECONDS_PER_BEAT);
    this.scheduler.seek(next);
    this.pending = [];
    this.bullets.clearAll();
    this.golds.clearAll();
    this.countText.setAlpha(0);
    this.lastBeat = next - 1;
  }

  private finish(win: boolean): void {
    const st = this.state;
    if (st.over) return;
    st.over = true;
    const data: ResultData = {
      win,
      score: st.score,
      grade: grade(st.score, GOLD_COUNT),
      perfect: st.perfect,
      good: st.good,
      miss: st.miss,
      maxCombo: st.maxCombo,
      goldTotal: GOLD_COUNT,
      era: st.era,
    };
    this.time.delayedCall(win ? 300 : 700, () => {
      this.scene.launch('Result', data);
      this.scene.pause();
    });
  }

  private win(): void {
    if (this.state.over) return;
    if (this.state.beat < BEATMAP.lengthBeats) music.stop();
    this.screenFlash(0.5);
    this.confetti.explode(60);
    this.finish(true);
  }

  private lose(): void {
    if (this.state.over) return;
    music.stop(true);
    this.cameras.main.shake(180, 0.007 * shakeScale());
    this.finish(false);
  }
}
