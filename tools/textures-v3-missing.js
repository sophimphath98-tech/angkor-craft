/* Angkor Craft — proposals for content the game does not have yet (Khmer versions of
 * standard block-game content), plus a clearer fence icon that no longer reads as a ladder.
 * Same clarity rules as textures-v2.js: no lone pixels, short hue-shifted ramps,
 * light from the top-left, dark outline around item icons.
 * Exports: BLOCKS (16x16 tiles), ITEMS (16x16 icons), FACES (8x8), CONCEPTS (front views).
 */
const V2 = require('./textures-v2.js');
const { tile, hash, vnoise, fbm, ramp, shade, mix, hex, pal, course } = V2.helpers;

/* ---------- shape painter with auto-shading (as in textures-v2 sprite) ---------- */
function paint(w, h, fn, palettes, { outline = true } = {}) {
  const grid = Array.from({ length: h }, () => new Array(w).fill(null));
  const inb = (x, y) => y >= 0 && y < h && x >= 0 && x < w;
  const g = {
    rect(x0, y0, x1, y1, p) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) grid[y][x] = p; },
    ellipse(cx, cy, rx, ry, p) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) grid[y][x] = p; },
    ring(cx, cy, r0, r1, p) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d >= r0 && d <= r1) grid[y][x] = p; } },
    dot(x, y, p) { if (inb(x, y)) grid[y][x] = p; },
    line(x0, y0, x1, y1, p, t = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
      for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); for (let k = 0; k < t; k++) g.dot(x + k, y, p); }
    },
    map(x0, y0, rows, legend) { rows.forEach((r, y) => [...r].forEach((c, x) => { if (legend[c]) g.dot(x0 + x, y0 + y, legend[c]); })); },
    clear(x, y) { if (inb(x, y)) grid[y][x] = null; },
    get: (x, y) => inb(x, y) ? grid[y][x] : null,
  };
  fn(g);
  const px = new Array(w * h * 4).fill(0);
  const OUT = hex('1a120e');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = grid[y][x];
    let c = null;
    if (!p) {
      if (outline && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g.get(x + dx, y + dy))) c = OUT;
    } else {
      const P = palettes[p];
      if (!P) throw new Error('no palette ' + p);
      if (P.length === 1) c = P[0];
      else {
        const lit = g.get(x - 1, y) !== p || g.get(x, y - 1) !== p;
        const dark = g.get(x + 1, y) !== p || g.get(x, y + 1) !== p;
        const lv = lit && !dark ? P.length - 1 : dark ? 0 : Math.min(P.length - 2, 1 + (hash(x >> 1, y >> 1, 9) > 0.7 ? 1 : 0));
        c = P[lv];
      }
    }
    if (c) { const i = (y * w + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3] ?? 255; }
  }
  return { w, h, px };
}
const icon = (fn, pals) => paint(16, 16, fn, pals);
const asTile = (t) => ({ w: 16, h: 16, px: t });

/* ---------- palettes ---------- */
const P = {
  post: pal('4a2618', '6e3a22', '93532f', 'b06a3c'),
  rail: pal('7d4127', 'a8643a', 'c8844e', 'e0a468'),
  gold: pal('8a5a08', 'c8901a', 'f2c64a', 'fff0a0'),
  bamboo: pal('5a6a1c', '7e9028', 'a6b83a', 'cede6a'),
  node: [hex('4a5414')],
  rattan: pal('8a6a2a', 'c8a050', 'e8c878'),
  laterite: pal('6e2a18', '9a4426', 'b85a2e', 'd0763e'),
  pit: [hex('4a1a10')],
  coping: pal('8f8274', 'ad9e86', 'c7b796', 'dccdab'),
  sandstone: pal('8f8274', 'ad9e86', 'c7b796', 'dccdab'),
  stone: pal('565a66', '6f737c', '898b90', 'a3a3a3'),
  flint: pal('2a2a30', '3c3c44', '55555e', '7a7a84'),
  steel: pal('5c6068', '8a9098', 'c0c6cc', 'eef2f6'),
  iron: pal('6c7078', '9aa0aa', 'cfd4dc', 'f2f5f8'),
  wood: pal('5a2c18', '7d4127', '9a5532', 'b56c40'),
  red: pal('6a1010', 'a01c1c', 'd03030', 'f06050'),
  white: pal('b8b4a8', 'd8d4c8', 'f0ece2', 'ffffff'),
  paper: pal('b8a478', 'd8c494', 'eadcb0', 'f8f0d0'),
  palmleaf: pal('9a7a3a', 'c0a058', 'd8bc72', 'ecd896'),
  ink: [hex('2a1a10')],
  string: [hex('d8d0c0')],
  fish: pal('3a4434', '56624a', '74805e', '98a47c'),
  fishBelly: pal('a8a488', 'c8c4a4', 'e4e0c4'),
  grilled: pal('5a2a10', '8a4a1c', 'b06a2a', 'd09048'),
  water: pal('1c4c8c', '2a66b0', '4a8ad0', '8ac0f0'),
  lava: pal('b02a08', 'e05a10', 'f89028', 'ffd060'),
  mango: pal('a85a08', 'e08a10', 'f8b828', 'ffe070'),
  mangoGold: pal('8a5a08', 'd8a020', 'f8d850', 'fffcc0'),
  leaf: pal('235628', '316f2c', '438a30', '5ea53a'),
  rice: pal('c8c0a8', 'e0dac8', 'f4f0e4'),
  bambooTube: pal('4a5a18', '6a7e22', '8ea434', 'b6c85a'),
  pearl: pal('1a5a4a', '2a8a72', '58c8a8', 'c8fff0'),
  glass: pal('6a9aa8', '9ac8d2', 'd8f4f8'),
  potion: pal('6a1a5a', '9a2a84', 'c84ab0', 'f0a0e0'),
  cork: pal('6a4a28', '9a7040', 'c09060'),
  bucket: pal('5c6068', '8a9098', 'b8bec6', 'e0e4e8'),
  milk: pal('d8d4c8', 'f0ece2', 'ffffff'),
  feather: pal('9a9a92', 'c8c8c0', 'ececE4'.toLowerCase(), 'ffffff'),
  quill: [hex('6a5a48')],
  powder: pal('2a2a2a', '444444', '5e5e5e', '7a7a7a'),
  sugar: pal('c8c0b0', 'e4ded2', 'f6f2ea', 'ffffff'),
  egg: pal('b89a70', 'd8bc90', 'eed8b0', 'fff0d0'),
  compassCase: pal('6a5010', 'a88020', 'd8b040', 'f8e080'),
  face: pal('c8c0a8', 'e8e0cc', 'f8f4e8'),
  needleN: [hex('d02020')], needleS: [hex('2a2a34')],
  sun: pal('c87808', 'f0a818', 'ffd848', 'fff4a0'),
  night: pal('141c48', '1e2a64', '2c3c84', '4a5ca8'),
  moon: [hex('e8ecf8')],
  map: pal('a89060', 'c8b080', 'e0cca0', 'f0e4c0'),
  mapLand: pal('4a7a3a', '5e9a46', '7cb85a'),
  mapSea: pal('3a6a9a', '4a80b0', '6a9ac8'),
  rope: pal('7a5a2a', 'a8844a', 'ccaa6a', 'e8cc8a'),
  saddle: pal('3a1a10', '5a2a18', '7a3a22', '9a5032'),
  firework: pal('6a1010', 'a01c1c', 'd03030', 'f06050'),
  fwPaper: pal('a88a40', 'd8b860', 'f0d888'),
  spark: [hex('fff0a0')],
  crossbowWood: pal('4a2618', '6e3a22', '93532f', 'b06a3c'),
  bow: pal('3a2818', '5a3e24', '7e5a36'),
  anvil: pal('2a2c32', '3e424a', '585e68', '7a828e'),
  jar: pal('3a2010', '5a3018', '7e4422', 'a05c30'),
  jarGlaze: pal('4a3018', '6a4a24', '8a6430'),
  herb: pal('2a5a1c', '3e7a28', '5a9a38'),
  clay: pal('6a3a20', '8a4a28', 'a85e32', 'c87848'),
  flame: pal('d84010', 'f87818', 'ffb030', 'fff0a0'),
  ash: pal('3a3634', '4e4a46', '68625c'),
  cart: pal('4a2a18', '6e4024', '93582f', 'b8783e'),
  wheel: pal('3a2010', '5a3418', '7e4c24'),
  shear: pal('5c6068', '8a9098', 'c0c6cc', 'eef2f6'),
  shearHandle: pal('6a1010', 'a01c1c', 'd03030'),
};

