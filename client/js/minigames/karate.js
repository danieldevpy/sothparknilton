// Cliente do minigame Karatê: convites, cena do Dojo (separada da praça), predição
// do próprio lutador, interpolação do oponente, controles (teclado/toque), HUD de
// vida/rounds/dash, efeitos (faíscas, textos, tremida, "hit-stop"), sensei e revanche.
//
// Enquanto você luta, o Game para de desenhar a praça e chama `draw()` daqui.
// Quem está na praça só vê os lutadores sumirem (pose 'dojo') e o resultado no chat.

import { MSG } from '/shared/constants.js';
import { KT, MOVES, isFree, walkStep, dashVector, clamp, clampArena } from '/shared/karate.js';
import { FxLayer } from '../render/fx.js';
import { drawFighter, FIGHTER_TOP } from '../render/fighter.js';
import { prerenderDojo, drawSensei, drawGong, DOJO, SENSEI } from '../render/dojo.js';
import { outlinedText, roundRect, FONT, INK } from '../render/paint.js';
import { play } from '../audio.js';
import { AdaptiveDelay } from '../jitter.js';

const STATE_DELAY_MS = 60; // mínimo; cresce sozinho se a rede tiver jitter
const RESEND_MS = 150;

const ACTION_KEYS = {
  KeyJ: 'jab', KeyZ: 'jab',
  KeyU: 'punch', KeyX: 'punch',
  KeyK: 'kick', KeyC: 'kick',
  KeyI: 'hkick', KeyV: 'hkick',
};
const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};
const BLOCK_KEYS = new Set(['ShiftLeft', 'ShiftRight', 'KeyL']);

// ajuda: [teclas, nome, vantagem]
const HELP = [
  ['J', 'Z', 'jab'],
  ['U', 'X', 'punch'],
  ['K', 'C', 'kick'],
  ['I', 'V', 'hkick'],
];

const SENSEI_LINES = {
  round1: 'Respire... e bata.',
  round: 'De novo! Com espírito!',
  final: 'ROUND FINAL! Sem medo!',
  parry: 'Defesa perfeita! Muito bem.',
  guardbreak: 'A guarda não é um muro!',
  whiff: 'Hmm... chutou o vento.',
  counter: 'Contra-ataque! Bom olho.',
  combo: 'Que combo!',
  perfect: 'PERFEITO. Nem suou.',
  ko: 'Fim do round.',
  time: 'Tempo!',
  dash: 'Rápido como o vento...',
  stale: 'Previsível! Varie os golpes.',
};

export class KarateClient {
  constructor(game, hud) {
    this.game = game;
    this.hud = hud;
    this.busy = new Map(); // playerId -> fightId (quem está lutando em algum dojo)
    this.fight = null; // minha luta: { id, a, b }
    this.fx = new FxLayer();
    this.bg = null;
    this.held = new Set();
    this.stick = { x: 0, y: 0 }; // joystick do celular
    this.touchBlock = false;
    this.ui = null;
    this.delay = new AdaptiveDelay({ interval: 1000 / 30, min: STATE_DELAY_MS, max: 240 });
    this.reset();
  }

  reset() {
    this.buf = [];
    this.last = null;
    this.views = null;
    this.pred = null;
    this.localAct = null;
    this.localDash = null;
    this.sent = { mx: 0, my: 0, block: false, at: 0 };
    this.cam = { x: 0, y: 0, z: 1, ready: false };
    this.shakeAmp = 0;
    this.shakeAt = 0;
    this.hitstopUntil = 0;
    this.flash = new Map();
    this.hpShow = new Map();
    this.walk = new Map();
    this.ghosts = [];
    this.ghostAt = new Map();
    this.parts = [];
    this.says = new Map();
    this.sensei = null;
    this.senseiAt = 0;
    this.gongAt = -1e9;
    this.lastBeep = null;
    this.clockShown = null;
    this.fx.items = [];
  }

  // ---------- consultas ----------

  get me() {
    return this.game.me;
  }

  active() {
    return !!this.fight;
  }

  // jogador está lutando num dojo (some da praça)
  hidden(id) {
    return this.busy.has(id);
  }

  nickOf(id) {
    const f = this.fight;
    if (f?.a.id === id) return f.a.nick;
    if (f?.b.id === id) return f.b.nick;
    return this.game.players.get(id)?.nick ?? '?';
  }

  oppId() {
    const f = this.fight;
    return f.a.id === this.me ? f.b.id : f.a.id;
  }

  challenge(pid) {
    this.game.send({ t: MSG.CHALLENGE, to: pid, game: 'karate' });
  }

  // ---------- rede ----------

  onMessage(msg, now) {
    switch (msg.t) {
      case MSG.WELCOME:
        this.busy.clear();
        for (const f of msg.fights || []) this.markBusy(f);
        return false; // o Game também processa
      case MSG.KT_START: this.onStart(msg, now); return true;
      case MSG.KT_STATE: this.onState(msg, now); return true;
      case MSG.KT_EVENT: this.onEvent(msg, now); return true;
      case MSG.KT_END: this.onEnd(msg); return true;
      case MSG.CHALLENGE:
        if (msg.game !== 'karate') return false;
        this.onInvite(msg);
        return true;
      case MSG.CH_STATUS:
        if (msg.game !== 'karate') return false;
        this.onStatus(msg);
        return true;
      default:
        return false;
    }
  }

