// Compensação de lag na praça. Sem ela o próprio boneco só anda quando o snapshot do
// servidor volta: cada clique espera ping + atraso de interpolação (~110 ms) + até um
// intervalo de snapshot. Com o ping alto **constante** (não um pico isolado), o boneco
// passa a ser previsto: anda na hora pelo mesmo A* e o mesmo passo do servidor
// (shared/pathfinding.js) e converge para a posição do servidor quando para.
// Imports relativos (e não '/shared/...') para os testes do Node importarem este arquivo.

import { PathGrid, followPath } from '../../shared/pathfinding.js';
import { PLAYER_SPEED } from '../../shared/constants.js';

export const LAG = {
  ON_MS: 100, // mediana dos pings ≥ isso → liga
  OFF_MS: 70, // mediana < isso → desliga (folga entre os dois: não fica liga/desliga)
  SAMPLES: 5, // pings na janela (1 a cada 2 s → ~10 s de ping alto para ligar)
  SNAP_PX: 220, // parado e longe disso do servidor → teleporta (sentou no banco do outro lado etc.)
  CONVERGE: 6, // parado: velocidade da convergência para o servidor (1/s)
};

// Decide se o ping está alto "constantemente": mediana de uma janela, com histerese.
export class LagMonitor {
  constructor({ on = LAG.ON_MS, off = LAG.OFF_MS, samples = LAG.SAMPLES, force = null } = {}) {
    this.on = on;
    this.off = off;
    this.samples = samples;
    this.force = force; // true/false fixa o modo (?comp=1 / ?comp=0)
    this.rtts = [];
    this.active = force === true;
  }

  median() {
    if (!this.rtts.length) return 0;
    const s = [...this.rtts].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // Retorna true quando o modo muda.
  add(rtt) {
    this.rtts.push(rtt);
    if (this.rtts.length > this.samples) this.rtts.shift();
    if (this.force !== null) return false;
    const was = this.active;
    const med = this.median();
    if (!this.active && this.rtts.length >= this.samples && med >= this.on) this.active = true;
    else if (this.active && med < this.off) this.active = false;
    return this.active !== was;
  }
}

// Posição prevista do próprio boneco na praça.
export class SelfPredictor {
  constructor() {
    this.grid = null; // criada só na primeira vez que precisar (custa alguns ms)
    this.x = 0;
    this.y = 0;
    this.dir = 1;
    this.path = [];
    this.synced = false;
  }

  reset(s) {
    this.x = s.x;
    this.y = s.y;
    this.dir = s.dir ?? this.dir;
    this.path = [];
    this.synced = true;
  }

  // fromSeat: o servidor desce o boneco 26 px à frente do banco antes de andar (Room.leaveSeat)
  walkTo(x, y, fromSeat = false) {
    this.grid ??= new PathGrid();
    if (fromSeat && !this.path.length) this.y += 26;
    this.path = this.grid.findPath(this.x, this.y, x, y);
  }

  stop() {
    this.path = [];
  }

  /**
   * @param server último snapshot do servidor para mim ({x, y, moving})
   * @param rtt    ping atual (ms)
   */
  step(dt, server, rtt = 0) {
    const gap = Math.hypot(server.x - this.x, server.y - this.y);
    if (this.path.length) {
      const ox = this.x;
      followPath(this, this.path, PLAYER_SPEED * dt);
      if (Math.abs(this.x - ox) > 0.01) this.dir = this.x > ox ? 1 : -1;
      // andando, o servidor fica ~1 ping "atrás"; bem mais longe que isso = previsão errada
      if (gap > PLAYER_SPEED * (rtt / 1000 + 0.6) + 80) this.reset(server);
      return { x: this.x, y: this.y, dir: this.dir, moving: this.path.length > 0 };
    }
    if (gap > LAG.SNAP_PX) this.reset(server);
    else if (!server.moving) {
      // parado nos dois lados: encosta na posição do servidor
      const k = 1 - Math.exp(-dt * LAG.CONVERGE);
      this.x += (server.x - this.x) * k;
      this.y += (server.y - this.y) * k;
      if (gap > 1) this.dir = server.dir ?? this.dir;
    }
    // servidor ainda andando e eu parado: ele está alcançando a minha previsão, espero
    return { x: this.x, y: this.y, dir: this.dir, moving: false };
  }
}
