// Prédio da Escola na praça: salas da Corrida das Perguntas e entrada nelas.
// - Guarda todas as salas (welcome / qz_live) e quem está dentro de cada uma (a praça esconde quem está
//   correndo ou assistindo: eles estão "dentro" da Escola).
// - Desenha o prédio vivo (render/schoolhouse.js): aceso com aula rolando, sino tocando quando alguém vence.
// - Clique: painel com as salas (🙋 Correr / 👀 Assistir) e "➕ Nova sala" (dificuldade, tamanho da pista).
// - Notificação pequena quando alguém abre uma sala.

import { MAP } from '/shared/map.js';
import { MSG } from '/shared/constants.js';
import { QZ, MODES, MODE_IDS } from '/shared/quiz.js';
import { drawSchoolLive, drawSchoolTop, schoolBounds } from '../render/schoolhouse.js';
import { play } from '../audio.js';

const NOTE_MS = 7000;
const POP_WORDS = ['CERTO!', 'ERROU!', '+1 casa!', 'A, B, C...', '?!', 'UHUU!', 'COMBO!', 'Yes!'];
const POP_COLORS = ['#2e9e48', '#e8412b', '#3a6fd8', '#f2a81e', '#8a4fc7'];
const PHASE = { lobby: 'esperando gente', count: 'começando...', intro: 'valendo!', ask: 'valendo!', reveal: 'valendo!', over: 'pódio 🏆' };

function el(tag, cls = '', text = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== null) e.textContent = text;
  return e;
}

export class SchoolClient {
  constructor(game, hud) {
    this.game = game;
    this.hud = hud;
    this.rooms = new Map(); // id -> { id, ph, mode, len, theme, flag, n, r:[[id,pos,nick?]], w:[pid], open }
    this.where = new Map(); // playerId -> roomId (corredores e plateia; robôs têm id < 0)
    this.themes = [{ id: 'en', name: 'Inglês', flag: '🇺🇸', count: 0 }];
    this.pops = [];
    this.nextPop = 0;
    this.ringUntil = 0;
    this.panel = null;
    this.notes = null;
    this.pick = { mode: 'normal', len: QZ.DEFAULT_LEN };
    try {
      const saved = JSON.parse(localStorage.getItem('np.quizPick') || '{}');
      if (MODES[saved.mode]) this.pick.mode = saved.mode;
      if (QZ.LENGTHS.includes(saved.len)) this.pick.len = saved.len;
    } catch { /* sem storage */ }
    game.canvas.addEventListener('pointerdown', () => this.closePanel());
    window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') this.closePanel(); });
  }

  // ---------- estado ----------

  roomOf(pid) {
    return this.where.get(pid) ?? null;
  }

  // não consome mensagens: o QuizClient também precisa delas
  onMessage(msg, now) {
    switch (msg.t) {
      case MSG.WELCOME:
        this.rooms.clear();
        for (const r of msg.qzs || []) this.rooms.set(r.id, r);
        if (msg.qzThemes?.length) this.themes = msg.qzThemes;
        this.reindex();
        break;
      case MSG.QZ_LIVE: {
        if (msg.gone) {
          this.rooms.delete(msg.id);
          this.dropNote(msg.id);
        } else {
          const prev = this.rooms.get(msg.id);
          const before = new Set(prev ? [...prev.r.map(([id]) => id), ...prev.w] : []);
          this.rooms.set(msg.id, msg);
          if (!prev) this.notify(msg);
          const door = MAP.school.door;
          for (const id of [...msg.r.map(([pid]) => pid), ...msg.w]) {
            if (!prev || before.has(id) || id < 0) continue;
            const nick = this.game.players.get(id)?.nick;
            if (nick) this.game.fx.add('text', { x: door.x, y: door.y - 70, text: `📚 ${nick} entrou`, color: '#ffe36b', size: 14 }, now);
          }
        }
        this.reindex();
        this.refreshPanel();
        break;
      }
      case MSG.QZ_END:
        this.ringUntil = now + 2600; // sino da Escola toca
        break;
      default:
        break;
    }
    return false;
  }

  reindex() {
    this.where.clear();
    for (const r of this.rooms.values()) {
      for (const [pid] of r.r) if (pid > 0) this.where.set(pid, r.id);
      for (const pid of r.w) this.where.set(pid, r.id);
    }
  }

  // ---------- prédio ----------

