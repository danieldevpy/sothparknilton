// Torcida dentro do Dojo (coordenadas da arena do Karatê).
// - Fila de trás: bonecos de verdade (mesmo visual da praça) sentados em almofadas atrás do
//   tatame, menores (estão mais longe). Seguram placa de quem torcem, comem pipoca, pulam.
// - Fila da frente: cabeças de costas para a câmera na borda de baixo (lotação extra).
// Tudo fica FORA do tatame: a torcida enfeita, mas não tapa a luta.

import { KT } from '/shared/karate.js';
import { ARENA, seatOrder } from '/shared/arena.js';
import { drawCharacter } from './character.js';
import { blob, fillStroke, roundRect, outlinedText, shade, INK, FONT } from './paint.js';

export const BACK_Y = -24; // pés da fila de trás
export const FRONT_Y = KT.ARENA_H + 128; // base das cabeças da fila da frente
const BACK_SCALE = 0.78;
const FRONT_SCALE = 1.15;
const SLOTS = seatOrder(ARENA.BACK_SEATS);
const FRONT_N = ARENA.MAX_WATCHERS - ARENA.BACK_SEATS;
const FRONT_SLOTS = seatOrder(FRONT_N);
// cor das placas: lado esquerdo (lutador A) vermelho, direito (B) azul — iguais às barras de vida
export const SIDE_COLORS = ['#e8412b', '#3a6fd8'];

// cheer -> animação do boneco
const CHEER_ANIM = { go: 'jump', clap: 'wave', fire: 'dance', wow: 'jump', lol: 'dance' };
const ANIM_MS = { jump: 700, wave: 1300, dance: 1500 };

export function seatSpot(seat) {
  if (seat < ARENA.BACK_SEATS) {
    const slot = SLOTS[seat];
    const x = 40 + (slot * (KT.ARENA_W - 80)) / (ARENA.BACK_SEATS - 1);
    return { x, y: BACK_Y, row: 'back', slot, dir: x < KT.ARENA_W / 2 ? 1 : -1, headY: BACK_Y - 86 * BACK_SCALE };
  }
  const i = seat - ARENA.BACK_SEATS;
  const slot = FRONT_SLOTS[i] ?? i;
  const x = -60 + (slot * (KT.ARENA_W + 120)) / Math.max(1, FRONT_N - 1);
  return { x, y: FRONT_Y, row: 'front', slot, dir: 1, headY: FRONT_Y - 70 };
}

// Almofadas vazias + fila de trás (antes dos lutadores).
// fans: [{ id, seat, sideIdx (-1|0|1), sideNick, look, cheer:{r,at}|null, emote, emoteAt, talking, me }]
export function drawCrowdBack(ctx, fans, now, hype) {
  const t = now / 1000;
  // banco comprido + almofadas de todos os lugares (mostra a lotação)
  ctx.save();
  roundRect(ctx, 10, BACK_Y - 4, KT.ARENA_W - 20, 10, 4);
  fillStroke(ctx, '#7a4a2a', 2.5);
  for (let s = 0; s < ARENA.BACK_SEATS; s++) {
    const p = seatSpot(s);
    roundRect(ctx, p.x - 22, BACK_Y - 9, 44, 12, 5);
    fillStroke(ctx, s % 2 ? '#8a4fc7' : '#6c3fb0', 2.5);
  }
  ctx.restore();
  const back = fans.filter((f) => f.seat < ARENA.BACK_SEATS);
  for (const f of back) drawBackFan(ctx, f, seatSpot(f.seat), now, t, hype);
}

function anim(f, now) {
  // emote da praça (1–5) tem prioridade se for mais recente que a reação
  const cheer = f.cheer && now - f.cheer.at < ANIM_MS[CHEER_ANIM[f.cheer.r]] ? f.cheer : null;
  const emoteOk = f.emote && f.emote !== 'sit' && now - f.emoteAt < 2500;
  if (emoteOk && (!cheer || f.emoteAt > cheer.at)) return { e: f.emote === 'fart' ? 'fart' : f.emote, t: (now - f.emoteAt) / 1000 };
  if (cheer) return { e: CHEER_ANIM[cheer.r], t: (now - cheer.at) / 1000 };
  return null;
}

