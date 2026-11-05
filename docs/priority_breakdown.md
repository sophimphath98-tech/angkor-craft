# Priority Breakdown & Codebase Audit

This document provides a verified audit of what is currently implemented in **Minecraft (JavaScript Edition)**, details how the Endgame/Dragon fight functions, and prioritizes minimal, high-value Minecraft features that can be added next.

---

## 1. Verified Implementation Status

A comprehensive review of `game.js` (9,887 lines) reveals that the core survival loop, crafting, farming, village ecosystem, and the entire End dimension boss fight are **already implemented and operational**.

| System / Feature | Current Status | Details in Codebase |
|---|:---:|---|
| **Inventory & Crafting** | ✅ **Implemented** | 27 inventory slots + 9 hotbar slots. Personal 2×2 crafting grid (`E` key), 3×3 Crafting Table, shaped/shapeless recipe matcher, recipe book. |
| **Tools & Durability** | ✅ **Implemented** | Pickaxes, Swords, Axes, Shovels, Hoes in Wood, Stone, Iron, Diamond tiers. Tool wear/breakage with durability bars. |
| **Smelting & Furnace** | ✅ **Implemented** | Placed furnace with input, fuel, output slots. Real-time progress bar; smelts ores into ingots, cooks raw food, burns wood/coal. Persisted with world. |
| **Farming & Agriculture** | ✅ **Implemented** | Hoes till soil into Farmland (moist near water). Wheat seeds, 8 visual growth stages, bone meal acceleration, wheat harvesting, bread crafting. |
| **Animal Husbandry** | ✅ **Implemented** | Cows, Pigs, Chickens, Sheep (drops wool), Horses. Food luring, heart particle love mode, breeding, baby animals with growth timers. |
| **Villages & Trading** | ✅ **Implemented** | Procedural villages on plains biomes with paths, lamp posts, wells, and furnished houses. Robed villagers (Farmer, Toolsmith, Mason, Cleric) with emerald trading UI. |
| **Beds & Day/Night Cycle** | ✅ **Implemented** | 24-hr celestial day/night cycle. 2-block beds, night skip to 6:00 AM, nearby monster check ("Monsters nearby!"), respawn point tracking. |
| **Mobs & Combat** | ✅ **Implemented** | Passive animals + hostile monsters (Zombies, Skeletons with bows burning in daylight, Creepers fusing/exploding, Spiders). Fall damage, underwater oxygen, health/armor HUD. |
| **Stronghold & The End** | ✅ **Implemented** | Eye of Ender tracking, underground stone-brick Stronghold, End Portal frame activation, End dimension, obsidian pillars with healing crystals, full Ender Dragon boss fight. |
| **Bow & Arrow** | ✅ **Implemented** | Hold right-click to draw (up to 1 s, charge bar), release to shoot. Arrows hurt mobs, destroy Ender Crystals and damage the dragon. |
| **Storage Chests** | ✅ **Implemented** | 27-slot chest modal next to your inventory, Shift-click transfer, contents saved per coordinate and dropped when the chest breaks. |
| **Buckets & Water** | ✅ **Implemented** | Bucket scoops water, Water Bucket pours a source block (breaks falls, hydrates farmland). |
| **Shield** | ✅ **Implemented** | Hold right-click to raise: blocks arrows completely, halves zombie, skeleton, spider and dragon melee damage. |
| **Armor & Equipment** | ✅ **Implemented** | Iron and diamond helmet, chestplate, leggings and boots (+15 / +20 armor, 4% damage reduction per point, max 80%). Four armor slots in the survival inventory (hidden at the crafting table), an off-hand shield slot, Shift-click or right-click to wear, saved with the world, visible on your avatar and in multiplayer. |
| **Recipe Book** | ✅ **Implemented** | Green book button left of the crafting grid (2×2 and 3×3) opens a sliding drawer with All / Blocks / Tools / Food / Items tabs; click a recipe to auto-fill the grid. |
| **Leaf Loot & Saplings** | ✅ **Implemented** | Breaking oak leaves rolls 5% Oak Sapling, 0.5% Apple, 2% for 1-2 Sticks. Saplings plant on grass or dirt and grow into oak trees (about a minute on average). |
| **Action Sounds** | ✅ **Implemented** | `playActionSound(tool, block)`: axe on wood chops, anything on plants rustles, pickaxe on rock clinks. Optional `sounds/dig/{wood,grass,stone}.mp3` override the built-in synth. |
| **Hostile Mob Overhaul** | ✅ **Implemented** | Pixel-art skins (creeper face, skeleton skull and ribcage, zombie decay, 8-eyed spider). Creeper blasts carve a sphere out of the world (power 3, charged 6) with per-block resistance; skeletons aim, draw and fire every 2 s with line of sight; zombies raise their arms and call a horde (35 blocks); spiders climb walls and pounce. All mobs now collide with walls. Dedicated sounds for the creeper fuse and blast, bow draw and shot, zombie bite and spider hiss, pounce and bite. |
| **Weather & Sun Damage** | ✅ **Implemented** | CLEAR / RAIN / THUNDERSTORM cycle (saved with the world, synced in multiplayer, `/weather clear\|rain\|thunder`). Rain streaks, rain sound, darker skies. Rain blocks daylight burning and puts fires out at once; lightning strikes charge creepers (radius 6). Zombies and skeletons burn in clear daylight (2 damage per second, sizzle sound each second, pixel flames). |
| **Animals, Villagers & Traders** | ✅ **Implemented** | Animals no longer sink into the ground (swept vertical collision plus `alignEntityOnBlock`). Pig, cow and chicken have real faces; villagers have the unibrow, emerald eyes and job outfits (Farmer, Librarian, Weaponsmith, Toolsmith, Mason, Cleric). Trading levels Novice to Master (saved with the world), a Wandering Trader with a blue robe and sparkles, carrots for pigs, idle sounds every 10-20 s, and species-specific hit squeaks. |
| **Iron Golem** | ✅ **Implemented** | Every village gets one or two (two only in villages with 5+ houses) at random spots between the houses. It patrols, smashes hostile mobs within 16 blocks (7-13 damage, big launch), turns on a player who hits it or a villager, and drops 3-5 iron ingots. Building one from iron blocks is not in yet. |
| **Multiplayer** | ✅ **Implemented** | WebRTC PeerJS & BroadcastChannel, room hosting/joining, block sync, player avatars with walking legs and held tool animations. |

