'use strict';
/* =====================================================================
 * Angkor Craft · textures v2 (proposal)
 *
 * Plain functions that paint 16x16 RGBA tiles. They run in Node (to
 * preview and send to Figma) and, once approved, the same code moves
 * into createTextureAtlas() in game.js.
 *
 * Every tile is a function (x, y) -> [r, g, b, a]. Helpers give
 * seamless (wrapping) noise, palette ramps, block courses with bevels,
 * and a relief-lighting pass for carvings.
 * ===================================================================== */

const N = 16;

/* ----------------------------- helpers ----------------------------- */
const wrap = (v) => ((v % N) + N) % N;
const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));
const fract = (v) => v - Math.floor(v);
const hash = (x, y, s) => fract(Math.sin(wrap(x) * 127.1 + wrap(y) * 311.7 + s * 74.7) * 43758.5453);
const smooth = (t) => t * t * (3 - 2 * t);

/** Smooth value noise with period 16 (tiles seamlessly). cell = feature size in pixels (must divide 16). */
function vnoise(x, y, cell, seed) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const tx = smooth((x - gx * cell) / cell), ty = smooth((y - gy * cell) / cell);
  const per = N / cell;
  const h = (i, j) => hash(((gx + i) % per + per) % per * 7, ((gy + j) % per + per) % per * 13, seed);
  const a = h(0, 0), b = h(1, 0), c = h(0, 1), d = h(1, 1);
  return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
}
/** Fractal noise: big shapes + medium + fine grain, 0..1. */
const fbm = (x, y, seed) => vnoise(x, y, 8, seed) * 0.5 + vnoise(x, y, 4, seed + 1) * 0.3 + vnoise(x, y, 2, seed + 2) * 0.2;

const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
const pal = (...hs) => hs.map(hex);
const ramp = (p, v) => p[Math.max(0, Math.min(p.length - 1, Math.floor(v * p.length)))];
const shade = (c, k) => [clamp255(c[0] * k), clamp255(c[1] * k), clamp255(c[2] * k), c[3] ?? 255];
const mix = (a, b, t) => [0, 1, 2].map(i => clamp255(a[i] + (b[i] - a[i]) * t)).concat([255]);
const CLEAR = [0, 0, 0, 0];

/** Paint a tile from a per-pixel function. clean = remove isolated pixels afterwards (default for blocks). */
function tile(fn, clean = true) {
  const px = new Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const c = fn(x, y);
    const i = (y * N + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3] ?? 255;
  }
  return clean ? despeckle(px) : px;
}

/**
 * Clean-up pass. A pixel that shares its colour with none of its four neighbours reads as
 * "noise" and makes a 16x16 texture look blurry, so it takes the colour most of its
 * neighbours have. Every remaining detail is at least two pixels big.
 */
function despeckle(px) {
  const out = px.slice();
  const key = (x, y) => { const i = (wrap(y) * N + wrap(x)) * 4; return px[i] + ',' + px[i + 1] + ',' + px[i + 2] + ',' + px[i + 3]; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const me = key(x, y);
    const nb = [key(x + 1, y), key(x - 1, y), key(x, y + 1), key(x, y - 1)];
    if (nb.includes(me)) continue;
    const count = {};
    nb.forEach(k => count[k] = (count[k] || 0) + 1);
    const best = Object.keys(count).sort((a, b) => count[b] - count[a])[0].split(',').map(Number);
    const i = (y * N + x) * 4;
    out[i] = best[0]; out[i + 1] = best[1]; out[i + 2] = best[2]; out[i + 3] = best[3];
  }
  return out;
}

/**
 * Masonry courses. Returns where a pixel sits in its stone block:
 *   { row, col, u, v, w, h, edge } — u,v = position inside the block, edge = 'mortar' | 'lit' | 'shadow' | null
 * Light comes from the top-left: the top and left rims are lit, bottom and right rims are in shadow.
 */
function course(x, y, rowH, blockW, offset) {
  const row = Math.floor(y / rowH);
  const shift = (row % 2) * offset;
  const xx = wrap(x + shift);
  const col = Math.floor(xx / blockW);
  const u = xx - col * blockW, v = y - row * rowH;
  let edge = null;
  if (v === 0 || u === 0) edge = 'mortar';
  else if (v === 1 || u === 1) edge = 'lit';
  else if (v === rowH - 1 || u === blockW - 1) edge = 'shadow';
  return { row, col, u, v, w: blockW, h: rowH, edge };
}

/** Lights a height map from the top-left: returns -1 (deep shadow) .. +1 (bright rim). */
function relief(height, x, y) {
  const dx = height(x + 1, y) - height(x - 1, y);
  const dy = height(x, y + 1) - height(x, y - 1);
  return Math.max(-1, Math.min(1, -(dx + dy) * 0.9));
}

/* ----------------------------- palettes ----------------------------- */
// Every material uses one short ramp (shadow -> highlight). Shadows lean cool, highlights warm.
// Angkor sandstone: grey-beige with a pink cast, weathered dark with lichen
const SANDSTONE = pal('6f6460', '8f8274', 'ad9e86', 'c7b796', 'dccdab');
const LICHEN = pal('4f5446', '626a50', '76805c');
// Laterite: rusty red-brown, porous
const LATERITE = pal('5a2220', '7a3020', '9a4426', 'b85a2e', 'd0763e');
// Red earth (dey krahom)
const RED_EARTH = pal('692a22', '873a24', 'a64e2a', 'c16536', 'd6814a');
// Paddy green
const PADDY = pal('2c6532', '3d8232', '559e38', '72b944', '94cf56');
const STONE_P = pal('565a66', '6f737c', '898b90', 'a3a3a3', 'bebbb4');
const SAND_P = pal('c2a67a', 'd5bb8b', 'e3cd9c', 'eedcae', 'f7eac6');
const TERRACOTTA = pal('6a2418', '8d3419', 'ae4720', 'ca5c2a', 'e07a3a');
// Tropical hardwood (koki / beng): reddish brown
const HARDWOOD = pal('48221c', '62301f', '7d4127', '9a5532', 'b56c40', 'cc8652');
const BARK = pal('231a1c', '35261f', '4a3527', '614631', '7a5b3c');
const SUGAR_PALM_BARK = pal('19171c', '26221f', '35302a', '473f36', '5b5144');
const COCONUT_BARK = pal('5e5048', '776553', '927d64', 'ab9576', 'c3ad8c');
const LEAF = pal('183c24', '235628', '316f2c', '438a30', '5ea53a', '7fbe46');

/* ============================ BLOCKS ============================ */
const T = {};

// Red earth with clods and a few pale pebbles
T.DIRT = tile((x, y) => {
  if (hash(x >> 1, y, 31) > 0.93) return hex('d2bfa2');                 // pale pebble, 2px
  const v = fbm(x, y, 11) * 0.75 + vnoise(x, y, 2, 12) * 0.25;
  const clod = vnoise(x, y, 4, 13) > 0.62;
  return shade(ramp(RED_EARTH, v), clod ? 0.88 : 1);
});

