// Gramática (escrita à mão). Linha: "nível|pergunta|certa|errada1 ; errada2 ; errada3|explicação".
// Regra de ouro ao escrever: as erradas têm que ser ERRADAS de verdade naquela frase (nada de "também
// daria"), e a explicação ensina o porquê em uma linha. "(nada)" = não vai palavra nenhuma.

export const GRAMMAR = `
# verbo to be
1|I ___ a student.|am|is ; are ; be|Com I usamos "am": I am (I'm).
1|She ___ my best friend.|is|am ; are ; be|He/she/it → is.
1|They ___ from Brazil.|are|is ; am ; be|We/you/they → are.
1|___ you hungry?|Are|Is ; Am ; Do|Pergunta com to be: inverte → Are you...?
1|Yesterday I ___ very tired.|was|were ; am ; been|Passado de to be: I/he/she/it was · you/we/they were.
1|We ___ at the party last night.|were|was ; are ; been|We/you/they → were.
1|My parents ___ teachers.|are|is ; am ; be|Plural (my parents = they) → are.
1|___ your brother at home?|Is|Are ; Am ; Does|Your brother = he → Is he...?
2|The kids ___ very excited yesterday.|were|was ; are ; been|Passado + plural → were.
2|If I ___ you, I would study more.|were|was ; am ; be|No "if" de hipótese usamos "were" para todos: If I were you...
# presente simples
1|She ___ to school every day.|goes|go ; going ; gone|Presente simples com he/she/it: o verbo ganha -s/-es (she goes).
1|My brother ___ soccer on Saturdays.|plays|play ; playing ; played|He/she/it → plays.
1|I ___ like broccoli.|don't|doesn't ; not ; isn't|Negativa com I/you/we/they: don't + verbo.
1|He ___ like spiders.|doesn't|don't ; isn't ; not|Negativa com he/she/it: doesn't + verbo (sem -s).
1|___ you speak English?|Do|Does ; Are ; Is|Pergunta no presente: Do (I/you/we/they) + verbo.
1|___ your sister work here?|Does|Do ; Is ; Are|Pergunta com he/she/it: Does + verbo.
1|We ___ in a small town.|live|lives ; living ; is living|We/you/they: verbo sem -s.
2|Water ___ at 100 degrees Celsius.|boils|boil ; is boil ; boiling|Fatos e verdades gerais: presente simples (it boils).
2|She ___ TV every night.|watches|watchs ; watch ; watching|Verbos terminados em -ch, -sh, -s, -x, -o ganham -es: watches.
2|He ___ his homework after dinner.|does|do ; dos ; doing|Do com he/she/it vira "does".
2|My dad ___ two cars.|has|have ; haves ; having|Have com he/she/it vira "has".
2|The baby ___ a lot.|cries|crys ; cry ; cryes|Consoante + y → -ies: cry → cries.
2|She ___ the piano very well.|plays|plaies ; play ; playes|Vogal + y: só + s (plays).
2|Does he ___ English?|speak|speaks ; speaking ; spoke|Depois de does o verbo fica sem -s: Does he speak...?
# presente contínuo
1|Look! It ___ snowing!|is|are ; am ; be|Presente contínuo: am/is/are + verbo-ing.
1|I am ___ a book right now.|reading|read ; reads ; readed|Presente contínuo: verbo + -ing (reading).
1|They ___ playing video games now.|are|is ; am ; be|They → are + -ing.
2|She is ___ in the lake.|swimming|swiming ; swim ; swims|Swim → swimming (dobra o m).
2|We are ___ a snowman.|making|makeing ; make ; maked|Verbo terminado em -e perde o e: make → making.
2|Shh! The baby ___.|is sleeping|sleeps ; sleep ; slept|Acontecendo agora: presente contínuo.
2|Why ___ you laughing?|are|do ; is ; does|Pergunta no contínuo: Why are you + -ing?
3|I ___ my grandma tomorrow — it's already planned.|am visiting|visit ; visited ; am visit|Plano já combinado para o futuro: presente contínuo.
# passado simples
1|Yesterday I ___ soccer with my friends.|played|play ; plays ; playing|Passado de verbo regular: + -ed.
1|___ you watch the game last night?|Did|Do ; Does ; Was|Pergunta no passado: Did + verbo (sem -ed).
1|I ___ go to school yesterday.|didn't|don't ; wasn't ; doesn't|Negativa no passado: didn't + verbo.
1|She ___ her grandma last weekend.|visited|visit ; visits ; visitted|Regular: visit → visited.
2|She didn't ___ the email.|send|sent ; sends ; sending|Depois de didn't o verbo volta para a forma básica.
2|Did he ___ the cake?|eat|ate ; eaten ; eats|Depois de did o verbo fica na forma básica: Did he eat...?
2|We ___ in Paris for a week last year.|stayed|stay ; staied ; stays|Stay → stayed (vogal + y mantém o y).
2|He ___ the bus this morning.|missed|miss ; missd ; mist|Miss → missed.
2|They ___ a lot at the party.|danced|danceed ; dance ; dancing|Terminado em -e: só + d (danced).
2|I ___ my homework, so I can play now.|finished|finish ; finishing ; finishes|Regular: finish → finished.
2|The movie ___ really funny.|was|were ; did ; is being|The movie = it → was.
3|He ___ the window by accident.|broke|breaked ; broken ; brake|Break é irregular: broke (passado), broken (particípio).
# present perfect
2|I have ___ that movie three times.|seen|saw ; see ; seeing|Present perfect: have/has + particípio (seen).
2|She ___ already finished her homework.|has|have ; is ; did|He/she/it → has + particípio.
2|Have you ever ___ to London?|been|went ; go ; be|"Have you ever been to...?" = você já foi para...?
3|He has ___ to the supermarket. He'll be back soon.|gone|been ; went ; go|"Has gone" = foi e ainda não voltou · "has been" = foi e voltou.
2|I've lived here ___ 2015.|since|for ; from ; ago|Since + ponto no tempo (since 2015).
2|I've lived here ___ ten years.|for|since ; ago ; during|For + duração (for ten years).
2|I saw him two days ___.|ago|before ; since ; for|"Ago" = atrás, com passado simples: two days ago.
3|We ___ each other since we were kids.|have known|know ; knew ; are knowing|Desde criança até hoje: present perfect (have known).
3|I haven't seen her ___.|yet|already ; still ; ever|"Yet" vai no fim de negativas e perguntas: I haven't seen her yet.
3|Have you finished ___?|yet|still ; ago ; since|Pergunta: Have you finished yet? (já terminou?)
3|This is the first time I ___ sushi.|have eaten|eat ; am eating ; ate ever|"It's the first time" + present perfect.
3|How long ___ you been learning English?|have|did ; are ; do|How long have you been + -ing? = há quanto tempo...
# futuro
1|I ___ call you tomorrow.|will|am ; did ; was|Futuro com will: will + verbo.
2|Look at those clouds! It's ___ to rain.|going|go ; will ; gonna to|Previsão com evidência: be going to.
2|I'm going ___ visit my aunt this weekend.|to|for ; at ; (nada)|Be going TO + verbo.
2|___ you help me with this box?|Will|Do ; Are ; Did|Pedido: Will you help me...?
2|I think it ___ be sunny tomorrow.|will|is ; going ; does|Opinião sobre o futuro: I think it will...
2|She won't ___ to the party.|come|comes ; coming ; came|Depois de will/won't: verbo base.
3|By next year, I ___ my English course.|will have finished|will finish ; finished ; have finished|Future perfect: will have + particípio (até tal momento).
# comparativo e superlativo
1|An elephant is ___ than a dog.|bigger|more big ; biggest ; big|Adjetivo curto: + -er (big → bigger).
1|This is the ___ day of my life!|best|better ; goodest ; most good|Good → better → the best.
2|Math is ___ than history for me.|more difficult|difficulter ; most difficult ; difficult|Adjetivo longo: more + adjetivo.
2|Mount Everest is the ___ mountain in the world.|highest|higher ; most high ; more highest|Superlativo curto: the + -est.
2|My cold is ___ today than yesterday.|worse|badder ; worst ; more bad|Bad → worse → the worst.
2|She is ___ tall as her brother.|as|so ; than ; more|Igualdade: as + adjetivo + as.
2|This is the ___ beautiful beach I've ever seen.|most|more ; much ; very|Superlativo longo: the most + adjetivo.
2|Today is ___ than yesterday.|hotter|more hot ; hoter ; hottest|Hot → hotter (dobra o t).
2|Who is the ___ person in your family?|funniest|funnyest ; most funny ; funnier|Funny → funniest (y vira i).
2|A car is ___ than a bike.|faster|more fast ; fastest ; fastly|Adjetivo curto: fast → faster.
2|This test is ___ than the last one.|easier|more easy ; easyer ; easiest|Easy → easier (y vira i).
3|The ___ you study, the better you get.|more|most ; much ; many|"The more..., the better..." = quanto mais..., melhor...
3|He runs ___ than me.|faster|more fast ; fastly ; more faster|Fast é adjetivo e advérbio: faster (não existe "fastly").
3|That was the ___ movie I've ever seen!|worst|baddest ; worse ; most bad|Bad → worse → the worst.
3|She's much ___ than her sister.|older|more old ; oldest ; elder|Comparar idade: older than (elder só antes de substantivo: my elder sister).
# artigos
1|I have ___ apple.|an|a ; (nada)|"An" antes de som de vogal: an apple.
1|She is ___ nurse.|a|an ; (nada)|Profissão leva artigo: she is a nurse.
2|I want to be ___ engineer.|an|a ; (nada)|"An" antes de som de vogal: an engineer.
2|It takes ___ hour to get there.|an|a ; (nada)|"Hour" começa com som de vogal (o h é mudo): an hour.
2|Qual está certo?|a university|an university|"University" começa com som de "iu" (consoante): a university.
2|Qual está certo?|an umbrella|a umbrella|"Umbrella" começa com som de vogal: an umbrella.
2|___ sun is very hot today.|The|A ; An|Coisa única: the sun, the moon.
3|We play ___ soccer on Sundays.|(nada)|the ; a|Esportes não levam artigo: we play soccer.
# plural
1|One child, two ___.|children|childs ; childrens ; child|Plural irregular: child → children.
1|One foot, two ___.|feet|foots ; feets ; footes|Plural irregular: foot → feet.
1|One man, two ___.|men|mans ; mens ; man|Plural irregular: man → men.
2|One mouse, two ___.|mice|mouses ; mices ; mouse|Plural irregular: mouse → mice.
2|One tooth, many ___.|teeth|tooths ; teeths ; toothes|Plural irregular: tooth → teeth.
2|One person, two ___.|people|persons ; peoples ; person|Plural de person: people.
2|One woman, three ___.|women|womans ; womens ; woman|Woman → women (pronuncia "uímen").
2|One sheep, ten ___.|sheep|sheeps ; sheepes ; shoop|Sheep não muda no plural.
2|One box, two ___.|boxes|boxs ; boxies ; box|Terminou em -x: + -es (boxes).
2|One city, two ___.|cities|citys ; cityes ; city|Consoante + y → -ies: cities.
2|One bus, two ___.|buses|bus ; buss ; busies|Terminou em -s: + -es (buses).
3|One knife, two ___.|knives|knifes ; knivs ; knife|-fe/-f → -ves: knife → knives.
3|One leaf, many ___.|leaves|leafs ; leafes ; leavs|-f → -ves: leaf → leaves.
3|One potato, two ___.|potatoes|potatos ; potatoies ; potato|Alguns terminados em -o ganham -es: potatoes, tomatoes.
3|One fish, three ___.|fish|fishs ; fishies ; fishen|Fish normalmente não muda no plural.
# contáveis e incontáveis
1|How ___ brothers do you have?|many|much ; more ; lot|"Many" com coisas contáveis: how many brothers.
1|How ___ is this shirt?|much|many ; more ; cost|Preço: How much is it? (quanto custa?)
2|There isn't ___ milk in the fridge.|much|many ; few ; a lot|"Much" com incontáveis (milk), em negativas e perguntas.
2|I don't have ___ money.|any|some ; no ; many|Negativa: not ... any. (Sem dupla negação: "don't have no" está errado.)
2|I'd like ___ water, please.|some|any ; many ; a|Pedido/oferta afirmativa: some.
2|I have ___ friends in London, so I'm not alone.|a few|a little ; much ; few of|"A few" (alguns) com contáveis.
2|Can I have ___ sugar in my tea?|a little|a few ; many ; few|"A little" (um pouco) com incontáveis.
2|We don't have ___ time. Hurry up!|much|many ; few ; lots|Time (tempo) é incontável: much time.
3|There were very ___ people at the party — it was almost empty!|few|a few ; little ; a little|"Few" (sem "a") = poucos, quase nenhum (sentido negativo).
3|I need ___ information about the trip.|some|an ; a ; many|Information é incontável: some information (nunca "an information").
3|She gave me some good ___.|advice|advices ; an advice ; advise|Advice é incontável (conselho/conselhos); "advise" é o verbo.
3|How ___ luggage do you have?|much|many ; few ; lot|Luggage (bagagem) é incontável: how much luggage.
# pronomes e possessivos
1|This is my sister. ___ name is Ana.|Her|His ; She ; Hers|Possessivo feminino: her name.
1|That's Tom. ___ is my cousin.|He|Him ; His ; He's|Sujeito masculino: he.
1|Can you help ___?|me|I ; my ; mine|Depois do verbo: pronome objeto (me).
1|We love ___ teacher.|our|us ; we ; ours|Possessivo de we: our.
2|This book is ___. (meu)|mine|my ; me ; I|Pronome possessivo sozinho: mine.
2|The dog is wagging ___ tail.|its|it's ; it ; its'|"Its" = dele/dela (coisa/animal) · "it's" = it is.
2|___ going to rain today.|It's|Its ; It ; Is|"It's" = it is.
2|They love ___ new house.|their|there ; they're ; theirs|Their = deles · there = lá · they're = they are.
2|___ is a cat on the roof!|There|Their ; They're ; It|"There is" = há/tem: There is a cat.
2|This is ___ car. (do meu pai)|my father's|my fathers ; the car of my father's ; my father|Posse com 's: my father's car.
2|I called ___ but she didn't answer.|her|she ; hers ; herself|Objeto feminino: her.
3|She did it all by ___.|herself|her ; hers ; sheself|Pronome reflexivo: herself (ela mesma).
3|The man ___ lives next door is a doctor.|who|which ; whose ; what|"Who" para pessoas em orações relativas.
3|The book ___ I bought is great.|that|who ; whose ; what|"That/which" para coisas.
3|That's the girl ___ dog bit me!|whose|who ; who's ; which|"Whose" = cujo (posse).
3|We enjoyed ___ at the party.|ourselves|us ; our ; ourself|Reflexivo de we: ourselves.
# verbos modais
1|___ I go to the bathroom, please?|Can|Do ; Am ; Will|Pedir permissão: Can I...?
1|I ___ swim. I learned when I was five.|can|can't ; must ; should|Can = conseguir/saber fazer.
2|You ___ wear a seat belt. It's the law.|must|can ; might ; would|"Must" = obrigação forte.
2|You ___ see a doctor. You look sick.|should|must to ; would ; can't|"Should" = conselho (deveria).
2|You don't ___ come if you don't want to.|have to|must ; should to ; can|"Don't have to" = não é obrigado.
2|___ you like some coffee?|Would|Do ; Will ; Are|Oferta educada: Would you like...?
2|It ___ rain later, take an umbrella.|might|must ; should to ; can to|"Might" = talvez, possibilidade.
2|She can ___ three languages.|speak|speaks ; to speak ; speaking|Depois de can: verbo base, sem "to".
3|You ___ smoke here. It's forbidden.|mustn't|don't have to ; needn't ; shouldn't to|"Mustn't" = proibido · "don't have to" = não precisa.
3|When I was a kid, I ___ climb trees all day.|used to|use to ; was used to ; am used to|"Used to" = costumava (hábito no passado).
3|I'm used to ___ up early.|waking|wake ; woke ; waked|"Be used to" + -ing = estar acostumado a.
3|She ___ have left already — her car is gone.|must|can ; should ; would|"Must have" + particípio = dedução sobre o passado.
3|You ___ have told me! I would have helped.|should|must ; can ; will|"Should have" + particípio = deveria ter feito (crítica, arrependimento).
# gerúndio e infinitivo
2|I enjoy ___ in the snow.|playing|to play ; play ; played|Depois de enjoy usamos -ing.
2|I want ___ a new phone.|to buy|buying ; buy ; bought|Depois de want usamos to + verbo.
2|She stopped ___ when she saw me.|running|to running ; run ; ran|"Stop + -ing" = parar de fazer.
2|I need ___ my room.|to clean|cleaning to ; clean ; cleaned|Need + to + verbo.
3|Don't forget ___ the door.|to lock|locking ; lock ; locked|"Forget to" = esquecer de fazer (algo no futuro).
3|I'm looking forward to ___ you.|seeing|see ; saw ; seen|"Look forward to" + -ing (o "to" é preposição).
3|Thank you for ___ me.|helping|help ; to help ; helped|Depois de preposição (for) vem -ing.
3|He avoids ___ sugar.|eating|to eat ; eat ; ate|Avoid + -ing.
3|Would you mind ___ the window?|closing|to close ; close ; closed|Would you mind + -ing? (você se importaria de...?)
# condicionais
2|If it rains, we ___ at home.|will stay|would stay ; stayed ; stay to|1º condicional: If + presente, will + verbo.
2|If you heat ice, it ___.|melts|melt ; will melted ; melting|Condicional zero (fato): If + presente, presente.
3|If I had money, I ___ a car.|would buy|will buy ; buy ; bought|2º condicional: If + passado, would + verbo.
3|If I ___ studied, I would have passed.|had|have ; did ; would|3º condicional: If + had + particípio.
3|I would travel more if I ___ more time.|had|have ; would have ; will have|2º condicional: ...if + passado (had).
# voz passiva
3|This bridge ___ in 1950.|was built|built ; is build ; was build|Voz passiva: be + particípio (was built).
3|English ___ all over the world.|is spoken|speaks ; is speaking ; spoken|Voz passiva no presente: is spoken.
3|The thief ___ by the police yesterday.|was caught|caught ; was catch ; is caught|Passiva no passado: was + particípio.
3|Pizza ___ in Italy.|was invented|invented ; was invent ; is inventing|Passiva: was + particípio.
# perguntas e question tags
1|___ do you live? — In São Paulo.|Where|When ; Who ; What|Lugar: where.
1|___ is your birthday? — In May.|When|Where ; What ; Who|Tempo: when.
1|___ old are you?|How|What ; Which ; Who|Idade: How old are you?
1|___ is that man? — He's my uncle.|Who|What ; Where ; Whose|Pessoa: who.
1|___ are you sad? — Because I lost my phone.|Why|Where ; When ; How|Motivo: why (resposta com because).
2|___ do you go to the gym? — Twice a week.|How often|How much ; How long ; When often|Frequência: how often.
2|___ is it from here to the beach? — About 2 km.|How far|How long ; How much ; How many|Distância: how far.
2|___ did you get here? — By bus.|How|What ; Why ; Which|Meio/modo: how.
2|___ color is your car? — Red.|What|How ; Who ; Where|Que cor: What color...?
3|You're Brazilian, ___ you?|aren't|are ; don't ; isn't|Question tag: afirmativa → tag negativa (aren't you?).
3|She can't swim, ___ she?|can|can't ; does ; is|Negativa → tag afirmativa (can she?).
3|They went home, ___ they?|didn't|did ; don't ; weren't|Passado simples → tag com did (didn't they?).
3|He's never late, ___ he?|is|isn't ; does ; doesn't|"Never" já é negativo → tag afirmativa (is he?).
# advérbios e outras
2|She speaks English very ___.|well|good ; better ; fine|Advérbio de good: well (fala bem).
2|He drives very ___.|carefully|careful ; carefuly ; care|Advérbio: adjetivo + -ly (carefully).
2|I ___ go to bed late on weekdays.|never|ever ; not never ; no|Advérbio de frequência antes do verbo: I never go...
2|This coffee is ___ hot to drink!|too|very ; enough ; so much|"Too" = demais (excesso, com sentido negativo).
2|He isn't old ___ to drive.|enough|too ; very ; so|"Enough" vem DEPOIS do adjetivo: old enough.
2|I'm ___ the movie tonight.|watching|watch ; watched ; watches|Plano para hoje à noite: presente contínuo.
3|It was ___ a good movie that I watched it twice.|such|so ; very ; too|"Such a + adjetivo + substantivo"; "so + adjetivo".
3|The movie was ___ boring that I fell asleep.|so|such ; too ; very|"So + adjetivo + that".
3|I don't like coffee. — ___ do I.|Neither|Either ; So ; Too|Concordar com negativa: Neither do I (eu também não).
3|I love pizza! — ___ do I.|So|Neither ; Too ; Either|Concordar com afirmativa: So do I (eu também).
3|He asked me where ___.|I lived|did I live ; do I live ; I live?|Pergunta indireta: ordem normal (sujeito + verbo).
3|She told me that she ___ tired.|was|is being ; were ; has|Discurso indireto: o tempo "recua" (is → was).
3|I'm not hungry, and my brother isn't ___.|either|neither ; too ; also|Negativa + também não: ...isn't either.
# make × do · say × tell · outros verbos confusos
2|Can you ___ me a favor?|do|make ; take ; give|Expressão fixa: do someone a favor.
2|Don't ___ so much noise!|make|do ; take ; have|Expressão fixa: make noise.
2|I need to ___ my homework.|do|make ; take ; have|Expressão fixa: do homework.
2|Let's ___ a cake!|make|do ; take ; cook up|Fazer/fabricar algo: make a cake.
2|She ___ me a secret.|told|said ; spoke ; talked|"Tell" + pessoa: told me. "Say" não leva a pessoa direto.
2|He ___ "good morning".|said|told ; spoke ; talked to|"Say" + o que foi dito: he said "good morning".
2|I ___ a mistake.|made|did ; took ; had|Expressão fixa: make a mistake.
2|Can you ___ me your pen? I'll give it back.|lend|borrow ; loan to ; take|Quem DÁ emprestado: lend. Quem PEGA emprestado: borrow.
2|Can I ___ your pen?|borrow|lend ; loan ; give|Pegar emprestado: borrow.
3|Let's ___ a break.|take|make ; do ; give|Expressão fixa: take a break.
3|I have to ___ a decision.|make|do ; take on ; get|Expressão fixa: make a decision.
3|Please ___ the table for dinner.|set|put on ; make up ; do|Pôr a mesa: set the table.
3|I can't ___ him. He's too far away.|hear|listen ; listen to ; heard|Hear = ouvir (perceber o som); listen = escutar (prestar atenção).
3|Please ___ to the teacher.|listen|hear ; listening ; heard|Listen to = prestar atenção no que alguém fala.
`;
