# Project: RPG Game Liquid Galaxy

## Architecture
- **Framework**: Phaser 3 (Phaser.Physics.Matter) + TypeScript + Vite.
- **Networking**: Node.js + Express + Socket.IO (`server.js`) on port 8128.
- **Multi-Display Panoramic System**:
  - Screen 1 (Master): Physics simulation, user input handling, quest system, combat calculations, spawner logic, state broadcasting.
  - Screens 2–5 (Slaves): Panoramic viewport rendering with camera horizontal follow offsets (`screenMultiplier * (width / zoom)`: -2, -1, 0, 1, 2 = 3200px span), passive transform replication, particle/VFX mirroring.
- **Event Subsystem**: Singleton `EventManager` (`events`) with strict callback reference unregistration to prevent cross-scene listener leaks.
- **Entity Model**: Matter.js bodies for `Player`, `Enemy` variants (`enemy_goblin_torch_blue`, `enemy_goblin_tnt_blue`, `enemy_goblin_barrel_blue`), and static `Npc`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Event Listener Reference Unbinding | Refactor `game.ts` event handlers (`player-attack`, `show-dialog`, `dialog-closed`, `enemy-died`, `player-died`) to bound instance methods and pass explicit function references to `events.off()` | M1 | Survey |
| 2 | Player Lifecycle & Timer Cleanup | Cancel `waterDeathTimer` on player death and pre-allocate debug input keys (`addKey("K")`) outside `update()` loop | M1 | Survey |
| 3 | TODO & Code Comments Cleanliness | Remove lingering TODOs and cleanup informal dev comments in `game.ts` and `player.ts` | M1 | Survey |
| 4 | Menu Scene Socket Synchronization | Emit `game_restart` and `quit_to_main` over active Socket in `DeathMenuScene.ts` and `PauseMenuScene.ts` to keep Slave screens synchronized | M2 | Survey |
| 5 | Slave Projectile Explosion Deduplication | Ensure projectile explosion VFX and audio trigger exactly once on Slave displays without double-triggering | M2 | Survey |
| 6 | Slave Enemy Entity Array Cleanup | Clean up references in `this.enemies` and tracking dictionaries on Slave nodes when enemies are destroyed | M2 | Survey |
| 7 | Animation Preloading & Asset Hygiene | Move `play_water_splash` animation registration to Preloader / ParticleManager rather than ad-hoc creation in `player.ts` | M3 | Survey |
| 8 | Combat & Projectile Collision Polish | Verify and validate ranged dynamite parabola math, AoE explosion radius, and enemy knockback impulse | M3 | Survey |
| 9 | Full TypeScript Compilation & Quality Check | Verify `npx tsc --noEmit` exits with 0 errors, enforce strict typing across all touched files, and execute test suites | M4 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Lifecycle & Event Cleanup | EventManager bound handlers in `game.ts`, player timer cleanup, debug key caching, TODO removal | none | DONE |
| 2 | M2: Liquid Galaxy Sync Hardening | Menu socket broadcasts (`game_restart`, `quit_to_main`), slave explosion deduplication, enemy array cleanup | M1 | DONE |
| 3 | M3: Combat & Asset Polish | Water splash animation preloading, combat mechanics verification | M2 | DONE |
| 4 | M4: Type Safety & Final Verification | Full `npx tsc --noEmit` build verification and full automated test suite pass | M3 | IN_PROGRESS |

## Interface Contracts
### `EventManager` ↔ `Game Scene`
- `events.on(event: string, fn: Function, context?: any)`: Registers listener.
- `events.off(event: string, fn: Function, context?: any)`: Unregisters specific function listener. Calling `events.off(event)` without `fn` is blocked and logged as a warning.

### `DeathMenuScene` / `PauseMenuScene` ↔ `Socket.IO Relay`
- `socket.emit("game_restart", {})`: Broadcasts restart to all slave nodes.
- `socket.emit("quit_to_main", {})`: Broadcasts return to main menu to all slave nodes.

### `Master` ↔ `Slave Displays`
- `player_update`: `{ x: number, y: number, anim: string, flipX: boolean, map: string }`
- `enemy_update`: `{ id: string, x: number, y: number, texture: string, anim: string, flipX: boolean, isDead: boolean }`
- `projectile_spawn`: `{ id: string, startX: number, startY: number, targetX: number, targetY: number }`
- `explosion_spawn`: `{ x: number, y: number }`
- `coin_spawn`: `{ id: string, x: number, y: number }`
- `coin_pickup`: `{ id: string }`
- `map_transition`: `{ mapKey: string, targetX: number, targetY: number }`

## Code Layout
- `src/main.ts`: Application entry point & Phaser configuration.
- `src/scenes/`:
  - `Preloader.ts`: Asset preloading & animation registrations.
  - `MainMenuScene.ts`: Title screen and game start triggers.
  - `game.ts`: Core game scene, physics, Matter collisions, Liquid Galaxy networking & viewport offsets.
  - `UIScene.ts`: HUD (health bar, mana bar, coin counter, inventory UI).
  - `DialogScene.ts`: NPC dialogue rendering.
  - `PauseMenuScene.ts`: Modal pause menu.
  - `DeathMenuScene.ts`: Modal player death menu.
- `src/entities/`:
  - `player.ts`: Player Matter.js physics sprite, movement, attack, guard, water drowning.
  - `enemy.ts`: Enemy AI, patrol, chase, melee/ranged attack behaviors, knockback.
  - `npc.ts`: Static NPC with proximity speech prompt.
- `src/managers/`:
  - `EventManager.ts`: Global event bus singleton.
  - `MapManager.ts`: Tilemap loading, Matter wall/water collision generation, transition sensors.
  - `ParticleManager.ts`: Visual effect particles (blood, explosion, smoke, sparkles).
  - `InventoryManager.ts`: Item inventory data structure.
  - `SoundManager.ts`: Audio management.
- `server.js`: Express + Socket.IO multi-screen broadcast relay server.
- `scripts/`: Automated test suite and verification runners.
