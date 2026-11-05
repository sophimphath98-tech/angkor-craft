# The End & the Ender Dragon

A compact take on the real Minecraft end-game: find a hidden stronghold, light its portal, and defeat the dragon.
Everything lives in `game.js` (search for `THE END`).

## How a player gets there

1. **Craft**: log → planks → sticks → crafting table → pickaxes (`E` opens the 2x2 grid; right-click a Crafting Table for 3x3).
2. **Mine** coal and diamonds. Stone needs a pickaxe, iron ore needs a stone pickaxe, and diamond ore needs an iron pickaxe: smelt iron ore into ingots in a Furnace first.
3. **Craft Eyes of Ender**: Diamond + Coal (shapeless). This stands in for vanilla's ender pearl + blaze powder.
4. **Find the stronghold**: right-click an Eye in the air. It drifts toward the stronghold (message gives compass direction and distance), may shatter (20%), otherwise drops back. Within ~14 blocks the eye dives into the ground: dig down. `F3` shows XYZ and facing; `/locate` prints the exact coordinates.
5. **Light the portal**: the cobblestone room at y=2-9 holds a ring of 12 End Portal Frames (3 already hold an eye). Right-click each empty frame with an Eye of Ender. When all 12 are filled the 3x3 portal opens.
6. **Step into the portal** to enter The End.

## The fight

- The island (radius ~31) floats in the void at `END_X/END_Z = 6000`. Six obsidian pillars each carry an **Ender Crystal**.
- Each living crystal heals the dragon (0.4 HP/s) and shows a beam to it. Hit a crystal to destroy it (it explodes: stay back or take damage). Pillar up with blocks to reach the tall ones.
- The dragon (100 HP, boss bar at the top) cycles through: **circling** the island and spitting **fireballs**, **charging** at the player (ramming damage + knockback), and every third phase **perching** on the central fountain, where it breathes damaging purple clouds but is easiest to hit.
- Weapons: fist 2, wooden sword 4, stone 5, iron 6, diamond 7 damage. Tools wear out with use.
- On death the dragon falls apart, the player gains XP levels, and an exit portal appears in the fountain. Stepping into it returns you to the Overworld. Dying or falling into the void in the End also returns you to the Overworld spawn.

## Related systems

- **World edits persist** across chunk unloads (`VoxelWorld.edits`), so the lit portal and anything you build stay put.
- Fall damage: 1 point per block beyond 3.
- Commands (open chat with `T`): `/locate`, `/give <item> [n]`, `/tp end|stronghold|home|x y z`, `/time set day|night`.

## Deliberate simplifications

Eyes of Ender are crafted from diamond + coal (or bought from a Cleric villager); there is no Nether; the End is not synchronised in multiplayer.
