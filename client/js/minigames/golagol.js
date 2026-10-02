// Cliente do minigame Gol a Gol: convites/desafios, estado interpolado da partida,
// predição local (goleiro/chutador), controles, mira com trajetória prevista,
// barra de força, textos gigantes e tela de fim com revanche.

import { MSG } from '/shared/constants.js';
import { MAP } from '/shared/map.js';
import {
  GG, ggGeometry, attackDir, spotX, keeperX, clamp, chargeAt, predictPath,
} from '/shared/golagol.js';
import { drawBall } from '../render/world.js';
import { outlinedText, roundRect, INK } from '../render/paint.js';
import { play } from '../audio.js';
import { AdaptiveDelay } from '../jitter.js';

const STATE_DELAY_MS = 70; // mínimo; cresce sozinho se a rede tiver jitter
const SEND_EVERY_MS = 50;

// texto, cor, subtítulo, som, tremida
const EVENT_FX = {
  save: ['DEFENDEU!', '#7cfc9a', 'segurou firme 🧤', 'save', 3],
  parry: ['ESPALMOU!', '#9fd8ff', null, 'save', 5],
  post: ['NA TRAVE!', '#ffb347', 'uuuuh!', 'post', 7],
  out: ['PRA FORA!', '#ffffff', null, 'boo', 0],
  over: ['ISOLOU! 🚀', '#ff9a8a', 'foi parar na Lua', 'boo', 0],
  weak: ['FRAQUINHO...', '#e0e0e0', 'nem chegou no gol', 'boo', 0],
  timeout: ['DEMOROU!', '#ff9a8a', 'perdeu a vez', 'boo', 0],
  tired: ['GOLEIROS CANSADOS', '#d8d8d8', 'agora sai gol 😮‍💨', null, 0],
};

export class GolAGolClient {
  constructor(game, hud) {
    this.game = game;
    this.hud = hud;
    this.geo = ggGeometry(MAP);
    this.match = null;
    this.touchMode = false; // mobile: toque só mira; força vem do botão CHUTAR
    this.axisY = 0; // joystick virtual (mobile), -1..1
    this.delay = new AdaptiveDelay({ interval: 1000 / 30, min: STATE_DELAY_MS, max: 260 });
    this.reset();
  }

  reset() {
    this.buf = [];
    this.last = null;
    this.prevPhase = null;
    this.lastCount = null;
    this.lastClock = null;
    this.kick = { at: -1e9, by: null };
    this.trail = [];
    this.aim = { x: this.geo.f.x + this.geo.f.w / 2, y: this.geo.midY };
    this.charging = false;
    this.chargeStart = 0;
    this.curve = 0;
    this.held = new Set();
    this.kTarget = null;
    this.sTarget = null;
    this.predK = null;
    this.predS = null;
    this.lastSend = 0;
    this.sentK = null;
    this.sentS = null;
    this.barKey = '';
  }

  // ---------- consultas ----------

  get me() {
    return this.game.me;
  }

  sideOf(id) {
    if (!this.match) return null;
    if (this.match.left.id === id) return 'left';
    if (this.match.right.id === id) return 'right';
    return null;
  }

  nickOf(id) {
    if (!this.match) return '?';
    return this.match.left.id === id ? this.match.left.nick : this.match.right.nick;
  }

  inMatch(id) {
    return !!this.sideOf(id);
  }

  isPlaying() {
    return this.inMatch(this.me);
  }

  role() {
    if (!this.isPlaying() || !this.last) return this.isPlaying() ? 'wait' : null;
    return this.last.sh === this.me ? 'shooter' : 'keeper';
  }

  // ---------- rede ----------

  challenge(pid) {
    this.game.send({ t: MSG.CHALLENGE, to: pid });
  }

  onMessage(msg, now) {
    switch (msg.t) {
      case MSG.GG_START: this.start(msg, false, now); return true;
      case MSG.GG_STATE: this.onState(msg, now); return true;
      case MSG.GG_EVENT: this.onEvent(msg, now); return true;
      case MSG.GG_END: this.onEnd(msg, now); return true;
      case MSG.CHALLENGE: this.onInvite(msg); return true;
      case MSG.CH_STATUS: this.onStatus(msg); return true;
      default: return false;
    }
  }