// Paddy grass seen from above: blades as short light streaks over a mottled base
T.GRASS_TOP = tile((x, y) => {
  const base = ramp(PADDY, fbm(x, y, 21) * 0.7 + vnoise(x, y, 2, 22) * 0.2 + 0.05);
  const row = Math.floor(y / 3);                                   // a blade is a 1x2 light stroke with a dark foot
  const bladeX = hash(x, row, 23) > 0.72;
  if (bladeX && y % 3 < 2) return PADDY[4];
  if (bladeX && y % 3 === 2) return PADDY[1];
  return base;
});

// Grass side: a ragged fringe of blades over red earth
T.GRASS_SIDE = tile((x, y) => {
  const depth = 2 + Math.floor(hash(x, 0, 41) * 3);
  const hang = hash(x, 1, 43) > 0.6 ? 2 : 0;
  if (y < depth) return ramp(PADDY, fbm(x, y, 21) * 0.8 + 0.1);
  if (y < depth + hang) return ramp(PADDY.slice(0, 3), hash(x, y, 44));
  if (y === depth + hang) return shade(ramp(RED_EARTH, fbm(x, y, 11)), 0.72);   // shadow under the turf
  return T.DIRT.slice((y * N + x) * 4, (y * N + x) * 4 + 4);
});

// Grey-blue granite: soft blotches, flecks and a hairline crack
const CRACK = new Set(['3,4', '4,5', '5,5', '6,6', '7,6', '8,7', '12,11', '13,12', '13,13', '1,12', '2,13']);
T.STONE = tile((x, y) => {
  if (CRACK.has(x + ',' + y)) return hex('4e5155');
  if (CRACK.has((x - 1) + ',' + (y + 1))) return hex('aeb0b3');
  if (hash(x >> 1, y, 51) > 0.93) return hex('c6c4bd');                 // light fleck, 2px
  return ramp(STONE_P, fbm(x, y, 5) * 0.85 + vnoise(x, y, 2, 52) * 0.15);
});

// River cobbles: Voronoi stones, each lit from the top-left, set in dark mortar
const COBBLES = [];
for (let i = 0; i < 9; i++) COBBLES.push({ x: (i % 3) * 5.3 + 2.5 + (hash(i, 1, 61) - 0.5) * 2, y: Math.floor(i / 3) * 5.3 + 2.5 + (hash(i, 2, 61) - 0.5) * 2, t: hash(i, 3, 61) });
function voronoi(x, y, pts) {
  let best = 1e9, second = 1e9, idx = 0;
  pts.forEach((p, i) => {
    for (let ox = -N; ox <= N; ox += N) for (let oy = -N; oy <= N; oy += N) {
      const d = Math.hypot(x + 0.5 - p.x - ox, y + 0.5 - p.y - oy);
      if (d < best) { second = best; best = d; idx = i; } else if (d < second) second = d;
    }
  });
  return { idx, edge: second - best, p: pts[idx] };
}
T.COBBLESTONE = tile((x, y) => {
  const c = voronoi(x, y, COBBLES);
  if (c.edge < 0.9) return hex('3b3c3e');
  const base = ramp(STONE_P, 0.25 + c.p.t * 0.5 + vnoise(x, y, 2, 62) * 0.2);
  const lit = c.edge < 1.9 ? (((x + 0.5) - c.p.x) + ((y + 0.5) - c.p.y) < 0 ? 1.16 : 0.8) : 1;
  return shade(base, lit);
});

// Gravel: small mixed pebbles (grey, brown, rust)
const rnd = (i, s) => fract(Math.sin(i * 12.9898 + s * 78.233) * 43758.5453);   // non-wrapping, for point sets
const GRAVEL_PTS = [];
for (let i = 0; i < 30; i++) GRAVEL_PTS.push({ x: rnd(i, 71) * 16, y: rnd(i, 72) * 16, t: rnd(i, 73) });
const GRAVEL_COLS = pal('6f6a64', '857e74', '9a9288', '7d5a42', 'a37a5a', '5b5753');
T.GRAVEL = tile((x, y) => {
  const c = voronoi(x, y, GRAVEL_PTS);
  if (c.edge < 0.28) return hex('4a4540');
  const base = GRAVEL_COLS[Math.floor(c.p.t * GRAVEL_COLS.length)];
  const lit = ((x + 0.5) - c.p.x) + ((y + 0.5) - c.p.y) < -0.5 ? 1.15 : (((x + 0.5) - c.p.x) + ((y + 0.5) - c.p.y) > 1 ? 0.82 : 1);
  return shade(base, lit);
});

// Fine beach sand with faint wind ripples
T.SAND = tile((x, y) => {
  if (hash(x >> 1, y, 81) > 0.93) return hex('b39a6c');                 // darker grains, 2px
  const ripple = Math.sin((y + Math.sin(x * 0.8) * 0.8) * 1.6) * 0.08;
  return ramp(SAND_P, fbm(x, y, 82) * 0.7 + vnoise(x, y, 2, 83) * 0.2 + ripple + 0.05);
});

// Angkor sandstone: four courses of staggered blocks, bevelled, with dark lichen weathering
function sandstonePixel(x, y, rowH, blockW, offset, seed) {
  const k = course(x, y, rowH, blockW, offset);
  const tint = (hash(k.col, k.row, seed) - 0.5) * 0.18;
  let c = ramp(SANDSTONE, fbm(x, y, seed) * 0.7 + vnoise(x, y, 2, seed + 1) * 0.15 + 0.1 + tint);
  if (vnoise(x, y, 4, seed + 3) > 0.7) c = mix(c, ramp(LICHEN, vnoise(x, y, 2, seed + 4)), 0.55);   // weathering
  if (k.edge === 'mortar') return shade(c, 0.62);
  if (k.edge === 'lit') return shade(c, 1.12);
  if (k.edge === 'shadow') return shade(c, 0.86);
  return c;
}
T.SANDSTONE_SIDE = tile((x, y) => sandstonePixel(x, y, 4, 8, 4, 91));
T.SANDSTONE_TOP = tile((x, y) => sandstonePixel(x, y, 8, 8, 0, 93));

// Carved sandstone: a lotus in bas-relief inside a raised frame, like an Angkor wall panel.
// '#' = raised (the lotus and the frame), '.' = carved-away background. Lit from the top-left:
// raised pixels get a bright rim on their top/left and a dark rim on their bottom/right,
// and the background is shadowed just below/right of anything raised.
const LOTUS_PANEL = [
  '################',
  '################',
  '##............##',
  '##.....##.....##',
  '##....####....##',
  '##....####....##',
  '##..#.####.#..##',
  '##.##.####.##.##',
  '##.###.##.###.##',
  '##..###..###..##',
  '##...######...##',
  '##..########..##',
  '##......##....##',
  '##............##',
  '################',
  '################',
];
const raised = (x, y) => x < 0 || y < 0 || x > 15 || y > 15 || LOTUS_PANEL[y][x] === '#';
T.CARVED_SANDSTONE = tile((x, y) => {
  const base = ramp(SANDSTONE, fbm(x, y, 95) * 0.6 + vnoise(x, y, 2, 96) * 0.15 + 0.25);
  if (raised(x, y)) {
    if (!raised(x - 1, y) || !raised(x, y - 1)) return shade(base, 1.24);   // lit rim
    if (!raised(x + 1, y) || !raised(x, y + 1)) return shade(base, 0.74);   // shadow rim
    return base;
  }
  if (raised(x - 1, y) || raised(x, y - 1) || raised(x - 1, y - 1)) return shade(base, 0.6);  // cast shadow in the recess
  return shade(base, 0.86);
});

