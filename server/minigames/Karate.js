// Luta de Karatê (1x1) num dojo separado da praça — melhor de 3 rounds.
// Fases: intro ("ROUND 1... LUTEM!") → fight → ko (comemoração) → intro... → fim.
// Os dois lutadores somem da praça (pose 'dojo') e só eles + a PLATEIA recebem o estado da luta.
// Plateia (`watchers`): espectadores que entraram pelo prédio do Dojo. Só assistem e torcem
// (reações com limite de frequência); nada do que mandam chega na simulação da luta.
// Desistência (sair) = W.O. Mesma interface do GolAGol: has/handle/tick/forfeit/publicInfo.

import { MSG } from '../../shared/constants.js';
import { ARENA, CHEERS } from '../../shared/arena.js';
import {
  KT, MOVES, ACTIONS, movePhase, isFree, clamp, clampArena, walkStep, dashVector,
  inReach, startPositions, staleMult,
} from '../../shared/karate.js';

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const INVULNERABLE = new Set(['down', 'getup', 'ko', 'win']);

export class KarateFight {
  constructor(room, a, b, id = 1) {
    this.room = room;
    this.id = id;
    this.ids = [a.id, b.id];
    this.nicks = { [a.id]: a.nick, [b.id]: b.nick };
    this.wins = { [a.id]: 0, [b.id]: 0 };
    this.dealt = { [a.id]: 0, [b.id]: 0 }; // dano total causado (desempate)
    this.fighters = new Map(this.ids.map((pid) => [pid, newFighter(pid)]));
    this.clock = 0;
    this.round = 0;
    this.phase = 'intro';
    this.timer = KT.INTRO_TIME;
    this.over = false;
    this.roundWinner = null;
    this.watchers = new Map(); // playerId -> { side, seat, lastCheer }

    for (const pl of [a, b]) {
      pl.pose = 'dojo';
      pl.moving = false;
      pl.path = [];
    }
    room.broadcast({
      t: MSG.KT_START,
      id: this.id,
      a: { id: a.id, nick: a.nick },
      b: { id: b.id, nick: b.nick },
    });
    this.startRound();
  }

  has(id) {
    return this.fighters.has(id);
  }

  other(id) {
    return this.ids[0] === id ? this.ids[1] : this.ids[0];
  }

  // ---------- entrada ----------

  handle(p, msg) {
    if (this.over) return;
    const f = this.fighters.get(p.id);
    if (!f) return;
    if (msg.t === MSG.KT_INPUT) {
      if (isNum(msg.mx)) f.mx = clamp(msg.mx, -1, 1);
      if (isNum(msg.my)) f.my = clamp(msg.my, -1, 1);
      if (typeof msg.block === 'boolean') f.wantBlock = msg.block;
      return;
    }
    if (msg.t !== MSG.KT_ACT || !ACTIONS.includes(msg.a)) return;
    if (this.phase !== 'fight') return;
    f.buf = { a: msg.a, at: this.clock, dx: isNum(msg.dx) ? clamp(msg.dx, -1, 1) : f.mx, dy: isNum(msg.dy) ? clamp(msg.dy, -1, 1) : f.my };
    if (isFree(f.st)) this.tryBuffered(f);
  }

  // ---------- simulação ----------

  tick(dt) {
    if (this.over) return;
    this.clock += dt;
    switch (this.phase) {
      case 'intro':
        this.timer -= dt;
        for (const f of this.fighters.values()) this.face(f);
        if (this.timer <= 0) {
          this.phase = 'fight';
          this.timer = KT.ROUND_TIME;
          this.event('fight', { round: this.round });
        }
        break;
      case 'fight':
        this.timer -= dt;
        this.step(dt);
        if (this.phase === 'fight' && this.timer <= 0) this.timeUp();
        break;
      case 'ko':
        this.timer -= dt;
        this.step(dt);
        if (this.timer <= 0) this.afterRound();
        break;
      default:
        break;
    }
    if (!this.over) this.sendState();
  }

