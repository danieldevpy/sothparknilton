// A* em grade + suavização por linha de visão.
// A grade é calculada uma vez a partir de isWalkable (mapa estático).

import { MAP } from './map.js';
import { isWalkable, lineWalkable } from './geometry.js';

export const CELL = 20;

export class PathGrid {
  constructor(map = MAP, cell = CELL) {
    this.map = map;
    this.cell = cell;
    this.cols = Math.ceil(map.width / cell);
    this.rows = Math.ceil(map.height / cell);
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const { x, y } = this.center(c, r);
        this.blocked[r * this.cols + c] = isWalkable(x, y) ? 0 : 1;
      }
    }
  }

  center(c, r) {
    return { x: c * this.cell + this.cell / 2, y: r * this.cell + this.cell / 2 };
  }

  cellOf(x, y) {
    return {
      c: Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cell))),
      r: Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cell))),
    };
  }

  isOpen(c, r) {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows && !this.blocked[r * this.cols + c];
  }

  // Célula livre mais próxima (busca em anéis), útil quando o clique cai num obstáculo.
  nearestOpen(x, y, maxRing = 40) {
    const { c, r } = this.cellOf(x, y);
    if (this.isOpen(c, r)) return { c, r };
    let best = null;
    let bestD = Infinity;
    for (let ring = 1; ring <= maxRing; ring++) {
      for (let dc = -ring; dc <= ring; dc++) {
        for (let dr = -ring; dr <= ring; dr++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
          if (!this.isOpen(c + dc, r + dr)) continue;
          const p = this.center(c + dc, r + dr);
          const d = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = { c: c + dc, r: r + dr };
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  // Retorna lista de waypoints [{x,y}] (sem incluir a origem) ou [] se impossível.
  findPath(sx, sy, tx, ty, maxNodes = 8000) {
    const goalCell = this.nearestOpen(tx, ty);
    if (!goalCell) return [];
    // se o alvo original é andável, usa ele exato; senão o centro da célula livre
    const goal = isWalkable(tx, ty) ? { x: tx, y: ty } : this.center(goalCell.c, goalCell.r);
    if (lineWalkable(sx, sy, goal.x, goal.y)) return [goal];

    const start = this.nearestOpen(sx, sy);
    if (!start) return [];
    const cols = this.cols;
    const startI = start.r * cols + start.c;
    const goalI = goalCell.r * cols + goalCell.c;

    const g = new Map([[startI, 0]]);
    const came = new Map();
    const open = new MinHeap();
    const h = (i) => {
      const dc = Math.abs((i % cols) - goalCell.c);
      const dr = Math.abs(Math.floor(i / cols) - goalCell.r);
      return Math.max(dc, dr) + 0.414 * Math.min(dc, dr);
    };
    open.push(startI, h(startI));
    const closed = new Set();
    let expanded = 0;

    while (open.size) {
      const cur = open.pop();
      if (cur === goalI) break;
      if (closed.has(cur)) continue;
      closed.add(cur);
      if (++expanded > maxNodes) return [];
      const cc = cur % cols;
      const cr = Math.floor(cur / cols);
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (!dc && !dr) continue;
          const nc = cc + dc;
          const nr = cr + dr;
          if (!this.isOpen(nc, nr)) continue;
          // sem cortar quina em diagonal
          if (dc && dr && (!this.isOpen(cc + dc, cr) || !this.isOpen(cc, cr + dr))) continue;
          const ni = nr * cols + nc;
          const ng = g.get(cur) + (dc && dr ? 1.414 : 1);
          if (ng < (g.get(ni) ?? Infinity)) {
            g.set(ni, ng);
            came.set(ni, cur);
            open.push(ni, ng + h(ni));
          }
        }
      }
    }
    if (!came.has(goalI) && startI !== goalI) return [];

    const cells = [];
    for (let i = goalI; i !== undefined && i !== startI; i = came.get(i)) cells.push(i);
    cells.reverse();
    if (!cells.length) return [goal];
    const raw = cells.map((i) => this.center(i % cols, Math.floor(i / cols)));
    raw[raw.length - 1] = goal;
    return smooth(sx, sy, raw);
  }
}

// String-pulling: remove waypoints intermediários quando há linha de visão.
function smooth(sx, sy, pts) {
  const out = [];
  let ax = sx;
  let ay = sy;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !lineWalkable(ax, ay, pts[j].x, pts[j].y)) j--;
    out.push(pts[j]);
    ax = pts[j].x;
    ay = pts[j].y;
    i = j + 1;
  }
  return out;
}

class MinHeap {
  constructor() {
    this.k = [];
    this.p = [];
  }
  get size() {
    return this.k.length;
  }
  push(key, pri) {
    const k = this.k;
    const p = this.p;
    k.push(key);
    p.push(pri);
    let i = k.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (p[par] <= p[i]) break;
      [k[i], k[par]] = [k[par], k[i]];
      [p[i], p[par]] = [p[par], p[i]];
      i = par;
    }
  }
  pop() {
    const k = this.k;
    const p = this.p;
    const top = k[0];
    const lk = k.pop();
    const lp = p.pop();
    if (k.length) {
      k[0] = lk;
      p[0] = lp;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && p[l] < p[m]) m = l;
        if (r < k.length && p[r] < p[m]) m = r;
        if (m === i) break;
        [k[i], k[m]] = [k[m], k[i]];
        [p[i], p[m]] = [p[m], p[i]];
        i = m;
      }
    }
    return top;
  }
}
