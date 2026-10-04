// Interface mobile estilo "Roblox": barra de ícones no topo, joystick virtual,
// botões grandes de ação, chat/lista/menu em painéis recolhíveis e controles
// de toque do Gol a Gol. Só é ativada quando body.mobile (ver detectMobile).
// O desktop não muda: reaproveitamos os elementos do HUD (chat, online, placar)
// movendo-os para dentro dos painéis mobile.

import { EMOTES, MSG } from '/shared/constants.js';
import { isMuted, toggleMute, play } from './audio.js';

const STICK_RADIUS = 46; // px que o "dedão" anda a partir do centro
const STEER_MS = 110;

export function detectMobile() {
  const q = new URLSearchParams(location.search).get('mobile');
  if (q === '1') return true;
  if (q === '0') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const touchSmall = navigator.maxTouchPoints > 0 && Math.min(window.innerWidth, window.innerHeight) < 820;
  return coarse || touchSmall;
}

const $ = (sel) => document.querySelector(sel);

function capture(target, ev) {
  try { target.setPointerCapture(ev.pointerId); } catch { /* ponteiro sintético/antigo */ }
}

function el(tag, cls = '', html = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== null) e.innerHTML = html;
  return e;
}

export function setupMobile(game, hud) {
  const gg = game.gg;
  gg.touchMode = true;

  // ---------- montagem ----------
  const ui = el('div', '', null);
  ui.id = 'm-ui';
  ui.innerHTML = `
    <div class="m-top">
      <div class="m-top-left">
        <button class="m-icon" id="m-menu" aria-label="Menu">☰</button>
        <button class="m-icon" id="m-chat" aria-label="Chat">💬<span class="m-badge" hidden>0</span></button>
        <button class="m-icon m-people" id="m-people" aria-label="Online">👥<span class="m-count">1</span></button>
      </div>
      <div class="m-top-right" id="m-top-right"></div>
    </div>

    <section class="m-panel" id="m-chat-panel" hidden>
      <header><b>💬 Chat</b><button class="m-x" data-close="m-chat-panel" aria-label="Fechar">✕</button></header>
    </section>
    <section class="m-panel" id="m-people-panel" hidden>
      <header><b>👥 Online</b><button class="m-x" data-close="m-people-panel" aria-label="Fechar">✕</button></header>
      <p class="m-tip">Toque num boneco no mapa para desafiar ⚽</p>
    </section>
    <section class="m-panel" id="m-menu-panel" hidden>
      <header><b>☰ Menu</b><button class="m-x" data-close="m-menu-panel" aria-label="Fechar">✕</button></header>
      <button class="m-menu-item" id="m-sound"></button>
      <button class="m-menu-item" id="m-help-btn">❓ Como jogar</button>
      <button class="m-menu-item" id="m-look">👕 Trocar nick / visual</button>
    </section>
    <section class="m-panel" id="m-help-panel" hidden>
      <header><b>❓ Como jogar</b><button class="m-x" data-close="m-help-panel" aria-label="Fechar">✕</button></header>
      <ul class="m-help">
        <li><b>🕹️ Joystick</b> (esquerda) ou toque no chão para andar</li>
        <li><b>Toque nas coisas</b>: fonte, bancos, postes, lago, patos, bola</li>
        <li><b>⬆ PULAR</b> e <b>😜</b> para emotes</li>
        <li><b>Toque num player</b> para desafiar no Gol a Gol</li>
        <li><b>🎙️ Voz</b>: toque num player → <b>Chamar para conversar por voz</b> (ou <b>Pedir para entrar</b> se ele já estiver num grupo 🎧). O 🎙️ no topo mostra o grupo; o botão 🎤 redondo liga/desliga seu microfone</li>
        <li><b>Chutando</b>: toque no campo para mirar, <b>segure ⚽ CHUTAR</b> e solte na ⭐; ↺ ↻ dão efeito; joystick move a bola</li>
        <li><b>Defendendo</b>: joystick (ou arraste) move o goleiro; <b>🧤⬆ / 🧤⬇</b> mergulham</li>
      </ul>
    </section>

    <div id="m-stick" aria-label="Joystick"><div class="m-knob"></div></div>

    <div id="m-hint"></div>
    <div id="m-rotate">🔄 Gire o celular para ver o campo maior</div>
    <div id="m-actions" data-mode="free">
      <div id="m-emote-grid" hidden></div>
      <button class="m-btn m-emote" data-show="free" aria-label="Emotes">😜</button>
      <button class="m-btn m-big m-jump" data-show="free">⬆<small>PULAR</small></button>

      <button class="m-btn m-curve" data-show="shooter" data-d="-0.25" aria-label="Efeito anti-horário">↺</button>
      <button class="m-btn m-curve" data-show="shooter" data-d="0.25" aria-label="Efeito horário">↻</button>
      <button class="m-btn m-big m-kick" data-show="shooter">⚽<small>CHUTAR</small></button>

      <button class="m-btn m-big m-dive" data-show="keeper" data-d="-1">🧤<small>⬆ PULA</small></button>
      <button class="m-btn m-big m-dive" data-show="keeper" data-d="1">🧤<small>⬇ PULA</small></button>
    </div>
  `;
  document.body.appendChild(ui);

  // reaproveita elementos do HUD desktop
  $('#m-chat-panel').append($('#chat-log'), $('#chat-form'));
  $('#m-people-panel').insertBefore($('#online-list'), $('#m-people-panel .m-tip'));
  $('#m-top-right').append($('#score'));
  $('#chat-input').placeholder = 'Fale algo...';

  // ---------- painéis ----------
  const panels = ['m-chat-panel', 'm-people-panel', 'm-menu-panel', 'm-help-panel'];
  const open = (id) => {
    for (const p of panels) $(`#${p}`).hidden = p !== id ? true : !$(`#${p}`).hidden;
    closeEmotes();
    if (id === 'm-chat-panel' && !$('#m-chat-panel').hidden) {
      unread = 0;
      syncBadge();
      const log = $('#chat-log');
      log.scrollTop = log.scrollHeight;
    }
    play('click');
  };
  ui.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { $(`#${b.dataset.close}`).hidden = true; hud.blurChat(); }));
  $('#m-chat').addEventListener('click', () => open('m-chat-panel'));
  $('#m-people').addEventListener('click', () => open('m-people-panel'));
  $('#m-menu').addEventListener('click', () => open('m-menu-panel'));
  $('#m-help-btn').addEventListener('click', () => open('m-help-panel'));
  $('#m-look').addEventListener('click', () => location.reload());
  const syncSound = () => { $('#m-sound').textContent = isMuted() ? '🔇 Som: desligado' : '🔊 Som: ligado'; };
  $('#m-sound').addEventListener('click', () => { toggleMute(); syncSound(); play('click'); });
  syncSound();

  // contador de não lidas no chat
  let unread = 0;
  const badge = $('#m-chat .m-badge');
  const syncBadge = () => {
    badge.hidden = unread === 0;
    badge.textContent = unread > 9 ? '9+' : String(unread);
  };
  const origLog = hud.log.bind(hud);
  hud.log = (nick, text, mine) => {
    origLog(nick, text, mine);
    if (nick && !mine && $('#m-chat-panel').hidden) {
      unread++;
      syncBadge();
    }
  };
  const origOnline = hud.setOnline.bind(hud);
  hud.setOnline = (players, me) => {
    origOnline(players, me);
    $('#m-people .m-count').textContent = players.length;
  };
  $('#m-people .m-count').textContent = $('#online-count').textContent;

  // ---------- emotes ----------
  const grid = $('#m-emote-grid');
  for (const [id, e] of Object.entries(EMOTES)) {
    if (id === 'jump') continue; // tem botão próprio
    const icon = { wave: '👋', dance: '💃', fart: '💨', sit: '🪑' }[id] || '⭐';
    const b = el('button', 'm-tile', `<span>${icon}</span>${e.label}`);
    b.addEventListener('click', () => { game.emote(id); closeEmotes(); });
    grid.appendChild(b);
  }
  function closeEmotes() {
    grid.hidden = true;
  }
  $('.m-emote').addEventListener('click', () => { grid.hidden = !grid.hidden; play('click'); });
  $('.m-jump').addEventListener('click', () => game.emote('jump'));

  // ---------- Gol a Gol ----------
  const kick = $('.m-kick');
  const startKick = (ev) => {
    ev.preventDefault();
    if (gg.role() !== 'shooter' || gg.last?.ph !== 'aim' || gg.charging) return;
    capture(kick, ev);
    kick.classList.add('held');
    gg.startCharge(performance.now());
  };
  const endKick = () => {
    kick.classList.remove('held');
    if (gg.charging) gg.shoot(performance.now());
  };
  kick.addEventListener('pointerdown', startKick);
  kick.addEventListener('pointerup', endKick);
  kick.addEventListener('pointercancel', endKick);
  ui.querySelectorAll('.m-curve').forEach((b) => b.addEventListener('click', () => { gg.adjustCurve(Number(b.dataset.d)); play('click'); }));
  ui.querySelectorAll('.m-dive').forEach((b) => b.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    const s = gg.last;
    if (gg.role() === 'keeper' && s && (s.ph === 'aim' || s.ph === 'flight')) {
      game.send({ t: MSG.GG_INPUT, dive: Number(b.dataset.d) });
      b.classList.add('held');
      setTimeout(() => b.classList.remove('held'), 200);
    }
  }));

  // ---------- joystick ----------
  const stick = $('#m-stick');
  const knob = stick.querySelector('.m-knob');
  const axis = { x: 0, y: 0, active: false, id: null };
  let lastDir = null;
  const setKnob = (x, y) => { knob.style.transform = `translate(${x}px, ${y}px)`; };
  const updateAxis = (ev) => {
    const r = stick.getBoundingClientRect();
    let dx = ev.clientX - (r.left + r.width / 2);
    let dy = ev.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > STICK_RADIUS) { dx = (dx / d) * STICK_RADIUS; dy = (dy / d) * STICK_RADIUS; }
    setKnob(dx, dy);
    axis.x = dx / STICK_RADIUS;
    axis.y = dy / STICK_RADIUS;
  };
  stick.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    axis.active = true;
    axis.id = ev.pointerId;
    capture(stick, ev);
    stick.classList.add('on');
    closeEmotes();
    updateAxis(ev);
    steer();
  });
  stick.addEventListener('pointermove', (ev) => { if (axis.active && ev.pointerId === axis.id) updateAxis(ev); });
  const release = (ev) => {
    if (!axis.active || (ev && ev.pointerId !== axis.id)) return;
    axis.active = false;
    axis.x = axis.y = 0;
    setKnob(0, 0);
    stick.classList.remove('on');
    gg.axisY = 0;
    // para logo em vez de terminar o último passo (um tiquinho à frente, sem dar ré)
    const me = game.movePos();
    if (me && !gg.isPlaying() && lastDir) game.steerTo(me.x + lastDir.x * 12, me.y + lastDir.y * 12);
    lastDir = null;
  };
  stick.addEventListener('pointerup', release);
  stick.addEventListener('pointercancel', release);
  stick.addEventListener('lostpointercapture', release);

  function steer() {
    if (!axis.active) return;
    const mag = Math.hypot(axis.x, axis.y);
    if (gg.isPlaying()) {
      gg.axisY = Math.abs(axis.y) > 0.2 ? axis.y : 0;
      return;
    }
    if (mag < 0.2) return;
    const me = game.movePos();
    if (!me) return;
    const lead = 40 + 50 * Math.min(1, mag);
    lastDir = { x: axis.x / mag, y: axis.y / mag };
    game.steerTo(me.x + lastDir.x * lead, me.y + lastDir.y * lead);
    game.dest = null;
  }
  setInterval(steer, STEER_MS);

  // ---------- por frame: modo dos botões + dica ----------
  const actions = $('#m-actions');
  const hint = $('#m-hint');
  hint.hidden = true;
  const rotate = $('#m-rotate');
  rotate.hidden = true;
  game.bubbleTop = 64; // balões somem atrás da barra de ícones
  game.compactBubbles = true;
  let lastMode = '';
  let lastHint = '';
  return {
    update() {
      const role = gg.isPlaying() ? gg.role() : null;
      const ph = gg.last?.ph;
      const mode = role === 'shooter' || role === 'keeper' ? role : role ? 'wait' : 'free';
      if (mode !== lastMode) {
        lastMode = mode;
        actions.dataset.mode = mode;
        closeEmotes();
        if (mode !== 'free') {
          for (const p of panels) $(`#${p}`).hidden = true;
          game.bubbles.items = []; // limpa a tela para a partida
        }
      }
      // durante partidas a barra do Gol a Gol ocupa mais espaço no topo
      const landscape = window.innerWidth > window.innerHeight;
      game.bubbleTop = gg.match && !landscape ? 150 : 64;
      rotate.hidden = !(mode !== 'free' && window.innerHeight > window.innerWidth);
      let h = '';
      if (mode === 'shooter') {
        h = ph === 'aim' ? 'Toque no campo p/ mirar · segure ⚽ e solte na ⭐' : '';
        const c = gg.curve;
        ui.querySelectorAll('.m-curve').forEach((b) => b.classList.toggle('active', (Number(b.dataset.d) < 0 && c < 0) || (Number(b.dataset.d) > 0 && c > 0)));
        kick.classList.toggle('ready', ph === 'aim');
      } else if (mode === 'keeper') {
        h = 'Joystick move o goleiro · 🧤 mergulha';
      } else if (mode === 'wait') {
        h = 'Prepare-se...';
      }
      if (h !== lastHint) {
        lastHint = h;
        hint.textContent = h;
        hint.hidden = !h;
      }
    },
  };
}
