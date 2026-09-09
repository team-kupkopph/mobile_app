#!/usr/bin/env node
// US-FD1 · re-derive the Sprint 11 conversion surface.
//
// The sprint plan states these numbers. This script exists so nobody has to believe them:
// it measures the tree as it is now and prints what it finds.
//
// ⚠️ EVERY SCAN MUST ASSERT IT FOUND SOMETHING. Across Sprints 8 and 10 every source-scan
// guard in this project under-reported at least once, and most often printed a plausible
// SMALLER number rather than failing outright. In a conversion sprint a count that quietly
// drops reads as progress — "only 12 screens left" is indistinguishable from a broken regex.
// So each check carries a `min`, and a scan that returns less than that is a FAILURE of the
// scan, not a finding about the app.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const SRC = new URL("../src", import.meta.url).pathname;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const all = walk(SRC);
const tsx = all.filter((f) => extname(f) === ".tsx" && !f.includes("__tests__"));
const screens = tsx.filter((f) => f.includes("/screens/"));
const tests = all.filter((f) => /\.test\.tsx?$/.test(f));
const read = (f) => readFileSync(f, "utf8");

const hexes = tsx.flatMap((f) => read(f).match(/#[0-9A-Fa-f]{6}\b/g) ?? []);
const radii = tsx.flatMap((f) => read(f).match(/borderRadius:\s*[\d.]+/g) ?? []);

const checks = [
  { name: "screen files", min: 50,
    value: screens.length },
  { name: "screens with a local `const colors`", min: 20,
    value: screens.filter((f) => /^const colors = \{/m.test(read(f))).length },
  { name: "screens reading authColors (incl. the kit)", min: 5,
    value: screens.filter((f) => /authColors/.test(read(f))).length },
  { name: "distinct hex literals", min: 20,
    value: new Set(hexes.map((h) => h.toUpperCase())).size },
  { name: "  ...across occurrences", min: 100,
    value: hexes.length },
  { name: "distinct borderRadius values", min: 5,
    value: new Set(radii.map((r) => r.split(/:\s*/)[1])).size },
  { name: "screens already on V3 (ScreenBackdrop)", min: 1,
    value: screens.filter((f) => /ScreenBackdrop/.test(read(f))).length },
  { name: "test files", min: 10,
    value: tests.length }
];

let failed = 0;
console.log("\n  US-FD1 · conversion surface, re-derived\n");
for (const c of checks) {
  const ok = c.value >= c.min;
  if (!ok) failed++;
  console.log(
    `  ${ok ? "ok  " : "FAIL"}  ${String(c.value).padStart(5)}  ${c.name}` +
    (ok ? "" : `   <- below floor ${c.min}: the SCAN is broken, not the app`)
  );
}
console.log();
if (failed) {
  console.error(`  ${failed} scan(s) returned implausibly little. Fix the scan before trusting any number here.\n`);
  process.exit(1);
}
console.log("  all scans found something; the numbers above are measurements, not assumptions.\n");
