# Protocolo WebSocket (v2)

Endpoint: `ws(s)://<host>/ws` · Mensagens JSON · campo `t` = tipo (constantes em `shared/constants.js` → `MSG`).
Coordenadas em pixels do mapa (inteiros). `dir` = `1` (direita) ou `-1` (esquerda).

## Cliente → Servidor
| t | Campos | Notas |
|---|---|---|
| `hello` | `v`, `nick`, `look:{hat,shirt,skin}` | Primeira mensagem obrigatória (10 s). Cores fora da paleta viram padrão. |
| `move` | `x`, `y` | Destino. Servidor faz pathfinding. Cancela interação pendente e levanta do banco. |
| `chat` | `text` | Máx. 120 chars, cooldown 600 ms, controle removido. |
| `ping` | `n` (número) | A cada 2 s; o servidor responde `pong` com o mesmo `n` (latência). |
| `emote` | `e` ∈ `wave, jump, dance, fart, sit` | `sit` = sentar no chão (pose até se mover). |
| `interact` | `id`, `x?`, `y?` | `id`: `fountain`, `bench-N`, `lamp-N`, `lake` (+x,y na água), `duck` (+x,y), `ball`. |
| `challenge` | `to`, `rematch?`, `game?` | Desafia. `game` ∈ `golagol` (padrão) \| `karate`. Se o alvo já tinha te desafiado, vira aceite (do jogo dele). |
| `challenge_reply` | `from`, `accept` | Responde um convite. |
| `gg_input` | `sy?` (chutador: y da bola), `charging?` (bool), `ky?` (goleiro: y alvo), `dive?` (`-1` cima / `1` baixo) | Só vale para quem está na partida e no papel certo. |
| `gg_shoot` | `angle` (rad), `power` 0..1, `curve` -1..1 | Só o chutador, na fase `aim`. Ângulo é limitado a um cone para o gol adversário. |
| `kt_input` | `mx`, `my` (-1..1), `block` (bool) | Karatê: direção segurada e defesa. Reenviar a cada ~150 ms enquanto segura. |
| `kt_act` | `a` ∈ `jab, punch, kick, hkick, dash`, `dx?`, `dy?` | Karatê: golpe/dash. Se o lutador estiver ocupado, fica num buffer de 0,18 s. `dx,dy` = direção do dash. |
| `kt_watch` | `id` (luta) | Entrar na **plateia** de uma luta (ou trocar de luta). Recusa com `kt_unwatch` (`gone`/`full`/`busy`). O espectador "fica" na porta do Dojo da praça (`pose 'watch'`). |
| `kt_unwatch` | — | Sair da plateia (reaparece na porta do Dojo). |
| `kt_cheer` | `r` ∈ `go, clap, fire, wow, lol`, `side?` (id de um lutador, `0` = ninguém) | Torcida. 1 a cada 0,7 s; `side` escolhe por quem torce (placa). **Não afeta a luta.** |

