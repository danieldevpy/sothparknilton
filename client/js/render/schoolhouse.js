// Prédio da Escola na praça (no fim da avenida que sobe da fonte): Corrida das Perguntas.
// - drawSchoolBuilding: parte fixa (paredes de madeira creme, telhado verde, torre do sino, relógio, letreiro
//   de lousa), desenhada no fundo pré-renderizado.
// - drawSchoolLive: parte animada antes dos sprites — janelas acesas com alunos levantando a mão, porta
//   aberta, sino balançando, bandeira do tema tremulando, cavalete "QUIZ" na calçada.
// - drawSchoolTop: selo flutuante (salas · correndo · plateia) + onomatopeias, depois dos sprites.

import { blob, wobblyPoly, fillStroke, roundRect, outlinedText, boilFrame, INK } from './paint.js';

const WALL = '#f3e7c9';
const WALL_LINE = '#ddcca4';
const TRIM = '#ffffff';
const ROOF = '#2a7a6f';
const ROOF_DARK = '#1f5d55';
const RED = '#b33a2a';
const BOARD = '#2f5d46';

function geo(g) {
  const { x, y, w, h } = g;
  const cx = x + w / 2;
  const base = y + h;
  const wy = y + 104;
  return {
    x, y, w, h, cx, base,
    wins: [
      { x: x + 16, y: wy, w: 40, h: 40 }, { x: x + 64, y: wy, w: 40, h: 40 },
      { x: x + w - 104, y: wy, w: 40, h: 40 }, { x: x + w - 56, y: wy, w: 40, h: 40 },
    ],
    door: { x: cx - 24, y: y + 112, w: 48, h: base - 10 - (y + 112) },
    bell: { x: cx, y: y - 14 },
    pole: { x: x - 14, y: base - 4, top: y + 4 },
    easel: { x: x + w + 6, y: base + 2 },
  };
}

// área clicável (mundo)
export function schoolBounds(g) {
  return { x: g.x - 30, y: g.y - 54, w: g.w + 64, h: g.h + 62 };
}

