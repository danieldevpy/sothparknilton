import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/Room.js';
import { MAP } from '../shared/map.js';
import { MSG } from '../shared/constants.js';
import {
  QZ, comboTargets, closestAhead, stepsFor, giftSquares, isGold, askTime, levelFor, joinOpen, drawCard,
} from '../shared/quiz.js';
import { validateTheme, validateQuestion, buildOptions, QuestionPicker, parseLines } from '../server/quiz/bank.js';
import { getTheme, registerTheme } from '../server/quiz/themes.js';

function setup(random = () => 0.5) {
  let now = 9_000_000;
  const room = new Room({ now: () => now, random });
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
  const until = (pred, secs = 5) => {
    for (let i = 0; i < secs * 30; i++) {
      if (pred()) return true;
      step();
    }
    return pred();
  };
  const of = (p, t) => inbox.get(p.id).filter((m) => m.t === t);
  const last = (p, t) => of(p, t).at(-1);
  const events = (p, kind) => of(p, MSG.QZ_EVENT).filter((e) => e.kind === kind);
  return { room, join, step, run, until, of, last, events };
}

// cria a sala com `a`, os outros entram correndo; roda até a 1ª pergunta estar no ar
function startRace(ctx, nicks = ['Ana', 'Bia'], opts = {}) {
  const ps = nicks.map((n) => ctx.join(n));
  ctx.room.handle(ps[0].id, { t: MSG.QZ_CREATE, mode: 'normal', len: 14, ...opts });
  const qz = ctx.room.qzOf.get(ps[0].id);
  for (const p of ps.slice(1)) ctx.room.handle(p.id, { t: MSG.QZ_JOIN, id: qz.id, as: 'play' });
  if (ps.length === 1) ctx.room.handle(ps[0].id, { t: MSG.QZ_START });
  assert.ok(ctx.until(() => qz.phase === 'ask', QZ.COUNT_TIME + QZ.INTRO_TIME + 1), 'pergunta no ar');
  return { ps, qz };
}

const answer = (ctx, qz, p, right) => {
  const q = qz.q;
  const hidden = qz.racers.get(p.id)?.cola || [];
  const i = right ? q.ok : q.opts.findIndex((_, k) => k !== q.ok && !hidden.includes(k));
  ctx.room.handle(p.id, { t: MSG.QZ_ANSWER, n: q.n, i });
};

// espera a pergunta estar no ar, responde (certo/errado por jogador) e roda até a próxima pergunta
function round(ctx, qz, picks) {
  assert.ok(ctx.until(() => qz.phase === 'ask', 10), 'pergunta no ar');
  for (const [p, right] of picks) answer(ctx, qz, p, right);
  assert.ok(ctx.until(() => qz.phase === 'reveal', 30), 'revelou');
  const res = qz.q;
  ctx.until(() => qz.phase !== 'reveal', 10);
  return res;
}

test('banco de inglês: grande, válido, sem ids repetidos e com os 3 níveis em todas as categorias', () => {
  const t = getTheme('en');
  const v = validateTheme(t);
  assert.ok(v.ok, v.errors.slice(0, 5).join('\n'));
  assert.ok(t.questions.length >= 2000, `só ${t.questions.length} perguntas`);
  const cats = new Map();
  for (const q of t.questions) {
    if (!cats.has(q.cat)) cats.set(q.cat, new Set());
    cats.get(q.cat).add(q.lvl);
  }
  assert.ok(cats.size >= 14);
  for (const [c, lv] of cats) assert.equal(lv.size, 3, `${c} sem algum nível`);
  // a resposta certa nunca aparece entre as erradas
  for (const q of t.questions) assert.ok(!q.w.map((x) => x.toLowerCase()).includes(q.a.toLowerCase()), q.id);
});

