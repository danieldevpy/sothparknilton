// Efeitos visuais de curta duração no espaço do mundo
// (moeda na fonte, pedra no lago, quack, pum, notas musicais, confete de gol).

import { blob, fillStroke, outlinedText, INK } from './paint.js';

export class FxLayer {
  constructor() {
    this.items = [];
  }

  add(kind, data, now) {
    this.items.push({ kind, ...data, born: now });
  }

  update(now) {
    this.items = this.items.filter((f) => (now - f.born) / 1000 < (DURATION[f.kind] ?? 1.5));
  }

  draw(ctx, now) {
    for (const f of this.items) {
      const age = (now - f.born) / 1000;
      const k = age / (DURATION[f.kind] ?? 1.5);
      ctx.save();
      DRAW[f.kind]?.(ctx, f, age, k);
      ctx.restore();
    }
  }
}

const DURATION = { big: 1.9, coin: 1.8, splash: 2.0, quack: 1.2, fart: 2.0, notes: 4.0, boing: 0.8, text: 1.6, confetti: 2.5 };

function arc(ax, ay, bx, by, k, height) {
  return [ax + (bx - ax) * k, ay + (by - ay) * k - Math.sin(k * Math.PI) * height];
}

const DRAW = {
  // texto gigante com "pop" e balançadinha (DEFENDEU!, NA TRAVE!, GOOOL!)
  big(ctx, f, age) {
    const pop = age < 0.18 ? 0.4 + (age / 0.18) * 0.9 : age < 0.3 ? 1.3 - ((age - 0.18) / 0.12) * 0.3 : 1;
    const fade = age > 1.4 ? Math.max(0, 1 - (age - 1.4) / 0.5) : 1;
    ctx.globalAlpha = fade;
    ctx.translate(f.x, f.y - age * 12);
    ctx.rotate(Math.sin(age * 9) * 0.05 + (f.tilt || -0.06));
    ctx.scale(pop, pop);
    outlinedText(ctx, f.text, 0, 0, { size: f.size || 44, fill: f.color || '#ffe14d', lw: 8 });
    if (f.sub) outlinedText(ctx, f.sub, 0, (f.size || 44) * 0.75, { size: 18, fill: '#ffffff', lw: 5 });
  },

  coin(ctx, f, age) {
    const fly = Math.min(1, age / 0.6);
    if (fly < 1) {
      const [x, y] = arc(f.fx, f.fy - 40, f.x, f.y - 10, fly, 90);
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 6 * Math.abs(Math.cos(age * 20)) + 1, 0, 0, Math.PI * 2);
      fillStroke(ctx, '#ffd23f', 2);
      return;
    }
    const s = age - 0.6;
    ctx.globalAlpha = Math.max(0, 1 - s / 1.2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 10 + s * 50;
      star(ctx, f.x + Math.cos(a) * r, f.y - 20 + Math.sin(a) * r * 0.6, 5);
    }
    outlinedText(ctx, 'plim! ✨', f.x, f.y - 70 - s * 30, { size: 18, fill: '#ffd23f' });
  },

  splash(ctx, f, age) {
    const fly = Math.min(1, age / 0.6);
    if (fly < 1) {
      const [x, y] = arc(f.fx, f.fy - 40, f.x, f.y, fly, 120);
      blob(ctx, x, y, 6, 5, 3, 0.15, 0, 8);
      fillStroke(ctx, '#888888', 2);
      return;
    }
    const s = age - 0.6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const r = s * 40 - i * 12;
      if (r <= 0) continue;
      ctx.globalAlpha = Math.max(0, 1 - s / 1.4);
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (s < 0.5) {
      ctx.fillStyle = '#bfe6ff';
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i / 6) * Math.PI;
        const d = s * 70;
        ctx.beginPath();
        ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 1.3 + s * s * 200, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = Math.max(0, 1 - s / 1.2);
    outlinedText(ctx, 'SPLASH!', f.x, f.y - 30 - s * 25, { size: 18, fill: '#bfe6ff' });
  },

  quack(ctx, f, age, k) {
    ctx.globalAlpha = 1 - k;
    outlinedText(ctx, 'QUACK!', f.x + Math.sin(age * 30) * 2, f.y - 40 - age * 30, { size: 20, fill: '#ffd23f' });
  },

  fart(ctx, f, age, k) {
    // nuvem verde atrás do boneco
    for (let i = 0; i < 4; i++) {
      const g = age - i * 0.12;
      if (g < 0) continue;
      ctx.globalAlpha = Math.max(0, 0.75 - k * 0.75);
      blob(ctx, f.x - f.dir * (22 + g * 30 + i * 6), f.y - 18 - g * 18 - i * 4, 12 + g * 14, 9 + g * 10, 900 + i, 0.15, Math.floor(age * 6), 12);
      fillStroke(ctx, '#9acd32', 2, '#5f8a1e');
    }
    ctx.globalAlpha = 1 - k;
    outlinedText(ctx, 'PFFFRRT!', f.x - f.dir * 40, f.y - 70 - age * 20, { size: 18, fill: '#b5e655' });
  },

  notes(ctx, f, age, k) {
    ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 3; i++) {
      const g = (age * 0.8 + i * 0.33) % 1;
      outlinedText(ctx, i % 2 ? '♪' : '♫', f.x + Math.sin(age * 3 + i * 2) * 26, f.y - 90 - g * 50, { size: 20, fill: '#ff6fb5' });
    }
  },

  boing(ctx, f, age, k) {
    ctx.globalAlpha = 1 - k;
    outlinedText(ctx, 'BOING!', f.x, f.y - 100 - age * 30, { size: 16, fill: '#ffffff' });
  },

  text(ctx, f, age, k) {
    ctx.globalAlpha = 1 - k;
    outlinedText(ctx, f.text, f.x, f.y - age * 30, { size: f.size || 16, fill: f.color || '#fff' });
  },

  confetti(ctx, f, age) {
    const colors = ['#e8412b', '#3a6fd8', '#ffd23f', '#2e9e48', '#ff6fb5'];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + i;
      const v = 120 + (i % 7) * 30;
      const x = f.x + Math.cos(a) * v * age;
      const y = f.y + Math.sin(a) * v * age * 0.7 + 160 * age * age - 40;
      ctx.globalAlpha = Math.max(0, 1 - age / 2.5);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, y, 6, 4);
    }
  },
};

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 ? r * 0.4 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  fillStroke(ctx, '#ffe36b', 1.5, INK);
}
