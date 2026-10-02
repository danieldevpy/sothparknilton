// Cenário do Dojo (arena do Karatê), desenhado proceduralmente uma vez num canvas
// fora da tela. Coordenadas da arena: tatame de (0,0) a (KT.ARENA_W, KT.ARENA_H);
// a parede fica acima (y < 0), o assoalho de madeira em volta.

import { KT } from '/shared/karate.js';
import { blob, fillStroke, wobblyPoly, roundRect, outlinedText, rng, shade, INK } from './paint.js';

export const DOJO = { MX: 220, WALL: 330, BOTTOM: 170 };
export const SENSEI = { x: -120, y: 30 };
export const GONG = { x: KT.ARENA_W + 120, y: -10 };

export function prerenderDojo() {
  const W = KT.ARENA_W;
  const H = KT.ARENA_H;
  const { MX, WALL, BOTTOM } = DOJO;
  const c = document.createElement('canvas');
  c.width = W + MX * 2;
  c.height = WALL + H + BOTTOM;
  const ctx = c.getContext('2d');
  ctx.translate(MX, WALL);
  const r = rng(77);

  // ---- parede de papel com vigas ----
  ctx.fillStyle = '#efe2c4';
  ctx.fillRect(-MX, -WALL, W + MX * 2, WALL - 40);
  // painéis shoji
  for (let px = -MX + 20; px < W + MX; px += 150) {
    const isCenter = px > W / 2 - 260 && px < W / 2 + 120;
    if (isCenter) continue;
    ctx.fillStyle = '#fbf6e8';
    ctx.fillRect(px, -WALL + 70, 120, 200);
    ctx.strokeStyle = '#9b6b3e';
    ctx.lineWidth = 3;
    for (let gx = px; gx <= px + 120; gx += 30) {
      ctx.beginPath(); ctx.moveTo(gx, -WALL + 70); ctx.lineTo(gx, -WALL + 270); ctx.stroke();
    }
    for (let gy = -WALL + 70; gy <= -WALL + 270; gy += 40) {
      ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px + 120, gy); ctx.stroke();
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.strokeRect(px, -WALL + 70, 120, 200);
  }
  // vigas
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(-MX, -WALL, W + MX * 2, 36);
  ctx.fillRect(-MX, -WALL + 40, W + MX * 2, 14);
  for (let px = -MX; px < W + MX; px += 150) ctx.fillRect(px + 2, -WALL + 36, 14, WALL - 76);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(-MX, -WALL, W + MX * 2, 36);

  // estandarte no centro: sol vermelho + nome do dojo
  const bx = W / 2;
  wobblyPoly(ctx, [[bx - 110, -WALL + 64], [bx + 110, -WALL + 64], [bx + 104, -WALL + 270], [bx - 104, -WALL + 270]], 3, 2);
  fillStroke(ctx, '#fffdf5', 4);
  blob(ctx, bx, -WALL + 140, 52, 52, 9, 0.03);
  fillStroke(ctx, '#d23b2b', 3);
  outlinedText(ctx, 'NILTON', bx, -WALL + 222, { size: 30, fill: '#1b1b1b', stroke: '#fffdf5', lw: 2 });
  outlinedText(ctx, 'D O J O', bx, -WALL + 252, { size: 20, fill: '#d23b2b', stroke: '#fffdf5', lw: 2 });
  // cordinha do estandarte
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx - 110, -WALL + 64); ctx.lineTo(bx, -WALL + 44); ctx.lineTo(bx + 110, -WALL + 64); ctx.stroke();

  // lanternas de papel
  for (const lx of [bx - 230, bx + 230]) {
    ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.moveTo(lx, -WALL + 54); ctx.lineTo(lx, -WALL + 96); ctx.stroke();
    blob(ctx, lx, -WALL + 130, 26, 34, lx, 0.04);
    fillStroke(ctx, '#e8412b', 3);
    ctx.strokeStyle = shade('#e8412b', -0.25);
    ctx.lineWidth = 2;
    for (const k of [-14, 0, 14]) {
      ctx.beginPath(); ctx.ellipse(lx, -WALL + 130 + k, 25, 4, 0, 0, Math.PI); ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.fillRect(lx - 10, -WALL + 94, 20, 6);
    ctx.fillRect(lx - 10, -WALL + 162, 20, 6);
  }

  // rodapé
  ctx.fillStyle = '#5b3a22';
  ctx.fillRect(-MX, -46, W + MX * 2, 12);

  // ---- assoalho de madeira ----
  ctx.fillStyle = '#c9935a';
  ctx.fillRect(-MX, -34, W + MX * 2, H + BOTTOM + 34);
  ctx.strokeStyle = 'rgba(90,55,25,0.45)';
  ctx.lineWidth = 2;
  for (let y = -34; y < H + BOTTOM; y += 26) {
    ctx.beginPath(); ctx.moveTo(-MX, y); ctx.lineTo(W + MX, y); ctx.stroke();
    for (let x = -MX + r() * 200; x < W + MX; x += 160 + r() * 140) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 26); ctx.stroke();
    }
  }

  // ---- tatame ----
  const pad = 14;
  roundRect(ctx, -pad, -pad, W + pad * 2, H + pad * 2, 6);
  fillStroke(ctx, '#d23b2b', 4);
  const cols = 6;
  const rows = 2;
  const mw = W / cols;
  const mh = H / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * mw;
      const y = j * mh;
      ctx.fillStyle = (i + j) % 2 ? '#cfc77f' : '#c4bd72';
      ctx.fillRect(x, y, mw, mh);
      // fibras da palha
      ctx.strokeStyle = 'rgba(120,110,50,0.25)';
      ctx.lineWidth = 1;
      for (let k = 6; k < mh; k += 7) {
        ctx.beginPath(); ctx.moveTo(x + 4, y + k); ctx.lineTo(x + mw - 4, y + k); ctx.stroke();
      }
      ctx.strokeStyle = '#4d6a3a';
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 2, y + 2, mw - 4, mh - 4);
    }
  }
  // linhas de início
  ctx.fillStyle = '#ffffff';
  for (const sx of [W / 2 - KT.START_GAP / 2, W / 2 + KT.START_GAP / 2]) ctx.fillRect(sx - 3, H / 2 - 24, 6, 48);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(-pad, -pad, W + pad * 2, H + pad * 2);

  // ---- decoração ----
  // suporte de bastões (esquerda)
  const rx = -170;
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(rx, -150, 10, 120);
  ctx.fillRect(rx + 80, -150, 10, 120);
  ctx.fillRect(rx - 6, -120, 102, 8);
  ctx.fillRect(rx - 6, -70, 102, 8);
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(rx + 16 + k * 18, -190); ctx.lineTo(rx + 20 + k * 18, -32); ctx.stroke();
    ctx.strokeStyle = k % 2 ? '#b07a45' : '#d8b07a';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  // bonsai (direita, no fundo)
  const tx = W + 70;
  roundRect(ctx, tx - 26, -78, 52, 26, 5);
  fillStroke(ctx, '#3f4a5a', 3);
  ctx.strokeStyle = '#5b3a22';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(tx, -78); ctx.quadraticCurveTo(tx - 18, -110, tx + 8, -130); ctx.stroke();
  for (const [ox, oy, rr] of [[-16, -128, 20], [14, -140, 22], [0, -158, 16]]) {
    blob(ctx, tx + ox, oy, rr, rr * 0.7, ox + 50, 0.1);
    fillStroke(ctx, '#2e9e48', 3);
  }

  // gongo (direita)
  drawGongStand(ctx);

  // almofada do sensei
  blob(ctx, SENSEI.x, SENSEI.y + 2, 34, 10, 5, 0.05);
  fillStroke(ctx, '#3a6fd8', 3);
  return c;
}