  step(dt) {
    const [a, b] = this.ids.map((id) => this.fighters.get(id));
    this.stepFighter(a, b, dt);
    this.stepFighter(b, a, dt);
    // acertos são decididos com os dois já atualizados: golpes simultâneos TROCAM
    // (os dois acertam), sem vantagem para quem é processado primeiro
    if (this.phase === 'fight') {
      const hits = [[a, b], [b, a]].filter(([att, def]) => this.canHit(att, def)).map(([att, def]) => [att, def, att.st]);
      for (const [att, def, mid] of hits) this.tryHit(att, def, mid);
      this.checkKo(a, b);
    }
    this.separate(a, b);
  }

  canHit(att, def) {
    const m = MOVES[att.st];
    return !!m && !att.hitDone && movePhase(m, att.t) === 'active';
  }

  stepFighter(f, o, dt) {
    f.t += dt;
    f.dashCd = Math.max(0, f.dashCd - dt);
    f.slowT = Math.max(0, f.slowT - dt);
    // empurrão (golpe recebido) desliza e para rápido
    if (f.kvx || f.kvy) {
      f.x += f.kvx * dt;
      f.y += f.kvy * dt;
      const d = KT.KNOCK_DECAY ** dt;
      f.kvx *= d;
      f.kvy *= d;
      if (Math.abs(f.kvx) < 5 && Math.abs(f.kvy) < 5) f.kvx = f.kvy = 0;
    }
    const fighting = this.phase === 'fight';

    if (isFree(f.st)) {
      if (fighting && this.tryBuffered(f)) {
        // começou um golpe/dash neste tick
      } else if (fighting) {
        const wasBlock = f.st === 'block';
        f.block = !!f.wantBlock;
        if (f.block && !wasBlock) {
          f.parryOk = this.clock - f.blockAt >= KT.PARRY_RETRY;
          f.blockAt = this.clock;
        }
        const moved = walkStep(f, f.mx, f.my, dt);
        const st = f.block ? 'block' : moved ? 'walk' : 'idle';
        if (st !== f.st) this.setState(f, st);
        f.moving = moved;
        this.face(f, o);
      } else {
        f.moving = false;
      }
    } else if (MOVES[f.st]) {
      this.stepAttack(f, o, dt);
    } else if (f.st === 'dash') {
      const sp = KT.DASH_DIST / KT.DASH_TIME;
      f.x += f.dashDx * sp * dt;
      f.y += f.dashDy * sp * KT.DEPTH_MUL * dt;
      if (f.t >= KT.DASH_TIME) {
        f.lastDashEnd = this.clock;
        this.setState(f, 'idle');
      }
    } else if (f.st === 'hit' || f.st === 'bstun' || f.st === 'stun') {
      if (f.t >= f.stunFor) {
        if (f.st === 'hit') f.combo = 0;
        this.setState(f, 'idle');
      }
    } else if (f.st === 'down') {
      if (f.t >= KT.DOWN_TIME && this.phase === 'fight') this.setState(f, 'getup');
    } else if (f.st === 'getup') {
      if (f.t >= KT.GETUP_TIME) this.setState(f, 'idle');
    }
    clampArena(f);
  }

  stepAttack(f, o, dt) {
    const m = MOVES[f.st];
    const ph = movePhase(m, f.t);
    if (ph === 'startup' && m.lunge) f.x += f.dir * (m.lunge / m.startup) * dt;
    // golpe encadeável que acertou: pode cancelar a recuperação com o próximo
    const chainNow = m.chain && f.hitLanded && f.t >= m.startup + KT.CHAIN_AFTER && f.buf;
    if (chainNow && this.tryBuffered(f, true)) return;
    if (ph === null) {
      if (!f.hitDone) this.event('whiff', { by: f.id, m: f.st });
      this.setState(f, 'idle');
      if (this.phase === 'fight') this.tryBuffered(f);
    }
  }

  // inicia a ação guardada no buffer, se ainda for válida
  tryBuffered(f, chain = false) {
    const b = f.buf;
    if (!b) return false;
    if (this.clock - b.at > KT.BUFFER) {
      f.buf = null;
      return false;
    }
    if (!chain && !isFree(f.st)) return false;
    if (b.a === 'dash') {
      if (chain || f.dashCd > 0) {
        if (f.dashCd > 0) f.buf = null;
        return false;
      }
      f.buf = null;
      const [dx, dy] = dashVector(b.dx, b.dy, f.dir);
      f.dashDx = dx;
      f.dashDy = dy;
      f.dashCd = KT.DASH_CD;
      f.block = false;
      this.setState(f, 'dash');
      this.event('dash', { by: f.id });
      return true;
    }
    f.buf = null;
    f.block = false;
    f.moving = false;
    f.dashBonus = this.clock - f.lastDashEnd <= KT.DASH_BONUS_WINDOW;
    this.face(f, this.fighters.get(this.other(f.id)));
    this.setState(f, b.a);
    return true;
  }