export function drawSchoolBuilding(ctx, g) {
  const d = geo(g);
  const { x, y, w, cx, base } = d;
  ctx.save();
  ctx.lineJoin = 'round';
  // calçada + degraus
  wobblyPoly(ctx, [[x - 8, base - 12], [x + w + 8, base - 12], [x + w + 16, base + 6], [x - 16, base + 6]], 701, 1.5);
  fillStroke(ctx, '#bdb5a6', 3);
  roundRect(ctx, cx - 36, base - 4, 72, 9, 3);
  fillStroke(ctx, '#d5cebf', 2.5);
  roundRect(ctx, cx - 30, base - 11, 60, 8, 3);
  fillStroke(ctx, '#e1dbcd', 2.5);
  // paredes (tábuas de madeira creme)
  wobblyPoly(ctx, [[x + 4, y + 62], [x + w - 4, y + 62], [x + w - 4, base - 10], [x + 4, base - 10]], 702, 1);
  fillStroke(ctx, WALL, 3);
  ctx.strokeStyle = WALL_LINE;
  ctx.lineWidth = 1.5;
  for (let yy = y + 72; yy < base - 12; yy += 9) {
    ctx.beginPath();
    ctx.moveTo(x + 7, yy);
    ctx.lineTo(x + w - 7, yy);
    ctx.stroke();
  }
  // rodapé de madeira
  ctx.fillStyle = '#9c7b54';
  ctx.fillRect(x + 5, base - 22, w - 10, 11);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 5, base - 22, w - 10, 11);
  // janelas (vidro; luz e alunos vêm no drawSchoolLive)
  for (const wn of d.wins) {
    ctx.fillStyle = '#8fa7b8';
    ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.strokeRect(wn.x, wn.y, wn.w, wn.h);
    // floreira embaixo da janela
    roundRect(ctx, wn.x - 3, wn.y + wn.h, wn.w + 6, 7, 2);
    fillStroke(ctx, '#7a4a2a', 2);
    for (let i = 0; i < 4; i++) {
      blob(ctx, wn.x + 6 + i * 10, wn.y + wn.h - 1, 4, 4, 710 + i + wn.x, 0.15);
      fillStroke(ctx, i % 2 ? '#e8412b' : '#ffd23f', 1.5);
    }
  }
  // vão da porta
  ctx.fillStyle = '#2a2320';
  ctx.fillRect(d.door.x, d.door.y, d.door.w, d.door.h);
  ctx.lineWidth = 3;
  ctx.strokeRect(d.door.x, d.door.y, d.door.w, d.door.h);
  // letreiro de lousa em cima da porta
  roundRect(ctx, cx - 62, y + 76, 124, 26, 4);
  fillStroke(ctx, '#8a5a2b', 3);
  roundRect(ctx, cx - 57, y + 80, 114, 18, 3);
  fillStroke(ctx, BOARD, 0);
  outlinedText(ctx, 'ESCOLA', cx, y + 89.5, { size: 15, fill: '#f4f1e6', stroke: BOARD, lw: 1 });
  // telhado de duas águas
  wobblyPoly(ctx, [[x - 18, y + 68], [cx, y + 4], [x + w + 18, y + 68]], 703, 1.5);
  fillStroke(ctx, ROOF, 3);
  ctx.strokeStyle = ROOF_DARK;
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    const k = i / 6;
    ctx.beginPath();
    ctx.moveTo(cx - (cx - (x - 18)) * k, y + 4 + 64 * k);
    ctx.lineTo(cx + (x + w + 18 - cx) * k, y + 4 + 64 * k);
    ctx.stroke();
  }
  // frontão branco com o relógio
  wobblyPoly(ctx, [[cx - 54, y + 66], [cx, y + 24], [cx + 54, y + 66]], 704, 1);
  fillStroke(ctx, TRIM, 3);
  blob(ctx, cx, y + 50, 13, 13, 705, 0.03);
  fillStroke(ctx, '#fffdf2', 2.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, y + 50);
  ctx.lineTo(cx, y + 42);
  ctx.moveTo(cx, y + 50);
  ctx.lineTo(cx + 6, y + 53);
  ctx.stroke();
  // neve no telhado
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 62);
  ctx.lineTo(cx - 40, y + 26);
  ctx.quadraticCurveTo(cx - 30, y + 34, cx - 22, y + 24);
  ctx.lineTo(x + 14, y + 64);
  ctx.closePath();
  fillStroke(ctx, '#ffffff', 2);
  ctx.beginPath();
  ctx.moveTo(x + w + 6, y + 62);
  ctx.lineTo(cx + 40, y + 26);
  ctx.quadraticCurveTo(cx + 30, y + 34, cx + 22, y + 24);
  ctx.lineTo(x + w - 14, y + 64);
  ctx.closePath();
  fillStroke(ctx, '#ffffff', 2);
  // torre do sino (o sino em si balança no drawSchoolLive)
  wobblyPoly(ctx, [[cx - 22, y + 18], [cx + 22, y + 18], [cx + 22, y - 30], [cx - 22, y - 30]], 706, 1);
  fillStroke(ctx, TRIM, 3);
  ctx.fillStyle = '#3a2f2a';
  ctx.fillRect(cx - 13, y - 25, 26, 26);
  ctx.strokeRect(cx - 13, y - 25, 26, 26);
  wobblyPoly(ctx, [[cx - 30, y - 28], [cx, y - 58], [cx + 30, y - 28]], 707, 1);
  fillStroke(ctx, RED, 3);
  ctx.beginPath();
  ctx.moveTo(cx, y - 58);
  ctx.lineTo(cx, y - 72);
  ctx.stroke();
  blob(ctx, cx, y - 74, 4, 4, 708, 0.1);
  fillStroke(ctx, '#ffd23f', 2);
  ctx.restore();
}

