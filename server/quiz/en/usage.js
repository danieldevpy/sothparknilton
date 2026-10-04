// Inglês "de verdade": situações do dia a dia, falsos cognatos, expressões (idioms) e phrasal verbs.
// Mesmo formato do grammar.js: "nível|pergunta|certa|erradas (;)|explicação".

export const CONTEXT = `
1|Alguém diz "Thank you!". Você responde:|You're welcome!|Thank you too much! ; Of nothing! ; Yes, please!|"You're welcome" = de nada. ("Of nothing" é tradução ao pé da letra — não existe.)
1|Você esbarrou em alguém sem querer. Você diz:|Sorry!|Cheers! ; Bless you! ; Welcome!|"Sorry" = desculpa (pediu perdão). "Excuse me" é para pedir licença ou chamar atenção.
1|Você quer passar por alguém no corredor. Você diz:|Excuse me.|Thank you. ; Bless you. ; Cheers.|"Excuse me" = com licença.
1|Alguém espirrou. Você diz:|Bless you!|Cheers! ; Excuse me! ; Good luck!|Depois de um espirro: "Bless you!" (saúde!).
1|Como responder "How are you?"|I'm fine, thanks.|I'm 20 years. ; I have fine. ; Yes, I am.|"How are you?" → I'm fine / I'm good, thanks. And you?
1|Alguém pergunta "What's your name?". Você responde:|My name is Ana.|I have Ana. ; I call Ana. ; Ana is my.|"My name is..." ou "I'm...".
1|Você chega numa loja às 10h. Você diz:|Good morning!|Good night! ; Good evening! ; Goodbye!|Até o meio-dia: good morning.
1|Você vai dormir. Você diz:|Good night!|Good evening! ; Good morning! ; Good afternoon!|"Good night" é despedida (ou para dormir). "Good evening" é cumprimento à noite.
1|Você encontra alguém às 20h. Para cumprimentar, diz:|Good evening!|Good night! ; Good morning! ; Good afternoon!|Chegando à noite: "Good evening". "Good night" é para se despedir.
1|Seu amigo diz "Let's go!". Ele quer:|ir agora (vamos!)|ficar ; comer ; dormir|"Let's go!" = vamos!
2|No restaurante, para pedir a conta:|Can I have the check, please?|Can I have the count, please? ; Give me the account. ; The bill is me.|Conta do restaurante: check (EUA) / bill (Reino Unido).
2|Você não entendeu o que a pessoa disse. Você diz:|Sorry, can you repeat that?|Sorry, can you return? ; What you say? ; Again you talk.|"Can you repeat that?" / "Pardon?" / "Sorry?"
2|Para perguntar o preço de algo:|How much is it?|How many is it? ; How cost is it? ; What price it?|Preço: How much is it? / How much does it cost?
2|Como pedir comida de forma educada?|I'd like a burger, please.|I want a burger, now. ; Give me a burger. ; I like a burger.|"I'd like" (I would like) = eu gostaria.
2|Para pedir informação a um desconhecido na rua:|Excuse me, where is the bus stop?|Hey, bus stop where? ; Please, the bus stop is where? ; You, where bus stop?|Para chamar atenção de estranhos: "Excuse me".
2|Alguém diz "I passed the test!". Você responde:|Congratulations!|Condolences! ; Bless you! ; Get well soon!|"Congratulations!" = parabéns (por uma conquista).
2|É aniversário do seu amigo. Você diz:|Happy birthday!|Congratulations birthday! ; Good birthday! ; Merry birthday!|Aniversário: Happy birthday!
2|Seu amigo está doente. Você diz:|Get well soon!|Good luck! ; Congratulations! ; Have fun!|"Get well soon" = melhoras.
2|Alguém pede desculpas por algo pequeno. Você responde:|No problem!|You're welcome! ; Bless you! ; Of course not problem!|"No problem / Don't worry / That's OK".
2|Ao atender o telefone:|Hello?|Yes? Who speaks? ; Allô, who is? ; Talk!|Atender: "Hello?" / "Hi, this is Ana."
2|No telefone, para dizer "é a Ana falando":|This is Ana.|I am Ana speaking here. ; Here is Ana. ; Ana talks.|No telefone: "This is Ana" (ou "Ana speaking").
2|Para oferecer ajuda a alguém:|Can I help you?|Can you help me? ; Do you help? ; I help you?|"Can I help you?" = posso ajudar?
2|Alguém pergunta "Do you mind if I sit here?" e você deixa. Você responde:|No, go ahead.|Yes, sit. ; Yes, I mind. ; I don't sit.|"Do you mind...?" = você se importa? → "No (not at all), go ahead" = pode!
2|Você quer saber as horas. Pergunta:|What time is it?|What hour is? ; How many hours? ; Which time it is?|Horas: What time is it?
2|No hotel, para fazer check-in:|I have a reservation.|I am reserved. ; My reserve is. ; I reserved me.|"I have a reservation (under the name...)".
2|Como dizer "estou com fome" em inglês?|I'm hungry.|I have hunger. ; I'm with hunger. ; I have hungry.|Em inglês a fome é um estado: I am hungry.
2|Como dizer "tenho 15 anos"?|I'm 15 years old.|I have 15 years. ; I have 15 years old. ; I'm 15 years.|Idade usa to be: I am 15 (years old).
2|Como dizer "estou com frio"?|I'm cold.|I have cold. ; I'm with cold. ; I stay cold.|Frio, calor, fome e sede usam to be: I'm cold.
2|Como dizer "estou com sono"?|I'm sleepy.|I have sleep. ; I'm with sleep. ; I sleep me.|Sono: I'm sleepy.
2|Como dizer "estou com pressa"?|I'm in a hurry.|I have hurry. ; I'm with hurry. ; I'm hurry up.|Pressa: I'm in a hurry.
2|Como dizer "estou com medo"?|I'm scared.|I have fear. ; I'm with fear. ; I fear me.|Medo: I'm scared / I'm afraid.
2|Como dizer "concordo com você"?|I agree with you.|I'm agree with you. ; I agree you. ; I concord with you.|"Agree" é verbo: I agree (sem "am").
2|Como dizer "depende"?|It depends.|Depends of. ; It's depending of. ; Is depend.|"It depends (on...)" — com ON, não "of".
2|Na lanchonete o atendente pergunta "For here or to go?". Isso significa:|Para comer aqui ou para viagem?|Você é daqui ou vai embora? ; Quer pagar aqui ou ali? ; Vai demorar ou é rápido?|"To go" = para viagem (Reino Unido: takeaway).
2|O atendente pergunta "Would you like anything else?". Ele quer saber:|se você quer mais alguma coisa|se você gostou ; se é para viagem ; como você vai pagar|"Anything else?" = mais alguma coisa?
2|Alguém diz "Take care!" ao se despedir. Significa:|Se cuida!|Tome cuidado com o carro! ; Pegue o carro! ; Leve isso!|"Take care!" = se cuida (despedida carinhosa).
2|O que dizer antes de comer, desejando bom apetite?|Enjoy your meal!|Good appetite! ; Eat good! ; Happy food!|Inglês não tem "bom apetite" fixo: "Enjoy your meal!" (ou o francês "Bon appétit!").
2|Para brindar, você diz:|Cheers!|Bless you! ; Good luck! ; Bottoms off!|Brinde: Cheers!
2|Na loja, o vendedor pergunta "Can I help you?" e você só está olhando:|I'm just looking, thanks.|I'm only seeing, thanks. ; I'm watching, thanks. ; I just see.|"Just looking" = só dando uma olhada.
2|Você quer experimentar uma roupa. Diz:|Can I try it on?|Can I experiment it? ; Can I prove it? ; Can I test it in?|"Try on" = experimentar roupa.
2|Alguém diz "See you later!". Você responde:|See you!|You see me! ; Later you! ; I see you never!|"See you (later)!" = até mais!
2|Para perguntar a profissão de alguém:|What do you do?|What are you doing? ; What you make? ; What's your work doing?|"What do you do?" = o que você faz (profissão). "What are you doing?" = o que está fazendo agora.
2|"What are you doing?" quer dizer:|O que você está fazendo (agora)?|O que você faz da vida? ; O que você fez? ; O que você vai fazer?|Presente contínuo = ação agora.
2|Para chamar o garçom educadamente:|Excuse me!|Hey you! ; Psst, waiter! ; Come here, waiter!|"Excuse me!" é o jeito educado.
2|O que significa "I'm just kidding"?|Estou só brincando.|Eu sou só uma criança. ; Estou chutando. ; Estou cuidando de crianças.|"Kidding" = brincando, zoando.
2|Seu amigo pergunta "Are you OK?" e você está bem. Você diz:|Yeah, I'm fine.|Yes, I'm OK too much. ; Yes, I have fine. ; Yes, I'm good thanks you.|"I'm fine / I'm good / I'm OK".
2|Você quer saber se pode pagar com cartão:|Can I pay by card?|Can I pay in card? ; Can I pay with the card of credit? ; Do you pay card?|"Pay by card / pay in cash".
2|Na estação alguém pergunta "What time does the train leave?". Quer saber:|a hora que o trem sai|a hora que o trem chega ; quanto custa ; onde fica o trem|"Leave" = sair, partir.
2|Como dizer "tanto faz"?|Whatever.|So much makes. ; Both make. ; Any way it does.|"Whatever / I don't mind / It doesn't matter".
2|Como dizer "boa sorte!"?|Good luck!|Good lucky! ; Have lucky! ; Lucky good!|"Good luck!" (luck = sorte).
2|No avião, o comissário diz "Fasten your seat belts." Você deve:|apertar o cinto|tirar o cinto ; levantar ; desligar o celular|"Fasten" = apertar, prender.
2|Placa "Wet floor" quer dizer:|piso molhado|chão seco ; piso quebrado ; proibido entrar|Wet = molhado.
2|Placa "Out of order" num elevador:|quebrado, fora de serviço|fora de ordem alfabética ; saída ; fila|"Out of order" = não está funcionando.
2|Placa "No trespassing":|proibido entrar (propriedade privada)|proibido estacionar ; sem ônibus ; não ultrapasse|Trespass = invadir propriedade.
2|Placa "Sale — 50% off":|liquidação: 50% de desconto|saída: 50% fora ; vende-se a metade ; fechado pela metade|"Sale" = promoção · "off" = de desconto.
2|Como desejar boas festas no fim do ano?|Merry Christmas!|Happy Christmas birthday! ; Good Christmas! ; Merry Natal!|Natal: Merry Christmas! (Reino Unido também usa Happy Christmas.)
2|Alguém diz "I'm sorry, I'm late." Para dizer que tudo bem:|Don't worry about it.|Don't sorry. ; No sorry. ; It's late, sorry.|"Don't worry (about it)" = não se preocupe.
3|"Do you mind opening the window?" Você vai abrir. Responde:|Not at all.|Yes, I do. ; Yes, I mind. ; I don't know.|Responder "not at all" = não me importo (= vou fazer).
3|Como dizer "faz 2 anos que moro aqui"?|I've lived here for 2 years.|I live here since 2 years. ; Makes 2 years I live here. ; I'm living here 2 years ago.|Desde um tempo até agora: present perfect + for.
3|"Nice to meet you!" — você responde:|Nice to meet you too!|Me too meet! ; Nice meet! ; Same to me!|Resposta padrão: "Nice to meet you too!" ou "You too!"
3|Alguém diz "I'm sorry for your loss." Você está num:|velório (condolências)|aniversário ; jogo de futebol ; restaurante|"Sorry for your loss" = meus sentimentos (alguém faleceu).
3|"Could you give me a hand?" quer dizer:|Você pode me ajudar?|Você pode me dar sua mão? ; Você pode me aplaudir? ; Você pode me dar dinheiro?|"Give someone a hand" = dar uma mãozinha.
3|O que "I'm broke" significa?|Estou sem dinheiro.|Estou quebrado (machucado). ; Estou cansado. ; Estou com fome.|"Broke" (gíria) = duro, sem grana.
3|Alguém diz "My bad!". Isso quer dizer:|Foi mal! (culpa minha)|Estou mal. ; Que coisa ruim! ; Meu bairro.|"My bad" = foi mal, erro meu.
3|"It's on me!" no restaurante significa:|Eu pago!|Está em cima de mim! ; É minha vez de pedir! ; Estou cheio!|"It's on me" = é por minha conta.
3|Seu chefe diz "Let's touch base tomorrow." Ele quer:|conversar rapidinho amanhã|jogar beisebol amanhã ; nunca mais falar disso ; mudar de base amanhã|"Touch base" = fazer um contato rápido, alinhar.
3|Alguém diz "I'll take a rain check." Significa:|Fica para a próxima.|Vou ver se vai chover. ; Vou pagar a conta. ; Vou levar o guarda-chuva.|"Take a rain check" = recusar agora, mas aceitar outro dia.
3|Placa "Keep off the grass":|não pise na grama|mantenha a grama ; grama à venda ; corte a grama|"Keep off" = ficar longe de.
3|No elevador alguém pergunta "Which floor?". Você responde:|Third, please.|Three floor, please. ; The floor three. ; In three.|Andares usam ordinais: the third floor.
3|Você liga e a pessoa diz "Hold on, please." Você deve:|esperar na linha|desligar ; segurar o telefone mais forte ; ligar depois|"Hold on" = aguarde.
3|No caixa: "Paper or plastic?" A pessoa quer saber:|se você quer sacola de papel ou de plástico|se vai pagar em dinheiro ou cartão ; se quer nota fiscal ; se quer um cartão de plástico|Pergunta clássica de supermercado nos EUA.
`;