// Laterite: porous red blocks in two courses, pitted with dark holes that catch light on their lower lip
T.LATERITE = tile((x, y) => {
  const k = course(x, y, 8, 16, 8);
  const base = ramp(LATERITE, fbm(x, y, 101) * 0.7 + vnoise(x, y, 2, 102) * 0.25);
  if (k.edge === 'mortar') return shade(base, 0.6);
  if (k.edge === 'lit') return shade(base, 1.12);
  if (k.edge === 'shadow') return shade(base, 0.85);
  if (hash(x >> 1, y, 103) > 0.85) return hex('3a1612');               // pit, 2px wide
  if (hash(x >> 1, y - 1, 103) > 0.85) return shade(base, 1.22);     // lit lip under the pit
  if (hash(x >> 1, y >> 1, 104) > 0.93) return hex('d9a45e');          // ochre fleck, 2x2
  return base;
});

// Khmer terracotta roof: rows of overlapping half-round tiles, each lit along its crown
function roofPixel(x, y, seed) {
  const rowH = 4, w = 4;
  const row = Math.floor(y / rowH);
  const xx = wrap(x + (row % 2) * 2);
  const u = xx % w, v = y % rowH;
  const tint = (hash(Math.floor(xx / w), row, seed) - 0.5) * 0.12;
  const crown = [0.82, 1.12, 1.0, 0.72][u];                           // half-round profile across the tile
  const base = ramp(TERRACOTTA, fbm(x, y, seed) * 0.5 + 0.35 + tint);
  if (v === rowH - 1) return shade(base, 0.55);                       // shadow under the overlapping row
  if (v === 0) return shade(base, crown * 1.1);
  return shade(base, crown);
}
T.ROOF_TILE = tile((x, y) => roofPixel(x, y, 111));
T.ROOF_TILE_TOP = tile((x, y) => roofPixel(x, y, 113));

// Tropical hardwood log: deep bark fissures running up the trunk
T.WOOD_LOG_SIDE = tile((x, y) => {
  const wobble = Math.round(Math.sin(y * 0.7 + hash(0, Math.floor(y / 4), 122) * 6) * 0.8);
  const col = wrap(x + wobble) % 4;                                    // a fissure every 4 pixels
  const base = ramp(BARK, fbm(x, y, 123) * 0.6 + 0.3);
  if (col === 0) return shade(base, 0.5);                              // deep fissure
  if (col === 1) return shade(base, 1.25);                             // lit edge of the bark plate
  if (hash(x, Math.floor(y / 3), 124) > 0.88) return shade(base, 0.8); // cross crack
  return base;
});
// End grain: bark ring, pale sapwood, red heartwood with growth rings
T.WOOD_LOG_TOP = tile((x, y) => {
  const cx = x + 0.5 - 8, cy = y + 0.5 - 8;
  const m = Math.max(Math.abs(cx), Math.abs(cy));
  const r = Math.hypot(cx, cy) + (hash(x, y, 131) - 0.5) * 0.7;
  if (m > 7) return ramp(BARK, vnoise(x, y, 2, 132) * 0.6 + 0.2);
  if (m > 6) return hex('c49a68');                                    // sapwood
  const ring = Math.floor(r) % 2 === 0;
  return ring ? HARDWOOD[5] : HARDWOOD[4];
});
// Planks: four boards of reddish hardwood with grain, butt joints and two wooden pegs each
T.WOOD_PLANKS = tile((x, y) => {
  const board = Math.floor(y / 4), v = y % 4;
  const joint = (board % 2 === 0 ? 11 : 4);
  const grain = Math.sin((x + hash(0, board, 141) * 16) * 0.9 + Math.sin(y * 2.1 + board) * 0.8) * 0.5 + 0.5;
  let c = ramp(HARDWOOD, 0.35 + grain * 0.35 + (hash(board, 0, 142) - 0.5) * 0.25);
  if (v === 3) return shade(c, 0.55);                                 // gap between boards
  if (x === joint) return shade(c, 0.6);                              // butt joint
  if (v === 0) c = shade(c, 1.12);
  if (v === 1 && (x === joint + 2 || x === wrap(joint - 3))) return hex('3a1c10');    // pegs
  return c;
});

// Tree leaves: individual leaves (3x2 each) lit on the top-left, dark gaps between them,
// and a few holes you can see through. No dithering, so the canopy reads clearly.
const LEAF_SPOTS = [];
for (let i = 0; i < 26; i++) LEAF_SPOTS.push([Math.floor(fract(Math.sin(i * 91.7) * 9999) * 16), Math.floor(fract(Math.sin(i * 47.3) * 9999) * 16), i % 2]);
function leafTile(palette, holeSeed) {
  return tile((x, y) => {
    for (const [lx, ly, flip] of LEAF_SPOTS) {
      const u = wrap(x - lx), v = wrap(y - ly);
      const w = flip ? 2 : 3, h = flip ? 3 : 2;
      if (u >= w || v >= h) continue;
      if (u === 0 && v === 0) return palette[5];                       // lit tip
      if (u === w - 1 && v === h - 1) return palette[2];               // shaded base
      return palette[4 - ((u + v) % 2)];
    }
    if (vnoise(x, y, 2, holeSeed) > 0.8) return CLEAR;                  // see-through gap (2px clusters)
    return vnoise(x, y, 4, holeSeed + 1) > 0.5 ? palette[1] : palette[0];
  });
}
T.LEAVES = leafTile(LEAF, 152);
// Apple tree: the same canopy with red fruit
T.APPLE_LEAVES = tile((x, y) => {
  const fruit = [[3, 4], [11, 2], [7, 10], [13, 12], [2, 13]];
  for (const [fx, fy] of fruit) {
    if (x === fx && y === fy) return hex('ff6b5e');
    if ((x === fx + 1 && y === fy) || (x === fx && y === fy + 1) || (x === fx + 1 && y === fy + 1)) return hex('c41e1e');
  }
  return T.LEAVES.slice((y * N + x) * 4, (y * N + x) * 4 + 4);
});

// Sugar palm (thnaot) trunk: near-black with horizontal leaf-scar rings
T.PALM_LOG_SIDE = tile((x, y) => {
  const ringY = y % 4;
  const base = ramp(SUGAR_PALM_BARK, fbm(x, y, 161) * 0.7 + vnoise(x, y, 2, 162) * 0.3);
  if (ringY === 0) return shade(base, 0.6);
  if (ringY === 1) return shade(base, 1.3);
  if (hash(x, Math.floor(y / 4), 163) > 0.85) return hex('5a3a22');   // old frond base, brown
  return base;
});
T.PALM_LOG_TOP = tile((x, y) => {
  const r = Math.hypot(x + 0.5 - 8, y + 0.5 - 8) + (hash(x, y, 165) - 0.5);
  if (r > 7.2) return ramp(SUGAR_PALM_BARK, hash(x, y, 166));
  return r < 3 ? hex('8a6a46') : (Math.floor(r * 1.5) % 2 ? hex('6e5236') : hex('7d6040'));   // fibrous core
});
// Sugar palm fronds: fan leaves, stiff radiating segments with gaps
T.PALM_LEAVES = tile((x, y) => {
  const a = Math.atan2(y + 0.5 - 16, x + 0.5 - 8);                     // fan rooted below the tile
  const seg = fract(a * 6 / Math.PI);
  if (seg < 0.12) return CLEAR;
  const c = ramp(pal('1e4a1c', '28602a', '337433', '41883e'), seg * 0.9 + vnoise(x, y, 2, 171) * 0.1);
  return seg < 0.24 ? shade(c, 1.25) : c;
});

