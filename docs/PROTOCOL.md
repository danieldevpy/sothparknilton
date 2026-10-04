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
| `challenge` | `to`, `rematch?`, `game?` | Desafia. `game` ∈ `golagol` (padrão) \| `karate` \| `queimada` \| `quiz`. Se o alvo já tinha te desafiado **para o mesmo jogo**, vira aceite. Queimada: quem já está numa quadra pode chamar (vários convites ao mesmo tempo) — quem aceitar entra na quadra de quem chamou; da praça, os dois criam uma quadra nova. |
| `challenge_reply` | `from`, `accept` | Responde um convite. |
| `gg_input` | `sy?` (chutador: y da bola), `charging?` (bool), `ky?` (goleiro: y alvo), `dive?` (`-1` cima / `1` baixo) | Só vale para quem está na partida e no papel certo. |
| `gg_shoot` | `angle` (rad), `power` 0..1, `curve` -1..1 | Só o chutador, na fase `aim`. Ângulo é limitado a um cone para o gol adversário. |
| `kt_input` | `mx`, `my` (-1..1), `block` (bool) | Karatê: direção segurada e defesa. Reenviar a cada ~150 ms enquanto segura. |
| `kt_act` | `a` ∈ `jab, punch, kick, hkick, dash`, `dx?`, `dy?` | Karatê: golpe/dash. Se o lutador estiver ocupado, fica num buffer de 0,18 s. `dx,dy` = direção do dash. |
| `kt_watch` | `id` (luta) | Entrar na **plateia** de uma luta (ou trocar de luta). Recusa com `kt_unwatch` (`gone`/`full`/`busy`). O espectador "fica" na porta do Dojo da praça (`pose 'watch'`). |
| `kt_unwatch` | — | Sair da plateia (reaparece na porta do Dojo). |
| `kt_cheer` | `r` ∈ `go, clap, fire, wow, lol`, `side?` (id de um lutador, `0` = ninguém) | Torcida. 1 a cada 0,7 s; `side` escolhe por quem torce (placa). **Não afeta a luta.** |
| `qm_create` | `hard` (bool) | Queimada: cria uma quadra nova no Ginásio e entra (treino livre até chegar alguém). |
| `qm_join` | `id` | Entra numa partida existente (na quadra se estiver no treino; senão na **fila**). Recusa com `qm_exit` (`gone`/`full`/`busy`). |
| `qm_leave` | — | Sai da partida (reaparece na porta do Ginásio). Na quadra no meio da rodada = conta como queimado. |
| `qm_input` | `mx`, `my` (-1..1) | Movimento segurado (reenviar a cada ~150 ms). Só vale para quem está na quadra/cemitério. |
| `qm_act` | `a` ∈ `throw, grab, dodge`; `x,y` (alvo do arremesso, coords da quadra); `dx,dy` (direção da esquiva) | `throw`: força = distância do alvo. `grab`: pega bola do chão no alcance; bola viva vindo → postura de **pegada**; fácil + bola longe → corre até ela. Durante o hit-stop, `grab` = pegada e `dodge` = esquiva salvam. |
| `qz_create` | `mode` ∈ `easy, normal, hard, mix`, `len` ∈ `10, 14` | Corrida das Perguntas: abre uma sala na Escola e entra correndo (lobby até ter 2 corredores ou `qz_start`). |
| `qz_join` | `id`, `as` ∈ `play, watch` | Entra numa sala. `play`: corre (no meio = começa da largada; passou do corte/lotada = plateia que entra na próxima). Já na plateia + `play` = "quero correr"; corredor + `watch` = vai para a plateia. Recusa com `qz_exit` (`gone`/`full`/`busy`). |
| `qz_leave` | — | Sai da sala (reaparece na porta da Escola). |
| `qz_answer` | `n` (nº da pergunta), `i` (índice da opção) | Só corredor, só na fase `ask`, uma vez por pergunta. `n` errado (atrasado) ou opção escondida pela cola = ignorado. |
| `qz_card` | `c` ∈ `cola, pum, dobro` | Usa uma carta na fase `ask` (cola/tudo-ou-nada antes de responder). Pum sem ninguém à frente → `qz_event nocard`. |
| `qz_cheer` | `r` ∈ `go, clap, wow, lol, think, fire`, `side?` (id de um corredor) | Torcida (plateia ou corredor), 1 a cada 0,7 s. |
| `qz_bot` | `add` ∈ `easy, normal, hard` \| `remove` (id do robô) | Só corredor, fora da corrida (lobby/contagem/pódio). Máx. 3 robôs. |
| `qz_start` | — | Corredor no lobby: começa já (sozinho = treino) · na contagem: encurta para 1 s. |
| `vc_invite` | `to` | Voz: convida `to` para o **meu** grupo (cria um se eu não tiver). `to` já em grupo → `vc_status in_group` (tem que pedir). Anti-spam 800 ms, até 6 pendentes. Se `to` já tinha me convidado/pedido, vira aceite. |
| `vc_request` | `to` | Voz: pede para entrar no grupo de `to` (quem foi clicado aprova). Aceito → saio do meu grupo atual. |
| `vc_reply` | `from`, `accept` | Responde convite/pedido de voz de `from`. |
| `vc_leave` | — | Sai do grupo de voz. |
| `vc_kick` | `id` | Só o dono 👑 do grupo: remove `id`. |
| `vc_mute` | `m` (mudo), `d` (sem som) | Estado do meu microfone/áudio, mostrado ao grupo. |
| `vc_signal` | `to`, `d` | Sinalização WebRTC para outro **membro do mesmo grupo** (senão é descartada). `d` ∈ `{sdp:{type:offer\|answer, sdp}}` (≤ 12 000 chars), `{ice:[{candidate, sdpMid?, sdpMLineIndex?}]}` (≤ 24; `candidate:''` = fim), `{restart:true}`, `{reset:true}`. |

