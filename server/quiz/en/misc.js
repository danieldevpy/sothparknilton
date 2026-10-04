// Preposições, ortografia, números e horas, pronúncia, certo-ou-errado e interpretação (à mão) +
// opostos e inglês britânico × americano (gerados de tabelas).

import { slug } from '../bank.js';

export const PREPS = `
1|My birthday is ___ May.|in|on ; at ; for|Meses e anos: IN (in May, in 2025).
1|The party is ___ Saturday.|on|in ; at ; for|Dias: ON (on Saturday, on May 5th).
1|The class starts ___ 8 o'clock.|at|in ; on ; for|Horas: AT (at 8 o'clock).
1|The cat is ___ the box.|in|on ; at ; of|Dentro: in.
1|The book is ___ the table.|on|in ; at ; of|Em cima (encostado): on.
1|I'm ___ home.|at|in ; on ; to|Expressão fixa: at home.
1|I go to school ___ bus.|by|in ; with ; of|Meio de transporte: by bus, by car (mas "on foot").
2|I go to school ___ foot.|on|by ; with ; in|A pé: on foot.
2|She lives ___ Brazil.|in|on ; at ; to|Países e cidades: in.
2|We arrived ___ the airport late.|at|in ; to ; on|Arrive AT (lugar específico) · arrive IN (cidade, país).
2|We arrived ___ London at night.|in|at ; to ; on|Arrive IN + cidade/país.
2|I'm going ___ the beach.|to|in ; at ; on|Movimento até um destino: go to.
2|I always study ___ night.|at|in ; on ; to|Expressão fixa: at night (mas in the morning).
2|I always run ___ the morning.|in|at ; on ; by|Partes do dia: in the morning/afternoon/evening.
2|The cat is hiding ___ the bed.|under|on ; between ; over|Embaixo: under.
2|The bank is ___ the bakery and the pharmacy.|between|among ; in the middle ; across|Entre dois: between.
2|There's a bridge ___ the river.|over|under ; in ; at|Por cima (sem encostar): over.
2|He's afraid ___ dogs.|of|from ; with ; to|Afraid OF something.
2|It depends ___ the weather.|on|of ; in ; from|Depend ON (não "of"!).
2|I'm waiting ___ the bus.|for|to ; the ; on|Wait FOR something.
2|Listen ___ me!|to|for ; at ; on|Listen TO someone.
2|She's married ___ a doctor.|to|with ; of ; for|Married TO someone.
2|I'm interested ___ music.|in|on ; for ; about|Interested IN something.
2|Thanks ___ the gift!|for|to ; by ; of|Thanks FOR something.
2|What's ___ TV tonight?|on|in ; at ; by|"On TV".
2|I'll be there ___ five minutes.|in|on ; at ; after of|"In five minutes" = daqui a cinco minutos.
2|The picture is ___ the wall.|on|in ; at ; of|Na parede (pendurado): on the wall.
2|We met ___ a party.|at|in ; on ; to|Eventos: at a party, at a concert.
3|I've been waiting ___ two hours!|for|since ; during ; from|Duração: for (for two hours).
3|She's good ___ drawing.|at|in ; on ; for|Good AT something.
3|He's responsible ___ the project.|for|of ; to ; by|Responsible FOR something.
3|I'm tired ___ waiting.|of|from ; with ; to|Tired OF = cansado de (enjoado).
3|This book was written ___ a famous author.|by|from ; of ; with|Passiva: by (o autor).
3|We'll finish the project ___ Friday.|by|until ; in ; on to|"By Friday" = até sexta (no máximo).
3|The store is open ___ 9 pm.|until|by ; in ; to the|"Until" = até (continua aberto até aquela hora).
3|I bumped ___ an old friend at the mall.|into|in ; on ; with|"Bump into" = esbarrar em, encontrar por acaso.
3|He jumped ___ the pool.|into|in to ; at ; on|Movimento para dentro: into.
3|Can you translate this ___ English?|into|to in ; for ; on|Translate INTO a language.
3|The meeting is ___ noon.|at|in ; on ; by the|Expressão: at noon, at midnight.
3|I was born ___ 2010.|in|on ; at ; since|Anos: in.
3|I was born ___ May 3rd.|on|in ; at ; of|Datas com dia: on.
3|She's angry ___ me.|with|to ; of ; for|Angry WITH someone.
3|It's different ___ what I expected.|from|of ; to of ; with|Different FROM.
3|He's proud ___ his son.|of|for ; with ; about|Proud OF someone.
3|I'm looking forward ___ the trip.|to|for ; at ; on|Look forward TO something.
`;

