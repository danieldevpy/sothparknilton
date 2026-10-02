// Simulador de equilíbrio do Gol a Gol: chutes aleatórios ("rand") ou bem feitos ("skill")
// contra um goleiro que reage com atraso de N ms. Mostra % de gols por chute.
// Uso: node scripts/golagol-balance.js [reacaoMs=250] [rand|skill] ['{"KEEPER_SPEED":165,"mouth":90}']

import { Room } from '../server/Room.js';
import { MSG } from '../shared/constants.js';
import { GG, ggGeometry, keeperX, spotX } from '../shared/golagol.js';
import { MAP } from '../shared/map.js';
const OV = JSON.parse(process.argv[4] || '{}'); for (const [k,v] of Object.entries(OV)) { if (k==='mouth') MAP.goalMouth = v; else GG[k]=v; }
const SKILL = process.argv[3] === 'skill';
let { midY, mouth } = ggGeometry(); mouth = MAP.goalMouth;
const REACT = Number(process.argv[2] || 250);
const tally = {};
for (let trial = 0; trial < 400; trial++) {
  let now = 1e7; const room = new Room({ now: () => now });
  const a = room.addPlayer({ nick: 'Aa' }, () => {}).player; const b = room.addPlayer({ nick: 'Bb' }, () => {}).player;
  room.handle(a.id, { t: MSG.CHALLENGE, to: b.id }); room.handle(b.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: true });
  const m = room.match; const tick = () => { now += 1000/30; room.tick(1/30); };
  for (let i = 0; i < 100; i++) tick();
  const sh = room.players.get(m.shooter); const kp = room.players.get(m.keeperId); const ks = m.keeperSide;
  const ty = SKILL ? midY + (Math.random()<0.5?-1:1) * (mouth - 14 - Math.random()*18) : midY + (Math.random()*2-1) * (mouth - 12); const curve = Math.round((Math.random()*2-1)*4)/4;
  const bx = spotX(m.shooterSide); const gx = keeperX(ks);
  const angle = Math.atan2(ty - midY, gx - bx) - curve * 0.25 + (Math.random()-0.5)*0.08;
  const power = SKILL ? 0.74 + Math.random()*0.18 : 0.5 + Math.random() * 0.45;
  room.handle(sh.id, { t: MSG.GG_SHOOT, angle, power, curve });
  const hist = []; let dove = false; let res = null;
  const orig = room.broadcast.bind(room);
  room.broadcast = (msg) => { if (msg.t === MSG.GG_EVENT && !['kick','turn','parry','post','tired'].includes(msg.kind)) res = res || msg.kind; };
  for (let i = 0; i < 150 && !res; i++) {
    tick(); if (!m.ball) continue;
    hist.push([now, m.ball.x, m.ball.y]);
    const seen = hist.filter(([t]) => now - t >= REACT);
    if (seen.length >= 2) {
      const [t1,x1,y1] = seen.at(-2), [t2,x2,y2] = seen.at(-1);
      const vx = (x2-x1)/(t2-t1), vy=(y2-y1)/(t2-t1);
      if (vx && Math.sign(gx-x2)===Math.sign(vx)) { const th=(gx-x2)/vx; const py=y2+vy*th; room.handle(kp.id,{t:MSG.GG_INPUT, ky:py});
        if (!dove && th < 250 && Math.abs(py - m.keepers[ks].y) > GG.KEEPER_REACH) { dove = true; room.handle(kp.id,{t:MSG.GG_INPUT,dive: py < m.keepers[ks].y ? -1 : 1}); } }
    }
  }
  tally[res] = (tally[res]||0)+1;
}
const n=Object.values(tally).reduce((a,b)=>a+b,0); console.log(process.argv[3]||'rand', 'reação', REACT, 'gol%', (100*((tally.goal||0))/n).toFixed(0), JSON.stringify(tally));
