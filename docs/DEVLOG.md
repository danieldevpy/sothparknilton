# DEVLOG

Diário de desenvolvimento. Entrada nova **no topo**. Formato:
`## AAAA-MM-DD — título` · o que foi feito · decisões · pendências.

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