export const SPELLING = `
1|Qual está escrito certo?|Wednesday|Wensday ; Wednsday ; Wendesday|Wed-nes-day: o primeiro "d" é mudo na pronúncia.
1|Qual está escrito certo?|beautiful|beatiful ; beautifull ; beutiful|beau-ti-ful.
1|Qual está escrito certo?|because|becouse ; becuase ; becaus|be-cau-se.
1|Qual está escrito certo?|friend|freind ; frend ; friendd|"i" antes do "e" em friend.
1|Qual está escrito certo?|February|Febuary ; Februray ; Febrary|Feb-RU-ary (o primeiro r some na fala).
1|Qual está escrito certo?|tomorrow|tommorow ; tomorow ; tommorrow|Um m e dois r: to-mor-row.
1|Qual está escrito certo?|people|poeple ; peaple ; peolpe|pe-o-ple.
1|Qual está escrito certo?|school|shcool ; scool ; schol|s-c-h-o-o-l.
1|Qual está escrito certo?|chocolate|chocolat ; choclate ; chocholate|cho-co-late.
1|Qual está escrito certo?|thank you|tank you ; thenk you ; thank yuo|th + ank.
2|Qual está escrito certo?|necessary|neccessary ; necesary ; neccesary|Um c, dois s: ne-ce-ssary.
2|Qual está escrito certo?|receive|recieve ; receeve ; resieve|Depois do c: "ei" (receive).
2|Qual está escrito certo?|believe|beleive ; belive ; beleve|"ie" em believe.
2|Qual está escrito certo?|different|diferent ; diffrent ; differant|Dois f: dif-fer-ent.
2|Qual está escrito certo?|business|bussiness ; buisness ; busness|bus-i-ness.
2|Qual está escrito certo?|address|adress ; addres ; adresse|Dois d e dois s: ad-dress.
2|Qual está escrito certo?|island|iland ; ailand ; islend|O "s" de island é mudo.
2|Qual está escrito certo?|restaurant|restaurent ; resturant ; restorant|res-tau-rant.
2|Qual está escrito certo?|vegetable|vegtable ; vegetible ; vejetable|veg-e-ta-ble.
2|Qual está escrito certo?|interesting|intresting ; interessting ; interesing|in-ter-est-ing.
2|Qual está escrito certo?|science|sience ; scince ; sciense|s-c-i-e-n-c-e.
2|Qual está escrito certo?|knowledge|knowlege ; nowledge ; knowledgde|O "k" é mudo: knowledge.
2|Qual está escrito certo?|neighbor|neihgbor ; neighbur ; naybor|neigh-bor (britânico: neighbour).
2|Qual está escrito certo?|weird|wierd ; weerd ; werd|Exceção à regra: weird ("e" antes do "i").
2|Qual está escrito certo?|piece|peice ; pice ; peece|"A piece of cake". (Peace = paz.)
2|Qual está escrito certo?|height|hieght ; heigth ; hight|Altura: height.
2|Qual está escrito certo?|comfortable|confortable ; comfortible ; comftable|Em inglês é com M: comfortable.
2|Qual está escrito certo?|surprise|suprise ; surprize ; serprise|sur-prise.
2|Qual está escrito certo?|library|libary ; liberry ; librery|li-bra-ry.
3|Qual está escrito certo?|separate|seperate ; seprate ; separete|sep-A-rate.
3|Qual está escrito certo?|definitely|definately ; definitly ; defenitely|de-fi-ni-te-ly.
3|Qual está escrito certo?|accommodate|accomodate ; acommodate ; acomodate|Dois c e dois m.
3|Qual está escrito certo?|embarrass|embarass ; embaras ; embarras|Dois r e dois s.
3|Qual está escrito certo?|government|goverment ; govermant ; governmant|govern + ment.
3|Qual está escrito certo?|calendar|calender ; calandar ; calendor|cal-en-dar.
3|Qual está escrito certo?|tongue|tonge ; tounge ; tung|Língua: tongue.
3|Qual está escrito certo?|occurred|occured ; ocurred ; ocured|Dois c e dois r.
3|Qual está escrito certo?|rhythm|rythm ; rhythym ; ritm|r-h-y-t-h-m.
3|Qual está escrito certo?|Mississippi|Missisippi ; Misissippi ; Mississipi|M-i-ss-i-ss-i-pp-i!
3|Qual está escrito certo?|pronunciation|pronounciation ; pronunsiation ; prononciation|Pronounce, mas pronUNciation!
3|Qual está escrito certo?|exercise|excercise ; exersize ; exercize|ex-er-cise.
3|Qual está escrito certo?|disappear|dissapear ; disapear ; dissappear|dis + appear: um s, dois p.
3|Qual está escrito certo?|tomato|tomatoe ; tomatto ; tomatu|No singular: tomato · plural: tomatoes.
`;

