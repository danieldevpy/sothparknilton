// Bots de TORCIDA: entram na plateia do Dojo quando há luta de Karatê, torcem e falam.
// Uso: node scripts/fanbot.js [quantidade=4] [url=ws://localhost:3000/ws]
// Dica: rode junto com dois ktbot lutando (ver CLAUDE.md) para ver a plateia cheia.

import WebSocket from 'ws';
import { MSG, PALETTE, PROTOCOL_VERSION } from '../shared/constants.js';
import { CHEER_IDS } from '../shared/arena.js';

const N = Number(process.argv[2]) || 4;
const URL = process.argv[3] || 'ws://localhost:3000/ws';
const NICKS = ['Torcedor', 'Fã', 'Pipoca', 'Grito', 'Palma', 'Vaia', 'Zueira', 'Galera'];
const LINES = ['UUUUH!', 'que golpe!', 'bora bora!', 'kkkkk', 'ACABA COM ELE', 'olha a defesa!', 'eita', 'chuta!'];
const pick = (l) => l[Math.floor(Math.random() * l.length)];

function bot(i) {
  const ws = new WebSocket(URL);
  const fights = new Map();
  let me = null;
  let watching = null;
  let side = 0;
  const send = (m) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(m));
  ws.on('open', () => send({
    t: MSG.HELLO, v: PROTOCOL_VERSION, nick: `${pick(NICKS)}${i + 1}`,
    look: { hat: pick(PALETTE.hats), shirt: pick(PALETTE.shirts), skin: pick(PALETTE.skins) },
  }));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    if (m.t === MSG.WELCOME) {
      me = m.you;
      for (const f of m.fights || []) fights.set(f.id, f);
    } else if (m.t === MSG.KT_START) fights.set(m.id, m);
    else if (m.t === MSG.KT_END) {
      fights.delete(m.id);
      if (watching === m.id) watching = null;
    } else if (m.t === MSG.KT_WATCH) {
      watching = m.id;
      side = Math.random() < 0.7 ? (Math.random() < 0.5 ? m.a.id : m.b.id) : 0;
      console.log(`[fã ${me}] na plateia da luta #${m.id}`);
    } else if (m.t === MSG.KT_UNWATCH && m.reason !== 'left') watching = null;
  });
  setInterval(() => {
    if (!me) return;
    if (!watching && fights.size) {
      const ids = [...fights.keys()];
      send({ t: MSG.KT_WATCH, id: ids[Math.floor(Math.random() * ids.length)] });
      return;
    }
    if (!watching) return;
    const r = Math.random();
    if (r < 0.3) send({ t: MSG.KT_CHEER, r: side ? 'go' : 'clap', side: side || undefined });
    else if (r < 0.55) send({ t: MSG.KT_CHEER, r: pick(CHEER_IDS) });
    else if (r < 0.62) send({ t: MSG.CHAT, text: pick(LINES) });
  }, 900 + Math.random() * 900);
  ws.on('close', () => process.exit(0));
}

for (let i = 0; i < N; i++) setTimeout(() => bot(i), i * 250);
