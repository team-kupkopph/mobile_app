/**
 * Screens take colour from `src/theme`, not from a table of their own.
 *
 * ⚠️ THE NUMBER THIS HOLDS DOWN. `colors.ts` was written from measurement — `pnpm surface`
 * counted 77 distinct hex literals across 1,117 occurrences — and it says plainly of itself:
 * "NO SCREEN IS CONVERTED BY THIS FILE." For a whole sprint that stayed true. The design audit
 * against the approved canvas measured the result: 41 screens still declaring their own
 * `const colors`, against 31 importing the theme.
 *
 * This guard is a RATCHET, like the header one. It fails if the count goes UP — a new screen
 * copy-pasting a palette — and also if it falls without the number here being updated, so
 * finishing the job is recorded rather than silently absorbed.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const files = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx"));
const read = (f: string) => readFileSync(join(SCREENS, f), "utf8");

/**
 * ⚠️ THE `m` FLAG WITHOUT ANCHORING THE CLOSE, because two screens wrote the whole table on ONE
 * line — `const colors = { ink: "#12213A", ... };` — and a pattern that required `^\};` missed
 * both. They were absent from the migration's own survey for exactly that reason, and only
 * turned up when the remaining count was listed by name. A scan that cannot see a shape cannot
 * report it.
 */
const OWN_TABLE = /^const colors\s*[:=]/m;

const HOLDOUTS = files.filter((f) => OWN_TABLE.test(read(f)));
const IMPORTERS = files.filter((f) => /from "\.\.\/theme"/.test(read(f)));

/**
 * ⚠️ LOWER THIS WHEN YOU CONVERT MORE; NEVER RAISE IT. Each remaining screen holds at least one
 * colour that is NOT in the theme — a one-off grey or tint with no token. Those are a design
 * decision (promote to a token, or accept as local), not a mechanical sweep, which is why they
 * were not swept.
 */
const REMAINING = 7;

describe("screens take colour from the theme", () => {
  it("found screens to classify", () => {
    // Guard the guard: this repo's scans have reported a plausible smaller number more than once.
    expect(files.length).toBeGreaterThan(80);
    expect(IMPORTERS.length).toBeGreaterThan(60);
  });

  it("has not grown a new private palette", () => {
    expect(HOLDOUTS.length).toBeLessThanOrEqual(REMAINING);
  });

  it("records the remaining count honestly", () => {
    expect(HOLDOUTS.length).toBe(REMAINING);
  });

  it("sees a single-line table as well as a block one", () => {
    // The shape that was invisible to the migration's first survey.
    expect(OWN_TABLE.test('const colors = { ink: "#12213A" };')).toBe(true);
    expect(OWN_TABLE.test('const colors = {\n  ink: "#12213A"\n};')).toBe(true);
  });
});