  tryHit(att, def, mid) {
    const m = MOVES[mid];
    if (INVULNERABLE.has(def.st)) return;
    if (def.st === 'dash' && def.t < KT.DASH_IFRAMES) return;
    if (!inReach(m, att.x, att.y, att.dir, def.x, def.y)) return;
    att.hitDone = true;
    const facing = def.dir === -att.dir;
    const x = Math.round((att.x + def.x) / 2);
    const y = Math.round(def.y);

    // em "blockstun" a guarda continua levantada
    if ((def.st === 'block' || def.st === 'bstun') && facing) {
      if (def.st === 'block' && def.parryOk && this.clock - def.blockAt <= KT.PARRY_WINDOW) {
        // DEFESA PERFEITA: ninguém se machuca e o atacante fica tonto
        def.parryOk = false;
        att.stunFor = KT.PARRY_STUN;
        this.setState(att, 'stun');
        this.event('parry', { by: def.id, to: att.id, m: mid, x, y });
        return;
      }
      if (m.guardBreak) {
        const dmg = Math.round(m.dmg * KT.GUARD_BREAK_DMG);
        this.damage(att, def, dmg);
        def.block = false;
        def.stunFor = KT.GUARD_BREAK_STUN;
        this.setState(def, 'stun');
        this.push(def, att.dir, m.push);
        this.event('guardbreak', { by: att.id, to: def.id, dmg, x, y });
        def.lastHitDir = att.dir;
      } else {
        const dmg = Math.max(1, Math.round(m.dmg * KT.BLOCK_CHIP));
        this.damage(att, def, dmg);
        def.stunFor = KT.BLOCKSTUN;
        this.setState(def, 'bstun');
        this.push(def, att.dir, m.push * KT.BLOCK_PUSH);
        this.event('block', { by: att.id, to: def.id, m: mid, dmg, x, y });
        def.lastHitDir = att.dir;
      }
      return;
    }

    att.hitLanded = true;
    const counter = !!MOVES[def.st] && def.t < MOVES[def.st].startup;
    const combo = def.st === 'hit' ? def.combo + 1 : 1;
    const stale = staleMult(att.recent, mid);
    att.recent.push(mid);
    if (att.recent.length > KT.STALE_MEMORY) att.recent.shift();
    let mult = KT.COMBO_SCALE ** (combo - 1) * stale;
    if (counter) mult *= KT.COUNTER_MULT;
    if (att.dashBonus) mult *= KT.DASH_BONUS;
    const dmg = Math.max(1, Math.round(m.dmg * mult));
    this.damage(att, def, dmg);
    const kd = !!m.knockdown || combo >= KT.COMBO_MAX;
    def.combo = kd ? 0 : combo;
    def.block = false;
    def.buf = null;
    if (m.slow) def.slowT = KT.SLOW_TIME;
    if (kd) {
      this.setState(def, 'down');
      this.push(def, att.dir, Math.max(m.push, 90));
    } else {
      def.stunFor = m.stun;
      this.setState(def, 'hit');
      this.push(def, att.dir, m.push);
    }
    this.event('hit', {
      by: att.id, to: def.id, m: mid, dmg, combo, x, y,
      counter: counter ? 1 : 0, dash: att.dashBonus ? 1 : 0, kd: kd ? 1 : 0, slow: m.slow ? 1 : 0,
      stale: stale < 1 - KT.STALE_STEP ? 1 : 0,
    });
    def.lastHitDir = att.dir;
  }

  damage(att, def, dmg) {
    def.hp = Math.max(0, def.hp - dmg);
    this.dealt[att.id] += dmg;
  }

  push(f, dir, amount) {
    f.kvx = dir * amount * KT.KNOCK_K;
    f.kvy = 0;
  }

