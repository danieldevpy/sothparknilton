# Roadmap / Backlog

Status: ✅ feito · 🔜 próximo · 💡 ideia. IDs estáveis para referenciar em commits e no DEVLOG.

## Fase 0 — MVP sala de comunicação ✅ (v0.1.0, 2026-10-01)
- ✅ T-001 Servidor HTTP + WebSocket com sala única
- ✅ T-002 Login com nick (único) + visual (gorro/casaco/pele) com preview
- ✅ T-003 Mapa "Praça Central": praça, lago, área de sports, casas/montanhas
- ✅ T-004 Andar por clique (A*) e WASD; câmera seguindo
- ✅ T-005 Players online se vendo com interpolação; nick acima da cabeça
- ✅ T-006 Chat com balões flutuantes estilo Habbo + log
- ✅ T-007 Emotes: acenar, pular, dançar, pum, sentar
- ✅ T-008 Interações: fonte (moeda), bancos (sentar), postes (luz), lago (pedra), patos (quack)
- ✅ T-009 Bola com física compartilhada, gols e placar
- ✅ T-010 Sons sintetizados + mute
- ✅ T-011 Testes (shared, Room, integração WS) + bots de dev
- ✅ T-012 Documentação + memória do projeto

## Fase 1A — Minigame Gol a Gol ✅ (v0.2.0, 2026-10-01)
- ✅ T-301a Desafiar clicando no player (cartão), convites com expiração, aceitar/recusar, status
- ✅ T-301b Partida 1x1 autoritativa: turnos, chute com mira/força/efeito, goleiro com mergulho, trave, isolar, espalmar, cansaço
- ✅ T-301c Visual: poses (goleiro, mergulho, caído, chute), mira com trajetória, barra de força com ⭐, textos gigantes, confete, tremida
- ✅ T-301d Fim de jogo com revanche (perdedor e vencedor), W.O. ao sair
- ✅ T-301e Bot `scripts/ggbot.js`, simulador de equilíbrio, 12 testes do minigame

## Fase M — Mobile web ✅ (v0.3.0, 2026-10-01)
- ✅ T-501 Detecção de celular + `?mobile=1|0`, viewport sem zoom, áreas seguras (notch)
- ✅ T-502 HUD estilo Roblox: ícones no topo, painéis de chat/online/menu/ajuda, badge de não lidas
- ✅ T-503 Joystick virtual + botões PULAR/emotes
- ✅ T-504 Gol a Gol por toque: mira tocando, botão CHUTAR, efeito ↺↻, mergulho 🧤⬆⬇, joystick do goleiro
- ✅ T-505 Login, cartão de player, convites e resultado adaptados; retrato e paisagem
- 🔜 T-506 PWA (manifest + ícone + tela cheia) e depois empacotar (Capacitor)
- 🔜 T-507 Vibração (navigator.vibrate) em gol/defesa e sons mais altos no celular
- 🔜 T-508 Joystick dinâmico (aparece onde o dedo toca) como opção

## Fase 1B — Gol a Gol: próximos 🔜
- 🔜 T-310 Fila para o campinho quando estiver ocupado (ou várias quadras)
- 🔜 T-311 Ranking/estatísticas (vitórias, gols, defesas) persistidos
- 🔜 T-312 Modo "melhor de 3" / "melhor de 5" opcional no convite
- 🔜 T-313 Torcida: espectadores na arquibancada com emotes que fazem barulho
- 🔜 T-314 Sons de narração engraçados ("ÉÉÉÉ DO BRASIL")
- 🔜 T-315 Treino solo contra o GoleiroBot embutido no servidor

## Fase 1C — Minigame Karatê ✅ (branch feature/karate, 2026-10-01)
- ✅ T-320 Desafio com `game` (Gol a Gol / Karatê) no cartão do player, convites e revanche
- ✅ T-321 `KarateFight` autoritativo: dojo separado, várias lutas simultâneas, melhor de 3, W.O.
- ✅ T-322 Golpes com vantagens: soco fraco (rápido/combo), soco forte (quebra defesa), chute fraco (alcance/lento), chute forte (dano/derruba); defesa e defesa perfeita; dash a cada 3 s (invencível); contra-ataque, investida, combo, previsível
- ✅ T-323 Cliente: cena do dojo + sensei, lutador de quimono com poses, predição, HUD de vida/rounds/dash, efeitos, controles teclado e toque
- ✅ T-324 `ktbot.js`, `karate-ai.js`, `karate-balance.js`, 17 testes

## Fase 1D — Karatê: próximos 🔜
- 🔜 T-325 Assistir luta (espectador entra no dojo pelo cartão do lutador)
- 🔜 T-326 Faixas (branca → preta) por vitórias, persistidas
- 🔜 T-327 Golpe especial com barra de "ki" (enche ao apanhar/defender)
- 🔜 T-328 Escolher o dojo/cenário e um "ring-out" na beira do tatame
- 🔜 T-329 Treino solo contra o SenseiBot embutido no servidor (sem rodar script)

## Fase 1 — Polimento da sala 🔜
- 🔜 T-101 Reconexão automática (sem recarregar) e manter sessão por alguns segundos
- 🔜 T-102 Cartão do player: já tem desafiar/acenar (v0.2.0); falta seguir, perfil e sussurrar
- 🔜 T-103 Sussurro (`/w nick msg`) e filtro básico de palavrão configurável
- ✅ T-104 Mobile: feito na Fase M (falta só zoom por pinça → T-508+)
- 🔜 T-105 Mais emotes engraçados (cair de cara, chorar, "screw you guys")
- 🔜 T-106 Ciclo dia/noite (postes passam a importar)
- 🔜 T-107 Persistência leve de visual/nick (já em localStorage) + contas opcionais

## Fase 2 — Arte 🔜
- 🔜 T-201 Gerar folhas de referência de objetos (Kairogen) e trocar árvore/banco/fonte por sprites
- 🔜 T-202 Personagem em partes recortadas (sprites) mantendo customização por cor
- 🔜 T-203 Mais acessórios: óculos, cabelo, capuz, cachecol
- 🔜 T-204 Sons em arquivo (.ogg) com estilo "boca"

## Fase 3 — Minigames 💡
- 💡 T-301 Futebol por times (escolher lado ao entrar no campo, partidas de 3 min) — o Gol a Gol 1x1 já existe (Fase 1A)
- 💡 T-302 Corrida de patinação no lago congelado
- 💡 T-303 Guerra de bolas de neve na praça
- 💡 T-304 Framework de minigame: extrair a interface do `GolAGol` (has/handle/tick/forfeit/publicInfo) e permitir vários por área

## Fase 4 — Escala 💡
- 💡 T-401 Múltiplas salas/mapas (um `Room` por sala, portas entre mapas)
- 💡 T-402 Snapshots delta + área de interesse
- 💡 T-403 Deploy (Docker + HTTPS/WSS) e métricas (`/health` já existe)
- 💡 T-404 Moderação: kick/mute por admin, rate limit por IP
