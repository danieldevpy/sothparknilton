// Boneco estilo recorte de papel: cabeça enorme, gorro com pompom,
// olhos grudados, corpo de casaco e luvas. Origem = pés (x, y).
// Animações são "duras" de propósito (pulinhos e tombos), como recortes.

import { blob, fillStroke, wobblyPoly, shade, boilFrame, hash, INK } from './paint.js';

const PANTS = '#3c3f6e';

/**
 * @param ctx  CanvasRenderingContext2D
 * @param who  { id, look: {hat, shirt, skin} }
 * @param st   estado de animação: { x, y, dir, moving, phase, pose, emote, emoteT, talking, t }
 */
export function drawCharacter(ctx, who, st) {
  const { look } = who;
  const t = st.t;
  const frame = boilFrame(t);
  const seed = who.id * 31 + 7;
  const dir = st.dir || 1;
  const sitting = st.pose === 'sit' || st.pose === 'bench';

  // ---- movimentação engraçada ----
  let hop = 0;
  let tilt = 0;
  let squash = 1;
  if (st.moving) {
    hop = Math.abs(Math.sin(st.phase)) * 7;
    tilt = Math.sin(st.phase) * 0.09;
  }
  const e = st.emote;
  const et = st.emoteT ?? 0;
  if (e === 'jump') {
    const k = Math.min(1, et / 0.7);
    hop = Math.sin(k * Math.PI) * 48;
    squash = k < 0.12 || k > 0.9 ? 0.85 : 1.06;
    tilt = Math.sin(k * Math.PI * 2) * 0.25 * dir; // giro torto no ar
  } else if (e === 'dance') {
    hop = Math.abs(Math.sin(et * 9)) * 10;
    tilt = Math.sin(et * 4.5) * 0.28;
  } else if (e === 'fart') {
    tilt = Math.sin(et * 40) * 0.05 * (et < 0.6 ? 1 : 0);
    squash = et < 0.3 ? 0.9 : 1;
  }

  // ---- poses do Gol a Gol ----
  const pose = st.pose || '';
  const diving = pose === 'diveU' || pose === 'diveD';
  const lying = pose === 'lieU' || pose === 'lieD';
  const flip = pose.endsWith('U') ? -1 : 1;
  if (pose === 'keeper') {
    hop = Math.abs(Math.sin(t * 7)) * 2.5; // goleiro quicando na ponta do pé
  } else if (pose === 'shooter') {
    hop = Math.abs(Math.sin(t * 5)) * 1.5;
  } else if (pose === 'kick') {
    tilt = -0.32 * dir;
  } else if (diving) {
    const k = Math.min(1, st.k ?? 0.5);
    hop = Math.sin(k * Math.PI) * 22 + 6;
    tilt = flip * 1.15 * dir;
  } else if (lying) {
    tilt = flip * 1.45 * dir;
  }
  // ---- poses da Queimada ----
  if (pose === 'qthrow') {
    tilt = 0.26 * dir; // corpo vai junto com o braço
  } else if (pose === 'qdodge') {
    tilt = -0.42 * dir;
    squash = 0.86;
    hop = 10;
  } else if (pose === 'qstun') {
    tilt = Math.sin(t * 12) * 0.16;
  } else if (pose === 'qcatch') {
    squash = 0.94;
  }
  // ---- poses da Corrida das Perguntas ----
  if (pose === 'qzhit') {
    tilt = -0.38 * dir + Math.sin(t * 22) * 0.07; // levou o apagador: tomba para trás
  } else if (pose === 'qzwin') {
    hop = Math.abs(Math.sin(t * 8)) * 16;
  }

  const baseY = sitting ? (st.pose === 'bench' ? -14 : 6) : 0;

  ctx.save();
  ctx.translate(st.x, st.y);

  // sombra (não pula junto)
  ctx.fillStyle = 'rgba(30,40,60,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 20 - hop * 0.15, 6 - hop * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, baseY - hop);
  ctx.rotate(tilt);
  ctx.scale(1, squash);

  // ---- pés ----
  if (sitting) {
    blob(ctx, dir * 8 - 6, -3, 8, 4.5, seed + 1, 0.05, frame);
    fillStroke(ctx, INK, 0);
    blob(ctx, dir * 8 + 6, -3, 8, 4.5, seed + 2, 0.05, frame);
    fillStroke(ctx, INK, 0);
  } else if (pose === 'kick') {
    blob(ctx, -9 * dir, -3, 8, 4.5, seed + 1, 0.05, frame);
    fillStroke(ctx, INK, 0);
    blob(ctx, 18 * dir, -13, 8, 4.5, seed + 2, 0.05, frame); // pé do chute lá na frente
    fillStroke(ctx, INK, 0);
  } else {
    const lift = st.moving ? Math.sin(st.phase) * 3 : 0;
    blob(ctx, -9, -3 - Math.max(0, lift), 8, 4.5, seed + 1, 0.05, frame);
    fillStroke(ctx, INK, 0);
    blob(ctx, 9, -3 - Math.max(0, -lift), 8, 4.5, seed + 2, 0.05, frame);
    fillStroke(ctx, INK, 0);
  }

  // ---- calça + casaco ----
  const bodyTop = sitting ? -28 : -34;
  wobblyPoly(ctx, [[-15, -6], [15, -6], [14, -12], [-14, -12]], seed + 3, 0.8, frame);
  fillStroke(ctx, PANTS, 2.5);
  wobblyPoly(ctx, [[-14, bodyTop], [14, bodyTop], [18, -10], [-18, -10]], seed + 4, 1.2, frame);
  fillStroke(ctx, look.shirt, 3);
  // zíper e botões
  ctx.strokeStyle = shade(look.shirt, -0.25);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, bodyTop + 3);
  ctx.lineTo(0, -11);
  ctx.stroke();
  ctx.fillStyle = INK;
  for (const by of [bodyTop + 9, bodyTop + 17]) {
    ctx.beginPath();
    ctx.arc(-4, by, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- braços / luvas ----
  const mitten = look.hat;
  let lx = -19;
  let ly = -20;
  let rx = 19;
  let ry = -20;
  if (st.moving) {
    ly += Math.sin(st.phase) * 3;
    ry -= Math.sin(st.phase) * 3;
  }
  if (e === 'wave') {
    // mão do lado que está olhando sobe e balança
    const wx = Math.sin(et * 14) * 6;
    if (dir > 0) { rx = 24 + wx; ry = -48; } else { lx = -24 + wx; ly = -48; }
  } else if (e === 'dance') {
    const up = Math.sin(et * 9) > 0;
    ly = up ? -50 : -22;
    ry = up ? -22 : -50;
    lx = -22;
    rx = 22;
  } else if (e === 'fart' && et < 0.8) {
    ly = ry = -44; // mãos na cabeça de vergonha... ou orgulho
    lx = -22;
    rx = 22;
  }
  if (pose === 'keeper') {
    const w = Math.sin(t * 9) * 2;
    lx = -27; rx = 27; ly = -40 + w; ry = -40 - w;
  } else if (diving || lying) {
    lx = -11; rx = 11; ly = ry = -64; // braços esticados para a bola
  } else if (pose === 'kick') {
    lx = -24; ly = -36; rx = 23; ry = -14;
  } else if (pose === 'qhold') {
    // bola erguida do lado da frente (desenhada por fora, na mão)
    if (dir > 0) { rx = 26; ry = -38; } else { lx = -26; ly = -38; }
  } else if (pose === 'qthrow') {
    // braço da frente esticado (soltou a bola), o de trás para trás
    if (dir > 0) { rx = 32; ry = -30; lx = -20; ly = -16; } else { lx = -32; ly = -30; rx = 20; ry = -16; }
  } else if (pose === 'qcatch') {
    // os dois braços para a frente, prontos para agarrar
    lx = dir * 18 - 7; rx = dir * 18 + 7; ly = -36; ry = -28;
  } else if (pose === 'qdodge' || pose === 'qstun') {
    const w = Math.sin(t * 16) * 6;
    lx = -24; rx = 24; ly = -46 + w; ry = -46 - w;
  } else if (pose === 'qzhand') {
    // respondeu: mão levantada bem alto, como na sala de aula
    if (dir > 0) { rx = 13; ry = -78; } else { lx = -13; ly = -78; }
  } else if (pose === 'qzwin') {
    lx = -22; rx = 22; ly = ry = -60;
  } else if (pose === 'qzhit') {
    lx = -26; rx = 26; ly = -40; ry = -44;
  }
  for (const [ax, ay, s] of [[lx, ly, 5], [rx, ry, 6]]) {
    blob(ctx, ax, ay, 6, 6, seed + s, 0.08, frame, 10);
    fillStroke(ctx, mitten, 2.5);
  }

  // ---- cabeça ----
  const hy = bodyTop - 18;
  blob(ctx, 0, hy, 25, 22, seed + 8, 0.02, frame);
  fillStroke(ctx, look.skin, 3);

  // ---- gorro ----
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, hy - 2, 26.5, 24, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  fillStroke(ctx, look.hat, 3);
  ctx.restore();
  wobblyPoly(ctx, [[-27, hy - 7], [27, hy - 7], [26, hy + 1], [-26, hy + 1]], seed + 9, 0.7, frame);
  fillStroke(ctx, shade(look.hat, 0.22), 2.5);
  blob(ctx, Math.sin(t * 3 + seed) * 1.5, hy - 28, 6.5, 6, seed + 10, 0.1, frame, 12);
  fillStroke(ctx, shade(look.hat, 0.32), 2.5);
  // robô da Corrida das Perguntas: antena com bolinha piscando
  if (who.bot) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(8, hy - 30);
    ctx.quadraticCurveTo(14, hy - 40, 12 + Math.sin(t * 5) * 2, hy - 48);
    ctx.stroke();
    blob(ctx, 12 + Math.sin(t * 5) * 2, hy - 50, 4, 4, seed + 12, 0.1, frame, 10);
    fillStroke(ctx, Math.floor(t * 3) % 2 ? '#ff4d3a' : '#ffe14d', 2);
  }

  // ---- olhos ----
  const look_x = dir * 2.5;
  const blinking = hash(seed, Math.floor(t * 0.7)) < 0.18 && (t * 0.7) % 1 < 0.12;
  const shocked = (e === 'fart' && et < 1) || diving || pose === 'qcatch' || pose === 'qdodge' || pose === 'qstun' || pose === 'qzhit';
  for (const ex of [-7.5, 7.5]) {
    if (blinking) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ex + look_x - 6, hy + 4);
      ctx.lineTo(ex + look_x + 6, hy + 4);
      ctx.stroke();
      continue;
    }
    const eyeR = shocked ? 10 : 8.5;
    blob(ctx, ex + look_x, hy + 3, eyeR, eyeR + 1, seed + 11 + ex, 0.04, frame, 14);
    fillStroke(ctx, '#ffffff', 2);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(ex + look_x + dir * 2.5 - (ex > 0 ? 1.5 : -1.5), hy + 3, shocked ? 1.6 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- boca ----
  const mx = dir * 4;
  const my = hy + 15;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  if (st.talking || e === 'dance') {
    const open = Math.abs(Math.sin(t * 18)) * 4 + 1;
    ctx.fillStyle = '#5a1a1a';
    ctx.beginPath();
    ctx.ellipse(mx, my, 5, open, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (shocked) {
    ctx.beginPath();
    ctx.arc(mx, my, 3, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(mx - 5, my);
    ctx.quadraticCurveTo(mx, my + (e === 'wave' ? 4 : 1.5), mx + 5, my);
    ctx.stroke();
  }

  ctx.restore();
}

// Altura aproximada do topo do pompom (para posicionar nick e balões).
export function headTop(pose) {
  if (pose === 'bench') return -100;
  if (pose === 'sit') return -76;
  return -88;
}
