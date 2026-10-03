// Quadra de Queimada (dentro do Ginásio), procedural no estilo "papel recortado".
// - prerenderCourt: parede do fundo (janelas, faixas, banco da fila), piso de madeira, linhas,
//   meio vermelho/azul e os dois cemitérios. Desenhado uma vez.
// - drawTire / drawQBall: pneus (obstáculos no meio) e a bola (sombra encolhe quando sobe).
// - drawBoard: placar pendurado na parede (rodada, tempo, vivos por time).
// Coordenadas = as da partida (shared/queimada.js): x 0..QM.W, y 0..QM.H; a parede fica em y < 0.

import { QM, MID } from '/shared/queimada.js';
import { blob, wobblyPoly, fillStroke, roundRect, outlinedText, boilFrame, shade, INK } from './paint.js';

export const COURT = {
  MX: 70, // borda lateral desenhada além da quadra
  WALL: 230, // altura da parede do fundo (acima de y = 0)
  BOTTOM: 90, // piso na frente da quadra
  BENCH_Y: -26, // banco da fila (encostado na parede)
};

export const TEAM_COLOR = { a: '#e8412b', b: '#3a6fd8' };
const WOOD = '#e2b679';
const WOOD_DARK = '#cf9f62';
const CEM_FLOOR = '#b9b3a6';

// lugares do banco da fila (do meio para as pontas)
export function benchSpot(i) {
  const order = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5];
  return { x: MID + order[i % order.length] * 64, y: COURT.BENCH_Y };
}

