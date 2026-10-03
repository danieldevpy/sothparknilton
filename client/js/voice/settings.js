// Configurações de áudio do chat de voz (salvas no navegador).

const KEY = 'np.voice';

export const DEFAULTS = {
  micId: '', // '' = padrão do sistema
  outId: '', // '' = padrão do sistema (só navegadores com setSinkId)
  inputGain: 1, // 0..2 (volume do microfone)
  outputVol: 1, // 0..1 (volume geral das vozes)
  mode: 'vad', // 'open' (voz aberta) | 'vad' (ativação por voz) | 'ptt' (apertar para falar)
  vadDb: -50, // limiar da ativação por voz (dBFS): mais baixo = mais sensível
  pttKey: 'KeyB',
  echo: true, // cancelamento de eco
  noise: true, // supressão de ruído
  agc: true, // ganho automático
  quality: 'normal', // low | normal | high (ver VOICE.QUALITY)
  peerVol: {}, // nick -> 0..1 (volume de cada pessoa)
  muted: false,
};

// teclas que o jogo já usa (andar, emotes, Gol a Gol, Karatê) — não servem para "apertar para falar"
export const RESERVED_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Enter', 'Escape', 'Space', 'Tab',
  'KeyQ', 'KeyE', 'KeyJ', 'KeyZ', 'KeyU', 'KeyX', 'KeyK', 'KeyC', 'KeyI', 'KeyV', 'KeyL',
  'ShiftLeft', 'ShiftRight', 'KeyM',
]);

export function keyLabel(code) {
  if (!code) return '?';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return { Backquote: '`', CapsLock: 'Caps', ControlLeft: 'Ctrl', ControlRight: 'Ctrl dir.', AltLeft: 'Alt', AltRight: 'AltGr' }[code] || code;
}

export function loadSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* sem storage */ }
  const s = { ...DEFAULTS, ...saved, peerVol: { ...(saved.peerVol || {}) } };
  // valores corrompidos voltam ao padrão
  if (!['open', 'vad', 'ptt'].includes(s.mode)) s.mode = DEFAULTS.mode;
  if (!['low', 'normal', 'high'].includes(s.quality)) s.quality = DEFAULTS.quality;
  s.inputGain = clamp(Number(s.inputGain), 0, 2, DEFAULTS.inputGain);
  s.outputVol = clamp(Number(s.outputVol), 0, 1, DEFAULTS.outputVol);
  s.vadDb = clamp(Number(s.vadDb), -80, -10, DEFAULTS.vadDb);
  if (typeof s.pttKey !== 'string' || RESERVED_KEYS.has(s.pttKey)) s.pttKey = DEFAULTS.pttKey;
  return s;
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sem storage */ }
}

function clamp(v, lo, hi, def) {
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def;
}
