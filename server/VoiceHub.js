// Chat de voz por grupos (regras no servidor). O áudio NÃO passa por aqui: vai direto
// entre os navegadores via WebRTC (malha dentro do grupo, com TURN de reserva).
// O hub só cuida de quem está em qual grupo, de convites/pedidos para entrar,
// do estado de mudo e de repassar a sinalização (SDP/ICE) entre membros do mesmo grupo.
// Plugado no Room (room.voice); também não conhece WebSocket → testável (tests/voice.test.js).

import { createHmac } from 'node:crypto';
import { MSG } from '../shared/constants.js';
import { VOICE, sanitizeSignal } from '../shared/voice.js';

const DEFAULT_STUN = ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'];

const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

// STUN_URLS, TURN_URLS (ex.: "turn:1.2.3.4:3478?transport=udp,turn:1.2.3.4:3478?transport=tcp") e
// TURN_SECRET (mesmo `static-auth-secret` do coturn → credenciais temporárias, ver docs/DEPLOY.md).
export function voiceConfigFromEnv(env = process.env) {
  const stun = list(env.STUN_URLS);
  return { stun: stun.length ? stun : DEFAULT_STUN, turn: list(env.TURN_URLS), turnSecret: env.TURN_SECRET || '' };
}

export class VoiceHub {
  constructor(room, { stun = DEFAULT_STUN, turn = [], turnSecret = '' } = {}) {
    this.room = room;
    this.stun = stun;
    this.turn = turn;
    this.turnSecret = turnSecret;
    this.groups = new Map(); // id -> { id, owner, members: Map(playerId -> {m, d}) }
    this.groupOf = new Map(); // playerId -> grupo
    this.asks = new Map(); // `${from}>${to}` -> { from, to, kind: 'invite'|'request', at }
    this.lastAsk = new Map(); // playerId -> momento do último convite/pedido
    this.nextId = 1;
  }

  // id do grupo de voz do player (0 = nenhum) — vai no welcome/join e em vc_tag
  tagOf(id) {
    return this.groupOf.get(id)?.id || 0;
  }

  handle(p, msg) {
    switch (msg.t) {
      case MSG.VC_INVITE: return this.ask(p, msg.to, 'invite');
      case MSG.VC_REQUEST: return this.ask(p, msg.to, 'request');
      case MSG.VC_REPLY: return this.reply(p, msg);
      case MSG.VC_LEAVE: return this.leave(p.id, 'left');
      case MSG.VC_KICK: return this.kick(p, msg.id);
      case MSG.VC_MUTE: return this.mute(p, msg);
      case MSG.VC_SIGNAL: return this.signal(p, msg);
      default: return undefined;
    }
  }

  // ---------- convites e pedidos ----------

  status(p, status, other, otherId) {
    this.room.sendTo(p, { t: MSG.VC_STATUS, status, with: other?.id ?? otherId ?? null, nick: other?.nick ?? null });
  }

  ask(p, toId, kind) {
    const target = this.room.players.get(toId);
    if (!target || target.id === p.id) return this.status(p, 'invalid', target, toId);
    const now = this.room.now();
    if (now - (this.lastAsk.get(p.id) || -Infinity) < VOICE.ASK_COOLDOWN_MS) return this.status(p, 'cooldown', target);
    // o outro já tinha me convidado/pedido: isso vira um "aceite"
    if (this.asks.has(`${target.id}>${p.id}`)) return this.reply(p, { from: target.id, accept: true });

    const mine = this.groupOf.get(p.id);
    const theirs = this.groupOf.get(target.id);
    let size;
    if (kind === 'invite') {
      if (theirs && theirs === mine) return this.status(p, 'same', target);
      if (theirs) return this.status(p, 'in_group', target);
      if (mine && mine.members.size >= VOICE.MAX_GROUP) return this.status(p, 'full', target);
      size = mine ? mine.members.size : 1;
    } else {
      if (!theirs) return this.status(p, 'no_group', target);
      if (theirs === mine) return this.status(p, 'same', target);
      if (theirs.members.size >= VOICE.MAX_GROUP) return this.status(p, 'full', target);
      size = theirs.members.size;
    }
    const key = `${p.id}>${target.id}`;
    if (!this.asks.has(key)) {
      let out = 0;
      for (const a of this.asks.values()) if (a.from === p.id) out++;
      if (out >= VOICE.MAX_PENDING_OUT) return this.status(p, 'too_many', target);
    }
    this.lastAsk.set(p.id, now);
    this.asks.set(key, { from: p.id, to: target.id, kind, at: now });
    this.room.sendTo(target, { t: MSG.VC_ASK, from: p.id, nick: p.nick, kind, ttl: VOICE.ASK_TTL_MS, size });
    return this.status(p, kind === 'invite' ? 'sent' : 'asked', target);
  }

  reply(p, msg) {
    const fromId = msg?.from;
    const key = `${fromId}>${p.id}`;
    const ask = this.asks.get(key);
    const from = this.room.players.get(fromId);
    if (!ask || !from) {
      this.asks.delete(key);
      return this.status(p, 'expired', from, fromId);
    }
    this.asks.delete(key);
    if (!msg.accept) return this.status(from, 'declined', p);

    const both = (s) => { this.status(from, s, p); this.status(p, s, from); };
    if (ask.kind === 'invite') {
      // `from` convidou `p` para o grupo dele (ou para um grupo novo)
      let g = this.groupOf.get(from.id);
      if (g && g === this.groupOf.get(p.id)) return both('same');
      if (g && g.members.size >= VOICE.MAX_GROUP) return both('full');
      const fresh = !g;
      if (fresh) g = this.createGroup(from);
      this.join([p], g, fresh ? [from] : []);
    } else {
      // `from` pediu para entrar no grupo de `p`
      const g = this.groupOf.get(p.id);
      if (!g) return both('no_group');
      if (this.groupOf.get(from.id) === g) return both('same');
      if (g.members.size >= VOICE.MAX_GROUP) return both('full');
      this.join([from], g);
    }
    return undefined;
  }

