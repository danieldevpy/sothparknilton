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
