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
| Topo (não andável) | Montanhas, pinheiros, 3 casas | — |

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

**Como começar**: clique em qualquer player → cartão → "⚽ Desafiar: Gol a Gol". O outro recebe um convite (20 s) com Aceitar/Recusar. Se os dois se desafiarem, vira aceite automático. Uma partida por vez no campinho; quem está na praça assiste ao vivo.

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
Várias lutas podem acontecer ao mesmo tempo (cada uma no seu dojo). Quem fica na praça só vê o resultado no chat.

**Como começar**: clique num player → cartão → "🥋 Desafiar: Karatê" (convite 20 s, revanche no fim igual ao Gol a Gol).

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
