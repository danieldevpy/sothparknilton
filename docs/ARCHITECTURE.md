# Arquitetura

```
 Browser (client/)                         Node (server/)
 ┌──────────────────────────┐   WebSocket   ┌───────────────────────────┐
 │ main.js  login → connect │ ───────────▶  │ index.js  HTTP + /ws       │
 │ game.js  estado + render │  JSON {t:..}  │   └─ Room.js (regras)      │
 │ input.js / hud.js        │ ◀───────────  │      tick 30 Hz            │
 │ render/* (canvas 2D)     │   snapshots   │      snapshot 15 Hz        │
 └────────────┬─────────────┘    15 Hz      └────────────┬──────────────┘
              └──────────── shared/ (mesmo código nos dois lados) ┘
                 constants · map · geometry · pathfinding · validation
```

## Princípios
- **Servidor autoritativo e simples.** O cliente nunca diz "estou em X,Y"; ele diz "quero ir para X,Y". O servidor calcula o caminho (A*), anda o boneco a `PLAYER_SPEED` e manda snapshots.
- **`Room` não conhece rede.** Cada player tem uma função `send(string)`. Isso permite testar a regra inteira sem sockets (`tests/room.test.js`) e, no futuro, ter várias salas (um `Room` por sala) ou trocar o transporte.
- **Sem build no cliente.** ES modules nativos. `shared/` é servido em `/shared/*`, então cliente e servidor importam exatamente os mesmos arquivos.
- **Arte procedural com ponto de troca.** Cada objeto tem uma função `drawX(ctx, ...)`; trocar por sprite = mudar só o corpo dela.

## Servidor
- `server/index.js`
  - Serve `client/` em `/` e `shared/` em `/shared/` (com proteção a path traversal) e `/health`.
  - WebSocket em `/ws` (`maxPayload` 16 KB — por causa do SDP da voz). Primeira mensagem tem que ser `hello` em até 10 s.
  - Rate limit por conexão: 40 msgs/s (token bucket); excesso é descartado.
  - Heartbeat ping/pong a cada 15 s derruba conexões mortas.
  - Loop `setInterval` a 30 Hz chama `room.tick(dt)`; a cada 2 ticks faz broadcast de `room.snapshot()`.
- `server/Room.js`
  - Mensagens `vc_*` vão direto para `room.voice` (`server/VoiceHub.js`) em qualquer lugar (praça, Gol a Gol, dojo).
  - `addPlayer(hello, send)` valida nick (único, com sufixo numérico) e visual, escolhe spawn, manda `welcome` e avisa os outros com `join`.
  - `handle(id, msg)` despacha `move | chat | emote | interact`.
  - Interações são **pendentes**: o player anda até o ponto de interação e, ao chegar (`arrive`), a ação é executada se ainda estiver perto (tolerância 40 px).
  - Bola: física simples (atrito exponencial, quique nas laterais), chute por contato com player em movimento, gol quando cruza a linha dentro da boca do gol.

## Cliente
- `main.js` — tela de login (nick + cores, preview animado), conecta, troca para o jogo ao receber `welcome`.
- `game.js`
  - Guarda players com **buffer de snapshots** (`buf`) e renderiza com `INTERP_DELAY_MS` (110 ms) de atraso, interpolando entre amostras → movimento suave mesmo com 15 Hz.
  - Câmera segue o próprio player (lerp) com zoom adaptado à janela.
  - Ordem de desenho: fundo pré-renderizado → marcador de destino → patos → **sprites ordenados por Y** (árvores, bancos, postes, fonte, arquibancada, players, bola) → efeitos → nicks → (tela) neve + balões.
  - `hitTest(x, y)` decide se o clique é numa interação ou no chão.
- `render/paint.js` — helpers de traço "à mão": `blob`, `wobblyPoly` com tremida determinística que muda 6×/s ("boiling line").
- `render/bubbles.js` — balões estilo Habbo (X ancorado no mundo, Y em tela, empilhamento em cascata e subida lenta).
- `audio.js` — sons sintetizados com WebAudio (sem arquivos).

