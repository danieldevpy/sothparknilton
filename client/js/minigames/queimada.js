// Cliente da Queimada: entrar/sair/convidar, cena da quadra (separada da praça), predição do
// próprio boneco, interpolação dos outros, bolas extrapoladas até o "agora" do servidor (para
// pegar/esquivar na hora certa), mira com prévia da trajetória, controles (teclado+mouse / toque),
// placar, efeitos ("QUEIMADO!", "⚡ PEGOU!", "WHOOSH!", "TABELA!"), cemitério, fila e pódio.
//
// Enquanto você está numa partida (na quadra, no cemitério ou na fila), o Game para de desenhar a
// praça e chama `frame()` daqui. Quem está na praça só vê o Ginásio aceso (minigames/gym.js).

import { MSG } from '/shared/constants.js';
import {
  QM, MID, LEVELS, walkStep, clampPlayer, stepBall, predictPath, throwVelocity, clamp,
} from '/shared/queimada.js';
import { FxLayer } from '../render/fx.js';
import { drawCharacter, headTop } from '../render/character.js';
import { prerenderCourt, drawTire, drawQBall, drawTrail, drawBoard, benchSpot, COURT, TEAM_COLOR } from '../render/court.js';
import { outlinedText, roundRect, FONT, INK } from '../render/paint.js';
import { play } from '../audio.js';
import { AdaptiveDelay } from '../jitter.js';
import { GymClient } from './gym.js';

const RESEND_MS = 150;
const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};
const GRAB_KEYS = new Set(['KeyE', 'KeyK']);
const THROW_KEYS = new Set(['KeyF', 'KeyJ']);
const BALL_ST = ['loose', 'live', 'held', 'freeze'];
const TEAM_LABEL = { a: 'VERMELHO', b: 'AZUL' };
const SLOT_ICON = ['⏳', '🏐', '💀'];

function el(tag, cls = '', text = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== null) e.textContent = text;
  return e;
}

export class QueimadaClient {
  constructor(game, hud) {
    this.game = game;
    this.hud = hud;
    this.gym = new GymClient(game, hud);
    this.qm = null; // partida em que estou: { id, hard, target }
    this.roster = []; // [[pid, team, lugar, pts]] da minha partida
    this.fx = new FxLayer();
    this.bg = null;
    this.held = new Set();
    this.stick = { x: 0, y: 0 };
    this.ui = null;
    this.delay = new AdaptiveDelay({ interval: 1000 / 30, min: 60, max: 240 });
    this.reset();
  }

  reset() {
    this.buf = [];
    this.last = null;
    this.views = new Map();
    this.ballViews = [];
    this.pred = null;
    this.localDodge = null;
    this.localThrow = null;
    this.localBall = null;
    this.sent = { mx: 0, my: 0, at: 0 };
    this.cam = { x: 0, y: 0, z: 1, ready: false };
    this.pointer = null; // posição do mouse/dedo na quadra
    this.aiming = null; // segurando o clique/dedo com a bola: { id }
    this.trails = new Map();
    this.walk = new Map();
    this.ghosts = [];
    this.parts = [];
    this.says = new Map();
    this.flash = new Map();
    this.shakeAmp = 0;
    this.shakeAt = 0;
    this.hitstopUntil = 0;
    this.lastBeep = null;
    this.fx.items = [];
    this.lastStatus = '';
  }

  // ---------- consultas ----------

  get me() {
    return this.game.me;
  }

  active() {
    return !!this.qm;
  }

  // jogador está numa partida de queimada (some da praça)
  hidden(id) {
    return this.gym.where.has(id);
  }

  nickOf(id) {
    return this.game.players.get(id)?.nick ?? '?';
  }

  mySlot() {
    const r = this.roster.find(([pid]) => pid === this.me);
    return r ? r[2] : 0;
  }

  onCourt() {
    return !!this.last?.by[this.me];
  }

  level() {
    return LEVELS[this.qm?.hard ? 'hard' : 'easy'];
  }

  // ---------- ações de entrar/sair/convidar ----------

  create(hard) {
    this.game.send({ t: MSG.QM_CREATE, hard: !!hard });
    play('click');
  }

  join(id) {
    this.game.send({ t: MSG.QM_JOIN, id });
    play('click');
  }

  invite(pid) {
    this.game.send({ t: MSG.CHALLENGE, to: pid, game: 'queimada' });
  }

  leaveMatch() {
    if (!this.qm) return;
    this.game.send({ t: MSG.QM_LEAVE });
    this.leave();
    this.hud.toast('Você saiu do Ginásio 👋');
    play('click');
  }

  // ---------- rede ----------

  onMessage(msg, now) {
    this.gym.onMessage(msg, now); // lista do Ginásio (não consome)
    switch (msg.t) {
      case MSG.WELCOME:
        return false; // o Game também processa
      case MSG.QM_ENTER: this.onEnter(msg, now); return true;
      case MSG.QM_EXIT: this.onExit(msg); return true;
      case MSG.QM_LIVE:
        if (this.qm && msg.id === this.qm.id && !msg.gone) {
          this.roster = msg.m;
          this.renderBoard();
        }
        return true;
      case MSG.QM_STATE: this.onState(msg, now); return true;
      case MSG.QM_EVENT: this.onEvent(msg, now); return true;
      case MSG.QM_END: this.onEnd(msg, now); return true;
      case MSG.CHALLENGE:
        if (msg.game !== 'queimada') return false;
        this.onInvite(msg);
        return true;
      case MSG.CH_STATUS:
        if (msg.game !== 'queimada') return false;
        this.onStatus(msg);
        return true;
      default:
        return false;
    }
  }

  onEnter(m, now) {
    const switching = !!this.qm;
    this.qm = { id: m.id, hard: !!m.hard, target: m.target || QM.TARGET };
    this.roster = m.m || [];
    this.reset();
    if (!switching) this.enter();
    this.renderBoard();
    this.hud.log(null, `🔴🔵 Você entrou na Quadra ${m.id} do Ginásio (${m.hard ? 'Difícil' : 'Fácil'})`);
    play('qm_enter');
    void now;
  }

  onExit(m) {
    const text = {
      full: 'Quadra lotada! 🪑 Tente outra ou crie uma nova',
      gone: 'Essa partida acabou 😢',
      busy: 'Você está ocupado em outro jogo',
    }[m.reason];
    if (text) this.hud.toast(text);
    if (this.qm && (m.id === this.qm.id || m.reason === 'left')) this.leave();
  }

