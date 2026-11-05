/* Angkor Craft — clearer redraws of the existing items, armour, plants and the remaining blocks
 * that textures-v2.js did not cover. Same rules: no lone pixels, short hue-shifted ramps,
 * light from the top-left, dark outline on item icons (none on plants / blocks).
 * Export: ART = { TILE_NAME: { w:16, h:16, px } } keyed by the game's TILES names.
 */
const V2 = require('./textures-v2.js');
const V3 = require('./textures-v3-missing.js');
const { tile, hash, vnoise, fbm, ramp, shade, hex, pal, course } = V2.helpers;
const { paint, P } = V3;
const icon = (fn, pals) => paint(16, 16, fn, { ...P, ...pals });
const plant = (fn, pals) => paint(16, 16, fn, { ...P, ...pals }, { outline: false });
const wrapTile = (px) => ({ w: 16, h: 16, px });
const ART = {};

/* ----------------------------- extra palettes ----------------------------- */
const Q = {
  appleRed: pal('7a1010', 'b81c1c', 'e03030', 'ff7a6a'),
  stem: [hex('4a3018')],
  coal: pal('141416', '232328', '34343a', '4a4a52'),
  sheen: [hex('8a8a96')],
  dia: pal('138a82', '28b4aa', '4de2d6', '8af0e8'), diaHi: [hex('eafffd')],
  emr: pal('0c6a2c', '1a9a40', '2cc65c', '7aeaa0'), emrHi: [hex('d8ffe4')],
  sap: pal('0c2a7a', '1e4cc0', '2a62dc', '6a9af0'), sapHi: [hex('d8e8ff')],
  eye: pal('0c5a3a', '1a8a5a', '4ac888', 'a8f0c8'), pupil: [hex('0a1a12')],
  pork: pal('a85a6a', 'd07a88', 'ec9aa4', 'f8c0c4'), fat: pal('e8d8d0', 'f8f0ea'),
  beef: pal('5a1010', '8a1c1c', 'b02a2a', 'd04a40'),
  chick: pal('c08a80', 'e0aaa0', 'f0c4b8', 'fadad0'), boneC: pal('c8c0a8', 'e8e2d0', 'faf6ea'),
  cooked: pal('5a2a10', '8a4a1c', 'b06a2a', 'd09048'), cookedFat: pal('c89060', 'e0b080'),
  rotten: pal('4a4a1c', '6a6a2a', '8a8a3a', 'a8a050'), rotSpot: [hex('3a2a10')],
  seed: pal('8a6a2a', 'b8902a', 'e0b840'),
  grain: pal('9a7010', 'c8961c', 'eac040', 'fbe07a'), straw: pal('6a7a1c', '8a9a2a', 'b0b840'),
  bowl: pal('1e4c8c', '2a66b0', '4a8ad0', '8ac0f0'), bowlRim: [hex('f0f0f0')], rice: pal('c8c4b8', 'e8e4d8', 'fafaf2', 'ffffff'),
  bone: pal('a8a090', 'd0c8b4', 'ece6d4', 'fbf8ee'),
  bedWood: pal('4a2618', '6e3a22', '93532f', 'b06a3c'), pillow: pal('c8c4b8', 'e8e4d8', 'fafaf2'),
  bedRed: pal('6a1010', 'a01c1c', 'c82828', 'e84a3a'), bedYellow: pal('8a6408', 'c8961c', 'e8b830', 'f8d860'), bedPink: pal('a04a6a', 'd06a8a', 'e88aa8', 'f8b0c8'),
  ironI: pal('5c6068', '8a9098', 'c0c6cc', 'eef2f6'), goldI: pal('8a5a08', 'c8901a', 'f2c64a', 'fff0a0'), bronzeI: pal('5a3010', '8a4e1c', 'c27a3c', 'e8a868'),
  door: pal('5a2c18', '7d4127', '9a5532', 'b56c40'), doorWin: pal('1c1410', '8a7c66', 'b8a88c'),
  carrot: pal('a84a08', 'd86a10', 'f08a20', 'ffb050'), carrotTop: pal('2a6a20', '3e8a2a', '5aaa38'),
  leather: pal('5a3018', '7a4422', '9a5a30', 'b87444'),
  plank: pal('5a2c18', '7d4127', '9a5532', 'b56c40'), plankTop: [hex('c88454')],
  stone2: pal('565a66', '6f737c', '898b90', 'a3a3a3'), stoneTop: [hex('bebbb4')],
  cobble: pal('4e5054', '6f737c', '8a8d92', 'a8aaae'), cobbleTop: [hex('c0c0bc')],
  hull: pal('3a1a10', '5a2a18', '7a3a22', '9a5032'), hullStripe: pal('8a1a1a', 'c02828'), prow: pal('8a5a08', 'c8901a', 'f2c64a', 'fff0a0'),
  banana: pal('9a7a08', 'd0a818', 'f0d030', 'fff070'), bananaTip: [hex('3a3010')],
  coconut: pal('2e5a1c', '42782a', '5e9a38', '84bc52'), coconutTop: [hex('5a4a28')],
  palmFruit: pal('1a1020', '2c1a34', '442a4e', '644070'), palmCap: pal('2e5a1c', '42782a', '5e9a38'),
  lampClay: pal('6a3010', '9a4a1c', 'c06a30', 'd88a48'), flameP: pal('d84010', 'f87818', 'ffb030', 'fff0a0'),
  potClay: pal('6a3010', '9a4a1c', 'c06a30', 'd88a48'), dyeRed: pal('8a1010', 'c02020', 'e84040'), dyeYellow: pal('b88a08', 'e8b820', 'ffe060'), dyePink: pal('b04a7a', 'e070a0', 'f8a0c8'),
  silk: pal('b8b8c0', 'dcdce4', 'f6f6fc'), krRed: [hex('c02828')], krWhite: pal('d8d4c8', 'f0ece2'),
  blouse: pal('c8c4b8', 'e4e0d4', 'f8f6f0', 'ffffff'), trim: pal('8a5a08', 'c8901a', 'f2c64a'),
  glassB: pal('6a9aa8', '9ac8d2', 'c8eaf0', 'eafcff'), cocoWater: pal('c8d8b0', 'e0ecc8', 'f2f8e4'), palmJuice: pal('a85a10', 'd8841c', 'f0a83a', 'ffd070'),
  sugarCake: pal('6a3a10', '9a5a1c', 'c07a2c', 'e0a050'),
  bananaLeaf: pal('2a5a1c', '3e7a28', '5a9a38', '7cbc4e'), tie: [hex('c8b080')],
  bowWood: pal('4a2a14', '6e4220', '93602e', 'b88040'), bowString: [hex('e8e2d0')],
  arrowHead: pal('3c3c44', '6a6a74', '9a9aa4'), fletch: pal('a8a8a0', 'e0e0d8', 'ffffff'), shaft: pal('6e4220', '93602e', 'b88040'),
  rattan: pal('6a4a1c', '9a7030', 'c09848', 'e0c070'), boss: pal('6e4c10', 'b88a22', 'f2c64a', 'fff0a0'), shieldRed: pal('6a1010', 'a01c1c', 'c82828'),
  ironA: pal('4c5058', '7a8088', 'aab0b8', 'dce0e6'), diaA: pal('137a72', '28b4aa', '4de2d6', 'b8fff8'), leatherA: pal('4a2810', '6e4020', '93582e', 'b87444'),
  aTrim: pal('8a5a08', 'c8901a', 'f2c64a'), aDark: [hex('1a120e')],
  spear: pal('5a3010', '8a4e1c', 'c27a3c', 'e8a868'), tassel: pal('8a1010', 'c02020', 'e84040'),
  crown: pal('8a5a08', 'c8901a', 'f2c64a', 'fff0a0'), gemR: [hex('d02020')], gemB: [hex('2a62dc')], gemG: [hex('2cc65c')],
};