## Fluxo de uma interação (exemplo: sentar no banco)
1. Clique → `hitTest` → `{id:'bench-3'}` → cliente envia `interact`.
2. Servidor escolhe o lugar livre mais próximo do banco, calcula caminho até a frente dele, guarda `pending = {kind:'sit'}`.
3. Ticks andam o boneco; snapshots mostram o movimento para todos.
4. Ao chegar, `arrive()` ocupa o lugar e muda `pose = 'bench'` → aparece no próximo snapshot.
5. Qualquer novo `move` chama `leaveSeat()` e libera o lugar.

## Minigames (Gol a Gol)
```
 server/Room.js ── convites (Map from>to, TTL 20s) ── startMatch() ──▶ server/minigames/GolAGol.js
        │  tick(): se há partida → match.tick(dt) (broadcast gg_state 30 Hz)           │
        │  handle(): gg_input / gg_shoot só de quem está na partida                   │
        └─ endMatch() ◀───────────────────────── finish()/forfeit() ──────────────────┘
 shared/golagol.js  → constantes (GG), geometria do campinho, física da bola (advanceBall/predictPath)
 client/js/minigames/golagol.js → convites, estado interpolado, predição, controles, mira, textos, revanche
```
- **Uma partida por vez** no campinho (`room.match`). Os dois jogadores ficam "presos" ao minigame: `move`/`interact` são ignorados e a posição deles é ditada pela partida (`placeAvatars`).
- A bola livre da sala fica escondida (`snap.b = null`) durante a partida.
- **Física compartilhada**: o servidor simula com sub-passos (sem atravessar o goleiro); o cliente usa a mesma `predictPath` só para desenhar a prévia da mira.
- **Predição local**: o goleiro e a marca do chutador do próprio jogador andam na hora no cliente (mesma velocidade do servidor) e convergem suavemente para o valor do servidor. Mergulho e colisões são sempre do servidor.
- O cliente sobrepõe a posição/pose dos dois jogadores a partir do `gg_state` interpolado (70 ms), para goleiro e bola ficarem sincronizados no desenho.
- Novos minigames: seguir o mesmo formato (classe com `has/handle/tick/forfeit/publicInfo`, `room.match` vira um registro por área quando houver mais de um).

## Mobile (body.mobile)
- `main.js` chama `detectMobile()` **antes** de criar o `Game` (o zoom depende disso) e marca `body.mobile`.
  Detecção: `(pointer: coarse)` ou toque + tela < 820 px; override por `?mobile=1|0`.
- `mobile.js` monta `#m-ui` (barra de ícones, painéis, joystick, `#m-actions`, dica) e **reaproveita** elementos do HUD
  desktop movendo-os para os painéis (`#chat-log`, `#chat-form`, `#online-list`, `#score`). O CSS esconde o HUD desktop.
- `#m-actions[data-mode]` = `free | shooter | keeper | wait`; botões aparecem por `data-show`. `update()` roda a cada frame.
- Joystick: fora da partida manda `move` 40–90 px à frente da **última posição do servidor** (`game.myServerPos()`) a cada 110 ms;
  ao soltar, manda um passo curto à frente (para sem dar ré). Na partida vira `gg.axisY` (goleiro/marca do chute).
- Gol a Gol por toque: `gg.touchMode` — toque no campo só mira; o botão CHUTAR (segurar/soltar) controla a força.
- Câmera: zoom mínimo 0,72 no celular; durante a partida a câmera centraliza o campo **sem prender na borda do mapa**
  (senão o gol direito fica atrás dos botões em paisagem). Fora do mapa é pintado de neve.
- Balões: cortados abaixo da barra do topo (`game.bubbleTop`); jogando no celular só aparecem balões dos dois jogadores.

