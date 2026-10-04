// Sala de jogo autoritativa. Não conhece WebSocket: cada player recebe uma
// função `send(string)`. Isso deixa a lógica testável sem rede (tests/room.test.js).

import {
  MSG, GAMES, PROTOCOL_VERSION, PLAYER_SPEED, PLAYER_RADIUS, MAX_PLAYERS, CHAT_COOLDOWN_MS, EMOTES,
  BALL_RADIUS, BALL_KICK_SPEED, BALL_FRICTION, GOAL_RESET_MS,
} from '../shared/constants.js';
import { MAP, benchSeats } from '../shared/map.js';
import { isWalkable, inLake, dist } from '../shared/geometry.js';
import { PathGrid } from '../shared/pathfinding.js';
import { GG } from '../shared/golagol.js';
import { ARENA } from '../shared/arena.js';
import { GolAGol } from './minigames/GolAGol.js';
import { KarateFight } from './minigames/Karate.js';
import { QueimadaMatch } from './minigames/Queimada.js';
import { QuizMatch } from './minigames/Quiz.js';
import { themeList } from './quiz/themes.js';
import { VoiceHub } from './VoiceHub.js';
import { sanitizeNick, sanitizeChat, sanitizeLook } from '../shared/validation.js';

const ARRIVE_TOLERANCE = 40; // px: distância máxima para executar a interação pendente
const FX_COOLDOWN_MS = 300;

export class Room {
  constructor({ map = MAP, now = () => Date.now(), random = Math.random, voice = {} } = {}) {
    this.map = map;
    this.now = now;
    this.random = random;
    this.grid = new PathGrid(map);
    this.players = new Map();
    this.nextId = 1;
    this.seats = new Map(benchSeats(map).map((s) => [s.id, { ...s, by: null }]));
    this.lamps = Object.fromEntries(map.lamps.map((l) => [l.id, true]));
    this.score = { red: 0, blue: 0 }; // gol esquerdo é do time vermelho
    this.ball = { x: 0, y: 0, vx: 0, vy: 0, resetAt: 0, lastKicker: null, hidden: false };
    this.resetBall();
    this.match = null; // partida de Gol a Gol em andamento (uma por vez no campinho)
    this.invites = new Map(); // `${from}>${to}` -> { from, to, at, rematch, game }
    this.watching = new Map(); // playerId -> luta de Karatê que está assistindo (plateia do Dojo)
    this.fights = new Map(); // lutas de Karatê (várias ao mesmo tempo: cada uma no seu dojo)
    this.fightOf = new Map(); // playerId -> luta
    this.nextFightId = 1;
    this.qms = new Map(); // partidas de Queimada (quadras do Ginásio, várias ao mesmo tempo)
    this.qmOf = new Map(); // playerId -> partida de Queimada (na quadra, no cemitério ou na fila)
    this.nextQmId = 1;
    this.qzs = new Map(); // salas da Corrida das Perguntas (Escola, várias ao mesmo tempo)
    this.qzOf = new Map(); // playerId -> sala (correndo ou na plateia)
    this.nextQzId = 1;
    this.voice = new VoiceHub(this, voice); // chat de voz por grupos (server/VoiceHub.js)
  }

  // ---------- ciclo de vida de players ----------