  start(info, quiet, now = performance.now()) {
    this.match = { left: info.left, right: info.right };
    this.reset();
    if (quiet) return;
    this.hud.log(null, `⚽ ${info.left.nick} x ${info.right.nick} — Gol a Gol no campinho!`);
    this.bigText('GOL A GOL!', { sub: 'primeiro gol vence', size: 50, color: '#ffe14d' }, now);
    play('whistle');
    if (this.isPlaying()) {
      clearTimeout(this.resultTimer);
      this.hud.closePlayerCard();
      this.hud.clearInvites();
      this.hud.closeGgResult();
      this.game.dest = null;
    }
  }

  onState(s, now) {
    s.at = now;
    this.delay.arrive(now);
    this.buf.push(s);
    if (this.buf.length > 12) this.buf.shift();
    const prev = this.prevPhase;
    this.last = s;

    if (s.ph === 'countdown') {
      const n = Math.ceil(s.tm);
      if (n > 0 && n !== this.lastCount) {
        this.lastCount = n;
        this.bigText(String(n), { size: 70, color: '#ffffff' }, now);
        play('tick');
      }
    }
    if (s.ph === 'aim' && prev !== 'aim') {
      this.trail = [];
      this.predS = this.sTarget = s.sy;
      this.predK = this.kTarget = this.geo.midY;
      this.charging = false;
      this.curve = 0;
      // mira padrão: centro do gol adversário (no celular nem precisa tocar para mirar)
      const shSide = this.sideOf(s.sh);
      if (shSide) this.aim = { x: keeperX(shSide === 'left' ? 'right' : 'left'), y: this.geo.midY };
      if (prev === 'countdown') {
        this.bigText('JÁ!', { size: 70, color: '#7cfc9a' }, now);
        play('go');
      }
    }
    // bipes nos últimos 3s do tempo de chute (só para quem chuta)
    if (s.ph === 'aim' && s.sh === this.me) {
      const c = Math.ceil(s.tm);
      if (c <= 3 && c > 0 && c !== this.lastClock) play('tick');
      this.lastClock = c;
    }
    if (s.ph !== 'aim' && this.charging) this.charging = false;
    this.prevPhase = s.ph;
  }

  onEvent(e, now) {
    const f = this.geo.f;
    const cx = f.x + f.w / 2;
    const cy = this.geo.midY - 40;
    if (e.kind === 'turn') {
      const mine = e.shooter === this.me;
      const keeperMine = this.isPlaying() && !mine;
      const title = mine ? 'SUA VEZ DE CHUTAR!' : keeperMine ? 'DEFENDA!' : `VEZ DE ${this.nickOf(e.shooter).toUpperCase()}`;
      this.bigText(title, { sub: `chute #${e.turn}`, size: 34, color: mine ? '#ffe14d' : '#9fd8ff' }, now);
      if (e.turn > 1) play('whistle');
      return;
    }
    if (e.kind === 'kick') {
      this.kick = { at: now, by: e.id };
      this.trail = [];
      play('kick');
      const p = this.game.players.get(e.id);
      const sweet = e.power >= GG.SWEET_MIN && e.power < GG.SWEET_MAX;
      if (p) {
        this.game.fx.add('text', {
          x: p.r.x, y: p.r.y - 105,
          text: `${Math.round(e.power * 100)}%${sweet ? ' ⭐ CHUTAÇO!' : ''}`,
          color: sweet ? '#ffe14d' : '#ffffff', size: sweet ? 20 : 16,
        }, now);
      }
      return;
    }
    if (e.kind === 'goal' || e.kind === 'own') {
      const own = e.kind === 'own';
      const scorer = this.nickOf(e.by);
      this.bigText(own ? 'GOL CONTRA?!' : 'GOOOOOL!', { sub: own ? 'que vergonha... ponto pra ' + scorer : `${scorer} marcou!`, size: 64, color: own ? '#ff6fb5' : '#ffe14d' }, now, cx, cy);
      const gx = e.side === 'left' ? f.x : f.x + f.w;
      this.game.fx.add('confetti', { x: gx, y: this.geo.midY }, now);
      this.game.shake(12, now);
      play('goal');
      play('crowd');
      return;
    }
    const fx = EVENT_FX[e.kind];
    if (!fx) return;
    const [text, color, sub, sound, shake] = fx;
    const x = e.x != null ? clamp(e.x, f.x + 120, f.x + f.w - 120) : cx;
    const y = e.y != null ? clamp(e.y - 50, f.y + 40, f.y + f.h - 40) : cy;
    this.bigText(text, { sub, color, size: 46 }, now, x, y);
    if (sound) play(sound);
    if (shake) this.game.shake(shake, now);
  }

