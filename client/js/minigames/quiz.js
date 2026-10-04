// Cliente da Corrida das Perguntas: entrar/sair/convidar, cena da sala de aula (pistas, pulinhos, apagador
// voando no combo, escudo, pum, presentes, professor), lousa em DOM com a pergunta e as opções (A–D), cartas,
// lobby com robôs, plateia (palpite que não conta + torcida) e pódio com revisão das perguntas erradas.
//
// Enquanto você está numa sala (correndo ou assistindo), o Game para de desenhar a praça e chama `frame()`
// daqui. Quem está na praça só vê a Escola acesa (minigames/school.js).

import { MSG } from '/shared/constants.js';
import { QZ, MODES, CARDS, CHEERS, BOTS, clamp } from '/shared/quiz.js';
import { FxLayer } from '../render/fx.js';
import { drawCharacter, headTop } from '../render/character.js';
import {
  SCENE, LANE_COLORS, laneY, squareX, squareW, prerenderClassroom, trackCanvas, drawGift, drawTrophy, drawEraser,
  drawChalkDust, drawShieldBubble, drawFartCloud, drawTeacher, drawSay,
} from '../render/classroom.js';
import { outlinedText, roundRect, FONT, INK } from '../render/paint.js';
import { play } from '../audio.js';
import { SchoolClient } from './school.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const ANSWER_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, KeyA: 0, KeyB: 1, KeyC: 2, KeyD: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
const CARD_KEYS = { KeyQ: 'cola', KeyW: 'pum', KeyE: 'dobro' };
const HOP_S = 0.26; // segundos por casa no pulinho
const BACK_SEATS = 12;
const TEACHER_LINES = {
  ask: ['Question {n}!', 'Pay attention!', 'Think fast!', 'Next question!', 'Here we go!'],
  gold: ['GOLDEN QUESTION!', 'Worth two squares!'],
  good: ['Well done!', 'Correct!', 'Excellent!', 'Good job, class!', 'Very good!'],
  bad: ['Oh no...', 'Study more!', 'Nobody?!', 'Wrong, wrong, wrong!'],
  hit: ['No throwing erasers!', 'Hey! Behave!', 'Detention!'],
  win: ['We have a winner!', 'Class dismissed!', 'Congratulations!'],
  lobby: ['Waiting for students...', 'Take a seat!', 'Ready to learn?'],
  count: ['Ready?', 'Get set...', 'Pencils ready!'],
};
const pick = (l) => l[Math.floor(Math.random() * l.length)];

function el(tag, cls = '', text = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== null) e.textContent = text;
  return e;
}

export class QuizClient {
  constructor(game, hud) {
    this.game = game;
    this.hud = hud;
    this.school = new SchoolClient(game, hud);
    this.room = null; // { id, mode, len, gifts, theme }
    this.ui = null;
    this.bg = null;
    this.fx = new FxLayer();
    this.reset();
  }

  reset() {
    this.role = 'watch';
    this.racers = new Map();
    this.watchers = new Map(); // pid -> { seat, want }
    this.host = 0;
    this.ph = 'lobby';
    this.tm = 0;
    this.phAt = performance.now();
    this.n = 0;
    this.race = 0;
    this.q = null;
    this.combos = [];
    this.myPick = -1;
    this.guess = -1;
    this.cola = [];
    this.dobro = false;
    this.pumUntil = 0;
    this.pumWipes = 0;
    this.lastReveal = null;
    this.moves = new Map();
    this.timeline = [];
    this.parts = [];
    this.flights = [];
    this.says = new Map();
    this.cheerAnim = new Map();
    this.teacherSay = null;
    this.teacherMood = '';
    this.review = [];
    this.myStats = { right: 0, asked: 0 };
    this.cam = { x: 0, y: 0, z: 1, ready: false };
    this.shakeAmp = 0;
    this.shakeAt = 0;
    this.lastTick = 0;
    this.fx.items = [];
    this.winnerId = 0;
  }

  // ---------- consultas ----------

  get me() {
    return this.game.me;
  }

  active() {
    return !!this.room;
  }

  // está numa sala da Escola (some da praça)
  hidden(id) {
    return this.school.where.has(id);
  }

  racing() {
    return this.racers.has(this.me);
  }

  nickOf(id) {
    return this.racers.get(id)?.nick ?? this.game.players.get(id)?.nick ?? '?';
  }

  colorOf(id) {
    const r = this.racers.get(id);
    return r ? LANE_COLORS[r.lane % LANE_COLORS.length] : '#888888';
  }

  lookOf(id) {
    return this.racers.get(id)?.look ?? this.game.players.get(id)?.look ?? { hat: '#888888', shirt: '#888888', skin: '#ffd9b3' };
  }

  // ---------- ações ----------

  create(mode, len) {
    this.game.send({ t: MSG.QZ_CREATE, mode, len });
    play('click');
  }

  join(id, as) {
    this.game.send({ t: MSG.QZ_JOIN, id, as });
    play('click');
  }

  invite(pid) {
    this.game.send({ t: MSG.CHALLENGE, to: pid, game: 'quiz' });
  }

  leaveRoom() {
    if (!this.room) return;
    this.game.send({ t: MSG.QZ_LEAVE });
    this.leave();
    this.hud.toast('Você saiu da Escola 👋');
    play('click');
  }

  answer(i) {
    const q = this.q;
    if (!q || this.ph !== 'ask' || this.cola.includes(i) || i >= q.opts.length) return;
    if (!this.racing()) {
      // plateia: palpite que não conta (só para você)
      if (this.guess >= 0) return;
      this.guess = i;
      this.renderOptions();
      play('qz_lock');
      return;
    }
    if (this.myPick >= 0) return;
    if (this.pumUntil > performance.now()) {
      this.wipePum();
      return;
    }
    this.myPick = i;
    this.game.send({ t: MSG.QZ_ANSWER, n: q.n, i });
    const r = this.racers.get(this.me);
    if (r) r.ans = 1;
    this.renderOptions();
    this.renderStatus();
    play('qz_lock');
  }

  useCard(c) {
    if (!this.racing() || this.ph !== 'ask') return;
    const r = this.racers.get(this.me);
    if (!r?.cards.includes(c)) return;
    if ((c === 'cola' || c === 'dobro') && this.myPick >= 0) {
      this.hud.toast('Use a carta ANTES de responder 😉');
      return;
    }
    if (c === 'cola' && (this.cola.length || this.q.opts.length <= 2)) return;
    if (c === 'dobro' && this.dobro) return;
    this.game.send({ t: MSG.QZ_CARD, c });
    play('qz_card');
  }

  cheer(r, side = 0) {
    this.game.send({ t: MSG.QZ_CHEER, r, side });
  }

  // ---------- rede ----------

  onMessage(msg, now) {
    this.school.onMessage(msg, now);
    switch (msg.t) {
      case MSG.WELCOME:
        return false;
      case MSG.QZ_ENTER: this.onEnter(msg, now); return true;
      case MSG.QZ_EXIT: this.onExit(msg); return true;
      case MSG.QZ_LIVE: return true;
      case MSG.QZ_ROOM: if (this.room) this.onRoom(msg); return true;
      case MSG.QZ_PHASE: if (this.room) this.onPhase(msg, now); return true;
      case MSG.QZ_Q: if (this.room) this.onQuestion(msg, now); return true;
      case MSG.QZ_REVEAL: if (this.room) this.onReveal(msg, now); return true;
      case MSG.QZ_EVENT: if (this.room) this.onEvent(msg, now); return true;
      case MSG.QZ_COLA: if (this.room) this.onCola(msg); return true;
      case MSG.QZ_END: this.onEnd(msg, now); return true;
      case MSG.CHALLENGE:
        if (msg.game !== 'quiz') return false;
        this.onInvite(msg);
        return true;
      case MSG.CH_STATUS:
        if (msg.game !== 'quiz') return false;
        this.onStatus(msg);
        return true;
      default:
        return false;
    }
  }

  onEnter(m, now) {
    const switching = !!this.room && this.room.id === m.id;
    if (!switching) this.reset();
    this.room = { id: m.id, mode: m.mode, len: m.len, gifts: m.gifts || [], theme: m.theme || { name: 'Inglês', flag: '🇺🇸' } };
    this.role = m.role;
    this.race = m.race;
    this.n = m.n;
    if (!switching) {
      this.enter();
      this.hud.log(null, `📚 Você entrou na Sala ${m.id} da Escola (${m.theme?.flag || ''} ${m.theme?.name || ''} · ${MODES[m.mode]?.label || ''})${m.role === 'watch' ? ' para assistir' : ''}`);
      play('qm_enter');
    }
    this.setPhase(m.ph, m.tm, now);
    if (m.q) {
      this.q = { n: m.q.n, lvl: m.q.lvl, gold: !!m.q.gold, cat: m.q.cat, q: m.q.q || '', opts: m.q.opts || [], tm: m.q.tm || 0, at: now };
      this.combos = m.q.combos || [];
    }
    this.renderAll();
  }

