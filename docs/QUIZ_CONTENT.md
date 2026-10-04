# Conteúdo da Corrida das Perguntas (temas e perguntas)

O banco fica **só no servidor** (`server/quiz/`). `shared/` é servido ao navegador em `/shared/*`: pergunta com
gabarito lá dentro seria cola de graça. O cliente recebe só o enunciado e as opções embaralhadas; a resposta certa
vai junto da revelação.

## Tema
```js
{
  id: 'en', name: 'Inglês', flag: '🇺🇸',
  cats: { vocab: { icon: '🔤', label: 'Vocabulário', weight: 26 }, ... },  // weight = chance relativa da categoria
  questions: [ { id, cat, lvl, q, a, w: [...], tip, sub? }, ... ],
}
```
Registrado em `server/quiz/themes.js` com `registerTheme(theme)`: se `validateTheme` achar erro, o tema é **recusado**
(loga o motivo) e a sala usa o tema padrão. Hoje existe só o 🇺🇸 Inglês (`server/quiz/en/`, ~2.700 perguntas).

## Pergunta
| Campo | Regra |
|---|---|
| `id` | único no tema, ≤ 80 caracteres, estável (não depende da posição no arquivo) |
| `cat` | uma das categorias do tema |
| `lvl` | 1 básico · 2 intermediário · 3 avançado |
| `q` | enunciado, 3–260 caracteres (texto puro: o cliente usa `textContent`) |
| `a` | resposta certa, ≤ 60 caracteres |
| `w` | erradas (≥ 1, ≤ 60 caracteres cada). Com **1 errada** a pergunta tem 2 opções (ex.: Certo/Errado — sempre nessa ordem). Com 3+ o jogo sorteia 2 (fácil) ou 3 (demais modos) a cada vez |
| `tip` | explicação mostrada na revelação, ≤ 220 caracteres — é aqui que se aprende |
| `sub` | opcional: subtema mostrado junto da categoria ("Vocabulário · comida 🍔") |

Opções repetidas (ignorando maiúsculas) ou a certa no meio das erradas = pergunta inválida.

## Como escrever boa pergunta
- **As erradas têm que ser erradas de verdade** naquela frase. "Have you ever ___ to London?" não pode ter `gone`
  entre as erradas (é aceitável no inglês americano). Na dúvida, troque a errada.
- Erradas **plausíveis**: o erro que um brasileiro cometeria (*goed*, *bought × brought*, *pretend = pretender*).
- Dica curta que ensina o porquê: "Depois de didn't o verbo volta à forma básica: I didn't go."
- Português do Brasil no enunciado e na dica; o inglês entre aspas.
- Nível pelo aluno brasileiro médio: 1 = escola/primeiro contato, 2 = conversa do dia a dia, 3 = pegadinha/avançado.

## Formatos compactos usados no tema Inglês
- **Linhas** (`parseLines`): `nível|pergunta|certa|errada1 ; errada2 ; errada3|dica` — gramática, situações,
  falsos cognatos, expressões, phrasal verbs, preposições, ortografia, números, pronúncia, certo/errado, leitura.
- **Vocabulário** (`en/vocab.js`): `português|inglês|nível|frase de exemplo` por tema (animais, comida...). Cada palavra
  vira 2 perguntas (PT→EN e EN→PT) com erradas do **mesmo tema**. Dentro de um tema não pode haver duas palavras com a
  mesma tradução; qualificador entre parênteses desfaz ambiguidade: `canela (da perna)|shin`.
- **Verbos irregulares** (`en/verbs.js`): `base|passado|particípio|significado|nível|frase com ___|erradas do passado|nota`
  → passado, frase no passado, particípio, significado e "de qual verbo?".
- **Opostos / britânico × americano** (`en/misc.js`): tabelas que geram as perguntas nos dois sentidos (oposto com dois
  significados possíveis é pulado automaticamente).

## Validar
```bash
npm test          # tests/quiz.test.js valida o banco inteiro (formato, ids, 3 níveis por categoria, ≥ 2000 perguntas)
```

## Futuro: temas configuráveis gerados por IA (T-356)
Plano: na criação da sala, escolher um tema existente **ou** digitar um assunto ("História do Brasil", "Química do
ensino médio"). O servidor pede a um modelo (ex.: Claude) um JSON neste formato, com um prompt que inclui estas regras
e exemplos, e:
1. passa o resultado em `validateTheme` (rejeita o que vier fora do formato);
2. descarta perguntas com erradas duvidosas (segunda chamada de revisão, pedindo para o modelo apontar ambiguidades);
3. guarda o tema em cache (arquivo/JSON) para reaproveitar sem gastar de novo;
4. registra com `registerTheme` e a sala usa normalmente.
A chave de API fica só no servidor (variável de ambiente), nunca no cliente.
