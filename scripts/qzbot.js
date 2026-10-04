// Bots da Corrida das Perguntas que entram pela rede (como gente de verdade): para testar sala cheia,
// plateia, convites e o celular. Eles NÃO sabem a resposta (o servidor só manda na revelação): chutam,
// mas guardam o que aprenderam nas revelações e acertam se a pergunta repetir. Para um adversário que
// joga bem, use os robôs da própria sala (🤖 + Robô na lousa).
//
// Uso: node scripts/qzbot.js [nick|quantos=QuizBot] [convidar=<nick>|-] [url=ws://localhost:3000/ws] [--assistir]
//   node scripts/qzbot.js              → 1 bot (entra numa sala aberta ou cria uma)
//   node scripts/qzbot.js 3            → 3 bots correndo na mesma sala
//   node scripts/qzbot.js 4 - ws://localhost:3200/ws --assistir   → 4 bots na plateia, torcendo
//   node scripts/qzbot.js Bot SeuNick  → bot que te chama para a corrida quando você chegar

import WebSocket from 'ws';
import { MSG, PALETTE } from '../shared/constants.js';
import { CHEER_IDS } from '../shared/quiz.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const WATCH = process.argv.includes('--assistir') || process.argv.includes('--watch');
const first = args[0] || 'QuizBot';
const COUNT = /^\d+$/.test(first) ? Number(first) : 1;
const BASE = COUNT > 1 || /^\d+$/.test(first) ? 'QuizBot' : first;
const TARGET = args[1] && args[1] !== '-' ? args[1] : null;
const URL = args[2] || 'ws://localhost:3000/ws';
const RIGHT = ['acertei! 🤓', 'easy peasy 😎', 'yes!!', 'sabia essa 📚'];
const WRONG = ['chutei 🙈', 'nossa, errei', 'essa era difícil 😅', 'ops'];
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const memory = new Map(); // enunciado → texto da resposta certa (aprende nas revelações)

for (let i = 0; i < COUNT; i++) setTimeout(() => bot(COUNT > 1 ? `${BASE}${i + 1}` : BASE, i), i * 400);

function bot(nick, index) {
  const ws = new WebSocket(URL);
  const send = (o) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(o));
  const players = new Map();
  const rooms = new Map();
  let me = null;
  let inRoom = null;
  let q = null;
  let racing = false;
  let picked = -1;

  ws.on('open', () => send({
    t: MSG.HELLO, nick,
    look: { hat: PALETTE.hats[(index * 3 + 2) % 8], shirt: PALETTE.shirts[(index * 5 + 3) % 8], skin: PALETTE.skins[(index + 1) % 4] },
  }));
  ws.on('close', () => { if (index === COUNT - 1) process.exit(0); });
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    switch (m.t) {
      case MSG.WELCOME:
        me = m.you;
        for (const p of m.players) players.set(p.id, p.nick);
        for (const r of m.qzs || []) rooms.set(r.id, r);
        console.log(`[qzbot] ${nick} conectado (#${me})${WATCH ? ' — plateia' : ''}`);
        setTimeout(enterSomewhere, 600 + index * 300);
        break;
      case MSG.JOIN:
        players.set(m.player.id, m.player.nick);
        if (TARGET && m.player.nick === TARGET) setTimeout(() => send({ t: MSG.CHALLENGE, to: m.player.id, game: 'quiz' }), 1200);
        break;
      case MSG.LEAVE:
        players.delete(m.id);
        break;
      case MSG.QZ_LIVE:
        if (m.gone) rooms.delete(m.id);
        else rooms.set(m.id, m);
        break;
      case MSG.QZ_ENTER:
        inRoom = m.id;
        racing = m.role === 'play';
        console.log(`[qzbot] ${nick} entrou na sala ${m.id} (${racing ? 'correndo' : 'assistindo'})`);
        if (TARGET) for (const [id, n] of players) if (n === TARGET) setTimeout(() => send({ t: MSG.CHALLENGE, to: id, game: 'quiz' }), 900);
        break;
      case MSG.QZ_ROOM:
        racing = m.r.some((r) => r.id === me);
        break;
      case MSG.QZ_EXIT:
        if (m.id === inRoom || !inRoom) {
          inRoom = null;
          setTimeout(enterSomewhere, 2500);
        }
        break;
      case MSG.QZ_Q:
        q = m;
        picked = -1;
        if (racing) setTimeout(() => answer(m), 1500 + Math.random() * 5000);
        else if (Math.random() < 0.5) setTimeout(() => cheer(), 800 + Math.random() * 3000);
        break;
      case MSG.QZ_REVEAL:
        if (q && q.n === m.n) {
          memory.set(q.q, m.a);
          if (racing && picked >= 0 && Math.random() < 0.3) send({ t: MSG.CHAT, text: pick(picked === m.ok ? RIGHT : WRONG) });
        }
        if (!racing && Math.random() < 0.4) setTimeout(() => cheer(), 400 + Math.random() * 1200);
        break;
      case MSG.CHALLENGE:
        if (m.game === 'quiz') setTimeout(() => send({ t: MSG.CHALLENGE_REPLY, from: m.from, accept: true }), 800);
        break;
      default:
        break;
    }
  });

  function answer(m) {
    if (!q || q.n !== m.n || picked >= 0) return;
    const known = memory.get(m.q);
    const i = known != null && m.opts.includes(known) ? m.opts.indexOf(known) : Math.floor(Math.random() * m.opts.length);
    picked = i;
    send({ t: MSG.QZ_ANSWER, n: m.n, i });
  }

  function cheer() {
    const r = pick(CHEER_IDS);
    send({ t: MSG.QZ_CHEER, r, side: 0 });
  }

  function enterSomewhere() {
    if (inRoom || !me) return;
    const open = [...rooms.values()].sort((a, b) => a.id - b.id)[0];
    if (open) send({ t: MSG.QZ_JOIN, id: open.id, as: WATCH ? 'watch' : 'play' });
    else if (!WATCH && index === 0) send({ t: MSG.QZ_CREATE, mode: 'normal', len: 10 });
    else setTimeout(enterSomewhere, 1500);
  }
}
