// Integração: servidor real + 2 clientes WebSocket.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createGameServer } from '../server/index.js';
import { MSG } from '../shared/constants.js';

function client(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const msgs = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    msgs.push(m);
    for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); }
  });
  return {
    ws,
    open: new Promise((r) => ws.once('open', r)),
    send: (o) => ws.send(JSON.stringify(o)),
    waitFor: (pred, ms = 2000) => {
      const found = msgs.find(pred);
      if (found) return Promise.resolve(found);
      return new Promise((resolve, reject) => {
        waiters.push({ pred, resolve });
        setTimeout(() => reject(new Error('timeout esperando mensagem')), ms);
      });
    },
  };
}

test('dois clientes se veem, conversam e se movem', async () => {
  const game = createGameServer({ port: 0, host: '127.0.0.1', log: () => {} });
  const port = await game.ready;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Nilton Park/);
    assert.equal((await fetch(`http://127.0.0.1:${port}/shared/map.js`)).status, 200);
    assert.equal((await fetch(`http://127.0.0.1:${port}/..%2fpackage.json`)).status, 403);

    const a = client(port);
    await a.open;
    a.send({ t: MSG.HELLO, nick: 'Ana' });
    const wa = await a.waitFor((m) => m.t === MSG.WELCOME);

    const b = client(port);
    await b.open;
    b.send({ t: MSG.HELLO, nick: 'Bia' });
    const wb = await b.waitFor((m) => m.t === MSG.WELCOME);
    assert.equal(wb.players.length, 2);
    await a.waitFor((m) => m.t === MSG.JOIN && m.player.nick === 'Bia');

    b.send({ t: MSG.CHAT, text: 'olá Ana' });
    const chat = await a.waitFor((m) => m.t === MSG.CHAT);
    assert.equal(chat.text, 'olá Ana');
    assert.equal(chat.id, wb.you);

    a.send({ t: MSG.MOVE, x: 1100, y: 1100 });
    await b.waitFor((m) => m.t === MSG.SNAP && m.p.some(([id, , , , moving]) => id === wa.you && moving));

    b.ws.close();
    await a.waitFor((m) => m.t === MSG.LEAVE && m.id === wb.you);
    a.ws.close();
  } finally {
    await game.close();
  }
});

test('hello inválido recebe erro fatal', async () => {
  const game = createGameServer({ port: 0, host: '127.0.0.1', log: () => {} });
  const port = await game.ready;
  try {
    const c = client(port);
    await c.open;
    c.send({ t: MSG.HELLO, nick: '' });
    const err = await c.waitFor((m) => m.t === MSG.ERROR);
    assert.equal(err.fatal, true);
  } finally {
    await game.close();
  }
});

test('produção: gzip, ETag/304, /health com versão e ping/pong', async () => {
  const game = createGameServer({ port: 0, host: '127.0.0.1', log: () => {} });
  const port = await game.ready;
  const http = await import('node:http');
  const get = (p, headers = {}) => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: p, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
  try {
    const plain = await get('/js/game.js');
    const gz = await get('/js/game.js', { 'accept-encoding': 'gzip' });
    assert.equal(gz.headers['content-encoding'], 'gzip');
    assert.ok(gz.body.length < plain.body.length / 2, 'gzip deveria reduzir bem o JS');
    const again = await get('/js/game.js', { 'if-none-match': gz.headers.etag });
    assert.equal(again.status, 304);
    assert.equal((await get('/js')).status, 404, 'diretório não é servido');

    const health = JSON.parse((await get('/health')).body);
    assert.equal(health.ok, true);
    assert.match(health.version, /^\d+\.\d+\.\d+$/);

    const c = client(port);
    await c.open;
    c.send({ t: MSG.HELLO, nick: 'Ping' });
    await c.waitFor((m) => m.t === MSG.WELCOME);
    c.send({ t: MSG.PING, n: 123 });
    assert.equal((await c.waitFor((m) => m.t === MSG.PONG)).n, 123);
    c.ws.close();
  } finally {
    await game.close();
  }
});

test('voz pela rede: convite, grupo e SDP grande (> 4 KB) repassado só ao membro', async () => {
  const game = createGameServer({ port: 0, host: '127.0.0.1', log: () => {}, voice: { stun: ['stun:x:3478'], turn: [], turnSecret: '' } });
  const port = await game.ready;
  try {
    const join = async (nick) => {
      const c = client(port);
      await c.open;
      c.send({ t: MSG.HELLO, nick });
      c.id = (await c.waitFor((m) => m.t === MSG.WELCOME)).you;
      return c;
    };
    const a = await join('Ana');
    const b = await join('Bia');
    const c = await join('Cris');
    a.send({ t: MSG.VC_INVITE, to: b.id });
    const ask = await b.waitFor((m) => m.t === MSG.VC_ASK);
    assert.equal(ask.from, a.id);
    b.send({ t: MSG.VC_REPLY, from: a.id, accept: true });
    const ga = await a.waitFor((m) => m.t === MSG.VC_GROUP && m.g);
    assert.deepEqual(ga.ice, [{ urls: ['stun:x:3478'] }]);
    await c.waitFor((m) => m.t === MSG.VC_TAG && m.id === b.id && m.g === ga.g.id);

    const sdp = `v=0\r\n${'a=x-padding:0123456789abcdef\r\n'.repeat(250)}`; // ~7,5 KB
    a.send({ t: MSG.VC_SIGNAL, to: b.id, d: { sdp: { type: 'offer', sdp } } });
    a.send({ t: MSG.VC_SIGNAL, to: c.id, d: { sdp: { type: 'offer', sdp } } });
    const sig = await b.waitFor((m) => m.t === MSG.VC_SIGNAL);
    assert.equal(sig.from, a.id);
    assert.equal(sig.d.sdp.sdp, sdp);
    assert.equal((await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json())).voice.inVoice, 2);

    b.ws.close();
    const end = await a.waitFor((m) => m.t === MSG.VC_GROUP && m.g === null);
    assert.equal(end.reason, 'dissolved');
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(c.ws.readyState, c.ws.OPEN);
    assert.ok(!(await Promise.race([c.waitFor((m) => m.t === MSG.VC_SIGNAL, 100).catch(() => false)])));
    a.ws.close();
    c.ws.close();
  } finally {
    await game.close();
  }
});