export const FALSE_FRIENDS = `
1|"Actually" significa...|na verdade|atualmente ; atual ; ativamente|Atualmente = currently/nowadays. Actually = na verdade.
1|"Pretend" significa...|fingir|pretender ; prender ; pretensioso|Pretender = intend/plan. Pretend = fingir.
1|"Push" significa...|empurrar|puxar ; apertar ; pular|Puxar = pull. Push = empurrar. (Leia a porta antes!)
1|"Pull" significa...|puxar|pular ; empurrar ; polir|Pull = puxar. Pular = jump.
1|"Parents" significa...|pais (pai e mãe)|parentes ; parceiros ; padrinhos|Parentes = relatives.
1|"Time" (em "What time is it?") significa...|hora, tempo|time de futebol ; timão ; temor|Time (equipe) = team.
2|"Library" significa...|biblioteca|livraria ; livreiro ; liberdade|Livraria = bookstore.
2|"College" significa...|faculdade|colégio ; colega ; colar|Colégio = school (high school).
2|"Exquisite" significa...|requintado, delicioso|esquisito ; exigente ; exibido|Esquisito = weird/strange.
2|"Lunch" significa...|almoço|lanche ; janta ; café|Lanche = snack.
2|"Novel" significa...|romance (livro)|novela ; novidade ; novato|Novela = soap opera.
2|"Fabric" significa...|tecido|fábrica ; fabricante ; tela|Fábrica = factory.
2|"Costume" significa...|fantasia (roupa)|costume (hábito) ; costura ; cortina|Costume (hábito) = habit/custom.
2|"Sensible" significa...|sensato|sensível ; sensual ; sentido|Sensível = sensitive.
2|"Realize" significa...|perceber, se dar conta|realizar ; relaxar ; reler|Realizar = accomplish/achieve.
2|"Attend" significa...|frequentar, comparecer|atender ; entender ; atentar|Atender (o telefone) = answer.
2|"Assist" significa...|ajudar|assistir (TV) ; assinar ; assustar|Assistir TV = watch TV.
2|"Expert" significa...|especialista|esperto ; experiente ; expulso|Esperto = smart/clever.
2|"Pasta" significa...|massa (macarrão)|pasta (de arquivos) ; pasta de dente ; patê|Pasta de arquivos = folder; pasta de dente = toothpaste.
2|"Office" significa...|escritório|ofício (profissão) ; oficina ; ofensa|Oficina = workshop.
2|"Prejudice" significa...|preconceito|prejuízo ; prejudicar ; precipício|Prejuízo = loss/damage.
2|"Tax" significa...|imposto|táxi ; taxa de juros ; taça|Taxa de serviço = fee.
2|"Mayor" significa...|prefeito|maior ; major (militar) ; mestre|Maior = bigger/larger.
2|"Data" significa...|dados (informação)|data (dia) ; dado (de jogar) ; datado|Data (dia do calendário) = date.
2|"Push-up" significa...|flexão de braço|puxão ; empurrão de carro ; pulo|Push-up = flexão.
2|"Cigar" significa...|charuto|cigarro ; cigarra ; cegar|Cigarro = cigarette.
2|"Fun" significa...|diversão|fundo ; funil ; fumaça|"Funny" = engraçado.
2|"Notebook" (no caderno escolar) significa...|caderno|só computador portátil ; nota ; bloco de notas musical|Notebook = caderno (e também laptop). Computador portátil = laptop.
3|"Eventually" significa...|finalmente, com o tempo|eventualmente (às vezes) ; evidentemente ; imediatamente|Eventualmente (de vez em quando) = occasionally.
3|"Comprehensive" significa...|abrangente, completo|compreensivo ; compreensível ; comprometido|Compreensivo = understanding.
3|"Sympathetic" significa...|solidário, compreensivo|simpático ; sintético ; sinfônico|Simpático = nice/friendly.
3|"Intend" significa...|pretender, ter a intenção|entender ; intender ; atender|Entender = understand.
3|"Exit" significa...|saída|êxito ; exílio ; existir|Êxito = success.
3|"Retired" significa...|aposentado|retirado ; retido ; reto|Retirar = withdraw/remove.
3|"Lecture" significa...|palestra, aula|leitura ; letreiro ; lençol|Leitura = reading.
3|"Notice" significa...|notar, perceber|notícia ; noticiar ; notório|Notícia = news.
3|"Journal" significa...|diário, revista científica|jornal ; jornada ; jornalista|Jornal = newspaper.
3|"Appointment" significa...|horário marcado, consulta|apontamento ; aposta ; anotação|Apontamento = note.
3|"Physician" significa...|médico|físico ; fisioterapeuta ; fisiologista|Físico = physicist.
3|"Preservative" significa...|conservante (alimentos)|preservativo ; preservado ; presunçoso|Preservativo = condom! Cuidado no supermercado 😅
3|"Pull over" significa...|encostar o carro|pulôver (blusa) ; puxar para cima ; passar por cima|Blusa de lã = pullover/sweater. Pull over = parar no acostamento.
3|"Balcony" significa...|sacada, varanda|balcão ; balança ; baleia|Balcão = counter.
3|"Enroll" significa...|matricular-se|enrolar ; enrijecer ; entrar|Enrolar = roll up / stall.
3|"Record" significa...|gravar, registrar|recordar ; recortar ; recorrer|Recordar = remember.
3|"Resume" (verbo) significa...|retomar, continuar|resumir ; resultar ; reunir|Resumir = summarize. (Résumé com acento = currículo.)
3|"Terrific" significa...|incrível, ótimo|terrível ; aterrorizante ; territorial|Terrível = terrible.
3|"Mascara" significa...|rímel|máscara ; mascarado ; mastigar|Máscara = mask.
3|"Injury" significa...|ferimento, lesão|injúria (ofensa) ; injeção ; injustiça|Injúria (ofensa) = insult.
3|"Casualty" significa...|vítima (de acidente)|casualidade ; casual ; casamento|Casualidade = chance/coincidence.
3|"Deception" significa...|engano, fraude|decepção ; recepção ; decepar|Decepção = disappointment.
3|"Scholar" significa...|estudioso, acadêmico|escolar (aluno) ; escolhido ; escola|Escolar = school (adj.) / student.
3|"Convict" (substantivo) significa...|condenado, presidiário|convicto ; convidado ; convite|Convicto = convinced.
3|"Legend" (num mapa) significa...|legenda do mapa|legenda de filme ; lendário ; lençol|Legenda de filme = subtitle. "Legend" = lenda ou legenda de mapa.
3|"Cafeteria" significa...|refeitório (self-service)|cafeteria (lugar de café) ; cafeteira ; bar|Lugar de café = coffee shop. Cafeteria = refeitório.
3|"Anthem" significa...|hino|antena ; antigo ; antes|Hino nacional = national anthem.
`;

