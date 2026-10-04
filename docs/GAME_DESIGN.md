# Game Design

## Visão
Um "Habbo" com cara de desenho animado tosco de papel recortado: cidade pequena
nas montanhas, neve, bonecos de cabeça gigante. O foco é **estar junto e zoar**:
andar, conversar, fazer emotes ridículos e mexer em coisas do cenário.
Minigames chegam depois, aproveitando as áreas do mapa.

## Direção de arte (fase "paint")
- Contorno preto grosso (3 px), cores chapadas, sem gradiente (exceto céu/luz).
- Linhas "tremem" 6×/s (boiling line) para parecer desenhado à mão.
- Bonecos: cabeça ≈ 50% da altura, gorro com pompom, olhos brancos grudados, luvas da cor do gorro.
- Movimento engraçado: anda pulando (hop + inclinação), pulo torto, dança balançando, pum com nuvem verde.
- Paleta da neve: chão `#f3f6fb`, céu `#8fcdf3 → #d4eefb`, caminhos `#dcd3c2`.

## Personagem
| Atributo | Opções (MVP) |
|---|---|
| Nick | 2–16 chars, único na sala (duplicado ganha número) |
| Gorro | 8 cores |
| Casaco | 8 cores |
| Pele | 4 tons |

## Mapa 1 — Praça Central (2000 × 1300)
| Zona | Conteúdo | Interações |
|---|---|---|
| Praça (centro) | Fonte, 4 bancos, 4 postes, placa | Moeda na fonte (brilho + "plim"), sentar, ligar/desligar poste |
| Lago (oeste) | Lago com gelo na margem, píer, 3 patos, banco | Pedra no lago (splash + ondas), quack nos patos |
| Área de Sports (leste) | Campinho, 2 gols, arquibancada com placar, poste | Bola física compartilhada, gols, placar global |
| Topo (não andável) | Montanhas, pinheiros, 1 casa, o **Ginásio**, a **Escola** (no fim da avenida da fonte) e o **Dojo** | Dojo: assistir lutas · Ginásio: queimada · Escola: Corrida das Perguntas |

## Chat
- Balões no estilo Habbo: aparecem sobre quem fala, empurram os anteriores para cima e sobem devagar até sumir (~28 s).
- Boca do boneco mexe enquanto "fala".
- Log de chat no canto com entradas/saídas.

## Emotes
| Tecla | Emote | Efeito |
|---|---|---|
| 1 | Acenar | Mão balançando + "oi!" |
| 2 | Pular | Pulo torto + "BOING!" |
| 3 | Dançar | Balança + notas musicais (cancela ao andar) |
| 4 | Pum | Nuvem verde + "PFFFRRT!" + olhos arregalados |
| 5 | Sentar | Senta no chão até andar |

## Minigame 1 — Gol a Gol ⚽ (v0.2.0)
Duelo 1x1 no campinho da Área de Sports. Cada um defende um gol e eles **alternam**: um chuta da sua marca, o outro defende. **Primeiro gol vence.**

**Como começar**: clique em qualquer player → cartão → "🎮 Minigames" → "⚽ Desafiar: Gol a Gol". O outro recebe um convite (20 s) com Aceitar/Recusar. Se os dois se desafiarem, vira aceite automático. Uma partida por vez no campinho; quem está na praça assiste ao vivo.

**Fluxo**: "GOL A GOL!" → contagem 3, 2, 1, JÁ! → cara-ou-coroa decide quem chuta primeiro → turnos de até 10 s → resultado (2,3 s) → troca.

**Chutador**
- Mira com o mouse; prévia pontilhada mostra o começo da trajetória (só ele vê — o goleiro não!).
- **Força**: segurar e soltar. O medidor **vai e volta** — acertar o tempo é a habilidade:
  - < 74%: mais lento, fácil de segurar · **74–93% ⭐ CHUTAÇO** · ≥ 93%: **ISOLA** (bola sobe e passa por cima).
- **Efeito** (Q/E, roda do mouse ou botões ↺/↻): curva a bola em até ±650 px/s².
- W/S desloca a bola na marca (±140 px) para mudar o ângulo.
- Pode quicar a bola nas laterais do campo (tabela).

