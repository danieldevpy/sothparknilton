// Simulador de equilíbrio da Corrida das Perguntas: o Room/QuizMatch de verdade, em memória, com tempo
// simulado. Cada "jogador" acerta com a chance da sua habilidade (menos um pouco nas perguntas difíceis),
// demora para ler como gente e usa as cartas com a mesma lógica dos robôs.
//
// Uso: node scripts/quiz-balance.js [corridas=300] [modo=normal|easy|hard|mix] [casas=14] [QZ.X=valor ...]
//   ex.: node scripts/quiz-balance.js 300 normal 14 SHIELD_TURNS=0   (testa variações sem editar o código)
// Mede: duração, % de vitória por habilidade (1x1 e 4 jogadores), quem entra atrasado consegue virar,
// e o efeito do COMBO (ligado × desligado) — a meta é ser "só uma mecânica": ajuda quem está atrás sem
// decidir a corrida sozinho.

import { Room } from '../server/Room.js';
import { MSG } from '../shared/constants.js';
import { QZ, clamp, closestAhead } from '../shared/quiz.js';

const args = process.argv.slice(2).filter((a) => !a.includes('='));
const RACES = Number(args[0]) || 300;
const MODE = args[1] || 'normal';
const LEN = Number(args[2]) || 14;
const DT = 1 / 30;
for (const a of process.argv.slice(2).filter((x) => x.includes('='))) {
  const [k, v] = a.split('=');
  if (k in QZ) QZ[k] = Number(v);
}
const PUM_DELAY = QZ.PUM_TIME * 0.6; // levou pum: perde uns segundos até abanar a nuvem

function race(skills, { joinAt = null, combo = true } = {}) {
  const comboEvery = QZ.COMBO_EVERY;
  if (!combo) QZ.COMBO_EVERY = 1e9;
  let now = 0;
  const room = new Room({ now: () => now });
  const farted = new Set(); // quem levou pum nesta pergunta
  const inbox = (pid) => (raw) => {
    const m = JSON.parse(raw);
    if (m.t === MSG.QZ_EVENT && m.kind === 'card' && m.c === 'pum' && m.now && m.to === pid) farted.add(pid);
    if (m.t === MSG.QZ_Q && m.pum.some(([to]) => to === pid)) farted.add(pid);
  };
  const ps = [];
  for (let i = 0; i < skills.length; i++) {
    const nick = `P${i}`;
    const id = room.nextId; // o id que o addPlayer vai dar
    ps.push(room.addPlayer({ nick }, inbox(id)).player);
  }
  room.handle(ps[0].id, { t: MSG.QZ_CREATE, mode: MODE, len: LEN });
  const qz = room.qzOf.get(ps[0].id);
  const late = joinAt == null ? null : ps.length - 1; // o último entra no meio
  for (let i = 1; i < ps.length; i++) if (i !== late) room.handle(ps[i].id, { t: MSG.QZ_JOIN, id: qz.id, as: 'play' });
  if (qz.racers.size < 2) room.handle(ps[0].id, { t: MSG.QZ_START });
  const plans = new Map();
  let lastQ = 0;
  let leadChanges = 0;
  let leader = null;
  let secs = 0;
  let joined = late == null;
  const stats = { attacks: 0, blocks: 0, shields: 0, dobro: 0, dobroWin: 0 };
  while (secs < 3600) {
    now += DT * 1000;
    secs += DT;
    room.tick(DT);
    if (qz.phase === 'over' || qz.race > 1) break;
    if (!joined && qz.leaderPos() >= joinAt && qz.phase === 'intro') {
      room.handle(ps[late].id, { t: MSG.QZ_JOIN, id: qz.id, as: 'play' });
      joined = true;
    }
    if (qz.phase === 'reveal' && qz.q && plans.get('rev') !== qz.q.n) {
      plans.set('rev', qz.q.n);
      const top = [...qz.racers.values()].sort((a, b) => b.pos - a.pos)[0];
      if (leader != null && top.id !== leader && top.pos > (qz.racers.get(leader)?.pos ?? -1)) leadChanges++;
      leader = top.id;
    }
    if (qz.phase !== 'ask') continue;
    const q = qz.q;
    if (q.n !== lastQ) {
      lastQ = q.n;
      farted.clear();
      for (const p of ps) {
        const r = qz.racers.get(p.id);
        if (r && room.qzOf.get(p.id) && [...room.qzOf.keys()].includes(p.id)) void r;
      }
      for (const [i, p] of ps.entries()) {
        const r = qz.racers.get(p.id);
        if (!r) continue;
        const chars = q.src.q.length + q.opts.join('').length;
        const read = clamp(0.75 + chars / 160, 0.8, 1.6);
        plans.set(p.id, { at: (2 + Math.random() * 6) * read * (1.25 - skills[i] * 0.4), card: cardFor(qz, r), skill: skills[i] });
      }
    }
    const t = qz.clock - qz.askAt;
    for (const p of ps) {
      const r = qz.racers.get(p.id);
      const pl = plans.get(p.id);
      if (!r || !pl || r.ans) continue;
      if (farted.has(p.id) && !pl.farted) {
        pl.farted = true;
        pl.at += PUM_DELAY;
      }
      if (pl.card && t >= pl.at * 0.4) {
        if (pl.card === 'dobro') stats.dobro++;
        room.handle(p.id, { t: MSG.QZ_CARD, c: pl.card });
        pl.card = null;
      }
      if (t < Math.min(pl.at, q.t - 0.3)) continue;
      let chance = pl.skill - 0.09 * (q.lvl - 1);
      if (r.cola) chance += (1 - chance) * 0.45;
      const right = Math.random() < clamp(chance, 0.05, 0.98);
      const pool = q.opts.map((_, k) => k).filter((k) => k !== q.ok && !r.cola?.includes(k));
      const i = right || !pool.length ? q.ok : pool[Math.floor(Math.random() * pool.length)];
      if (r.dobro && right) stats.dobroWin++;
      room.handle(p.id, { t: MSG.QZ_ANSWER, n: q.n, i });
    }
  }
  for (const r of qz.racers.values()) {
    stats.attacks += r.stats.attacks;
    stats.blocks += r.stats.blocks;
  }
  QZ.COMBO_EVERY = comboEvery;
  const w = qz.winner || [...qz.racers.values()].sort((a, b) => b.pos - a.pos)[0];
  return { winner: ps.findIndex((p) => p.id === w?.id), questions: qz.n, secs, leadChanges, ...stats };
}

