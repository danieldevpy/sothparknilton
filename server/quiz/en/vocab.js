// Vocabulário por tema → perguntas de tradução nos dois sentidos (PT→EN e EN→PT).
// Linha: "português|inglês|nível|frase de exemplo (opcional)". As erradas saem do MESMO tema (plausíveis).
// Cuidado ao editar: dentro de um tema não pode haver duas palavras com a mesma tradução (a pergunta
// teria duas respostas certas). Qualificador entre parênteses desfaz ambiguidade: "canela (da perna)".

import { slug } from '../bank.js';

export const TOPICS = {
  animais: `
cachorro|dog|1|My dog loves to play in the snow.
gato|cat|1|The cat is sleeping on the sofa.
cavalo|horse|1|She rides a horse on the farm.
vaca|cow|1|The cow gives us milk.
porco|pig|1|The pig is rolling in the mud.
galinha|chicken|1|The chicken laid three eggs today.
pato|duck|1|There are three ducks on the lake.
peixe|fish|1|We saw a big fish in the river.
pássaro|bird|1|A little bird is singing outside.
rato|mouse|1|The cat is chasing a mouse.
coelho|rabbit|1|The rabbit has long ears.
urso|bear|1|Bears sleep all winter.
macaco|monkey|1|The monkey is eating a banana.
leão|lion|1|The lion is the king of the jungle.
cobra|snake|1|Be careful, there's a snake!
sapo|frog|1|The frog jumped into the pond.
pinguim|penguin|1|Penguins can't fly, but they swim very well.
tartaruga|turtle|2|Turtles walk very slowly.
ovelha|sheep|2|The sheep are eating grass.
cabra|goat|2|The goat climbed the rock.
lobo|wolf|2|The wolf howled at the moon.
raposa|fox|2|The fox is very clever.
coruja|owl|2|Owls hunt at night.
abelha|bee|2|Bees make honey.
formiga|ant|2|Ants are very strong for their size.
borboleta|butterfly|2|A butterfly landed on the flower.
aranha|spider|2|There's a spider in the bathroom!
baleia|whale|2|The blue whale is the biggest animal on Earth.
tubarão|shark|2|Sharks have a lot of teeth.
golfinho|dolphin|2|Dolphins are very smart.
esquilo|squirrel|2|The squirrel is hiding nuts.
morcego|bat|2|Bats sleep upside down.
caranguejo|crab|2|Crabs walk sideways.
cervo|deer|2|We saw a deer in the forest.
pombo|pigeon|2|There are pigeons everywhere in the city.
burro|donkey|2|The donkey is carrying heavy bags.
mosca|fly|2|There's a fly in my soup!
peru|turkey|2|Americans eat turkey on Thanksgiving.
polvo|octopus|3|An octopus has eight arms.
caracol|snail|3|The snail is slower than the turtle.
joaninha|ladybug|3|A ladybug is red with black dots.
gafanhoto|grasshopper|3|The grasshopper jumped really high.
pavão|peacock|3|The peacock opened its colorful tail.
minhoca|worm|3|The early bird catches the worm.
gaivota|seagull|3|Seagulls fly over the beach.
pulga|flea|3|The dog is scratching because of fleas.
barata|cockroach|3|I screamed when I saw a cockroach.
cisne|swan|3|A white swan is swimming on the lake.
gambá|skunk|3|The skunk smells terrible!
`,
  comida: `
maçã|apple|1|An apple a day keeps the doctor away.
pão|bread|1|I eat bread with butter for breakfast.
queijo|cheese|1|I love pizza with a lot of cheese.
leite|milk|1|Do you want a glass of milk?
ovo|egg|1|I had two eggs for breakfast.
arroz|rice|1|Rice and beans is a classic Brazilian meal.
feijão|beans|1|My grandma cooks the best beans.
carne|meat|1|I don't eat meat, I'm a vegetarian.
frango|chicken|1|We had fried chicken for lunch.
manteiga|butter|1|Can you pass me the butter?
açúcar|sugar|1|I don't put sugar in my coffee.
sal|salt|1|This soup needs more salt.
bolo|cake|1|She made a chocolate cake for my birthday.
sorvete|ice cream|1|Ice cream in winter? Why not!
suco|juice|1|I'd like an orange juice, please.
água|water|1|Drink more water!
café da manhã|breakfast|1|Breakfast is the most important meal of the day.
almoço|lunch|1|What's for lunch today?
jantar|dinner|1|We have dinner at 8 pm.
sopa|soup|1|Hot soup is perfect for a cold day.
uva|grape|1|Wine is made from grapes.
laranja|orange|1|Oranges have a lot of vitamin C.
limão|lemon|1|Lemons are very sour.
batata|potato|1|I love mashed potatoes.
biscoito|cookie|1|Grandma's cookies are the best.
morango|strawberry|2|Strawberries with cream are delicious.
cenoura|carrot|2|Rabbits love carrots.
cebola|onion|2|Cutting onions makes me cry.
alho|garlic|2|Garlic keeps vampires away!
alface|lettuce|2|I want a salad with lettuce and tomato.
abacaxi|pineapple|2|Do you like pineapple on pizza?
melancia|watermelon|2|Watermelon is perfect on a hot day.
pêssego|peach|2|This peach is so sweet!
pera|pear|2|A pear is green or yellow.
cereja|cherry|2|There's a cherry on top of the cake.
coco|coconut|2|We drank coconut water at the beach.
milho|corn|2|Popcorn is made from corn.
abóbora|pumpkin|2|We carve pumpkins on Halloween.
mel|honey|2|Bees make honey.
torrada|toast|2|I had toast and jam this morning.
presunto|ham|2|A ham and cheese sandwich, please.
salsicha|sausage|2|A hot dog has a sausage inside.
pimenta|pepper|2|Salt and pepper, please.
sobremesa|dessert|2|What's for dessert?
lanche|snack|2|I always take a snack to school.
amendoim|peanut|2|Some people are allergic to peanuts.
pipoca|popcorn|2|We always eat popcorn at the movies.
molho|sauce|2|This pasta sauce is amazing.
pepino|cucumber|3|Cucumbers are cool and fresh.
cogumelo|mushroom|3|Mario gets bigger when he eats a mushroom.
farinha|flour|3|You need flour to make bread.
carne de porco|pork|3|Pork comes from pigs.
carne de vaca|beef|3|Beef comes from cows.
frutos do mar|seafood|3|Shrimp and crab are seafood.
berinjela|eggplant|3|Eggplant is purple.
espinafre|spinach|3|Popeye gets strong eating spinach.
geleia|jam|3|Strawberry jam on toast is my favorite.
azeite|olive oil|3|Put some olive oil on the salad.
canela|cinnamon|3|Cinnamon rolls smell amazing.
fermento|yeast|3|Yeast makes the bread rise.
`,
  corpo: `
cabeça|head|1|I have a headache.
olho|eye|1|She has blue eyes.
nariz|nose|1|Pinocchio's nose grows when he lies.
boca|mouth|1|Don't talk with your mouth full!
orelha|ear|1|Rabbits have long ears.
mão|hand|1|Raise your hand if you know the answer.
pé|foot|1|My left foot hurts.
braço|arm|1|He broke his arm.
perna|leg|1|A spider has eight legs.
dente|tooth|1|I lost a tooth today! (plural: teeth)
cabelo|hair|1|She has long black hair.
dedo|finger|1|Don't point your finger at people.
coração|heart|1|My heart is beating fast!
rosto|face|1|Wash your face before bed.
joelho|knee|2|I fell and hurt my knee.
ombro|shoulder|2|He put his hand on my shoulder.
pescoço|neck|2|Giraffes have very long necks.
costas|back|2|My back hurts after the gym.
barriga|belly|2|My belly is full!
cotovelo|elbow|2|Don't put your elbows on the table.
pulso|wrist|2|I wear my watch on my left wrist.
unha|nail|2|Don't bite your nails!
dedo do pé|toe|2|I stubbed my toe on the table.
lábio|lip|2|My lips are dry because of the cold.
língua|tongue|2|The dog is sticking out its tongue.
peito|chest|2|He has a tattoo on his chest.
pele|skin|2|Use sunscreen to protect your skin.
osso|bone|2|The dog is chewing a bone.
sangue|blood|2|Vampires drink blood.
cérebro|brain|2|Use your brain!
tornozelo|ankle|3|I twisted my ankle playing soccer.
queixo|chin|3|He has a beard on his chin.
bochecha|cheek|3|Grandma always pinches my cheeks.
sobrancelha|eyebrow|3|She raised an eyebrow.
cílios|eyelashes|3|She has long eyelashes.
testa|forehead|3|Harry Potter has a scar on his forehead.
quadril|hip|3|Shake your hips!
cintura|waist|3|This belt is too big for my waist.
calcanhar|heel|3|Achilles' weak spot was his heel.
garganta|throat|3|I have a sore throat.
pulmão|lung|3|We breathe with our lungs.
coxa|thigh|3|My thighs hurt after the race.
canela (da perna)|shin|3|I kicked the table with my shin. Ouch!
punho (mão fechada)|fist|3|He hit the table with his fist.
axila|armpit|3|Use deodorant on your armpits.
umbigo|belly button|3|Your belly button is in the middle of your belly.
`,
  roupas: `
camisa|shirt|1|He's wearing a white shirt.
camiseta|T-shirt|1|I bought a T-shirt at the concert.
calça|pants|1|These pants are too long. (UK: trousers)
saia|skirt|1|She's wearing a red skirt.
vestido|dress|1|What a beautiful dress!
sapato|shoe|1|Tie your shoes!
meia|sock|1|I can't find my other sock.
chapéu|hat|1|The cowboy has a big hat.
casaco|coat|1|Wear a coat, it's cold outside!
óculos|glasses|1|I need my glasses to read.
bolsa|bag|1|My bag is very heavy.
anel|ring|1|He gave her a diamond ring.
relógio (de pulso)|watch|1|My watch is five minutes late.
luva|glove|2|Wear gloves in the snow.
cachecol|scarf|2|A warm scarf for the winter.
cinto|belt|2|These pants need a belt.
gravata|tie|2|My dad wears a tie to work.
boné|cap|2|He always wears a baseball cap.
botas|boots|2|Snow boots keep your feet dry.
chinelo|flip-flops|2|Brazilians love flip-flops.
tênis (calçado)|sneakers|2|I need new sneakers for running.
bolso|pocket|2|My phone is in my pocket.
colar|necklace|2|A gold necklace.
brinco|earring|2|She lost one earring.
carteira (de dinheiro)|wallet|2|I left my wallet at home.
guarda-chuva|umbrella|2|Take an umbrella, it's going to rain.
mochila|backpack|2|My backpack is full of books.
moletom com capuz|hoodie|2|I live in my hoodie in winter.
roupa de banho|swimsuit|2|Don't forget your swimsuit!
pulseira|bracelet|2|She has a friendship bracelet.
capacete|helmet|3|Always wear a helmet on your bike.
avental|apron|3|The chef wears an apron.
manga (da roupa)|sleeve|3|A shirt with long sleeves.
gorro|beanie|3|Everyone in Nilton Park wears a beanie!
sutiã|bra|3|She bought a new bra.
roupa íntima|underwear|3|Pack enough underwear for the trip.
salto alto|high heels|3|It's hard to walk in high heels.
colete|vest|3|A life vest saves lives. (UK: waistcoat)
cabide|hanger|3|Put your shirt on a hanger.
pijama|pajamas|2|I'm still in my pajamas.
`,
  casa: `
cozinha|kitchen|1|Mom is cooking in the kitchen.
quarto|bedroom|1|My bedroom is a mess.
banheiro|bathroom|1|Where's the bathroom?
sala de estar|living room|1|We watch TV in the living room.
porta|door|1|Close the door, please.
janela|window|1|Open the window, it's hot in here.
cama|bed|1|Time for bed!
mesa|table|1|Dinner is on the table.
cadeira|chair|1|Pull up a chair.
chave|key|1|I lost my keys again!
jardim|garden|1|There are roses in the garden.
sofá|couch|2|The cat is sleeping on the couch.
geladeira|fridge|2|The milk is in the fridge.
pia|sink|2|The dishes are in the sink.
chuveiro|shower|2|I sing in the shower.
espelho|mirror|2|Mirror, mirror on the wall...
travesseiro|pillow|2|I need a softer pillow.
cobertor|blanket|2|It's cold, I need another blanket.
armário (de roupas)|closet|2|My clothes are in the closet.
escada|stairs|2|Go up the stairs.
telhado|roof|2|There's snow on the roof.
parede|wall|2|There's a clock on the wall.
chão|floor|2|Don't leave your clothes on the floor!
quintal|backyard|2|The kids are playing in the backyard.
cortina|curtain|2|Close the curtains.
vaso sanitário|toilet|2|Don't forget to flush the toilet!
lixo|trash|2|Take out the trash, please.
fogão|stove|3|Be careful, the stove is hot.
gaveta|drawer|3|The spoons are in the top drawer.
teto|ceiling|3|There's a spider on the ceiling!
lâmpada|light bulb|3|We need a new light bulb.
tapete|rug|3|The dog is sleeping on the rug.
prateleira|shelf|3|The books are on the shelf.
torneira|faucet|3|Turn off the faucet! (UK: tap)
sótão|attic|3|There are old toys in the attic.
porão|basement|3|The basement is dark and scary.
varanda|balcony|3|We have breakfast on the balcony.
campainha|doorbell|3|The doorbell rang.
vassoura|broom|3|Witches fly on brooms.
balde|bucket|3|A bucket of water.
fechadura|lock|3|Someone changed the lock.
lareira|fireplace|3|We sat by the fireplace.
`,
  cores: `
vermelho|red|1|Roses are red.
azul|blue|1|The sky is blue.
verde|green|1|Grass is green.
amarelo|yellow|1|Bananas are yellow.
preto|black|1|My cat is black.
branco|white|1|Snow is white.
cinza|gray|1|Elephants are gray.
marrom|brown|1|Chocolate is brown.
rosa|pink|1|Flamingos are pink.
roxo|purple|1|Grapes can be purple or green.
laranja (cor)|orange|1|Pumpkins are orange.
dourado|golden|2|A golden ring.
prateado|silver|2|A silver medal.
azul-claro|light blue|2|My room is light blue.
verde-escuro|dark green|2|Pine trees are dark green.
colorido|colorful|2|A colorful rainbow.
quadrado|square|2|A chessboard has 64 squares.
redondo|round|2|The Earth is round.
estrela|star|1|Draw a star.
listrado|striped|3|A zebra is striped.
de bolinhas|polka-dot|3|A polka-dot dress.
xadrez (estampa)|plaid|3|A plaid shirt.
`,
  família: `
mãe|mother|1|My mother is a teacher.
pai|father|1|My father cooks on Sundays.
irmão|brother|1|I have one brother.
irmã|sister|1|My sister is older than me.
avô|grandfather|1|My grandfather tells funny stories.
avó|grandmother|1|My grandmother makes the best cake.
tio|uncle|1|My uncle lives in Canada.
tia|aunt|1|My aunt has three cats.
filho|son|1|They have a son and a daughter.
filha|daughter|1|Their daughter is a doctor.
namorado|boyfriend|1|Her boyfriend is very funny.
namorada|girlfriend|1|He's going to the movies with his girlfriend.
pais (pai e mãe)|parents|1|My parents met at school.
melhor amigo|best friend|1|He's my best friend.
primo|cousin|2|My cousin is my age.
marido|husband|2|Her husband is from Portugal.
esposa|wife|2|His wife is a pilot.
neto|grandson|2|Grandma loves her grandson.
neta|granddaughter|2|Her granddaughter is two years old.
gêmeos|twins|2|They're twins, but they don't look alike.
vizinho|neighbor|2|Our neighbor has a big dog.
sobrinho|nephew|3|My nephew is learning to walk.
sobrinha|niece|3|My niece loves dinosaurs.
sogra|mother-in-law|3|My mother-in-law is visiting us.
sogro|father-in-law|3|My father-in-law loves fishing.
genro|son-in-law|3|He's their son-in-law.
nora|daughter-in-law|3|She's their daughter-in-law.
cunhado|brother-in-law|3|My brother-in-law is a chef.
cunhada|sister-in-law|3|My sister-in-law lives next door.
enteado|stepson|3|He has a stepson from his wife's first marriage.
padrasto|stepfather|3|My stepfather is very nice.
madrasta|stepmother|3|Cinderella had an evil stepmother.
parentes|relatives|3|All my relatives came to the wedding.
noivo|fiancé|3|Her fiancé proposed in Paris.
viúva|widow|3|She became a widow very young.
`,
  escola: `
professor|teacher|1|Our teacher is very funny.
aluno|student|1|There are thirty students in my class.
livro|book|1|Open your books on page ten.
caneta|pen|1|Can I borrow your pen?
lápis|pencil|1|Write with a pencil.
caderno|notebook|1|Write it in your notebook.
lição de casa|homework|1|Did you do your homework?
sala de aula|classroom|1|The classroom is on the second floor.
prova|test|1|We have a math test tomorrow.
matemática|math|1|Math is my favorite subject.
ciências|science|1|We did an experiment in science class.
férias|vacation|1|Summer vacation is coming!
carteira (mesa escolar)|desk|1|Sit at your desk.
quadro|board|1|The teacher wrote on the board.
borracha|eraser|2|Can I use your eraser?
régua|ruler|2|Draw a line with a ruler.
tesoura|scissors|2|Be careful with the scissors.
cola (de papel)|glue|2|Glue the picture in your notebook.
recreio|recess|2|We play soccer at recess. (UK: break)
nota (da prova)|grade|2|I got a good grade on the test!
estojo|pencil case|2|My pencil case is full of pens.
biblioteca|library|2|Be quiet in the library!
redação|essay|2|Write an essay about your vacation.
faculdade|college|2|She's going to college next year.
matéria (disciplina)|subject|2|What's your favorite subject?
colega de classe|classmate|2|My classmates are my friends.
giz|chalk|3|The teacher writes with chalk.
apontador|sharpener|3|My pencil needs a sharpener.
diretor (da escola)|principal|3|The principal called my parents!
formatura|graduation|3|Graduation day is next Friday.
mensalidade|tuition|3|College tuition is very expensive.
uniforme|uniform|1|We wear a uniform at school.
`,
  trabalho: `
médico|doctor|1|The doctor said I'm fine.
policial|police officer|1|The police officer helped us.
motorista|driver|1|The bus driver is very nice.
cantor|singer|1|She's a famous singer.
chefe|boss|1|My boss is on vacation.
escritório|office|1|She works in an office.
trabalho (emprego)|job|1|He has a new job.
enfermeiro|nurse|2|The nurse took my temperature.
bombeiro|firefighter|2|Firefighters are heroes.
cozinheiro|cook|2|My grandma is a great cook.
garçom|waiter|2|The waiter brought the menu.
advogado|lawyer|2|You need a lawyer.
fazendeiro|farmer|2|The farmer has many cows.
pintor|painter|2|Van Gogh was a famous painter.
padeiro|baker|2|The baker makes fresh bread every morning.
vendedor|salesperson|2|The salesperson showed me a new phone.
funcionário|employee|2|The company has 50 employees.
entrevista|interview|2|I have a job interview tomorrow.
reunião|meeting|2|The meeting is at 10 am.
empresa|company|2|She works for a big company.
juiz (do tribunal)|judge|2|The judge made a decision.
soldado|soldier|2|The soldiers marched.
gerente|manager|2|I want to talk to the manager.
dono|owner|2|Who's the owner of this car?
carpinteiro|carpenter|3|The carpenter made a table.
encanador|plumber|3|Call the plumber, the sink is leaking!
cabeleireiro|hairdresser|3|My hairdresser cut my hair too short.
açougueiro|butcher|3|The butcher sells meat.
pedreiro|bricklayer|3|The bricklayer built the wall.
carteiro|mail carrier|3|The mail carrier delivers letters.
desempregado|unemployed|3|He's unemployed and looking for a job.
aposentado|retired|3|My grandpa is retired.
veterinário|vet|3|We took the dog to the vet.
contador|accountant|3|The accountant does our taxes.
caixa (de loja)|cashier|3|Pay the cashier.
zelador|janitor|3|The janitor cleans the school.
estagiário|intern|3|The intern made coffee for everybody.
currículo|résumé|3|Send me your résumé. (UK: CV)
`,
  cidade: `
rua|street|1|I live on this street.
cidade|city|1|New York is a big city.
loja|store|1|The store opens at 9.
praia|beach|1|Let's go to the beach!
fazenda|farm|1|My uncle lives on a farm.
ponto de ônibus|bus stop|1|Wait for me at the bus stop.
estação de trem|train station|1|The train station is downtown.
igreja|church|2|The old church in the square.
ponte|bridge|2|Cross the bridge.
prédio|building|2|The tallest building in the city.
esquina|corner|2|The bakery is on the corner.
semáforo|traffic light|2|Stop at the red traffic light.
estacionamento|parking lot|2|The parking lot is full.
posto de gasolina|gas station|2|We stopped at a gas station.
delegacia|police station|2|He went to the police station.
correio|post office|2|I need to go to the post office.
padaria|bakery|2|Fresh bread from the bakery.
farmácia|drugstore|2|Buy medicine at the drugstore.
shopping|mall|2|Let's go to the mall.
cinema|movie theater|2|The movie theater is downtown.
bairro|neighborhood|2|It's a quiet neighborhood.
vila (vilarejo)|village|2|A small village in the mountains.
praça|square|2|There's a fountain in the square.
banco (de praça)|bench|2|Sit on the bench.
fonte|fountain|2|Throw a coin in the fountain!
placa|sign|2|Read the sign.
lixeira|trash can|2|Put it in the trash can.
calçada|sidewalk|3|Walk on the sidewalk. (UK: pavement)
prefeitura|city hall|3|The mayor works at city hall.
açougue|butcher shop|3|Buy meat at the butcher shop.
rodoviária|bus station|3|The bus station is near the center.
beco|alley|3|A dark alley.
faixa de pedestres|crosswalk|3|Cross at the crosswalk.
quarteirão|block|3|It's two blocks from here.
centro (da cidade)|downtown|3|Let's go downtown.
`,
  natureza: `
sol|sun|1|The sun is shining.
chuva|rain|1|I love the sound of rain.
neve|snow|1|Let's play in the snow!
vento|wind|1|The wind is very strong today.
nuvem|cloud|1|That cloud looks like a dog.
céu|sky|1|The sky is clear tonight.
lua|moon|1|There's a full moon tonight.
árvore|tree|1|The cat climbed the tree.
flor|flower|1|He gave her flowers.
rio|river|1|We swam in the river.
mar|sea|1|The sea is calm today.
gelo|ice|1|The lake is covered in ice.
verão|summer|1|Summer is my favorite season.
inverno|winter|1|Winter in Nilton Park is snowy.
ensolarado|sunny|1|It's a sunny day.
chuvoso|rainy|1|I stay home on rainy days.
tempestade|storm|2|A big storm is coming.
trovão|thunder|2|The dog is scared of thunder.
relâmpago|lightning|2|Lightning never strikes the same place twice.
neblina|fog|2|I can't see anything in this fog.
arco-íris|rainbow|2|Look, a rainbow!
floresta|forest|2|Don't get lost in the forest.
ilha|island|2|A desert island.
folha|leaf|2|The leaves fall in autumn.
grama|grass|2|Keep off the grass.
pedra|rock|2|He threw a rock in the lake.
areia|sand|2|We built a sand castle.
onda|wave|2|Surfers love big waves.
nublado|cloudy|2|It's cloudy today.
primavera|spring|2|Flowers bloom in spring.
outono|fall|2|The leaves turn orange in the fall. (UK: autumn)
cachoeira|waterfall|2|Niagara Falls is a huge waterfall.
caverna|cave|2|Bats live in caves.
colina|hill|2|Our house is on a hill.
pôr do sol|sunset|2|What a beautiful sunset!
nascer do sol|sunrise|2|We woke up early to see the sunrise.
garoa|drizzle|3|It's just a drizzle, not real rain.
granizo|hail|3|Hail damaged the cars.
enchente|flood|3|The flood destroyed the bridge.
seca|drought|3|The drought killed the plants.
terremoto|earthquake|3|The earthquake shook the city.
galho|branch|3|A bird is sitting on the branch.
raiz|root|3|Trees have deep roots.
penhasco|cliff|3|Don't go near the cliff!
`,
  sentimentos: `
feliz|happy|1|I'm so happy today!
triste|sad|1|Why are you sad?
bravo|angry|1|My mom is angry with me.
cansado|tired|1|I'm tired, I'm going to bed.
com fome|hungry|1|I'm hungry, let's eat!
com medo|scared|1|I'm scared of spiders.
apaixonado|in love|1|They're in love.
com sede|thirsty|2|I'm thirsty, can I have some water?
entediado|bored|2|I'm bored, let's play a game.
animado|excited|2|I'm so excited about the trip!
preocupado|worried|2|Don't be worried, it's fine.
tímido|shy|2|He's shy with new people.
corajoso|brave|2|The brave firefighter saved the cat.
preguiçoso|lazy|2|My cat is so lazy.
ocupado|busy|2|Sorry, I'm busy right now.
de bom humor|in a good mood|2|She's in a good mood today.
orgulhoso|proud|3|I'm proud of you!
envergonhado|embarrassed|3|I was so embarrassed when I fell.
com ciúmes|jealous|3|He's jealous of his brother.
solitário|lonely|3|She feels lonely without her friends.
chateado|upset|3|He's upset because he lost the game.
grato|grateful|3|I'm grateful for your help.
ansioso|anxious|3|I feel anxious before tests.
aliviado|relieved|3|I was relieved when I found my keys.
com saudade de casa|homesick|3|I'm homesick, I miss my family.
decepcionado|disappointed|3|I'm disappointed with the result.
irritado|annoyed|3|That noise makes me annoyed.
`,
  descrições: `
bonito|beautiful|1|What a beautiful day!
feio|ugly|1|The ugly duckling became a swan.
alto (pessoa)|tall|1|My brother is very tall.
baixo (pessoa)|short|1|I'm short, but I'm fast!
gordo|fat|1|A fat cat.
rápido|fast|1|Cheetahs are really fast.
lento|slow|1|The internet is slow today.
grande|big|1|What a big house!
pequeno|small|1|A small dog.
novo|new|1|I have a new phone.
velho|old|1|This car is very old.
jovem|young|1|She's too young to drive.
rico|rich|1|He's rich, he has three houses.
pobre|poor|1|The poor dog is cold.
forte|strong|1|Ants are very strong.
fácil|easy|1|This test is easy!
difícil|difficult|1|English is not difficult!
limpo|clean|1|My room is clean.
sujo|dirty|1|Your shoes are dirty.
caro|expensive|1|This phone is too expensive.
quente|hot|1|The coffee is hot.
frio|cold|1|It's cold outside.
engraçado|funny|1|That joke was so funny.
magro|thin|2|He's very thin.
fraco|weak|2|I feel weak today.
barato|cheap|2|This shirt was cheap.
cheio|full|2|The bus is full.
vazio|empty|2|The fridge is empty!
molhado|wet|2|My socks are wet.
seco|dry|2|The desert is very dry.
pesado|heavy|2|This box is heavy.
leve|light|2|A feather is light.
barulhento|noisy|2|The classroom is noisy.
quieto|quiet|2|Be quiet, please.
chato|boring|2|This movie is boring.
estranho|weird|2|That's weird...
perigoso|dangerous|2|Sharks are dangerous.
seguro|safe|2|Is it safe to swim here?
macio|soft|2|My pillow is soft.
duro|hard|2|This bread is hard.
fundo|deep|2|The lake is deep.
largo|wide|2|A wide river.
esperto|smart|2|Dolphins are smart.
gentil|kind|2|She's very kind to everybody.
educado|polite|2|Be polite and say thank you.
mal-educado|rude|2|Don't be rude!
afiado|sharp|3|Careful, the knife is sharp.
raso|shallow|3|The water here is shallow.
estreito|narrow|3|A narrow street.
grosso|thick|3|A thick book.
bagunçado|messy|3|My room is so messy.
arrumado|tidy|3|Keep your room tidy.
`,
  verbos: `
correr|run|1|I run every morning.
andar (a pé)|walk|1|Let's walk to the park.
comer|eat|1|I eat a lot of rice.
beber|drink|1|Drink some water.
dormir|sleep|1|I sleep eight hours a night.
ler|read|1|I read before bed.
escrever|write|1|Write your name here.
falar|speak|1|Do you speak English?
escutar|listen|1|Listen to the music.
ver|see|1|I can't see anything!
nadar|swim|1|Can you swim?
cantar|sing|1|She sings beautifully.
pular|jump|1|Jump higher!
abrir|open|1|Open the door.
fechar|close|1|Close your eyes.
comprar|buy|1|I want to buy a new bike.
ajudar|help|1|Can you help me?
aprender|learn|1|I'm learning English.
ganhar (vencer)|win|1|We want to win the game!
viajar|travel|1|I love to travel.
cozinhar|cook|1|My dad loves to cook.
dirigir|drive|1|I can't drive yet.
vender|sell|2|They sell ice cream here.
ensinar|teach|2|She teaches math.
esquecer|forget|2|Don't forget your keys!
lembrar|remember|2|I can't remember his name.
perder (o jogo)|lose|2|Nobody likes to lose.
achar (encontrar)|find|2|I can't find my phone.
esperar|wait|2|Wait for me!
chegar|arrive|2|The train arrives at noon.
lavar|wash|2|Wash your hands.
empurrar|push|2|Push the door.
puxar|pull|2|Pull the rope.
quebrar|break|2|Don't break the window!
consertar|fix|2|Can you fix my bike?
chorar|cry|2|Babies cry a lot.
rir|laugh|2|Don't laugh at me!
sorrir|smile|2|Smile for the photo!
gritar|shout|2|Don't shout, I can hear you.
arremessar|throw|2|Throw the ball!
pegar (no ar)|catch|2|Catch the ball!
cair|fall|2|Be careful, don't fall.
voar|fly|2|Birds fly south in winter.
desenhar|draw|2|Draw a cat.
construir|build|2|Let's build a snowman.
escolher|choose|2|Choose one card.
mostrar|show|2|Show me your drawing.
emprestar|lend|3|Can you lend me five dollars?
pedir emprestado|borrow|3|Can I borrow your pen?
mentir|lie|3|Don't lie to me.
sussurrar|whisper|3|She whispered a secret.
cheirar|smell|3|Smell this flower.
morder|bite|3|Does your dog bite?
cavar|dig|3|The dog is digging a hole.
esconder|hide|3|Hide behind the tree!
amarrar|tie|3|Tie your shoes.
dobrar (papel, roupa)|fold|3|Fold your clothes.
espirrar|sneeze|3|Bless you! You sneezed.
tropeçar|trip|3|I tripped over the cat.
bocejar|yawn|3|You're yawning, go to bed!
`,
  tempo: `
segunda-feira|Monday|1|I hate Mondays.
terça-feira|Tuesday|1|We have English class on Tuesday.
quarta-feira|Wednesday|1|Wednesday is in the middle of the week.
quinta-feira|Thursday|1|See you on Thursday.
sexta-feira|Friday|1|Thank God it's Friday!
sábado|Saturday|1|Let's go to the beach on Saturday.
domingo|Sunday|1|We have lunch with grandma on Sunday.
hoje|today|1|Today is a good day.
amanhã|tomorrow|1|See you tomorrow!
ontem|yesterday|1|I saw him yesterday.
semana|week|1|A week has seven days.
mês|month|1|February is the shortest month.
ano|year|1|Happy New Year!
hora|hour|1|The movie is two hours long.
manhã|morning|1|Good morning!
tarde|afternoon|1|Good afternoon!
noite|night|1|Good night, sleep well.
fim de semana|weekend|1|What are you doing this weekend?
aniversário|birthday|1|Happy birthday!
sempre|always|1|I always brush my teeth.
nunca|never|1|I never eat broccoli.
às vezes|sometimes|1|Sometimes I walk to school.
agora|now|1|Do it now!
antes|before|1|Wash your hands before lunch.
depois|after|1|Let's play after school.
janeiro|January|1|January is the first month.
fevereiro|February|2|Carnival is usually in February.
março|March|1|Spring starts in March in the USA.
abril|April|1|April Fools' Day is April 1st.
maio|May|1|My birthday is in May.
junho|June|1|Festa Junina is in June.
julho|July|1|American Independence Day is July 4th.
agosto|August|1|School starts in August.
setembro|September|1|September has 30 days.
outubro|October|1|Halloween is in October.
novembro|November|1|Thanksgiving is in November.
dezembro|December|1|Christmas is in December.
meia-noite|midnight|2|Cinderella left at midnight.
meio-dia|noon|2|Let's have lunch at noon.
feriado|holiday|2|Monday is a holiday!
cedo|early|2|I wake up early.
atrasado|late|2|Sorry, I'm late!
frequentemente|often|2|I often go to the gym.
logo (em breve)|soon|2|See you soon!
século|century|2|We live in the 21st century.
raramente|rarely|3|I rarely eat fast food.
ainda|still|3|Are you still here?
já|already|3|I've already finished.
anteontem|the day before yesterday|3|I saw her the day before yesterday.
depois de amanhã|the day after tomorrow|3|The party is the day after tomorrow.
`,
  transporte: `
carro|car|1|My dad has a red car.
ônibus|bus|1|I take the bus to school.
trem|train|1|The train is late.
avião|plane|1|The plane leaves at 6.
bicicleta|bike|1|I ride my bike to the park.
barco|boat|1|We went fishing on a boat.
estrada|road|1|The road is closed because of the snow.
navio|ship|2|A pirate ship!
moto|motorcycle|2|He rides a motorcycle.
caminhão|truck|2|A big truck is blocking the street.
metrô|subway|2|Take the subway downtown. (UK: underground)
foguete|rocket|2|The rocket went to the moon.
passagem (bilhete)|ticket|2|Two tickets to Paris, please.
mala|suitcase|2|My suitcase is too heavy.
bagagem|luggage|2|Where can I pick up my luggage?
viagem|trip|2|Have a nice trip!
trânsito|traffic|2|Sorry, I'm stuck in traffic.
voo|flight|2|My flight is delayed.
gasolina|gas|2|We need gas. (UK: petrol)
patinete|scooter|2|He goes to school on a scooter.
pneu|tire|3|We have a flat tire!
volante|steering wheel|3|Keep your hands on the steering wheel.
cinto de segurança|seat belt|3|Fasten your seat belt.
carteira de motorista|driver's license|3|I just got my driver's license!
embarque|boarding|3|Boarding starts at gate 5.
atraso|delay|3|Sorry for the delay.
ida e volta|round trip|3|A round trip ticket, please.
freio|brake|3|Hit the brakes!
porta-malas|trunk|3|Put the bags in the trunk. (UK: boot)
`,
  tecnologia: `
celular|cell phone|1|Turn off your cell phone in class.
teclado|keyboard|2|My keyboard is broken.
tela|screen|2|Don't touch the screen.
senha|password|2|Never share your password!
arquivo|file|2|Save the file.
carregador|charger|2|Can I borrow your charger?
fone de ouvido|headphones|2|Put on your headphones.
impressora|printer|2|The printer is out of paper.
conta|account|2|Create an account.
usuário|user|2|Type your user name.
salvar|save|2|Don't forget to save your work!
apagar|delete|2|Delete that photo!
controle remoto|remote control|2|Where's the remote control?
ligar (aparelho)|turn on|2|Turn on the TV.
desligar|turn off|2|Turn off the lights.
tecla|key|2|Press any key.
pasta (de arquivos)|folder|3|Put the files in this folder.
caixa de som|speaker|3|The speaker is too loud.
rede|network|3|Connect to the Wi-Fi network.
configurações|settings|3|Change it in the settings.
atualização|update|3|Install the update.
tomada|outlet|3|Plug it into the outlet.
fio|wire|3|Don't touch that wire!
lanterna|flashlight|3|We need a flashlight in the cave.
navegador|browser|3|Open the browser.
anexo|attachment|3|Check the attachment.
`,
  diversão: `
futebol|soccer|1|Brazil loves soccer. (UK: football)
bola|ball|1|Kick the ball!
jogo|game|1|Let's play a game.
time (equipe)|team|1|Which team do you support?
jogador|player|1|He's the best player on the team.
gol|goal|1|What a goal!
brinquedo|toy|1|The kids are playing with their toys.
piscina|pool|1|Let's jump in the pool!
corrida|race|2|Who won the race?
natação|swimming|2|Swimming is good exercise.
boneca|doll|2|She has a collection of dolls.
pipa|kite|2|Let's fly a kite.
xadrez (jogo)|chess|2|Chess is a game of strategy.
quebra-cabeça|puzzle|2|A 1000-piece puzzle.
patins|skates|2|I got new skates for Christmas.
pescaria|fishing|2|My grandpa loves fishing.
academia (de ginástica)|gym|2|I go to the gym three times a week.
torcedor|fan|2|He's a big fan of Flamengo.
cartas (baralho)|cards|2|Let's play cards.
juiz (do jogo)|referee|3|The referee gave him a red card.
apito|whistle|3|The referee blew the whistle.
quadra|court|3|A basketball court.
balanço|swing|3|The kids are on the swings.
escorregador|slide|3|Go down the slide!
prancha de surf|surfboard|3|He carries his surfboard to the beach.
gangorra|seesaw|3|Two kids on a seesaw.
esconde-esconde|hide-and-seek|3|Let's play hide-and-seek!
pega-pega|tag|3|You're it! We're playing tag.
queimada (jogo)|dodgeball|3|The best dodgeball is at the Nilton Park gym! 🔴🔵
dado (do jogo)|die|3|Roll the die! (plural: dice)
`,
  inverno: `
boneco de neve|snowman|1|Let's build a snowman!
bola de neve|snowball|1|He threw a snowball at me!
chocolate quente|hot chocolate|1|A cup of hot chocolate, please.
trenó|sled|2|Let's go down the hill on a sled.
floco de neve|snowflake|2|No two snowflakes are the same.
congelado|frozen|2|The lake is frozen.
patinação no gelo|ice skating|2|Ice skating on the lake is fun.
pinheiro|pine tree|2|Pine trees stay green in winter.
calor|heat|2|I miss the summer heat.
muito frio (congelante)|freezing|2|It's freezing outside!
escorregadio|slippery|3|Careful, the sidewalk is slippery.
nevasca|blizzard|3|School is closed because of the blizzard.
derreter|melt|3|The snowman is melting!
aquecedor|heater|3|Turn on the heater.
pingente de gelo|icicle|3|There are icicles on the roof.
`,
  perguntas: `
o que|what|1|What's your name?
quem|who|1|Who is that girl?
onde|where|1|Where do you live?
quando|when|1|When is your birthday?
por que|why|1|Why are you laughing?
como|how|1|How are you?
qual (entre opções)|which|2|Which color do you prefer?
quanto (custa)|how much|2|How much is this shirt?
quantos|how many|2|How many brothers do you have?
de quem|whose|3|Whose phone is this?
com que frequência|how often|3|How often do you go to the gym?
`,
};