  markBusy(f) {
    this.busy.set(f.a.id, f.id);
    this.busy.set(f.b.id, f.id);
  }

  onStart(m, now) {
    this.markBusy(m);
    this.hud.log(null, `🥋 ${m.a.nick} e ${m.b.nick} foram lutar no Dojo!`);
    if (m.a.id !== this.me && m.b.id !== this.me) return;
    this.fight = { id: m.id, a: m.a, b: m.b };
    this.reset();
    this.enter();
    play('kt_gong');
    void now;
  }

  onState(s, now) {
    if (!this.fight || s.f.length !== 2) return;
    s.at = now;
    this.delay.arrive(now);
    s.by = {};
    for (const f of s.f) {
      s.by[f[0]] = { id: f[0], x: f[1], y: f[2], dir: f[3], st: f[4], t: f[5], hp: f[6], dashCd: f[7], slowT: f[8], combo: f[9], moving: !!f[10] };
    }
    this.buf.push(s);
    if (this.buf.length > 12) this.buf.shift();
    this.last = s;
    // bipes nos últimos 5 s do round
    if (s.ph === 'fight') {
      const c = Math.ceil(s.tm);
      if (c <= 5 && c > 0 && c !== this.lastBeep) play('tick');
      this.lastBeep = c;
    }
  }

  onEvent(e, now) {
    if (!this.fight) return;
    const mine = e.by === this.me;
    const W = KT.ARENA_W;
    const top = KT.ARENA_H / 2 - 150;
    switch (e.kind) {
      case 'round': {
        this.pred = null;
        this.localDash = null;
        this.localAct = null;
        const final = e.wins.every((w) => w === KT.ROUNDS_TO_WIN - 1);
        this.big(final ? 'ROUND FINAL' : `ROUND ${e.round}`, { size: 62, color: final ? '#ff6a4d' : '#ffffff', sub: `${e.wins[0]} × ${e.wins[1]}` }, now, W / 2, top);
        this.say(final ? SENSEI_LINES.final : e.round === 1 ? SENSEI_LINES.round1 : SENSEI_LINES.round, now, true);
        play('kt_gong');
        this.gongAt = now;
        break;
      }
      case 'fight':
        this.big('LUTEM!', { size: 74, color: '#ffe14d' }, now, W / 2, top + 10);
        play('go');
        break;
      case 'hit': this.onHit(e, now); break;
      case 'block':
        this.spark('ring', e.x, e.y - 52, now, '#9fd8ff');
        this.text('defendeu', e.x, e.y - 100, '#9fd8ff', now, 15);
        play('kt_block');
        this.shake(2, now);
        break;
      case 'guardbreak':
        this.spark('burst', e.x, e.y - 52, now, '#ff9a3c', 1.5);
        this.big('QUEBROU A GUARDA!', { size: 40, color: '#ff9a3c' }, now, e.x, e.y - 160);
        this.num(e.dmg, e.x, e.y - 90, now);
        this.flashOn(e.to, now);
        this.say(SENSEI_LINES.guardbreak, now);
        play('kt_break');
        this.shake(9, now);
        this.hitstop(now, 110);
        break;
      case 'parry':
        this.spark('ring', e.x, e.y - 52, now, '#ffffff', 1.6);
        this.big('DEFESA PERFEITA!', { size: 40, color: '#7cfc9a', sub: e.by === this.me ? 'ele ficou tonto — ataque!' : 'você ficou tonto!' }, now, e.x, e.y - 160);
        this.say(SENSEI_LINES.parry, now);
        play('kt_parry');
        this.hitstop(now, 160);
        break;
      case 'whiff':
        if (e.m === 'hkick' || e.m === 'punch') {
          const f = this.views?.find((v) => v.id === e.by);
          if (f) this.text(e.m === 'hkick' ? 'ERROU FEIO!' : 'errou!', f.x, f.y - 120, '#dddddd', now, 16);
          if (e.m === 'hkick' && Math.random() < 0.5) this.say(SENSEI_LINES.whiff, now);
        }
        break;
      case 'dash': {
        const f = this.views?.find((v) => v.id === e.by);
        if (f) this.spark('dust', f.x, f.y, now, '#e9dcc2');
        if (!mine) play('kt_dash');
        break;
      }
      case 'ko': this.onKo(e, now); break;
      default:
        break;
    }
  }

