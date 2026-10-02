// Balões de chat estilo Habbo: aparecem sobre quem falou e vão "subindo"
// em fila. Cada mensagem nova empurra as antigas para cima.
// X acompanha o mundo (posição de quem falou no momento); Y é de tela.

import { roundRect, fillStroke, FONT, INK } from './paint.js';

const PAD_X = 10;
const LINE_H = 17;
const GAP = 6;
const MAX_W = 300;
const DRIFT_PX_S = 7; // subida contínua
const MAX_AGE_S = 28;

export class BubbleLayer {
  constructor() {
    this.items = [];
  }

  // anchorWorldX: x no mundo de quem falou; anchorScreenY: y na tela acima da cabeça
  add(ctx, { nick, text, color, hat }, anchorWorldX, anchorScreenY, now) {
    ctx.font = `400 14px ${FONT}`;
    const nickW = measureBold(ctx, `${nick}: `);
    const inner = MAX_W - PAD_X * 2 - 22;
    const lines = wrap(ctx, text, Math.max(80, inner - nickW));
    const w = Math.max(...lines.map((l, i) => ctx.measureText(l).width + (i === 0 ? nickW : 0))) + PAD_X * 2 + 22;
    const h = lines.length * LINE_H + 12;
    const b = { nick, lines, nickW, color, hat, wx: anchorWorldX, y: anchorScreenY - h, targetY: anchorScreenY - h, w, h, born: now };

    // empurra os balões existentes para cima (em cascata)
    const sorted = [...this.items].sort((a, c) => c.targetY - a.targetY);
    let limit = b.targetY - GAP;
    for (const it of sorted) {
      if (it.targetY + it.h > limit) it.targetY = limit - it.h;
      limit = Math.min(limit, it.targetY - GAP);
    }
    this.items.push(b);
  }

  update(dt, now) {
    for (const b of this.items) {
      b.targetY -= DRIFT_PX_S * dt;
      b.y += (b.targetY - b.y) * Math.min(1, dt * 10);
    }
    this.items = this.items.filter((b) => b.y + b.h > -10 && now - b.born < MAX_AGE_S * 1000);
  }

  draw(ctx, worldToScreenX, viewW, now) {
    for (const b of this.items) {
      const age = (now - b.born) / 1000;
      const alpha = Math.min(1, (MAX_AGE_S - age) / 3);
      const ax = worldToScreenX(b.wx);
      const x = Math.max(6, Math.min(viewW - b.w - 6, ax - b.w / 2));
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      // pop-in
      const pop = Math.min(1, age * 6);
      ctx.translate(x + b.w / 2, b.y + b.h);
      ctx.scale(0.7 + pop * 0.3, 0.7 + pop * 0.3);
      ctx.translate(-(x + b.w / 2), -(b.y + b.h));

      // rabinho apontando para quem falou (só no balão mais novo do falante)
      const tx = Math.max(x + 12, Math.min(x + b.w - 12, ax));
      ctx.beginPath();
      ctx.moveTo(tx - 6, b.y + b.h - 1);
      ctx.lineTo(tx, b.y + b.h + 8);
      ctx.lineTo(tx + 6, b.y + b.h - 1);
      ctx.closePath();
      fillStroke(ctx, '#ffffff', 2);

      roundRect(ctx, x, b.y, b.w, b.h, 9);
      fillStroke(ctx, '#ffffff', 2.5);
      // "avatar" bolinha com a cor do gorro/casaco
      ctx.beginPath();
      ctx.arc(x + 14, b.y + 14, 7, 0, Math.PI * 2);
      fillStroke(ctx, b.hat, 2);
      ctx.beginPath();
      ctx.arc(x + 14, b.y + 17, 3, 0, Math.PI);
      ctx.fillStyle = b.color;
      ctx.fill();

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      b.lines.forEach((line, i) => {
        let lx = x + PAD_X + 18;
        const ly = b.y + 6 + LINE_H / 2 + i * LINE_H;
        if (i === 0) {
          ctx.font = `700 14px ${FONT}`;
          ctx.fillText(`${b.nick}:`, lx, ly);
          lx += b.nickW;
        }
        ctx.font = `400 14px ${FONT}`;
        ctx.fillText(line, lx, ly);
      });
      ctx.restore();
    }
  }
}

function measureBold(ctx, s) {
  const f = ctx.font;
  ctx.font = `700 14px ${FONT}`;
  const w = ctx.measureText(s).width;
  ctx.font = f;
  return w;
}

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  // quebra palavras gigantes
  return lines.flatMap((l) => {
    if (ctx.measureText(l).width <= maxW) return [l];
    const out = [];
    let s = '';
    for (const ch of l) {
      if (ctx.measureText(s + ch).width > maxW) {
        out.push(s);
        s = ch;
      } else s += ch;
    }
    if (s) out.push(s);
    return out;
  });
}