## Minigame Karatê (dojo separado)
```
 Room.onChallenge(game:'karate') ── aceite ──▶ startFight() ──▶ KarateFight (server/minigames/Karate.js)
   room.fights: Map(id → luta)   room.fightOf: Map(playerId → luta)   isBusy(id) = Gol a Gol ou luta
   tick(): cada luta → step (lutadores) → acertos dos dois (troca justa) → K.O. → kt_state só p/ os 2
   endFight() ◀── finish()/forfeit() — pose volta a '' e o player reaparece onde estava na praça
 shared/karate.js → KT, MOVES, walkStep/dashVector/inReach (mesmo código no servidor e na predição)
 client/js/minigames/karate.js → KarateClient: cena própria; Game.frame() desvia para kt.frame() quando ativo
```
- **Instância**: a arena tem coordenadas próprias (0..900 × 0..260); a posição do player na praça fica congelada
  (`pose='dojo'`). Por isso dá para ter **várias lutas ao mesmo tempo** (diferente do campinho do Gol a Gol).
- **Banda**: `kt_state`/`kt_event` vão só para os dois lutadores; a sala recebe só `kt_start`/`kt_end`.
- **Golpe = máquina de estados** (startup → active → recovery) com tempos em `MOVES`. Entrada vira **buffer** (0,18 s)
  se o lutador estiver ocupado; golpe com `chain` que acertou pode cancelar a recuperação.
- **Acertos depois do passo dos dois**: golpes ativos no mesmo tick trocam (os dois acertam); K.O. duplo é sorteado.
- **Cliente**: o próprio lutador é **previsto** (anda/dash/início do golpe na hora, converge para o servidor; erros
  grandes andando são corrigidos devagar porque o servidor está "atrás" pela latência); o oponente é **interpolado**
  com 80 ms de atraso e `t` extrapolado para as animações ficarem lisas. Hit-stop é só visual.
- **UI**: `#kt-ui` (ajuda de golpes no desktop, controles de toque no celular) é filho do `body` com z-index acima do
  `#m-ui`; `body.kt-on` esconde o que é da praça.

### Plateia do Dojo (espectadores)
```
 praça: ArenaClient (client/js/minigames/arena.js) ── lista de lutas (welcome.fights / kt_start / kt_live / kt_end)
   prédio do Dojo (render/dojohouse.js: fixo no fundo + parte viva) · painel "lutas ao vivo" · notificação kt_start
   clique "Assistir" ──▶ kt_watch{id} ──▶ Room.watchFight(): room.watching(pid → luta), pose 'watch', posição = porta
                                          KarateFight.addWatcher(): lugar (seat), kt_watch (ack) + kt_live p/ todos
 luta: KarateFight.toArena() = kt_state/kt_event/kt_cheer para os 2 lutadores + watchers
 cliente: KarateClient role 'watch' → os dois interpolados (sem previsão), sem controles, WatchUi (karate-watch.js),
          torcida desenhada por render/crowd.js (também para os lutadores)
 saída: kt_unwatch (pediu) · startFight/startMatch (foi jogar: reason busy) · endFight (kt_end: watchers liberados)
        · removePlayer (fechou o jogo) — em todos os casos pose '' e reaparece na porta do Dojo
```
- **Isolamento**: espectador não está em `fightOf` → `kt_input`/`kt_act` dele são ignorados; `kt_cheer` só mexe em
  `watchers` (lado + limite de 0,7 s) e é repassado. `isBusy()` inclui a plateia (não anda/interage/é desafiado na praça).
- **Lugares** (`seat`) são decididos no servidor (primeiro livre) para todos verem a mesma plateia; o cliente mapeia
  `seat` → posição (`seatOrder`: do meio para as pontas na fila de trás).
- **Banda**: cada espectador custa o mesmo que um lutador (30 `kt_state`/s). Lotação 24 por luta (`ARENA.MAX_WATCHERS`).

