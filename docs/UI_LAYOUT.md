# UI_LAYOUT — onde cada coisa fica na tela (e como não sobrepor)

> Leia antes de desenhar qualquer HUD, painel, botão ou tela de minigame.
> Origem: na Corrida das Perguntas, em ligação de voz, os botões da sala cobriam os da voz (e vice-versa) e não dava
> para clicar (D-035). **Toda UI nova tem de ser testada com e sem ligação de voz.**

## Regra de ouro
1. **Cada canto da tela tem um dono.** Dois elementos clicáveis nunca ocupam o mesmo retângulo ao mesmo tempo.
2. **Teste sempre dois estados**: *sem ligação* e *em ligação* (`body.vc-on`), este com o **painel da voz aberto** e com
   o grupo cheio (8 pessoas — o painel rola por dentro, mas não cresce). Some também um **convite chegando** (voz, desafio).
3. **Teste sempre os 3 formatos**: desktop (1024×768 e 800×600), celular retrato (375×812 e 375×667) e paisagem (812×375),
   com `?mobile=1`. Veja nas fases em que a tela mais muda (lobby, pergunta, revelação, pódio, assistindo).
4. Prioridade quando algo *precisa* cobrir algo (só temporário): **convite > painel aberto pelo usuário > botões da tela >
   cena**. Nunca cobrir **botões de resposta/ação principal do minigame**.
5. Painel persistente (voz, chat) tem altura máxima que **termina antes** da área principal do minigame (ex.: a lousa) e
   rola por dentro; cabeçalho e botões de ação do painel ficam sempre visíveis.

## Como simular "em ligação" sem outra pessoa (console do navegador em localhost)
```js
const v = window.__voice, ids = [...v.game.players.keys()];
v.group = { id: 1, owner: v.me, members: ids.slice(0, 4).map((id) => ({ id })) };  // grupo de mentira
v.ui.render(true);          // põe body.vc-on, mostra 🎤 e prepara o painel
v.ui.togglePanel(true);     // abre o painel da voz (false fecha)
window.__game.hud.invite({ from: 999, key: 't', nick: 'Fulano', ttl: 60000, cls: 'voice',   // ttl em ms!
  title: '🎙️ Fulano te chamou!', sub: 'teste', onAccept() {}, onDecline() {} });             // convite
```
`DEBUG` (window.__game, __voice, __mobile) só existe em `localhost` ou com `?debug`.

## Classes no `<body>` que o CSS pode usar
| Classe | Quando | Quem liga |
|---|---|---|
| `mobile` | interface de celular | `mobile.js` |
| `qz-on` / `kt-on` / `qm-on` | dentro de uma sala de Quiz / Karatê / Queimada | cada minigame |
| `vc-on` | **em grupo de voz** (🎤 visível; o painel pode estar aberto) | `voice/ui.js` (`syncBody`) |
| `.m-panel:not([hidden])` | algum painel do celular aberto (use `body:has(...)`) | — |

## Camadas (z-index)
| z | O quê |
|---|---|
| 5 | `#hud` (pills, chat, convites, cartão do player) — **9 dentro do Quiz** (convites precisam ficar acima da lousa) |
| 6 | `#m-ui` (barra do celular + painéis) — **8 dentro do Quiz** |
| 7 | UI das salas: `#qz-ui`, `#kt-ui`, `#qm-ui`, `#kt-watch`; painel da voz no celular (8 dentro do Quiz) |
| 8 | `#ping`, notificações de salas (`*-notes`), painel da Escola |
| 12 | painel da voz no desktop (dentro do `#hud`) |
| 20–25 | resultado do Gol a Gol |
| 30 | `#invites` (dentro do `#hud`: só vale dentro dele) |
| 40 | configurações de áudio (modal) |

Atenção: `#hud`, `#m-ui` e `#*-ui` são contextos de empilhamento próprios — um `z-index: 30` dentro do `#hud` **não** passa
por cima de algo de z 7 fora dele. Se um elemento do HUD precisa ficar sobre a sala, suba o `#hud` (como o `quiz.css` faz).

## Mapa de zonas — Corrida das Perguntas (referência para os próximos minigames)
**Desktop (`body.qz-on`)**
```
┌ grupo (placar) ───────────────  [cena / lousa]  ─────── ➕Convidar 👀 🚪Sair ┐  y 12
│                                                          🎙️Voz · 🎤 · 🔊   │  y 56   (.top-right desce)
│ convites (esq.) y216                                      ping               │  y 98
│                                       [Convidar]  [painel da voz]            │  y 126  (painel acaba antes da lousa)
│ chat ───────┐                       ┌──── lousa (pergunta + A–D + cartas) ──┐ │
└─────────────┘                       └────────────────────────────────────────┘
```
**Celular retrato**: topo ☰ 💬 👥 🎙️ → nav (Convidar/👀/🚪) em y66 → 🎤 e ping na coluna da esquerda → painéis/convites
a partir de y112 → lousa embaixo (até 60% da altura). **Celular paisagem**: lousa na metade direita; nav embaixo à
esquerda, 🎤 logo acima dele; painéis/convites na esquerda (largura = tela − lousa); o 🎤 some enquanto um painel está aberto.

## Checklist antes de dar a UI como pronta
- [ ] Sem ligação e com `vc-on` (🎤, painel aberto, 8 membros): nada sobreposto, tudo clicável (teste com `document.elementFromPoint` no centro dos botões).
- [ ] Convite de voz chegando durante a tela: aparece por cima e é clicável, sem tapar a área principal.
- [ ] Desktop 1024×768 e 800×600; celular retrato 375×812 e 375×667; paisagem 812×375.
- [ ] Todos os estados da tela (lobby, jogando, revelação, pódio, plateia/assistindo).
- [ ] Painéis do celular (💬 👥 ☰ 🎙️) e o painel "Convidar" abertos: nenhum cobre o outro nem a área de resposta.
- [ ] Texto de usuário via `textContent`; botões ≥ 40 px de altura no celular.
- [ ] Anotou o mapa de zonas da tela nova aqui (ou em `GAME_DESIGN.md`).

## Pendências
- Karatê (`karate.css`) e Queimada (`queimada.css`) ainda não foram revisados com `vc-on` (ver ROADMAP T-361).
