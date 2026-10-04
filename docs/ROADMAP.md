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

## Fase 1E — Plateia do Dojo ✅ (v0.6.0, 2026-10-03)
- ✅ T-325 Assistir luta: prédio do Dojo na praça (fechado/AO VIVO), painel de lutas ao vivo, entrar na plateia, trocar de luta, sair
- ✅ T-330 Torcida: plateia sentada no dojo (bonecos reais), placas por lado, reações 👏🔥😱😂, coro, ola, pipoca, locutor
- ✅ T-331 Notificação pequena "fulano × ciclano vão lutar — 👀 Assistir"
- ✅ T-332 Espectador não interfere (comandos ignorados, torcida limitada, desenho fora do tatame) + 7 testes + `scripts/fanbot.js`
- 🔜 T-333 Plateia do Gol a Gol na arquibancada (mesma ideia da T-313) e "replay" do K.O. para a plateia
- 🔜 T-334 Estatísticas de torcida (quem mais torceu, "torcedor da noite")

## Fase 1F — Minigame Queimada ✅ (v0.7.0, 2026-10-03)
- ✅ T-340 Ginásio na praça (aceso/fechado, painel com partidas, ▶ Entrar / ➕ Nova partida Fácil|Difícil, notificação)
- ✅ T-341 `QueimadaMatch` autoritativo: várias quadras, treino livre, fila compartilhada (1v1 → 2v2, entra quem espera), rotação, cemitério com volta, rodadas, meta de 50 pts, pódio e recomeço
- ✅ T-342 Física 2.5D da bola (arco, força pela distância do clique, quique em paredes/pneus, rola), pegar no alcance, pegada por tempo (janela encolhe com a velocidade), escapou, esquiva/WHOOSH, tabela, "demorou", juiz devolve bola presa
- ✅ T-343 Cliente: quadra procedural, poses novas no boneco, predição, bolas extrapoladas, mira com trajetória, efeitos, placar, convidar de dentro, celular (joystick + PEGAR/ESQUIVA/🎯) retrato e paisagem
- ✅ T-344 Convite pelo cartão do player (`game:'queimada'`), `qmbot.js`, `queimada-ai.js`, `queimada-balance.js`, 15 testes
- 🔜 T-345 Plateia do Ginásio (assistir sem entrar na fila) e torcida como no Dojo
- 🔜 T-346 Bolas especiais em rodadas aleatórias (bola gigante, bola de neve que congela, 3 bolas = caos)
- 🔜 T-347 Passe para o companheiro de time (e para o cemitério) e "pegada salva um queimado" (variante)
- 🔜 T-348 Estatísticas persistentes (queimadas, pegadas, campeonatos) e título "rei da quadra"

## Fase 1G — Corrida das Perguntas ✅ (v0.8.0, 2026-10-04)
- ✅ T-350 Escola na praça (no lugar da casa do fim da avenida): acesa com aula, sino, painel de salas (🙋 Correr / 👀 Assistir / ➕ Nova sala), notificação, convite pelo cartão (`game:'quiz'`)
- ✅ T-351 `QuizMatch` autoritativo: várias salas, mesma pergunta para todos, acerto anda, combo (quem está na frente volta 1) com cálculo justo, escudo, ouro a cada 5, presentes com cartas (Cola/Pum/Tudo ou nada), chegada, pódio, recomeço
- ✅ T-352 Banco 🇺🇸 Inglês (~2.700 perguntas, 15 categorias, 3 níveis) só no servidor, com formato de tema validável (`server/quiz/`, `docs/QUIZ_CONTENT.md`)
- ✅ T-353 Entrar no meio (começa da largada; depois do corte, na próxima), plateia com palpite e torcida, robôs na sala (fácil/médio/gênio), ausente vai para a plateia
- ✅ T-354 Cliente: sala de aula procedural (lousa, professor, pistas de tabuleiro, apagador, escudo, pum, troféu), lousa em DOM com A–D, cartas, revisão das erradas no pódio, celular retrato/paisagem com faixa de progresso
- ✅ T-355 `quiz-balance.js` (simulador), `qzbot.js` (bots pela rede), 17 testes
- 💡 T-356 Temas configuráveis: escolher tema na sala e gerar tema novo por IA (Claude) com validação + revisão + cache (ver QUIZ_CONTENT)
- 🔜 T-357 Mais temas escritos à mão (espanhol, geografia, matemática básica) e "foco" da sala (só vocabulário, só verbos...)
- 🔜 T-358 Progresso persistente: palavras que você mais erra voltam em revisão (repetição espaçada) + "🎓 diploma" no nick
- 🔜 T-359 Pergunta-chefão na última casa ("prova final") e eventos de rodada (todo mundo com cola, ouro duplo)
- 💡 T-360 Áudio de pronúncia nas perguntas (TTS do navegador: "como se fala") e perguntas de ouvir-e-escolher
- ✅ T-361a Layout do Quiz com voz/convites/painéis sem sobreposição (D-035, `docs/UI_LAYOUT.md`)
- 🔜 T-361 Revisar Karatê e Queimada (desktop, retrato e paisagem) em ligação de voz pelo checklist de `docs/UI_LAYOUT.md`

