// Banco de perguntas da Corrida das Perguntas: formato, validação e sorteio.
//
// Fica no SERVIDOR de propósito: o navegador só recebe a pergunta e as opções embaralhadas; a resposta
// certa vai junto da revelação. (shared/ é público em /shared/* — colocar o banco lá entregaria o gabarito.)
//
// Um TEMA é { id, name, flag, cats: {catId: {icon, label, weight}}, questions: [...] } e cada pergunta é
//   { id, cat, lvl (1 básico · 2 intermediário · 3 avançado), q (enunciado), a (resposta certa),
//     w: [erradas...] (≥ 1; com 1 só vira certo/errado), tip (explicação mostrada na revelação) }
// Temas novos (no futuro gerados por IA) só precisam passar em validateTheme(). Ver docs/QUIZ_CONTENT.md.

export const LIMITS = { Q: 260, OPT: 60, TIP: 220, ID: 80 };

// Linhas compactas usadas nos arquivos de conteúdo:  "nível|pergunta|certa|errada1 ; errada2 ; errada3|dica"
// `#` no começo = comentário. O id vem do texto da pergunta + resposta (não da posição): continua o mesmo
// quando linhas são adicionadas ou reordenadas.
export function parseLines(text, cat, prefix) {
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [lvl, q, a, w, tip = ''] = line.split('|').map((s) => s.trim());
    out.push({
      id: `${prefix}:${slug(q).slice(0, 40)}:${slug(a).slice(0, 24)}`,
      cat,
      lvl: Number(lvl),
      q,
      a,
      w: (w || '').split(';').map((s) => s.trim()).filter(Boolean),
      tip,
    });
  }
  return out;
}

export function slug(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 48);
}

// null = ok; senão o motivo
export function validateQuestion(q, cats = null) {
  if (!q || typeof q !== 'object') return 'não é objeto';
  if (typeof q.id !== 'string' || !q.id || q.id.length > LIMITS.ID) return 'id inválido';
  if (cats && !cats[q.cat]) return `categoria desconhecida: ${q.cat}`;
  if (![1, 2, 3].includes(q.lvl)) return `nível inválido: ${q.lvl}`;
  if (typeof q.q !== 'string' || q.q.length < 3 || q.q.length > LIMITS.Q) return 'enunciado vazio ou longo demais';
  if (typeof q.a !== 'string' || !q.a || q.a.length > LIMITS.OPT) return 'resposta certa inválida';
  if (!Array.isArray(q.w) || q.w.length < 1) return 'precisa de pelo menos 1 errada';
  const all = [q.a, ...q.w];
  if (all.some((o) => typeof o !== 'string' || !o || o.length > LIMITS.OPT)) return 'opção vazia ou longa demais';
  if (new Set(all.map((o) => o.toLowerCase())).size !== all.length) return 'opções repetidas';
  if (q.tip != null && (typeof q.tip !== 'string' || q.tip.length > LIMITS.TIP)) return 'dica longa demais';
  return null;
}

export function validateTheme(theme) {
  const errors = [];
  if (!theme?.id || !theme?.name) errors.push('tema sem id/nome');
  const cats = theme?.cats || {};
  const ids = new Set();
  for (const q of theme?.questions || []) {
    const err = validateQuestion(q, cats);
    if (err) errors.push(`${q?.id ?? '?'}: ${err}`);
    if (ids.has(q?.id)) errors.push(`${q.id}: id repetido`);
    ids.add(q?.id);
  }
  if (!theme?.questions?.length) errors.push('tema sem perguntas');
  return { ok: !errors.length, errors };
}

export function shuffle(list, rnd = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Opções que vão para a tela: a certa + `n - 1` erradas sorteadas, embaralhadas.
// Pergunta com 1 errada tem sempre 2 opções; "Certo / Errado" fica sempre nessa ordem.
export function buildOptions(q, n, rnd = Math.random) {
  if (q.w.length === 1) {
    const pair = [q.a, q.w[0]];
    const opts = pair.includes('Certo') && pair.includes('Errado') ? ['Certo', 'Errado'] : shuffle(pair, rnd);
    return { opts, ok: opts.indexOf(q.a) };
  }
  const wrong = shuffle(q.w, rnd).slice(0, Math.max(1, n - 1));
  const opts = shuffle([q.a, ...wrong], rnd);
  return { opts, ok: opts.indexOf(q.a) };
}

// Sorteia perguntas variando a categoria (não repete a última) e sem repetir pergunta na mesma sala
// enquanto houver inéditas daquela categoria/nível.
export class QuestionPicker {
  constructor(theme, rnd = Math.random) {
    this.theme = theme;
    this.rnd = rnd;
    this.byCat = new Map();
    for (const q of theme.questions) {
      if (!this.byCat.has(q.cat)) this.byCat.set(q.cat, []);
      this.byCat.get(q.cat).push(q);
    }
    this.used = new Set();
    this.lastCats = [];
  }

  pick(lvl) {
    const cat = this.pickCat(lvl);
    const pool = this.byCat.get(cat);
    let fresh = pool.filter((q) => !this.used.has(q.id));
    if (!fresh.length) {
      // categoria esgotada: libera as dela de novo
      for (const q of pool) this.used.delete(q.id);
      fresh = pool;
    }
    // nível pedido; senão o vizinho mais perto
    let best = [];
    for (const d of [0, 1, 2]) {
      best = fresh.filter((q) => Math.abs(q.lvl - lvl) === d);
      if (best.length) break;
    }
    const q = best[Math.floor(this.rnd() * best.length)];
    this.used.add(q.id);
    this.lastCats = [cat, ...this.lastCats].slice(0, 2);
    return q;
  }

  pickCat(lvl) {
    const cats = this.theme.cats;
    let ids = [...this.byCat.keys()].filter((c) => (cats[c]?.weight ?? 1) > 0);
    // evita repetir as 2 últimas categorias e categorias sem perguntas perto do nível
    const near = (c) => this.byCat.get(c).some((q) => Math.abs(q.lvl - lvl) <= 1);
    const ok = ids.filter((c) => !this.lastCats.includes(c) && near(c));
    if (ok.length) ids = ok;
    // categoria sem pergunta exatamente desse nível sai menos (no fácil não vira festival de idiom nível 2)
    const exact = (c) => this.byCat.get(c).some((q) => q.lvl === lvl && !this.used.has(q.id));
    const weight = (c) => (cats[c]?.weight ?? 1) * (exact(c) ? 1 : 0.35);
    const total = ids.reduce((s, c) => s + weight(c), 0);
    let x = this.rnd() * total;
    for (const c of ids) {
      x -= weight(c);
      if (x < 0) return c;
    }
    return ids[ids.length - 1];
  }
}