  // nocaute depois de aplicar os golpes do tick (duplo K.O. numa troca = sorteio)
  checkKo(a, b) {
    const dead = [a, b].filter((f) => f.hp <= 0);
    if (!dead.length || this.phase !== 'fight') return;
    const loser = dead.length === 2 ? dead[this.room.random() < 0.5 ? 0 : 1] : dead[0];
    const winner = loser === a ? b : a;
    if (winner.hp <= 0) winner.hp = 1; // sobreviveu por um fio
    if (loser.st !== 'down') this.push(loser, loser.lastHitDir || -loser.dir, 110);
    this.setState(loser, 'ko');
    this.endRound(winner.id, 'ko');
  }

  timeUp() {
    const [a, b] = this.ids.map((id) => this.fighters.get(id));
    let winner;
    if (a.hp !== b.hp) winner = a.hp > b.hp ? a.id : b.id;
    else if (this.dealt[a.id] !== this.dealt[b.id]) winner = this.dealt[a.id] > this.dealt[b.id] ? a.id : b.id;
    else winner = this.room.random() < 0.5 ? a.id : b.id;
    this.endRound(winner, 'time');
  }

  endRound(winnerId, reason) {
    this.phase = 'ko';
    this.timer = KT.KO_TIME;
    this.wins[winnerId]++;
    this.roundWinner = winnerId;
    this.endReason = reason;
    const w = this.fighters.get(winnerId);
    const l = this.fighters.get(this.other(winnerId));
    if (reason === 'time' && l.st !== 'ko') this.setState(l, 'stun', 99);
    w.kvx = w.kvy = 0;
    this.setState(w, 'win');
    this.event('ko', {
      winner: winnerId,
      loser: l.id,
      reason,
      round: this.round,
      perfect: w.hp === KT.HP ? 1 : 0,
      wins: this.ids.map((id) => this.wins[id]),
    });
    this.live();
  }

  afterRound() {
    const champ = this.ids.find((id) => this.wins[id] >= KT.ROUNDS_TO_WIN);
    if (champ) {
      this.finish(champ, this.endReason);
      return;
    }
    if (this.round >= KT.MAX_ROUNDS) {
      const [a, b] = this.ids;
      this.finish(this.wins[a] >= this.wins[b] ? a : b, this.endReason);
      return;
    }
    this.startRound();
  }

  startRound() {
    this.round++;
    this.phase = 'intro';
    this.timer = KT.INTRO_TIME;
    const pos = startPositions();
    this.ids.forEach((id, i) => {
      const f = this.fighters.get(id);
      const { mx, my, wantBlock } = f; // entrada segurada continua valendo
      Object.assign(f, newFighter(id), pos[i], { mx, my, wantBlock });
    });
    this.event('round', { round: this.round, wins: this.ids.map((id) => this.wins[id]) });
    this.live();
  }

  finish(winner, reason) {
    if (this.over) return;
    this.over = true;
    const loser = this.other(winner);
    this.room.broadcast({
      t: MSG.KT_END,
      id: this.id,
      winner,
      loser,
      winnerNick: this.nicks[winner],
      loserNick: this.nicks[loser],
      reason,
      score: [this.wins[winner], this.wins[loser]],
    });
    this.room.endFight(this);
  }

  forfeit(id) {
    this.finish(this.other(id), 'wo');
  }

  // ---------- auxiliares ----------

  setState(f, st, stunFor) {
    f.st = st;
    f.t = 0;
    if (stunFor != null) f.stunFor = stunFor;
    if (MOVES[st]) {
      f.hitDone = false;
      f.hitLanded = false;
    }
    if (st !== 'block') f.block = false;
  }

  // vira para o oponente (só quando livre: golpes mantêm a direção do início)
  face(f, o = this.fighters.get(this.other(f.id))) {
    if (Math.abs(o.x - f.x) > 4) f.dir = o.x > f.x ? 1 : -1;
  }