test('banco: validação recusa pergunta quebrada, tema ruim não entra, opções sempre trazem a certa', () => {
  assert.match(validateQuestion({ id: 'x', cat: 'a', lvl: 1, q: 'Pergunta?', a: 'sim', w: ['sim'] }), /repetidas/);
  assert.match(validateQuestion({ id: 'x', cat: 'a', lvl: 4, q: 'Pergunta?', a: 'sim', w: ['não'] }), /nível/);
  assert.equal(validateQuestion({ id: 'x', cat: 'a', lvl: 2, q: 'Pergunta?', a: 'sim', w: ['não'] }), null);
  const logs = [];
  assert.equal(registerTheme({ id: 'ruim', name: 'Ruim', cats: {}, questions: [{ id: 'q', cat: 'zz', lvl: 1, q: '?', a: '', w: [] }] }, (m) => logs.push(m)), false);
  assert.equal(getTheme('ruim').id, 'en', 'tema inválido cai no padrão');
  const [q] = parseLines('2|She ___ to school.|goes|go ; going ; gone|dica', 'grammar', 't');
  for (const n of [3, 4]) {
    const { opts, ok } = buildOptions(q, n, Math.random);
    assert.equal(opts.length, n);
    assert.equal(opts[ok], 'goes');
  }
  const tf = buildOptions({ a: 'Errado', w: ['Certo'] }, 4);
  assert.deepEqual(tf.opts, ['Certo', 'Errado']);
  assert.equal(tf.ok, 1);
  // sorteio: não repete pergunta e varia a categoria
  const pk = new QuestionPicker(getTheme('en'), Math.random);
  const seen = new Set();
  let prev = '';
  let same = 0;
  for (let i = 0; i < 300; i++) {
    const x = pk.pick(1 + (i % 3));
    assert.ok(!seen.has(x.id), 'repetiu pergunta');
    seen.add(x.id);
    if (x.cat === prev) same++;
    prev = x.cat;
  }
  assert.equal(same, 0, 'mesma categoria duas vezes seguidas');
});

test('regras: combo mira quem está na frente (um ataque por alvo), líder ganha escudo, ouro, tudo ou nada', () => {
  const rs = [
    { id: 1, pos: 2, streak: 1, order: 0 },
    { id: 2, pos: 2, streak: 3, order: 1 },
    { id: 3, pos: 5, streak: 0, order: 2 },
    { id: 4, pos: 7, streak: 1, order: 3 },
  ];
  const t = comboTargets(rs);
  // 1 e 2 empatados atrás: quem tem mais sequência escolhe primeiro (o 3); o outro pega o próximo (o 4)
  assert.deepEqual(t.get(2), { kind: 'hit', to: 3 });
  assert.deepEqual(t.get(1), { kind: 'hit', to: 4 });
  assert.deepEqual(t.get(4), { kind: 'shield', to: 0 }, 'líder com combo = escudo');
  assert.equal(t.has(3), false, 'sequência par = sem combo armado');
  assert.equal(closestAhead(rs, rs[3]), null);
  assert.equal(closestAhead(rs, rs[0]).id, 3, 'empatado não conta como "na frente"');
  assert.equal(stepsFor(true, false, false), 1);
  assert.equal(stepsFor(true, true, false), 2);
  assert.equal(stepsFor(true, true, true), 4);
  assert.equal(stepsFor(false, true, true), -1);
  assert.equal(stepsFor(false, false, false), 0);
  assert.deepEqual(giftSquares(14), [3, 7, 11]);
  assert.deepEqual(giftSquares(10), [3, 7]);
  assert.ok(isGold(5) && isGold(10) && !isGold(4));
  assert.ok(askTime('curta?', ['a', 'b']) >= QZ.ASK_MIN && askTime('x'.repeat(900), ['a']) <= QZ.ASK_MAX);
  assert.equal(levelFor('easy', { gold: false }), 1);
  assert.equal(levelFor('mix', { leaderPos: 12, len: 14 }), 3);
  assert.equal(levelFor('easy', { gold: true }), 2, 'ouro sobe um nível');
  assert.ok(joinOpen(8, 14) && !joinOpen(9, 14));
  // presente: quem está atrás tira mais pum/tudo ou nada
  const count = (rank) => {
    let c = 0;
    for (let i = 0; i < 1000; i++) if (drawCard(rank, () => i / 1000) === 'cola') c++;
    return c;
  };
  assert.ok(count(0) > count(1) * 2);
});

