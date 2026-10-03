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

**D-014 — Karatê acontece numa instância (dojo) separada da praça.** (2026-10-01)
Pedido: luta "longe das outras pessoas", arena 1x1. Instância permite várias lutas simultâneas, não disputa espaço
no mapa e só manda estado para os dois lutadores. → Ninguém assiste ao vivo (por enquanto: ver T-325 espectador).

**D-015 — Visão 2.5D tipo beat 'em up com auto-mira no oponente.** (2026-10-01)
Combina com o render existente (bonecos de frente, ordenação por Y) e dispensa mira: o jogador só pensa em
distância, profundidade e tempo. Golpe acerta à frente + faixa de profundidade (`band`).

**D-016 — Golpes simultâneos trocam; K.O. duplo é sorteado.** (2026-10-01)
O simulador mostrou viés de 100% para quem era processado primeiro no tick. Acertos agora são calculados depois que
os dois lutadores andaram, com o golpe de cada um capturado antes de aplicar.

**D-017 — Equilíbrio por simulação de estilos (`scripts/karate-balance.js`).** (2026-10-01)
1ª versão: só-chute-fraco vencia tudo 100% e só-soco-fraco vencia o misto. Ajustes: chute fraco mais lento
(0,15/0,10/0,30 s, hitstun 0,26) e push 20; soco fraco dano 5→4 e hitstun 0,30→0,22 (neutro no acerto sem combo);
combo máximo 5→4. Por fim, regra **PREVISÍVEL** (repetir golpe perde até 50% do dano), que fez o misto vencer
os estilos de um golpe só e dividiu o dano entre os 4 golpes.

**D-018 — Cliente prevê o próprio lutador, interpola o oponente.** (2026-10-01)
Luta precisa de resposta imediata: andar, dash e o começo do golpe aparecem na hora; o servidor decide acertos.
Oponente com 80 ms de atraso (como o Gol a Gol, D-011).

**D-019 — Produção em Docker na VPS existente, só pelo IP externo na porta 3000.** (2026-10-02)
A VPS já roda outros sistemas (80/443 ocupadas por eles). Container isolado com limites (256 MB, 1 CPU, só-leitura),
porta própria e sem tocar no nginx deles. Sem domínio ⇒ sem HTTPS: o cliente usa `ws://` (já escolhe `wss://` sozinho
se um dia houver HTTPS). Deploy por `scripts/deploy.sh` (tar via SSH + `compose up --build`).

**D-020 — Jogabilidade pela internet: atraso adaptativo + ping + reconexão automática.** (2026-10-02)
Latência real até a VPS variou 15–195 ms (jitter de Wi-Fi). Atraso fixo de interpolação travava com jitter; agora
`AdaptiveDelay` ajusta por conexão. Predição do Karatê considera o RTT. Queda de rede/deploy reconecta sozinho
(recarrega e refaz o login com o perfil salvo) — resolve o essencial da T-101 sem sessão no servidor.

**D-021 — Voz por WebRTC em malha (P2P), sem SFU; grupos de até 8.** (2026-10-03)
Um SFU (mediasoup/LiveKit) passaria todo o áudio pelo container de 256 MB/1 CPU numa VPS compartilhada. Em malha o
servidor só sinaliza; cada um envia 1 fluxo Opus por membro (8 pessoas → 7 × ~32 kbps ≈ 220 kbps de subida, ok no 4G).
Acima de ~8 a malha pesa no celular → limite `VOICE.MAX_GROUP = 8`. Se um dia precisar de salas grandes: SFU.

**D-022 — Só o lado de menor id oferece.** (2026-10-03)
Evita "glare" (ofertas cruzadas) sem a complexidade da "perfect negotiation": o outro lado só responde e pede
`restart`. Na queda: reinício de ICE 2× → recria do zero (`reset`) → vigia de 10 s. Testado no E2E (inclusive só-relay).

**D-023 — Áudio remoto tocado em `<audio>`, não em WebAudio.** (2026-10-03)
No Chrome, áudio remoto que sai só pelo WebAudio escapa do cancelamento de eco (eco em quem usa caixa de som).
Volume por pessoa via `el.volume` (0–100%; no iOS o volume é fixo). Indicador de fala vem do RTP (`audioLevel`),
sem um analisador por pessoa. O microfone sim passa por WebAudio (volume, porteira, ativação por voz).

**D-024 — TURN próprio (coturn) com credenciais temporárias; portas pelo Docker.** (2026-10-03)
Operadoras 4G usam NAT que impede P2P direto → sem TURN uma parte das conexões falharia. coturn em container
(`niltonpark-turn`, ~10 MB RAM) com `use-auth-secret`: o jogo gera usuário/senha de 12 h por player (segredo só na VPS).
Bloqueia relay para redes internas (MySQL/containers da VPS) e TCP relay; libera só o IP do próprio container
(relay↔relay). Sem `sudo` na VPS (ufw bloqueia portas do host) as portas saem pelo Docker: só IPv4 e faixa de 40
portas UDP (cada porta = um `docker-proxy`). Com acesso root dá para trocar por `network_mode: host` (ver DEPLOY).
Achado no E2E só-relay: Chrome aloca 1 relay por interface de rede e mantém os antigos durante o reinício de ICE →
cota por usuário 24 (não 10).

**D-025 — Microfone exige HTTPS → domínio.** (2026-10-03)
`getUserMedia` só funciona em contexto seguro; em `http://IP:3000` dá para entrar no grupo e **só ouvir** (o painel
avisa). Para falar em produção: domínio `park.magmacursosltda.com.br` com HTTPS (nginx da VPS + Let's Encrypt) — no ar.

**D-026 — Plateia do Dojo: espectador entra na mesma instância da luta, mas só recebe.** (2026-10-03)
Opções: (a) transmitir a luta para a praça (todos recebem estado), (b) plateia dentro da luta. Escolhida (b): banda só
para quem quer assistir, o espectador vira parte da cena (sentado na plateia, visto pelos lutadores) e o isolamento é
natural — comandos de luta são aceitos só de `fightOf`. Torcida limitada (1 a cada 0,7 s, 24 lugares) e desenhada fora
do tatame para não atrapalhar. Entrar só pelo prédio do Dojo (ou pela notificação) e só com luta rolando; o espectador
"está" na porta do Dojo (sai por lá). Sem mudar `KT`/`MOVES` (mecânica intacta).
