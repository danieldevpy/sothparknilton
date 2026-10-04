# Nilton Park 🎿

Sala de comunicação multiplayer no navegador, estilo Habbo, com cara de desenho
tosco de papel recortado. Entre com um nick, ande pela praça, converse com balões
flutuantes, dance, solte um pum, jogue pedra no lago e chute a bola.

![login](client/assets/generated/login-bg.png)

## Rodando
Requer Node 20+.
```bash
npm install
npm start
```
Abra http://localhost:3000 em duas abas (ou dois computadores na mesma rede usando o IP da máquina) para ver o multiplayer.
Quer movimento na sala sem chamar amigos? `node scripts/bots.js 5`.

## Controles
| Ação | Como |
|---|---|
| Andar | Clique no chão · ou WASD / setas |
| Interagir | Clique em: **fonte** (moeda), **banco** (sentar), **poste** (liga/desliga), **lago** (pedra), **pato** (quack), **bola** (chutar) |
| Chat | `Enter` para focar, digite, `Enter` para enviar · `Esc` sai |
| Emotes | `1` acenar · `2` pular · `3` dançar · `4` pum · `5` sentar (ou `/dance`, `/wave`, `/jump`, `/fart`, `/sit`) |

## 📱 Celular
Abra no navegador do celular (mesma rede Wi-Fi): `http://IP-DO-PC:3000` — a interface mobile liga sozinha
(toque detectado). Para forçar: `?mobile=1` (ou `?mobile=0` para o layout de PC).
- **Joystick** (canto esquerdo) ou toque no chão para andar · **⬆ PULAR** e **😜** emotes (canto direito)
- Topo: **☰** menu (som, ajuda, trocar visual) · **💬** chat (com contador de não lidas) · **👥** quem está online
- Toque num boneco para desafiar · no Gol a Gol: toque no campo para mirar, **segure ⚽ CHUTAR** e solte na ⭐,
  **↺ ↻** dão efeito; defendendo, joystick move e **🧤⬆ / 🧤⬇** mergulham. Deitado o campo fica maior.

## ⚽ Minigame: Gol a Gol
Clique em outro player → **Desafiar: Gol a Gol**. Cada um defende um gol e vocês alternam os chutes. **Primeiro gol vence!**
- **Chutando**: mire com o mouse, **segure e solte** para a força (acerte a ⭐; passou do vermelho = isola), **Q/E** ou roda do mouse para dar efeito, **W/S** para mover a bola.
- **Defendendo**: mova o mouse (ou W/S) na linha do gol, **clique/Espaço** para mergulhar.
- Perdeu? Aparece o botão **Pedir revanche!**
- Sem ninguém online? `node scripts/ggbot.js` cria um adversário-robô.

## 🥋 Minigame: Karatê
Clique em outro player → **Desafiar: Karatê**. Vocês vão para o **dojo** (longe da praça) e lutam 1x1, **melhor de 3**.

| Tecla | Golpe | Vantagem |
|---|---|---|
| `J` / `Z` | Soco fraco | o mais rápido, encadeia combo |
| `U` / `X` | Soco forte | quebra a defesa |
| `K` / `C` | Chute fraco | alcance longo, deixa lento |
| `I` / `V` | Chute forte | dano máximo, derruba |
| `Shift` / `L` | Defesa (segurar) | levantar na hora H = **defesa perfeita** |
| `Espaço` | Dash (a cada 3 s) | atravessa golpes; golpe logo depois = investida |

Andar: WASD/setas. Repetir sempre o mesmo golpe deixa ele **previsível** (menos dano).
Sem ninguém? `node scripts/ktbot.js` cria um adversário (`node scripts/ktbot.js SenseiBot SeuNick` te desafia).

## 🔴🔵 Minigame: Queimada
Clique no **Ginásio** (prédio de tijolo à esquerda, em cima do lago) → **▶ Entrar** numa partida aberta ou
**➕ Nova partida** (Fácil / Difícil). Também dá para chamar alguém: clique no boneco → **Chamar p/ Queimada**
(de dentro da quadra, **➕ Convidar**). 1v1 com 2–3 pessoas, **2v2** com 4+; quem chega espera na **fila** e entra
quando alguém é queimado. Queimado vai para o **cemitério** (atrás do time adversário) e volta se acertar alguém de lá.

| Controle | Ação |
|---|---|
| `WASD` / setas | andar (cada time no seu lado) |
| com a bola: **segurar e soltar o clique** | arremessar onde soltou — longe = mais forte (aparece a trajetória) · `F` arremessa no mouse |
| sem bola: **clicar na bola** / `E` | pegar a bola do chão · bola vindo no ar = **pegada** (na hora H!) |
| sem bola: **clicar fora** / `Espaço` / botão direito | **esquivar** para lá (bem no último segundo = WHOOSH!) |

Pontos: acerto **5** (+2 de **tabela**, se quicou na parede) · pegada **3** · esquiva no último segundo **1** ·
último(s) de pé na rodada **10**. Primeiro a **50** vence; a quadra recomeça sozinha.
Sem ninguém? `node scripts/qmbot.js 3` coloca 3 bots no Ginásio (`node scripts/qmbot.js Bot SeuNick` te chama).

## 📚 Minigame: Corrida das Perguntas (inglês)
Clique na **Escola** (no fim da avenida, atrás da fonte) → **🙋 Correr** numa sala aberta, **👀 Assistir**, ou
**➕ Nova sala** (Fácil / Médio / Difícil / Misto · 10 ou 14 casas). Também dá para chamar alguém pelo cartão do boneco.
Todo mundo responde a mesma pergunta de inglês (tradução, gramática, verbos, situações, falsos cognatos, expressões...);
**acertou = anda 1 casa**. Primeiro a cruzar a chegada vence.

| Mecânica | Como funciona |
|---|---|
| 🔥 Combo | 2 acertos seguidos: quem está na sua frente **volta 1 casa** (liderando você ganha um 🛡️ escudo) |
| ⭐ Ouro | a cada 5 perguntas, uma vale 2 casas |
| 🎁 Presentes | casas 3, 7, 11 dão cartas: 🤫 **Cola** (some com 2 erradas) · 💨 **Pum** (nuvem nas opções de quem está na frente) · 🎲 **Tudo ou nada** (acertou anda o dobro, errou volta 1) |
| ⏳ Entrar no meio | começa da largada (perto do fim, entra na próxima corrida) |

Teclas: `1`–`4` ou `A`–`D` respondem · `Q` `W` `E` usam as cartas. No fim, o pódio mostra a **revisão** das que você errou.
Sozinho? Na sala, **🤖 + Robô** (fácil/médio/gênio) e **▶ Começar sozinho**. Bots pela rede: `node scripts/qzbot.js 3`.

## O mapa: Praça Central
- **Praça** — fonte no centro, bancos, postes de luz.
- **Lago** — patos nadando, píer, pedras para jogar na água.
- **Área de Sports** — campinho com gols, arquibancada e placar compartilhado.

## Testes
```bash
npm test
```

## Documentação
Comece por [CLAUDE.md](CLAUDE.md) (memória do projeto) e siga para [docs/](docs/).
