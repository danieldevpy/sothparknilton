# Nilton Park — memória do projeto

> Ponto de entrada para qualquer pessoa ou IA que vá mexer no projeto.
> Leia este arquivo primeiro; ele aponta para o resto em `docs/`.

## O que é
Jogo web multiplayer leve, estilo "sala de comunicação" (tipo Habbo), com visual
de **desenho tosco / recorte de papel** (bonecos de cabeça grande, gorro, olhos
grudados, movimentação engraçada). Começa com **1 mapa** (Praça Central: praça,
lago, área de sports). Minigames vêm depois.

Nome "Nilton Park" é provisório.

## Comandos
```bash
npm install          # única dependência: ws
npm start            # http://localhost:3000  (PORT=xxxx para trocar)
npm run dev          # reinicia o servidor ao salvar
npm test             # node:test — shared, Room e integração WS
node scripts/bots.js 5   # 5 bots andando/falando para testar multiplayer
node scripts/ggbot.js    # bot que aceita desafios de Gol a Gol (treino solo)
node scripts/ggbot.js Bot2 SeuNick   # bot que te desafia quando você entrar
node scripts/golagol-balance.js 250 skill   # simula % de gol (equilíbrio)
```
Sem build: o cliente é ES modules puro servido direto de `client/` e `shared/`.

## Mapa do código
| Pasta | Papel |
|---|---|
| `shared/` | Código **isomórfico** (Node + browser): constantes, protocolo, dados do mapa, colisão, A*, validação |
| `server/index.js` | HTTP estático + WebSocket `/ws` + loop de simulação (30 Hz) e snapshots (15 Hz) |
| `server/Room.js` | **Toda a regra da sala** (autoritativa) + convites de desafio. Não conhece WebSocket → testável |
| `server/minigames/GolAGol.js` | Partida de Gol a Gol (1x1, primeiro gol vence) — plugada no `Room` via `room.match` |
| `shared/golagol.js` | Constantes (`GG`) e física da bola do Gol a Gol, usadas no servidor e na mira do cliente |
| `client/js/minigames/golagol.js` | Cliente do Gol a Gol: convites, estado interpolado, predição, controles, mira, textos, revanche |
| `client/js/main.js` | Login (nick + visual), conexão, start |
| `client/js/game.js` | Estado do cliente, interpolação, câmera, loop de render, hit-test |
| `client/js/render/*` | Desenho procedural: `paint.js` (helpers), `character.js`, `world.js`, `bubbles.js`, `fx.js` |
| `client/js/hud.js` / `input.js` / `audio.js` | Interface DOM, controles, sons sintetizados |
| `client/js/mobile.js` | Interface mobile (estilo Roblox): detecção, joystick, botões de ação, painéis; ativa `body.mobile` |
| `client/assets/generated/` | Assets gerados por IA (Kairogen) — ver `docs/ASSETS.md` |
| `tests/` | Testes `node:test` |
| `scripts/` | `bots.js` (bots da sala), `ggbot.js` (bot de Gol a Gol), `golagol-balance.js` (simulador de equilíbrio) |

## Documentação (manter atualizada!)
- `docs/ARCHITECTURE.md` — como as peças conversam, ticks, interpolação
- `docs/PROTOCOL.md` — todas as mensagens WebSocket
- `docs/GAME_DESIGN.md` — visão, direção de arte, mapa, interações, emotes
- `docs/ASSETS.md` — pipeline de arte (procedural → sprites), assets gerados e prompts
- `docs/DECISIONS.md` — registro de decisões (ADR curto)
- `docs/ROADMAP.md` — backlog por fases com IDs
- `docs/DEVLOG.md` — diário de sessões (o que foi feito, quando)

## Regras de trabalho
1. **Servidor é autoritativo.** Cliente só pede (`move`, `interact`, `emote`, `chat`); o servidor valida e transmite.
2. **Regra de jogo nova vai em `server/Room.js`** + teste em `tests/room.test.js`.
3. **Mudou protocolo?** Atualize `shared/constants.js` (MSG), `docs/PROTOCOL.md` e, se quebrar compatibilidade, suba `PROTOCOL_VERSION`.
4. **Mapa é dado** (`shared/map.js`). Colisão/pathfinding derivam dele automaticamente.
5. **Arte é procedural por enquanto.** Ao trocar por sprite, mantenha a mesma função de desenho (`drawX(ctx, ...)`) como ponto de troca — ver `docs/ASSETS.md`.
6. Texto de usuário nunca vai para `innerHTML` (usar `textContent`) — chat é desenhado no canvas ou via `textContent`.
7. Cada sessão de trabalho: adicionar entrada em `docs/DEVLOG.md` e mover itens no `docs/ROADMAP.md`.
8. Código e docs em **português**; identificadores em inglês.
9. Rodar `npm test` antes de considerar algo pronto.
10. Mexeu em números do Gol a Gol (`GG` em `shared/golagol.js`)? Rode `scripts/golagol-balance.js` (rand e skill) e registre em DECISIONS.
11. Novo minigame: mesma interface do `GolAGol` (`has/handle/tick/forfeit/publicInfo`), regras no servidor, física/constantes em `shared/`.
12. **Mobile**: toda UI nova precisa funcionar em `body.mobile` (retrato e paisagem) — teste com `?mobile=1` e viewport 375×812 / 812×375. Controles de toque novos vão em `mobile.js` (botões em `#m-actions` com `data-show`).

## Estado atual
**v0.3.0 (2026-10-01)**: versão **mobile web** estilo Roblox (joystick, botões grandes, painéis recolhíveis,
Gol a Gol por toque, retrato e paisagem). Desktop inalterado.

**v0.2.0 (2026-10-01)**: minigame **Gol a Gol** — clique num player → desafiar → partida 1x1 no campinho
(chute com mira/força/efeito, goleiro com mergulho, textos/animações, revanche). Protocolo v2.

MVP v0.1.0 (2026-10-01): sala única multiplayer com login por nick, visual customizável,
andar por clique/teclado com pathfinding, chat com balões flutuantes estilo Habbo,
5 emotes, interações (fonte, bancos, postes, lago, patos, bola + placar). Ver `docs/DEVLOG.md`.
