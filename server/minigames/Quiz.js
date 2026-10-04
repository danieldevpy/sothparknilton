// Corrida das Perguntas — uma sala da Escola (várias ao mesmo tempo: room.qzs).
//
// Até QZ.MAX_RACERS corredores (gente e robôs) numa pista de `len` casas + plateia. Todo mundo responde a
// mesma pergunta; na revelação: acertou anda 1 (ouro 2, tudo-ou-nada dobra), combo a cada 2 acertos
// seguidos (quem está na frente volta 1 casa; liderando = escudo), presentes dão cartas. Primeiro a cruzar
// a chegada vence (empate: quem acertou mais rápido). Quem entra no meio começa do zero; depois que o líder
// passou de QZ.JOIN_CUTOFF da pista, entra só na próxima corrida (fica assistindo até lá).
//
// Fases: lobby → count → intro → ask → reveal → (intro...) → over → count/lobby.
// Mesma interface dos outros minigames: has/handle/tick/remove/publicInfo. A resposta certa só sai do
// servidor na revelação.

import { MSG, PALETTE } from '../../shared/constants.js';
import {
  QZ, MODES, BOTS, BOT_NAMES, CARD_IDS, CHEER_IDS, clamp, giftSquares, isGold, askTime, levelFor, joinOpen,
  comboTargets, closestAhead, stepsFor, drawCard, speedPts,
} from '../../shared/quiz.js';
import { QuestionPicker, buildOptions, shuffle } from '../quiz/bank.js';
import { getTheme } from '../quiz/themes.js';

const RACING = new Set(['intro', 'ask', 'reveal']);
const BOT_LINES = {
  right: ['Beep boop, acertei! 🤖', 'Fácil demais 😎', 'Calculado. 🧮', 'Meu processador agradece'],
  wrong: ['Erro 404 😵', 'Bug no sistema...', 'Isso não estava no meu manual!', 'Reiniciando... 🔄'],
  hit: ['Toma! 📚', 'Combo robótico! ⚡', 'Volta uma casinha 😈'],
  win: ['Vitória das máquinas! 🤖🏆', 'GG, humanos!'],
};

export class QuizMatch {
  constructor(room, id = 1, { mode = 'normal', len = QZ.DEFAULT_LEN, theme = 'en' } = {}) {
    this.room = room;
    this.id = id;
    this.mode = MODES[mode] ? mode : 'normal';
    this.len = QZ.LENGTHS.includes(len) ? len : QZ.DEFAULT_LEN;
    this.theme = getTheme(theme);
    this.picker = new QuestionPicker(this.theme, room.random);
    this.gifts = giftSquares(this.len);
    this.racers = new Map(); // id (player id; robôs < 0) -> corredor
    this.watchers = new Map(); // pid -> { seat, want (quer correr na próxima), at }
    this.cheerAt = new Map(); // pid -> último cheer (ms)
    this.order = 0;
    this.nextBot = -1;
    this.phase = 'lobby';
    this.timer = 0;
    this.clock = 0;
    this.race = 0;
    this.n = 0;
    this.q = null;
    this.askAt = 0;
    this.targets = new Map();
    this.host = 0;
    this.winner = null;
    this.solo = false;
  }

  // ---------- consultas ----------

  // membros humanos (corredores + plateia)
  has(id) {
    return (this.racers.has(id) && !this.racers.get(id).bot) || this.watchers.has(id);
  }

  humans() {
    return [...this.racers.values()].filter((r) => !r.bot).map((r) => r.id).concat([...this.watchers.keys()]);
  }

  size() {
    return this.humans().length;
  }

  humanRacers() {
    return [...this.racers.values()].filter((r) => !r.bot);
  }

  bots() {
    return [...this.racers.values()].filter((r) => r.bot);
  }

  leaderPos() {
    return Math.max(0, ...[...this.racers.values()].map((r) => r.pos));
  }

  // dá para entrar correndo agora? (senão vira plateia e corre na próxima)
  canRaceNow() {
    if (this.racers.size >= QZ.MAX_RACERS) return false;
    return !RACING.has(this.phase) || joinOpen(this.leaderPos(), this.len);
  }

  // ---------- entrar / sair ----------

