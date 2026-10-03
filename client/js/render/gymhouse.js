// Prédio do Ginásio da Queimada na praça (canto esquerdo da fileira de casas, acima do lago).
// - drawGymBuilding: parte fixa (paredes de tijolo, telhado em arco, letreiro), no fundo pré-renderizado.
// - drawGymLive: parte animada antes dos sprites — janelas acesas com bolas voando quando tem partida,
//   porta aberta/fechada e letreiro "JOGANDO".
// - drawGymTop: selo flutuante (quadras · jogando) + onomatopeias, depois dos sprites.

import { blob, wobblyPoly, fillStroke, roundRect, outlinedText, boilFrame, INK } from './paint.js';

const BRICK = '#c4553b';
const BRICK_DARK = '#a4432d';
const ROOF = '#3f6e8c';
const TRIM = '#f2ead8';

function geo(g) {
  const { x, y, w, h } = g;
  const cx = x + w / 2;
  const base = y + h;
  return {
    x, y, w, h, cx, base,
    wins: [{ x: x + 22, y: y + 96, w: 54, h: 46 }, { x: x + w - 76, y: y + 96, w: 54, h: 46 }],
    door: { x: cx - 30, y: y + 104, w: 60, h: base - 10 - (y + 104) },
  };
}

// área clicável (mundo)
export function gymBounds(g) {
  return { x: g.x - 24, y: g.y - 26, w: g.w + 48, h: g.h + 34 };
}