**Goleiro**
- Anda na linha do gol seguindo o mouse (ou W/S), com velocidade limitada.
- **Mergulho** (clique/Espaço, toque duplo no celular): avança 58 px em 0,22 s e fica caído 0,65 s — se errar o tempo, fica no chão!
- Bola lenta (< 700 px/s) = **DEFENDEU!** (segura). Bola forte = **ESPALMOU!** (rebate e morre).

**Resultados com texto gigante + som**: DEFENDEU!, ESPALMOU!, NA TRAVE! (bola volta), PRA FORA!, ISOLOU! 🚀, FRAQUINHO..., DEMOROU! (perdeu a vez), GOOOOOL! (confete + tremida de tela), GOL CONTRA?!.

**Anti-empate eterno**: a partir do 9º chute, a cada 4 chutes os goleiros cansam (−15% de velocidade, mínimo 50%) — "GOLEIROS CANSADOS".

**Fim**: banner para a sala inteira. O perdedor recebe a tela "VOCÊ PERDEU! 😭 — Pedir revanche!"; o vencedor "VOCÊ VENCEU! 🏆 — Revanche?". Revanche manda um convite especial "🔥 quer REVANCHE!". Sair no meio = W.O.

**Equilíbrio** (medido com `scripts/golagol-balance.js`, goleiro-robô com 280 ms de reação): chute aleatório ≈ 13% de gol, chute bem feito (canto + ⭐) ≈ 40%. Contra humanos sai mais gol.

## Versão mobile (v0.3.0) — "estilo Roblox"
- **Topo**: ícones quadradinhos de vidro escuro — ☰ menu, 💬 chat (badge de não lidas), 👥 online; placar à direita.
- **Esquerda**: joystick virtual grande. **Direita**: botões redondos "de brinquedo" (coloridos, com sombra 3D):
  ⬆ PULAR (verde), 😜 emotes (roxo, abre grade de 4), e no Gol a Gol ⚽ CHUTAR (amarelo pulsando → vermelho segurando),
  ↺ ↻ efeito (azul) ou 🧤⬆ / 🧤⬇ mergulho (azul).
- Chat, online, menu e ajuda são **painéis recolhíveis** (um por vez); cartão do player e convites viram "bottom sheet"/cards grandes.
- Fonte da interface: Fredoka (arredondada); o mundo continua com o traço "paint".
- Retrato funciona; em partida aparece "🔄 Gire o celular para ver o campo maior". Paisagem tem login em 2 colunas.

## Minigame 2 — Karatê 🥋
Luta 1x1 **longe da praça**: ao aceitar o desafio, os dois somem da praça e vão para o **Nilton Dojo** (tatame,
estandarte, lanternas, gongo e um sensei velhinho que comenta a luta). **Melhor de 3 rounds**, 45 s cada, 100 de vida.
Várias lutas podem acontecer ao mesmo tempo (cada uma no seu dojo). Quem fica na praça vê o resultado no chat — ou
entra pelo **prédio do Dojo** para assistir (ver *Plateia do Dojo* abaixo).

**Como começar**: clique num player → cartão → "🎮 Minigames" → "🥋 Desafiar: Karatê" (convite 20 s, revanche no fim igual ao Gol a Gol).

**Visão 2.5D estilo beat 'em up**: anda em x e em profundidade; você **sempre encara o oponente**; um golpe só acerta
quem está à frente, no alcance e na mesma faixa de profundidade (dá para desviar indo para cima/baixo).

| Golpe | Teclas | Vantagem | Fraqueza |
|---|---|---|---|
| 👊 Soco fraco | J / Z | **o mais rápido** (sai em 0,07 s): interrompe golpes fortes; **encadeia combo** (no acerto pode emendar o próximo) | dano 4, alcance curto |
| 👊 Soco forte | U / X | **quebra a defesa** (deixa tonto), avança um passo, dano 13 | lento de sair (0,24 s): toma contra-ataque do soco/chute fraco |
| 🦶 Chute fraco | K / C | **alcance longo** e deixa o oponente **lento** ("perna bamba", 1,8 s) | recuperação longa se errar |
| 🦶 Chute forte | I / V | **dano máximo (19), maior alcance e DERRUBA** | muito lento (0,34 s) e fácil de punir se errar ("ERROU FEIO!") |
| 🛡️ Defesa | Shift / L (segurar) | segura tudo menos soco forte (só 15% do dano passa); anda devagar | **soco forte quebra** |
| ✨ Defesa perfeita | levantar a defesa ≤ 0,15 s antes do golpe | ninguém se machuca e o **atacante fica tonto** 0,75 s | precisa de tempo certo; não vale spammar (0,6 s entre tentativas) |
| 💨 Dash | Espaço | **a cada 3 s**: arranque de 135 px, **invencível** no começo (atravessa golpes e passa por trás) | recarga de 3 s |

