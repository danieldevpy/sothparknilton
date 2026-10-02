// Bots de desenvolvimento: conectam na sala, andam, falam e fazem emotes.
// Uso: node scripts/bots.js [quantidade=3] [url=ws://localhost:3000/ws]

import WebSocket from 'ws';
import { MSG, PALETTE, EMOTES } from '../shared/constants.js';
import { MAP } from '../shared/map.js';

const N = Number(process.argv[2]) || 3;
const URL = process.argv[3] || 'ws://localhost:3000/ws';

const NAMES = ['Kenny', 'Butters', 'Tolkien', 'Wendy', 'Jimmy', 'Token', 'Clyde', 'Bebe', 'Craig', 'Tweek'];
const LINES = [
  'eae galera!', 'alguém viu meu gorro?', 'bora jogar bola', 'esse lago tá gelado demais',
  'quack quack', 'quem jogou moeda na fonte?', 'tô com fome', 'olha eu dançando',
  'sério que você fez isso?', 'kkkkkkkk', 'oi sumido', 'partiu área de sports',
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function bot(i) {
  const ws = new WebSocket(URL);
  const send = (o) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(o));
  ws.on('open', () => {
    send({ t: MSG.HELLO, nick: `${NAMES[i % NAMES.length]}Bot`, look: { hat: pick(PALETTE.hats), shirt: pick(PALETTE.shirts), skin: pick(PALETTE.skins) } });
    const act = () => {
      const r = Math.random();
      if (r < 0.45) send({ t: MSG.MOVE, x: 100 + Math.random() * (MAP.width - 200), y: MAP.walkTop + 40 + Math.random() * (MAP.height - MAP.walkTop - 80) });
      else if (r < 0.65) send({ t: MSG.CHAT, text: pick(LINES) });
      else if (r < 0.8) send({ t: MSG.EMOTE, e: pick(Object.keys(EMOTES)) });
      else if (r < 0.9) send({ t: MSG.INTERACT, id: 'ball' });
      else send({ t: MSG.INTERACT, id: pick(['fountain', 'bench-1', 'lamp-2', 'bench-5']) });
      setTimeout(act, 1500 + Math.random() * 3500);
    };
    setTimeout(act, 500 + Math.random() * 1500);
  });
  ws.on('close', () => setTimeout(() => bot(i), 3000));
  ws.on('error', () => {});
}

for (let i = 0; i < N; i++) setTimeout(() => bot(i), i * 300);
console.log(`${N} bots conectando em ${URL}`);
