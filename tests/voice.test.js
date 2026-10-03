import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Room } from '../server/Room.js';
import { MSG } from '../shared/constants.js';
import { VOICE, sanitizeSignal, tuneOpusSdp } from '../shared/voice.js';

function setup(voice = {}) {
  let now = 1_000_000;
  const room = new Room({ now: () => now, random: () => 0.5, voice });
  const inbox = new Map();
  const join = (nick) => {
    const msgs = [];
    const { player, error } = room.addPlayer({ nick }, (s) => msgs.push(JSON.parse(s)));
    assert.ok(!error, error);
    inbox.set(player.id, msgs);
    return player;
  };
  const advance = (ms) => { now += ms; };
  const send = (p, msg) => { room.handle(p.id, msg); advance(VOICE.ASK_COOLDOWN_MS + 1); };
  const of = (p, t) => inbox.get(p.id).filter((m) => m.t === t);
  const last = (p, t) => of(p, t).at(-1);
  const clear = () => { for (const m of inbox.values()) m.length = 0; };
  // a convida b e b aceita
  const pair = (a, b) => {
    send(a, { t: MSG.VC_INVITE, to: b.id });
    send(b, { t: MSG.VC_REPLY, from: a.id, accept: true });
  };
  return { room, join, advance, send, of, last, clear, pair };
}

const ids = (g) => g.members.map((m) => m.id).sort((x, y) => x - y);

test('voz: convite aceito cria grupo, manda ICE e marca os dois para a sala', () => {
  const { join, send, of, last } = setup();
  const a = join('Ana');
  const b = join('Bia');
  const c = join('Cris');
  send(a, { t: MSG.VC_INVITE, to: b.id });
  assert.equal(last(a, MSG.VC_STATUS).status, 'sent');
  const ask = last(b, MSG.VC_ASK);
  assert.deepEqual([ask.from, ask.nick, ask.kind, ask.size], [a.id, 'Ana', 'invite', 1]);
  assert.equal(of(c, MSG.VC_ASK).length, 0);

  send(b, { t: MSG.VC_REPLY, from: a.id, accept: true });
  for (const p of [a, b]) {
    const g = last(p, MSG.VC_GROUP);
    assert.deepEqual(ids(g.g), [a.id, b.id]);
    assert.equal(g.g.owner, a.id);
    assert.ok(g.ice.length >= 1 && g.ice[0].urls.length, 'servidores ICE vão para quem entra');
  }
  assert.equal(of(c, MSG.VC_GROUP).length, 0, 'quem está fora não recebe o grupo');
  const tags = of(c, MSG.VC_TAG).map((m) => [m.id, m.g > 0]);
  assert.deepEqual(tags, [[a.id, true], [b.id, true]]);
});

test('voz: recusar avisa quem convidou e não cria grupo', () => {
  const { room, join, send, last, of } = setup();
  const a = join('Ana');
  const b = join('Bia');
  send(a, { t: MSG.VC_INVITE, to: b.id });
  send(b, { t: MSG.VC_REPLY, from: a.id, accept: false });
  assert.equal(last(a, MSG.VC_STATUS).status, 'declined');
  assert.equal(of(a, MSG.VC_GROUP).length, 0);
  assert.equal(room.voice.groups.size, 0);
  // responder de novo o mesmo convite: já não existe
  send(b, { t: MSG.VC_REPLY, from: a.id, accept: true });
  assert.equal(last(b, MSG.VC_STATUS).status, 'expired');
});

test('voz: quem está em grupo recebe "pedido para entrar" e aprova', () => {
  const { join, send, last, pair } = setup();
  const a = join('Ana');
  const b = join('Bia');
  const c = join('Cris');
  pair(a, b);
  // convidar quem já está em grupo não pode: tem que pedir
  send(c, { t: MSG.VC_INVITE, to: b.id });
  assert.equal(last(c, MSG.VC_STATUS).status, 'in_group');
  send(c, { t: MSG.VC_REQUEST, to: b.id });
  assert.equal(last(c, MSG.VC_STATUS).status, 'asked');
  const ask = last(b, MSG.VC_ASK);
  assert.deepEqual([ask.kind, ask.size], ['request', 2]);
  send(b, { t: MSG.VC_REPLY, from: c.id, accept: true });
  for (const p of [a, b, c]) assert.deepEqual(ids(last(p, MSG.VC_GROUP).g), [a.id, b.id, c.id]);
  assert.ok(last(c, MSG.VC_GROUP).ice, 'quem entrou recebe ICE');
  // pedir para entrar em quem não tem grupo
  const d = join('Davi');
  const e = join('Edu');
  send(d, { t: MSG.VC_REQUEST, to: e.id });
  assert.equal(last(d, MSG.VC_STATUS).status, 'no_group');
});

