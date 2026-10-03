# DEVLOG

Diário de desenvolvimento. Entrada nova **no topo**. Formato:
`## AAAA-MM-DD — título` · o que foi feito · decisões · pendências.

## 2026-10-03 — Plateia do Dojo: assistir lutas de Karatê 👀 (branch `feature/arena`, worktree separado)
Feito em paralelo ao chat de voz (`feature/voice`), sem mexer na mecânica da luta (`KT`/`MOVES` intactos).

**Feito**
- Mapa: a 3ª casa virou o **prédio do Dojo** (`MAP.dojo`, porta andável em 1345,318); um pinheiro saiu da frente.
- Servidor: `room.watching`, `watchFight`/`unwatch` (entrar/sair/trocar, recusas `gone/full/busy`, limpeza no fim da
  luta, ao ir jogar e ao sair do jogo); `KarateFight.watchers` com lugares, `toArena` (estado/eventos para a plateia),
  `cheer` (limite 0,7 s, lado válido) e `kt_live` para todos. `shared/arena.js` (lotação 24, reações, ordem dos lugares).
- Cliente: `minigames/arena.js` (lista de lutas, clique no prédio, painel, notificação), `render/dojohouse.js` (prédio
  fechado/AO VIVO com teatro de sombras e onomatopeias), `render/crowd.js` (torcida: bonecos reais sentados, placas,
  pipoca, ola, coro, fila da frente de costas), `minigames/karate-watch.js` (letreiro AO VIVO, empolgação, locutor,
  reações, outra luta, sair), `KarateClient` com papel `watch`, `arena.css`, sons `kt_cheer`/`kt_notify`.
- `scripts/fanbot.js`: bots que entram na plateia e torcem. 7 testes novos (`tests/arena.test.js`), 57 no total.

**Verificado no navegador** (porta 3100, bots `ktbot` lutando + `fanbot`): dojo fechado/aberto, painel com 2 lutas,
notificação, entrar, torcer (teclas e botões, placa e coro), ola com empolgação alta, trocar de luta, sair (reaparece na
porta), fim por W.O. visto da plateia, visão do lutador com torcida, celular retrato 375×812 e paisagem 812×375
(câmera da plateia abre um pouco para a fila de trás aparecer sob as barras). Console sem erros.

**Merge**: o branch de voz mexe nas mesmas áreas de `Room.js`/`constants.js`; as inserções daqui foram postas em linhas
diferentes (import, construtor, `removePlayer`, `switch`) para o merge ser limpo. Docs (DEVLOG/ROADMAP/DECISIONS/CLAUDE.md)
podem conflitar só por serem entradas novas no mesmo lugar — manter as duas. D-021 pode precisar ser renumerada.

## 2026-10-01 — v0.3.0: versão mobile web (estilo Roblox)
**Feito**
- `client/js/mobile.js`: barra de ícones (☰ 💬 👥), painéis recolhíveis, joystick virtual, botões PULAR/😜 e grade de emotes,
  controles do Gol a Gol (CHUTAR segurar/soltar, ↺ ↻, 🧤⬆ 🧤⬇), dica contextual e aviso "gire o celular".
- CSS `body.mobile` (Fredoka, botões 3D coloridos, vidro escuro), áreas seguras, retrato e paisagem; login em 2 colunas deitado.
- Jogo: zoom mínimo maior no celular, câmera da partida sem prender na borda, `game.myServerPos()` para joystick/teclado,
  balões cortados sob a barra e só dos jogadores durante a partida no celular.

**Bugs achados nos testes e corrigidos**
- Formulário de login enviava nativamente se tocado antes do JS carregar (rede lenta) → `onsubmit="return false"`.
- Joystick usava posição renderizada (atrasada) e "dava ré" ao soltar → usa posição do servidor e para à frente.
- Tela de derrota atrasada aparecia por cima de uma nova partida → timer cancelado no início da partida.
- Em paisagem o gol direito ficava atrás dos botões → câmera centraliza o campo.

**Testado** (emulação 375×812 com toque e 812×375): login, joystick (andar e parar), emotes, chat (enviar + badge),
online, menu, cartão do player, desafio, goleiro (joystick + mergulho), chutador (mirar tocando, efeito, CHUTAR),
partida inteira até "VOCÊ PERDEU!" e revanche por toque. Desktop conferido com `?mobile=0`. 32 testes passando.

## 2026-10-02 — v0.4.0 em produção na VPS 🚀 (http://204.157.124.113:3000)
**Feito**
- Karatê mergeado no `master` (fast-forward, sem conflitos). Versão 0.4.0.
- Produção: `Dockerfile` (node:22-alpine, usuário sem root, HEALTHCHECK), `compose.yml` (porta 3000, 256 MB, 1 CPU,
  só-leitura, logs rotativos, `restart: unless-stopped`), `scripts/deploy.sh` (testes → tar via SSH → `compose up --build`
  → confere `/health` pelo IP externo), `docs/DEPLOY.md`. A VPS tem outros sistemas — nada deles foi tocado.
- Rede: atraso de interpolação adaptativo (`client/js/jitter.js`) na praça/Gol a Gol/Karatê, extrapolação curta quando o
  buffer esvazia, ping na tela (`ping`/`pong`), predição do Karatê considerando o RTT, reconexão automática, vigia de
  carregamento contra `ERR_NETWORK_CHANGED`, gzip + ETag/304, limite de 12 conexões/IP, heartbeat 10 s, SIGTERM gracioso.