test('Escola: criar sala, entrar correndo ou assistindo; a praça sabe quem está lá; welcome lista as salas', () => {
  const ctx = setup();
  const a = ctx.join('Ana');
  const b = ctx.join('Bia');
  const c = ctx.join('Caio');
  ctx.room.handle(a.id, { t: MSG.QZ_CREATE, mode: 'easy', len: 10 });
  const qz = ctx.room.qzOf.get(a.id);
  assert.ok(qz);
  assert.deepEqual([qz.mode, qz.len, qz.phase], ['easy', 10, 'lobby']);
  const pa = ctx.room.players.get(a.id);
  assert.equal(pa.pose, 'quiz');
  assert.deepEqual([pa.x, pa.y], [MAP.school.door.x, MAP.school.door.y]);
  assert.equal(ctx.last(a, MSG.QZ_ENTER).role, 'play');
  assert.deepEqual(ctx.last(c, MSG.QZ_LIVE).r, [[a.id, 0]]);
  // assistir
  ctx.room.handle(c.id, { t: MSG.QZ_JOIN, id: qz.id, as: 'watch' });
  assert.equal(ctx.last(c, MSG.QZ_ENTER).role, 'watch');
  assert.deepEqual(ctx.last(b, MSG.QZ_LIVE).w, [c.id]);
  assert.equal(qz.phase, 'lobby', 'plateia não começa a corrida');
  // quem chega depois vê a sala no welcome
  const d = ctx.join('Davi');
  assert.equal(ctx.of(d, MSG.WELCOME)[0].qzs[0].id, qz.id);
  // dentro da sala não anda nem interage na praça
  ctx.room.handle(a.id, { t: MSG.MOVE, x: 1000, y: 900 });
  assert.equal(pa.path.length, 0);
  // 2º corredor: contagem automática
  ctx.room.handle(b.id, { t: MSG.QZ_JOIN, id: qz.id, as: 'play' });
  assert.equal(qz.phase, 'count');
  assert.ok(ctx.until(() => qz.phase === 'intro', QZ.COUNT_TIME + 1));
  const intro = ctx.last(c, MSG.QZ_PHASE);
  assert.equal(intro.ph, 'intro');
  assert.ok(intro.cat.label);
  // pergunta: plateia também recebe, mas a resposta certa não vai junto
  ctx.until(() => qz.phase === 'ask', 3);
  const q = ctx.last(c, MSG.QZ_Q);
  assert.ok(q.q && q.opts.length >= 2);
  assert.equal(q.ok, undefined);
  assert.equal(JSON.stringify(q).includes('"a"'), false);
  assert.equal(ctx.of(d, MSG.QZ_Q).length, 0, 'quem está na praça não recebe as perguntas');
  // sair: volta para a porta da Escola e some da lista
  ctx.room.handle(c.id, { t: MSG.QZ_LEAVE });
  assert.equal(ctx.room.players.get(c.id).pose, '');
  assert.equal(ctx.last(c, MSG.QZ_EXIT).reason, 'left');
  assert.deepEqual(ctx.last(d, MSG.QZ_LIVE).w, []);
});

