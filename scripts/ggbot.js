// Bot de Gol a Gol para testar/treinar sozinho.
// Aceita qualquer desafio, defende acompanhando a bola (com "reflexo humano")
// e chuta em cantos com efeito aleatório. Pede revanche quando perde.
//
// Uso: node scripts/ggbot.js [nick=GoleiroBot] [desafiar=<nick>] [url=ws://localhost:3000/ws]

import WebSocket from 'ws';
import { MSG } from '../shared/constants.js';
import { GG, ggGeometry, keeperX, spotX } from '../shared/golagol.js';

const NICK = process.argv[2] || 'GoleiroBot';
const TARGET = process.argv[3] || null;
const URL = process.argv[4] || 'ws://localhost:3000/ws';
const REACTION_MS = 220;
const { midY, mouth } = ggGeometry();

const ws = new WebSocket(URL);
const send = (o) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(o));
let me = null;
let side = null;
let shotScheduled = false;
let lastDive = 0;
const players = new Map();
const history = []; // [at, x, y] da bola

ws.on('open', () => send({ t: MSG.HELLO, nick: NICK, look: { hat: '#222222', shirt: '#f2c12e' } }));
ws.on('close', () => process.exit(0));
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  switch (m.t) {
    case MSG.WELCOME:
      me = m.you;
      for (const p of m.players) players.set(p.id, p.nick);
      console.log(`[ggbot] conectado como ${NICK} (#${me})`);
      if (TARGET) setTimeout(challengeTarget, 800);
      break;
    case MSG.JOIN:
      players.set(m.player.id, m.player.nick);
      if (TARGET && m.player.nick === TARGET) setTimeout(challengeTarget, 800);
      break;
    case MSG.CHALLENGE:
      console.log(`[ggbot] desafio de ${m.nick}${m.rematch ? ' (revanche)' : ''} — aceitando`);
      setTimeout(() => send({ t: MSG.CHALLENGE_REPLY, from: m.from, accept: true }), 1200);
      break;
    case MSG.GG_START:
      side = m.left.id === me ? 'left' : m.right.id === me ? 'right' : null;
      shotScheduled = false;
      if (side) send({ t: MSG.CHAT, text: 'vem que tem! 🧤' });
      break;
    case MSG.GG_STATE:
      if (side) play(m);
      break;
    case MSG.GG_EVENT:
      if (!side) break;
      if (m.kind === 'save' && m.by === me) send({ t: MSG.CHAT, text: 'PEGUEI! 😎' });
      if (m.kind === 'over' && m.shooter !== me) send({ t: MSG.CHAT, text: 'kkkkkk isolou' });
      break;
    case MSG.GG_END:
      if (!side) break;
      side = null;
      if (m.loser === me) {
        send({ t: MSG.CHAT, text: 'foi sorte... revanche!' });
        setTimeout(() => send({ t: MSG.CHALLENGE, to: m.winner, rematch: true }), 2500);
      } else {
        send({ t: MSG.EMOTE, e: 'dance' });
      }
      break;
    default:
      break;
  }
});

function challengeTarget() {
  const id = [...players].find(([, n]) => n === TARGET)?.[0];
  if (id) send({ t: MSG.CHALLENGE, to: id });
}

function play(s) {
  const now = Date.now();
  if (s.sh === me) {
    shoot(s);
    return;
  }
  shotScheduled = false;
  // goleiro: olha onde a bola estava REACTION_MS atrás e extrapola até a linha
  if (s.b) history.push([now, s.b[0], s.b[1]]);
  while (history.length && now - history[0][0] > 1000) history.shift();
  const kx = keeperX(side);
  const seen = history.filter(([at]) => now - at >= REACTION_MS);
  if (s.ph !== 'flight' || seen.length < 2) {
    if (s.ph === 'aim') send({ t: MSG.GG_INPUT, ky: midY + Math.sin(now / 400) * 25 }); // balança no gol
    return;
  }
  const [t1, x1, y1] = seen[seen.length - 2];
  const [t2, x2, y2] = seen[seen.length - 1];
  const vx = (x2 - x1) / Math.max(1, t2 - t1);
  const vy = (y2 - y1) / Math.max(1, t2 - t1);
  if (Math.sign(kx - x2) !== Math.sign(vx) || !vx) return;
  const tHit = (kx - x2) / vx;
  const predY = y2 + vy * tHit;
  send({ t: MSG.GG_INPUT, ky: Math.round(predY) });
  const myY = s.k[side][0];
  if (tHit < 260 && Math.abs(predY - myY) > GG.KEEPER_REACH && now - lastDive > 1200) {
    lastDive = now;
    send({ t: MSG.GG_INPUT, dive: predY < myY ? -1 : 1 });
  }
}

function shoot(s) {
  if (s.ph !== 'aim' || shotScheduled) return;
  shotScheduled = true;
  const wait = 1500 + Math.random() * 3500;
  const sy = midY + (Math.random() - 0.5) * 2 * GG.SPOT_RANGE * 0.8;
  send({ t: MSG.GG_INPUT, sy: Math.round(sy) });
  setTimeout(() => send({ t: MSG.GG_INPUT, charging: true }), wait - 900);
  setTimeout(() => {
    const target = midY + (Math.random() < 0.5 ? -1 : 1) * (mouth - 25);
    const bx = spotX(side);
    const gx = keeperX(side === 'left' ? 'right' : 'left');
    const curve = Math.round((Math.random() * 2 - 1) * 4) / 4;
    const angle = Math.atan2(target - sy, gx - bx) - curve * 0.25; // compensa o efeito (rotação horária = +ângulo)
    const power = 0.6 + Math.random() * 0.38;
    send({ t: MSG.GG_SHOOT, angle, power, curve });
  }, wait);
}