  onHit(e, now) {
    const m = MOVES[e.m];
    const heavy = e.m === 'punch' || e.m === 'hkick' || e.counter || e.kd;
    this.spark('burst', e.x, e.y - (e.m === 'hkick' ? 70 : e.m === 'kick' ? 35 : 55), now, heavy ? '#ffe14d' : '#ffffff', heavy ? 1.4 : 1);
    this.num(e.dmg, e.x, e.y - 95, now, e.counter || e.dash);
    this.flashOn(e.to, now);
    const tags = [];
    if (e.counter) tags.push('CONTRA-ATAQUE!');
    if (e.dash) tags.push('INVESTIDA!');
    if (e.kd) tags.push(e.combo >= KT.COMBO_MAX ? 'COMBO FINAL!' : 'DERRUBOU!');
    if (tags.length) this.big(tags.join(' '), { size: 34, color: e.counter ? '#ff6fb5' : '#ffb347' }, now, e.x, e.y - 150);
    if (e.combo >= 2) this.text(`${e.combo} HITS!`, e.x + (e.by === this.me ? 0 : 0), e.y - 125, '#ffe14d', now, 20);
    if (e.slow) this.text('perna bamba 🦵', e.x, e.y - 20, '#ffd0a0', now, 14);
    if (e.stale) this.text('previsível... 🥱', e.x, e.y - 60, '#cccccc', now, 14);
    if (e.stale && e.by === this.me) this.say(SENSEI_LINES.stale, now);
    else if (e.counter && Math.random() < 0.6) this.say(SENSEI_LINES.counter, now);
    else if (e.combo >= 3) this.say(SENSEI_LINES.combo, now);
    play(heavy ? 'kt_heavy' : 'kt_hit');
    if (e.kd) setTimeout(() => play('kt_down'), 250);
    this.shake(heavy ? 8 : 3, now);
    this.hitstop(now, heavy ? 95 : 50);
    void m;
  }

  onKo(e, now) {
    const W = KT.ARENA_W;
    const time = e.reason === 'time';
    const winner = this.nickOf(e.winner);
    this.big(time ? 'TEMPO!' : 'K.O.!', {
      size: 90, color: time ? '#ffffff' : '#ff4d3a',
      sub: e.perfect ? `${winner} — PERFEITO! ✨` : `${winner} vence o round`,
    }, now, W / 2, KT.ARENA_H / 2 - 150);
    this.say(e.perfect ? SENSEI_LINES.perfect : time ? SENSEI_LINES.time : SENSEI_LINES.ko, now, true);
    play('kt_gong');
    this.gongAt = now;
    this.shake(time ? 0 : 14, now);
    this.hitstop(now, time ? 0 : 400);
    if (!time) setTimeout(() => play(e.winner === this.me ? 'goal' : 'boo'), 500);
  }

  onEnd(m) {
    this.busy.delete(m.winner);
    this.busy.delete(m.loser);
    const wo = m.reason === 'wo';
    this.hud.log(null, `🥋 ${m.winnerNick} venceu ${m.loserNick} no Karatê (${m.score[0]}×${m.score[1]})${wo ? ' — W.O.' : ''}`);
    const won = m.winner === this.me;
    const lost = m.loser === this.me;
    if (!this.fight || this.fight.id !== m.id) return;
    const delay = wo ? 300 : 900;
    clearTimeout(this.leaveTimer);
    this.leaveTimer = setTimeout(() => {
      this.leave();
      if (!won && !lost) return;
      play(won ? 'win' : 'lose');
      const other = won ? m.loser : m.winner;
      const otherNick = won ? m.loserNick : m.winnerNick;
      this.hud.ggResult({
        won,
        title: won ? 'VOCÊ VENCEU A LUTA! 🥋' : 'VOCÊ PERDEU A LUTA!',
        sub: won
          ? (wo ? `${otherNick} fugiu do dojo 🐔` : `${m.score[0]}×${m.score[1]} em cima de ${otherNick}. Faixa preta!`)
          : `${otherNick} venceu por ${m.score[0]}×${m.score[1]}. Vai treinar e voltar?`,
        onRematch: () => this.game.send({ t: MSG.CHALLENGE, to: other, rematch: true, game: 'karate' }),
      });
    }, delay);
  }

  onInvite(msg) {
    play('invite');
    this.hud.log(null, msg.rematch ? `🔥 ${msg.nick} quer REVANCHE no karatê!` : `🥋 ${msg.nick} te desafiou para uma luta de Karatê!`);
    this.hud.invite({
      from: msg.from,
      nick: msg.nick,
      rematch: msg.rematch,
      ttl: msg.ttl || KT.INVITE_TTL_MS,
      title: msg.rematch ? `🔥 ${msg.nick} quer REVANCHE no dojo!` : `🥋 ${msg.nick} te chamou pra luta!`,
      sub: 'Karatê 1x1 no Dojo — melhor de 3',
      onAccept: () => this.game.send({ t: MSG.CHALLENGE_REPLY, from: msg.from, accept: true }),
      onDecline: () => this.game.send({ t: MSG.CHALLENGE_REPLY, from: msg.from, accept: false }),
    });
  }

  onStatus(m) {
    const nick = m.nick || 'O jogador';
    const text = {
      sent: `Desafio de karatê enviado para ${nick}! 🥋⏳`,
      declined: `${nick} fugiu da luta 🐔`,
      expired: `Desafio de karatê com ${nick} expirou`,
      busy: `${nick} está ocupado jogando`,
      gone: `${nick} saiu da praça`,
      invalid: 'Não dá para desafiar esse jogador',
    }[m.status];
    if (m.status === 'expired' || m.status === 'gone') this.hud.removeInvite(m.with);
    if (text) this.hud.toast(text);
  }

