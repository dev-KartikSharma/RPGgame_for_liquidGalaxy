# Original User Request

## 2026-08-18T13:23:53Z

Perform a final code quality audit, implement performance efficiency optimizations, and update the Liquid Galaxy panoramic camera multi-screen layout mapping to align with the custom screen position logic. Verify all implementations using the existing automated testing infrastructure, stage and commit the changes to Git locally, and prepare the repository for pushing to GitHub.

Working directory: c:/Users/HP/Desktop/RPG Game/rpg-game-lg
Integrity mode: development

## Requirements

### R1. Custom Liquid Galaxy Multi-Display Layout Sync
Implement dynamic panoramic screen mapping in the camera follow offset calculation inside `src/scenes/game.ts`. The mapping logic should support a dynamic `screenAmount` (read from URL query parameters `?screens` or `?screenAmount`, defaulting to `5`), and resolve screen indices to panoramic multipliers as follows:
- Center / Master screen is always `1` (multiplier `0`).
- Left screen `leftScreen` resolves to `Math.floor(screenAmount / 2) + 2` (Evaluating to `4` for 5 screens) with multiplier `-1`.
- Right screen `rightScreen` resolves to `Math.floor(screenAmount / 2) + 1` (Evaluating to `3` for 5 screens) with multiplier `1`.
- Far Left screen resolves to `2` (for 5 screens) with multiplier `-2`.
- Far Right screen resolves to `5` (for 5 screens) with multiplier `2`.
The code should handle other odd `screenAmount` configurations systematically based on these patterns. Update the test expectations in `scripts/test_suite.cjs` (specifically T3.5) to align with this custom mapping.

### R2. Code Quality & Memory Safety Audit
Conduct a complete pass of the codebase. Look for:
- Potential memory leaks (such as missing or incorrect EventManager subscriptions, timer instances, or body unregistrations).
- Unused or redundant code, debug leftovers, and informal comments.
- Scene transitions and lifecycle shutdown logic ensuring proper cleanup.

### R3. Performance & Efficiency Tweaks
Optimize system performance where possible (e.g. game scene updates, event payload data sizes, redundant draw/calculation loops) while guaranteeing that Liquid Galaxy Master-Slave synchronization behavior remains intact.

### R4. Automated Test Verification
Run all three test frameworks in the `scripts/` directory:
- `test_suite.cjs` (20 test cases)
- `verify_m1_adversarial.cjs` (13 test cases)
- `audit_verifier.cjs` (5 high-level integrity audits)
All test runs must return a 100% success rate with zero TypeScript compiler errors/warnings (`tsc --noEmit`).

### R5. Version Control Staging and Committing
Stage all modified, untracked, and deleted project files, create a detailed commit documenting the changes, and leave the repository ready for a final push to the remote `Kartik` branch.

## Acceptance Criteria

### Verification
- [ ] Running `node scripts/test_suite.cjs` returns SUCCESS with 20/20 tests passing.
- [ ] Running `node scripts/verify_m1_adversarial.cjs` returns SUCCESS with 13/13 tests passing.
- [ ] Running `node scripts/audit_verifier.cjs` returns SUCCESS with 5/5 audits passing.
- [ ] TypeScript compiler runs clean (`tsc --noEmit` exits with 0).

### Custom Multi-Sync Layout
- [ ] The panoramic offset in `src/scenes/game.ts` correctly assigns multiplier `-1` to Screen 4 (Left) and `1` to Screen 3 (Right) for a 5-screen rig, with `-2` to Screen 2 (Far Left) and `2` to Screen 5 (Far Right).
- [ ] The E2E test `T3.5` in `scripts/test_suite.cjs` is updated to verify this specific offset mapping, and passes.

### Efficiency & Correctness
- [ ] Game logic, user input controls, and enemy behaviors remain functional.
- [ ] Liquid Galaxy multi-screen panoramic viewports and viewport offsets render correctly across all screens.
- [ ] Event listeners, splash animations, and water-related timers are properly cleaned up upon player or scene destruction.

### Git Staging
- [ ] All code changes, documentation updates, and added/modified files are committed to the local Git repository under the current branch (`Kartik`).
- [ ] `git status` displays no unstaged or untracked source files.