Regras que dão profundidade:
- **CONTRA-ATAQUE** (+50%): acertar quem está preparando um golpe.
- **INVESTIDA** (+25%): golpe começado até 0,35 s depois do dash.
- **Combo**: acertos seguidos valem 15% menos cada; o 4º derruba ("COMBO FINAL!").
- **PREVISÍVEL**: repetir o mesmo golpe entre os últimos 4 acertos tira 15% por repetição (mín. 50%) — variar compensa.
- **Troca**: golpes que acertam no mesmo instante acertam os dois (sem vantagem de quem chegou primeiro no servidor).
- Caído/levantando = invencível. Tempo esgotado: vence quem tem mais vida (desempate: mais dano causado).

**Feedback**: faíscas de impacto, números de dano, "hit-stop" (congela 50–400 ms nos golpes fortes), tremida, barra de
vida com dano "atrasado" em branco, fantasmas no dash, estrelinhas de tontura, K.O.! / TEMPO! / PERFEITO!, gongo.
No celular: joystick + 4 botões de golpe + dash (com recarga visível) + defesa.

**Equilíbrio** (`scripts/karate-balance.js 40`, IAs com 0,2 s de reação): o estilo misto vence só-soco-forte 98%,
só-chute-forte 85%, só-defesa 100%, só-chute-fraco 95% e empata com só-soco-fraco (~50%); entre misto x misto o dano
fica dividido entre os 4 golpes (20–32% cada).

### Plateia do Dojo 👀 (assistir lutas)
O 3º prédio da fileira de casas virou o **Dojo** (telhado de pagode, placa 道場, lanternas de pedra). Ele mostra se tem luta:
- **Sem luta**: portas fechadas, placa **FECHADO** balançando, janelas apagadas, "zzz" saindo do telhado. Clicar só avisa
  "Dojo fechado" — **só dá para entrar se houver luta**.
- **Com luta**: letreiro **AO VIVO** piscando, lanternas acesas, cortina (noren) balançando, **teatro de sombras** de dois
  bonequinhos lutando atrás das janelas de papel, onomatopeias (POW! KIAI! BAM!) saindo do prédio e um selo flutuante
  "🥋 2 lutas ao vivo · 👀 5". Quem entra solta um "👀 Fulano entrou" na porta.
- **Clique** → painel "lutas ao vivo": uma linha por luta (`Nilton × Daniel · Round 2 · 1×0 · 👀 3` + **👀 Assistir**).
- **Notificação pequena** quando duas pessoas começam a lutar ("🥋 Nilton × Daniel vão lutar! 👀 Assistir"), some em 6,5 s.
  Não aparece para quem está lutando.

**Na plateia** o espectador vai para a mesma cena do dojo, **sentado de verdade na plateia** (o próprio boneco, com o
visual da praça, numa almofada atrás do tatame; 12 lugares na fila de trás + 12 na fila da frente, de costas para a
câmera). Os lutadores também veem a torcida. O espectador tem:
- **Torcida**: 📣 *Vai Fulano!* (escolhe o lado: o boneco segura uma **placa** com o nome, vermelha/azul como as barras de
  vida), 👏 🔥 😱 😂 (teclas 1–6). O boneco pula/acena/dança e o emoji sobe da plateia. Emotes da praça também animam o boneco.
- **Coro**: 2+ pessoas mandando "Vai" para o mesmo lado → "NIL-TON! NIL-TON!" em cima da plateia.
- **Empolgação** (🔥 medidor): sobe com torcida e golpes fortes; alta → a plateia faz **ola**. Alguns comem **pipoca** 🍿.
- **Locutor** 🎙️ (só para a plateia; os lutadores continuam com o sensei): narra contra-ataques, chutaços, combos,
  defesas perfeitas, K.O., "PERFEITO!", W.O.