  // as = 'play' | 'watch'. null = entrou; senão o motivo da recusa
  add(p, as = 'play') {
    if (this.has(p.id)) {
      if (as === 'play' && this.watchers.has(p.id)) this.wantToPlay(p.id);
      else if (as === 'watch' && this.racers.has(p.id)) this.toWatcher(p.id, 'chose');
      return null;
    }
    if (as === 'play' && this.racers.size >= QZ.MAX_RACERS && this.bots().length && !RACING.has(this.phase)) {
      this.removeBot(this.bots().at(-1).id); // gente de verdade tem prioridade sobre robô
    }
    const racing = as === 'play' && this.canRaceNow();
    if (!racing && this.watchers.size >= QZ.MAX_WATCHERS) return 'full';
    if (racing) this.addRacer(p);
    else this.addWatcher(p.id, as === 'play');
    if (!this.host) this.host = p.id;
    this.room.sendTo(p, { t: MSG.QZ_ENTER, ...this.enterInfo(p.id) });
    this.event('join', { id: p.id, nick: p.nick, as: racing ? 'play' : 'watch', want: !racing && as === 'play' ? 1 : 0 });
    this.roster();
    this.maybeCount();
    this.live();
    return null;
  }

  addRacer(p, bot = null) {
    const lanes = new Set([...this.racers.values()].map((r) => r.lane));
    let lane = 0;
    while (lanes.has(lane)) lane++;
    const r = {
      id: bot ? this.nextBot-- : p.id,
      bot,
      nick: bot ? bot.nick : p.nick,
      look: bot ? bot.look : p.look,
      order: this.order++,
      lane,
    };
    this.resetRacer(r);
    this.racers.set(r.id, r);
    return r;
  }

  resetRacer(r) {
    Object.assign(r, {
      pos: 0, streak: 0, best: 0, shield: 0, cards: [...QZ.START_CARDS], gifts: new Set(), pts: 0, miss: 0,
      ans: null, dobro: false, cola: null, pumBy: 0, plan: null,
      stats: { right: 0, wrong: 0, asked: 0, attacks: 0, blocks: 0, hits: 0 },
    });
  }

  addWatcher(pid, want) {
    const used = new Set([...this.watchers.values()].map((w) => w.seat));
    let seat = 0;
    while (used.has(seat)) seat++;
    this.watchers.set(pid, { seat, want: !!want, at: this.clock });
  }

  // plateia → corredor (agora se der; senão na próxima corrida)
  wantToPlay(pid) {
    const p = this.room.players.get(pid);
    if (!p) return;
    if (this.canRaceNow()) {
      this.watchers.delete(pid);
      this.addRacer(p);
      this.event('join', { id: pid, nick: p.nick, as: 'play', want: 0 });
      this.maybeCount();
    } else {
      this.watchers.get(pid).want = true;
      this.event('want', { id: pid });
    }
    this.roster();
    this.live();
  }

  toWatcher(pid, why = 'chose') {
    const r = this.racers.get(pid);
    if (!r || r.bot) return;
    this.racers.delete(pid);
    this.addWatcher(pid, false);
    this.event('bench', { id: pid, why });
    this.afterRacerLeft();
    this.roster();
    this.live();
  }

  // reason: left | full | gone | busy (avisa) · quiet | switch (sem aviso)
  remove(id, reason = 'left') {
    const wasRacer = this.racers.has(id) && !this.racers.get(id).bot;
    if (!wasRacer && !this.watchers.has(id)) return;
    const nick = this.racers.get(id)?.nick ?? this.room.players.get(id)?.nick ?? '?';
    this.racers.delete(id);
    this.watchers.delete(id);
    this.cheerAt.delete(id);
    const p = this.room.players.get(id);
    if (p && reason !== 'quiet' && reason !== 'switch') this.room.sendTo(p, { t: MSG.QZ_EXIT, id: this.id, reason });
    if (!this.size()) {
      this.room.endQz(this);
      return;
    }
    if (this.host === id) this.host = this.humanRacers()[0]?.id ?? [...this.watchers.keys()][0] ?? 0;
    this.event('leave', { id, nick });
    if (wasRacer) this.afterRacerLeft();
    this.roster();
    this.live();
  }

