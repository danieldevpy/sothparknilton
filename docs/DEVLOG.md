# DEVLOG

Diário de desenvolvimento. Entrada nova **no topo**. Formato:
`## AAAA-MM-DD — título` · o que foi feito · decisões · pendências.

## 2026-10-04 — v0.8.1: Quiz + menu do player em produção (worktree `claude/quiz-menu-production-deploy-465baf`)
Pedido: o Quiz (testado e aprovado em :3001) e o menu do player em 2 passos (testado em :3002) vão para a produção juntos;
analisar o que muda ao juntar e derrubar os servidores de teste.
- **Análise da junção**: três trabalhos soltos — v0.8.0 (commit 643fff7), ajuste de layout com voz (não commitado em
  `claude/quiz-game-layout-buttons-a66d6e`, era o que estava em :3001) e menu em 2 passos (não commitado em
  `claude/interaction-menu-steps-932f04`, :3002). Único conflito real: `Hud.playerCard` — o quiz acrescentou `onQuiz` + botão
  no cartão de 1 passo e o menu reescreveu o cartão. Resolvido pondo "📚 Chamar p/ Quiz" no passo 2 (🎮 Minigames); o resto
  (`game.js` passa `onQuiz`) já funcionava. CSS sem choque (`.pc-games` no style.css, `.pc-quiz` no quiz.css).
- Regra 16 duplicada no CLAUDE.md (layout/voz e quiz) → quiz virou 17. Versão 0.8.1. D-036.
- `fix/mobile-layout` (T-509/T-510) **não** entrou: não foi pedido; merge com este já testado antes (só DEVLOG conflita).

## 2026-10-04 — Quiz: botões sobrepostos em ligação de voz (worktree `claude/quiz-game-layout-buttons-a66d6e`)
Pedido: no minigame de quiz os botões ficavam sobrepostos e não dava para clicar; lembrar de sempre verificar se está em
ligação ou não e documentar a regra para desenhos de layout.
- Este worktree estava no master: avançado (fast-forward) para `claude/english-quiz-minigame-5d7886` (v0.8.0) antes de corrigir.
- Reproduzido no navegador (desktop 1024×768, celular 375×812/375×667/812×375) simulando a ligação (ver UI_LAYOUT):
  painel da voz cobrindo Convidar/Assistir/Sair e a lousa (paisagem); 🎤 da voz sumia (retrato/paisagem); barra 🎙️ Voz/🎤/som
  escondida atrás dos botões da sala (desktop); convites por baixo da lousa; painéis 💬/👥 sob o nav.
- Correção: `quiz.css` (seção “convivência com a voz, convites e painéis”), `voice.css` (lista de membros rola), `voice/ui.js`
  (`body.vc-on`). Conferido com `elementFromPoint`/capturas em todos os formatos, com 3, 5 e 8 pessoas na ligação, painel
  aberto, convite chegando, painel “Convidar”, plateia (assistindo). 111 testes passando.
- Regra nova: CLAUDE.md nº 16 + `docs/UI_LAYOUT.md` (zonas, z-index, checklist). D-035.
- Pendente: revisar Karatê e Queimada com `vc-on` (T-361).

## 2026-10-04 — v0.8.0: Corrida das Perguntas na Escola 📚🇺🇸 (feita no worktree `claude/english-quiz-minigame-5d7886`)
Pedido: minigame "jogo das perguntas" começando pelo inglês (tema configurável/IA no futuro; agora tudo escrito aqui),
corrida em que acertar anda uma casa, com mecânicas (2 seguidas = quem está na frente volta 1, com cálculo justo),
estilo quiz com certa/erradas e dificuldade balanceável, participar ou assistir, quem entra no meio começa do início,
mais uma "room" no mapa e um ambiente para testar em produção. Feito em paralelo à sessão da compensação de lag.

**Feito**
- Mapa: a 2ª casa (fim da avenida da fonte) virou a **Escola** (`MAP.school`, porta andável em 1000,320) +
  `render/schoolhouse.js` (prédio vivo: janelas com alunos levantando a mão, sino, bandeira do tema, cavalete QUIZ).
- `shared/quiz.js` (QZ, MODES, CARDS, CHEERS, BOTS, alvos do combo, passos, presentes, tempo por texto).
- `server/quiz/` (banco só no servidor): `bank.js` (formato compacto, `validateTheme`, `buildOptions`, `QuestionPicker`
  sem repetir e variando categoria), `themes.js` (registro), `en/` com ~2.700 perguntas em 15 categorias e 3 níveis.