test('voz: membro convida mais gente para o mesmo grupo; convite cruzado vira aceite', () => {
  const { join, send, last, pair } = setup();
  const a = join('Ana');
  const b = join('Bia');
  const c = join('Cris');
  pair(a, b);
  send(b, { t: MSG.VC_INVITE, to: c.id });
  assert.equal(last(c, MSG.VC_ASK).size, 2);
  send(c, { t: MSG.VC_REPLY, from: b.id, accept: true });
  assert.deepEqual(ids(last(a, MSG.VC_GROUP).g), [a.id, b.id, c.id]);
  assert.equal(last(a, MSG.VC_GROUP).g.owner, a.id);

  const d = join('Davi');
  const e = join('Edu');
  send(d, { t: MSG.VC_INVITE, to: e.id });
  send(e, { t: MSG.VC_INVITE, to: d.id }); // os dois se convidaram
  assert.deepEqual(ids(last(e, MSG.VC_GROUP).g), [d.id, e.id]);
});

test('voz: grupo tem limite', () => {
  const { join, send, last, room } = setup();
  const owner = join('Dono');
  const ps = Array.from({ length: VOICE.MAX_GROUP }, (_, i) => join(`P${i}`));
  for (const p of ps.slice(0, VOICE.MAX_GROUP - 1)) {
    send(owner, { t: MSG.VC_INVITE, to: p.id });
    send(p, { t: MSG.VC_REPLY, from: owner.id, accept: true });
  }
  assert.equal(room.voice.groupOf.get(owner.id).members.size, VOICE.MAX_GROUP);
  const extra = ps.at(-1);
  send(owner, { t: MSG.VC_INVITE, to: extra.id });
  assert.equal(last(owner, MSG.VC_STATUS).status, 'full');
  send(extra, { t: MSG.VC_REQUEST, to: owner.id });
  assert.equal(last(extra, MSG.VC_STATUS).status, 'full');
});

test('voz: sair passa a coroa; grupo de 1 acaba; desconectar também sai', () => {
  const { room, join, send, last, of, pair } = setup();
  const a = join('Ana');
  const b = join('Bia');
  const c = join('Cris');
  pair(a, b);
  send(c, { t: MSG.VC_REQUEST, to: a.id });
  send(a, { t: MSG.VC_REPLY, from: c.id, accept: true });

  send(a, { t: MSG.VC_LEAVE });
  assert.equal(last(a, MSG.VC_GROUP).g, null);
  assert.equal(last(a, MSG.VC_GROUP).reason, 'left');
  const g = last(b, MSG.VC_GROUP).g;
  assert.deepEqual(ids(g), [b.id, c.id]);
  assert.equal(g.owner, b.id, 'o mais antigo vira dono');
  assert.deepEqual(of(c, MSG.VC_TAG).at(-1), { t: MSG.VC_TAG, id: a.id, g: 0 });

  room.removePlayer(c.id);
  assert.equal(last(b, MSG.VC_GROUP).g, null);
  assert.equal(last(b, MSG.VC_GROUP).reason, 'dissolved');
  assert.equal(room.voice.groups.size, 0);
  assert.equal(room.voice.groupOf.size, 0);
});