  // saiu um corredor: sem gente correndo a corrida acaba; quem sobrou já respondeu? revela
  afterRacerLeft() {
    if (!this.humanRacers().length && this.phase !== 'lobby') {
      this.toLobby('empty');
      return;
    }
    if (this.phase === 'count' && this.racers.size < 2 && !this.solo) this.toLobby('few');
    if (this.phase === 'ask' && this.allAnswered()) this.timer = Math.min(this.timer, QZ.ALL_IN_GRACE);
  }

  addBot(level) {
    const cfg = BOTS[level] || BOTS.normal;
    const used = new Set(this.bots().map((b) => b.nick));
    const nick = BOT_NAMES.find((n) => !used.has(n)) || `Robô ${-this.nextBot}`;
    const rnd = this.room.random;
    const pick = (list) => list[Math.floor(rnd() * list.length)];
    const look = { hat: pick(PALETTE.hats), shirt: pick(PALETTE.shirts), skin: '#c9d3dd' }; // robô: "pele" de lata
    const r = this.addRacer(null, { level: BOTS[level] ? level : 'normal', skill: cfg.skill, delay: cfg.delay, nick, look });
    this.event('bot', { id: r.id, nick, level: r.bot.level });
    this.roster();
    this.maybeCount();
    this.live();
    return r;
  }

  removeBot(id) {
    const r = this.racers.get(id);
    if (!r?.bot) return;
    this.racers.delete(id);
    this.event('leave', { id, nick: r.nick });
    if (this.phase === 'count' && this.racers.size < 2 && !this.solo) this.toLobby('few');
    this.roster();
    this.live();
  }

  // ---------- entrada do cliente ----------

  handle(p, msg) {
    const r = this.racers.get(p.id);
    switch (msg.t) {
      case MSG.QZ_ANSWER:
        if (r && !r.bot) this.answer(r, msg);
        break;
      case MSG.QZ_CARD:
        if (r && !r.bot) this.useCard(r, msg.c);
        break;
      case MSG.QZ_CHEER:
        this.cheer(p, msg);
        break;
      case MSG.QZ_BOT:
        if (!r || r.bot || RACING.has(this.phase)) break;
        if (typeof msg.add === 'string') {
          if (this.racers.size < QZ.MAX_RACERS && this.bots().length < QZ.MAX_BOTS) this.addBot(msg.add);
        } else if (Number.isInteger(msg.remove)) this.removeBot(msg.remove);
        break;
      case MSG.QZ_START:
        if (!r || r.bot) break;
        if (this.phase === 'lobby') {
          this.solo = this.racers.size < 2;
          this.setPhase('count', 3);
          this.phaseMsg();
          this.live();
        } else if (this.phase === 'count') {
          this.timer = Math.min(this.timer, 1);
          this.phaseMsg();
        }
        break;
      default:
        break;
    }
  }

  answer(r, msg) {
    const q = this.q;
    if (this.phase !== 'ask' || !q || r.ans || msg.n !== q.n) return;
    const i = msg.i;
    if (!Number.isInteger(i) || i < 0 || i >= q.opts.length || r.cola?.includes(i)) return;
    r.ans = { i, ms: Math.round((this.clock - this.askAt) * 1000) };
    r.miss = 0;
    this.event('answered', { id: r.id });
    if (this.allAnswered()) this.timer = Math.min(this.timer, QZ.ALL_IN_GRACE);
  }

  allAnswered() {
    return [...this.racers.values()].every((r) => r.ans);
  }

  useCard(r, c) {
    const q = this.q;
    if (this.phase !== 'ask' || !q || !CARD_IDS.includes(c) || !r.cards.includes(c)) return false;
    const spend = () => r.cards.splice(r.cards.indexOf(c), 1);
    if (c === 'cola') {
      if (r.ans || r.cola || q.opts.length <= 2) return false;
      const wrong = shuffle(q.opts.map((_, i) => i).filter((i) => i !== q.ok), this.room.random);
      r.cola = wrong.slice(0, q.opts.length > 3 ? 2 : 1);
      spend();
      if (!r.bot) this.room.sendTo(this.room.players.get(r.id), { t: MSG.QZ_COLA, n: q.n, hide: r.cola });
      this.event('card', { by: r.id, c });
    } else if (c === 'dobro') {
      if (r.ans || r.dobro) return false;
      r.dobro = true;
      spend();
      this.event('card', { by: r.id, c });
    } else {
      const t = closestAhead([...this.racers.values()], r);
      if (!t) {
        if (!r.bot) this.room.sendTo(this.room.players.get(r.id), { t: MSG.QZ_EVENT, kind: 'nocard', c, why: 'ahead' });
        return false;
      }
      spend();
      if (t.shield > 0) {
        t.shield = 0;
        t.stats.blocks++;
        this.event('card', { by: r.id, c, to: t.id, blocked: 1 });
      } else if (!t.ans) {
        // ainda não respondeu: a nuvem cobre as opções agora (robô "se distrai" e demora mais)
        if (t.plan) t.plan.at += QZ.PUM_TIME * 0.6;
        this.event('card', { by: r.id, c, to: t.id, now: 1 });
      } else {
        t.pumBy = r.id; // já respondeu: o pum fica para a próxima pergunta
        this.event('card', { by: r.id, c, to: t.id, next: 1 });
      }
    }
    this.roster();
    return true;
  }