export const NUMBERS = `
1|Como se escreve 15 em inglês?|fifteen|fifty ; fiveteen ; fiften|15 = fifteen · 50 = fifty.
1|Como se escreve 40 em inglês?|forty|fourty ; fourteen ; fortie|40 = forty (sem o "u"!) · 14 = fourteen.
1|Como se escreve 12 em inglês?|twelve|twenty ; twelf ; tweleve|12 = twelve · 20 = twenty.
1|Como se escreve 13 em inglês?|thirteen|thirty ; threeteen ; thirten|13 = thirteen · 30 = thirty.
1|Como se escreve 8 em inglês?|eight|eigth ; ate ; eihgt|8 = eight (soa igual a "ate").
1|Como se escreve 100 em inglês?|one hundred|one thousand ; one million ; one hundreds|100 = one hundred · 1.000 = one thousand.
1|"How old are you?" — "I'm ___."|ten|ten years ; have ten ; tenth|Idade: I'm ten (years old).
1|Quantos dias tem uma "week"?|7|5 ; 30 ; 12|A week = 7 days.
2|Como se escreve 1.000 em inglês?|one thousand|one hundred ; one million ; one thousands|1.000 = a/one thousand.
2|"Twenty-one" é...|21|12 ; 20 ; 31|20 = twenty, 21 = twenty-one.
2|"Ninety" é...|90|19 ; 9 ; 900|90 = ninety · 19 = nineteen.
2|"Seventeen" é...|17|70 ; 7 ; 77|17 = seventeen · 70 = seventy.
2|Como se diz 3:15?|a quarter past three|a quarter to three ; three and a quarter to ; half past three|"Quarter past" = e quinze.
2|Como se diz 3:30?|half past three|half to three ; three and half ; a quarter past three|"Half past" = e meia.
2|Como se diz 2:45?|a quarter to three|a quarter past two ; half past two ; two to quarter|"A quarter to three" = quinze para as três.
2|"It's ten to five." Que horas são?|4:50|5:10 ; 10:05 ; 5:50|"Ten to five" = dez para as cinco = 4:50.
2|"It's five past seven." Que horas são?|7:05|5:07 ; 6:55 ; 7:50|"Five past seven" = sete e cinco.
2|Como se diz o ano 2010?|twenty ten|two thousand ten hundred ; twenty one zero ; two ten|2010 = twenty ten (ou two thousand and ten).
2|"First, second, third..." — qual é o próximo?|fourth|fourty ; forth ; four|1st first, 2nd second, 3rd third, 4th fourth.
2|Qual é o ordinal de 5?|fifth|fiveth ; fifty ; fiftieth|5th = fifth.
2|Como se escreve 3º (terceiro)?|third|threeth ; thrird ; three|3rd = third.
2|"Twelve plus nine" é...|21|19 ; 3 ; 108|plus = mais · 12 + 9 = 21.
2|"Ten minus four" é...|6|14 ; 40 ; 2|minus = menos · 10 − 4 = 6.
2|"Three times four" é...|12|7 ; 34 ; 1|times = vezes · 3 × 4 = 12.
2|Como se lê $2.50?|two dollars fifty|two fifty dollars cents ; two dollars and five ; twenty-five dollars|$2.50 = two dollars fifty (cents).
2|Como se diz "meia dúzia"?|half a dozen|a half dozen of ; middle dozen ; half dozens|Half a dozen = 6.
2|Um "dozen" tem quantos?|12|10 ; 20 ; 6|A dozen = 12.
2|Qual dia vem depois de "Thursday"?|Friday|Tuesday ; Wednesday ; Saturday|Mon, Tue, Wed, Thu, FRI, Sat, Sun.
2|Qual mês vem antes de "June"?|May|July ; April ; March|... April, May, June, July...
2|"The 4th of July" é...|4 de julho|4 de junho ; julho de 4 ; 7 de abril|Dia da Independência dos EUA.
2|Nos EUA, a data "05/03" (mês/dia) é...|3 de maio|5 de março ; 3 de março ; 5 de maio|Nos EUA a data começa pelo MÊS.
2|"Noon" é que horas?|12:00 (meio-dia)|0:00 ; 10:00 ; 18:00|Noon = meio-dia · midnight = meia-noite.
2|"A fortnight" é...|duas semanas|quatro semanas ; um fim de semana ; dois meses|Fortnight (britânico) = 14 dias.
3|Como se diz o ano 1999?|nineteen ninety-nine|one thousand nine nine nine ; nineteen nine nine ; ninety-nine nineteen|Anos se leem de dois em dois: 19-99.
3|Qual é o ordinal de 12?|twelfth|twelveth ; twelveteenth ; twentieth|12th = twelfth.
3|"Twenty divided by five" é...|4|15 ; 100 ; 25|divided by = dividido por · 20 ÷ 5 = 4.
3|Como se lê "1/2"?|one half|one second ; one two ; a middle|1/2 = one half (a half).
3|Como se lê "3/4"?|three quarters|three four ; three fours ; three thirds|3/4 = three quarters (ou three fourths).
3|Como se lê "0.5"?|zero point five|zero comma five ; zero and five ; point zero five|Em inglês o decimal usa PONTO: 0.5 = zero point five.
3|Em inglês, "1,000" (com vírgula) é...|mil|um vírgula zero ; um ; cem|Em inglês a vírgula separa milhares: 1,000 = mil.
3|"Half an hour" é...|30 minutos|15 minutos ; 1 hora e meia ; 50 minutos|Half an hour = meia hora.
3|"An hour and a half" é...|90 minutos|30 minutos ; 65 minutos ; 150 minutos|1h30 = an hour and a half.
3|Como se escreve 1.000.000?|one million|one billion ; one thousand thousands ; one millions|1.000.000 = one million · 1.000.000.000 = one billion.
`;