/* ================================ FOOD ================================ */
ART.APPLE = icon((g) => {
  g.ellipse(6.4, 9.6, 4.4, 4.8, 'appleRed'); g.ellipse(9.6, 9.6, 4.4, 4.8, 'appleRed');
  g.clear(8, 5); g.rect(8, 2, 8, 5, 'stem'); g.map(9, 2, ['ll.', '.ll'], { l: 'leaf' });
}, Q);
ART.RAW_PORK = icon((g) => { g.ellipse(8, 8.5, 6.4, 4.6, 'pork'); g.line(3, 10, 12, 6, 'fat', 2); g.ellipse(8, 8.5, 2, 1.4, 'pork'); }, Q);
ART.COOKED_PORK = icon((g) => { g.ellipse(8, 8.5, 6.4, 4.6, 'cooked'); g.line(3, 10, 12, 6, 'cookedFat', 2); }, Q);
ART.RAW_BEEF = icon((g) => { g.ellipse(8, 8.5, 6.4, 4.8, 'beef'); g.line(4, 11, 12, 6, 'fat', 1); g.line(4, 7, 7, 5, 'fat', 1); }, Q);
ART.STEAK = icon((g) => { g.ellipse(8, 8.5, 6.4, 4.8, 'cooked'); g.line(4, 11, 12, 6, 'cookedFat', 1); g.line(5, 9, 8, 7, 'grill'); g.line(8, 11, 11, 9, 'grill'); }, { ...Q, grill: [hex('3a1808')] });
function drumstick(meat) {
  return icon((g) => {
    g.ellipse(6.6, 6.8, 4.8, 4.4, meat); g.line(9, 9, 12, 12, 'boneC', 2);
    g.rect(12, 11, 14, 12, 'boneC'); g.rect(12, 13, 13, 14, 'boneC');
  }, Q);
}
ART.RAW_CHICKEN = drumstick('chick');
ART.COOKED_CHICKEN = drumstick('cooked');
ART.ROTTEN_FLESH = icon((g) => {
  g.map(0, 0, ['................', '................', '.....rrrr.......', '...rrrrrrrr.....', '..rrrrrrrrrrr...', '..rrrrrrrrrrrr..', '.rrrrrrrrrrrrr..',
    '.rrrrrrrrrrrrrr.', '..rrrrrrrrrrrrr.', '..rrrrrrrrrrrr..', '...rrrrrrrrrr...', '....rrrrrrr.....', '......rrr.......'], { r: 'rotten' });
  [[4, 6], [9, 5], [6, 9], [11, 9]].forEach(([x, y]) => { g.dot(x, y, 'rotSpot'); g.dot(x + 1, y, 'rotSpot'); });
}, Q);
ART.BREAD = icon((g) => {          // in this edition "bread" is a bowl of rice (bay)
  g.ellipse(8, 7.6, 5.6, 3.6, 'rice');
  g.map(0, 8, ['.bbbbbbbbbbbbbb.', '..bbbbbbbbbbbb..', '...bbbbbbbbbb...', '....bbbbbbbb....', '.....bbbbbb.....'], { b: 'bowl' });
  g.rect(1, 8, 14, 8, 'bowlRim');
}, Q);
ART.CARROT = icon((g) => {
  g.map(2, 5, ['.........cc', '........ccc', '.......cccc', '......cccc.', '.....cccc..', '....cccc...', '...cccc....', '..cccc.....', '.ccc.......', 'cc.........'], { c: 'carrot' });
  g.map(11, 1, ['l..l', 'll.l', '.lll', '..ll'], { l: 'carrotTop' });
  g.dot(7, 9, 'line'); g.dot(8, 9, 'line'); g.dot(5, 12, 'line'); g.dot(6, 12, 'line');
}, { ...Q, line: [hex('a84a08')] });
ART.BANANA = icon((g) => {
  for (let t = 0; t <= 1; t += 0.02) { const a = Math.PI * (0.95 - t * 0.8); const x = 8 + Math.cos(a) * 6.4, y = 4 + Math.sin(a) * 8; g.ellipse(x, y, 1.5, 1.5, 'banana'); }
  g.rect(1, 4, 2, 5, 'bananaTip'); g.rect(13, 6, 14, 7, 'stem');
}, Q);
ART.COCONUT = icon((g) => { g.ellipse(8, 8.6, 6, 5.8, 'coconut'); g.rect(7, 2, 8, 3, 'coconutTop'); }, Q);
ART.PALM_FRUIT = icon((g) => { g.ellipse(8, 9.2, 5.4, 5.2, 'palmFruit'); g.map(5, 2, ['.pppp.', 'pppppp', '.p..p.'], { p: 'palmCap' }); }, Q);
ART.WHEAT_SEEDS = icon((g) => { [[3, 4], [9, 3], [6, 8], [11, 8], [4, 12], [10, 12]].forEach(([x, y]) => g.ellipse(x + 1, y + 1, 1.5, 1.1, 'seed')); }, Q);
ART.WHEAT = icon((g) => {          // a sheaf of ripe rice
  g.line(5, 14, 7, 6, 'straw'); g.line(8, 14, 8, 5, 'straw'); g.line(11, 14, 9, 6, 'straw');
  g.rect(4, 11, 11, 11, 'tie');
  [[4, 2], [7, 1], [10, 2]].forEach(([x, y]) => { g.ellipse(x + 1, y + 3, 1.6, 3, 'grain'); });
}, Q);
ART.PALM_SUGAR = icon((g) => {     // three round cakes of palm sugar, stacked
  g.ellipse(8, 11.5, 6, 2.6, 'sugarCake'); g.ellipse(8, 8, 5.2, 2.4, 'sugarCake'); g.ellipse(8, 4.8, 4.2, 2.2, 'sugarCake');
  g.rect(4, 9, 11, 9, 'sugarLine'); g.rect(5, 6, 10, 6, 'sugarLine');
}, { ...Q, sugarLine: [hex('6a3a10')] });
ART.BANANA_CAKE = icon((g) => {    // num ansom chek: banana-leaf parcel tied with string
  g.ellipse(8, 8, 6.6, 4, 'bananaLeaf'); g.rect(5, 4, 5, 12, 'tie'); g.rect(10, 4, 10, 12, 'tie');
}, Q);
ART.COCONUT_CAKE = icon((g) => {   // num kom: pyramid leaf parcel
  for (let y = 2; y <= 13; y++) { const hw = Math.round((y - 2) * 0.55); g.rect(8 - hw, y, 7 + hw, y, 'bananaLeaf'); }
  g.rect(7, 1, 8, 2, 'stem'); g.rect(3, 13, 12, 13, 'bananaLeaf');
}, Q);
function bottle(fill) {
  return icon((g) => {
    g.rect(6, 1, 9, 2, 'cork'); g.rect(6, 3, 9, 5, 'glassB');
    g.ellipse(8, 10, 5, 4.6, 'glassB'); g.rect(5, 6, 10, 7, 'glassB');
    if (fill) g.ellipse(8, 10.8, 4, 3.4, fill);
  }, Q);
}
ART.BOTTLE = bottle(null);
ART.COCONUT_WATER = bottle('cocoWater');
ART.PALM_JUICE = bottle('palmJuice');

