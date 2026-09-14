/**
 * Task A0.2 · the backdrop adoption ratchet.
 *
 * Actual V3 surface adoption is 7 owner screens on <ScreenBackdrop>. The other 34 screens
 * in spec §4.2's scope (see v3Scope.ts for why 34, not the plan's 35) do not sit on it yet.
 * This is a RATCHET with a NAMED holdout list, in the shape of themeAdoption.test.ts, but
 * unlike that guard's flat `REMAINING = 0` count, each conversion story here removes exactly
 * its own screens from BACKDROP_HOLDOUTS by name — so the list is the plan, not a summary of it.
 *
 * Starts at all 34: no in-scope screen has been converted yet in this PR.
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { V3_SCOPE, V3_EXCLUDED } from "./v3Scope";

const SCREENS = join(__dirname, "..", "screens");
const read = (n: string) => readFileSync(join(SCREENS, `${n}.tsx`), "utf8");
const HAS_BACKDROP = /<ScreenBackdrop\b/;

/** Named holdouts. Each conversion story removes exactly its screens. Starts at all 34. */
const BACKDROP_HOLDOUTS: string[] = [...V3_SCOPE];

describe("V3 screens sit on the backdrop", () => {
  it("found screens to classify", () => {
    expect(readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).length).toBeGreaterThan(80);
    expect(V3_SCOPE.length).toBe(34);
  });

  it("every in-scope screen not in the holdout list renders ScreenBackdrop", () => {
    const missing = V3_SCOPE.filter((n) => !BACKDROP_HOLDOUTS.includes(n) && !HAS_BACKDROP.test(read(n)));
    expect(missing).toEqual([]);
  });

  it("the holdout list only shrinks (a converted screen must leave it)", () => {
    const converted = BACKDROP_HOLDOUTS.filter((n) => HAS_BACKDROP.test(read(n)));
    expect(converted).toEqual([]);
  });

  it("names every excluded screen rather than implying it", () => {
    const all = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, ""));
    expect([...V3_SCOPE, ...V3_EXCLUDED].sort()).toEqual(all.sort());
  });
});
