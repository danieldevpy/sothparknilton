// Partida de Queimada numa quadra do Ginásio — várias ao mesmo tempo (room.qms).
//
// Entrada flexível (fila compartilhada): quem entra numa partida já existente espera na FILA;
// quando alguém é queimado, o próximo da fila entra no lugar dele (mesmo time). 1v1 com 2–3
// pessoas, 2v2 com 4+, o resto na fila. Cada rodada termina quando um time fica sem ninguém na
// quadra; quem foi queimado vai para o CEMITÉRIO atrás do adversário e pode voltar acertando alguém.
// Pontuação Híbrida (ver QM em shared/queimada.js): acerto, pegada, esquiva no último segundo,
// "tabela" e último de pé. Primeiro a chegar em QM.TARGET vence; a quadra recomeça sozinha.
//
// Fases: lobby (treino livre, 1 pessoa) → count (3 s) → intro → play → end → intro... → over → count.
// Mesma interface dos outros minigames: has/handle/tick/remove/publicInfo.

import { MSG } from '../../shared/constants.js';
import {
  QM, LEVELS, ACTIONS, clamp, clampPlayer, walkStep, zoneX, throwVelocity, stepBall, catchOk,
  startSpot, ballSpots,
} from '../../shared/queimada.js';

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const BALL_ST = { loose: 0, live: 1, held: 2, freeze: 3 };
const FREE = new Set(['idle', 'walk']);
const ACT_PHASES = new Set(['lobby', 'count', 'play']);

export class QueimadaMatch {
  constructor(room, id = 1, hard = false) {
    this.room = room;
    this.id = id;
    this.hard = !!hard;
    this.level = LEVELS[this.hard ? 'hard' : 'easy'];
    this.members = new Map(); // pid -> { id, nick, team, pts, hits, catches, dodges }
    this.line = []; // ordem de rotação (fila) — quem esperou mais joga primeiro
    this.court = new Map(); // pid -> boneco na quadra ou no cemitério
    this.balls = [];
    this.entering = []; // próximos da fila entrando: [{ pid, team, at }]
    this.outOrder = []; // ordem de queimados da rodada (rotação da próxima)
    this.phase = 'lobby';
    this.timer = 0;
    this.round = 0;
    this.per = 1; // jogadores por time nesta rodada
    this.clock = 0;
    this.lobbyCourt();
  }

  has(id) {
    return this.members.has(id);
  }

  size() {
    return this.members.size;
  }

  full() {
    return this.members.size >= QM.MAX_MEMBERS;
  }

  // ---------- entrar / sair ----------

  // null = entrou; senão o motivo da recusa
  add(p) {
    if (this.members.has(p.id)) return null;
    if (this.full()) return 'full';
    this.members.set(p.id, { id: p.id, nick: p.nick, team: null, pts: 0, hits: 0, catches: 0, dodges: 0 });
    this.line.push(p.id);
    // no treino livre todo mundo já entra na quadra
    if (this.phase === 'lobby' || this.phase === 'count') this.placePractice(p.id);
    this.room.sendTo(p, { t: MSG.QM_ENTER, ...this.publicInfo(), target: QM.TARGET });
    this.event('join', { id: p.id, nick: p.nick });
    if (this.phase === 'lobby' && this.members.size >= 2) this.setPhase('count', QM.LOBBY_COUNT);
    this.live();
    return null;
  }

  // reason: left | full | gone | busy (avisa) · quiet | switch (sem aviso)
  remove(id, reason = 'left') {
    const m = this.members.get(id);
    if (!m) return;
    const pl = this.court.get(id);
    if (pl) {
      this.dropBall(pl);
      // sair no meio da rodada conta como queimado (sem ponto para ninguém): entra o próximo
      if (this.phase === 'play' && !pl.cem && pl.st !== 'hit') this.scheduleEntry(pl.team);
      this.court.delete(id);
    }
    this.entering = this.entering.filter((e) => e.pid !== id);
    this.members.delete(id);
    this.line = this.line.filter((x) => x !== id);
    const p = this.room.players.get(id);
    if (p && reason !== 'quiet' && reason !== 'switch') this.room.sendTo(p, { t: MSG.QM_EXIT, id: this.id, reason });
    if (!this.members.size) {
      this.room.endQm(this);
      return;
    }
    this.event('leave', { id, nick: m.nick });
    if (this.members.size < 2 && this.phase !== 'lobby') this.toLobby();
    else if (this.phase === 'play') this.checkRoundEnd();
    this.live();
  }

