// Sanitização de entrada do usuário (usado no servidor; o cliente reaproveita
// para feedback imediato no formulário de login).

import { NICK_MIN, NICK_MAX, CHAT_MAX_LEN, PALETTE } from './constants.js';

// Letras (com acento), números, _ - . e espaço interno.
const NICK_RE = /^[\p{L}\p{N}_\-. ]+$/u;

export function sanitizeNick(raw) {
  if (typeof raw !== 'string') return null;
  const nick = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (nick.length < NICK_MIN || nick.length > NICK_MAX) return null;
  if (!NICK_RE.test(nick)) return null;
  return nick;
}

export function sanitizeChat(raw) {
  if (typeof raw !== 'string') return null;
  // remove caracteres de controle e colapsa espaços
  // eslint-disable-next-line no-control-regex
  const text = raw.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.slice(0, CHAT_MAX_LEN);
}

export function pickColor(value, list, fallbackIndex = 0) {
  return list.includes(value) ? value : list[fallbackIndex % list.length];
}

export function sanitizeLook(look = {}) {
  return {
    hat: pickColor(look.hat, PALETTE.hats, 0),
    shirt: pickColor(look.shirt, PALETTE.shirts, 0),
    skin: pickColor(look.skin, PALETTE.skins, 0),
  };
}
