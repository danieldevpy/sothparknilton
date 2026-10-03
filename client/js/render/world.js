// Desenho do mapa: fundo estático pré-renderizado (uma vez) + objetos
// "sprite" ordenados por Y junto com os players (efeito de profundidade).

import { MAP } from '/shared/map.js';
import { BALL_RADIUS } from '/shared/constants.js';
import { blob, wobblyPoly, fillStroke, roundRect, rng, outlinedText, boilFrame, INK, FONT } from './paint.js';
import { drawDojoBuilding } from './dojohouse.js';
import { drawGymBuilding } from './gymhouse.js';

const SNOW = '#f3f6fb';
const PATH = '#dcd3c2';
const STONE = '#cbc4b6';
const WATER = '#4aa3df';

// ---------------- fundo estático ----------------

export function prerenderBackground(map = MAP) {
  const cv = document.createElement('canvas');
  cv.width = map.width;
  cv.height = map.height;
  const ctx = cv.getContext('2d');
  const R = rng(1234);

  // céu
  const sky = ctx.createLinearGradient(0, 0, 0, 260);
  sky.addColorStop(0, '#8fcdf3');
  sky.addColorStop(1, '#d4eefb');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, map.width, 300);

  // montanhas
  const mountains = [[-100, 260, 300, 40], [250, 260, 380, 10], [700, 260, 300, 60], [1050, 260, 420, 0], [1500, 260, 340, 30], [1850, 260, 300, 50]];
  mountains.forEach(([x, base, w, top], i) => {
    const peak = [x + w / 2, top];
    wobblyPoly(ctx, [[x, base], peak, [x + w, base]], 50 + i, 3);
    fillStroke(ctx, i % 2 ? '#7d9fb8' : '#8eb0c6', 3);
    // neve no topo
    const k = 0.32;
    wobblyPoly(ctx, [
      [peak[0] - (w / 2) * k, top + (base - top) * k],
      peak,
      [peak[0] + (w / 2) * k, top + (base - top) * k],
      [peak[0] + (w / 2) * k * 0.4, top + (base - top) * k * 0.8],
      [peak[0], top + (base - top) * k * 1.1],
      [peak[0] - (w / 2) * k * 0.5, top + (base - top) * k * 0.85],
    ], 80 + i, 2);
    fillStroke(ctx, '#ffffff', 2.5);
  });

  // fileira de pinheiros ao fundo
  for (let x = -20; x < map.width + 40; x += 34 + R() * 20) {
    const h = 50 + R() * 30;
    const y = 250 + R() * 12;
    wobblyPoly(ctx, [[x - 18, y], [x, y - h], [x + 18, y]], x | 0, 1.5);
    fillStroke(ctx, R() > 0.5 ? '#2f6b45' : '#3b7d52', 2);
  }

  // chão de neve (borda ondulada)
  ctx.beginPath();
  ctx.moveTo(0, map.height);
  ctx.lineTo(0, 262);
  for (let x = 0; x <= map.width; x += 40) ctx.lineTo(x, 258 + Math.sin(x * 0.02) * 6 + R() * 4);
  ctx.lineTo(map.width, map.height);
  ctx.closePath();
  fillStroke(ctx, SNOW, 3);

  // casas
  map.houses.forEach((h, i) => drawHouse(ctx, h, i));
  if (map.dojo) drawDojoBuilding(ctx, map.dojo);
  if (map.gym) drawGymBuilding(ctx, map.gym);

  // pontinhos de textura na neve
  for (let i = 0; i < 900; i++) {
    const x = R() * map.width;
    const y = 280 + R() * (map.height - 280);
    ctx.fillStyle = R() > 0.5 ? 'rgba(150,170,200,0.25)' : 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(x, y, 2 + R() * 4, 1 + R() * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // caminhos
  const paths = [
    [[1000, 1310], [1000, 980], [1000, 760]],
    [[1000, 640], [740, 650], [600, 640]],
    [[1000, 640], [1340, 650]],
    [[1000, 640], [1000, 320]],
    [[1000, 1000], [1400, 1080], [2010, 1060]],
    [[1000, 1000], [520, 1050], [-10, 1030]],
  ];
  for (const [lw, color] of [[86, INK], [78, PATH]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const p of paths) {
      ctx.beginPath();
      p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  }

  // praça de pedra
  const f = map.fountain;
  blob(ctx, f.x, f.y + 20, 290, 230, 9, 0.02);
  fillStroke(ctx, STONE, 4);
  ctx.strokeStyle = 'rgba(80,70,60,0.18)';
  ctx.lineWidth = 2;
  for (let r = 140; r < 290; r += 50) {
    ctx.beginPath();
    ctx.ellipse(f.x, f.y + 20, r, r * 0.79, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
    ctx.beginPath();
    ctx.moveTo(f.x + Math.cos(a) * 130, f.y + 20 + Math.sin(a) * 103);
    ctx.lineTo(f.x + Math.cos(a) * 285, f.y + 20 + Math.sin(a) * 225);
    ctx.stroke();
  }

  drawLake(ctx, map, R);
  drawField(ctx, map);
  return cv;
}

function drawHouse(ctx, h, i) {
  const { x, y, w, h: hh } = h;
  wobblyPoly(ctx, [[x, y + 40], [x + w, y + 40], [x + w, y + hh], [x, y + hh]], 200 + i, 1.5);
  fillStroke(ctx, h.color, 3);
  wobblyPoly(ctx, [[x - 18, y + 46], [x + w / 2, y - 18], [x + w + 18, y + 46]], 210 + i, 2);
  fillStroke(ctx, h.roof, 3);
  // neve no telhado
  wobblyPoly(ctx, [[x + w * 0.22, y + 14], [x + w / 2, y - 18], [x + w * 0.78, y + 14], [x + w * 0.6, y + 8], [x + w * 0.45, y + 16]], 220 + i, 2);
  fillStroke(ctx, '#ffffff', 2.5);
  // porta e janelas
  wobblyPoly(ctx, [[x + w / 2 - 16, y + hh], [x + w / 2 - 16, y + hh - 50], [x + w / 2 + 16, y + hh - 50], [x + w / 2 + 16, y + hh]], 230 + i, 1);
  fillStroke(ctx, '#7a4a2a', 3);
  for (const wx of [x + 22, x + w - 62]) {
    wobblyPoly(ctx, [[wx, y + 60], [wx + 40, y + 60], [wx + 40, y + 95], [wx, y + 95]], 240 + i + wx, 1);
    fillStroke(ctx, '#ffe9a0', 3);
    ctx.beginPath();
    ctx.moveTo(wx + 20, y + 60);
    ctx.lineTo(wx + 20, y + 95);
    ctx.moveTo(wx, y + 77);
    ctx.lineTo(wx + 40, y + 77);
    ctx.stroke();
  }
}

function drawLake(ctx, map, R) {
  const l = map.lake;
  // margem de gelo
  blob(ctx, l.x, l.y, l.rx + 16, l.ry + 14, 300, 0.03);
  fillStroke(ctx, '#e3f1fb', 3);
  blob(ctx, l.x, l.y, l.rx, l.ry, 301, 0.025);
  fillStroke(ctx, WATER, 4);
  blob(ctx, l.x - 20, l.y - 15, l.rx * 0.78, l.ry * 0.7, 302, 0.04);
  fillStroke(ctx, '#5bb3ea', 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const a = R() * Math.PI * 2;
    const r = R() * 0.75;
    const x = l.x + Math.cos(a) * l.rx * r;
    const y = l.y + Math.sin(a) * l.ry * r;
    ctx.beginPath();
    ctx.moveTo(x - 12, y);
    ctx.quadraticCurveTo(x, y - 5, x + 12, y);
    ctx.stroke();
  }
  // pedras na margem
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2;
    if (Math.abs(a) < 0.25) continue; // não cobre o píer
    blob(ctx, l.x + Math.cos(a) * (l.rx + 12), l.y + Math.sin(a) * (l.ry + 10), 12, 8, 310 + i, 0.15, 0, 9);
    fillStroke(ctx, '#9a9a9a', 2.5);
  }
  // píer
  const d = map.dock;
  wobblyPoly(ctx, [[d.x, d.y], [d.x + d.w, d.y], [d.x + d.w, d.y + d.h], [d.x, d.y + d.h]], 320, 1);
  fillStroke(ctx, '#a8743f', 3);
  ctx.strokeStyle = '#6e4622';
  ctx.lineWidth = 2;
  for (let x = d.x + 17; x < d.x + d.w; x += 17) {
    ctx.beginPath();
    ctx.moveTo(x, d.y + 2);
    ctx.lineTo(x, d.y + d.h - 2);
    ctx.stroke();
  }
}

function drawField(ctx, map) {
  const f = map.field;
  const mid = f.y + f.h / 2;
  const gm = map.goalMouth;
  const gd = map.goalDepth;
  // gramado com listras
  wobblyPoly(ctx, [[f.x - 14, f.y - 14], [f.x + f.w + 14, f.y - 14], [f.x + f.w + 14, f.y + f.h + 14], [f.x - 14, f.y + f.h + 14]], 400, 2);
  fillStroke(ctx, '#4f9e4f', 3);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#5cb85c' : '#55ad55';
    ctx.fillRect(f.x + (i * f.w) / 8, f.y, f.w / 8, f.h);
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(f.x, f.y, f.w, f.h);
  ctx.beginPath();
  ctx.moveTo(f.x + f.w / 2, f.y);
  ctx.lineTo(f.x + f.w / 2, f.y + f.h);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(f.x + f.w / 2, mid, 60, 60, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(f.x, mid - 120, 90, 240);
  ctx.strokeRect(f.x + f.w - 90, mid - 120, 90, 240);
  // gols (rede)
  for (const [gx, color] of [[f.x - gd, '#e8412b'], [f.x + f.w, '#3a6fd8']]) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(gx, mid - gm, gd, gm * 2);
    ctx.strokeStyle = 'rgba(80,80,80,0.5)';
    ctx.lineWidth = 1;
    for (let y = mid - gm; y <= mid + gm; y += 10) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx + gd, y);
      ctx.stroke();
    }
    for (let x = gx; x <= gx + gd; x += 9) {
      ctx.beginPath();
      ctx.moveTo(x, mid - gm);
      ctx.lineTo(x, mid + gm);
      ctx.stroke();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.strokeRect(gx, mid - gm, gd, gm * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(gx, mid - gm, gd, gm * 2);
  }
}

// ---------------- sprites dinâmicos ----------------

export function duckPositions(t, map = MAP) {
  const l = map.lake;
  const out = [];
  for (let i = 0; i < 3; i++) {
    const sp = 0.07 + i * 0.025;
    const a = t * sp * (i % 2 ? -1 : 1) + i * 2.1;
    const k = 0.45 + i * 0.13;
    const x = l.x + Math.cos(a) * l.rx * k + Math.sin(t * 0.5 + i) * 10;
    const y = l.y + Math.sin(a) * l.ry * k;
    const dx = -Math.sin(a) * (i % 2 ? -1 : 1);
    out.push({ i, x, y, dir: dx >= 0 ? 1 : -1 });
  }
  return out;
}

// Monta a lista de objetos do mapa como {y, draw(ctx, t)} para ordenação.
export function mapSprites(map, world) {
  const list = [];
  for (const tr of map.trees) list.push({ y: tr.y, draw: (ctx, t) => drawTree(ctx, tr, t) });
  for (const b of map.benches) list.push({ y: b.y, draw: (ctx, t) => drawBench(ctx, b, t, world.hover === b.id) });
  for (const l of map.lamps) list.push({ y: l.y, draw: (ctx, t) => drawLamp(ctx, l, t, world.lamps[l.id] !== false, world.hover === l.id) });
  for (const s of map.signs) list.push({ y: s.y, draw: (ctx, t) => drawSign(ctx, s, t) });
  list.push({ y: map.fountain.y + 45, draw: (ctx, t) => drawFountain(ctx, map.fountain, t, world.hover === 'fountain') });
  list.push({ y: map.bleachers.y + map.bleachers.h, draw: (ctx, t) => drawBleachers(ctx, map.bleachers, t, world.score) });
  return list;
}

function hoverGlow(ctx, on) {
  if (!on) return;
  ctx.shadowColor = '#ffe14d';
  ctx.shadowBlur = 18;
}

function drawTree(ctx, tr, t) {
  const fr = boilFrame(t);
  const { x, y } = tr;
  const s = tr.id.length * 13;
  wobblyPoly(ctx, [[x - 7, y], [x + 7, y], [x + 7, y - 26], [x - 7, y - 26]], s, 1, fr);
  fillStroke(ctx, '#7a4a2a', 3);
  const layers = [[y - 20, 42, 40], [y - 50, 34, 38], [y - 78, 25, 36]];
  layers.forEach(([by, w, h], i) => {
    wobblyPoly(ctx, [[x - w, by], [x, by - h], [x + w, by]], s + i * 3, 1.5, fr);
    fillStroke(ctx, '#2f7a4a', 3);
    wobblyPoly(ctx, [[x - w * 0.35, by - h * 0.62], [x, by - h], [x + w * 0.35, by - h * 0.62], [x, by - h * 0.55]], s + i * 5, 1, fr);
    fillStroke(ctx, '#ffffff', 2);
  });
}

function drawBench(ctx, b, t, hover) {
  const fr = boilFrame(t);
  const { x, y } = b;
  ctx.save();
  hoverGlow(ctx, hover);
  // encosto
  wobblyPoly(ctx, [[x - 56, y - 44], [x + 56, y - 44], [x + 56, y - 28], [x - 56, y - 28]], x + 1, 1, fr);
  fillStroke(ctx, '#b07a43', 3);
  // assento
  wobblyPoly(ctx, [[x - 58, y - 16], [x + 58, y - 16], [x + 54, y - 4], [x - 54, y - 4]], x + 2, 1, fr);
  fillStroke(ctx, '#c58c50', 3);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  for (const lx of [-46, 46]) {
    ctx.beginPath();
    ctx.moveTo(x + lx, y - 28);
    ctx.lineTo(x + lx, y - 16);
    ctx.moveTo(x + lx, y - 4);
    ctx.lineTo(x + lx, y + 6);
    ctx.stroke();
  }
}

function drawLamp(ctx, l, t, on, hover) {
  const { x, y } = l;
  if (on) {
    const g = ctx.createRadialGradient(x, y - 4, 4, x, y - 4, 80);
    g.addColorStop(0, 'rgba(255,230,120,0.45)');
    g.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, 80, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  hoverGlow(ctx, hover);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 92);
  ctx.stroke();
  wobblyPoly(ctx, [[x - 13, y - 92], [x + 13, y - 92], [x + 9, y - 114], [x - 9, y - 114]], x, 1, boilFrame(t));
  fillStroke(ctx, on ? '#ffe36b' : '#8d8d8d', 3);
  ctx.restore();
  if (on) {
    ctx.fillStyle = 'rgba(255,240,150,0.35)';
    ctx.beginPath();
    ctx.arc(x, y - 103, 24 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSign(ctx, s, t) {
  const fr = boilFrame(t);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x, s.y - 50);
  ctx.stroke();
  ctx.font = `700 16px ${FONT}`;
  const w = ctx.measureText(s.text).width + 26;
  wobblyPoly(ctx, [[s.x - w / 2, s.y - 78], [s.x + w / 2, s.y - 78], [s.x + w / 2, s.y - 48], [s.x - w / 2, s.y - 48]], s.x, 1.2, fr);
  fillStroke(ctx, '#d9a066', 3);
  outlinedText(ctx, s.text, s.x, s.y - 63, { size: 16, fill: '#3b2412', stroke: 'transparent', lw: 0 });
}

function drawFountain(ctx, f, t, hover) {
  const fr = boilFrame(t);
  const { x, y } = f;
  ctx.save();
  hoverGlow(ctx, hover);
  blob(ctx, x, y + 6, 92, 52, 500, 0.02, fr);
  fillStroke(ctx, '#a9a39a', 4);
  ctx.restore();
  blob(ctx, x, y + 2, 76, 38, 501, 0.03, fr);
  fillStroke(ctx, WATER, 3);
  // ondinhas
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const r = ((t * 20 + i * 22) % 66) + 6;
    ctx.globalAlpha = 1 - r / 72;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  wobblyPoly(ctx, [[x - 10, y + 4], [x + 10, y + 4], [x + 8, y - 58], [x - 8, y - 58]], 502, 1, fr);
  fillStroke(ctx, '#b9b3aa', 3);
  blob(ctx, x, y - 60, 34, 11, 503, 0.04, fr);
  fillStroke(ctx, '#b9b3aa', 3);
  blob(ctx, x, y - 82, 7, 10, 504, 0.08, fr, 10);
  fillStroke(ctx, '#b9b3aa', 3);
  // jato d'água
  ctx.fillStyle = '#7cc8f2';
  for (let i = 0; i < 14; i++) {
    const k = ((t * 0.9 + i / 14) % 1);
    const side = i % 2 ? 1 : -1;
    const px = x + side * k * 38;
    const py = y - 92 - Math.sin(k * Math.PI) * 26 + k * 34;
    ctx.beginPath();
    ctx.arc(px, py, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBleachers(ctx, b, t, score) {
  const fr = boilFrame(t);
  for (let i = 0; i < 3; i++) {
    const yy = b.y + b.h - 18 - i * 22;
    wobblyPoly(ctx, [[b.x + i * 12, yy - 18], [b.x + b.w - i * 12, yy - 18], [b.x + b.w - i * 12, yy + 18], [b.x + i * 12, yy + 18]], 600 + i, 1, fr);
    fillStroke(ctx, i % 2 ? '#c58c50' : '#b07a43', 3);
  }
  // placar
  const cx = b.x + b.w / 2;
  const top = b.y - 100;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx - 60, b.y - 20);
  ctx.lineTo(cx - 60, top + 40);
  ctx.moveTo(cx + 60, b.y - 20);
  ctx.lineTo(cx + 60, top + 40);
  ctx.stroke();
  roundRect(ctx, cx - 110, top - 10, 220, 58, 8);
  fillStroke(ctx, '#2b2b2b', 4);
  outlinedText(ctx, `${score.red}`, cx - 60, top + 19, { size: 30, fill: '#ff5a44', lw: 0 });
  outlinedText(ctx, 'x', cx, top + 19, { size: 22, fill: '#fff', lw: 0 });
  outlinedText(ctx, `${score.blue}`, cx + 60, top + 19, { size: 30, fill: '#5b8cff', lw: 0 });
}

export function drawBall(ctx, x, y, t, hover, z = 0) {
  const sh = Math.max(0.4, 1 - z / 160); // sombra encolhe quando a bola sobe
  ctx.fillStyle = 'rgba(30,40,60,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, BALL_RADIUS * sh, 4 * sh, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  hoverGlow(ctx, hover);
  const cy = y - BALL_RADIUS - z;
  blob(ctx, x, cy, BALL_RADIUS, BALL_RADIUS, 700, 0.05, boilFrame(t), 14);
  fillStroke(ctx, '#ffffff', 2.5);
  ctx.restore();
  const rot = (x + y) * 0.08; // gira conforme anda
  ctx.fillStyle = INK;
  for (let i = 0; i < 3; i++) {
    const a = rot + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 5.5, cy + Math.sin(a) * 5.5, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawDuck(ctx, d, t, hopT = 0) {
  const fr = boilFrame(t);
  const bob = Math.sin(t * 3 + d.i) * 1.5 - Math.sin(Math.min(1, hopT) * Math.PI) * 18;
  const { x } = d;
  const y = d.y + bob;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y + 4, 20, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(d.dir, 1);
  blob(ctx, 0, -6, 15, 9, 800 + d.i, 0.06, fr, 14);
  fillStroke(ctx, '#ffd23f', 2.5);
  blob(ctx, 9, -18, 8, 8, 810 + d.i, 0.06, fr, 12);
  fillStroke(ctx, '#ffd23f', 2.5);
  wobblyPoly(ctx, [[15, -19], [24, -17], [15, -14]], 820 + d.i, 0.5, fr);
  fillStroke(ctx, '#ff8a1f', 2);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(11, -20, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawDestination(ctx, x, y, age) {
  if (age > 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - age;
  ctx.strokeStyle = '#e8412b';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const s = 8 + age * 4;
  ctx.beginPath();
  ctx.moveTo(x - s, y - s * 0.5);
  ctx.lineTo(x + s, y + s * 0.5);
  ctx.moveTo(x + s, y - s * 0.5);
  ctx.lineTo(x - s, y + s * 0.5);
  ctx.stroke();
  ctx.restore();
}