  cheer(p, msg) {
    if (!this.has(p.id) || !CHEER_IDS.includes(msg.r)) return;
    const now = this.room.now();
    if (now - (this.cheerAt.get(p.id) || 0) < QZ.CHEER_COOLDOWN_MS) return;
    this.cheerAt.set(p.id, now);
    const side = Number.isInteger(msg.side) && this.racers.has(msg.side) ? msg.side : 0;
    this.event('cheer', { by: p.id, r: msg.r, side });
  }

  // ---------- simulação ----------

  tick(dt) {
    this.clock += dt;
    if (this.phase === 'lobby') return;
    this.timer -= dt;
    if (this.phase === 'ask') this.stepBots();
    if (this.timer > 0) return;
    switch (this.phase) {
      case 'count':
        this.startRace();
        break;
      case 'intro':
        this.ask();
        break;
      case 'ask':
        this.reveal();
        break;
      case 'reveal':
        if (this.winner) this.finish();
        else this.nextQuestion();
        break;
      case 'over':
        this.afterOver();
        break;
      default:
        break;
    }
  }

  maybeCount() {
    if (this.phase === 'lobby' && this.racers.size >= 2 && this.humanRacers().length) {
      this.solo = false;
      this.setPhase('count', QZ.COUNT_TIME);
      this.phaseMsg();
    }
  }

  startRace() {
    // quem pediu para correr (e esperou na plateia) entra agora, em ordem de pedido
    const wants = [...this.watchers.entries()].filter(([, w]) => w.want).sort((a, b) => a[1].at - b[1].at);
    for (const [pid] of wants) {
      if (this.racers.size >= QZ.MAX_RACERS) break;
      const p = this.room.players.get(pid);
      if (!p) continue;
      this.watchers.delete(pid);
      this.addRacer(p);
    }
    if (!this.humanRacers().length) {
      this.toLobby('empty');
      return;
    }
    this.race++;
    this.n = 0;
    this.winner = null;
    for (const r of this.racers.values()) this.resetRacer(r);
    this.event('start', { race: this.race, len: this.len });
    this.roster();
    this.nextQuestion();
  }

  nextQuestion() {
    this.n++;
    const gold = isGold(this.n);
    const rnd = this.room.random;
    const lvl = levelFor(this.mode, { leaderPos: this.leaderPos(), len: this.len, gold }, rnd);
    const src = this.picker.pick(lvl);
    const { opts, ok } = buildOptions(src, MODES[this.mode].opts, rnd);
    const cat = this.theme.cats[src.cat] || { icon: '❓', label: src.cat };
    this.q = {
      n: this.n, src, opts, ok, lvl: src.lvl, gold,
      t: askTime(src.q, opts, this.mode),
      cat: { icon: cat.icon, label: src.sub ? `${cat.label} · ${src.sub}` : cat.label },
    };
    for (const r of this.racers.values()) Object.assign(r, { ans: null, dobro: false, cola: null, plan: null });
    this.targets = comboTargets([...this.racers.values()]);
    this.setPhase('intro', QZ.INTRO_TIME);
    this.phaseMsg();
    this.live();
  }

  ask() {
    const q = this.q;
    this.setPhase('ask', q.t);
    this.askAt = this.clock;
    const pum = [];
    for (const r of this.racers.values()) {
      r.stats.asked++;
      if (r.pumBy) {
        pum.push([r.id, r.pumBy]);
        r.pumBy = 0;
      }
      if (r.bot) this.planBot(r, pum.some(([to]) => to === r.id));
    }
    this.toMembers({
      t: MSG.QZ_Q, n: q.n, q: q.src.q, opts: q.opts, tm: q.t, lvl: q.lvl, gold: q.gold ? 1 : 0, cat: q.cat, pum,
    });
  }

