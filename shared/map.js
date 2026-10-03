// Definição de dados do primeiro mapa: "Praça Central".
// O mapa é só dados: o servidor usa para colisão/pathfinding/interações e
// o cliente usa para desenhar. Novos mapas = novos arquivos neste formato.

const trees = [
  [80, 200], [180, 170], [60, 820], [110, 980], [70, 1180], [240, 1230],
  [130, 300], [760, 1220], [560, 1180], [1240, 1210], [1950, 1150], [1990, 600],
  [1960, 280], [1270, 1000], [700, 1050], [1165, 300], [60, 560], [1985, 980],
  [450, 1230], [1550, 1210], [1750, 1230], [1880, 1235],
];

export const MAP = {
  id: 'praca',
  name: 'Praça Central',
  width: 2000,
  height: 1300,
  // faixa do topo (montanhas/casas) não é andável
  walkTop: 300,
  margin: 24,
  spawn: { x: 1000, y: 1000, r: 90 },

  zones: [
    { id: 'lago', name: 'Lago', x: 40, y: 300, w: 760, h: 620 },
    { id: 'praca', name: 'Praça', x: 700, y: 380, w: 600, h: 820 },
    { id: 'sports', name: 'Área de Sports', x: 1300, y: 330, w: 680, h: 640 },
  ],

  lake: { x: 400, y: 600, rx: 290, ry: 190 },
  // píer: área andável dentro do lago
  dock: { x: 590, y: 585, w: 170, h: 50 },

  field: { x: 1360, y: 430, w: 560, h: 440 },
  goalMouth: 90, // metade da abertura do gol (eixo y)
  goalDepth: 36,

  houses: [
    { x: 560, y: 120, w: 200, h: 150, color: '#e9c46a', roof: '#9b2c2c' },
    { x: 880, y: 100, w: 240, h: 170, color: '#d98c5f', roof: '#3f4a5a' },
  ],

  // Prédio do Dojo de Karatê na fileira de casas: clicar mostra as lutas ao vivo e leva
  // para a plateia. `door` = onde o espectador "está" na praça (e reaparece ao sair).
  dojo: { id: 'dojo', x: 1230, y: 100, w: 230, h: 170, door: { x: 1345, y: 318 } },
  // Ginásio da Queimada (do lado esquerdo, acima do lago): clicar lista as partidas e deixa entrar
  // ou criar uma. `door` = onde quem está jogando "está" na praça (e reaparece ao sair).
  gym: { id: 'gym', x: 240, y: 96, w: 260, h: 174, door: { x: 370, y: 322 } },

  fountain: { id: 'fountain', x: 1000, y: 640, r: 92, interact: { x: 1000, y: 760 } },

  benches: [
    { id: 'bench-1', x: 830, y: 480 },
    { id: 'bench-2', x: 1170, y: 480 },
    { id: 'bench-3', x: 830, y: 830 },
    { id: 'bench-4', x: 1170, y: 830 },
    { id: 'bench-5', x: 720, y: 760 }, // na beira do lago
  ],
  benchSeatOffset: 26, // cada banco tem 2 lugares: x - off, x + off

  lamps: [
    { id: 'lamp-1', x: 760, y: 400 },
    { id: 'lamp-2', x: 1240, y: 400 },
    { id: 'lamp-3', x: 760, y: 900 },
    { id: 'lamp-4', x: 1240, y: 900 },
    { id: 'lamp-5', x: 1640, y: 960 },
  ],

  bleachers: { x: 1440, y: 340, w: 400, h: 60 },
  signs: [
    { x: 840, y: 1000, text: 'PRAÇA' },
    { x: 660, y: 420, text: 'LAGO' },
    { x: 1330, y: 960, text: 'SPORTS' },
  ],

  trees: trees.map(([x, y], i) => ({ id: `tree-${i}`, x, y })),
};

// Colisores derivados (círculos e retângulos), calculados uma vez.
export function buildColliders(map = MAP) {
  const c = [];
  c.push({ kind: 'circle', x: map.fountain.x, y: map.fountain.y, r: map.fountain.r });
  for (const t of map.trees) c.push({ kind: 'circle', x: t.x, y: t.y, r: 18 });
  for (const l of map.lamps) c.push({ kind: 'circle', x: l.x, y: l.y, r: 8 });
  const b = map.bleachers;
  c.push({ kind: 'rect', x: b.x, y: b.y, w: b.w, h: b.h });
  return c;
}

export function zoneAt(x, y, map = MAP) {
  // prioridade: sports > lago > praça (zonas se sobrepõem nas bordas)
  const order = ['sports', 'lago', 'praca'];
  for (const id of order) {
    const z = map.zones.find((zz) => zz.id === id);
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z;
  }
  return null;
}

export function benchSeats(map = MAP) {
  const seats = [];
  for (const b of map.benches) {
    seats.push({ id: `${b.id}:L`, bench: b.id, x: b.x - map.benchSeatOffset, y: b.y + 4 });
    seats.push({ id: `${b.id}:R`, bench: b.id, x: b.x + map.benchSeatOffset, y: b.y + 4 });
  }
  return seats;
}