- `server/minigames/Quiz.js` (`QuizMatch`): lobby/contagem/intro/pergunta/revelação/pódio, combo com escudo, ouro,
  presentes e cartas (🤫 Cola, 💨 Pum, 🎲 Tudo ou nada), chegada com desempate por rapidez, entrar no meio/na próxima,
  plateia (lugares, torcida com limite), robôs no servidor (fácil/médio/gênio, usam cartas e falam), ausente → plateia.
  `Room`: `qzs`/`qzOf`, `qz_create/join/leave`, convite `game:'quiz'` (de dentro chama várias pessoas), `busyBeyondQz`,
  quem está na Escola não entra em outro jogo; `/health` mostra `quiz`.
- Cliente: `minigames/school.js` (prédio, painel, notificação), `minigames/quiz.js` (cena, linha do tempo da revelação,
  lousa A–D, cartas, status do combo, lobby com robôs, plateia com palpite e torcida, pódio com revisão das erradas,
  convidar), `render/classroom.js` (sala de aula, pistas de tabuleiro, professor, apagador, escudo, pum, troféu),
  `quiz.css` (desktop + celular), poses `qzhand/qzhit/qzwin` e antena de robô no boneco, sons `qz_*`, botão
  "📚 Chamar p/ Quiz" no cartão do player.
- Ferramentas: `scripts/quiz-balance.js` (simulador com o Room real; `QZ.X=valor` testa variações), `scripts/qzbot.js`
  (bots pela rede: correm chutando e aprendendo, ou `--assistir`). 17 testes novos (16 em `tests/quiz.test.js` + 1 pela
  rede em `server.test.js`), 111 no total depois do merge com a v0.7.1 (compensação de lag).
  Decisões D-031..D-034, `docs/QUIZ_CONTENT.md`.

**Achados no caminho**: viés de 59% para quem criou a sala (empate do sorteio de cartas na largada contava o 1º como
líder); escudo do líder que durava até ser usado anulava o combo (0,5 ataque × 2,4 bloqueios) → 1 pergunta; ataques
precisavam resolver antes dos escudos novos; a classe da carta 💨 colidia com a nuvem do pum (escondia as opções de
quem tinha a carta); pistas vazias quando alguém saía (linhas compactadas); nav do celular em cima do 🎙️; números do
relógio ilegíveis; câmera longe demais no celular deitado (agora segue o pelotão + faixa de progresso).

**Verificado no navegador** (porta 3200, robôs da sala + `qzbot` pela rede, 2 abas): Escola fechada/acesa e painel,
criar sala, robôs, contagem, perguntas de várias categorias, responder por clique, revelação com explicação e quem
marcou o quê, pulinhos, ESCUDO/BLOQUEOU, pergunta de ouro, nuvem do pum, pódio + revisão, nova corrida, plateia
(banco, palpite, torcida, "VAI DANIEL!"), quero correr no meio (entrou na largada), ausente indo para a plateia, convite
pelo cartão (sala nova para os dois), celular 375×812 e 812×375. Console e servidor sem erros.

## 2026-10-04 — v0.7.1: investigação de lag na VPS + compensação de lag na praça (T-406)
Pedido: o jogo parecia com lag e o ping direto na VPS dava picos (esperava ~15 ms). Depois: "corrigir quando o ping
ficar alto constantemente".

**Diagnóstico** (ver DEPLOY → Medir a rede): piso PC → VPS ~26 ms pela rota do provedor (1º salto já 15–23 ms, 5% de
perda); Wi-Fi soma ~9 ms médios e picos de 21 ms; dentro da VPS o jogo responde em 2 ms. A VPS não é a causa (jogo
~2% CPU; steal ~2% com rajadas de 17%, monitoramento de terceiros ocupado — não mexemos).

**Feito**
- `client/js/lagcomp.js`: `LagMonitor` (mediana de 5 pings, liga ≥ 100 ms / desliga < 70 ms) e `SelfPredictor`
  (anda na hora com o mesmo A*/passo do servidor, converge parado, teleporta se divergir muito).
- `shared/pathfinding.js`: `followPath` extraído de `Room.stepPlayer` (servidor e cliente andam igual).
- `game.js`: `steerTo`/`movePos`/`predicting`; clique, interações, teclado (`input.js`) e joystick (`mobile.js`) usam a
  previsão; sentar no chão para a previsão. HUD: 🛟 no ping + aviso no chat quando liga/desliga.