  onExit(m) {
    const text = { full: 'A sala está lotada! 🪑', gone: 'Essa sala fechou 😢', busy: 'Você está ocupado em outro jogo' }[m.reason];
    if (text) this.hud.toast(text);
    if (this.room && (m.id === this.room.id || m.reason === 'left')) this.leave();
  }

  onRoom(m) {
    const prev = this.racers;
    this.racers = new Map();
    for (const r of m.r) {
      const old = prev.get(r.id);
      this.racers.set(r.id, { ...r, g: new Set(r.g || []), seen: old?.seen ?? r.pos });
    }
    this.watchers = new Map(m.w.map(([pid, seat, want]) => [pid, { seat, want: !!want }]));
    this.host = m.host;
    const wasRacer = this.role === 'play';
    this.role = this.racers.has(this.me) ? 'play' : 'watch';
    if (wasRacer !== (this.role === 'play')) this.renderAll();
    else {
      this.renderParty();
      this.renderLobby();
      this.renderCards();
      this.renderStatus();
      this.renderNav();
      this.renderCheerBar();
    }
  }

  setPhase(ph, tm, now) {
    this.ph = ph;
    this.tm = tm || 0;
    this.phAt = now;
    this.deadline = now + (tm || 0) * 1000;
  }

  onPhase(m, now) {
    const prev = this.ph;
    this.setPhase(m.ph, m.tm, now);
    this.n = m.n;
    this.race = m.race;
    if (m.ph === 'intro') {
      this.q = { n: m.n, lvl: m.lvl, gold: !!m.gold, cat: m.cat, q: '', opts: [], tm: 0, at: now };
      this.combos = m.combos || [];
      this.myPick = -1;
      this.guess = -1;
      this.cola = [];
      this.dobro = false;
      for (const r of this.racers.values()) { r.ans = 0; r.dobro = 0; }
      this.teacher(m.gold ? pick(TEACHER_LINES.gold) : pick(TEACHER_LINES.ask).replace('{n}', m.n), 'talk', now);
      if (m.gold) {
        this.big('⭐ PERGUNTA DE OURO!', { size: 50, color: '#ffe14d', sub: 'acertou = anda 2 casas' }, now, this.viewCenterX(), 30);
        play('qz_gold');
      } else play('qz_tick');
      if (this.combos.some(([by, kind, to]) => kind === 'hit' && to === this.me)) play('invite');
      this.hidePodium();
    } else if (m.ph === 'lobby') {
      this.q = null;
      this.combos = [];
      this.teacher(pick(TEACHER_LINES.lobby), '', now);
      if (m.why === 'empty' && prev !== 'lobby') this.hud.toast('Ninguém correndo: a sala voltou para a espera');
    } else if (m.ph === 'count') {
      this.q = null;
      this.combos = [];
      this.teacher(pick(TEACHER_LINES.count), 'talk', now);
      this.hidePodium();
    }
    this.renderAll();
  }

  onQuestion(m, now) {
    this.setPhase('ask', m.tm, now);
    this.q = { n: m.n, q: m.q, opts: m.opts, tm: m.tm, lvl: m.lvl, gold: !!m.gold, cat: m.cat, at: now };
    this.myPick = -1;
    this.guess = -1;
    this.cola = [];
    if (this.racing()) this.myStats.asked++;
    for (const [to, by] of m.pum || []) {
      this.fartAt(by, to, now, true);
      if (to === this.me) this.startPum(now, by);
    }
    this.renderAll();
  }

  onCola(m) {
    if (!this.q || m.n !== this.q.n) return;
    this.cola = m.hide;
    this.renderOptions();
    this.renderCards();
  }

  onReveal(m, now) {
    this.setPhase('reveal', 0, now);
    const q = this.q || { n: m.n, opts: [], q: '' };
    this.lastReveal = { ...m, at: now };
    this.pumUntil = 0;
    // revisão (para aprender): o que eu errei nesta corrida
    if (this.racing()) {
      if (this.myPick === m.ok) this.myStats.right++;
      else this.review.push({ q: q.q, mine: this.myPick >= 0 ? q.opts[this.myPick] : '(não respondeu)', right: m.a, tip: m.tip, cat: q.cat });
    }
    const rows = m.res.map(([id, from, mid, to, correct, i, ms, dobro, streak]) => ({ id, from, mid, to, correct: !!correct, i, ms, dobro: !!dobro, streak }));
    const mine = rows.find((r) => r.id === this.me);
    if (mine) play(mine.correct ? 'qz_right' : 'qz_wrong');
    else if (this.guess >= 0) play(this.guess === m.ok ? 'qz_right' : 'qz_wrong');
    const anyRight = rows.some((r) => r.correct);
    this.teacher(anyRight ? pick(TEACHER_LINES.good) : pick(TEACHER_LINES.bad), anyRight ? 'happy' : 'angry', now);
    // 1) pulinhos (e presentes passando pelas casas)
    const t0 = now + 450;
    let hopEnd = t0;
    for (const r of rows) {
      const racer = this.racers.get(r.id);
      if (!racer) continue;
      racer.seen = r.from;
      if (r.mid !== r.from) {
        const steps = Math.abs(r.mid - r.from);
        const dur = (r.mid > r.from ? HOP_S * steps : 0.35) * 1000;
        this.addMove(r.id, { from: r.from, to: r.mid, at: t0, dur, kind: r.mid > r.from ? 'hop' : 'slide' });
        hopEnd = Math.max(hopEnd, t0 + dur);
        if (r.mid > r.from) for (let k = 0; k < steps; k++) this.at(t0 + k * HOP_S * 1000, () => play('qz_hop'));
        else this.at(t0, () => { this.text('🎲 errou: volta 1', r.id, '#ffd0a0', performance.now()); play('qz_wrong'); });
      }
      if (r.correct) this.at(t0 + 100, () => this.num(r.id, `+${r.mid - r.from}`, '#7cfc9a', performance.now()));
      if (r.dobro && r.correct) this.at(t0, () => this.text('🎲 DOBROU!', r.id, '#ffe14d', performance.now(), 18));
    }
    for (const [id, card, sq] of m.gifts) {
      const r = rows.find((x) => x.id === id);
      const k = r ? Math.max(0, sq - r.from) : 1;
      this.at(t0 + k * HOP_S * 1000, () => {
        const racer = this.racers.get(id);
        racer?.g.add(sq);
        const p = this.scenePos(id);
        this.spark('ring', p.x, p.y - 40, performance.now(), '#ffe14d', 1.2);
        this.text(card ? `🎁 ${CARDS[card].icon} ${CARDS[card].label}!` : '🎁 mão cheia!', id, '#ffe14d', performance.now(), 17);
        play('qz_gift');
      });
    }
    // 2) combos: apagador voando, escudo, bloqueio
    const tc = hopEnd + 120;
    m.combos.forEach(([by, kind, to], k) => {
      const at = tc + k * 380;
      if (kind === 'hit' || kind === 'block') {
        this.at(at, () => this.throwEraser(by, to, kind, rows.find((r) => r.id === to)));
      } else if (kind === 'shield') {
        this.at(at, () => {
          this.text('🛡️ ESCUDO!', by, '#9fd8ff', performance.now(), 20);
          play('qz_shield');
        });
      } else if (kind === 'combo') {
        this.at(at, () => this.text('🔥 COMBO! +50', by, '#ffb347', performance.now(), 18));
      } else if (kind === 'safe') {
        this.at(at, () => this.text('a salvo na chegada!', to, '#ffffff', performance.now(), 15));
      }
    });
    // 3) chegada
    if (m.win) {
      const tw = tc + m.combos.length * 380 + 300;
      this.at(tw, () => {
        this.winnerId = m.win;
        const p = this.scenePos(m.win);
        this.fx.add('confetti', { x: p.x, y: p.y - 60 }, performance.now());
        this.big(`🏆 ${this.nickOf(m.win).toUpperCase()} VENCEU!`, { size: 54, color: '#ffe14d', sub: 'cruzou a chegada' }, performance.now(), this.viewCenterX(), 40);
        this.teacher(pick(TEACHER_LINES.win), 'happy', performance.now());
        play(m.win === this.me ? 'win' : 'qz_bell');
        this.shake(8, performance.now());
      });
    }
    if (m.fast && rows.length > 1) this.at(t0 + 200, () => this.text('⚡ mais rápido', m.fast, '#9fd8ff', performance.now(), 13));
    this.renderAll();
  }

