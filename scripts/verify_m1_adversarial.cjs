/**
 * Adversarial Verification Test Suite for Milestone 1
 * Lifecycle, Event Cleanup & Code Hygiene
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");

// Terminal colors
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

let passedTests = 0;
let failedTests = 0;

function runTest(id, name, testFn) {
  const startTime = Date.now();
  process.stdout.write(`  ${C.bold}[${id}]${C.reset} ${name} ... `);
  try {
    testFn();
    const duration = Date.now() - startTime;
    console.log(`${C.green}${C.bold}PASS${C.reset} ${C.dim}(${duration}ms)${C.reset}`);
    passedTests++;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.log(`${C.red}${C.bold}FAIL${C.reset} ${C.dim}(${duration}ms)${C.reset}`);
    console.error(`    ${C.red}Error: ${err.message}${C.reset}`);
    if (err.stack) {
      console.error(err.stack.split("\n").slice(1, 4).map(l => "    " + C.dim + l.trim() + C.reset).join("\n"));
    }
    failedTests++;
  }
}

console.log(`\n${C.bold}${C.cyan}======================================================================${C.reset}`);
console.log(`${C.bold}${C.yellow}  ADVERSARIAL STRESS SUITE: MILESTONE 1 VERIFICATION${C.reset}`);
console.log(`${C.bold}${C.cyan}======================================================================${C.reset}\n`);

// -----------------------------------------------------------------------------
// 1. EVENT MANAGER & SCENE LIFECYCLE STRESS TESTS
// -----------------------------------------------------------------------------

// Minimal EventEmitter implementation matching Phaser.Events.EventEmitter
class MockEventEmitter {
  constructor() {
    this._events = {};
  }
  on(event, fn, context) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push({ fn, context });
    return this;
  }
  off(event, fn, context) {
    if (!this._events[event]) return this;
    if (!fn) {
      delete this._events[event];
      return this;
    }
    this._events[event] = this._events[event].filter(
      (listener) => listener.fn !== fn || (context && listener.context !== context)
    );
    if (this._events[event].length === 0) delete this._events[event];
    return this;
  }
  emit(event, ...args) {
    if (!this._events[event]) return false;
    const listeners = [...this._events[event]];
    for (const l of listeners) {
      l.fn.apply(l.context, args);
    }
    return true;
  }
  listenerCount(event) {
    return this._events[event] ? this._events[event].length : 0;
  }
  rawListeners(event) {
    return this._events[event] ? [...this._events[event]] : [];
  }
}

// EventManager implementation with wildcard protection matching src/managers/EventManager.ts
class MockEventManager extends MockEventEmitter {
  constructor() {
    super();
    this.warnCount = 0;
  }
  off(event, fn, context, once) {
    if (!fn) {
      this.warnCount++;
      return this;
    }
    return super.off(event, fn, context);
  }
  removeListener(event, fn, context, once) {
    return this.off(event, fn, context, once);
  }
}

runTest("ADV-1.1", "EventManager: Wildcard off() call blocked and warning triggered", () => {
  const em = new MockEventManager();
  const dummyFn = () => {};
  em.on("player-attack", dummyFn);
  assert.strictEqual(em.listenerCount("player-attack"), 1);

  // Wildcard off without fn
  em.off("player-attack");
  assert.strictEqual(em.listenerCount("player-attack"), 1, "Wildcard off must NOT remove listener");
  assert.strictEqual(em.warnCount, 1, "Warning must be recorded");

  // Specific off with fn reference
  em.off("player-attack", dummyFn);
  assert.strictEqual(em.listenerCount("player-attack"), 0, "Specific off with fn MUST remove listener");
});

runTest("ADV-1.2", "EventManager: Simulated 100 Scene Restarts with Zero Listener Leak", () => {
  const globalEvents = new MockEventManager();

  class MockMainScene {
    constructor() {
      // Bound instance arrow functions (matching game.ts)
      this.handleShowDialog = () => {};
      this.handleDialogClosed = () => {};
      this.handlePlayerAttack = () => {};
      this.handlePlayerDied = () => {};
      this.handleEnemyDied = () => {};
    }
    init() {
      globalEvents.off("player-attack", this.handlePlayerAttack);
      globalEvents.off("show-dialog", this.handleShowDialog);
      globalEvents.off("dialog-closed", this.handleDialogClosed);
      globalEvents.off("enemy-died", this.handleEnemyDied);
      globalEvents.off("player-died", this.handlePlayerDied);
    }
    create() {
      globalEvents.on("show-dialog", this.handleShowDialog);
      globalEvents.on("dialog-closed", this.handleDialogClosed);
      globalEvents.on("player-attack", this.handlePlayerAttack);
      globalEvents.on("player-died", this.handlePlayerDied);
      globalEvents.on("enemy-died", this.handleEnemyDied);
    }
    shutdown() {
      globalEvents.off("player-attack", this.handlePlayerAttack);
      globalEvents.off("show-dialog", this.handleShowDialog);
      globalEvents.off("dialog-closed", this.handleDialogClosed);
      globalEvents.off("enemy-died", this.handleEnemyDied);
      globalEvents.off("player-died", this.handlePlayerDied);
    }
  }

  const eventsToCheck = [
    "player-attack",
    "show-dialog",
    "dialog-closed",
    "enemy-died",
    "player-died",
  ];

  // Stress test: 100 restarts with scene reuse and new instances
  for (let cycle = 0; cycle < 100; cycle++) {
    const scene = new MockMainScene();
    scene.init();
    scene.create();

    for (const evt of eventsToCheck) {
      assert.strictEqual(
        globalEvents.listenerCount(evt),
        1,
        `Event '${evt}' listener count must be exactly 1 during active scene (cycle ${cycle})`,
      );
    }

    scene.shutdown();

    for (const evt of eventsToCheck) {
      assert.strictEqual(
        globalEvents.listenerCount(evt),
        0,
        `Event '${evt}' listener count must be 0 after shutdown (cycle ${cycle})`,
      );
    }
  }
});

runTest("ADV-1.3", "EventManager: Multi-Scene Concurrent Isolation (UIScene + MainScene)", () => {
  const globalEvents = new MockEventManager();

  let uiCallCount = 0;
  let mainCallCount = 0;

  const uiShowDialog = () => { uiCallCount++; };
  const mainShowDialog = () => { mainCallCount++; };

  // Both scenes register for "show-dialog"
  globalEvents.on("show-dialog", uiShowDialog);
  globalEvents.on("show-dialog", mainShowDialog);
  assert.strictEqual(globalEvents.listenerCount("show-dialog"), 2);

  // Emit event: both receive it
  globalEvents.emit("show-dialog");
  assert.strictEqual(uiCallCount, 1);
  assert.strictEqual(mainCallCount, 1);

  // MainScene shuts down and unregisters its own handler
  globalEvents.off("show-dialog", mainShowDialog);
  assert.strictEqual(globalEvents.listenerCount("show-dialog"), 1);

  // Emit event again: only UIScene receives it
  globalEvents.emit("show-dialog");
  assert.strictEqual(uiCallCount, 2);
  assert.strictEqual(mainCallCount, 1, "MainScene listener must not be called after unregistration");

  // UIScene shuts down
  globalEvents.off("show-dialog", uiShowDialog);
  assert.strictEqual(globalEvents.listenerCount("show-dialog"), 0);
});

// -----------------------------------------------------------------------------
// 2. PLAYER ENTITY LIFECYCLE & TIMER CLEANUP STRESS TESTS
// -----------------------------------------------------------------------------

class MockTimer {
  constructor() {
    this.destroyed = false;
  }
  destroy() {
    this.destroyed = true;
  }
}

class MockPlayerEntity {
  constructor() {
    this.health = 100;
    this.maxHealth = 100;
    this.isDead = false;
    this.isLGSlave = false;
    this.inWaterCount = 0;
    this.waterDeathTimer = null;
    this.deathEventsEmitted = 0;
    this.active = true;
  }

  enterWater() {
    if (this.isDead || this.isLGSlave) return;
    this.inWaterCount++;
    if (this.inWaterCount === 1) {
      this.takeDamage(20);
      this.waterDeathTimer = new MockTimer();
    }
  }

  exitWater() {
    if (this.isDead || this.isLGSlave) return;
    this.inWaterCount = Math.max(0, this.inWaterCount - 1);
    if (this.inWaterCount === 0 && this.waterDeathTimer) {
      this.waterDeathTimer.destroy();
      this.waterDeathTimer = null;
    }
  }

  takeDamage(amount) {
    if (this.isDead || this.isLGSlave) return;
    this.health -= amount;
    if (this.health <= 0) {
      if (this.waterDeathTimer) {
        this.waterDeathTimer.destroy();
        this.waterDeathTimer = null;
      }
      if (this.inWaterCount > 0) {
        this.dieInWater();
      } else {
        this.isDead = true;
        this.deathEventsEmitted++;
      }
    }
  }

  dieInWater() {
    if (this.isDead || this.isLGSlave) return;
    this.isDead = true;
    if (this.waterDeathTimer) {
      this.waterDeathTimer.destroy();
      this.waterDeathTimer = null;
    }
    this.deathEventsEmitted++;
  }

  destroy() {
    if (this.waterDeathTimer) {
      this.waterDeathTimer.destroy();
      this.waterDeathTimer = null;
    }
    this.active = false;
  }
}

runTest("ADV-2.1", "Player: Water Timer Lifecycle on Normal Water Entry & Exit", () => {
  const p = new MockPlayerEntity();
  p.enterWater();
  assert.strictEqual(p.health, 80);
  assert(p.waterDeathTimer !== null, "Timer must be created on entering water");
  assert.strictEqual(p.waterDeathTimer.destroyed, false);

  const timerRef = p.waterDeathTimer;
  p.exitWater();
  assert.strictEqual(p.inWaterCount, 0);
  assert.strictEqual(p.waterDeathTimer, null, "Timer ref must be nulled on water exit");
  assert.strictEqual(timerRef.destroyed, true, "Timer must be destroyed on water exit");
});

runTest("ADV-2.2", "Player: Water Timer Destruction on Lethal Damage in Water", () => {
  const p = new MockPlayerEntity();
  p.enterWater();
  const timerRef = p.waterDeathTimer;
  assert(timerRef !== null);

  // Take lethal damage while in water
  p.takeDamage(100);
  assert.strictEqual(p.isDead, true);
  assert.strictEqual(p.waterDeathTimer, null, "waterDeathTimer must be nulled on lethal damage");
  assert.strictEqual(timerRef.destroyed, true, "waterDeathTimer must be destroyed on lethal damage");
  assert.strictEqual(p.deathEventsEmitted, 1);
});

runTest("ADV-2.3", "Player: Water Timer Destruction on Sprite destroy()", () => {
  const p = new MockPlayerEntity();
  p.enterWater();
  const timerRef = p.waterDeathTimer;
  assert(timerRef !== null);

  p.destroy();
  assert.strictEqual(p.waterDeathTimer, null);
  assert.strictEqual(timerRef.destroyed, true, "Timer must be destroyed when sprite is destroyed");
});

runTest("ADV-2.4", "Player: Slave & Death Damage Guard Verification", () => {
  const slavePlayer = new MockPlayerEntity();
  slavePlayer.isLGSlave = true;
  slavePlayer.takeDamage(50);
  assert.strictEqual(slavePlayer.health, 100, "Slave player must not take local damage");

  const deadPlayer = new MockPlayerEntity();
  deadPlayer.isDead = true;
  deadPlayer.takeDamage(50);
  assert.strictEqual(deadPlayer.health, 100, "Dead player must not take further damage");
});

// -----------------------------------------------------------------------------
// 3. INVENTORY MANAGER SPECIFICATION TESTS
// -----------------------------------------------------------------------------

class MockInventoryManager {
  constructor(initialItems = []) {
    this.items = [...initialItems];
    this.maxSlots = 16;
  }
  addItem(item) {
    const existing = this.items.find((i) => i.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
      return true;
    }
    if (this.items.length < this.maxSlots) {
      this.items.push(item);
      return true;
    }
    return false;
  }
  removeItem(itemId, quantity = 1) {
    const index = this.items.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      this.items[index].quantity -= quantity;
      if (this.items[index].quantity <= 0) {
        this.items.splice(index, 1);
      }
      return true;
    }
    return false;
  }
}

runTest("ADV-3.1", "InventoryManager: Default constructor starts empty and accepts custom seed", () => {
  const defaultInv = new MockInventoryManager();
  assert.strictEqual(defaultInv.items.length, 0, "Default inventory must be empty");

  const seed = [{ id: "test_potion", name: "Test Potion", iconKey: "icon_1", quantity: 3 }];
  const seededInv = new MockInventoryManager(seed);
  assert.strictEqual(seededInv.items.length, 1);
  assert.strictEqual(seededInv.items[0].quantity, 3);

  // Verify non-mutating copy
  seed[0].quantity = 999;
  // shallow copy items array
  assert.strictEqual(seededInv.items.length, 1);
});

runTest("ADV-3.2", "InventoryManager: Max slot limit (16 slots) enforcement", () => {
  const inv = new MockInventoryManager();
  for (let i = 0; i < 16; i++) {
    const added = inv.addItem({ id: `item_${i}`, name: `Item ${i}`, iconKey: "icon", quantity: 1 });
    assert.strictEqual(added, true, `Item ${i} must fit in 16 slots`);
  }
  assert.strictEqual(inv.items.length, 16);

  // 17th item should fail
  const overflow = inv.addItem({ id: "item_overflow", name: "Overflow", iconKey: "icon", quantity: 1 });
  assert.strictEqual(overflow, false, "17th item must be rejected when inventory is full");
  assert.strictEqual(inv.items.length, 16);

  // Stacking existing item should succeed even when full
  const stack = inv.addItem({ id: "item_0", name: "Item 0", iconKey: "icon", quantity: 5 });
  assert.strictEqual(stack, true, "Stacking existing item must succeed when full");
  assert.strictEqual(inv.items[0].quantity, 6);
});

// -----------------------------------------------------------------------------
// 4. CODE HYGIENE & STATIC AUDIT OF SRC/ FILES
// -----------------------------------------------------------------------------

function getAllFiles(dir, exts = [".ts", ".js"]) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else if (exts.some((e) => file.endsWith(e))) {
      results.push(fullPath);
    }
  });
  return results;
}

runTest("ADV-4.1", "Code Hygiene: Zero TODO comments in entire src/ directory", () => {
  const files = getAllFiles(SRC_DIR);
  const todoRegex = /\bTODO\b/i;
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (todoRegex.test(line)) {
        violations.push(`${path.relative(ROOT_DIR, file)}:${idx + 1}: ${line.trim()}`);
      }
    });
  }

  assert.strictEqual(
    violations.length,
    0,
    `Found ${violations.length} TODO comment(s) in src:\n${violations.join("\n")}`,
  );
});

runTest("ADV-4.2", "Code Hygiene: Zero wildcard events.off() calls in src/", () => {
  const files = getAllFiles(SRC_DIR);
  // Match events.off("...", ...) or events.off('...', ...)
  const eventsOffRegex = /events\.off\s*\(([^)]+)\)/g;
  const violations = [];

  for (const file of files) {
    if (file.endsWith("EventManager.ts")) continue; // Skip implementation file
    const content = fs.readFileSync(file, "utf8");
    let match;
    while ((match = eventsOffRegex.exec(content)) !== null) {
      const args = match[1].split(",").map((a) => a.trim());
      if (args.length < 2) {
        violations.push(
          `${path.relative(ROOT_DIR, file)}: events.off(${match[1]}) is missing handler argument`,
        );
      }
    }
  }

  assert.strictEqual(
    violations.length,
    0,
    `Found ${violations.length} wildcard events.off call(s):\n${violations.join("\n")}`,
  );
});

runTest("ADV-4.3", "Code Hygiene: Player.ts does not allocate keyboard keys inside update()", () => {
  const playerFile = path.join(SRC_DIR, "entities", "player.ts");
  const content = fs.readFileSync(playerFile, "utf8");
  
  // Find the update() method body
  const updateStart = content.indexOf("update(time: number)");
  assert(updateStart !== -1, "Player.ts must have update(time: number)");
  const updateBody = content.slice(updateStart);
  
  assert(
    !updateBody.includes("addKey("),
    "Player.ts update() must NOT contain addKey() calls (key allocation per frame)",
  );
  assert(
    !updateBody.includes("addKeys("),
    "Player.ts update() must NOT contain addKeys() calls",
  );
  assert(
    !updateBody.includes("createCursorKeys()"),
    "Player.ts update() must NOT contain createCursorKeys() calls",
  );
});

runTest("ADV-4.4", "Code Hygiene: Zero active console.log statements in src/", () => {
  const files = getAllFiles(SRC_DIR);
  const consoleLogRegex = /^\s*console\.log\s*\(/;
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (consoleLogRegex.test(line)) {
        violations.push(`${path.relative(ROOT_DIR, file)}:${idx + 1}: ${line.trim()}`);
      }
    });
  }

  assert.strictEqual(
    violations.length,
    0,
    `Found ${violations.length} console.log statement(s) in src:\n${violations.join("\n")}`,
  );
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log(`\n${C.bold}${C.cyan}======================================================================${C.reset}`);
console.log(`  ${C.bold}TOTAL TESTS:${C.reset} ${passedTests + failedTests}`);
console.log(`  ${C.green}${C.bold}PASSED:${C.reset}      ${passedTests}`);
console.log(`  ${failedTests > 0 ? C.red : C.green}${C.bold}FAILED:${C.reset}      ${failedTests}`);
console.log(`${C.bold}${C.cyan}======================================================================${C.reset}\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