export const SOUND = `
1|Qual palavra rima com "cat"?|hat|cut ; cake ; car|cat / hat / bat / rat: mesmo som "-at".
1|Qual palavra rima com "day"?|play|dog ; die ; dad|day / play / say / way.
1|Qual palavra rima com "cake"?|lake|cook ; kick ; back|cake / lake / make / take.
2|Qual palavra rima com "blue"?|shoe|blow ; bloom ; bus|blue / shoe / two / you.
2|Qual palavra rima com "night"?|light|net ; knit ; neat|night / light / right / white.
2|Qual palavra rima com "know"?|snow|now ; cow ; knee|know / snow / go / show.
2|Qual palavra rima com "bear"?|hair|beer ; bar ; ear|bear / hair / chair / where.
2|Em "knife", qual letra é muda?|k|n ; f ; i|Kn- no começo: o k é mudo (knife, knee, know).
2|Em "write", qual letra é muda?|w|r ; t ; i|Wr- no começo: o w é mudo (write, wrong, wrist).
2|Em "hour", qual letra é muda?|h|o ; u ; r|Hour, honest, honor: h mudo.
2|Qual palavra soa igual a "sea"?|see|say ; sit ; set|Sea (mar) e see (ver) são homófonos.
2|Qual palavra soa igual a "two"?|too|tow ; toe ; tea|Two / too / to soam igual.
2|Qual palavra soa igual a "eye"?|I|yes ; ear ; eat|Eye (olho) e I (eu) soam igual.
2|Qual palavra soa igual a "right"?|write|rate ; red ; ride|Right e write soam igual.
2|Qual palavra soa igual a "knight" (cavaleiro)?|night|net ; knit ; nut|Knight e night soam igual (k mudo).
2|Qual palavra soa igual a "flour" (farinha)?|flower|floor ; four ; flow|Flour e flower soam igual.
2|Qual palavra soa igual a "meat"?|meet|met ; mat ; mate|Meat (carne) e meet (encontrar).
2|Em "wanted", o -ed soa como...|"id" (uón-tid)|"t" (uónt) ; "d" (uónd) ; não se pronuncia|Depois de t ou d, o -ed vira "id": wanted, needed.
2|Em "worked", o -ed soa como...|"t" (uôrkt)|"id" (uôr-kid) ; "d" (uôrkd) ; "ed" (uôr-ked)|Depois de som surdo (k, p, s, sh, ch, f): -ed = "t".
2|Em "played", o -ed soa como...|"d" (plêid)|"id" (plêi-id) ; "t" (plêit) ; "ed" (plêi-ed)|Depois de vogal e sons sonoros: -ed = "d".
2|Qual letra do alfabeto soa como "see"?|C|S ; Z ; G|C = "si".
2|Qual letra do alfabeto soa como "why"?|Y|W ; I ; E|Y = "uái".
2|Como se chama a letra W em inglês?|double u|double v ; vee ; wee|W = "double u" (dabliu).
2|Em inglês, a letra "i" se pronuncia...|"ai"|"i" ; "ei" ; "é"|Alfabeto: A "ei", E "i", I "ai".
2|Em inglês, a letra "e" se pronuncia...|"i"|"é" ; "ei" ; "ai"|Alfabeto: A "ei", E "i", I "ai".
2|Na fala, "chocolate" soa como...|"chók-lit"|"chô-co-la-te" ; "cho-co-leite" ; "tchoco-lá"|Duas sílabas na fala: CHOC-lit.
3|Qual palavra rima com "though"?|go|through ; tough ; cough|Though = "dou": rima com go/so.
3|Qual palavra rima com "tough"?|stuff|though ; through ; dough|Tough = "taf": rima com stuff/enough.
3|Qual palavra rima com "said"?|bed|paid ; maid ; side|"Said" se pronuncia "séd": rima com bed/red.
3|Em "island", qual letra é muda?|s|i ; l ; d|Island = "ái-land".
3|Em "lamb", qual letra é muda?|b|l ; a ; m|-mb no fim: b mudo (lamb, thumb, climb).
3|Em "listen", qual letra é muda?|t|l ; s ; n|Listen = "lí-sen".
3|Em "Wednesday", qual letra NÃO se pronuncia?|o primeiro d|o w ; o s ; o y|Wednesday = "uênz-dei".
3|Em "psychology", qual letra é muda?|p|s ; y ; h|Ps- no começo: p mudo.
3|Qual palavra soa igual a "weather"?|whether|water ; wider ; feather|Weather (tempo) / whether (se).
3|Qual palavra soa igual a "peace"?|piece|pace ; peas ; pies|Peace (paz) e piece (pedaço).
3|Qual palavra soa igual a "whole"?|hole|hall ; heel ; howl|Whole (inteiro) e hole (buraco).
3|Qual destas palavras tem o som "th" de "think"?|three|this ; mother ; that|"th" sem vibrar: think, three, thank · vibrando: this, that, mother.
3|Qual destas palavras tem o som "th" de "this"?|mother|three ; thank ; tooth|"th" que vibra: this, mother, father.
3|"Read" no passado se pronuncia como...|"red"|"rid" ; "réd-ed" ; "raid"|I read (red) a book yesterday.
3|Quantas sílabas "comfortable" costuma ter na fala?|3 (cômf-ter-bol)|4 ; 5 ; 2|Na fala: "COMF-ter-ble".
`;