// ola: cada lugar levanta em sequência quando a torcida está empolgada
function olaHop(slot, t, hype) {
  if (hype < 0.55) return 0;
  const k = Math.min(1, (hype - 0.55) / 0.3);
  return Math.max(0, Math.sin(t * 6 - slot * 0.8)) * 14 * k;
}

function drawBackFan(ctx, f, p, now, t, hype) {
  const a = anim(f, now);
  const hop = olaHop(p.slot, t, hype);
  ctx.save();
  ctx.translate(p.x, p.y - hop);
  ctx.scale(BACK_SCALE, BACK_SCALE);
  const cheering = !!a;
  // placa de quem torce (atrás do corpo, levantada)
  if (f.sideIdx >= 0) drawSign(ctx, f, p.dir, t, cheering);
  drawCharacter(ctx, { id: f.id, look: f.look }, {
    x: 0, y: 0, dir: p.dir, moving: false, phase: 0, pose: 'sit',
    emote: a?.e ?? null, emoteT: a?.t ?? 0, talking: f.talking, t,
  });
  // pipoca para alguns (quando não está pulando)
  if (!cheering && f.id % 3 === 0 && f.sideIdx < 0) drawPopcorn(ctx, p.dir * 16, -16, t, f.id);
  ctx.restore();
  if (f.me) outlinedText(ctx, '▲ você', p.x, BACK_Y + 14 + Math.sin(t * 6) * 1.5, { size: 11, fill: '#ffe14d', lw: 3 });
}

function drawSign(ctx, f, dir, t, cheering) {
  const lift = cheering ? Math.abs(Math.sin(t * 12)) * 10 : Math.sin(t * 2 + f.id) * 2;
  const sx = dir * 20;
  const top = -128 - lift;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(sx, -40);
  ctx.lineTo(sx, top + 10);
  ctx.stroke();
  ctx.strokeStyle = '#c99a5b';
  ctx.lineWidth = 2;
  ctx.stroke();
  const text = (f.sideNick || '?').slice(0, 9).toUpperCase();
  ctx.font = `700 15px ${FONT}`;
  const w = Math.max(56, ctx.measureText(text).width + 16);
  ctx.save();
  ctx.translate(sx, top);
  ctx.rotate(Math.sin(t * 3 + f.id) * 0.06);
  roundRect(ctx, -w / 2, -14, w, 28, 5);
  fillStroke(ctx, SIDE_COLORS[f.sideIdx], 3);
  outlinedText(ctx, text, 0, 0, { size: 15, fill: '#ffffff', lw: 3 });
  ctx.restore();
}

function drawPopcorn(ctx, x, y, t, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-9, -14); ctx.lineTo(9, -14); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.closePath();
  fillStroke(ctx, '#ffffff', 2.5);
  ctx.fillStyle = '#e8412b';
  ctx.fillRect(-5, -13, 3, 18);
  ctx.fillRect(2, -13, 3, 18);
  for (let i = 0; i < 4; i++) {
    blob(ctx, -6 + i * 4, -16 - (i % 2) * 3, 4, 3.5, seed + i, 0.15);
    fillStroke(ctx, '#ffe9a0', 1.5);
  }
  // uma pipoca pulando até a boca de vez em quando
  const k = (t * 0.7 + seed * 0.37) % 1;
  if (k < 0.25) {
    const q = k / 0.25;
    blob(ctx, -x * 0.5 * q, -20 - Math.sin(q * Math.PI) * 30 - q * 30, 3, 3, seed, 0.2);
    fillStroke(ctx, '#ffe9a0', 1.5);
  }
  ctx.restore();
}

