// IA simples de Karatê, usada pelo bot (scripts/ktbot.js) e pelo simulador de
// equilíbrio (scripts/karate-balance.js). Recebe o estado dos dois lutadores e
// devolve a entrada: { mx, my, block, act }.
//
// "Estilos" restringem os golpes usados — o simulador coloca um estilo contra o
// outro para ver se algum golpe sozinho domina (não deveria).

import { KT, MOVES, isFree, inReach } from '../shared/karate.js';

export const STYLES = {
  mixed: { jab: 1, punch: 0.6, kick: 0.9, hkick: 0.5, block: 0.55, dash: 1 },
  jabber: { jab: 1 },
  puncher: { punch: 1 },
  kicker: { kick: 1 },
  heavy: { hkick: 1 },
  turtle: { punch: 1, block: 0.9 },
};

export function createAi(style = 'mixed', { react = 0.2, rnd = Math.random } = {}) {
  const w = STYLES[style];
  const moves = Object.keys(MOVES).filter((m) => w[m]);
  // estilo misto escolhe o golpe pela distância (perto: socos; longe: chutes)
  const fit = (m, adx) => {
    if (style !== 'mixed' || adx == null) return w[m];
    const reach = MOVES[m].reach + KT.R;
    return w[m] * (adx > reach + 30 ? 0.3 : adx < reach * 0.55 ? 0.4 : 1.5);
  };
  const pick = (adx) => {
    const tot = moves.reduce((s, m) => s + fit(m, adx), 0);
    let r = rnd() * tot;
    for (const m of moves) if ((r -= fit(m, adx)) <= 0) return m;
    return moves[0];
  };
  const mem = { plan: pick(), nextAct: 0, decided: null, blockUntil: 0, creepAt: -1, creep: false };

  return function think(me, opp, clock) {
    const out = { mx: 0, my: 0, block: false, act: null };
    if (!isFree(me.st)) return out;
    const dx = opp.x - me.x;
    const adx = Math.abs(dx);
    const dy = opp.y - me.y;
    const toward = Math.sign(dx) || me.dir;

    // ameaça: oponente preparando um golpe que me alcança (percebida após o tempo de reação)
    const om = MOVES[opp.st];
    const threat = om && opp.t >= react && opp.t < om.startup + om.active && inReach(om, opp.x, opp.y, opp.dir, me.x, me.y);
    if (threat) {
      const key = `${opp.st}@${Math.round((clock - opp.t) * 10)}`; // um sorteio por golpe
      if (mem.decided !== key) {
        mem.decided = key;
        mem.defend = rnd() < (w.block ?? 0.25);
        mem.escape = w.dash && me.dashCd <= 0 && rnd() < 0.3;
      }
      if (mem.escape) {
        out.act = 'dash';
        out.mx = -toward;
        return out;
      }
      // contra o soco forte, bloquear é ruim: tenta interromper com soco fraco
      if (opp.st === 'punch' && w.jab && adx < MOVES.jab.reach + KT.R) {
        out.act = 'jab';
        return out;
      }
      if (mem.defend) {
        out.block = true;
        mem.blockUntil = clock + 0.3;
        return out;
      }
    }
    if (clock < mem.blockUntil) {
      out.block = true;
      return out;
    }

    // oponente vulnerável (recuperação de golpe, tonto): pune com o golpe mais forte que alcança
    const punishable = (om && opp.t >= om.startup + om.active) || opp.st === 'stun';
    if (punishable && clock >= mem.nextAct) {
      // só golpes que saem antes de ele se recuperar
      const remain = om ? om.startup + om.active + om.recovery - opp.t : KT.PARRY_STUN - opp.t;
      const best = moves
        .filter((m) => MOVES[m].startup <= remain + 0.03 && inReach(MOVES[m], me.x, me.y, toward, opp.x, opp.y))
        .sort((a, b) => MOVES[b].dmg - MOVES[a].dmg)[0];
      if (best) {
        out.act = best;
        mem.nextAct = clock + 0.05;
        return out;
      }
      // longe demais: entra com dash (o golpe seguinte vira INVESTIDA)
      if (w.dash && me.dashCd <= 0 && adx < KT.DASH_DIST + 70 && Math.abs(dy) < 30) {
        out.act = 'dash';
        out.mx = toward;
        return out;
      }
    }

    // tartaruga: espera na defesa quando perto
    if (style === 'turtle' && adx < 140 && opp.st !== 'block') out.block = rnd() < 0.85;

    const m = MOVES[mem.plan];
    // dentro do alcance do chute dele mas fora do meu golpe: avança defendendo
    const exposed = adx < MOVES.kick.reach + KT.R + 8 && !inReach(m, me.x, me.y, toward, opp.x, opp.y);
    if (w.block && exposed) {
      if (clock - mem.creepAt > 0.5) {
        mem.creepAt = clock;
        mem.creep = rnd() < w.block;
      }
      if (mem.creep) out.block = true;
    }
    const target = m.reach * (style === 'mixed' ? 0.85 : 0.7);
    if (adx > target + 6) out.mx = toward;
    else if (adx < target - 26) out.mx = -toward;
    if (Math.abs(dy) > 6) out.my = Math.sign(dy);
    if (out.block) out.mx *= 0.5;

    // fecha distância com dash
    if (w.dash && adx > 260 && me.dashCd <= 0 && rnd() < 0.05) {
      out.act = 'dash';
      out.mx = toward;
      return out;
    }

    if (clock >= mem.nextAct && inReach(m, me.x, me.y, toward, opp.x, opp.y) && Math.abs(dy) <= m.band - 2) {
      out.act = mem.plan;
      out.block = false;
      mem.nextAct = clock + 0.05 + rnd() * 0.35;
      mem.plan = pick(adx);
    }
    return out;
  };
}