export const FIX = `
1|"I have 20 years." Está certo?|Errado|Certo|Idade usa to be: I am 20 (years old).
1|"She doesn't like coffee." Está certo?|Certo|Errado|Negativa com she: doesn't + verbo sem -s. ✔
1|"He don't like pizza." Está certo?|Errado|Certo|Com he/she/it: doesn't → He doesn't like pizza.
1|"I am agree with you." Está certo?|Errado|Certo|Agree é verbo: I agree with you.
1|"People is nice here." Está certo?|Errado|Certo|People é plural: people ARE nice.
1|"They are my friends." Está certo?|Certo|Errado|They + are. ✔
1|"I like play soccer." Está certo?|Errado|Certo|Like + -ing (ou to): I like playing / I like to play soccer.
1|"What time is it?" Está certo?|Certo|Errado|✔ Assim que se pergunta as horas.
2|"I didn't went to school." Está certo?|Errado|Certo|Depois de didn't o verbo volta à forma básica: I didn't go.
2|"Did you see the game?" Está certo?|Certo|Errado|Did + verbo base. ✔
2|"She can sings." Está certo?|Errado|Certo|Depois de can, verbo sem -s: she can sing.
2|"I'm living here since 2020." Está certo?|Errado|Certo|Desde um ponto até agora: present perfect → I've lived here since 2020.
2|"I've been to Japan twice." Está certo?|Certo|Errado|Experiência de vida: present perfect. ✔
2|"He is more tall than me." Está certo?|Errado|Certo|Adjetivo curto: taller (He is taller than me).
2|"This is the best pizza in town." Está certo?|Certo|Errado|Superlativo de good: the best. ✔
2|"I have a lot of informations." Está certo?|Errado|Certo|Information é incontável: a lot of information.
2|"Can you borrow me your pen?" Está certo?|Errado|Certo|Quem dá é LEND: Can you lend me your pen? (borrow = pegar emprestado)
2|"Can I borrow your pen?" Está certo?|Certo|Errado|Borrow = pegar emprestado. ✔
2|"Explain me this, please." Está certo?|Errado|Certo|Explain + coisa + TO + pessoa: Can you explain this to me?
2|"It's depends." Está certo?|Errado|Certo|"It depends" (sem o 's).
2|"I want that you come." Está certo?|Errado|Certo|Want + pessoa + to: I want you to come.
2|"She told me a story." Está certo?|Certo|Errado|Tell + pessoa + coisa. ✔
2|"She said me a story." Está certo?|Errado|Certo|Say não leva a pessoa direto: she TOLD me a story.
2|"I go to home now." Está certo?|Errado|Certo|"Home" não leva "to": I go home.
2|"My father is a engineer." Está certo?|Errado|Certo|Antes de som de vogal: AN engineer.
2|"I'm boring." (querendo dizer "estou entediado") Está certo?|Errado|Certo|Boring = chato (eu sou chato!) · bored = entediado → I'm bored.
2|"I'm so excited about the trip!" Está certo?|Certo|Errado|Excited = animado. ✔
2|"How many money do you have?" Está certo?|Errado|Certo|Money é incontável: HOW MUCH money.
2|"There is many people here." Está certo?|Errado|Certo|Plural: THERE ARE many people.
2|"Where you live?" Está certo?|Errado|Certo|Falta o auxiliar: Where DO you live?
2|"I have hungry." Está certo?|Errado|Certo|Fome usa to be: I'm hungry.
2|Qual frase está certa?|She doesn't like cats.|She don't like cats. ; She doesn't likes cats. ; She not like cats.|He/she/it: doesn't + verbo base.
2|Qual frase está certa?|Where do you work?|Where you work? ; Where does you work? ; Where you do work?|Pergunta: Where DO you work?
2|Qual frase está certa?|I am 12 years old.|I have 12 years old. ; I have 12 years. ; I am 12 years.|Idade com to be + years old.
2|Qual frase está certa?|There are two cats.|There is two cats. ; There have two cats. ; It has two cats here.|Plural: there are.
3|"If I would have time, I would go." Está certo?|Errado|Certo|Na parte do "if" não vai would: If I had time, I would go.
3|"I'm used to wake up early." Está certo?|Errado|Certo|Be used to + -ing: I'm used to waking up early.
3|"I used to play soccer when I was a kid." Está certo?|Certo|Errado|Used to + verbo = costumava. ✔
3|"He has gone to Paris last year." Está certo?|Errado|Certo|Tempo terminado (last year) pede passado simples: He went to Paris last year.
3|"Neither of them is coming." Está certo?|Certo|Errado|Neither (nenhum dos dois) + singular. ✔
3|"I look forward to hear from you." Está certo?|Errado|Certo|Look forward to + -ing: I look forward to hearing from you.
3|"The news are bad." Está certo?|Errado|Certo|News é singular: The news IS bad.
3|"Everybody are here." Está certo?|Errado|Certo|Everybody é singular: everybody IS here.
3|"She suggested going to the park." Está certo?|Certo|Errado|Suggest + -ing. ✔
3|"I didn't see nobody." Está certo?|Errado|Certo|Sem dupla negação: I didn't see anybody (ou I saw nobody).
3|"Whose book is this?" Está certo?|Certo|Errado|Whose = de quem. ✔
3|"Who's book is this?" Está certo?|Errado|Certo|Who's = who is. Posse: WHOSE.
3|"Me and him went to the movies." Está certo?|Errado|Certo|Como sujeito: He and I went to the movies.
3|"I'd rather stay home." Está certo?|Certo|Errado|Would rather + verbo = prefiro. ✔
3|Qual frase está certa?|I have lived here for five years.|I live here for five years. ; I am living here since five years. ; I lived here since five years.|Desde o passado até agora: present perfect + for.
3|Qual frase está certa?|If I were rich, I would travel.|If I was rich, I will travel. ; If I am rich, I would travel. ; If I would be rich, I travel.|2º condicional: If + were, would + verbo.
`;

