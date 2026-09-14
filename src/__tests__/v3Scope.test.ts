// Task A0.2 Step 1 · the shared V3 scope list is internally consistent and matches the
// screen tree — nothing named twice, nothing forgotten.
import { readdirSync } from "fs";
import { join } from "path";
import { V3_SCOPE, V3_EXCLUDED } from "./v3Scope";

const SCREENS = join(__dirname, "..", "screens");

describe("v3Scope", () => {
  it("has 34 in-scope screens — spec §4.2's own table sums to 34, not the plan's 35; see v3Scope.ts header", () => {
    expect(V3_SCOPE.length).toBe(34);
  });

  it("has no duplicate names in V3_SCOPE", () => {
    expect(new Set(V3_SCOPE).size).toBe(V3_SCOPE.length);
  });

  it("has no duplicate names in V3_EXCLUDED", () => {
    expect(new Set(V3_EXCLUDED).size).toBe(V3_EXCLUDED.length);
  });

  it("every V3_SCOPE name exists as a screen file", () => {
    const files = new Set(readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, "")));
    const missing = V3_SCOPE.filter((n) => !files.has(n));
    expect(missing).toEqual([]);
  });

  it("every V3_EXCLUDED name exists as a screen file", () => {
    const files = new Set(readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, "")));
    const missing = V3_EXCLUDED.filter((n) => !files.has(n));
    expect(missing).toEqual([]);
  });

  it("V3_SCOPE and V3_EXCLUDED never name the same screen twice", () => {
    const overlap = V3_SCOPE.filter((n) => V3_EXCLUDED.includes(n));
    expect(overlap).toEqual([]);
  });

  it("V3_SCOPE union V3_EXCLUDED equals the full screen file list — nothing forgotten", () => {
    const all = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, ""));
    expect([...V3_SCOPE, ...V3_EXCLUDED].sort()).toEqual(all.sort());
  });
});