- **⇄ Outra luta** (N) quando há várias e **🚪 Sair do dojo** (Esc) — reaparece na porta do Dojo na praça.
- Fim da luta: "🏆 Fulano VENCEU!", 3,6 s de comemoração e volta sozinho para a praça.

**Não atrapalha**: o servidor ignora qualquer comando de luta vindo da plateia; torcida tem limite (1 a cada 0,7 s);
tudo da torcida é desenhado **fora do tatame** (atrás e na borda de baixo); chat da plateia vira balãozinho curto em
cima do lugar dela; o coro fica baixo, longe das barras de vida. Quem está na plateia não pode ser desafiado (está
"ocupado") e não anda na praça. Lotação: 24 por luta.

## Minigame 3 — Queimada 🔴🔵 (v0.7.0)
A queimada de escola, num **Ginásio** na praça (o prédio de tijolo com telhado em arco, à esquerda, em cima do lago).
Proposta original (outro modelo) + melhorias decididas aqui — ver D-027..D-029.

**Entrar**: clicar no Ginásio → painel com as quadras (`Quadra 1 · Fácil · Daniel + Maria × Nilton + João · rodada 2 ·
⏳ 1 na fila · 🏆 Nilton 25 pts` + **▶ Entrar**) e **➕ Nova partida** (🟢 Fácil / 🔴 Difícil). Também: cartão do player → 🎮 Minigames →
**🔴🔵 Chamar p/ Queimada** (da praça cria uma quadra para os dois; de dentro da quadra, **➕ Convidar** lista quem está
livre e quem aceitar entra na SUA quadra). Notificação pequena quando alguém abre uma quadra. O prédio acende (janelas
com bolas voando, porta aberta, onomatopeias PÁ! QUEIMOU!) quando tem partida.

**Fila (Opção A da proposta)**: até 10 por quadra. 1 pessoa = **treino livre** (joga a bola nas paredes). 2–3 = 1v1;
4+ = **2v2** (duas bolas). Quem chega espera sentado no **banco da FILA** (encostado na parede) e **entra no lugar de quem
for queimado** (mesmo time, invencível 1 s, "ENTRA FULANO!"). Na rodada seguinte: quem esperou entra primeiro, depois quem
sobreviveu ("quem ganha fica"), depois os queimados. Cada um tenta continuar no mesmo time (Daniel+Maria × Nilton+João).

**Cemitério (melhoria — regra da queimada brasileira)**: queimado não fica parado: vai para o **cemitério atrás do time
adversário** (fantasminha 💀) e continua jogando de lá — se pegar uma bola e **queimar alguém pelas costas, VOLTA** para a
quadra (se o time tiver lugar). A rodada acaba quando um time fica sem ninguém na quadra.

**Arremesso**: com a bola, **segura o clique** (ou o dedo) → aparece a **trajetória** (arco pontilhado, sombra no chão,
onde quica, ✦ nas tabelas e barra de força) → **solta** = arremessa no ponto. **Força = distância do clique** (perto =
lob fraquinho, longe = pedrada de 860 px/s). A bola tem momento: se não acertar ninguém, quica e rola. Quica nas
**paredes** e nos **dois pneus** do meio (caos!). Segurar mais de 5 s (4 no difícil) → "🐢 demorou!" e a bola cai.

**Pegar**: bola **no chão** → clicar nela / `E` / 🧤: pega se estiver no alcance (48 px fácil, 34 px difícil) e devagar
(rápida rolando: "escapou!"). Fácil: clicou longe → o boneco **corre até ela** e passar por cima de bola lenta pega
sozinho. Difícil: "longe demais!". Várias pessoas na mesma bola: **quem clicar primeiro pega** (largada da rodada = bolas
na linha do meio, corrida!). Bola **vindo no ar** → postura de **pegada** (0,45 s): pegou dentro da janela =
**⚡ PEGOU!** (+3, fica com a bola); tarde demais na postura = **deixou escapar** (a bola pula, você fica tonto, mas
não é queimado). **A janela encolhe com a velocidade da bola** (0,42 s lenta → 0,22 s pedrada; difícil 0,30 → 0,13).

**Esquivar**: clicar **fora** da bola / `Espaço` / botão direito / 💨 → pulinho de 88 px para aquele lado, invencível
0,26 s, recarga 1,5 s (1,9 no difícil). Bola passando raspando (≤ 55 px) até 0,3 s depois = **WHOOSH!** (+1); até
0,15 s = "no último segundo".

