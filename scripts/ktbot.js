// Bot de Karatê para treinar sozinho: aceita desafios de karatê, luta com a IA
// de scripts/karate-ai.js (estilo misto, com tempo de reação humano) e pede revanche.
//
// Uso: node scripts/ktbot.js [nick=SenseiBot] [desafiar=<nick>] [estilo=mixed] [url=ws://localhost:3000/ws]
// Estilos: mixed, jabber, puncher, kicker, heavy, turtle (ver STYLES)

import WebSocket from 'ws';
import { MSG } from '../shared/constants.js';
import { createAi } from './karate-ai.js';

const NICK = process.argv[2] || 'SenseiBot';
const TARGET = process.argv[3] && process.argv[3] !== '-' ? process.argv[3] : null;
const STYLE = process.argv[4] || 'mixed';
const URL = process.argv[5] || 'ws://localhost:3000/ws';
const TAUNTS = ['OSS! 🥋', 'Hiyaaa!', 'faixa branca detected', 'vem!', 'kkkk tá lento'];

const ws = new WebSocket(URL);
const send = (o) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(o));
let me = null;
let fighting = false;
let ai = null;
let lastIn = '';
let lastAct = 0;
const players = new Map();
const say = (text) => send({ t: MSG.CHAT, text });

ws.on('open', () => send({ t: MSG.HELLO, nick: NICK, look: { hat: '#e8412b', shirt: '#222222' } }));
ws.on('close', () => process.exit(0));
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  switch (m.t) {
    case MSG.WELCOME:
      me = m.you;
      for (const p of m.players) players.set(p.id, p.nick);
      console.log(`[ktbot] conectado como ${NICK} (#${me}), estilo ${STYLE}`);
      if (TARGET) setTimeout(challengeTarget, 800);
      break;
    case MSG.JOIN:
      players.set(m.player.id, m.player.nick);
      if (TARGET && m.player.nick === TARGET) setTimeout(challengeTarget, 800);
      break;
    case MSG.LEAVE:
      players.delete(m.id);
      break;
    case MSG.CHALLENGE:
      if (m.game !== 'karate') {
        send({ t: MSG.CHALLENGE_REPLY, from: m.from, accept: false });
        say('só luto karatê 🥋');
        break;
      }
      console.log(`[ktbot] desafio de ${m.nick}${m.rematch ? ' (revanche)' : ''} — aceitando`);
      setTimeout(() => send({ t: MSG.CHALLENGE_REPLY, from: m.from, accept: true }), 1000);
      break;
    case MSG.KT_START:
      if (m.a.id !== me && m.b.id !== me) break;
      fighting = true;
      ai = createAi(STYLE, { react: 0.22 });
      say('OSS! Vamos lutar 🥋');
      break;
    case MSG.KT_STATE:
      if (fighting) play(m);
      break;
    case MSG.KT_EVENT:
      if (!fighting) break;
      if (m.kind === 'ko' && m.winner === me && Math.random() < 0.7) say(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
      if (m.kind === 'parry' && m.to === me) say('como assim?! 😵');
      break;
    case MSG.KT_END:
      if (m.winner !== me && m.loser !== me) break;
      fighting = false;
      console.log(`[ktbot] fim: ${m.winnerNick} venceu (${m.score.join('×')})`);
      if (m.loser === me && m.reason !== 'wo') {
        say('revanche!! 😤');
        setTimeout(() => send({ t: MSG.CHALLENGE, to: m.winner, rematch: true, game: 'karate' }), 2500);
      } else if (m.winner === me) say('OSS. Bom treino 🙇');
      break;
    default:
      break;
  }
});

function play(s) {
  if (s.ph !== 'fight') return;
  const f = Object.fromEntries(s.f.map((x) => [x[0], { id: x[0], x: x[1], y: x[2], dir: x[3], st: x[4], t: x[5], hp: x[6], dashCd: x[7] }]));
  const mine = f[me];
  const opp = Object.values(f).find((x) => x.id !== me);
  if (!mine || !opp) return;
  const o = ai(mine, opp, Date.now() / 1000);
  const key = `${o.mx}|${o.my}|${o.block}`;
  if (key !== lastIn) {
    send({ t: MSG.KT_INPUT, mx: o.mx, my: o.my, block: o.block });
    lastIn = key;
  }
  // não estoura o limite de mensagens do servidor
  if (o.act && Date.now() - lastAct > 90) {
    send({ t: MSG.KT_ACT, a: o.act, dx: o.mx, dy: o.my });
    lastAct = Date.now();
  }
}

function challengeTarget() {
  for (const [id, nick] of players) {
    if (nick === TARGET) {
      console.log(`[ktbot] desafiando ${nick} para o karatê`);
      send({ t: MSG.CHALLENGE, to: id, game: 'karate' });
      return;
    }
  }
}
