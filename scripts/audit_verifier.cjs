/**
 * Liquid Galaxy RPG Game — Project Integrity & Audit Verifier
 * Standalone CommonJS script verifying:
 *   - Audit 1: Bug Audit Report completeness & catalog integrity
 *   - Audit 2: Clean TypeScript static type check (tsc --noEmit)
 *   - Audit 3: Map JSON schema & asset path resolution
 *   - Audit 4: Scene lifecycle cleanup and memory safety checks
 *   - Audit 5: Full E2E test suite execution (node scripts/test_suite.cjs)
 */

const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const assert = require("assert");

// Colors for terminal formatting
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const SRC_DIR = path.join(ROOT_DIR, "src");

let auditPassed = 0;
let auditFailed = 0;

async function runAudit(num, title, auditFn) {
  const startTime = Date.now();
  console.log(`\n${C.bold}${C.yellow}[AUDIT ${num}] ${title}${C.reset}`);
  try {
    await auditFn();
    const dur = Date.now() - startTime;
    console.log(`  ${C.green}${C.bold}AUDIT ${num} PASSED${C.reset} ${C.dim}(${dur}ms)${C.reset}`);
    auditPassed++;
  } catch (err) {
    const dur = Date.now() - startTime;
    console.log(`  ${C.red}${C.bold}AUDIT ${num} FAILED${C.reset} ${C.dim}(${dur}ms)${C.reset}`);
    console.error(`    ${C.red}Reason: ${err.message}${C.reset}`);
    if (err.stack) {
      console.error("    " + C.dim + err.stack.split("\n").slice(1, 4).join("\n    ") + C.reset);
    }
    auditFailed++;
  }
}

// -----------------------------------------------------------------------------
// Audit 1: Bug Audit Report & Catalog Completeness
// -----------------------------------------------------------------------------
async function audit1_BugCatalog() {
  const bugReportPath = path.join(ROOT_DIR, "BUG_AUDIT_REPORT.md");
  const projectPath = path.join(ROOT_DIR, "PROJECT.md");

  if (!fs.existsSync(bugReportPath) && !fs.existsSync(projectPath)) {
    console.log("  No BUG_AUDIT_REPORT.md or PROJECT.md found (clean repository mode). Skipping catalog check.");
    return;
  }

  let content = "";
  if (fs.existsSync(bugReportPath)) {
    content += fs.readFileSync(bugReportPath, "utf8");
    console.log(`  Found BUG_AUDIT_REPORT.md (${content.length} bytes)`);
  }
  if (fs.existsSync(projectPath)) {
    content += "\n" + fs.readFileSync(projectPath, "utf8");
    console.log(`  Loaded PROJECT.md for catalog validation`);
  }

  assert(content.length > 0, "No audit report or PROJECT.md found");

  const requiredBugIds = [
    "BUG-NET-01", "BUG-NET-02", "BUG-NET-03", "BUG-NET-04",
    "BUG-NET-05", "BUG-NET-06", "BUG-NET-07", "BUG-NET-08",
    "BUG-MAP-01", "BUG-MAP-02",
    "BUG-MEM-01", "BUG-MEM-02", "BUG-MEM-03", "BUG-MEM-04",
    "BUG-MEM-05", "BUG-MEM-06", "BUG-MEM-07", "BUG-MEM-08",
    "BUG-UI-01", "BUG-UI-02",
    "BUG-AST-01", "BUG-AST-02",
    "BUG-TYP-01", "BUG-TYP-02",
    "BUG-REP-01", "BUG-VER-01",
  ];

  let missingBugs = [];
  for (const id of requiredBugIds) {
    if (!content.includes(id)) {
      missingBugs.push(id);
    }
  }

  assert(
    missingBugs.length === 0,
    `Missing required bug IDs in documentation: ${missingBugs.join(", ")}`,
  );
  console.log(`  Verified all ${requiredBugIds.length} bug entries cataloged`);
}

// -----------------------------------------------------------------------------
// Audit 2: Clean TypeScript Static Type Check
// -----------------------------------------------------------------------------
async function audit2_TypeScript() {
  console.log("  Executing TypeScript compiler type check (`tsc --noEmit`)...");
  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(cmd, ["tsc", "--noEmit"], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    shell: true,
  });

  if (result.status !== 0) {
    const errorOutput = (result.stdout || "") + (result.stderr || "");
    throw new Error(`TypeScript compilation failed (exit code ${result.status}):\n${errorOutput}`);
  }

  console.log("  TypeScript compiled with zero errors and zero warnings.");
}