  onChat(msg, now) {
    if (!this.fight || (msg.id !== this.fight.a.id && msg.id !== this.fight.b.id)) return;
    this.says.set(msg.id, { text: msg.text, until: now + Math.min(4000, 1500 + msg.text.length * 60) });
  }

  // ---------- entrar/sair da cena ----------

  enter() {
    document.body.classList.add('kt-on');
    this.hud.closePlayerCard();
    this.hud.clearInvites();
    this.hud.closeGgResult();
    clearTimeout(this.leaveTimer);
    this.game.dest = null;
    this.held.clear();
    this.buildUi();
  }

  leave() {
    this.fight = null;
    this.reset();
    document.body.classList.remove('kt-on');
    if (this.ui) this.ui.hidden = true;
  }

  buildUi() {
    if (this.ui) {
      this.ui.hidden = false;
      return;
    }
    const ui = document.createElement('div');
    ui.id = 'kt-ui';
    // textos fixos (nada vindo de usuário)
    const moves = HELP.map(([k1, k2, id]) => `
      <div class="kt-move" data-a="${id}">
        <span class="kt-keys"><kbd>${k1}</kbd><kbd>${k2}</kbd></span>
        <b>${MOVES[id].name}</b><small>${MOVES[id].perk}</small>
      </div>`).join('');
    ui.innerHTML = `
      <div id="kt-help">
        ${moves}
        <div class="kt-move"><span class="kt-keys"><kbd>Shift</kbd><kbd>L</kbd></span><b>Defesa</b><small>segure · na hora H = perfeita</small></div>
        <div class="kt-move"><span class="kt-keys"><kbd>Espaço</kbd></span><b>Dash</b><small>a cada 3 s · atravessa golpes</small></div>
        <div class="kt-tip">WASD/setas andam · golpe logo após o dash = INVESTIDA · repetir o mesmo golpe = PREVISÍVEL (menos dano)</div>
      </div>
      <div id="kt-touch">
        <div class="kt-stick"><div class="kt-knob"></div></div>
        <div class="kt-pad">
          <button data-a="punch" class="kt-b kt-punch">👊<small>forte</small></button>
          <button data-a="hkick" class="kt-b kt-hkick">🦶<small>forte</small></button>
          <button data-a="jab" class="kt-b kt-jab">👊<small>fraco</small></button>
          <button data-a="kick" class="kt-b kt-kick">🦶<small>fraco</small></button>
          <button data-a="dash" class="kt-b kt-dash">💨<small>dash</small><i></i></button>
          <button class="kt-b kt-block">🛡️<small>defesa</small></button>
        </div>
      </div>`;
    document.body.appendChild(ui);
    this.ui = ui;
    this.setupTouch(ui);
  }