// Coconut trunk: grey-brown with wavy rings
T.COCONUT_LOG_SIDE = tile((x, y) => {
  const ringY = wrap(y + Math.round(Math.sin(x * 0.4) * 0.6)) % 5;
  const base = ramp(COCONUT_BARK, fbm(x, y, 181) * 0.7 + vnoise(x, y, 2, 182) * 0.3);
  if (ringY === 0) return shade(base, 0.7);
  if (ringY === 1) return shade(base, 1.15);
  return base;
});
T.COCONUT_LOG_TOP = tile((x, y) => {
  const r = Math.hypot(x + 0.5 - 8, y + 0.5 - 8) + (hash(x, y, 185) - 0.5);
  if (r > 7.2) return ramp(COCONUT_BARK, hash(x, y, 186));
  return Math.floor(r * 1.4) % 2 ? hex('c7b28c') : hex('d8c49c');
});
// Coconut fronds: long feather leaflets slanting down from a midrib
T.COCONUT_LEAVES = tile((x, y) => {
  const d = wrap(x + y);
  if (d % 4 === 3) return CLEAR;
  if (x === 7 || x === 8) return hex('b9c46a');                         // midrib
  const c = ramp(pal('5c9a2c', '6eae34', '82c03e', '96cf4c'), (d % 4) / 3 * 0.8 + vnoise(x, y, 2, 191) * 0.2);
  return c;
});

// Banana leaf: broad, glossy, pale midrib, parallel veins, a couple of wind tears
T.BANANA_LEAVES = tile((x, y) => {
  if ((x === 4 && y >= 2 && y <= 6) || (x === 12 && y >= 9 && y <= 13)) return CLEAR;    // tears
  if (x === 7 || x === 8) return x === 7 ? hex('d6e6a0') : hex('b6cc80');
  const vein = wrap(y + Math.abs(x - 7.5) * 0.7) % 3 < 1;
  const c = ramp(pal('3c8a28', '4a9c30', '5aae38', '6cbe44'), fbm(x, y, 195) * 0.6 + 0.3);
  return vein ? shade(c, 0.86) : (x === 6 || x === 9 ? shade(c, 1.12) : c);
});

// Paddy farmland: furrowed red earth; the wet version is darker and shines in the furrows
function farmPixel(x, y, wet) {
  const base = ramp(RED_EARTH, fbm(x, y, 201) * 0.7 + 0.1);
  const ridge = y % 4;
  let c = ridge === 0 ? shade(base, 0.62) : ridge === 1 ? shade(base, 1.12) : base;
  if (wet) {
    c = shade(c, 0.68);
    if (ridge === 0 && hash(x, y, 202) > 0.55) c = hex('6f8c94');       // water in the furrow
  }
  return c;
}
T.FARMLAND_TOP = tile((x, y) => farmPixel(x, y, false));
T.FARMLAND_WET_TOP = tile((x, y) => farmPixel(x, y, true));

/* ---------------------------- ores ---------------------------- */
// Ore nuggets: 4 clusters, each a little bevelled lump (light top-left, dark bottom-right, dark rim)
const NUGGETS = [[3, 3], [10, 2], [6, 8], [12, 10], [2, 12]];
const NUGGET_SHAPE = ['.##.', '####', '.##.'];
function oreTile(cols, seed) {
  const [body, light, dark, rim] = cols.map(hex);
  return tile((x, y) => {
    for (let n = 0; n < NUGGETS.length; n++) {
      const [nx, ny] = NUGGETS[n];
      const u = x - nx, v = y - ny;
      if (v < 0 || v >= NUGGET_SHAPE.length || u < 0 || u >= 4) continue;
      if (NUGGET_SHAPE[v][u] !== '#') continue;
      if (u + v <= 1) return light;
      if (u + v >= 4) return dark;
      return hash(x, y, seed) > 0.7 ? light : body;
    }
    // a dark rim just below/right of each nugget
    for (const [nx, ny] of NUGGETS) {
      const u = x - nx, v = y - ny;
      if ((v === 3 && u >= 1 && u <= 2) || (u === 4 && v === 1)) return rim;
    }
    return T.STONE.slice((y * N + x) * 4, (y * N + x) * 4 + 4);
  }, false);
}
T.COAL_ORE = oreTile(['2a2a2e', '56565e', '141416', '3c3d40'], 211);
T.IRON_ORE = oreTile(['c7956c', 'e8c19c', '8f5e3c', '4d4f52'], 212);
T.BRONZE_ORE = oreTile(['c27a3c', 'e8a868', '7a421c', '4d4f52'], 213);
T.GOLD_ORE = oreTile(['f2c232', 'fff09a', 'b47e10', '4d4f52'], 214);
// Gem ores: cut crystals, a bright facet and a dark facet
function gemOre(cols, seed) {
  const [body, light, dark] = cols.map(hex);
  const gems = [[4, 3], [11, 6], [5, 11]];
  return tile((x, y) => {
    for (const [gx, gy] of gems) {
      const u = x - gx, v = y - gy;
      if (Math.abs(u) + Math.abs(v) > 2) continue;
      if (u < 0 && v <= 0) return light;
      if (u > 0 || v > 0) return Math.abs(u) + Math.abs(v) === 2 ? dark : body;
      return body;
    }
    return T.STONE.slice((y * N + x) * 4, (y * N + x) * 4 + 4);
  }, false);
}
T.DIAMOND_ORE = gemOre(['4de2d6', 'd6fffb', '138a82'], 221);
T.EMERALD_ORE = gemOre(['2cc65c', 'b8ffcc', '0c6a2c'], 222);
T.SAPPHIRE_ORE = gemOre(['2a62dc', 'a8ccff', '0c2a7a'], 223);

/* -------------------------- crafted blocks -------------------------- */
// Crafting table top: a hardwood board with a carved grid and two tools laid on it
T.CRAFTING_TABLE = tile((x, y) => {
  const m = Math.min(x, y, 15 - x, 15 - y);
  const wood = T.WOOD_PLANKS.slice((y * N + x) * 4, (y * N + x) * 4 + 4);
  if (m === 0) return hex('3a1c10');
  if (m === 1) return shade(wood, 1.15);
  if ((x === 5 || x === 10 || y === 5 || y === 10) && m > 1) return shade(wood, 0.65);   // carved 3x3 grid
  return wood;
});
// Crafting table side: legs, an apron, and a saw and chisel hanging on it
T.CRAFTING_TABLE_SIDE = tile((x, y) => {
  const wood = T.WOOD_PLANKS.slice((y * N + x) * 4, (y * N + x) * 4 + 4);
  if (y <= 2) return y === 0 ? hex('3a1c10') : shade(wood, 1.12);
  if (x <= 1 || x >= 14) return x === 0 || x === 15 ? hex('3a1c10') : shade(wood, 0.85);
  if (y >= 5 && y <= 6 && x >= 4 && x <= 10) return x === 4 ? hex('6b4a2a') : hex('c8ccd2');   // saw blade
  if (y >= 7 && y <= 8 && x >= 5 && x <= 10 && (x + y) % 2) return hex('8e939a');            // saw teeth
  if (x === 12 && y >= 5 && y <= 11) return y <= 7 ? hex('c8ccd2') : hex('8f3a22');          // chisel
  return shade(wood, 0.92);
});

