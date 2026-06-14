# Phase 2 Implementation Plan: Real Map, Bidirectional Animations, Enemies, and UI System

We have successfully completed Phase 1 by implementing a fully operational Matter.js collision system, tilemap layers, sloped collisions, and basic player controls synchronized over socket.io. Now we plan Phase 2 to bring the game to life.

---

## User Review Required

> [!IMPORTANT]
> **1. UI/HUD Layout on Liquid Galaxy:**
> In a Liquid Galaxy (multi-screen) setup, rendering the player HUD (Health, Stamina, Mana) on all screens is distracting and breaks the panoramic immersion. We propose rendering the UI overlay **only on the Master screen (Center screen)**, while the slave screens remain HUD-free for an immersive cinematic panorama.
> 
> **2. Enemy AI Syncing:**
> To prevent desynchronization, all physics, AI pathfinding, and state decisions for enemies will run **exclusively on the Master node**. The slave screens will just receive positional and animation updates (including flips) for each enemy, matching the player's sync structure.

---

## Open Questions

> [!WARNING]
> **1. Enemy Sprites & Assets:**
> Do we have specific enemy spritesheets/Aseprite files available in the project already? If not, we can use placeholder or generic sprites (e.g., goblins, skeleton warriors) from standard asset packs, or we can generate them.
> 
> **2. Map Editing Tool:**
> For the "Real Map", do you want to design it inside a tilemap editor like Tiled and export to JSON, or should we programmatically construct/enhance the existing one? We recommend designing in Tiled and replacing `public/maps/world_map1.json` with the new design.

---

## Proposed Changes

We will organize the changes across the following components:

### 1. Assets & Configurations

#### [MODIFY] [assetsKeys.ts](file:///c:/Users/HP/Desktop/RPG%20Game/rpg-game-lg/src/constants/assetsKeys.ts)
- Add asset keys and paths for enemy spritesheets (Aseprite or spritesheet JSON).
- Add asset keys for UI icons and map assets.
- Configure loading paths for the new real map.

---

### 2. Player Mechanics & Directional Sync

#### [MODIFY] [player.ts](file:///c:/Users/HP/Desktop/RPG%20Game/rpg-game-lg/src/entities/player.ts)
- Update player input handling: set `flipX` based on velocity (`vx < 0` sets `flipX = true`, `vx > 0` sets `flipX = false`).
- Adjust animations to play based on direction if directional assets are added, or use the horizontal flip.

#### [MODIFY] [game.ts](file:///c:/Users/HP/Desktop/RPG%20Game/rpg-game-lg/src/scenes/game.ts)
- Include `flipX` in the player socket update data payload (`{ x, y, anim, flipX }`).
- Apply `flipX` synchronization on slave screens.

---

### 3. Enemy Entity & AI System

#### [NEW] [enemy.ts](file:///c:/Users/HP/Desktop/RPG%20Game/rpg-game-lg/src/entities/enemy.ts)
- Create an `Enemy` class extending `Phaser.Physics.Matter.Sprite`.
- Add simple AI state machine: `Idle`, `Patrol`, `Chase`, and `Attack`.
- Target the player when within a detection range.
- Implement bidirectional flip logic (`flipX`) based on the direction they are moving.

#### [MODIFY] [game.ts](file:///c:/Users/HP/Desktop/RPG%20Game/rpg-game-lg/src/scenes/game.ts) (Enemy Sync)
- On the master screen, spawn enemies and track them in a list.
- Emit `enemy_update` packets containing `{ id, x, y, anim, flipX, health }` for all active enemies.
- On slave screens, listen to `enemy_update` events, and spawn/move/flip matching client-side dummy sprites.

---

### 4. Interactive User Interface (UI/HUD)

#### [NEW] [ui.ts](file:///c:/Users/HP/Desktop/RPG%20Game/rpg-game-lg/src/scenes/UIScene.ts)
- Create a parallel `UIScene` overlay to handle the HUD (Health, Stamina, Mana bars).
- Design premium stylized bars using Phaser Graphics or custom sliced textures (glassmorphism/glowing gradients).
- **Condition:** Launch this scene *only* if `isMaster` is true, ensuring it only renders on the central monitor.

---

### 5. World Map Design

#### [MODIFY] [world_map1.json](file:///c:/Users/HP/Desktop/RPG%20Game/rpg-game-lg/public/maps/world_map1.json)
- Refine the map layout with proper path routes, trees, houses, water shores, bridge crossings, and sloped passages.
- Tag collidable layers correctly to automatically generate Matter.js bodies.

---

## Verification Plan

### Automated/Code Verification
- Run TypeScript compilation checks (`npm run build` or `npx tsc`).
- Check linting rules and verify Matter.js body generation.

### Manual Verification
- Run the game and test local movements in all directions. Verify player flips horizontally correctly.
- Open second screen (e.g., `http://localhost:8080/?screen=2`) and verify that player movement, direction flip, and animations match perfectly.
- Spawn a test enemy on the master screen and verify it chases the player, flips towards the player, and synchronizes its movement and animations correctly across both screens.
- Verify the HUD shows up only on screen 1 (master).
