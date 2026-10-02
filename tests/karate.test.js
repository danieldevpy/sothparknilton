import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/Room.js';
import { MSG } from '../shared/constants.js';
import { KT, MOVES, inReach, walkStep, movePhase } from '../shared/karate.js';

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
  const events = (p, kind) => of(p, MSG.KT_EVENT).filter((e) => !kind || e.kind === kind);
  return { room, join, run, of, events };
}

// Ana desafia Bia para o karatê, Bia aceita, round 1 começa.
function startFight(ctx, { place = true } = {}) {
  const a = ctx.join('Ana');
  const b = ctx.join('Bia');
  ctx.room.handle(a.id, { t: MSG.CHALLENGE, to: b.id, game: 'karate' });
  ctx.room.handle(b.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: true });
  const fight = ctx.room.fightOf.get(a.id);
  ctx.run(KT.INTRO_TIME + 0.05);
  const fa = fight.fighters.get(a.id);
  const fb = fight.fighters.get(b.id);
  if (place) put(fight, fa, fb, 60);
  return { a, b, fight, fa, fb };
}

// coloca os dois frente a frente a `gap` px
function put(fight, fa, fb, gap) {
  Object.assign(fa, { x: 400, y: 130, dir: 1, kvx: 0, kvy: 0 });
  Object.assign(fb, { x: 400 + gap, y: 130, dir: -1, kvx: 0, kvy: 0 });
}

const act = (ctx, p, a, extra = {}) => ctx.room.handle(p.id, { t: MSG.KT_ACT, a, ...extra });

test('tabela de golpes: cada golpe tem a sua vantagem', () => {
  const { jab, punch, kick, hkick } = MOVES;
  // soco fraco é o mais rápido de todos
  for (const m of [punch, kick, hkick]) assert.ok(jab.startup < m.startup);
  // chutes têm mais alcance que socos; chute forte é o maior alcance e dano
  assert.ok(kick.reach > punch.reach && hkick.reach > kick.reach);
  for (const m of [jab, punch, kick]) assert.ok(hkick.dmg > m.dmg);
  assert.ok(punch.guardBreak && kick.slow && hkick.knockdown && jab.chain);
  assert.equal(movePhase(jab, 0), 'startup');
  assert.equal(movePhase(jab, jab.startup + 0.01), 'active');
  assert.equal(movePhase(jab, 10), null);
  assert.equal(inReach(jab, 0, 0, 1, 60, 0), true);
  assert.equal(inReach(jab, 0, 0, -1, 60, 0), false, 'golpe só acerta pra frente');
  assert.equal(inReach(jab, 0, 0, 1, 60, 40), false, 'fora da faixa de profundidade');
  const f = { x: 100, y: 100, block: false, slowT: 0 };
  walkStep(f, 1, 0, 1);
  assert.equal(Math.round(f.x), 100 + KT.SPEED);
});

test('desafio de karatê abre um dojo separado: lutadores somem da praça', () => {
  const ctx = setup();
  const c = ctx.join('Caio');
  const { a, b, fight } = startFight(ctx);
  assert.equal(ctx.of(b, MSG.CHALLENGE)[0].game, 'karate');
  assert.equal(ctx.room.match, null, 'não ocupa o campinho do Gol a Gol');
  assert.equal(ctx.room.players.get(a.id).pose, 'dojo');
  assert.equal(ctx.of(c, MSG.KT_START).length, 1, 'todos sabem que começou');
  assert.equal(ctx.of(c, MSG.KT_STATE).length, 0, 'só os lutadores recebem o estado');
  assert.ok(ctx.of(a, MSG.KT_STATE).length > 0);
  assert.equal(fight.phase, 'fight');
  // andar na praça e interagir ficam bloqueados
  const pa = ctx.room.players.get(a.id);
  const [x, y] = [pa.x, pa.y];
  ctx.room.handle(a.id, { t: MSG.MOVE, x: x + 200, y });
  ctx.run(0.5);
  assert.deepEqual([pa.x, pa.y], [x, y]);
  // desafiar quem está lutando = ocupado
  ctx.room.handle(c.id, { t: MSG.CHALLENGE, to: a.id });
  assert.equal(ctx.of(c, MSG.CH_STATUS).at(-1).status, 'busy');
});