function drawGongStand(ctx) {
  const { x, y } = GONG;
  ctx.fillStyle = '#5b3a22';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (const ox of [-46, 40]) {
    ctx.fillRect(x + ox, y - 130, 8, 130);
    ctx.strokeRect(x + ox, y - 130, 8, 130);
  }
  ctx.fillRect(x - 54, y - 138, 108, 10);
  ctx.strokeRect(x - 54, y - 138, 108, 10);
}

// gongo em si (dinâmico: balança e brilha quando bate)
export function drawGong(ctx, ring) {
  const { x, y } = GONG;
  const sw = Math.sin(ring * 30) * ring * 0.15;
  ctx.save();
  ctx.translate(x, y - 128);
  ctx.rotate(sw);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-14, 24); ctx.moveTo(14, 0); ctx.lineTo(14, 24); ctx.stroke();
  blob(ctx, 0, 62, 38, 38, 21, 0.02);
  fillStroke(ctx, '#e3b23c', 3.5);
  blob(ctx, 0, 62, 14, 14, 22, 0.04);
  fillStroke(ctx, '#f6d36b', 2);
  ctx.restore();
  if (ring > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, ring);
    ctx.strokeStyle = '#ffe36b';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const rr = 50 + (1 - ring) * 60 + i * 14;
      ctx.beginPath(); ctx.arc(x, y - 66, rr, -0.6, 0.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 66, rr, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    }
    ctx.restore();
  }
}

// Sensei velhinho sentado na almofada (pisca, balança a barba).
export function drawSensei(ctx, now, nod = 0) {
  const { x, y } = SENSEI;
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(now * 1.5) * 1.2 + nod * Math.sin(now * 14) * 3;
  // corpo (quimono preto, sentado)
  wobblyPoly(ctx, [[-30, -4], [30, -4], [20, -46], [-20, -46]], 31, 1, Math.floor(now * 6));
  fillStroke(ctx, '#2b2b35', 3);
  ctx.fillStyle = '#e8412b';
  ctx.fillRect(-21, -24, 42, 6);
  // mãos no colo
  blob(ctx, 0, -14, 12, 6, 32, 0.08);
  fillStroke(ctx, '#f0c08a', 2.5);
  // cabeça careca
  ctx.translate(0, bob);
  blob(ctx, 0, -66, 22, 20, 33, 0.02, Math.floor(now * 6));
  fillStroke(ctx, '#f0c08a', 3);
  // barba branca comprida
  wobblyPoly(ctx, [[-14, -56], [14, -56], [6 + Math.sin(now * 2) * 2, -24], [-2 + Math.sin(now * 2) * 2, -22]], 34, 1, Math.floor(now * 6));
  fillStroke(ctx, '#ffffff', 2.5);
  // sobrancelhas enormes e olhos fechados
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  const open = Math.sin(now * 0.7) > 0.93;
  for (const ex of [-8, 8]) {
    ctx.beginPath();
    if (open) ctx.arc(ex, -68, 3, 0, Math.PI * 2);
    else { ctx.moveTo(ex - 5, -68); ctx.quadraticCurveTo(ex, -65, ex + 5, -68); }
    ctx.stroke();
    blob(ctx, ex, -76, 8, 3.5, 35 + ex, 0.1);
    fillStroke(ctx, '#ffffff', 2);
  }
  ctx.restore();
}
