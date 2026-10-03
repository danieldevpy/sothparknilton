// Prédio do Ginásio na praça: partidas de Queimada abertas e entrada nelas.
// - Guarda todas as partidas (welcome / qm_live / qm_end) e quem está dentro de cada uma
//   (a praça esconde quem está jogando: eles estão "dentro" do Ginásio).
// - Desenha o prédio vivo (render/gymhouse.js): aceso com partida, fechado sem.
// - Clique no prédio: painel com as partidas (▶ Entrar) e "➕ Nova partida" (Fácil / Difícil).
// - Notificação pequena quando alguém abre uma quadra nova (atalho para entrar).

import { MAP } from '/shared/map.js';
import { MSG } from '/shared/constants.js';
import { QM } from '/shared/queimada.js';
import { drawGymLive, drawGymTop, gymBounds } from '../render/gymhouse.js';
import { play } from '../audio.js';

const NOTE_MS = 7000;
const POP_WORDS = ['PÁ!', 'QUEIMOU!', 'TUM!', 'WHOOSH!', 'PEGOU!', 'BOING!', 'AAAH!'];
const POP_COLORS = ['#e8412b', '#3a6fd8', '#ff9a3c', '#2e9e48'];
const PHASE = { lobby: 'treino livre · esperando gente', count: 'começando...', intro: 'rodada começando', play: 'valendo!', end: 'fim da rodada', over: 'fim de jogo 🏆' };

function el(tag, cls = '', text = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== null) e.textContent = text;
  return e;
}

export class GymClient {
  constructor(game, hud) {
    this.game = game;
    this.hud = hud;
    this.matches = new Map(); // id -> { id, ph, hard, rd, m: [[pid, team, lugar, pts]] }
    this.where = new Map(); // playerId -> matchId
    this.pops = [];
    this.nextPop = 0;
    this.panel = null;
    this.notes = null;
    game.canvas.addEventListener('pointerdown', () => this.closePanel());
    window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') this.closePanel(); });
  }

  // ---------- estado ----------

  matchOf(pid) {
    return this.where.get(pid) ?? null;
  }

  playing() {
    return this.where.size;
  }

  // não consome mensagens: o QueimadaClient também precisa delas
  onMessage(msg, now) {
    switch (msg.t) {
      case MSG.WELCOME:
        this.matches.clear();
        for (const m of msg.qms || []) this.matches.set(m.id, m);
        this.reindex();
        break;
      case MSG.QM_LIVE: {
        if (msg.gone) {
          this.matches.delete(msg.id);
          this.dropNote(msg.id);
        } else {
          const isNew = !this.matches.has(msg.id);
          const before = new Set((this.matches.get(msg.id)?.m || []).map(([pid]) => pid));
          this.matches.set(msg.id, { id: msg.id, ph: msg.ph, hard: msg.hard, rd: msg.rd, m: msg.m });
          if (isNew) this.notify(msg);
          // alguém entrou no Ginásio: "🏐" sai da porta
          const door = MAP.gym.door;
          for (const [pid] of msg.m) {
            if (before.has(pid) || isNew) continue;
            const nick = this.game.players.get(pid)?.nick;
            if (nick) this.game.fx.add('text', { x: door.x, y: door.y - 70, text: `🔴 ${nick} entrou`, color: '#ffe36b', size: 14 }, now);
          }
        }
        this.reindex();
        this.refreshPanel();
        break;
      }
      default:
        break;
    }
    return false;
  }

  reindex() {
    this.where.clear();
    for (const m of this.matches.values()) for (const [pid] of m.m) this.where.set(pid, m.id);
  }

  // ---------- prédio ----------

  hitTest(wx, wy) {
    const b = gymBounds(MAP.gym);
    if (wx < b.x || wx > b.x + b.w || wy < b.y || wy > b.y + b.h) return null;
    const n = this.matches.size;
    return {
      id: 'gym',
      label: n ? `Ginásio — 🔴🔵 ${n} ${n === 1 ? 'partida' : 'partidas'} de queimada · clique para entrar` : 'Ginásio — Queimada · clique para criar uma partida',
    };
  }

  click() {
    this.openPanel();
  }

  drawBuilding(ctx, now) {
    drawGymLive(ctx, MAP.gym, { live: this.matches.size > 0, hover: this.game.world.hover === 'gym' }, now / 1000);
  }

  drawOverlay(ctx, now) {
    const live = [...this.matches.values()].some((m) => m.ph !== 'lobby');
    if (live && now >= this.nextPop) {
      const g = MAP.gym;
      this.nextPop = now + 800 + Math.random() * 1000;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.pops.push({
        text: POP_WORDS[Math.floor(Math.random() * POP_WORDS.length)],
        color: POP_COLORS[Math.floor(Math.random() * POP_COLORS.length)],
        x: g.x + g.w / 2 + side * (60 + Math.random() * 70),
        y: g.y + 50 + Math.random() * 60,
        rot: (Math.random() - 0.5) * 0.5,
        born: now,
      });
    }
    this.pops = this.pops.filter((p) => now - p.born < 900);
    const open = [...this.matches.values()].some((m) => m.m.length < QM.MAX_MEMBERS);
    drawGymTop(ctx, MAP.gym, { live: this.matches.size > 0, matches: this.matches.size, players: this.where.size, pops: this.pops, open }, now / 1000, now);
  }

  // ---------- painel ----------