  // ---------- entrada do cliente ----------

  handle(p, msg) {
    const pl = this.court.get(p.id);
    if (!pl) return; // quem está na fila só assiste (e conversa)
    if (msg.t === MSG.QM_INPUT) {
      if (isNum(msg.mx)) pl.mx = clamp(msg.mx, -1, 1);
      if (isNum(msg.my)) pl.my = clamp(msg.my, -1, 1);
      return;
    }
    if (msg.t !== MSG.QM_ACT || !ACTIONS.includes(msg.a) || !ACT_PHASES.has(this.phase)) return;
    if (msg.a === 'throw') {
      if (isNum(msg.x) && isNum(msg.y)) this.doThrow(pl, msg.x, msg.y);
    } else if (msg.a === 'grab') {
      this.doGrab(pl);
    } else if (msg.a === 'dodge') {
      this.doDodge(pl, isNum(msg.dx) ? clamp(msg.dx, -1, 1) : 0, isNum(msg.dy) ? clamp(msg.dy, -1, 1) : 0);
    }
  }

  doThrow(pl, tx, ty) {
    if (pl.hold < 0 || !(FREE.has(pl.st) || pl.st === 'catch')) return;
    const i = pl.hold;
    const b = this.balls[i];
    tx = clamp(tx, 0, QM.W);
    ty = clamp(ty, 0, QM.H);
    pl.dir = tx >= pl.x ? 1 : -1;
    const sx = pl.x + pl.dir * 12;
    const v = throwVelocity(sx, pl.y, tx, ty);
    Object.assign(b, {
      x: sx, y: pl.y, z: QM.HAND_Z, vx: v.vx, vy: v.vy, vz: v.vz,
      st: 'live', by: pl.id, thrower: pl.id, team: pl.team, bank: 0, passed: new Set(), freeze: null, age: 0,
    });
    pl.hold = -1;
    pl.holdT = 0;
    pl.run = -1;
    this.setState(pl, 'throw');
    this.event('throw', { by: pl.id, b: i, pow: r2(v.pow) });
  }

  doGrab(pl) {
    if (pl.hold >= 0) return;
    // a bola congelou em mim (hit-stop): pegou na hora H
    const frozen = this.balls.findIndex((b) => b.st === 'freeze' && b.freeze.victim === pl.id);
    if (frozen >= 0) {
      this.resolveCatch(pl, this.balls[frozen], frozen, true);
      return;
    }
    if (!FREE.has(pl.st) || pl.noPick > 0) return;
    // bola solta mais perto
    let best = -1;
    let bestD = Infinity;
    this.balls.forEach((b, i) => {
      if (b.st !== 'loose' || b.z > QM.PICKUP_Z) return;
      const d = Math.hypot(b.x - pl.x, b.y - pl.y);
      if (d < bestD) { best = i; bestD = d; }
    });
    const lv = this.level;
    if (best >= 0 && bestD <= lv.grabR) {
      const b = this.balls[best];
      if (Math.hypot(b.vx, b.vy) > lv.grabSpeed) this.event('miss', { by: pl.id, why: 'fast', x: Math.round(b.x), y: Math.round(b.y) });
      else this.pickUp(pl, best);
      return;
    }
    // bola viva do adversário em jogo: postura de pegar (a pegada se decide quando ela chegar)
    const incoming = !pl.cem && this.balls.some((b) => b.st === 'live' && b.team !== pl.team);
    if (incoming && pl.catchCd <= 0) {
      this.setState(pl, 'catch');
      pl.catchCd = lv.catchCd;
      pl.run = -1;
      return;
    }
    if (best >= 0) {
      if (lv.autoRun && this.reachable(pl, this.balls[best])) pl.run = best;
      else this.event('miss', { by: pl.id, why: 'far', x: Math.round(pl.x), y: Math.round(pl.y) });
    }
  }

