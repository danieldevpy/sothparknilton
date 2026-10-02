import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/Room.js';
import { MAP } from '../shared/map.js';
import { MSG, CHAT_COOLDOWN_MS } from '../shared/constants.js';

function setup() {
  let now = 1_000_000;
  const room = new Room({ now: () => now, random: () => 0.5 });
  const inbox = new Map();
  const join = (nick) => {
    const msgs = [];
    const { player, error } = room.addPlayer({ nick }, (s) => msgs.push(JSON.parse(s)));
    assert.ok(!error, error);
    inbox.set(player.id, msgs);
    return player;
  };
  const run = (secs) => {
    for (let i = 0; i < secs * 30; i++) {
      now += 1000 / 30;
      room.tick(1 / 30);
    }
  };
  const advance = (ms) => { now += ms; };
  const of = (p, t) => inbox.get(p.id).filter((m) => m.t === t);
  return { room, join, run, advance, of };
}

test('welcome lista players e join é avisado aos outros', () => {
  const { join, of } = setup();
  const a = join('Ana');
  const b = join('Bia');
  assert.equal(of(b, MSG.WELCOME)[0].players.length, 2);
  assert.equal(of(a, MSG.JOIN)[0].player.nick, 'Bia');
  assert.equal(of(b, MSG.JOIN).length, 0);
});

test('nick inválido é recusado e duplicado ganha sufixo', () => {
  const { room, join } = setup();
  assert.ok(room.addPlayer({ nick: '!' }, () => {}).error);
  join('Zé');
  const { player } = room.addPlayer({ nick: 'zé' }, () => {});
  assert.equal(player.nick, 'zé2');
});

test('chat é transmitido para todos e respeita cooldown', () => {
  const { room, join, of, advance } = setup();
  const a = join('Ana');
  const b = join('Bia');
  room.handle(a.id, { t: MSG.CHAT, text: 'oi!' });
  room.handle(a.id, { t: MSG.CHAT, text: 'flood' });
  assert.deepEqual(of(b, MSG.CHAT).map((m) => m.text), ['oi!']);
  advance(CHAT_COOLDOWN_MS + 1);
  room.handle(a.id, { t: MSG.CHAT, text: 'de novo' });
  assert.equal(of(b, MSG.CHAT).length, 2);
});

test('movimento chega ao destino e aparece no snapshot', () => {
  const { room, join, run } = setup();
  const a = join('Ana');
  room.handle(a.id, { t: MSG.MOVE, x: 1200, y: 1100 });
  run(5);
  assert.ok(Math.hypot(a.x - 1200, a.y - 1100) < 1);
  const snap = room.snapshot();
  assert.deepEqual(snap.p[0].slice(0, 3), [a.id, 1200, 1100]);
});

test('sentar no banco ocupa o lugar e andar libera', () => {
  const { room, join, run } = setup();
  const a = join('Ana');
  room.handle(a.id, { t: MSG.INTERACT, id: 'bench-3' });
  run(6);
  assert.equal(a.pose, 'bench');
  assert.ok(a.seat?.startsWith('bench-3'));
  room.handle(a.id, { t: MSG.MOVE, x: 1000, y: 1100 });
  assert.equal(a.seat, null);
  assert.ok([...room.seats.values()].every((s) => s.by === null));
});

test('poste alterna e avisa todos', () => {
  const { room, join, run, of } = setup();
  const a = join('Ana');
  const b = join('Bia');
  room.handle(a.id, { t: MSG.INTERACT, id: 'lamp-3' });
  run(5);
  assert.equal(room.lamps['lamp-3'], false);
  assert.deepEqual(of(b, MSG.OBJ)[0], { t: MSG.OBJ, id: 'lamp-3', on: false, by: a.id });
});

test('jogar pedra no lago gera splash', () => {
  const { room, join, run, of } = setup();
  const a = join('Ana');
  room.handle(a.id, { t: MSG.INTERACT, id: 'lake', x: MAP.lake.x + 100, y: MAP.lake.y });
  run(8);
  const fx = of(a, MSG.FX).find((m) => m.kind === 'splash');
  assert.ok(fx, 'splash não aconteceu');
  // ponto fora do lago é ignorado
  room.handle(a.id, { t: MSG.INTERACT, id: 'lake', x: 1000, y: 1000 });
  assert.equal(a.pending, null);
});

test('bola chutada para dentro do gol marca ponto', () => {
  const { room, join, run, of } = setup();
  const a = join('Ana');
  const f = MAP.field;
  const midY = f.y + f.h / 2;
  room.ball.x = f.x + 40;
  room.ball.y = midY;
  room.ball.vx = -400;
  room.ball.lastKicker = a.id;
  run(1);
  assert.equal(room.score.blue, 1);
  const goal = of(a, MSG.GOAL)[0];
  assert.equal(goal.by, 'Ana');
  run(3);
  assert.equal(room.ball.x, f.x + f.w / 2, 'bola volta ao centro');
});

test('mensagens malformadas são ignoradas', () => {
  const { room, join } = setup();
  const a = join('Ana');
  for (const m of [null, {}, { t: 42 }, { t: MSG.MOVE, x: 'a' }, { t: MSG.EMOTE, e: '__proto__' }, { t: MSG.INTERACT, id: {} }]) {
    room.handle(a.id, m);
  }
  assert.equal(a.path.length, 0);
});

test('sair libera e avisa', () => {
  const { room, join, of } = setup();
  const a = join('Ana');
  const b = join('Bia');
  room.removePlayer(b.id);
  assert.equal(room.players.size, 1);
  assert.equal(of(a, MSG.LEAVE)[0].id, b.id);
});
