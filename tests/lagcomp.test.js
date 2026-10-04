import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LagMonitor, SelfPredictor, LAG } from '../client/js/lagcomp.js';
import { Room } from '../server/Room.js';
import { MAP } from '../shared/map.js';
import { MSG, PLAYER_SPEED } from '../shared/constants.js';

test('LagMonitor: pico isolado não liga; ping alto constante liga', () => {
  const m = new LagMonitor();
  for (const r of [30, 30, 400, 30, 30, 30]) assert.equal(m.add(r), false);
  assert.equal(m.active, false);
  let changed = false;
  for (let i = 0; i < LAG.SAMPLES; i++) changed = m.add(180) || changed;
  assert.ok(changed);
  assert.equal(m.active, true);
});

test('LagMonitor: histerese entre OFF e ON, desliga quando o ping normaliza', () => {
  const m = new LagMonitor();
  for (let i = 0; i < LAG.SAMPLES; i++) m.add(200);
  assert.equal(m.active, true);
  for (let i = 0; i < LAG.SAMPLES; i++) m.add(85); // entre OFF (70) e ON (100): continua ligado
  assert.equal(m.active, true);
  for (let i = 0; i < 2; i++) m.add(30);
  assert.equal(m.active, true); // ainda não é a maioria da janela
  assert.equal(m.add(30), true);
  assert.equal(m.active, false);
});

test('LagMonitor: ?comp=1 / ?comp=0 fixa o modo', () => {
  const on = new LagMonitor({ force: true });
  const off = new LagMonitor({ force: false });
  for (let i = 0; i < 10; i++) { on.add(10); off.add(500); }
  assert.equal(on.active, true);
  assert.equal(off.active, false);
});

test('SelfPredictor anda igual ao servidor (mesmo A* e mesmo passo)', () => {
  const room = new Room({ now: () => 0, random: () => 0.5 });
  const { player } = room.addPlayer({ nick: 'Ana' }, () => {});
  const target = { x: MAP.fountain.interact.x + 160, y: MAP.fountain.interact.y + 120 };
  const pred = new SelfPredictor();
  pred.reset(player);
  const start = { x: player.x, y: player.y };
  room.handle(player.id, { t: MSG.MOVE, ...target });
  pred.walkTo(target.x, target.y);
  for (let i = 0; i < 30 * 8; i++) {
    room.tick(1 / 30);
    pred.step(1 / 30, player, 0);
    assert.ok(Math.hypot(pred.x - player.x, pred.y - player.y) < 0.01, `divergiu no tick ${i}`);
  }
  assert.ok(!player.moving);
  assert.ok(Math.hypot(player.x - start.x, player.y - start.y) > 150, 'o player precisa ter andado');
});

test('SelfPredictor: parado converge para o servidor; espera o servidor alcançar; longe demais teleporta', () => {
  const pred = new SelfPredictor();
  pred.reset({ x: 1000, y: 1000 });
  // servidor parou 30 px ao lado (ex.: assento do banco): encosta suave
  for (let i = 0; i < 60; i++) pred.step(1 / 60, { x: 1030, y: 1000, moving: 0 });
  assert.ok(Math.abs(pred.x - 1030) < 1);
  // servidor ainda andando atrás de mim: não puxa para trás
  pred.step(1 / 60, { x: 990, y: 1000, moving: 1 });
  assert.ok(Math.abs(pred.x - 1030) < 1);
  // muito longe (entrou num minigame, sentou do outro lado...): teleporta
  pred.step(1 / 60, { x: 1600, y: 1000, moving: 0 });
  assert.equal(pred.x, 1600);
});

test('SelfPredictor: andando, previsão muito à frente do servidor é descartada', () => {
  const pred = new SelfPredictor();
  pred.reset({ x: 1000, y: 1000 });
  pred.walkTo(1300, 1000);
  pred.step(1 / 30, { x: 1000, y: 1000, moving: 0 }, 100);
  assert.ok(pred.path.length > 0); // 1 ping atrás é normal
  const far = PLAYER_SPEED * (0.1 + 0.6) + 120;
  pred.step(1 / 30, { x: 1000 - far, y: 1000, moving: 0 }, 100);
  assert.equal(pred.path.length, 0);
  assert.equal(pred.x, 1000 - far);
});
