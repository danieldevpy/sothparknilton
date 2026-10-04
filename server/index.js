// Entrada do servidor: HTTP estático (client/ e shared/) + WebSocket em /ws.

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { Room } from './Room.js';
import { voiceConfigFromEnv } from './VoiceHub.js';
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
const HEARTBEAT_MS = 10_000; // conexão morta (celular sem sinal) sai da sala em ~10–20 s
const MSG_BUDGET_PER_SEC = 40; // mensagens por segundo por conexão
const MAX_CONN_PER_IP = 12; // várias abas/aparelhos na mesma casa, mas não um flood
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json']);
const VERSION = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8')).version;
const STARTED_AT = Date.now();

// Cache em memória dos arquivos estáticos: gzip pronto + ETag. Revalida pelo mtime,
// então funciona igual em dev (arquivo mudou → conteúdo novo) e em produção.
const fileCache = new Map();

async function loadFile(file) {
  const st = await stat(file);
  if (!st.isFile()) throw new Error('not a file');
  let c = fileCache.get(file);
  if (!c || c.mtimeMs !== st.mtimeMs || c.size !== st.size) {
    const raw = await readFile(file);
    const gz = COMPRESSIBLE.has(path.extname(file)) ? gzipSync(raw, { level: 9 }) : null;
    c = {
      mtimeMs: st.mtimeMs,
      size: st.size,
      etag: `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`,
      raw,
      gz: gz && gz.length < raw.length ? gz : null,
    };
    fileCache.set(file, c);
  }
  return c;
}

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
    const c = await loadFile(file);
    // no-cache = sempre revalida (deploy novo aparece na hora), mas com ETag a resposta é um 304 vazio
    const headers = {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      ETag: c.etag,
      Vary: 'Accept-Encoding',
    };
    if (req.headers['if-none-match'] === c.etag) {
      res.writeHead(304, headers).end();
      return;
    }
    const gzip = c.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    if (gzip) headers['Content-Encoding'] = 'gzip';
    const body = gzip ? c.gz : c.raw;
    headers['Content-Length'] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404).end('not found');
  }
}

// IP real do jogador. Atrás do nginx (domínio com HTTPS) a conexão chega do proxy local (127.0.0.1 ou o
// gateway do Docker, 172.x) e o IP de verdade vem no cabeçalho. Só confiamos no cabeçalho quando quem conectou
// é um endereço privado — de fora da VPS ninguém consegue se passar por outro IP.
const PRIVATE_IP = /^(::1$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fc|fd)/i;
export function clientIp(req) {
  const direct = String(req.socket.remoteAddress || '?').replace(/^::ffff:/, '');
  if (!PRIVATE_IP.test(direct)) return direct;
  const fwd = req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0];
  const ip = String(fwd || '').trim().replace(/^::ffff:/, '');
  return /^[0-9a-f.:]{3,45}$/i.test(ip) ? ip : direct;
}

export function createGameServer({ port = 3000, host = '0.0.0.0', log = console.log, voice = voiceConfigFromEnv() } = {}) {
  const room = new Room({ voice });

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        version: VERSION,
        players: room.players.size,
        fights: room.fights.size,
        quiz: room.qzs.size,
        match: !!room.match,
        voice: room.voice.stats(),
        uptime: Math.round((Date.now() - STARTED_AT) / 1000),
      }));
      return;
    }
    serveStatic(req, res);
  });

  // 16 KB: a sinalização da voz (SDP) passa de 4 KB; o resto continua pequeno e com limite de msgs/s
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16_384, perMessageDeflate: false });
  const perIp = new Map();

  wss.on('connection', (ws, req) => {
    const ip = clientIp(req);
    const n = (perIp.get(ip) || 0) + 1;
    perIp.set(ip, n);
    ws.once('close', () => {
      const left = (perIp.get(ip) || 1) - 1;
      if (left > 0) perIp.set(ip, left);
      else perIp.delete(ip);
    });
    if (n > MAX_CONN_PER_IP) {
      ws.close(4002, 'too many connections');
      return;
    }
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
  game.ready.then((p) => console.log(`Nilton Park v${VERSION} rodando em http://localhost:${p}`));
  // docker stop / systemctl stop: fecha as conexões na hora (os clientes reconectam sozinhos)
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.once(sig, () => {
      console.log(`[${sig}] encerrando...`);
      game.close().finally(() => process.exit(0));
      setTimeout(() => process.exit(0), 3000).unref();
    });
  }
}