## Fase 1D — Karatê: próximos 🔜
- 🔜 T-326 Faixas (branca → preta) por vitórias, persistidas
- 🔜 T-327 Golpe especial com barra de "ki" (enche ao apanhar/defender)
- 🔜 T-328 Escolher o dojo/cenário e um "ring-out" na beira do tatame
- 🔜 T-329 Treino solo contra o SenseiBot embutido no servidor (sem rodar script)

## Fase V — Chat de voz por grupos ✅ (v0.5.0, 2026-10-03)
- ✅ T-601 Grupos no servidor (`VoiceHub`): convidar, **pedir para entrar** em grupo de outro, aceitar/recusar, trocar de grupo, dono remove, limite 8, convites com TTL/anti-spam
- ✅ T-602 WebRTC em malha: só o menor id oferece, ICE agrupado, reinício de ICE → recriação → vigia; Opus com DTX/FEC
- ✅ T-603 Microfone: volume de entrada, ativação por voz (sensibilidade + medidor), voz aberta, apertar para falar (tecla configurável / botão no celular), eco/ruído/ganho, troca de dispositivo sem renegociar
- ✅ T-604 Saída: `<audio>` por pessoa (cancelamento de eco), volume geral e por pessoa (salvo por nick), silenciar alguém só para mim, saída por `setSinkId`, aviso de autoplay
- ✅ T-605 UI: botão no cartão do player (chamar / convidar / pedir para entrar), 🎧 no nome de quem está em grupo, fala no mapa (nome verde com ondas, 🔇), painel 🎙️, pílula 🎤 / botão redondo no celular, janela ⚙️ Configurações de áudio, sons
- ✅ T-606 TURN (coturn) com credenciais temporárias; IP real atrás do proxy; `scripts/voice-e2e.mjs` (Chrome headless com microfone falso, inclusive só-relay)
- ✅ T-607 Domínio **https://park.magmacursosltda.com.br** (nginx da VPS + Let's Encrypt via `scripts/setup-domain.sh`, renovação automática)
- 💡 T-608 Voz por proximidade na praça (volume cai com a distância) como modo opcional do grupo
- 💡 T-609 Manter o grupo de voz numa reconexão rápida (hoje recarregar = sair do grupo)
- 💡 T-610 TURN com `network_mode: host` + faixa maior (precisa liberar no ufw com root)
- 💡 T-611 Moderação de voz: denunciar/bloquear alguém (não receber convites dele)

## Fase 1 — Polimento da sala 🔜
- 🟡 T-101 Reconexão automática ✅ (recarrega e entra sozinho, v0.4.0) · falta manter a sessão/partida por alguns segundos
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
- ✅ T-403 Deploy Docker na VPS pelo IP externo (`scripts/deploy.sh`, v0.4.0) · ✅ domínio + HTTPS/WSS (T-607, v0.5.0) · 💡 métricas
- ✅ T-405 Jogabilidade pela internet: atraso adaptativo ao jitter, ping na tela, gzip/ETag, limite por IP (v0.4.0)
- ✅ T-406 Compensação de lag na praça: predição do próprio boneco quando o ping fica alto constante + `?lag=` para testar (D-030)
- 💡 T-404 Moderação: kick/mute por admin, rate limit por IP
