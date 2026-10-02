// Colisão e "andabilidade" do mapa. Usado pelo servidor (autoritativo)
// e pelo cliente (para decidir se um clique é no lago, por exemplo).

import { MAP, buildColliders } from './map.js';
import { PLAYER_RADIUS } from './constants.js';

const COLLIDERS = buildColliders(MAP);

export function inRect(x, y, r, pad = 0) {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
}

export function inLake(x, y, pad = 0, map = MAP) {
  const l = map.lake;
  const dx = (x - l.x) / (l.rx + pad);
  const dy = (y - l.y) / (l.ry + pad);
  return dx * dx + dy * dy <= 1;
}

export function onDock(x, y, map = MAP) {
  return inRect(x, y, map.dock);
}

export function isWalkable(x, y, radius = PLAYER_RADIUS, map = MAP, colliders = COLLIDERS) {
  if (x < map.margin || y < map.walkTop || x > map.width - map.margin || y > map.height - map.margin) {
    return false;
  }
  if (inLake(x, y, radius, map) && !onDock(x, y, map)) return false;
  for (const c of colliders) {
    if (c.kind === 'circle') {
      const dx = x - c.x;
      const dy = y - c.y;
      const rr = c.r + radius;
      if (dx * dx + dy * dy < rr * rr) return false;
    } else if (inRect(x, y, c, radius)) {
      return false;
    }
  }
  return true;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Linha reta livre entre dois pontos (amostragem a cada `step` px).
export function lineWalkable(ax, ay, bx, by, step = 8) {
  const d = dist(ax, ay, bx, by);
  const n = Math.max(1, Math.ceil(d / step));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!isWalkable(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}
