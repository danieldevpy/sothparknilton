// Corrida das Perguntas (quiz) — regras compartilhadas entre servidor, cliente e simulador.
//
// A corrida acontece numa sala da Escola: cada corredor tem uma pista com QZ casas até a CHEGADA.
// Todo mundo responde a MESMA pergunta ao mesmo tempo (múltipla escolha). Acertou = anda 1 casa.
// Mecânicas: COMBO (a cada 2 acertos seguidos: quem está na sua frente volta 1 casa; liderando você
// ganha um ESCUDO), PERGUNTA DE OURO (a cada 5: vale 2 casas), CARTAS ganhas nas casas de presente
// (🤫 Cola, 💨 Pum, 🎲 Tudo ou nada) e robôs para treinar sozinho.
//
// O banco de perguntas NÃO fica aqui (shared/ é servido ao navegador e as respostas vazariam):
// ver server/quiz/. Aqui só vão números, nomes e as contas que o cliente também precisa fazer.

export const QZ = {
  MAX_RACERS: 6, // pistas na sala (robôs contam)
  MAX_BOTS: 3,
  MAX_WATCHERS: 24, // plateia
  LENGTHS: [10, 14], // casas até a chegada: corrida curta / normal
  DEFAULT_LEN: 14,
  JOIN_CUTOFF: 0.6, // entrou no meio: começa do zero; depois que o líder passou de 60% da pista, joga só na próxima
  COUNT_TIME: 6, // contagem antes da largada
  INTRO_TIME: 1.6, // "PERGUNTA 5 · 🔤 Vocabulário" (mostra quem está com combo)
  ASK_BASE: 10, // tempo para responder = base + por letra (pergunta + opções), com limites
  ASK_PER_CHAR: 0.05,
  ASK_MIN: 12,
  ASK_MAX: 24,
  ALL_IN_GRACE: 0.6, // todo mundo respondeu: revela logo
  REVEAL_TIME: 3.4, // resposta certa + pulinhos
  REVEAL_EXTRA: 1.3, // + ataques/escudos/cartas na revelação
  OVER_TIME: 14, // pódio e revisão; depois começa outra corrida
  GOLD_EVERY: 5, // pergunta de ouro: a 5ª, 10ª, 15ª...
  GOLD_STEPS: 2,
  COMBO_EVERY: 2, // a cada 2 acertos seguidos
  SHIELD_TURNS: 1, // escudo do líder protege por esta quantidade de perguntas (0 = líder não ganha escudo)
  HAND_MAX: 2, // cartas na mão
  START_CARDS: ['cola'], // todo mundo (inclusive quem entra no meio) começa com uma cola
  PUM_TIME: 4, // segundos de nuvem verde em cima das opções de quem levou o pum
  AFK_LIMIT: 4, // perguntas seguidas sem responder → vai para a plateia
  CHEER_COOLDOWN_MS: 700,
  INVITE_TTL_MS: 20_000,
  PTS: { RIGHT: 100, SPEED: 50, COMBO: 50 }, // pontos (desempate/ranking): acerto + rapidez + combo
};

// Dificuldade da sala: de quais níveis saem as perguntas, quantas opções e quanto tempo.
// `mix` é progressivo: começa fácil e endurece conforme o líder se aproxima da chegada.
export const MODES = {
  easy: { label: 'Fácil', icon: '🟢', opts: 3, time: 1.15, tip: 'nível básico · 3 opções · mais tempo' },
  normal: { label: 'Médio', icon: '🟡', opts: 4, time: 1, tip: 'básico + intermediário · 4 opções' },
  hard: { label: 'Difícil', icon: '🔴', opts: 4, time: 0.9, tip: 'intermediário + avançado · menos tempo' },
  mix: { label: 'Misto', icon: '🎲', opts: 4, time: 1, tip: 'começa fácil e fica difícil perto da chegada' },
};
export const MODE_IDS = Object.keys(MODES);

// Cartas (poderes). Ganha passando pelas casas de presente 🎁 (uma vez cada) — quem está atrás tira
// mais Pum/Tudo ou nada; quem lidera, mais Cola.
export const CARDS = {
  cola: { icon: '🤫', label: 'Cola', tip: 'some com 2 respostas erradas', key: 'Q' },
  pum: { icon: '💨', label: 'Pum', tip: 'nuvem fedida nas opções de quem está na sua frente', key: 'W' },
  dobro: { icon: '🎲', label: 'Tudo ou nada', tip: 'acertou: anda o dobro · errou: volta 1 casa', key: 'E' },
};
export const CARD_IDS = Object.keys(CARDS);

// Reações (plateia e corredores). `go` = "VAI, FULANO!" (torce por alguém).
export const CHEERS = {
  go: { icon: '📣', label: 'Vai!' },
  clap: { icon: '👏', label: 'Palmas' },
  wow: { icon: '😱', label: 'Uau' },
  lol: { icon: '😂', label: 'Kkk' },
  think: { icon: '🤔', label: 'Hmm' },
  fire: { icon: '🔥', label: 'Fogo' },
};
export const CHEER_IDS = Object.keys(CHEERS);

