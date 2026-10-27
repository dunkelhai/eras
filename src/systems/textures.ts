import Phaser from 'phaser';
import { PAL } from '../style/palette';

/** Gera toda a arte estática uma única vez (vetorial, por código). */
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  const W = PAL.white;

  // Nota perigo: núcleo branco + halo vermelho + anel.
  g.clear();
  g.fillStyle(PAL.danger, 0.6).fillCircle(16, 16, 10);
  g.fillStyle(PAL.dangerCore, 1).fillCircle(16, 16, 6);
  g.lineStyle(2, PAL.danger, 1).strokeCircle(16, 16, 14);
  g.generateTexture('bullet', 32, 32);

  // Estrela dourada de 5 pontas (10 vértices alternando raio 11/5).
  g.clear();
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 11 : 5;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: 14 + Math.cos(a) * r, y: 14 + Math.sin(a) * r });
  }
  g.fillStyle(PAL.gold, 1).fillPoints(pts, true);
  g.lineStyle(2, PAL.goldCore, 0.9).strokePoints(pts, true);
  g.fillStyle(PAL.goldCore, 1).fillCircle(14, 14, 2.5);
  g.generateTexture('star', 28, 28);

  // Anel genérico (aviso das douradas, ondas de impacto).
  g.clear();
  g.lineStyle(3, W, 1).strokeCircle(32, 32, 29);
  g.generateTexture('ring', 64, 64);

  // Jogador: microfone/cursor branco (núcleo) + anel tingido com a cor da era.
  g.clear();
  g.fillStyle(W, 1).fillCircle(20, 14, 9);
  g.fillStyle(W, 1).fillTriangle(14, 20, 26, 20, 20, 36);
  g.generateTexture('playerCore', 40, 40);
  g.clear();
  g.lineStyle(3, W, 1).strokeCircle(24, 24, 20);
  g.generateTexture('playerRing', 48, 48);

  // Hitbox visível no modo foco.
  g.clear();
  g.fillStyle(PAL.uiBg, 1).fillCircle(8, 8, 7);
  g.fillStyle(W, 1).fillCircle(8, 8, 5);
  g.generateTexture('hitbox', 16, 16);

  // Partículas.
  g.clear();
  g.fillStyle(W, 1).fillCircle(5, 5, 5);
  g.generateTexture('spark', 10, 10);
  g.clear();
  g.fillStyle(W, 1).fillPoints(
    [
      { x: 4, y: 0 },
      { x: 8, y: 4 },
      { x: 4, y: 8 },
      { x: 0, y: 4 },
    ],
    true,
  );
  g.generateTexture('shard', 8, 8);
  g.clear();
  g.fillStyle(W, 1).fillRect(0, 0, 8, 5);
  g.generateTexture('confetti', 8, 5);
  g.clear();
  g.fillStyle(W, 1).fillRect(0, 0, 3, 3);
  g.generateTexture('glitter', 3, 3);

  // Público: cabeça (semicírculo/círculo) + ombros arredondados.
  g.clear();
  g.fillStyle(W, 1).fillCircle(20, 12, 11);
  g.fillStyle(W, 1).fillRoundedRect(2, 24, 36, 40, { tl: 16, tr: 16, bl: 0, br: 0 });
  g.generateTexture('person', 40, 64);
  g.clear();
  g.fillStyle(W, 1).fillRoundedRect(0, 0, 7, 30, 3);
  g.generateTexture('hand', 7, 30);

  // Artista (de costas): figurino + cabelo em chama, camadas separadas para tingir.
  g.clear();
  g.fillStyle(W, 1);
  g.fillPoints(
    [
      { x: 22, y: 40 },
      { x: 42, y: 40 },
      { x: 46, y: 70 },
      { x: 56, y: 112 },
      { x: 8, y: 112 },
      { x: 18, y: 70 },
    ],
    true,
  );
  g.fillRect(26, 112, 4, 8);
  g.fillRect(34, 112, 4, 8);
  // braço erguido com microfone
  g.lineStyle(5, W, 1).lineBetween(42, 44, 58, 18);
  g.lineStyle(4, W, 1).lineBetween(22, 46, 12, 74);
  g.generateTexture('artistBody', 64, 120);
  g.clear();
  g.fillStyle(W, 1);
  g.fillPoints(
    [
      { x: 32, y: 4 },
      { x: 40, y: 12 },
      { x: 46, y: 6 },
      { x: 44, y: 22 },
      { x: 50, y: 30 },
      { x: 42, y: 42 },
      { x: 22, y: 42 },
      { x: 14, y: 30 },
      { x: 20, y: 20 },
      { x: 16, y: 8 },
      { x: 26, y: 14 },
    ],
    true,
  );
  g.generateTexture('artistHair', 64, 120);

  // Piso espelhado (Era I): grade em perspectiva rumo ao ponto de fuga (640, 380).
  g.clear();
  g.lineStyle(2, W, 1);
  // A textura é posta em y = 470; o ponto de fuga (640, 380) fica 90 px acima dela.
  const vx = 640;
  const above = 90;
  for (let i = -12; i <= 12; i++) {
    const startX = vx + (i * 140 * above) / (above + 250);
    g.lineBetween(startX, 0, vx + i * 140, 250);
  }
  for (let j = 0; j < 8; j++) {
    const t = Math.pow(j / 7, 1.8);
    const y = 0 + t * 250;
    g.lineBetween(0, y, 1280, y);
  }
  g.generateTexture('mirrorGrid', 1280, 252);

  // Lâmpadas penduradas (Era II): catenárias + soquetes.
  g.clear();
  g.lineStyle(2, W, 1);
  const bulbs: { x: number; y: number }[] = [];
  const spans: [number, number, number][] = [
    [40, 640, 90],
    [640, 1240, 90],
  ];
  for (const [x0, x1, sag] of spans) {
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(x0, 20),
      new Phaser.Math.Vector2((x0 + x1) / 2, 20 + sag * 2),
      new Phaser.Math.Vector2(x1, 20),
    );
    curve.draw(g, 48);
    for (let k = 1; k <= 6; k++) {
      const p = curve.getPoint(k / 7);
      bulbs.push({ x: p.x, y: p.y + 8 });
      g.fillStyle(W, 1).fillRect(p.x - 2, p.y, 4, 6);
    }
  }
  g.generateTexture('lampWire', 1280, 220);
  scene.registry.set('bulbs', bulbs);

  // Palco (trapézio) e faixa de borda.
  g.clear();
  g.fillStyle(W, 1).fillPoints(
    [
      { x: 190, y: 0 },
      { x: 1090, y: 0 },
      { x: 1280, y: 250 },
      { x: 0, y: 250 },
    ],
    true,
  );
  g.generateTexture('stage', 1280, 250);

  g.destroy();

  // Cone de luz com degradê vertical (canvas).
  const cone = scene.textures.createCanvas('cone', 260, 720);
  if (cone) {
    const ctx = cone.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(132, 0);
    ctx.lineTo(260, 720);
    ctx.lineTo(0, 720);
    ctx.closePath();
    ctx.fill();
    cone.refresh();
  }

  // Luz radial suave (lâmpadas, halo).
  const glow = scene.textures.createCanvas('glow', 64, 64);
  if (glow) {
    const ctx = glow.getContext();
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    glow.refresh();
  }

  // Vinheta barata (textura radial, intensidade 0.35).
  const vig = scene.textures.createCanvas('vignette', 1280, 720);
  if (vig) {
    const ctx = vig.getContext();
    const grad = ctx.createRadialGradient(640, 360, 200, 640, 360, 760);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);
    vig.refresh();
  }
}