  onState(s, now) {
    if (!this.qm) return;
    s.at = now;
    this.delay.arrive(now);
    s.by = {};
    for (const r of s.p) {
      s.by[r[0]] = {
        id: r[0], x: r[1], y: r[2], dir: r[3], st: r[4], t: r[5], team: r[6] ? 'b' : 'a', cem: !!r[7],
        hold: r[8], inv: !!r[9], dodgeCd: r[10], catchCd: r[11], holdT: r[12],
      };
    }
    s.balls = s.b.map((r) => ({
      x: r[0], y: r[1], z: r[2], st: BALL_ST[r[3]], team: r[4] === 0 ? 'a' : r[4] === 1 ? 'b' : null,
      by: r[5], vx: r[6] || 0, vy: r[7] || 0, vz: r[8] || 0,
    }));
    this.buf.push(s);
    if (this.buf.length > 12) this.buf.shift();
    this.last = s;
    if (s.ph === 'play') {
      const c = Math.ceil(s.tm);
      if (c <= 5 && c > 0 && c !== this.lastBeep) play('tick');
      this.lastBeep = c;
    } else if (s.ph === 'count') {
      const c = Math.ceil(s.tm);
      if (c !== this.lastBeep) play('tick');
      this.lastBeep = c;
    }
  }

  onEvent(e, now) {
    if (!this.qm) return;
    const mine = e.by === this.me;
    const at = (id) => this.views.get(id) || this.last?.by[id];
    switch (e.kind) {
      case 'round': {
        const names = (ids) => ids.map((id) => this.nickOf(id)).join(' + ') || '—';
        this.big(`RODADA ${e.round}`, { size: 58, color: '#ffffff', sub: `${names(e.a)}  ×  ${names(e.b)}` }, now, MID, 120);
        this.trails.clear();
        this.pred = null;
        this.localDodge = this.localThrow = this.localBall = null;
        play('whistle');
        break;
      }
      case 'go':
        this.big('VALENDO!', { size: 72, color: '#ffe14d', sub: 'corre pra bola! 🏃' }, now, MID, 150);
        play('go');
        break;
      case 'lobby':
        this.text('treino livre 🏐', MID, 120, '#ffffff', now, 22);
        break;
      case 'join':
        if (e.id !== this.me) {
          this.text(`🔴🔵 ${e.nick} chegou!`, MID, 60, '#ffe14d', now, 18);
          this.hud.log(null, `🔴🔵 ${e.nick} entrou na quadra`);
          play('join');
        }
        break;
      case 'leave':
        this.hud.log(null, `${e.nick} saiu da quadra`);
        break;
      case 'throw': {
        const p = at(e.by);
        if (!mine) play('qm_throw');
        if (p && e.pow > 0.85) this.text('💥 FORTE!', p.x, p.y - 110, '#ffb347', now, 15);
        break;
      }
      case 'bank':
        this.spark('ring', e.x, e.y - 20, now, '#ffffff', 0.7);
        this.text(e.tire ? 'BOING!' : 'TUM!', e.x, e.y - 50, '#ffffff', now, 14);
        play('qm_bounce');
        break;
      case 'hit': this.onHit(e, now); break;
      case 'catch': {
        this.spark('ring', e.x, e.y - 50, now, '#7cfc9a', 1.5);
        this.big('⚡ PEGOU!', { size: 46, color: '#7cfc9a', sub: e.late ? 'na hora H!' : `+${e.pts} · ${this.nickOf(e.by)}` }, now, e.x, e.y - 150);
        this.pts(e.by, e.pts, now);
        if (e.from === this.me) this.text('pegaram sua bola 😱', e.x, e.y - 30, '#ffd0a0', now, 15);
        play('qm_catch');
        this.shake(4, now);
        break;
      }
      case 'fumble':
        this.text('deixou escapar! 🫠', e.x, e.y - 120, '#ffd0a0', now, 18);
        this.spark('burst', e.x, e.y - 50, now, '#ffffff', 0.8);
        play('qm_fumble');
        break;
      case 'whoosh':
        this.big(e.last ? 'WHOOSH! no último segundo' : 'WHOOSH!', { size: e.last ? 34 : 40, color: '#9fd8ff', sub: `+${e.pts} esquiva` }, now, e.x, e.y - 140);
        this.pts(e.by, e.pts, now);
        this.spark('dust', e.x, e.y, now, '#e9dcc2');
        play('qm_whoosh');
        break;
      case 'dodge': {
        const p = at(e.by);
        if (p) this.spark('dust', p.x, p.y, now, '#e9dcc2');
        if (!mine) play('kt_dash');
        break;
      }
      case 'miss': {
        const txt = e.why === 'fast' ? 'escapou! rápida demais 💨' : 'longe demais! chega perto';
        if (mine) this.text(txt, e.x, e.y - 100, '#ffd0a0', now, 15);
        break;
      }
      case 'slow': {
        const p = at(e.by);
        if (p) this.text('🐢 demorou! perdeu a bola', p.x, p.y - 120, '#ffd0a0', now, 16);
        play('boo');
        break;
      }
      case 'grab':
        if (mine) play('qm_grab');
        break;
      case 'enter': {
        const p = at(e.id);
        this.big(`ENTRA ${this.nickOf(e.id).toUpperCase()}!`, { size: 34, color: TEAM_COLOR[e.team] === TEAM_COLOR.a ? '#ff9a8a' : '#9fc0ff', sub: 'saiu da fila' }, now, p?.x ?? MID, 110);
        play('qm_enter');
        break;
      }
      case 'cem': {
        const p = at(e.id);
        if (p) this.parts.push({ kind: 'emoji', text: '👻', x: p.x, y: p.y - 60, born: now, life: 1400, seed: Math.random() });
        if (e.id === this.me) this.hud.toast('💀 Cemitério! Pegue a bola e queime alguém para voltar');
        break;
      }
      case 'revive': {
        const p = at(e.id);
        this.big('VOLTOU DO CEMITÉRIO! 👻', { size: 34, color: '#d6b8ff' }, now, p?.x ?? MID, (p?.y ?? 200) - 150);
        play('qm_revive');
        break;
      }
      case 'return':
        this.text('🧹 o juiz devolveu a bola', e.x, e.y - 40, '#ffffff', now, 14);
        break;
      case 'roundEnd': this.onRoundEnd(e, now); break;
      default:
        break;
    }
  }

  onHit(e, now) {
    this.spark('burst', e.x, e.y - 55, now, '#ffe14d', 1.5);
    this.flash.set(e.to, now + 160);
    const victim = e.to === this.me;
    this.big('QUEIMADO!', {
      size: 54, color: '#ff4d3a',
      sub: victim ? `${this.nickOf(e.by)} te queimou 🔥` : `${this.nickOf(e.by)} queimou ${this.nickOf(e.to)}`,
    }, now, e.x, e.y - 160);
    if (e.bank) this.text(`TABELA! +${QM.PTS_BANK}`, e.x, e.y - 205, '#ffb347', now, 22);
    if (e.cem) this.text('do cemitério! 👻', e.x, e.y - 225, '#d6b8ff', now, 18);
    this.pts(e.by, e.pts, now);
    play('qm_hit');
    this.shake(victim ? 14 : 8, now);
    this.hitstop(now, 90);
    if (victim) setTimeout(() => play('boo'), 350);
    else if (e.by === this.me) setTimeout(() => play('goal'), 250);
  }