// rótulo do tema (aparece como "🔤 Vocabulário · comida")
const SUB = {
  animais: 'animais 🐶', comida: 'comida 🍔', corpo: 'corpo 🦵', roupas: 'roupas 👕', casa: 'casa 🏠', cores: 'cores e formas 🎨',
  família: 'família 👪', escola: 'escola 🏫', trabalho: 'profissões 👷', cidade: 'cidade 🏙️', natureza: 'natureza e clima 🌦️',
  sentimentos: 'sentimentos 😊', descrições: 'adjetivos 📏', verbos: 'verbos 🏃', tempo: 'dias e horas 📅', transporte: 'transporte 🚗',
  tecnologia: 'tecnologia 💻', diversão: 'esporte e diversão ⚽', inverno: 'inverno ❄️', perguntas: 'palavras de pergunta ❓',
};

const PT_EN = [
  (w) => `Como se diz "${w}" em inglês?`,
  (w) => `"${w}" em inglês é...`,
  (w) => `Qual é a palavra em inglês para "${w}"?`,
];
const EN_PT = [
  (w) => `O que significa "${w}"?`,
  (w) => `"${w}" quer dizer...`,
  (w) => `Traduza: "${w}"`,
];

// hash estável (mesma palavra → mesma variação de enunciado/erradas a cada reinício)
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function seeded(seed) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// tira o qualificador "(da perna)" para comparar palavras
const bare = (s) => s.replace(/\s*\(.*?\)\s*/g, '').trim();