## Chat de voz por grupos (WebRTC)
```
 navegador A ──vc_invite/vc_request/vc_reply──▶ server/VoiceHub.js (room.voice)   grupos, convites, mudo
            ◀──vc_ask / vc_group(+ice) / vc_tag──        │ não conhece áudio
 navegador A ──vc_signal{to,d}──▶ VoiceHub (só se os dois estão no MESMO grupo) ──▶ navegador B
 navegador A ◀═════════════ áudio Opus (WebRTC, P2P) ═════════════▶ navegador B
                   └──── ou via TURN (coturn, container niltonpark-turn) quando não dá direto
```
- **Grupos no servidor** (`VoiceHub`, plugado no `Room` como o minigame): `groups`, `groupOf`, `asks` (convites/pedidos
  com TTL 30 s). Convidar quem já está em grupo não pode — o cartão oferece **"Pedir para entrar no grupo de voz"**
  (o player clicado aprova). Aceitar um convite/pedido de outro grupo = trocar de grupo (`reason:'switch'`). O dono 👑
  remove gente; quando ele sai, o mais antigo vira dono; grupo com 1 pessoa acaba. Máximo de 8 (malha).
- **Malha P2P**: cada membro tem uma `RTCPeerConnection` com cada outro (`client/js/voice/peer.js`). Só o lado de
  **menor id** oferece (inclusive reinício de ICE) → nunca há "glare". Recuperação: `disconnected` 2,5 s ou `failed` →
  reinício de ICE (até 2×) → recria a conexão do zero (`reset`); um vigia de 10 s repete enquanto não conectar.
  Candidatos ICE são agrupados (60 ms) por causa do limite de 40 msgs/s por conexão.
- **Microfone** (`voice/mic.js`): `getUserMedia` (eco/ruído/ganho do navegador) → WebAudio: volume de entrada →
  analisador (nível, ativação por voz) → atraso de 40 ms só na ativação por voz (não corta o começo da fala) →
  **porteira** (gain 0/1 com rampa) → `MediaStreamDestination`. A faixa enviada é sempre a mesma: trocar de microfone ou
  de eco/ruído não renegocia. Modos: voz aberta, ativação por voz (limiar em dB), apertar-para-falar (tecla / botão).
- **Opus**: `tuneOpusSdp` liga DTX (silêncio ≈ 0 kbps), FEC (perda no 4G), mono; bitrate por `sender.setParameters`
  (16/32/64 kbps nas configurações).
- **Reprodução**: um `<audio>` por pessoa (é o caminho que o cancelamento de eco dos navegadores conhece; WebAudio
  em faixas remotas tem eco no Chrome). Volume por pessoa/geral via `el.volume`, saída por `setSinkId` quando existe.
  Autoplay bloqueado → aviso "toque para ativar".
- **Quem está falando**: dos pacotes RTP (`receiver.getSynchronizationSources().audioLevel`) — sem WebAudio por pessoa;
  o meu vem do analisador do microfone. Desenhado no mapa (nome verde com ondas, 🔇) e no painel.
- **Microfone só aberto quando serve**: no grupo, testando nas configurações ou com convite esperando resposta.
- **HTTPS obrigatório para falar** (`getUserMedia` exige contexto seguro). Em `http://IP` dá para entrar no grupo e
  só ouvir; o painel avisa.
- **TURN**: credenciais temporárias no padrão "TURN REST API" do coturn (`usuário = expira:npID`,
  `senha = base64(HMAC-SHA1(TURN_SECRET, usuário))`, 12 h), entregues no `vc_group` de quem entra.

## Performance (MVP)
- Render ~0,5 ms/frame em desktop (medido com 1–3 players).
- Rede: snapshot ≈ 25 bytes/player × 15 Hz. Para 100 players ≈ 37 KB/s por cliente — ok para MVP; ver ROADMAP (delta/área de interesse) para escalar.