  doDodge(pl, dx, dy) {
    if (!(FREE.has(pl.st) || pl.st === 'catch') || pl.dodgeCd > 0) return;
    let n = Math.hypot(dx, dy);
    if (n < 0.2) {
      // sem direção: foge na profundidade, para o lado com mais espaço
      dx = 0;
      dy = pl.y < QM.H / 2 ? 1 : -1;
      n = 1;
    }
    pl.dodgeDx = dx / n;
    pl.dodgeDy = dy / n;
    pl.dodgeCd = this.level.dodgeCd;
    pl.dodgeAt = this.clock;
    pl.inv = Math.max(pl.inv, QM.DODGE_INV);
    pl.run = -1;
    if (Math.abs(dx) > 0.2) pl.dir = dx > 0 ? 1 : -1;
    this.setState(pl, 'dodge');
    this.event('dodge', { by: pl.id });
    // a bola tinha congelado em mim (hit-stop): esquivou no último segundo
    const i = this.balls.findIndex((b) => b.st === 'freeze' && b.freeze.victim === pl.id);
    if (i >= 0) {
      const b = this.balls[i];
      const f = b.freeze;
      Object.assign(b, { st: 'live', vx: f.vx, vy: f.vy, vz: f.vz, freeze: null });
      this.whoosh(pl, b, i, 0);
    }
  }

  pickUp(pl, i) {
    const b = this.balls[i];
    Object.assign(b, { st: 'held', by: pl.id, team: pl.team, vx: 0, vy: 0, vz: 0, freeze: null });
    pl.hold = i;
    pl.holdT = 0;
    pl.run = -1;
    this.event('grab', { by: pl.id, b: i });
  }

  // dá para alcançar a bola sem sair da minha faixa da quadra?
  reachable(pl, b) {
    const [lo, hi] = zoneX(pl.team, pl.cem);
    const r = this.level.grabR;
    return b.x >= lo - r && b.x <= hi + r;
  }

  dropBall(pl) {
    if (pl.hold < 0) return;
    const b = this.balls[pl.hold];
    if (b) Object.assign(b, { st: 'loose', by: 0, z: 20, vx: pl.dir * 40, vy: 0, vz: 60 });
    pl.hold = -1;
    pl.holdT = 0;
  }

  // ---------- simulação ----------