test('rodada: acertou anda 1, errou fica; todo mundo respondeu = revela na hora; resposta só uma vez', () => {
  const ctx = setup();
  const { ps: [a, b], qz } = startRace(ctx);
  const q = qz.q;
  answer(ctx, qz, a, true);
  answer(ctx, qz, a, false); // segunda resposta é ignorada
  assert.equal(qz.racers.get(a.id).ans.i, q.ok);
  assert.equal(ctx.events(b, 'answered')[0].id, a.id, 'os outros veem a mão levantada (não a resposta)');
  answer(ctx, qz, b, false);
  ctx.run(QZ.ALL_IN_GRACE + 0.1);
  assert.equal(qz.phase, 'reveal', 'não esperou o tempo todo');
  const rv = ctx.last(a, MSG.QZ_REVEAL);
  assert.equal(rv.ok, q.ok);
  assert.equal(rv.a, q.opts[q.ok]);
  assert.ok(rv.tip.length > 0);
  const row = (id) => rv.res.find((r) => r[0] === id);
  assert.deepEqual(row(a.id).slice(1, 5), [0, 1, 1, 1]);
  assert.deepEqual(row(b.id).slice(1, 5), [0, 0, 0, 0]);
  assert.equal(rv.fast, a.id);
  // resposta atrasada (pergunta errada) é ignorada
  ctx.until(() => qz.phase === 'ask', 10);
  ctx.room.handle(b.id, { t: MSG.QZ_ANSWER, n: qz.q.n - 1, i: 0 });
  assert.equal(qz.racers.get(b.id).ans, null);
  // tempo esgotado: quem não respondeu não anda
  ctx.until(() => qz.phase === 'reveal', 30);
  assert.equal(qz.racers.get(b.id).pos, 0);
});

test('combo: 2 acertos seguidos com o adversário na frente → ele volta 1 casa; liderando → escudo que bloqueia', () => {
  const ctx = setup();
  const { ps: [a, b], qz } = startRace(ctx);
  const A = qz.racers.get(a.id);
  const B = qz.racers.get(b.id);
  // B lidera (3 × 1). A tem 1 acerto seguido: o próximo acerto fecha o combo
  Object.assign(A, { pos: 1, streak: 1 });
  Object.assign(B, { pos: 3, streak: 0 });
  qz.targets = comboTargets([A, B]); // (o servidor decide os alvos no começo de cada pergunta)
  round(ctx, qz, [[a, true], [b, true]]);
  const rv = ctx.last(a, MSG.QZ_REVEAL);
  assert.deepEqual(rv.combos, [[a.id, 'hit', b.id]]);
  assert.equal(A.pos, 2);
  assert.equal(B.pos, 3, 'B andou 1 e voltou 1');
  assert.equal(B.stats.hits, 1);
  // líder com combo ganha escudo; o próximo ataque quebra o escudo e não tira casa
  Object.assign(A, { pos: 1, streak: 1, shield: 0 });
  Object.assign(B, { pos: 5, streak: 1, shield: 0 });
  ctx.until(() => qz.phase === 'ask', 5);
  qz.targets = comboTargets([A, B]);
  round(ctx, qz, [[a, true], [b, true]]);
  assert.equal(B.shield, QZ.SHIELD_TURNS, 'líder ganhou escudo (vale pelas próximas perguntas)');
  assert.equal(B.pos, 5, 'o ataque de A chega antes do escudo novo (que só vale da próxima em diante)');
  Object.assign(A, { streak: 1 });
  ctx.until(() => qz.phase === 'ask', 5);
  qz.targets = comboTargets([A, B]);
  const before = B.pos;
  round(ctx, qz, [[a, true], [b, false]]);
  assert.equal(B.shield, 0, 'escudo quebrou');
  assert.equal(B.pos, before, 'escudo segurou a casa');
  assert.ok(ctx.last(b, MSG.QZ_REVEAL).combos.some(([by, k]) => by === a.id && k === 'block'));
});

test('escudo do líder vale só para a próxima pergunta (QZ.SHIELD_TURNS) e depois some', () => {
  const ctx = setup();
  const { ps: [a, b], qz } = startRace(ctx);
  const A = qz.racers.get(a.id);
  const B = qz.racers.get(b.id);
  Object.assign(A, { pos: 4, streak: 1 });
  Object.assign(B, { pos: 0, streak: 0 });
  qz.targets = comboTargets([A, B]);
  round(ctx, qz, [[a, true], [b, false]]);
  assert.equal(A.shield, QZ.SHIELD_TURNS);
  for (let i = 0; i < QZ.SHIELD_TURNS; i++) round(ctx, qz, [[a, false], [b, false]]);
  assert.equal(A.shield, 0, 'escudo expirou sem uso');
});

