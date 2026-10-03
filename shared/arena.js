// Plateia do Dojo: quem está na praça entra no prédio do Dojo e ASSISTE a uma luta de
// Karatê que esteja rolando. Espectador não interfere: não manda comandos de luta, só
// torce (reações com limite de frequência) e conversa — tudo desenhado fora do tatame.
// Usado no servidor (validação) e no cliente (botões, desenho da torcida).

export const ARENA = {
  MAX_WATCHERS: 24, // lugares na plateia de cada luta
  BACK_SEATS: 12, // fila de trás (bonecos inteiros, sentados); o resto vai para a fila da frente
  CHEER_COOLDOWN_MS: 700, // uma reação a cada 0,7 s por espectador
};

// Reações da torcida (ordem = teclas 1..5 no desktop). `go` = "VAI, FULANO!" (torce por um lado).
export const CHEERS = {
  go: { icon: '📣', label: 'Vai!' },
  clap: { icon: '👏', label: 'Palmas' },
  fire: { icon: '🔥', label: 'Fogo' },
  wow: { icon: '😱', label: 'Uau' },
  lol: { icon: '😂', label: 'Kkk' },
};

export const CHEER_IDS = Object.keys(CHEERS);

// Ordem dos lugares da fila de trás: do meio para as pontas (melhor vista primeiro).
export function seatOrder(n = ARENA.BACK_SEATS) {
  const mid = (n - 1) / 2;
  return [...Array(n).keys()].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
}
