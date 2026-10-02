import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/Room.js';
import { MSG } from '../shared/constants.js';
import { GG, ggGeometry, spotX, keeperX, advanceBall, launchBall, chargeAt } from '../shared/golagol.js';

function setup(randomValue = 0.1) {
  let now = 5_000_000;
  const room = new Room({ now: () => now, random: () => randomValue });
  const inbox = new Map();
  const join = (nick) => {
    const msgs = [];
    const { player } = room.addPlayer({ nick }, (s) => msgs.push(JSON.parse(s)));
    inbox.set(player.id, msgs);
    return player;
  };
  const run = (secs) => {
    for (let i = 0; i < Math.round(secs * 30); i++) {
      now += 1000 / 30;
      room.tick(1 / 30);
    }
  };
  const of = (p, t) => inbox.get(p.id).filter((m) => m.t === t);
  const events = (p) => of(p, MSG.GG_EVENT).map((e) => e.kind);
  const advance = (ms) => { now += ms; };
  return { room, join, run, of, events, advance };
}

// a desafia b, b aceita; com random 0.1 quem chuta primeiro é `a` (lado esquerdo)
function startMatch(ctx) {
  const a = ctx.join('Ana');
  const b = ctx.join('Bia');
  ctx.room.handle(a.id, { t: MSG.CHALLENGE, to: b.id });
  ctx.room.handle(b.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: true });
  ctx.run(GG.COUNTDOWN + 0.1);
  return { a, b };
}

test('física: efeito curva a bola e atrito desacelera', () => {
  const straight = launchBall(0, 0, 0, 0.5, 0);
  const curved = launchBall(0, 0, 0, 0.5, 1);
  for (let i = 0; i < 30; i++) { advanceBall(straight, 1 / 60); advanceBall(curved, 1 / 60); }
  assert.ok(Math.abs(straight.y) < 0.001);
  assert.ok(curved.y > 20, `curva deveria desviar (y=${curved.y})`);
  assert.ok(Math.hypot(straight.vx, straight.vy) < GG.SPEED_MIN + (GG.SPEED_MAX - GG.SPEED_MIN) * 0.5);
  assert.equal(launchBall(0, 0, 0, 0.95, 0).lofted, true);
  assert.equal(chargeAt(0), 0);
  assert.ok(Math.abs(chargeAt(1 / 0.6) - 1) < 1e-9);
});

test('desafio: convite chega, recusa avisa o desafiante', () => {
  const ctx = setup();
  const a = ctx.join('Ana');
  const b = ctx.join('Bia');
  ctx.room.handle(a.id, { t: MSG.CHALLENGE, to: b.id });
  assert.equal(ctx.of(b, MSG.CHALLENGE)[0].nick, 'Ana');
  assert.equal(ctx.of(a, MSG.CH_STATUS)[0].status, 'sent');
  ctx.room.handle(b.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: false });
  assert.equal(ctx.of(a, MSG.CH_STATUS).at(-1).status, 'declined');
  assert.equal(ctx.room.match, null);
});

test('desafio expira depois do TTL', () => {
  const ctx = setup();
  const a = ctx.join('Ana');
  const b = ctx.join('Bia');
  ctx.room.handle(a.id, { t: MSG.CHALLENGE, to: b.id });
  ctx.advance(GG.INVITE_TTL_MS + 1);
  ctx.run(0.1);
  assert.equal(ctx.of(a, MSG.CH_STATUS).at(-1).status, 'expired');
  ctx.room.handle(b.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: true });
  assert.equal(ctx.room.match, null);
});

test('não dá para se desafiar nem desafiar quem está jogando', () => {
  const ctx = setup();
  const { a } = startMatch(ctx);
  const c = ctx.join('Caio');
  ctx.room.handle(c.id, { t: MSG.CHALLENGE, to: a.id });
  assert.equal(ctx.of(c, MSG.CH_STATUS).at(-1).status, 'busy');
  ctx.room.handle(c.id, { t: MSG.CHALLENGE, to: c.id });
  assert.equal(ctx.of(c, MSG.CH_STATUS).at(-1).status, 'invalid');
});