export const IDIOMS = `
1|"Break a leg!" quer dizer...|Boa sorte!|Quebre a perna! ; Cuidado para não cair! ; Corra rápido!|Dita antes de uma apresentação: boa sorte! 🎭
1|"It's a piece of cake!" quer dizer...|É moleza!|É um pedaço de bolo! ; Está delicioso! ; É uma festa!|Piece of cake = muito fácil.
2|"It's raining cats and dogs." quer dizer...|Está chovendo muito.|Está chovendo bichos. ; Os animais estão molhados. ; Vai parar de chover.|Chuva forte, "chovendo canivetes".
2|"I'm under the weather." quer dizer...|Estou meio doente.|Estou debaixo da chuva. ; Estou com calor. ; Estou animado.|Under the weather = indisposto.
2|"It costs an arm and a leg." quer dizer...|Custa os olhos da cara.|Custa um braço quebrado. ; É de graça. ; Dói muito.|Muito caro!
2|"Once in a blue moon" quer dizer...|muito raramente|toda lua cheia ; à noite ; para sempre|Acontece quase nunca.
2|"Hit the books" quer dizer...|estudar muito|bater nos livros ; jogar livros fora ; ler um livro só|"I need to hit the books for the test."
2|"Spill the beans" quer dizer...|contar o segredo|derrubar o feijão ; cozinhar ; fazer bagunça|Spill the beans = dar com a língua nos dentes.
2|"Let's call it a day." quer dizer...|Vamos encerrar por hoje.|Vamos ligar amanhã. ; Vamos dar nome ao dia. ; Vamos começar o dia.|Encerrar o trabalho do dia.
2|"Hit the sack" quer dizer...|ir dormir|bater no saco ; brigar ; ir à academia|"I'm tired, I'm going to hit the sack."
2|"Pull someone's leg" quer dizer...|zoar, enganar de brincadeira|puxar a perna ; derrubar alguém ; ajudar alguém|"Are you pulling my leg?" = tá me zoando?
2|"Over the moon" quer dizer...|muito feliz|na lua ; distraído ; viajando|"She was over the moon with the news."
2|"Better late than never." quer dizer...|Antes tarde do que nunca.|Melhor não chegar. ; Nunca se atrase. ; Chegue cedo sempre.|Igual ao português!
2|"Time flies!" quer dizer...|O tempo voa!|Moscas do tempo! ; O tempo para. ; Hora de voar!|"Time flies when you're having fun."
2|"Take it easy." quer dizer...|Vai com calma / relaxa.|Pegue fácil. ; É fácil. ; Seja rápido.|Take it easy = relaxa, sem estresse.
2|"Break the ice" quer dizer...|quebrar o gelo (puxar conversa)|quebrar gelo de verdade ; esfriar a bebida ; brigar|Igual ao português.
2|"I'm all ears." quer dizer...|Sou todo ouvidos.|Tenho orelhas grandes. ; Não estou ouvindo. ; Estou surdo.|Pode falar, estou ouvindo!
2|"Couch potato" é...|quem vive no sofá vendo TV|batata frita ; sofá de batata ; cozinheiro|Preguiçoso de sofá.
2|"Butterflies in my stomach" quer dizer...|frio na barriga|dor de barriga ; fome ; enjoo|Nervosismo (antes de algo importante).
2|"No pain, no gain." quer dizer...|Sem esforço, não há resultado.|Sem dor, sem ganho de peso. ; Não sinta dor. ; Ganhe sem dor.|Ditado de academia.
2|"Speak of the devil!" se usa quando...|a pessoa de quem falávamos aparece|alguém fala palavrão ; está muito quente ; alguém mente|Igual ao "falando no diabo...".
2|"Out of the blue" quer dizer...|do nada, de repente|fora do azul ; no céu ; triste|"He called me out of the blue."
2|"Keep an eye on" quer dizer...|ficar de olho em|ter um olho só ; fechar o olho ; olhar torto|"Keep an eye on my bag, please."
2|"When pigs fly" quer dizer...|nunca (impossível)|amanhã ; logo ; no verão|"He'll clean his room when pigs fly." 🐷
2|"What's up?" quer dizer...|E aí? / Tudo bem?|O que está em cima? ; O que subiu? ; Olhe para cima!|Cumprimento informal. Resposta comum: "Not much!"
2|"Chill out!" quer dizer...|Relaxa! / Fica frio!|Saia do frio! ; Esfrie a comida! ; Vamos sair!|Calma!
2|"No way!" quer dizer...|De jeito nenhum! / Não acredito!|Sem caminho! ; Não tem saída ; Vá embora!|Pode ser surpresa ou recusa.
2|"Sounds good!" quer dizer...|Parece ótimo! / Beleza!|Que som bom! ; A música está boa ; Faça barulho|Concordar com uma proposta.
3|"Bite the bullet" quer dizer...|encarar algo difícil de uma vez|morder a bala ; mentir ; desistir|Fazer algo desagradável que precisa ser feito.
3|"Get cold feet" quer dizer...|amarelar (ficar com medo e desistir)|ficar com os pés gelados ; sentir frio ; ir para o inverno|Muito usado antes de casamentos.
3|"Kill two birds with one stone" quer dizer...|matar dois coelhos com uma cajadada|caçar passarinhos ; jogar pedras ; ter muita sorte|Fazer duas coisas de uma vez.
3|"On cloud nine" quer dizer...|nas nuvens (muito feliz)|no nono andar ; muito alto ; muito cansado|Muito feliz.
3|"The last straw" quer dizer...|a gota d'água|o último canudo ; a última chance ; o último pedido|O limite da paciência.
3|"Cut corners" quer dizer...|fazer de qualquer jeito para economizar|cortar caminho pela esquina ; fazer curvas ; cortar papel|Fazer mal feito para poupar tempo ou dinheiro.
3|"In hot water" quer dizer...|em apuros|na banheira ; com calor ; feliz|"He's in hot water with his boss."
3|"See eye to eye" quer dizer...|concordar|olhar nos olhos ; brigar ; ficar vesgo|"We don't see eye to eye on politics."
3|"A blessing in disguise" é...|um mal que vem para o bem|uma bênção disfarçada ; uma fantasia ; um segredo|Algo ruim que acaba sendo bom.
3|"Beat around the bush" quer dizer...|enrolar, não ir direto ao ponto|bater no arbusto ; procurar algo ; fugir|"Stop beating around the bush!"
3|"Let the cat out of the bag" quer dizer...|revelar um segredo|soltar o gato ; perder algo ; fugir de casa|Igual a "spill the beans".
3|"The ball is in your court." quer dizer...|Agora é com você.|A bola está na quadra. ; Vá jogar tênis. ; Você perdeu.|A decisão é sua.
3|"A dime a dozen" quer dizer...|muito comum, tem aos montes|muito caro ; dez centavos ; uma dúzia exata|"Phones like that are a dime a dozen."
3|"Actions speak louder than words." quer dizer...|Atitudes valem mais que palavras.|Ações fazem barulho. ; Fale mais alto. ; Palavras são ações.|Faça, não só fale.
3|"Don't cry over spilled milk." quer dizer...|Não adianta chorar pelo leite derramado.|Não derrame o leite. ; Leite faz chorar. ; Cuidado com o leite.|Igual ao português!
3|"Every cloud has a silver lining." quer dizer...|Há sempre um lado bom.|Toda nuvem é prateada. ; Vai chover prata. ; O céu está bonito.|Até nas situações ruins existe algo bom.
3|"Go the extra mile" quer dizer...|fazer mais do que o esperado|correr uma milha a mais ; viajar longe ; se perder|Se esforçar além do necessário.
3|"Hang in there!" quer dizer...|Aguenta firme!|Pendure-se aí! ; Espere aí parado! ; Desça daí!|Força, não desista!
3|"It's not rocket science." quer dizer...|Não é nenhum bicho de sete cabeças.|É ciência de foguetes. ; É muito difícil. ; É sobre a NASA.|É fácil, não precisa ser gênio.
3|"To make a long story short" quer dizer...|resumindo|fazer uma história longa ; inventar ; contar devagar|Para resumir a história...
3|"Sleep on it" quer dizer...|pensar com calma antes de decidir|dormir em cima ; ter pesadelo ; tirar um cochilo|Decidir só depois de uma noite de sono.
3|"Cool as a cucumber" quer dizer...|muito calmo|gelado ; verde de raiva ; doente|Tranquilo mesmo sob pressão. 🥒
3|"On the fence" quer dizer...|em cima do muro (indeciso)|na cerca ; preso ; do lado de fora|Sem escolher um lado.
3|"Give someone the cold shoulder" quer dizer...|dar um gelo em alguém|dar um ombro frio ; abraçar ; massagear|Ignorar alguém de propósito.
3|"Add insult to injury" quer dizer...|piorar o que já estava ruim|ofender um ferido ; xingar ; ir ao hospital|"And then, to add insult to injury, it started to rain."
3|"My two cents" quer dizer...|minha opinião|meu troco ; meu dinheiro ; minha conta|"Just my two cents" = só minha opinião.
3|"Easier said than done" quer dizer...|falar é fácil, difícil é fazer|é fácil fazer ; diga e faça ; fale menos|Igual ao "falar é fácil".
3|"Piece of my mind" (I gave him a piece of my mind) quer dizer...|dei uma bronca nele|dei um pedaço do meu cérebro ; dei uma ideia ; dei um presente|"Give someone a piece of your mind" = falar umas verdades.
`;

