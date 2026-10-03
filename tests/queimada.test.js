import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/Room.js';
import { MAP } from '../shared/map.js';
import { MSG } from '../shared/constants.js';
import { QM, LEVELS, throwVelocity, stepBall, predictPath, catchOk, zoneX } from '../shared/queimada.js';

function setup() {
  let now = 5_000_000;
  const room = new Room({ now: () => now, random: () => 0.5 });
  const inbox = new Map();
  const join = (nick) => {
    const msgs = [];
    const { player } = room.addPlayer({ nick }, (s) => msgs.push(JSON.parse(s)));
    inbox.set(player.id, msgs);
    return player;
  };
  const step = () => {
    now += 1000 / 30;
    room.tick(1 / 30);
  };
  const run = (secs) => {
    for (let i = 0; i < Math.round(secs * 30); i++) step();
  };
  // roda até `pred()` ser verdade (máx. `secs`)
  const until = (pred, secs = 3) => {
    for (let i = 0; i < secs * 30; i++) {
      if (pred()) return true;
      step();
    }
    return pred();
  };
  const of = (p, t) => inbox.get(p.id).filter((m) => m.t === t);
  const events = (p, kind) => of(p, MSG.QM_EVENT).filter((e) => e.kind === kind);
  const clear = (p) => { inbox.get(p.id).length = 0; };
  return { room, join, step, run, until, of, events, clear };
}

// a cria a partida, os outros entram; roda até a rodada valer
function startMatch(ctx, nicks = ['Ana', 'Bia'], hard = false) {
  const ps = nicks.map((n) => ctx.join(n));
  ctx.room.handle(ps[0].id, { t: MSG.QM_CREATE, hard });
  const qm = ctx.room.qmOf.get(ps[0].id);
  for (const p of ps.slice(1)) ctx.room.handle(p.id, { t: MSG.QM_JOIN, id: qm.id });
  ctx.run(QM.LOBBY_COUNT + QM.INTRO_TIME + 0.1);
  assert.equal(qm.phase, 'play');
  return { ps, qm };
}

const pl = (qm, p) => qm.court.get(p.id);

// coloca os dois de frente, no meio da profundidade, e dá a bola 0 para `thrower`
function face(qm, thrower, target, tx = 300, vx = 800) {
  const t = pl(qm, thrower);
  const v = pl(qm, target);
  Object.assign(t, { x: t.team === 'a' ? tx : QM.W - tx, y: 210, inv: 0 });
  Object.assign(v, { x: v.team === 'a' ? QM.W - vx : vx, y: 210, inv: 0 });
  for (const b of qm.balls) if (b.st === 'held') qm.dropBall(qm.court.get(b.by));
  qm.balls[0].st = 'loose';
  qm.pickUp(t, 0);
  return { t, v };
}

const throwAt = (ctx, qm, p, v) => ctx.room.handle(p.id, { t: MSG.QM_ACT, a: 'throw', x: v.x, y: v.y });

test('física: força pelo clique, arco cai perto do alvo, quica na parede e para', () => {
  const near = throwVelocity(100, 200, 150, 200);
  const far = throwVelocity(100, 200, 700, 200);
  assert.ok(Math.hypot(far.vx, far.vy) > Math.hypot(near.vx, near.vy) * 1.8, 'longe = mais forte');
  assert.ok(far.pow > 0.9 && near.pow < 0.05);
  // sem obstáculos, a bola toca o chão perto do ponto clicado
  const path = predictPath(200, 200, 600, 200);
  const [lx] = path.pts.at(-1);
  assert.ok(Math.abs(lx - 600) < 25, `caiu em ${lx}`);
  // parede devolve a bola
  const b = { x: QM.W - 20, y: 200, z: 30, vx: 400, vy: 0, vz: 0 };
  const ev = stepBall(b, 0.05);
  assert.equal(ev.wall, 1);
  assert.ok(b.vx < 0);
  // rolando, para sozinha
  const r = { x: 300, y: 200, z: 0, vx: 200, vy: 0, vz: 0 };
  for (let i = 0; i < 400; i++) stepBall(r, 1 / 30);
  assert.equal(r.vx, 0);
  // bola rápida exige mais precisão para pegar
  assert.ok(catchOk(0.3, 340, LEVELS.easy) && !catchOk(0.3, 750, LEVELS.easy));
});

