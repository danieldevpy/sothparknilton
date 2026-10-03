// Minigame "Queimada" (dodgeball): regras numéricas e física da bola, compartilhadas entre
// servidor (autoritativo) e cliente (predição do próprio boneco, prévia da trajetória, desenho).
//
// A partida acontece numa QUADRA dentro do Ginásio (coordenadas próprias, não do mapa):
//
//   x: 0 ── CEM ───────── MID ───────── W-CEM ── W
//      │cemitério│  time A   │   time B   │cemitério│
//      │ (de B)  │ (vermelho)│   (azul)   │  (de A) │
//
// Visão 2.5D: x = esquerda/direita, y = profundidade, z = altura da bola. Quem é queimado
// vai para o CEMITÉRIO atrás do time adversário e continua jogando de lá: se acertar alguém,
// VOLTA para a quadra (regra da queimada brasileira). A bola quica nas paredes e nos pneus.

export const QM = {
  W: 1100, // largura total (quadra + 2 cemitérios)
  H: 420, // profundidade
  CEM: 90, // largura de cada cemitério
  R: 15, // raio do corpo
  BODY_H: 80, // altura do corpo (bola acima disso passa por cima)
  HIT_R: 32, // distância bola↔boneco que conta como acerto (o cabeção também conta!)
  SPEED: 185, // px/s andando
  DEPTH_MUL: 0.85, // andar em profundidade é um pouco mais lento
  HOLD_SPEED: 0.85, // multiplicador segurando a bola
  CATCH_SPEED: 0.45, // multiplicador na postura de pegar

  // bola
  BALL_R: 10,
  GRAVITY: 950,
  HAND_Z: 42, // altura de onde a bola sai
  MIN_THROW: 330, // velocidade do arremesso mais fraco (clique perto)
  MAX_THROW: 860, // mais forte (clique longe)
  THROW_NEAR: 50, // distância do clique que dá a força mínima
  THROW_FAR: 560, // distância do clique que dá a força máxima
  MAX_VZ: 520,
  MIN_VZ: -160,
  WALL_REST: 0.82, // energia que sobra ao bater na parede
  TIRE_REST: 0.9,
  GROUND_REST: 0.45, // quique no chão
  GROUND_FRICTION: 0.72, // velocidade horizontal que sobra a cada quique
  ROLL_FRICTION: 0.22, // fração de velocidade que sobra após 1 s rolando
  TIRE_H: 34, // pneu: bola acima disso passa por cima
  TIRES: [{ x: 550, y: 115, r: 24 }, { x: 550, y: 305, r: 24 }],

  // ações
  THROW_TIME: 0.22, // animação do arremesso (parado)
  DODGE_TIME: 0.2,
  DODGE_DIST: 88,
  DODGE_INV: 0.26, // invencível durante a esquiva (um tiquinho além dela)
  CATCH_STANCE: 0.45, // postura de pegar
  STUN_TIME: 0.35, // deixou escapar (fumble): fica atordoado
  HIT_GRACE: 0.14, // "hit-stop": a bola congela no alvo; dá tempo de pegar/esquivar mesmo com lag
  HIT_TIME: 0.85, // queimado caído antes de ir para o cemitério
  SPAWN_INV: 1.1, // quem entra/volta fica invencível um pouco
  WHOOSH_WINDOW: 0.3, // esquiva iniciada até X s antes da bola passar = WHOOSH (vale ponto)
  WHOOSH_R: 55, // ...passando a até X px de quem esquivou
  LAST_SECOND: 0.15, // ...e até X s = NO ÚLTIMO SEGUNDO!
  PICKUP_Z: 45, // bola acima disso não dá para pegar do chão
  SLOW_LOCK: 1, // segurou demais e derrubou: fica X s sem poder pegar
  BALL_RETURN: 1.2, // bola parada onde ninguém alcança (cemitério vazio...): o juiz devolve depois de X s

  // partida
  MAX_COURT: 2, // por time (2v2); quem sobra fica na fila
  MAX_MEMBERS: 10,
  LOBBY_COUNT: 3, // com 2+ jogadores, começa em 3 s
  INTRO_TIME: 2.4,
  ROUND_TIME: 75,
  END_TIME: 3.2,
  OVER_TIME: 8,
  ENTER_DELAY: 1.0, // próximo da fila entra X s depois da queimada
  TARGET: 50, // primeiro a chegar a 50 pontos vence

  // pontuação (modo Híbrido)
  PTS_HIT: 5,
  PTS_BANK: 2, // bônus: acertou depois de quicar na parede (TABELA!)
  PTS_CATCH: 3,
  PTS_DODGE: 1,
  PTS_SURVIVE: 10, // último(s) de pé no fim da rodada

  INVITE_TTL_MS: 20000,
};