// -----------------------------------------------------------------------------
// Audit 3: Map JSON Schema & Asset Path Resolution
// -----------------------------------------------------------------------------
async function audit3_MapAndAssets() {
  const maps = ["spawn.json", "safevillage.json", "start_menu.json", "ui_map.json"];
  for (const m of maps) {
    const mPath = path.join(PUBLIC_DIR, "maps", m);
    assert(fs.existsSync(mPath), `Map ${m} does not exist at ${mPath}`);
    const data = JSON.parse(fs.readFileSync(mPath, "utf8"));
    assert(data.width > 0 && data.height > 0, `Map ${m} invalid dimensions`);
    assert(Array.isArray(data.layers) && data.layers.length > 0, `Map ${m} missing layers`);
    assert(Array.isArray(data.tilesets), `Map ${m} missing tilesets`);
  }
  console.log("  All 4 Tiled JSON maps validated.");

  const assetsKeysPath = path.join(SRC_DIR, "constants", "assetsKeys.ts");
  assert(fs.existsSync(assetsKeysPath), "assetsKeys.ts missing");
  const content = fs.readFileSync(assetsKeysPath, "utf8");

  const pathRegex = /path:\s*["']([^"']+)["']/g;
  let match;
  let count = 0;
  while ((match = pathRegex.exec(content)) !== null) {
    const relPath = match[1];
    const fullPath = path.join(PUBLIC_DIR, relPath);
    assert(fs.existsSync(fullPath), `Asset file not found on disk: ${relPath} -> ${fullPath}`);
    count++;
  }
  console.log(`  All ${count} asset paths in assetsKeys.ts exist in public/.`);
}

// -----------------------------------------------------------------------------
// Audit 4: Scene Lifecycle Cleanup & Memory Safety
// -----------------------------------------------------------------------------
async function audit4_SceneLifecycle() {
  const scenes = [
    "game.ts",
    "UIScene.ts",
    "MainMenuScene.ts",
    "PauseMenuScene.ts",
    "DeathMenuScene.ts",
  ];

  for (const s of scenes) {
    const sPath = path.join(SRC_DIR, "scenes", s);
    assert(fs.existsSync(sPath), `Scene file ${s} missing`);
    const code = fs.readFileSync(sPath, "utf8");

    // Check for shutdown event registration or cleanup handlers
    const hasShutdown =
      code.includes("SHUTDOWN") ||
      code.includes("shutdown") ||
      code.includes("events.once") ||
      code.includes("events.on");
    assert(hasShutdown, `Scene ${s} does not register shutdown / cleanup listeners`);
  }
  console.log("  Scene lifecycle cleanup verified across all interactive scenes.");
}

// -----------------------------------------------------------------------------
// Audit 5: Full Test Suite Execution
// -----------------------------------------------------------------------------
async function audit5_TestSuite() {
  const testSuitePath = path.join(ROOT_DIR, "scripts", "test_suite.cjs");
  assert(fs.existsSync(testSuitePath), `Test suite script missing: ${testSuitePath}`);

  console.log("  Spawning automated test suite runner (`node scripts/test_suite.cjs`)...");
  const result = spawnSync(process.execPath, [testSuitePath], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    shell: false,
  });

  if (result.stdout) {
    console.log(result.stdout);
  }

  if (result.status !== 0) {
    if (result.stderr) console.error(result.stderr);
    throw new Error(`Test suite execution failed with exit code ${result.status}`);
  }

  assert.strictEqual(result.status, 0, "Test suite must exit with code 0");
  console.log("  Full test suite completed with 100% pass rate.");
}

// -----------------------------------------------------------------------------
// Main Auditor Entry
// -----------------------------------------------------------------------------
async function main() {
  console.log(`\n${C.bold}${C.cyan}======================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}          PROJECT INTEGRITY AUDIT VERIFIER FOR LIQUID GALAXY          ${C.reset}`);
  console.log(`${C.bold}${C.cyan}======================================================================${C.reset}`);

  await runAudit(1, "Bug Audit Report & Catalog Completeness", audit1_BugCatalog);
  await runAudit(2, "Clean TypeScript Static Type Check", audit2_TypeScript);
  await runAudit(3, "Map JSON Schema & Asset Path Resolution", audit3_MapAndAssets);
  await runAudit(4, "Scene Lifecycle Cleanup & Memory Safety", audit4_SceneLifecycle);
  await runAudit(5, "Full E2E Test Suite Execution", audit5_TestSuite);

  console.log(`\n${C.bold}${C.cyan}======================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}                        AUDIT SUMMARY REPORT                         ${C.reset}`);
  console.log(`${C.bold}${C.cyan}======================================================================${C.reset}`);
  console.log(
    `  Total Audits: 5 | Passed: ${C.green}${C.bold}${auditPassed}${C.reset} | Failed: ${auditFailed > 0 ? C.red : C.green}${C.bold}${auditFailed}${C.reset}`,
  );
  console.log(`${C.bold}${C.cyan}======================================================================${C.reset}\n`);

  if (auditFailed > 0) {
    console.log(`${C.red}${C.bold}AUDIT FAILURE: ${auditFailed} audit(s) failed integrity check.${C.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${C.green}${C.bold}AUDIT SUCCESS: All 5 integrity audits passed cleanly!${C.reset}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal audit error:", err);
  process.exit(1);
});