  addMove(id, mv) {
    if (!this.moves.has(id)) this.moves.set(id, []);
    const list = this.moves.get(id);
    list.push(mv);
    while (list.length > 6) list.shift();
  }

  at(t, fn) {
    this.timeline.push({ t, fn });
  }

  throwEraser(by, to, kind, row) {
    const now = performance.now();
    const a = this.scenePos(by);
    const b = this.scenePos(to);
    play('qz_whoosh');
    this.flights.push({ kind: 'eraser', ax: a.x, ay: a.y - 70, bx: b.x, by: b.y - 60, at: now, dur: 520 });
    this.at(now + 520, () => {
      const t = performance.now();
      if (kind === 'hit') {
        const from = row ? row.mid : (this.racers.get(to)?.pos ?? 1) + 1;
        this.addMove(to, { from, to: Math.max(0, from - 1), at: t, dur: 420, kind: 'knock' });
        this.parts.push({ kind: 'dust', x: b.x, y: b.y - 60, born: t, life: 600 });
        this.num(to, '-1 CASA', '#ff6a4d', t);
        this.big('VOLTA 1 CASA!', { size: 34, color: '#ff8a73', sub: `${this.nickOf(by)} acertou 2 seguidas` }, t, b.x, b.y - 150);
        this.teacher(pick(TEACHER_LINES.hit), 'angry', t);
        play('qz_hit');
        this.shake(to === this.me ? 12 : 6, t);
        const ar = this.racers.get(by);
        const vr = this.racers.get(to);
        if (ar && vr && row && ar.pos >= vr.pos) this.at(t + 400, () => this.text('ULTRAPASSOU! 💨', by, '#ffe14d', performance.now(), 18));
      } else {
        this.parts.push({ kind: 'flash', x: b.x, y: b.y - 46, born: t, life: 500 });
        this.big('BLOQUEOU! 🛡️', { size: 32, color: '#9fd8ff', sub: `o escudo de ${this.nickOf(to)} aguentou` }, t, b.x, b.y - 150);
        play('qz_block');
      }
    });
  }

  fartAt(by, to, now, quiet = false) {
    const a = this.scenePos(by);
    const b = this.scenePos(to);
    this.flights.push({ kind: 'fart', ax: a.x, ay: a.y - 50, bx: b.x, by: b.y - 50, at: now, dur: 700 });
    this.at(now + 700, () => {
      const r = this.racers.get(to);
      if (r) r.fartUntil = performance.now() + QZ.PUM_TIME * 1000;
      if (!quiet) play('fart');
    });
  }

  startPum(now, by) {
    this.pumUntil = now + QZ.PUM_TIME * 1000;
    this.pumWipes = 0;
    this.pumBy = by;
    this.renderOptions();
    play('fart');
  }

  wipePum() {
    this.pumWipes++;
    play('qz_whoosh');
    if (this.pumWipes >= 3) this.pumUntil = 0;
    this.renderOptions();
  }

  onEvent(e, now) {
    const mine = e.by === this.me || e.id === this.me;
    switch (e.kind) {
      case 'answered': {
        const r = this.racers.get(e.id);
        if (r) r.ans = 1;
        if (e.id !== this.me) play('qz_tick');
        this.renderParty();
        break;
      }
      case 'card': {
        const c = CARDS[e.c];
        if (e.c === 'cola') {
          this.text(`🤫 COLOU!`, e.by, '#c9f3d2', now, 16);
        } else if (e.c === 'dobro') {
          const r = this.racers.get(e.by);
          if (r) r.dobro = 1;
          if (e.by === this.me) this.dobro = true;
          this.text('🎲 TUDO OU NADA!', e.by, '#ffe14d', now, 17);
        } else if (e.c === 'pum') {
          if (e.blocked) {
            this.fartAt(e.by, e.to, now, true);
            this.at(now + 700, () => {
              this.text('🛡️ escudo segurou o pum', e.to, '#9fd8ff', performance.now(), 15);
              play('qz_block');
            });
          } else {
            this.fartAt(e.by, e.to, now);
            if (e.to === this.me && e.now) this.at(now + 650, () => this.startPum(performance.now(), e.by));
            if (e.to === this.me && e.next) this.hud.toast(`💨 ${this.nickOf(e.by)} te mandou um PUM — vai feder na próxima pergunta!`);
          }
          this.hud.log(null, `💨 ${this.nickOf(e.by)} soltou um pum em ${this.nickOf(e.to)}`);
        }
        if (c && e.by !== this.me) play('qz_card');
        this.renderCards();
        this.renderParty();
        break;
      }
      case 'nocard':
        this.hud.toast(e.why === 'ahead' ? 'Ninguém na sua frente para levar o pum 😅' : 'Não deu para usar a carta');
        break;
      case 'cheer': this.onCheer(e, now); break;
      case 'join':
        if (e.id !== this.me) {
          this.hud.log(null, `📚 ${e.nick} entrou ${e.as === 'play' ? 'para correr' : e.want ? 'na plateia (corre na próxima)' : 'para assistir'}`);
          play('join');
        }
        break;
      case 'leave':
        this.hud.log(null, `${e.nick} saiu da sala`);
        break;
      case 'bot':
        this.hud.log(null, `🤖 ${e.nick} (${BOTS[e.level]?.label || 'robô'}) entrou na corrida`);
        play('join');
        break;
      case 'want':
        if (mine) this.hud.toast('⏳ Combinado: você corre na próxima corrida!');
        break;
      case 'bench':
        if (mine) this.hud.toast(e.why === 'afk' ? '💤 Você ficou sem responder: foi para a plateia (🙋 para voltar)' : '👀 Agora você está assistindo');
        else if (e.why === 'afk') this.hud.log(null, `💤 ${this.nickOf(e.id)} foi para a plateia (ausente)`);
        break;
      case 'start':
        this.review = [];
        this.myStats = { right: 0, asked: 0 };
        this.winnerId = 0;
        this.moves.clear();
        for (const r of this.racers.values()) { r.seen = 0; r.g = new Set(); }
        this.big(`CORRIDA ${e.race}!`, { size: 56, color: '#ffffff', sub: `${e.len} casas até a chegada · boa sorte!` }, now, this.viewCenterX(), 30);
        play('qz_bell');
        break;
      case 'say':
        this.says.set(e.id, { text: e.text, until: now + 2800 });
        break;
      default:
        break;
    }
  }

  onCheer(e, now) {
    this.cheerAnim.set(e.by, { r: e.r, side: e.side, at: now });
    const pos = this.seatPos(e.by);
    if (pos) {
      const icon = CHEERS[e.r]?.icon || '👏';
      this.parts.push({ kind: 'emoji', text: icon, x: pos.x, y: pos.y - 70, born: now, life: 1300, seed: Math.random() });
      if (e.r === 'go' && e.side) this.says.set(e.by, { text: `VAI ${this.nickOf(e.side).toUpperCase()}!`, until: now + 1600 });
    }
    if (e.by !== this.me) play('kt_cheer');
  }

  onEnd(m, now) {
    const [, , , right, asked] = m.rank.find((r) => r[0] === m.winner) || [];
    this.hud.log(null, `📚 ${m.bot ? '🤖 ' : ''}${m.winnerNick} venceu a Corrida das Perguntas (${m.theme}) — ${right ?? '?'}/${asked ?? '?'} certas! 🏆`);
    if (!this.room || this.room.id !== m.id) return;
    this.setPhase('over', QZ.OVER_TIME, now);
    setTimeout(() => this.showPodium(m), 600);
    this.renderAll();
  }

  onInvite(msg) {
    play('invite');
    const n = msg.n || 0;
    this.hud.log(null, `📚 ${msg.nick} te chamou para a Corrida das Perguntas!`);
    this.hud.invite({
      from: msg.from,
      key: `z${msg.from}`,
      cls: 'qz-invite',
      nick: msg.nick,
      ttl: msg.ttl || QZ.INVITE_TTL_MS,
      title: `📚 ${msg.nick} te chamou pra Corrida das Perguntas!`,
      sub: msg.match ? `Sala ${msg.match} · ${n} na sala · ${MODES[msg.mode]?.label || ''} · 🇺🇸 Inglês` : 'Sala nova na Escola · 🇺🇸 Inglês · quem acertar mais anda mais!',
      onAccept: () => this.game.send({ t: MSG.CHALLENGE_REPLY, from: msg.from, accept: true }),
      onDecline: () => this.game.send({ t: MSG.CHALLENGE_REPLY, from: msg.from, accept: false }),
    });
  }

  onStatus(m) {
    const nick = m.nick || 'O jogador';
    const text = {
      sent: `Convite para a Corrida das Perguntas enviado para ${nick}! 📚⏳`,
      declined: `${nick} não quis estudar agora 📚🙈`,
      expired: `Convite da corrida para ${nick} expirou`,
      busy: `${nick} está ocupado jogando`,
      gone: `${nick} saiu da praça`,
      invalid: 'Não dá para chamar esse jogador',
    }[m.status];
    if (m.status === 'expired' || m.status === 'gone') this.hud.removeInvite(`z${m.with}`);
    if (text) this.hud.toast(text);
  }