// Diferenças entre os modos de dificuldade (escolhido por quem cria a partida).
// Fácil: clicar na bola faz o boneco correr até ela e pegar; passar por cima de bola lenta pega sozinho.
// Difícil: tem que estar perto quando clica (como o alcance no Karatê); janelas mais apertadas.
export const LEVELS = {
  easy: { grabR: 48, grabSpeed: 330, autoRun: true, autoPick: 150, catchSlow: 0.42, catchFast: 0.22, catchCd: 1.3, dodgeCd: 1.5, holdMax: 5 },
  hard: { grabR: 34, grabSpeed: 220, autoRun: false, autoPick: 0, catchSlow: 0.3, catchFast: 0.13, catchCd: 1.5, dodgeCd: 1.9, holdMax: 4 },
};

export const MID = QM.W / 2;
export const ACTIONS = ['throw', 'grab', 'dodge'];

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// Faixa x onde o jogador pode ficar: quadra do time ou cemitério (atrás do adversário).
export function zoneX(team, cem) {
  const r = QM.R;
  if (!cem) return team === 'a' ? [QM.CEM + r, MID - r] : [MID + r, QM.W - QM.CEM - r];
  return team === 'a' ? [QM.W - QM.CEM + r, QM.W - r] : [r, QM.CEM - r];
}

export function clampPlayer(p) {
  const [lo, hi] = zoneX(p.team, p.cem);
  p.x = clamp(p.x, lo, hi);
  p.y = clamp(p.y, QM.R, QM.H - QM.R * 0.5);
  // pneus no meio da quadra também bloqueiam os bonecos
  for (const t of QM.TIRES) {
    const dx = p.x - t.x;
    const dy = p.y - t.y;
    const d = Math.hypot(dx, dy);
    const min = t.r + QM.R;
    if (d < min && d > 0.001) {
      p.x = t.x + (dx / d) * min;
      p.y = t.y + (dy / d) * min;
    }
  }
  p.x = clamp(p.x, lo, hi);
}

export function speedOf(p) {
  let s = QM.SPEED;
  if (p.hold >= 0) s *= QM.HOLD_SPEED; // hold = índice da bola segurada (-1 = nenhuma)
  if (p.st === 'catch') s *= QM.CATCH_SPEED;
  return s;
}

// Passo de movimento livre (servidor e predição do cliente usam o mesmo).
export function walkStep(p, mx, my, dt) {
  const n = Math.hypot(mx, my);
  if (n < 0.05) return false;
  const k = Math.min(1, n) / n;
  const s = speedOf(p);
  p.x += mx * k * s * dt;
  p.y += my * k * s * QM.DEPTH_MUL * dt;
  clampPlayer(p);
  return true;
}

// Força do arremesso: vem da distância do clique (perto = fraco, longe = forte).
export function throwPower(dist) {
  return clamp((dist - QM.THROW_NEAR) / (QM.THROW_FAR - QM.THROW_NEAR), 0, 1);
}

// Velocidade inicial da bola arremessada de (x, y) em direção ao ponto (tx, ty).
// A bola sai da mão (HAND_Z) e cai perto do ponto clicado; se não acertar ninguém,
// continua quicando (momento) até parar.
export function throwVelocity(x, y, tx, ty) {
  let dx = tx - x;
  let dy = ty - y;
  let d = Math.hypot(dx, dy);
  if (d < 1) { dx = 1; dy = 0; d = 1; }
  const pow = throwPower(d);
  const s = QM.MIN_THROW + (QM.MAX_THROW - QM.MIN_THROW) * pow;
  const t = Math.max(0.08, d / s);
  const vz = clamp((QM.GRAVITY * t * t / 2 - QM.HAND_Z) / t, QM.MIN_VZ, QM.MAX_VZ);
  return { vx: (dx / d) * s, vy: (dy / d) * s, vz, pow };
}