export const READING = `
1|"Tom has a red bike and a blue car." Qual é a cor da bicicleta?|vermelha|azul ; verde ; preta|"Red" = vermelho.
1|"My cat is black and white." Como é o gato?|preto e branco|marrom ; cinza e branco ; preto e laranja|black = preto, white = branco.
1|"Ana is ten. Her brother is twelve." Quem é mais velho?|o irmão|Ana ; os dois têm a mesma idade ; ninguém|O irmão tem 12, Ana tem 10.
1|"I have a dog. His name is Rex." Como se chama o cachorro?|Rex|Dog ; His ; Name|"His name is Rex" = o nome dele é Rex.
2|"Tom is taller than Ann, and Ann is taller than Bob." Quem é o mais baixo?|Bob|Tom ; Ann ; os três têm a mesma altura|Tom > Ann > Bob.
2|"The store opens at 9 am and closes at 6 pm." Dá para comprar às 7 pm?|Não, já fechou.|Sim ; Só de manhã ; Só no sábado|Closes at 6 pm = fecha às 18h.
2|"I usually walk to school, but today I took the bus." Como ele foi hoje?|de ônibus|a pé ; de carro ; de bicicleta|"Took the bus" = pegou o ônibus.
2|"Maria has two brothers and one sister." Quantos filhos há na família (contando Maria)?|4|3 ; 2 ; 5|Maria + 2 irmãos + 1 irmã = 4.
2|"It's raining, so take an umbrella." O que fazer?|levar um guarda-chuva|ficar em casa ; tirar o casaco ; ir à praia|"So" = então, por isso.
2|"I'm allergic to peanuts." O que a pessoa NÃO pode comer?|amendoim|morango ; peixe ; pão|Peanut = amendoim.
2|"Sorry, we're sold out." No cinema isso quer dizer...|esgotado, não há mais ingressos|estamos vendendo tudo ; saímos para vender ; está em promoção|Sold out = esgotado.
2|"Please, turn off your phones." O que pedem?|desligar os celulares|ligar os celulares ; virar os celulares ; carregar os celulares|Turn off = desligar.
2|"Jake gets up at 7, has breakfast at 7:30 and leaves home at 8." O que ele faz às 7:30?|toma café da manhã|acorda ; sai de casa ; almoça|Have breakfast = tomar café da manhã.
2|"The museum is closed on Mondays." Quando NÃO dá para visitar?|segunda-feira|domingo ; terça-feira ; sábado|Monday = segunda.
2|"Buy one, get one free!" Na loja significa...|leve 2, pague 1|compre um por um real ; um brinde para cada cliente ; desconto de 1%|Get one free = ganha outro de graça.
2|"Keep the change." Significa...|fique com o troco|mantenha a mudança ; troque o dinheiro ; guarde o recibo|Change = troco (e também "mudança").
2|"Lucy is Tom's sister. Mike is Lucy's father." Quem é o pai de Tom?|Mike|Lucy ; Tom ; ninguém|Irmãos têm o mesmo pai: Mike.
2|"The train leaves at 10:15 and the trip takes 2 hours." A que horas chega?|12:15|10:15 ; 12:00 ; 2:15|10:15 + 2 horas = 12:15.
3|"Despite the rain, we went to the beach." Eles foram à praia?|sim, mesmo com chuva|não, por causa da chuva ; só depois que parou ; foram só ao shopping|Despite = apesar de.
3|"I would have called you, but my phone died." Ele ligou?|não, o celular descarregou|sim, ligou duas vezes ; sim, mas ninguém atendeu ; não, porque esqueceu|"Would have called" = teria ligado (mas não ligou). Phone died = acabou a bateria.
3|"Unless it snows, the game will happen." Quando o jogo NÃO acontece?|se nevar|se não nevar ; se chover ; se fizer sol|Unless = a menos que.
3|"She hardly ever eats meat." Com que frequência ela come carne?|quase nunca|sempre ; todo dia ; com força|Hardly ever = quase nunca.
3|"He's been working here for ten years." Ele ainda trabalha lá?|sim|não, saiu há dez anos ; não, trabalhou só dez anos ; não dá para saber|Começou há 10 anos e continua.
3|"I used to live in Rio." A pessoa mora no Rio hoje?|não (morava antes)|sim ; sim, desde sempre ; vai se mudar para lá|Used to = costumava (não mais).
3|"The meeting has been postponed until Friday." O que aconteceu com a reunião?|foi adiada para sexta|foi cancelada ; foi antecipada ; aconteceu na sexta passada|Postpone = adiar.
3|"You can't miss it!" Ao dar direções, significa...|não tem como errar|você não pode perder (é obrigatório) ; você não pode ir ; você vai sentir falta|"You can't miss it" = é fácil de achar.
3|"Mind the gap!" No metrô de Londres significa...|cuidado com o vão (trem/plataforma)|lembre-se da loja Gap ; pense na distância ; feche a porta|Mind = tomar cuidado com.
3|"It's not my cup of tea." Significa...|não é muito a minha praia|não é minha xícara ; não tomo chá ; não é meu horário|Não faz o meu estilo.
3|"I'd rather walk than take the bus." O que a pessoa prefere?|andar|pegar o ônibus ; correr ; ficar parada|"Would rather" = preferiria.
3|"Only a few students passed the test." A prova foi...|difícil (poucos passaram)|fácil (todos passaram) ; cancelada ; adiada|"Only a few" = só alguns.
`;