test('várias lutas ao mesmo tempo e Gol a Gol em paralelo', () => {
  const ctx = setup();
  startFight(ctx);
  const c = ctx.join('Caio');
  const d = ctx.join('Duda');
  ctx.room.handle(c.id, { t: MSG.CHALLENGE, to: d.id, game: 'karate' });
  ctx.room.handle(d.id, { t: MSG.CHALLENGE_REPLY, from: c.id, accept: true });
  const e = ctx.join('Edu');
  const g = ctx.join('Gabi');
  ctx.room.handle(e.id, { t: MSG.CHALLENGE, to: g.id });
  ctx.room.handle(g.id, { t: MSG.CHALLENGE_REPLY, from: e.id, accept: true });
  assert.equal(ctx.room.fights.size, 2);
  assert.ok(ctx.room.match, 'Gol a Gol rolando junto');
});

test('soco fraco interrompe o chute forte (CONTRA-ATAQUE)', () => {
  const ctx = setup();
  const { a, b, fb } = startFight(ctx);
  act(ctx, b, 'hkick');
  act(ctx, a, 'jab');
  ctx.run(0.2);
  const hit = ctx.events(a, 'hit')[0];
  assert.equal(hit.by, a.id);
  assert.equal(hit.counter, 1);
  assert.equal(hit.dmg, Math.round(MOVES.jab.dmg * KT.COUNTER_MULT));
  assert.equal(fb.hp, KT.HP - hit.dmg);
  assert.equal(ctx.events(a, 'hit').filter((h) => h.by === b.id).length, 0, 'chute forte foi cancelado');
});

test('chute forte: maior alcance, dano máximo e derruba', () => {
  const ctx = setup();
  const { a, fight, fa, fb } = startFight(ctx);
  put(fight, fa, fb, 100);
  act(ctx, a, 'jab');
  ctx.run(0.4);
  assert.equal(ctx.events(a, 'whiff').length, 1, 'soco fraco não alcança');
  put(fight, fa, fb, 100);
  act(ctx, a, 'hkick');
  ctx.run(0.5);
  const hit = ctx.events(a, 'hit')[0];
  assert.equal(hit.m, 'hkick');
  assert.equal(hit.kd, 1);
  assert.equal(hit.dmg, MOVES.hkick.dmg);
  assert.equal(fb.st, 'down');
  assert.ok(fb.x > 400 + 100 + 60, 'voou para trás');
  // caído é invencível
  put(fight, fa, fb, 50);
  fa.st = 'idle';
  act(ctx, a, 'jab');
  ctx.run(0.3);
  assert.equal(ctx.events(a, 'hit').length, 1);
});

test('defesa segura socos/chutes (só arranha) e o soco forte QUEBRA a defesa', () => {
  const ctx = setup();
  const { a, b, fb } = startFight(ctx);
  ctx.room.handle(b.id, { t: MSG.KT_INPUT, block: true });
  ctx.run(0.5); // defesa levantada há tempo: sem defesa perfeita
  act(ctx, a, 'kick');
  ctx.run(0.5);
  const blk = ctx.events(a, 'block')[0];
  assert.ok(blk, 'chute foi defendido');
  assert.equal(blk.dmg, Math.max(1, Math.round(MOVES.kick.dmg * KT.BLOCK_CHIP)));
  assert.equal(fb.slowT, 0, 'defendido não deixa lento');
  act(ctx, a, 'punch');
  ctx.run(0.4);
  const gb = ctx.events(a, 'guardbreak')[0];
  assert.ok(gb, 'soco forte quebrou a guarda');
  assert.equal(fb.st, 'stun');
});