// Fila da frente (depois dos lutadores): cabeças de costas, braços para cima quando torcem.
export function drawCrowdFront(ctx, fans, now, hype) {
  const t = now / 1000;
  const front = fans.filter((f) => f.seat >= ARENA.BACK_SEATS).sort((a, b) => seatSpot(a.seat).x - seatSpot(b.seat).x);
  for (const f of front) {
    const p = seatSpot(f.seat);
    const a = anim(f, now);
    const hop = olaHop(p.slot, t, hype) + (a ? Math.abs(Math.sin(t * 10)) * 8 : Math.sin(t * 2 + f.id) * 1.5);
    ctx.save();
    ctx.translate(p.x, p.y - hop);
    ctx.scale(FRONT_SCALE, FRONT_SCALE);
    const { look } = f;
    // braços levantados (luvas) quando torce
    if (a) {
      for (const s of [-1, 1]) {
        const wave = Math.sin(t * 12 + s) * 6;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s * 20, -20); ctx.lineTo(s * 30 + wave, -78); ctx.stroke();
        ctx.strokeStyle = look.shirt;
        ctx.lineWidth = 5;
        ctx.stroke();
        blob(ctx, s * 30 + wave, -82, 7, 7, f.id + s, 0.1);
        fillStroke(ctx, shade(look.shirt, -0.3), 2);
      }
    }
    // ombros
    blob(ctx, 0, 0, 34, 20, f.id, 0.05);
    fillStroke(ctx, look.shirt, 3);
    // cabeça de costas: orelhas + gorro cobrindo tudo + pompom
    for (const s of [-1, 1]) {
      blob(ctx, s * 25, -36, 6, 8, f.id + s * 3, 0.1);
      fillStroke(ctx, look.skin, 2.5);
    }
    blob(ctx, 0, -40, 26, 28, f.id + 9, 0.04);
    fillStroke(ctx, look.skin, 3);
    blob(ctx, 0, -50, 27, 22, f.id + 11, 0.05);
    fillStroke(ctx, look.hat, 3);
    ctx.fillStyle = shade(look.hat, -0.2);
    ctx.fillRect(-26, -36, 52, 7);
    blob(ctx, 0, -76, 9, 9, f.id + 13, 0.1);
    fillStroke(ctx, '#ffffff', 2.5);
    ctx.restore();
    if (f.sideIdx >= 0) {
      const text = (f.sideNick || '?').slice(0, 9).toUpperCase();
      roundRect(ctx, p.x - 30, p.y - hop - 8, 60, 16, 4);
      fillStroke(ctx, SIDE_COLORS[f.sideIdx], 2);
      outlinedText(ctx, text, p.x, p.y - hop, { size: 10, fill: '#ffffff', lw: 2 });
    }
    if (f.me) outlinedText(ctx, '▼ você', p.x, p.y - 118 - hop, { size: 12, fill: '#ffe14d', lw: 3 });
  }
}

// "NIL-TON! NIL-TON!" — coro da torcida, em cima da fila de trás
export function chantText(nick) {
  const s = nick.toUpperCase().replace(/[^A-Z0-9À-Ú]/g, '') || nick.toUpperCase();
  const h = Math.ceil(s.length / 2);
  const call = s.length <= 3 ? s : `${s.slice(0, h)}-${s.slice(h)}`;
  return `${call}! ${call}!`;
}

export function drawChant(ctx, chant, now) {
  const age = (now - chant.at) / 1000;
  const k = age / chant.dur;
  if (k >= 1) return;
  ctx.save();
  ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : Math.min(1, age * 5);
  const beat = Math.abs(Math.sin(age * Math.PI * 2.2));
  ctx.translate(chant.x, BACK_Y - 140 - beat * 4);
  ctx.rotate(-0.04 + Math.sin(age * 3) * 0.03);
  ctx.scale(1 + beat * 0.08, 1 + beat * 0.08);
  outlinedText(ctx, chant.text, 0, 0, { size: 27, fill: chant.sideIdx === 0 ? '#ff8a6b' : '#8fb3ff', lw: 6 });
  ctx.restore();
}

// balão curtinho de quem está na plateia (chat ou "VAI FULANO!")
export function drawFanSay(ctx, text, x, y, fill = '#ffffff') {
  ctx.save();
  ctx.font = `700 12px ${FONT}`;
  const s = text.length > 30 ? `${text.slice(0, 29)}…` : text;
  const w = ctx.measureText(s).width + 14;
  roundRect(ctx, x - w / 2, y - 22, w, 20, 8);
  ctx.globalAlpha = 0.92;
  fillStroke(ctx, fill, 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y - 12);
  ctx.restore();
}