  // robô: decide quando responde e se acerta (sem "ver" nada que um jogador não veria além do sorteio)
  planBot(r, farted) {
    const rnd = this.room.random;
    const q = this.q;
    const [d0, d1] = r.bot.delay;
    const chars = q.src.q.length + q.opts.join('').length;
    const read = clamp(0.75 + chars / 160, 0.8, 1.6);
    let at = (d0 + rnd() * (d1 - d0)) * read + (farted ? QZ.PUM_TIME * 0.6 : 0);
    at = Math.min(at, q.t - 0.4);
    const card = this.botCard(r);
    r.plan = { at, card, cardAt: at * (0.3 + rnd() * 0.4) };
  }

  botCard(r) {
    const rnd = this.room.random;
    const q = this.q;
    const behind = this.leaderPos() - r.pos;
    if (r.cards.includes('pum') && closestAhead([...this.racers.values()], r) && rnd() < 0.55) return 'pum';
    if (r.cards.includes('dobro') && behind >= 2 && rnd() < 0.5) return 'dobro';
    if (r.cards.includes('cola') && q.lvl >= 2 && q.opts.length > 2 && rnd() < 0.4) return 'cola';
    return null;
  }

  stepBots() {
    const t = this.clock - this.askAt;
    for (const r of this.racers.values()) {
      if (!r.bot || !r.plan || r.ans) continue;
      const pl = r.plan;
      if (pl.card && t >= pl.cardAt) {
        this.useCard(r, pl.card);
        pl.card = null;
      }
      if (t < pl.at) continue;
      const q = this.q;
      let p = r.bot.skill - 0.09 * (q.lvl - 1);
      if (r.cola) p += (1 - p) * 0.45;
      const right = this.room.random() < clamp(p, 0.05, 0.98);
      const pool = q.opts.map((_, i) => i).filter((i) => i !== q.ok && !r.cola?.includes(i));
      const i = right || !pool.length ? q.ok : pool[Math.floor(this.room.random() * pool.length)];
      r.ans = { i, ms: Math.round(t * 1000) };
      this.event('answered', { id: r.id });
      if (this.allAnswered()) this.timer = Math.min(this.timer, QZ.ALL_IN_GRACE);
    }
  }

  // ---------- revelação ----------

  reveal() {
    const q = this.q;
    const res = this.resolve();
    const extra = res.combos.length || res.gifts.length || res.rows.some((x) => x.dobro) ? QZ.REVEAL_EXTRA : 0;
    this.setPhase('reveal', QZ.REVEAL_TIME + extra + (res.win ? 0.6 : 0));
    this.toMembers({
      t: MSG.QZ_REVEAL,
      n: q.n,
      ok: q.ok,
      a: q.src.a,
      tip: q.src.tip || '',
      res: res.rows.map((x) => [x.id, x.from, x.mid, x.to, x.correct ? 1 : 0, x.i, x.ms, x.dobro ? 1 : 0, x.streak]),
      combos: res.combos,
      gifts: res.gifts,
      win: res.win?.id ?? 0,
      fast: res.fast ?? 0,
    });
    this.botChatter(res);
    // ausentes: depois de AFK_LIMIT perguntas sem responder, vai para a plateia
    for (const r of [...this.racers.values()]) if (!r.bot && r.miss >= QZ.AFK_LIMIT && !res.win) this.toWatcher(r.id, 'afk');
    this.roster();
    this.live();
  }