  expire() {
    const now = this.room.now();
    for (const [key, a] of this.asks) {
      if (now - a.at < VOICE.ASK_TTL_MS) continue;
      this.asks.delete(key);
      const from = this.room.players.get(a.from);
      const to = this.room.players.get(a.to);
      if (from) this.status(from, 'expired', to, a.to);
      if (to) this.status(to, 'expired', from, a.from); // some com a caixinha do convite
    }
  }

  // ---------- grupos ----------

  createGroup(owner) {
    const g = { id: this.nextId++, owner: owner.id, members: new Map() };
    this.groups.set(g.id, g);
    return g;
  }

  // Coloca `players` no grupo (saindo do grupo anterior, se tinham) e avisa todo mundo.
  // `founders` = quem cria o grupo junto (o dono, num convite novo).
  join(players, g, founders = []) {
    const added = [...founders, ...players];
    for (const pl of added) {
      const cur = this.groupOf.get(pl.id);
      if (cur && cur !== g) this.leave(pl.id, 'switch');
      g.members.set(pl.id, { m: false, d: false });
      this.groupOf.set(pl.id, g);
    }
    this.notify(g, new Set(added.map((pl) => pl.id)));
    for (const pl of added) this.room.broadcast({ t: MSG.VC_TAG, id: pl.id, g: g.id });
  }

  leave(id, reason = 'left') {
    const g = this.groupOf.get(id);
    if (!g) return;
    g.members.delete(id);
    this.groupOf.delete(id);
    const pl = this.room.players.get(id);
    if (pl) this.room.sendTo(pl, { t: MSG.VC_GROUP, g: null, reason });
    this.room.broadcast({ t: MSG.VC_TAG, id, g: 0 });
    if (g.members.size <= 1) {
      // sobrou um só: o grupo acaba
      this.groups.delete(g.id);
      for (const last of g.members.keys()) {
        this.groupOf.delete(last);
        const lp = this.room.players.get(last);
        if (lp) this.room.sendTo(lp, { t: MSG.VC_GROUP, g: null, reason: 'dissolved' });
        this.room.broadcast({ t: MSG.VC_TAG, id: last, g: 0 });
      }
      g.members.clear();
      return;
    }
    if (g.owner === id) g.owner = g.members.keys().next().value; // o mais antigo vira dono
    this.notify(g);
  }

  kick(p, id) {
    const g = this.groupOf.get(p.id);
    if (!g || g.owner !== p.id || id === p.id || this.groupOf.get(id) !== g) return this.status(p, 'invalid', null, id);
    return this.leave(id, 'kicked');
  }

  mute(p, msg) {
    const g = this.groupOf.get(p.id);
    const st = g?.members.get(p.id);
    if (!st) return;
    const m = !!msg.m;
    const d = !!msg.d;
    if (st.m === m && st.d === d) return;
    st.m = m;
    st.d = d;
    this.notify(g);
  }

  // Repassa SDP/ICE só entre membros do mesmo grupo (ninguém de fora consegue sinalizar).
  signal(p, msg) {
    const g = this.groupOf.get(p.id);
    if (!g || msg.to === p.id || !g.members.has(msg.to)) return;
    const d = sanitizeSignal(msg.d);
    if (!d) return;
    const to = this.room.players.get(msg.to);
    if (to) this.room.sendTo(to, { t: MSG.VC_SIGNAL, from: p.id, d });
  }

  publicGroup(g) {
    return { id: g.id, owner: g.owner, members: [...g.members].map(([id, s]) => ({ id, m: s.m ? 1 : 0, d: s.d ? 1 : 0 })) };
  }

  // Estado do grupo para os membros; quem acabou de entrar recebe também os servidores ICE.
  notify(g, fresh = new Set()) {
    const pub = this.publicGroup(g);
    for (const id of g.members.keys()) {
      const pl = this.room.players.get(id);
      if (!pl) continue;
      const msg = { t: MSG.VC_GROUP, g: pub };
      if (fresh.has(id)) msg.ice = this.iceServers(id);
      this.room.sendTo(pl, msg);
    }
  }

  // STUN público + TURN com credencial temporária (padrão "TURN REST API" do coturn:
  // usuário = "<expira>:<id>", senha = base64(HMAC-SHA1(segredo, usuário))).
  iceServers(id) {
    const out = [];
    if (this.stun.length) out.push({ urls: this.stun });
    if (this.turn.length && this.turnSecret) {
      const username = `${Math.floor(this.room.now() / 1000) + VOICE.TURN_TTL_S}:np${id}`;
      const credential = createHmac('sha1', this.turnSecret).update(username).digest('base64');
      out.push({ urls: this.turn, username, credential });
    }
    return out;
  }

  // ---------- ciclo de vida ----------

  removePlayer(id) {
    for (const [key, a] of this.asks) {
      if (a.from !== id && a.to !== id) continue;
      this.asks.delete(key);
      const other = this.room.players.get(a.from === id ? a.to : a.from);
      if (other) this.status(other, 'gone', this.room.players.get(id), id);
    }
    this.lastAsk.delete(id);
    this.leave(id, 'left');
  }

  tick() {
    if (this.asks.size) this.expire();
  }

  stats() {
    let inVoice = 0;
    for (const g of this.groups.values()) inVoice += g.members.size;
    return { groups: this.groups.size, inVoice };
  }
}
