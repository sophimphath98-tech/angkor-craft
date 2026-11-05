# Core Systems Overview

A high-level map of the subsystems in **Minecraft JavaScript Edition**. Everything lives in `game.js` (one IIFE) plus `index.html` and `style.css`. Search for the section banner comments (`// ====` blocks) to jump to a system.

Status: all ten core systems are complete. The last audit (see each section's "Gaps closed") filled the holes that were found.

---

## 1. Game Loop & Rendering ✅
- **Code:** `animate()`, three.js `WebGLRenderer`, `scene`, `camera`.
- Runs on `requestAnimationFrame` with the frame time clamped to 80 ms. Each frame: day/night, player physics and survival, chunk streaming, mobs, End dragon, torch lights, particles, item entities, then render.
- Two scenes: the game `scene`, and a separate `titleScene` (a spinning island diorama) used while no world is running.
- **Torch light:** the 4 nearest torches become `PointLight`s (flickering) and every nearby torch emits ember particles (`updateTorchLights`).
- *Gaps closed:* torches used to be decoration only.

## 2. World & Chunk Management ✅
- **Code:** `VoxelWorld`, `Chunk`, `getBiome()`, `generateChunk()`, `buildChunkMesh()`.
- 16x16x32 chunks stored as a flat `Uint8Array`, streamed in a radius around the player and unloaded when far away.
- **Biomes:** Plains, Forest (dense trees) and Desert (sand) from low-frequency simplex noise.
- **Seeds:** every world has a seed (`seedFromText`: blank = random, digits = that number, text = hashed). `setWorldSeed()` rebuilds the noise.
- **Persistence:** player edits are kept per chunk in `world.edits` (so unloading a chunk never loses a build). Worlds are saved to `localStorage` (`saveGame`, `serializeWorld`, `enterSavedWorld`): seed, mode, time of day, position, stats, inventory, every edited block and the dragon fight state. Autosave every 30 s, on quit-to-title, and when the tab is hidden or closed. The world list supports create (with seed and game mode), play, and two-step delete.
- Structures: a hidden stronghold with an End portal, the End island (see `docs/end_and_dragon.md`), and **villages** on flat plains (`getVillageInRegion`, `buildVillagePlan`, `VoxelWorld.buildVillage`): a well, 4-6 houses, gravel paths and lamp posts, flattened into the terrain. `terrainHeightAt()` is the shared height function.
- *Gaps closed:* biomes (F3 used to hard-code "Plains"), per-world seeds, real saving (worlds were only names), working Delete button.

## 3. Block / Texture Atlas ✅
- **Code:** `createTextureAtlas()`, `getBlockFaceTile()`, `getBlockIconDataURL()`, `getTileUV()`.
- 256x256 canvas of 16x16 tiles (`TILES`, ids 0-57) drawn procedurally: blotchy stone, rounded cobblestone, bark, end-grain rings, planks, ores, tools, food, End blocks and 10 crack-decal stages. UVs are inset a quarter texel so tiles never bleed.
- Inventory icons are isometric cubes for blocks and flat sprites for items.

## 4. Player & Inventory System ✅
- **Code:** `Player`, `InventorySystem`, the GUI section (`openGui`, `guiClickSlot`, `guiQuickMove`).
- 9-slot hotbar, 27-slot inventory, 2x2 grid on `E`, 3x3 grid at a Crafting Table. Inventory moves are **left-click only** (right-click is reserved for the world: place a block, eat, open a Crafting Table, use an Eye of Ender; it never attacks). Left click moves a stack, **press, drag and release** a stack over one slot to drop it all there, or **hold and sweep** it across several slots to spread it (the slot it came from is not included) (shared evenly with the remainder staying on the cursor; a live preview shows the result), **Shift-click** quick-moves between hotbar and inventory and crafts everything possible from the output.
- **Q** drops one item (**Ctrl+Q** the stack) with a pickup delay; the item name pops up above the hotbar when you switch slots.
- Survival: health, hunger, oxygen, XP, fall damage, and short invulnerability after a hit. Armor tiers start at none (the armor bar stays blank until armor is worn; `R` cycles tiers) and are drawn on the character.
- **Your character:** the `E` window shows a live 3D preview of your avatar (it turns toward the cursor and shows the held item and armor). `F5` / `V` or `/camera` switch to a third-person view of the same model.
- **Game modes:** Survival and Creative (unlimited blocks, instant mining, no damage, double-tap Space to fly). `/gamemode` switches in game.
- *Gaps closed:* dropping items, shift-click, name popup, a working Game Mode button.

## 5. Crafting Engine ✅
- **Code:** `RECIPES`, `matchRecipe()`, `TOOLS`, `MINEABLE_TIER`, `PREFERRED_TOOL`, `FOOD`.
- Shaped recipes are matched after trimming empty rows and columns; shapeless ones by item multiset.
- Recipes: log -> planks, planks -> sticks, 4 planks -> crafting table, coal + stick -> torches, 8 cobblestone -> furnace, **pickaxe, sword, axe, shovel and hoe** in wood, stone, iron and diamond, diamond + coal -> Eye of Ender, plus bread, bone meal and beds.
- **Furnace** (`furnaces`, `tickFurnaces`, `openFurnace`): input, fuel and output per placed furnace, saved with the world and still smelting while closed. `SMELTING`: iron ore -> ingot, sand -> glass, cobblestone -> stone, raw meats -> cooked, log -> coal. `FUEL`: coal 40 s, logs/planks/crafting table 7.5 s, stick 2.5 s; one item takes 5 s. Furnaces are local to each player in multiplayer.
- **Tool durability:** every tool slot carries `dmg`; tools break after 59 / 131 / 250 / 1561 uses (wood / stone / iron / diamond). One use per block (two for swords), one per hit with a sword (two with other tools), one per till. A coloured bar shows wear.
- Pickaxes gate what drops: any pickaxe for stone, coal and furnaces, stone for iron ore, iron for diamond and emerald ore, diamond for obsidian. Axes speed up wood, shovels speed up dirt, grass and sand. Swords and tools set attack damage.
- Raw porkchop, beef, chicken, rotten flesh, bread and cooked meats are edible. **Eating takes time** (`eatState`, `updateEating`): hold right-click for 1.6 s, with four bites (crunch sound, crumbs, the food bobbing at your mouth) and a swallow at the end; letting go early cancels, holding on eats the next piece, and you walk slowly while eating.
- **Tool sprites** (`drawToolSprite`, `TOOL_SHAPES`): every tool is drawn from a shape along the handle diagonal with a dark outline, so swords, pickaxes, axes, shovels and hoes are easy to tell apart in every material.
- **Doors:** 6 planks → 3 Oak Doors. A placed door is two blocks (`doorId`/`doorState`: open, facing, hinge, top half) drawn as a thin panel that swings to its hinge side. Two doors side by side facing the same way get outer hinges and open together (`placeDoor`, `toggleDoor`, `doorPartner`). Closed doors block movement; open ones do not.
- **Beds:** 3 wool + 3 planks; placed as `BED_FOOT` + `BED_HEAD` (`placeBed`, `removeBedPartner`), drawn 9/16 high. Right-click sets `player.spawnPoint` (saved with the player) and sleeps through the night (`trySleep`, `updateSleep`); a `TIME` message wakes the whole room.
- **Farming:** hoes till dirt/grass into farmland (moist near water), wheat seeds grow through 8 stages (`tickFarms`, host-only in multiplayer), bone meal speeds them up, 3 wheat → bread. Cows, pigs (wheat) and chickens (seeds) follow food and breed (`animalAI`, `tryFeedAnimal`, `setBaby`).
- *Gaps closed:* the doc still said TODO; axes and shovels were missing.

## 6. Multiplayer & Sync ✅
- **Code:** `MultiplayerManager`, `PEER_CONFIG`.
- Peer-to-peer over WebRTC with PeerJS: the host registers a room code, friends connect directly, and the host relays moves, block changes and chat (max 8 players). New joiners receive the host's seed and all block edits so far. See the README for setup and limits.
- Remote players are shown with a name tag, a per-name shirt colour, walking legs, a nodding head, a held item (block cube or flat tool sprite) and a swing animation.
- **Environment and links:** `getGameEnvironment()` classifies the page as production or local; the invite link is always the page's own address, and `inviteText()` says plainly when it only works on this computer (friends then use the room code).
- **Identity and persistence:** every browser has a permanent player id and name (`loadIdentity`). A room you created is saved with its world and reopens through **Host Again** (or by typing its code in Direct Connect). The host keeps each guest's inventory, stats and position by id (`guestData`, sent as validated `STATE` messages every 10 s and on quit) and restores them when that guest rejoins; the same account joining twice gets a temporary, unsaved second identity.
- **Connectivity:** STUN by default; if the site serves `/api/turn` (`worker/index.js` on Cloudflare Workers) its TURN relay credentials are added. The host's peer is shut down properly on quit (`_mcClosing`): PeerJS's `destroy()` fires `disconnected` before the peer is marked destroyed, so reconnecting on that event used to leave a zombie peer holding the room code.
- Not synchronised: mobs, the dragon, the End, health and armor. Hosted worlds are saved under the room name.
- *Gaps closed:* the doc described BroadcastChannel; avatars lacked arms, held items and swings.

## 7. Mobs & AI ✅
- **Code:** `Mob` and subclasses, `MobManager`.
- Passive: chicken, pig, cow, **sheep** (drops wool), horse. Hostile (night): creeper, skeleton, **zombie**, spider.
- **Villagers** (`VillagerMob`, `VILLAGER_TRADES`): one per village house, spawned when you come within 48 blocks. Farmer, Toolsmith, Mason and Cleric robes; they wander by day, go home through the door at night (wall-aware steering), and open an emerald trading screen on right-click (`openTrade`, `renderTrade`).
- Clicks hit only the mob under the crosshair (`mobUnderCrosshair`).
- Zombies chase and hit on a cooldown; skeletons keep their distance and **shoot arrows**; zombies and skeletons burn in daylight (`Mob.daylightBurn`); creepers fuse and explode.
- **Loot and XP:** pig -> raw porkchop, cow -> raw beef, chicken -> raw chicken, zombie -> rotten flesh.
- Natural hostile spawns avoid a 12-block radius around torches.
- *Gaps closed:* no zombie, no drops, no arrows, and a damage bug where a mob in melee range hurt the player every frame.

## 8. UI & HUD ✅
- **Code:** `index.html`, `style.css`, and the title/menu handlers in `game.js`.
- Animated title screen (spinning floating island with the game's mobs), singleplayer world list, create-world form (name, seed, mode), multiplayer host/join, options, loading screen, pause card, survival HUD, inventory and crafting windows, chat, boss bar, victory title, item-name popup.
- **Death screen:** cause of death, score, Respawn and Title Screen buttons.
- **Toasts** (`showToast`): advancement-style cards with an icon at the top right. *New item crafted* (merges repeated crafts into one card), *Recipe unlocked* (the first time your inventory holds everything a recipe needs; saved with the world and never repeated), *Night is coming* (17:00) / *Night has fallen*, and *Monster nearby!* with the monster, distance and compass direction (plus *Run!* when a creeper starts fusing).
- *Gaps closed:* the death screen, the world-management buttons.

## 9. Audio Engine ✅
- **Code:** `SoundEngine` (`audio`), Web Audio API only, no audio files.
- **Block sounds by material** (`blockSound`, `materialOf`, `SoundEngine.MATERIALS`): grass, plants, dirt, sand, gravel, stone, wood, wool, glass and water each have their own sound, built from short filtered noise grains plus a tonal body (a stone click, a wooden knock, a dirt thump, ringing glass shards). The same material sound is used, at different strength, for footsteps, each mining tick, placing and breaking. Footsteps come about every 0.45 s walking and 0.28 s sprinting, alternate slightly between feet and land harder when sprinting; jumping makes a push-off scuff and a whoosh, landing a thud that grows with the fall, and starting a sprint a short rush of air. A punch on a mob and a breaking tool have their own sounds.
- Other effects: pickup, jump, splash, hurt, eat, level-up, creeper hiss, explosion, animal sounds, villager "hrmm", morning birds, bow shot, zombie groan, dragon roar and portal shimmer.
- **Music** (`playPiece`): original ambient pieces, not the original game's piano style. Warm detuned pads, a sine bass and a kalimba-like melody through a generated reverb. Three moods picked from the game state: a bright Eb lydian day theme (68 BPM), a slower A minor night theme with bell tones (56 BPM), and a low D drone with distant chimes in the End. Each piece is about 30 seconds, then 30-60 seconds of quiet. It follows the Master and Music sliders.

## 9b. The End & Ender Dragon ✅
- See `docs/end_and_dragon.md`. The fight state (defeated, dragon health, crystals) is saved with the world.

## 10. Utilities ✅
- Simplex noise (`SimplexNoise`), `pseudoRandom`, voxel DDA ray casting (`raycastVoxel`, with small hitboxes for plants), block helpers (`isSolid`, `isOpaque`, `isFlora`, `isPlaceable`, `getDrop`), `showNotification`, `showItemName`, and the chat command runner (`runCommand`).
- All randomness that must be reproducible goes through `pseudoRandom(x, y, seed)` so terrain, structures and the title island never depend on `Math.random`.

---

**Future extensions** (the Nether, iron armor, more crops; see `roadmap_crafting_farming_villages.md`) can hook into these systems without reworking them: add block or item ids to `BLOCK` and `TILES`, a recipe to `RECIPES`, and behaviour in the relevant manager.
