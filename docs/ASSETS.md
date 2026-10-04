# Assets e pipeline de arte

## Estratégia
1. **Agora (MVP): tudo procedural** em `client/js/render/*` — zero arquivos, leve, fácil de iterar.
2. **Depois: sprites** gerados (Kairogen) ou desenhados, entrando **um objeto por vez**.

### Como trocar um objeto procedural por sprite
Cada objeto tem uma função de desenho com a origem na **base** (pés/chão):
`drawTree`, `drawBench`, `drawLamp`, `drawFountain`, `drawBleachers`, `drawSign` (`render/world.js`),
`drawBall`, `drawDuck`, `drawCharacter` (`render/character.js`), `drawFighter` (`render/fighter.js`, karatê),
`prerenderDojo`/`drawGong`/`drawSensei` (`render/dojo.js`), `drawSchoolBuilding`/`drawSchoolLive` (`render/schoolhouse.js`)
e `prerenderClassroom`/`trackCanvas`/`drawTeacher`/`drawGift`/`drawTrophy`/`drawEraser`/`drawShieldBubble`/`drawFartCloud`
(`render/classroom.js`, Corrida das Perguntas).

O lutador é montado a partir de uma "pose" (inclinação, posição dos punhos e pés, olhos, boca) calculada por
estado/tempo do golpe em `poseOf()` — dá para trocar por sprites por pose (`jab`, `punch`, `kick`, `hkick`, `block`,
`hit`, `stun`, `down`, `ko`, `win`) mantendo a mesma assinatura.

```js
// exemplo: trocar a árvore
const treeImg = new Image();
treeImg.src = '/assets/sprites/tree.png';
function drawTree(ctx, tr) {
  if (treeImg.complete) ctx.drawImage(treeImg, tr.x - 50, tr.y - 120, 100, 124); // base no (x,y)
  else /* fallback procedural */;
}
```
Regras: PNG com fundo transparente, âncora na base central, tamanho ≈ ao procedural para não quebrar colisão.
Para personagens, a ideia é **papel recortado em partes** (cabeça, corpo, gorro, olhos, boca) para manter as
animações atuais (hop/tilt) e a customização por cor — usar sprites em tons de cinza + `globalCompositeOperation`
ou camadas por cor.

## Assets gerados

| Arquivo | Uso | Ferramenta / modelo | Data |
|---|---|---|---|
| `client/assets/generated/login-bg.png` (1024²) | Fundo da tela de login e direção de arte | Kairogen · `z-image-turbo` (1 crédito) | 2026-10-01 |

Prompt usado:
> Crude construction-paper cutout cartoon illustration of a small snowy mountain town square, with a stone fountain,
> a blue lake with ducks, a small soccer field with goals, pine trees and wooden benches. Flat bright colors, thick
> wobbly black outlines, childish MS Paint style, simple shapes, wide panoramic view, no people, no text

## Créditos Kairogen
Em 2026-10-01 restavam ~7 créditos após a geração acima. Modelo mais barato: `z-image-turbo` (1 crédito, 1:1).
Sugestão para os próximos assets: gerar **folhas de referência** (um objeto por imagem, fundo branco liso,
"isolated on white background") e recortar o fundo antes de usar.

## Sons
Sintetizados em `client/js/audio.js` (WebAudio). Para trocar por arquivos, reimplemente `play(name)` mantendo os nomes:
`chat, join, quack, splash, coin, fart, boing, click, goal, lamp` (+ Gol a Gol e `kt_swing, kt_hit, kt_heavy, kt_block,
kt_parry, kt_break, kt_dash, kt_down, kt_gong` do Karatê e `qz_lock, qz_right, qz_wrong, qz_hop, qz_hit, qz_block, qz_shield,
qz_gift, qz_card, qz_gold, qz_bell, qz_whoosh` da Corrida das Perguntas).

## Fonte
"Comic Neue" (Google Fonts), fallback Comic Sans MS.
