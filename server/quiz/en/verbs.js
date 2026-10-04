// Verbos irregulares → perguntas de passado, particípio, frase no passado, significado e "de qual verbo?".
// Linha: "base|passado|particípio|significado|nível|frase com ___ no passado|erradas do passado (;)|nota"
// As erradas do passado são as "pegadinhas" clássicas (bought × brought, thought × taught, fell × felt...).

import { slug } from '../bank.js';

const TABLE = `
go|went|gone|ir|1|Yesterday we ___ to the beach.|goed;gone;wented
come|came|come|vir|1|She ___ home late last night.|comed;come;camed
see|saw|seen|ver|1|I ___ a shooting star last night.|seed;seen;sawed
eat|ate|eaten|comer|1|He ___ the whole pizza by himself!|eated;eaten;aten
drink|drank|drunk|beber|1|I ___ two glasses of water this morning.|drinked;drunk;dranked
have|had|had|ter|1|We ___ pizza for dinner last night.|haved;has;hadded
do|did|done|fazer|1|I ___ my homework before dinner.|doed;done;didded
get|got|gotten|conseguir, receber|1|I ___ a new phone for my birthday.|getted;gotten;gat|No inglês americano o particípio é "gotten"; no britânico, "got".
give|gave|given|dar|1|My mom ___ me a new bike.|gived;given;gaved
make|made|made|fazer, fabricar|1|She ___ a cake for the party.|maked;maded;mode
take|took|taken|pegar, levar|1|I ___ a lot of photos on my trip.|taked;taken;tooked
say|said|said|dizer|1|He ___ "hello" and smiled.|sayed;sayd;sed
know|knew|known|saber, conhecer|1|I ___ the answer, but I forgot it!|knowed;known;knewed
think|thought|thought|pensar|1|I ___ it was a good idea.|thinked;thank;taught|Cuidado: "taught" é o passado de teach (ensinar).
buy|bought|bought|comprar|1|We ___ new shoes at the mall.|buyed;brought;boughted|Pegadinha clássica: bought = comprou · brought = trouxe.
bring|brought|brought|trazer|2|She ___ cookies to school.|bringed;bought;brang|Pegadinha clássica: brought = trouxe · bought = comprou.
find|found|found|encontrar, achar|1|I ___ my keys under the sofa.|finded;fond;founded|"Founded" existe, mas é passado de found (fundar).
write|wrote|written|escrever|1|He ___ a letter to his grandma.|writed;written;wrot
run|ran|run|correr|1|She ___ five kilometers yesterday.|runned;run;rang
put|put|put|colocar|1|I ___ the keys on the table.|putted;pat;puted|Put não muda: put → put → put.
cut|cut|cut|cortar|1|She ___ the cake into eight pieces.|cutted;cat;cuted|Cut não muda: cut → cut → cut.
sleep|slept|slept|dormir|1|I ___ ten hours last night!|sleeped;slepted;slep
read|read|read|ler|2|I ___ that book last year.|readed;red;rode|Escreve igual, mas o passado se pronuncia "red".
swim|swam|swum|nadar|2|We ___ in the lake last summer.|swimmed;swum;swimed
sing|sang|sung|cantar|2|They ___ "Happy Birthday" to me.|singed;sung;sanged
speak|spoke|spoken|falar|2|She ___ to the teacher after class.|speaked;spoken;spake
tell|told|told|contar, dizer|2|Grandpa ___ us a funny story.|telled;tolded;tald
sit|sat|sat|sentar|2|He ___ on the bench in the square.|sitted;set;sated
stand|stood|stood|ficar de pé|2|We ___ in line for an hour.|standed;stand;stooded
meet|met|met|conhecer (alguém), encontrar|2|I ___ my best friend at school.|meeted;mat;metted
leave|left|left|sair, deixar|2|The bus ___ at 7 o'clock.|leaved;lefted;lift
lose|lost|lost|perder|2|I ___ my wallet on the bus.|losed;losted;loose|"Loose" (solto, frouxo) não é verbo: lose → lost.
win|won|won|ganhar, vencer|2|Our team ___ the game!|winned;wan;wone|"Won" se pronuncia igual a "one".
pay|paid|paid|pagar|2|I ___ for dinner last night.|payed;pait;paided|Pay → paid (não "payed").
send|sent|sent|enviar|2|I ___ you a message this morning.|sended;sant;sented
spend|spent|spent|gastar, passar (tempo)|2|We ___ all our money at the fair.|spended;spant;spented
build|built|built|construir|2|They ___ a snowman in the square.|builded;bilt;builted
feel|felt|felt|sentir|2|I ___ sick yesterday.|feeled;fell;felted|Cuidado: "fell" é o passado de fall (cair).
keep|kept|kept|manter, guardar|2|She ___ the secret for years.|keeped;kepted;kap
begin|began|begun|começar|2|The movie ___ at 8 pm.|beginned;begun;begon
break|broke|broken|quebrar|2|He ___ his arm playing soccer.|breaked;broken;brake
choose|chose|chosen|escolher|2|She ___ the red dress.|choosed;chosen;chosed
drive|drove|driven|dirigir|2|My dad ___ us to school.|drived;driven;drave
fall|fell|fallen|cair|2|I slipped on the ice and ___.|falled;fallen;felt|Cuidado: "felt" é o passado de feel (sentir).
fly|flew|flown|voar|2|The bird ___ away.|flied;flown;flyed
forget|forgot|forgotten|esquecer|2|I ___ my homework at home!|forgetted;forgotten;forgat
grow|grew|grown|crescer|2|The tree ___ very fast.|growed;grown;grewed
ride|rode|ridden|andar (de bicicleta, a cavalo)|2|I ___ my bike to the park.|rided;ridden;rid
throw|threw|thrown|arremessar, jogar|2|She ___ the ball to me.|throwed;thrown;through|"Through" (através) soa parecido, mas não é verbo.
wear|wore|worn|vestir, usar (roupa)|2|He ___ a funny hat to the party.|weared;worn;ware
wake|woke|woken|acordar|2|I ___ up at 6 am today.|waked;woken;wok
understand|understood|understood|entender|2|I ___ everything the teacher said.|understanded;understand;understooded
teach|taught|taught|ensinar|2|My mom ___ me how to cook.|teached;thought;tought|Cuidado: "thought" é o passado de think (pensar).
catch|caught|caught|pegar (no ar)|2|The goalkeeper ___ the ball.|catched;cought;caughted
draw|drew|drawn|desenhar|2|He ___ a funny picture of the teacher.|drawed;drawn;drow
hold|held|held|segurar|2|She ___ the baby in her arms.|holded;hild;helded
hurt|hurt|hurt|machucar|2|I ___ my knee yesterday.|hurted;hort;hurten|Hurt não muda: hurt → hurt → hurt.
sell|sold|sold|vender|2|They ___ their old car.|selled;sould;solded
hear|heard|heard|ouvir|2|I ___ a strange noise last night.|heared;herd;hearded
become|became|become|tornar-se|2|She ___ a doctor in 2020.|becomed;become;becamed
let|let|let|deixar, permitir|2|My parents ___ me stay up late.|letted;lat;lets|Let não muda: let → let → let.
shoot|shot|shot|atirar, chutar (a gol)|2|He ___ the ball into the goal!|shooted;shoot;shotted
lend|lent|lent|emprestar|3|He ___ me his bike.|lended;lant;lented
hide|hid|hidden|esconder|3|The kids ___ behind the tree.|hided;hidden;hode
ring|rang|rung|tocar (campainha, telefone)|3|The phone ___ at midnight.|ringed;rung;runged
rise|rose|risen|subir, nascer (o sol)|3|The sun ___ at 6 am.|rised;risen;raised|"Raised" é de raise (levantar algo): o sol "rose".
shake|shook|shaken|sacudir, apertar (a mão)|3|He ___ my hand.|shaked;shaken;shooked
steal|stole|stolen|roubar|3|Someone ___ my bike!|stealed;stolen;stold
fight|fought|fought|lutar, brigar|3|The two karate students ___ in the dojo.|fighted;fougth;faught
freeze|froze|frozen|congelar|3|The lake ___ last winter.|freezed;frozen;frize
bite|bit|bitten|morder|3|The dog ___ the mail carrier.|bited;bitten;bote
blow|blew|blown|soprar|3|She ___ out the candles.|blowed;blown;blue|"Blue" (azul) tem o mesmo som de "blew".
feed|fed|fed|alimentar, dar comida|3|I ___ the ducks at the lake.|feeded;feded;fad
hang|hung|hung|pendurar|3|We ___ the pictures on the wall.|hanged;hang;hunged|"Hanged" só se usa para enforcar; quadros: hung.
lead|led|led|liderar, conduzir|3|The guide ___ us through the forest.|leaded;lead;lad|"Lead" (chumbo) se pronuncia "led" — mas o passado escreve led.
mean|meant|meant|significar, querer dizer|3|I ___ what I said.|meaned;ment;meanted
forgive|forgave|forgiven|perdoar|3|She ___ him for being late.|forgived;forgiven;forgaved
dig|dug|dug|cavar|3|The dog ___ a hole in the garden.|digged;dag;dugged
sink|sank|sunk|afundar|3|The Titanic ___ in 1912.|sinked;sunk;sanked
tear|tore|torn|rasgar|3|He ___ his jeans on the fence.|teared;torn;tare
stick|stuck|stuck|grudar|3|The gum ___ to my shoe.|sticked;stack;stucked
sting|stung|stung|picar (abelha)|3|A bee ___ me on the arm.|stinged;stang;stunged
slide|slid|slid|escorregar, deslizar|3|The penguin ___ on the ice.|slided;slode;slidded
spin|spun|spun|girar|3|The dancer ___ around and around.|spinned;spinded;spunned
bend|bent|bent|dobrar, curvar|3|He ___ the spoon with his mind!|bend;bant;bented
swear|swore|sworn|jurar|3|I ___ I didn't do it!|sweared;sworn;sware
seek|sought|sought|procurar, buscar|3|They ___ help from the police.|seeked;sougth;soughted
`;