  hitTest(wx, wy) {
    const b = schoolBounds(MAP.school);
    if (wx < b.x || wx > b.x + b.w || wy < b.y || wy > b.y + b.h) return null;
    const n = this.rooms.size;
    return {
      id: 'school',
      label: n ? `Escola — 📚 ${n} ${n === 1 ? 'corrida' : 'corridas'} de perguntas · clique para correr ou assistir` : 'Escola — Corrida das Perguntas 🇺🇸 · clique para criar uma sala',
    };
  }

  click() {
    this.openPanel();
  }

  drawBuilding(ctx, now) {
    const ring = now < this.ringUntil ? Math.min(1, (this.ringUntil - now) / 900) : 0;
    drawSchoolLive(ctx, MAP.school, { live: this.rooms.size > 0, hover: this.game.world.hover === 'school', flag: this.themes[0]?.flag, ring }, now / 1000);
  }

  drawOverlay(ctx, now) {
    const racing = [...this.rooms.values()].some((r) => r.ph !== 'lobby');
    if (racing && now >= this.nextPop) {
      const g = MAP.school;
      this.nextPop = now + 900 + Math.random() * 1100;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.pops.push({
        text: POP_WORDS[Math.floor(Math.random() * POP_WORDS.length)],
        color: POP_COLORS[Math.floor(Math.random() * POP_COLORS.length)],
        x: g.x + g.w / 2 + side * (70 + Math.random() * 60),
        y: g.y + 70 + Math.random() * 50,
        rot: (Math.random() - 0.5) * 0.5,
        born: now,
      });
    }
    this.pops = this.pops.filter((p) => now - p.born < 900);
    let racers = 0;
    let watching = 0;
    for (const r of this.rooms.values()) {
      racers += r.r.filter(([id]) => id > 0).length;
      watching += r.w.length;
    }
    const open = [...this.rooms.values()].some((r) => r.open);
    drawSchoolTop(ctx, MAP.school, { live: this.rooms.size > 0, rooms: this.rooms.size, racing: racers, watching, pops: this.pops, open }, now / 1000, now);
  }

  // ---------- painel ----------

