import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAP } from '../shared/map.js';
import { isWalkable, inLake, lineWalkable } from '../shared/geometry.js';
import { PathGrid } from '../shared/pathfinding.js';
import { sanitizeNick, sanitizeChat, sanitizeLook } from '../shared/validation.js';
import { PALETTE, CHAT_MAX_LEN } from '../shared/constants.js';

test('spawn é andável e o centro do lago não é', () => {
  assert.ok(isWalkable(MAP.spawn.x, MAP.spawn.y));
  assert.ok(!isWalkable(MAP.lake.x, MAP.lake.y));
  assert.ok(inLake(MAP.lake.x, MAP.lake.y));
});

test('píer é andável mesmo dentro do lago', () => {
  const d = MAP.dock;
  const x = d.x + 20;
  const y = d.y + d.h / 2;
  assert.ok(inLake(x, y));
  assert.ok(isWalkable(x, y));
});

test('fonte e faixa do topo bloqueiam', () => {
  assert.ok(!isWalkable(MAP.fountain.x, MAP.fountain.y));
  assert.ok(!isWalkable(1000, MAP.walkTop - 10));
});

test('pathfinding contorna o lago e todos os trechos são livres', () => {
  const grid = new PathGrid();
  const from = { x: 120, y: 900 };
  const to = { x: 150, y: 340 };
  assert.ok(!lineWalkable(from.x, from.y, to.x, to.y), 'linha reta deveria cruzar o lago');
  const path = grid.findPath(from.x, from.y, to.x, to.y);
  assert.ok(path.length > 0);
  let [px, py] = [from.x, from.y];
  for (const p of path) {
    assert.ok(lineWalkable(px, py, p.x, p.y), `trecho bloqueado até ${p.x},${p.y}`);
    [px, py] = [p.x, p.y];
  }
  const last = path.at(-1);
  assert.ok(Math.hypot(last.x - to.x, last.y - to.y) < 1);
});

test('clique dentro do lago leva até a margem', () => {
  const grid = new PathGrid();
  const path = grid.findPath(MAP.spawn.x, MAP.spawn.y, MAP.lake.x, MAP.lake.y);
  const last = path.at(-1);
  assert.ok(isWalkable(last.x, last.y));
  assert.ok(Math.hypot(last.x - MAP.lake.x, last.y - MAP.lake.y) < 320);
});

test('sanitizeNick', () => {
  assert.equal(sanitizeNick('  João  '), 'João');
  assert.equal(sanitizeNick('a'), null);
  assert.equal(sanitizeNick('x'.repeat(17)), null);
  assert.equal(sanitizeNick('<script>'), null);
  assert.equal(sanitizeNick(42), null);
});

test('sanitizeChat remove controle e corta tamanho', () => {
  assert.equal(sanitizeChat('  oi\n\u0007 mundo  '), 'oi mundo');
  assert.equal(sanitizeChat('   '), null);
  assert.equal(sanitizeChat('a'.repeat(500)).length, CHAT_MAX_LEN);
});

test('sanitizeLook só aceita cores da paleta', () => {
  const l = sanitizeLook({ hat: '#000001', shirt: PALETTE.shirts[2] });
  assert.equal(l.hat, PALETTE.hats[0]);
  assert.equal(l.shirt, PALETTE.shirts[2]);
  assert.equal(l.skin, PALETTE.skins[0]);
});