test('voz: trocar de grupo ao aceitar convite de outro grupo', () => {
  const { room, join, send, last, pair } = setup();
  const a = join('Ana');
  const b = join('Bia');
  const c = join('Cris');
  const d = join('Davi');
  pair(a, b);
  pair(c, d);
  // Bia pede para entrar no grupo do Cris: sai do grupo da Ana (que acaba)
  send(b, { t: MSG.VC_REQUEST, to: c.id });
  send(c, { t: MSG.VC_REPLY, from: b.id, accept: true });
  assert.equal(last(a, MSG.VC_GROUP).g, null);
  assert.deepEqual(ids(last(b, MSG.VC_GROUP).g), [b.id, c.id, d.id]);
  assert.equal(room.voice.groups.size, 1);
});

test('voz: só o dono remove; mudo é repassado ao grupo', () => {
  const { join, send, last, pair } = setup();
  const a = join('Ana');
  const b = join('Bia');
  const c = join('Cris');
  pair(a, b);
  send(a, { t: MSG.VC_INVITE, to: c.id });
  send(c, { t: MSG.VC_REPLY, from: a.id, accept: true });

  send(b, { t: MSG.VC_KICK, id: c.id });
  assert.equal(last(b, MSG.VC_STATUS).status, 'invalid');
  send(b, { t: MSG.VC_MUTE, m: true, d: false });
  const mb = last(a, MSG.VC_GROUP).g.members.find((m) => m.id === b.id);
  assert.deepEqual([mb.m, mb.d], [1, 0]);
  assert.equal(last(a, MSG.VC_GROUP).ice, undefined, 'atualização não reenvia ICE');

  send(a, { t: MSG.VC_KICK, id: c.id });
  assert.equal(last(c, MSG.VC_GROUP).reason, 'kicked');
  assert.deepEqual(ids(last(b, MSG.VC_GROUP).g), [a.id, b.id]);
});

test('voz: sinalização só passa entre membros do mesmo grupo e é validada', () => {
  const { join, send, of, pair } = setup();
  const a = join('Ana');
  const b = join('Bia');
  const c = join('Cris');
  pair(a, b);
  const offer = { sdp: { type: 'offer', sdp: 'v=0\r\n' } };
  send(a, { t: MSG.VC_SIGNAL, to: b.id, d: offer });
  send(a, { t: MSG.VC_SIGNAL, to: c.id, d: offer }); // fora do grupo
  send(c, { t: MSG.VC_SIGNAL, to: a.id, d: offer }); // fora do grupo
  send(a, { t: MSG.VC_SIGNAL, to: b.id, d: { sdp: { type: 'pranswer', sdp: 'x' } } });
  send(a, { t: MSG.VC_SIGNAL, to: b.id, d: { ice: [{ candidate: 'candidate:1 1 udp 1 1.2.3.4 5 typ host', sdpMid: '0', sdpMLineIndex: 0, evil: 1 }] } });
  const got = of(b, MSG.VC_SIGNAL);
  assert.equal(got.length, 2);
  assert.deepEqual(got[0], { t: MSG.VC_SIGNAL, from: a.id, d: offer });
  assert.deepEqual(Object.keys(got[1].d.ice[0]).sort(), ['candidate', 'sdpMLineIndex', 'sdpMid']);
  assert.equal(of(c, MSG.VC_SIGNAL).length, 0);
  assert.equal(of(a, MSG.VC_SIGNAL).length, 0);
});

test('voz: convites expiram, têm cooldown e somem se alguém sai', () => {
  const { room, join, advance, last, of } = setup();
  const a = join('Ana');
  const b = join('Bia');
  const c = join('Cris');
  room.handle(a.id, { t: MSG.VC_INVITE, to: b.id });
  room.handle(a.id, { t: MSG.VC_INVITE, to: c.id });
  assert.equal(last(a, MSG.VC_STATUS).status, 'cooldown');
  assert.equal(of(c, MSG.VC_ASK).length, 0);
  advance(VOICE.ASK_TTL_MS + 1);
  room.tick(1 / 30);
  assert.equal(last(a, MSG.VC_STATUS).status, 'expired');
  assert.equal(last(b, MSG.VC_STATUS).status, 'expired');
  assert.equal(room.voice.asks.size, 0);

  room.handle(a.id, { t: MSG.VC_INVITE, to: c.id });
  room.removePlayer(a.id);
  assert.equal(last(c, MSG.VC_STATUS).status, 'gone');
  assert.equal(room.voice.asks.size, 0);
});

