// Bootstrap do cliente: tela de login (nick + visual) -> conexão -> jogo.

import { PALETTE, MSG, PROTOCOL_VERSION } from '/shared/constants.js';
import { sanitizeNick } from '/shared/validation.js';
import { drawCharacter } from './render/character.js';
import { connect } from './net.js';
import { Game } from './game.js';
import { Hud } from './hud.js';
import { setupInput } from './input.js';
import { unlockAudio } from './audio.js';
import { detectMobile, setupMobile } from './mobile.js';

// precisa vir antes de criar o Game (zoom da câmera depende disso)
const IS_MOBILE = detectMobile();
document.body.classList.toggle('mobile', IS_MOBILE);

const $ = (sel) => document.querySelector(sel);
const STORE_KEY = 'np.profile';

function loadProfile() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function saveProfile(p) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch { /* sem storage */ }
}

// sinal para o "vigia" do index.html: o jogo carregou
window.__npBoot = true;
try { sessionStorage.removeItem('np.bootTries'); } catch { /* sem storage */ }

const saved = loadProfile();
const AUTO_KEY = 'np.autologin';
const AUTO_MAX = 8;
let autoTry = 0;
try {
  autoTry = Number(sessionStorage.getItem(AUTO_KEY)) || 0;
  sessionStorage.removeItem(AUTO_KEY);
} catch { /* sem storage */ }
const rand = (list) => list[Math.floor(Math.random() * list.length)];
const look = {
  hat: PALETTE.hats.includes(saved.look?.hat) ? saved.look.hat : rand(PALETTE.hats),
  shirt: PALETTE.shirts.includes(saved.look?.shirt) ? saved.look.shirt : rand(PALETTE.shirts),
  skin: PALETTE.skins.includes(saved.look?.skin) ? saved.look.skin : PALETTE.skins[0],
};

// ---------- tela de login ----------

const nickInput = $('#nick');
nickInput.value = saved.nick || '';

for (const kind of ['hat', 'shirt', 'skin']) {
  const box = $(`#swatches-${kind}`);
  for (const color of PALETTE[`${kind}s`]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.background = color;
    b.title = color;
    b.setAttribute('aria-label', `${kind} ${color}`);
    if (look[kind] === color) b.classList.add('on');
    b.addEventListener('click', () => {
      look[kind] = color;
      box.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('on', s === b));
    });
    box.appendChild(b);
  }
}

const preview = $('#preview');
const pctx = preview.getContext('2d');
let previewOn = true;
let wavedAt = 0;
preview.addEventListener('click', () => { wavedAt = performance.now(); });
(function previewLoop(now) {
  if (!previewOn) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (preview.width !== 160 * dpr) {
    preview.width = 160 * dpr;
    preview.height = 170 * dpr;
  }
  pctx.setTransform(dpr * 1.45, 0, 0, dpr * 1.45, 0, 0);
  pctx.clearRect(0, 0, 200, 200);
  const et = (now - wavedAt) / 1000;
  drawCharacter(pctx, { id: 1, look }, {
    x: 55, y: 112, dir: 1, moving: false, phase: 0, pose: '',
    emote: et < 1.6 ? 'wave' : null, emoteT: et, talking: et < 1.2, t: now / 1000,
  });
  requestAnimationFrame(previewLoop);
})(performance.now());

// ---------- conexão e jogo ----------

const hud = new Hud({
  onChat: (text) => game.chat(text),
  onEmote: (e) => game.emote(e),
});
const canvas = $('#game');
const game = new Game(canvas, hud);
let started = false;
// debug no console (e nos testes E2E): localhost ou ?debug=1
const DEBUG = location.hostname === 'localhost' || new URLSearchParams(location.search).has('debug');
if (DEBUG) window.__game = game;

$('#login-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const nick = sanitizeNick(nickInput.value);
  const err = $('#login-error');
  if (!nick) {
    err.textContent = 'Nick precisa ter 2 a 16 caracteres (letras, números, _ - .)';
    return;
  }
  err.textContent = '';
  saveProfile({ nick, look });
  unlockAudio();
  const btn = $('#login-btn');
  btn.disabled = true;
  btn.textContent = 'Conectando...';

  const net = connect({
    onOpen: () => net.send({ t: MSG.HELLO, v: PROTOCOL_VERSION, nick, look }),
    onMessage: (msg) => {
      if (msg.t === MSG.ERROR && msg.fatal) {
        err.textContent = msg.msg;
        btn.disabled = false;
        btn.textContent = 'Entrar na praça!';
        return;
      }
      if (msg.t === MSG.WELCOME && !started) start();
      game.onMessage(msg);
    },
    onClose: () => {
      if (started) showDisconnected();
      else {
        btn.disabled = false;
        btn.textContent = 'Entrar na praça!';
        if (!err.textContent) err.textContent = 'Não foi possível conectar ao servidor.';
        // reconexão automática que falhou (servidor reiniciando/sem rede): tenta de novo
        if (autoTry && autoTry < AUTO_MAX) {
          err.textContent = `Servidor fora do ar... tentando de novo (${autoTry}/${AUTO_MAX})`;
          setTimeout(() => reconnect(autoTry + 1), 3000);
        }
      }
    },
  });
  game.attach(net);
});

function start() {
  started = true;
  previewOn = false;
  $('#login').hidden = true;
  hud.show();
  hud.log(null, IS_MOBILE
    ? 'Bem-vindo! Use o joystick ou toque no chão para andar. Toque nas coisas e nos players!'
    : 'Bem-vindo! Clique no chão para andar, clique nas coisas para interagir.');
  setupInput(game, hud, canvas);
  // latência (ping/pong) a cada 2 s — aparece no canto da tela
  const ping = () => game.send({ t: MSG.PING, n: Math.round(performance.now()) });
  ping();
  setInterval(ping, 2000);
  const mobileUi = IS_MOBILE ? setupMobile(game, hud) : null;
  game.voice.ui.mount(); // depois do HUD mobile (o ícone 🎙️ vai na barra do topo)
  if (DEBUG) window.__voice = game.voice;
  if (DEBUG) window.__mobile = mobileUi;
  const loop = () => {
    game.frame();
    mobileUi?.update();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// ---------- reconexão ----------
// Caiu a conexão (rede do celular, deploy novo...): recarrega e entra sozinho com o
// mesmo nick/visual salvos. Se o servidor ainda não voltou, tenta algumas vezes.

function reconnect(attempt = 1) {
  try { sessionStorage.setItem(AUTO_KEY, String(attempt)); } catch { /* sem storage */ }
  location.reload();
}

function showDisconnected() {
  const box = $('#disconnected');
  if (!box.hidden) return;
  box.hidden = false;
  const p = box.querySelector('p');
  let n = 3;
  const tick = () => {
    p.textContent = `O servidor sumiu ou a internet tropeçou. Voltando em ${n}...`;
    if (n-- <= 0) reconnect();
    else setTimeout(tick, 1000);
  };
  tick();
}

$('#reconnect-btn').addEventListener('click', () => reconnect());

if (autoTry && saved.nick) {
  // entra automaticamente depois de recarregar
  setTimeout(() => $('#login-form').requestSubmit(), 150);
}
