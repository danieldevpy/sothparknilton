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
node scripts/ktbot.js                    # bot de Karatê (aceita desafios; estilos: mixed, jabber, kicker...)
node scripts/ktbot.js SenseiBot SeuNick  # bot que te desafia pro karatê quando você entrar
node scripts/karate-balance.js 40        # estilos de IA lutando entre si (equilíbrio dos golpes)
node scripts/fanbot.js 4                 # 4 bots de torcida: entram na plateia do Dojo quando há luta
./scripts/deploy.sh                      # PRODUÇÃO: testes + envia + docker compose na VPS (ver docs/DEPLOY.md)
node scripts/netcheck.js ws://204.157.124.113:3000/ws   # mede ping/jitter/travadas contra um servidor
node scripts/voice-e2e.mjs               # E2E do chat de voz (Chrome headless + mic falso; precisa `npm i --no-save puppeteer`)
ssh -t -p 45392 daniel@204.157.124.113 'sudo bash ~/servers/niltonpark/scripts/setup-domain.sh'   # domínio + HTTPS (1 vez)
```
Produção: **https://park.magmacursosltda.com.br** (HTTPS: microfone) e http://204.157.124.113:3000 (VPS, Docker) — operação em `docs/DEPLOY.md`.
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
| `server/minigames/Karate.js` | Luta de Karatê 1x1 num dojo separado (melhor de 3) — várias ao mesmo tempo via `room.fights` |
| `shared/karate.js` | Constantes (`KT`), tabela de golpes (`MOVES`) e movimento, usados no servidor e na predição do cliente |
| `client/js/minigames/karate.js` | Cliente do Karatê: cena do dojo, predição, controles teclado/toque, HUD de vida/dash, efeitos, sensei |
| `client/js/render/fighter.js` / `dojo.js` | Lutador de quimono (poses dos golpes) e cenário do dojo, procedurais |
| `shared/arena.js` | Plateia do Dojo: lotação, reações da torcida (`CHEERS`), ordem dos lugares |
| `client/js/minigames/arena.js` | Prédio do Dojo na praça: lutas ao vivo, painel "👀 Assistir", notificação de luta começando |
| `client/js/minigames/karate-watch.js` | Interface do espectador: AO VIVO, empolgação, locutor, torcida, outra luta, sair |
| `client/js/render/dojohouse.js` / `crowd.js` | Prédio do Dojo (fechado/AO VIVO) e torcida dentro do dojo, procedurais |
| `client/js/main.js` | Login (nick + visual), conexão, start |
| `client/js/game.js` | Estado do cliente, interpolação, câmera, loop de render, hit-test |
| `client/js/render/*` | Desenho procedural: `paint.js` (helpers), `character.js`, `world.js`, `bubbles.js`, `fx.js` |
| `client/js/hud.js` / `input.js` / `audio.js` | Interface DOM, controles, sons sintetizados |
| `client/js/jitter.js` | Atraso de interpolação adaptativo ao jitter da rede (praça, Gol a Gol, Karatê) |
| `Dockerfile` / `compose.yml` / `scripts/deploy.sh` | Produção na VPS: jogo + TURN do chat de voz (coturn) — ver `docs/DEPLOY.md` |
| `server/VoiceHub.js` | Chat de voz: grupos, convites/pedidos para entrar, mudo, repasse da sinalização WebRTC, credenciais TURN (`room.voice`) |
| `shared/voice.js` | Constantes (`VOICE`), textos de status, validação da sinalização, ajuste do Opus no SDP |
| `client/js/voice/` | `VoiceClient` (controle), `peer.js` (RTCPeerConnection), `mic.js` (microfone + WebAudio), `settings.js`, `ui.js` (painel, convites, configurações) + `client/voice.css` |
| `deploy/` + `scripts/setup-domain.sh` | Site do nginx do domínio (HTTPS) e instalador com certbot (rodar com sudo na VPS) |
| `client/js/mobile.js` | Interface mobile (estilo Roblox): detecção, joystick, botões de ação, painéis; ativa `body.mobile` |
| `client/assets/generated/` | Assets gerados por IA (Kairogen) — ver `docs/ASSETS.md` |
| `tests/` | Testes `node:test` |
| `scripts/` | `bots.js` (bots da sala), `ggbot.js` (bot de Gol a Gol), `golagol-balance.js` (simulador de equilíbrio), `ktbot.js` + `karate-ai.js` + `karate-balance.js` (bot/IA/simulador do Karatê) |

## Documentação (manter atualizada!)
- `docs/ARCHITECTURE.md` — como as peças conversam, ticks, interpolação
- `docs/PROTOCOL.md` — todas as mensagens WebSocket
- `docs/GAME_DESIGN.md` — visão, direção de arte, mapa, interações, emotes
- `docs/ASSETS.md` — pipeline de arte (procedural → sprites), assets gerados e prompts
- `docs/DECISIONS.md` — registro de decisões (ADR curto)
- `docs/ROADMAP.md` — backlog por fases com IDs
- `docs/DEVLOG.md` — diário de sessões (o que foi feito, quando)
- `docs/DEPLOY.md` — produção na VPS (Docker), deploy de uma vez, operação, jogabilidade pela internet

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
12. Mexeu em `KT`/`MOVES` (`shared/karate.js`)? Rode `scripts/karate-balance.js` — nenhum estilo de um golpe só deve vencer o `mixed` com folga — e registre em DECISIONS.
13. **Voz**: o áudio nunca passa pelo servidor do jogo (WebRTC P2P/TURN). Regra de grupo nova vai em `server/VoiceHub.js` + `tests/voice.test.js`; mexeu no cliente de voz, rode `scripts/voice-e2e.mjs`. O microfone só pode ficar aberto no grupo, testando ou com convite esperando.
14. **Mobile**: toda UI nova precisa funcionar em `body.mobile` (retrato e paisagem) — teste com `?mobile=1` e viewport 375×812 / 812×375. Controles de toque novos vão em `mobile.js` (botões em `#m-actions` com `data-show`).

## Estado atual
**v0.6.0 — Plateia do Dojo (2026-10-03)**: o 3º prédio da praça é o **Dojo**: com luta rolando ele
acende (AO VIVO) e o clique lista as lutas (`Nilton × Daniel — 👀 Assistir`); o espectador senta na plateia do dojo,
torce (placas, reações, coro, ola) e ouve o locutor, **sem poder interferir**. Notificação pequena quando uma luta começa.

**v0.5.0 (2026-10-03)**: **chat de voz por grupos** — clique num player → 🎙️ Chamar para conversar por voz (ou
🎧 Pedir para entrar, se ele já estiver num grupo). WebRTC em malha (até 8), TURN próprio (coturn), configurações de
áudio completas (dispositivos, volumes, ativação por voz / voz aberta / apertar para falar, eco/ruído/ganho, qualidade).
Microfone exige HTTPS → domínio `park.magmacursosltda.com.br`. Ver GAME_DESIGN e ARCHITECTURE.

**Karatê (branch `feature/karate`, 2026-10-01)**: minigame **Karatê 1x1** num **dojo separado** da praça
(clique num player → 🥋 Desafiar: Karatê). Soco fraco/forte, chute fraco/forte com vantagens próprias, defesa
(e defesa perfeita), dash a cada 3 s, melhor de 3 rounds, várias lutas simultâneas. Ver GAME_DESIGN.

**v0.3.0 (2026-10-01)**: versão **mobile web** estilo Roblox (joystick, botões grandes, painéis recolhíveis,
Gol a Gol por toque, retrato e paisagem). Desktop inalterado.

**v0.2.0 (2026-10-01)**: minigame **Gol a Gol** — clique num player → desafiar → partida 1x1 no campinho
(chute com mira/força/efeito, goleiro com mergulho, textos/animações, revanche). Protocolo v2.

MVP v0.1.0 (2026-10-01): sala única multiplayer com login por nick, visual customizável,
andar por clique/teclado com pathfinding, chat com balões flutuantes estilo Habbo,
5 emotes, interações (fonte, bancos, postes, lago, patos, bola + placar). Ver `docs/DEVLOG.md`.