**Hit-stop**: quando a bola acerta, ela **congela 0,14 s** no alvo (fica gostoso de ver) — e quem pegar/esquivar nesse
instante se salva (compensa o lag da internet). Depois: **QUEIMADO!**, tremida, o boneco cai e vai para o cemitério.

**Pontuação (modo Híbrido — o melhor da proposta)**: acerto **5** (+2 **TABELA!** se quicou na parede antes) · pegada **3**
· esquiva no último segundo **1** · último(s) de pé quando a rodada acaba **10**. Tempo de rodada 75 s (acabou: vence o
time com mais gente na quadra). **Primeiro a 50 pontos** vence → pódio (🥇🥈🥉 com 🔥 acertos ⚡ pegadas 💨 esquivas),
"CAMPEÃO DA QUADRA" no chat da praça, e a quadra **recomeça zerada** em 8 s (quem quiser sai). Se sobrar uma pessoa,
volta ao treino e os pontos zeram.

**Por que não os outros modos da proposta**: *Accuracy* (sem eliminação) e *Survival Time* (pontos por segundo vivo)
ficam embutidos no Híbrido (acerto vale ponto; sobreviver vale bônus); *Last One Standing* puro com fila contínua não
termina — o Híbrido com rodadas + meta de pontos dá partidas de 1–2 min e todo mundo pontua. Opção B (squad sem
eliminação) perderia a tensão de "entrar quando alguém cair".

**Feedback**: bola vermelha de borracha com anel da cor do time quando está viva + rastro, sombra que encolhe no ar,
"💥 FORTE!", TUM!/BOING! nas tabelas, QUEIMADO!, ⚡ PEGOU!, WHOOSH!, "VOLTOU DO CEMITÉRIO! 👻", "+5" subindo, placar na
parede (vivos por time, relógio, rodada), barra 🐢 do tempo segurando, anel do time no chão, nomes coloridos por time.

**Celular**: joystick + **🧤 PEGAR**, **💨 ESQUIVA** (com recarga visível) e **🎯 JOGAR** (arremessa no adversário mais perto;
mirar arrastando o dedo na quadra também funciona). Em pé: câmera segue o seu boneco com zoom maior e o placar vira
uma faixa de fichinhas; deitado: a quadra inteira.

**Equilíbrio** (`scripts/queimada-balance.js`, IAs de habilidade 0,5–0,9): 1v1 ~13–21% dos arremessos acertam, rodadas
de 14–19 s; 2v2 ~27–47%, rodadas de 9–14 s; ~10% de pegadas; quase nenhuma rodada acaba por tempo.

## Minigame 4 — Corrida das Perguntas 📚 (v0.8.0)
Um quiz que é **corrida**: cada um tem uma pista de tabuleiro (10 ou 14 casas) numa sala de aula, e cada acerto é um
pulinho para a frente. Tema 🇺🇸 **Inglês** para quem fala português (~2.700 perguntas escritas/geradas de tabelas):
vocabulário por tema (PT→EN e EN→PT), gramática, verbos irregulares, "na prática" (o que dizer em cada situação),
falsos cognatos, expressões, phrasal verbs, preposições, ortografia, opostos, números e horas, pronúncia, britânico ×
americano, certo-ou-errado e interpretação. No futuro o tema será configurável e abastecido por IA (ver QUIZ_CONTENT).
Estilo "RPG de papel recortado": barra do grupo com sequência 🔥, escudo 🛡️ e cartas; números de "dano" (+1, −1 CASA);
apagador voando no combo; professor que comenta em inglês ("Correct!", "No throwing erasers!").

**Entrar**: a casa no fim da avenida (norte da fonte) virou a **Escola** (madeira creme, telhado verde, torre com
sino, relógio, bandeira do tema, cavalete "QUIZ"). Com aula rolando ela acende: alunos levantando a mão nas janelas,
porta aberta, "CERTO!/ERROU!/COMBO!" saindo do prédio e o sino toca quando alguém vence. Clique → painel com as salas
(`Sala 1 · 🇺🇸 Inglês · 🟡 Médio · 14 casas · Nilton 7/14 · Daniel 5/14 · pergunta 9 · 👀 2` + **🙋 Correr** /
**👀 Assistir**) e **➕ Nova sala** (🟢 Fácil · 🟡 Médio · 🔴 Difícil · 🎲 Misto; ⚡ Rápida 10 casas / 🏁 Normal 14).
Também: cartão do player → **🎮 Minigames → 📚 Chamar p/ Quiz** (da praça abre uma sala para os dois; de dentro, ➕ Convidar).
Notificação pequena quando alguém abre uma sala.