// opostos: "palavra|oposto|nível|classe" — a pergunta "oposto de X" só é feita quando X tem UM oposto na tabela
const OPPOSITES = `
hot|cold|1|adj
big|small|1|adj
happy|sad|1|adj
fast|slow|1|adj
tall|short|1|adj
new|old|1|adj
rich|poor|1|adj
easy|difficult|1|adj
clean|dirty|1|adj
cheap|expensive|1|adj
good|bad|1|adj
right|wrong|1|adj
beautiful|ugly|1|adj
true|false|1|adj
early|late|2|adj
full|empty|2|adj
heavy|light|2|adj
strong|weak|2|adj
wet|dry|2|adj
loud|quiet|2|adj
safe|dangerous|2|adj
polite|rude|2|adj
alive|dead|2|adj
possible|impossible|2|adj
thick|thin|3|adj
deep|shallow|3|adj
wide|narrow|3|adj
smooth|rough|3|adj
tight|loose|3|adj
asleep|awake|3|adj
ancient|modern|3|adj
generous|stingy|3|adj
up|down|1|adv
inside|outside|1|adv
always|never|1|adv
before|after|1|adv
buy|sell|1|verb
win|lose|1|verb
push|pull|1|verb
come|go|1|verb
love|hate|1|verb
give|take|2|verb
remember|forget|2|verb
arrive|leave|2|verb
start|finish|2|verb
laugh|cry|2|verb
pass|fail|2|verb
appear|disappear|2|verb
agree|disagree|2|verb
accept|refuse|3|verb
increase|decrease|3|verb
lend|borrow|3|verb
float|sink|3|verb
question|answer|1|noun
north|south|1|noun
east|west|1|noun
friend|enemy|2|noun
entrance|exit|2|noun
top|bottom|2|noun
arrival|departure|3|noun
`;