export function drawGymBuilding(ctx, g) {
  const d = geo(g);
  const { x, y, w, cx, base } = d;
  ctx.save();
  ctx.lineJoin = 'round';
  // calçada + degrau
  wobblyPoly(ctx, [[x - 6, base - 12], [x + w + 6, base - 12], [x + w + 14, base + 6], [x - 14, base + 6]], 601, 1.5);
  fillStroke(ctx, '#bdb5a6', 3);
  roundRect(ctx, cx - 44, base - 2, 88, 10, 3);
  fillStroke(ctx, '#cfc8ba', 2.5);
  // paredes de tijolo
  wobblyPoly(ctx, [[x + 6, y + 64], [x + w - 6, y + 64], [x + w - 6, base - 10], [x + 6, base - 10]], 602, 1);
  fillStroke(ctx, BRICK, 3);
  ctx.strokeStyle = BRICK_DARK;
  ctx.lineWidth = 1.5;
  for (let yy = y + 74; yy < base - 12; yy += 12) {
    ctx.beginPath();
    ctx.moveTo(x + 8, yy);
    ctx.lineTo(x + w - 8, yy);
    ctx.stroke();
    const off = ((yy - y) / 12) % 2 ? 0 : 12;
    for (let xx = x + 10 + off; xx < x + w - 8; xx += 24) {
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + 12);
      ctx.stroke();
    }
  }
  // faixa branca + letreiro
  wobblyPoly(ctx, [[x + 6, y + 64], [x + w - 6, y + 64], [x + w - 6, y + 86], [x + 6, y + 86]], 603, 1);
  fillStroke(ctx, TRIM, 3);
  outlinedText(ctx, 'GINÁSIO • QUEIMADA', cx, y + 75, { size: 14, fill: '#c0321f', stroke: TRIM, lw: 2 });
  // janelas (brilho e bolas vêm no drawGymLive)
  for (const wn of d.wins) {
    ctx.fillStyle = '#7d93a6';
    ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.strokeRect(wn.x, wn.y, wn.w, wn.h);
  }
  // vão da porta (dupla)
  ctx.fillStyle = '#2a2320';
  ctx.fillRect(d.door.x, d.door.y, d.door.w, d.door.h);
  ctx.strokeRect(d.door.x, d.door.y, d.door.w, d.door.h);
  // telhado em arco (ginásio de escola)
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 68);
  ctx.quadraticCurveTo(cx, y - 52, x + w + 14, y + 68);
  ctx.closePath();
  fillStroke(ctx, ROOF, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 9; i++) {
    const k = i / 9;
    const px = x - 14 + k * (w + 28);
    const py = y + 68 - Math.sin(k * Math.PI) * 60 * 1.0;
    ctx.beginPath();
    ctx.moveTo(px, py + 4);
    ctx.lineTo(px + (k - 0.5) * 10, y + 66);
    ctx.stroke();
  }
  // neve no telhado
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 40);
  ctx.quadraticCurveTo(cx, y - 44, x + w - 18, y + 40);
  ctx.quadraticCurveTo(x + w - 30, y + 30, x + w - 50, y + 28);
  ctx.quadraticCurveTo(cx, y - 26, x + 50, y + 28);
  ctx.quadraticCurveTo(x + 30, y + 30, x + 18, y + 40);
  fillStroke(ctx, '#ffffff', 2.5);
  // brasão: bola vermelha no alto da fachada
  blob(ctx, cx, y + 22, 15, 15, 604, 0.04);
  fillStroke(ctx, '#e0362a', 3);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(cx, y + 22, 12, 5, -0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawGymLive(ctx, g, { live, hover }, t) {
  const d = geo(g);
  const fr = boilFrame(t);
  ctx.save();
  if (hover) {
    ctx.shadowColor = '#fff6a0';
    ctx.shadowBlur = 24;
    roundRect(ctx, d.x + 4, d.y + 62, d.w - 8, d.h - 70, 6);
    ctx.strokeStyle = 'rgba(255,240,150,0.9)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  d.wins.forEach((wn, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(wn.x, wn.y, wn.w, wn.h);
    ctx.clip();
    ctx.fillStyle = live ? '#ffe9a3' : '#7d93a6';
    ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
    if (live) {
      // bola voando de um lado para o outro (sombra na janela)
      const k = (t * 0.9 + i * 0.45) % 1;
      const bx = wn.x + 6 + k * (wn.w - 12);
      const by = wn.y + wn.h - 8 - Math.sin(k * Math.PI) * (wn.h - 16);
      ctx.fillStyle = '#e0362a';
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
      // bonecos (silhuetas) pulando
      ctx.fillStyle = 'rgba(60,40,30,0.55)';
      for (let j = 0; j < 2; j++) {
        const sx = wn.x + 10 + j * (wn.w - 20);
        const hop = Math.abs(Math.sin(t * 6 + j + i)) * 5;
        ctx.beginPath();
        ctx.arc(sx, wn.y + wn.h - 18 - hop, 6, 0, Math.PI * 2);
        ctx.fillRect(sx - 4, wn.y + wn.h - 13 - hop, 8, 12);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(wn.x, wn.y, wn.w, wn.h);
    ctx.beginPath();
    ctx.moveTo(wn.x + wn.w / 2, wn.y);
    ctx.lineTo(wn.x + wn.w / 2, wn.y + wn.h);
    ctx.stroke();
  });
  // porta: aberta (luz saindo) com partida, fechada sem
  const dr = d.door;
  if (live) {
    ctx.fillStyle = '#ffe9a3';
    ctx.fillRect(dr.x + 3, dr.y + 3, dr.w - 6, dr.h - 3);
    ctx.fillStyle = 'rgba(255,233,163,0.35)';
    ctx.beginPath();
    ctx.moveTo(dr.x, dr.y + dr.h);
    ctx.lineTo(dr.x + dr.w, dr.y + dr.h);
    ctx.lineTo(dr.x + dr.w + 18, dr.y + dr.h + 22);
    ctx.lineTo(dr.x - 18, dr.y + dr.h + 22);
    ctx.closePath();
    ctx.fill();
  } else {
    for (let i = 0; i < 2; i++) {
      wobblyPoly(ctx, [[dr.x + i * dr.w / 2, dr.y], [dr.x + (i + 1) * dr.w / 2, dr.y], [dr.x + (i + 1) * dr.w / 2, dr.y + dr.h], [dr.x + i * dr.w / 2, dr.y + dr.h]], 610 + i, 0.8, fr);
      fillStroke(ctx, '#5b7c99', 2.5);
    }
  }
  ctx.restore();
}

export function drawGymTop(ctx, g, { live, matches, players, pops, open }, t, now) {
  const d = geo(g);
  // onomatopeias saindo do prédio
  for (const p of pops) {
    const k = (now - p.born) / 900;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.translate(p.x, p.y - k * 30);
    ctx.rotate(p.rot);
    const s = k < 0.15 ? 0.6 + k * 3 : 1.05;
    ctx.scale(s, s);
    outlinedText(ctx, p.text, 0, 0, { size: 18, fill: p.color, lw: 5 });
    ctx.restore();
  }
  // selo flutuante
  const bob = Math.sin(t * 2.4) * 3;
  const label = live
    ? `🔴🔵 ${matches} ${matches === 1 ? 'quadra' : 'quadras'} · ${players} ${players === 1 ? 'jogando' : 'jogando'}`
    : 'QUEIMADA 🔴🔵 · crie uma partida!';
  ctx.font = `700 14px "Comic Neue", "Comic Sans MS", cursive`;
  const w = ctx.measureText(label).width + 24;
  const y = d.y - 34 + bob;
  roundRect(ctx, d.cx - w / 2, y - 13, w, 26, 13);
  fillStroke(ctx, live ? '#e8412b' : 'rgba(255,253,246,0.95)', 3);
  outlinedText(ctx, label, d.cx, y, { size: 14, fill: live ? '#ffffff' : '#1b1b1b', stroke: live ? INK : 'rgba(0,0,0,0)', lw: live ? 3 : 0 });
  if (open) outlinedText(ctx, 'tem vaga! ▶ entre', d.cx, y + 24, { size: 12, fill: '#ffe14d', lw: 3 });
}