  openPanel() {
    if (!this.panel) {
      const p = el('div');
      p.id = 'gym-panel';
      p.hidden = true;
      document.body.appendChild(p);
      this.panel = p;
    }
    this.panel.hidden = false;
    this.hud.closePlayerCard();
    this.renderPanel();
  }

  closePanel() {
    if (this.panel) this.panel.hidden = true;
  }

  refreshPanel() {
    if (this.panel && !this.panel.hidden) this.renderPanel();
  }

  nick(pid) {
    return this.game.players.get(pid)?.nick ?? '?';
  }

  renderPanel() {
    const p = this.panel;
    const head = el('div', 'gp-head');
    head.append(el('b', '', '🔴🔵 Ginásio — Queimada'));
    const x = el('button', 'gp-x', '×');
    x.setAttribute('aria-label', 'Fechar');
    x.addEventListener('click', () => this.closePanel());
    head.append(x);
    const list = el('div', 'gp-list');
    const ms = [...this.matches.values()].sort((a, b) => a.id - b.id);
    if (!ms.length) list.append(el('p', 'gp-empty', 'Nenhuma quadra aberta. Crie uma e chame a galera! 👇'));
    for (const m of ms) {
      const row = el('div', 'gp-row');
      const txt = el('div', 'gp-txt');
      const title = el('div', 'gp-title');
      title.append(el('b', '', `Quadra ${m.id}`), el('span', `gp-lvl ${m.hard ? 'hard' : 'easy'}`, m.hard ? 'Difícil' : 'Fácil'));
      const teams = el('div', 'gp-teams');
      const side = (team, cls) => {
        const names = m.m.filter(([, t, slot]) => t === team && slot > 0).map(([pid, , slot]) => `${slot === 2 ? '💀' : ''}${this.nick(pid)}`);
        return el('span', `gp-team ${cls}`, names.length ? names.join(' + ') : '—');
      };
      teams.append(side('a', 'a'), el('span', 'gp-x-sign', '×'), side('b', 'b'));
      const queue = m.m.filter(([, , slot]) => slot === 0).length;
      const best = [...m.m].sort((a, b) => b[3] - a[3])[0];
      const info = [PHASE[m.ph] || m.ph];
      if (m.rd) info.push(`rodada ${m.rd}`);
      if (queue) info.push(`⏳ ${queue} na fila`);
      if (best && best[3] > 0) info.push(`🏆 ${this.nick(best[0])} ${best[3]} pts`);
      txt.append(title, teams, el('div', 'gp-info', info.join(' · ')));
      const full = m.m.length >= QM.MAX_MEMBERS;
      const mine = this.matchOf(this.game.me) === m.id;
      const btn = el('button', 'gp-join', mine ? '✔ Você está aqui' : full ? '🪑 Lotada' : m.ph === 'lobby' || m.ph === 'count' ? '▶ Entrar' : '▶ Entrar na fila');
      btn.disabled = full || mine;
      btn.addEventListener('click', () => {
        this.closePanel();
        this.game.qm.join(m.id);
      });
      row.append(txt, btn);
      list.append(row);
    }
    const create = el('div', 'gp-create');
    create.append(el('span', 'gp-create-t', '➕ Nova partida:'));
    for (const [hard, label, tip] of [[false, '🟢 Fácil', 'clicou na bola, o boneco vai buscar'], [true, '🔴 Difícil', 'tem que estar perto para pegar · janelas curtas']]) {
      const b = el('button', `gp-new ${hard ? 'hard' : 'easy'}`, label);
      b.title = tip;
      b.addEventListener('click', () => {
        this.closePanel();
        this.game.qm.create(hard);
      });
      create.append(b);
    }
    p.replaceChildren(head, list, create, el('p', 'gp-tip', `1v1 vira 2v2 com 4 pessoas; quem chega espera na fila e entra quando alguém é queimado. Primeiro a ${QM.TARGET} pontos vence! Também dá para chamar alguém clicando no boneco 🔴🔵`));
  }

  // ---------- notificação "fulano abriu uma quadra" ----------

  notify(m) {
    const me = this.game.me;
    if (this.game.qm.active() || m.m.some(([pid]) => pid === me) || this.game.kt.active()) return;
    const owner = m.m[0]?.[0];
    const nick = this.game.players.get(owner)?.nick;
    if (!nick) return;
    if (!this.notes) {
      this.notes = el('div');
      this.notes.id = 'qm-notes';
      document.body.appendChild(this.notes);
    }
    while (this.notes.children.length >= 2) this.notes.firstChild.remove();
    const n = el('div', 'qm-note');
    n.dataset.qm = String(m.id);
    const txt = el('span', 'qn-txt');
    txt.append(el('span', '', '🔴🔵 '), el('b', '', nick), el('span', 'qn-sub', ' abriu uma quadra de queimada!'));
    const btn = el('button', 'qn-join', '▶ Entrar');
    btn.addEventListener('click', () => {
      n.remove();
      this.game.qm.join(m.id);
    });
    const bar = el('i', 'qn-timer');
    bar.style.animationDuration = `${NOTE_MS}ms`;
    n.append(txt, btn, bar);
    this.notes.append(n);
    setTimeout(() => n.remove(), NOTE_MS);
    play('kt_notify');
  }

  dropNote(id) {
    this.notes?.querySelector(`[data-qm="${Number(id)}"]`)?.remove();
  }
}
