// Sala de aula da Corrida das Perguntas (coordenadas da cena, não do mapa da praça).
// Parede de -WALL a 0 (lousa, alfabeto, relógio, janelas com neve, bandeira do tema), chão de madeira e as
// pistas: cada corredor tem a sua, com casas numeradas de "tabuleiro" da largada até a chegada (🏆).
// Tudo procedural, no mesmo traço "papel recortado" da praça (render/paint.js).

import { blob, wobblyPoly, fillStroke, roundRect, outlinedText, boilFrame, shade, rng, INK, FONT } from './paint.js';

export const SCENE = {
  W: 1240,
  WALL: 250, // a parede vai de -WALL até 0
  FLOOR: 560, // o chão vai de 0 até FLOOR
  START_X: 210, // casa 0 (largada)
  END_X: 1060, // chegada
  LANE_Y0: 96, // pés de quem corre na pista 0
  LANE_H: 80,
  SCALE: 0.84, // bonecos um pouco menores que na praça (cabem 6 pistas sem um tapar o outro)
  TEACHER: { x: 985, y: 46 }, // na frente da parede, ao lado da lousa
  BENCH_Y: 30, // pés da plateia sentada (fila de trás, encostada na parede)
};
export const LANE_COLORS = ['#e8412b', '#3a6fd8', '#2e9e48', '#f2a81e', '#8a4fc7', '#20b8a0'];

export const laneY = (lane) => SCENE.LANE_Y0 + lane * SCENE.LANE_H;
export const squareW = (len) => (SCENE.END_X - SCENE.START_X) / len;
export const squareX = (pos, len) => SCENE.START_X + pos * squareW(len);

const BOARD = '#2f5d46';
const CHALK = '#f4f1e6';

// ---------------- fundo (pré-renderizado) ----------------