- `net.js`: `?lag=` / `?jit=` simulam internet ruim; `?comp=1/0` força o modo.
- 6 testes novos (`tests/lagcomp.test.js`), 94 no total — inclui previsão idêntica ao `Room` tick a tick.

**Verificado no navegador** (porta 3100, `?lag=300&jit=40`): liga sozinho em ~10 s (mediana 345 ms); clique → boneco
anda em 35–50 ms (sem: 480–550 ms), velocidade máx. ~205 px/s (sem teleporte), erro final 0 px; teclado 26 ms; banco
(senta no assento do servidor) e levantar ok; mobile 375×812 com joystick ~100 ms; console sem erros.

## 2026-10-03 — v0.7.0: Queimada no Ginásio 🔴🔵 (feita no worktree `feature/queimada`)
Pedido: implementar a queimada desenhada com outro modelo (pegada, arremesso, defesa, caos, fila/squad, modos de
pontuação), com uma "casa" no mapa para entrar em partidas existentes e convites como nos outros jogos — e melhorar.

**Feito**
- Mapa: `MAP.gym` (prédio à esquerda, em cima do lago; porta andável em 370,322) + `render/gymhouse.js`.
- `shared/queimada.js` (QM, LEVELS fácil/difícil, física da bola 2.5D, prévia da trajetória, janela de pegada).
- `server/minigames/Queimada.js` (`QueimadaMatch`): treino livre, fila compartilhada, 1v1/2v2 com 1/2 bolas, rotação,
  cemitério com volta, hit-stop de 0,14 s (lag), pegada/escapou/esquiva/WHOOSH/tabela/demorou/juiz, rodadas de 75 s,
  meta 50, pódio e recomeço. `Room`: `qms`/`qmOf`, `qm_create/join/leave`, convite `game:'queimada'` (de dentro da
  quadra chama várias pessoas), `busyBeyondQm`, quem está na quadra não assiste o dojo nem é desafiado.
- Cliente: `minigames/gym.js` (prédio, painel, notificação), `minigames/queimada.js` (cena, predição, bolas
  extrapoladas, mira, controles, HUD, convidar, pódio), `render/court.js` (quadra, pneus, bola, placar na parede),
  poses `qhold/qthrow/qcatch/qdodge/qstun` no boneco, `queimada.css` (desktop + celular), sons `qm_*`,
  botão "Chamar p/ Queimada" no cartão do player.
- Bots/ferramentas: `scripts/queimada-ai.js`, `scripts/qmbot.js` (N bots / bot que te chama), `scripts/queimada-balance.js`.
- 15 testes novos (`tests/queimada.test.js`), 88 no total. Decisões D-027..D-029.

**Bugs achados no caminho**: `speedOf` com `hold = -1`; bola que cai no pé virava "morta" antes do acerto; bola presa em
cemitério vazio travava a rodada (→ juiz); correr até a bola na beira do alcance ficava andando para sempre; segurar
demais + pega-sozinho pegava de volta na hora; pontos não zeravam quando a partida voltava ao treino.

**Verificado no navegador** (porta 3100, `qmbot` 1 e 4 bots + bots que convidam): prédio aceso e painel, criar/entrar,
treino livre (correr até a bola, mira com trajetória, arremesso por arrastar), 2v2 com fila no banco, QUEIMADO!/cemitério/
entrada da fila, partida até o pódio e recomeço, convite da praça aceito → entra na quadra do bot, painel ➕ Convidar,
celular retrato 375×812 (câmera segue, placar em fichinhas) e paisagem 812×375 (placar compacto, pódio cabe). Console e
servidor sem erros.

## 2026-10-03 — v0.6.0: Plateia do Dojo — assistir lutas de Karatê 👀 (feita no worktree `feature/arena`)
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
conflitaram só por serem entradas novas no mesmo lugar — mantidas as duas; a decisão da plateia virou D-026
(a voz usou D-021..D-025). Código mesclou sem conflito com a v0.5.0 (voz).

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