  onRoundEnd(e, now) {
    const time = e.reason === 'time';
    if (!e.winner) {
      this.big(time ? 'TEMPO! EMPATE' : 'EMPATE!', { size: 54, color: '#ffffff', sub: 'ninguém leva o bônus' }, now, MID, 150);
    } else {
      const names = e.survivors.map((id) => this.nickOf(id)).join(' + ');
      this.big(`TIME ${TEAM_LABEL[e.winner]} VENCE!`, {
        size: 50, color: e.winner === 'a' ? '#ff8a73' : '#8fb4ff',
        sub: names ? `${e.survivors.length > 1 ? 'últimos de pé' : 'último de pé'}: ${names} (+${e.pts})` : '',
      }, now, MID, 150);
      for (const id of e.survivors) this.pts(id, e.pts, now);
    }
    play('whistle');
    const mine = e.survivors.includes(this.me);
    if (mine) setTimeout(() => play('win'), 400);
  }

  onEnd(m, now) {
    const [, , pts] = m.rank[0] || [];
    this.hud.log(null, `🔴🔵 ${m.winnerNick} venceu a Queimada da Quadra ${m.id} com ${pts} pontos! 🏆`);
    if (!this.qm || this.qm.id !== m.id) return;
    this.big(`🏆 ${m.winnerNick.toUpperCase()}!`, { size: 60, color: '#ffe14d', sub: 'CAMPEÃO DA QUADRA' }, now, MID, 150);
    play(m.winner === this.me ? 'win' : 'crowd');
    this.showPodium(m);
  }

  onInvite(msg) {
    play('invite');
    const n = msg.n || 0;
    this.hud.log(null, `🔴🔵 ${msg.nick} te chamou para a Queimada!`);
    this.hud.invite({
      from: msg.from,
      key: `q${msg.from}`,
      cls: 'qm-invite',
      nick: msg.nick,
      ttl: msg.ttl || QM.INVITE_TTL_MS,
      title: `🔴🔵 ${msg.nick} te chamou pra Queimada!`,
      sub: msg.match ? `Quadra ${msg.match} · ${n} ${n === 1 ? 'jogando' : 'jogando'} · ${msg.hard ? 'Difícil' : 'Fácil'}` : 'Partida nova no Ginásio — 1v1, vira 2v2 com mais gente',
      onAccept: () => this.game.send({ t: MSG.CHALLENGE_REPLY, from: msg.from, accept: true }),
      onDecline: () => this.game.send({ t: MSG.CHALLENGE_REPLY, from: msg.from, accept: false }),
    });
  }

  onStatus(m) {
    const nick = m.nick || 'O jogador';
    const text = {
      sent: `Convite de queimada enviado para ${nick}! 🔴🔵⏳`,
      declined: `${nick} não quis jogar queimada 🐔`,
      expired: `Convite de queimada para ${nick} expirou`,
      busy: `${nick} está ocupado jogando`,
      gone: `${nick} saiu da praça`,
      full: 'A quadra está lotada! 🪑',
      invalid: 'Não dá para chamar esse jogador',
    }[m.status];
    if (m.status === 'expired' || m.status === 'gone') this.hud.removeInvite(`q${m.with}`);
    if (text) this.hud.toast(text);
  }

  onChat(msg, now) {
    if (!this.qm || !this.roster.some(([pid]) => pid === msg.id)) return;
    this.says.set(msg.id, { text: msg.text, until: now + Math.min(4000, 1500 + msg.text.length * 60) });
  }

  // ---------- entrar/sair da cena ----------

  enter() {
    document.body.classList.add('qm-on');
    this.hud.closePlayerCard();
    this.hud.clearInvites();
    this.hud.closeGgResult();
    this.gym.closePanel();
    this.game.dest = null;
    this.held.clear();
    this.buildUi();
  }

  leave() {
    this.qm = null;
    this.roster = [];
    this.reset();
    document.body.classList.remove('qm-on');
    if (this.ui) this.ui.hidden = true;
    this.hidePodium();
    this.closeInvitePanel();
  }

  buildUi() {
    if (this.ui) {
      this.ui.hidden = false;
      return;
    }
    const ui = el('div');
    ui.id = 'qm-ui';
    // textos fixos (nada vindo de usuário)
    ui.innerHTML = `
      <div class="qm-nav">
        <button class="qm-inv-btn">➕ <span class="qm-long">Convidar</span></button>
        <button class="qm-exit">🚪 <span class="qm-long">Sair</span></button>
      </div>
      <div id="qm-board"></div>
      <div id="qm-status" hidden></div>
      <div id="qm-help">
        <div class="qm-key"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><b>Andar</b></div>
        <div class="qm-key qm-k-throw"><span><kbd>🖱️</kbd></span><b>Com a bola: segure e solte</b><small>longe = mais forte · vê a trajetória</small></div>
        <div class="qm-key qm-k-grab"><span><kbd>🖱️</kbd><kbd>E</kbd></span><b>Clique na bola: pegar</b><small>no ar = pegada (na hora H!)</small></div>
        <div class="qm-key qm-k-dodge"><span><kbd>🖱️</kbd><kbd>Espaço</kbd></span><b>Clique fora: esquivar</b><small>bem no último segundo = WHOOSH</small></div>
      </div>
      <div id="qm-touch">
        <div class="kt-stick qm-stick"><div class="kt-knob"></div></div>
        <div class="qm-pad">
          <button class="qm-b qm-b-grab">🧤<small>PEGAR</small><i></i></button>
          <button class="qm-b qm-b-dodge">💨<small>ESQUIVA</small><i></i></button>
          <button class="qm-b qm-b-auto">🎯<small>JOGAR</small></button>
        </div>
      </div>
      <div id="qm-invite" hidden></div>
      <div id="qm-podium" hidden></div>`;
    document.body.appendChild(ui);
    this.ui = ui;
    ui.querySelector('.qm-exit').addEventListener('click', () => this.leaveMatch());
    ui.querySelector('.qm-inv-btn').addEventListener('click', () => this.toggleInvitePanel());
    this.setupTouch(ui);
  }