test('Ginásio: criar partida, entrar numa já existente, todo mundo sabe quem está lá', () => {
  const ctx = setup();
  const a = ctx.join('Ana');
  const b = ctx.join('Bia');
  const c = ctx.join('Caio');
  ctx.room.handle(a.id, { t: MSG.QM_CREATE, hard: true });
  const qm = ctx.room.qmOf.get(a.id);
  assert.ok(qm && qm.hard);
  assert.equal(qm.phase, 'lobby');
  const pa = ctx.room.players.get(a.id);
  assert.equal(pa.pose, 'queimada');
  assert.deepEqual([pa.x, pa.y], [MAP.gym.door.x, MAP.gym.door.y]);
  assert.equal(ctx.of(a, MSG.QM_ENTER)[0].id, qm.id);
  // quem está na praça vê a partida (para listar no Ginásio e esconder o jogador)
  const live = ctx.of(c, MSG.QM_LIVE).at(-1);
  assert.equal(live.id, qm.id);
  assert.deepEqual(live.m, [[a.id, 'a', 1, 0]]);
  // quem chega depois recebe a lista no welcome
  const d = ctx.join('Davi');
  assert.equal(ctx.of(d, MSG.WELCOME)[0].qms[0].id, qm.id);
  // na quadra não anda na praça
  ctx.room.handle(a.id, { t: MSG.MOVE, x: 1000, y: 900 });
  assert.equal(pa.path.length, 0);
  // sozinho = treino livre: pega a bola e arremessa
  const me = pl(qm, a);
  Object.assign(qm.balls[0], { x: me.x + 10, y: me.y });
  ctx.room.handle(a.id, { t: MSG.QM_ACT, a: 'grab' });
  assert.equal(me.hold, 0);
  ctx.room.handle(a.id, { t: MSG.QM_ACT, a: 'throw', x: 900, y: 100 });
  assert.equal(qm.balls[0].st, 'live');
  // segundo jogador: contagem e rodada 1v1
  ctx.room.handle(b.id, { t: MSG.QM_JOIN, id: qm.id });
  assert.equal(qm.phase, 'count');
  ctx.run(QM.LOBBY_COUNT + 0.1);
  assert.equal(qm.phase, 'intro');
  const round = ctx.events(a, 'round').at(-1);
  assert.equal(round.a.length + round.b.length, 2);
  assert.equal(qm.balls.length, 1);
  assert.equal(qm.balls[0].x, QM.W / 2, 'bola na linha do meio: corrida pela bola');
  ctx.run(QM.INTRO_TIME + 0.1);
  assert.ok(ctx.events(b, 'go').length);
  assert.equal(ctx.of(c, MSG.QM_STATE).length, 0, 'quem está na praça não recebe o estado');
});

test('acertou: hit-stop, QUEIMADO (+5), vai para o cemitério; 1v1 acaba e o último de pé ganha +10', () => {
  const ctx = setup();
  const { ps: [a, b], qm } = startMatch(ctx);
  const { v } = face(qm, a, b);
  throwAt(ctx, qm, a, v);
  assert.ok(ctx.until(() => qm.balls[0].st === 'freeze', 2), 'congela no alvo');
  assert.equal(ctx.events(a, 'hit').length, 0, 'ainda dá tempo de reagir');
  ctx.run(QM.HIT_GRACE + 0.05);
  const hit = ctx.events(a, 'hit')[0];
  assert.deepEqual([hit.by, hit.to, hit.pts], [a.id, b.id, QM.PTS_HIT]);
  assert.equal(v.st, 'hit');
  const end = ctx.events(b, 'roundEnd')[0];
  assert.equal(end.winner, pl(qm, a).team);
  assert.deepEqual(end.survivors, [a.id]);
  assert.equal(qm.members.get(a.id).pts, QM.PTS_HIT + QM.PTS_SURVIVE);
  ctx.run(QM.HIT_TIME);
  assert.equal(v.cem, true, 'queimado vai para o cemitério');
  const [lo, hi] = zoneX(v.team, true);
  assert.ok(v.x >= lo && v.x <= hi);
  // próxima rodada começa sozinha
  ctx.run(QM.END_TIME);
  assert.equal(qm.round, 2);
});