export function drawSchoolLive(ctx, g, { live, hover, flag = '🇺🇸', ring = 0 }, t) {
  const d = geo(g);
  const fr = boilFrame(t);
  ctx.save();
  if (hover) {
    ctx.shadowColor = '#fff6a0';
    ctx.shadowBlur = 24;
    roundRect(ctx, d.x + 2, d.y + 60, d.w - 4, d.h - 68, 6);
    ctx.strokeStyle = 'rgba(255,240,150,0.9)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  // janelas: acesas com alunos levantando a mão (cada um no seu ritmo)
  d.wins.forEach((wn, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(wn.x, wn.y, wn.w, wn.h);
    ctx.clip();
    ctx.fillStyle = live ? '#ffeaa8' : '#8fa7b8';
    ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
    if (live) {
      ctx.fillStyle = 'rgba(60,45,35,0.55)';
      for (let j = 0; j < 2; j++) {
        const sx = wn.x + 11 + j * 18;
        const up = Math.sin(t * 2.2 + i * 1.7 + j * 2.1) > 0.2;
        ctx.beginPath();
        ctx.arc(sx, wn.y + wn.h - 15, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(sx - 5, wn.y + wn.h - 10, 10, 12);
        if (up) {
          ctx.fillRect(sx + 3, wn.y + wn.h - 32, 3, 18); // mão levantada!
          ctx.beginPath();
          ctx.arc(sx + 4.5, wn.y + wn.h - 33, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // reflexo no vidro
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wn.x + 6, wn.y + wn.h - 8);
      ctx.lineTo(wn.x + wn.w - 10, wn.y + 6);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(wn.x, wn.y, wn.w, wn.h);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wn.x + wn.w / 2, wn.y);
    ctx.lineTo(wn.x + wn.w / 2, wn.y + wn.h);
    ctx.moveTo(wn.x, wn.y + wn.h / 2);
    ctx.lineTo(wn.x + wn.w, wn.y + wn.h / 2);
    ctx.stroke();
  });
  // porta: aberta (luz) com aula rolando, fechada sem
  const dr = d.door;
  if (live) {
    ctx.fillStyle = '#ffeaa8';
    ctx.fillRect(dr.x + 3, dr.y + 3, dr.w - 6, dr.h - 3);
    ctx.fillStyle = 'rgba(255,234,168,0.35)';
    ctx.beginPath();
    ctx.moveTo(dr.x, dr.y + dr.h);
    ctx.lineTo(dr.x + dr.w, dr.y + dr.h);
    ctx.lineTo(dr.x + dr.w + 16, dr.y + dr.h + 20);
    ctx.lineTo(dr.x - 16, dr.y + dr.h + 20);
    ctx.closePath();
    ctx.fill();
  } else {
    for (let i = 0; i < 2; i++) {
      wobblyPoly(ctx, [[dr.x + (i * dr.w) / 2, dr.y], [dr.x + ((i + 1) * dr.w) / 2, dr.y], [dr.x + ((i + 1) * dr.w) / 2, dr.y + dr.h], [dr.x + (i * dr.w) / 2, dr.y + dr.h]], 720 + i, 0.8, fr);
      fillStroke(ctx, RED, 2.5);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(dr.x + dr.w / 2 + (i ? 5 : -5), dr.y + dr.h / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // sino (balança quando alguém vence / começa uma corrida)
  const swing = ring > 0 ? Math.sin(t * 18) * 0.55 * ring : Math.sin(t * 1.3) * 0.04;
  ctx.save();
  ctx.translate(d.bell.x, d.bell.y - 8);
  ctx.rotate(swing);
  ctx.beginPath();
  ctx.moveTo(-9, 12);
  ctx.quadraticCurveTo(-9, -2, 0, -3);
  ctx.quadraticCurveTo(9, -2, 9, 12);
  ctx.closePath();
  fillStroke(ctx, '#f2c12e', 2.5);
  blob(ctx, 0, 14, 3, 3, 730, 0.1);
  fillStroke(ctx, '#c99a2e', 1.5);
  ctx.restore();
  if (ring > 0) {
    ctx.strokeStyle = 'rgba(255,225,77,0.9)';
    ctx.lineWidth = 2.5;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(d.bell.x + s * 6, d.bell.y - 4, 16 + i * 7 + ((t * 30) % 7), s < 0 ? Math.PI * 0.75 : -Math.PI * 0.25, s < 0 ? Math.PI * 1.25 : Math.PI * 0.25);
        ctx.stroke();
      }
    }
  }
  // mastro com a bandeira do tema (emoji tremulando)
  const p = d.pole;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x, p.top);
  ctx.stroke();
  ctx.strokeStyle = '#d9d9d9';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.translate(p.x + 16, p.top + 12);
  ctx.rotate(Math.sin(t * 3) * 0.08);
  ctx.font = '26px "Noto Color Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(flag, 0, 0);
  ctx.restore();
  // cavalete de lousa na calçada: "QUIZ!"
  const e = d.easel;
  ctx.strokeStyle = '#7a4a2a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(e.x - 14, e.y);
  ctx.lineTo(e.x - 4, e.y - 52);
  ctx.moveTo(e.x + 14, e.y);
  ctx.lineTo(e.x + 4, e.y - 52);
  ctx.stroke();
  wobblyPoly(ctx, [[e.x - 20, e.y - 54], [e.x + 20, e.y - 54], [e.x + 22, e.y - 16], [e.x - 22, e.y - 16]], 740, 1, fr);
  fillStroke(ctx, BOARD, 3);
  outlinedText(ctx, 'QUIZ', e.x, e.y - 42, { size: 12, fill: '#ffffff', stroke: BOARD, lw: 0 });
  outlinedText(ctx, live ? 'AO VIVO' : 'A B C', e.x, e.y - 27, { size: 9, fill: live ? '#ffe14d' : '#cfe8d8', stroke: BOARD, lw: 0 });
  ctx.restore();
}

export function drawSchoolTop(ctx, g, { live, rooms, racing, watching, pops, open }, t, now) {
  const d = geo(g);
  for (const p of pops) {
    const k = (now - p.born) / 900;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.translate(p.x, p.y - k * 30);
    ctx.rotate(p.rot);
    const s = k < 0.15 ? 0.6 + k * 3 : 1.05;
    ctx.scale(s, s);
    outlinedText(ctx, p.text, 0, 0, { size: 17, fill: p.color, lw: 5 });
    ctx.restore();
  }
  const bob = Math.sin(t * 2.4) * 3;
  const label = live
    ? `📚 ${rooms} ${rooms === 1 ? 'sala' : 'salas'} · ${racing} correndo${watching ? ` · 👀 ${watching}` : ''}`
    : 'CORRIDA DAS PERGUNTAS 📚 · crie uma sala!';
  ctx.font = '700 14px "Comic Neue", "Comic Sans MS", cursive';
  const w = ctx.measureText(label).width + 24;
  const y = d.y - 40 + bob; // por cima da torre (mais alto o selo sairia da tela no topo do mapa)
  roundRect(ctx, d.cx - w / 2, y - 13, w, 26, 13);
  fillStroke(ctx, live ? '#2a7a6f' : 'rgba(255,253,246,0.95)', 3);
  outlinedText(ctx, label, d.cx, y, { size: 14, fill: live ? '#ffffff' : '#1b1b1b', stroke: live ? INK : 'rgba(0,0,0,0)', lw: live ? 3 : 0 });
  if (open) outlinedText(ctx, 'tem vaga! 🙋 entre', d.cx, y + 24, { size: 12, fill: '#ffe14d', lw: 3 });
}
