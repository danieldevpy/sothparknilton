// Diagnóstico de rede contra um servidor (local ou produção): mede ping (RTT) e o
// jitter dos snapshots, e simula quantos quadros o boneco ficaria "travado" (buffer de
// interpolação vazio) com o atraso fixo antigo vs. o atraso adaptativo (client/js/jitter.js).
//
// Uso: node scripts/netcheck.js [ws://204.157.124.113:3000/ws] [segundos=20]

import WebSocket from 'ws';
import { MSG, SNAPSHOT_HZ, INTERP_DELAY_MS } from '../shared/constants.js';
import { AdaptiveDelay } from '../client/js/jitter.js';

const URL = process.argv[2] || 'ws://204.157.124.113:3000/ws';
const SECS = Number(process.argv[3]) || 20;
const now = () => performance.now();

const ws = new WebSocket(URL);
const rtts = [];
const arrivals = [];
let started = 0;

ws.on('open', () => ws.send(JSON.stringify({ t: MSG.HELLO, nick: `netcheck${Math.floor(Math.random() * 900 + 100)}` })));
ws.on('error', (e) => { console.error(`✖ não conectou em ${URL}: ${e.message}`); process.exit(1); });
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.t === MSG.WELCOME) {
    started = now();
    console.log(`conectado em ${URL} — medindo ${SECS}s...`);
    const iv = setInterval(() => ws.send(JSON.stringify({ t: MSG.PING, n: now() })), 500);
    setTimeout(() => { clearInterval(iv); ws.close(); report(); }, SECS * 1000);
  } else if (m.t === MSG.PONG) rtts.push(now() - m.n);
  else if (m.t === MSG.SNAP) arrivals.push(now());
});

function pct(list, p) {
  const s = [...list].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : NaN;
}

// fração de quadros (60 fps) em que o tempo de render passou da última amostra recebida
function starvation(delayAt) {
  let frames = 0;
  let starved = 0;
  let i = 0;
  const end = arrivals[arrivals.length - 1];
  for (let t = arrivals[0] + 300; t < end; t += 1000 / 60) {
    while (i + 1 < arrivals.length && arrivals[i + 1] <= t) i++;
    frames++;
    if (t - delayAt(t) > arrivals[i]) starved++;
  }
  return (100 * starved) / Math.max(1, frames);
}

function report() {
  if (arrivals.length < 10) {
    console.log('poucos snapshots recebidos');
    process.exit(1);
  }
  const gaps = arrivals.slice(1).map((t, i) => t - arrivals[i]);
  const expected = 1000 / SNAPSHOT_HZ;
  const jit = gaps.map((g) => Math.abs(g - expected));
  // atraso adaptativo "ao vivo": evolui conforme as chegadas
  const ad = new AdaptiveDelay({ interval: expected, min: INTERP_DELAY_MS, max: 320 });
  const timeline = arrivals.map((t) => { ad.arrive(t); return [t, ad.get()]; });
  let k = 0;
  const adaptiveAt = (t) => {
    while (k + 1 < timeline.length && timeline[k + 1][0] <= t) k++;
    return timeline[k][1];
  };
  const fixed = starvation(() => INTERP_DELAY_MS);
  const adaptive = starvation(adaptiveAt);
  const f = (v) => `${Math.round(v)} ms`;
  console.log(`\nping (RTT):   mediana ${f(pct(rtts, 50))} · p95 ${f(pct(rtts, 95))} · máx ${f(Math.max(...rtts))}`);
  console.log(`snapshots:    ${arrivals.length} em ${((arrivals.at(-1) - started) / 1000).toFixed(1)}s · jitter p50 ${f(pct(jit, 50))} · p95 ${f(pct(jit, 95))}`);
  console.log(`travadas:     atraso fixo ${INTERP_DELAY_MS} ms → ${fixed.toFixed(1)}% dos quadros · adaptativo (fim ${f(ad.get())}) → ${adaptive.toFixed(1)}%`);
  const verdict = pct(rtts, 95) < 150 && adaptive < 2 ? '✔ boa para jogar' : pct(rtts, 95) < 300 ? '~ jogável' : '✖ ruim';
  console.log(`conexão:      ${verdict}`);
  process.exit(0);
}
