// Lutador de karatê no estilo recorte de papel: cabeção, faixa na testa (cor do
// gorro), quimono branco com faixa na cintura (cor do casaco), punhos de fora.
// Origem = pés (x, y). Desenhado olhando para a direita e espelhado com `dir`.
// As poses saem de poucos números (inclinação, punhos, pés), então trocar por
// sprites depois é só reimplementar `drawFighter` (ver docs/ASSETS.md).

import { blob, fillStroke, wobblyPoly, shade, boilFrame, hash, outlinedText, INK } from './paint.js';
import { MOVES } from '/shared/karate.js';

const GI = '#fbfbf4';
const GI_SHADE = '#dcdccf';
const SCALE = 1.12;

// 0 → 1 → 0 ao longo do golpe: estica na preparação, fica no ativo, recolhe na recuperação
function extension(m, t) {
  if (t < m.startup) return (t / m.startup) ** 1.6;
  if (t < m.startup + m.active) return 1;
  return Math.max(0, 1 - (t - m.startup - m.active) / m.recovery);
}

// Pose = números que o desenho genérico usa.
function poseOf(st, t, now, moving, phase) {
  const p = {
    lean: 0, drop: 0, hop: 0,
    ff: [15, -46], bf: [4, -40], // punho da frente / de trás
    fFoot: [13, 0], bFoot: [-13, 0],
    eyes: 'angry', mouth: 'grit', kickFront: false, lying: 0, trail: null,
  };
  const bob = Math.sin(now * 6) * 1.6;
  p.ff[1] += bob;
  p.bf[1] += bob;
  if (st === 'idle' || st === 'walk') {
    p.hop = moving ? Math.abs(Math.sin(phase)) * 6 : Math.abs(Math.sin(now * 5)) * 1.5;
    if (moving) {
      const l = Math.sin(phase) * 5;
      p.fFoot = [13 + l, -Math.max(0, l) * 0.6];
      p.bFoot = [-13 - l, -Math.max(0, -l) * 0.6];
    }
  } else if (st === 'block' || st === 'bstun') {
    p.ff = [17, -62];
    p.bf = [12, -52];
    p.drop = 4;
    p.lean = st === 'bstun' ? -0.12 : -0.04;
    p.eyes = 'squint';
  } else if (MOVES[st]) {
    const m = MOVES[st];
    const e = extension(m, t);
    const active = t >= m.startup && t < m.startup + m.active;
    p.mouth = active ? 'kiai' : 'grit';
    if (st === 'jab') {
      p.ff = [15 + 36 * e, -48];
      p.lean = 0.06 * e;
    } else if (st === 'punch') {
      p.bf = [4 + 50 * e, -46];
      p.ff = [10 - 6 * e, -38];
      p.lean = 0.16 * e;
      p.fFoot = [16 + 8 * e, 0];
      if (active) p.trail = 'punch';
    } else if (st === 'kick') {
      p.kickFront = true;
      p.fFoot = [12 + 58 * e, -14 - 10 * e];
      p.bFoot = [-8, 0];
      p.lean = -0.14 * e;
      p.ff = [8, -50];
      p.bf = [-6, -44];
    } else if (st === 'hkick') {
      p.kickFront = true;
      p.fFoot = [12 + 66 * e, -18 - 42 * e];
      p.bFoot = [-6, 0];
      p.lean = -0.34 * e;
      p.ff = [-4, -54];
      p.bf = [-18, -40];
      p.hop = 4 * e;
      if (active) p.trail = 'hkick';
    }
  } else if (st === 'dash') {
    p.lean = 0.32;
    p.fFoot = [18, -6];
    p.bFoot = [-22, -4];
    p.ff = [6, -40];
    p.bf = [-14, -34];
    p.hop = 3;
    p.mouth = 'o';
  } else if (st === 'hit') {
    p.lean = -0.26;
    p.ff = [-8, -60];
    p.bf = [-16, -50];
    p.eyes = 'x';
    p.mouth = 'o';
  } else if (st === 'stun') {
    p.lean = Math.sin(now * 8) * 0.14;
    p.ff = [12, -30];
    p.bf = [-10, -30];
    p.eyes = 'spiral';
    p.mouth = 'wavy';
  } else if (st === 'down') {
    p.lying = 1;
    p.eyes = 'x';
    p.mouth = 'o';
  } else if (st === 'getup') {
    p.lying = Math.max(0, 1 - t / 0.4);
    p.eyes = 'squint';
  } else if (st === 'ko') {
    p.lying = 1;
    p.eyes = 'x';
    p.mouth = 'wavy';
  } else if (st === 'win') {
    p.hop = Math.abs(Math.sin(now * 5)) * 12;
    p.ff = [12, -86];
    p.bf = [-10, -40];
    p.eyes = 'happy';
    p.mouth = 'smile';
  }
  return p;
}