export function prerenderCourt() {
  const { MX, WALL, BOTTOM } = COURT;
  const cv = document.createElement('canvas');
  cv.width = QM.W + MX * 2;
  cv.height = QM.H + WALL + BOTTOM;
  const ctx = cv.getContext('2d');
  ctx.translate(MX, WALL);
  ctx.lineJoin = 'round';

  // ---- parede do fundo: blocos pintados ----
  ctx.fillStyle = '#cfe0ea';
  ctx.fillRect(-MX, -WALL, QM.W + MX * 2, WALL);
  ctx.fillStyle = '#9fbccc';
  ctx.fillRect(-MX, -86, QM.W + MX * 2, 60); // faixa pintada (rodapé alto)
  ctx.strokeStyle = 'rgba(60,80,100,0.18)';
  ctx.lineWidth = 2;
  for (let y = -WALL + 22; y < -26; y += 22) {
    ctx.beginPath();
    ctx.moveTo(-MX, y);
    ctx.lineTo(QM.W + MX, y);
    ctx.stroke();
    const off = ((y / 22) | 0) % 2 ? 0 : 30;
    for (let x = -MX + off; x < QM.W + MX; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 22);
      ctx.stroke();
    }
  }
  // janelas altas
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 190;
    if (Math.abs(x + 45 - MID) < 160) continue; // espaço do placar
    wobblyPoly(ctx, [[x, -WALL + 30], [x + 90, -WALL + 30], [x + 90, -WALL + 92], [x, -WALL + 92]], 900 + i, 1.2);
    fillStroke(ctx, '#bfe6ff', 3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 45, -WALL + 30);
    ctx.lineTo(x + 45, -WALL + 92);
    ctx.moveTo(x, -WALL + 61);
    ctx.lineTo(x + 90, -WALL + 61);
    ctx.stroke();
    // neve no peitoril
    blob(ctx, x + 45, -WALL + 94, 50, 6, 910 + i, 0.08);
    fillStroke(ctx, '#ffffff', 2);
  }
  // bandeirinhas
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-MX, -WALL + 12);
  ctx.quadraticCurveTo(QM.W / 2, -WALL + 40, QM.W + MX, -WALL + 12);
  ctx.stroke();
  for (let i = 0; i < 26; i++) {
    const k = i / 25;
    const x = -MX + k * (QM.W + MX * 2);
    const y = -WALL + 12 + Math.sin(k * Math.PI) * 21;
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x + 9, y);
    ctx.lineTo(x, y + 16);
    ctx.closePath();
    fillStroke(ctx, i % 2 ? TEAM_COLOR.a : TEAM_COLOR.b, 1.5);
  }
  // faixas dos times nas pontas da parede
  for (const [x, team, text] of [[QM.CEM + 60, 'a', 'TIME VERMELHO'], [QM.W - QM.CEM - 260, 'b', 'TIME AZUL']]) {
    wobblyPoly(ctx, [[x, -120], [x + 200, -120], [x + 196, -94], [x + 4, -94]], x | 0, 1.2);
    fillStroke(ctx, TEAM_COLOR[team], 3);
    outlinedText(ctx, text, x + 100, -107, { size: 15, fill: '#ffffff', lw: 3 });
  }
  // cemitérios na parede: lápides pintadas
  for (const cx of [QM.CEM / 2, QM.W - QM.CEM / 2]) {
    wobblyPoly(ctx, [[cx - 30, -40], [cx - 30, -92], [cx - 20, -106], [cx + 20, -106], [cx + 30, -92], [cx + 30, -40]], cx | 0, 1.5);
    fillStroke(ctx, '#d8d4cc', 3);
    outlinedText(ctx, 'R.I.P', cx, -84, { size: 12, fill: '#6b6b6b', stroke: '#d8d4cc', lw: 1 });
    outlinedText(ctx, '💀', cx, -60, { size: 18, lw: 0 });
  }

  // ---- banco da fila (encostado na parede, no meio) ----
  roundRect(ctx, MID - 340, COURT.BENCH_Y - 26, 680, 16, 5);
  fillStroke(ctx, '#a8693e', 3);
  for (const x of [MID - 320, MID - 110, MID + 110, MID + 320]) {
    ctx.fillStyle = '#6e4426';
    ctx.fillRect(x - 5, COURT.BENCH_Y - 12, 10, 12);
    ctx.strokeRect(x - 5, COURT.BENCH_Y - 12, 10, 12);
  }
  outlinedText(ctx, 'FILA', MID - 362, COURT.BENCH_Y - 18, { size: 13, fill: '#ffe14d', lw: 3 });

  // ---- piso ----
  ctx.fillStyle = WOOD;
  ctx.fillRect(-MX, 0, QM.W + MX * 2, QM.H + BOTTOM);
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 2;
  for (let y = 0; y < QM.H + BOTTOM; y += 26) {
    ctx.beginPath();
    ctx.moveTo(-MX, y);
    ctx.lineTo(QM.W + MX, y);
    ctx.stroke();
    const off = ((y / 26) | 0) % 2 ? 40 : 0;
    for (let x = -MX + off; x < QM.W + MX; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 26);
      ctx.stroke();
    }
  }
  // meio de cada time (tinta clarinha)
  ctx.fillStyle = 'rgba(232,65,43,0.13)';
  ctx.fillRect(QM.CEM, 0, MID - QM.CEM, QM.H);
  ctx.fillStyle = 'rgba(58,111,216,0.13)';
  ctx.fillRect(MID, 0, QM.W - QM.CEM - MID, QM.H);
  // cemitérios: piso cinza com lápides
  for (const [x0, label] of [[0, 'CEMITÉRIO'], [QM.W - QM.CEM, 'CEMITÉRIO']]) {
    ctx.fillStyle = CEM_FLOOR;
    ctx.fillRect(x0, 0, QM.CEM, QM.H);
    ctx.strokeStyle = 'rgba(80,80,80,0.25)';
    for (let y = 30; y < QM.H; y += 70) {
      wobblyPoly(ctx, [[x0 + 32, y + 26], [x0 + 32, y + 6], [x0 + 38, y], [x0 + 52, y], [x0 + 58, y + 6], [x0 + 58, y + 26]], (x0 + y) | 0, 1);
      fillStroke(ctx, 'rgba(255,255,255,0.35)', 1.5, 'rgba(60,60,60,0.35)');
    }
    ctx.save();
    ctx.translate(x0 + QM.CEM / 2, QM.H / 2);
    ctx.rotate(-Math.PI / 2);
    outlinedText(ctx, `💀 ${label} 💀`, 0, 0, { size: 20, fill: 'rgba(255,255,255,0.75)', stroke: 'rgba(40,40,40,0.5)', lw: 3 });
    ctx.restore();
  }
  // linhas
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, QM.W, QM.H);
  ctx.beginPath();
  ctx.moveTo(QM.CEM, 0);
  ctx.lineTo(QM.CEM, QM.H);
  ctx.moveTo(QM.W - QM.CEM, 0);
  ctx.lineTo(QM.W - QM.CEM, QM.H);
  ctx.stroke();
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(MID, 0);
  ctx.lineTo(MID, QM.H);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(MID, QM.H / 2, 64, 46, 0, 0, Math.PI * 2);
  ctx.stroke();
  // contorno de tinta das linhas (cara de desenho)
  ctx.strokeStyle = 'rgba(27,27,27,0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-3, -3, QM.W + 6, QM.H + 6);
  // parede lateral (rodapé de borracha)
  ctx.fillStyle = '#5a6b7a';
  ctx.fillRect(-MX, -8, QM.W + MX * 2, 8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(-MX, -8, QM.W + MX * 2, 8);
  return cv;
}

