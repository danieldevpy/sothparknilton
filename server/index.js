// Entrada do servidor: HTTP estático (client/ e shared/) + WebSocket em /ws.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { Room } from './Room.js';
import { MSG, TICK_HZ, SNAPSHOT_HZ } from '../shared/constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT_DIR = path.join(ROOT, 'client');
const SHARED_DIR = path.join(ROOT, 'shared');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const HELLO_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 15_000;
const MSG_BUDGET_PER_SEC = 40; // mensagens por segundo por conexão

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const [base, rel] = pathname.startsWith('/shared/')
    ? [SHARED_DIR, pathname.slice('/shared/'.length)]
    : [CLIENT_DIR, pathname.slice(1)];
  const file = path.resolve(base, rel);
  if (!file.startsWith(base + path.sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
}

export function createGameServer({ port = 3000, host = '0.0.0.0', log = console.log } = {}) {
  const room = new Room();

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, players: room.players.size }));
      return;
    }
    serveStatic(req, res);
  });

  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });

  wss.on('connection', (ws) => {
    let playerId = null;
    let budget = MSG_BUDGET_PER_SEC;
    let budgetAt = Date.now();
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    const helloTimer = setTimeout(() => { if (!playerId) ws.close(4000, 'hello timeout'); }, HELLO_TIMEOUT_MS);

    ws.on('message', (raw) => {
      const now = Date.now();
      budget = Math.min(MSG_BUDGET_PER_SEC, budget + ((now - budgetAt) / 1000) * MSG_BUDGET_PER_SEC);
      budgetAt = now;
      if (budget < 1) return; // flood: descarta
      budget -= 1;

      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (playerId === null) {
        if (msg?.t !== MSG.HELLO) return;
        const res = room.addPlayer(msg, (data) => {
          if (ws.readyState === ws.OPEN) ws.send(data);
        });
        if (res.error) {
          ws.send(JSON.stringify({ t: MSG.ERROR, msg: res.error, fatal: true }));
          ws.close(4001, 'bad hello');
          return;
        }
        playerId = res.player.id;
        clearTimeout(helloTimer);
        log(`[join] #${playerId} ${res.player.nick} (online: ${room.players.size})`);
        return;
      }
      room.handle(playerId, msg);
    });

    ws.on('close', () => {
      clearTimeout(helloTimer);
      if (playerId !== null) {
        const nick = room.players.get(playerId)?.nick;
        room.removePlayer(playerId);
        log(`[leave] #${playerId} ${nick} (online: ${room.players.size})`);
      }
    });
  });

  // loop de simulação + snapshots
  let last = performance.now();
  let tickN = 0;
  const snapEvery = Math.max(1, Math.round(TICK_HZ / SNAPSHOT_HZ));
  const loop = setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    room.tick(dt);
    if (++tickN % snapEvery === 0 && room.players.size) room.broadcast(room.snapshot());
  }, 1000 / TICK_HZ);

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);

  const ready = new Promise((resolve) => {
    server.listen(port, host, () => resolve(server.address().port));
  });

  async function close() {
    clearInterval(loop);
    clearInterval(heartbeat);
    for (const ws of wss.clients) ws.terminate();
    wss.close();
    await new Promise((r) => server.close(r));
  }

  return { server, room, ready, close };
}

// Executado diretamente (npm start)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  const game = createGameServer({ port });
  game.ready.then((p) => console.log(`Nilton Park rodando em http://localhost:${p}`));
}
