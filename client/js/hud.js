// Interface em DOM por cima do canvas: online, placar, chat, emotes, avisos.

import { EMOTES, CHAT_MAX_LEN } from '/shared/constants.js';
import { isMuted, toggleMute } from './audio.js';

const $ = (sel) => document.querySelector(sel);

function el(tag, cls = '', text = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== null) e.textContent = text;
  return e;
}

export class Hud {
  constructor({ onChat, onEmote }) {
    this.el = {
      root: $('#hud'),
      online: $('#online-count'),
      onlineBtn: $('#online-btn'),
      onlineList: $('#online-list'),
      score: $('#score'),
      zone: $('#zone-toast'),
      log: $('#chat-log'),
      form: $('#chat-form'),
      input: $('#chat-input'),
      emotes: $('#emotes'),
      tooltip: $('#tooltip'),
      toast: $('#toast'),
      banner: $('#banner'),
      mute: $('#mute-btn'),
    };
    this.el.input.maxLength = CHAT_MAX_LEN;

    this.el.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.el.input.value.trim();
      if (!text) return;
      this.el.input.value = '';
      // atalhos: /dance, /wave, /jump, /fart, /sit
      const cmd = text.match(/^\/(\w+)$/);
      const alias = { dancar: 'dance', acenar: 'wave', pular: 'jump', pum: 'fart', sentar: 'sit' };
      if (cmd && (EMOTES[cmd[1]] || alias[cmd[1]])) onEmote(EMOTES[cmd[1]] ? cmd[1] : alias[cmd[1]]);
      else onChat(text);
    });

    for (const [id, e] of Object.entries(EMOTES)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emote-btn';
      b.innerHTML = `<span class="key">${e.key}</span>${e.label}`;
      b.addEventListener('click', () => onEmote(id));
      this.el.emotes.appendChild(b);
    }

    this.el.onlineBtn.addEventListener('click', () => this.el.onlineList.classList.toggle('open'));
    const syncMute = () => { this.el.mute.textContent = isMuted() ? '🔇' : '🔊'; };
    this.el.mute.addEventListener('click', () => { toggleMute(); syncMute(); });
    syncMute();
  }

  show() {
    this.el.root.hidden = false;
  }

  setOnline(players, me) {
    this.el.online.textContent = players.length;
    this.el.onlineList.replaceChildren(...players
      .sort((a, b) => a.nick.localeCompare(b.nick))
      .map((p) => {
        const li = document.createElement('li');
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = p.look.hat;
        li.append(dot, document.createTextNode(p.id === me ? `${p.nick} (você)` : p.nick));
        return li;
      }));
  }

  setScore(s) {
    this.el.score.innerHTML = `<b class="red">${s.red}</b> × <b class="blue">${s.blue}</b>`;
  }

  log(nick, text, mine = false) {
    const li = document.createElement('li');
    if (nick) {
      const b = document.createElement('b');
      b.textContent = `${nick}: `;
      if (mine) b.className = 'mine';
      li.append(b, document.createTextNode(text));
    } else {
      li.className = 'system';
      li.textContent = text;
    }
    this.el.log.appendChild(li);
    while (this.el.log.children.length > 40) this.el.log.firstChild.remove();
    this.el.log.scrollTop = this.el.log.scrollHeight;
  }

  zone(name) {
    const z = this.el.zone;
    z.textContent = name;
    z.classList.remove('show');
    void z.offsetWidth; // reinicia animação
    z.classList.add('show');
  }

  toast(msg) {
    const t = this.el.toast;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  banner(title, sub) {
    const b = this.el.banner;
    b.innerHTML = '';
    const h = document.createElement('div');
    h.className = 'title';
    h.textContent = title;
    const s = document.createElement('div');
    s.className = 'sub';
    s.textContent = sub;
    b.append(h, s);
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  }

  tooltip(label, x, y) {
    const t = this.el.tooltip;
    if (!label) {
      t.hidden = true;
      return;
    }
    t.hidden = false;
    t.textContent = label;
    t.style.transform = `translate(${x + 14}px, ${y + 12}px)`;
  }

  // ---------- desafios / Gol a Gol ----------

  // Cartão ao clicar em outro player.
  playerCard(p, sx, sy, { busy, onChallenge, onKarate, onWave }) {
    const card = $('#player-card');
    card.replaceChildren();
    const head = el('div', 'pc-head');
    const dot = el('span', 'dot');
    dot.style.background = p.look.hat;
    head.append(dot, el('b', '', p.nick));
    const close = el('button', 'pc-close', '×');
    close.addEventListener('click', () => this.closePlayerCard());
    head.append(close);
    const btn = el('button', 'pc-challenge', busy ? '⚽ Está jogando...' : '⚽ Desafiar: Gol a Gol');
    btn.disabled = !!busy;
    btn.addEventListener('click', () => { onChallenge(); this.closePlayerCard(); });
    const kt = el('button', 'pc-challenge pc-karate', busy ? '🥋 Ocupado...' : '🥋 Desafiar: Karatê');
    kt.disabled = !!busy;
    kt.addEventListener('click', () => { onKarate?.(); this.closePlayerCard(); });
    const wave = el('button', 'pc-wave', '👋 Acenar');
    wave.addEventListener('click', () => { onWave(); this.closePlayerCard(); });
    card.append(head, btn, kt, wave);
    card.hidden = false;
    const w = 220;
    card.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, sx - w / 2))}px`;
    card.style.top = `${Math.max(8, Math.min(window.innerHeight - 190, sy - 190))}px`;
  }

  closePlayerCard() {
    $('#player-card').hidden = true;
  }

  // Convite de desafio recebido (empilha no canto).
  // `title`/`sub` opcionais: outros minigames (ex.: karatê) trocam o texto.
  invite({ from, nick, rematch, ttl, onAccept, onDecline, title: t, sub: s }) {
    this.removeInvite(from);
    const box = el('div', `invite${rematch ? ' rematch' : ''}`);
    box.dataset.from = from;
    const title = el('div', 'inv-title', t || (rematch ? `🔥 ${nick} quer REVANCHE!` : `⚽ ${nick} te desafiou!`));
    const sub = el('div', 'inv-sub', s || 'Gol a Gol — primeiro gol vence');
    const row = el('div', 'inv-row');
    const yes = el('button', 'inv-yes', 'Aceitar');
    const no = el('button', 'inv-no', 'Recusar');
    yes.addEventListener('click', () => { onAccept(); box.remove(); });
    no.addEventListener('click', () => { onDecline(); box.remove(); });
    row.append(yes, no);
    const bar = el('div', 'inv-timer');
    bar.style.animationDuration = `${ttl}ms`;
    box.append(title, sub, row, bar);
    $('#invites').appendChild(box);
    setTimeout(() => box.remove(), ttl + 200);
  }

  removeInvite(from) {
    $('#invites').querySelector(`[data-from="${Number(from)}"]`)?.remove();
  }

  clearInvites() {
    $('#invites').replaceChildren();
  }

  // Barra superior da partida (todos veem).
  ggBar(d) {
    const bar = $('#gg-bar');
    if (!d) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    bar.replaceChildren();
    const side = (s) => {
      const span = el('span', `gg-side ${s.cls}${s.shooting ? ' shooting' : ''}`);
      span.append(el('span', 'gg-role', s.shooting ? '⚽' : '🧤'), el('b', '', s.nick));
      return span;
    };
    bar.append(side(d.left), el('span', 'gg-vs', 'VS'), side(d.right));
    const info = el('div', 'gg-info', d.info);
    bar.append(info);
  }

  // Ajuda de controles conforme o papel do jogador local.
  ggHelp(role, { onCurve } = {}) {
    const h = $('#gg-help');
    if (!role) {
      h.hidden = true;
      this.ggRole = null;
      return;
    }
    if (this.ggRole === role) return;
    this.ggRole = role;
    h.hidden = false;
    h.replaceChildren();
    if (role === 'shooter') {
      h.append(
        el('b', '', 'VOCÊ CHUTA!'),
        el('div', '', '🖱️ Mire com o mouse · segure e solte para a força (acerte a ⭐)'),
        el('div', '', 'Q / E (ou roda do mouse) = efeito · W / S = mover a bola'),
        el('div', '', '📱 celular: segure no alvo, arraste para mirar, solte para chutar'),
      );
      const row = el('div', 'gg-curve');
      const l = el('button', '', '↺ efeito');
      const r = el('button', '', 'efeito ↻');
      l.addEventListener('click', () => onCurve?.(-0.25));
      r.addEventListener('click', () => onCurve?.(0.25));
      row.append(l, r);
      h.append(row);
    } else if (role === 'keeper') {
      h.append(
        el('b', '', 'VOCÊ DEFENDE!'),
        el('div', '', '🖱️ Mova o mouse para cima/baixo (ou W / S)'),
        el('div', '', 'Clique (ou Espaço) para MERGULHAR para o lado do mouse'),
        el('div', '', '📱 celular: arraste para mover, toque duplo para mergulhar'),
      );
    } else {
      h.append(el('b', '', 'Prepare-se...'));
    }
  }

  // Modal de fim de jogo com revanche.
  ggResult({ won, title, sub, onRematch, onClose }) {
    const m = $('#gg-result');
    m.replaceChildren();
    const card = el('div', `gg-card ${won ? 'won' : 'lost'}`);
    card.append(el('div', 'gg-emoji', won ? '🏆' : '😭'), el('h2', '', title), el('p', '', sub));
    const row = el('div', 'gg-actions');
    const again = el('button', 'gg-again', won ? 'Revanche?' : 'Pedir revanche!');
    again.addEventListener('click', () => { onRematch(); this.closeGgResult(); });
    const close = el('button', 'gg-close', won ? 'Valeu!' : 'Deixa pra lá');
    close.addEventListener('click', () => { onClose?.(); this.closeGgResult(); });
    row.append(again, close);
    card.append(row);
    m.append(card);
    m.hidden = false;
  }

  closeGgResult() {
    $('#gg-result').hidden = true;
  }

  chatFocused() {
    return document.activeElement === this.el.input;
  }

  focusChat() {
    this.el.input.focus();
  }

  blurChat() {
    this.el.input.blur();
  }
}