**A rodada** (todo mundo responde a MESMA pergunta, ao mesmo tempo):
1. *Intro* (1,6 s): "PERGUNTA 7 · 🔤 Vocabulário · comida 🍔 · ⭐⭐" + quem está com combo e em quem (seta ⚡ na cena).
2. *Pergunta*: lousa com o enunciado, opções **A B C D** (teclas 1–4 ou A–D; 3 opções no fácil, 2 no certo/errado),
   relógio (12–24 s, mais tempo para enunciado longo). Respondeu = **mão levantada** na cena (os outros veem que você
   respondeu, não o quê). Todo mundo respondeu → revela na hora.
3. *Revelação* (3,4–5 s): certa em verde, a sua errada em vermelho, bolinhas de quem marcou cada opção, a **explicação**
   ("💡 Actually = na verdade · atualmente = currently") e as animações (pulinhos, presentes, apagador, escudo).

**Mecânicas**
| | Regra | Por quê |
|---|---|---|
| ✔ Acerto | anda 1 casa (errou ou não respondeu: fica) | o básico |
| 🔥 Combo | a cada **2 acertos seguidos**: o adversário **mais perto à frente** volta 1 casa (apagador voando, "VOLTA 1 CASA!"). Liderando (ninguém à frente) → **🛡️ escudo** que segura o próximo ataque (vale 1 pergunta) | a ideia original: quem está atrás tem como reagir |
| ⭐ Ouro | a 5ª, 10ª, 15ª... pergunta é um nível mais difícil e vale **2 casas** | picos de emoção previsíveis ("a próxima vale ouro!") |
| 🎁 Presentes | casas 3, 7, 11: passou pela primeira vez → ganha uma carta (máx. 2). Quem está atrás tira mais 💨/🎲; o líder, mais 🤫 | recompensa andar e ajuda quem ficou para trás |
| 🤫 Cola | some com 2 erradas (1 no fácil) — só você vê | ajuda nas difíceis; todo mundo começa com uma |
| 💨 Pum | nuvem fedida nas opções de quem está na sua frente ~4 s (toque 3× para abanar); se ele já respondeu, fica para a próxima | zoeira estilo South Park, atrapalha sem tirar casa |
| 🎲 Tudo ou nada | acertou anda o dobro (ouro = 4!), errou volta 1 | aposta para virar o jogo |
| ⚡ Rapidez | só pontos (desempate e ranking), não casas | aprender não pode virar corrida de dedo |
| 🏁 Chegada | primeiro a cruzar vence; dois na mesma rodada → quem acertou mais rápido. Quem cruzou não pode ser atacado | final limpo |

**Cálculo justo do combo** (o "só uma mecânica" pedido): o alvo é decidido **antes** da pergunta (todo mundo vê a
ameaça: "⚠️ Nilton está com COMBO: se ele acertar, você volta 1 casa!"); cada alvo só pode ser atacado por **um** combo
por pergunta (quem está mais atrás escolhe primeiro, o seguinte pega o próximo da fila); empatado não conta como "na
frente"; ninguém volta antes da largada; ataques resolvem antes dos escudos novos. Simulado (`scripts/quiz-balance.js`):
o combo **não muda quem é melhor** (70% × 30% com ou sem combo entre 0,75 e 0,65), mas dá ~1,5 ataques e ~1,6
viradas de liderança por corrida 1x1 e ~4,6 ataques com 4 jogadores.

**Entrar no meio** ("só será justo na próxima"): quem entra começa **da largada** com uma cola; depois que o líder passou
de 60% da pista, entra só na **próxima corrida** (assiste até lá; "⏳ entram na próxima: ..."). Mesmo atrasado dá para
virar sendo bom: alguém de 90% de acerto entrando com o líder (65%) na casa 4 de 14 vence 74% das vezes (58% na 6,
33% na 8); com a mesma habilidade, 28%.

