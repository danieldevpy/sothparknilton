// IA de Queimada: usada pelo bot (scripts/qmbot.js) e pelo simulador de equilíbrio
// (scripts/queimada-balance.js). Só "aperta botões" como um jogador: movimento + ações
// (arremessar / pegar / esquivar). `skill` (0–1) controla mira, reação e acerto na pegada.
//
// createAi({ skill, react, catchy }) → (view, now) => { mx, my, act?, x?, y?, dx?, dy? }
// view: { me, players: [{ id, x, y, team, cem, st, vx?, vy? }], balls: [{ x, y, z, vx, vy, st, team }], phase, level }

import { QM, zoneX, clamp } from '../shared/queimada.js';

export function createAi({ skill = 0.7, react = 0.2, catchy = 0.45, random = Math.random } = {}) {
  const st = {
    holdSince: null,
    holdDelay: 0,
    seen: new Map(), // bola viva -> quando a IA "percebeu" (tempo de reação)
    decided: new Map(), // bola viva -> decisão tomada (catch | dodge | none)
    wander: { y: QM.H / 2, at: 0 },
    lastAct: 0,
  };

  return function decide(view, now) {
    const { me, players, balls, phase } = view;
    const out = { mx: 0, my: 0 };
    if (!me || !['lobby', 'count', 'play'].includes(phase)) return out;
    if (['hit', 'dodge', 'throw', 'stun'].includes(me.st)) return out;
    const [lo, hi] = zoneX(me.team, me.cem);
    const enemies = players.filter((p) => p.team !== me.team && !p.cem && p.st !== 'hit');

    // ---------- defesa: bola viva vindo na minha direção ----------
    if (!me.cem && me.hold < 0) {
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (b.st !== 'live' || b.team === me.team) {
          st.seen.delete(i);
          st.decided.delete(i);
          continue;
        }
        if (!st.seen.has(i)) st.seen.set(i, now);
        if (now - st.seen.get(i) < react) continue; // ainda não reagiu
        const sp = Math.hypot(b.vx, b.vy);
        if (sp < 50) continue;
        const rx = me.x - b.x;
        const ry = me.y - b.y;
        const tt = (rx * b.vx + ry * b.vy) / (sp * sp); // tempo até o ponto mais próximo
        if (tt < 0 || tt > 0.8) continue;
        const miss = Math.hypot(rx - b.vx * tt, ry - b.vy * tt);
        if (miss > QM.R + QM.BALL_R + 10) continue;
        let d = st.decided.get(i);
        if (!d) {
          // decide uma vez por arremesso; jogador ruim às vezes congela
          if (random() > 0.35 + skill * 0.6) d = 'none';
          else if (random() < catchy * (sp < 560 ? 1 : 0.45)) d = 'catch';
          else d = 'dodge';
          st.decided.set(i, d);
        }
        // pegada: aperta pouco antes de chegar (janela menor com bola rápida)
        const catchLead = 0.05 + skill * 0.1 + (random() - 0.5) * (1 - skill) * 0.25;
        if (d === 'catch' && tt <= Math.max(0.03, catchLead) && me.catchCd <= 0 && me.st !== 'catch') {
          st.decided.set(i, 'done');
          return { ...out, act: 'grab' };
        }
        if (d === 'dodge' && tt <= 0.1 + skill * 0.12 && me.dodgeCd <= 0) {
          st.decided.set(i, 'done');
          // perpendicular à bola, para o lado com mais espaço
          let px = -b.vy / sp;
          let py = b.vx / sp;
          const side = px * rx + py * ry;
          if (side < 0) { px = -px; py = -py; }
          if ((me.y < 60 && py < 0) || (me.y > QM.H - 60 && py > 0)) { px = -px; py = -py; }
          return { ...out, act: 'dodge', dx: Math.round(px * 100) / 100, dy: Math.round(py * 100) / 100 };
        }
      }
    }

    // ---------- com a bola: chega perto da linha e arremessa ----------
    if (me.hold >= 0) {
      if (st.holdSince == null) {
        st.holdSince = now;
        st.holdDelay = 0.35 + random() * (1.3 - skill * 0.6);
      }
      const target = pickTarget(me, enemies, random);
      const rush = view.level ? view.level.holdMax - 0.6 : 3.5;
      if (target && (now - st.holdSince >= st.holdDelay || me.holdT > rush)) {
        st.holdSince = null;
        return { ...out, act: 'throw', ...aim(me, target, skill, random) };
      }
      // avança até a linha (ou a frente do cemitério) para arremessar de perto
      if (!me.cem) {
        const front = me.team === 'a' ? hi - 40 : lo + 40;
        out.mx = clamp((front - me.x) / 60, -1, 1);
      }
      out.my = target ? clamp((target.y - me.y) / 120, -0.6, 0.6) : 0;
      return out;
    }
    st.holdSince = null;

    // ---------- sem bola: corre para a bola solta do meu lado ----------
    let best = null;
    for (const b of balls) {
      if (b.st !== 'loose' || b.x < lo - 30 || b.x > hi + 30) continue;
      const d = Math.hypot(b.x - me.x, b.y - me.y);
      if (!best || d < best.d) best = { b, d };
    }
    if (best) {
      if (best.d < (view.level?.grabR ?? 40) * 0.85 && now - st.lastAct > 0.15) {
        st.lastAct = now;
        return { ...out, act: 'grab' };
      }
      const dx = best.b.x - me.x;
      const dy = best.b.y - me.y;
      const n = Math.hypot(dx, dy) || 1;
      return { mx: dx / n, my: dy / n };
    }

    // ---------- passeia: longe da linha quando o adversário tem bola ----------
    const enemyArmed = players.some((p) => p.team !== me.team && p.hold >= 0);
    if (now - st.wander.at > 0.8 + random() * 1.2) {
      st.wander = { y: QM.R + random() * (QM.H - QM.R * 2), at: now };
    }
    if (!me.cem) {
      const back = me.team === 'a' ? lo + 60 : hi - 60;
      const tx = enemyArmed ? back : (lo + hi) / 2;
      out.mx = clamp((tx - me.x) / 80, -1, 1) * 0.8;
    }
    out.my = clamp((st.wander.y - me.y) / 80, -1, 1) * 0.8;
    return out;
  };
}

function pickTarget(me, enemies, random) {
  if (!enemies.length) return null;
  // mais perto (às vezes outro, para não ficar previsível)
  const sorted = [...enemies].sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  return sorted.length > 1 && random() < 0.3 ? sorted[1] : sorted[0];
}

// mira com antecipação do movimento + erro conforme a habilidade; clica além do alvo (mais força)
function aim(me, t, skill, random) {
  const d = Math.hypot(t.x - me.x, t.y - me.y);
  const flight = d / 650;
  let x = t.x + (t.vx || 0) * flight * skill;
  let y = t.y + (t.vy || 0) * flight * skill;
  const err = (1 - skill) * 70;
  x += (random() - 0.5) * err;
  y += (random() - 0.5) * err;
  const dx = x - me.x;
  const dy = y - me.y;
  const n = Math.hypot(dx, dy) || 1;
  const extra = 60 + random() * 140;
  return {
    x: Math.round(clamp(x + (dx / n) * extra, 0, QM.W)),
    y: Math.round(clamp(y + (dy / n) * extra, 0, QM.H)),
  };
}