  openPanel() {
    if (!this.panel) {
      const p = el('div');
      p.id = 'school-panel';
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

  nick(id, r) {
    if (id < 0) return `🤖 ${r?.[2] || 'Robô'}`;
    return this.game.players.get(id)?.nick ?? '?';
  }

  renderPanel() {
    const p = this.panel;
    const head = el('div', 'sp-head');
    head.append(el('b', '', '📚 Escola — Corrida das Perguntas'));
    const x = el('button', 'sp-x', '×');
    x.setAttribute('aria-label', 'Fechar');
    x.addEventListener('click', () => this.closePanel());
    head.append(x);
    const list = el('div', 'sp-list');
    const rooms = [...this.rooms.values()].sort((a, b) => a.id - b.id);
    if (!rooms.length) list.append(el('p', 'sp-empty', 'Nenhuma sala aberta. Crie uma — dá para treinar sozinho contra robôs! 👇'));
    const mine = this.roomOf(this.game.me);
    for (const r of rooms) {
      const row = el('div', 'sp-row');
      const txt = el('div', 'sp-txt');
      const title = el('div', 'sp-title');
      const m = MODES[r.mode] || MODES.normal;
      title.append(el('b', '', `Sala ${r.id}`), el('span', 'sp-chip', `${r.flag || '🇺🇸'} ${this.themes.find((t) => t.id === r.theme)?.name || 'Inglês'}`),
        el('span', `sp-chip sp-${r.mode}`, `${m.icon} ${m.label}`), el('span', 'sp-chip', `${r.len} casas`));
      const racers = el('div', 'sp-racers');
      const sorted = [...r.r].sort((a, b) => b[1] - a[1]);
      for (const it of sorted) {
        const chip = el('span', `sp-racer${it[0] < 0 ? ' bot' : ''}`);
        chip.append(el('b', '', this.nick(it[0], it)), el('small', '', ` ${it[1]}/${r.len}`));
        racers.append(chip);
      }
      if (!sorted.length) racers.append(el('span', 'sp-racer', '—'));
      const info = [PHASE[r.ph] || r.ph];
      if (r.n && r.ph !== 'lobby') info.push(`pergunta ${r.n}`);
      if (r.w.length) info.push(`👀 ${r.w.length}`);
      txt.append(title, racers, el('div', 'sp-info', info.join(' · ')));
      const btns = el('div', 'sp-btns');
      const here = mine === r.id;
      const full = r.r.length >= QZ.MAX_RACERS && !r.r.some(([id]) => id < 0);
      const play = el('button', 'sp-play', here ? '✔ Você está aqui' : r.open ? '🙋 Correr' : full ? '🙋 Fila p/ próxima' : '🙋 Próxima corrida');
      play.title = r.open ? 'Entra na corrida (quem entra no meio começa da largada)' : 'Assiste agora e corre na próxima corrida';
      play.disabled = here;
      play.addEventListener('click', () => {
        this.closePanel();
        this.game.qz.join(r.id, 'play');
      });
      const watch = el('button', 'sp-watch', '👀 Assistir');
      watch.disabled = here || r.w.length >= QZ.MAX_WATCHERS;
      watch.addEventListener('click', () => {
        this.closePanel();
        this.game.qz.join(r.id, 'watch');
      });
      btns.append(play, watch);
      row.append(txt, btns);
      list.append(row);
    }
    // nova sala
    const create = el('div', 'sp-create');
    const theme = this.themes[0];
    create.append(el('div', 'sp-create-t', `➕ Nova sala · ${theme.flag} ${theme.name}${theme.count ? ` · ${theme.count} perguntas` : ''}`));
    const modes = el('div', 'sp-opts');
    for (const id of MODE_IDS) {
      const m = MODES[id];
      const b = el('button', `sp-opt sp-${id}${this.pick.mode === id ? ' on' : ''}`, `${m.icon} ${m.label}`);
      b.title = m.tip;
      b.addEventListener('click', () => { this.pick.mode = id; this.savePick(); this.renderPanel(); play('click'); });
      modes.append(b);
    }
    const lens = el('div', 'sp-opts');
    for (const len of QZ.LENGTHS) {
      const b = el('button', `sp-opt${this.pick.len === len ? ' on' : ''}`, len === Math.min(...QZ.LENGTHS) ? `⚡ Rápida (${len} casas)` : `🏁 Normal (${len} casas)`);
      b.addEventListener('click', () => { this.pick.len = len; this.savePick(); this.renderPanel(); play('click'); });
      lens.append(b);
    }
    const go = el('button', 'sp-new', '📚 Abrir sala e correr');
    go.addEventListener('click', () => {
      this.closePanel();
      this.game.qz.create(this.pick.mode, this.pick.len);
    });
    create.append(modes, lens, go, el('div', 'sp-soon', '🤖 Em breve: escolher outros temas, montados por IA'));
    p.replaceChildren(head, list, create, el('p', 'sp-tip',
      'Acertou = anda 1 casa · 2 seguidas = quem está na sua frente VOLTA 1 · a cada 5 perguntas, uma ⭐ vale 2 · 🎁 dá cartas (🤫 💨 🎲). Quem entra no meio começa da largada!'));
  }

  savePick() {
    try { localStorage.setItem('np.quizPick', JSON.stringify(this.pick)); } catch { /* sem storage */ }
  }

  // ---------- notificação "fulano abriu uma sala" ----------

  notify(r) {
    const me = this.game.me;
    const owner = r.r.find(([id]) => id > 0)?.[0];
    if (this.game.qz.active() || owner === me || this.game.kt.active() || this.game.qm.active()) return;
    const nick = this.game.players.get(owner)?.nick;
    if (!nick) return;
    if (!this.notes) {
      this.notes = el('div');
      this.notes.id = 'qz-notes';
      document.body.appendChild(this.notes);
    }
    while (this.notes.children.length >= 2) this.notes.firstChild.remove();
    const n = el('div', 'qz-note');
    n.dataset.qz = String(r.id);
    const txt = el('span', 'zn-txt');
    txt.append(el('span', '', '📚 '), el('b', '', nick), el('span', 'zn-sub', ' abriu uma Corrida das Perguntas!'));
    const go = el('button', 'zn-go', '🙋 Correr');
    go.addEventListener('click', () => { n.remove(); this.game.qz.join(r.id, 'play'); });
    const watch = el('button', 'zn-go zn-watch', '👀');
    watch.title = 'Assistir';
    watch.addEventListener('click', () => { n.remove(); this.game.qz.join(r.id, 'watch'); });
    const bar = el('i', 'zn-timer');
    bar.style.animationDuration = `${NOTE_MS}ms`;
    n.append(txt, go, watch, bar);
    this.notes.append(n);
    setTimeout(() => n.remove(), NOTE_MS);
    play('kt_notify');
  }

  dropNote(id) {
    this.notes?.querySelector(`[data-qz="${Number(id)}"]`)?.remove();
  }
}
