// Partida de Gol a Gol (1x1) no campinho da Área de Sports.
// Fases: countdown → aim (chutador mira) → flight (bola rolando) → result → aim... → fim.
// Primeiro gol vence. Desistência (sair) = W.O.

import { MSG } from '../../shared/constants.js';
import {
  GG, ggGeometry, otherSide, attackDir, goalLineX, spotX, keeperX, clamp, launchBall, advanceBall,
} from '../../shared/golagol.js';

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export class GolAGol {
  constructor(room, a, b) {
    this.room = room;
    this.geo = ggGeometry(room.map);
    const mid = this.geo.midY;
    this.side = new Map([[a.id, 'left'], [b.id, 'right']]);
    this.ids = { left: a.id, right: b.id };
    this.nicks = { [a.id]: a.nick, [b.id]: b.nick };
    this.keepers = { left: newKeeper(mid), right: newKeeper(mid) };
    this.shooter = room.random() < 0.5 ? a.id : b.id;
    this.phase = 'countdown';
    this.timer = GG.COUNTDOWN;
    this.turn = 0;
    this.tired = 1;
    this.spot = { y: mid, ty: mid };
    this.charging = false;
    this.ball = null;
    this.kickT = 0;
    this.flightT = 0;
    this.parryCooldown = 0;
    this.winner = null;
    this.endReason = null;
    this.over = false;

    this.placeAvatars();
    room.broadcast({
      t: MSG.GG_START,
      left: { id: a.id, nick: a.nick },
      right: { id: b.id, nick: b.nick },
      first: this.shooter,
    });
  }

  has(id) {
    return this.side.has(id);
  }

  get shooterSide() {
    return this.side.get(this.shooter);
  }

  get keeperSide() {
    return otherSide(this.shooterSide);
  }

  get keeperId() {
    return this.ids[this.keeperSide];
  }

  other(id) {
    return this.ids[otherSide(this.side.get(id))];
  }

  // ---------- entrada ----------

  handle(p, msg) {
    if (this.over) return;
    if (msg.t === MSG.GG_SHOOT) {
      this.shoot(p, msg);
      return;
    }
    if (msg.t !== MSG.GG_INPUT) return;
    const mid = this.geo.midY;
    if (p.id === this.shooter && this.phase === 'aim') {
      if (isNum(msg.sy)) this.spot.ty = clamp(msg.sy, mid - GG.SPOT_RANGE, mid + GG.SPOT_RANGE);
      if (typeof msg.charging === 'boolean') this.charging = msg.charging;
    } else if (p.id === this.keeperId && this.phase !== 'result') {
      const k = this.keepers[this.keeperSide];
      if (isNum(msg.ky)) k.ty = clamp(msg.ky, mid - GG.KEEPER_RANGE, mid + GG.KEEPER_RANGE);
      if ((msg.dive === 1 || msg.dive === -1) && !k.dive && this.phase !== 'countdown') {
        k.dive = msg.dive;
        k.diveT = 0;
      }
    }
  }

  shoot(p, msg) {
    if (p.id !== this.shooter || this.phase !== 'aim') return;
    if (!isNum(msg.angle) || !isNum(msg.power) || !isNum(msg.curve)) return;
    const side = this.shooterSide;
    const dir = attackDir(side);
    // restringe o ângulo a um cone voltado para o gol adversário
    const base = dir > 0 ? 0 : Math.PI;
    const maxA = Math.acos(GG.MIN_SHOT_COS);
    const delta = clamp(Math.atan2(Math.sin(msg.angle - base), Math.cos(msg.angle - base)), -maxA, maxA);
    const power = clamp(msg.power, 0, 1);
    const curve = clamp(msg.curve, -1, 1);
    this.ball = launchBall(spotX(side, this.room.map), this.spot.y, base + delta, power, curve);
    this.phase = 'flight';
    this.flightT = 0;
    this.kickT = 0.4;
    this.charging = false;
    this.parryCooldown = 0;
    this.event('kick', { id: p.id, power: r2(power), curve: r2(curve) });
  }

  // ---------- simulação ----------

  tick(dt) {
    if (this.over) return;
    this.updateKeeper(dt);
    this.kickT = Math.max(0, this.kickT - dt);
    switch (this.phase) {
      case 'countdown':
        this.timer -= dt;
        if (this.timer <= 0) this.startAim();
        break;
      case 'aim': {
        this.timer -= dt;
        const step = GG.SHOOTER_SPEED * dt;
        this.spot.y += clamp(this.spot.ty - this.spot.y, -step, step);
        if (this.timer <= 0) this.endTurn('timeout');
        break;
      }
      case 'flight':
        this.stepFlight(dt);
        break;
      case 'result':
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.winner) {
            this.finish(this.winner, this.endReason);
            return;
          }
          this.shooter = this.keeperId;
          this.startAim();
        }
        break;
      default:
        break;
    }
    this.placeAvatars();
    this.room.broadcast(this.state());
  }

  startAim() {
    const mid = this.geo.midY;
    this.turn++;
    this.phase = 'aim';
    this.timer = GG.AIM_TIME;
    this.ball = null;
    this.spot.y = this.spot.ty = mid;
    this.charging = false;
    for (const k of Object.values(this.keepers)) Object.assign(k, newKeeper(mid));
    if (this.turn > GG.TIRED_AFTER && (this.turn - GG.TIRED_AFTER - 1) % GG.TIRED_EVERY === 0) {
      this.tired = Math.max(GG.TIRED_MIN, this.tired * GG.TIRED_FACTOR);
      this.event('tired', { tired: r2(this.tired) });
    }
    this.event('turn', { shooter: this.shooter, turn: this.turn });
  }

  updateKeeper(dt) {
    const k = this.keepers[this.keeperSide];
    const mid = this.geo.midY;
    if (k.dive) {
      k.diveT += dt;
      if (k.diveT <= GG.DIVE_TIME) k.y += k.dive * (GG.DIVE_DIST / GG.DIVE_TIME) * dt;
      else if (k.diveT > GG.DIVE_TIME + GG.DIVE_RECOVER) {
        k.dive = 0;
        k.diveT = 0;
      }
      const lim = GG.KEEPER_RANGE + GG.DIVE_DIST * 0.6;
      k.y = clamp(k.y, mid - lim, mid + lim);
    } else {
      const step = GG.KEEPER_SPEED * this.tired * dt;
      k.y += clamp(k.ty - k.y, -step, step);
    }
  }

  stepFlight(dt) {
    const b = this.ball;
    this.flightT += dt;
    this.parryCooldown -= dt;
    const n = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 6)); // sub-passos: sem "atravessar" o goleiro
    for (let i = 0; i < n; i++) {
      advanceBall(b, dt / n);
      if (this.collide()) return;
    }
    if (Math.hypot(b.vx, b.vy) < GG.STOP_SPEED || this.flightT > GG.FLIGHT_MAX) this.endTurn(b.slow ? 'dead' : 'weak');
  }

  // true se a jogada terminou
  collide() {
    const b = this.ball;
    const { f, midY, mouth } = this.geo;
    const R = GG.BALL_R;
    const map = this.room.map;

    // goleiro em ação
    const ks = this.keeperSide;
    const k = this.keepers[ks];
    const kx = keeperX(ks, map);
    if (this.parryCooldown <= 0 && b.z < 40 && Math.abs(b.x - kx) < GG.KEEPER_HALF_W + R) {
      let top = k.y - GG.KEEPER_REACH;
      let bot = k.y + GG.KEEPER_REACH;
      if (k.dive < 0) top -= GG.DIVE_EXTRA;
      if (k.dive > 0) bot += GG.DIVE_EXTRA;
      if (b.y + R > top && b.y - R < bot) {
        if (Math.hypot(b.vx, b.vy) < GG.CATCH_SPEED) {
          b.vx = b.vy = 0;
          this.endTurn('save', { by: this.keeperId });
          return true;
        }
        // chute forte demais: espalma e a bola continua viva (pode até virar gol contra!)
        b.vx = Math.abs(b.vx) * 0.45 * attackDir(ks);
        b.vy = (b.y - k.y) * 6 + (this.room.random() - 0.5) * 220 + b.vy * 0.3;
        b.curve = 0;
        b.lofted = false;
        b.slow = true;
        b.z = 0;
        this.parryCooldown = 0.3;
        this.event('parry', { by: this.keeperId, x: Math.round(b.x), y: Math.round(b.y) });
      }
    }

    // laterais do campo
    if (b.y < f.y + R) { b.y = f.y + R; b.vy = Math.abs(b.vy) * 0.75; }
    if (b.y > f.y + f.h - R) { b.y = f.y + f.h - R; b.vy = -Math.abs(b.vy) * 0.75; }

    // linhas de fundo
    for (const side of ['left', 'right']) {
      const gx = goalLineX(side, map);
      if (side === 'left' ? b.x >= gx : b.x <= gx) continue;
      const off = Math.abs(b.y - midY);
      if (b.lofted && b.z > 45) {
        this.endTurn('over');
        return true;
      }
      if (off < mouth - GG.POST_W) {
        const scorer = this.ids[otherSide(side)];
        this.winner = scorer;
        this.endReason = scorer === this.shooter ? 'goal' : 'own';
        this.endTurn(this.endReason, { by: scorer, side });
        return true;
      }
      if (off < mouth + GG.POST_W) {
        b.x = gx + attackDir(side) * R;
        b.vx = -b.vx * 0.6;
        b.vy += (b.y < midY ? -1 : 1) * 90;
        b.curve = 0;
        this.event('post', { x: Math.round(gx), y: Math.round(b.y) });
        continue;
      }
      this.endTurn('out');
      return true;
    }
    return false;
  }

  endTurn(kind, extra = {}) {
    this.phase = 'result';
    this.timer = GG.RESULT_TIME;
    this.charging = false;
    const b = this.ball;
    this.event(kind, { shooter: this.shooter, x: b ? Math.round(b.x) : null, y: b ? Math.round(b.y) : null, ...extra });
  }

  finish(winner, reason) {
    if (this.over) return;
    this.over = true;
    const loser = this.other(winner);
    this.room.broadcast({
      t: MSG.GG_END,
      winner,
      loser,
      winnerNick: this.nicks[winner],
      loserNick: this.nicks[loser],
      reason,
      turns: this.turn,
    });
    this.room.endMatch(this);
  }

  forfeit(id) {
    this.finish(this.other(id), 'wo');
  }

  // ---------- estado ----------

  placeAvatars() {
    const map = this.room.map;
    for (const [id, side] of this.side) {
      const p = this.room.players.get(id);
      if (!p) continue;
      const dir = attackDir(side);
      p.dir = dir;
      p.moving = false;
      p.path = [];
      if (id === this.shooter) {
        p.x = spotX(side, map) - dir * 24;
        p.y = this.spot.y + 2;
        p.pose = this.kickT > 0 ? 'kick' : 'shooter';
        p.moving = this.phase === 'aim' && Math.abs(this.spot.ty - this.spot.y) > 1;
      } else {
        const k = this.keepers[side];
        p.x = keeperX(side, map);
        p.y = k.y;
        if (!k.dive) p.pose = 'keeper';
        else if (k.diveT <= GG.DIVE_TIME) p.pose = k.dive < 0 ? 'diveU' : 'diveD';
        else p.pose = k.dive < 0 ? 'lieU' : 'lieD';
      }
    }
  }

  publicInfo() {
    return {
      left: { id: this.ids.left, nick: this.nicks[this.ids.left] },
      right: { id: this.ids.right, nick: this.nicks[this.ids.right] },
      first: this.shooter,
    };
  }

  state() {
    const b = this.ball;
    const k = (s) => [Math.round(this.keepers[s].y), this.keepers[s].dive, r2(this.keepers[s].diveT)];
    return {
      t: MSG.GG_STATE,
      ph: this.phase,
      tm: r1(Math.max(0, this.timer)),
      turn: this.turn,
      sh: this.shooter,
      ch: this.charging ? 1 : 0,
      tired: r2(this.tired),
      sy: Math.round(this.spot.y),
      b: b ? [Math.round(b.x), Math.round(b.y), Math.round(b.z)] : null,
      k: { left: k('left'), right: k('right') },
    };
  }

  event(kind, data = {}) {
    this.room.broadcast({ t: MSG.GG_EVENT, kind, ...data });
  }
}

function newKeeper(mid) {
  return { y: mid, ty: mid, dive: 0, diveT: 0 };
}