export function drawTire(ctx, t, now) {
  const fr = boilFrame(now / 1000);
  ctx.fillStyle = 'rgba(30,40,60,0.22)';
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 4, t.r + 4, t.r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  // pneu deitado: anel grosso com um "furo" claro
  blob(ctx, t.x, t.y - 8, t.r + 2, t.r * 0.62 + 2, 777 + t.y, 0.04, fr);
  fillStroke(ctx, '#2b2b2b', 3);
  blob(ctx, t.x, t.y - 14, t.r, t.r * 0.6, 778 + t.y, 0.04, fr);
  fillStroke(ctx, '#3d3d3d', 2.5);
  ctx.strokeStyle = '#5a5a5a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(t.x + Math.cos(a) * t.r * 0.62, t.y - 14 + Math.sin(a) * t.r * 0.38);
    ctx.lineTo(t.x + Math.cos(a) * t.r * 0.95, t.y - 14 + Math.sin(a) * t.r * 0.58);
    ctx.stroke();
  }
  blob(ctx, t.x, t.y - 14, t.r * 0.48, t.r * 0.28, 779 + t.y, 0.06, fr);
  fillStroke(ctx, WOOD, 2.5);
}

// bola vermelha de borracha (a clássica da queimada). `team` = cor de quem arremessou (bola viva brilha)
export function drawQBall(ctx, x, y, z, now, { live = false, team = null, hover = false, ghost = 1 } = {}) {
  const R = QM.BALL_R + 2;
  const sh = Math.max(0.35, 1 - z / 180);
  ctx.save();
  ctx.globalAlpha *= ghost;
  ctx.fillStyle = 'rgba(30,40,60,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, R * sh, 4.5 * sh, 0, 0, Math.PI * 2);
  ctx.fill();
  const cy = y - R - z;
  if (live && team) {
    ctx.strokeStyle = TEAM_COLOR[team];
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, cy, R + 5 + Math.sin(now / 60) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha /= 0.55;
  }
  if (hover) {
    ctx.shadowColor = '#fff6a0';
    ctx.shadowBlur = 16;
  }
  blob(ctx, x, cy, R, R, 4242, 0.05, boilFrame(now / 1000), 14);
  fillStroke(ctx, '#e0362a', 2.5);
  ctx.shadowBlur = 0;
  // faixa branca girando conforme anda
  const rot = (x + y) * 0.05;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(x, cy, R * 0.85, R * 0.35, rot, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(x - R * 0.35, cy - R * 0.4, R * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// rastro da bola viva (velocidade)
export function drawTrail(ctx, pts, team) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    const k = i / pts.length;
    ctx.globalAlpha = k * 0.45;
    ctx.strokeStyle = team ? TEAM_COLOR[team] : '#ffffff';
    ctx.lineWidth = 2 + k * 8;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
    ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  ctx.restore();
}

// placar pendurado na parede do fundo
export function drawBoard(ctx, { round, clock, alive, phase, label }, now) {
  const w = 270;
  const x = MID - w / 2;
  const y = -COURT.WALL + 24;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 40, y - 24);
  ctx.lineTo(x + 40, y);
  ctx.moveTo(x + w - 40, y - 24);
  ctx.lineTo(x + w - 40, y);
  ctx.stroke();
  roundRect(ctx, x, y, w, 96, 12);
  fillStroke(ctx, '#2b2b2b', 4);
  roundRect(ctx, x + 8, y + 8, w - 16, 80, 8);
  fillStroke(ctx, '#151515', 0);
  const urgent = phase === 'play' && clock <= 10;
  outlinedText(ctx, label, MID, y + 22, { size: 14, fill: '#ffe14d', lw: 0 });
  outlinedText(ctx, String(clock), MID, y + 55, { size: 34, fill: urgent && Math.floor(now / 250) % 2 ? '#ff4d3a' : '#ffffff', lw: 0 });
  outlinedText(ctx, String(alive.a), x + 46, y + 55, { size: 36, fill: shade(TEAM_COLOR.a, 0.15), lw: 0 });
  outlinedText(ctx, String(alive.b), x + w - 46, y + 55, { size: 36, fill: shade(TEAM_COLOR.b, 0.2), lw: 0 });
  outlinedText(ctx, round ? `RODADA ${round}` : 'TREINO', MID, y + 80, { size: 11, fill: '#bbbbbb', lw: 0 });
  outlinedText(ctx, 'vivos', x + 46, y + 80, { size: 11, fill: '#bbbbbb', lw: 0 });
  outlinedText(ctx, 'vivos', x + w - 46, y + 80, { size: 11, fill: '#bbbbbb', lw: 0 });
}