  addPlayer(hello, send) {
    if (this.players.size >= MAX_PLAYERS) return { error: 'Sala cheia, tente mais tarde.' };
    const base = sanitizeNick(hello?.nick);
    if (!base) return { error: 'Nick inválido (2-16 letras/números).' };

    const p = {
      id: this.nextId++,
      nick: this.uniqueNick(base),
      look: sanitizeLook(hello.look),
      ...this.spawnPoint(),
      dir: 1,
      path: [],
      pending: null,
      pose: '',
      seat: null,
      moving: false,
      vx: 0,
      vy: 0,
      lastChat: 0,
      lastFx: 0,
      lastKick: 0,
      send,
    };
    this.players.set(p.id, p);

    p.send(JSON.stringify({
      t: MSG.WELCOME,
      v: PROTOCOL_VERSION,
      you: p.id,
      map: this.map.id,
      players: [...this.players.values()].map((pl) => publicPlayer(pl, this.voice.tagOf(pl.id))),
      lamps: this.lamps,
      score: this.score,
      ball: this.ballPublic(),
      match: this.match ? this.match.publicInfo() : null,
      fights: [...this.fights.values()].map((f) => f.publicInfo()),
      qms: [...this.qms.values()].map((m) => m.publicInfo()),
      qzs: [...this.qzs.values()].map((z) => z.publicInfo()),
      qzThemes: themeList(),
    }));
    this.broadcast({ t: MSG.JOIN, player: publicPlayer(p, 0) }, p.id);
    return { player: p };
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.unwatch(id, 'quiet');
    this.leaveSeat(p);
    if (this.match?.has(id)) this.match.forfeit(id);
    this.fightOf.get(id)?.forfeit(id);
    this.qmLeave(id, 'quiet');
    this.qzLeave(id, 'quiet');
    this.voice.removePlayer(id);
    for (const [key, inv] of this.invites) {
      if (inv.from === id || inv.to === id) {
        this.invites.delete(key);
        const other = this.players.get(inv.from === id ? inv.to : inv.from);
        if (other) this.sendTo(other, { t: MSG.CH_STATUS, status: 'gone', with: id, nick: p.nick, game: inv.game });
      }
    }
    this.players.delete(id);
    this.broadcast({ t: MSG.LEAVE, id });
  }

