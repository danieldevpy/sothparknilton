// Registro de temas da Corrida das Perguntas. Hoje só 🇺🇸 Inglês (escrito à mão / gerado de tabelas).
// Futuro: temas configuráveis pela sala e abastecidos por IA — um tema novo só precisa ter o formato de
// server/quiz/bank.js e passar em validateTheme() (ver docs/QUIZ_CONTENT.md). Temas inválidos não entram.

import { validateTheme } from './bank.js';
import { buildEnglish } from './en/index.js';

const THEMES = new Map();

export function registerTheme(theme, log = console.warn) {
  const { ok, errors } = validateTheme(theme);
  if (!ok) {
    log(`[quiz] tema "${theme?.id}" recusado: ${errors.length} erro(s), ex.: ${errors.slice(0, 3).join(' | ')}`);
    return false;
  }
  THEMES.set(theme.id, theme);
  return true;
}

registerTheme(buildEnglish());

export const DEFAULT_THEME = 'en';

export function getTheme(id) {
  return THEMES.get(id) || THEMES.get(DEFAULT_THEME);
}

// para a tela de criar sala: [{ id, name, flag, count }]
export function themeList() {
  return [...THEMES.values()].map((t) => ({ id: t.id, name: t.name, flag: t.flag, count: t.questions.length }));
}