test('pegar no tempo certo (+3, fica com a bola) · cedo demais com bola rápida = escapou (não é queimado)', () => {
  const ctx = setup();
  const { ps: [a, b], qm } = startMatch(ctx);
  let { v } = face(qm, a, b);
  throwAt(ctx, qm, a, v);
  ctx.until(() => Math.abs(qm.balls[0].x - v.x) < 90);
  ctx.room.handle(b.id, { t: MSG.QM_ACT, a: 'grab' });
  assert.equal(v.st, 'catch');
  ctx.run(0.4);
  const c = ctx.events(b, 'catch')[0];
  assert.deepEqual([c.by, c.from, c.pts], [b.id, a.id, QM.PTS_CATCH]);
  assert.equal(v.hold, 0);
  assert.equal(qm.members.get(b.id).pts, QM.PTS_CATCH);

  // escapou: postura cedo demais para uma bola rápida
  ({ v } = face(qm, a, b));
  v.catchCd = 0;
  throwAt(ctx, qm, a, v);
  ctx.until(() => Math.abs(qm.balls[0].x - v.x) < 310);
  ctx.room.handle(b.id, { t: MSG.QM_ACT, a: 'grab' });
  ctx.run(0.5);
  assert.equal(ctx.events(b, 'fumble').length, 1);
  assert.equal(ctx.events(b, 'hit').length, 0);
  assert.notEqual(v.st, 'hit');
});

test('esquiva: WHOOSH (+1) quando a bola passa raspando; esquiva/pegada durante o hit-stop salvam (lag)', () => {
  const ctx = setup();
  const { ps: [a, b], qm } = startMatch(ctx);
  let { v } = face(qm, a, b);
  throwAt(ctx, qm, a, v);
  ctx.until(() => Math.abs(qm.balls[0].x - v.x) < 75);
  ctx.room.handle(b.id, { t: MSG.QM_ACT, a: 'dodge', dx: 0, dy: 1 });
  assert.equal(v.st, 'dodge');
  ctx.run(0.5);
  const w = ctx.events(b, 'whoosh')[0];
  assert.ok(w && w.last === 1, 'no último segundo');
  assert.equal(ctx.events(b, 'hit').length, 0);
  assert.equal(qm.members.get(b.id).pts, QM.PTS_DODGE);

  // esquiva atrasada (chegou durante o hit-stop): ainda vale
  ({ v } = face(qm, a, b));
  v.dodgeCd = 0;
  throwAt(ctx, qm, a, v);
  ctx.until(() => qm.balls[0].st === 'freeze');
  ctx.room.handle(b.id, { t: MSG.QM_ACT, a: 'dodge', dx: 0, dy: -1 });
  ctx.run(0.5);
  assert.equal(ctx.events(b, 'whoosh').length, 2);
  assert.equal(ctx.events(b, 'hit').length, 0);

  // pegada atrasada durante o hit-stop
  ({ v } = face(qm, a, b));
  throwAt(ctx, qm, a, v);
  ctx.until(() => qm.balls[0].st === 'freeze');
  ctx.room.handle(b.id, { t: MSG.QM_ACT, a: 'grab' });
  assert.equal(ctx.events(b, 'catch').at(-1).late, 1);
  assert.equal(v.hold, 0);
});

test('fila: 3 jogadores = 1v1 + fila; queimado sai e o próximo entra no mesmo time', () => {
  const ctx = setup();
  const { ps: [a, b, c], qm } = startMatch(ctx, ['Ana', 'Bia', 'Caio']);
  assert.equal(qm.court.size, 2);
  const waiting = [a, b, c].find((p) => !qm.court.has(p.id));
  assert.deepEqual(qm.queue(), [waiting.id]);
  // quem está na fila não joga
  ctx.room.handle(waiting.id, { t: MSG.QM_ACT, a: 'dodge', dx: 1, dy: 0 });
  assert.ok(!qm.court.has(waiting.id));
  const [p1, p2] = [a, b, c].filter((p) => qm.court.has(p.id));
  const { v } = face(qm, p1, p2);
  const team = v.team;
  throwAt(ctx, qm, p1, v);
  ctx.until(() => ctx.events(p1, 'hit').length > 0, 2);
  assert.equal(qm.phase, 'play', 'o time ainda tem alguém entrando');
  ctx.run(QM.ENTER_DELAY + 0.1);
  const enter = ctx.events(a, 'enter')[0];
  assert.deepEqual([enter.id, enter.team], [waiting.id, team]);
  assert.equal(pl(qm, waiting).team, team);
  assert.ok(pl(qm, waiting).inv > 0, 'entra invencível um pouquinho');
});