## Servidor → Cliente
| t | Campos | Quando |
|---|---|---|
| `welcome` | `v`, `you`, `map`, `players[]`, `lamps{id:bool}`, `score{red,blue}`, `ball[x,y]\|null`, `match` (null ou `{left,right,first}`), `fights[]` (`{id,a,b,rd,wins,w}` lutas de karatê em andamento, com plateia) | Após `hello` válido |
| `join` | `player:{id,nick,look,x,y,dir,pose}` | Alguém entrou (não vai para quem entrou) |
| `leave` | `id` | Alguém saiu |
| `snap` | `ts`, `p:[[id,x,y,dir,moving(0/1),pose]]`, `b:[x,y]\|null` | 15×/s (`b` null = bola livre escondida durante Gol a Gol) |
| `chat` | `id`, `text` | Fala (inclui a própria) |
| `emote` | `id`, `e` | Emote (inclui o próprio) |
| `fx` | `id`, `kind`, ... | `coin{x,y}`, `splash{x,y,fx,fy}` (pedra de fx,fy até x,y), `quack{x,y}` |
| `obj` | `id`, `on`, `by` | Poste ligado/desligado |
| `goal` | `side` (`red`/`blue` = quem marcou), `score`, `by` (nick ou null) | Gol |
| `error` | `msg`, `fatal?` | `fatal` = conexão será fechada (ex.: nick inválido) |
| `pong` | `n` | Resposta ao `ping` |
| `challenge` | `from`, `nick`, `rematch`, `ttl`, `game` | Convite recebido (expira em `ttl` ms) |
| `ch_status` | `status`, `with`, `nick`, `game` | Resposta ao desafiante/convidado: `sent`, `declined`, `expired`, `busy`, `field_busy`, `gone`, `invalid` |
| `gg_start` | `left:{id,nick}`, `right:{id,nick}`, `first` | Partida começou (para todos — espectadores também) |
| `gg_state` | `ph`, `tm`, `turn`, `sh`, `ch`, `tired`, `sy`, `b:[x,y,z]\|null`, `k:{left:[y,dive,diveT], right:[...]}` | 30×/s durante a partida |
| `gg_event` | `kind`, ... | `turn{shooter,turn}`, `kick{id,power,curve}`, `save{by}`, `parry{by,x,y}`, `post{x,y}`, `out`, `over`, `weak`, `dead`, `timeout`, `tired{tired}`, `goal{by,side}`, `own{by,side}` |
| `gg_end` | `winner`, `loser`, `winnerNick`, `loserNick`, `reason` (`goal`/`own`/`wo`), `turns` | Fim de partida |
| `kt_start` | `id`, `a:{id,nick}`, `b:{id,nick}` | Luta de karatê começou (para **todos**: a praça esconde os dois) |
| `kt_state` | `ph`, `tm`, `rd`, `w:[vitóriasA, vitóriasB]`, `f:[[id,x,y,dir,st,t,hp,dashCd,slowT,combo,moving] ×2]` | 30×/s, **só para os 2 lutadores e a plateia** (coordenadas da arena, não do mapa) |
| `kt_event` | `kind`, ... | Lutadores + plateia: `round{round,wins}`, `fight{round}`, `hit{by,to,m,dmg,combo,counter,dash,kd,slow,stale,x,y}`, `block{by,to,m,dmg}`, `guardbreak{by,to,dmg}`, `parry{by,to,m}`, `whiff{by,m}`, `dash{by}`, `ko{winner,loser,reason(ko/time),round,perfect,wins}` |
| `kt_end` | `id`, `winner`, `loser`, `winnerNick`, `loserNick`, `reason` (`ko`/`time`/`wo`), `score:[venc,perd]` | Fim da luta (para todos). A plateia dela volta para a praça (sem `kt_unwatch`). |
| `kt_live` | `id`, `rd`, `wins:[A,B]`, `w:[[playerId, side, seat]]` | Para **todos**: placar/plateia de uma luta mudou (round novo, K.O., alguém entrou/saiu/trocou de lado). A praça esconde quem está em `w`; o prédio do Dojo mostra a lista. `seat` 0–11 = fila de trás, 12–23 = fila da frente. |
| `kt_watch` | `id`, `a:{id,nick}`, `b:{id,nick}`, `rd`, `wins`, `w` | Confirmação: você está na plateia (a partir daí recebe `kt_state`/`kt_event`/`kt_cheer` da luta) |
| `kt_unwatch` | `id`, `reason` (`left`/`busy`/`gone`/`full`) | Saiu da plateia (`left` = pediu; `busy` = foi jogar) ou entrada recusada (`gone` = luta não existe; `full` = 24 lugares ocupados) |
| `kt_cheer` | `by`, `r`, `side` | Torcida de alguém da plateia (para os lutadores e a plateia daquela luta) |

`pose`: `''` (em pé), `'sit'` (chão), `'bench'` (no banco) e, no Gol a Gol: `shooter`, `kick`, `keeper`, `diveU`/`diveD` (mergulhando), `lieU`/`lieD` (caído). `'dojo'` = lutando karatê, `'watch'` = na plateia do Dojo (não desenhar nenhum dos dois na praça).

Estados do lutador (`st` no `kt_state`): `idle`, `walk`, `block`, `jab`, `punch`, `kick`, `hkick`, `dash`, `hit`, `bstun` (defendeu), `stun` (tonto), `down` (caído), `getup`, `ko`, `win`. Fases da luta (`ph`): `intro` → `fight` → `ko` → (`intro`... ) até alguém fazer 2 rounds.

Fases do Gol a Gol (`ph`): `countdown` → `aim` → `flight` → `result` → (`aim`... ) até um gol.

Histórico: **v2** (2026-10-01) — desafios e Gol a Gol; `ball`/`b` podem ser `null`.
Karatê (2026-10-01, ainda v2: só campos/mensagens novos e opcionais) — `game` no desafio, `fights` no welcome, `kt_*`.
Plateia do Dojo (2026-10-03, ainda v2: mensagens novas e campos opcionais) — `kt_watch`, `kt_unwatch`, `kt_cheer`, `kt_live`, `rd/wins/w` em `fights`.

## Regras de evolução
- Campo novo opcional → compatível, não precisa subir versão.
- Mudar significado/remover campo → subir `PROTOCOL_VERSION` e documentar aqui.
- Fechamentos: `4000` hello timeout · `4001` hello inválido · `4002` conexões demais do mesmo IP (> 12).
