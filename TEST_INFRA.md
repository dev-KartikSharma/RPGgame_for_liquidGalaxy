# E2E Test Infra: Liquid Galaxy RPG Game

## Test Philosophy
- Requirement-driven, opaque-box & automated verification.
- Validates static compilation, asset completeness, scene lifecycle/memory management, Liquid Galaxy multi-display socket synchronization, and bug audit documentation.

## Test Architecture
- **Static Compilation Test**: `npx tsc --noEmit` must pass with 0 errors and 0 warnings.
- **Asset Integrity Test**: Automated Node.js script checking that all tileset keys, map JSON references, and image paths exist in `public/`.
- **Scene Lifecycle & Memory Leak Test**: Validates that all keyboard handlers, physics listeners, and EventManager subscriptions have corresponding cleanup on scene shutdown.
- **Socket Multi-Display Sync Simulation**: Simulates Master-Slave socket communication validating that enemy death packets, coin spawn/pickup race conditions, map transitions with spawnName, and menu lifecycle events synchronize accurately without drops or zombie entities.
- **Bug Audit Report Validation**: Verifies that `BUG_AUDIT_REPORT.md` exists and covers all identified bugs with root causes, severities, and applied fixes.

## Test Case Tiers
### Tier 1: Feature & Component Coverage
- T1.1: TypeScript compilation clean build (`tsc --noEmit`).
- T1.2: Asset manifest resolution for all maps (`spawn.json`, `safevillage.json`, `start_menu.json`, `ui_map.json`).
- T1.3: Scene instantiation and shutdown hooks for all 6 scenes.
- T1.4: Socket event registration for all Master-Slave protocol messages.
- T1.5: UI component instantiation (`HealthBar`, `InventoryUI`, `DialogBox`).

### Tier 2: Boundary & Corner Cases
- T2.1: `DialogBox.show([])` with empty array handled gracefully without exceptions.
- T2.2: `InventoryUI` refresh with multiple icons destroyed without skipping indices.
- T2.3: `MapManager` spawn point resolution with missing/invalid `spawnName` falling back gracefully.
- T2.4: Socket `coin_pickup` event received before `g_spawn` animation finishes handled without dropping coin destruction.
- T2.5: Water death timer properly cancelled when player dies or is destroyed.

### Tier 3: Cross-Feature & Multi-Display Interactions
- T3.1: Master enemy kill -> verifies `{ isDead: true }` transmitted to slaves and slave enemy sprite removed.
- T3.2: Master map transition with `spawnName` -> verifies slave receives `spawnName` and aligns viewport.
- T3.3: Master Pause/Resume/Restart/Quit -> verifies corresponding socket events broadcast and handled by slaves.
- T3.4: EventManager unsubscription in one scene does not wipe listeners in another scene.
- T3.5: Multi-screen viewport layout offsets correctly map for 3-screen and 5-screen configurations.

### Tier 4: Real-World Scenarios
- T4.1: Complete game loop: Start Menu -> Preload -> Game -> Map Transition to Safe Village -> Return to Main Map -> Pause -> Resume -> Defeat Enemy -> Collect Coin -> Take Damage -> Death Menu -> Restart Game.
- T4.2: Multi-display panoramic synchronization throughout full gameplay session.

## Coverage Thresholds
- Tier 1: >=5 test cases
- Tier 2: >=5 test cases
- Tier 3: >=5 test cases
- Tier 4: >=2 comprehensive real-world scenarios
- Total: >=17 automated verification checks.