/* ============================ ITEMS ============================ */
const ITEMS = {};

// Fence (fixed): rails run straight through past both posts and the posts have lotus-bud caps,
// so it reads as a fence run, not a ladder (a ladder has rails on the outside and rungs between).
ITEMS.FENCE_ITEM = icon((g) => {
  g.rect(1, 5, 14, 6, 'rail'); g.rect(1, 10, 14, 11, 'rail');
  g.rect(3, 3, 5, 14, 'post'); g.rect(10, 3, 12, 14, 'post');
  g.dot(4, 1, 'gold'); g.rect(3, 2, 5, 2, 'gold'); g.dot(11, 1, 'gold'); g.rect(10, 2, 12, 2, 'gold');
}, P);

ITEMS.FENCE_GATE = icon((g) => {
  g.rect(1, 3, 3, 14, 'post'); g.rect(12, 3, 14, 14, 'post');
  g.dot(2, 1, 'gold'); g.rect(1, 2, 3, 2, 'gold'); g.dot(13, 1, 'gold'); g.rect(12, 2, 14, 2, 'gold');
  g.rect(4, 4, 11, 5, 'rail'); g.rect(4, 10, 11, 11, 'rail');
  g.rect(7, 6, 8, 9, 'rail');
}, P);

ITEMS.LATERITE_WALL = icon((g) => {
  g.rect(1, 7, 14, 14, 'laterite'); g.rect(1, 6, 14, 6, 'coping');
  g.rect(5, 2, 10, 14, 'laterite'); g.rect(4, 1, 11, 2, 'coping');
  [[2, 9], [12, 12], [7, 5], [8, 10], [3, 12], [13, 9]].forEach(([x, y]) => g.dot(x, y, 'pit'));
}, P);

function stairsIcon(m) {
  return icon((g) => {
    g.rect(1, 8, 14, 14, m); g.rect(8, 2, 14, 7, m);
    g.rect(1, 8, 7, 8, 'top'); g.rect(8, 2, 14, 2, 'top');
    g.rect(1, 11, 14, 11, 'seam'); g.rect(8, 5, 14, 5, 'seam'); g.rect(4, 12, 4, 14, 'seam'); g.rect(11, 9, 11, 10, 'seam'); g.rect(11, 6, 11, 7, 'seam');
  }, { ...P, top: [shade(P[m][3], 1.08)], seam: [shade(P[m][0], 0.85)] });
}
ITEMS.SANDSTONE_STAIRS = stairsIcon('sandstone');
ITEMS.STONE_STAIRS = stairsIcon('stone');

ITEMS.FLINT = icon((g) => {
  g.map(0, 0, [
    '................', '................', '.......kk.......', '......kkkk......', '.....kkkkkk.....', '....kkkffkkk....',
    '....kkkffkkkk...', '...kkkkkkkkkk...', '...kkkkkkkkkk...', '...kkkkkkkkkkk..', '..kkkkkkkkkkkk..', '..kkkkkkkkkkk...',
    '...kkkkkkkkk....', '....kkkkkkk.....', '......kkk.......', '................'], { k: 'flint', f: 'steel' });
}, P);

ITEMS.FLINT_AND_STEEL = icon((g) => {
  g.ring(6, 6, 2.6, 4.6, 'steel'); g.rect(6, 9, 11, 10, 'clear');
  for (let x = 6; x <= 10; x++) { g.clear(x, 9); g.clear(x, 10); g.clear(x, 8); }
  g.ellipse(11.5, 11.5, 3.2, 2.8, 'flint');
  g.dot(9, 7, 'spark'); g.dot(10, 6, 'spark');
}, { ...P, clear: [hex('000000')] });