test('combo: ninguém volta abaixo da largada e quem cruzou a chegada está a salvo (vence quem acertou mais rápido)', () => {
  const ctx = setup();
  const { ps: [a, b, c], qz } = startRace(ctx, ['Ana', 'Bia', 'Caio']);
  const [A, B, C] = [a, b, c].map((p) => qz.racers.get(p.id));
  Object.assign(A, { pos: 0, streak: 1 });
  Object.assign(B, { pos: qz.len - 1, streak: 1 });
  Object.assign(C, { pos: qz.len - 1, streak: 0 });
  qz.targets = comboTargets([A, B, C]);
  // C responde primeiro, B depois: os dois cruzam; o ataque de A (em um deles) não desfaz a chegada
  answer(ctx, qz, c, true);
  ctx.step();
  answer(ctx, qz, b, true);
  answer(ctx, qz, a, true);
  ctx.until(() => qz.phase === 'reveal', 5);
  const rv = ctx.last(a, MSG.QZ_REVEAL);
  assert.equal(rv.win, c.id, 'empate na chegada: o mais rápido');
  assert.ok(rv.combos.every(([, k]) => k !== 'hit'));
  ctx.until(() => qz.phase === 'over', 10);
  const end = ctx.last(b, MSG.QZ_END);
  assert.equal(end.winner, c.id);
  assert.equal(end.rank[0][0], c.id);
  // quem está na praça também fica sabendo
  const d = ctx.join('Davi');
  void d;
  assert.ok(ctx.of(a, MSG.QZ_END).length === 1);
  // nova corrida zerada
  ctx.until(() => qz.phase === 'intro', QZ.OVER_TIME + QZ.COUNT_TIME + 2);
  assert.ok([A, B, C].every((r) => r.pos === 0 && r.streak === 0));
  assert.equal(qz.race, 2);
  // largada é piso
  const t = comboTargets([{ id: 1, pos: 0, streak: 1 }, { id: 2, pos: 1, streak: 0 }]);
  assert.deepEqual(t.get(1), { kind: 'hit', to: 2 });
});

test('pergunta de ouro vale 2 casas; tudo ou nada dobra o acerto e o erro volta 1', () => {
  const ctx = setup();
  const { ps: [a, b], qz } = startRace(ctx);
  const A = qz.racers.get(a.id);
  const B = qz.racers.get(b.id);
  for (let i = 0; i < 4; i++) round(ctx, qz, [[a, false], [b, false]]);
  ctx.until(() => qz.phase === 'ask', 5);
  assert.equal(qz.q.n, 5);
  assert.equal(ctx.last(a, MSG.QZ_Q).gold, 1);
  B.cards = ['dobro'];
  ctx.room.handle(b.id, { t: MSG.QZ_CARD, c: 'dobro' });
  assert.ok(ctx.events(a, 'card').some((e) => e.by === b.id && e.c === 'dobro'));
  round(ctx, qz, [[a, true], [b, true]]);
  assert.equal(A.pos, 2, 'ouro');
  assert.equal(B.pos, 4, 'ouro × tudo ou nada');
  ctx.until(() => qz.phase === 'ask', 5);
  B.cards = ['dobro'];
  ctx.room.handle(b.id, { t: MSG.QZ_CARD, c: 'dobro' });
  round(ctx, qz, [[a, false], [b, false]]);
  assert.equal(B.pos, 3, 'errou no tudo ou nada: volta 1');
  assert.deepEqual(B.cards, []);
});

