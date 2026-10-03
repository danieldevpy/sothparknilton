// Simulador de equilíbrio da Queimada: IAs jogando partidas inteiras entre si (sem rede,
// Room real, tempo simulado). Mostra quanto os arremessos acertam, quantas pegadas/esquivas
// dão certo, duração das rodadas e se habilidade decide (o melhor deve vencer, mas não sempre).
//
// Uso: node scripts/queimada-balance.js [partidas=30] [jogadores=2|4] [fácil|difícil]

import { Room } from '../server/Room.js';
import { MSG } from '../shared/constants.js';
import { QM } from '../shared/queimada.js';
import { createAi } from './queimada-ai.js';

const N = Number(process.argv[2]) || 30;
const PLAYERS = Number(process.argv[3]) || 2;
const HARD = /^d|^h/i.test(process.argv[4] || '');
const DT = 1 / 30;
const SKILLS = [0.9, 0.5, 0.75, 0.6, 0.7, 0.55];

function match() {
  let now = 1_000_000;
  const room = new Room({ now: () => now });
  const stats = { throws: 0, hits: 0, catches: 0, fumbles: 0, whoosh: 0, slow: 0, banks: 0, rounds: [], end: null, cemHits: 0 };
  let roundStart = 0;
  const ids = [];
  for (let i = 0; i < PLAYERS; i++) {
    const p = room.addPlayer({ nick: `IA${i}` }, (s) => {
      if (i !== 0) return;
      const m = JSON.parse(s);
      if (m.t === MSG.QM_EVENT) {
        if (m.kind === 'throw') stats.throws++;
        if (m.kind === 'hit') { stats.hits++; if (m.cem) stats.cemHits++; if (m.bank) stats.banks++; }
        if (m.kind === 'catch') stats.catches++;
        if (m.kind === 'fumble') stats.fumbles++;
        if (m.kind === 'whoosh') stats.whoosh++;
        if (m.kind === 'slow') stats.slow++;
        if (m.kind === 'go') roundStart = now;
        if (m.kind === 'roundEnd') stats.rounds.push({ secs: (now - roundStart) / 1000, reason: m.reason });
      }
      if (m.t === MSG.QM_END) stats.end = m;
    }).player;
    ids.push(p.id);
  }
  room.handle(ids[0], { t: MSG.QM_CREATE, hard: HARD });
  const qm = room.qmOf.get(ids[0]);
  for (const id of ids.slice(1)) room.handle(id, { t: MSG.QM_JOIN, id: qm.id });
  const skill = new Map(ids.map((id, i) => [id, SKILLS[i % SKILLS.length]]));
  const ais = new Map(ids.map((id) => [id, createAi({ skill: skill.get(id), react: 0.32 - skill.get(id) * 0.18 })]));
  const sent = new Map();
  for (let i = 0; i < 30 * 60 * 15 && !stats.end; i++) {
    const view = {
      phase: qm.phase,
      level: qm.level,
      players: [...qm.court.values()].map((p) => ({ ...p, vx: p.mx * QM.SPEED, vy: p.my * QM.SPEED })),
      balls: qm.balls.map((b) => ({ ...b })),
    };
    const outs = [];
    for (const id of ids) {
      const me = qm.court.get(id);
      if (!me) continue;
      outs.push([id, ais.get(id)({ ...view, me: { ...me } }, qm.clock)]);
    }
    for (const [id, o] of outs) {
      const key = `${o.mx.toFixed(2)}|${o.my.toFixed(2)}`;
      if (sent.get(id) !== key) {
        room.handle(id, { t: MSG.QM_INPUT, mx: o.mx, my: o.my });
        sent.set(id, key);
      }
      if (o.act) room.handle(id, { t: MSG.QM_ACT, a: o.act, x: o.x, y: o.y, dx: o.dx, dy: o.dy });
    }
    now += DT * 1000;
    room.tick(DT);
  }
  return { stats, skill, ids };
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '-');
const tot = { throws: 0, hits: 0, catches: 0, fumbles: 0, whoosh: 0, slow: 0, banks: 0, cemHits: 0, rounds: [], matches: 0, unfinished: 0 };
const winsBySkill = new Map();
for (let i = 0; i < N; i++) {
  const { stats, skill } = match();
  for (const k of ['throws', 'hits', 'catches', 'fumbles', 'whoosh', 'slow', 'banks', 'cemHits']) tot[k] += stats[k];
  tot.rounds.push(...stats.rounds);
  if (!stats.end) { tot.unfinished++; continue; }
  tot.matches++;
  const s = skill.get(stats.end.winner);
  winsBySkill.set(s, (winsBySkill.get(s) || 0) + 1);
}
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
console.log(`Queimada — ${N} partidas, ${PLAYERS} jogadores, modo ${HARD ? 'difícil' : 'fácil'} (meta ${QM.TARGET} pts)\n`);
console.log(`arremessos ${tot.throws} · acertos ${tot.hits} (${pct(tot.hits, tot.throws)}) · do cemitério ${tot.cemHits} · tabela ${tot.banks}`);
console.log(`pegadas ${tot.catches} (${pct(tot.catches, tot.throws)} dos arremessos) · escapou ${tot.fumbles} · whoosh ${tot.whoosh} · demorou ${tot.slow}`);
console.log(`rodadas: ${tot.rounds.length} · média ${avg(tot.rounds.map((r) => r.secs)).toFixed(1)} s · por tempo ${pct(tot.rounds.filter((r) => r.reason === 'time').length, tot.rounds.length)}`);
console.log(`rodadas por partida: ${(tot.rounds.length / Math.max(1, N)).toFixed(1)} · partidas sem fim: ${tot.unfinished}`);
console.log('vitórias por habilidade:', [...winsBySkill].sort((a, b) => b[0] - a[0]).map(([s, w]) => `${s}: ${pct(w, tot.matches)}`).join(' · '));