// Khmer clay stove (chongkran) front: terracotta bricks, an arched fire mouth with embers
T.FURNACE_FRONT = tile((x, y) => {
  const k = course(x, y, 4, 8, 4);
  let c = ramp(TERRACOTTA, fbm(x, y, 231) * 0.6 + 0.25);
  c = k.edge === 'mortar' ? hex('5a4636') : k.edge === 'lit' ? shade(c, 1.1) : k.edge === 'shadow' ? shade(c, 0.85) : c;
  const ax = x + 0.5 - 8, ay = y + 0.5 - 13;
  const inArch = Math.abs(ax) <= 4 && y >= 8 && (y >= 11 || Math.hypot(ax, (y + 0.5 - 11) * 1.3) <= 4);
  if (inArch) {
    if (y >= 13) return hash(x, y, 232) > 0.45 ? hex('ff8a2a') : hex('c4421a');            // embers
    return hex('1a0d08');
  }
  if (Math.abs(ax) <= 5 && y >= 7 && y <= 15 && !inArch && Math.hypot(ax, (y + 0.5 - 11) * 1.3) <= 5.2) return hex('3a2214');   // arch rim
  return c;
});
T.FURNACE_TOP = tile((x, y) => {
  const r = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
  const c = ramp(TERRACOTTA, fbm(x, y, 235) * 0.6 + 0.25);
  if (r < 3) return hex('1a0d08');                                       // pot hole
  if (r < 4) return shade(c, 0.6);
  if (r < 5) return shade(c, 1.15);
  return c;
});

// Lacquered chest: dark red-brown lacquer, gold corner fittings and a gold lock
function chestPixel(x, y, side) {
  const lac = ramp(pal('3e130c', '4f1a10', '5e2214', '6e2a18'), fbm(x, y, 241) * 0.7 + 0.15);
  const m = Math.min(x, y, 15 - x, 15 - y);
  const corner = (x <= 2 || x >= 13) && (y <= 2 || y >= 13);
  if (m === 0) return hex('1f0a06');
  if (corner) return (x + y) % 3 === 0 ? hex('fff0a0') : hex('d6a52a');
  if (side && y === 5) return hex('1f0a06');                              // lid seam
  if (side && x >= 7 && x <= 8 && y >= 4 && y <= 8) return y === 8 ? hex('8a6410') : hex('f2c64a');   // lock
  if (!side && y === 14 && x >= 7 && x <= 8) return hex('f2c64a');
  if (m === 1) return shade(lac, 1.25);
  return (x + y * 3) % 11 === 0 ? shade(lac, 1.18) : lac;                 // lacquer gloss
}
T.CHEST_TOP = tile((x, y) => chestPixel(x, y, false));
T.CHEST_SIDE = tile((x, y) => chestPixel(x, y, true));

// Wooden door with carved panels; the top half has an Angkor-style turned-baluster window
T.DOOR_BOTTOM = tile((x, y) => {
  const wood = T.WOOD_PLANKS.slice((((y % 4) * 4 + (x % 16)) % 256) * 4, (((y % 4) * 4 + (x % 16)) % 256) * 4 + 4);
  const base = ramp(HARDWOOD, 0.45 + Math.sin(x * 1.3 + y * 0.2) * 0.12 + 0.1);
  if (x <= 1 || x >= 14 || y >= 14) return x === 0 || x === 15 || y === 15 ? hex('2a140a') : shade(base, 0.9);
  if (x === 7 || x === 8) return shade(base, 0.8);                        // centre stile
  const inPanel = (x >= 3 && x <= 5) || (x >= 10 && x <= 12);
  if (inPanel && y >= 2 && y <= 12) {
    const dpx = x <= 6 ? x - 4 : x - 11, dpy = y - 7;
    if (Math.abs(dpx) + Math.abs(dpy) * 0.5 <= 1.5) return shade(base, 1.25);   // carved diamond
    return shade(base, 0.82);
  }
  if (x === 13 && y === 1) return hex('d6a52a');                          // brass ring handle
  return wood ? base : base;
});
T.DOOR_TOP = tile((x, y) => {
  const base = ramp(HARDWOOD, 0.45 + Math.sin(x * 1.3 + y * 0.2) * 0.12 + 0.1);
  if (x <= 1 || x >= 14 || y <= 1) return x === 0 || x === 15 || y === 0 ? hex('2a140a') : shade(base, 0.9);
  if (y >= 3 && y <= 12 && x >= 3 && x <= 12) {
    // stone balusters: round turned bars, every 3rd column
    if ((x - 3) % 3 === 1) {
      const bulge = (y % 3 === 1) ? 1.18 : 1.0;
      return shade(hex('b8a88c'), bulge);
    }
    if ((x - 3) % 3 === 2) return hex('8a7c66');
    return hex('1c1410');                                                  // dark interior behind the window
  }
  return base;
});

// Glass: clean pane, thin frame, two reflections
T.GLASS = tile((x, y) => {
  const m = Math.min(x, y, 15 - x, 15 - y);
  if (m === 0) return hex('cfe4ea');
  if (wrap(x + y) === 12 || wrap(x + y) === 13 || wrap(x + y) === 20 - 16 + 16) return [255, 255, 255, 170];
  if (x + y === 6 || x + y === 7) return [255, 255, 255, 140];
  return CLEAR;
});

// Red paper lantern: gold frame bands, glowing paper, a Khmer kbach pattern stripe
T.LANTERN_SIDE = tile((x, y) => {
  if (y <= 1 || y >= 14) return y === 0 || y === 15 ? hex('7a5214') : hex('e2b23a');
  const glow = 1 - Math.abs(x + 0.5 - 8) / 9;
  let c = mix(hex('a8201a'), hex('ff7a3a'), glow);
  if (y === 7 || y === 8) {
    const kbach = ((x + (y === 8 ? 2 : 0)) % 4) < 2;                     // little flame-motif band
    return kbach ? hex('f2c64a') : shade(c, 0.85);
  }
  if (x % 4 === 0) c = shade(c, 0.8);                                     // paper ribs
  return c;
});
T.LANTERN_TOP = tile((x, y) => {
  const r = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
  if (r < 2) return hex('fff2b0');
  if (r < 6) return Math.floor(Math.atan2(y - 7.5, x - 7.5) * 4 / Math.PI + 8) % 2 ? hex('c8341e') : hex('e05a2a');
  return hex('e2b23a');
});

/* ============================ TOOLS ============================ */
/*
 * Tools are drawn on the diagonal: the grip at the bottom-left, the head at the top-right.
 *   u = distance along the handle (0 at the grip end, ~15 at the top-right)
 *   v = distance across it (negative = the upper-left side, positive = the lower-right side)
 * Each shape returns a part name for (u, v); a bevel pass then lights each part from the top-left
 * and adds a dark outline, so every tool reads clearly at 16x16.
 *
 * THE AXE BLADE IS ON THE UPPER-LEFT SIDE (v < 0) with its cutting edge as the far curve.
 * In the hand the model is turned so that side faces forward, toward what you hit.
 */