test('2v2 com 4 (duas bolas) e fila com o 5º; próxima rodada: quem esperou entra primeiro', () => {
  const ctx = setup();
  const { ps, qm } = startMatch(ctx, ['Daniel', 'Maria', 'Nilton', 'Joao', 'Zeca']);
  assert.equal(qm.per, 2);
  assert.equal(qm.court.size, 4);
  assert.equal(qm.balls.length, 2);
  const teams = [...qm.court.values()].map((p) => p.team).sort().join('');
  assert.equal(teams, 'aabb');
  const waiting = ps.find((p) => !qm.court.has(p.id));
  assert.equal(waiting.nick, 'Zeca');
  // acaba a rodada por tempo; na seguinte o Zeca joga
  ctx.run(QM.ROUND_TIME + 0.1);
  assert.equal(ctx.events(ps[0], 'roundEnd')[0].reason, 'time');
  ctx.run(QM.END_TIME + 0.1);
  assert.ok(qm.court.has(waiting.id), 'quem esperou entra');
  assert.equal(qm.court.size, 4);
});

test('cemitério: queimado acerta alguém de lá e volta para a quadra', () => {
  const ctx = setup();
  const { ps, qm } = startMatch(ctx, ['Daniel', 'Maria', 'Nilton', 'Joao']);
  const byTeam = (t) => ps.filter((p) => pl(qm, p).team === t);
  const [a1, a2] = byTeam('a');
  const [b1] = byTeam('b');
  // a1 foi queimado e está no cemitério (atrás do time B)
  const dead = pl(qm, a1);
  qm.eliminate(dead);
  ctx.run(QM.HIT_TIME + 0.1);
  assert.equal(dead.cem, true);
  assert.ok(dead.x > QM.W - QM.CEM, 'cemitério do time A fica atrás do time B');
  // no cemitério ninguém o acerta
  assert.equal(qm.onCourt('a'), 1);
  // pega uma bola e queima o b1 pelas costas
  const v = pl(qm, b1);
  Object.assign(v, { x: 800, y: 210, inv: 0 });
  Object.assign(dead, { y: 210 });
  for (const b of qm.balls) if (b.st === 'held') qm.dropBall(qm.court.get(b.by));
  qm.balls[0].st = 'loose';
  qm.pickUp(dead, 0);
  throwAt(ctx, qm, a1, v);
  ctx.until(() => ctx.events(a1, 'hit').length > 0, 2);
  const hit = ctx.events(a2, 'hit')[0];
  assert.equal(hit.cem, 1);
  assert.equal(dead.cem, false, 'VOLTOU do cemitério');
  assert.ok(ctx.events(a2, 'revive').some((e) => e.id === a1.id));
  assert.equal(qm.onCourt('a'), 2);
});

test('tabela: acerto depois de quicar na parede vale bônus · companheiro de time não é queimado', () => {
  const ctx = setup();
  const { ps, qm } = startMatch(ctx, ['Daniel', 'Maria', 'Nilton', 'Joao']);
  const [a1, a2] = ps.filter((p) => pl(qm, p).team === 'a');
  const [b1, b2] = ps.filter((p) => pl(qm, p).team === 'b');
  // companheiro no caminho: a bola atravessa
  const t = pl(qm, a1);
  Object.assign(t, { x: 200, y: 210 });
  Object.assign(pl(qm, a2), { x: 400, y: 210, inv: 0 });
  Object.assign(pl(qm, b1), { x: 900, y: 40, inv: 0 });
  Object.assign(pl(qm, b2), { x: 980, y: 400, inv: 0 });
  for (const b of qm.balls) if (b.st === 'held') qm.dropBall(qm.court.get(b.by));
  qm.balls[0].st = 'loose';
  qm.pickUp(t, 0);
  ctx.room.handle(a1.id, { t: MSG.QM_ACT, a: 'throw', x: 1000, y: 210 });
  ctx.run(0.3);
  assert.notEqual(pl(qm, a2).st, 'hit');
  // tabela: bola viva quicou na parede e acerta
  const b = qm.balls[0];
  const v = pl(qm, b2);
  Object.assign(b, { st: 'live', x: v.x + 60, y: v.y, z: 30, vx: -400, vy: 0, vz: 0, bank: 1, thrower: a1.id, team: 'a', passed: new Set() });
  ctx.until(() => ctx.events(a1, 'hit').length > 0, 1);
  assert.equal(ctx.events(a1, 'hit')[0].pts, QM.PTS_HIT + QM.PTS_BANK);
});