ITEMS.SHEARS = icon((g) => {
  g.line(4, 4, 11, 11, 'shear', 2); g.line(11, 4, 4, 11, 'shear', 2);
  g.ring(3.5, 12.5, 1.2, 2.6, 'shearHandle'); g.ring(12.5, 12.5, 1.2, 2.6, 'shearHandle');
  g.dot(7, 7, 'gold'); g.dot(8, 7, 'gold');
}, P);

ITEMS.FISHING_ROD = icon((g) => {
  g.line(2, 14, 12, 2, 'bamboo', 2);
  g.dot(5, 10, 'node'); g.dot(8, 6, 'node');
  g.rect(13, 2, 13, 9, 'string'); g.rect(12, 10, 14, 11, 'red');
}, P);

ITEMS.RAW_FISH = icon((g) => {        // trey ros (snakehead)
  g.ellipse(7.5, 8, 6, 3.2, 'fish'); g.rect(4, 9, 11, 10, 'fishBelly');
  g.map(12, 5, ['.ff', 'fff', 'ff.', 'ff.', 'fff', '.ff'], { f: 'fish' });
  g.dot(3, 7, 'ink'); g.rect(6, 6, 6, 9, 'gill');
}, { ...P, gill: [hex('3a4434')] });

ITEMS.GRILLED_FISH = icon((g) => {    // trey ang on a bamboo skewer
  g.line(1, 14, 14, 1, 'bambooTube', 1);
  g.ellipse(7.5, 8, 5.6, 3, 'grilled');
  g.map(11, 4, ['.gg', 'ggg', 'gg.'], { g: 'grilled' });
  g.line(5, 7, 6, 10, 'char'); g.line(8, 6, 9, 9, 'char'); g.line(11, 6, 11, 8, 'char');
  g.dot(3, 8, 'ink');
}, { ...P, char: [hex('3a1808')] });

ITEMS.COMPASS = icon((g) => {         // trivisay: brass case, lotus-petal ring, red north needle
  g.ellipse(8, 8, 6.6, 6.6, 'compassCase'); g.ellipse(8, 8, 4.6, 4.6, 'face');
  g.rect(7, 4, 8, 7, 'needleN'); g.rect(7, 8, 8, 11, 'needleS'); g.dot(8, 2, 'gold'); g.dot(7, 2, 'gold');
}, P);

ITEMS.CLOCK = icon((g) => {           // nealika: gold case; the dial shows day (sun) and night (moon)
  g.ellipse(8, 8, 6.6, 6.6, 'compassCase');
  g.ellipse(8, 8, 4.6, 4.6, 'night');
  for (let y = 3; y <= 8; y++) for (let x = 3; x <= 13; x++) if (g.get(x, y) === 'night') g.dot(x, y, 'sky');
  g.ellipse(8, 6.2, 1.8, 1.8, 'sun'); g.dot(6, 10, 'moon'); g.dot(6, 11, 'moon'); g.dot(7, 11, 'moon');
  g.rect(3, 8, 13, 8, 'horizon');
  g.rect(7, 13, 8, 13, 'gold'); g.rect(7, 2, 8, 2, 'gold');
}, { ...P, sky: pal('3a8ad8', '5aa8ec', '8ac8f8'), horizon: [hex('5e9a46')] });

ITEMS.MAP = icon((g) => {
  g.rect(2, 2, 13, 13, 'map');
  g.ellipse(6, 7, 3, 2.6, 'mapLand'); g.ellipse(10.5, 10, 2.4, 2, 'mapLand'); g.ellipse(11, 5, 1.6, 1.4, 'mapSea');
  g.dot(10, 10, 'red'); g.dot(11, 10, 'red'); g.dot(10, 11, 'red'); g.dot(11, 11, 'red');
}, P);

ITEMS.PAPER = icon((g) => { g.rect(3, 2, 12, 13, 'paper'); g.rect(5, 5, 10, 5, 'ink'); g.rect(5, 8, 10, 8, 'ink'); g.rect(5, 11, 8, 11, 'ink'); }, { ...P, ink: [hex('c0ac80')] });

ITEMS.PALM_LEAF_BOOK = icon((g) => {  // sastra slek rith: stacked palm-leaf strips bound by a cord, lacquered covers
  g.rect(1, 4, 14, 5, 'wood'); g.rect(1, 6, 14, 10, 'palmleaf'); g.rect(1, 11, 14, 12, 'wood');
  g.rect(1, 7, 14, 7, 'leafEdge'); g.rect(1, 9, 14, 9, 'leafEdge');
  g.rect(4, 3, 4, 13, 'red'); g.rect(11, 3, 11, 13, 'red');
  g.rect(5, 4, 10, 4, 'gold'); g.rect(5, 12, 10, 12, 'gold');
}, { ...P, leafEdge: [hex('a88a48')] });

ITEMS.SUGAR = icon((g) => {           // skor: palm sugar crumbs (the cake form already exists as PALM_SUGAR)
  g.ellipse(8, 10, 6, 3.6, 'sugar'); g.ellipse(8, 7.5, 3.6, 2.6, 'sugar');
  g.dot(5, 9, 'grain'); g.dot(10, 8, 'grain'); g.dot(8, 11, 'grain'); g.dot(11, 11, 'grain');
}, { ...P, grain: [hex('b8b0a0')] });

ITEMS.EGG = icon((g) => { g.ellipse(8, 8.6, 4.6, 5.8, 'egg'); g.dot(6, 6, 'spot'); g.dot(9, 10, 'spot'); }, { ...P, spot: [hex('c8a878')] });

ITEMS.FEATHER = icon((g) => {
  g.line(3, 13, 12, 3, 'quill'); g.ellipse(9, 6.5, 3.6, 2.2, 'feather');
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if (g.get(i, j) === 'feather' && Math.abs((i - 9) + (j - 6.5)) > 4.2) g.clear(i, j);
  g.line(4, 12, 11, 4, 'quill');
}, P);