  resolve() {
    const q = this.q;
    const list = [...this.racers.values()];
    const rows = [];
    const gifts = [];
    const combos = [];
    const ranks = rankMap(list);
    let fast = null;
    for (const r of list) {
      const correct = !!r.ans && r.ans.i === q.ok;
      const from = r.pos;
      const steps = stepsFor(correct, q.gold, r.dobro);
      r.pos = clamp(r.pos + steps, 0, this.len);
      r.streak = correct ? r.streak + 1 : 0;
      r.best = Math.max(r.best, r.streak);
      if (correct) {
        r.stats.right++;
        r.pts += QZ.PTS.RIGHT * (q.gold ? 2 : 1) + speedPts(r.ans.ms, q.t);
        if (!fast || r.ans.ms < fast.ans.ms) fast = r;
      } else if (r.ans) r.stats.wrong++;
      if (!r.ans && !r.bot) r.miss++;
      // presentes: cada casa de presente dá uma carta na primeira vez que o corredor passa por ela
      for (const s of this.gifts) {
        if (s <= from || s > r.pos || r.gifts.has(s)) continue;
        r.gifts.add(s);
        if (r.cards.length < QZ.HAND_MAX) {
          const c = drawCard(ranks.get(r.id), this.room.random);
          r.cards.push(c);
          gifts.push([r.id, c, s]);
        } else gifts.push([r.id, '', s]); // mão cheia
      }
      rows.push({ id: r.id, from, mid: r.pos, to: r.pos, correct, i: r.ans ? r.ans.i : -1, ms: r.ans ? r.ans.ms : -1, dobro: r.dobro, streak: r.streak });
    }
    // combos (alvos decididos antes da pergunta): quem cruzou a chegada já está a salvo. Ataques antes dos
    // escudos: escudo ganho nesta pergunta só protege a partir da próxima (tudo é "ao mesmo tempo")
    const order = [...this.targets].sort(([, x], [, y]) => (x.kind === 'hit' ? 0 : 1) - (y.kind === 'hit' ? 0 : 1));
    for (const [aid, t] of order) {
      const a = this.racers.get(aid);
      if (!a || !a.ans || a.ans.i !== q.ok) continue;
      if (t.kind === 'hit') {
        const v = this.racers.get(t.to);
        if (!v || v.pos >= this.len) {
          combos.push([aid, 'safe', t.to]);
          continue;
        }
        if (v.shield > 0) {
          v.shield = 0;
          v.stats.blocks++;
          combos.push([aid, 'block', v.id]);
        } else {
          v.pos = Math.max(0, v.pos - 1);
          v.stats.hits++;
          a.stats.attacks++;
          a.pts += QZ.PTS.COMBO;
          combos.push([aid, 'hit', v.id]);
        }
      } else if (t.kind === 'shield' && !a.shield) {
        a.shield = QZ.SHIELD_TURNS + 1; // +1: esta revelação já desconta uma
        combos.push([aid, 'shield', 0]);
      } else {
        a.pts += QZ.PTS.COMBO;
        combos.push([aid, 'combo', 0]);
      }
    }
    for (const row of rows) row.to = this.racers.get(row.id).pos;
    // escudo vale por QZ.SHIELD_TURNS perguntas (as próximas) e depois some
    for (const r of list) if (r.shield > 0) r.shield--;
    const finishers = list.filter((r) => r.pos >= this.len).sort((x, y) => (x.ans?.ms ?? 1e9) - (y.ans?.ms ?? 1e9));
    this.winner = finishers[0] || null;
    return { rows, combos, gifts, win: this.winner, fast: fast?.id };
  }

  botChatter(res) {
    const rnd = this.room.random;
    const pick = (l) => l[Math.floor(rnd() * l.length)];
    for (const row of res.rows) {
      const r = this.racers.get(row.id);
      if (!r?.bot) continue;
      let kind = null;
      if (res.win?.id === r.id) kind = 'win';
      else if (res.combos.some(([by, k]) => by === r.id && k === 'hit')) kind = 'hit';
      else if (rnd() < 0.18) kind = row.correct ? 'right' : 'wrong';
      if (kind) this.event('say', { id: r.id, text: pick(BOT_LINES[kind]) });
    }
  }

  finish() {
    const list = [...this.racers.values()];
    const w = this.winner;
    const rank = list.sort((a, b) => (b.id === w.id) - (a.id === w.id) || b.pos - a.pos || b.pts - a.pts || b.best - a.best);
    this.setPhase('over', QZ.OVER_TIME);
    this.room.broadcast({
      t: MSG.QZ_END,
      id: this.id,
      winner: w.id,
      winnerNick: w.nick,
      bot: w.bot ? 1 : 0,
      theme: this.theme.name,
      n: this.n,
      rank: rank.map((r) => [r.id, r.nick, r.pos, r.stats.right, r.stats.asked, r.best, r.stats.attacks, r.pts, r.bot ? 1 : 0]),
    });
    this.live();
  }

