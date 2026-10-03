import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/Room.js';
import { MAP } from '../shared/map.js';
import { MSG } from '../shared/constants.js';
import { KT } from '../shared/karate.js';
import { ARENA, seatOrder } from '../shared/arena.js';

function setup() {
  let now = 9_000_000;
  const room = new Room({ now: () => now, random: () => 0.3 });
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
  const clear = (p) => { inbox.get(p.id).length = 0; };
  return { room, join, run, of, clear };
}

function fight(ctx, n1 = 'Ana', n2 = 'Bia') {
  const a = ctx.join(n1);
  const b = ctx.join(n2);
  ctx.room.handle(a.id, { t: MSG.CHALLENGE, to: b.id, game: 'karate' });
  ctx.room.handle(b.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: true });
  return { a, b, f: ctx.room.fightOf.get(a.id) };
}

test('espectador entra na plateia: recebe a luta, some da praça e fica na porta do dojo', () => {
  const ctx = setup();
  const { a, b, f } = fight(ctx);
  const v = ctx.join('Vini');
  const z = ctx.join('Zeca');
  // quem chega depois vê a luta (e a plateia) no welcome
  assert.deepEqual(ctx.of(v, MSG.WELCOME)[0].fights[0].w, []);
  ctx.room.handle(v.id, { t: MSG.KT_WATCH, id: f.id });
  const ack = ctx.of(v, MSG.KT_WATCH)[0];
  assert.equal(ack.id, f.id);
  assert.deepEqual([ack.a.id, ack.b.id], [a.id, b.id]);
  assert.deepEqual(ack.w, [[v.id, 0, 0]]);
  const pv = ctx.room.players.get(v.id);
  assert.equal(pv.pose, 'watch');
  assert.deepEqual([pv.x, pv.y], [MAP.dojo.door.x, MAP.dojo.door.y]);
  // todos sabem quem está na plateia (a praça esconde o espectador)
  const live = ctx.of(z, MSG.KT_LIVE).at(-1);
  assert.deepEqual(live.w, [[v.id, 0, 0]]);
  ctx.run(KT.INTRO_TIME + 0.3);
  assert.ok(ctx.of(v, MSG.KT_STATE).length > 0, 'plateia recebe o estado');
  assert.ok(ctx.of(v, MSG.KT_EVENT).some((e) => e.kind === 'fight'), 'plateia recebe os eventos');
  assert.equal(ctx.of(z, MSG.KT_STATE).length, 0, 'quem está na praça não recebe');
  // na plateia não anda nem interage na praça
  ctx.room.handle(v.id, { t: MSG.MOVE, x: 1000, y: 1000 });
  ctx.run(0.5);
  assert.deepEqual([pv.x, pv.y], [MAP.dojo.door.x, MAP.dojo.door.y]);
});

test('espectador não consegue atrapalhar a luta', () => {
  const ctx = setup();
  const { a, b, f } = fight(ctx);
  const v = ctx.join('Vini');
  ctx.room.handle(v.id, { t: MSG.KT_WATCH, id: f.id });
  ctx.run(KT.INTRO_TIME + 0.05);
  const before = JSON.stringify([...f.fighters.values()].map((x) => [x.x, x.y, x.st, x.hp, x.mx, x.buf]));
  for (let i = 0; i < 20; i++) {
    ctx.room.handle(v.id, { t: MSG.KT_INPUT, mx: 1, my: 1, block: true });
    ctx.room.handle(v.id, { t: MSG.KT_ACT, a: 'hkick' });
  }
  const after = JSON.stringify([...f.fighters.values()].map((x) => [x.x, x.y, x.st, x.hp, x.mx, x.buf]));
  assert.equal(after, before, 'comandos da plateia são ignorados');
  // não dá para desafiar nem ser desafiado de dentro da plateia
  const c = ctx.join('Caio');
  ctx.room.handle(c.id, { t: MSG.CHALLENGE, to: v.id, game: 'karate' });
  assert.equal(ctx.of(c, MSG.CH_STATUS).at(-1).status, 'busy');
  // lutador não vira espectador de outra luta
  ctx.room.handle(a.id, { t: MSG.KT_WATCH, id: f.id });
  assert.equal(ctx.of(a, MSG.KT_UNWATCH).at(-1).reason, 'busy');
  assert.equal(f.watchers.has(a.id), false);
  void b;
});

test('só dá para entrar se a luta existir; lotação máxima', () => {
  const ctx = setup();
  const v = ctx.join('Vini');
  ctx.room.handle(v.id, { t: MSG.KT_WATCH, id: 99 });
  assert.equal(ctx.of(v, MSG.KT_UNWATCH)[0].reason, 'gone');
  assert.equal(ctx.room.watching.size, 0);
  const { f } = fight(ctx);
  const crowd = Array.from({ length: ARENA.MAX_WATCHERS }, (_, i) => ctx.join(`Fa${i}`));
  for (const p of crowd) ctx.room.handle(p.id, { t: MSG.KT_WATCH, id: f.id });
  assert.equal(f.watchers.size, ARENA.MAX_WATCHERS);
  // lugares não se repetem
  assert.equal(new Set([...f.watchers.values()].map((w) => w.seat)).size, ARENA.MAX_WATCHERS);
  ctx.room.handle(v.id, { t: MSG.KT_WATCH, id: f.id });
  assert.equal(ctx.of(v, MSG.KT_UNWATCH).at(-1).reason, 'full');
  // alguém sai: o lugar fica livre e é reaproveitado
  const seat = f.watchers.get(crowd[3].id).seat;
  ctx.room.handle(crowd[3].id, { t: MSG.KT_UNWATCH });
  assert.equal(ctx.of(crowd[3], MSG.KT_UNWATCH).at(-1).reason, 'left');
  assert.equal(ctx.room.players.get(crowd[3].id).pose, '');
  ctx.room.handle(v.id, { t: MSG.KT_WATCH, id: f.id });
  assert.equal(f.watchers.get(v.id).seat, seat);
});

