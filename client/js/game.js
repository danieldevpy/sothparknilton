// Estado do cliente + loop de render. Recebe mensagens do servidor,
// interpola posições (snapshots) e desenha tudo no canvas.

import { MAP, zoneAt } from '/shared/map.js';
import { MSG, EMOTES, INTERP_DELAY_MS } from '/shared/constants.js';
import { inLake, onDock } from '/shared/geometry.js';
import { drawCharacter, headTop } from './render/character.js';
import { prerenderBackground, mapSprites, duckPositions, drawBall, drawDuck, drawDestination } from './render/world.js';
import { BubbleLayer } from './render/bubbles.js';
import { FxLayer } from './render/fx.js';
import { outlinedText, roundRect, FONT } from './render/paint.js';
import { play } from './audio.js';
import { GolAGolClient } from './minigames/golagol.js';

const BUF_MAX = 12;

export class Game {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hud = hud;
    this.net = null;
    this.me = null;
    this.players = new Map();
    this.ball = { buf: [] };
    this.world = { lamps: {}, score: { red: 0, blue: 0 }, hover: null };
    this.bubbles = new BubbleLayer();
    this.fx = new FxLayer();
    this.duckHop = new Map(); // índice do pato -> momento do pulo
    this.dest = null;
    this.cam = { x: 0, y: 0, z: 1, baseZ: 1, ready: false };
    this.shakeAmp = 0;
    this.shakeAt = 0;
    this.gg = new GolAGolClient(this, hud);
    this.bg = prerenderBackground(MAP);
    this.sprites = mapSprites(MAP, this.world);
    this.zone = null;
    this.flakes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 1 + Math.random() * 2.5, v: 0.03 + Math.random() * 0.05 }));
    this.last = performance.now();
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  // ---------- rede ----------

  attach(net) {
    this.net = net;
  }

  onMessage(msg) {
    const now = performance.now();
    if (this.gg.onMessage(msg, now)) return;
    switch (msg.t) {
      case MSG.WELCOME:
        this.me = msg.you;
        this.players.clear();
        for (const p of msg.players) this.addPlayer(p, now);
        this.world.lamps = msg.lamps;
        Object.assign(this.world.score, msg.score);
        this.ball.buf = msg.ball ? [{ at: now, x: msg.ball[0], y: msg.ball[1] }] : [];
        if (msg.match) this.gg.start(msg.match, true, now);
        this.hud.setOnline([...this.players.values()], this.me);
        this.hud.setScore(this.world.score);
        break;
      case MSG.JOIN:
        this.addPlayer(msg.player, now);
        this.hud.setOnline([...this.players.values()], this.me);
        this.hud.log(null, `${msg.player.nick} chegou na praça`);
        play('join');
        break;
      case MSG.LEAVE: {
        const p = this.players.get(msg.id);
        this.players.delete(msg.id);
        this.hud.setOnline([...this.players.values()], this.me);
        if (p) this.hud.log(null, `${p.nick} saiu`);
        break;
      }
      case MSG.SNAP:
        for (const [id, x, y, dir, moving, pose] of msg.p) {
          const p = this.players.get(id);
          if (!p) continue;
          p.buf.push({ at: now, x, y, dir, moving, pose });
          if (p.buf.length > BUF_MAX) p.buf.shift();
        }
        if (!msg.b) this.ball.buf = []; // bola livre escondida durante o Gol a Gol
        else {
          this.ball.buf.push({ at: now, x: msg.b[0], y: msg.b[1] });
          if (this.ball.buf.length > BUF_MAX) this.ball.buf.shift();
        }
        break;
      case MSG.CHAT:
        this.onChat(msg, now);
        break;
      case MSG.EMOTE:
        this.onEmote(msg, now);
        break;
      case MSG.FX:
        this.onFx(msg, now);
        break;
      case MSG.OBJ:
        this.world.lamps[msg.id] = msg.on;
        play('lamp');
        break;
      case MSG.GOAL: {
        Object.assign(this.world.score, msg.score);
        this.hud.setScore(this.world.score);
        const f = MAP.field;
        const gx = msg.side === 'blue' ? f.x : f.x + f.w;
        this.fx.add('confetti', { x: gx, y: f.y + f.h / 2 }, now);
        this.hud.banner(`GOOOOL ${msg.side === 'red' ? 'VERMELHO' : 'AZUL'}!`, msg.by ? `chute de ${msg.by}` : '');
        play('goal');
        break;
      }
      case MSG.ERROR:
        this.hud.toast(msg.msg);
        break;
      default:
        break;
    }
  }

  addPlayer(p, now) {
    this.players.set(p.id, {
      id: p.id,
      nick: p.nick,
      look: p.look,
      buf: [{ at: now, x: p.x, y: p.y, dir: p.dir, moving: 0, pose: p.pose }],
      r: { x: p.x, y: p.y, dir: p.dir, moving: false, pose: p.pose },
      phase: 0,
      emote: null,
      emoteAt: 0,
      talkUntil: 0,
    });
  }

  onChat(msg, now) {
    const p = this.players.get(msg.id);
    if (!p) return;
    p.talkUntil = now + Math.min(3000, 400 + msg.text.length * 55);
    this.hud.log(p.nick, msg.text, msg.id === this.me);
    play('chat');
    // celular jogando: só balões dos dois jogadores (a plateia fica no chat)
    if (this.compactBubbles && this.gg.isPlaying() && !this.gg.inMatch(msg.id)) return;
    const sy = (p.r.y + headTop(p.r.pose) - 26 - this.cam.y) * this.cam.z;
    this.bubbles.add(this.ctx, { nick: p.nick, text: msg.text, color: p.look.shirt, hat: p.look.hat }, p.r.x, Math.max((this.bubbleTop || 0) + 40, sy), now);
  }

  onEmote(msg, now) {
    const p = this.players.get(msg.id);
    if (!p) return;
    p.emote = msg.e;
    p.emoteAt = now;
    const at = { x: p.r.x, y: p.r.y, dir: p.r.dir };
    if (msg.e === 'fart') { this.fx.add('fart', at, now); play('fart'); }
    if (msg.e === 'dance') this.fx.add('notes', at, now);
    if (msg.e === 'jump') { this.fx.add('boing', at, now); play('boing'); }
    if (msg.e === 'wave') this.fx.add('text', { x: p.r.x, y: p.r.y - 100, text: 'oi!', color: '#ffe36b' }, now);
  }

  onFx(msg, now) {
    const p = this.players.get(msg.id);
    if (msg.kind === 'coin' && p) {
      this.fx.add('coin', { x: msg.x, y: msg.y, fx: p.r.x, fy: p.r.y }, now);
      setTimeout(() => play('coin'), 600);
    } else if (msg.kind === 'splash') {
      this.fx.add('splash', { x: msg.x, y: msg.y, fx: msg.fx, fy: msg.fy }, now);
      setTimeout(() => play('splash'), 600);
    } else if (msg.kind === 'quack') {
      this.fx.add('quack', { x: msg.x, y: msg.y }, now);
      let best = null;
      for (const d of duckPositions(now / 1000)) {
        const dd = Math.hypot(d.x - msg.x, d.y - msg.y);
        if (!best || dd < best.dd) best = { i: d.i, dd };
      }
      if (best) this.duckHop.set(best.i, now);
      play('quack');
    }
  }

  // ---------- ações do jogador local ----------

  send(obj) {
    this.net?.send(obj);
  }

  moveTo(x, y) {
    this.send({ t: MSG.MOVE, x: Math.round(x), y: Math.round(y) });
    this.dest = { x, y, at: performance.now() };
  }

  interact(hit) {
    if (hit.id === 'player') {
      const p = this.players.get(hit.pid);
      if (!p) return;
      const sx = (p.r.x - this.cam.x) * this.cam.z;
      const sy = (p.r.y - 60 - this.cam.y) * this.cam.z;
      this.hud.playerCard(p, sx, sy, {
        busy: this.gg.inMatch(p.id) || this.gg.isPlaying(),
        onChallenge: () => this.gg.challenge(p.id),
        onWave: () => this.emote('wave'),
      });
      play('click');
      return;
    }
    this.send({ t: MSG.INTERACT, id: hit.id, x: hit.x, y: hit.y });
    if (hit.id !== 'duck') this.dest = { x: hit.x ?? hit.mx, y: hit.y ?? hit.my, at: performance.now() };
    play('click');
  }

  emote(e) {
    if (EMOTES[e]) this.send({ t: MSG.EMOTE, e });
  }

  chat(text) {
    this.send({ t: MSG.CHAT, text });
  }

  // última posição confirmada pelo servidor (mais recente que a renderizada)
  myServerPos() {
    const p = this.players.get(this.me);
    return p ? p.buf[p.buf.length - 1] : null;
  }

  myPos() {
    const p = this.players.get(this.me);
    return p ? p.r : null;
  }

  // O que está sob o ponteiro (coordenadas de mundo)?
  hitTest(wx, wy) {
    const t = performance.now() / 1000;
    let best = null;
    for (const p of this.players.values()) {
      if (p.id === this.me) continue;
      if (Math.abs(wx - p.r.x) < 24 && wy > p.r.y - 95 && wy < p.r.y + 8 && (!best || p.r.y > best.r.y)) best = p;
    }
    if (best) {
      const playing = this.gg.inMatch(best.id);
      return { id: 'player', pid: best.id, label: playing ? `${best.nick} — jogando Gol a Gol` : `${best.nick} — clique para desafiar ⚽` };
    }
    for (const d of duckPositions(t)) {
      if (Math.hypot(wx - d.x, wy - (d.y - 10)) < 24) return { id: 'duck', label: 'Pato — quack!', x: Math.round(d.x), y: Math.round(d.y) };
    }
    const b = this.ballPos();
    if (b && Math.hypot(wx - b.x, wy - (b.y - 11)) < 22) return { id: 'ball', label: 'Bola — chutar', mx: b.x, my: b.y };
    for (const l of MAP.lamps) {
      if (Math.abs(wx - l.x) < 18 && wy > l.y - 122 && wy < l.y + 6) return { id: l.id, label: 'Poste — ligar/desligar', mx: l.x, my: l.y + 26 };
    }
    for (const bn of MAP.benches) {
      if (Math.abs(wx - bn.x) < 60 && wy > bn.y - 50 && wy < bn.y + 10) return { id: bn.id, label: 'Banco — sentar', mx: bn.x, my: bn.y + 30 };
    }
    const f = MAP.fountain;
    if (((wx - f.x) / 95) ** 2 + ((wy - (f.y - 20)) / 80) ** 2 <= 1) return { id: 'fountain', label: 'Fonte — jogar moeda', mx: f.interact.x, my: f.interact.y };
    if (inLake(wx, wy) && !onDock(wx, wy)) return { id: 'lake', label: 'Lago — jogar pedra', x: Math.round(wx), y: Math.round(wy) };
    return null;
  }

  // ---------- câmera ----------

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    this.canvas.width = Math.round(this.vw * dpr);
    this.canvas.height = Math.round(this.vh * dpr);
    this.canvas.style.width = `${this.vw}px`;
    this.canvas.style.height = `${this.vh}px`;
    // celular em pé: zoom maior para os bonecos não ficarem minúsculos
    const mobile = document.body.classList.contains('mobile');
    const minZ = mobile ? 0.72 : this.vw < 700 ? 0.7 : 0.5;
    this.cam.baseZ = Math.max(minZ, Math.min(1.35, Math.min(this.vw / 1150, this.vh / 760)));
    if (!this.cam.ready) this.cam.z = this.cam.baseZ;
  }

  screenToWorld(sx, sy) {
    return { x: sx / this.cam.z + this.cam.x, y: sy / this.cam.z + this.cam.y };
  }

  updateCamera(dt) {
    const me = this.myPos();
    if (!me) return;
    // durante o Gol a Gol a câmera enquadra o campinho
    const focus = this.gg.cameraTarget(this.vw, this.vh);
    const tz = focus ? focus.z : this.cam.baseZ;
    this.cam.z += (tz - this.cam.z) * Math.min(1, dt * 4);
    const z = this.cam.z;
    const vw = this.vw / z;
    const vh = this.vh / z;
    const fx = focus ? focus.x : me.x;
    const fy = focus ? focus.y : me.y - 40;
    let tx = fx - vw / 2;
    let ty = fy - vh / 2;
    // durante a partida não prende na borda do mapa: o campo fica centralizado
    // (senão o gol da direita some atrás dos botões no celular deitado)
    if (!focus) {
      tx = vw >= MAP.width ? (MAP.width - vw) / 2 : Math.max(0, Math.min(MAP.width - vw, tx));
      ty = vh >= MAP.height ? (MAP.height - vh) / 2 : Math.max(0, Math.min(MAP.height - vh, ty));
    }
    if (!this.cam.ready) {
      this.cam.x = tx;
      this.cam.y = ty;
      this.cam.ready = true;
    }
    const k = Math.min(1, dt * 5);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
  }

  // ---------- interpolação ----------

  sample(buf, at) {
    if (!buf.length) return null;
    if (at <= buf[0].at) return buf[0];
    for (let i = buf.length - 1; i > 0; i--) {
      const a = buf[i - 1];
      const b = buf[i];
      if (at >= a.at && at <= b.at) {
        const k = (at - a.at) / Math.max(1, b.at - a.at);
        return { ...b, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, moving: b.moving || a.moving };
      }
    }
    return buf[buf.length - 1];
  }

  ballPos() {
    return this.sample(this.ball.buf, performance.now() - INTERP_DELAY_MS);
  }

  // ---------- loop ----------

  frame() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (window.innerWidth !== this.vw || window.innerHeight !== this.vh) this.resize();
    const t = now / 1000;
    const renderAt = now - INTERP_DELAY_MS;

    for (const p of this.players.values()) {
      const s = this.sample(p.buf, renderAt);
      // o último snapshot diz se ainda está andando (evita "piscar" parado entre amostras)
      const latest = p.buf[p.buf.length - 1];
      p.r = this.gg.avatarOverride(p, now) || { x: s.x, y: s.y, dir: s.dir, moving: !!(s.moving && latest.moving), pose: s.pose };
      if (p.r.moving) p.phase += dt * 14;
      if (p.emote) {
        const dur = EMOTES[p.emote].duration;
        const age = now - p.emoteAt;
        const cancelByMove = p.r.moving && (p.emote === 'dance' || p.emote === 'sit');
        if ((dur && age > dur) || cancelByMove || (p.emote === 'sit' && p.r.pose !== 'sit' && age > 400)) p.emote = null;
      }
    }

    this.gg.update(dt, now);
    this.updateCamera(dt);
    this.updateZone();
    this.bubbles.update(dt, now);
    this.fx.update(now);
    this.draw(now, t);
  }

  updateZone() {
    const me = this.myPos();
    if (!me) return;
    const z = zoneAt(me.x, me.y);
    const id = z?.id ?? null;
    if (id !== this.zone) {
      this.zone = id;
      if (z) this.hud.zone(z.name);
    }
  }

  draw(now, t) {
    const { ctx, dpr, cam } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#f3f6fb'; // neve além da borda do mapa
    ctx.fillRect(0, 0, this.vw, this.vh);

    const z = cam.z * dpr;
    const sk = this.shakeAmp * Math.max(0, 1 - (now - this.shakeAt) / 500);
    const ox = sk ? (Math.random() - 0.5) * sk * 2 : 0;
    const oy = sk ? (Math.random() - 0.5) * sk * 2 : 0;
    ctx.setTransform(z, 0, 0, z, (-cam.x + ox) * z, (-cam.y + oy) * z);
    ctx.drawImage(this.bg, 0, 0);

    if (this.dest) drawDestination(ctx, this.dest.x, this.dest.y, (now - this.dest.at) / 1000);

    for (const d of duckPositions(t)) {
      const hopAt = this.duckHop.get(d.i);
      drawDuck(ctx, d, t, hopAt ? (now - hopAt) / 600 : 0);
    }

    // y-sort: objetos do mapa + players + bola
    const list = [...this.sprites];
    for (const p of this.players.values()) {
      list.push({ y: p.r.y, draw: () => this.drawPlayer(p, now, t) });
    }
    const b = this.ballPos();
    if (b) list.push({ y: b.y, draw: () => drawBall(ctx, b.x, b.y, t, this.world.hover === 'ball') });
    const ggBall = this.gg.ballSprite(now, t);
    if (ggBall) list.push(ggBall);
    list.sort((a, c) => a.y - c.y);
    for (const s of list) s.draw(ctx, t);

    this.gg.drawOverlay(ctx, now);
    this.fx.draw(ctx, now);
    for (const p of this.players.values()) this.drawNick(p);

    // camada de tela
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawSnow(now);
    // no celular os balões não invadem a barra de ícones do topo
    const top = this.bubbleTop || 0;
    ctx.save();
    if (top) {
      ctx.beginPath();
      ctx.rect(0, top, this.vw, this.vh - top);
      ctx.clip();
    }
    this.bubbles.draw(ctx, (wx) => (wx - cam.x) * cam.z, this.vw, now);
    ctx.restore();
  }

  drawPlayer(p, now) {
    const emoteT = p.emote ? (now - p.emoteAt) / 1000 : 0;
    let pose = p.r.pose;
    if (!pose && p.emote === 'sit') pose = 'sit';
    drawCharacter(this.ctx, p, {
      x: p.r.x,
      y: p.r.y,
      dir: p.r.dir,
      moving: p.r.moving,
      phase: p.phase,
      pose,
      emote: p.emote === 'sit' ? null : p.emote,
      emoteT,
      talking: now < p.talkUntil,
      k: p.r.k,
      t: now / 1000,
    });
  }

  shake(amount, now) {
    this.shakeAmp = amount;
    this.shakeAt = now;
  }

  drawNick(p) {
    const { ctx } = this;
    const y = p.r.y + headTop(p.r.pose) - 14;
    ctx.font = `700 13px ${FONT}`;
    const w = ctx.measureText(p.nick).width + 14;
    roundRect(ctx, p.r.x - w / 2, y - 10, w, 20, 8);
    ctx.fillStyle = 'rgba(20,20,30,0.55)';
    ctx.fill();
    outlinedText(ctx, p.nick, p.r.x, y, { size: 13, fill: p.id === this.me ? '#ffe14d' : '#ffffff', lw: 3 });
  }

  drawSnow(now) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const f of this.flakes) {
      const y = ((f.y + (now / 1000) * f.v) % 1) * this.vh;
      const x = ((f.x + Math.sin(now / 1500 + f.y * 10) * 0.01) % 1) * this.vw;
      ctx.beginPath();
      ctx.arc(x, y, f.s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