  onChat(msg, now) {
    if (!this.room) return;
    if (this.racers.has(msg.id) || this.watchers.has(msg.id)) this.says.set(msg.id, { text: msg.text, until: now + Math.min(4500, 1600 + msg.text.length * 60) });
  }

  // ---------- entrar/sair da cena ----------

  enter() {
    document.body.classList.add('qz-on');
    this.hud.closePlayerCard();
    this.hud.clearInvites();
    this.hud.closeGgResult();
    this.school.closePanel();
    this.game.dest = null;
    this.buildUi();
  }

  leave() {
    this.room = null;
    this.reset();
    document.body.classList.remove('qz-on');
    if (this.ui) this.ui.hidden = true;
    this.hidePodium();
    this.closeInvitePanel();
  }

  // ---------- interface (DOM) ----------

  buildUi() {
    if (this.ui) {
      this.ui.hidden = false;
      return;
    }
    const ui = el('div');
    ui.id = 'qz-ui';
    // textos fixos (nada vindo de usuário: o resto entra por textContent)
    ui.innerHTML = `
      <div class="qz-nav">
        <button class="qz-inv">➕ <span class="qz-long">Convidar</span></button>
        <button class="qz-role"></button>
        <button class="qz-exit">🚪 <span class="qz-long">Sair</span></button>
      </div>
      <div id="qz-party"></div>
      <div id="qz-board" data-mode="lobby">
        <div class="qzb-head">
          <span class="qzb-n"></span><span class="qzb-cat"></span><span class="qzb-lvl"></span><span class="qzb-gold">⭐ VALE 2 CASAS</span>
        </div>
        <div class="qzb-timer"><span class="qzb-bar"><i></i></span><b></b></div>
        <div class="qzb-q"></div>
        <div class="qzb-opts"></div>
        <div class="qzb-pum" hidden><span>💨</span><b>PUM de <em></em>!</b><small>toque 3× para abanar</small></div>
        <div class="qzb-tip" hidden></div>
        <div class="qzb-foot"><div class="qzb-cards"></div><div class="qzb-status"></div></div>
        <div class="qzb-lobby"></div>
      </div>
      <div id="qz-cheer" hidden></div>
      <div id="qz-invite" hidden></div>
      <div id="qz-podium" hidden></div>`;
    document.body.appendChild(ui);
    this.ui = ui;
    ui.querySelector('.qz-exit').addEventListener('click', () => this.leaveRoom());
    ui.querySelector('.qz-inv').addEventListener('click', () => this.toggleInvitePanel());
    ui.querySelector('.qz-role').addEventListener('click', () => {
      if (!this.room) return;
      this.join(this.room.id, this.racing() ? 'watch' : 'play');
    });
    ui.querySelector('.qzb-pum').addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      this.wipePum();
    });
    ui.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }

  $(sel) {
    return this.ui?.querySelector(sel);
  }

  renderAll() {
    if (!this.ui || !this.room) return;
    const board = this.$('#qz-board');
    board.dataset.mode = this.ph;
    board.classList.toggle('watching', !this.racing());
    board.classList.toggle('gold', !!this.q?.gold && ['intro', 'ask', 'reveal'].includes(this.ph));
    this.renderNav();
    this.renderHead();
    this.renderQuestion();
    this.renderOptions();
    this.renderTip();
    this.renderCards();
    this.renderStatus();
    this.renderLobby();
    this.renderParty();
    this.renderCheerBar();
  }

  renderNav() {
    const b = this.$('.qz-role');
    if (!b) return;
    const w = this.watchers.get(this.me);
    b.replaceChildren(document.createTextNode(this.racing() ? '👀 ' : '🙋 '), el('span', 'qz-long', this.racing() ? 'Só assistir' : w?.want ? 'Na fila...' : 'Quero correr'));
    b.disabled = !this.racing() && !!w?.want;
    b.classList.toggle('want', !this.racing() && !w?.want);
  }

  renderHead() {
    const q = this.q;
    const show = q && ['intro', 'ask', 'reveal'].includes(this.ph);
    this.$('.qzb-n').textContent = show ? `PERGUNTA ${q.n}` : this.ph === 'over' ? 'FIM DA CORRIDA' : `SALA ${this.room.id}`;
    this.$('.qzb-cat').textContent = show && q.cat ? `${q.cat.icon} ${q.cat.label}` : `${this.room.theme.flag} ${this.room.theme.name} · ${MODES[this.room.mode]?.icon} ${MODES[this.room.mode]?.label} · ${this.room.len} casas`;
    this.$('.qzb-lvl').textContent = show ? '⭐'.repeat(q.lvl || 1) : '';
    this.$('.qzb-lvl').title = show ? ['', 'básico', 'intermediário', 'avançado'][q.lvl || 1] : '';
  }

  renderQuestion() {
    const box = this.$('.qzb-q');
    const q = this.q;
    if (this.ph === 'intro') box.textContent = q?.gold ? '⭐ Pergunta de ouro chegando... vale 2 casas!' : 'Prepare-se...';
    else if (this.ph === 'ask' || this.ph === 'reveal') box.textContent = q?.q || '';
    else box.textContent = '';
  }

  renderOptions() {
    const box = this.$('.qzb-opts');
    const q = this.q;
    const pumBox = this.$('.qzb-pum');
    const pum = this.pumUntil > performance.now() && this.ph === 'ask';
    pumBox.hidden = !pum;
    if (pum) {
      pumBox.querySelector('em').textContent = this.nickOf(this.pumBy);
      pumBox.style.opacity = String(1 - this.pumWipes * 0.28);
    }
    if (!q || !['ask', 'reveal'].includes(this.ph) || !q.opts.length) {
      box.replaceChildren();
      box.dataset.n = '0';
      return;
    }
    const rv = this.ph === 'reveal' ? this.lastReveal : null;
    const picks = new Map();
    if (rv) for (const [id, , , , , i] of rv.res) if (i >= 0) { if (!picks.has(i)) picks.set(i, []); picks.get(i).push(id); }
    const chosen = this.racing() ? this.myPick : this.guess;
    box.dataset.n = String(q.opts.length);
    box.replaceChildren(...q.opts.map((text, i) => {
      const b = el('button', 'qzb-opt');
      b.dataset.i = String(i);
      b.append(el('kbd', '', LETTERS[i]), el('span', 'qzb-txt', text));
      const hidden = this.cola.includes(i);
      if (hidden) b.classList.add('cola');
      if (i === chosen) b.classList.add('picked');
      if (rv) {
        if (i === rv.ok) b.classList.add('ok');
        else if (i === chosen) b.classList.add('bad');
        else b.classList.add('dim');
        const who = el('span', 'qzb-who');
        for (const id of picks.get(i) || []) {
          const dot = el('i', '', this.nickOf(id).slice(0, 1).toUpperCase());
          dot.style.background = this.colorOf(id);
          dot.title = this.nickOf(id);
          who.append(dot);
        }
        b.append(who);
      } else if (chosen >= 0 && i !== chosen) b.classList.add('dim');
      b.disabled = !!rv || hidden || (chosen >= 0);
      b.addEventListener('click', () => this.answer(i));
      return b;
    }));
  }

  renderTip() {
    const box = this.$('.qzb-tip');
    const rv = this.ph === 'reveal' ? this.lastReveal : null;
    box.hidden = !rv;
    if (!rv) return;
    const mine = rv.res.find(([id]) => id === this.me);
    let lead = '';
    if (mine) lead = mine[4] ? '✔ Acertou! ' : mine[5] < 0 ? '⏰ Não respondeu. ' : '✖ Errou. ';
    else if (this.guess >= 0) lead = this.guess === rv.ok ? '✔ Você acertaria! ' : '✖ Seu palpite errou. ';
    box.replaceChildren(el('b', '', lead), document.createTextNode(`Certa: ${rv.a}`), el('br'), el('span', 'qzb-tiptxt', `💡 ${rv.tip}`));
  }

  renderCards() {
    const box = this.$('.qzb-cards');
    if (!box) return;
    const r = this.racers.get(this.me);
    if (!r || !['intro', 'ask', 'reveal'].includes(this.ph)) {
      box.replaceChildren();
      return;
    }
    const items = r.cards.map((c) => {
      const d = CARDS[c];
      const b = el('button', `qzb-card qzc-${c}`);
      b.title = `${d.label}: ${d.tip} (tecla ${d.key})`;
      b.append(el('span', 'qzb-ci', d.icon), el('b', '', d.label), el('kbd', '', d.key));
      b.disabled = this.ph !== 'ask' || ((c === 'cola' || c === 'dobro') && this.myPick >= 0);
      b.addEventListener('click', () => this.useCard(c));
      return b;
    });
    if (!items.length) items.push(el('span', 'qzb-nocard', '🎁 passe pelas casas de presente para ganhar cartas'));
    if (this.dobro) items.unshift(el('span', 'qzb-on', '🎲 TUDO OU NADA ligado!'));
    box.replaceChildren(...items);
  }

  // linha de status: combo armado, ameaça, quem falta responder
  renderStatus() {
    const box = this.$('.qzb-status');
    if (!box) return;
    let text = '';
    let cls = '';
    if (['intro', 'ask'].includes(this.ph)) {
      const myCombo = this.combos.find(([by]) => by === this.me);
      const threat = this.combos.find(([by, kind, to]) => kind === 'hit' && to === this.me);
      const r = this.racers.get(this.me);
      if (myCombo && myCombo[1] === 'hit') { text = `🔥 COMBO! Acertando, ${this.nickOf(myCombo[2])} volta 1 casa`; cls = 'combo'; }
      else if (myCombo && myCombo[1] === 'shield') { text = '🔥 COMBO! Acertando você ganha um 🛡️ escudo'; cls = 'combo'; }
      else if (threat && !(r?.shield > 0)) { text = `⚠️ ${this.nickOf(threat[0])} está com COMBO: se acertar, você volta 1 casa!`; cls = 'threat'; }
      else if (threat) { text = `🛡️ ${this.nickOf(threat[0])} está com combo, mas seu escudo segura`; cls = 'safe'; }
      else if (this.ph === 'ask' && this.racing() && this.myPick >= 0) {
        const left = [...this.racers.values()].filter((x) => !x.ans).length;
        text = left ? `✋ Respondido! esperando ${left}...` : '✋ Respondido!';
      } else if (this.ph === 'ask' && !this.racing()) text = '👀 Palpite: toque numa opção (não conta, é só para você testar)';
    }
    box.textContent = text;
    box.className = `qzb-status ${cls}`;
  }

  renderLobby() {
    const box = this.$('.qzb-lobby');
    if (!box || !this.room) return;
    if (!['lobby', 'count', 'over'].includes(this.ph)) {
      box.replaceChildren();
      return;
    }
    const parts = [];
    if (this.ph === 'count') {
      const big = el('div', 'qzl-count');
      big.dataset.live = '1';
      parts.push(big);
    } else if (this.ph === 'over') {
      parts.push(el('div', 'qzl-title', '🏆 Fim da corrida! A próxima começa já já...'));
    } else {
      parts.push(el('div', 'qzl-title', this.racers.size < 2 ? '📚 Esperando a turma... chame alguém ou treine com robôs!' : 'Preparando...'));
    }
    const list = el('div', 'qzl-list');
    for (const r of [...this.racers.values()].sort((a, b) => a.lane - b.lane)) {
      const row = el('div', 'qzl-row');
      const dot = el('i');
      dot.style.background = LANE_COLORS[r.lane % LANE_COLORS.length];
      row.append(dot, el('b', '', `${r.bot ? '🤖 ' : ''}${r.nick}${r.id === this.me ? ' (você)' : ''}`));
      if (r.bot) {
        row.append(el('small', '', BOTS[r.bot]?.label || ''));
        if (this.racing() && this.ph !== 'over') {
          const x = el('button', 'qzl-x', '✖');
          x.title = 'Tirar o robô';
          x.addEventListener('click', () => this.game.send({ t: MSG.QZ_BOT, remove: r.id }));
          row.append(x);
        }
      }
      list.append(row);
    }
    const waiting = [...this.watchers.entries()].filter(([, w]) => w.want).map(([pid]) => this.nickOf(pid));
    if (waiting.length) list.append(el('div', 'qzl-want', `⏳ entram na próxima: ${waiting.join(', ')}`));
    parts.push(list);
    if (this.racing() && this.ph !== 'over') {
      const row = el('div', 'qzl-btns');
      const start = el('button', 'qzl-start', this.racers.size < 2 ? '▶ Começar sozinho' : '▶ Começar já');
      start.addEventListener('click', () => { this.game.send({ t: MSG.QZ_START }); play('click'); });
      if (this.ph === 'lobby' || this.ph === 'count') row.append(start);
      const bots = [...this.racers.values()].filter((r) => r.bot).length;
      if (bots < QZ.MAX_BOTS && this.racers.size < QZ.MAX_RACERS) {
        for (const lv of ['easy', 'normal', 'hard']) {
          const b = el('button', `qzl-bot ${lv}`, `🤖 + ${BOTS[lv].label.replace('Robô ', '')}`);
          b.title = `${BOTS[lv].label}: acerta ~${Math.round(BOTS[lv].skill * 100)}% no básico`;
          b.addEventListener('click', () => { this.game.send({ t: MSG.QZ_BOT, add: lv }); play('click'); });
          row.append(b);
        }
      }
      parts.push(row);
    }
    if (this.ph !== 'over') {
      const how = el('ul', 'qzl-how');
      for (const t of [
        '✔ Acertou = anda 1 casa · errou = fica',
        '🔥 2 acertos seguidos = COMBO: quem está na sua frente volta 1 casa (liderando, você ganha um 🛡️ escudo)',
        '⭐ A cada 5 perguntas, uma de ouro vale 2 casas',
        `🎁 Casas de presente dão cartas: ${Object.values(CARDS).map((c) => `${c.icon} ${c.label}`).join(' · ')}`,
        '🏁 Primeiro a cruzar a chegada vence · quem entra no meio começa da largada',
      ]) how.append(el('li', '', t));
      parts.push(how);
    }
    box.replaceChildren(...parts);
  }

  renderParty() {
    const box = this.$('#qz-party');
    if (!box || !this.room) return;
    const len = this.room.len;
    const rows = [...this.racers.values()].sort((a, b) => b.pos - a.pos || a.lane - b.lane);
    box.replaceChildren(...rows.map((r) => {
      const row = el('div', `qp-row${r.id === this.me ? ' me' : ''}`);
      const dot = el('i', 'qp-dot');
      dot.style.background = LANE_COLORS[r.lane % LANE_COLORS.length];
      const name = el('span', 'qp-nick', `${r.bot ? '🤖' : ''}${r.nick}`);
      const bar = el('span', 'qp-bar');
      const fill = el('b');
      fill.style.width = `${(r.pos / len) * 100}%`;
      fill.style.background = LANE_COLORS[r.lane % LANE_COLORS.length];
      bar.append(fill);
      const flags = [];
      if (r.streak >= 1) flags.push(`🔥${r.streak}`);
      if (r.shield > 0) flags.push('🛡️');
      if (r.dobro) flags.push('🎲');
      if (this.ph === 'ask' && r.ans) flags.push('✋');
      const cards = r.cards.map((c) => CARDS[c]?.icon || '').join('');
      row.append(dot, name, bar, el('span', 'qp-pos', `${r.pos}/${len}`), el('span', 'qp-flags', flags.join(' ')), el('span', 'qp-cards', cards));
      return row;
    }));
    const w = this.watchers.size;
    if (w) box.append(el('div', 'qp-watch', `👀 ${w} na plateia`));
  }

  renderCheerBar() {
    const box = this.$('#qz-cheer');
    if (!box) return;
    const show = !this.racing();
    box.hidden = !show;
    if (!show) return;
    const items = [];
    for (const r of [...this.racers.values()].sort((a, b) => a.lane - b.lane).slice(0, 4)) {
      const b = el('button', 'qc-go', `📣 ${r.nick.slice(0, 10)}`);
      b.style.background = LANE_COLORS[r.lane % LANE_COLORS.length];
      b.addEventListener('click', () => this.cheer('go', r.id));
      items.push(b);
    }
    for (const id of ['clap', 'wow', 'lol', 'think', 'fire']) {
      const b = el('button', 'qc-r', CHEERS[id].icon);
      b.title = CHEERS[id].label;
      b.addEventListener('click', () => this.cheer(id));
      items.push(b);
    }
    box.replaceChildren(...items);
  }

  // ---------- convidar (de dentro da sala) ----------

  toggleInvitePanel() {
    const box = this.$('#qz-invite');
    if (!box.hidden) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const head = el('div', 'qi-head');
    head.append(el('b', '', '➕ Chamar para a sala'));
    const x = el('button', 'gp-x', '×');
    x.addEventListener('click', () => { box.hidden = true; });
    head.append(x);
    const list = el('div', 'qi-list');
    const free = [...this.game.players.values()].filter((p) => p.id !== this.me && !this.game.hiddenInPlaza(p.id)).sort((a, b) => a.nick.localeCompare(b.nick));
    if (!free.length) list.append(el('p', 'gp-empty', 'Ninguém livre na praça agora 😴 — tente os robôs 🤖'));
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
    box.replaceChildren(head, list, el('p', 'gp-tip', 'Quem aceitar entra nesta sala (se a corrida já estiver longe, corre na próxima).'));
    play('click');
  }

  closeInvitePanel() {
    const box = this.$('#qz-invite');
    if (box) box.hidden = true;
  }

  // ---------- pódio + revisão ----------

  showPodium(m) {
    const box = this.$('#qz-podium');
    if (!box || !this.room || this.room.id !== m.id) return;
    const card = el('div', 'qzp-card');
    card.append(el('div', 'qzp-emoji', m.winner === this.me ? '🏆' : '📚'), el('h2', '', `${m.bot ? '🤖 ' : ''}${m.winnerNick} venceu a corrida!`));
    const ol = el('ol', 'qzp-rank');
    m.rank.slice(0, 6).forEach(([id, nick, pos, right, asked, best, attacks, , bot], i) => {
      const li = el('li', id === this.me ? 'me' : '');
      li.append(el('span', 'qzp-pos', ['🥇', '🥈', '🥉'][i] || `${i + 1}º`), el('b', '', `${bot ? '🤖 ' : ''}${nick}`),
        el('span', 'qzp-stats', `✔ ${right}/${asked} · 🔥${best} · ⚡${attacks}`), el('b', 'qzp-sq', `${pos}/${this.room.len}`));
      ol.append(li);
    });
    card.append(ol);
    if (this.review.length || this.myStats.asked) {
      const rv = el('div', 'qzp-review');
      const pct = this.myStats.asked ? Math.round((this.myStats.right / this.myStats.asked) * 100) : 0;
      rv.append(el('b', '', this.review.length ? `📖 Revisão — você acertou ${this.myStats.right} de ${this.myStats.asked} (${pct}%). Reveja as que errou:` : `📖 Você acertou TODAS as ${this.myStats.asked}! 🤓`));
      const ul = el('ul');
      for (const it of this.review.slice(-8)) {
        const li = el('li');
        li.append(el('span', 'qzr-q', it.q), el('span', 'qzr-a', `✔ ${it.right}`), el('span', 'qzr-m', `você: ${it.mine}`), el('small', '', it.tip || ''));
        ul.append(li);
      }
      if (this.review.length) rv.append(ul);
      card.append(rv);
    }
    const row = el('div', 'qzp-actions');
    const stay = el('button', 'qzp-stay', '🔁 Próxima corrida');
    stay.addEventListener('click', () => this.hidePodium());
    const out = el('button', 'qzp-out', '🚪 Sair');
    out.addEventListener('click', () => this.leaveRoom());
    row.append(stay, out);
    card.append(el('p', 'qzp-sub', `Nova corrida em ~${QZ.OVER_TIME + QZ.COUNT_TIME} s · quem estava assistindo e pediu entra agora`), row);
    box.replaceChildren(card);
    box.hidden = false;
  }

  hidePodium() {
    const box = this.$('#qz-podium');
    if (box) box.hidden = true;
  }

  // ---------- controles ----------

  // true = tecla consumida (dentro da sala os números são respostas, não emotes)
  key(ev, down) {
    if (!this.room) return false;
    const code = ev.code;
    if (!down) return code in ANSWER_KEYS || code in CARD_KEYS;
    if (ev.repeat) return true;
    if (code in ANSWER_KEYS) {
      if (this.pumUntil > performance.now() && this.racing()) this.wipePum();
      else this.answer(ANSWER_KEYS[code]);
      return true;
    }
    if (code in CARD_KEYS) {
      this.useCard(CARD_KEYS[code]);
      return true;
    }
    return /^(Key|Digit|Arrow)/.test(code); // nada de andar na praça nem emote por tecla dentro da sala
  }

  pointerDown(ev) {
    if (!this.room) return;
    this.closeInvitePanel();
    void ev;
  }

  // ---------- por frame ----------

  frame(dt, now) {
    if (!this.room) return;
    // linha do tempo da revelação (pulinhos, apagadores, chegada)
    if (this.timeline.length) {
      const due = this.timeline.filter((a) => a.t <= now);
      this.timeline = this.timeline.filter((a) => a.t > now);
      for (const a of due) a.fn();
    }
    this.fx.update(now);
    this.parts = this.parts.filter((p) => now - p.born < p.life);
    this.flights = this.flights.filter((f) => now - f.at < f.dur);
    this.updateTimer(now);
    this.updateCamera(dt);
    this.draw(this.game.ctx, now);
  }

  updateTimer(now) {
    const bar = this.$('.qzb-timer');
    if (!bar) return;
    if (this.ph === 'ask' && this.q) {
      const left = Math.max(0, (this.deadline - now) / 1000);
      const k = this.q.tm ? left / this.q.tm : 0;
      bar.querySelector('i').style.transform = `scaleX(${k})`;
      bar.querySelector('b').textContent = `${Math.ceil(left)}s`;
      bar.classList.toggle('hurry', left <= 4);
      const c = Math.ceil(left);
      if (c <= 4 && c > 0 && c !== this.lastTick) {
        this.lastTick = c;
        play('tick');
      }
    } else if (this.ph === 'count') {
      const left = Math.max(0, (this.deadline - now) / 1000);
      const big = this.$('.qzl-count');
      if (big) big.textContent = `Começando em ${Math.max(1, Math.ceil(left))}...`;
      const c = Math.ceil(left);
      if (c !== this.lastTick && c > 0) {
        this.lastTick = c;
        play('tick');
      }
    }
    if (this.pumUntil && now > this.pumUntil && !this.$('.qzb-pum').hidden) {
      this.pumUntil = 0;
      this.renderOptions();
    }
  }

  // área da tela que sobra para a cena (fora da lousa)
  viewRect() {
    const { vw, vh } = this.game;
    const mobile = document.body.classList.contains('mobile');
    const top = mobile ? 62 : 6;
    const board = this.$('#qz-board')?.getBoundingClientRect();
    if (board && board.width) {
      if (board.left > vw * 0.3) return { x: 0, y: top, w: board.left - 6, h: vh - top - 4 };
      return { x: 0, y: top, w: vw, h: Math.max(120, board.top - top - 6) };
    }
    return { x: 0, y: top, w: vw, h: vh - top };
  }

  updateCamera(dt) {
    const v = this.viewRect();
    const maxLane = Math.max(1, this.racers.size - 1); // linhas compactadas (ver row())
    // tela baixa (celular): mostra menos parede, mais pista
    const top = v.h < 380 ? -70 : -SCENE.WALL * 0.62;
    const bottom = laneY(Math.max(1, maxLane)) + 56;
    let x0 = SCENE.START_X - 120;
    let x1 = SCENE.END_X + 150;
    let z = Math.min(v.w / (x1 - x0), v.h / (bottom - top));
    // tela estreita (celular): enquadra o pelotão; espalhado demais → em volta de mim (ou do líder, na
    // plateia) e a faixa de progresso no topo mostra todo mundo
    this.partial = z < 0.5;
    if (this.partial) {
      const len = this.room.len;
      const now = performance.now();
      const all = [...this.racers.values()];
      const pos = all.map((r) => this.displayPos(r, now));
      const lo = Math.min(...pos, len);
      const hi = Math.max(...pos, 0);
      const sq = squareW(len);
      const span = sq * 7.5;
      x0 = squareX(lo, len) - sq * 1.6;
      x1 = Math.max(squareX(hi, len) + sq * 2.2, x0 + sq * 6);
      if (x1 - x0 > span) {
        const me = this.racers.get(this.me);
        const focus = me ? this.displayPos(me, now) : hi;
        x0 = squareX(focus, len) - sq * 3;
        x1 = x0 + span;
      }
      x0 = Math.max(SCENE.START_X - 120, x0);
      x1 = Math.min(SCENE.END_X + 150, x1);
      z = Math.min(v.w / (x1 - x0), v.h / (bottom - top));
    }
    z = clamp(z, 0.28, 1.5);
    const cam = this.cam;
    const tx = (x0 + x1) / 2 - (v.x + v.w / 2) / z;
    const ty = (top + bottom) / 2 - (v.y + v.h / 2) / z;
    if (!cam.ready) Object.assign(cam, { x: tx, y: ty, z, ready: true });
    const k = Math.min(1, dt * 4);
    cam.z += (z - cam.z) * k;
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
  }

  // x (cena) do meio da área visível: anúncios grandes aparecem ali mesmo com a câmera enquadrando só um pedaço
  viewCenterX() {
    const v = this.viewRect();
    return this.cam.x + (v.x + v.w / 2) / (this.cam.z || 1);
  }

  // posição (em casas) mostrada agora: segue as animações da revelação; senão a do servidor
  displayPos(r, now) {
    const list = this.moves.get(r.id);
    if (list?.length) {
      let cur = null;
      for (const m of list) if (m.at <= now) cur = m;
      if (cur) {
        const k = clamp((now - cur.at) / cur.dur, 0, 1);
        if (k < 1) return cur.from + (cur.to - cur.from) * easeOut(k);
        if (cur === list[list.length - 1] && now - cur.at - cur.dur > 500) return r.pos;
        return cur.to;
      }
      // animação ainda não começou: fica onde estava
      return r.seen ?? r.pos;
    }
    return r.pos;
  }

  moveNow(r, now) {
    const list = this.moves.get(r.id);
    if (!list) return null;
    for (const m of list) if (m.at <= now && now < m.at + m.dur) return { ...m, k: (now - m.at) / m.dur };
    return null;
  }

  // linha na tela: as pistas usadas, em ordem, sem buracos (quem saiu não deixa pista vazia no meio)
  row(r) {
    let n = 0;
    for (const o of this.racers.values()) if (o.lane < r.lane) n++;
    return n;
  }

  scenePos(id) {
    const r = this.racers.get(id);
    if (!r) {
      const s = this.seatPos(id);
      return s || { x: SCENE.W / 2, y: SCENE.LANE_Y0 };
    }
    return { x: squareX(this.displayPos(r, performance.now()), this.room.len), y: laneY(this.row(r)) };
  }

  seatPos(pid) {
    const w = this.watchers.get(pid);
    if (!w) return null;
    if (w.seat < BACK_SEATS) return { x: 64 + w.seat * 72, y: SCENE.BENCH_Y, row: 'back' }; // até ~860: o resto é do professor
    const yb = laneY(Math.max(1, this.racers.size - 1)) + 120;
    return { x: 90 + (w.seat - BACK_SEATS) * 92, y: yb, row: 'front' };
  }

  // ---------- desenho ----------

  draw(ctx, now) {
    const { dpr, vw, vh } = this.game;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#5b4632';
    ctx.fillRect(0, 0, vw, vh);
    if (!this.bg) this.bg = prerenderClassroom();
    const cam = this.cam;
    const z = cam.z * dpr;
    const sk = this.shakeAmp * Math.max(0, 1 - (now - this.shakeAt) / 380);
    const ox = sk ? (Math.random() - 0.5) * sk * 2 : 0;
    const oy = sk ? (Math.random() - 0.5) * sk * 2 : 0;
    ctx.setTransform(z, 0, 0, z, (-cam.x + ox) * z, (-cam.y + oy) * z);
    ctx.drawImage(this.bg, 0, -SCENE.WALL);
    const t = now / 1000;
    const len = this.room.len;

    // número da pergunta escrito na lousa
    if (this.q && ['intro', 'ask', 'reveal'].includes(this.ph)) {
      ctx.save();
      ctx.font = `700 15px ${FONT}`;
      ctx.fillStyle = 'rgba(244,241,230,0.85)';
      ctx.textAlign = 'left';
      ctx.fillText(`Question ${this.q.n}${this.q.gold ? ' ★' : ''}`, 378, -106);
      ctx.restore();
    }

    // plateia (fila de trás) + professor
    const back = [];
    for (const [pid, w] of this.watchers) if (w.seat < BACK_SEATS) back.push(pid);
    for (const pid of back) this.drawFan(ctx, pid, now);
    drawTeacher(ctx, SCENE.TEACHER.x, SCENE.TEACHER.y, t, this.teacherMood && now < (this.teacherSay?.until || 0) ? this.teacherMood : '');

    // pistas
    const lanes = [...this.racers.values()].map((r) => ({ lane: this.row(r), color: LANE_COLORS[r.lane % LANE_COLORS.length] })).sort((a, b) => a.lane - b.lane);
    if (lanes.length) ctx.drawImage(trackCanvas(len, lanes, this.room.gifts), 0, 0);
    // presentes que cada um ainda não pegou
    for (const r of this.racers.values()) {
      for (const sq of this.room.gifts) if (!r.g.has(sq)) drawGift(ctx, squareX(sq, len), laneY(this.row(r)) + 4, t, sq + r.lane);
    }
    const midLane = lanes.length ? (lanes[0].lane + lanes[lanes.length - 1].lane) / 2 : 0;
    drawTrophy(ctx, SCENE.END_X + 96, laneY(midLane) + 36, t);

    // ameaças de combo (setas tracejadas de quem está com combo até o alvo)
    if (['intro', 'ask'].includes(this.ph)) this.drawThreats(ctx, now);

    // corredores (de trás para frente)
    const list = [...this.racers.values()].sort((a, b) => this.row(a) - this.row(b));
    for (const r of list) this.drawRacer(ctx, r, now);

    // projéteis (apagador / pum)
    for (const f of this.flights) {
      const k = clamp((now - f.at) / f.dur, 0, 1);
      const x = f.ax + (f.bx - f.ax) * k;
      const y = f.ay + (f.by - f.ay) * k - Math.sin(k * Math.PI) * 90;
      if (f.kind === 'eraser') {
        for (let i = 1; i < 5; i++) {
          const kk = Math.max(0, k - i * 0.05);
          ctx.globalAlpha = 0.25 * (1 - i / 5);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(f.ax + (f.bx - f.ax) * kk, f.ay + (f.by - f.ay) * kk - Math.sin(kk * Math.PI) * 90, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        drawEraser(ctx, x, y, k * 9);
      } else drawFartCloud(ctx, x, y + 40, k * 0.5, f.at);
    }
    this.drawParts(ctx, now);
    this.fx.draw(ctx, now);
    for (const r of list) this.drawTag(ctx, r, now);

    // plateia (fila da frente, de costas)
    for (const [pid, w] of this.watchers) if (w.seat >= BACK_SEATS) this.drawFan(ctx, pid, now);

    // falas (professor, robôs, chat)
    if (this.teacherSay && now < this.teacherSay.until) drawSay(ctx, this.teacherSay.text, SCENE.TEACHER.x - 30, SCENE.TEACHER.y - 132, { fill: '#fff6d6', size: 14 });
    for (const [id, s] of this.says) {
      if (now > s.until) continue;
      const p = this.racers.has(id) ? this.scenePos(id) : this.seatPos(id);
      if (!p) continue;
      const hy = this.racers.has(id) ? p.y + headTop('') * SCENE.SCALE - 30 : p.y - 74;
      drawSay(ctx, s.text, p.x, hy, { size: 12, max: 170 });
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.partial) this.drawProgress(ctx, now);
  }

  // faixa de progresso (tela estreita): largada → chegada com a bolinha de cada corredor
  drawProgress(ctx, now) {
    const v = this.viewRect();
    const len = this.room.len;
    const x0 = v.x + 18;
    const x1 = v.x + v.w - 26;
    // lousa embaixo (em pé): faixa logo acima dela; lousa do lado (deitado): faixa no topo da cena
    const y = v.w < this.game.vw - 40 ? v.y + 16 : v.y + v.h - 16;
    ctx.save();
    roundRect(ctx, x0 - 10, y - 11, x1 - x0 + 30, 22, 11);
    ctx.fillStyle = 'rgba(20,20,30,0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    for (const g of this.room.gifts) {
      const gx = x0 + (g / len) * (x1 - x0);
      ctx.font = `10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎁', gx, y - 1);
    }
    ctx.font = `12px ${FONT}`;
    ctx.fillText('🏁', x1 + 10, y);
    const list = [...this.racers.values()].sort((a, b) => (a.id === this.me) - (b.id === this.me));
    for (const r of list) {
      const px = x0 + (this.displayPos(r, now) / len) * (x1 - x0);
      const mine = r.id === this.me;
      ctx.beginPath();
      ctx.arc(px, y, mine ? 8 : 6.5, 0, Math.PI * 2);
      ctx.fillStyle = LANE_COLORS[r.lane % LANE_COLORS.length];
      ctx.fill();
      ctx.lineWidth = mine ? 3 : 2;
      ctx.strokeStyle = mine ? '#ffe14d' : INK;
      ctx.stroke();
      outlinedText(ctx, (r.bot ? '🤖' : r.nick.slice(0, 1).toUpperCase()), px, y + (mine ? 0 : 0), { size: r.bot ? 8 : 9, fill: '#ffffff', lw: 2 });
    }
    ctx.restore();
  }

  drawThreats(ctx, now) {
    const len = this.room.len;
    for (const [by, kind, to] of this.combos) {
      const a = this.racers.get(by);
      if (!a) continue;
      const ax = squareX(this.displayPos(a, now), len);
      const ay = laneY(this.row(a)) - 96;
      if (kind === 'hit') {
        const b = this.racers.get(to);
        if (!b) continue;
        const bx = squareX(this.displayPos(b, now), len);
        const by2 = laneY(this.row(b)) - 96;
        ctx.save();
        ctx.setLineDash([7, 7]);
        ctx.lineDashOffset = -now / 40;
        ctx.strokeStyle = 'rgba(255,90,60,0.85)';
        ctx.lineWidth = 3;
        const mx = (ax + bx) / 2;
        const my = Math.min(ay, by2) - 50;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(mx, my, bx, by2);
        ctx.stroke();
        ctx.setLineDash([]);
        outlinedText(ctx, '⚡', mx, (ay + by2) / 2 - 28, { size: 20, fill: '#ffe14d', lw: 4 });
        ctx.restore();
      } else if (kind === 'shield') {
        outlinedText(ctx, '🛡️?', ax + 26, ay + 20, { size: 15, lw: 0 });
      }
    }
  }

  drawRacer(ctx, r, now) {
    const len = this.room.len;
    const p = this.displayPos(r, now);
    const x = squareX(p, len);
    let y = laneY(this.row(r));
    const mv = this.moveNow(r, now);
    let pose = '';
    let moving = false;
    if (mv?.kind === 'hop') {
      const steps = Math.abs(mv.to - mv.from) || 1;
      const kk = (mv.k * steps) % 1;
      y -= Math.sin(kk * Math.PI) * 26;
      moving = true;
    } else if (mv?.kind === 'knock' || mv?.kind === 'slide') pose = 'qzhit';
    else if (this.ph === 'ask' && r.ans) pose = 'qzhand';
    else if (this.ph === 'over' && r.id === this.winnerId) pose = 'qzwin';
    // anel da cor da pista no chão (diz de quem é cada pista mesmo com os bonecos encostados)
    ctx.save();
    ctx.strokeStyle = LANE_COLORS[r.lane % LANE_COLORS.length];
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(x, laneY(this.row(r)) + 1, 22, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // aura de combo armado
    if (['intro', 'ask'].includes(this.ph) && this.combos.some(([by]) => by === r.id)) {
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(now / 120) * 0.2;
      ctx.fillStyle = '#ff9a3c';
      ctx.beginPath();
      ctx.ellipse(x, laneY(this.row(r)) + 2, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const pl = this.game.players.get(r.id);
    const emote = pl?.emote && now - pl.emoteAt < 2500 ? pl.emote : null;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(SCENE.SCALE, SCENE.SCALE);
    drawCharacter(ctx, { id: r.id > 0 ? r.id : 100 - r.id, look: r.look, bot: !!r.bot }, {
      x: 0, y: 0, dir: 1, moving, phase: now / 70, pose,
      emote: pose ? null : emote === 'sit' ? null : emote, emoteT: emote ? (now - pl.emoteAt) / 1000 : 0,
      talking: (this.says.get(r.id)?.until || 0) > now, t: now / 1000,
    });
    ctx.restore();
    if (r.shield > 0) drawShieldBubble(ctx, x, laneY(this.row(r)), now / 1000);
    if ((r.fartUntil || 0) > now) drawFartCloud(ctx, x, laneY(this.row(r)) + 10, 1 - (r.fartUntil - now) / (QZ.PUM_TIME * 1000), r.lane);
    if (r.dobro && ['intro', 'ask'].includes(this.ph)) outlinedText(ctx, '🎲', x + 28, laneY(this.row(r)) - 92 + Math.sin(now / 160) * 3, { size: 18, lw: 0 });
  }

  drawTag(ctx, r, now) {
    const len = this.room.len;
    const x = squareX(this.displayPos(r, now), len);
    const y = laneY(this.row(r)) + headTop('') * SCENE.SCALE - 12;
    const mine = r.id === this.me;
    const label = `${r.bot ? '🤖 ' : ''}${r.nick}${r.streak >= 2 ? ` 🔥${r.streak}` : ''}`;
    ctx.font = `700 12px ${FONT}`;
    const w = ctx.measureText(label).width + 12;
    roundRect(ctx, x - w / 2, y - 9, w, 18, 8);
    ctx.fillStyle = mine ? 'rgba(20,20,30,0.82)' : 'rgba(20,20,30,0.6)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = LANE_COLORS[r.lane % LANE_COLORS.length];
    ctx.stroke();
    outlinedText(ctx, label, x, y, { size: 12, fill: mine ? '#ffe14d' : '#ffffff', lw: 3 });
    if (mine) outlinedText(ctx, '▼', x, y - 18 + Math.sin(now / 150) * 2, { size: 12, fill: '#ffe14d', lw: 3 });
  }

  drawFan(ctx, pid, now) {
    const p = this.seatPos(pid);
    if (!p) return;
    const look = this.lookOf(pid);
    const ch = this.cheerAnim.get(pid);
    const cheering = ch && now - ch.at < 1400;
    const pl = this.game.players.get(pid);
    const emote = cheering ? (ch.r === 'go' || ch.r === 'wow' ? 'jump' : ch.r === 'fire' || ch.r === 'lol' ? 'dance' : 'wave') : pl?.emote && now - pl.emoteAt < 2500 ? pl.emote : null;
    const et = cheering ? (now - ch.at) / 1000 : pl?.emote ? (now - pl.emoteAt) / 1000 : 0;
    if (p.row === 'back') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(0.72, 0.72);
      drawCharacter(ctx, { id: pid, look }, { x: 0, y: 0, dir: p.x < SCENE.W / 2 ? 1 : -1, moving: false, phase: 0, pose: 'bench', emote: emote === 'sit' ? null : emote, emoteT: et, talking: (this.says.get(pid)?.until || 0) > now, t: now / 1000 });
      ctx.restore();
      if (pid === this.me) outlinedText(ctx, '▲ você', p.x, p.y + 12, { size: 11, fill: '#ffe14d', lw: 3 });
    } else {
      // de costas, na frente da câmera
      const hop = cheering ? Math.abs(Math.sin(now / 90)) * 8 : 0;
      ctx.save();
      ctx.translate(p.x, p.y - hop);
      roundRect(ctx, -30, -8, 60, 30, 14);
      ctx.fillStyle = look.shirt;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -30, 26, 26, 0, 0, Math.PI * 2);
      ctx.fillStyle = look.skin;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -40, 27, 20, 0, 0, Math.PI * 2);
      ctx.fillStyle = look.hat;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (pid === this.me) outlinedText(ctx, '▼ você', p.x, p.y - 84 - hop, { size: 12, fill: '#ffe14d', lw: 3 });
    }
  }

  drawParts(ctx, now) {
    for (const p of this.parts) {
      const k = (now - p.born) / p.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k);
      if (p.kind === 'dust') drawChalkDust(ctx, p.x, p.y, k);
      else if (p.kind === 'flash') {
        ctx.strokeStyle = '#9fd8ff';
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 34 + k * 30, 50 + k * 30, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5 * (1 - k) + 1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, (16 + k * 30) * p.size, (20 + k * 34) * p.size, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'emoji') {
        ctx.translate(p.x + Math.sin(k * 8 + p.seed * 6) * 8, p.y - k * 70);
        ctx.font = `26px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.text, 0, 0);
      } else if (p.kind === 'num') {
        const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.7 : 1.3 - Math.min(0.3, k - 0.15);
        ctx.translate(p.x, p.y - k * 46);
        ctx.scale(pop, pop);
        outlinedText(ctx, p.text, 0, 0, { size: 24, fill: p.color, lw: 6 });
      }
      ctx.restore();
    }
  }

  // ---------- efeitos ----------

  teacher(text, mood, now) {
    this.teacherSay = { text, until: now + 2600 };
    this.teacherMood = mood;
  }

  big(text, opts, now, x, y) {
    const near = this.fx.items.filter((it) => it.kind === 'big' && Math.abs(it.x - x) < 300 && Math.abs(it.y - y) < 80 && now - it.born < 600);
    const by = near.length ? Math.min(...near.map((it) => it.y)) - 64 : y;
    this.fx.add('big', { x, y: by, text, ...opts }, now);
  }

  text(text, id, color, now, size = 16) {
    const p = this.scenePos(id);
    this.fx.add('text', { x: p.x, y: p.y - 130, text, color, size }, now);
  }

  num(id, text, color, now) {
    const p = this.scenePos(id);
    this.parts.push({ kind: 'num', x: p.x + (Math.random() - 0.5) * 16, y: p.y - 112, text, color, born: now, life: 1100 });
  }

  spark(kind, x, y, now, color, size = 1) {
    this.parts.push({ kind, x, y, color, size, born: now, life: 420 });
  }

  shake(amount, now) {
    this.shakeAmp = amount;
    this.shakeAt = now;
  }
}

function easeOut(k) {
  return 1 - (1 - k) * (1 - k);
}