test('torcida: reações chegam na luta (não na praça), com limite e lado válido', () => {
  const ctx = setup();
  const { a, b, f } = fight(ctx);
  const v = ctx.join('Vini');
  const z = ctx.join('Zeca');
  ctx.room.handle(v.id, { t: MSG.KT_WATCH, id: f.id });
  ctx.room.handle(v.id, { t: MSG.KT_CHEER, r: 'go', side: a.id });
  ctx.room.handle(v.id, { t: MSG.KT_CHEER, r: 'fire' }); // rápido demais: descartado
  assert.equal(ctx.of(a, MSG.KT_CHEER).length, 1);
  assert.deepEqual(ctx.of(b, MSG.KT_CHEER)[0], { t: MSG.KT_CHEER, by: v.id, r: 'go', side: a.id });
  assert.equal(ctx.of(v, MSG.KT_CHEER).length, 1);
  assert.equal(ctx.of(z, MSG.KT_CHEER).length, 0);
  assert.deepEqual(ctx.of(z, MSG.KT_LIVE).at(-1).w, [[v.id, a.id, 0]], 'lado escolhido vai para todos');
  ctx.run(ARENA.CHEER_COOLDOWN_MS / 1000 + 0.05);
  ctx.room.handle(v.id, { t: MSG.KT_CHEER, r: 'hack', side: a.id });
  ctx.room.handle(v.id, { t: MSG.KT_CHEER, r: 'clap', side: 12345 }); // lado inválido: mantém
  assert.equal(ctx.of(a, MSG.KT_CHEER).length, 2);
  assert.equal(f.watchers.get(v.id).side, a.id);
  // quem não está na plateia não torce
  ctx.room.handle(z.id, { t: MSG.KT_CHEER, r: 'clap' });
  assert.equal(ctx.of(a, MSG.KT_CHEER).length, 2);
});

test('fim da luta libera a plateia; trocar de luta e sair do jogo', () => {
  const ctx = setup();
  const one = fight(ctx);
  const two = fight(ctx, 'Caio', 'Duda');
  const v = ctx.join('Vini');
  ctx.room.handle(v.id, { t: MSG.KT_WATCH, id: one.f.id });
  ctx.clear(v);
  // troca de luta sem passar pela praça (sem aviso de saída)
  ctx.room.handle(v.id, { t: MSG.KT_WATCH, id: two.f.id });
  assert.equal(ctx.of(v, MSG.KT_UNWATCH).length, 0);
  assert.equal(ctx.of(v, MSG.KT_WATCH)[0].id, two.f.id);
  assert.equal(one.f.watchers.size, 0);
  assert.equal(two.f.watchers.size, 1);
  // a luta acaba: todos recebem o kt_end e o espectador volta para a praça
  ctx.room.removePlayer(two.a.id);
  assert.equal(ctx.of(v, MSG.KT_END).at(-1).id, two.f.id);
  assert.equal(ctx.room.watching.size, 0);
  assert.equal(ctx.room.players.get(v.id).pose, '');
  ctx.room.handle(v.id, { t: MSG.MOVE, x: 1345, y: 500 });
  ctx.run(0.5);
  assert.ok(ctx.room.players.get(v.id).y > MAP.dojo.door.y, 'anda de novo');
  // espectador que fecha o jogo some da plateia
  ctx.room.handle(v.id, { t: MSG.KT_WATCH, id: one.f.id });
  ctx.room.removePlayer(v.id);
  assert.equal(one.f.watchers.size, 0);
  assert.equal(ctx.room.watching.size, 0);
});

test('convite pendente: na plateia não dá para aceitar; saindo, pode lutar', () => {
  const ctx = setup();
  const { f } = fight(ctx);
  const c = ctx.join('Caio');
  const v = ctx.join('Vini');
  ctx.room.handle(c.id, { t: MSG.CHALLENGE, to: v.id, game: 'karate' });
  // Vini entra para assistir com o convite pendente; aceitar dá "ocupado"
  ctx.room.handle(v.id, { t: MSG.KT_WATCH, id: f.id });
  ctx.room.handle(v.id, { t: MSG.CHALLENGE_REPLY, from: c.id, accept: true });
  assert.equal(ctx.of(v, MSG.CH_STATUS).at(-1).status, 'busy');
  // saiu da plateia: aí sim pode lutar (startFight também tira da plateia por segurança)
  ctx.room.handle(v.id, { t: MSG.KT_UNWATCH });
  ctx.room.handle(c.id, { t: MSG.CHALLENGE, to: v.id, game: 'karate' });
  ctx.room.handle(v.id, { t: MSG.CHALLENGE_REPLY, from: c.id, accept: true });
  assert.ok(ctx.room.fightOf.has(v.id));
  assert.equal(f.watchers.has(v.id), false);
});

test('ordem dos lugares da fila de trás: do meio para as pontas', () => {
  const o = seatOrder(6);
  assert.deepEqual(o, [2, 3, 1, 4, 0, 5]);
  assert.equal(new Set(seatOrder()).size, ARENA.BACK_SEATS);
});