ITEMS.GUNPOWDER = icon((g) => {       // msav rumsev: black powder heap
  g.ellipse(8, 10.5, 6.2, 3.6, 'powder'); g.ellipse(8, 8, 3.4, 2.6, 'powder');
  g.dot(5, 10, 'grit'); g.dot(10, 9, 'grit'); g.dot(8, 12, 'grit'); g.dot(12, 11, 'grit');
}, { ...P, grit: [hex('8a8a8a')] });

function bucket(content) {
  return icon((g) => {
    g.map(0, 0, [
      '................', '...hhhhhhhhhh...', '..h..........h..', '..bbbbbbbbbbbb..', '..bccccccccccb..', '..bccccccccccb..',
      '...bccccccccb...', '...bbbbbbbbbb...', '...bbbbbbbbbb...', '...bbbbbbbbbb...', '....bbbbbbbb....', '....bbbbbbbb....',
      '....bbbbbbbb....', '.....bbbbbb.....', '................', '................'], { h: 'handle', b: 'bucket', c: content });
  }, { ...P, handle: [hex('5c6068')] });
}
ITEMS.MILK_BUCKET = bucket('milk');
ITEMS.LAVA_BUCKET = bucket('lava');

ITEMS.MANGO = icon((g) => {           // svay: Cambodian mango with a leaf
  g.ellipse(8, 9.4, 5, 5.4, 'mango'); g.ellipse(10, 10, 3, 4, 'mango');
  g.rect(8, 2, 8, 4, 'stem'); g.map(9, 1, ['.ll', 'lll', 'll.'], { l: 'leaf' });
}, { ...P, stem: [hex('4a3018')] });

ITEMS.GOLDEN_MANGO = icon((g) => {    // svay meas: the golden-apple equivalent
  g.ellipse(8, 9.4, 5, 5.4, 'mangoGold'); g.ellipse(10, 10, 3, 4, 'mangoGold');
  g.rect(8, 2, 8, 4, 'stem'); g.map(9, 1, ['.ll', 'lll', 'll.'], { l: 'gold' });
  g.dot(5, 7, 'spark'); g.dot(6, 6, 'spark');
}, { ...P, stem: [hex('6a4a08')] });

ITEMS.KRALAN = icon((g) => {          // kralan: sticky rice roasted in a bamboo tube
  g.line(3, 13, 11, 3, 'bambooTube', 3);
  g.ellipse(12, 3.2, 2.4, 2.4, 'rice'); g.dot(12, 3, 'bean'); g.dot(11, 4, 'bean');
  g.dot(6, 9, 'char'); g.dot(7, 9, 'char'); g.dot(9, 6, 'char');
}, { ...P, bean: [hex('5a2a3a')], char: [hex('3a3010')] });

ITEMS.NAGA_PEARL = icon((g) => {      // keo neak: the ender-pearl equivalent, used to find the naga gate
  g.ellipse(8, 8, 5, 5, 'pearl'); g.ellipse(8, 8, 2.2, 2.2, 'pupil'); g.rect(7, 6, 8, 10, 'slit');
}, { ...P, pupil: pal('0c3a30', '1a5a4a'), slit: [hex('081a14')] });

ITEMS.HERBAL_POTION = icon((g) => {   // thnam boran: herbal medicine in a glass bottle, cork stopper
  g.rect(6, 1, 9, 2, 'cork'); g.rect(6, 3, 9, 5, 'glass');
  g.ellipse(8, 10, 5, 4.6, 'glass'); g.ellipse(8, 10.8, 4, 3.4, 'potion'); g.rect(5, 7, 10, 7, 'glass');
}, P);

ITEMS.CROSSBOW = icon((g) => {        // sna: the crossbow carved on the Bayon and Angkor Wat walls
  g.line(2, 13, 11, 4, 'crossbowWood', 2);
  g.line(5, 2, 13, 10, 'bow', 1); g.line(6, 2, 14, 10, 'bow', 1);
  g.line(5, 3, 8, 7, 'string'); g.line(12, 10, 9, 7, 'string');
  g.dot(12, 3, 'iron'); g.dot(12, 2, 'iron'); g.dot(13, 2, 'iron');
}, P);

ITEMS.FIREWORK = icon((g) => {        // kamchruoch: Khmer New Year rocket
  g.rect(6, 4, 9, 12, 'firework'); g.rect(6, 7, 9, 7, 'gold'); g.rect(6, 10, 9, 10, 'gold');
  g.map(6, 1, ['.ff.', 'ffff', 'ffff'], { f: 'fwPaper' });
  g.rect(7, 13, 8, 14, 'string');
}, P);

ITEMS.ROPE = icon((g) => {            // khsae puor: lead / rope coil
  g.ring(8, 8, 2.6, 5.6, 'rope'); g.ring(8, 8, 3.8, 4.4, 'ropeDark');
  g.rect(11, 11, 14, 13, 'rope');
}, { ...P, ropeDark: [hex('7a5a2a')] });

ITEMS.SADDLE = icon((g) => {
  g.ellipse(8, 7, 6.4, 3.6, 'saddle'); g.rect(2, 7, 13, 8, 'saddle'); g.rect(6, 4, 9, 5, 'gold');
  g.rect(3, 9, 3, 13, 'strap'); g.rect(12, 9, 12, 13, 'strap'); g.rect(2, 13, 4, 14, 'iron'); g.rect(11, 13, 13, 14, 'iron');
}, { ...P, strap: [hex('3a1a10')] });

ITEMS.ANVIL = icon((g) => {
  g.rect(1, 3, 14, 6, 'anvil'); g.rect(5, 7, 10, 10, 'anvil'); g.rect(3, 11, 12, 13, 'anvil');
  g.rect(13, 4, 14, 5, 'anvil');
}, P);

ITEMS.WATER_JAR = icon((g) => {       // peang: the big glazed rain-water jar beside every Khmer house
  g.ellipse(8, 9, 6.6, 5.8, 'jar'); g.rect(4, 2, 11, 4, 'jar');
  g.rect(5, 2, 10, 2, 'water'); g.rect(2, 8, 13, 8, 'jarGlaze');
  g.rect(3, 14, 12, 14, 'jar');
}, P);