test('fácil: clicar na bola longe corre até ela · difícil: longe demais · segurar demais derruba', () => {
  const ctx = setup();
  const { ps: [a], qm } = startMatch(ctx, ['Ana', 'Bia']);
  const me = pl(qm, a);
  const [lo] = zoneX(me.team, false);
  Object.assign(me, { x: me.team === 'a' ? lo + 20 : QM.W - QM.CEM - 40, y: 100 });
  const b = qm.balls[0];
  Object.assign(b, { st: 'loose', x: me.x + me.dir * 150, y: 300, z: 0, vx: 0, vy: 0 });
  if (b.x < lo || b.x > zoneX(me.team, false)[1]) b.x = me.x - me.dir * 150;
  ctx.room.handle(a.id, { t: MSG.QM_ACT, a: 'grab' });
  assert.equal(me.run, 0);
  assert.ok(ctx.until(() => me.hold === 0, 3), 'correu e pegou');
  // segurou demais: derruba
  ctx.run(LEVELS.easy.holdMax + 0.2);
  assert.equal(ctx.events(a, 'slow').length, 1);
  assert.equal(me.hold, -1);

  const ctx2 = setup();
  const { ps: [h], qm: hq } = startMatch(ctx2, ['Hugo', 'Iara'], true);
  const hp = pl(hq, h);
  Object.assign(hq.balls[0], { st: 'loose', x: hp.x, y: hp.y > 200 ? hp.y - 150 : hp.y + 150, z: 0, vx: 0, vy: 0 });
  ctx2.room.handle(h.id, { t: MSG.QM_ACT, a: 'grab' });
  assert.equal(ctx2.events(h, 'miss')[0].why, 'far');
  assert.equal(hp.run, -1);
});

test('sair: no meio da rodada conta como queimado; sozinho volta ao treino; vazia some da lista', () => {
  const ctx = setup();
  const { ps: [a, b, c], qm } = startMatch(ctx, ['Ana', 'Bia', 'Caio']);
  const playing = [a, b, c].filter((p) => qm.court.has(p.id));
  ctx.room.handle(playing[0].id, { t: MSG.QM_LEAVE });
  assert.equal(ctx.of(playing[0], MSG.QM_EXIT)[0].reason, 'left');
  assert.equal(ctx.room.players.get(playing[0].id).pose, '');
  assert.equal(qm.phase, 'play', 'quem estava na fila entra');
  ctx.run(QM.ENTER_DELAY + 0.1);
  assert.equal(qm.court.size, 2);
  ctx.room.removePlayer(playing[1].id);
  assert.equal(qm.phase, 'lobby', 'sobrou um: treino livre');
  const last = [a, b, c].find((p) => qm.has(p.id));
  const watcher = ctx.join('Zeca');
  ctx.room.handle(last.id, { t: MSG.QM_LEAVE });
  assert.equal(ctx.room.qms.size, 0);
  assert.ok(ctx.of(watcher, MSG.QM_LIVE).some((m) => m.id === qm.id && m.gone));
});

test('convite: da praça cria uma partida para os dois; de dentro da quadra chama para a minha', () => {
  const ctx = setup();
  const a = ctx.join('Ana');
  const b = ctx.join('Bia');
  const c = ctx.join('Caio');
  const d = ctx.join('Davi');
  ctx.room.handle(a.id, { t: MSG.CHALLENGE, to: b.id, game: 'queimada' });
  const inv = ctx.of(b, MSG.CHALLENGE)[0];
  assert.equal(inv.game, 'queimada');
  assert.equal(inv.match, 0);
  ctx.room.handle(b.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: true });
  const qm = ctx.room.qmOf.get(a.id);
  assert.ok(qm && ctx.room.qmOf.get(b.id) === qm);
  assert.equal(qm.phase, 'count');
  // de dentro: convida dois de uma vez
  ctx.room.handle(a.id, { t: MSG.CHALLENGE, to: c.id, game: 'queimada' });
  ctx.room.handle(a.id, { t: MSG.CHALLENGE, to: d.id, game: 'queimada' });
  assert.equal(ctx.of(c, MSG.CHALLENGE)[0].match, qm.id);
  assert.equal(ctx.of(d, MSG.CHALLENGE)[0].match, qm.id);
  ctx.room.handle(c.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: true });
  ctx.room.handle(d.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: true });
  assert.equal(qm.size(), 4);
  // ocupado na quadra: não dá para ser desafiado para outro jogo nem assistir o dojo
  const e = ctx.join('Eva');
  ctx.room.handle(e.id, { t: MSG.CHALLENGE, to: a.id, game: 'karate' });
  assert.equal(ctx.of(e, MSG.CH_STATUS).at(-1).status, 'busy');
  ctx.room.handle(a.id, { t: MSG.CHALLENGE, to: e.id, game: 'karate' });
  assert.equal(ctx.of(a, MSG.CH_STATUS).at(-1).status, 'busy');
});