  setupTouch(ui) {
    const stick = ui.querySelector('.qm-stick');
    const knob = stick.querySelector('.kt-knob');
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
    const tap = (sel, fn) => ui.querySelector(sel).addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      fn(performance.now());
    });
    tap('.qm-b-grab', (now) => this.grab(now));
    tap('.qm-b-dodge', (now) => this.dodge(null, now));
    tap('.qm-b-auto', (now) => this.autoThrow(now));
    ui.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }

  // ---------- painel de convite (dentro da quadra) ----------

  toggleInvitePanel() {
    const box = this.ui.querySelector('#qm-invite');
    if (!box.hidden) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    this.renderInvitePanel();
    play('click');
  }

  closeInvitePanel() {
    const box = this.ui?.querySelector('#qm-invite');
    if (box) box.hidden = true;
  }

  renderInvitePanel() {
    const box = this.ui.querySelector('#qm-invite');
    const head = el('div', 'qi-head');
    head.append(el('b', '', '➕ Chamar para a quadra'));
    const x = el('button', 'gp-x', '×');
    x.addEventListener('click', () => { box.hidden = true; });
    head.append(x);
    const list = el('div', 'qi-list');
    const free = [...this.game.players.values()]
      .filter((p) => p.id !== this.me && !this.game.hiddenInPlaza(p.id))
      .sort((a, b) => a.nick.localeCompare(b.nick));
    if (!free.length) list.append(el('p', 'gp-empty', 'Ninguém livre na praça agora 😴'));
    for (const p of free) {
      const row = el('div', 'qi-row');
      const dot = el('i');
      dot.style.background = p.look.hat;
      const name = el('span', 'qi-nick');
      name.append(dot, el('b', '', p.nick));
      const btn = el('button', 'qi-call', 'Chamar');
      btn.addEventListener('click', () => {
        this.invite(p.id);
        btn.disabled = true;
        btn.textContent = 'Chamado ✔';
      });
      row.append(name, btn);
      list.append(row);
    }
    box.replaceChildren(head, list, el('p', 'gp-tip', 'Quem aceitar entra nesta quadra (na fila, se estiver cheia).'));
  }

  // ---------- placar (DOM) ----------

  renderBoard() {
    if (!this.ui || !this.qm) return;
    const box = this.ui.querySelector('#qm-board');
    const head = el('div', 'qb-head');
    head.append(el('b', '', `Quadra ${this.qm.id}`), el('span', `gp-lvl ${this.qm.hard ? 'hard' : 'easy'}`, this.qm.hard ? 'Difícil' : 'Fácil'), el('small', '', `meta ${this.qm.target}`));
    const rows = [...this.roster].sort((a, b) => b[3] - a[3]);
    const queue = this.roster.filter(([, , slot]) => slot === 0).map(([pid]) => pid);
    const list = el('ol', 'qb-list');
    for (const [pid, team, slot, pts] of rows) {
      const li = el('li', `qb-row${pid === this.me ? ' me' : ''}`);
      const dot = el('i', `qb-dot ${team || 'q'}`);
      const name = el('span', 'qb-nick', `${this.nickOf(pid)}${pid === this.me ? ' (você)' : ''}`);
      const where = slot === 0 ? `⏳${queue.indexOf(pid) + 1}` : SLOT_ICON[slot];
      li.append(dot, name, el('span', 'qb-slot', where), el('b', 'qb-pts', String(pts)));
      list.append(li);
    }
    box.replaceChildren(head, list);
  }

  // ---------- pódio ----------

  showPodium(m) {
    const box = this.ui?.querySelector('#qm-podium');
    if (!box) return;
    const card = el('div', 'qp-card');
    card.append(el('div', 'qp-emoji', m.winner === this.me ? '🏆' : '🔴🔵'), el('h2', '', `${m.winnerNick} é o CAMPEÃO DA QUADRA!`));
    const ol = el('ol', 'qp-rank');
    m.rank.slice(0, 6).forEach(([pid, nick, pts, hits, catches, dodges], i) => {
      const li = el('li', pid === this.me ? 'me' : '');
      li.append(el('span', 'qp-pos', ['🥇', '🥈', '🥉'][i] || `${i + 1}º`), el('b', '', nick), el('span', 'qp-stats', `🔥${hits} ⚡${catches} 💨${dodges}`), el('b', 'qp-pts', `${pts} pts`));
      ol.append(li);
    });
    const myPos = m.rank.findIndex(([pid]) => pid === this.me);
    const row = el('div', 'qp-actions');
    const stay = el('button', 'qp-stay', '🔁 Jogar de novo');
    stay.addEventListener('click', () => this.hidePodium());
    const out = el('button', 'qp-out', '🚪 Sair');
    out.addEventListener('click', () => this.leaveMatch());
    row.append(stay, out);
    card.append(ol, el('p', 'qp-sub', myPos >= 0 ? `Você ficou em ${myPos + 1}º · nova partida em ${QM.OVER_TIME} s` : `Nova partida em ${QM.OVER_TIME} s`), row);
    box.replaceChildren(card);
    box.hidden = false;
    clearTimeout(this.podiumTimer);
    this.podiumTimer = setTimeout(() => this.hidePodium(), QM.OVER_TIME * 1000 - 300);
  }

  hidePodium() {
    clearTimeout(this.podiumTimer);
    const box = this.ui?.querySelector('#qm-podium');
    if (box) box.hidden = true;
  }

  // ---------- controles ----------

  // true = tecla consumida pela quadra (números passam: emotes funcionam no banco/quadra)
  key(ev, down, now) {
    if (!this.qm) return false;
    const code = ev.code;
    if (MOVE_KEYS[code]) {
      if (down) this.held.add(code);
      else this.held.delete(code);
      return true;
    }
    if (!down) return GRAB_KEYS.has(code) || THROW_KEYS.has(code) || code === 'Space';
    if (ev.repeat) return true;
    if (code === 'Space') { this.dodge(null, now); return true; }
    if (GRAB_KEYS.has(code)) { this.grab(now); return true; }
    if (THROW_KEYS.has(code)) {
      if (this.pointer) this.throwAt(this.pointer.x, this.pointer.y, now);
      else this.autoThrow(now);
      return true;
    }
    return /^Key/.test(code);
  }

  clearKeys() {
    this.held.clear();
    this.aiming = null;
  }

  screenToCourt(sx, sy) {
    return { x: sx / this.cam.z + this.cam.x, y: sy / this.cam.z + this.cam.y };
  }

  pointerMove(ev) {
    if (!this.qm) return;
    this.pointer = this.screenToCourt(ev.clientX, ev.clientY);
  }

  pointerDown(ev) {
    if (!this.qm) return;
    const now = performance.now();
    const w = this.screenToCourt(ev.clientX, ev.clientY);
    this.pointer = w;
    this.closeInvitePanel();
    const me = this.views.get(this.me);
    if (!me || !this.onCourt()) return;
    if (ev.button === 2) {
      this.dodge(w, now);
      return;
    }
    if (ev.button !== 0) return;
    if (this.holding()) {
      this.aiming = { id: ev.pointerId };
      return;
    }
    // clicou numa bola: pegar (no ar = postura de pegada) · fora dela: esquivar para lá
    const hit = this.ballAt(w);
    if (hit) this.grab(now);
    else this.dodge(w, now);
  }

  pointerUp(ev) {
    if (!this.qm || !this.aiming || (ev && ev.pointerId !== this.aiming.id)) return;
    this.aiming = null;
    if (!this.pointer || !this.holding()) return;
    this.throwAt(this.pointer.x, this.pointer.y, performance.now());
  }

  // bola desenhada sob o ponteiro (corpo ou sombra)
  ballAt(w) {
    for (const b of this.ballViews) {
      if (!b || b.st === 'held') continue;
      const cy = b.y - QM.BALL_R - 2 - b.z;
      if (Math.hypot(w.x - b.x, w.y - cy) < 42 || Math.hypot(w.x - b.x, w.y - b.y) < 32) return b;
    }
    return null;
  }

  holding() {
    const meS = this.last?.by[this.me];
    return !!meS && meS.hold >= 0 && !this.localThrow;
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

  canAct() {
    const s = this.last;
    return !!s && ['lobby', 'count', 'play'].includes(s.ph) && this.onCourt();
  }

  throwAt(x, y, now) {
    if (!this.canAct() || !this.holding()) return;
    const meS = this.last.by[this.me];
    if (!['idle', 'walk', 'catch'].includes(meS.st)) return;
    const tx = Math.round(clamp(x, 0, QM.W));
    const ty = Math.round(clamp(y, 0, QM.H));
    this.game.send({ t: MSG.QM_ACT, a: 'throw', x: tx, y: ty });
    // previsão local: o boneco arremessa e a bola sai da mão já (o servidor confirma em seguida)
    const p = this.pred || meS;
    const dir = tx >= p.x ? 1 : -1;
    const sx = p.x + dir * 12;
    const v = throwVelocity(sx, p.y, tx, ty);
    this.localThrow = { at: now, dir };
    this.localBall = { i: meS.hold, at: now, x: sx, y: p.y, z: QM.HAND_Z, vx: v.vx, vy: v.vy, vz: v.vz, team: meS.team };
    play('qm_throw');
  }

  // celular: arremessa no adversário mais perto (sem antecipar o movimento)
  autoThrow(now) {
    if (!this.holding()) return;
    const meS = this.last.by[this.me];
    const p = this.pred || meS;
    let best = null;
    for (const v of this.views.values()) {
      if (v.team === meS.team || v.cem || v.st === 'hit') continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (!best || d < best.d) best = { v, d };
    }
    if (best) this.throwAt(best.v.x, best.v.y, now);
    else this.throwAt(meS.team === 'a' ? QM.W - QM.CEM - 60 : QM.CEM + 60, p.y, now);
  }

  grab(now) {
    if (!this.canAct()) return;
    this.game.send({ t: MSG.QM_ACT, a: 'grab' });
    void now;
  }

  // esquiva para o ponto `w` (ou para onde estou andando)
  dodge(w, now) {
    if (!this.canAct()) return;
    const meS = this.last.by[this.me];
    const p = this.pred || meS;
    let dx;
    let dy;
    if (w) {
      dx = w.x - p.x;
      dy = (w.y - p.y) / QM.DEPTH_MUL;
    } else {
      [dx, dy] = this.axis();
    }
    const n = Math.hypot(dx, dy);
    if (n > 0.01) { dx /= n; dy /= n; } else { dx = 0; dy = p.y < QM.H / 2 ? 1 : -1; }
    dx = Math.round(dx * 100) / 100;
    dy = Math.round(dy * 100) / 100;
    this.game.send({ t: MSG.QM_ACT, a: 'dodge', dx, dy });
    const cd = meS.dodgeCd - (now - this.last.at) / 1000;
    if (cd > 0.05 || this.localDodge || !['idle', 'walk', 'catch'].includes(meS.st)) return;
    this.localDodge = { at: now, dx, dy };
    this.spark('dust', p.x, p.y, now, '#e9dcc2');
    play('kt_dash');
  }

  sendInput(now) {
    const [mx, my] = this.axis();
    const changed = mx !== this.sent.mx || my !== this.sent.my;
    if (!changed && !((mx || my) && now - this.sent.at > RESEND_MS)) return;
    this.game.send({ t: MSG.QM_INPUT, mx, my });
    this.sent = { mx, my, at: now };
  }

  // ---------- por frame ----------

  frame(dt, now) {
    if (!this.qm) return;
    if (this.onCourt()) this.sendInput(now);
    this.fx.update(now);
    this.parts = this.parts.filter((p) => now - p.born < p.life);
    this.ghosts = this.ghosts.filter((g) => now - g.born < 220);
    if (this.last && now >= this.hitstopUntil) this.updateViews(dt, now);
    this.updateCamera(dt);
    this.updateHud(now);
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
    const smp = this.sample(now);
    const views = new Map();
    for (const id of Object.keys(smp.b.by)) {
      const nb = smp.b.by[id];
      const na = smp.a.by[id] || nb;
      const jump = na.cem !== nb.cem || Math.hypot(nb.x - na.x, nb.y - na.y) > 140; // foi para o cemitério / voltou
      const k = jump ? 1 : smp.k;
      views.set(nb.id, { ...nb, x: na.x + (nb.x - na.x) * k, y: na.y + (nb.y - na.y) * k, t: nb.t + Math.max(0, smp.at - smp.b.at) / 1000 });
    }
    const mine = this.predictMe(dt, now);
    if (mine) views.set(this.me, mine);
    for (const v of views.values()) {
      const moving = v.st === 'walk' || v.moving;
      const w = (this.walk.get(v.id) || 0) + (moving ? dt * 14 : 0);
      this.walk.set(v.id, w);
      v.phase = w;
      v.moving = moving;
      if (v.st === 'dodge') this.ghosts.push({ ...v, born: now });
    }
    this.views = views;
    this.updateBalls(dt, now);
  }

  // eu: previsão local do movimento, da esquiva e do arremesso
  predictMe(dt, now) {
    const s = this.last;
    const meS = s.by[this.me];
    if (!meS) {
      this.pred = null;
      return null;
    }
    const age = (now - s.at) / 1000;
    if (!this.pred || this.pred.cem !== meS.cem || this.pred.team !== meS.team || Math.hypot(this.pred.x - meS.x, this.pred.y - meS.y) > 160) {
      this.pred = { x: meS.x, y: meS.y, team: meS.team, cem: meS.cem, hold: meS.hold, st: meS.st };
    }
    const p = this.pred;
    p.hold = meS.hold;
    p.st = meS.st;
    let st = meS.st;
    let t = meS.t + age;
    let dir = meS.dir;
    const free = ['idle', 'walk', 'catch'].includes(meS.st) && ['lobby', 'count', 'play'].includes(s.ph);
    const ld = this.localDodge;
    if (ld) {
      const lt = (now - ld.at) / 1000;
      if (!['idle', 'walk', 'catch', 'dodge'].includes(meS.st)) this.localDodge = null; // foi queimado / atordoado
      else if (lt <= QM.DODGE_TIME) {
        const sp = QM.DODGE_DIST / QM.DODGE_TIME;
        p.x += ld.dx * sp * dt;
        p.y += ld.dy * sp * QM.DEPTH_MUL * dt;
        clampPlayer(p);
        st = 'dodge';
        t = lt;
        if (Math.abs(ld.dx) > 0.2) dir = ld.dx > 0 ? 1 : -1;
      } else if (lt > QM.DODGE_TIME + 0.35) this.localDodge = null;
    }
    const lt = this.localThrow;
    if (lt) {
      const wait = Math.max(320, (this.game.rtt || 0) + 160);
      if ((meS.st === 'throw' && meS.hold < 0) || now - lt.at > wait) this.localThrow = null;
      else {
        st = 'throw';
        t = (now - lt.at) / 1000;
        dir = lt.dir;
      }
    }
    const [mx, my] = this.axis();
    if (!this.localDodge && st !== 'throw' && free) {
      const moved = walkStep(p, mx, my, dt);
      const ex = meS.x - p.x;
      const ey = meS.y - p.y;
      const err = Math.hypot(ex, ey);
      const lag = QM.SPEED * ((this.game.rtt || 0) / 1000) * 0.6;
      if (err > 90 + lag) { p.x = meS.x; p.y = meS.y; }
      else {
        const g = moved ? (err > 28 + lag ? 3 : 0) : 6;
        p.x += ex * Math.min(1, dt * g);
        p.y += ey * Math.min(1, dt * g);
      }
      if (moved && Math.abs(mx) > 0.1) dir = mx > 0 ? 1 : -1;
      if (meS.st !== 'catch') st = moved ? 'walk' : 'idle';
    } else if (!this.localDodge) {
      const g = Math.min(1, dt * 14);
      p.x += (meS.x - p.x) * g;
      p.y += (meS.y - p.y) * g;
    }
    // mirando: olha para o ponteiro
    if (this.holding() && this.pointer && st !== 'dodge') dir = this.pointer.x >= p.x ? 1 : -1;
    p.dir = dir;
    return { ...meS, x: p.x, y: p.y, st, t, dir, moving: st === 'walk' };
  }

  // bolas: extrapoladas a partir do último estado até "quando meu comando chegar no servidor"
  updateBalls(dt, now) {
    const s = this.last;
    const ahead = clamp((now - s.at) / 1000 + (this.game.rtt || 60) / 1000, 0, 0.35);
    const lb = this.localBall;
    if (lb) {
      stepBall(lb, dt);
      const sb = s.balls[lb.i];
      // o servidor já arremessou (ou outra coisa aconteceu com a bola): volta a seguir o servidor
      if (!sb || (sb.st !== 'held') || sb.by !== this.me || now - lb.at > 600) this.localBall = null;
    }
    this.ballViews = s.balls.map((b, i) => {
      if (this.localBall && this.localBall.i === i) return { i, ...this.localBall, st: 'live', by: this.me };
      if (b.st === 'held') {
        const h = this.views.get(b.by);
        if (!h) return null;
        const hand = handOf(h);
        return { i, x: hand.x, y: hand.y, z: hand.z, st: 'held', team: b.team, by: b.by };
      }
      if (b.st === 'freeze' || (b.st === 'loose' && !b.vx && !b.vy && !b.vz && !b.z)) return { i, ...b };
      const v = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz };
      let left = ahead;
      while (left > 0) {
        const step = Math.min(1 / 60, left);
        left -= step;
        const ev = stepBall(v, step);
        // bola viva para no primeiro adversário (o servidor decide o que aconteceu)
        if (b.st === 'live' && !ev.ground && v.z < QM.BODY_H && this.touches(v, b.team)) break;
      }
      return { i, ...v, st: b.st, team: b.team, by: b.by };
    });
    // rastro das bolas vivas
    for (const b of this.ballViews) {
      if (!b) continue;
      const tr = this.trails.get(b.i) || [];
      if (b.st === 'live') {
        tr.push([b.x, b.y - QM.BALL_R - b.z]);
        if (tr.length > 9) tr.shift();
      } else tr.length = 0;
      this.trails.set(b.i, tr);
    }
  }

  touches(v, team) {
    for (const p of this.views.values()) {
      if (p.team === team || p.cem || p.st === 'hit' || p.inv) continue;
      if (Math.hypot(v.x - p.x, v.y - p.y) < QM.HIT_R) return true;
    }
    return false;
  }

  updateCamera(dt) {
    const { vw, vh } = this.game;
    const mobile = document.body.classList.contains('mobile');
    const portrait = vh > vw;
    const top = mobile ? -150 : -COURT.WALL + 6;
    const bottom = QM.H + (mobile ? 40 : 30);
    const viewW = mobile && portrait ? 500 : QM.W + 70;
    const viewH = bottom - top;
    const tz = clamp(Math.min(vw / viewW, vh / viewH), 0.3, 1.5);
    const cam = this.cam;
    cam.z = cam.ready ? cam.z + (tz - cam.z) * Math.min(1, dt * 3) : tz;
    const w = vw / cam.z;
    const h = vh / cam.z;
    const me = this.views.get(this.me);
    const fx = me ? me.x : MID;
    const lo = -COURT.MX + w / 2;
    const hi = QM.W + COURT.MX - w / 2;
    // quadra inteira cabe: centraliza; senão segue o meu boneco
    const cx = w >= QM.W + 20 || lo >= hi ? QM.W / 2 : clamp(fx, lo, hi);
    const tx = cx - w / 2;
    // celular em pé: parede logo abaixo do placar (fichinhas no topo), botões embaixo
    const ty = mobile && portrait ? top - 178 / cam.z : (top + bottom) / 2 - h / 2;
    if (!cam.ready) { cam.x = tx; cam.y = ty; cam.ready = true; }
    const k = Math.min(1, dt * 5);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
  }

  // status (fila, cemitério, treino), recargas dos botões
  updateHud(now) {
    if (!this.ui || !this.last) return;
    const s = this.last;
    const meS = s.by[this.me];
    const slot = meS ? (meS.cem ? 2 : 1) : 0;
    let status = '';
    if (s.ph === 'over') status = '🏆 Fim de jogo! Nova partida já já...';
    else if (!meS) {
      const q = this.roster.filter(([, , sl]) => sl === 0).map(([pid]) => pid);
      const pos = q.indexOf(this.me) + 1;
      status = s.ph === 'play'
        ? `⏳ Você está na fila${pos ? ` (#${pos})` : ''} — entra quando alguém for queimado`
        : `⏳ Na fila${pos ? ` (#${pos})` : ''} — você joga na próxima rodada`;
    } else if (slot === 2 && s.ph === 'play') status = '💀 CEMITÉRIO: pegue a bola e queime alguém para VOLTAR';
    else if (s.ph === 'lobby') status = '🏐 Treino livre — esperando adversário. Chame alguém em ➕ Convidar!';
    else if (s.ph === 'count') status = `Começando em ${Math.max(1, Math.ceil(s.tm))}...`;
    if (status !== this.lastStatus) {
      this.lastStatus = status;
      const box = this.ui.querySelector('#qm-status');
      box.textContent = status;
      box.hidden = !status;
    }
    this.ui.classList.toggle('qm-playing', !!meS);
    this.ui.classList.toggle('qm-has-ball', !!meS && meS.hold >= 0);
    if (meS) {
      const ago = (now - s.at) / 1000;
      const lv = this.level();
      const cdBar = (sel, left, total) => {
        const b = this.ui.querySelector(sel);
        b.classList.toggle('cool', left > 0.05);
        b.querySelector('i').style.height = `${clamp(left / total, 0, 1) * 100}%`;
      };
      cdBar('.qm-b-dodge', meS.dodgeCd - ago, lv.dodgeCd);
      cdBar('.qm-b-grab', meS.hold >= 0 ? 0 : meS.catchCd - ago, lv.catchCd);
    }
  }

  // ---------- efeitos ----------

  big(text, opts, now, x, y) {
    const near = this.fx.items.filter((it) => it.kind === 'big' && Math.abs(it.x - x) < 260 && Math.abs(it.y - y) < 80 && now - it.born < 500);
    const by = near.length ? Math.min(...near.map((it) => it.y)) - 70 : y;
    this.fx.add('big', { x, y: by, text, ...opts }, now);
  }

  text(text, x, y, color, now, size = 16) {
    this.fx.add('text', { x, y, text, color, size }, now);
  }

  pts(id, n, now) {
    if (!n) return;
    const v = this.views.get(id);
    if (!v) return;
    this.parts.push({ kind: 'num', x: v.x + (Math.random() - 0.5) * 20, y: v.y - 120, text: `+${n}`, born: now, life: 1100, mine: id === this.me });
  }

  spark(kind, x, y, now, color, size = 1) {
    this.parts.push({ kind, x, y, color, size, born: now, life: kind === 'dust' ? 450 : 340, seed: Math.random() * 10 });
  }

  shake(amount, now) {
    if (amount <= 0) return;
    this.shakeAmp = amount;
    this.shakeAt = now;
  }

  hitstop(now, ms) {
    this.hitstopUntil = Math.max(this.hitstopUntil, now + ms);
  }

  // ---------- desenho ----------

  draw(ctx, now) {
    const { dpr, vw, vh } = this.game;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#7f98ab';
    ctx.fillRect(0, 0, vw, vh);
    if (!this.last) {
      outlinedText(ctx, 'Entrando no Ginásio...', vw / 2, vh / 2, { size: 26 });
      return;
    }
    if (!this.bg) this.bg = prerenderCourt();
    const cam = this.cam;
    const z = cam.z * dpr;
    const sk = this.shakeAmp * Math.max(0, 1 - (now - this.shakeAt) / 380);
    const ox = sk ? (Math.random() - 0.5) * sk * 2 : 0;
    const oy = sk ? (Math.random() - 0.5) * sk * 2 : 0;
    ctx.setTransform(z, 0, 0, z, (-cam.x + ox) * z, (-cam.y + oy) * z);
    ctx.drawImage(this.bg, -COURT.MX, -COURT.WALL);
    const s = this.last;
    drawBoard(ctx, this.boardData(s), now);

    // fila sentada no banco (encostado na parede)
    const queue = this.roster.filter(([, , slot]) => slot === 0).map(([pid]) => pid);
    queue.forEach((pid, i) => {
      const sp = benchSpot(i);
      this.drawPerson(ctx, { id: pid, x: sp.x, y: sp.y, dir: 1, st: 'bench', t: 0, team: null }, now, 1);
    });

    // mira (atrás dos bonecos, no chão)
    this.drawAim(ctx, now);

    // y-sort: pneus + bonecos + bolas
    const list = [];
    for (const t of QM.TIRES) list.push({ y: t.y, draw: () => drawTire(ctx, t, now) });
    for (const g of this.ghosts) {
      const k = 1 - (now - g.born) / 220;
      list.push({ y: g.y - 1, draw: () => this.drawPerson(ctx, g, now, k * 0.3) });
    }
    for (const v of this.views.values()) list.push({ y: v.y, draw: () => this.drawPerson(ctx, v, now, 1) });
    for (const b of this.ballViews) {
      if (!b) continue;
      list.push({
        y: b.st === 'held' ? b.y + 0.5 : b.y,
        draw: () => {
          drawTrail(ctx, this.trails.get(b.i) || [], b.team);
          const hover = b.st !== 'held' && this.pointer && !this.holding() && this.ballAt(this.pointer) === b;
          drawQBall(ctx, b.x, b.y, b.z, now, { live: b.st === 'live' || b.st === 'freeze', team: b.team, hover });
        },
      });
    }
    list.sort((a, c) => a.y - c.y);
    for (const it of list) it.draw();

    this.drawParts(ctx, now);
    this.fx.draw(ctx, now);
    for (const v of this.views.values()) this.drawTag(ctx, v, now);
    queue.forEach((pid, i) => {
      const sp = benchSpot(i);
      this.drawTag(ctx, { id: pid, x: sp.x, y: sp.y, st: 'bench', team: null, queue: i + 1 }, now);
    });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawHudCanvas(ctx, now);
  }

  boardData(s) {
    const alive = { a: 0, b: 0 };
    for (const p of Object.values(s.by)) if (!p.cem && p.st !== 'hit') alive[p.team]++;
    const label = { lobby: 'TREINO LIVRE', count: 'PREPARAR...', intro: 'ATENÇÃO', play: 'VALENDO', end: 'FIM DA RODADA', over: 'FIM DE JOGO' }[s.ph] || '';
    const clock = s.ph === 'play' ? Math.ceil(s.tm) : s.ph === 'count' ? Math.ceil(s.tm) : s.ph === 'intro' ? QM.ROUND_TIME : 0;
    return { round: s.rd, clock, alive, phase: s.ph, label };
  }

  drawPerson(ctx, v, now, alpha) {
    const p = this.game.players.get(v.id);
    const look = p?.look ?? { hat: '#888888', shirt: '#888888', skin: '#ffd9b3' };
    let pose = '';
    if (v.st === 'bench') pose = 'bench';
    else if (v.st === 'hit') pose = v.dir > 0 ? 'lieU' : 'lieD';
    else if (v.st === 'throw') pose = 'qthrow';
    else if (v.st === 'catch') pose = 'qcatch';
    else if (v.st === 'dodge') pose = 'qdodge';
    else if (v.st === 'stun') pose = 'qstun';
    else if (v.hold >= 0) pose = 'qhold';
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    // anel do time no chão
    if (v.team && v.st !== 'bench') {
      ctx.strokeStyle = TEAM_COLOR[v.team];
      ctx.lineWidth = 4;
      ctx.globalAlpha *= v.cem ? 0.5 : 0.9;
      ctx.beginPath();
      ctx.ellipse(v.x, v.y + 2, 24, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha < 1 ? alpha : 1;
    }
    if (v.cem) ctx.globalAlpha *= 0.72; // fantasminha do cemitério
    if (v.inv && v.st !== 'dodge' && Math.floor(now / 90) % 2) ctx.globalAlpha *= 0.55; // acabou de entrar (piscando)
    const flash = (this.flash.get(v.id) || 0) > now;
    drawCharacter(ctx, { id: v.id, look: flash ? { ...look, skin: '#ffffff', shirt: '#ffffff' } : look }, {
      x: v.x, y: v.y, dir: v.dir || 1, moving: !!v.moving && v.st !== 'hit', phase: v.phase || 0, pose,
      emote: p?.emote && v.st !== 'hit' ? p.emote : null, emoteT: p?.emote ? (now - p.emoteAt) / 1000 : 0,
      talking: (this.says.get(v.id)?.until || 0) > now, t: now / 1000,
    });
    if (v.st === 'stun') {
      for (let i = 0; i < 3; i++) {
        const a = now / 200 + (i * Math.PI * 2) / 3;
        outlinedText(ctx, '⭐', v.x + Math.cos(a) * 18, v.y - 100 + Math.sin(a) * 6, { size: 12, lw: 0 });
      }
    }
    ctx.restore();
  }

  drawTag(ctx, v, now) {
    const nick = this.nickOf(v.id);
    const sitting = v.st === 'bench';
    const lying = v.st === 'hit';
    const x = v.x;
    // fila: etiqueta embaixo do banco (em cima ela cobriria o placar da parede)
    const y = v.queue ? v.y + 16 : v.y + headTop(sitting ? 'bench' : '') - 14 + (lying ? 60 : 0);
    const mine = v.id === this.me;
    const label = `${v.cem ? '💀 ' : ''}${v.queue ? `⏳${v.queue} ` : ''}${nick}`;
    ctx.font = `700 13px ${FONT}`;
    const w = ctx.measureText(label).width + 14;
    roundRect(ctx, x - w / 2, y - 10, w, 20, 8);
    ctx.fillStyle = v.team ? (v.team === 'a' ? 'rgba(170,40,25,0.85)' : 'rgba(35,70,160,0.85)') : 'rgba(20,20,30,0.6)';
    ctx.fill();
    outlinedText(ctx, label, x, y, { size: 13, fill: mine ? '#ffe14d' : '#ffffff', lw: 3 });
    if (mine && !sitting) outlinedText(ctx, '▼', x, y - 18 + Math.sin(now / 150) * 2, { size: 12, fill: '#ffe14d', lw: 3 });
    // segurando a bola: tempo até derrubar (🐢)
    if (v.hold >= 0 && this.last?.ph === 'play' && !sitting) {
      const max = this.level().holdMax;
      const left = clamp(1 - (v.holdT || 0) / max, 0, 1);
      const bw = 40;
      roundRect(ctx, x - bw / 2, y + 12, bw, 6, 3);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.fillStyle = left > 0.35 ? '#7cfc9a' : '#ff6a4d';
      ctx.fillRect(x - bw / 2 + 1, y + 13, (bw - 2) * left, 4);
      if (left < 0.35) outlinedText(ctx, '🐢', x + bw / 2 + 10, y + 15, { size: 12, lw: 0 });
    }
    const said = this.says.get(v.id);
    if (said && now < said.until) this.bubble(ctx, said.text, x, y - 28, '#ffffff');
  }

  drawAim(ctx, now) {
    if (!this.holding() || !this.pointer || !this.pred || !this.canAct()) return;
    const p = this.pred;
    const dir = this.pointer.x >= p.x ? 1 : -1;
    const sx = p.x + dir * 12;
    const { pts, bounces, pow } = predictPath(sx, p.y, this.pointer.x, this.pointer.y);
    const strong = !!this.aiming;
    const color = pow > 0.75 ? '#ff5a3c' : pow > 0.4 ? '#ffd23f' : '#7cfc9a';
    ctx.save();
    ctx.globalAlpha = strong ? 0.95 : 0.45;
    // sombra no chão (linha tracejada)
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -now / 30;
    ctx.strokeStyle = 'rgba(30,40,60,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
    // arco da bola (bolinhas)
    for (let i = 2; i < pts.length; i += 3) {
      const [x, y, z] = pts[i];
      ctx.beginPath();
      ctx.arc(x, y - QM.BALL_R - z, strong ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
    for (const [x, y, z] of bounces) outlinedText(ctx, '✦', x, y - z - 10, { size: 16, fill: '#ffffff', lw: 3 });
    // onde quica no chão
    const [lx, ly] = pts[pts.length - 1];
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 14, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    // força
    const bw = 46;
    roundRect(ctx, p.x - bw / 2, p.y + 14, bw, 8, 4);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(p.x - bw / 2 + 1, p.y + 15, (bw - 2) * Math.max(0.05, pow), 6);
    if (strong) outlinedText(ctx, pow > 0.85 ? 'FORTE!' : pow > 0.4 ? 'médio' : 'fraquinho', p.x, p.y + 34, { size: 12, fill: color, lw: 3 });
    ctx.restore();
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
      } else if (p.kind === 'emoji') {
        ctx.translate(p.x + Math.sin(k * 8 + p.seed * 6) * 8, p.y - k * 70);
        ctx.font = `28px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.text, 0, 0);
      } else if (p.kind === 'num') {
        const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.7 : 1.3 - Math.min(0.3, k - 0.15);
        ctx.translate(p.x, p.y - k * 50);
        ctx.scale(pop, pop);
        outlinedText(ctx, p.text, 0, 0, { size: p.mine ? 28 : 22, fill: p.mine ? '#ffe14d' : '#ffffff', lw: 6 });
      }
      ctx.restore();
    }
  }

  // camada de tela: no celular o placar da parede fica fora da câmera → relógio compacto no topo
  drawHudCanvas(ctx, now) {
    const s = this.last;
    if (!s || !document.body.classList.contains('mobile')) return;
    const { vw } = this.game;
    const d = this.boardData(s);
    const y = 86;
    const label = s.ph === 'play' ? `${d.clock}s` : d.label;
    ctx.font = `700 15px ${FONT}`;
    const w = Math.max(150, ctx.measureText(label).width + 110);
    roundRect(ctx, vw / 2 - w / 2, y - 15, w, 30, 15);
    ctx.fillStyle = 'rgba(20,20,30,0.78)';
    ctx.fill();
    outlinedText(ctx, `🔴 ${d.alive.a}`, vw / 2 - w / 2 + 26, y, { size: 15, fill: '#ff9a8a', lw: 3 });
    outlinedText(ctx, label, vw / 2, y, { size: 15, fill: s.ph === 'play' && d.clock <= 10 && Math.floor(now / 250) % 2 ? '#ff4d3a' : '#ffffff', lw: 3 });
    outlinedText(ctx, `${d.alive.b} 🔵`, vw / 2 + w / 2 - 26, y, { size: 15, fill: '#9fc0ff', lw: 3 });
  }
}

// mão que segura a bola (pose 'qhold': bola erguida do lado da frente)
function handOf(v) {
  return { x: v.x + (v.dir || 1) * 27, y: v.y + 1, z: 34 };
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