ITEMS.HERBAL_POT = icon((g) => {      // brewing stand: clay herb pot on a three-stone hearth
  g.ellipse(8, 7, 5.4, 4.2, 'clay'); g.rect(4, 2, 11, 3, 'clay'); g.map(5, 0, ['.hh.hh', 'hhhhhh'], { h: 'herb' });
  g.rect(3, 11, 4, 13, 'stone'); g.rect(11, 11, 12, 13, 'stone'); g.rect(7, 12, 8, 13, 'stone');
  g.map(5, 11, ['..f..', '.fff.', 'fffff'], { f: 'flame' });
}, P);

ITEMS.CAMPFIRE = icon((g) => {        // cheung kran: three stones, crossed logs, fire
  g.line(2, 13, 13, 10, 'wood', 1); g.line(2, 10, 13, 13, 'wood', 1); g.line(2, 12, 13, 12, 'wood');
  g.rect(1, 13, 3, 14, 'stone'); g.rect(12, 13, 14, 14, 'stone'); g.rect(7, 14, 8, 14, 'stone');
  g.map(4, 2, ['...f....', '..ff..f.', '..fff.ff', '.ffffff.', '.ffffff.', 'ffffffff', 'ffffffff', '.ffffff.'], { f: 'flame' });
  g.map(6, 7, ['..y.', '.yy.', 'yyyy'], { y: 'spark' });
}, P);

ITEMS.SIGN = icon((g) => {
  g.rect(1, 2, 14, 9, 'rail'); g.rect(7, 10, 8, 14, 'post');
  g.rect(3, 4, 12, 4, 'ink'); g.rect(3, 7, 9, 7, 'ink');
}, { ...P, ink: [hex('5a2c18')] });

ITEMS.OX_CART = icon((g) => {         // rotes ko: minecart replacement, rides on dirt tracks
  g.rect(1, 4, 14, 8, 'cart'); g.rect(1, 3, 14, 3, 'rail'); g.rect(0, 6, 0, 6, 'cart');
  g.ring(4.5, 11, 1, 3, 'wheel'); g.ring(11.5, 11, 1, 3, 'wheel'); g.dot(4, 10, 'gold'); g.dot(11, 10, 'gold');
}, P);

ITEMS.BAMBOO = icon((g) => {
  g.rect(6, 0, 9, 15, 'bamboo'); g.rect(6, 4, 9, 4, 'node'); g.rect(6, 10, 9, 10, 'node');
  g.map(10, 2, ['ll..', '.lll'], { l: 'leaf' });
}, P);

/* ============================ BLOCKS (16x16 tiles) ============================ */
const BLOCKS = {};
const noOutline = (fn, pals) => paint(16, 16, fn, pals, { outline: false });

// Bamboo ladder (transparent, hung on walls). Rails at the outer edges and many rungs between.
BLOCKS.LADDER = noOutline((g) => {
  g.rect(1, 0, 3, 15, 'bamboo'); g.rect(12, 0, 14, 15, 'bamboo');
  [4, 9, 14].forEach(y => { g.rect(1, y, 3, y, 'node'); g.rect(12, y, 14, y, 'node'); });
  [1, 6, 11].forEach(y => { g.rect(4, y, 11, y + 1, 'bamboo'); g.rect(3, y, 4, y + 1, 'rattan'); g.rect(11, y, 12, y + 1, 'rattan'); });
}, P);

BLOCKS.BRICKS = tile((x, y) => {          // Preah Ko style fired brick, thin lime mortar
  const BR = pal('6a2418', '8a3220', 'a8442a', 'c05a34', 'd8784a');
  const c = course(x, y, 4, 8, 4);
  if (c.edge === 'mortar') return hex('c8b8a0');
  const v = 0.45 + (c.edge === 'lit' ? 0.3 : c.edge === 'shadow' ? -0.3 : 0) + (hash(c.col, c.row, 51) - 0.5) * 0.3;
  return ramp(BR, v);
}, false);

BLOCKS.CLAY = tile((x, y) => {            // dei eth: river clay
  const CL = pal('7a7e8a', '8e94a0', 'a4aab4', 'b8bec6');
  return ramp(CL, 0.15 + vnoise(x, y, 4, 61) * 0.8);
});

BLOCKS.MOSSY_COBBLESTONE = (() => {
  const base = V2.T.COBBLESTONE;
  const M = pal('2f5a26', '3e7230', '568c3c');
  const out = base.slice();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const m = vnoise(x, y, 4, 71);
    if (m > 0.58) { const c = ramp(M, (m - 0.58) * 2.4 + (y < 8 ? 0.2 : 0)); const i = (y * 16 + x) * 4; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; }
  }
  return out;
})();

BLOCKS.RICE_STRAW_SIDE = tile((x, y) => {  // chambaung: straw stack, hay-bale equivalent
  const S = pal('8a6a1c', 'b08a2a', 'cfa83c', 'e6c65a');
  if (y === 4 || y === 11) return hex('6a4a18');
  return ramp(S, 0.2 + ((x * 7 + Math.floor(y / 2) * 3) % 5) / 6 + (hash(x, y >> 2, 81) - 0.5) * 0.2);
}, false);
BLOCKS.RICE_STRAW_TOP = tile((x, y) => {
  const S = pal('8a6a1c', 'b08a2a', 'cfa83c', 'e6c65a');
  const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
  return d > 6.5 ? S[0] : ramp(S, 0.3 + (Math.floor(d) % 2) * 0.4 + (hash(x >> 1, y >> 1, 83) - 0.5) * 0.15);
});