---

## 2. Deep Dive: How Finding & Fighting the Dragon Works

The entire end-game loop is currently playable in `game.js`:

### A. Obtaining Eyes of Ender
In vanilla Minecraft, players venture to the Nether for Blaze Powder. In this JavaScript edition, this is streamlined:
1. **Crafting Recipe (Shapeless):** 1 Diamond + 1 Coal → 1 Eye of Ender (`E` 2×2 or Crafting Table).
2. **Villager Trading:** Cleric villagers sell 1 Eye of Ender for 6 Emeralds.

### B. Locating the Stronghold
1. Hold the **Eye of Ender** and **right-click in the air**.
2. The eye launches skyward, emitting glowing green particles, and flies in the direction of the Stronghold.
3. System chat outputs the compass direction and distance:
   * *Example:* `"The Eye of Ender drifts north-east... (about 240 blocks away)"*
4. When you are within 14 blocks of the Stronghold, the Eye dives straight down into the ground:
   * *"The eye dives into the ground. The stronghold is directly below: dig down!"*
5. The eye has an 80% chance to drop back as an item to pick up, and a 20% chance to shatter.
6. Digging down reveals an underground stone-brick Stronghold at depth `y=2-9`.

### C. Activating the End Portal
1. Inside the portal room, a ring of 12 **End Portal Frames** sits above a pool.
2. 3 frames are pre-filled; hold an **Eye of Ender** and right-click the empty frames.
3. When all 12 are inserted, the 3×3 starry black End Portal lights up with an explosion and portal hum sound.
4. Step into the portal to travel to **The End**.

### D. The Ender Dragon Boss Fight
1. **The End Island:** A floating End Stone asteroid floating in the void at `(6000, 6000)`.
2. **Obsidian Pillars & Ender Crystals:** 6 tall obsidian pillars each hold an Ender Crystal encased in glass.
   * Crystals emit continuous pink healing laser beams to the dragon (healing 0.4 HP/s).
   * Attacking a crystal destroys it in an explosion (knocking back nearby players). All crystals must be broken to prevent healing.
3. **Dragon Behaviors (100 HP Boss Bar):**
   * **Circling Phase:** Circles high above the island, launching homing purple dragon fireballs that explode on impact.
   * **Charging Phase:** Dives down directly at the player, dealing ramming damage and vertical knockback.
   * **Perching Phase:** Lands on the central bedrock fountain and spews a wide purple breath cloud. This is the prime opportunity for melee sword strikes.
4. **Victory & Return:**
   * On defeat, the dragon dissolves in radiating light rays, showering the player in XP levels.
   * The central exit portal activates, and the **VICTORY** title screen appears.
   * Stepping into the fountain returns the player back to their Overworld spawn.

---

## 3. Recommended Minimal Additions (Ranked by Priority)

To make the game feel complete without feature creep or bloat, the following minimal additions are recommended:

### 🔴 High Priority: Essential Gameplay Gaps — ✅ done

| Feature | Why It's Needed | Implementation Scope |
|---|---|---|
| **1. Bow & Arrow for Player** ✅ | Skeletons already shoot arrows, but the player has no ranged weapon. Bows are crucial for shooting tall Ender Crystals without having to pillar up, and for keeping Creepers at bay. | • Add item `BOW` (3 Sticks + 3 Wool, string pattern).<br>• Add item `ARROW` (Cobblestone over Stick over Raw Chicken, makes 4; there is no feather item).<br>• Left/right-click charging to fire arrows using the existing `MobManager.spawnArrow` logic. |
| **2. Storage Chests** ✅ | The inventory is 36 slots; currently players must discard excess items. Placed chests provide persistent home storage. | • Add block `CHEST` (8 Wood Planks in Crafting Table).<br>• Right-clicking opens a 27-slot chest modal alongside player inventory.<br>• Chest contents saved per-coordinate in world storage. |

### 🟡 Medium Priority: Iconic Survival Mechanics — Water Bucket and Shield ✅ done

| Feature | Why It's Needed | Implementation Scope |
|---|---|---|
| **3. Water Bucket** ✅ | One of Minecraft's most versatile tools: creates farmlands anywhere, quenches falls (MLG water drop), and allows climbing steep cliffs. | • Add item `BUCKET` (3 Iron Ingots in V-shape).<br>• Right-click water to fill (`WATER_BUCKET`), right-click ground to place a water source block. Water is static (sources do not flow). |
| **4. Shield / Blocking** ✅ | Combat against skeletons and creepers is punishing without a guard mechanic. | • Add item `SHIELD` (1 Iron Ingot + 6 Wood Planks).<br>• Hold right-click to block 100% of projectile damage and reduce melee damage. |
| **5. Iron Golem** ✅ (natural spawn; no iron-block build yet) | Gives villages an active defender against zombies and adds an iconic protector mob. | • Spawns naturally in villages, or constructed from 4 Iron Blocks + 1 Carved Wood/Block.<br>• Attacks nearby hostile monsters with high knockback. |

### 🟢 Low Priority: Nice-to-Have Polish

| Feature | Description |
|---|---|
| **6. The Nether (Compact Dimension)** | 4×5 Obsidian frame lit with fire teleports to a red Netherrack cavern with Lava and Blazes. (Currently optional since Eye of Ender has an Overworld craft recipe). |
| **7. Boats** | 5 Wood Planks → Boat. Fast travel across ocean biomes without consuming hunger. |
| **8. Wooden Signs** | Placeable sign with custom 3-line text for labelling bases and chests. |

---

## 4. Implementation Notes (steps 1-4 complete)

| Item | Recipe (crafting table) | Notes |
|---|---|---|
| Bow | `.SW / S.W / .SW` (S Stick, W Wool) | No durability; needs an arrow in the inventory unless in creative. |
| Arrow x4 | Cobblestone / Stick / Raw Chicken (vertical) | Full-draw arrow deals 6 damage. |
| Chest | 8 Oak Planks in a ring | Contents are per client: chest inventories are not synced in multiplayer. |
| Bucket | 3 Iron Ingots in a V | Stacks to 16; the Water Bucket does not stack. |
| Shield | Planks and 1 Iron Ingot (`PIP / PPP / .P.`) | Holding it blocks from any direction. Also goes in the off-hand slot: it then raises on right-click when your main hand is empty or holds a tool or weapon. |
| Armor | Iron or diamond: helmet `MMM / M.M`, chestplate `M.M / MMM / MMM`, leggings `MMM / M.M / M.M`, boots `M.M / M.M` | No armor durability yet. In creative, `R` dresses you in a full set (none, iron, diamond). |

Interactions with doors, beds, furnaces, crafting tables and chests take priority over the bow and shield, as in vanilla.

## 5. Original Action Plan (all done)

1. **Step 1:** Implement **Bow & Arrow** (Player ranged weapon for Creeper defense and Ender Crystal snipes).
2. **Step 2:** Implement **Storage Chest** (27-slot container block for base storage).
3. **Step 3:** Implement **Water Bucket** (Pickup and placement of water blocks).
4. **Step 4:** Implement **Shield** (Hold right-click to deflect skeleton arrows).