  onEnd(m, now) {
    const won = m.winner === this.me;
    const lost = m.loser === this.me;
    const wo = m.reason === 'wo';
    this.hud.log(null, `🏆 ${m.winnerNick} venceu ${m.loserNick} no Gol a Gol${wo ? ' (W.O.)' : ''}`);
    this.hud.banner(`${m.winnerNick} VENCEU!`, wo ? `${m.loserNick} fugiu do jogo 🐔` : `Gol a Gol · ${m.turns} chute(s)`);
    this.match = null;
    this.reset();
    this.hud.ggBar(null);
    this.hud.ggHelp(null);
    if (!won && !lost) return;
    play(won ? 'win' : 'lose');
    const other = won ? m.loser : m.winner;
    const otherNick = won ? m.loserNick : m.winnerNick;
    clearTimeout(this.resultTimer);
    this.resultTimer = setTimeout(() => {
      if (this.isPlaying()) return; // já começou outra partida (ex.: revanche aceita rápido)
      this.hud.ggResult({
        won,
        title: won ? 'VOCÊ VENCEU!' : 'VOCÊ PERDEU!',
        sub: won
          ? (wo ? `${otherNick} fugiu do jogo 🐔` : `${otherNick} levou um frango 🐔`)
          : `${otherNick} fez o gol. Vai deixar barato?`,
        onRematch: () => this.game.send({ t: MSG.CHALLENGE, to: other, rematch: true }),
      });
    }, wo ? 200 : 1300);
    void now;
  }

  onInvite(msg) {
    play('invite');
    this.hud.log(null, msg.rematch ? `🔥 ${msg.nick} pediu revanche!` : `⚽ ${msg.nick} te desafiou para um Gol a Gol!`);
    this.hud.invite({
      from: msg.from,
      nick: msg.nick,
      rematch: msg.rematch,
      ttl: msg.ttl || GG.INVITE_TTL_MS,
      onAccept: () => this.game.send({ t: MSG.CHALLENGE_REPLY, from: msg.from, accept: true }),
      onDecline: () => this.game.send({ t: MSG.CHALLENGE_REPLY, from: msg.from, accept: false }),
    });
  }

  onStatus(m) {
    const nick = m.nick || 'O jogador';
    const text = {
      sent: `Desafio enviado para ${nick}! ⏳`,
      declined: `${nick} recusou o desafio 🐔`,
      expired: `Desafio com ${nick} expirou`,
      busy: `${nick} já está jogando`,
      field_busy: 'O campinho está ocupado! Espere a partida acabar.',
      gone: `${nick} saiu da praça`,
      invalid: 'Não dá para desafiar esse jogador',
    }[m.status];
    if (m.status === 'expired' || m.status === 'gone') this.hud.removeInvite(m.with);
    if (text) this.hud.toast(text);
  }

  // ---------- estado interpolado ----------