test('cartas: cola some com 2 erradas (nunca a certa), pum mira quem está na frente, escudo bloqueia o pum', () => {
  const ctx = setup();
  const { ps: [a, b, c], qz } = startRace(ctx, ['Ana', 'Bia', 'Caio']);
  const [A, B, C] = [a, b, c].map((p) => qz.racers.get(p.id));
  assert.deepEqual(A.cards, ['cola'], 'todo mundo começa com uma cola');
  ctx.room.handle(a.id, { t: MSG.QZ_CARD, c: 'cola' });
  const cola = ctx.last(a, MSG.QZ_COLA);
  assert.equal(cola.hide.length, qz.q.opts.length > 3 ? 2 : 1);
  assert.ok(!cola.hide.includes(qz.q.ok));
  assert.equal(ctx.of(b, MSG.QZ_COLA).length, 0, 'só quem usou vê quais sumiram');
  assert.deepEqual(A.cards, []);
  ctx.room.handle(a.id, { t: MSG.QZ_ANSWER, n: qz.q.n, i: cola.hide[0] });
  assert.equal(A.ans, null, 'não dá para responder uma opção que sumiu');
  // pum: ninguém na frente → não gasta
  A.cards = ['pum'];
  ctx.room.handle(a.id, { t: MSG.QZ_CARD, c: 'pum' });
  assert.deepEqual(A.cards, ['pum']);
  assert.equal(ctx.last(a, MSG.QZ_EVENT).kind, 'nocard');
  // C está na frente e ainda não respondeu: nuvem agora
  C.pos = 3;
  ctx.room.handle(a.id, { t: MSG.QZ_CARD, c: 'pum' });
  const ev = ctx.events(c, 'card').find((e) => e.c === 'pum');
  assert.deepEqual([ev.by, ev.to, ev.now], [a.id, c.id, 1]);
  // escudo bloqueia
  B.pos = 2;
  C.shield = 2;
  A.cards = ['pum'];
  answer(ctx, qz, b, true);
  A.pos = 2;
  B.pos = 2;
  ctx.room.handle(a.id, { t: MSG.QZ_CARD, c: 'pum' });
  assert.equal(C.shield, 0);
  assert.ok(ctx.events(a, 'card').some((e) => e.c === 'pum' && e.blocked === 1));
  // já respondeu → vale para a próxima pergunta
  A.cards = ['pum'];
  answer(ctx, qz, c, true);
  ctx.room.handle(a.id, { t: MSG.QZ_CARD, c: 'pum' });
  assert.equal(C.pumBy, a.id);
  answer(ctx, qz, a, false);
  const n0 = qz.q.n;
  ctx.until(() => qz.phase === 'ask' && qz.q.n > n0, 10);
  assert.deepEqual(ctx.last(c, MSG.QZ_Q).pum, [[c.id, a.id]]);
});

test('presente: passar pela casa 🎁 dá carta uma vez só (mão cheia não ganha)', () => {
  const ctx = setup();
  const { ps: [a, b], qz } = startRace(ctx);
  const A = qz.racers.get(a.id);
  Object.assign(A, { pos: 2, cards: [], streak: 0 });
  round(ctx, qz, [[a, true], [b, false]]);
  assert.equal(A.pos, 3);
  assert.equal(A.cards.length, 1);
  const gift = ctx.last(b, MSG.QZ_REVEAL).gifts[0];
  assert.deepEqual([gift[0], gift[2]], [a.id, 3]);
  // voltou e passou de novo: não ganha outra
  Object.assign(A, { pos: 2, streak: 0 });
  round(ctx, qz, [[a, true], [b, false]]);
  assert.equal(A.cards.length, 1);
  // mão cheia
  Object.assign(A, { pos: 6, cards: ['cola', 'pum'], streak: 0 });
  round(ctx, qz, [[a, true], [b, false]]);
  assert.deepEqual(ctx.last(a, MSG.QZ_REVEAL).gifts, [[a.id, '', 7]]);
  assert.equal(A.cards.length, 2);
});

