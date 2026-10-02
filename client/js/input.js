// Mouse/toque (clicar para andar/interagir) e teclado (WASD/setas, 1-5 emotes, Enter chat).
// Durante uma partida de Gol a Gol os controles vão para o minigame (game.gg).

import { EMOTES, MSG } from '/shared/constants.js';

const KEY_DIRS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};
const EMOTE_BY_KEY = Object.fromEntries(Object.entries(EMOTES).map(([id, e]) => [e.key, id]));

export function setupInput(game, hud, canvas) {
  const held = new Set();
  const gg = game.gg;
  const kt = game.kt;

  canvas.addEventListener('pointermove', (ev) => {
    if (kt.active()) {
      canvas.style.cursor = 'default';
      hud.tooltip(null);
      return;
    }
    const w = game.screenToWorld(ev.clientX, ev.clientY);
    if (gg.pointerMove(w)) {
      game.world.hover = null;
      canvas.style.cursor = 'crosshair';
      hud.tooltip(null);
      return;
    }
    const hit = game.hitTest(w.x, w.y);
    game.world.hover = hit?.id ?? null;
    canvas.style.cursor = hit ? 'pointer' : 'default';
    if (ev.pointerType === 'mouse') hud.tooltip(hit?.label, ev.clientX, ev.clientY);
  });
  canvas.addEventListener('pointerleave', () => {
    game.world.hover = null;
    hud.tooltip(null);
  });

  canvas.addEventListener('pointerdown', (ev) => {
    if (kt.active()) {
      hud.blurChat();
      kt.pointerDown(ev);
      return;
    }
    if (ev.button !== 0) return;
    hud.blurChat();
    hud.closePlayerCard();
    const w = game.screenToWorld(ev.clientX, ev.clientY);
    if (gg.isPlaying()) {
      gg.pointerMove(w);
      gg.pointerDown(w, performance.now(), ev.pointerType);
      return;
    }
    const hit = game.hitTest(w.x, w.y);
    if (hit) game.interact(hit);
    else game.moveTo(w.x, w.y);
  });
  window.addEventListener('pointerup', () => gg.pointerUp(performance.now()));
  canvas.addEventListener('contextmenu', (ev) => { if (kt.active()) ev.preventDefault(); });
  canvas.addEventListener('wheel', (ev) => {
    if (gg.isPlaying() && gg.wheel(ev)) ev.preventDefault();
  }, { passive: false });

  window.addEventListener('keydown', (ev) => {
    if (hud.chatFocused()) {
      if (ev.key === 'Escape') hud.blurChat();
      return;
    }
    if (ev.target instanceof HTMLInputElement) return;
    if (ev.key === 'Escape') hud.closePlayerCard();
    if (ev.key === 'Enter') {
      ev.preventDefault();
      hud.focusChat();
      return;
    }
    if (kt.key(ev, true, performance.now())) {
      ev.preventDefault();
      return;
    }
    if (gg.key(ev, true, performance.now())) {
      ev.preventDefault();
      return;
    }
    if (EMOTE_BY_KEY[ev.key]) {
      game.emote(EMOTE_BY_KEY[ev.key]);
      return;
    }
    if (KEY_DIRS[ev.code]) {
      ev.preventDefault();
      held.add(ev.code);
      steer();
    }
  });
  window.addEventListener('keyup', (ev) => {
    held.delete(ev.code);
    kt.key(ev, false, performance.now());
    gg.key(ev, false, performance.now());
  });
  window.addEventListener('blur', () => {
    held.clear();
    gg.held.clear();
    kt.clearKeys();
  });

  // enquanto segura uma direção, manda um destino curto à frente
  function steer() {
    if (!held.size || gg.isPlaying() || kt.active()) return;
    const me = game.myServerPos();
    if (!me) return;
    let dx = 0;
    let dy = 0;
    for (const code of held) {
      dx += KEY_DIRS[code][0];
      dy += KEY_DIRS[code][1];
    }
    if (!dx && !dy) return;
    const n = Math.hypot(dx, dy);
    game.send({ t: MSG.MOVE, x: Math.round(me.x + (dx / n) * 70), y: Math.round(me.y + (dy / n) * 70) });
    game.dest = null;
  }
  setInterval(steer, 140);
}
