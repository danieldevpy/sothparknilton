// Prédio do Dojo na praça (fileira de casas do topo do mapa).
// - drawDojoBuilding: parte fixa, desenhada uma vez no fundo pré-renderizado.
// - drawDojoLive: parte animada (janelas, cortina/porta, lanternas, letreiro), antes dos sprites.
// - drawDojoTop: selo flutuante com as lutas ao vivo + onomatopeias, depois dos sprites.
// Com luta rolando o dojo "acende": teatro de sombras nas janelas de papel, cortina balançando
// e letreiro AO VIVO. Sem luta: portas fechadas, placa FECHADO e "zzz".

import { blob, wobblyPoly, fillStroke, roundRect, outlinedText, INK, FONT } from './paint.js';

const PAPER = '#f4ead2';
const WOOD = '#7a4a2a';
const PILLAR = '#b8322a';
const ROOF = '#3b3f55';

function geo(d) {
  const { x, y, w, h } = d;
  const cx = x + w / 2;
  const base = y + h;
  return {
    x, y, w, h, cx, base,
    wins: [{ x: x + 30, y: y + 100, w: 58, h: 52 }, { x: x + w - 88, y: y + 100, w: 58, h: 52 }],
    door: { x: cx - 22, y: y + 112, w: 44, h: base - 16 - (y + 112) },
    lanterns: [x - 20, x + w + 20],
  };
}

// área clicável (mundo)
export function dojoBounds(d) {
  return { x: d.x - 36, y: d.y - 30, w: d.w + 72, h: d.h + 40 };
}