// Um passo da física da bola solta/arremessada. Retorna os eventos do passo:
// { wall: n, tire: n, ground: bool } (para o servidor decidir "tabela", fim da bola viva etc.).
export function stepBall(b, dt) {
  const ev = { wall: 0, tire: 0, ground: false };
  const R = QM.BALL_R;
  const airborne = b.z > 0 || b.vz > 0;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (airborne) {
    b.vz -= QM.GRAVITY * dt;
    b.z += b.vz * dt;
    if (b.z <= 0) {
      b.z = 0;
      ev.ground = true;
      b.vz = -b.vz * QM.GROUND_REST;
      if (b.vz < 70) b.vz = 0;
      b.vx *= QM.GROUND_FRICTION;
      b.vy *= QM.GROUND_FRICTION;
    }
  } else {
    const f = QM.ROLL_FRICTION ** dt;
    b.vx *= f;
    b.vy *= f;
  }
  if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * QM.WALL_REST; ev.wall++; }
  if (b.x > QM.W - R) { b.x = QM.W - R; b.vx = -Math.abs(b.vx) * QM.WALL_REST; ev.wall++; }
  if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy) * QM.WALL_REST; ev.wall++; }
  if (b.y > QM.H - R) { b.y = QM.H - R; b.vy = -Math.abs(b.vy) * QM.WALL_REST; ev.wall++; }
  if (b.z < QM.TIRE_H) {
    for (const t of QM.TIRES) {
      const dx = b.x - t.x;
      const dy = b.y - t.y;
      const d = Math.hypot(dx, dy);
      const min = t.r + R;
      if (d >= min || d < 0.001) continue;
      const nx = dx / d;
      const ny = dy / d;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        b.vx = (b.vx - 2 * dot * nx) * QM.TIRE_REST;
        b.vy = (b.vy - 2 * dot * ny) * QM.TIRE_REST;
        ev.tire++;
      }
      b.x = t.x + nx * min;
      b.y = t.y + ny * min;
    }
  }
  if (b.z === 0 && b.vz === 0 && Math.hypot(b.vx, b.vy) < 8) b.vx = b.vy = 0;
  return ev;
}

// Prévia da trajetória (cliente): pontos [x, y, z] por ~1,2 s, até o primeiro quique no chão.
export function predictPath(x, y, tx, ty, { dt = 1 / 60, max = 1.2 } = {}) {
  const v = throwVelocity(x, y, tx, ty);
  const b = { x, y, z: QM.HAND_Z, vx: v.vx, vy: v.vy, vz: v.vz };
  const pts = [[b.x, b.y, b.z]];
  const bounces = [];
  for (let t = 0; t < max; t += dt) {
    const ev = stepBall(b, dt);
    pts.push([b.x, b.y, b.z]);
    if (ev.wall || ev.tire) bounces.push([b.x, b.y, b.z]);
    if (ev.ground) break;
  }
  return { pts, bounces, pow: v.pow };
}

// Janela da pegada: quanto mais rápida a bola, mais preciso tem que ser o tempo.
// `age` = segundos desde que começou a postura de pegar. true = PEGOU, false = escapou.
export function catchOk(age, speed, level) {
  const k = clamp((speed - QM.MIN_THROW) / (QM.MAX_THROW - QM.MIN_THROW), 0, 1);
  return age <= level.catchSlow + (level.catchFast - level.catchSlow) * k;
}

// Posições de início de rodada: cada time no fundo da sua quadra.
export function startSpot(team, i, n) {
  const x = team === 'a' ? QM.CEM + 70 : QM.W - QM.CEM - 70;
  const y = n <= 1 ? QM.H / 2 : QM.H * (0.3 + 0.4 * (i / (n - 1)));
  return { x, y, dir: team === 'a' ? 1 : -1 };
}

// Bolas no começo da rodada: em cima da linha do meio — corrida pela bola!
export function ballSpots(n) {
  if (n <= 1) return [{ x: MID, y: QM.H / 2 }];
  return [{ x: MID, y: QM.H * 0.5 - 50 }, { x: MID, y: QM.H * 0.5 + 50 }];
}