const uv = (x, y) => ({ u: (x + 0.5 + (15.5 - (y + 0.5))) / 2, v: ((x + 0.5) + (y + 0.5) - 16) / 2 });

const TOOL_PARTS = {
  handle(u, v, top) {
    if (u < 0.6 || u > top || Math.abs(v) > 0.72) return null;
    if (u > top - 2.2 && u < top - 0.6) return 'wrap';                    // rattan binding under the head
    if (u < 1.8) return 'cap';                                             // brass end cap
    return 'handle';
  },
};

// Room on the tile: a point (u, v) is inside the 16x16 square only while u + |v| <= 15.2,
// so every head sits around u = 10-12 and reaches at most ~4.5 sideways.
const TOOL_SHAPES = {
  // Pick: a curved two-sided head, pointed tips
  pickaxe(u, v) {
    const c = 11.4 - 0.1 * v * v;
    const half = 0.95 - Math.abs(v) * 0.11;
    if (Math.abs(v) <= 4.5 && Math.abs(u - c) <= half) return 'head';
    return TOOL_PARTS.handle(u, v, 11.2);
  },
  // Khmer pouthau: a broad bearded blade on the upper-left side (v < 0); its far curve is the cutting edge.
  // A small poll sits behind the handle on the other side.
  axe(u, v) {
    // Shaped like the axe emoji: the head sits on the top end of the handle and a wedge blade fans out to the
    // upper left, widening toward a curved cutting edge (flared above and below, like a Khmer pouthau)
    const reach = -v;
    if (reach > 0.6 && reach <= 4.1) {
      const top = 10.3 + reach * 0.22 - (reach > 3.4 ? (reach - 3.4) * 0.6 : 0);     // the edge curves back at its tips
      const bottom = 8.7 - reach * 0.55 + (reach > 3.4 ? (reach - 3.4) * 0.9 : 0);
      if (u >= bottom && u <= top) return reach >= 3.0 ? 'edge' : 'head';
    }
    if (v >= 0.6 && v <= 1.5 && u >= 9.0 && u <= 10.4) return 'head';    // small poll behind the handle
    if (Math.abs(v) <= 0.6 && u >= 8.6 && u <= 10.8) return 'head';      // eye around the handle
    return TOOL_PARTS.handle(u, v, 9.0);
  },
  // Spade: a rounded blade with a raised centre ridge
  shovel(u, v) {
    if (u >= 8.8 && u <= 14.2) {
      const w = u > 12.4 ? 2.1 - (u - 12.4) * 1.1 : 2.1;
      if (Math.abs(v) <= w) return Math.abs(v) < 0.45 ? 'edge' : 'head';
    }
    return TOOL_PARTS.handle(u, v, 9);
  },
  // Hoe (chopkab): a flat blade set across the top of the handle, its edge on the far side
  hoe(u, v) {
    if (u >= 11.2 && u <= 12.9 && v >= -4.0 && v <= 0.8) return v < -3.0 ? 'edge' : 'head';
    return TOOL_PARTS.handle(u, v, 11.6);
  },
  // Khmer dav: a single-edged blade widening toward a clipped tip, a round guard, a long grip
  sword(u, v) {
    if (u >= 5.2 && u <= 15.0) {
      const t = (u - 5.2) / 9.8;
      const c = -0.9 * t * t;
      const half = (0.8 + 0.6 * t) * Math.min(1, (15.0 - u) / 1.2);
      const w = v - c;
      if (Math.abs(w) <= half) return w < -half + 0.65 ? 'edge' : 'head';
    }
    if (u >= 4.3 && u < 5.2 && Math.abs(v) <= 2.0) return 'guard';
    if (u >= 1.2 && u < 4.3 && Math.abs(v) <= 0.7) return 'handle';
    if (u >= 0.4 && u < 1.2 && Math.abs(v) <= 1.0) return 'cap';
    return null;
  },
};

const TIERS = {
  WOODEN:  { head: pal('6e4628', '966236', 'c08a52', 'e2b878'), edge: hex('f0d0a0') },
  STONE:   { head: pal('4e5054', '74777b', '9a9da1', 'c4c6c9'), edge: hex('dfe1e3') },
  IRON:    { head: pal('6c7078', '9aa0aa', 'cfd4dc', 'f2f5f8'), edge: hex('ffffff') },
  DIAMOND: { head: pal('137a72', '28b4aa', '4de2d6', 'b8fff8'), edge: hex('eafffd') },
};
const HANDLE = pal('4a1a10', '7a2c1a', 'a8442a', 'c86040');      // red lacquer
const WRAP = pal('6e5422', 'a88a42', 'd8bc6a');                   // rattan
const CAP = pal('6e4c10', 'b88a22', 'f2c64a');                    // brass
const OUTLINE = hex('1a120e');

/** Bevel shading: lit if the top-left neighbour is outside the shape, dark if the bottom-right one is. */
function toolTile(shape, tier) {
  const part = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? null : (() => { const p = uv(x, y); return shape(p.u, p.v); })();
  return tile((x, y) => {
    const p = part(x, y);
    if (!p) {
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => part(x + dx, y + dy));
      return near ? OUTLINE : CLEAR;
    }
    const lit = !part(x - 1, y - 1) || !part(x, y - 1);
    const dark = !part(x + 1, y + 1) || !part(x + 1, y);
    const level = lit ? 3 : dark ? 0 : 1 + ((uv(x, y).v < 0) ? 1 : 0);      // upper half a step lighter
    if (p === 'head') return tier.head[level];
    if (p === 'edge') return lit ? tier.edge : tier.head[Math.max(2, level)];
    if (p === 'handle') return HANDLE[level];
    if (p === 'wrap') return WRAP[(x + y) % 2 ? 2 : 1];
    if (p === 'cap' || p === 'guard') return CAP[Math.min(2, level)];
    return CLEAR;
  }, false);
}
for (const [tierName, tier] of Object.entries(TIERS)) {
  T[tierName + '_PICKAXE'] = toolTile(TOOL_SHAPES.pickaxe, tier);
  T[tierName + '_AXE'] = toolTile(TOOL_SHAPES.axe, tier);
  T[tierName + '_SHOVEL'] = toolTile(TOOL_SHAPES.shovel, tier);
  T[tierName + '_HOE'] = toolTile(TOOL_SHAPES.hoe, tier);
  T[tierName + '_SWORD'] = toolTile(TOOL_SHAPES.sword, tier);
}
// Khmer weapons on the same dav blade
T.SAPPHIRE_SWORD = toolTile(TOOL_SHAPES.sword, { head: pal('0c2a7a', '1e4cc0', '3c78f0', 'a8ccff'), edge: hex('e0ecff') });
T.KHMER_SWORD = toolTile(TOOL_SHAPES.sword, { head: pal('6c7078', 'a8acb4', 'd8dce2', 'f8faff'), edge: hex('f2c64a') });
T.SACRED_SWORD = toolTile(TOOL_SHAPES.sword, { head: pal('1a6e9a', '3aa8d8', '78d6ff', 'd8f6ff'), edge: hex('f2c64a') });
T.GOLDEN_KHAN = toolTile(TOOL_SHAPES.sword, { head: pal('8a5a08', 'c8901a', 'f2c64a', 'fff4b0'), edge: hex('ffffff') });

