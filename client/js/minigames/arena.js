// Prédio do Dojo na praça: lista de lutas de Karatê AO VIVO e entrada na plateia.
// - Guarda todas as lutas em andamento (kt_start / kt_live / kt_end) e quem está na plateia
//   (para a praça esconder os espectadores, que estão "dentro" do dojo).
// - Desenha o prédio vivo (render/dojohouse.js): aceso com luta, fechado sem luta.
// - Clique no prédio: painel "Nilton × Daniel — 👀 Assistir" (só abre se houver luta).
// - Notificação pequena quando duas pessoas começam a lutar, com atalho para assistir.

import { MAP } from '/shared/map.js';
import { MSG } from '/shared/constants.js';
import { ARENA } from '/shared/arena.js';
import { drawDojoLive, drawDojoTop, dojoBounds } from '../render/dojohouse.js';
import { play } from '../audio.js';

const NOTE_MS = 6500;
const MAX_NOTES = 2;
const POP_WORDS = ['POW!', 'KIAI!', 'BAM!', 'HAA!', 'TUM!', 'OSS!', 'PÁ!', 'HIYA!'];
const POP_COLORS = ['#e8412b', '#ff9a3c', '#8a4fc7', '#3a6fd8'];

function el(tag, cls = '', text = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== null) e.textContent = text;
  return e;
}

export class ArenaClient {
  constructor(game, hud) {
    this.game = game;
    this.hud = hud;
    this.fights = new Map(); // id -> { id, a, b, rd, wins, w: [[pid, side, seat]] }
    this.watchers = new Map(); // playerId -> fightId
    this.pops = [];
    this.nextPop = 0;
    this.panel = null;
    this.notes = null;
    // clicar no mapa fecha o painel (o clique no prédio abre de novo logo em seguida)
    game.canvas.addEventListener('pointerdown', () => this.closePanel());
    window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') this.closePanel(); });
  }

  // ---------- estado ----------

  isWatching(pid) {
    return this.watchers.has(pid);
  }

  watcherCount() {
    return this.watchers.size;
  }

  // não consome mensagens: o KarateClient também precisa delas
  onMessage(msg, now) {
    switch (msg.t) {
      case MSG.WELCOME:
        this.fights.clear();
        for (const f of msg.fights || []) this.fights.set(f.id, { rd: 1, wins: [0, 0], w: [], ...f });
        this.reindex();
        break;
      case MSG.KT_START:
        this.fights.set(msg.id, { id: msg.id, a: msg.a, b: msg.b, rd: 1, wins: [0, 0], w: [] });
        this.reindex();
        this.notify(msg);
        this.refreshPanel();
        break;
      case MSG.KT_LIVE: {
        const f = this.fights.get(msg.id);
        if (!f) break;
        const before = new Set(f.w.map(([pid]) => pid));
        Object.assign(f, { rd: msg.rd, wins: msg.wins, w: msg.w });
        this.reindex();
        // alguém entrou no dojo: "👀" sai da porta
        const door = MAP.dojo.door;
        for (const [pid] of msg.w) {
          if (before.has(pid)) continue;
          const nick = this.game.players.get(pid)?.nick;
          if (nick) this.game.fx.add('text', { x: door.x, y: door.y - 70, text: `👀 ${nick} entrou`, color: '#ffe36b', size: 14 }, now);
        }
        this.refreshPanel();
        break;
      }
      case MSG.KT_END:
        this.fights.delete(msg.id);
        this.reindex();
        this.dropNote(msg.id);
        this.refreshPanel();
        break;
      default:
        break;
    }
    return false;
  }

  reindex() {
    this.watchers.clear();
    for (const f of this.fights.values()) for (const [pid] of f.w) this.watchers.set(pid, f.id);
  }

  // ---------- prédio (desenho + clique) ----------

  hitTest(wx, wy) {
    const b = dojoBounds(MAP.dojo);
    if (wx < b.x || wx > b.x + b.w || wy < b.y || wy > b.y + b.h) return null;
    const n = this.fights.size;
    return {
      id: 'dojo',
      label: n ? `Dojo — 🥋 ${n} ${n === 1 ? 'luta' : 'lutas'} ao vivo · clique para assistir` : 'Dojo — fechado (ninguém lutando agora)',
    };
  }

  click() {
    if (!this.fights.size) {
      this.hud.toast('🔒 Dojo fechado: ninguém lutando agora. Desafie alguém! 🥋');
      const d = MAP.dojo;
      this.game.fx.add('text', { x: d.door.x, y: d.y + 120, text: 'zzz...', color: '#c9d6ff', size: 18 }, performance.now());
      return;
    }
    this.openPanel();
  }

  // parte animada, logo depois do fundo (atrás dos players)
  drawBuilding(ctx, now) {
    drawDojoLive(ctx, MAP.dojo, { live: this.fights.size > 0, hover: this.game.world.hover === 'dojo' }, now / 1000);
  }