test('entrar no meio: começa do zero; depois do corte (líder longe) entra só na próxima corrida', () => {
  const ctx = setup();
  const { ps: [a, b], qz } = startRace(ctx);
  qz.racers.get(a.id).pos = 4;
  const c = ctx.join('Caio');
  ctx.room.handle(c.id, { t: MSG.QZ_JOIN, id: qz.id, as: 'play' });
  const C = qz.racers.get(c.id);
  assert.ok(C, 'entrou correndo');
  assert.equal(C.pos, 0);
  assert.deepEqual(C.cards, QZ.START_CARDS);
  // líder passou do corte
  qz.racers.get(a.id).pos = 10;
  const d = ctx.join('Davi');
  ctx.room.handle(d.id, { t: MSG.QZ_JOIN, id: qz.id, as: 'play' });
  assert.equal(qz.racers.has(d.id), false);
  assert.equal(qz.watchers.get(d.id).want, true);
  assert.equal(ctx.last(d, MSG.QZ_ENTER).role, 'watch');
  // plateia pede para correr (também vira "próxima")
  const e = ctx.join('Eva');
  ctx.room.handle(e.id, { t: MSG.QZ_JOIN, id: qz.id, as: 'watch' });
  ctx.room.handle(e.id, { t: MSG.QZ_JOIN, id: qz.id, as: 'play' });
  assert.equal(qz.watchers.get(e.id).want, true);
  assert.ok(ctx.events(e, 'want').length);
  // a corrida acaba → na próxima os dois correm
  qz.racers.get(a.id).pos = qz.len - 1;
  round(ctx, qz, [[a, true], [b, false], [c, false]]);
  ctx.until(() => qz.phase === 'intro', QZ.OVER_TIME + QZ.COUNT_TIME + 2);
  assert.ok(qz.racers.has(d.id) && qz.racers.has(e.id));
  assert.equal(qz.racers.size, 5);
  void b;
});

test('robôs: treino sozinho, robô responde sozinho, sai quando chega gente com a sala cheia', () => {
  const ctx = setup(Math.random);
  const a = ctx.join('Ana');
  ctx.room.handle(a.id, { t: MSG.QZ_CREATE, mode: 'normal' });
  const qz = ctx.room.qzOf.get(a.id);
  ctx.room.handle(a.id, { t: MSG.QZ_BOT, add: 'hard' });
  const bot = qz.bots()[0];
  assert.ok(bot && bot.id < 0 && bot.nick.startsWith('Robô'));
  assert.equal(qz.phase, 'count', 'com robô a contagem começa');
  ctx.until(() => qz.phase === 'ask', QZ.COUNT_TIME + 3);
  assert.ok(ctx.until(() => bot.ans, QZ.ASK_MAX), 'robô respondeu');
  // robô não pode ser adicionado durante a corrida
  ctx.room.handle(a.id, { t: MSG.QZ_BOT, add: 'easy' });
  assert.equal(qz.bots().length, 1);
  // uma corrida inteira só com robô + Ana parada: Ana vai para a plateia por ausência e a sala volta ao lobby
  assert.ok(ctx.until(() => qz.watchers.has(a.id) || qz.phase === 'over', 300));
  // sala com 1 humano + robôs: quem chega tira um robô do lugar se a sala estiver cheia
  const ctx2 = setup(Math.random);
  const x = ctx2.join('Xu');
  ctx2.room.handle(x.id, { t: MSG.QZ_CREATE });
  const qz2 = ctx2.room.qzOf.get(x.id);
  for (let i = 0; i < 5; i++) ctx2.room.handle(x.id, { t: MSG.QZ_BOT, add: 'easy' });
  assert.equal(qz2.bots().length, QZ.MAX_BOTS, 'limite de robôs');
  const ys = ['Yan', 'Zoe'].map((n) => ctx2.join(n));
  for (const y of ys) ctx2.room.handle(y.id, { t: MSG.QZ_JOIN, id: qz2.id, as: 'play' });
  const w = ctx2.join('Wil');
  ctx2.room.handle(w.id, { t: MSG.QZ_JOIN, id: qz2.id, as: 'play' });
  assert.equal(qz2.racers.size, QZ.MAX_RACERS);
  assert.ok(qz2.racers.has(w.id), 'gente de verdade tem prioridade');
  assert.equal(qz2.bots().length, QZ.MAX_BOTS - 1);
  // todos os humanos saem → a sala acaba (robô não segura sala)
  for (const p of [x, ...ys, w]) ctx2.room.handle(p.id, { t: MSG.QZ_LEAVE });
  assert.equal(ctx2.room.qzs.size, 0);
  assert.equal(ctx2.last(w, MSG.QZ_LIVE).gone, 1);
});