## 2026-10-03 — v0.5.0: chat de voz por grupos 🎙️ (branch `feature/voice`, worktree separado)
**Feito**
- Servidor: `server/VoiceHub.js` (plugado no `Room` como `room.voice`): grupos de até 8, convite (`vc_invite`),
  **pedido para entrar** em grupo de outro (`vc_request`), aceitar/recusar, convite cruzado vira aceite, trocar de
  grupo, dono 👑 remove, coroa passa ao mais antigo, grupo de 1 acaba, convites expiram (30 s) com anti-spam, repasse
  de sinalização WebRTC **só entre membros do mesmo grupo** (validada em `shared/voice.js`), credenciais TURN
  temporárias (HMAC), `vg` nos players e `vc_tag` para a sala. `maxPayload` 4→16 KB. `/health` mostra a voz.
- Cliente `client/js/voice/`: `VoiceClient` (grupo, malha de conexões, reprodução, fala, mudo/sem som, apertar para
  falar), `peer.js` (só o menor id oferece; ICE agrupado; reinício → recriação → vigia), `mic.js` (WebAudio: volume,
  ativação por voz com pré-rolagem de 40 ms, porteira com rampa, medidor, "ouvir meu microfone"), `settings.js`,
  `ui.js` (painel, convites, janela de configurações), `voice.css`. Opus com DTX/FEC/mono e 16/32/64 kbps.
- Cartão do player: **Chamar para conversar por voz / Convidar para o seu grupo / Pedir para entrar no grupo de voz**.
  🎧 no nome de quem está em grupo; nome verde com ondas quando fala; 🔇 quando muda. Celular: ícone 🎙️ no topo e
  botão redondo de microfone acima do PULAR (segurar = falar no modo apertar-para-falar).
- Produção: coturn no `compose.yml` (portas pelo Docker, só IPv4, relay bloqueado para redes internas), segredo do
  TURN gerado na VPS pelo `deploy.sh`; `deploy/park.magmacursosltda.com.br.conf` + `scripts/setup-domain.sh` (nginx +
  certbot, desfaz se `nginx -t` falhar); IP real via `X-Real-IP` só quando vem do proxy local. Versão 0.5.0.
- Testes: 15 novos em `tests/voice.test.js` + 2 em `server.test.js` (66 no total). `scripts/voice-e2e.mjs`: Chrome
  headless com microfone falso, 5 jogadores.

**Bugs achados nos testes e corrigidos**
- Depois de recriar a conexão, a oferta nova ficava presa na fila atrás de uma promessa da conexão antiga (o Chrome
  não resolve promessas de `RTCPeerConnection` fechada) → fila nova por conexão.
- Só-relay no E2E: erro 486 (cota) — o Chrome aloca 1 relay por interface de rede e segura os antigos no reinício →
  cota por usuário 24. E relay↔relay era recusado (o coturn traduz o próprio IP para o IP interno do container, que
  estava bloqueado) → libera só o IP do próprio container.
- Convite recusado deixava o microfone aberto → microfone só fica aberto no grupo, testando ou com convite esperando.
- Atrás do nginx todo mundo teria o mesmo IP (limite de 12 conexões por IP) → `clientIp()`.
- Celular em pé: o botão de mic no topo espremia o placar → virou botão redondo acima dos controles.

**Verificado (E2E, Chrome headless)**: convite pelo cartão → conexão → áudio nos dois sentidos (nível ~0,4) → quem fala
→ mudo (nível 0) → "Pedir para entrar" → malha de 3 → apertar para falar (solto 0 / segurando 0,4) → troca de
qualidade/eco sem cair → reinício de ICE e recriação (~2 s) → voz durante luta de Karatê → dono remove → troca de grupo
→ celular retrato/paisagem → fechar a aba tira do grupo. A suíte inteira também passou **forçando só relay** pelo
coturn local (UDP e TCP) com as credenciais temporárias.

**Em produção (2026-10-03)**: deploy v0.5.0 (jogo 19 MB + `niltonpark-turn` 7 MB de RAM; demais containers da VPS
intocados). Do PC, contra `http://204.157.124.113:3000?debug=1` (Chrome tratando o IP como seguro só no teste):
suíte E2E inteira ✔ e **só-relay pelo TURN da VPS** ✔ (RTT 57 ms). O usuário rodou `scripts/setup-domain.sh`
(sudo): **https://park.magmacursosltda.com.br** no ar (Let's Encrypt até 2027-01-01, http → 301 https, outros sites
da VPS respondendo normalmente) e a suíte E2E inteira + só-relay passaram de novo pelo domínio, sem flags no Chrome.

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