  // selo + onomatopeias, por cima de tudo
  drawOverlay(ctx, now) {
    const live = this.fights.size > 0;
    if (live && now >= this.nextPop) {
      const d = MAP.dojo;
      this.nextPop = now + 700 + Math.random() * 900;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.pops.push({
        text: POP_WORDS[Math.floor(Math.random() * POP_WORDS.length)],
        color: POP_COLORS[Math.floor(Math.random() * POP_COLORS.length)],
        x: d.x + d.w / 2 + side * (55 + Math.random() * 70),
        y: d.y + 40 + Math.random() * 70,
        rot: (Math.random() - 0.5) * 0.5,
        born: now,
      });
    }
    this.pops = this.pops.filter((p) => now - p.born < 900);
    drawDojoTop(ctx, MAP.dojo, { live, fights: this.fights.size, watchers: this.watchers.size, pops: this.pops }, now / 1000, now);
  }

  // ---------- painel "lutas ao vivo" ----------

  openPanel() {
    if (!this.panel) {
      const p = el('div');
      p.id = 'dojo-panel';
      p.hidden = true;
      document.body.appendChild(p);
      this.panel = p;
    }
    this.panel.hidden = false;
    this.hud.closePlayerCard();
    this.renderPanel();
    play('click');
  }

  closePanel() {
    if (this.panel) this.panel.hidden = true;
  }

  refreshPanel() {
    if (this.panel && !this.panel.hidden) this.renderPanel();
  }

  renderPanel() {
    const p = this.panel;
    const head = el('div', 'dp-head');
    head.append(el('b', '', '🥋 Dojo — lutas ao vivo'));
    const x = el('button', 'dp-x', '×');
    x.setAttribute('aria-label', 'Fechar');
    x.addEventListener('click', () => this.closePanel());
    head.append(x);
    const list = el('div', 'dp-list');
    const fights = [...this.fights.values()].sort((a, b) => a.id - b.id);
    if (!fights.length) list.append(el('p', 'dp-empty', 'Acabou! Ninguém lutando agora 😴'));
    for (const f of fights) {
      const row = el('div', 'dp-row');
      const vs = el('div', 'dp-vs');
      const side = (pl, cls) => {
        const s = el('span', `dp-fighter ${cls}`);
        const dot = el('i');
        const look = this.game.players.get(pl.id)?.look;
        if (look) dot.style.background = look.hat;
        s.append(dot, el('b', '', pl.nick));
        return s;
      };
      vs.append(side(f.a, 'a'), el('span', 'dp-x-sign', '×'), side(f.b, 'b'));
      const full = f.w.length >= ARENA.MAX_WATCHERS;
      const info = el('div', 'dp-info', `Round ${f.rd} · ${f.wins[0]}×${f.wins[1]} · 👀 ${f.w.length}${full ? ' (lotado)' : ''}`);
      const btn = el('button', 'dp-watch', full ? '🪑 Lotado' : '👀 Assistir');
      btn.disabled = full;
      btn.addEventListener('click', () => {
        this.closePanel();
        this.game.kt.watch(f.id);
      });
      const txt = el('div', 'dp-txt');
      txt.append(vs, info);
      row.append(txt, btn);
      list.append(row);
    }
    p.replaceChildren(head, list, el('p', 'dp-tip', 'Na plateia você torce e conversa — mas não dá pra atrapalhar a luta 😉'));
  }

  // ---------- notificação "fulano × ciclano vão lutar" ----------

  notify(m) {
    const me = this.game.me;
    if (m.a.id === me || m.b.id === me || this.game.kt.role === 'fighter') return;
    if (!this.notes) {
      this.notes = el('div');
      this.notes.id = 'kt-notes';
      document.body.appendChild(this.notes);
    }
    while (this.notes.children.length >= MAX_NOTES) this.notes.firstChild.remove();
    const n = el('div', 'kt-note');
    n.dataset.fight = String(m.id);
    const txt = el('span', 'kn-txt');
    txt.append(el('span', '', '🥋 '), el('b', '', m.a.nick), el('span', '', ' × '), el('b', '', m.b.nick), el('span', 'kn-sub', ' vão lutar!'));
    const btn = el('button', 'kn-watch', '👀 Assistir');
    btn.addEventListener('click', () => {
      n.remove();
      this.game.kt.watch(m.id);
    });
    const bar = el('i', 'kn-timer');
    bar.style.animationDuration = `${NOTE_MS}ms`;
    n.append(txt, btn, bar);
    this.notes.append(n);
    setTimeout(() => n.remove(), NOTE_MS);
    play('kt_notify');
  }

  dropNote(fightId) {
    this.notes?.querySelector(`[data-fight="${Number(fightId)}"]`)?.remove();
  }
}