  setupTouch(ui) {
    const stick = ui.querySelector('.kt-stick');
    const knob = ui.querySelector('.kt-knob');
    let origin = null;
    const R = 46;
    const move = (ev) => {
      if (!origin || ev.pointerId !== origin.id) return;
      let dx = ev.clientX - origin.x;
      let dy = ev.clientY - origin.y;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.stick = { x: dx / R, y: dy / R };
    };
    const end = (ev) => {
      if (!origin || ev.pointerId !== origin.id) return;
      origin = null;
      knob.style.transform = '';
      this.stick = { x: 0, y: 0 };
    };
    stick.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      const r = stick.getBoundingClientRect();
      origin = { id: ev.pointerId, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      try { stick.setPointerCapture(ev.pointerId); } catch { /* ok */ }
      move(ev);
    });
    stick.addEventListener('pointermove', move);
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    for (const b of ui.querySelectorAll('.kt-b[data-a]')) {
      b.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        this.action(b.dataset.a, performance.now());
      });
    }
    const blk = ui.querySelector('.kt-block');
    const setBlock = (on) => (ev) => { ev.preventDefault(); this.touchBlock = on; blk.classList.toggle('on', on); };
    blk.addEventListener('pointerdown', setBlock(true));
    blk.addEventListener('pointerup', setBlock(false));
    blk.addEventListener('pointercancel', setBlock(false));
    blk.addEventListener('pointerleave', setBlock(false));
    ui.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }

  // ---------- controles ----------

  // true = tecla consumida pela luta
  key(ev, down, now) {
    if (!this.fight) return false;
    const code = ev.code;
    if (MOVE_KEYS[code] || BLOCK_KEYS.has(code)) {
      if (down) this.held.add(code);
      else this.held.delete(code);
      return true;
    }
    if (ACTION_KEYS[code] || code === 'Space') {
      if (down && !ev.repeat) this.action(ACTION_KEYS[code] || 'dash', now);
      return true;
    }
    // emotes/outras teclas não fazem nada no dojo
    return /^(Digit|Key)/.test(code);
  }

  pointerDown(ev) {
    if (!this.fight || ev.pointerType === 'touch') return;
    if (ev.button === 0) this.action('jab', performance.now());
    else if (ev.button === 2) this.action('kick', performance.now());
  }

  clearKeys() {
    this.held.clear();
  }

  axis() {
    let mx = 0;
    let my = 0;
    for (const code of this.held) {
      const d = MOVE_KEYS[code];
      if (d) { mx += d[0]; my += d[1]; }
    }
    if (!mx && !my && Math.hypot(this.stick.x, this.stick.y) > 0.2) {
      mx = this.stick.x;
      my = this.stick.y;
    }
    const n = Math.hypot(mx, my);
    if (n > 1) { mx /= n; my /= n; }
    return [Math.round(mx * 100) / 100, Math.round(my * 100) / 100];
  }

  blocking() {
    return this.touchBlock || [...this.held].some((c) => BLOCK_KEYS.has(c));
  }

  action(a, now) {
    const s = this.last;
    if (!s || s.ph !== 'fight') return;
    const [mx, my] = this.axis();
    this.game.send({ t: MSG.KT_ACT, a, dx: mx, dy: my });
    const me = s.by[this.me];
    if (!me || !isFree(me.st)) return;
    // previsão local: começa a animar já (o servidor confirma em seguida)
    if (a === 'dash') {
      const cd = me.dashCd - (now - s.at) / 1000;
      if (cd > 0.05 || this.localDash) return;
      const [dx, dy] = dashVector(mx, my, this.views?.find((v) => v.id === this.me)?.dir ?? me.dir);
      this.localDash = { at: now, dx, dy };
      this.spark('dust', this.pred?.x ?? me.x, this.pred?.y ?? me.y, now, '#e9dcc2');
      play('kt_dash');
    } else if (!this.localAct) {
      this.localAct = { a, at: now };
      play('kt_swing');
    }
  }

  sendInput(now) {
    const [mx, my] = this.axis();
    const block = this.blocking();
    const changed = mx !== this.sent.mx || my !== this.sent.my || block !== this.sent.block;
    const active = mx || my || block;
    if (!changed && !(active && now - this.sent.at > RESEND_MS)) return;
    this.game.send({ t: MSG.KT_INPUT, mx, my, block });
    this.sent = { mx, my, block, at: now };
  }

  // ---------- por frame ----------

  frame(dt, now) {
    if (!this.fight) return;
    this.sendInput(now);
    this.fx.update(now);
    this.parts = this.parts.filter((p) => now - p.born < p.life);
    this.ghosts = this.ghosts.filter((g) => now - g.born < 220);
    if (this.last && now >= this.hitstopUntil) this.updateViews(dt, now);
    if (this.views) this.updateCamera(dt);
    this.updateHud();
    this.draw(this.game.ctx, now);
  }

  sample(now) {
    const buf = this.buf;
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
    return { a, b, k, at };
  }

  updateViews(dt, now) {
    const s = this.last;
    const meS = s.by[this.me];
    const oppId = this.oppId();
    // oponente: interpolado com atraso
    const { a, b, k, at } = this.sample(now);
    const oa = a.by[oppId];
    const ob = b.by[oppId];
    const opp = { ...ob, x: oa.x + (ob.x - oa.x) * k, y: oa.y + (ob.y - oa.y) * k, t: ob.t + Math.max(0, at - b.at) / 1000 };
    // buffer vazio (rede engasgou): continua o movimento por até 100 ms em vez de congelar
    const prevS = this.buf[this.buf.length - 2];
    if (a === b && at > b.at && prevS?.by[oppId] && b.at > prevS.at) {
      const e = Math.min(at - b.at, 100) / (b.at - prevS.at);
      opp.x += (ob.x - prevS.by[oppId].x) * e;
      opp.y += (ob.y - prevS.by[oppId].y) * e;
      clampArena(opp);
    }

    // eu: previsão local
    const age = (now - s.at) / 1000;
    if (!this.pred) this.pred = { x: meS.x, y: meS.y, slowT: 0, block: false };
    const p = this.pred;
    p.slowT = meS.slowT;
    p.block = meS.st === 'block';
    let st = meS.st;
    let t = meS.t + age;
    const ld = this.localDash;
    if (ld) {
      const lt = (now - ld.at) / 1000;
      if (meS.st !== 'dash' && meS.st !== 'idle' && meS.st !== 'walk' && meS.st !== 'block') this.localDash = null; // levou golpe
      else if (lt <= KT.DASH_TIME) {
        const sp = KT.DASH_DIST / KT.DASH_TIME;
        p.x += ld.dx * sp * dt;
        p.y += ld.dy * sp * KT.DEPTH_MUL * dt;
        clampArena(p);
        st = 'dash';
        t = lt;
      } else if (lt > KT.DASH_TIME + 0.3) this.localDash = null;
    }
    const la = this.localAct;
    if (la) {
      // espera a confirmação do servidor por pelo menos um "ping" (rede lenta não repete a animação)
      const wait = Math.max(300, (this.game.rtt || 0) + 150);
      if (meS.st === la.a || (!isFree(meS.st) && meS.st !== 'dash') || now - la.at > wait) this.localAct = null;
      else {
        st = la.a;
        t = (now - la.at) / 1000;
      }
    }
    const [mx, my] = this.axis();
    if (!this.localDash && !this.localAct && s.ph === 'fight' && isFree(meS.st)) {
      const moved = walkStep(p, mx, my, dt);
      const ex = meS.x - p.x;
      const ey = meS.y - p.y;
      const err = Math.hypot(ex, ey);
      // andando, o servidor está "atrás" de nós uns rtt/2 × velocidade: isso não é erro
      const lag = KT.SPEED * ((this.game.rtt || 0) / 1000) * 0.6;
      if (err > 90 + lag) { p.x = meS.x; p.y = meS.y; }
      else {
        const g = moved ? (err > 28 + lag ? 3 : 0) : 6;
        p.x += ex * Math.min(1, dt * g);
        p.y += ey * Math.min(1, dt * g);
      }
      st = this.blocking() ? 'block' : moved ? 'walk' : 'idle';
      if (meS.st === 'block' && !this.blocking()) st = moved ? 'walk' : 'idle';
    } else if (!this.localDash) {
      const g = Math.min(1, dt * 16);
      p.x += (meS.x - p.x) * g;
      p.y += (meS.y - p.y) * g;
    }
    let dir = meS.dir;
    if (isFree(st) || st === 'dash') dir = opp.x > p.x ? 1 : -1;
    if (MOVES[st] && this.localAct) dir = opp.x > p.x ? 1 : -1;
    const mine = { ...meS, x: p.x, y: p.y, st, t, dir, moving: st === 'walk' };

    this.views = [mine, opp];
    for (const v of this.views) {
      const w = (this.walk.get(v.id) || 0) + (v.moving || v.st === 'walk' ? dt * 14 : 0);
      this.walk.set(v.id, w);
      v.phase = w;
      if (v.st === 'dash' && now - (this.ghostAt.get(v.id) || 0) > 30) {
        this.ghosts.push({ ...v, born: now });
        this.ghostAt.set(v.id, now);
      }
      // barra de vida "atrasada"
      const show = this.hpShow.get(v.id) ?? v.hp;
      this.hpShow.set(v.id, show > v.hp ? Math.max(v.hp, show - dt * 45) : v.hp);
    }
  }

  updateCamera(dt) {
    const { vw, vh } = this.game;
    const [a, b] = this.views;
    const span = Math.abs(a.x - b.x);
    const mobile = document.body.classList.contains('mobile');
    const viewW = clamp(span + (mobile ? 420 : 560), mobile ? 600 : 720, 1150);
    const viewH = mobile ? 470 : 610;
    const tz = clamp(Math.min(vw / viewW, vh / viewH), 0.32, 1.6);
    const cam = this.cam;
    cam.z = cam.ready ? cam.z + (tz - cam.z) * Math.min(1, dt * 3) : tz;
    const w = vw / cam.z;
    const h = vh / cam.z;
    const mid = (a.x + b.x) / 2;
    const lo = -DOJO.MX + w / 2;
    const hi = KT.ARENA_W + DOJO.MX - w / 2;
    const cx = lo < hi ? clamp(mid, lo, hi) : KT.ARENA_W / 2;
    // tatame inteiro visível acima da ajuda/chat, com um pedaço da parede do dojo
    const cy = KT.ARENA_H / 2 - 70 + (mobile ? 45 : 0);
    const tx = cx - w / 2;
    const ty = cy - h / 2;
    if (!cam.ready) { cam.x = tx; cam.y = ty; cam.ready = true; }
    const k = Math.min(1, dt * 5);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
  }

  updateHud() {
    if (!this.ui || !this.last) return;
    const me = this.last.by[this.me];
    if (!me) return;
    const dash = this.ui.querySelector('.kt-dash');
    const cd = Math.max(0, me.dashCd - (performance.now() - this.last.at) / 1000);
    dash.classList.toggle('cool', cd > 0.05);
    dash.querySelector('i').style.height = `${(cd / KT.DASH_CD) * 100}%`;
  }

  // ---------- efeitos ----------

  big(text, opts, now, x, y) {
    // empilha textos que aparecem juntos no mesmo lugar
    const near = this.fx.items.filter((it) => it.kind === 'big' && Math.abs(it.x - x) < 260 && Math.abs(it.y - y) < 80 && now - it.born < 500);
    const by = near.length ? Math.min(...near.map((it) => it.y)) - 70 : y;
    this.fx.add('big', { x, y: by, text, ...opts }, now);
  }

  text(text, x, y, color, now, size = 16) {
    this.fx.add('text', { x, y, text, color, size }, now);
  }

  num(dmg, x, y, now, crit = false) {
    this.parts.push({ kind: 'num', x: x + (Math.random() - 0.5) * 30, y, text: `-${dmg}`, crit, born: now, life: 900 });
  }

  spark(kind, x, y, now, color, size = 1) {
    this.parts.push({ kind, x, y, color, size, born: now, life: kind === 'dust' ? 450 : 320, seed: Math.random() * 10 });
  }

  flashOn(id, now) {
    this.flash.set(id, now + 120);
  }

  shake(amount, now) {
    if (amount <= 0) return;
    this.shakeAmp = amount;
    this.shakeAt = now;
  }

  hitstop(now, ms) {
    this.hitstopUntil = Math.max(this.hitstopUntil, now + ms);
  }

  say(text, now, force = false) {
    if (!force && now - this.senseiAt < 2500) return;
    this.senseiAt = now;
    this.sensei = { text, until: now + 2600 };
  }

  // ---------- desenho ----------

  draw(ctx, now) {
    const { dpr, vw, vh } = this.game;
    const t = now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#2b1d14';
    ctx.fillRect(0, 0, vw, vh);
    if (!this.views) {
      outlinedText(ctx, 'Entrando no dojo...', vw / 2, vh / 2, { size: 26 });
      return;
    }
    if (!this.bg) this.bg = prerenderDojo();
    const cam = this.cam;
    const z = cam.z * dpr;
    const sk = this.shakeAmp * Math.max(0, 1 - (now - this.shakeAt) / 350);
    const ox = sk ? (Math.random() - 0.5) * sk * 2 : 0;
    const oy = sk ? (Math.random() - 0.5) * sk * 2 : 0;
    ctx.setTransform(z, 0, 0, z, (-cam.x + ox) * z, (-cam.y + oy) * z);
    ctx.drawImage(this.bg, -DOJO.MX, -DOJO.WALL);

    const ring = Math.max(0, 1 - (now - this.gongAt) / 1400);
    drawGong(ctx, ring);
    drawSensei(ctx, t, this.sensei && now < this.sensei.until ? 1 : 0);

    // fantasmas do dash
    for (const g of this.ghosts) {
      const k = 1 - (now - g.born) / 220;
      this.drawFighterView(ctx, g, now, k * 0.35);
    }
    const order = [...this.views].sort((p, q) => p.y - q.y);
    for (const v of order) this.drawFighterView(ctx, v, now, 1);

    this.drawParts(ctx, now);
    this.fx.draw(ctx, now);
    // nomes não se sobrepõem quando os dois estão colados
    const [v0, v1] = this.views;
    const gap = Math.abs(v0.x - v1.x);
    const spread = gap < 110 ? (110 - gap) / 2 : 0;
    const side = v0.x <= v1.x ? -1 : 1;
    this.drawTag(ctx, v0, now, side * spread);
    this.drawTag(ctx, v1, now, -side * spread);
    if (this.sensei && now < this.sensei.until) {
      // sensei fora da tela (celular): o balão fica preso na borda visível
      const bx = Math.max(SENSEI.x + 30, cam.x + 130);
      const by = Math.max(SENSEI.y - 100, cam.y + 150);
      this.bubble(ctx, `🧓 ${this.sensei.text}`, bx, by, '#fff6c9');
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawHudCanvas(ctx, now);
  }

  drawFighterView(ctx, v, now, alpha) {
    const p = this.game.players.get(v.id);
    const look = p?.look ?? { hat: '#e8412b', shirt: '#222222', skin: '#ffd9b3' };
    drawFighter(ctx, { id: v.id, look }, {
      x: v.x, y: v.y, dir: v.dir, st: v.st, t: v.t, moving: v.moving, phase: v.phase,
      now: now / 1000, slow: v.slowT, alpha: alpha < 1 ? alpha : null,
      flash: alpha === 1 && (this.flash.get(v.id) || 0) > now ? 1 : 0,
    });
  }

  drawTag(ctx, v, now, dx = 0) {
    const nick = this.nickOf(v.id);
    const x = v.x + dx;
    const y = v.y + FIGHTER_TOP - (v.st === 'down' || v.st === 'ko' ? -60 : 0);
    const mine = v.id === this.me;
    ctx.font = `700 13px ${FONT}`;
    const w = ctx.measureText(nick).width + 14;
    roundRect(ctx, x - w / 2, y - 10, w, 20, 8);
    ctx.fillStyle = 'rgba(20,20,30,0.55)';
    ctx.fill();
    outlinedText(ctx, nick, x, y, { size: 13, fill: mine ? '#ffe14d' : '#ffffff', lw: 3 });
    if (mine) outlinedText(ctx, '▼', x, y - 18 + Math.sin(now / 150) * 2, { size: 12, fill: '#ffe14d', lw: 3 });
    const said = this.says.get(v.id);
    if (said && now < said.until) this.bubble(ctx, said.text, x, y - 30, '#ffffff');
  }

  bubble(ctx, text, x, y, fill) {
    ctx.font = `700 14px ${FONT}`;
    const lines = wrap(ctx, text, 210);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
    const h = lines.length * 17 + 12;
    roundRect(ctx, x - w / 2, y - h, w, h, 10);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 1);
    ctx.lineTo(x, y + 9);
    ctx.lineTo(x + 6, y - 1);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, x, y - h + 14 + i * 17));
  }

  drawParts(ctx, now) {
    for (const p of this.parts) {
      const k = (now - p.born) / p.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k);
      if (p.kind === 'burst') {
        // estrela de impacto + raios
        const r = (14 + k * 30) * p.size;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.seed);
        ctx.beginPath();
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          const rr = i % 2 ? r * 0.45 : r;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1);
          ctx.lineTo(Math.cos(a) * r * (1.5 + k), Math.sin(a) * r * (1.5 + k));
          ctx.stroke();
        }
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5 * (1 - k) + 1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, (18 + k * 34) * p.size, (24 + k * 40) * p.size, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'dust') {
        for (let i = 0; i < 5; i++) {
          const a = Math.PI + (i / 4) * Math.PI;
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(a) * k * 40, p.y - 6 + Math.sin(a) * k * 14, 8 * (1 - k) + 3, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      } else if (p.kind === 'num') {
        const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.7 : 1.3 - Math.min(0.3, (k - 0.15));
        ctx.translate(p.x, p.y - k * 50);
        ctx.scale(pop, pop);
        outlinedText(ctx, p.text, 0, 0, { size: p.crit ? 30 : 24, fill: p.crit ? '#ff6fb5' : '#ffe14d', lw: 6 });
      }
      ctx.restore();
    }
  }

  // vida, rounds, relógio, dash (camada de tela)
  drawHudCanvas(ctx, now) {
    const s = this.last;
    if (!s || !this.fight) return;
    const { vw } = this.game;
    const mobile = document.body.classList.contains('mobile');
    const top = mobile ? 60 : 16;
    const barW = Math.min(360, vw * 0.36);
    const barH = mobile ? 16 : 22;
    const gap = mobile ? 34 : 46;
    const ids = [this.fight.a.id, this.fight.b.id];
    ids.forEach((id, i) => {
      const f = s.by[id];
      if (!f) return;
      const right = i === 1;
      const x0 = right ? vw / 2 + gap : vw / 2 - gap - barW;
      // moldura
      roundRect(ctx, x0 - 3, top - 3, barW + 6, barH + 6, 6);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.fillStyle = '#5a1f1f';
      ctx.fillRect(x0, top, barW, barH);
      const show = (this.hpShow.get(id) ?? f.hp) / KT.HP;
      const hp = f.hp / KT.HP;
      const fill = (v, color) => {
        const w = barW * clamp(v, 0, 1);
        ctx.fillStyle = color;
        ctx.fillRect(right ? x0 : x0 + barW - w, top, w, barH);
      };
      fill(show, '#ffffff');
      fill(hp, hp > 0.5 ? '#ffd23f' : hp > 0.25 ? '#ff9a3c' : '#ff4d3a');
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x0, top + 2, barW, barH * 0.3);
      // nome + vitórias
      const nick = this.nickOf(id) + (id === this.me ? ' (você)' : '');
      outlinedText(ctx, nick, right ? x0 + barW : x0, top + barH + 14, {
        size: mobile ? 13 : 16, align: right ? 'right' : 'left', fill: id === this.me ? '#ffe14d' : '#ffffff', lw: 4,
      });
      const wins = s.w[i];
      for (let k = 0; k < KT.ROUNDS_TO_WIN; k++) {
        const cx = right ? x0 + 10 + k * 22 : x0 + barW - 10 - k * 22;
        ctx.beginPath();
        ctx.arc(cx, top + barH + 14, 7, 0, Math.PI * 2);
        ctx.fillStyle = k < wins ? '#ffd23f' : 'rgba(0,0,0,0.35)';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
      // dash e perna machucada (só para mim, sob a barra)
      if (id === this.me) {
        const cd = Math.max(0, f.dashCd - (now - s.at) / 1000);
        const dw = Math.min(140, barW * 0.45);
        const dx0 = right ? x0 + barW - dw : x0;
        const dy0 = top + barH + 28;
        roundRect(ctx, dx0 - 2, dy0 - 2, dw + 4, 12, 4);
        ctx.fillStyle = INK;
        ctx.fill();
        ctx.fillStyle = cd > 0 ? '#5b7bd8' : '#7cfc9a';
        ctx.fillRect(dx0, dy0, dw * (1 - cd / KT.DASH_CD), 8);
        const label = cd > 0 ? `DASH ${cd.toFixed(1)}s` : 'DASH PRONTO 💨';
        outlinedText(ctx, label, right ? dx0 - 8 : dx0 + dw + 8, dy0 + 4, { size: 12, align: right ? 'right' : 'left', fill: cd > 0 ? '#c9d6ff' : '#7cfc9a', lw: 3 });
      }
    });
    // relógio (congela no K.O.)
    if (s.ph === 'fight') this.clockShown = Math.ceil(s.tm);
    else if (s.ph === 'intro') this.clockShown = KT.ROUND_TIME;
    const c = this.clockShown ?? KT.ROUND_TIME;
    roundRect(ctx, vw / 2 - 30, top - 8, 60, barH + 16, 10);
    ctx.fillStyle = '#2b1d14';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    outlinedText(ctx, String(c), vw / 2, top + barH / 2, { size: mobile ? 20 : 26, fill: c <= 5 && s.ph === 'fight' ? '#ff4d3a' : '#ffffff', lw: 4 });
    outlinedText(ctx, `R${s.rd}`, vw / 2, top + barH + 18, { size: 12, fill: '#ffe14d', lw: 3 });
  }
}

function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}