BLOCKS.PUMPKIN_SIDE = tile((x, y) => {    // l'peou
  const PU = pal('9a5008', 'c86c10', 'e88a20', 'f8a83c');
  const rib = x % 4;
  return ramp(PU, rib === 0 ? 0.05 : rib === 1 ? 0.85 : 0.5 + (y < 3 ? 0.2 : y > 12 ? -0.2 : 0));
}, false);
BLOCKS.WATERMELON_SIDE = tile((x, y) => { // ov'luek
  const G = pal('1e5a1c', '2e7a28', '4a9a3a', '8ac868');
  const stripe = Math.floor((x + Math.round(Math.sin(y * 0.8) * 1.2) + 16) / 2) % 3 === 0;
  return stripe ? ramp(G, 0.1) : ramp(G, 0.55 + (y < 8 ? 0.2 : 0));
}, false);

BLOCKS.PALM_LEAF_SHELF = tile((x, y) => { // bookshelf: palm-leaf manuscript bundles on lacquered shelves
  const frame = pal('3a1a10', '5a2a18', '7a3a22');
  if (y === 0 || y === 15 || y === 7 || y === 8) return y === 7 ? frame[0] : frame[y === 0 ? 2 : 1];
  if (x === 0 || x === 15) return frame[1];
  const shelfY = y < 7 ? 1 : 9;
  const bundle = Math.floor((x - 1) / 3), within = (x - 1) % 3;
  if (within === 2 && bundle < 4) return hex('2a140c');
  const cord = (y - shelfY) === 2 || (y - shelfY) === 3;
  if (cord && within === 0) return hex(['b02020', '202020', 'c8901a', 'b02020', '202020'][(bundle + (y > 7 ? 1 : 0)) % 5]);
  const LEAF = pal('9a7a3a', 'c0a058', 'd8bc72', 'ecd896');
  return ramp(LEAF, (within === 0 ? 0.8 : 0.45) + (y === shelfY ? 0.2 : 0) - ((bundle + y) % 7 === 0 ? 0.2 : 0));
}, false);

BLOCKS.YANTRA_TABLE_TOP = tile((x, y) => {  // enchanting-table equivalent: red cloth with a gold yantra diagram
  const R = hex('8a1a1a'), RD = hex('6a1010'), G = hex('f2c64a'), GD = hex('b8860b');
  if (x === 0 || y === 0 || x === 15 || y === 15) return hex('3a1a10');
  if (x === 1 || y === 1 || x === 14 || y === 14) return GD;
  const cx = Math.abs(x - 7.5), cy = Math.abs(y - 7.5);
  if (Math.abs(cx + cy - 5) < 0.6) return G;                // diamond
  if ((cx < 0.6 || cy < 0.6) && cx + cy < 4.6) return G;   // cross
  if (Math.abs(Math.max(cx, cy) - 5.5) < 0.6) return GD;   // square border
  if (cx + cy < 1.2) return hex('fff0a0');
  return (x + y) % 2 ? R : RD;
}, false);
BLOCKS.YANTRA_TABLE_SIDE = tile((x, y) => {
  if (y < 3) return y === 2 ? hex('b8860b') : hex('8a1a1a');
  if (y === 3) return hex('f2c64a');
  const W = pal('3a1a10', '5a2a18', '7a3a22', '9a4a2a');
  if (x < 2 || x > 13) return ramp(W, x < 2 ? 0.8 : 0.1);
  if (y > 13) return W[0];
  return ramp(W, 0.35 + (hash(x >> 2, y, 91) - 0.5) * 0.3);
}, false);

function storageBlock(P5, seed) {  // block of metal/gem: bevelled border + small Khmer diamond motif in the centre
  return tile((x, y) => {
    const edge = Math.min(x, y, 15 - x, 15 - y);
    if (edge === 0) return x === 0 || y === 0 ? P5[3] : P5[0];
    if (edge === 1) return x === 1 || y === 1 ? P5[4] : P5[1];
    const cx = Math.abs(x - 7.5), cy = Math.abs(y - 7.5);
    if (Math.abs(cx + cy - 4) < 0.6) return P5[4];
    if (Math.abs(cx + cy - 5) < 0.6) return P5[1];
    return ramp(P5, 0.4 + (cx + cy < 3.5 ? 0.25 : 0) + (x < y ? -0.08 : 0.08));
  }, false);
}
BLOCKS.GOLD_BLOCK = storageBlock(pal('8a5a08', 'c8901a', 'e8b030', 'f2c64a', 'fff0a0'), 1);
BLOCKS.IRON_BLOCK = storageBlock(pal('6c7078', '9aa0aa', 'b8bec6', 'cfd4dc', 'f2f5f8'), 2);
BLOCKS.BRONZE_BLOCK = storageBlock(pal('5a3010', '8a4e1c', 'b06a2c', 'c88444', 'e8a868'), 3);
BLOCKS.DIAMOND_BLOCK = storageBlock(pal('137a72', '28b4aa', '4de2d6', '8af0e8', 'd6fffb'), 4);
BLOCKS.SAPPHIRE_BLOCK = storageBlock(pal('0c2a7a', '1e4cc0', '2a62dc', '5a8af0', 'a8ccff'), 5);

BLOCKS.FIRECRACKER_SIDE = tile((x, y) => {  // TNT equivalent: a red powder keg with gold bands
  const R = pal('6a1010', 'a01c1c', 'c82828', 'e84a3a');
  if (y === 2 || y === 13) return hex('f2c64a');
  if (y === 3 || y === 14) return hex('b8860b');
  if (y > 5 && y < 11 && x > 3 && x < 12) {            // paper label with a lotus mark
    const cx = Math.abs(x - 7.5), cy = Math.abs(y - 8);
    if (cx + cy < 1.6) return hex('fff0a0');
    if (cx + cy < 2.6) return hex('d8a020');
    return hex(y === 6 ? 'd8c494' : 'c8b080');
  }
  return ramp(R, 0.25 + ((x + 1) % 4 === 0 ? -0.2 : 0.35) + (y < 2 ? 0.25 : 0));
}, false);
BLOCKS.FIRECRACKER_TOP = tile((x, y) => {
  const d = Math.hypot(x - 7.5, y - 7.5);
  if (d < 1.2) return hex('2a2a2a');
  if (d < 2.2 && (x === 8 && y < 7)) return hex('d8d0c0');
  return d > 6.6 ? hex('b8860b') : ramp(pal('6a1010', 'a01c1c', 'c82828'), 0.3 + (Math.floor(d) % 2) * 0.4);
});