## Servidor → Cliente
| t | Campos | Quando |
|---|---|---|
| `welcome` | `v`, `you`, `map`, `players[]` (cada um com `vg` = grupo de voz, 0 = nenhum), `lamps{id:bool}`, `score{red,blue}`, `ball[x,y]\|null`, `match` (null ou `{left,right,first}`), `qms[]` (partidas de Queimada, mesmo formato do `qm_live`), `qzs[]` (salas da Escola, formato do `qz_live`), `qzThemes[]` (`{id,name,flag,count}`), `fights[]` (`{id,a,b,rd,wins,w}` lutas de karatê em andamento, com plateia) | Após `hello` válido |
| `join` | `player:{id,nick,look,x,y,dir,pose,vg}` | Alguém entrou (não vai para quem entrou) |
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
| `ch_status` | `status`, `with`, `nick`, `game` | Resposta ao desafiante/convidado: `sent`, `declined`, `expired`, `busy`, `field_busy`, `full` (quadra de queimada lotada), `gone`, `invalid` |
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
| `qm_enter` | `id`, `ph`, `hard`, `rd`, `m`, `target` | Confirmação: você está na partida (a partir daí recebe `qm_state`/`qm_event`) |
| `qm_exit` | `id`, `reason` (`left`/`full`/`gone`/`busy`) | Saiu da partida ou entrada recusada |
| `qm_live` | `id`, `ph`, `hard`, `rd`, `m:[[pid, time('a'\|'b'\|''), lugar(0 fila,1 quadra,2 cemitério), pts]]` · ou `id`, `gone:1` | Para **todos** (lista do Ginásio; a praça esconde quem está lá). A cada entrada/saída/ponto/rodada. |
| `qm_state` | `ph`, `tm`, `rd`, `p:[[id,x,y,dir,st,t,time(0=a,1=b),cem,hold,inv,dodgeCd,catchCd,holdT]]`, `b:[[x,y,z,st(0 solta,1 viva,2 segurada,3 hit-stop),time,by,vx,vy,vz]]` | 30×/s, **só para quem está na partida** (coords da quadra 0..1100 × 0..420). Com `vx,vy,vz` o cliente extrapola a bola. |
| `qm_event` | `kind`, ... | Membros: `join/leave{id,nick}`, `round{round,a,b,queue}`, `go`, `throw{by,b,pow}`, `bank{b,x,y,tire}`, `hit{by,to,b,x,y,bank,pts,cem}`, `catch{by,from,b,x,y,pts,late}`, `fumble{by,b,x,y}`, `whoosh{by,b,x,y,last,pts}`, `dodge{by}`, `grab{by,b}`, `miss{by,why:far\|fast}`, `slow{by}`, `enter{id,team}`, `cem{id}`, `revive{id}`, `return{b,x,y}`, `roundEnd{winner,reason:wipe\|time,survivors,pts,round}`, `lobby` |
| `qm_end` | `id`, `winner`, `winnerNick`, `rank:[[pid,nick,pts,hits,catches,dodges]]` | Para **todos**: alguém chegou na meta. A quadra zera e recomeça sozinha em 8 s. |
| `qz_enter` | `id`, `role` (`play`\|`watch`), `mode`, `len`, `gifts[]` (casas de presente), `theme{id,name,flag}`, `race`, `n`, `ph`, `tm`, `q?` (pergunta em andamento, sem gabarito) | Você entrou na sala (a partir daí recebe `qz_room`/`qz_phase`/`qz_q`/`qz_reveal`/`qz_event`). |
| `qz_exit` | `id`, `reason` (`left`/`full`/`gone`/`busy`) | Saiu da sala ou entrada recusada. |
| `qz_live` | `id`, `ph`, `mode`, `len`, `theme`, `flag`, `n`, `r:[[id, pos, nick?]]` (robô: id < 0 e nick), `w:[pid]`, `open` (dá para entrar correndo agora) · ou `id`, `gone:1` | Para **todos** (lista da Escola; a praça esconde quem está em `r`/`w`). |
| `qz_room` | `host`, `r:[{id,nick,look,lane,pos,streak,shield,cards[],bot,pts,ans,g[],dobro}]`, `w:[[pid, seat, want]]` | Membros: corredores (pista, posição, sequência, escudo em perguntas restantes, cartas, presentes já pegos) e plateia. |
| `qz_phase` | `ph` ∈ `lobby, count, intro, over`, `tm`, `n`, `race`, intro: `lvl`, `gold`, `cat{icon,label}`, `combos:[[quem, 'hit'\|'shield'\|'combo', alvo]]` · lobby: `why?` | Membros: mudança de fase (a pergunta vem no `qz_q`, a revelação no `qz_reveal`). |
| `qz_q` | `n`, `q`, `opts[]`, `tm` (s), `lvl`, `gold`, `cat`, `pum:[[vítima, quem]]` | Membros: pergunta no ar. **Sem a resposta.** |
| `qz_reveal` | `n`, `ok` (índice certo), `a` (texto certo), `tip`, `res:[[id, de, meio, fim, acertou, opção, ms, dobro, sequência]]`, `combos:[[quem, 'hit'\|'block'\|'shield'\|'combo'\|'safe', alvo]]`, `gifts:[[id, carta\|'', casa]]`, `win` (id ou 0), `fast` | Membros: resultado. `meio` = depois dos passos; `fim` = depois dos combos. |
| `qz_event` | `kind`, ... | Membros: `answered{id}`, `card{by,c,to?,blocked?,now?,next?}`, `nocard{c,why}`, `cheer{by,r,side}`, `join{id,nick,as,want}`, `leave{id,nick}`, `bot{id,nick,level}`, `want{id}`, `bench{id,why:chose\|afk}`, `start{race,len}`, `say{id,text}` (robô falando) |
| `qz_cola` | `n`, `hide:[i...]` | Só para quem usou a cola: opções que sumiram. |
| `qz_end` | `id`, `winner`, `winnerNick`, `bot`, `theme`, `n`, `rank:[[id, nick, pos, acertos, perguntas, maior sequência, ataques, pts, bot]]` | Para **todos**: alguém cruzou a chegada. Nova corrida em ~20 s. |
| `vc_ask` | `from`, `nick`, `kind` (`invite`\|`request`), `ttl`, `size` | Convite para a voz / pedido para entrar no meu grupo (expira em `ttl` = 30 s). `size` = pessoas no grupo. |
| `vc_status` | `status`, `with`, `nick` | `sent`, `asked`, `declined`, `expired`, `full`, `in_group`, `no_group`, `same`, `gone`, `invalid`, `cooldown`, `too_many` |
| `vc_group` | `g:{id, owner, members:[{id, m, d}]}` ou `g:null` + `reason` (`left`/`kicked`/`dissolved`/`switch`), `ice?` | Estado do meu grupo (a cada mudança). `ice` (lista `RTCIceServer`: STUN + TURN com credencial temporária) só vai para quem acabou de entrar. Grupo que fica com 1 pessoa acaba (`dissolved`). |
| `vc_tag` | `id`, `g` | Para **todos**: o player entrou (`g` = id do grupo) ou saiu (`g = 0`) de um grupo de voz → 🎧 no nome e "Pedir para entrar" no cartão. |
| `vc_signal` | `from`, `d` | Sinalização repassada de outro membro (já validada). |