/**
 * @param who { id, look: {hat, shirt, skin} }
 * @param st  { x, y, dir, st, t, moving, phase, now, flash, slow, alpha }
 */
export function drawFighter(ctx, who, st) {
  const { look } = who;
  const now = st.now;
  const frame = boilFrame(now);
  const seed = who.id * 37 + 11;
  const dir = st.dir || 1;
  const p = poseOf(st.st, st.t, now, st.moving, st.phase || 0);

  ctx.save();
  ctx.translate(st.x, st.y);
  if (st.alpha != null) ctx.globalAlpha = st.alpha;

  // sombra
  ctx.fillStyle = 'rgba(40,25,10,0.22)';
  ctx.beginPath();
  ctx.ellipse(p.lying ? dir * -20 * p.lying : 0, 2, 22 + p.lying * 18 - p.hop * 0.2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(dir * SCALE, SCALE);
  ctx.translate(0, -p.hop + p.drop);
  // deitado: gira para trás em volta dos pés
  if (p.lying) {
    ctx.translate(-8 * p.lying, -4 * p.lying);
    ctx.rotate(-p.lying * Math.PI * 0.47);
  }
  ctx.rotate(p.lean);

  const hipF = [5, -20];
  const hipB = [-5, -20];
  const shF = [7, -44];
  const shB = [-6, -44];

  // rastro do golpe forte
  if (p.trail === 'hkick') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, -24, 74, -1.1, 0.25);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,225,77,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -24, 64, -1.0, 0.2);
    ctx.stroke();
    ctx.restore();
  } else if (p.trail === 'punch') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    for (const dy of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.moveTo(14, -46 + dy);
      ctx.lineTo(36, -46 + dy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // perna de trás, braço de trás
  limb(ctx, hipB, p.bFoot, GI_SHADE, 11, 0.25);
  foot(ctx, p.bFoot, look.skin, seed + 1, frame);
  limb(ctx, shB, p.bf, GI_SHADE, 9, -0.2);
  fist(ctx, p.bf, look.skin, seed + 2, frame);

  // perna da frente atrás do tronco (quando não está chutando)
  if (!p.kickFront) {
    limb(ctx, hipF, p.fFoot, GI, 11, 0.25);
    foot(ctx, p.fFoot, look.skin, seed + 3, frame);
  }

  // tronco: quimono com faixa
  wobblyPoly(ctx, [[-14, -50], [14, -50], [17, -14], [-17, -14]], seed + 4, 1.1, frame);
  fillStroke(ctx, GI, 3);
  ctx.strokeStyle = GI_SHADE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-9, -49);
  ctx.lineTo(4, -30);
  ctx.lineTo(9, -49);
  ctx.stroke();
  wobblyPoly(ctx, [[-17, -27], [17, -27], [17.5, -20], [-17.5, -20]], seed + 5, 0.6, frame);
  fillStroke(ctx, look.shirt, 2.5);
  // pontas da faixa
  const flap = Math.sin(now * 9 + seed) * 2;
  wobblyPoly(ctx, [[-4, -22], [-9, -9 + flap], [-4, -8 + flap], [0, -21]], seed + 6, 0.5, frame);
  fillStroke(ctx, shade(look.shirt, -0.08), 2);

  if (p.kickFront) {
    limb(ctx, hipF, p.fFoot, GI, 12, -0.1);
    foot(ctx, p.fFoot, look.skin, seed + 3, frame);
  }

  // cabeça
  const hy = -70;
  blob(ctx, 0, hy, 25, 22, seed + 8, 0.02, frame);
  fillStroke(ctx, look.skin, 3);
  // cabelo espetado no topo (cartoon)
  wobblyPoly(ctx, [[-20, hy - 12], [-12, hy - 27], [-4, hy - 18], [3, hy - 29], [10, hy - 18], [19, hy - 25], [22, hy - 10]], seed + 9, 1, frame);
  fillStroke(ctx, '#3b2a1e', 2.5);
  // faixa na testa (hachimaki) com as pontas voando para trás
  wobblyPoly(ctx, [[-26, hy - 12], [26, hy - 12], [25, hy - 4], [-25, hy - 4]], seed + 10, 0.6, frame);
  fillStroke(ctx, look.hat, 2.5);
  const wind = st.st === 'dash' ? 6 : 0;
  for (const k of [0, 1]) {
    const w = Math.sin(now * 10 + k * 1.7 + seed) * 3;
    wobblyPoly(ctx, [[-24, hy - 9], [-40 - wind - k * 4, hy - 14 + k * 10 + w], [-37 - wind - k * 4, hy - 6 + k * 10 + w], [-23, hy - 6]], seed + 11 + k, 0.6, frame);
    fillStroke(ctx, shade(look.hat, -0.1), 2);
  }
  ctx.fillStyle = '#e8412b';
  ctx.beginPath();
  ctx.arc(0, hy - 8, 3, 0, Math.PI * 2);
  ctx.fill();

  drawFace(ctx, p, hy, seed, now, frame);

  // braço da frente por cima de tudo
  limb(ctx, shF, p.ff, GI, 9, -0.2);
  fist(ctx, p.ff, look.skin, seed + 12, frame);

  // flash branco ao levar golpe
  if (st.flash > 0) {
    ctx.globalAlpha = Math.min(1, st.flash) * 0.75;
    blob(ctx, 0, -40, 30, 48, seed, 0.05, frame);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();

  // estrelinhas de tontura em volta da cabeça
  if (st.st === 'stun' || st.st === 'ko') {
    const top = st.st === 'ko' ? st.y - 30 : st.y - 108 * SCALE;
    const cx = st.st === 'ko' ? st.x - dir * 70 : st.x;
    for (let i = 0; i < 3; i++) {
      const a = now * 5 + (i / 3) * Math.PI * 2;
      outlinedText(ctx, '★', cx + Math.cos(a) * 26, top + Math.sin(a) * 8, { size: 16, fill: '#ffe14d', lw: 3 });
    }
  }
  // perna machucada (lento)
  if (st.slow > 0 && st.st !== 'ko') {
    outlinedText(ctx, '🦵💫', st.x - dir * 20, st.y - 8 + Math.sin(now * 8) * 2, { size: 13, lw: 2 });
  }
}

function drawFace(ctx, p, hy, seed, now, frame) {
  const blink = p.eyes === 'angry' && hash(seed, Math.floor(now * 0.6)) < 0.15 && (now * 0.6) % 1 < 0.1;
  for (const ex of [-6, 9]) {
    const cx = ex + 3;
    const cy = hy + 3;
    if (p.eyes === 'x') {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5);
      ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5);
      ctx.stroke();
      continue;
    }
    if (p.eyes === 'happy' || blink || p.eyes === 'squint') {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (p.eyes === 'happy') ctx.arc(cx, cy + 2, 5, Math.PI * 1.1, Math.PI * 1.9);
      else { ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); }
      ctx.stroke();
      continue;
    }
    blob(ctx, cx, cy, 8, 8.5, seed + 13 + ex, 0.04, frame, 14);
    fillStroke(ctx, '#ffffff', 2);
    if (p.eyes === 'spiral') {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let a = 0; a < 10; a += 0.4) {
        const r = a * 0.6;
        const ang = a + now * 8;
        ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(cx + 2.5, cy + 1, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // sobrancelhas bravas
  if (p.eyes === 'angry' || p.eyes === 'squint') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-11, hy - 8); ctx.lineTo(-1, hy - 4);
    ctx.moveTo(6, hy - 4); ctx.lineTo(18, hy - 9);
    ctx.stroke();
  }
  // boca
  const mx = 6;
  const my = hy + 15;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  if (p.mouth === 'kiai') {
    ctx.fillStyle = '#5a1a1a';
    ctx.beginPath();
    ctx.ellipse(mx, my, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (p.mouth === 'o') {
    ctx.beginPath();
    ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.mouth === 'wavy') {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) ctx.lineTo(mx - 6 + i * 2, my + (i % 2 ? 2 : -1));
    ctx.stroke();
  } else if (p.mouth === 'smile') {
    ctx.fillStyle = '#5a1a1a';
    ctx.beginPath();
    ctx.arc(mx, my - 2, 6, 0.1, Math.PI - 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // dentes cerrados
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx - 6, my - 2.5, 12, 5);
    ctx.strokeRect(mx - 6, my - 2.5, 12, 5);
    ctx.beginPath();
    ctx.moveTo(mx - 6, my); ctx.lineTo(mx + 6, my);
    ctx.stroke();
  }
}

// braço/perna "mangueira": contorno grosso + recheio, com leve curva
function limb(ctx, [ax, ay], [bx, by], color, w, bend) {
  const mx = (ax + bx) / 2 - (by - ay) * bend * 0.3;
  const my = (ay + by) / 2 + (bx - ax) * bend * 0.3;
  ctx.lineCap = 'round';
  for (const [lw, c] of [[w + 5, INK], [w, color]]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx, my, bx, by);
    ctx.stroke();
  }
}

function fist(ctx, [x, y], skin, seed, frame) {
  blob(ctx, x, y, 6.5, 6, seed, 0.08, frame, 10);
  fillStroke(ctx, skin, 2.5);
}

function foot(ctx, [x, y], skin, seed, frame) {
  blob(ctx, x + 3, y - 3, 8, 4.5, seed, 0.06, frame, 12);
  fillStroke(ctx, skin, 2.5);
}

// topo da cabeça (para nick/balão)
export const FIGHTER_TOP = -128;