BLOCKS.TRAPDOOR = tile((x, y) => {          // lattice hatch, like a Khmer house floor hatch
  const W = pal('5a2c18', '7d4127', '9a5532', 'b56c40');
  const frame = x < 2 || x > 13 || y < 2 || y > 13;
  if (frame) return ramp(W, x < 2 || y < 2 ? 0.75 : 0.2);
  const bar = (x - 2) % 4 < 2 || (y - 2) % 4 < 2;
  return bar ? ramp(W, 0.5) : [0, 0, 0, 0];
}, false);

BLOCKS.LAVA = tile((x, y) => {               // brighter, blob-shaped lava with a dark crust
  const n = fbm(x, y, 131);
  if (n < 0.32) return hex('6a1a08');
  return ramp(P.lava, (n - 0.32) * 1.6);
});
BLOCKS.WATER = tile((x, y) => {
  const wave = (x + Math.round(Math.sin((y) * 0.9) * 2) + y * 2) % 8;
  if (wave === 0 || wave === 1) return hex('7ab4e8');
  return ramp(P.water, 0.35 + vnoise(x, y, 8, 141) * 0.4);
});

// Patala (the underworld realm of the naga; the "nether" of this game)
BLOCKS.PATALA_STONE = tile((x, y) => {
  const PS = pal('2a0e14', '4a1420', '6a1c28', '8a2a30', 'a84038');
  const c = fbm(x, y, 151);
  return ramp(PS, c * 1.1 - (vnoise(x, y, 4, 153) > 0.7 ? 0.3 : 0));
});
BLOCKS.ASH_SAND = tile((x, y) => {           // soul-sand equivalent: grey-brown funeral ash
  const AS = pal('2a2420', '3e3630', '544a40', '6a5e52');
  const r = (y + Math.round(Math.sin(x * 0.6) * 1.5)) % 5;
  return ramp(AS, r === 0 ? 0.05 : 0.4 + vnoise(x, y, 4, 161) * 0.5);
});
BLOCKS.NAGA_GEM_LAMP = tile((x, y) => {      // glowstone equivalent: clustered glowing green-gold naga gems
  const GL = pal('6a5a10', 'a89020', 'd8c840', 'f8f088', 'ffffd0');
  const v = fbm(x, y, 171);
  return ramp(GL, v > 0.55 ? 0.6 + (v - 0.55) * 1.5 : 0.1 + v * 0.6);
});
BLOCKS.NAGA_GATE = tile((x, y) => {          // portal surface: swirling green-violet
  const PG = pal('1a0a3a', '3a1a6a', '6a2aa0', '4ac0a0', 'b8fff0');
  const a = Math.atan2(y - 7.5, x - 7.5), d = Math.hypot(x - 7.5, y - 7.5);
  const s = (Math.sin(a * 2 + d * 0.9) + 1) / 2;
  return ramp(PG, s * 0.75 + (d < 2 ? 0.25 : 0));
});

/* ============================ FACES (8x8) ============================ */
const FACE_ART = {
  buffalo: ['HhHHHHhH', 'HHGGGGHH', 'GWEGGEWG', 'GGGGGGGG', 'GGGGGGGG', 'GMMMMMMG', 'GMmMMmMG', 'gGMMMMGg'],   // krabei: grey, swept horns
  elephant: ['EEEEEEEE', 'EEEEEEEE', 'EWKEEKWE', 'EEEEEEEE', 'TEEeeEET', 'TEEeeEET', '.EEeeEE.', '..EeeE..'], // domrei: tusks + trunk
  dog: ['bB....Bb', 'BBBBBBBB', 'BWKBBKWB', 'BBBBBBBB', 'BBMNNMBB', 'BBMMMMBB', 'BBMTTMBB', 'bBBBBBBb'],      // chhkae: tan village dog
  cat: ['O.O..O.O', 'OOOOOOOO', 'OGKOOKGO', 'OOOOOOOO', 'OOWNNWOO', 'OWWWWWWO', 'OOWWWWOO', 'oOOOOOOo'],      // chhma
  monkey: ['bBBBBBBb', 'BBBBBBBB', 'BFFFFFFB', 'FWKFFKWF', 'FFFFFFFF', 'BFFNNFFB', 'BFMMMMFB', 'bBFFFFBb'],   // sva: macaque
  crocodile: ['GgGgGgGg', 'GGGGGGGG', 'GYKGGKYG', 'GGGGGGGG', 'GGGGGGGG', 'TGTGTGTG', 'MMMMMMMM', 'gTgTgTgT'], // krapeu
  cobra: ['.HHHHHH.', 'HHHHHHHH', 'HYKHHKYH', 'HHHHHHHH', 'HHHBBHHH', 'HHBBBBHH', '.HHRRHH.', '..HRRH..'],    // pous vek: hood
  bat: ['B......B', 'BB.BB.BB', 'BBBBBBBB', 'BRKBBKRB', 'BBBBBBBB', 'BBTBBTBB', '.BBBBBB.', '..BBBB..'],     // prachiev
  ap: ['HHHHHHHH', 'HHHHHHHH', 'HPPPPPPH', 'PGKPPKGP', 'PPPPPPPP', 'PPPMMPPP', 'PPRRRRPP', '.R.RR.R.'],      // ap: floating head with trailing entrails
  shadow: ['HHHHHHHH', 'HHHHHHHH', 'HHSSSSHH', 'HSVSSVSH', 'HSSSSSSH', 'HSSSSSSH', 'HSSMMSSH', 'HHSSSSHH'],     // khmoch sramaol: smoky face, long hair, hollow pale eyes
  reahu: ['YYGYYGYY', 'BYYYYYYB', 'BDDBBDDB', 'BWRBBRWB', 'BBBbbBBB', 'BMMMMMMB', 'BTMTTMTB', 'bBTBBTBb'],    // reahu: eclipse demon
};
const FACE_PAL = {
  buffalo: { H: 'd8d0bc', h: 'a8a090', G: '5a5a5e', g: '444448', W: 'f0f0f0', E: '111111', M: '7a7a7e', m: '2a2a2a' },
  elephant: { E: '8a8a90', e: '6e6e74', W: 'f0f0f0', K: '1a1a1a', T: 'f4eedc' },
  dog: { B: 'c89050', b: 'a87038', W: 'f0f0f0', K: '1a1a1a', M: 'e8c898', N: '2a1a14', T: 'c84a5a' },
  cat: { O: '7a7a7a', o: '5e5e5e', G: 'c8d840', K: '111111', W: 'e8e8e8', N: 'e08a9a' },
  monkey: { B: '7a5a3a', b: '5e4428', F: 'c8a084', W: 'f0f0f0', K: '1a1a1a', N: '6a4a3a', M: 'a06a5a' },
  crocodile: { G: '4a6a34', g: '3a5428', Y: 'e8d040', K: '111111', T: 'f0ece0', M: '2a1810' },
  cobra: { H: '3a3a30', B: 'd8c890', Y: 'e8b030', K: '111111', R: 'c02020' },
  bat: { B: '3a2c30', R: 'd02020', K: '111111', T: 'f0f0f0' },
  ap: { H: '0c0a0a', P: 'd8d4c8', G: 'ffffff', K: 'e01818', M: '3a0a0a', R: 'b02030' },
  shadow: { H: '1a1a20', S: '4a4a58', V: 'e8f4ff', M: '22222a' },
  reahu: { Y: 'f2c64a', G: '28b4aa', B: '3a2a5a', b: '2a1a44', D: '140c24', W: 'fff2b0', R: 'e02020', M: '5a0a1a', T: 'f6f2e0' },
};
const FACES = {};
for (const [name, rows] of Object.entries(FACE_ART)) {
  const px = [];
  rows.forEach((row, y) => {
    if (row.length !== 8) throw new Error(`face ${name} row ${y}`);
    for (const ch of row) { if (ch === '.') { px.push(0, 0, 0, 0); continue; } const c = FACE_PAL[name][ch]; if (!c) throw new Error(`face ${name}: ${ch}`); px.push(...hex(c)); }
  });
  FACES[name] = { w: 8, h: 8, px };
}

