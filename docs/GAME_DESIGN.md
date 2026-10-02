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

## Futuro (ver ROADMAP)
Minigames por área: corrida no gelo do lago, pênalti/futebol por times na área de sports, "pega-pega" na praça.