export const PHRASAL = `
1|"Wake up" significa...|acordar|levantar a mão ; lavar o rosto ; dormir de novo|"I wake up at 7."
1|"Get up" significa...|levantar (da cama)|subir ; acordar alguém ; ganhar|"I get up at 7:15."
1|"Turn on" significa...|ligar (aparelho)|desligar ; virar ; girar|"Turn on the lights."
1|"Turn off" significa...|desligar|ligar ; virar à direita ; abaixar|"Turn off your phone."
1|"Sit down" significa...|sentar|levantar ; deitar ; descer|"Please, sit down."
1|"Stand up" significa...|levantar (ficar de pé)|sentar ; ficar parado ; deitar|"Stand up, please."
2|"Give up" significa...|desistir|dar para cima ; entregar ; doar|"Never give up!"
2|"Look for" significa...|procurar|olhar para ; achar ; cuidar|"I'm looking for my keys."
2|"Look after" significa...|cuidar de|procurar ; olhar depois ; seguir|"Can you look after my dog?"
2|"Put on" significa...|vestir, colocar (roupa)|tirar (roupa) ; guardar ; pendurar|"Put on your coat."
2|"Take off" significa...|tirar (roupa) / decolar|vestir ; pousar ; levar embora|"Take off your shoes." / "The plane took off."
2|"Find out" significa...|descobrir|encontrar fora ; perder ; esconder|"I found out the truth."
2|"Come back" significa...|voltar|vir junto ; ir embora ; chegar cedo|"Come back soon!"
2|"Go out" significa...|sair (para se divertir)|entrar ; ir embora para sempre ; dormir|"Let's go out tonight!"
2|"Pick up" significa...|pegar, buscar|largar ; escolher ; picar|"I'll pick you up at 8."
2|"Calm down" significa...|acalmar-se|ficar bravo ; descer ; cair|"Calm down, it's OK."
2|"Hang out" significa...|sair junto, passar o tempo|pendurar roupa ; ir embora ; esperar sentado|"Let's hang out this weekend."
2|"Try on" significa...|experimentar (roupa)|tentar ligar ; testar comida ; treinar|"Can I try on these jeans?"
2|"Throw away" significa...|jogar fora|jogar longe ; arremessar a bola ; guardar|"Don't throw away the box."
2|"Grow up" significa...|crescer (amadurecer)|subir ; plantar ; engordar|"I want to be a pilot when I grow up."
2|"Hold on" significa...|espere um pouco / segure firme|solte ; desligue ; continue|"Hold on, I'll be right back."
2|"Cheer up!" significa...|Anime-se!|Torça! ; Faça barulho! ; Fique triste!|"Cheer up, it's not that bad!"
2|"Run out of" significa...|ficar sem (acabar)|correr para fora ; fugir de ; correr atrás|"We ran out of milk."
2|"Look up" (no dicionário) significa...|procurar (uma informação)|olhar para cima ; admirar ; acordar|"Look up the word in the dictionary."
2|"Fill out" significa...|preencher (formulário)|encher ; esvaziar ; sair|"Fill out this form, please."
2|"Get along with" significa...|dar-se bem com|ir junto com ; brigar com ; chegar com|"I get along with my sister."
2|"Break up" significa...|terminar (namoro)|quebrar para cima ; começar a namorar ; acordar|"They broke up last week."
2|"Show up" significa...|aparecer, chegar|mostrar para cima ; se exibir ; sumir|"He didn't show up at the party."
2|"Give back" significa...|devolver|dar de novo ; dar as costas ; voltar|"Give back my pen!"
2|"Watch out!" significa...|Cuidado!|Assista lá fora! ; Olhe o relógio! ; Saia!|"Watch out! There's a car!"
3|"Look forward to" significa...|estar ansioso por (algo bom)|olhar para frente ; prever ; adiar|"I'm looking forward to the holidays."
3|"Put off" significa...|adiar|desligar ; tirar ; apagar o fogo|"Don't put off your homework."
3|"Call off" significa...|cancelar|ligar de volta ; desligar o telefone ; chamar|"They called off the game because of the snow."
3|"Figure out" significa...|entender, descobrir como resolver|desenhar ; enfeitar ; calcular errado|"I can't figure out this puzzle."
3|"Carry on" significa...|continuar|carregar ; levar a bagagem ; parar|"Carry on, don't stop!"
3|"End up" significa...|acabar (em algum lugar ou situação)|terminar o namoro ; subir ; começar|"We ended up at the beach."
3|"Run into" significa...|encontrar por acaso (alguém)|correr para dentro ; atropelar ; fugir|"I ran into my teacher at the mall."
3|"Take after" significa...|parecer com (um parente)|ir atrás ; cuidar ; tirar depois|"She takes after her mother."
3|"Work out" significa...|malhar / dar certo|trabalhar fora ; sair do trabalho ; demitir|"I work out every day." / "It worked out!"
3|"Put up with" significa...|aguentar, tolerar|colocar em cima ; montar ; hospedar|"I can't put up with this noise."
3|"Get over" significa...|superar|passar por cima ; chegar ; acabar|"She got over the breakup."
3|"Come across" significa...|encontrar por acaso (algo)|atravessar ; vir junto ; cruzar os braços|"I came across an old photo."
3|"Drop by" significa...|dar uma passada|cair ; derrubar ; pingar|"Drop by my house later!"
3|"Catch up" significa...|alcançar / colocar o papo em dia|pegar no ar ; prender ; atrasar|"Let's catch up over coffee."
3|"Turn down" significa...|recusar / abaixar o volume|virar para baixo ; desligar ; aceitar|"She turned down the job offer."
3|"Mix up" significa...|confundir|misturar a massa ; arrumar ; separar|"I always mix up their names."
3|"Pass out" significa...|desmaiar|passar de ano ; distribuir para fora ; sair|"He passed out because of the heat."
3|"Set up" significa...|montar, configurar|sentar ; levantar ; desmontar|"Can you set up the new computer?"
3|"Sort out" significa...|resolver, organizar|sortear ; separar a sorte ; jogar fora|"Don't worry, we'll sort it out."
3|"Hand in" significa...|entregar (um trabalho)|dar a mão ; levantar a mão ; guardar|"Hand in your essays on Friday."
3|"Keep up with" significa...|acompanhar (o ritmo)|manter em cima ; guardar ; esperar|"I can't keep up with you, slow down!"
3|"Let down" significa...|decepcionar|deixar descer ; soltar o cabelo ; deixar entrar|"Don't let me down!"
3|"Check out" (do hotel) significa...|sair do hotel (fechar a conta)|olhar alguém ; entrar no hotel ; reservar|"We check out at noon."
3|"Make up" (uma história) significa...|inventar|maquiar ; fazer para cima ; acordar|"He made up an excuse."
3|"Look out for" significa...|ficar atento a, proteger|olhar para fora ; procurar sair ; vigiar a janela|"Brothers look out for each other."
`;