**Robôs** (treinar sozinho / completar a sala): 🤖 + fácil (~55%), médio (~72%) ou gênio (~88% no básico, menos nas
difíceis); demoram para "ler" como gente, usam cartas e falam besteira ("Erro 404 😵"). Gente de verdade tira um robô
do lugar quando a sala está cheia; sala sem nenhum humano fecha. Sozinho: **▶ Começar sozinho**.

**Plateia 👀**: até 24, sentados no banco da parede (os bonecos de verdade) ou de costas na frente. Recebem a pergunta e
podem dar um **palpite que não conta** ("✔ Você acertaria!") — dá para aprender assistindo. Torcida: 📣 Vai Fulano,
👏 😱 😂 🤔 🔥 (limite 1 a cada 0,7 s). **🙋 Quero correr** a qualquer momento (agora ou na próxima). Corredor que fica
4 perguntas sem responder vai para a plateia.

**Fim**: "🏆 FULANO VENCEU!", confete, sino da Escola, log na praça ("📚 Nilton venceu a Corrida das Perguntas (Inglês) —
9/11 certas!"); pódio com ✔ acertos, 🔥 maior sequência e ⚡ ataques, e a **📖 Revisão** das perguntas que você errou
(o que você marcou × a certa × a explicação). Nova corrida sozinha em ~20 s (quem pediu entra).

**Celular**: em pé, a lousa ocupa a parte de baixo (opções em coluna, botões grandes) e a câmera enquadra o pelotão
(espalhado demais → em volta de você) com uma **faixa de progresso** de todos acima da lousa; deitado, lousa à direita
(opções 2×2) e a cena à esquerda; botões ➕ 👀 🚪 em vidro escuro.

## Chat de voz por grupos 🎙️ (v0.5.0)
A voz é **só em grupo** — ninguém fala "para a praça inteira". Assim dá para conversar com os amigos sem virar bagunça.
- **Clicar num player** (cartão) mostra um botão roxo conforme a situação:
  - ninguém em grupo → **🎙️ Chamar para conversar por voz** (cria um grupo com vocês dois);
  - eu em grupo, ele não → **🎙️ Convidar para o seu grupo de voz**;
  - ele já em grupo → **🎧 Pedir para entrar no grupo de voz** (ele aprova; se eu estava em outro grupo, troco);
  - mesmo grupo → "Está no seu grupo de voz" (desabilitado); grupo cheio (8) → desabilitado.
- Convites/pedidos chegam como cartões roxos com Aceitar/Recusar e barrinha de 30 s (iguais aos desafios).
- Quem está num grupo tem **🎧 antes do nome** (todo mundo vê → sabe que dá para pedir para entrar).
- Para quem está no MEU grupo: nome fica **verde com ondinhas de som** quando a pessoa fala; **🔇** quando está muda.
- **Painel 🎙️** (pílula no topo / ícone no celular): membros com indicador de fala, 👑 dono, volume de cada pessoa
  (só para mim), silenciar alguém só para mim, ✖ remover (dono), estado da conexão (⏳ conectando, 🔄 reconectando,
  🛰️ via servidor TURN, ping no tooltip), botões **🎤 Mic**, **🎧 Som** (desliga o som de todos e o mic), ⚙️ Ajustes, 📞 Sair.
- Pílula **🎤** ao lado (ou botão redondo roxo no celular, acima do PULAR): mudo rápido. Tecla **M** = mudo.
- **⚙️ Configurações de áudio**: microfone (dispositivo, volume 0–200%, medidor de nível, "ouvir meu microfone");
  quando transmitir (**ativação por voz** com sensibilidade e linha no medidor · **voz aberta** · **apertar para falar**
  com tecla configurável, padrão B — no celular segura o botão 🎤); saída (dispositivo quando o navegador deixa,
  volume das vozes); limpeza (cancelamento de eco, supressão de ruído, ganho automático); qualidade (16/32/64 kbps).
  Tudo salvo no navegador; o volume de cada pessoa fica salvo pelo nick.
- Sons curtinhos: entrar/sair do grupo, mudo/desmudo. A voz continua no Gol a Gol e no dojo (dá para provocar 😄).

## Futuro (ver ROADMAP)
Minigames por área: corrida no gelo do lago, pênalti/futebol por times na área de sports, "pega-pega" na praça.