- `scripts/netcheck.js` (diagnóstico de rede). 50 testes.

**Verificado**: deploy pelo script (container `healthy`, 18 MB RAM, 0,75% CPU, demais containers no ar); acesso pelo IP
externo; luta de karatê em produção contra o bot (ping 74 ms); medição de dentro da VPS sem jitter; reconexão automática e
vigia de carregamento testados no navegador.
**Achado**: o Wi-Fi de casa (sinal 52%) tem 55% de perda até o roteador — explica as travadas/quedas daqui e o celular não
acessar o PC pela rede local. Pelo IP da VPS no 4G isso não acontece.

## 2026-10-01 — Minigame Karatê 🥋 (branch `feature/karate`, worktree separado)
**Feito**
- `shared/karate.js` (KT, MOVES, movimento), `server/minigames/Karate.js` (luta autoritativa), `Room`: desafio com
  `game`, `isBusy`, `fights`/`fightOf`, várias lutas simultâneas, lutadores congelados na praça (`pose 'dojo'`).
- 4 golpes com vantagens próprias + defesa/defesa perfeita + dash a cada 3 s; contra-ataque, investida, combo (4º derruba),
  previsível; troca justa de golpes simultâneos; melhor de 3; tempo; W.O.
- Cliente: `minigames/karate.js` (cena própria, predição, HUD, efeitos, sensei, revanche), `render/fighter.js`
  (quimono com poses), `render/dojo.js` (cenário + gongo + sensei), `karate.css`, sons sintetizados `kt_*`.
- Cartão do player ganhou "🥋 Desafiar: Karatê"; convite com título do minigame.
- Scripts: `ktbot.js` (bot que luta), `karate-ai.js` (IA com estilos), `karate-balance.js` (simulador). 17 testes novos (49 no total).

**Equilíbrio**: ver D-016/D-017 (troca justa, nerf do chute fraco e soco fraco, regra PREVISÍVEL).

**Verificado no navegador** (porta 3100, worktree): convite → dojo; andar, golpes, dash, defesa; CONTRA-ATAQUE, DERRUBOU!,
K.O. PERFEITO, rounds, tela de derrota com revanche, volta para a praça; espectador vê os dois sumirem e não recebe estado;
layout de celular deitado (joystick + botões); console sem erros.

**Merge**: feito a partir do commit-base `d9a3a86`; conflitos esperados só em docs (DEVLOG/ROADMAP/CLAUDE.md) e nas
linhas vizinhas de `game.js`/`input.js` se o trabalho mobile mexer nelas. Versão do `package.json` não foi alterada.

## 2026-10-01 — v0.2.0: minigame Gol a Gol
**Feito**
- Desafio clicando no player (cartão), convites com contagem regressiva, aceitar/recusar, status por toast.
- `server/minigames/GolAGol.js`: partida autoritativa 1x1 (countdown → mira → bola → resultado), primeiro gol vence, W.O.
- `shared/golagol.js`: constantes e física compartilhada (efeito, atrito, isolar, prévia da trajetória).
- Cliente `client/js/minigames/golagol.js`: estado interpolado, predição do goleiro/marca, controles mouse/teclado/toque,
  mira privada com trajetória, barra de força ⭐, textos gigantes, confete, tremida de tela, câmera enquadrando o campo.
- Novas poses do boneco: goleiro, mergulho, caído, chute. Novos sons: chute, defesa, trave, apito, torcida, vaia, vitória, derrota.
- Tela de fim com revanche (convite "🔥 quer REVANCHE!").
- `scripts/ggbot.js` (bot que joga) e `scripts/golagol-balance.js` (simulador). Protocolo → v2.
- Testes: 32 passando (12 novos do minigame).

**Equilíbrio**: 1ª versão dava ~0,5% de gol por chute contra goleiro reativo → ajustado (D-012, D-013).

**Verificado no navegador**: desafio → convite → partida contra o bot; mira, força, chute 83% ⭐, ESPALMOU, ISOLOU,
mergulho/caído do goleiro, GOL CONTRA com confete, tela de derrota com "Pedir revanche!", tela de vitória e convite de revanche.
Obs.: com o painel do navegador oculto os timers ficam lentos — testes automatizados precisam simular o tempo de carga.

## 2026-10-01 — MVP v0.1.0: sala de comunicação
**Feito**
- Estrutura do projeto (Node + ws, cliente ES modules sem build, `shared/` isomórfico).
- Servidor autoritativo (`Room`): players, A* em grade de 20 px com suavização, chat com cooldown,
  emotes, interações pendentes (fonte/banco/poste/lago/pato), bola com física e gols.
- Cliente: login com preview animado, render procedural "paint" com linha tremida, boneco recortado
  com animações (hop, pulo torto, dança, pum), balões estilo Habbo, efeitos, neve, sons WebAudio, HUD.
- Asset gerado via Kairogen (`z-image-turbo`): fundo da tela de login.
- 20 testes (`npm test`) passando; `scripts/bots.js` para simular players.
- Docs: CLAUDE.md, ARCHITECTURE, PROTOCOL, GAME_DESIGN, ASSETS, DECISIONS (D-001..D-008), ROADMAP.

**Verificado no navegador**: login → entrada na praça; 3 players simultâneos se vendo; balões empilhando;
moeda na fonte, poste alternando, sentar no banco, pedra no lago, dança/pum, chute da bola. Render ~0,5 ms/frame.

**Pendências / próximos passos**: ver Fase 1 do ROADMAP (reconexão automática, cartão de player, mobile).
