// Bots de Queimada para testar sozinho: entram numa partida do Ginásio (ou criam uma),
// aceitam convites de queimada e jogam com a IA de scripts/queimada-ai.js.
//
// Uso: node scripts/qmbot.js [nick|quantos=QueimaBot] [convidar=<nick>|-] [habilidade=0.7] [url=ws://localhost:3000/ws] [--dificil]
//   node scripts/qmbot.js            → 1 bot (entra numa partida aberta ou cria uma)
//   node scripts/qmbot.js 3          → 3 bots (dá 2v2 quando você entrar)
//   node scripts/qmbot.js Bot SeuNick → bot que te chama para a queimada quando você chegar

import WebSocket from 'ws';
import { MSG, PALETTE } from '../shared/constants.js';
import { QM, LEVELS } from '../shared/queimada.js';
import { createAi } from './queimada-ai.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const HARD = process.argv.includes('--dificil') || process.argv.includes('--hard');
const first = args[0] || 'QueimaBot';
const COUNT = /^\d+$/.test(first) ? Number(first) : 1;
const BASE = COUNT > 1 || /^\d+$/.test(first) ? 'QueimaBot' : first;
const TARGET = args[1] && args[1] !== '-' ? args[1] : null;
const SKILL = Number(args[2]) || 0.7;
const URL = args[3] || 'ws://localhost:3000/ws';
const TAUNTS = ['QUEIMOU! 🔥', 'pegaaa 😂', 'tá queimado!', 'nem viu 😎', 'cemitério te espera 💀'];
const OUCH = ['aaai 😵', 'foi sem querer...', 'vou voltar do cemitério 👻', 'tô de olho 👀'];
const pick = (l) => l[Math.floor(Math.random() * l.length)];

for (let i = 0; i < COUNT; i++) setTimeout(() => bot(COUNT > 1 ? `${BASE}${i + 1}` : BASE, i), i * 500);

