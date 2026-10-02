// Minigame "Gol a Gol": regras numéricas e física da bola, compartilhadas entre
// servidor (autoritativo) e cliente (prévia da trajetória na mira).
//
// Cada jogador defende um gol do campinho (esquerda/direita) e eles se alternam:
// um chuta da sua marca, o outro defende. Primeiro gol vence.

import { MAP } from './map.js';
import { BALL_RADIUS } from './constants.js';

export const GG = {
  SPOT_DX: 95, // distância da marca de chute até a própria linha de gol
  SPOT_RANGE: 140, // chutador pode deslocar a bola em y ± isso
  SHOOTER_SPEED: 230,
  KEEPER_DX: 16, // goleiro fica X px para dentro do campo a partir da linha
  KEEPER_RANGE: 92, // goleiro anda em y ± isso do meio
  KEEPER_SPEED: 165,
  KEEPER_REACH: 17, // alcance vertical em pé
  KEEPER_HALF_W: 13,
  DIVE_DIST: 58,
  DIVE_TIME: 0.22,
  DIVE_RECOVER: 0.65,
  DIVE_EXTRA: 30, // alcance extra para o lado do mergulho
  SPEED_MIN: 420,
  SPEED_MAX: 980,
  CURVE_RATE: 650, // aceleração lateral máxima (px/s²) com efeito = ±1
  FRICTION: 0.72, // fração da velocidade restante após 1s
  PARRY_FRICTION: 0.2, // bola espalmada morre rápido (não atravessa o campo)
  LOFT_POWER: 0.93, // força >= isso: bola sobe e isola
  LOFT_MAX_Z: 150,
  STOP_SPEED: 45,
  CATCH_SPEED: 700, // abaixo: goleiro segura; acima: espalma
  POST_W: 7,
  MIN_SHOT_COS: 0.25, // não pode chutar para trás/lado demais
  AIM_TIME: 10,
  RESULT_TIME: 2.3,
  COUNTDOWN: 3,
  FLIGHT_MAX: 4,
  TIRED_AFTER: 8, // a partir deste chute os goleiros cansam
  TIRED_EVERY: 4,
  TIRED_FACTOR: 0.85,
  TIRED_MIN: 0.5,
  INVITE_TTL_MS: 20000,
  SWEET_MIN: 0.74, // faixa de força "perfeita" (só visual/feedback)
  SWEET_MAX: 0.93,
  BALL_R: BALL_RADIUS,
};

export function ggGeometry(map = MAP) {
  const f = map.field;
  return { f, midY: f.y + f.h / 2, mouth: map.goalMouth };
}

export const otherSide = (side) => (side === 'left' ? 'right' : 'left');
// direção do chute de quem defende `side` (para o gol adversário)
export const attackDir = (side) => (side === 'left' ? 1 : -1);

export function goalLineX(side, map = MAP) {
  const f = map.field;
  return side === 'left' ? f.x : f.x + f.w;
}

export function spotX(side, map = MAP) {
  return goalLineX(side, map) + attackDir(side) * GG.SPOT_DX;
}

export function keeperX(side, map = MAP) {
  return goalLineX(side, map) + attackDir(side) * GG.KEEPER_DX;
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// Medidor de força vai e volta (0→1→0) — acertar o tempo é parte da habilidade.
export function chargeAt(seconds) {
  const k = (seconds * 0.6) % 2;
  return k < 1 ? k : 2 - k;
}

export function launchBall(x, y, angle, power, curve) {
  const sp = GG.SPEED_MIN + (GG.SPEED_MAX - GG.SPEED_MIN) * power;
  return {
    x, y, z: 0,
    vx: Math.cos(angle) * sp,
    vy: Math.sin(angle) * sp,
    curve,
    lofted: power >= GG.LOFT_POWER,
    travelled: 0,
  };
}

// Integra um passo sem colisões: efeito gira o vetor velocidade, atrito reduz.
export function advanceBall(b, dt) {
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > 1 && b.curve) {
    const a = ((b.curve * GG.CURVE_RATE) / sp) * dt;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const vx = b.vx * c - b.vy * s;
    b.vy = b.vx * s + b.vy * c;
    b.vx = vx;
  }
  const fr = (b.slow ? GG.PARRY_FRICTION : GG.FRICTION) ** dt;
  b.vx *= fr;
  b.vy *= fr;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.travelled += sp * dt;
  b.z = b.lofted ? Math.min(GG.LOFT_MAX_Z, b.travelled * 0.32) : 0;
}

// Prévia da trajetória (usada na mira do cliente).
export function predictPath(x, y, angle, power, curve, seconds = 0.45, step = 1 / 60) {
  const b = launchBall(x, y, angle, power, curve);
  const pts = [];
  for (let t = 0; t < seconds; t += step) {
    advanceBall(b, step);
    pts.push([b.x, b.y, b.z]);
  }
  return pts;
}