  sample(now) {
    const buf = this.buf;
    if (!buf.length) return null;
    const at = now - this.delay.get();
    let a = buf[0];
    let b = buf[0];
    for (let i = buf.length - 1; i > 0; i--) {
      if (buf[i - 1].at <= at) {
        a = buf[i - 1];
        b = buf[i];
        break;
      }
    }
    if (at >= buf[buf.length - 1].at) a = b = buf[buf.length - 1];
    const k = b.at > a.at ? clamp((at - a.at) / (b.at - a.at), 0, 1) : 1;
    const lerp = (x, y) => x + (y - x) * k;
    const same = a.ph === b.ph && a.sh === b.sh;
    const ball = b.b && a.b && same ? [lerp(a.b[0], b.b[0]), lerp(a.b[1], b.b[1]), lerp(a.b[2], b.b[2])] : b.b;
    const kp = (side) => (same && !b.k[side][1] && !a.k[side][1] ? [lerp(a.k[side][0], b.k[side][0]), 0, 0] : b.k[side]);
    return { ...b, b: ball, sy: same ? lerp(a.sy, b.sy) : b.sy, k: { left: kp('left'), right: kp('right') } };
  }

  // posição/pose dos dois jogadores (sobrescreve o snapshot normal da sala)
  avatarOverride(p, now) {
    const side = this.sideOf(p.id);
    if (!side) return null;
    const st = this.sample(now);
    if (!st) return null;
    const dir = attackDir(side);
    if (p.id === st.sh) {
      const y = p.id === this.me && this.predS != null && st.ph === 'aim' ? this.predS : st.sy;
      const kicking = this.kick.by === p.id && now - this.kick.at < 400;
      return { x: spotX(side) - dir * 24, y: y + 2, dir, moving: false, pose: kicking ? 'kick' : 'shooter', k: 0 };
    }
    const [ky, dive, diveT] = st.k[side];
    const y = p.id === this.me && this.predK != null && !dive ? this.predK : ky;
    let pose = 'keeper';
    if (dive) pose = diveT <= GG.DIVE_TIME ? (dive < 0 ? 'diveU' : 'diveD') : (dive < 0 ? 'lieU' : 'lieD');
    return { x: keeperX(side), y, dir, moving: false, pose, k: diveT / GG.DIVE_TIME };
  }

  // ---------- controles ----------

  // toque (celular): goleiro anda com toque/arraste e mergulha com toque duplo
  pointerDown(w, now, pointerType = 'mouse') {
    if (!this.isPlaying()) return false;
    if ((pointerType === 'touch' || this.touchMode) && this.role() === 'keeper') {
      const double = now - (this.lastTap || 0) < 320;
      this.lastTap = now;
      if (!double) return true;
    }
    const s = this.last;
    if (!s) return true;
    const role = this.role();
    if (role === 'shooter' && s.ph === 'aim' && !this.charging) {
      this.aim = { ...w };
      if (!this.touchMode) this.startCharge(now);
    } else if (role === 'keeper' && (s.ph === 'aim' || s.ph === 'flight')) {
      const ky = this.predK ?? this.geo.midY;
      this.game.send({ t: MSG.GG_INPUT, dive: w.y < ky ? -1 : 1 });
    }
    return true;
  }

  pointerMove(w) {
    if (!this.isPlaying()) return false;
    this.aim = { ...w };
    if (this.role() === 'keeper') {
      const mid = this.geo.midY;
      this.kTarget = clamp(w.y, mid - GG.KEEPER_RANGE, mid + GG.KEEPER_RANGE);
    }
    return true;
  }

  pointerUp(now) {
    if (this.charging) this.shoot(now);
  }

  wheel(ev) {
    if (this.role() !== 'shooter') return false;
    this.adjustCurve(ev.deltaY > 0 ? 0.25 : -0.25);
    return true;
  }

  adjustCurve(d) {
    this.curve = clamp(Math.round((this.curve + d) * 4) / 4, -1, 1);
  }

  startCharge(now) {
    this.charging = true;
    this.chargeStart = now;
    this.game.send({ t: MSG.GG_INPUT, charging: true });
  }

  currentCharge(now) {
    return chargeAt((now - this.chargeStart) / 1000);
  }