/* ============================= MATERIALS ============================= */
ART.STICK = icon((g) => { g.line(3, 13, 12, 3, 'shaft', 2); }, Q);
ART.TORCH = icon((g) => {
  g.rect(7, 7, 8, 14, 'shaft'); g.rect(6, 6, 9, 7, 'rattan');
  g.map(6, 1, ['.ff.', 'ffff', 'fyyf', '.yy.'], { f: 'flameP', y: 'spark' });
}, Q);
ART.COAL = icon((g) => { g.ellipse(8.5, 9.4, 5.6, 4.6, 'coal'); g.ellipse(6, 6.4, 3.4, 2.8, 'coal'); g.rect(6, 5, 7, 5, 'sheen'); g.rect(10, 8, 11, 8, 'sheen'); }, Q);
function gem(cut, body, hi) {
  return icon((g) => {
    if (cut === 'brilliant') {
      g.map(0, 2, ['....aaaaaaaa....', '...aaaaaaaaaa...', '..bbbbbbbbbbbb..', '.bbbbbbbbbbbbbb.', '..cccccccccccc..', '...cccccccccc...', '....cccccccc....', '.....cccccc.....', '......cccc......', '.......cc.......'], { a: body, b: body, c: body });
      g.rect(5, 3, 6, 4, hi); g.rect(4, 5, 11, 5, hi);
    } else if (cut === 'emerald') {
      g.map(0, 1, ['.....aaaaaa.....', '....aaaaaaaa....', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '....aaaaaaaa....', '.....aaaaaa.....'], { a: body });
      g.rect(5, 3, 10, 10, 'inner'); g.rect(5, 3, 6, 6, hi);
    } else {
      g.ellipse(8, 8, 5.6, 6.2, body); g.ellipse(8, 8, 3.2, 3.8, 'inner'); g.rect(5, 4, 6, 6, hi);
    }
  }, { ...Q, inner: [shade(Q[body][1], 1.05)] });
}
ART.DIAMOND = gem('brilliant', 'dia', 'diaHi');
ART.EMERALD = gem('emerald', 'emr', 'emrHi');
ART.SAPPHIRE = gem('oval', 'sap', 'sapHi');
ART.EYE_OF_ENDER = icon((g) => { g.ellipse(8, 8, 5.4, 5.4, 'eye'); g.ellipse(8, 8, 2.6, 2.6, 'gold'); g.rect(7, 6, 8, 10, 'pupil'); }, Q);
ART.BONE = icon((g) => {
  g.line(4, 12, 11, 4, 'bone', 2);
  g.ellipse(3.4, 12.2, 1.5, 1.5, 'bone'); g.ellipse(4.6, 13.4, 1.5, 1.5, 'bone'); g.ellipse(11.4, 2.8, 1.5, 1.5, 'bone'); g.ellipse(12.6, 4, 1.5, 1.5, 'bone');
}, Q);
ART.BONE_MEAL = icon((g) => { g.ellipse(8, 10.6, 6, 3.6, 'bone'); g.ellipse(8, 8, 3.4, 2.6, 'bone'); }, Q);
function ingot(p) {
  return icon((g) => {
    g.map(0, 4, ['....tttttttt....', '...tttttttttt...', '..ffffffffffffs.', '.ffffffffffffss.', '.ffffffffffffs..', '..ffffffffffs...'], { t: 'top', f: p, s: 'side' });
  }, { ...Q, top: [Q[p][3]], side: [Q[p][0]] });
}
ART.IRON_INGOT = ingot('ironI');
ART.GOLD_INGOT = ingot('goldI');
ART.BRONZE_INGOT = ingot('bronzeI');
ART.LEATHER = icon((g) => {        // tanned hide, explicit tones: lit top-left rim, dark bottom-right rim
  g.map(0, 1, [
    '..aa........aa..', '..abbbbbbbbbbd..', '...bccccccccd...', '..bccccccccccd..', '.bccccccccccccd.', '.bccccccccccccd.',
    '.bccccccccccccd.', '.bccccccccccccd.', '..bccccccccccd..', '...bccccccccd...', '..abccccccccdd..', '..addddddddddd..', '..dd........dd..'],
    { a: 'L3', b: 'L3', c: 'L2', d: 'L0' });
  g.rect(5, 5, 6, 6, 'L1'); g.rect(9, 8, 10, 9, 'L1');
}, { L0: [hex('5a3018')], L1: [hex('7a4422')], L2: [hex('9a5a30')], L3: [hex('b87444')] });
ART.SPIDER_SILK = icon((g) => {
  g.line(1, 1, 14, 14, 'silk'); g.line(14, 1, 1, 14, 'silk'); g.rect(1, 8, 14, 8, 'silk'); g.rect(8, 1, 8, 14, 'silk');
  g.ring(8.5, 8.5, 2.6, 3.4, 'silk'); g.ring(8.5, 8.5, 5.2, 6, 'silk');
}, Q);
ART.STRING = icon((g) => {         // a small hank of string
  g.ring(7, 7, 3.2, 4.4, 'bowString'); g.ring(9, 9, 3.2, 4.4, 'bowString'); g.line(11, 12, 14, 14, 'bowString');
}, Q);
ART.KRAMA = icon((g) => {          // folded checked scarf with fringe
  g.rect(2, 3, 13, 12, 'krWhite');
  for (let y = 3; y <= 12; y++) for (let x = 2; x <= 13; x++) if (((x >> 1) + (y >> 1)) % 2 === 0) g.dot(x, y, 'krRed');
  for (let x = 2; x <= 13; x += 2) g.dot(x, 13, 'krRed');
  g.rect(2, 7, 13, 7, 'fold');
}, { ...Q, fold: [hex('8a1a1a')] });
ART.AV_PAK = icon((g) => {         // embroidered blouse
  g.map(0, 2, ['....bb....bb....', '..bbbbbbbbbbbb..', '.bbbbbbbbbbbbbb.', 'bbbbbbbbbbbbbbbb', 'bbb.bbbbbbbb.bbb', 'bb..bbbbbbbb..bb', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....'], { b: 'blouse' });
  g.rect(7, 3, 8, 13, 'trim'); g.rect(4, 13, 11, 13, 'trim'); g.rect(6, 3, 9, 3, 'trim');
}, Q);
function dyePot(c) {
  return icon((g) => {
    g.ellipse(8, 10.6, 5.6, 4, 'potClay'); g.rect(4, 6, 11, 7, 'potClay');
    g.ellipse(8, 5.6, 4, 2.4, c);
  }, Q);
}
ART.RED_DYE = dyePot('dyeRed'); ART.YELLOW_DYE = dyePot('dyeYellow'); ART.PINK_DYE = dyePot('dyePink');
ART.OIL_LAMP = icon((g) => {       // clay oil lamp
  g.map(0, 9, ['.cccccccccccccc.', '..cccccccccccc..', '....cccccccc....', '.....cccccc.....'], { c: 'lampClay' });
  g.rect(13, 8, 14, 9, 'lampClay');
  g.map(6, 3, ['.ff.', 'ffff', 'fyyf', '.yy.', '.ww.'], { f: 'flameP', y: 'spark', w: 'bowString' });
}, Q);
ART.BUCKET = V3.ITEMS.MILK_BUCKET && icon((g) => {
  g.map(0, 0, ['................', '...hhhhhhhhhh...', '..h..........h..', '..bbbbbbbbbbbb..', '..b..........b..', '..b..........b..',
    '...bbbbbbbbbb...', '...bbbbbbbbbb...', '...bbbbbbbbbb...', '...bbbbbbbbbb...', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '.....bbbbbb.....'], { h: 'handle', b: 'bucket' });
  g.rect(3, 4, 12, 5, 'inside');
}, { handle: [hex('5c6068')], inside: [hex('3a3e44')] });
ART.WATER_BUCKET = icon((g) => {
  g.map(0, 0, ['................', '...hhhhhhhhhh...', '..h..........h..', '..bbbbbbbbbbbb..', '..bccccccccccb..', '..bccccccccccb..',
    '...bbbbbbbbbb...', '...bbbbbbbbbb...', '...bbbbbbbbbb...', '...bbbbbbbbbb...', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '.....bbbbbb.....'], { h: 'handle', b: 'bucket', c: 'water' });
}, { handle: [hex('5c6068')] });

/* ============================ PLACEABLE ITEMS ============================ */
function bedItem(c) {
  return icon((g) => {
    g.rect(1, 6, 14, 9, c); g.rect(1, 6, 4, 8, 'pillow');
    g.rect(1, 10, 14, 11, 'bedWood'); g.rect(1, 12, 2, 13, 'bedWood'); g.rect(13, 12, 14, 13, 'bedWood');
    g.rect(0, 4, 1, 11, 'bedWood');
  }, Q);
}
ART.BED_ITEM = bedItem('bedRed'); ART.BED_YELLOW_ITEM = bedItem('bedYellow'); ART.BED_PINK_ITEM = bedItem('bedPink');
ART.DOOR_ITEM = icon((g) => {
  g.rect(4, 1, 11, 14, 'door'); g.rect(5, 2, 10, 6, 'doorWin');
  [6, 8].forEach(x => g.rect(x, 2, x, 6, 'balu')); g.rect(5, 9, 10, 9, 'doorLine'); g.rect(9, 10, 9, 11, 'gold');
}, { ...Q, balu: [hex('b8a88c')], doorLine: [hex('5a2c18')] });
function slab(m, top) {
  return icon((g) => { g.rect(1, 7, 14, 13, m); g.rect(1, 7, 14, 7, top); g.rect(1, 10, 14, 10, 'seam'); }, { ...Q, seam: [shade(Q[m][0], 0.9)] });
}
ART.SLAB_ITEM = slab('plank', 'plankTop'); ART.STONE_SLAB_ITEM = slab('stone2', 'stoneTop'); ART.COBBLESTONE_SLAB_ITEM = slab('cobble', 'cobbleTop');
ART.STAIRS_ITEM = icon((g) => {
  g.rect(1, 8, 14, 14, 'plank'); g.rect(8, 2, 14, 7, 'plank'); g.rect(1, 8, 7, 8, 'plankTop'); g.rect(8, 2, 14, 2, 'plankTop');
  g.rect(1, 11, 14, 11, 'seam'); g.rect(8, 5, 14, 5, 'seam');
}, { ...Q, seam: [hex('4a2414')] });
ART.BOAT = icon((g) => {           // Khmer racing longboat (tuk ngo) with a gold prow
  for (let x = 1; x <= 14; x++) { const sag = Math.round(Math.abs(x - 7.5) * 0.35); g.rect(x, 8 - sag, x, 11 - Math.max(0, sag - 1), 'hull'); }
  g.rect(2, 9, 13, 9, 'hullStripe'); g.map(12, 3, ['.pp', 'pp.', 'p..', 'p..'], { p: 'prow' }); g.rect(1, 5, 1, 7, 'prow');
}, Q);

/* ============================ COMBAT / ARMOUR ============================ */
ART.BOW = icon((g) => {
  for (let t = 0; t <= 1; t += 0.02) { const a = -Math.PI / 4 + (t - 0.5) * 2.4; g.dot(Math.round(3 + Math.cos(a) * 10), Math.round(13 + Math.sin(a) * 10), 'bowWood'); g.dot(Math.round(3 + Math.cos(a) * 9.2), Math.round(13 + Math.sin(a) * 9.2), 'bowWood'); }
  g.line(4, 3, 13, 12, 'bowString'); g.rect(6, 7, 7, 8, 'rattan');
}, Q);
ART.ARROW = icon((g) => {
  g.line(3, 12, 12, 3, 'shaft'); g.map(10, 1, ['.hhh', 'hhhh', '.hh.', '.h..'], { h: 'arrowHead' });
  g.map(1, 10, ['.f..', 'ff..', 'fff.', '.fff', '..f.'], { f: 'fletch' });
}, Q);
ART.SHIELD = icon((g) => {         // round rattan shield with a brass boss, as on the Bayon reliefs
  g.ellipse(8, 8, 6.6, 6.6, 'rattan'); g.ring(8, 8, 4.4, 5.4, 'shieldRed'); g.ellipse(8, 8, 2.2, 2.2, 'boss');
}, Q);
function helmet(p) { return icon((g) => { g.map(0, 2, ['.......tt.......', '......tttt......', '....aaaaaaaa....', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..', '..aaa......aaa..', '..aa........aa..', '..aa........aa..'], { a: p, t: 'aTrim' }); g.rect(2, 6, 13, 6, 'aTrim'); }, Q); }
function chest(p) { return icon((g) => { g.map(0, 1, ['..aaa....aaa....', '.aaaaaaaaaaaa...', 'aaaaaaaaaaaaaa..', 'aaaaaaaaaaaaaa..', 'aa.aaaaaaaa.aa..', '...aaaaaaaa.....', '...aaaaaaaa.....', '...aaaaaaaa.....', '...aaaaaaaa.....', '...aaaaaaaa.....', '...aaaaaaaa.....', '...aaaaaaaa.....'].map(r => '.' + r.slice(0, 15)), { a: p }); g.rect(7, 2, 8, 12, 'aTrim'); g.rect(4, 7, 11, 7, 'aTrim'); }, Q); }
function legs(p) { return icon((g) => { g.map(0, 1, ['...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaa..aaaa...', '...aaaa..aaaa...', '...aaaa..aaaa...', '...aaaa..aaaa...', '...aaaa..aaaa...', '...aaaa..aaaa...', '...aaaa..aaaa...', '...aaaa..aaaa...', '...aaaa..aaaa...', '...aaaa..aaaa...'], { a: p }); g.rect(3, 2, 12, 2, 'aTrim'); }, Q); }
function boots(p) { return icon((g) => { g.map(0, 6, ['..aaa......aaa..', '..aaa......aaa..', '..aaa......aaa..', '..aaa......aaa..', '..aaaa.....aaaa.', '.aaaaa....aaaaa.', '.aaaaa....aaaaa.'], { a: p }); g.rect(2, 6, 4, 6, 'aTrim'); g.rect(11, 6, 13, 6, 'aTrim'); }, Q); }
[['IRON', 'ironA'], ['DIAMOND', 'diaA'], ['LEATHER', 'leatherA']].forEach(([t, p]) => {
  ART[t + '_HELMET'] = helmet(p); ART[t + '_CHESTPLATE'] = chest(p); ART[t + '_LEGGINGS'] = legs(p); ART[t + '_BOOTS'] = boots(p);
});
ART.BRONZE_SPEAR = icon((g) => {
  g.line(2, 14, 10, 6, 'shaft', 1); g.line(3, 14, 11, 6, 'shaft', 1);
  g.map(9, 1, ['....s', '..sss', '.sss.', 'sss..', 'ss...'], { s: 'spear' });
  g.rect(8, 6, 9, 7, 'tassel'); g.rect(7, 7, 8, 8, 'tassel');
}, Q);
ART.GOLDEN_CROWN = icon((g) => {   // mkot: tiered Khmer crown
  g.rect(7, 1, 8, 2, 'crown'); g.rect(6, 3, 9, 4, 'crown'); g.rect(5, 5, 10, 6, 'crown'); g.rect(4, 7, 11, 8, 'crown'); g.rect(3, 9, 12, 11, 'crown'); g.rect(2, 12, 13, 13, 'crown');
  g.dot(7, 10, 'gemR'); g.dot(8, 10, 'gemR'); g.dot(4, 10, 'gemB'); g.dot(11, 10, 'gemG'); g.rect(7, 5, 8, 5, 'gemB');
}, Q);

/* ================================ BLOCKS ================================ */
ART.BEDROCK = wrapTile(tile((x, y) => ramp(pal('141416', '2a2a2e', '46464c', '6a6a72', '8a8a92'), fbm(x, y, 301) * 1.15 - 0.05)));
ART.OBSIDIAN = wrapTile(tile((x, y) => { const n = fbm(x, y, 311); return n > 0.62 ? (n > 0.7 ? hex('b070e8') : hex('6a30a0')) : ramp(pal('0c0814', '1a1030', '2a1a48', '3a2660'), n * 1.4); }));
ART.END_STONE = wrapTile(tile((x, y) => { const n = vnoise(x, y, 4, 321); return n < 0.2 ? hex('b8b07a') : ramp(pal('c8c08a', 'dcd49e', 'ece4b0', 'f6f0c8'), 0.2 + fbm(x, y, 322) * 0.9); }));
ART.END_PORTAL = wrapTile(tile((x, y) => { const s = vnoise(x, y, 2, 331); return s > 0.8 ? hex('9af0e0') : s > 0.72 ? hex('3aa898') : ramp(pal('061412', '0a201e', '102c2a'), fbm(x, y, 332)); }, false));
function frameStone(x, y) { const e = Math.min(x, y, 15 - x, 15 - y); return e === 0 ? hex('2a5a4a') : ramp(pal('2e6a56', '3e8a70', '5aa88a', '7cc8a8'), 0.3 + (e === 1 ? 0.4 : 0) + (hash(x >> 2, y >> 2, 341) - 0.5) * 0.3); }
ART.END_PORTAL_FRAME_SIDE = wrapTile(tile((x, y) => y < 3 ? ramp(pal('d8d09a', 'ece4b0'), y === 0 ? 0 : 1) : frameStone(x, y), false));
ART.END_PORTAL_FRAME_TOP = wrapTile(tile((x, y) => (x >= 4 && x <= 11 && y >= 4 && y <= 11) ? (x === 4 || y === 4 ? hex('061a14') : hex('0c2a22')) : frameStone(x, y), false));
ART.END_PORTAL_FRAME_EYE_TOP = wrapTile(tile((x, y) => {
  const d = Math.hypot(x - 7.5, y - 7.5);
  if (d < 1.4) return hex('0a1a12'); if (d < 2.6) return hex('f2c64a'); if (d < 4.2) return ramp(pal('1a8a5a', '4ac888', 'a8f0c8'), x + y < 15 ? 0.9 : 0.3);
  return frameStone(x, y);
}, false));
ART.WOOL = wrapTile(tile((x, y) => { const c = course(x, y, 4, 4, 2); return c.edge === 'mortar' ? hex('cfccc4') : c.edge === 'lit' ? hex('ffffff') : c.edge === 'shadow' ? hex('dcd8d0') : hex('eeebe4'); }, false));
function bedSet(C) {
  const top = (head) => tile((x, y) => {
    if (x < 2 || x > 13) return ramp(Q.bedWood, x < 2 ? 0.7 : 0.2);
    if (head && y < 7 && y > 0) return ramp(Q.pillow, y === 1 ? 0.9 : x < 4 ? 0.6 : 0.3);
    return ramp(C, 0.35 + ((y + (head ? 0 : 1)) % 4 === 0 ? -0.3 : 0.2) + (x === 2 ? 0.3 : 0));
  }, false);
  const side = tile((x, y) => y < 6 ? ramp(C, y === 0 ? 0.9 : y === 5 ? 0.05 : 0.5) : y < 9 ? ramp(Q.bedWood, y === 6 ? 0.8 : 0.4) : (x < 3 || x > 12) ? ramp(Q.bedWood, 0.3) : [0, 0, 0, 0], false);
  return [top(false), top(true), side];
}
[['BED', Q.bedRed], ['BED_YELLOW', Q.bedYellow], ['BED_PINK', Q.bedPink]].forEach(([k, C]) => {
  const [f, h, s] = bedSet(C); ART[k + '_FOOT_TOP'] = wrapTile(f); ART[k + '_HEAD_TOP'] = wrapTile(h); ART[k + '_SIDE'] = wrapTile(s);
});
ART.DOOR_EDGE = wrapTile(tile((x, y) => { const k = x % 5; return k === 0 ? hex('4a2414') : ramp(Q.door, k === 1 ? 0.85 : 0.45 + (hash(x, y >> 3, 351) - 0.5) * 0.2); }, false));
ART.BANANA_STEM_SIDE = wrapTile(tile((x, y) => { const band = Math.floor((x + (y >> 2)) / 3) % 3; return ramp(pal('2e5a1c', '42782a', '5e9a38', '84bc52', 'a8d070'), 0.25 + band * 0.25 + ((x % 3) === 0 ? -0.2 : 0)); }, false));
ART.BANANA_STEM_TOP = wrapTile(tile((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return ramp(pal('5e9a38', '84bc52', 'b8d890', 'dcecc0'), Math.floor(d) % 2 ? 0.25 : 0.75 - d * 0.03); }, false));

/* ================================ PLANTS ================================ */
function cluster(fruit, extra) {
  return plant((g) => {
    g.rect(7, 0, 8, 4, 'stalk');
    [[5.5, 6.5, 'A'], [10.5, 6.5, 'B'], [8, 10, 'A'], [4, 11, 'B'], [12, 11, 'B'], [8, 14, 'B']].forEach(([x, y, k]) => g.ellipse(x, y, 2.3, 2.3, fruit + k));
  }, { stalk: pal('4a3018', '6a4a28'), [fruit + 'A']: extra[fruit], [fruit + 'B']: extra[fruit].map(c => shade(c, 0.85)) });
}
ART.COCONUT_CLUSTER = cluster('coconut', Q);
ART.PALM_FRUIT_CLUSTER = cluster('palmFruit', Q);
const stemP = pal('2a5a1c', '3e7a28', '5a9a38', '7cbc4e');
ART.FLOWER_ROSE = plant((g) => {   // red hibiscus
  g.rect(7, 8, 8, 15, 'stem2'); g.map(9, 10, ['ll', 'lll'], { l: 'stem2' });
  g.ellipse(8, 5, 4.4, 3.8, 'petal'); g.ellipse(8, 5, 1.6, 1.4, 'core');
}, { stem2: stemP, petal: pal('8a1010', 'c02020', 'e84040', 'ff7a6a'), core: [hex('f2c64a')] });
ART.FLOWER_DANDELION = plant((g) => {
  g.rect(7, 8, 8, 15, 'stem2'); g.map(4, 10, ['.ll', 'lll'], { l: 'stem2' });
  g.ellipse(8, 5, 3.6, 3.4, 'petal'); g.ellipse(8, 5, 1.4, 1.2, 'core');
}, { stem2: stemP, petal: pal('b88a08', 'e8b820', 'ffe060', 'fff4a0'), core: [hex('c86a10')] });
ART.TALL_GRASS = plant((g) => {
  [[2, 6], [5, 2], [8, 4], [11, 1], [13, 7]].forEach(([x, top]) => { g.line(x, 15, x + (x < 8 ? -1 : 1), top, 'blade'); g.line(x + 1, 15, x + (x < 8 ? 0 : 2), top + 2, 'blade'); });
}, { blade: pal('2c6532', '3d8232', '559e38', '94cf56') });
for (let s = 0; s < 8; s++) {
  ART['WHEAT_STAGE_' + s] = plant((g) => {
    const h = 3 + Math.round(s * 1.5), ripe = s >= 6;
    [2, 6, 10, 13].forEach((x, i) => {
      const top = 15 - h + (i % 2);
      g.line(x, 15, x, top, ripe ? 'straw' : 'blade');
      if (s >= 4) g.ellipse(x + 0.5 + (i % 2 ? 1 : -0), top + 1.5, 1.2, 2.2, ripe ? 'grain' : 'green');
    });
  }, { ...Q, blade: stemP, green: pal('5a8a2a', '7aaa3a', '9ac850') });
}
function sapling(leaves, trunk, berries) {
  return plant((g) => {
    g.rect(7, 9, 8, 15, trunk);
    g.ellipse(8, 6, 4.6, 4, leaves); g.ellipse(5, 9, 2.4, 1.8, leaves); g.ellipse(11, 8.6, 2.4, 1.8, leaves);
    if (berries) [[6, 5], [10, 6]].forEach(([x, y]) => { g.dot(x, y, 'berry'); g.dot(x + 1, y, 'berry'); });
  }, { leafP: pal('183c24', '235628', '316f2c', '438a30', '5ea53a'), trunkP: pal('35261f', '4a3527', '614631'), berry: [hex('d02020')] });
}
ART.OAK_SAPLING = sapling('leafP', 'trunkP', false);
ART.APPLE_SAPLING = sapling('leafP', 'trunkP', true);
function fan(leafP, trunkP, wide) {
  return plant((g) => {
    g.rect(7, 9, 8, 15, 'trunkP');
    for (let k = -2; k <= 2; k++) { const a = -Math.PI / 2 + k * (wide ? 0.55 : 0.45); g.line(7.5, 9, Math.round(7.5 + Math.cos(a) * 7), Math.round(9 + Math.sin(a) * 7), 'leafP', 2); }
  }, { leafP, trunkP });
}
ART.PALM_SAPLING = fan(pal('1f5a26', '2f7a30', '4a9a3e', '6cbc56'), pal('26221f', '35302a', '473f36'), true);
ART.COCONUT_SAPLING = plant((g) => {
  g.ellipse(8, 13, 3.4, 2.6, 'nut');
  for (let k = -1; k <= 1; k++) { const a = -Math.PI / 2 + k * 0.6; g.line(8, 11, Math.round(8 + Math.cos(a) * 9), Math.round(11 + Math.sin(a) * 9), 'leafP', 2); }
}, { leafP: pal('4e8a24', '6eae34', '8ac84a'), nut: pal('5a4a28', '7a6438', '9a8048') });
ART.BANANA_SAPLING = plant((g) => {
  g.rect(7, 8, 8, 15, 'stemB');
  g.map(1, 2, ['ll..........ll', '.lll......lll.', '..llll..llll..', '....llllll....', '......ll......'], { l: 'leafB' });
}, { stemB: pal('42782a', '5e9a38', '84bc52'), leafB: pal('3a8a24', '5aae38', '7cc84e', 'a8e070') });
ART.LOTUS = plant((g) => {
  g.map(0, 12, ['..pppppppppppp..', '.pppppppppppppp.', '..pppppppppppp..'], { p: 'pad' });
  g.rect(7, 8, 8, 12, 'stem2');
  g.map(4, 1, ['...pp...', '..pppp..', 'p.pppp.p', 'pppppppp', '.pppppp.', '..pppp..'], { p: 'petal' });
  g.rect(7, 4, 8, 5, 'core');
}, { pad: pal('1f5a26', '2f7a30', '4a9a3e'), stem2: stemP, petal: pal('b04a7a', 'e070a0', 'f8a0c8', 'ffd0e4'), core: [hex('f2c64a')] });
ART.BANANA_PLANT_LOWER = plant((g) => {
  g.rect(6, 0, 9, 15, 'stemB'); [3, 8, 13].forEach(y => g.rect(6, y, 9, y, 'ring'));
  g.line(5, 6, 0, 2, 'leafB', 2); g.line(10, 8, 15, 4, 'leafB', 2);
}, { stemB: pal('2e5a1c', '42782a', '5e9a38', '84bc52'), ring: [hex('2a4a18')], leafB: pal('3a8a24', '5aae38', '7cc84e') });
ART.BANANA_PLANT_UPPER = plant((g) => {
  g.rect(6, 8, 9, 15, 'stemB');
  g.map(0, 0, ['ll............ll', 'lll..........lll', '.llll......llll.', '...llll..llll...', '.....llllll.....', '.......ll.......'], { l: 'leafB' });
  g.map(5, 7, ['bbbbbb', '.bbbb.', '..bb..'], { b: 'banana' });
}, { ...Q, stemB: pal('2e5a1c', '42782a', '5e9a38', '84bc52'), leafB: pal('3a8a24', '5aae38', '7cc84e', 'a8e070') });

module.exports = { ART };