  // corpos não se atravessam (exceto no dash, que passa por trás do oponente)
  separate(a, b) {
    if (a.st === 'dash' || b.st === 'dash') return;
    if (a.st === 'ko' || b.st === 'ko' || a.st === 'down' || b.st === 'down') return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dy) > KT.R * 1.4) return;
    const min = KT.R * 2;
    if (Math.abs(dx) >= min) return;
    const s = dx === 0 ? (a.dir > 0 ? 1 : -1) : Math.sign(dx);
    const overlap = (min - Math.abs(dx)) / 2;
    a.x -= s * overlap;
    b.x += s * overlap;
    clampArena(a);
    clampArena(b);
  }

  // ---------- estado ----------

  publicInfo() {
    const [a, b] = this.ids;
    return { id: this.id, a: { id: a, nick: this.nicks[a] }, b: { id: b, nick: this.nicks[b] }, ...this.liveInfo() };
  }

  // placar + plateia (vai na lista "lutas ao vivo" do prédio do Dojo)
  liveInfo() {
    return {
      rd: this.round,
      wins: this.ids.map((id) => this.wins[id]),
      w: [...this.watchers].map(([pid, v]) => [pid, v.side, v.seat]),
    };
  }

  live() {
    if (!this.over) this.room.broadcast({ t: MSG.KT_LIVE, id: this.id, ...this.liveInfo() });
  }

  // ---------- plateia ----------

  // null = entrou; senão o motivo da recusa
  addWatcher(p) {
    if (this.over) return 'gone';
    if (this.watchers.has(p.id)) return null;
    if (this.watchers.size >= ARENA.MAX_WATCHERS) return 'full';
    const taken = new Set([...this.watchers.values()].map((v) => v.seat));
    let seat = 0;
    while (taken.has(seat)) seat++;
    this.watchers.set(p.id, { side: 0, seat, lastCheer: -1e9 });
    const [a, b] = this.ids;
    this.room.sendTo(p, {
      t: MSG.KT_WATCH,
      id: this.id,
      a: { id: a, nick: this.nicks[a] },
      b: { id: b, nick: this.nicks[b] },
      ...this.liveInfo(),
    });
    this.live();
    return null;
  }

  // reason: left | busy | gone (avisa o espectador) · quiet | switch (sem aviso)
  removeWatcher(id, reason = 'left') {
    if (!this.watchers.delete(id)) return;
    const p = this.room.players.get(id);
    if (p && reason !== 'quiet' && reason !== 'switch') this.room.sendTo(p, { t: MSG.KT_UNWATCH, id: this.id, reason });
    this.live();
  }

  // torcida: reação (e, opcionalmente, escolher por quem torce). Não mexe na luta.
  cheer(p, msg) {
    const w = this.watchers.get(p.id);
    if (!w || this.over || !Object.hasOwn(CHEERS, msg.r)) return;
    const now = this.room.now();
    if (now - w.lastCheer < ARENA.CHEER_COOLDOWN_MS) return;
    w.lastCheer = now;
    const side = msg.side === 0 || this.fighters.has(msg.side) ? msg.side : w.side;
    const changed = side !== w.side;
    w.side = side;
    this.toArena({ t: MSG.KT_CHEER, by: p.id, r: msg.r, side });
    if (changed) this.live();
  }

  state() {
    // f: [id, x, y, dir, st, t, hp, dashCd, slowT, combo, moving]
    const f = this.ids.map((id) => {
      const s = this.fighters.get(id);
      return [id, Math.round(s.x), Math.round(s.y), s.dir, s.st, r2(s.t), s.hp, r1(s.dashCd), r1(s.slowT), s.combo, s.moving ? 1 : 0];
    });
    return {
      t: MSG.KT_STATE,
      ph: this.phase,
      tm: r1(Math.max(0, this.timer)),
      rd: this.round,
      w: this.ids.map((id) => this.wins[id]),
      f,
    };
  }

  sendState() {
    this.toArena(this.state());
  }

  event(kind, data = {}) {
    this.toArena({ t: MSG.KT_EVENT, kind, ...data });
  }

  // lutadores + plateia
  toArena(msg) {
    const data = JSON.stringify(msg);
    for (const id of this.ids) this.room.players.get(id)?.send(data);
    for (const id of this.watchers.keys()) this.room.players.get(id)?.send(data);
  }
}

function newFighter(id) {
  return {
    id, x: 0, y: 0, dir: 1, st: 'idle', t: 0, hp: KT.HP,
    mx: 0, my: 0, wantBlock: false, block: false, blockAt: -99, parryOk: false,
    dashCd: 0, dashDx: 0, dashDy: 0, lastDashEnd: -99, dashBonus: false,
    slowT: 0, combo: 0, kvx: 0, kvy: 0, stunFor: 0, recent: [],
    hitDone: false, hitLanded: false, buf: null, moving: false,
  };
}