  shoot(now) {
    const side = this.sideOf(this.me);
    const bx = spotX(side);
    const by = this.predS ?? this.geo.midY;
    const angle = Math.atan2(this.aim.y - by, this.aim.x - bx);
    this.game.send({ t: MSG.GG_SHOOT, angle, power: this.currentCharge(now), curve: this.curve });
    this.charging = false;
  }

  // true = tecla consumida pelo minigame
  key(ev, down, now) {
    if (!this.isPlaying()) return false;
    const code = ev.code;
    const role = this.role();
    if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(code)) {
      if (down) this.held.add(code);
      else this.held.delete(code);
      return true;
    }
    if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].includes(code)) return true; // sem andar durante a partida
    if (down && (code === 'KeyQ' || code === 'KeyE') && role === 'shooter') {
      this.adjustCurve(code === 'KeyQ' ? -0.25 : 0.25);
      return true;
    }
    if (code === 'Space') {
      const s = this.last;
      if (role === 'shooter' && s?.ph === 'aim') {
        if (down && !this.charging && !ev.repeat) this.startCharge(now);
        else if (!down && this.charging) this.shoot(now);
      } else if (role === 'keeper' && down && !ev.repeat && s && (s.ph === 'aim' || s.ph === 'flight')) {
        const up = this.held.has('KeyW') || this.held.has('ArrowUp');
        const dn = this.held.has('KeyS') || this.held.has('ArrowDown');
        const ky = this.predK ?? this.geo.midY;
        const dir = up ? -1 : dn ? 1 : this.aim.y < ky ? -1 : 1;
        this.game.send({ t: MSG.GG_INPUT, dive: dir });
      }
      return true;
    }
    return false;
  }

  // ---------- por frame ----------

  update(dt, now) {
    if (!this.match) {
      this.hud.ggBar(null);
      return;
    }
    const s = this.last;
    this.updateBar(s);
    const role = this.role();
    this.hud.ggHelp(this.isPlaying() ? role : null, { onCurve: (d) => this.adjustCurve(d) });
    if (!s || !this.isPlaying()) return;

    const mid = this.geo.midY;
    const up = this.held.has('KeyW') || this.held.has('ArrowUp');
    const dn = this.held.has('KeyS') || this.held.has('ArrowDown');
    const keys = (dn ? 1 : 0) - (up ? 1 : 0);
    const kdir = keys || (Math.abs(this.axisY) > 0.15 ? this.axisY : 0);
    const mySide = this.sideOf(this.me);

    if (role === 'keeper') {
      const k = s.k[mySide];
      if (this.predK == null) this.predK = k[0];
      if (kdir) this.kTarget = clamp(this.predK + kdir * 40, mid - GG.KEEPER_RANGE, mid + GG.KEEPER_RANGE);
      if (k[1]) {
        this.predK = k[0]; // mergulhando: servidor manda
        this.kTarget = clamp(k[0], mid - GG.KEEPER_RANGE, mid + GG.KEEPER_RANGE);
      } else if (this.kTarget != null) {
        const step = GG.KEEPER_SPEED * (s.tired || 1) * dt;
        this.predK += clamp(this.kTarget - this.predK, -step, step);
        this.predK += (k[0] - this.predK) * Math.min(1, dt * 1.5); // correção suave
      }
    } else if (role === 'shooter' && s.ph === 'aim') {
      if (this.predS == null) this.predS = s.sy;
      if (kdir) this.sTarget = clamp(this.predS + kdir * 40, mid - GG.SPOT_RANGE, mid + GG.SPOT_RANGE);
      if (this.sTarget != null) {
        const step = GG.SHOOTER_SPEED * dt;
        this.predS += clamp(this.sTarget - this.predS, -step, step);
        this.predS += (s.sy - this.predS) * Math.min(1, dt * 1.5);
      }
    }

    if (now - this.lastSend > SEND_EVERY_MS) {
      const msg = {};
      if (role === 'keeper' && this.kTarget != null && Math.abs(this.kTarget - (this.sentK ?? -1)) > 0.5) msg.ky = Math.round(this.kTarget);
      if (role === 'shooter' && this.sTarget != null && Math.abs(this.sTarget - (this.sentS ?? -1)) > 0.5) msg.sy = Math.round(this.sTarget);
      if (Object.keys(msg).length) {
        this.game.send({ t: MSG.GG_INPUT, ...msg });
        if (msg.ky != null) this.sentK = msg.ky;
        if (msg.sy != null) this.sentS = msg.sy;
        this.lastSend = now;
      }
    }
  }

  updateBar(s) {
    const m = this.match;
    const sh = s?.sh;
    let info = 'Preparando...';
    if (s?.ph === 'countdown') info = 'Começando...';
    else if (s?.ph === 'aim') info = `Chute #${s.turn} · vez de ${this.nickOf(sh)} · ⏱ ${Math.ceil(s.tm)}s`;
    else if (s?.ph === 'flight') info = `Chute #${s.turn} · lá vai a bola!`;
    else if (s?.ph === 'result') info = `Chute #${s.turn}`;
    if (s && s.tired < 1) info += ' · 😮‍💨 goleiros cansados';
    if (!this.touchMode) info += ' · primeiro gol vence';
    else info = info.replace(' · vez de ', ' · ').replace('Chute #', '#');
    const key = `${m.left.id}|${m.right.id}|${sh}|${info}`;
    if (key === this.barKey) return;
    this.barKey = key;
    this.hud.ggBar({
      left: { nick: m.left.nick, cls: 'red', shooting: sh === m.left.id },
      right: { nick: m.right.nick, cls: 'blue', shooting: sh === m.right.id },
      info,
    });
  }

  cameraTarget(vw, vh) {
    if (!this.isPlaying()) return null;
    const f = this.geo.f;
    // no celular as bordas são ocupadas por botões, então a margem é menor
    const landscape = vw > vh;
    const [padX, padY] = this.touchMode ? (landscape ? [90, 200] : [90, 150]) : [220, 330];
    const z = clamp(Math.min(vw / (f.w + padX), vh / (f.h + padY)), 0.4, 1.25);
    return { x: f.x + f.w / 2, y: this.geo.midY - 25, z };
  }

  // ---------- desenho ----------

  bigText(text, opts, now, x, y) {
    const f = this.geo.f;
    const bx = x ?? f.x + f.w / 2;
    let by = y ?? this.geo.midY - 60;
    // empilha textos que aparecem quase juntos no mesmo lugar (ex.: "JÁ!" + "SUA VEZ")
    const near = this.game.fx.items.filter((it) => it.kind === 'big' && Math.abs(it.x - bx) < 220 && Math.abs(it.y - by) < 90);
    const fresh = near.filter((it) => now - it.born < 400);
    if (fresh.length) by = Math.max(...fresh.map((it) => it.y)) + 80;
    // os mais antigos saem de cena rápido para não embolar
    for (const it of near) if (now - it.born >= 400 && now - it.born < 1400) it.born = now - 1400;
    this.game.fx.add('big', { x: bx, y: by, text, ...opts }, now);
  }

  ballSprite(now, t) {
    if (!this.match) return null;
    const st = this.sample(now);
    if (!st) return null;
    let x;
    let y;
    let z = 0;
    if (st.ph === 'countdown' || st.ph === 'aim') {
      const side = this.sideOf(st.sh);
      x = spotX(side);
      y = st.sh === this.me && this.predS != null && st.ph === 'aim' ? this.predS : st.sy;
    } else if (st.b) {
      [x, y, z] = st.b;
    } else return null;
    // rastro a partir das posições já desenhadas
    if (st.ph === 'flight' && now - (this.trailAt || 0) > 25) {
      this.trailAt = now;
      this.trail.push([x, y, z]);
      if (this.trail.length > 8) this.trail.shift();
    }
    return {
      y,
      draw: (ctx) => {
        if (st.ph === 'flight') {
          this.trail.forEach(([tx, ty, tz], i) => {
            ctx.globalAlpha = ((i + 1) / this.trail.length) * 0.35;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(tx, ty - GG.BALL_R - tz, GG.BALL_R * (0.5 + i / 16), 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
        }
        drawBall(ctx, x, y, t, false, z);
      },
    };
  }

  drawOverlay(ctx, now) {
    if (!this.match) return;
    const st = this.sample(now);
    if (!st) return;
    const mid = this.geo.midY;
    const role = this.role();
    const mySide = this.sideOf(this.me);

    // faixa onde o goleiro (eu) pode andar
    if (role === 'keeper' && st.ph !== 'result') {
      const kx = keeperX(mySide);
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(255,225,77,0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(kx, mid - GG.KEEPER_RANGE - 20);
      ctx.lineTo(kx, mid + GG.KEEPER_RANGE + 20);
      ctx.stroke();
      ctx.restore();
    }

    const shSide = this.sideOf(st.sh);
    if (!shSide) return;
    const bx = spotX(shSide);
    const by = st.sh === this.me && this.predS != null ? this.predS : st.sy;

    // mira com trajetória prevista (só quem chuta vê)
    if (role === 'shooter' && st.ph === 'aim') {
      const power = this.charging ? this.currentCharge(now) : 0.8;
      const angle = Math.atan2(this.aim.y - by, this.aim.x - bx);
      const pts = predictPath(bx, by, angle, power, this.curve, 0.42);
      ctx.save();
      pts.forEach(([px, py, pz], i) => {
        if (i % 3) return;
        ctx.globalAlpha = 1 - i / pts.length;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py - pz, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
      // mira
      ctx.strokeStyle = '#e8412b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 12, 0, Math.PI * 2);
      ctx.moveTo(this.aim.x - 18, this.aim.y);
      ctx.lineTo(this.aim.x + 18, this.aim.y);
      ctx.moveTo(this.aim.x, this.aim.y - 18);
      ctx.lineTo(this.aim.x, this.aim.y + 18);
      ctx.stroke();
      if (this.curve) {
        outlinedText(ctx, `efeito ${this.curve > 0 ? '↻' : '↺'} ${Math.abs(this.curve * 100)}%`, bx, by + 34, { size: 15, fill: '#ffe14d', lw: 4 });
      }
    }

    // barra de força acima de quem chuta
    if (st.ph === 'aim' && (role === 'shooter' || st.ch)) {
      const w = 110;
      const h = 16;
      const x0 = bx - attackDir(shSide) * 24 - w / 2;
      const y0 = by - 150;
      roundRect(ctx, x0 - 3, y0 - 3, w + 6, h + 6, 6);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.fillStyle = '#444';
      ctx.fillRect(x0, y0, w, h);
      // zona perfeita e zona de isolar
      ctx.fillStyle = 'rgba(255,225,77,0.45)';
      ctx.fillRect(x0 + w * GG.SWEET_MIN, y0, w * (GG.SWEET_MAX - GG.SWEET_MIN), h);
      ctx.fillStyle = 'rgba(232,65,43,0.55)';
      ctx.fillRect(x0 + w * GG.SWEET_MAX, y0, w * (1 - GG.SWEET_MAX), h);
      let v;
      if (role === 'shooter') v = this.charging ? this.currentCharge(now) : 0;
      else v = chargeAt(now / 1000); // quem assiste não sabe a força real
      const col = v >= GG.SWEET_MAX ? '#e8412b' : v >= GG.SWEET_MIN ? '#ffe14d' : '#7cfc9a';
      ctx.fillStyle = col;
      ctx.fillRect(x0, y0, w * v, h);
      outlinedText(ctx, '⭐', x0 + w * ((GG.SWEET_MIN + GG.SWEET_MAX) / 2), y0 - 10, { size: 13, lw: 3 });
      outlinedText(ctx, 'FORÇA', x0 - 30, y0 + h / 2, { size: 12, lw: 3 });
    }

    // relógio do chute
    if (st.ph === 'aim') {
      const c = Math.ceil(st.tm);
      outlinedText(ctx, `⏱ ${c}`, bx - attackDir(shSide) * 24, by - 175, { size: 18, fill: c <= 3 ? '#ff5a44' : '#ffffff', lw: 4 });
    }
  }
}