export function parseTopic(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const [pt, en, lvl, ex = ''] = l.split('|').map((s) => s.trim());
    return { pt, en, lvl: Number(lvl), ex };
  });
}

// erradas: até 5 do mesmo tema (o sorteio da pergunta usa 2 ou 3 delas), preferindo nível parecido
function distractors(words, i, key, rnd) {
  const me = words[i];
  const pool = words.filter((w, j) => j !== i && bare(w[key]).toLowerCase() !== bare(me[key]).toLowerCase());
  pool.sort((a, b) => Math.abs(a.lvl - me.lvl) - Math.abs(b.lvl - me.lvl) || rnd() - 0.5);
  const near = pool.slice(0, 10);
  for (let k = near.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    [near[k], near[j]] = [near[j], near[k]];
  }
  return near.slice(0, 5).map((w) => w[key]);
}

export function vocabQuestions() {
  const out = [];
  for (const [topic, text] of Object.entries(TOPICS)) {
    const words = parseTopic(text);
    words.forEach((w, i) => {
      const h = hashStr(`${topic}:${w.en}`);
      const rnd = seeded(h);
      const tip = `${bare(w.en)} = ${bare(w.pt)}${w.ex ? ` · "${w.ex}"` : ''}`;
      const sub = SUB[topic] || topic;
      out.push({
        id: `voc:${slug(topic)}:${slug(w.en)}:pe`,
        cat: 'vocab', sub, lvl: w.lvl,
        q: PT_EN[h % PT_EN.length](w.pt),
        a: w.en,
        w: distractors(words, i, 'en', rnd),
        tip,
      });
      out.push({
        id: `voc:${slug(topic)}:${slug(w.en)}:ep`,
        cat: 'vocab', sub, lvl: w.lvl,
        q: EN_PT[(h >>> 3) % EN_PT.length](bare(w.en)),
        a: w.pt,
        w: distractors(words, i, 'pt', rnd),
        tip,
      });
    });
  }
  return out;
}
