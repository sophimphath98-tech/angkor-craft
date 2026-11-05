/**
 * Minecraft-style crafting engine for 2x2 (inventory) and 3x3 (Crafting Table) grids.
 *
 * Grids are flat arrays read row by row: 4 slots for 2x2, 9 slots for 3x3.
 * A slot holds an item id string ("oak_planks") or null. undefined, "" and "air" also count as empty.
 *
 *   checkRecipe3x3(grid) -> { id, name, count } | null
 *   checkRecipe2x2(grid) -> { id, name, count } | null
 *
 * Matching works like Minecraft:
 * - Position independent: empty rows and columns around the items are trimmed, so a shovel works in any column.
 * - Mirroring: a recipe also matches when flipped left-to-right (an axe facing either way).
 * - Size: the 2x2 grid crafts any recipe whose trimmed shape fits in 2x2 (sticks, crafting table, shears).
 *
 * No dependencies. Works in the browser (adds globals) and in Node (module.exports).
 */
(function (root) {
    'use strict';

    // ---------- Recipe database ----------
    // Each recipe: id, name, count, size (2 or 3), and pattern: a flat array of size*size slots.
    const _ = null;
    const MINECRAFT_RECIPES = {};

    function addRecipe(id, name, count, size, pattern) {
        if (pattern.length !== size * size) {
            throw new Error(`Recipe "${id}" needs ${size * size} slots, got ${pattern.length}`);
        }
        MINECRAFT_RECIPES[id] = { id, name, count, size, pattern };
    }

    // Tool tiers: the material and the prefix used in the result id and name
    const TOOL_TIERS = [
        { material: 'oak_planks', id: 'wooden', name: 'Wooden' },
        { material: 'cobblestone', id: 'stone', name: 'Stone' },
        { material: 'iron_ingot', id: 'iron', name: 'Iron' },
        { material: 'gold_ingot', id: 'golden', name: 'Golden' },
        { material: 'diamond', id: 'diamond', name: 'Diamond' }
    ];

    // Tool shapes, with "M" standing for the tier's material
    const TOOL_SHAPES = {
        pickaxe: ['M', 'M', 'M', _, 'stick', _, _, 'stick', _],
        axe: ['M', 'M', _, 'M', 'stick', _, _, 'stick', _],
        shovel: [_, 'M', _, _, 'stick', _, _, 'stick', _],
        hoe: ['M', 'M', _, _, 'stick', _, _, 'stick', _],
        sword: [_, 'M', _, _, 'M', _, _, 'stick', _]          // not in the brief, but part of every tier
    };

    for (const tier of TOOL_TIERS) {
        for (const [tool, shape] of Object.entries(TOOL_SHAPES)) {
            const label = tool.charAt(0).toUpperCase() + tool.slice(1);
            addRecipe(`${tier.id}_${tool}`, `${tier.name} ${label}`, 1, 3,
                shape.map(slot => (slot === 'M' ? tier.material : slot)));
        }
    }

    // Utility tools
    addRecipe('shears', 'Shears', 1, 3, [_, 'iron_ingot', _, 'iron_ingot', _, _, _, _, _]);
    addRecipe('bucket', 'Bucket', 1, 3, ['iron_ingot', _, 'iron_ingot', _, 'iron_ingot', _, _, _, _]);
    addRecipe('fishing_rod', 'Fishing Rod', 1, 3, [_, _, 'stick', _, 'stick', 'string', 'stick', _, 'string']);
    addRecipe('flint_and_steel', 'Flint and Steel', 1, 3, ['iron_ingot', _, _, _, 'flint', _, _, _, _]);
    addRecipe('compass', 'Compass', 1, 3, [_, 'iron_ingot', _, 'iron_ingot', 'redstone_dust', 'iron_ingot', _, 'iron_ingot', _]);
    addRecipe('spyglass', 'Spyglass', 1, 3, [_, 'amethyst_shard', _, _, 'copper_ingot', _, _, 'copper_ingot', _]);

    // Basic 2x2 recipes
    addRecipe('crafting_table', 'Crafting Table', 1, 2, ['oak_planks', 'oak_planks', 'oak_planks', 'oak_planks']);
    addRecipe('stick', 'Stick', 4, 2, ['oak_planks', _, 'oak_planks', _]);      // two planks stacked vertically

    // ---------- Shape helpers ----------
    function isEmpty(slot) {
        return slot === null || slot === undefined || slot === '' || slot === 'air';
    }

    // Cuts away empty rows and columns around the items: { w, h, cells } (cells is h*w, row by row)
    function trim(flat, size) {
        let top = size, bottom = -1, left = size, right = -1;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (isEmpty(flat[r * size + c])) continue;
                top = Math.min(top, r); bottom = Math.max(bottom, r);
                left = Math.min(left, c); right = Math.max(right, c);
            }
        }
        if (bottom < 0) return null;                          // nothing in the grid
        const w = right - left + 1, h = bottom - top + 1;
        const cells = [];
        for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
                const slot = flat[r * size + c];
                cells.push(isEmpty(slot) ? null : slot);
            }
        }
        return { w, h, cells };
    }

    function mirror(shape) {
        const cells = [];
        for (let r = 0; r < shape.h; r++) {
            for (let c = shape.w - 1; c >= 0; c--) cells.push(shape.cells[r * shape.w + c]);
        }
        return { w: shape.w, h: shape.h, cells };
    }

    function sameShape(a, b) {
        return a.w === b.w && a.h === b.h && a.cells.every((cell, i) => cell === b.cells[i]);
    }

    // Every recipe trimmed once, plus its mirror image when that differs
    const COMPILED = Object.values(MINECRAFT_RECIPES).map(recipe => {
        const shape = trim(recipe.pattern, recipe.size);
        const flipped = mirror(shape);
        return { recipe, variants: sameShape(shape, flipped) ? [shape] : [shape, flipped] };
    });

    // ---------- Engine ----------
    function checkRecipe(gridArray, size) {
        if (!Array.isArray(gridArray) || gridArray.length !== size * size) {
            throw new TypeError(`Expected an array of ${size * size} slots for a ${size}x${size} grid`);
        }
        const input = trim(gridArray, size);
        if (!input) return null;
        for (const { recipe, variants } of COMPILED) {
            if (variants.some(shape => sameShape(shape, input))) {
                return { id: recipe.id, name: recipe.name, count: recipe.count };
            }
        }
        return null;
    }

    function checkRecipe3x3(gridArray) {
        return checkRecipe(gridArray, 3);
    }

    // The trimmed input is at most 2x2 here, so only recipes that fit in 2x2 can match
    function checkRecipe2x2(gridArray) {
        return checkRecipe(gridArray, 2);
    }

    const api = { MINECRAFT_RECIPES, checkRecipe2x2, checkRecipe3x3 };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