export function parseVerbs(text = TABLE) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const [base, past, part, pt, lvl, sentence, wrong, note = ''] = l.split('|').map((s) => s.trim());
    return { base, past, part, pt, lvl: Number(lvl), sentence, wrong: wrong.split(';').map((s) => s.trim()), note };
  });
}

// "regulariza" errado de propósito (goed, flied, maked): o erro mais comum de quem está aprendendo
export function fakeRegular(base) {
  if (/[^aeiou]y$/.test(base)) return `${base.slice(0, -1)}ied`;
  if (/e$/.test(base)) return `${base}d`;
  return `${base}ed`;
}

// gerúndio (só para as erradas); os de 2 sílabas com consoante dobrada vão na mão
const ING = { begin: 'beginning', forget: 'forgetting', forgive: 'forgiving', become: 'becoming' };
function ingOf(base) {
  if (ING[base]) return ING[base];
  if (/ie$/.test(base)) return `${base.slice(0, -2)}ying`;
  if (/[^e]e$/.test(base)) return `${base.slice(0, -1)}ing`;
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(base)) return `${base}${base.at(-1)}ing`; // run → running
  return `${base}ing`;
}

function uniq(answer, list, n = 3) {
  const seen = new Set([answer.toLowerCase()]);
  const out = [];
  for (const w of list) {
    if (!w || seen.has(w.toLowerCase())) continue;
    seen.add(w.toLowerCase());
    out.push(w);
    if (out.length >= n) break;
  }
  return out;
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// outros do mesmo tipo, sorteio estável por verbo
function others(verbs, me, key, n) {
  const h = hashStr(me.base);
  const pool = verbs.filter((v) => v !== me && v[key].toLowerCase() !== me[key].toLowerCase());
  const out = [];
  for (let i = 0; out.length < n && i < pool.length * 2; i++) {
    const v = pool[(h + i * 7919) % pool.length];
    if (!out.includes(v[key])) out.push(v[key]);
  }
  return out;
}

export function verbQuestions() {
  const verbs = parseVerbs();
  const out = [];
  for (const v of verbs) {
    const id = slug(v.base);
    const tip = `${v.base} → ${v.past} → ${v.part} (${v.pt})${v.note ? ` · ${v.note}` : ''}`;
    out.push({
      id: `vrb:${id}:past`, cat: 'verbs', lvl: v.lvl,
      q: `Qual é o passado de "to ${v.base}"?`, a: v.past, w: uniq(v.past, v.wrong), tip,
    });
    out.push({
      id: `vrb:${id}:frase`, cat: 'verbs', lvl: v.lvl,
      q: `Complete no passado: "${v.sentence}" (${v.base})`,
      a: v.past,
      w: uniq(v.past, [v.base, v.part, fakeRegular(v.base), ingOf(v.base), ...v.wrong]),
      tip,
    });
    // get: "got" também é particípio no inglês britânico — a pergunta teria duas certas
    if (v.part !== v.past && v.base !== 'get') {
      out.push({
        id: `vrb:${id}:part`, cat: 'verbs', lvl: Math.min(3, v.lvl + 1),
        q: `Particípio de "to ${v.base}" (I have ___):`,
        a: v.part,
        w: uniq(v.part, [v.past, fakeRegular(v.base), ingOf(v.base), v.base]),
        tip,
      });
    }
    out.push({
      id: `vrb:${id}:pt`, cat: 'verbs', lvl: v.lvl,
      q: `O que significa "to ${v.base}"?`, a: v.pt, w: others(verbs, v, 'pt', 3), tip,
    });
    if (v.past !== v.base && v.lvl <= 2) {
      out.push({
        id: `vrb:${id}:de`, cat: 'verbs', lvl: v.lvl,
        q: `"${v.past}" é o passado de qual verbo?`, a: v.base, w: others(verbs, v, 'base', 3), tip,
      });
    }
  }
  return out;
}