  afterOver() {
    this.winner = null;
    if (!this.humanRacers().length && ![...this.watchers.values()].some((w) => w.want)) {
      this.toLobby('empty');
      return;
    }
    for (const r of this.racers.values()) this.resetRacer(r);
    this.setPhase('count', QZ.COUNT_TIME);
    this.phaseMsg();
    this.roster();
    this.live();
  }

  toLobby(why = '') {
    this.q = null;
    this.winner = null;
    this.solo = false;
    this.n = 0;
    for (const r of this.racers.values()) this.resetRacer(r);
    this.setPhase('lobby', 0);
    this.phaseMsg({ why });
    this.roster();
    this.live();
    this.maybeCount();
  }

  setPhase(ph, timer) {
    this.phase = ph;
    this.timer = timer;
  }

  // ---------- mensagens ----------

  phaseMsg(extra = {}) {
    const m = { t: MSG.QZ_PHASE, ph: this.phase, tm: Math.round(Math.max(0, this.timer) * 10) / 10, n: this.n, race: this.race, ...extra };
    if (this.phase === 'intro' && this.q) {
      Object.assign(m, {
        lvl: this.q.lvl, gold: this.q.gold ? 1 : 0, cat: this.q.cat,
        combos: [...this.targets].map(([by, t]) => [by, t.kind, t.to]),
      });
    }
    this.toMembers(m);
  }

  // estado completo para quem acabou de entrar (pergunta em andamento inclusa, sem a resposta)
  enterInfo(pid) {
    const q = this.q;
    const info = {
      id: this.id, mode: this.mode, len: this.len, gifts: this.gifts, race: this.race, n: this.n,
      theme: { id: this.theme.id, name: this.theme.name, flag: this.theme.flag },
      role: this.racers.has(pid) ? 'play' : 'watch',
      ph: this.phase, tm: Math.round(Math.max(0, this.timer) * 10) / 10,
    };
    if (q && (this.phase === 'ask' || this.phase === 'intro')) {
      info.q = { n: q.n, lvl: q.lvl, gold: q.gold ? 1 : 0, cat: q.cat, combos: [...this.targets].map(([by, t]) => [by, t.kind, t.to]) };
      if (this.phase === 'ask') Object.assign(info.q, { q: q.src.q, opts: q.opts, tm: Math.max(0, this.timer) });
    }
    return info;
  }

  roster() {
    this.toMembers({
      t: MSG.QZ_ROOM,
      host: this.host,
      r: [...this.racers.values()].sort((a, b) => a.lane - b.lane).map((r) => ({
        id: r.id, nick: r.nick, look: r.look, lane: r.lane, pos: r.pos, streak: r.streak, shield: r.shield,
        cards: r.cards, bot: r.bot ? r.bot.level : 0, pts: r.pts, ans: r.ans ? 1 : 0, g: [...r.gifts], dobro: r.dobro ? 1 : 0,
      })),
      w: [...this.watchers.entries()].map(([pid, w]) => [pid, w.seat, w.want ? 1 : 0]),
    });
  }

  // para todos (lista da Escola na praça; a praça esconde quem está lá dentro)
  publicInfo() {
    return {
      id: this.id,
      ph: this.phase,
      mode: this.mode,
      len: this.len,
      theme: this.theme.id,
      flag: this.theme.flag,
      n: this.n,
      r: [...this.racers.values()].sort((a, b) => a.lane - b.lane).map((r) => (r.bot ? [r.id, r.pos, r.nick] : [r.id, r.pos])),
      w: [...this.watchers.keys()],
      open: this.canRaceNow() ? 1 : 0,
    };
  }

  live() {
    if (this.size()) this.room.broadcast({ t: MSG.QZ_LIVE, ...this.publicInfo() });
  }

  event(kind, data = {}) {
    this.toMembers({ t: MSG.QZ_EVENT, kind, ...data });
  }

  toMembers(msg) {
    const data = JSON.stringify(msg);
    for (const id of this.humans()) this.room.players.get(id)?.send(data);
  }
}

// 0 = líder ... 1 = último (pesa o sorteio das cartas) — quem está empatado tem o mesmo peso
function rankMap(list) {
  const n = Math.max(1, list.length - 1);
  return new Map(list.map((r) => [r.id, list.filter((o) => o.pos > r.pos).length / n]));
}