// britânico × americano: "UK|US|significado|nível"
const UK_US = `
lift|elevator|elevador|1
flat|apartment|apartamento|1
biscuit|cookie|biscoito|1
film|movie|filme|1
shop|store|loja|1
maths|math|matemática|1
mum|mom|mãe|1
football|soccer|futebol|1
holiday|vacation|férias|1
mobile phone|cell phone|celular|1
chips|French fries|batata frita|2
crisps|chips|salgadinho de batata|2
queue|line|fila|2
rubbish|trash|lixo|2
trousers|pants|calça|2
petrol|gas|gasolina|2
autumn|fall|outono|2
motorway|highway|rodovia|2
sweets|candy|doces|2
underground|subway|metrô|2
post|mail|correio|2
bill|check|conta (do restaurante)|2
toilet|restroom|banheiro (público)|2
garden|yard|quintal|2
pavement|sidewalk|calçada|3
timetable|schedule|horário|3
car park|parking lot|estacionamento|3
lorry|truck|caminhão|3
nappy|diaper|fralda|3
torch|flashlight|lanterna|3
jumper|sweater|suéter|3
bin|trash can|lixeira|3
chemist's|drugstore|farmácia|3
tap|faucet|torneira|3
boot (do carro)|trunk|porta-malas|3
`;

function rows(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split('|').map((s) => s.trim()));
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pickFrom(pool, seed, n) {
  const out = [];
  for (let i = 0; out.length < n && i < pool.length * 3; i++) {
    const w = pool[(seed + i * 7919) % pool.length];
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

export function oppositeQuestions() {
  const pairs = rows(OPPOSITES).map(([a, b, lvl, pos]) => ({ a, b, lvl: Number(lvl), pos }));
  const opp = new Map(); // palavra → opostos
  for (const p of pairs) {
    for (const [x, y] of [[p.a, p.b], [p.b, p.a]]) {
      if (!opp.has(x)) opp.set(x, new Set());
      opp.get(x).add(y);
    }
  }
  const out = [];
  for (const p of pairs) {
    for (const [w, ans] of [[p.a, p.b], [p.b, p.a]]) {
      if (opp.get(w).size > 1) continue; // ambíguo (ex.: "old" é oposto de new e de young)
      const pool = pairs.filter((q) => q.pos === p.pos).flatMap((q) => [q.a, q.b])
        .filter((x) => x !== w && x !== ans && !opp.get(w).has(x));
      out.push({
        id: `opo:${slug(w)}`, cat: 'opposite', lvl: p.lvl,
        q: hashStr(w) % 2 ? `Qual é o oposto de "${w}"?` : `O contrário de "${w}" é...`,
        a: ans,
        w: pickFrom(pool, hashStr(w), 5),
        tip: `${w} ↔ ${ans}`,
      });
    }
  }
  return out;
}

export function ukUsQuestions() {
  const list = rows(UK_US).map(([uk, us, pt, lvl]) => ({ uk, us, pt, lvl: Number(lvl) }));
  const out = [];
  for (const r of list) {
    const tip = `🇬🇧 ${r.uk} = 🇺🇸 ${r.us} (${r.pt})`;
    out.push({
      id: `ukus:${slug(r.uk)}:us`, cat: 'ukus', lvl: r.lvl,
      q: `🇬🇧 "${r.uk}" (britânico) no inglês americano 🇺🇸 é...`,
      a: r.us,
      w: pickFrom(list.filter((x) => x !== r && x.us !== r.uk).map((x) => x.us), hashStr(r.uk), 5),
      tip,
    });
    out.push({
      id: `ukus:${slug(r.us)}:uk`, cat: 'ukus', lvl: Math.min(3, r.lvl + 1),
      q: `🇺🇸 "${r.us}" (americano) no inglês britânico 🇬🇧 é...`,
      a: r.uk,
      w: pickFrom(list.filter((x) => x !== r && x.uk !== r.us).map((x) => x.uk), hashStr(r.us), 5),
      tip,
    });
  }
  return out;
}
