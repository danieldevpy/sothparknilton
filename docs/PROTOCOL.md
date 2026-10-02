# Protocolo WebSocket (v2)

Endpoint: `ws(s)://<host>/ws` · Mensagens JSON · campo `t` = tipo (constantes em `shared/constants.js` → `MSG`).
Coordenadas em pixels do mapa (inteiros). `dir` = `1` (direita) ou `-1` (esquerda).

## Cliente → Servidor
| t | Campos | Notas |
|---|---|---|
| `hello` | `v`, `nick`, `look:{hat,shirt,skin}` | Primeira mensagem obrigatória (10 s). Cores fora da paleta viram padrão. |
| `move` | `x`, `y` | Destino. Servidor faz pathfinding. Cancela interação pendente e levanta do banco. |
| `chat` | `text` | Máx. 120 chars, cooldown 600 ms, controle removido. |
| `emote` | `e` ∈ `wave, jump, dance, fart, sit` | `sit` = sentar no chão (pose até se mover). |
| `interact` | `id`, `x?`, `y?` | `id`: `fountain`, `bench-N`, `lamp-N`, `lake` (+x,y na água), `duck` (+x,y), `ball`. |
| `challenge` | `to`, `rematch?` | Desafia para Gol a Gol. Se o alvo já tinha te desafiado, vira aceite. |
| `challenge_reply` | `from`, `accept` | Responde um convite. |
| `gg_input` | `sy?` (chutador: y da bola), `charging?` (bool), `ky?` (goleiro: y alvo), `dive?` (`-1` cima / `1` baixo) | Só vale para quem está na partida e no papel certo. |
| `gg_shoot` | `angle` (rad), `power` 0..1, `curve` -1..1 | Só o chutador, na fase `aim`. Ângulo é limitado a um cone para o gol adversário. |

## Servidor → Cliente
| t | Campos | Quando |
|---|---|---|
| `welcome` | `v`, `you`, `map`, `players[]`, `lamps{id:bool}`, `score{red,blue}`, `ball[x,y]\|null`, `match` (null ou `{left,right,first}`) | Após `hello` válido |
| `join` | `player:{id,nick,look,x,y,dir,pose}` | Alguém entrou (não vai para quem entrou) |
| `leave` | `id` | Alguém saiu |
| `snap` | `ts`, `p:[[id,x,y,dir,moving(0/1),pose]]`, `b:[x,y]\|null` | 15×/s (`b` null = bola livre escondida durante Gol a Gol) |
| `chat` | `id`, `text` | Fala (inclui a própria) |
| `emote` | `id`, `e` | Emote (inclui o próprio) |
| `fx` | `id`, `kind`, ... | `coin{x,y}`, `splash{x,y,fx,fy}` (pedra de fx,fy até x,y), `quack{x,y}` |
| `obj` | `id`, `on`, `by` | Poste ligado/desligado |
| `goal` | `side` (`red`/`blue` = quem marcou), `score`, `by` (nick ou null) | Gol |
| `error` | `msg`, `fatal?` | `fatal` = conexão será fechada (ex.: nick inválido) |
| `challenge` | `from`, `nick`, `rematch`, `ttl` | Convite recebido (expira em `ttl` ms) |
| `ch_status` | `status`, `with`, `nick` | Resposta ao desafiante/convidado: `sent`, `declined`, `expired`, `busy`, `field_busy`, `gone`, `invalid` |
| `gg_start` | `left:{id,nick}`, `right:{id,nick}`, `first` | Partida começou (para todos — espectadores também) |
| `gg_state` | `ph`, `tm`, `turn`, `sh`, `ch`, `tired`, `sy`, `b:[x,y,z]\|null`, `k:{left:[y,dive,diveT], right:[...]}` | 30×/s durante a partida |
| `gg_event` | `kind`, ... | `turn{shooter,turn}`, `kick{id,power,curve}`, `save{by}`, `parry{by,x,y}`, `post{x,y}`, `out`, `over`, `weak`, `dead`, `timeout`, `tired{tired}`, `goal{by,side}`, `own{by,side}` |
| `gg_end` | `winner`, `loser`, `winnerNick`, `loserNick`, `reason` (`goal`/`own`/`wo`), `turns` | Fim de partida |

`pose`: `''` (em pé), `'sit'` (chão), `'bench'` (no banco) e, no Gol a Gol: `shooter`, `kick`, `keeper`, `diveU`/`diveD` (mergulhando), `lieU`/`lieD` (caído).

Fases do Gol a Gol (`ph`): `countdown` → `aim` → `flight` → `result` → (`aim`... ) até um gol.

Histórico: **v2** (2026-10-01) — desafios e Gol a Gol; `ball`/`b` podem ser `null`.

## Regras de evolução
- Campo novo opcional → compatível, não precisa subir versão.
- Mudar significado/remover campo → subir `PROTOCOL_VERSION` e documentar aqui.
- Fechamentos: `4000` hello timeout · `4001` hello inválido.