// Robôs (treino sozinho / completar a corrida). `skill` = chance de acertar no nível 1.
export const BOTS = {
  easy: { label: 'Robô fácil', skill: 0.55, delay: [4, 10] },
  normal: { label: 'Robô médio', skill: 0.72, delay: [3, 8.5] },
  hard: { label: 'Robô gênio', skill: 0.88, delay: [2.2, 6.5] },
};
export const BOT_NAMES = ['Robô Byte', 'Robô Pixel', 'Robô Chip', 'Robô Bolt', 'Robô Nano', 'Robô Giga'];

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// casas de presente: a cada 4 a partir da 3ª, nunca na reta final
export function giftSquares(len) {
  const out = [];
  for (let s = 3; s < len - 1; s += 4) out.push(s);
  return out;
}

export function isGold(n) {
  return n > 0 && n % QZ.GOLD_EVERY === 0;
}

// tempo (s) para responder: perguntas longas (leitura) ganham mais tempo
export function askTime(text, opts, mode = 'normal') {
  const chars = String(text).length + opts.reduce((s, o) => s + String(o).length, 0);
  const t = (QZ.ASK_BASE + chars * QZ.ASK_PER_CHAR) * (MODES[mode]?.time ?? 1);
  return Math.round(clamp(t, QZ.ASK_MIN, QZ.ASK_MAX) * 10) / 10;
}

// nível da próxima pergunta (1 básico · 2 intermediário · 3 avançado)
export function levelFor(mode, { leaderPos = 0, len = QZ.DEFAULT_LEN, gold = false } = {}, rnd = Math.random) {
  let lv;
  if (mode === 'easy') lv = 1;
  else if (mode === 'normal') lv = rnd() < 0.55 ? 1 : 2;
  else if (mode === 'hard') lv = rnd() < 0.5 ? 2 : 3;
  else {
    const k = leaderPos / Math.max(1, len);
    lv = k < 0.34 ? 1 : k < 0.67 ? 2 : 3;
  }
  return gold ? Math.min(3, lv + 1) : lv;
}

// ainda dá para entrar na corrida em andamento (começando do zero)?
export function joinOpen(leaderPos, len) {
  return leaderPos < len * QZ.JOIN_CUTOFF;
}

// quem está com combo armado: o próximo acerto fecha "2 seguidos"
export function comboReady(streak) {
  return (streak + 1) % QZ.COMBO_EVERY === 0;
}

// adversário mais perto ESTRITAMENTE à frente (empate: mais pontos, depois quem entrou antes)
export function closestAhead(racers, me, exclude = null) {
  let best = null;
  for (const r of racers) {
    if (r.id === me.id || r.pos <= me.pos || (exclude && exclude.has(r.id))) continue;
    if (!best || r.pos < best.pos || (r.pos === best.pos && ((r.pts || 0) > (best.pts || 0)
      || ((r.pts || 0) === (best.pts || 0) && (r.order || 0) < (best.order || 0))))) best = r;
  }
  return best;
}

// Alvos dos combos desta pergunta (decididos ANTES de responder, todo mundo vê):
//  - alguém na frente → ataque no mais perto à frente (cada alvo só pode ser atacado por 1 por pergunta;
//    quem está mais atrás escolhe primeiro); todos já ocupados → combo só vale pontos
//  - ninguém na frente (liderando) → escudo
// Devolve Map(attackerId → { kind: 'hit'|'shield'|'combo', to })
export function comboTargets(racers) {
  const out = new Map();
  const taken = new Set();
  const ready = racers.filter((r) => comboReady(r.streak || 0)).sort((a, b) => a.pos - b.pos || (b.streak || 0) - (a.streak || 0) || (a.order || 0) - (b.order || 0));
  for (const r of ready) {
    if (!closestAhead(racers, r)) {
      out.set(r.id, { kind: QZ.SHIELD_TURNS > 0 ? 'shield' : 'combo', to: 0 });
      continue;
    }
    const t = closestAhead(racers, r, taken);
    if (t) {
      taken.add(t.id);
      out.set(r.id, { kind: 'hit', to: t.id });
    } else out.set(r.id, { kind: 'combo', to: 0 });
  }
  return out;
}

// passos desta resposta: ouro vale 2; tudo ou nada dobra (e errar volta 1)
export function stepsFor(correct, gold, dobro) {
  if (!correct) return dobro ? -1 : 0;
  return (gold ? QZ.GOLD_STEPS : 1) * (dobro ? 2 : 1);
}

// sorteio da carta do presente, pesado pela posição (0 = líder ... 1 = último)
export function drawCard(rank, rnd = Math.random) {
  const w = {
    cola: 0.6 - rank * 0.4, // líder: 60% · último: 20%
    pum: 0.2 + rank * 0.2,
    dobro: 0.2 + rank * 0.2,
  };
  let x = rnd() * (w.cola + w.pum + w.dobro);
  for (const id of CARD_IDS) {
    x -= w[id];
    if (x < 0) return id;
  }
  return 'cola';
}

// pontos de rapidez: quanto antes acertar, mais (0..SPEED)
export function speedPts(ms, limitS) {
  const k = 1 - clamp(ms / 1000 / Math.max(1, limitS), 0, 1);
  return Math.round(QZ.PTS.SPEED * k);
}
