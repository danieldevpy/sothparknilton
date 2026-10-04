// Tema 🇺🇸 Inglês (para quem fala português): monta as categorias e todas as perguntas.
// `weight` = chance relativa de a categoria ser sorteada (não depende de quantas perguntas ela tem).

import { parseLines } from '../bank.js';
import { vocabQuestions } from './vocab.js';
import { verbQuestions } from './verbs.js';
import { GRAMMAR } from './grammar.js';
import { CONTEXT, FALSE_FRIENDS, IDIOMS, PHRASAL } from './usage.js';
import { PREPS, SPELLING, NUMBERS, SOUND, FIX, READING, oppositeQuestions, ukUsQuestions } from './misc.js';

export const CATS = {
  vocab: { icon: '🔤', label: 'Vocabulário', weight: 26 },
  grammar: { icon: '🧩', label: 'Gramática', weight: 14 },
  verbs: { icon: '⏰', label: 'Verbos irregulares', weight: 9 },
  context: { icon: '💬', label: 'Na prática', weight: 9 },
  false: { icon: '⚠️', label: 'Falso cognato', weight: 6 },
  idiom: { icon: '🎭', label: 'Expressão', weight: 6 },
  phrasal: { icon: '🔗', label: 'Phrasal verb', weight: 6 },
  prep: { icon: '📍', label: 'Preposição', weight: 5 },
  fix: { icon: '✅', label: 'Certo ou errado?', weight: 5 },
  spell: { icon: '✍️', label: 'Ortografia', weight: 3 },
  opposite: { icon: '🔁', label: 'Opostos', weight: 3 },
  numbers: { icon: '🔢', label: 'Números e horas', weight: 3 },
  sound: { icon: '🔊', label: 'Pronúncia', weight: 3 },
  read: { icon: '📖', label: 'Interpretação', weight: 3 },
  ukus: { icon: '🇬🇧', label: 'Britânico × americano', weight: 2 },
};

export function buildEnglish() {
  const questions = [
    ...vocabQuestions(),
    ...verbQuestions(),
    ...parseLines(GRAMMAR, 'grammar', 'gra'),
    ...parseLines(CONTEXT, 'context', 'ctx'),
    ...parseLines(FALSE_FRIENDS, 'false', 'fal'),
    ...parseLines(IDIOMS, 'idiom', 'idi'),
    ...parseLines(PHRASAL, 'phrasal', 'phr'),
    ...parseLines(PREPS, 'prep', 'pre'),
    ...parseLines(FIX, 'fix', 'fix'),
    ...parseLines(SPELLING, 'spell', 'spe'),
    ...oppositeQuestions(),
    ...parseLines(NUMBERS, 'numbers', 'num'),
    ...parseLines(SOUND, 'sound', 'snd'),
    ...parseLines(READING, 'read', 'rea'),
    ...ukUsQuestions(),
  ];
  return { id: 'en', name: 'Inglês', flag: '🇺🇸', cats: CATS, questions };
}