`pose`: `''` (em pé), `'sit'` (chão), `'bench'` (no banco), `'quiz'` (dentro da Escola, correndo ou assistindo) e, no Gol a Gol: `shooter`, `kick`, `keeper`, `diveU`/`diveD` (mergulhando), `lieU`/`lieD` (caído). `'dojo'` = lutando karatê, `'watch'` = na plateia do Dojo (não desenhar nenhum dos dois na praça).

Estados do lutador (`st` no `kt_state`): `idle`, `walk`, `block`, `jab`, `punch`, `kick`, `hkick`, `dash`, `hit`, `bstun` (defendeu), `stun` (tonto), `down` (caído), `getup`, `ko`, `win`. Fases da luta (`ph`): `intro` → `fight` → `ko` → (`intro`... ) até alguém fazer 2 rounds.

Fases do Gol a Gol (`ph`): `countdown` → `aim` → `flight` → `result` → (`aim`... ) até um gol.

Histórico: **v2** (2026-10-01) — desafios e Gol a Gol; `ball`/`b` podem ser `null`.
Karatê (2026-10-01, ainda v2: só campos/mensagens novos e opcionais) — `game` no desafio, `fights` no welcome, `kt_*`.
Plateia do Dojo (2026-10-03, ainda v2: mensagens novas e campos opcionais) — `kt_watch`, `kt_unwatch`, `kt_cheer`, `kt_live`, `rd/wins/w` em `fights`.
Queimada (2026-10-03, ainda v2: só mensagens/campos novos) — `qm_*`, `qms[]` no welcome, `game:'queimada'` no
desafio (+`match`, `hard`, `n` no convite), `ch_status full`, pose `'queimada'` (está dentro do Ginásio).
Corrida das Perguntas (2026-10-04, ainda v2: só mensagens/campos novos) — `qz_*`, `qzs[]`/`qzThemes[]` no welcome,
`game:'quiz'` no desafio (+`match`, `mode`, `n` no convite), pose `'quiz'`.
Chat de voz (2026-10-03, ainda v2: só mensagens/campos novos) — `vc_*`, `vg` nos players; `maxPayload` do WebSocket
subiu de 4 KB para 16 KB (o SDP de uma oferta WebRTC passa de 4 KB com escapes).
O **áudio não passa pelo WebSocket**: vai direto entre navegadores (WebRTC/Opus) ou pelo TURN (coturn). Ver ARCHITECTURE.

## Regras de evolução
- Campo novo opcional → compatível, não precisa subir versão.
- Mudar significado/remover campo → subir `PROTOCOL_VERSION` e documentar aqui.
- Fechamentos: `4000` hello timeout · `4001` hello inválido · `4002` conexões demais do mesmo IP (> 12).
