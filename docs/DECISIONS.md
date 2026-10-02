# Registro de decisões (ADR curto)

Formato: **ID — Decisão** · contexto · consequência. Novas decisões no fim.

**D-001 — Node + `ws` puro, sem framework.** (2026-10-01)
Jogo leve, 1 dependência. Socket.IO/Colyseus seriam mais peso que ganho no MVP.
→ Reconexão, salas e serialização são nossas; reavaliar Colyseus se salas/matchmaking crescerem.

**D-002 — Servidor autoritativo com "clicar para andar" + A* no servidor.** (2026-10-01)
Igual Habbo; impede teleporte/hack trivial e mantém todos vendo a mesma coisa.
→ Pequena latência entre clique e início do movimento (aceitável no gênero).

**D-003 — Canvas 2D sem engine (sem Phaser/Pixi).** (2026-10-01)
Visual é simples e procedural; canvas puro carrega instantâneo e é fácil de entender.
→ Se entrarem muitos sprites/partículas, migrar render para Pixi mantendo `game.js` como estado.

**D-004 — Sem build step; `shared/` servido ao browser.** (2026-10-01)
Mesma lógica de colisão/validação nos dois lados sem bundler.
→ Usar só sintaxe que Node 20+ e browsers modernos entendem. Se precisar de TS, adicionar Vite depois.

**D-005 — Arte 100% procedural no MVP; IA (Kairogen) só para tela de login.** (2026-10-01)
Créditos limitados (8) e o visual "paint" é fácil de fazer em código; procedural permite customizar cores e animar.
→ Pipeline de troca por sprites documentado em `ASSETS.md`.

**D-006 — Perspectiva top-down "2.5D" com ordenação por Y (não isométrico).** (2026-10-01)
Combina com o estilo recorte de papel (personagens de frente) e simplifica colisão/cliques.
→ Isométrico estilo Habbo seria mudança grande de render; não planejado.

**D-007 — Balões de chat: X no mundo, Y na tela.** (2026-10-01)
Câmera segue o player (diferente do Habbo, onde a sala é fixa); assim o balão acompanha horizontalmente quem falou sem bagunçar a pilha.

**D-008 — Interpolação com tempo de chegada local (não `ts` do servidor).** (2026-10-01)
Evita sincronizar relógios. Atraso fixo de 110 ms.
→ Jitter de rede aparece como leve irregularidade; trocar por clock sync se incomodar.

**D-009 — Uma partida de Gol a Gol por vez, no campinho do mapa principal.** (2026-10-01)
Mantém tudo na mesma sala: quem está na praça vê o jogo ao vivo (é social, igual Habbo). Simples de implementar.
→ Com mais jogadores, criar fila ou várias "quadras" (instâncias) — ver ROADMAP.

**D-010 — Mira do chutador é privada; força real também.** (2026-10-01)
O goleiro só vê que o chutador está "carregando" (barra animada falsa). Mostrar a mira tornaria a defesa trivial.

**D-011 — Predição local só para movimentos simples (goleiro/marca); colisões no servidor.** (2026-10-01)
Deixa o controle responsivo mesmo com ~100 ms de latência sem abrir espaço para trapaça nas defesas.

**D-012 — Parâmetros de equilíbrio calibrados por simulação.** (2026-10-01)
`scripts/golagol-balance.js` mede % de gol vs. tempo de reação. Primeira versão dava ~0,5% de gol; ajustado para goleiro 165 px/s, alcance 17 px e gol com 180 px de abertura.

**D-013 — Bola espalmada tem atrito alto.** (2026-10-01)
Antes, a bola espalmada cruzava o campo e virava gol contra com frequência (engraçado, mas injusto). Agora ela morre perto do goleiro; gol contra ainda é possível, mas raro.

**D-014 — Mobile como camada de UI separada (`mobile.js` + `body.mobile`), sem framework.** (2026-10-01)
O desktop fica intacto; o celular ganha controles próprios (joystick/botões) em vez de só "encolher" o HUD.
Elementos comuns (chat, lista, placar) são movidos para os painéis mobile em vez de duplicados.
→ Ao empacotar como app (Capacitor/PWA), a mesma camada é usada.

**D-015 — Na partida, câmera não respeita a borda do mapa.** (2026-10-01)
Centralizar o campo é mais importante que não mostrar "fora do mapa"; em paisagem os botões cobriam o gol direito.
