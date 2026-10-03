// Sons sintetizados com WebAudio (zero assets). Trocar por arquivos .ogg depois
// é só reimplementar `play(name)`.

let ac = null;
let muted = false;

try { muted = localStorage.getItem('np.muted') === '1'; } catch { /* sem storage */ }

export function unlockAudio() {
  if (ac) return;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; }
}

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('np.muted', muted ? '1' : '0'); } catch { /* ignore */ }
  return muted;
}

function tone({ type = 'square', from, to = from, dur = 0.15, vol = 0.08, delay = 0 }) {
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.3, vol = 0.1, freq = 800, delay = 0 }) {
  const t0 = ac.currentTime + delay;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ac.createBufferSource();
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  src.buffer = buf;
  f.type = 'lowpass';
  f.frequency.value = freq;
  g.gain.value = vol;
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t0);
}

const SOUNDS = {
  chat: () => tone({ type: 'sine', from: 880, to: 990, dur: 0.07, vol: 0.05 }),
  join: () => { tone({ type: 'triangle', from: 520, dur: 0.1 }); tone({ type: 'triangle', from: 780, dur: 0.12, delay: 0.1 }); },
  quack: () => { tone({ type: 'sawtooth', from: 520, to: 300, dur: 0.12, vol: 0.06 }); tone({ type: 'sawtooth', from: 500, to: 280, dur: 0.14, vol: 0.06, delay: 0.15 }); },
  splash: () => noise({ dur: 0.45, vol: 0.18, freq: 1400 }),
  coin: () => { tone({ type: 'square', from: 988, dur: 0.08, vol: 0.05 }); tone({ type: 'square', from: 1319, dur: 0.25, vol: 0.05, delay: 0.08 }); },
  fart: () => { tone({ type: 'sawtooth', from: 95, to: 60, dur: 0.55, vol: 0.12 }); noise({ dur: 0.5, vol: 0.06, freq: 300 }); },
  boing: () => tone({ type: 'sine', from: 200, to: 700, dur: 0.3, vol: 0.08 }),
  click: () => tone({ type: 'square', from: 300, dur: 0.04, vol: 0.03 }),
  goal: () => [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'square', from: f, dur: 0.18, vol: 0.06, delay: i * 0.12 })),
  lamp: () => tone({ type: 'square', from: 1500, to: 1200, dur: 0.05, vol: 0.04 }),
  // Gol a Gol
  kick: () => { tone({ type: 'sine', from: 160, to: 50, dur: 0.12, vol: 0.2 }); noise({ dur: 0.06, vol: 0.12, freq: 2500 }); },
  save: () => { noise({ dur: 0.12, vol: 0.2, freq: 900 }); tone({ type: 'triangle', from: 300, to: 200, dur: 0.1, vol: 0.06 }); },
  post: () => [880, 1320, 1760].forEach((f) => tone({ type: 'triangle', from: f, to: f * 0.98, dur: 0.6, vol: 0.05 })),
  whistle: () => { tone({ type: 'sine', from: 2100, to: 2300, dur: 0.18, vol: 0.06 }); tone({ type: 'sine', from: 2200, to: 2000, dur: 0.35, vol: 0.06, delay: 0.2 }); },
  crowd: () => { noise({ dur: 1.6, vol: 0.12, freq: 1200 }); noise({ dur: 1.2, vol: 0.08, freq: 600, delay: 0.3 }); },
  boo: () => { tone({ type: 'sawtooth', from: 180, to: 110, dur: 0.8, vol: 0.05 }); tone({ type: 'sawtooth', from: 150, to: 95, dur: 0.8, vol: 0.04, delay: 0.1 }); },
  tick: () => tone({ type: 'square', from: 660, dur: 0.08, vol: 0.05 }),
  go: () => tone({ type: 'square', from: 990, dur: 0.25, vol: 0.06 }),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone({ type: 'square', from: f, dur: 0.16, vol: 0.06, delay: i * 0.11 })),
  lose: () => [392, 370, 349, 262].forEach((f, i) => tone({ type: 'triangle', from: f, to: f * 0.97, dur: 0.35, vol: 0.07, delay: i * 0.3 })),
  invite: () => { tone({ type: 'square', from: 700, dur: 0.08, vol: 0.05 }); tone({ type: 'square', from: 1050, dur: 0.12, vol: 0.05, delay: 0.1 }); },
  // chat de voz
  vc_on: () => { tone({ type: 'sine', from: 660, dur: 0.09, vol: 0.06 }); tone({ type: 'sine', from: 990, dur: 0.14, vol: 0.06, delay: 0.09 }); },
  vc_off: () => { tone({ type: 'sine', from: 880, dur: 0.09, vol: 0.06 }); tone({ type: 'sine', from: 520, dur: 0.16, vol: 0.06, delay: 0.09 }); },
  vc_mute: () => tone({ type: 'triangle', from: 520, to: 300, dur: 0.1, vol: 0.06 }),
  vc_unmute: () => tone({ type: 'triangle', from: 300, to: 620, dur: 0.1, vol: 0.06 }),
  // Karatê
  kt_swing: () => noise({ dur: 0.1, vol: 0.06, freq: 3500 }),
  kt_hit: () => { tone({ type: 'square', from: 240, to: 90, dur: 0.07, vol: 0.1 }); noise({ dur: 0.07, vol: 0.18, freq: 1800 }); },
  kt_heavy: () => { tone({ type: 'sine', from: 150, to: 40, dur: 0.25, vol: 0.28 }); noise({ dur: 0.16, vol: 0.24, freq: 1300 }); },
  kt_block: () => { tone({ type: 'triangle', from: 620, to: 420, dur: 0.06, vol: 0.08 }); noise({ dur: 0.05, vol: 0.1, freq: 4000 }); },
  kt_parry: () => { tone({ type: 'sine', from: 1568, dur: 0.45, vol: 0.08 }); tone({ type: 'sine', from: 2093, dur: 0.55, vol: 0.06, delay: 0.06 }); },
  kt_break: () => { noise({ dur: 0.3, vol: 0.25, freq: 2600 }); tone({ type: 'sawtooth', from: 320, to: 60, dur: 0.3, vol: 0.1 }); },
  kt_dash: () => { noise({ dur: 0.16, vol: 0.09, freq: 5000 }); tone({ type: 'sine', from: 300, to: 900, dur: 0.12, vol: 0.04 }); },
  kt_down: () => { tone({ type: 'sine', from: 90, to: 38, dur: 0.35, vol: 0.3 }); noise({ dur: 0.3, vol: 0.14, freq: 500 }); },
  kt_gong: () => { [110, 166, 222].forEach((f, i) => tone({ type: 'sine', from: f, to: f * 0.98, dur: 2.2, vol: 0.13 - i * 0.03 })); noise({ dur: 0.35, vol: 0.08, freq: 900 }); },
  // plateia do Dojo
  kt_cheer: () => { noise({ dur: 0.5, vol: 0.06, freq: 1600 }); noise({ dur: 0.35, vol: 0.04, freq: 3200, delay: 0.08 }); },
  kt_notify: () => { tone({ type: 'triangle', from: 660, dur: 0.07, vol: 0.04 }); tone({ type: 'triangle', from: 990, dur: 0.1, vol: 0.04, delay: 0.08 }); },
  // Queimada
  qm_throw: () => { noise({ dur: 0.14, vol: 0.08, freq: 2800 }); tone({ type: 'sine', from: 500, to: 200, dur: 0.12, vol: 0.05 }); },
  qm_bounce: () => tone({ type: 'sine', from: 220, to: 120, dur: 0.1, vol: 0.12 }),
  qm_hit: () => { tone({ type: 'sine', from: 180, to: 50, dur: 0.22, vol: 0.26 }); noise({ dur: 0.18, vol: 0.22, freq: 1500 }); tone({ type: 'square', from: 900, to: 300, dur: 0.25, vol: 0.04, delay: 0.05 }); },
  qm_catch: () => { tone({ type: 'square', from: 520, dur: 0.07, vol: 0.06 }); tone({ type: 'square', from: 780, dur: 0.07, vol: 0.06, delay: 0.07 }); tone({ type: 'square', from: 1040, dur: 0.14, vol: 0.06, delay: 0.14 }); },
  qm_fumble: () => { tone({ type: 'sawtooth', from: 400, to: 180, dur: 0.25, vol: 0.06 }); },
  qm_whoosh: () => { noise({ dur: 0.35, vol: 0.12, freq: 4500 }); tone({ type: 'sine', from: 900, to: 300, dur: 0.3, vol: 0.04 }); },
  qm_grab: () => tone({ type: 'triangle', from: 440, to: 660, dur: 0.08, vol: 0.06 }),
  qm_enter: () => { tone({ type: 'triangle', from: 392, dur: 0.08, vol: 0.05 }); tone({ type: 'triangle', from: 587, dur: 0.12, vol: 0.05, delay: 0.09 }); },
  qm_revive: () => [392, 523, 659, 784].forEach((f, i) => tone({ type: 'sine', from: f, dur: 0.14, vol: 0.06, delay: i * 0.07 })),
};

export function play(name) {
  if (muted || !ac || !SOUNDS[name]) return;
  if (ac.state === 'suspended') ac.resume();
  try { SOUNDS[name](); } catch { /* ignore */ }
}