function bot(nick, index) {
  const ws = new WebSocket(URL);
  const send = (o) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(o));
  const say = (text) => send({ t: MSG.CHAT, text });
  const skill = Math.max(0.3, Math.min(1, SKILL + (index % 3 - 1) * 0.08));
  const ai = createAi({ skill, react: 0.32 - skill * 0.18 });
  const players = new Map();
  const qms = new Map();
  let me = null;
  let inQm = null;
  let prev = null;
  let lastIn = '';
  let lastAct = 0;
  let level = LEVELS.easy;
  let ph = 'lobby';

  ws.on('open', () => send({
    t: MSG.HELLO, nick,
    look: { hat: PALETTE.hats[(index * 3) % 8], shirt: PALETTE.shirts[(index * 5 + 1) % 8], skin: PALETTE.skins[index % 4] },
  }));
  ws.on('close', () => { if (index === COUNT - 1) process.exit(0); });
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    switch (m.t) {
      case MSG.WELCOME:
        me = m.you;
        for (const p of m.players) players.set(p.id, p.nick);
        for (const q of m.qms || []) qms.set(q.id, q);
        console.log(`[qmbot] ${nick} conectado (#${me}), habilidade ${skill.toFixed(2)}`);
        setTimeout(enterSomewhere, 700 + index * 400);
        break;
      case MSG.JOIN:
        players.set(m.player.id, m.player.nick);
        if (TARGET && m.player.nick === TARGET) setTimeout(() => invite(m.player.id), 1200);
        break;
      case MSG.LEAVE:
        players.delete(m.id);
        break;
      case MSG.QM_LIVE:
        if (m.gone) qms.delete(m.id);
        else qms.set(m.id, m);
        break;
      case MSG.QM_ENTER:
        inQm = m.id;
        level = m.hard ? LEVELS.hard : LEVELS.easy;
        console.log(`[qmbot] ${nick} entrou na quadra ${m.id}`);
        if (TARGET) for (const [id, n] of players) if (n === TARGET) setTimeout(() => invite(id), 1000);
        break;
      case MSG.QM_EXIT:
        if (m.id === inQm || !inQm) {
          inQm = null;
          setTimeout(enterSomewhere, 3000);
        }
        break;
      case MSG.CHALLENGE:
        if (m.game !== 'queimada') {
          send({ t: MSG.CHALLENGE_REPLY, from: m.from, accept: false });
          say('só jogo queimada 🔴🔵');
          break;
        }
        setTimeout(() => send({ t: MSG.CHALLENGE_REPLY, from: m.from, accept: true }), 900);
        break;
      case MSG.QM_STATE:
        if (inQm) play(m);
        break;
      case MSG.QM_EVENT:
        if (!inQm) break;
        if (m.kind === 'hit' && m.by === me && Math.random() < 0.35) say(pick(TAUNTS));
        if (m.kind === 'hit' && m.to === me && Math.random() < 0.3) say(pick(OUCH));
        if (m.kind === 'revive' && m.id === me) say('VOLTEI DO CEMITÉRIO 👻🔥');
        break;
      case MSG.QM_END:
        if (m.id === inQm) {
          const won = m.winner === me;
          console.log(`[qmbot] ${nick}: fim — ${m.winnerNick} venceu (${m.rank[0][2]} pts)`);
          if (won) say('CAMPEÃO DA QUADRA 🏆');
          else if (Math.random() < 0.5) say('de novo! 😤');
        }
        break;
      default:
        break;
    }
  });

  function enterSomewhere() {
    if (inQm) return;
    // entra na partida com mais gente que ainda tenha lugar; senão cria uma
    const open = [...qms.values()].filter((q) => q.m.length < QM.MAX_MEMBERS).sort((a, b) => b.m.length - a.m.length)[0];
    if (open) send({ t: MSG.QM_JOIN, id: open.id });
    else send({ t: MSG.QM_CREATE, hard: HARD });
  }

  function invite(id) {
    console.log(`[qmbot] ${nick} chamando ${players.get(id)} para a queimada`);
    send({ t: MSG.CHALLENGE, to: id, game: 'queimada' });
  }

  function play(s) {
    ph = s.ph;
    const now = Date.now() / 1000;
    const dt = prev ? Math.max(0.01, now - prev.at) : 1 / 30;
    const ps = s.p.map(([id, x, y, dir, st, t, team, cem, hold, inv, dodgeCd, catchCd, holdT]) => {
      const old = prev?.p.get(id);
      return {
        id, x, y, dir, st, t, team: team ? 'b' : 'a', cem: !!cem, hold, inv, dodgeCd, catchCd, holdT,
        vx: old ? (x - old.x) / dt : 0, vy: old ? (y - old.y) / dt : 0,
      };
    });
    const bs = s.b.map(([x, y, z, st, team], i) => {
      const old = prev?.b[i];
      return {
        x, y, z, st: ['loose', 'live', 'held', 'freeze'][st], team: team === 0 ? 'a' : team === 1 ? 'b' : '',
        vx: old ? (x - old.x) / dt : 0, vy: old ? (y - old.y) / dt : 0,
      };
    });
    prev = { at: now, p: new Map(ps.map((p) => [p.id, p])), b: bs };
    const mine = ps.find((p) => p.id === me);
    if (!mine) return; // na fila
    const o = ai({ me: mine, players: ps, balls: bs, phase: ph, level }, now);
    const key = `${o.mx.toFixed(2)}|${o.my.toFixed(2)}`;
    if (key !== lastIn) {
      send({ t: MSG.QM_INPUT, mx: Math.round(o.mx * 100) / 100, my: Math.round(o.my * 100) / 100 });
      lastIn = key;
    }
    if (o.act && Date.now() - lastAct > 100) {
      send({ t: MSG.QM_ACT, a: o.act, x: o.x, y: o.y, dx: o.dx, dy: o.dy });
      lastAct = Date.now();
    }
  }
}