export function prerenderClassroom() {
  const cv = document.createElement('canvas');
  cv.width = SCENE.W;
  cv.height = SCENE.WALL + SCENE.FLOOR;
  const ctx = cv.getContext('2d');
  const R = rng(4242);
  ctx.translate(0, SCENE.WALL);
  ctx.lineJoin = 'round';

  // parede
  ctx.fillStyle = '#efe6c8';
  ctx.fillRect(0, -SCENE.WALL, SCENE.W, SCENE.WALL);
  ctx.strokeStyle = 'rgba(160,140,90,0.18)';
  ctx.lineWidth = 2;
  for (let x = 0; x < SCENE.W; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, -SCENE.WALL);
    ctx.lineTo(x, -66);
    ctx.stroke();
  }
  // lambri de madeira
  ctx.fillStyle = '#a77d4f';
  ctx.fillRect(0, -66, SCENE.W, 66);
  ctx.strokeStyle = '#86603a';
  for (let x = 12; x < SCENE.W; x += 38) {
    ctx.strokeRect(x, -58, 30, 50);
  }
  ctx.fillStyle = '#7a5530';
  ctx.fillRect(0, -70, SCENE.W, 7);

  // janelas com neve (esquerda)
  for (const wx of [24, 120]) {
    roundRect(ctx, wx, -214, 84, 118, 4);
    fillStroke(ctx, '#bfe3f7', 4);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.arc(wx + 6 + R() * 72, -208 + R() * 100, 1.5 + R() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    wobblyPoly(ctx, [[wx + 10, -98], [wx + 30, -150], [wx + 50, -98]], wx, 1.5);
    fillStroke(ctx, '#2f7a4a', 2.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx + 2, -106, 80, 8);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wx + 42, -214);
    ctx.lineTo(wx + 42, -96);
    ctx.moveTo(wx, -156);
    ctx.lineTo(wx + 84, -156);
    ctx.stroke();
  }

  // alfabeto em cima da lousa
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < letters.length; i++) {
    const x = 282 + i * 26;
    roundRect(ctx, x, -244, 22, 26, 3);
    fillStroke(ctx, ['#ffd9c9', '#d6f5dc', '#d9f0ff', '#fff1a8'][i % 4], 2);
    outlinedText(ctx, `${letters[i]}${letters[i].toLowerCase()}`, x + 11, -231, { size: 11, fill: INK, stroke: 'transparent', lw: 0 });
  }

  // lousa
  roundRect(ctx, 300, -212, 640, 136, 6);
  fillStroke(ctx, '#8a5a2b', 4);
  roundRect(ctx, 312, -202, 616, 116, 3);
  fillStroke(ctx, BOARD, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 9; i++) ctx.fillRect(316 + R() * 560, -198 + R() * 100, 60 + R() * 90, 4 + R() * 8); // marca de apagador
  chalk(ctx, 'English Class', 620, -178, 26);
  chalk(ctx, 'Hello = Olá', 410, -140, 16);
  chalk(ctx, 'I am · you are · he is', 620, -138, 15);
  chalk(ctx, 'go → went → gone', 830, -140, 15);
  chalk(ctx, 'Have fun! :)', 820, -106, 15);
  // maçã do professor no cantinho
  blob(ctx, 352, -106, 9, 8, 77, 0.06);
  fillStroke(ctx, '#e8412b', 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(352, -114);
  ctx.lineTo(354, -120);
  ctx.stroke();
  // bandeja de giz
  ctx.fillStyle = '#6e4622';
  ctx.fillRect(306, -80, 628, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(420, -84, 14, 4);
  ctx.fillStyle = '#ffd9e6';
  ctx.fillRect(452, -84, 12, 4);

  // relógio
  blob(ctx, 1010, -168, 26, 26, 91, 0.02);
  fillStroke(ctx, '#ffffff', 4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(1010, -168);
  ctx.lineTo(1010, -186);
  ctx.moveTo(1010, -168);
  ctx.lineTo(1022, -162);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(1010 + Math.cos(a) * 20, -168 + Math.sin(a) * 20, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // cartazes
  roundRect(ctx, 960, -128, 92, 48, 4);
  fillStroke(ctx, '#fff6d6', 3);
  outlinedText(ctx, 'ABC', 1006, -112, { size: 16, fill: '#e8412b', stroke: 'transparent', lw: 0 });
  outlinedText(ctx, '123', 1006, -94, { size: 14, fill: '#3a6fd8', stroke: 'transparent', lw: 0 });

  // chão de madeira
  ctx.fillStyle = '#c99a63';
  ctx.fillRect(0, 0, SCENE.W, SCENE.FLOOR);
  ctx.strokeStyle = 'rgba(110,70,34,0.35)';
  ctx.lineWidth = 2;
  for (let y = 18; y < SCENE.FLOOR; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SCENE.W, y);
    ctx.stroke();
    const off = (y / 30) % 2 ? 0 : 80;
    for (let x = off; x < SCENE.W; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 30);
      ctx.stroke();
    }
  }
  // sombra da parede no chão
  const g = ctx.createLinearGradient(0, 0, 0, 40);
  g.addColorStop(0, 'rgba(60,40,20,0.35)');
  g.addColorStop(1, 'rgba(60,40,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SCENE.W, 40);

  // banco comprido da plateia, encostado na parede
  roundRect(ctx, 20, SCENE.BENCH_Y - 12, SCENE.W - 40, 12, 4);
  fillStroke(ctx, '#8a5a2b', 2.5);
  return cv;
}

function chalk(ctx, text, x, y, size) {
  ctx.save();
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CHALK;
  ctx.globalAlpha = 0.85;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ---------------- pistas (pré-renderizadas por len + pistas usadas) ----------------

const trackCache = new Map();

// lanes: [{ lane, color }]
export function trackCanvas(len, lanes, gifts) {
  const key = `${len}:${lanes.map((l) => `${l.lane}${l.color}`).join(',')}`;
  if (trackCache.has(key)) return trackCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = SCENE.W;
  cv.height = SCENE.FLOOR;
  const ctx = cv.getContext('2d');
  ctx.lineJoin = 'round';
  const sq = squareW(len);
  for (const { lane, color } of lanes) {
    const y = laneY(lane);
    // tira da pista
    wobblyPoly(ctx, [[SCENE.START_X - 92, y - 28], [SCENE.END_X + 44, y - 28], [SCENE.END_X + 48, y + 10], [SCENE.START_X - 96, y + 10]], 900 + lane, 1.5);
    fillStroke(ctx, shade(color, -0.25), 3);
    // largada
    roundRect(ctx, SCENE.START_X - 86, y - 24, 86 + sq / 2 - 3, 30, 6);
    fillStroke(ctx, color, 2.5);
    outlinedText(ctx, 'LARGADA', SCENE.START_X - 44, y - 2, { size: 10, fill: '#ffffff', lw: 3 });
    // casas
    for (let k = 1; k < len; k++) {
      const cx = squareX(k, len);
      const gift = gifts.includes(k);
      roundRect(ctx, cx - sq / 2 + 3, y - 24, sq - 6, 30, 6);
      fillStroke(ctx, gift ? '#fff1a8' : k % 2 ? '#fffdf6' : '#f1ead6', 2.5);
      outlinedText(ctx, String(k), cx, y - 1, { size: 11, fill: shade(color, -0.1), stroke: 'transparent', lw: 0 });
    }
    // chegada (xadrez)
    const fx = squareX(len, len);
    const x0 = fx - sq / 2 + 3;
    const w = SCENE.END_X + 42 - x0;
    ctx.save();
    roundRect(ctx, x0, y - 24, w, 30, 6);
    ctx.clip();
    for (let i = 0; i < Math.ceil(w / 10); i++) {
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#ffffff' : '#1b1b1b';
        ctx.fillRect(x0 + i * 10, y - 24 + j * 10, 10, 10);
      }
    }
    ctx.restore();
    roundRect(ctx, x0, y - 24, w, 30, 6);
    fillStroke(ctx, null, 2.5);
  }
  if (trackCache.size > 30) trackCache.clear();
  trackCache.set(key, cv);
  return cv;
}

// ---------------- objetos ----------------

export function drawGift(ctx, x, y, t, seed = 0) {
  const bob = Math.sin(t * 3 + seed) * 2;
  ctx.save();
  ctx.translate(x, y - 16 + bob);
  roundRect(ctx, -10, -10, 20, 16, 3);
  fillStroke(ctx, '#e8412b', 2.5);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-2, -10, 4, 16);
  ctx.fillRect(-10, -4, 20, 4);
  roundRect(ctx, -12, -14, 24, 6, 2);
  fillStroke(ctx, '#e8412b', 2);
  blob(ctx, -4, -16, 4, 3, 33, 0.1);
  fillStroke(ctx, '#ffd23f', 1.5);
  blob(ctx, 4, -16, 4, 3, 34, 0.1);
  fillStroke(ctx, '#ffd23f', 1.5);
  ctx.restore();
}

// troféu na ponta das pistas
export function drawTrophy(ctx, x, y, t) {
  const glint = (Math.sin(t * 2) + 1) / 2;
  ctx.save();
  ctx.translate(x, y);
  roundRect(ctx, -26, -14, 52, 14, 3);
  fillStroke(ctx, '#7a4a2a', 3);
  roundRect(ctx, -14, -26, 28, 12, 3);
  fillStroke(ctx, '#a77d4f', 2.5);
  ctx.beginPath();
  ctx.moveTo(-6, -26);
  ctx.lineTo(-5, -40);
  ctx.lineTo(5, -40);
  ctx.lineTo(6, -26);
  ctx.closePath();
  fillStroke(ctx, '#f2c12e', 2.5);
  ctx.beginPath();
  ctx.moveTo(-22, -84);
  ctx.quadraticCurveTo(-22, -40, 0, -40);
  ctx.quadraticCurveTo(22, -40, 22, -84);
  ctx.closePath();
  fillStroke(ctx, '#f2c12e', 3);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 24, -70, 9, s < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, s < 0 ? Math.PI * 1.5 : Math.PI * 0.5, s > 0);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f2c12e';
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,255,255,${0.35 + glint * 0.5})`;
  ctx.beginPath();
  ctx.ellipse(-9, -66, 3, 11, 0.3, 0, Math.PI * 2);
  ctx.fill();
  outlinedText(ctx, '★', 0, -62, { size: 16, fill: '#fff6c2', lw: 2 });
  ctx.restore();
}

// apagador voando (projétil do combo) com rastro de pó de giz
export function drawEraser(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  roundRect(ctx, -14, -7, 28, 9, 3);
  fillStroke(ctx, '#c58c50', 2.5);
  roundRect(ctx, -14, 2, 28, 7, 2);
  fillStroke(ctx, '#3d3d46', 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(-12, 7, 24, 2);
  ctx.restore();
}

export function drawChalkDust(ctx, x, y, k) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 6 + k * 34;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 6 * (1 - k) + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawShieldBubble(ctx, x, y, t, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha * (0.75 + Math.sin(t * 5) * 0.1);
  ctx.beginPath();
  ctx.ellipse(x, y - 40, 30, 46, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(140,200,255,0.22)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(80,150,255,0.85)';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(x - 12, y - 64, 9, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  ctx.restore();
}

// nuvem do pum
export function drawFartCloud(ctx, x, y, k, seed = 1) {
  ctx.save();
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = Math.max(0, 0.75 * (1 - k));
    blob(ctx, x + Math.cos(i * 1.7 + seed) * (12 + k * 20), y - 40 + Math.sin(i * 2.3) * 12 - k * 16, 14 + k * 10, 11 + k * 8, 950 + i, 0.15, Math.floor(k * 12), 12);
    fillStroke(ctx, '#9acd32', 2, '#5f8a1e');
  }
  ctx.restore();
}

// Professor: careca de óculos, bigode, gravata e a varinha apontando para a lousa.
// mood: '' | 'talk' | 'happy' | 'angry'
export function drawTeacher(ctx, x, y, t, mood = '') {
  const fr = boilFrame(t);
  const bob = mood === 'happy' ? Math.abs(Math.sin(t * 9)) * 6 : Math.sin(t * 2) * 1.2;
  ctx.save();
  ctx.translate(x, y - bob);
  // sombra
  ctx.fillStyle = 'rgba(30,40,60,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, bob + 2, 24, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // pernas e sapatos
  ctx.fillStyle = '#3c3f6e';
  ctx.fillRect(-11, -26, 9, 24);
  ctx.fillRect(3, -26, 9, 24);
  blob(ctx, -8, -2, 9, 4.5, 960, 0.05, fr);
  fillStroke(ctx, INK, 0);
  blob(ctx, 8, -2, 9, 4.5, 961, 0.05, fr);
  fillStroke(ctx, INK, 0);
  // corpo (colete marrom + camisa)
  wobblyPoly(ctx, [[-17, -72], [17, -72], [20, -24], [-20, -24]], 962, 1, fr);
  fillStroke(ctx, '#f4f1e6', 3);
  wobblyPoly(ctx, [[-17, -72], [-4, -72], [-6, -26], [-20, -26]], 963, 0.8, fr);
  fillStroke(ctx, '#7a4a2a', 2.5);
  wobblyPoly(ctx, [[4, -72], [17, -72], [20, -26], [6, -26]], 964, 0.8, fr);
  fillStroke(ctx, '#7a4a2a', 2.5);
  // gravata
  wobblyPoly(ctx, [[-3, -70], [3, -70], [5, -44], [0, -38], [-5, -44]], 965, 0.6, fr);
  fillStroke(ctx, '#e8412b', 2);
  // braço com a varinha (aponta para trás, para a lousa; bravo = sacode)
  const shake = mood === 'angry' ? Math.sin(t * 22) * 0.25 : mood === 'talk' ? Math.sin(t * 6) * 0.12 : 0;
  ctx.save();
  ctx.translate(-16, -64);
  ctx.rotate(-2.3 + shake);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(24, 0);
  ctx.stroke();
  ctx.strokeStyle = '#f4f1e6';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = '#7a4a2a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(70, 0);
  ctx.stroke();
  ctx.restore();
  // outra mão na cintura
  blob(ctx, 21, -46, 6, 6, 966, 0.08, fr, 10);
  fillStroke(ctx, '#ffd9b3', 2.5);
  // cabeça (careca grande)
  const hy = -98;
  blob(ctx, 0, hy, 25, 24, 967, 0.02, fr);
  fillStroke(ctx, '#ffd9b3', 3);
  // cabelo dos lados
  for (const s of [-1, 1]) {
    blob(ctx, s * 21, hy - 2, 7, 10, 968 + s, 0.12, fr);
    fillStroke(ctx, '#8d8d8d', 2);
  }
  // óculos
  for (const s of [-1, 1]) {
    blob(ctx, s * 9, hy - 2, 8, 7, 970 + s, 0.03, fr, 12);
    fillStroke(ctx, '#ffffff', 2.5);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(s * 9 - 1, hy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-1, hy - 3);
  ctx.lineTo(1, hy - 3);
  ctx.stroke();
  // sobrancelhas (bravo = em V)
  ctx.lineWidth = 3;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    if (mood === 'angry') {
      ctx.moveTo(s * 15, hy - 14);
      ctx.lineTo(s * 4, hy - 9);
    } else {
      ctx.moveTo(s * 15, hy - 12 - (mood === 'happy' ? 3 : 0));
      ctx.lineTo(s * 4, hy - 13 - (mood === 'happy' ? 3 : 0));
    }
    ctx.stroke();
  }
  // bigode + boca
  blob(ctx, 0, hy + 9, 11, 4, 972, 0.1, fr);
  fillStroke(ctx, '#8d8d8d', 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  if (mood === 'talk' || mood === 'angry') {
    const open = Math.abs(Math.sin(t * 16)) * 4 + 2;
    ctx.fillStyle = '#5a1a1a';
    ctx.beginPath();
    ctx.ellipse(0, hy + 15, 5, open, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-6, hy + 15);
    ctx.quadraticCurveTo(0, hy + (mood === 'happy' ? 21 : 17), 6, hy + 15);
    ctx.stroke();
  }
  ctx.restore();
}

// balão de fala na cena (professor, robôs, chat de quem está na sala)
export function drawSay(ctx, text, x, y, { fill = '#ffffff', size = 13, max = 200 } = {}) {
  ctx.save();
  ctx.font = `700 ${size}px ${FONT}`;
  const lines = wrap(ctx, text, max);
  const lh = size + 3;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
  const h = lines.length * lh + 10;
  roundRect(ctx, x - w / 2, y - h, w, h, 9);
  fillStroke(ctx, fill, 2.5);
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 1);
  ctx.lineTo(x, y + 8);
  ctx.lineTo(x + 6, y - 1);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x, y - h + 5 + lh / 2 + i * lh));
  ctx.restore();
}

function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}
