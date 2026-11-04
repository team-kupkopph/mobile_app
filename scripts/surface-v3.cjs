#!/usr/bin/env node
// Task A0.1 · re-derive the V3 surface (spec §1).
//
// Sprint 11 pushed V3 tokens through all 90 mobile screens, but actual V3 SURFACE
// adoption — <ScreenBackdrop> + <Card> — is only the 7 owner screens. This script
// measures the tree as it stands and exports what it finds, so the 35-screen
// conversion (Task A0.2 onward) has a re-derived baseline instead of a remembered one.
//
// ⚠️ EVERY SCAN MUST ASSERT IT FOUND SOMETHING. This repo's source-scan guards have
// under-reported before — usually a plausible SMALLER number, not an outright failure.
// Callers of surfaceV3() are expected to sanity-check counts themselves (see
// src/__tests__/surfaceV3.test.ts); this module only measures.
//
// NOTE: written as CommonJS (.cjs), not ESM (.mjs). This repo's jest config
// (`"jest": { "preset": "jest-expo" }` in package.json, no custom `transform`) does not
// transform `.mjs` files, so `import ... from ".../surface-v3.mjs"` inside a jest test
// throws "Cannot use import statement outside a module" before any assertion runs. `.cjs`
// is `require()`-able directly by jest's CommonJS runtime with zero transform config.
const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const SCREENS_DIR = join(__dirname, "..", "src", "screens");
const SHELTER_TABS = join(__dirname, "..", "src", "components", "ShelterTabs.tsx");
// SH11 · the key -> route map. SQ5 · the tab navigator's bar presses through it (no screen draws a bar any more).
const SHELTER_TAB_HELPER = join(__dirname, "..", "src", "shelterTabs.ts");
const SHELTER_TAB_NAVIGATOR = join(__dirname, "..", "src", "navigation", "ShelterTabNavigator.tsx");

const HAS_BACKDROP = /<ScreenBackdrop\b/;
const HAS_CARD = /<Card\b/;
const SPREADS_ELEVATION = /\.\.\.elevation\./;
const TAB_KEY = /key:\s*"([a-zA-Z]+)"/g;

function readScreenFiles() {
  return readdirSync(SCREENS_DIR).filter((f) => f.endsWith(".tsx"));
}

function read(dir, file) {
  return readFileSync(join(dir, file), "utf8");
}

function baseName(file) {
  return file.replace(/\.tsx$/, "");
}

/**
 * A tab is "dead" if nothing routes it. ShelterTabs.tsx declares the full tab set. Since SQ5 the ONE bar is the tab
 * navigator's, and it presses through the key -> route map (`SHELTER_TAB_ROUTE[key]`), so a key is live when that map
 * routes it and the navigator uses the map. A key the map lacks, or a navigator that stops using it, makes tabs dead.
 */
function findDeadTabs() {
  const tabsSource = readFileSync(SHELTER_TABS, "utf8");
  const keys = [...tabsSource.matchAll(TAB_KEY)].map((m) => m[1]);
  // A scan that found nothing proves nothing: say so rather than report "no dead tabs".
  if (keys.length === 0) throw new Error("surface-v3: found no tab keys in ShelterTabs.tsx");
  const helper = readFileSync(SHELTER_TAB_HELPER, "utf8");
  const navigator = readFileSync(SHELTER_TAB_NAVIGATOR, "utf8");
  const pressesViaMap = navigator.includes("SHELTER_TAB_ROUTE[key]");
  return keys.filter((key) => !(pressesViaMap && new RegExp(`\\b${key}:\\s*"\\w+"`).test(helper)));
}

function surfaceV3() {
  const files = readScreenFiles();
  const screens = files.map(baseName);

  const backdrop = files.filter((f) => HAS_BACKDROP.test(read(SCREENS_DIR, f))).map(baseName);
  const cardUsers = files.filter((f) => HAS_CARD.test(read(SCREENS_DIR, f))).map(baseName);
  const elevationSpreaders = files.filter((f) => SPREADS_ELEVATION.test(read(SCREENS_DIR, f))).map(baseName);
  const deadTabs = findDeadTabs();

  return { screens, backdrop, cardUsers, elevationSpreaders, deadTabs };
}

function main() {
  const s = surfaceV3();
  console.log("\n  Task A0.1 · V3 surface, re-derived\n");
  const rows = [
    ["screen files", s.screens.length],
    ["on ScreenBackdrop (V3 owner screens)", s.backdrop.length],
    ["using <Card>", s.cardUsers.length],
    ["spreading ...elevation.*", s.elevationSpreaders.length],
    ["dead shelter tabs", s.deadTabs.length]
  ];
  for (const [name, value] of rows) {
    console.log(`  ${String(value).padStart(5)}  ${name}`);
  }
  console.log(`\n  backdrop screens: ${s.backdrop.sort().join(", ")}`);
  console.log(`  dead tabs: ${s.deadTabs.sort().join(", ")}\n`);
}

module.exports = { surfaceV3 };

if (require.main === module) {
  main();
}