module.exports = { T, N, helpers: { tile, hash, vnoise, fbm, ramp, shade, mix, hex, pal, course, relief, voronoi } };

/* ======================= CREATURE CONCEPTS (front views) =======================
 * Concept art for the three redesigned creatures. Each is painted as a map of part names
 * with simple shapes, then shaded part by part (lit top-left, dark bottom-right) and outlined.
 */
function sprite(w, h, paint, palettes) {
  const grid = Array.from({ length: h }, () => new Array(w).fill(null));
  const api = {
    rect(x0, y0, x1, y1, p) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (grid[y] && x >= 0 && x < w) grid[y][x] = p; },
    ellipse(cx, cy, rx, ry, p) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) grid[y][x] = p; },
    dot(x, y, p) { if (grid[y] && x >= 0 && x < w) grid[y][x] = p; },
    get: (x, y) => (grid[y] && x >= 0 && x < w) ? grid[y][x] : null,
  };
  paint(api);
  const px = new Array(w * h * 4).fill(0);
  const OUT = hex('140e0c');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = grid[y][x];
    let c = null;
    if (!p) {
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => api.get(x + dx, y + dy))) c = OUT;
    } else {
      const P = palettes[p];
      if (P.length === 1) c = P[0];
      else {
        const lit = api.get(x - 1, y - 1) !== p || api.get(x, y - 1) !== p;
        const dark = api.get(x + 1, y + 1) !== p || api.get(x + 1, y) !== p;
        const lv = lit ? P.length - 1 : dark ? 0 : 1 + (hash(x, y, 9) > 0.75 ? 1 : 0);
        c = P[Math.min(P.length - 1, lv)];
      }
    }
    if (c) { const i = (y * w + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; }
  }
  return { w, h, px };
}

const CONCEPTS = {};

// Naga (replaces the Ender Dragon): a seven-headed serpent, hoods fanned like the Angkor causeway balustrades,
// green-gold scales, a golden flame crest, rising from coils.
CONCEPTS.NAGA = sprite(48, 44, (g) => {
  // coils
  g.ellipse(24, 38, 17, 5, 'scale'); g.ellipse(24, 37, 12, 3, 'belly');
  g.rect(19, 22, 29, 37, 'scale'); g.rect(22, 24, 26, 37, 'belly');
  // seven heads on a fan: outer heads lower
  const heads = [[6, 18], [11, 12], [17, 8], [24, 6], [31, 8], [37, 12], [42, 18]];
  heads.forEach(([hx, hy], i) => {
    // neck from the body to the head
    for (let t = 0; t <= 1; t += 0.05) g.ellipse(24 + (hx - 24) * t, 24 + (hy - 24) * t, 1.8, 1.8, 'scale');
    g.ellipse(hx, hy, 3.4, 4.4, 'scale');           // hood
    g.ellipse(hx, hy + 1, 1.7, 2.8, 'belly');        // hood underside
    g.dot(Math.round(hx - 1.5), hy - 1, 'eye'); g.dot(Math.round(hx + 1), hy - 1, 'eye');
    g.rect(Math.round(hx) - 1, hy - 6, Math.round(hx), hy - 5, 'gold');   // crest
  });
  // golden flame halo behind the middle head
  g.dot(23, 0, 'gold'); g.dot(24, 0, 'gold'); g.dot(22, 1, 'gold'); g.dot(25, 1, 'gold');
}, { scale: pal('1f5a3a', '2f7a4c', '43985e', '6cc07a'), belly: pal('a88a3a', 'd2b24e', 'f0d470'), gold: pal('b8860b', 'f2c64a', 'fff0a0'), eye: [hex('ff3a2a')] });

// Dvarapala (replaces the golem): a sandstone temple guardian with a tall mkot crown,
// a sampot, a sash, and a gada club planted at his side.
CONCEPTS.DVARAPALA = sprite(30, 46, (g) => {
  g.rect(13, 0, 16, 1, 'gold'); g.rect(12, 2, 17, 3, 'gold'); g.rect(11, 4, 18, 5, 'gold');    // tiered mkot crown
  g.rect(10, 6, 19, 6, 'gold');
  g.ellipse(14.5, 11, 5, 5, 'stone');                                                          // head
  g.rect(9, 9, 10, 13, 'gold'); g.rect(19, 9, 20, 13, 'gold');                                 // ear ornaments
  g.dot(12, 10, 'eye'); g.dot(17, 10, 'eye');                                                  // bulging eyes
  g.rect(12, 13, 17, 13, 'dark');                                                              // moustache
  g.rect(9, 17, 20, 28, 'stone');                                                              // torso
  g.rect(10, 17, 19, 18, 'gold'); g.dot(14, 19, 'gold'); g.dot(15, 19, 'gold');               // necklace
  g.rect(5, 17, 7, 27, 'stone'); g.rect(22, 17, 24, 26, 'stone');                              // arms (separate from the body)
  g.rect(5, 23, 7, 23, 'gold'); g.rect(22, 23, 24, 23, 'gold');                                // armbands
  g.rect(8, 29, 21, 35, 'sampot'); g.rect(8, 29, 21, 29, 'gold'); g.rect(13, 30, 16, 38, 'sampot');   // sampot + front fold
  g.rect(9, 36, 12, 44, 'stone'); g.rect(17, 36, 20, 44, 'stone');                             // legs
  g.rect(25, 22, 27, 44, 'club'); g.ellipse(26, 20, 2.8, 3.4, 'club');                        // gada club, head up
}, { stone: pal('7a6c58', '9d8f78', 'bcac91', 'd6c6a8'), gold: pal('b8860b', 'f2c64a', 'fff0a0'), sampot: pal('5a1a22', '8a2a34', 'b04050'), club: pal('4a3a2c', '6e5a44', '927a5c'), eye: [hex('ffcc40')], dark: [hex('3a2c20')] });

// Laterite spirit (replaces the Creeper body): a squat porous boulder with a carved face,
// moss on its crown, two stubby stone feet.
CONCEPTS.LATERITE_SPIRIT = sprite(28, 28, (g) => {
  g.ellipse(14, 17, 11, 8.5, 'rock');               // body boulder
  g.rect(6, 5, 21, 15, 'rock');                     // carved head block
  g.rect(5, 3, 22, 5, 'moss'); g.dot(8, 6, 'moss'); g.dot(19, 6, 'moss'); g.dot(14, 6, 'moss');
  g.rect(12, 7, 15, 7, 'carve');                    // brow mark
  g.rect(8, 9, 10, 9, 'glow'); g.rect(17, 9, 19, 9, 'glow');     // glowing eye slits
  g.rect(8, 10, 10, 10, 'carve'); g.rect(17, 10, 19, 10, 'carve');
  g.dot(9, 13, 'carve'); g.rect(10, 14, 17, 14, 'carve'); g.dot(18, 13, 'carve');   // carved smile
  [[8, 19], [12, 22], [18, 20], [21, 17], [6, 16]].forEach(([x, y]) => g.dot(x, y, 'pit'));
  g.rect(7, 24, 11, 27, 'rock'); g.rect(16, 24, 20, 27, 'rock');   // feet
}, { rock: pal('6e2e18', '9a4624', 'bf6635', 'd8884e'), moss: pal('3e6a24', '5a8a30', '84b04a'), carve: [hex('3a1408')], glow: [hex('ffb030')], pit: [hex('3e170b')] });

