// Constantes compartilhadas entre servidor (Node) e cliente (browser).
// Qualquer mudança aqui afeta os dois lados — atualize docs/PROTOCOL.md junto.

export const PROTOCOL_VERSION = 2;

export const TICK_HZ = 30; // simulação no servidor
export const SNAPSHOT_HZ = 15; // envio de estado para os clientes
export const INTERP_DELAY_MS = 110; // atraso de interpolação no cliente

export const PLAYER_SPEED = 190; // px/s
export const PLAYER_RADIUS = 14; // raio de colisão
export const MAX_PLAYERS = 100;

export const NICK_MIN = 2;
export const NICK_MAX = 16;

export const CHAT_MAX_LEN = 120;
export const CHAT_COOLDOWN_MS = 600;

export const BALL_RADIUS = 11;
export const BALL_KICK_SPEED = 420;
export const BALL_FRICTION = 0.35; // fração de velocidade restante após 1s
export const GOAL_RESET_MS = 1800;

// Emotes disponíveis. duration = 0 => dura até o player se mover.
export const EMOTES = {
  wave: { key: '1', label: 'Acenar', duration: 1600 },
  jump: { key: '2', label: 'Pular', duration: 700 },
  dance: { key: '3', label: 'Dançar', duration: 4000 },
  fart: { key: '4', label: 'Pum', duration: 1600 },
  sit: { key: '5', label: 'Sentar', duration: 0 },
};

export const PALETTE = {
  hats: ['#1fa6d6', '#e8412b', '#2e9e48', '#f2c12e', '#8a4fc7', '#f27ab0', '#222222', '#ff8a1f'],
  shirts: ['#e8412b', '#3a6fd8', '#2e9e48', '#f2c12e', '#8a4fc7', '#7a4a2a', '#ff8a1f', '#20b8a0'],
  skins: ['#ffd9b3', '#f0c08a', '#c98b5a', '#8d5a3a'],
};

// Tipos de mensagem do protocolo WebSocket (campo `t`).
export const MSG = {
  // cliente -> servidor
  HELLO: 'hello',
  MOVE: 'move',
  CHAT: 'chat',
  EMOTE: 'emote',
  INTERACT: 'interact',
  PING: 'ping', // c->s {n} | s->c PONG {n} (mede latência)
  // servidor -> cliente
  WELCOME: 'welcome',
  JOIN: 'join',
  LEAVE: 'leave',
  SNAP: 'snap',
  FX: 'fx',
  OBJ: 'obj',
  GOAL: 'goal',
  ERROR: 'error',
  PONG: 'pong',
  // ambos os sentidos: CHAT e EMOTE são reenviados pelo servidor com `id`

  // ---- desafios / minigame Gol a Gol ----
  CHALLENGE: 'challenge', // c->s {to, rematch?} | s->c convite {from, nick, rematch}
  CHALLENGE_REPLY: 'challenge_reply', // c->s {from, accept}
  CH_STATUS: 'ch_status', // s->c {status, with, nick}
  GG_INPUT: 'gg_input', // c->s {sy?, charging?, ky?, dive?}
  GG_SHOOT: 'gg_shoot', // c->s {angle, power, curve}
  GG_START: 'gg_start', // s->c {left:{id,nick}, right:{id,nick}, first}
  GG_STATE: 'gg_state', // s->c estado 30x/s
  GG_EVENT: 'gg_event', // s->c {kind, ...}
  GG_END: 'gg_end', // s->c {winner, loser, reason}

  // ---- minigame Karatê (luta 1x1 no dojo) ----
  // o desafio usa CHALLENGE/CHALLENGE_REPLY/CH_STATUS com `game: 'karate'`
  KT_INPUT: 'kt_input', // c->s {mx, my, block}
  KT_ACT: 'kt_act', // c->s {a: jab|punch|kick|hkick|dash, dx?, dy?}
  KT_START: 'kt_start', // s->todos {id, a:{id,nick}, b:{id,nick}}
  KT_STATE: 'kt_state', // s->lutadores + plateia, 30x/s
  KT_EVENT: 'kt_event', // s->lutadores + plateia {kind, ...}
  // plateia do Dojo (ver shared/arena.js): espectador assiste e torce, sem interferir
  KT_WATCH: 'kt_watch', // c->s {id} entra na plateia | s->c {id, a, b, rd, wins, w} confirmação
  KT_UNWATCH: 'kt_unwatch', // c->s {} sai | s->c {id, reason: left|busy|gone|full}
  KT_CHEER: 'kt_cheer', // c->s {r, side?} | s->lutadores + plateia {by, r, side}
  KT_LIVE: 'kt_live', // s->todos {id, rd, wins, w:[[pid, side, seat]]} placar/plateia mudou
  KT_END: 'kt_end', // s->todos {winner, loser, reason, score}

  // ---- minigame Queimada (quadras no Ginásio, ver shared/queimada.js) ----
  // convite pelo cartão do player: CHALLENGE/CHALLENGE_REPLY/CH_STATUS com `game: 'queimada'`
  QM_CREATE: 'qm_create', // c->s {hard} cria uma partida nova e entra
  QM_JOIN: 'qm_join', // c->s {id} entra numa partida já existente (na quadra ou na fila)
  QM_LEAVE: 'qm_leave', // c->s {} sai da partida (volta para a porta do Ginásio)
  QM_INPUT: 'qm_input', // c->s {mx, my} movimento
  QM_ACT: 'qm_act', // c->s {a: throw|grab|dodge, x?, y? (alvo do arremesso), dx?, dy? (direção da esquiva)}
  QM_ENTER: 'qm_enter', // s->c confirmação {id, ph, hard, rd, m, target}
  QM_EXIT: 'qm_exit', // s->c {id, reason: left|full|gone|busy}
  QM_LIVE: 'qm_live', // s->todos {id, ph, hard, rd, m:[[pid, time, lugar, pts]]} | {id, gone:1}
  QM_STATE: 'qm_state', // s->membros, 30x/s
  QM_EVENT: 'qm_event', // s->membros {kind, ...}
  QM_END: 'qm_end', // s->todos {id, winner, winnerNick, rank:[[pid, nick, pts, hits, catches, dodges]]}

  // ---- chat de voz por grupos (ver shared/voice.js) ----
  VC_INVITE: 'vc_invite', // c->s {to} convida para o meu grupo (cria um se eu não tiver)
  VC_REQUEST: 'vc_request', // c->s {to} pede para entrar no grupo de `to`
  VC_REPLY: 'vc_reply', // c->s {from, accept} responde convite/pedido
  VC_LEAVE: 'vc_leave', // c->s {} sai do grupo
  VC_KICK: 'vc_kick', // c->s {id} dono remove alguém
  VC_MUTE: 'vc_mute', // c->s {m, d} microfone mudo / áudio desligado
  VC_SIGNAL: 'vc_signal', // c->s {to, d} | s->c {from, d} sinalização WebRTC (só dentro do grupo)
  VC_ASK: 'vc_ask', // s->c {from, nick, kind:'invite'|'request', ttl, size}
  VC_STATUS: 'vc_status', // s->c {status, with, nick}
  VC_GROUP: 'vc_group', // s->membros {g:{id,owner,members:[{id,m,d}]}|null, ice?, reason?}
  VC_TAG: 'vc_tag', // s->todos {id, g} player entrou/saiu de um grupo de voz (g=0: nenhum)
};

// Minigames que podem ser escolhidos num desafio (campo `game`; ausente = golagol).
export const GAMES = ['golagol', 'karate', 'queimada'];