  uniqueNick(base) {
    const taken = new Set([...this.players.values()].map((p) => p.nick.toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let i = 2; ; i++) {
      const n = `${base.slice(0, 13)}${i}`;
      if (!taken.has(n.toLowerCase())) return n;
    }
  }

  spawnPoint() {
    const s = this.map.spawn;
    for (let i = 0; i < 30; i++) {
      const a = this.random() * Math.PI * 2;
      const r = this.random() * s.r;
      const x = s.x + Math.cos(a) * r;
      const y = s.y + Math.sin(a) * r;
      if (isWalkable(x, y)) return { x, y };
    }
    return { x: s.x, y: s.y };
  }

  // ---------- mensagens do cliente ----------

  handle(id, msg) {
    const p = this.players.get(id);
    if (!p || !msg || typeof msg.t !== 'string') return;
    // voz funciona em qualquer lugar (praça, Gol a Gol, dojo)
    if (msg.t.startsWith('vc_')) {
      this.voice.handle(p, msg);
      return;
    }
    const inMatch = !!this.match?.has(id);
    const busy = this.isBusy(id); // jogando Gol a Gol ou lutando no dojo
    switch (msg.t) {
      case MSG.MOVE:
        if (!busy && isNum(msg.x) && isNum(msg.y)) this.walkTo(p, msg.x, msg.y, null);
        break;
      case MSG.CHALLENGE:
        this.onChallenge(p, msg);
        break;
      case MSG.CHALLENGE_REPLY:
        this.onChallengeReply(p, msg);
        break;
      case MSG.GG_INPUT:
      case MSG.GG_SHOOT:
        if (inMatch) this.match.handle(p, msg);
        break;
      case MSG.KT_INPUT:
      case MSG.KT_ACT:
        this.fightOf.get(id)?.handle(p, msg); // espectador não está em fightOf: ignorado
        break;
      case MSG.KT_WATCH:
        this.watchFight(p, msg.id);
        break;
      case MSG.KT_UNWATCH:
        this.unwatch(id, 'left');
        break;
      case MSG.KT_CHEER:
        this.watching.get(id)?.cheer(p, msg);
        break;
      case MSG.QM_CREATE:
        this.qmCreate(p, msg);
        break;
      case MSG.QM_JOIN:
        this.qmJoin(p, msg.id);
        break;
      case MSG.QM_LEAVE:
        this.qmLeave(id, 'left');
        break;
      case MSG.QM_INPUT:
      case MSG.QM_ACT:
        this.qmOf.get(id)?.handle(p, msg); // quem não está na partida: ignorado
        break;
      case MSG.QZ_CREATE:
        this.qzCreate(p, msg);
        break;
      case MSG.QZ_JOIN:
        this.qzJoin(p, msg.id, msg.as === 'watch' ? 'watch' : 'play');
        break;
      case MSG.QZ_LEAVE:
        this.qzLeave(id, 'left');
        break;
      case MSG.QZ_ANSWER:
      case MSG.QZ_CARD:
      case MSG.QZ_CHEER:
      case MSG.QZ_BOT:
      case MSG.QZ_START:
        this.qzOf.get(id)?.handle(p, msg); // quem não está numa sala: ignorado
        break;
      case MSG.CHAT:
        this.onChat(p, msg.text);
        break;
      case MSG.PING:
        if (isNum(msg.n)) this.sendTo(p, { t: MSG.PONG, n: msg.n });
        break;
      case MSG.EMOTE:
        this.onEmote(p, msg.e);
        break;
      case MSG.INTERACT:
        if (!busy) this.onInteract(p, msg);
        break;
      default:
        break;
    }
  }

  // ---------- desafios (Gol a Gol / Karatê) ----------

  // jogando, lutando, na plateia do dojo, numa quadra de Queimada ou numa sala da Escola (fora da praça)
  isBusy(id) {
    return !!this.match?.has(id) || this.fightOf.has(id) || this.watching.has(id) || this.qmOf.has(id) || this.qzOf.has(id);
  }

  // ocupado com algo que não seja uma partida de Queimada (quem está numa quadra pode convidar)
  busyBeyondQm(id) {
    return !!this.match?.has(id) || this.fightOf.has(id) || this.watching.has(id) || this.qzOf.has(id);
  }

  // idem para a Corrida das Perguntas (de dentro da sala dá para chamar gente)
  busyBeyondQz(id) {
    return !!this.match?.has(id) || this.fightOf.has(id) || this.watching.has(id) || this.qmOf.has(id);
  }

  onChallenge(p, msg) {
    const target = this.players.get(msg.to);
    const game = GAMES.includes(msg.game) ? msg.game : 'golagol';
    const status = (s, extra = {}) => this.sendTo(p, { t: MSG.CH_STATUS, status: s, with: msg.to, nick: target?.nick, game, ...extra });
    if (!target || target.id === p.id) return status('invalid');
    // Queimada / Corrida das Perguntas: quem já está numa quadra/sala chama gente para ela (vários convites)
    const qm = game === 'queimada' ? this.qmOf.get(p.id) : null;
    const qz = game === 'quiz' ? this.qzOf.get(p.id) : null;
    const meBusy = game === 'queimada' ? this.busyBeyondQm(p.id) : game === 'quiz' ? this.busyBeyondQz(p.id) : this.isBusy(p.id);
    if (meBusy || this.isBusy(target.id)) return status('busy');
    if (qm?.full()) return status('full');
    const now = this.now();
    // um convite pendente por desafiante: o novo substitui o antigo (Queimada/quiz: só o mesmo alvo)
    const many = game === 'queimada' || game === 'quiz';
    for (const [key, inv] of this.invites) if (inv.from === p.id && (!many || inv.to === target.id)) this.invites.delete(key);
    // se o alvo já tinha me desafiado para o mesmo jogo, isso vira um "aceite"
    const reverse = this.invites.get(`${target.id}>${p.id}`);
    if (reverse && reverse.game === game) {
      this.onChallengeReply(p, { from: target.id, accept: true });
      return undefined;
    }
    this.invites.set(`${p.id}>${target.id}`, { from: p.id, to: target.id, at: now, rematch: !!msg.rematch, game });
    const extra = game === 'queimada' ? { match: qm?.id || 0, hard: qm?.hard ? 1 : 0, n: qm?.size() || 0 }
      : game === 'quiz' ? { match: qz?.id || 0, mode: qz?.mode || 'normal', n: qz?.size() || 0 } : {};
    this.sendTo(target, { t: MSG.CHALLENGE, from: p.id, nick: p.nick, rematch: !!msg.rematch, ttl: GG.INVITE_TTL_MS, game, ...extra });
    return status('sent');
  }

  onChallengeReply(p, msg) {
    const key = `${msg.from}>${p.id}`;
    const inv = this.invites.get(key);
    const from = this.players.get(msg.from);
    if (!inv || !from) {
      this.sendTo(p, { t: MSG.CH_STATUS, status: 'expired', with: msg.from, nick: from?.nick, game: inv?.game });
      return;
    }
    this.invites.delete(key);
    const { game } = inv;
    if (!msg.accept) {
      this.sendTo(from, { t: MSG.CH_STATUS, status: 'declined', with: p.id, nick: p.nick, game });
      return;
    }
    if (game === 'queimada') {
      this.acceptQmInvite(from, p);
      return;
    }
    if (game === 'quiz') {
      this.acceptQzInvite(from, p);
      return;
    }
    // alguém entrou em outra partida enquanto o convite esperava
    if (this.isBusy(from.id) || this.isBusy(p.id)) {
      for (const [a, b] of [[from, p], [p, from]]) this.sendTo(a, { t: MSG.CH_STATUS, status: 'busy', with: b.id, nick: b.nick, game });
      return;
    }
    if (game === 'golagol' && this.match) {
      for (const [a, b] of [[from, p], [p, from]]) this.sendTo(a, { t: MSG.CH_STATUS, status: 'field_busy', with: b.id, nick: b.nick, game });
      return;
    }
    // limpa convites pendentes dos dois
    for (const [k, i] of this.invites) {
      if ([i.from, i.to].some((id) => id === p.id || id === from.id)) this.invites.delete(k);
    }
    if (game === 'karate') this.startFight(from, p);
    else this.startMatch(from, p);
  }

  // convite de Queimada aceito: entra na partida de quem convidou (ou os dois criam uma)
  acceptQmInvite(from, p) {
    const st = (a, b, status) => this.sendTo(a, { t: MSG.CH_STATUS, status, with: b.id, nick: b.nick, game: 'queimada' });
    if (this.busyBeyondQm(from.id) || this.isBusy(p.id)) {
      st(from, p, 'busy');
      st(p, from, 'busy');
      return;
    }
    // só limpa os convites de quem aceitou (quem convidou pode ter chamado mais gente)
    for (const [k, i] of this.invites) if (i.from === p.id || i.to === p.id) this.invites.delete(k);
    let qm = this.qmOf.get(from.id);
    if (qm?.full()) {
      st(from, p, 'full');
      st(p, from, 'full');
      return;
    }
    if (!qm) {
      qm = this.newQm(false);
      this.qmEnter(from, qm);
    }
    this.qmEnter(p, qm);
  }

  // convite da Corrida das Perguntas aceito: entra (correndo) na sala de quem convidou, ou os dois abrem uma
  acceptQzInvite(from, p) {
    const st = (a, b, status) => this.sendTo(a, { t: MSG.CH_STATUS, status, with: b.id, nick: b.nick, game: 'quiz' });
    if (this.busyBeyondQz(from.id) || this.isBusy(p.id)) {
      st(from, p, 'busy');
      st(p, from, 'busy');
      return;
    }
    for (const [k, i] of this.invites) if (i.from === p.id || i.to === p.id) this.invites.delete(k);
    let qz = this.qzOf.get(from.id);
    if (!qz) {
      qz = this.newQz({});
      this.qzEnter(from, qz, 'play');
    }
    this.qzEnter(p, qz, 'play');
  }

  startMatch(a, b) {
    for (const pl of [a, b]) {
      this.unwatch(pl.id, 'busy');
      this.leaveSeat(pl);
      pl.pending = null;
      pl.path = [];
    }
    this.ball.hidden = true;
    this.match = new GolAGol(this, a, b);
  }

  endMatch(match) {
    if (this.match !== match) return;
    this.match = null;
    for (const id of match.side.keys()) {
      const pl = this.players.get(id);
      if (pl) pl.pose = '';
    }
    this.ball.hidden = false;
    this.resetBall();
  }

  startFight(a, b) {
    for (const pl of [a, b]) {
      this.unwatch(pl.id, 'busy');
      this.leaveSeat(pl);
      pl.pending = null;
      pl.path = [];
    }
    const fight = new KarateFight(this, a, b, this.nextFightId++);
    this.fights.set(fight.id, fight);
    this.fightOf.set(a.id, fight);
    this.fightOf.set(b.id, fight);
    return fight;
  }

  // lutadores voltam para a praça onde estavam
  endFight(fight) {
    if (this.fights.get(fight.id) !== fight) return;
    this.fights.delete(fight.id);
    for (const id of fight.ids) {
      this.fightOf.delete(id);
      const pl = this.players.get(id);
      if (pl) pl.pose = '';
    }
    // a plateia sai pela porta do dojo (o kt_end já avisou todo mundo)
    for (const id of fight.watchers.keys()) {
      this.watching.delete(id);
      const pl = this.players.get(id);
      if (pl) pl.pose = '';
    }
    fight.watchers.clear();
  }

  // ---------- Queimada (Ginásio) ----------

  newQm(hard) {
    const qm = new QueimadaMatch(this, this.nextQmId++, hard);
    this.qms.set(qm.id, qm);
    return qm;
  }

  qmCreate(p, msg) {
    if (this.busyBeyondQm(p.id)) return this.sendTo(p, { t: MSG.QM_EXIT, id: 0, reason: 'busy' });
    return this.qmEnter(p, this.newQm(!!msg.hard));
  }

  qmJoin(p, id) {
    const qm = this.qms.get(id);
    const refuse = (reason) => this.sendTo(p, { t: MSG.QM_EXIT, id, reason });
    if (!qm) return refuse('gone');
    if (this.qmOf.get(p.id) === qm) return undefined;
    if (this.busyBeyondQm(p.id)) return refuse('busy');
    if (qm.full()) return refuse('full');
    return this.qmEnter(p, qm);
  }

  // entra pela porta do Ginásio: ao sair, reaparece lá
  qmEnter(p, qm) {
    if (qm.full()) {
      this.sendTo(p, { t: MSG.QM_EXIT, id: qm.id, reason: 'full' });
      if (!qm.size()) this.endQm(qm);
      return;
    }
    this.unwatch(p.id, 'busy');
    if (this.qmOf.get(p.id) !== qm) this.qmLeave(p.id, 'switch');
    this.leaveSeat(p);
    const door = this.map.gym.door;
    Object.assign(p, { x: door.x, y: door.y, dir: 1, path: [], pending: null, moving: false, vx: 0, vy: 0, pose: 'queimada' });
    this.qmOf.set(p.id, qm);
    qm.add(p);
  }

  qmLeave(id, reason = 'left') {
    const qm = this.qmOf.get(id);
    if (!qm) return;
    this.qmOf.delete(id);
    const p = this.players.get(id);
    if (p) p.pose = '';
    qm.remove(id, reason);
  }

  // quadra vazia: some da lista do Ginásio
  endQm(qm) {
    if (this.qms.get(qm.id) !== qm) return;
    this.qms.delete(qm.id);
    for (const [pid, m] of this.qmOf) if (m === qm) this.qmOf.delete(pid);
    this.broadcast({ t: MSG.QM_LIVE, id: qm.id, gone: 1 });
  }

  // ---------- Corrida das Perguntas (Escola) ----------

  newQz(opts) {
    const qz = new QuizMatch(this, this.nextQzId++, opts);
    this.qzs.set(qz.id, qz);
    return qz;
  }

  qzCreate(p, msg) {
    if (this.busyBeyondQz(p.id)) return this.sendTo(p, { t: MSG.QZ_EXIT, id: 0, reason: 'busy' });
    return this.qzEnter(p, this.newQz({ mode: msg.mode, len: msg.len, theme: msg.theme }), 'play');
  }

  qzJoin(p, id, as) {
    const qz = this.qzs.get(id);
    if (!qz) return this.sendTo(p, { t: MSG.QZ_EXIT, id, reason: 'gone' });
    if (this.qzOf.get(p.id) === qz) return qz.add(p, as); // trocar entre correr e assistir
    if (this.busyBeyondQz(p.id)) return this.sendTo(p, { t: MSG.QZ_EXIT, id, reason: 'busy' });
    return this.qzEnter(p, qz, as);
  }

  // entra pela porta da Escola: ao sair, reaparece lá
  qzEnter(p, qz, as) {
    this.unwatch(p.id, 'busy');
    if (this.qzOf.get(p.id) !== qz) this.qzLeave(p.id, 'switch');
    const refused = qz.add(p, as);
    if (refused) {
      this.sendTo(p, { t: MSG.QZ_EXIT, id: qz.id, reason: refused });
      if (!qz.size()) this.endQz(qz);
      return;
    }
    this.leaveSeat(p);
    const door = this.map.school.door;
    Object.assign(p, { x: door.x, y: door.y, dir: 1, path: [], pending: null, moving: false, vx: 0, vy: 0, pose: 'quiz' });
    this.qzOf.set(p.id, qz);
  }

  qzLeave(id, reason = 'left') {
    const qz = this.qzOf.get(id);
    if (!qz) return;
    this.qzOf.delete(id);
    const p = this.players.get(id);
    if (p) p.pose = '';
    qz.remove(id, reason);
  }

  // sala sem ninguém de verdade: some da lista da Escola
  endQz(qz) {
    if (this.qzs.get(qz.id) !== qz) return;
    this.qzs.delete(qz.id);
    for (const [pid, z] of this.qzOf) if (z === qz) this.qzOf.delete(pid);
    this.broadcast({ t: MSG.QZ_LIVE, id: qz.id, gone: 1 });
  }

  // ---------- plateia do Dojo ----------

  watchFight(p, fightId) {
    const fight = this.fights.get(fightId);
    const refuse = (reason) => this.sendTo(p, { t: MSG.KT_UNWATCH, id: fightId, reason });
    if (!fight || fight.over) return refuse('gone');
    if (this.watching.get(p.id) === fight) return undefined;
    if (this.match?.has(p.id) || this.fightOf.has(p.id) || this.qmOf.has(p.id) || this.qzOf.has(p.id)) return refuse('busy');
    if (fight.watchers.size >= ARENA.MAX_WATCHERS) return refuse('full');
    this.unwatch(p.id, 'switch'); // trocando de luta
    this.leaveSeat(p);
    // entra pela porta do Dojo: ao sair, reaparece lá
    const door = this.map.dojo.door;
    Object.assign(p, { x: door.x, y: door.y, dir: 1, path: [], pending: null, moving: false, vx: 0, vy: 0, pose: 'watch' });
    this.watching.set(p.id, fight);
    fight.addWatcher(p);
    return undefined;
  }

  unwatch(id, reason = 'left') {
    const fight = this.watching.get(id);
    if (!fight) return;
    this.watching.delete(id);
    const p = this.players.get(id);
    if (p) p.pose = '';
    fight.removeWatcher(id, reason);
  }

  expireInvites() {
    const now = this.now();
    for (const [key, inv] of this.invites) {
      if (now - inv.at < GG.INVITE_TTL_MS) continue;
      this.invites.delete(key);
      const from = this.players.get(inv.from);
      const to = this.players.get(inv.to);
      if (from) this.sendTo(from, { t: MSG.CH_STATUS, status: 'expired', with: inv.to, nick: to?.nick, game: inv.game });
      if (to) this.sendTo(to, { t: MSG.CH_STATUS, status: 'expired', with: inv.from, nick: from?.nick, game: inv.game });
    }
  }

  ballPublic() {
    return this.ball.hidden ? null : [Math.round(this.ball.x), Math.round(this.ball.y)];
  }

  onChat(p, raw) {
    const now = this.now();
    if (now - p.lastChat < CHAT_COOLDOWN_MS) return;
    const text = sanitizeChat(raw);
    if (!text) return;
    p.lastChat = now;
    this.broadcast({ t: MSG.CHAT, id: p.id, text });
  }

  onEmote(p, e) {
    if (!Object.hasOwn(EMOTES, e)) return;
    if (e === 'sit') {
      if (p.seat || this.isBusy(p.id)) return; // já sentado / jogando
      p.path = [];
      p.pending = null;
      p.pose = 'sit';
    }
    this.broadcast({ t: MSG.EMOTE, id: p.id, e });
  }

  onInteract(p, msg) {
    const target = msg.id;
    const m = this.map;
    if (target === 'fountain') {
      this.walkTo(p, m.fountain.interact.x, m.fountain.interact.y, { kind: 'coin' });
    } else if (typeof target === 'string' && target.startsWith('bench-')) {
      const seat = this.freeSeat(target, p);
      if (!seat) return this.sendTo(p, { t: MSG.ERROR, msg: 'Banco lotado!' });
      this.walkTo(p, seat.x, seat.y + 26, { kind: 'sit', seat: seat.id });
    } else if (typeof target === 'string' && target.startsWith('lamp-')) {
      const lamp = m.lamps.find((l) => l.id === target);
      if (lamp) this.walkTo(p, lamp.x, lamp.y + 26, { kind: 'lamp', id: lamp.id });
    } else if (target === 'lake') {
      if (!isNum(msg.x) || !isNum(msg.y) || !inLake(msg.x, msg.y)) return;
      this.walkTo(p, msg.x, msg.y, { kind: 'splash', x: msg.x, y: msg.y });
    } else if (target === 'duck') {
      if (!isNum(msg.x) || !isNum(msg.y) || !inLake(msg.x, msg.y, 20)) return;
      this.fx(p, { kind: 'quack', x: msg.x, y: msg.y });
    } else if (target === 'ball') {
      this.walkTo(p, this.ball.x, this.ball.y, null);
    }
  }

  // ---------- movimento ----------

  walkTo(p, x, y, pending) {
    this.leaveSeat(p);
    p.pose = '';
    p.pending = pending;
    p.path = this.grid.findPath(p.x, p.y, x, y);
    if (!p.path.length && pending) this.arrive(p);
  }

  leaveSeat(p) {
    if (!p.seat) return;
    const s = this.seats.get(p.seat);
    if (s && s.by === p.id) s.by = null;
    p.seat = null;
    // desce do banco para a frente dele
    p.y += 26;
  }

  freeSeat(benchId, p) {
    let best = null;
    for (const s of this.seats.values()) {
      if (s.bench !== benchId || (s.by && s.by !== p.id)) continue;
      if (!best || dist(p.x, p.y, s.x, s.y) < dist(p.x, p.y, best.x, best.y)) best = s;
    }
    return best;
  }

  arrive(p) {
    const a = p.pending;
    p.pending = null;
    if (!a) return;
    const m = this.map;
    if (a.kind === 'coin') {
      if (dist(p.x, p.y, m.fountain.interact.x, m.fountain.interact.y) > ARRIVE_TOLERANCE) return;
      this.fx(p, { kind: 'coin', x: m.fountain.x, y: m.fountain.y });
    } else if (a.kind === 'sit') {
      const s = this.seats.get(a.seat);
      if (!s || s.by || dist(p.x, p.y, s.x, s.y + 26) > ARRIVE_TOLERANCE) return;
      s.by = p.id;
      p.seat = s.id;
      p.x = s.x;
      p.y = s.y;
      p.pose = 'bench';
      p.dir = 1;
    } else if (a.kind === 'lamp') {
      const lamp = m.lamps.find((l) => l.id === a.id);
      if (!lamp || dist(p.x, p.y, lamp.x, lamp.y + 26) > ARRIVE_TOLERANCE) return;
      this.lamps[a.id] = !this.lamps[a.id];
      this.broadcast({ t: MSG.OBJ, id: a.id, on: this.lamps[a.id], by: p.id });
    } else if (a.kind === 'splash') {
      // joga pedra do ponto onde parou (na margem) até o ponto clicado
      if (dist(p.x, p.y, a.x, a.y) > 420) return;
      p.dir = a.x >= p.x ? 1 : -1;
      this.fx(p, { kind: 'splash', x: a.x, y: a.y, fx: Math.round(p.x), fy: Math.round(p.y) });
    }
  }

  fx(p, data) {
    const now = this.now();
    if (now - p.lastFx < FX_COOLDOWN_MS) return;
    p.lastFx = now;
    this.broadcast({ t: MSG.FX, id: p.id, ...data });
  }

  // ---------- simulação ----------

  tick(dt) {
    for (const p of this.players.values()) if (!this.isBusy(p.id)) this.stepPlayer(p, dt);
    if (!this.ball.hidden) this.stepBall(dt);
    this.match?.tick(dt);
    for (const f of [...this.fights.values()]) f.tick(dt);
    for (const qm of [...this.qms.values()]) qm.tick(dt);
    for (const qz of [...this.qzs.values()]) qz.tick(dt);
    if (this.invites.size) this.expireInvites();
    this.voice.tick();
  }

  stepPlayer(p, dt) {
    if (!p.path.length) {
      p.moving = false;
      p.vx = p.vy = 0;
      return;
    }
    let budget = PLAYER_SPEED * dt;
    const ox = p.x;
    const oy = p.y;
    while (budget > 0 && p.path.length) {
      const t = p.path[0];
      const d = dist(p.x, p.y, t.x, t.y);
      if (d <= budget) {
        p.x = t.x;
        p.y = t.y;
        budget -= d;
        p.path.shift();
      } else {
        p.x += ((t.x - p.x) / d) * budget;
        p.y += ((t.y - p.y) / d) * budget;
        budget = 0;
      }
    }
    const dx = p.x - ox;
    if (Math.abs(dx) > 0.01) p.dir = dx > 0 ? 1 : -1;
    p.vx = dx / dt;
    p.vy = (p.y - oy) / dt;
    p.moving = true;
    if (!p.path.length) this.arrive(p);
  }

  resetBall() {
    const f = this.map.field;
    Object.assign(this.ball, { x: f.x + f.w / 2, y: f.y + f.h / 2, vx: 0, vy: 0, resetAt: 0 });
  }

  stepBall(dt) {
    const b = this.ball;
    const now = this.now();
    if (b.resetAt) {
      if (now >= b.resetAt) this.resetBall();
      return;
    }

    // chute por contato
    for (const p of this.players.values()) {
      if (!p.moving || now - p.lastKick < 250) continue;
      const d = dist(p.x, p.y, b.x, b.y);
      if (d > PLAYER_RADIUS + BALL_RADIUS + 6) continue;
      let nx = d > 0.01 ? (b.x - p.x) / d : p.dir;
      let ny = d > 0.01 ? (b.y - p.y) / d : 0;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 1) {
        nx = nx * 0.5 + (p.vx / sp) * 0.5;
        ny = ny * 0.5 + (p.vy / sp) * 0.5;
      }
      const n = Math.hypot(nx, ny) || 1;
      const power = BALL_KICK_SPEED * (0.8 + this.random() * 0.4);
      b.vx = (nx / n) * power;
      b.vy = (ny / n) * power;
      b.lastKicker = p.id;
      p.lastKick = now;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const fr = BALL_FRICTION ** dt;
    b.vx *= fr;
    b.vy *= fr;
    if (Math.hypot(b.vx, b.vy) < 4) b.vx = b.vy = 0;

    const f = this.map.field;
    const R = BALL_RADIUS;
    const midY = f.y + f.h / 2;
    const inMouth = Math.abs(b.y - midY) < this.map.goalMouth - R;
    if (b.y < f.y + R) { b.y = f.y + R; b.vy = Math.abs(b.vy) * 0.7; }
    if (b.y > f.y + f.h - R) { b.y = f.y + f.h - R; b.vy = -Math.abs(b.vy) * 0.7; }
    if (b.x < f.x + R) {
      if (inMouth) {
        if (b.x < f.x - R) this.goal('blue');
      } else { b.x = f.x + R; b.vx = Math.abs(b.vx) * 0.7; }
    }
    if (b.x > f.x + f.w - R) {
      if (inMouth) {
        if (b.x > f.x + f.w + R) this.goal('red');
      } else { b.x = f.x + f.w - R; b.vx = -Math.abs(b.vx) * 0.7; }
    }
  }

  goal(side) {
    const b = this.ball;
    this.score[side]++;
    b.vx = b.vy = 0;
    b.resetAt = this.now() + GOAL_RESET_MS;
    const kicker = this.players.get(b.lastKicker);
    this.broadcast({ t: MSG.GOAL, side, score: this.score, by: kicker ? kicker.nick : null });
  }

  snapshot() {
    const ps = [];
    for (const p of this.players.values()) {
      ps.push([p.id, Math.round(p.x), Math.round(p.y), p.dir, p.moving ? 1 : 0, p.pose]);
    }
    return { t: MSG.SNAP, ts: this.now(), p: ps, b: this.ballPublic() };
  }

  // ---------- envio ----------

  sendTo(p, msg) {
    p.send(JSON.stringify(msg));
  }

  broadcast(msg, exceptId = null) {
    const data = JSON.stringify(msg);
    for (const p of this.players.values()) if (p.id !== exceptId) p.send(data);
  }
}

// vg = id do grupo de voz (0 = nenhum)
function publicPlayer(p, vg) {
  return { id: p.id, nick: p.nick, look: p.look, x: Math.round(p.x), y: Math.round(p.y), dir: p.dir, pose: p.pose, vg };
}

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}
