// Helpers de desenho "estilo paint / papel recortado".
// Tudo é procedural: contorno preto grosso, cores chapadas e uma leve
// tremida ("boiling line") que muda ~6x por segundo para parecer desenhado à mão.
// Quando houver sprites prontos, basta trocar as funções draw* por drawImage.

export const INK = '#1b1b1b';
export const LINE = 3;

// Hash determinístico -> [0,1). Mesma entrada = mesma tremida.
export function hash(a, b = 0, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// "Quadro" da tremida: muda 6x por segundo.
export function boilFrame(t) {
  return Math.floor(t * 6);
}

// Elipse irregular (forma de recorte de papel).
export function blob(ctx, cx, cy, rx, ry, seed = 1, wob = 0.035, frame = 0, n = 22) {
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    const a = (k / n) * Math.PI * 2;
    const j = 1 + (hash(seed, k, frame) - 0.5) * 2 * wob;
    const x = cx + Math.cos(a) * rx * j;
    const y = cy + Math.sin(a) * ry * j;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Polígono com vértices tremidos.
export function wobblyPoly(ctx, pts, seed = 1, amp = 1.5, frame = 0) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const jx = (hash(seed, i, frame) - 0.5) * 2 * amp;
    const jy = (hash(seed + 7, i, frame) - 0.5) * 2 * amp;
    if (i === 0) ctx.moveTo(x + jx, y + jy);
    else ctx.lineTo(x + jx, y + jy);
  });
  ctx.closePath();
}

export function fillStroke(ctx, fill, lw = LINE, stroke = INK) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function shade(hex, amt) {
  // amt > 0 clareia, < 0 escurece
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export const FONT = '"Comic Neue", "Comic Sans MS", "Chalkboard SE", cursive';

export function outlinedText(ctx, text, x, y, { size = 14, fill = '#fff', stroke = INK, weight = 700, align = 'center', lw = 4 } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