test('defesa perfeita: levantar a guarda na hora certa deixa o atacante tonto', () => {
  const ctx = setup();
  const { a, b, fa, fb } = startFight(ctx);
  act(ctx, a, 'punch');
  ctx.run(0.15); // soco forte ainda preparando
  ctx.room.handle(b.id, { t: MSG.KT_INPUT, block: true });
  ctx.run(0.3);
  const parry = ctx.events(a, 'parry')[0];
  assert.ok(parry, 'DEFESA PERFEITA');
  assert.equal(parry.by, b.id);
  assert.equal(fb.hp, KT.HP);
  assert.equal(fa.st, 'stun');
});

test('chute fraco deixa o oponente lento', () => {
  const ctx = setup();
  const { a, b, fight, fa, fb } = startFight(ctx);
  put(fight, fa, fb, 80);
  act(ctx, a, 'kick');
  ctx.run(0.6);
  assert.equal(ctx.events(a, 'hit')[0].slow, 1);
  assert.ok(fb.slowT > 0);
  const x0 = fb.x;
  ctx.room.handle(b.id, { t: MSG.KT_INPUT, mx: 1, my: 0 });
  ctx.run(0.5);
  const slowDist = fb.x - x0;
  assert.ok(slowDist < KT.SPEED * 0.5 * 0.7, `andou ${slowDist}px mancando`);
});

test('soco fraco encadeia combo com dano decrescente', () => {
  const ctx = setup();
  const { a, fight, fa, fb } = startFight(ctx);
  put(fight, fa, fb, 34);
  for (let i = 0; i < 3; i++) {
    act(ctx, a, 'jab');
    ctx.run(0.17);
  }
  ctx.run(0.3);
  const hits = ctx.events(a, 'hit');
  assert.equal(hits.length, 3);
  assert.deepEqual(hits.map((h) => h.combo), [1, 2, 3]);
  assert.ok(hits[2].dmg <= hits[0].dmg);
});

test('dash: só a cada 3 s, anda rápido e atravessa golpes', () => {
  const ctx = setup();
  const { a, b, fight, fa, fb } = startFight(ctx);
  const x0 = fa.x;
  act(ctx, a, 'dash', { dx: -1, dy: 0 });
  ctx.run(0.3);
  assert.ok(x0 - fa.x > KT.DASH_DIST * 0.9, 'dash para trás');
  assert.ok(fa.dashCd > 2.5);
  const x1 = fa.x;
  act(ctx, a, 'dash', { dx: -1, dy: 0 });
  ctx.run(0.3);
  assert.equal(fa.x, x1, 'em recarga: nada acontece');
  ctx.run(KT.DASH_CD);
  act(ctx, a, 'dash', { dx: 1, dy: 0 });
  ctx.run(0.3);
  assert.ok(fa.x > x1 + KT.DASH_DIST * 0.9);
  assert.equal(ctx.events(a, 'dash').length, 2);

  // invencível: dash atravessa o chute forte
  put(fight, fa, fb, 90);
  fa.dashCd = 0;
  act(ctx, b, 'hkick');
  ctx.run(MOVES.hkick.startup - 0.05);
  act(ctx, a, 'dash', { dx: 1, dy: 0 });
  ctx.run(0.6);
  assert.equal(ctx.events(a, 'hit').filter((h) => h.by === b.id).length, 0);
  assert.ok(fa.x > fb.x, 'passou por trás');
});

test('investida: golpe logo depois do dash bate mais forte', () => {
  const ctx = setup();
  const { a, fight, fa, fb } = startFight(ctx);
  put(fight, fa, fb, 180);
  act(ctx, a, 'dash', { dx: 1, dy: 0 });
  ctx.run(KT.DASH_TIME + 0.04);
  act(ctx, a, 'punch');
  ctx.run(0.5);
  const hit = ctx.events(a, 'hit')[0];
  assert.equal(hit.dash, 1);
  assert.equal(hit.dmg, Math.round(MOVES.punch.dmg * KT.DASH_BONUS));
});