test('partida começa, posiciona jogadores e ignora andar', () => {
  const ctx = setup();
  const { a, b } = startMatch(ctx);
  const m = ctx.room.match;
  assert.ok(m);
  assert.equal(m.phase, 'aim');
  assert.equal(m.shooter, a.id);
  assert.equal(b.x, keeperX('right'));
  assert.equal(b.pose, 'keeper');
  ctx.room.handle(a.id, { t: MSG.MOVE, x: 1000, y: 1000 });
  assert.equal(a.path.length, 0);
  assert.equal(ctx.of(b, MSG.GG_START).length, 1);
  assert.equal(ctx.room.snapshot().b, null, 'bola livre some durante a partida');
});

test('chute no canto sem goleiro alcançar = gol e fim de jogo', () => {
  const ctx = setup();
  const { a, b } = startMatch(ctx);
  const { midY } = ggGeometry();
  const sx = spotX('left');
  const angle = Math.atan2(55, keeperX('right') - sx);
  ctx.room.handle(a.id, { t: MSG.GG_SHOOT, angle, power: 0.85, curve: 0 });
  ctx.run(2);
  assert.ok(ctx.events(b).includes('goal'), `eventos: ${ctx.events(b)}`);
  ctx.run(GG.RESULT_TIME + 0.2);
  const end = ctx.of(b, MSG.GG_END)[0];
  assert.equal(end.winner, a.id);
  assert.equal(end.loser, b.id);
  assert.equal(ctx.room.match, null);
  assert.equal(b.pose, '');
  assert.notEqual(ctx.room.snapshot().b, null);
  assert.ok(midY);
});

test('chute no meio fraco = goleiro segura e vez troca', () => {
  const ctx = setup();
  const { a, b } = startMatch(ctx);
  ctx.room.handle(a.id, { t: MSG.GG_SHOOT, angle: 0, power: 0.6, curve: 0 });
  ctx.run(2.5);
  assert.ok(ctx.events(a).includes('save'), `eventos: ${ctx.events(a)}`);
  ctx.run(GG.RESULT_TIME);
  assert.equal(ctx.room.match.shooter, b.id, 'agora a Bia chuta');
  assert.equal(ctx.room.match.turn, 2);
});

test('força máxima isola por cima', () => {
  const ctx = setup();
  const { a } = startMatch(ctx);
  ctx.room.handle(a.id, { t: MSG.GG_SHOOT, angle: 0.05, power: 1, curve: 0 });
  ctx.run(2);
  assert.ok(ctx.events(a).includes('over'), `eventos: ${ctx.events(a)}`);
});

test('goleiro só se move dentro do gol e mergulha', () => {
  const ctx = setup();
  const { b } = startMatch(ctx);
  const { midY } = ggGeometry();
  ctx.room.handle(b.id, { t: MSG.GG_INPUT, ky: midY - 999 });
  ctx.run(1.5);
  assert.equal(Math.round(ctx.room.match.keepers.right.y), midY - GG.KEEPER_RANGE);
  ctx.room.handle(b.id, { t: MSG.GG_INPUT, dive: 1 });
  ctx.run(0.1);
  assert.equal(b.pose, 'diveD');
});

test('tempo esgotado passa a vez', () => {
  const ctx = setup();
  const { a } = startMatch(ctx);
  ctx.run(GG.AIM_TIME + 0.1);
  assert.ok(ctx.events(a).includes('timeout'));
});

test('sair no meio da partida = W.O. para o outro', () => {
  const ctx = setup();
  const { a, b } = startMatch(ctx);
  ctx.room.removePlayer(b.id);
  const end = ctx.of(a, MSG.GG_END)[0];
  assert.equal(end.winner, a.id);
  assert.equal(end.reason, 'wo');
  assert.equal(ctx.room.match, null);
});

test('revanche: perdedor desafia de novo com rematch=true', () => {
  const ctx = setup();
  const { a, b } = startMatch(ctx);
  ctx.room.removePlayer(b.id);
  const c = ctx.join('Bia');
  ctx.room.handle(c.id, { t: MSG.CHALLENGE, to: a.id, rematch: true });
  assert.equal(ctx.of(a, MSG.CHALLENGE).at(-1).rematch, true);
  ctx.room.handle(a.id, { t: MSG.CHALLENGE_REPLY, from: c.id, accept: true });
  assert.ok(ctx.room.match);
});
