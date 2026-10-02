// Simulador de equilíbrio do Karatê: coloca estilos de IA para lutar entre si
// (sem rede, Room real, tempo simulado) e mostra % de vitória e dano por golpe.
// Um golpe "spamado" sozinho não deveria vencer o estilo misto com folga.
//
// Uso: node scripts/karate-balance.js [lutas por confronto=40]

import { Room } from '../server/Room.js';
import { MSG } from '../shared/constants.js';
import { KT, MOVES } from '../shared/karate.js';
import { createAi, STYLES } from './karate-ai.js';

const N = Number(process.argv[2]) || 40;
const DT = 1 / 30;

function fight(styleA, styleB) {
  let now = 1_000_000;
  const room = new Room({ now: () => now });
  const hits = [];
  const a = room.addPlayer({ nick: 'LutaA' }, () => {}).player;
  let endMsg = null;
  const b = room.addPlayer({ nick: 'LutaB' }, (s) => {
    const m = JSON.parse(s);
    if (m.t === MSG.KT_EVENT && (m.kind === 'hit' || m.kind === 'block' || m.kind === 'guardbreak')) hits.push(m);
    if (m.t === MSG.KT_END) endMsg = m;
  }).player;
  room.handle(a.id, { t: MSG.CHALLENGE, to: b.id, game: 'karate' });
  room.handle(b.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: true });
  const f = room.fightOf.get(a.id);
  const ais = new Map([[a.id, createAi(styleA)], [b.id, createAi(styleB)]]);
  for (let i = 0; i < 30 * 60 * 6 && !endMsg; i++) {
    if (f.phase === 'fight') {
      // as duas IAs decidem vendo o mesmo estado; só depois as entradas são aplicadas
      const outs = f.ids.map((id) => [id, ais.get(id)({ ...f.fighters.get(id) }, { ...f.fighters.get(f.other(id)) }, f.clock)]);
      for (const [id, o] of outs) {
        room.handle(id, { t: MSG.KT_INPUT, mx: o.mx, my: o.my, block: o.block });
        if (o.act) room.handle(id, { t: MSG.KT_ACT, a: o.act, dx: o.mx, dy: o.my });
      }
    }
    now += DT * 1000;
    room.tick(DT);
  }
  return { winA: endMsg?.winner === a.id, hits, aId: a.id };
}

const styles = Object.keys(STYLES);
console.log(`Karatê — ${N} lutas por confronto (linha vence coluna, %)\n`);
console.log(['', ...styles].map((s) => s.padStart(8)).join(''));
const dmgBy = Object.fromEntries(Object.keys(MOVES).map((m) => [m, 0]));
for (const sa of styles) {
  const row = [sa.padStart(8)];
  for (const sb of styles) {
    let wins = 0;
    for (let i = 0; i < N; i++) {
      const r = fight(sa, sb);
      if (r.winA) wins++;
      if (sa === 'mixed' && sb === 'mixed') for (const h of r.hits) if (h.kind === 'hit') dmgBy[h.m] += h.dmg;
    }
    row.push(`${Math.round((wins / N) * 100)}%`.padStart(8));
  }
  console.log(row.join(''));
}
const tot = Object.values(dmgBy).reduce((s, v) => s + v, 0) || 1;
console.log('\nDano por golpe (misto x misto):');
for (const [m, v] of Object.entries(dmgBy)) console.log(`  ${MOVES[m].name.padEnd(12)} ${Math.round((v / tot) * 100)}%`);
console.log(`\n(HP ${KT.HP}, round ${KT.ROUND_TIME}s, dash a cada ${KT.DASH_CD}s)`);