test('fim: primeiro a chegar na meta vence (qm_end para todos) e a quadra recomeça zerada', () => {
  const ctx = setup();
  const { ps: [a, b], qm } = startMatch(ctx);
  const z = ctx.join('Zeca');
  qm.members.get(a.id).pts = QM.TARGET - QM.PTS_HIT - QM.PTS_SURVIVE;
  const { v } = face(qm, a, b);
  throwAt(ctx, qm, a, v);
  ctx.until(() => ctx.events(a, 'roundEnd').length > 0, 2);
  ctx.run(QM.END_TIME + 0.1);
  assert.equal(qm.phase, 'over');
  const end = ctx.of(z, MSG.QM_END)[0];
  assert.equal(end.winner, a.id);
  assert.equal(end.rank[0][2], QM.TARGET);
  ctx.run(QM.OVER_TIME + 0.1);
  assert.equal(qm.phase, 'count');
  assert.equal(qm.members.get(a.id).pts, 0);
  ctx.run(QM.LOBBY_COUNT + 0.1);
  assert.equal(qm.round, 1);
});

test('lotação e partidas simultâneas', () => {
  const ctx = setup();
  const ps = Array.from({ length: QM.MAX_MEMBERS + 1 }, (_, i) => ctx.join(`P${i}`));
  ctx.room.handle(ps[0].id, { t: MSG.QM_CREATE });
  const qm = ctx.room.qmOf.get(ps[0].id);
  for (const p of ps.slice(1)) ctx.room.handle(p.id, { t: MSG.QM_JOIN, id: qm.id });
  assert.equal(qm.size(), QM.MAX_MEMBERS);
  assert.equal(ctx.of(ps.at(-1), MSG.QM_EXIT)[0].reason, 'full');
  // o que sobrou cria outra quadra
  ctx.room.handle(ps.at(-1).id, { t: MSG.QM_CREATE });
  assert.equal(ctx.room.qms.size, 2);
  ctx.room.handle(ps[1].id, { t: MSG.QM_JOIN, id: 999 });
  assert.equal(ctx.of(ps[1], MSG.QM_EXIT).at(-1).reason, 'gone');
});

test('correr até a bola nunca trava: bola na beira do alcance (linha do meio) é pega', () => {
  const ctx = setup();
  const { ps: [a], qm } = startMatch(ctx, ['Ana', 'Bia']);
  const me = pl(qm, a);
  const [lo, hi] = zoneX(me.team, false);
  const edge = me.team === 'a' ? hi : lo;
  Object.assign(me, { x: edge - (me.team === 'a' ? 60 : -60), y: 54 });
  const ballX = me.team === 'a' ? edge + 42 : edge - 42;
  Object.assign(qm.balls[0], { st: 'loose', x: ballX, y: 54, z: 0, vx: 0, vy: 0, vz: 0 });
  for (const b of qm.balls.slice(1)) b.st = 'held';
  ctx.room.handle(a.id, { t: MSG.QM_ACT, a: 'grab' });
  ctx.run(1.5);
  assert.ok(me.hold === 0 || me.run === -1, 'pegou ou desistiu (não fica andando para sempre)');
  // bola fora do alcance de todos (atrás da linha, longe): o juiz devolve
  const other = setup();
  const { qm: q2 } = startMatch(other, ['Caio', 'Davi']);
  Object.assign(q2.balls[0], { st: 'loose', x: 3, y: 3, z: 0, vx: 0, vy: 0, vz: 0 });
  for (const p of q2.court.values()) if (p.team === 'b') Object.assign(p, { cem: false });
  other.run(QM.BALL_RETURN + 1.5);
  assert.ok(q2.balls[0].x > 40 || q2.court.size === 0);
});