test('isolamento: plateia não responde nem usa carta; quem está na sala não é desafiado e não entra em outro jogo', () => {
  const ctx = setup();
  const { ps: [a, b], qz } = startRace(ctx);
  const c = ctx.join('Caio');
  ctx.room.handle(c.id, { t: MSG.QZ_JOIN, id: qz.id, as: 'watch' });
  ctx.room.handle(c.id, { t: MSG.QZ_ANSWER, n: qz.q.n, i: 0 });
  ctx.room.handle(c.id, { t: MSG.QZ_CARD, c: 'cola' });
  assert.equal(ctx.of(c, MSG.QZ_COLA).length, 0);
  assert.ok(![...qz.racers.values()].some((r) => r.ans));
  // torcida da plateia (com limite)
  ctx.room.handle(c.id, { t: MSG.QZ_CHEER, r: 'go', side: a.id });
  ctx.room.handle(c.id, { t: MSG.QZ_CHEER, r: 'clap' });
  const cheers = ctx.events(a, 'cheer');
  assert.equal(cheers.length, 1);
  assert.deepEqual([cheers[0].by, cheers[0].side], [c.id, a.id]);
  // ocupado para a praça
  const d = ctx.join('Davi');
  ctx.room.handle(d.id, { t: MSG.CHALLENGE, to: a.id, game: 'karate' });
  assert.equal(ctx.last(d, MSG.CH_STATUS).status, 'busy');
  ctx.room.handle(a.id, { t: MSG.QM_CREATE, hard: false });
  assert.equal(ctx.room.qmOf.has(a.id), false, 'não abre queimada estando na Escola');
  ctx.room.handle(a.id, { t: MSG.KT_WATCH, id: 1 });
  assert.equal(ctx.room.watching.has(a.id), false);
  void b;
});

test('convite pelo cartão (game quiz): da praça cria sala para os dois; de dentro da sala chama para ela', () => {
  const ctx = setup();
  const a = ctx.join('Ana');
  const b = ctx.join('Bia');
  const c = ctx.join('Caio');
  ctx.room.handle(a.id, { t: MSG.CHALLENGE, to: b.id, game: 'quiz' });
  const inv = ctx.last(b, MSG.CHALLENGE);
  assert.deepEqual([inv.game, inv.match], ['quiz', 0]);
  ctx.room.handle(b.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: true });
  const qz = ctx.room.qzOf.get(a.id);
  assert.ok(qz && ctx.room.qzOf.get(b.id) === qz);
  assert.equal(qz.racers.size, 2);
  // de dentro: chama o Caio para a mesma sala
  ctx.room.handle(a.id, { t: MSG.CHALLENGE, to: c.id, game: 'quiz' });
  assert.equal(ctx.last(c, MSG.CHALLENGE).match, qz.id);
  ctx.room.handle(c.id, { t: MSG.CHALLENGE_REPLY, from: a.id, accept: true });
  assert.equal(ctx.room.qzOf.get(c.id), qz);
  // quem está numa sala não pode ser convidado
  ctx.room.handle(c.id, { t: MSG.QZ_LEAVE });
  ctx.room.handle(c.id, { t: MSG.CHALLENGE, to: b.id, game: 'quiz' });
  assert.equal(ctx.last(c, MSG.CH_STATUS).status, 'busy');
});

test('saiu no meio: sem gente correndo a corrida volta ao lobby; fechar o jogo tira da sala', () => {
  const ctx = setup();
  const { ps: [a, b], qz } = startRace(ctx);
  ctx.room.removePlayer(b.id);
  assert.equal(qz.racers.has(b.id), false);
  assert.equal(qz.phase, 'ask', 'sozinho continua (treino)');
  answer(ctx, qz, a, true);
  ctx.run(QZ.ALL_IN_GRACE + 0.1);
  assert.equal(qz.phase, 'reveal', 'quem sobrou já respondeu: revela');
  ctx.room.handle(a.id, { t: MSG.QZ_JOIN, id: qz.id, as: 'watch' });
  assert.equal(qz.phase, 'lobby', 'ninguém correndo: lobby');
  ctx.room.removePlayer(a.id);
  assert.equal(ctx.room.qzs.size, 0);
});
