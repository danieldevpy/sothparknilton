// Minigame "Karatê": regras numéricas, tabela de golpes e movimento, compartilhados
// entre servidor (autoritativo) e cliente (predição do próprio lutador + desenho).
//
// A luta acontece num DOJO separado da praça (coordenadas próprias da arena, não do
// mapa): os dois somem da praça e lutam 1x1, melhor de 3 rounds. Visão 2.5D estilo
// beat 'em up: x = esquerda/direita, y = profundidade. Um golpe só acerta quem está
// na frente (direção `dir`), dentro do alcance e na mesma "faixa" de profundidade.

export const KT = {
  ARENA_W: 900, // largura do tatame
  ARENA_H: 260, // profundidade do tatame
  R: 16, // raio do corpo (empurrão entre lutadores)
  SPEED: 175, // px/s andando
  DEPTH_MUL: 0.75, // andar em profundidade é um pouco mais lento
  BLOCK_SPEED: 0.4, // multiplicador de velocidade defendendo
  SLOW_MUL: 0.55, // multiplicador quando a perna está machucada (chute fraco)
  SLOW_TIME: 1.8,
  HP: 100,
  ROUNDS_TO_WIN: 2, // melhor de 3
  MAX_ROUNDS: 5,
  ROUND_TIME: 45,
  INTRO_TIME: 2.4,
  KO_TIME: 2.8,
  START_GAP: 300, // distância inicial entre os lutadores

  // dash: a cada 3 s, rápido, atravessa golpes (invencível no começo)
  DASH_CD: 3,
  DASH_TIME: 0.16,
  DASH_DIST: 135,
  DASH_IFRAMES: 0.14,
  DASH_BONUS_WINDOW: 0.35, // golpe iniciado logo após o dash = "investida"
  DASH_BONUS: 1.25,

  BUFFER: 0.18, // golpe apertado durante outro fica guardado por este tempo
  CHAIN_AFTER: 0.02, // após acertar um golpe "encadeável", pode cancelar a recuperação
  COUNTER_MULT: 1.5, // acertar quem está preparando um golpe
  COMBO_SCALE: 0.85, // cada acerto seguido no combo vale menos
  COMBO_MAX: 4, // o 4º acerto seguido derruba (fim do combo)
  // golpe PREVISÍVEL: cada vez que o mesmo golpe aparece entre os últimos acertos,
  // ele perde dano (variar os golpes compensa)
  STALE_MEMORY: 4,
  STALE_STEP: 0.15,
  STALE_MIN: 0.5,

  BLOCK_CHIP: 0.15, // dano que passa pela defesa
  BLOCKSTUN: 0.2,
  BLOCK_PUSH: 0.6,
  PARRY_WINDOW: 0.15, // levantou a defesa até X s antes do golpe = DEFESA PERFEITA
  PARRY_RETRY: 0.6, // tem que esperar isso entre defesas para valer a perfeita (sem spam)
  PARRY_STUN: 0.75,
  GUARD_BREAK_STUN: 0.75,
  GUARD_BREAK_DMG: 0.5,

  DOWN_TIME: 0.9, // caído (invencível)
  GETUP_TIME: 0.4, // levantando (invencível)
  KNOCK_DECAY: 0.001, // fração da velocidade de empurrão que sobra após 1 s
  KNOCK_K: 6.9, // velocidade inicial = empurrão * K (≈ percorre `push` px)

  INVITE_TTL_MS: 20000,
};