export function drawDojoBuilding(ctx, d) {
  const g = geo(d);
  const { x, y, w, cx, base } = g;
  ctx.save();
  ctx.lineJoin = 'round';

  // plataforma de pedra + degraus
  wobblyPoly(ctx, [[x - 4, base - 20], [x + w + 4, base - 20], [x + w + 12, base + 4], [x - 12, base + 4]], 501, 1.5);
  fillStroke(ctx, '#b9b2a4', 3);
  for (let i = 0; i < 2; i++) {
    roundRect(ctx, cx - 34 - i * 7, base + 3 + i * 9, 68 + i * 14, 10, 3);
    fillStroke(ctx, i ? '#a9a294' : '#c4bdb0', 2.5);
  }

  // paredes de papel com vigas
  wobblyPoly(ctx, [[x + 12, y + 76], [x + w - 12, y + 76], [x + w - 12, base - 18], [x + 12, base - 18]], 502, 1);
  fillStroke(ctx, PAPER, 3);
  ctx.fillStyle = WOOD;
  ctx.fillRect(x + 12, y + 76, w - 24, 10);
  ctx.fillRect(x + 12, base - 30, w - 24, 8);
  for (const px of [x + 12, x + w - 26, cx - 36, cx + 22]) {
    ctx.fillStyle = PILLAR;
    ctx.fillRect(px, y + 80, 14, base - 18 - (y + 80));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(px, y + 80, 14, base - 18 - (y + 80));
  }

  // janelas de papel (shoji) — o brilho e as sombras vêm no drawDojoLive
  for (const wn of g.wins) {
    ctx.fillStyle = '#fbf3dc';
    ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.strokeRect(wn.x, wn.y, wn.w, wn.h);
  }

  // vão da porta
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(g.door.x, g.door.y, g.door.w, g.door.h);
  ctx.strokeRect(g.door.x, g.door.y, g.door.w, g.door.h);

  // placa de madeira sobre a porta
  wobblyPoly(ctx, [[cx - 46, y + 88], [cx + 46, y + 88], [cx + 44, y + 108], [cx - 44, y + 108]], 503, 1);
  fillStroke(ctx, '#d8b07a', 3);
  outlinedText(ctx, '道場 DOJO', cx, y + 98, { size: 14, fill: '#1b1b1b', stroke: '#f6deb4', lw: 2 });

  // telhado de baixo (beiral grande com pontas viradas para cima)
  ctx.beginPath();
  ctx.moveTo(x - 36, y + 58);
  ctx.quadraticCurveTo(x - 8, y + 80, x + 22, y + 78);
  ctx.lineTo(x + w - 22, y + 78);
  ctx.quadraticCurveTo(x + w + 8, y + 80, x + w + 36, y + 58);
  ctx.quadraticCurveTo(x + w - 8, y + 56, x + w - 40, y + 38);
  ctx.lineTo(x + 40, y + 38);
  ctx.quadraticCurveTo(x + 8, y + 56, x - 36, y + 58);
  ctx.closePath();
  fillStroke(ctx, ROOF, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  for (let tx = x + 30; tx < x + w - 24; tx += 13) {
    ctx.beginPath();
    ctx.moveTo(tx, y + 44);
    ctx.lineTo(tx - 2, y + 74);
    ctx.stroke();
  }
  // neve no beiral
  wobblyPoly(ctx, [[x + 40, y + 38], [x + w - 40, y + 38], [x + w - 30, y + 46], [x + w - 70, y + 47], [x + cx - x, y + 44], [x + 60, y + 48], [x + 30, y + 45]], 504, 1.5);
  fillStroke(ctx, '#ffffff', 2.5);

  // andar de cima: parede com janela redonda (sol vermelho)
  wobblyPoly(ctx, [[x + 56, y + 10], [x + w - 56, y + 10], [x + w - 56, y + 40], [x + 56, y + 40]], 505, 1);
  fillStroke(ctx, PAPER, 3);
  blob(ctx, cx, y + 25, 11, 11, 506, 0.03);
  fillStroke(ctx, '#d23b2b', 2.5);

  // telhado de cima
  ctx.beginPath();
  ctx.moveTo(x + 22, y + 10);
  ctx.quadraticCurveTo(x + 40, y + 22, x + 62, y + 18);
  ctx.lineTo(x + w - 62, y + 18);
  ctx.quadraticCurveTo(x + w - 40, y + 22, x + w - 22, y + 10);
  ctx.quadraticCurveTo(x + w - 52, y + 4, x + w - 74, y - 20);
  ctx.lineTo(x + 74, y - 20);
  ctx.quadraticCurveTo(x + 52, y + 4, x + 22, y + 10);
  ctx.closePath();
  fillStroke(ctx, ROOF, 3);
  // cumeeira com enfeites enrolados
  roundRect(ctx, x + 68, y - 28, w - 136, 10, 4);
  fillStroke(ctx, '#2a2d3e', 2.5);
  for (const ex of [x + 68, x + w - 68]) {
    blob(ctx, ex, y - 30, 7, 7, ex, 0.05);
    fillStroke(ctx, '#e3b23c', 2.5);
  }
  wobblyPoly(ctx, [[x + 76, y - 20], [x + w - 76, y - 20], [x + w - 90, y - 12], [cx, y - 10], [x + 90, y - 12]], 507, 1.5);
  fillStroke(ctx, '#ffffff', 2.5);

  // lanternas de pedra (tōrō)
  for (const lx of g.lanterns) {
    ctx.fillStyle = '#9a958a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    roundRect(ctx, lx - 13, base - 4, 26, 8, 2);
    fillStroke(ctx, '#9a958a', 2.5);
    ctx.fillRect(lx - 5, base - 30, 10, 26);
    ctx.strokeRect(lx - 5, base - 30, 10, 26);
    roundRect(ctx, lx - 11, base - 50, 22, 20, 3);
    fillStroke(ctx, '#b3ad9f', 2.5);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(lx - 6, base - 46, 12, 12);
    wobblyPoly(ctx, [[lx - 17, base - 49], [lx, base - 64], [lx + 17, base - 49]], lx | 0, 1);
    fillStroke(ctx, '#8d887d', 2.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lx - 9, base - 60, 18, 4);
  }
  ctx.restore();
}

// Parte animada. s = { live, hover } · t em segundos.
export function drawDojoLive(ctx, d, s, t) {
  const g = geo(d);
  const { x, y, w, cx, base } = g;
  ctx.save();

  if (s.hover) {
    const b = dojoBounds(d);
    roundRect(ctx, b.x, b.y, b.w, b.h - 6, 18);
    ctx.lineWidth = 5;
    ctx.strokeStyle = `rgba(255, 225, 77, ${0.6 + Math.sin(t * 8) * 0.3})`;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -t * 30;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // janelas: luz quente com teatro de sombras de uma luta / apagadas
  g.wins.forEach((wn, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(wn.x + 1.5, wn.y + 1.5, wn.w - 3, wn.h - 3);
    ctx.clip();
    if (s.live) {
      ctx.fillStyle = `rgba(255, 196, 92, ${0.55 + Math.sin(t * 7 + i) * 0.12})`;
      ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
      drawShadowFight(ctx, wn.x + wn.w / 2, wn.y + wn.h - 4, t * (i ? 1.13 : 1) + i * 1.7);
    } else {
      ctx.fillStyle = 'rgba(60, 74, 110, 0.35)';
      ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
    }
    // grade do shoji por cima
    ctx.strokeStyle = '#9b6b3e';
    ctx.lineWidth = 2;
    for (let gx = wn.x + wn.w / 3; gx < wn.x + wn.w - 2; gx += wn.w / 3) {
      ctx.beginPath(); ctx.moveTo(gx, wn.y); ctx.lineTo(gx, wn.y + wn.h); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(wn.x, wn.y + wn.h / 2); ctx.lineTo(wn.x + wn.w, wn.y + wn.h / 2); ctx.stroke();
    ctx.restore();
  });

  // porta: aberta com cortina (noren) balançando / fechada com placa
  const dr = g.door;
  if (s.live) {
    const glow = ctx.createLinearGradient(0, dr.y, 0, dr.y + dr.h);
    glow.addColorStop(0, '#ffcf6b');
    glow.addColorStop(1, '#c9742e');
    ctx.fillStyle = glow;
    ctx.fillRect(dr.x + 1.5, dr.y + 1.5, dr.w - 3, dr.h - 3);
    for (let k = 0; k < 2; k++) {
      const px = dr.x + 2 + k * (dr.w / 2 - 1);
      const sway = Math.sin(t * 2.2 + k * 1.3) * 3;
      ctx.beginPath();
      ctx.moveTo(px, dr.y + 1);
      ctx.lineTo(px + dr.w / 2 - 3, dr.y + 1);
      ctx.lineTo(px + dr.w / 2 - 3 + sway, dr.y + 30);
      ctx.lineTo(px + sway, dr.y + 30);
      ctx.closePath();
      fillStroke(ctx, '#2b3f7a', 2.5);
    }
    blob(ctx, cx + Math.sin(t * 2.2) * 1.5, dr.y + 15, 6, 6, 508, 0.04);
    fillStroke(ctx, '#ffffff', 2);
  } else {
    ctx.fillStyle = '#8a5a33';
    ctx.fillRect(dr.x + 1.5, dr.y + 1.5, dr.w - 3, dr.h - 3);
    ctx.strokeStyle = '#5b3a22';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, dr.y); ctx.lineTo(cx, dr.y + dr.h); ctx.stroke();
    for (let gy = dr.y + 12; gy < dr.y + dr.h; gy += 14) {
      ctx.beginPath(); ctx.moveTo(dr.x + 2, gy); ctx.lineTo(dr.x + dr.w - 2, gy); ctx.stroke();
    }
    // placa FECHADO balançando num prego
    const sw = Math.sin(t * 1.6) * 0.12;
    ctx.save();
    ctx.translate(cx, dr.y + 10);
    ctx.rotate(sw);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(0, 0); ctx.lineTo(14, 10); ctx.stroke();
    roundRect(ctx, -26, 10, 52, 16, 4);
    fillStroke(ctx, '#fff6c9', 2);
    outlinedText(ctx, 'FECHADO', 0, 18, { size: 10, fill: '#b8322a', stroke: '#fff6c9', lw: 1 });
    ctx.restore();
  }

  // lanternas acesas (chama tremendo) — só com luta
  for (const lx of g.lanterns) {
    if (!s.live) continue;
    const fl = 0.75 + Math.sin(t * 17 + lx) * 0.12 + Math.sin(t * 29) * 0.08;
    const halo = ctx.createRadialGradient(lx, base - 40, 2, lx, base - 40, 30);
    halo.addColorStop(0, `rgba(255, 220, 120, ${0.8 * fl})`);
    halo.addColorStop(1, 'rgba(255, 220, 120, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(lx - 30, base - 70, 60, 60);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(lx - 6, base - 46, 12, 12);
  }

  // letreiro AO VIVO piscando no beiral
  if (s.live) {
    const on = Math.sin(t * 6) > -0.3;
    roundRect(ctx, cx - 36, y + 54, 72, 20, 8);
    fillStroke(ctx, on ? '#e8412b' : '#9b2c2c', 2.5);
    ctx.beginPath();
    ctx.arc(cx - 24, y + 64, 4, 0, Math.PI * 2);
    ctx.fillStyle = on ? '#ffffff' : '#e8a0a0';
    ctx.fill();
    outlinedText(ctx, 'AO VIVO', cx + 6, y + 64, { size: 12, fill: '#ffffff', lw: 2.5 });
  }
  void w;
  ctx.restore();
}

// Duas sombrinhas lutando atrás do papel (loop de ~1,6 s).
function drawShadowFight(ctx, mx, gy, t) {
  ctx.fillStyle = 'rgba(60, 30, 20, 0.62)';
  ctx.strokeStyle = 'rgba(60, 30, 20, 0.62)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  const ph = (t % 1.6) / 1.6; // 0..1
  const strike = ph < 0.5 ? Math.sin(ph * 2 * Math.PI) : 0; // A ataca
  const strike2 = ph >= 0.5 ? Math.sin((ph - 0.5) * 2 * Math.PI) : 0; // B ataca
  const fig = (x, dir, atk, kick, hit) => {
    const lean = -hit * 3 * dir;
    // corpo
    ctx.beginPath(); ctx.moveTo(x + lean, gy - 14); ctx.lineTo(x + lean * 1.4, gy - 28); ctx.stroke();
    // cabeça
    ctx.beginPath(); ctx.arc(x + lean * 1.6, gy - 33, 5, 0, Math.PI * 2); ctx.fill();
    // braço (soco) e perna (chute)
    ctx.beginPath();
    ctx.moveTo(x + lean * 1.4, gy - 25);
    ctx.lineTo(x + dir * (5 + (kick ? 0 : atk * 9)), gy - 24 - (kick ? 0 : atk * 2));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + lean, gy - 14);
    ctx.lineTo(x + dir * (kick ? 4 + atk * 12 : 3), gy - (kick ? atk * 12 : 0));
    ctx.moveTo(x + lean, gy - 14);
    ctx.lineTo(x - dir * 4, gy);
    ctx.stroke();
  };
  const kickA = Math.floor(t / 1.6) % 2 === 0;
  fig(mx - 11, 1, strike, kickA, strike2 * 0.8);
  fig(mx + 11, -1, strike2, !kickA, strike * 0.8);
}

// Selo flutuante + onomatopeias + "zzz". s = { live, fights, watchers, pops: [{text, x, y, born, rot}] }
export function drawDojoTop(ctx, d, s, t, nowMs) {
  const { x, y, w } = d;
  const cx = x + w / 2;
  ctx.save();
  if (s.live) {
    const label = `🥋 ${s.fights} ${s.fights === 1 ? 'luta' : 'lutas'} ao vivo${s.watchers ? ` · 👀 ${s.watchers}` : ''}`;
    ctx.font = `700 14px ${FONT}`;
    const bw = ctx.measureText(label).width + 22;
    const by = y - 58 + Math.sin(t * 2.5) * 3;
    roundRect(ctx, cx - bw / 2, by - 13, bw, 26, 13);
    fillStroke(ctx, '#fffdf6', 3);
    ctx.beginPath();
    ctx.moveTo(cx - 7, by + 12); ctx.lineTo(cx, by + 21); ctx.lineTo(cx + 7, by + 12);
    fillStroke(ctx, '#fffdf6', 3);
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect(cx - 6, by + 9, 12, 5);
    outlinedText(ctx, label, cx, by + 1, { size: 14, fill: INK, stroke: '#fffdf6', lw: 1 });
    // POW! KIAI! saindo do prédio
    for (const p of s.pops) {
      const age = (nowMs - p.born) / 1000;
      const k = age / 0.9;
      if (k >= 1) continue;
      const pop = k < 0.2 ? 0.5 + (k / 0.2) * 0.7 : 1.2 - Math.min(0.2, (k - 0.2) * 0.5);
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.translate(p.x, p.y - k * 18);
      ctx.rotate(p.rot);
      ctx.scale(pop, pop);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 ? 16 : 29;
        ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 0.85);
      }
      ctx.closePath();
      fillStroke(ctx, p.color, 2.5);
      outlinedText(ctx, p.text, 0, 0, { size: 18, fill: '#ffffff', lw: 4 });
      ctx.restore();
    }
  } else {
    // dojo dormindo
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.45 + i / 3) % 1);
      ctx.globalAlpha = Math.sin(k * Math.PI);
      outlinedText(ctx, 'z', cx + 16 + k * 26 + Math.sin(k * 6) * 4, y + 10 - k * 46, { size: 12 + k * 10, fill: '#c9d6ff', lw: 3 });
    }
  }
  ctx.restore();
}