module.exports.CONCEPTS = CONCEPTS;

/* ============================ FACES (8x8) ============================
 * Hand-drawn faces, one character per pixel. Rules for clarity:
 * two-tone eyes (white + pupil), a defined nose or muzzle, a darker
 * outer edge so the head reads as a shape, no random noise.
 */
const FACE_ART = {
  // Khmer black pig: dark grey, pink snout with nostrils
  pig: ['bBBBBBBb', 'BBlBBlBB', 'BWEBBEWB', 'BBBBBBBB', 'BBSSSSBB', 'BBSsSsBB', 'BBSSSSBB', 'bBBBBBBb'],
  // Khmer white cow: cream face, dark eyes, grey-pink muzzle
  cow: ['cCCCCCCc', 'CCCCCCCC', 'CWECCEWC', 'CCCCCCCC', 'CCMMMMCC', 'CMmMMmMC', 'CMMMMMMC', 'cCMMMMCc'],
  // Rooster: red comb, yellow beak, wattle
  chicken: ['oORRROOo', 'OOORROOO', 'OWEOOEWO', 'OOOYYOOO', 'OOOYyOOO', 'OOORROOO', 'OOORROOO', 'oOOOOOOo'],
  // Brown horse with a white blaze
  horse: ['hhHBBHhh', 'HHHBBHHH', 'HEHBBHEH', 'HHHBBHHH', 'HHHBBHHH', 'HHMMMMHH', 'HMNMMNMH', 'hMMMMMMh'],
  // Villager: krama headband, separate brows, small nose, smile
  villager: ['KKKKKKKK', 'RwRwRwRw', 'SBBSSBBS', 'SWESSEWS', 'SSSSSSSS', 'SSSNNSSS', 'SSMSSMSS', 'sSSMMSSs'],
  // Wandering trader: blue checked krama hood framing the face
  trader: ['UuUuUuUu', 'uUuUuUuU', 'USSSSSSU', 'UWESSEWU', 'USSSSSSU', 'USSNNSSU', 'USMMMMSU', 'UUSSSSUU'],
  // Zombie: sunken eye sockets with red pupils, ragged mouth
  zombie: ['gGGGGGGg', 'GGGgGGGG', 'GDDGGDDG', 'GDRGGRDG', 'GGGggGGG', 'GMMMMMMG', 'GMTMMTMG', 'gGGGGGGg'],
  // Skeleton: skull, deep sockets, nasal cavity, teeth
  skeleton: ['wWWWWWWw', 'WWWWWWWW', 'WKKWWKKW', 'WKKWWKKW', 'WWWkkWWW', 'wWWWWWWw', 'wKWKWKWw', 'wwWWWWww'],
  // Spider: eight red eyes, fangs
  spider: ['KKKKKKKK', 'KrKKKKrK', 'KKRKKRKK', 'KRRKKRRK', 'KKKKKKKK', 'KrKkkKrK', 'KKFKKFKK', 'kKFKKFKk'],
  // Yeak: green giant, gold crown band, red eyes, tusks
  yeak: ['YYYYYYYY', 'GGYGGYGG', 'GDDGGDDG', 'GWRGGRWG', 'GGGggGGG', 'GMMMMMMG', 'GTMMMMTG', 'gTGGGGTg'],
  // Preay: pale ghost, long black hair, red eyes
  preay: ['HHHHHHHH', 'HHHHHHHH', 'HPPPPPPH', 'HPRPPRPH', 'HPPPPPPH', 'HPPppPPH', 'HPPMMPPH', 'HpPMMPpH'],
  // Tiger: orange with black stripes, white muzzle
  tiger: ['OKOKKOKO', 'OOKOOKOO', 'OYEOOEYO', 'KOOOOOOK', 'OWWNNWWO', 'WWWNNWWW', 'WWWWWWWW', 'oWWWWWWo'],
  // Laterite spirit: moss cap, carved brow, glowing eye-slits, carved smile
  laterite_spirit: ['MmMMmMMm', 'LLLKKLLL', 'LLLLLLLL', 'LAALLAAL', 'LKKLLKKL', 'LLLLLLLL', 'LKLLLLKL', 'LLKKKKLL'],
  // Dvarapala: sandstone face, gold crown, amber eyes, moustache
  dvarapala: ['YYYYYYYY', 'sYSYYSYs', 'SDDSSDDS', 'SEDSSDES', 'SSSssSSS', 'SDDDDDDS', 'SSSDDSSS', 'sSSSSSSs'],
};
const FACE_PAL = {
  pig: { b: '2a2428', B: '3a3438', l: '4c464a', W: 'f0f0f0', E: '111111', S: 'a87a80', s: '5a3a40' },
  cow: { c: 'cfc5ae', C: 'e8e0cc', W: 'f8f6f0', E: '2a201c', M: '9a8a80', m: '4a3a34' },
  chicken: { o: 'a8441c', O: 'c8582a', R: 'e02828', Y: 'f0b020', y: 'c88a10', W: 'f8f8f8', E: '111111' },
  horse: { h: '5e3618', H: '7a4a24', B: 'eae4d8', E: '1a1008', M: '5a3a20', N: '2a1a10' },
  villager: { K: '181210', R: 'c43030', w: 'f2efe6', S: 'ac7650', s: '966040', B: '3a2618', W: 'f2f2ec', E: '2e1e14', N: '8e5a3a', M: '7a3e2c' },
  trader: { U: '2660c4', u: '5a90f0', S: 'b98258', W: 'f2f2ec', E: '2e1e14', N: '9a6640', M: '6b3a2a' },
  zombie: { g: '7a8676', G: '8f9b89', D: '1e2a1c', R: 'd02020', M: '22281c', T: 'c8c2b2' },
  skeleton: { w: 'b8b8ae', W: 'd6d6cc', K: '1a1a1a', k: '4a4a44' },
  spider: { K: '2a2222', k: '1c1616', R: 'ff3030', r: 'b01818', F: 'cfc7b8' },
  yeak: { Y: 'e6b84f', G: '3c8e6c', g: '2c6e52', D: '1a4634', W: 'fff2b0', R: 'c01818', M: '6a1010', T: 'f6f2e0' },
  preay: { H: '0c0a0a', P: 'd6dcd6', p: 'b8c0b8', R: 'e01818', M: '3a0a0a' },
  tiger: { O: 'e08a2c', o: 'c06e1c', K: '1a1410', W: 'f2e6d0', Y: 'd8c040', E: '101010', N: '2a1a14' },
  laterite_spirit: { M: '5a8a30', m: '3e6a24', L: 'a85030', K: '3a1408', A: 'ffb030' },
  dvarapala: { Y: 'f2c64a', S: 'bcac91', s: '9d8f78', D: '3a2c20', E: 'ffcc40' },
};
const FACES = {};
for (const [name, rows] of Object.entries(FACE_ART)) {
  const px = [];
  rows.forEach((row, y) => {
    if (row.length !== 8) throw new Error(`face ${name} row ${y} is ${row.length} wide`);
    for (const ch of row) {
      const c = FACE_PAL[name][ch];
      if (!c) throw new Error(`face ${name}: colour ${ch} missing`);
      px.push(...hex(c));
    }
  });
  FACES[name] = { w: 8, h: 8, px };
}
module.exports.FACES = FACES;