test('nocaute ganha o round; melhor de 3 e todos voltam para a praça', () => {
  const ctx = setup();
  const c = ctx.join('Caio');
  const { a, fight, fa, fb } = startFight(ctx);
  for (let r = 1; r <= 2; r++) {
    put(fight, fa, fb, 40);
    fb.hp = 3;
    act(ctx, a, 'jab');
    ctx.run(0.2);
    const ko = ctx.events(a, 'ko').at(-1);
    assert.equal(ko.winner, a.id);
    assert.deepEqual(ko.wins, [r, 0]);
    assert.equal(fb.st, 'ko');
    ctx.run(KT.KO_TIME + KT.INTRO_TIME + 0.1);
    if (r === 1) {
      assert.equal(fight.round, 2);
      assert.equal(fb.hp, KT.HP, 'vida cheia no round novo');
    }
  }
  const end = ctx.of(c, MSG.KT_END)[0];
  assert.equal(end.winner, a.id);
  assert.equal(end.reason, 'ko');
  assert.deepEqual(end.score, [2, 0]);
  assert.equal(ctx.room.fights.size, 0);
  assert.equal(ctx.room.players.get(a.id).pose, '');
  assert.equal(ctx.room.isBusy(a.id), false);
});

test('tempo esgotado: vence quem tem mais vida', () => {
  const ctx = setup();
  const { a, b, fa } = startFight(ctx);
  fa.hp = 40;
  ctx.run(KT.ROUND_TIME + 0.1);
  const ko = ctx.events(a, 'ko')[0];
  assert.equal(ko.reason, 'time');
  assert.equal(ko.winner, b.id);
});

test('sair no meio da luta = W.O.', () => {
  const ctx = setup();
  const c = ctx.join('Caio');
  const { a, b } = startFight(ctx);
  ctx.room.removePlayer(b.id);
  const end = ctx.of(c, MSG.KT_END)[0];
  assert.equal(end.winner, a.id);
  assert.equal(end.reason, 'wo');
  assert.equal(ctx.room.isBusy(a.id), false);
});

test('quem não está lutando não controla ninguém', () => {
  const ctx = setup();
  const c = ctx.join('Caio');
  const { fa } = startFight(ctx);
  const x = fa.x;
  ctx.room.handle(c.id, { t: MSG.KT_ACT, a: 'dash', dx: 1 });
  ctx.room.handle(c.id, { t: MSG.KT_INPUT, mx: 1 });
  ctx.run(0.3);
  assert.equal(fa.x, x);
  assert.equal(ctx.events(c).length, 0);
});

test('golpes simultâneos trocam: os dois acertam', () => {
  const ctx = setup();
  const { a, b, fa, fb } = startFight(ctx);
  act(ctx, a, 'jab');
  act(ctx, b, 'jab');
  ctx.run(0.3);
  const hits = ctx.events(a, 'hit');
  assert.equal(hits.length, 2);
  assert.equal(fa.hp, fb.hp);
});

test('golpe PREVISÍVEL: repetir o mesmo golpe perde dano, variar não', () => {
  const ctx = setup();
  const { a, fight, fa, fb } = startFight(ctx);
  const kickOnce = () => {
    put(fight, fa, fb, 80);
    fb.st = 'idle';
    fb.combo = 0;
    act(ctx, a, 'kick');
    ctx.run(1.2);
    return ctx.events(a, 'hit').at(-1);
  };
  const first = kickOnce();
  kickOnce();
  const third = kickOnce();
  assert.equal(first.dmg, MOVES.kick.dmg);
  assert.ok(third.dmg < first.dmg, `3º chute igual: ${third.dmg}`);
  assert.equal(third.stale, 1);
  // um golpe diferente sai com dano cheio
  put(fight, fa, fb, 100);
  act(ctx, a, 'hkick');
  ctx.run(0.6);
  assert.equal(ctx.events(a, 'hit').at(-1).dmg, MOVES.hkick.dmg);
});