  tick(dt) {
    this.clock += dt;
    switch (this.phase) {
      case 'lobby':
        this.simulate(dt);
        break;
      case 'count':
        this.timer -= dt;
        this.simulate(dt);
        if (this.timer <= 0) this.startRound();
        break;
      case 'intro':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.setPhase('play', QM.ROUND_TIME);
          this.event('go', { round: this.round });
        }
        break;
      case 'play':
        this.timer -= dt;
        this.simulate(dt);
        this.enterFromQueue();
        if (this.phase === 'play' && this.timer <= 0) this.timeUp();
        break;
      case 'end':
        this.timer -= dt;
        this.simulate(dt, true);
        if (this.timer <= 0) this.afterRound();
        break;
      case 'over':
        this.timer -= dt;
        if (this.timer <= 0) this.afterOver();
        break;
      default:
        break;
    }
    if (this.members.size) this.sendState();
  }

  simulate(dt, frozen = false) {
    for (const pl of this.court.values()) this.stepPlayer(pl, dt, frozen);
    this.balls.forEach((b, i) => this.stepBallAt(b, i, dt));
  }

  stepPlayer(pl, dt, frozen) {
    pl.t += dt;
    pl.dodgeCd = Math.max(0, pl.dodgeCd - dt);
    pl.catchCd = Math.max(0, pl.catchCd - dt);
    pl.inv = Math.max(0, pl.inv - dt);
    pl.noPick = Math.max(0, pl.noPick - dt);
    pl.moving = false;
    if (pl.hold >= 0) {
      pl.holdT += dt;
      if (this.phase === 'play' && pl.holdT > this.level.holdMax) {
        this.dropBall(pl);
        pl.noPick = QM.SLOW_LOCK; // demorou: não pega de volta na hora
        this.event('slow', { by: pl.id });
      }
    }
    switch (pl.st) {
      case 'hit':
        if (pl.t >= QM.HIT_TIME) this.toCemetery(pl);
        return;
      case 'dodge': {
        const sp = QM.DODGE_DIST / QM.DODGE_TIME;
        pl.x += pl.dodgeDx * sp * dt;
        pl.y += pl.dodgeDy * sp * QM.DEPTH_MUL * dt;
        clampPlayer(pl);
        if (pl.t >= QM.DODGE_TIME) this.setState(pl, 'idle');
        return;
      }
      case 'throw':
        if (pl.t >= QM.THROW_TIME) this.setState(pl, 'idle');
        return;
      case 'stun':
        if (pl.t >= QM.STUN_TIME) this.setState(pl, 'idle');
        return;
      case 'catch':
        if (pl.t >= QM.CATCH_STANCE) this.setState(pl, 'idle');
        else if (!frozen) walkStep(pl, pl.mx, pl.my, dt);
        return;
      default:
        break;
    }
    if (frozen) {
      if (pl.st !== 'idle') this.setState(pl, 'idle');
      return;
    }
    // fácil: correndo até a bola que clicou
    let mx = pl.mx;
    let my = pl.my;
    if (pl.run >= 0) {
      const b = this.balls[pl.run];
      if (Math.hypot(mx, my) > 0.1 || !b || b.st !== 'loose' || !this.reachable(pl, b)) pl.run = -1;
      else {
        const dx = b.x - pl.x;
        const dy = b.y - pl.y;
        const d = Math.hypot(dx, dy);
        if (d <= this.level.grabR * 0.8) {
          pl.run = -1;
          this.doGrab(pl);
          return;
        }
        mx = dx / d;
        my = dy / d / QM.DEPTH_MUL;
        const n = Math.hypot(mx, my);
        mx /= n;
        my /= n;
      }
    }
    const ox = pl.x;
    const moved = walkStep(pl, mx, my, dt);
    pl.moving = moved;
    if (moved && Math.abs(pl.x - ox) > 0.05) pl.dir = pl.x > ox ? 1 : -1;
    const st = moved ? 'walk' : 'idle';
    if (st !== pl.st) this.setState(pl, st);
    // fácil: passar por cima de bola lenta pega sozinho
    const auto = this.level.autoPick;
    if (auto && pl.hold < 0 && pl.noPick <= 0) {
      this.balls.forEach((b, i) => {
        if (pl.hold >= 0 || b.st !== 'loose' || b.z > QM.PICKUP_Z) return;
        if (Math.hypot(b.vx, b.vy) < auto && Math.hypot(b.x - pl.x, b.y - pl.y) < this.level.grabR * 0.6) this.pickUp(pl, i);
      });
    }
  }

  stepBallAt(b, i, dt) {
    if (b.st === 'held') {
      const h = this.court.get(b.by);
      if (!h || h.hold !== i) {
        Object.assign(b, { st: 'loose', by: 0 });
        return;
      }
      b.x = h.x + h.dir * 14;
      b.y = h.y + 1;
      b.z = 46;
      return;
    }
    if (b.st === 'freeze') {
      if (this.clock >= b.freeze.until) this.resolveHit(b, i);
      return;
    }
    const ev = stepBall(b, dt);
    if (b.st === 'loose') this.checkStuck(b, i, dt);
    if (b.st !== 'live') return;
    b.age += dt;
    if (ev.wall || ev.tire) {
      b.bank += ev.wall + ev.tire;
      this.event('bank', { b: i, x: Math.round(b.x), y: Math.round(b.y), tire: ev.tire ? 1 : 0 });
    }
    // acerto antes do chão: bola que pega no pé ainda queima
    if (this.phase === 'play') this.checkHits(b, i);
    if (ev.ground && b.st === 'live') b.st = 'loose'; // tocou o chão: bola morta
  }

  // bola parada onde ninguém alcança (ex.: cemitério vazio): o juiz rola de volta para quem está mais perto
  checkStuck(b, i, dt) {
    if (b.z > 0 || Math.hypot(b.vx, b.vy) > 60) {
      b.idle = 0;
      return;
    }
    let nearest = null;
    let bestD = Infinity;
    for (const pl of this.court.values()) {
      if (pl.st === 'hit') continue;
      if (this.reachable(pl, b)) {
        b.idle = 0;
        return;
      }
      const [lo, hi] = zoneX(pl.team, pl.cem);
      const d = Math.abs((lo + hi) / 2 - b.x);
      if (d < bestD) { bestD = d; nearest = pl; }
    }
    b.idle = (b.idle || 0) + dt;
    if (b.idle < QM.BALL_RETURN || !nearest) return;
    b.idle = 0;
    const [lo, hi] = zoneX(nearest.team, nearest.cem);
    const tx = b.x < lo ? lo + 40 : hi - 40;
    const v = throwVelocity(b.x, b.y, tx, clamp(b.y, 60, QM.H - 60));
    Object.assign(b, { vx: v.vx * 0.55, vy: v.vy * 0.55, vz: 230 });
    this.event('return', { b: i, x: Math.round(b.x), y: Math.round(b.y) });
  }

  checkHits(b, i) {
    if (b.z > QM.BODY_H) return;
    const reach = QM.HIT_R;
    for (const pl of this.court.values()) {
      if (pl.team === b.team || pl.cem || pl.st === 'hit' || b.passed.has(pl.id)) continue;
      const dx = pl.x - b.x;
      const dy = pl.y - b.y;
      const d = Math.hypot(dx, dy);
      // WHOOSH: a bola vinha na direção de quem acabou de esquivar e passou raspando
      const since = this.clock - pl.dodgeAt;
      if (d <= QM.WHOOSH_R && since <= QM.WHOOSH_WINDOW && b.vx * dx + b.vy * dy > 0) {
        this.whoosh(pl, b, i, since);
        continue;
      }
      if (d > reach) continue;
      if (pl.inv > 0) {
        b.passed.add(pl.id); // acabou de entrar/voltar: a bola passa direto
        continue;
      }
      if (pl.st === 'catch') {
        const speed = Math.hypot(b.vx, b.vy);
        if (catchOk(pl.t, speed, this.level)) this.resolveCatch(pl, b, i, false);
        else this.fumble(pl, b, i);
        return;
      }
      // acertou: a bola congela um instante (hit-stop). Dá tempo de pegar/esquivar mesmo com lag.
      b.freeze = { victim: pl.id, until: this.clock + QM.HIT_GRACE, vx: b.vx, vy: b.vy, vz: b.vz };
      b.st = 'freeze';
      b.vx = b.vy = b.vz = 0;
      return;
    }
  }

  whoosh(pl, b, i, since) {
    b.passed.add(pl.id);
    const m = this.members.get(pl.id);
    if (m && this.phase === 'play') {
      m.pts += QM.PTS_DODGE;
      m.dodges++;
    }
    this.event('whoosh', {
      by: pl.id, b: i, x: Math.round(pl.x), y: Math.round(pl.y),
      last: since <= QM.LAST_SECOND ? 1 : 0, pts: QM.PTS_DODGE,
    });
    this.live();
  }

  resolveCatch(pl, b, i, late) {
    const from = b.thrower;
    Object.assign(b, { st: 'held', by: pl.id, team: pl.team, vx: 0, vy: 0, vz: 0, freeze: null });
    pl.hold = i;
    pl.holdT = 0;
    pl.run = -1;
    this.setState(pl, 'idle');
    const m = this.members.get(pl.id);
    if (m) {
      m.pts += QM.PTS_CATCH;
      m.catches++;
    }
    this.event('catch', { by: pl.id, from, b: i, x: Math.round(pl.x), y: Math.round(pl.y), pts: QM.PTS_CATCH, late: late ? 1 : 0 });
    this.live();
  }

  fumble(pl, b, i) {
    // deixou escapar: a bola pula para cima (morta) e o boneco fica tonto — mas não foi queimado
    Object.assign(b, { st: 'loose', vx: -b.vx * 0.2 + (this.room.random() - 0.5) * 60, vy: b.vy * 0.2, vz: 280, z: Math.max(b.z, 30) });
    this.setState(pl, 'stun');
    this.event('fumble', { by: pl.id, b: i, x: Math.round(pl.x), y: Math.round(pl.y) });
  }

  resolveHit(b, i) {
    const f = b.freeze;
    const victim = this.court.get(f.victim);
    if (!victim || victim.cem || victim.st === 'hit' || this.phase !== 'play') {
      Object.assign(b, { st: 'live', vx: f.vx, vy: f.vy, vz: f.vz, freeze: null });
      b.passed.add(f.victim);
      return;
    }
    // ricochete: a bola volta um pouco e sobe (morta)
    Object.assign(b, { st: 'loose', vx: -f.vx * 0.22, vy: -f.vy * 0.22, vz: 210, z: Math.max(b.z, 30), freeze: null });
    const thrower = this.court.get(b.thrower);
    const tm = this.members.get(b.thrower);
    const pts = QM.PTS_HIT + (b.bank > 0 ? QM.PTS_BANK : 0);
    if (tm) {
      tm.pts += pts;
      tm.hits++;
    }
    const fromCem = !!thrower?.cem;
    this.eliminate(victim);
    this.event('hit', {
      by: b.thrower, to: victim.id, b: i, x: Math.round(victim.x), y: Math.round(victim.y),
      bank: b.bank, pts: tm ? pts : 0, cem: fromCem ? 1 : 0,
    });
    // do cemitério: acertou alguém = volta para a quadra (se o time tiver lugar)
    if (fromCem && thrower && this.onCourt(thrower.team) < this.per) this.revive(thrower);
    this.checkRoundEnd();
    this.live();
  }

  eliminate(pl) {
    this.dropBall(pl);
    this.setState(pl, 'hit');
    pl.run = -1;
    this.outOrder.push(pl.id);
    this.scheduleEntry(pl.team);
  }

  // próximo da fila entra no lugar de quem saiu (mesmo time)
  scheduleEntry(team) {
    const next = this.queue()[0];
    if (next != null) this.entering.push({ pid: next, team, at: this.clock + QM.ENTER_DELAY });
  }

  enterFromQueue() {
    const due = this.entering.filter((e) => this.clock >= e.at);
    if (!due.length) return;
    this.entering = this.entering.filter((e) => this.clock < e.at);
    for (const e of due) {
      if (!this.members.has(e.pid) || this.court.has(e.pid)) continue;
      const s = startSpot(e.team, 0, 1);
      const pl = newPlayer(e.pid, e.team, s.x, s.y + (this.room.random() - 0.5) * 120, s.dir);
      pl.inv = QM.SPAWN_INV;
      this.court.set(e.pid, pl);
      this.members.get(e.pid).team = e.team;
      this.event('enter', { id: e.pid, team: e.team });
    }
    this.live();
  }

  toCemetery(pl) {
    pl.cem = true;
    const [lo, hi] = zoneX(pl.team, true);
    pl.x = (lo + hi) / 2;
    pl.dir = pl.team === 'a' ? -1 : 1; // de frente para o time adversário
    clampPlayer(pl);
    this.setState(pl, 'idle');
    this.event('cem', { id: pl.id });
    this.live();
  }

  revive(pl) {
    this.dropBall(pl);
    pl.cem = false;
    const s = startSpot(pl.team, 0, 1);
    Object.assign(pl, { x: s.x, y: clamp(pl.y, QM.R, QM.H - QM.R), dir: s.dir, inv: QM.SPAWN_INV, run: -1 });
    clampPlayer(pl);
    this.setState(pl, 'idle');
    this.event('revive', { id: pl.id });
  }

  // na quadra (vivo) + quem está entrando pela fila
  onCourt(team) {
    let n = this.entering.filter((e) => e.team === team).length;
    for (const pl of this.court.values()) if (pl.team === team && !pl.cem && pl.st !== 'hit') n++;
    return n;
  }

  queue() {
    return this.line.filter((id) => this.members.has(id) && !this.court.has(id) && !this.entering.some((e) => e.pid === id));
  }

  checkRoundEnd() {
    if (this.phase !== 'play') return;
    const a = this.onCourt('a');
    const b = this.onCourt('b');
    if (a && b) return;
    this.endRound(a ? 'a' : b ? 'b' : null, 'wipe');
  }

  timeUp() {
    const a = this.onCourt('a');
    const b = this.onCourt('b');
    this.endRound(a > b ? 'a' : b > a ? 'b' : null, 'time');
  }

  endRound(winner, reason) {
    this.setPhase('end', QM.END_TIME);
    const survivors = [];
    if (winner) {
      for (const pl of this.court.values()) {
        if (pl.team !== winner || pl.cem || pl.st === 'hit') continue;
        survivors.push(pl.id);
        const m = this.members.get(pl.id);
        if (m) m.pts += QM.PTS_SURVIVE;
      }
    }
    this.entering = [];
    this.event('roundEnd', { winner, reason, survivors, pts: QM.PTS_SURVIVE, round: this.round });
    this.live();
  }

  afterRound() {
    const best = Math.max(0, ...[...this.members.values()].map((m) => m.pts));
    if (best >= QM.TARGET) {
      this.finish();
      return;
    }
    this.rotate();
    this.startRound();
  }

  // próxima rodada: quem esperou na fila primeiro, depois quem sobreviveu ("quem ganha fica"),
  // depois os queimados (o último a cair antes do primeiro)
  rotate() {
    const waited = this.queue();
    const played = this.line.filter((id) => this.court.has(id));
    const alive = played.filter((id) => {
      const pl = this.court.get(id);
      return !pl.cem && pl.st !== 'hit';
    });
    const out = [...this.outOrder].reverse().filter((id) => played.includes(id) && !alive.includes(id));
    const rest = played.filter((id) => !alive.includes(id) && !out.includes(id));
    this.line = [...new Set([...waited, ...alive, ...out, ...rest])].filter((id) => this.members.has(id));
  }

  startRound() {
    const n = this.members.size;
    if (n < 2) {
      this.toLobby();
      return;
    }
    this.round++;
    this.per = n >= 4 ? QM.MAX_COURT : 1;
    for (const id of this.members.keys()) if (!this.line.includes(id)) this.line.push(id);
    const lineup = this.line.slice(0, this.per * 2);
    // cada um tenta ficar no time da rodada anterior (Daniel+Maria × Nilton+João)
    const count = { a: 0, b: 0 };
    const team = new Map();
    const later = [];
    for (const id of lineup) {
      const t = this.members.get(id).team;
      if (t && count[t] < this.per) {
        count[t]++;
        team.set(id, t);
      } else later.push(id);
    }
    for (const id of later) {
      const t = count.a <= count.b ? 'a' : 'b';
      count[t]++;
      team.set(id, t);
    }
    this.court.clear();
    for (const t of ['a', 'b']) {
      const ids = lineup.filter((id) => team.get(id) === t);
      ids.forEach((id, i) => {
        const s = startSpot(t, i, ids.length);
        this.court.set(id, newPlayer(id, t, s.x, s.y, s.dir));
        this.members.get(id).team = t;
      });
    }
    this.balls = ballSpots(this.per >= 2 ? 2 : 1).map((s) => newBall(s.x, s.y));
    this.entering = [];
    this.outOrder = [];
    this.setPhase('intro', QM.INTRO_TIME);
    this.event('round', {
      round: this.round,
      a: lineup.filter((id) => team.get(id) === 'a'),
      b: lineup.filter((id) => team.get(id) === 'b'),
      queue: this.queue(),
    });
    this.live();
  }

  finish() {
    const rank = [...this.members.values()].sort((a, b) => b.pts - a.pts || b.hits - a.hits || b.catches - a.catches);
    const w = rank[0];
    this.setPhase('over', QM.OVER_TIME);
    this.room.broadcast({
      t: MSG.QM_END,
      id: this.id,
      winner: w.id,
      winnerNick: w.nick,
      rank: rank.map((m) => [m.id, m.nick, m.pts, m.hits, m.catches, m.dodges]),
    });
    this.live();
  }

  afterOver() {
    for (const m of this.members.values()) Object.assign(m, { pts: 0, hits: 0, catches: 0, dodges: 0 });
    this.round = 0;
    this.toLobby();
  }

  // treino livre: todo mundo na quadra, 1 bola, ninguém é queimado
  toLobby() {
    this.lobbyCourt();
    this.setPhase(this.members.size >= 2 ? 'count' : 'lobby', QM.LOBBY_COUNT);
    this.event('lobby', {});
    this.live();
  }

  lobbyCourt() {
    this.court.clear();
    this.entering = [];
    this.balls = ballSpots(1).map((s) => newBall(s.x, s.y));
    for (const id of this.line) if (this.members.has(id)) this.placePractice(id);
  }

  placePractice(id) {
    const m = this.members.get(id);
    let a = 0;
    let b = 0;
    for (const pl of this.court.values()) if (pl.team === 'a') a++; else b++;
    const t = m.team && (m.team === 'a' ? a <= b : b <= a) ? m.team : a <= b ? 'a' : 'b';
    m.team = t;
    const s = startSpot(t, 0, 1);
    const k = this.court.size;
    this.court.set(id, newPlayer(id, t, s.x + (k % 3) * 40 * s.dir, clamp(s.y + ((k % 5) - 2) * 60, QM.R, QM.H - QM.R), s.dir));
  }

  setPhase(ph, timer) {
    this.phase = ph;
    this.timer = timer;
  }

  setState(pl, st) {
    pl.st = st;
    pl.t = 0;
  }

  // ---------- estado ----------

  // vai para todos (lista do Ginásio e quem esconder da praça): [pid, time, lugar, pontos]
  // lugar: 0 = fila, 1 = quadra, 2 = cemitério
  publicInfo() {
    return {
      id: this.id,
      ph: this.phase,
      hard: this.hard ? 1 : 0,
      rd: this.round,
      m: [...this.line].filter((id) => this.members.has(id)).map((id) => {
        const m = this.members.get(id);
        const pl = this.court.get(id);
        return [id, pl ? pl.team : '', pl ? (pl.cem ? 2 : 1) : 0, m.pts];
      }),
    };
  }

  live() {
    if (this.members.size) this.room.broadcast({ t: MSG.QM_LIVE, ...this.publicInfo() });
  }

  state() {
    // p: [id, x, y, dir, st, t, team(0=a,1=b), cem, bola segurada(-1), invencível, dodgeCd, catchCd, holdT]
    const p = [];
    for (const pl of this.court.values()) {
      p.push([pl.id, Math.round(pl.x), Math.round(pl.y), pl.dir, pl.st, r2(pl.t), pl.team === 'a' ? 0 : 1, pl.cem ? 1 : 0,
        pl.hold, pl.inv > 0 ? 1 : 0, r1(pl.dodgeCd), r1(pl.catchCd), r1(pl.holdT)]);
    }
    // b: [x, y, z, st(0 solta,1 viva,2 segurada,3 congelada), time(-1/0/1), quem segura/arremessou]
    const b = this.balls.map((bl) => [Math.round(bl.x), Math.round(bl.y), Math.round(bl.z), BALL_ST[bl.st],
      bl.team === 'a' ? 0 : bl.team === 'b' ? 1 : -1, bl.by || 0]);
    return { t: MSG.QM_STATE, ph: this.phase, tm: r1(Math.max(0, this.timer)), rd: this.round, p, b };
  }

  sendState() {
    this.toMembers(this.state());
  }

  event(kind, data = {}) {
    this.toMembers({ t: MSG.QM_EVENT, kind, ...data });
  }

  toMembers(msg) {
    const data = JSON.stringify(msg);
    for (const id of this.members.keys()) this.room.players.get(id)?.send(data);
  }
}

function newPlayer(id, team, x, y, dir) {
  return {
    id, team, cem: false, x, y, dir, mx: 0, my: 0, st: 'idle', t: 0, moving: false,
    hold: -1, holdT: 0, dodgeCd: 0, catchCd: 0, dodgeDx: 0, dodgeDy: 0, dodgeAt: -99, inv: 0, run: -1, noPick: 0,
  };
}

function newBall(x, y) {
  return { x, y, z: 0, vx: 0, vy: 0, vz: 0, st: 'loose', by: 0, thrower: 0, team: '', bank: 0, passed: new Set(), freeze: null, age: 0 };
}