// Golpes. Tempos em segundos: preparação (startup) → ativo (pode acertar) → recuperação.
// Cada um tem uma vantagem clara (`perk`) e uma fraqueza:
//  - soco fraco: o mais rápido, interrompe golpes fortes e ENCADEIA combos; dano e alcance baixos.
//  - soco forte: QUEBRA A DEFESA e avança; lento de sair, perde para o soco fraco.
//  - chute fraco: ALCANCE longo e deixa o oponente LENTO (perna); dano médio.
//  - chute forte: maior dano e alcance, DERRUBA; muito lento e fácil de punir se errar.
export const MOVES = {
  jab: {
    name: 'Soco fraco', perk: 'rápido · encadeia combo',
    startup: 0.07, active: 0.08, recovery: 0.14,
    dmg: 4, reach: 50, band: 20, push: 14, stun: 0.22, chain: true,
  },
  punch: {
    name: 'Soco forte', perk: 'quebra a defesa',
    startup: 0.24, active: 0.09, recovery: 0.3,
    dmg: 13, reach: 56, band: 22, push: 40, stun: 0.45, guardBreak: true, lunge: 26,
  },
  kick: {
    name: 'Chute fraco', perk: 'alcance longo · deixa lento',
    startup: 0.15, active: 0.1, recovery: 0.3,
    dmg: 7, reach: 78, band: 18, push: 20, stun: 0.26, slow: true,
  },
  hkick: {
    name: 'Chute forte', perk: 'dano máximo · derruba',
    startup: 0.34, active: 0.12, recovery: 0.46,
    dmg: 19, reach: 94, band: 30, push: 120, stun: 0, knockdown: true, lunge: 16,
  },
};

export const MOVE_IDS = Object.keys(MOVES);
export const ACTIONS = [...MOVE_IDS, 'dash'];

export function moveTotal(m) {
  return m.startup + m.active + m.recovery;
}

// fase de um golpe no tempo t: 'startup' | 'active' | 'recovery' | null (terminou)
export function movePhase(m, t) {
  if (t < m.startup) return 'startup';
  if (t < m.startup + m.active) return 'active';
  if (t < moveTotal(m)) return 'recovery';
  return null;
}

// Estados em que o lutador está livre para andar/defender/agir.
export const FREE_STATES = new Set(['idle', 'walk', 'block']);

export function isFree(st) {
  return FREE_STATES.has(st);
}

// multiplicador de dano pelo histórico de golpes acertados (`recent`, mais novo no fim)
export function staleMult(recent, mid) {
  const n = recent.filter((m) => m === mid).length;
  return Math.max(KT.STALE_MIN, 1 - n * KT.STALE_STEP);
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function clampArena(f) {
  f.x = clamp(f.x, KT.R, KT.ARENA_W - KT.R);
  f.y = clamp(f.y, KT.R * 0.5, KT.ARENA_H - KT.R * 0.5);
}

export function speedOf(f) {
  let s = KT.SPEED;
  if (f.block) s *= KT.BLOCK_SPEED;
  if (f.slowT > 0) s *= KT.SLOW_MUL;
  return s;
}

// Passo de movimento livre (servidor e predição do cliente usam o mesmo).
export function walkStep(f, mx, my, dt) {
  const n = Math.hypot(mx, my);
  if (n < 0.05) return false;
  const k = Math.min(1, n) / n;
  const s = speedOf(f);
  f.x += mx * k * s * dt;
  f.y += my * k * s * KT.DEPTH_MUL * dt;
  clampArena(f);
  return true;
}

// Direção normalizada do dash: entrada de movimento ou, parado, para frente.
export function dashVector(dx, dy, dir) {
  const n = Math.hypot(dx || 0, dy || 0);
  if (n < 0.2) return [dir, 0];
  return [dx / n, dy / n];
}

// O golpe `m` de quem está em (ax, ay) olhando para `dir` alcança (bx, by)?
export function inReach(m, ax, ay, dir, bx, by) {
  const fwd = (bx - ax) * dir;
  return fwd > -KT.R * 0.3 && fwd < m.reach + KT.R && Math.abs(by - ay) <= m.band;
}

export function startPositions() {
  const cx = KT.ARENA_W / 2;
  const y = KT.ARENA_H / 2;
  return [{ x: cx - KT.START_GAP / 2, y, dir: 1 }, { x: cx + KT.START_GAP / 2, y, dir: -1 }];
}