function cardFor(qz, r) {
  const behind = qz.leaderPos() - r.pos;
  if (r.cards.includes('pum') && closestAhead([...qz.racers.values()], r) && Math.random() < 0.55) return 'pum';
  if (r.cards.includes('dobro') && behind >= 2 && Math.random() < 0.5) return 'dobro';
  if (r.cards.includes('cola') && qz.q.lvl >= 2 && Math.random() < 0.4) return 'cola';
  return null;
}

function scenario(label, skills, opts = {}) {
  const wins = skills.map(() => 0);
  let q = 0;
  let s = 0;
  let lc = 0;
  let at = 0;
  let bl = 0;
  let db = 0;
  let dw = 0;
  for (let i = 0; i < RACES; i++) {
    const r = race(skills, opts);
    if (r.winner >= 0) wins[r.winner]++;
    q += r.questions;
    s += r.secs;
    lc += r.leadChanges;
    at += r.attacks;
    bl += r.blocks;
    db += r.dobro;
    dw += r.dobroWin;
  }
  const pct = wins.map((w, i) => `${skills[i].toFixed(2)}${opts.joinAt != null && i === skills.length - 1 ? '*' : ''}: ${((w / RACES) * 100).toFixed(0)}%`).join(' · ');
  console.log(`${label.padEnd(34)} ${pct.padEnd(46)} | ${(q / RACES).toFixed(1)} perg · ${(s / RACES / 60).toFixed(1)} min · ` +
    `${(lc / RACES).toFixed(1)} viradas · ${(at / RACES).toFixed(1)} ataques · ${(bl / RACES).toFixed(1)} bloqueios · tudo-ou-nada ${db ? Math.round((dw / db) * 100) : 0}% certo`);
}

console.log(`Corrida das Perguntas — ${RACES} corridas por cenário, modo ${MODE}, ${LEN} casas\n`);
scenario('1x1 iguais', [0.7, 0.7]);
scenario('1x1 um pouco melhor', [0.75, 0.65]);
scenario('1x1 bem melhor', [0.85, 0.6]);
scenario('1x1 muito melhor', [0.95, 0.5]);
scenario('1x1 bem melhor SEM combo', [0.85, 0.6], { combo: false });
scenario('1x1 um pouco melhor SEM combo', [0.75, 0.65], { combo: false });
scenario('4 jogadores', [0.5, 0.65, 0.8, 0.9]);
scenario('4 jogadores SEM combo', [0.5, 0.65, 0.8, 0.9], { combo: false });
scenario('entra atrasado (líder em 4)', [0.65, 0.9], { joinAt: 4 });
scenario('entra atrasado (líder em 6)', [0.65, 0.9], { joinAt: 6 });
scenario('entra atrasado (líder em 8)', [0.65, 0.9], { joinAt: 8 });
scenario('entra atrasado, igual (líder em 4)', [0.7, 0.7], { joinAt: 4 });
console.log('\n* = entrou no meio da corrida (começa do zero)');