/* ============================ CONCEPTS ============================ */
const CONCEPTS = {};
// Reahu (Rahu): the eclipse demon of Khmer New Year stories, a giant head and hands with no body,
// holding the moon he tries to swallow. Boss of Patala (wither equivalent).
CONCEPTS.REAHU = paint(40, 36, (g) => {
  g.rect(13, 0, 26, 2, 'gold'); g.rect(11, 3, 28, 5, 'gold'); g.rect(17, 0, 22, 0, 'gem');   // tiered crown
  g.ellipse(20, 15, 10, 10, 'skin');
  g.rect(8, 12, 10, 18, 'gold'); g.rect(29, 12, 31, 18, 'gold');           // ear ornaments
  g.rect(13, 10, 17, 12, 'eyeW'); g.rect(22, 10, 26, 12, 'eyeW'); g.rect(15, 11, 15, 11, 'pupil'); g.rect(24, 11, 24, 11, 'pupil');
  g.rect(13, 9, 17, 9, 'dark'); g.rect(22, 9, 26, 9, 'dark');               // brows
  g.rect(14, 18, 25, 22, 'mouth'); g.rect(14, 18, 25, 18, 'fang'); g.dot(15, 19, 'fang'); g.dot(24, 19, 'fang');
  g.ellipse(6, 27, 5, 4, 'skin'); g.ellipse(34, 27, 5, 4, 'skin');           // hands
  g.ellipse(20, 30, 5, 5, 'moon');                                           // the moon held below the mouth
}, { skin: pal('1e1a44', '2e2a64', '403a84', '5a54a8'), gold: pal('8a5a08', 'c8901a', 'f2c64a', 'fff0a0'), gem: [hex('28b4aa')],
     eyeW: [hex('fff2b0')], pupil: [hex('d01818')], dark: [hex('0c0818')], mouth: [hex('3a0a1a')], fang: [hex('f6f2e0')], moon: pal('a8acb8', 'c8ccd8', 'e8ecf8', 'ffffff') });

// War elephant: rideable mount (horse-tier), with a howdah saddle as on the Bayon reliefs.
CONCEPTS.ELEPHANT = paint(44, 34, (g) => {
  g.ellipse(24, 16, 14, 9, 'hide');                       // body
  g.rect(13, 20, 17, 32, 'hide'); g.rect(30, 20, 34, 32, 'hide');      // legs
  g.ellipse(9, 13, 6, 6, 'hide'); g.ellipse(13, 12, 4, 6, 'ear');     // head + ear
  g.rect(3, 16, 5, 28, 'hide'); g.rect(2, 28, 4, 30, 'hide');          // trunk
  g.line(6, 18, 2, 22, 'tusk', 1); g.line(7, 18, 3, 23, 'tusk', 1);
  g.dot(7, 11, 'eye');
  g.rect(19, 3, 31, 7, 'howdah'); g.rect(18, 2, 32, 2, 'gold'); g.rect(24, 0, 26, 1, 'gold');   // howdah
  g.rect(17, 8, 33, 9, 'cloth'); g.rect(22, 10, 28, 15, 'cloth');      // saddle cloth
}, { hide: pal('4e4e56', '66666e', '808088', '9a9aa2'), ear: pal('5a5a62', '74747c', '8e8e96'), tusk: [hex('f4eedc')], eye: [hex('111111')],
     howdah: pal('5a1a10', '8a2a1a', 'b04028'), gold: pal('8a5a08', 'c8901a', 'f2c64a'), cloth: pal('8a1a1a', 'b02828', 'd04040') });

module.exports = { paint, P, ITEMS, BLOCKS: Object.fromEntries(Object.entries(BLOCKS).map(([k, v]) => [k, Array.isArray(v) ? asTile(v) : v])), FACES, CONCEPTS };