test('voz: credenciais TURN temporárias no formato do coturn (use-auth-secret)', () => {
  const { join, send, last, pair } = setup({ stun: ['stun:s:3478'], turn: ['turn:t:3478?transport=udp'], turnSecret: 'segredo' });
  const a = join('Ana');
  const b = join('Bia');
  pair(a, b);
  const { ice } = last(a, MSG.VC_GROUP);
  assert.deepEqual(ice[0], { urls: ['stun:s:3478'] });
  const turn = ice[1];
  assert.deepEqual(turn.urls, ['turn:t:3478?transport=udp']);
  const [exp, user] = turn.username.split(':');
  assert.equal(user, `np${a.id}`);
  assert.ok(Number(exp) > 1_000_000 / 1000);
  assert.equal(turn.credential, createHmac('sha1', 'segredo').update(turn.username).digest('base64'));
  // sem segredo: só STUN
  const s2 = setup();
  const x = s2.join('Xis');
  const y = s2.join('Ypsi');
  s2.pair(x, y);
  assert.equal(s2.last(x, MSG.VC_GROUP).ice.length, 1);
});

test('voz: welcome traz o grupo de voz de cada player (vg)', () => {
  const { join, of, pair } = setup();
  const a = join('Ana');
  const b = join('Bia');
  pair(a, b);
  const c = join('Cris');
  const w = of(c, MSG.WELCOME)[0];
  const vg = Object.fromEntries(w.players.map((p) => [p.nick, p.vg]));
  assert.ok(vg.Ana > 0 && vg.Ana === vg.Bia);
  assert.equal(vg.Cris, 0);
});

test('sanitizeSignal aceita só formatos conhecidos', () => {
  assert.deepEqual(sanitizeSignal({ restart: true, x: 1 }), { restart: true });
  assert.deepEqual(sanitizeSignal({ reset: true }), { reset: true });
  assert.equal(sanitizeSignal({ sdp: { type: 'offer', sdp: 'x'.repeat(VOICE.SDP_MAX + 1) } }), null);
  assert.equal(sanitizeSignal({ ice: [] }), null);
  assert.equal(sanitizeSignal({ ice: Array(VOICE.ICE_BATCH_MAX + 1).fill({ candidate: '' }) }), null);
  assert.deepEqual(sanitizeSignal({ ice: [{ candidate: '' }] }), { ice: [{ candidate: '' }] });
  assert.equal(sanitizeSignal({ ice: [{ candidate: 'a', sdpMLineIndex: -1 }] }), null);
  assert.equal(sanitizeSignal('oi'), null);
  assert.equal(sanitizeSignal(null), null);
});

test('tuneOpusSdp liga DTX/FEC, mono e teto de bitrate sem mexer no resto', () => {
  const sdp = [
    'v=0', 'm=audio 9 UDP/TLS/RTP/SAVPF 111 0', 'a=rtpmap:111 opus/48000/2',
    'a=fmtp:111 minptime=10;useinbandfec=0', 'a=rtpmap:0 PCMU/8000', '',
  ].join('\r\n');
  const out = tuneOpusSdp(sdp, { maxBitrate: 32000 });
  const fmtp = out.split('\r\n').find((l) => l.startsWith('a=fmtp:111'));
  assert.match(fmtp, /minptime=10/);
  assert.match(fmtp, /useinbandfec=1/);
  assert.match(fmtp, /usedtx=1/);
  assert.match(fmtp, /stereo=0/);
  assert.match(fmtp, /maxaveragebitrate=32000/);
  assert.ok(out.includes('a=rtpmap:0 PCMU/8000'));
  assert.ok(out.endsWith('\r\n'));
  // sem fmtp: cria
  const noFmtp = tuneOpusSdp('m=audio 9 x 109\na=rtpmap:109 opus/48000/2\n');
  assert.match(noFmtp, /a=rtpmap:109 opus\/48000\/2\na=fmtp:109 useinbandfec=1;usedtx=1/);
  assert.equal(tuneOpusSdp('m=video 9 x 96'), 'm=video 9 x 96');
});
