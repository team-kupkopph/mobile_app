/**
 * A screen that pads for the notch on its happy path must pad on its FAILURE path too.
 *
 * ⚠️ FOUND BY WALKING THE APP, not by reading it (US-PF3, iPhone 17 Pro Max, backend down).
 * Profile's offline state — "You're offline / We couldn't reach the server." — rendered flush
 * to the top of the screen, so the heading sat under the Dynamic Island. Three screens had it:
 * Profile, ShelterProfile, ShelterDashboard.
 *
 * The shape of the bug is what makes it worth a guard. Each of those screens has TWO return
 * branches. The main one pads by `insets.top`; the early return that replaces the whole body on
 * a failed load did not. So the screen was correct when it loaded and wrong when it failed —
 * the case you only reach when something else has already gone wrong, and therefore the case
 * nobody screenshots.
 *
 * ⚠️ WHY THIS IS NOT FIXED INSIDE LoadStateView, which was the obvious idea and is wrong. Most
 * of its call sites are INLINE — a section placeholder inside a ScrollView, under a header
 * that has already handled the inset. A top inset in the component would shove every one of
 * those down. The responsibility genuinely belongs to the full-screen branches.
 *
 * The rule below is deliberately narrow: it only judges a screen that ALREADY uses `insets.top`
 * somewhere, so it never guesses about screens that pad with a fixed header instead.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const files = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx"));

/** Screens that demonstrably know about safe-area insets. */
const INSET_AWARE = files.filter((f) => /insets\.top/.test(readFileSync(join(SCREENS, f), "utf8")));

/**
 * The full-screen failure branches, and only those.
 *
 * ⚠️ THE FIRST VERSION OF THIS SCAN DID NOT WORK, and it is worth saying how, because it
 * failed in the exact way this repo keeps getting bitten by. It chopped the file into
 * `return ( ... );` blocks with a non-greedy regex, which OVERSHOT: the block it produced for
 * Profile was 4,336 characters, swallowing the small error branch and running on into the main
 * branch — so it found `insets.top` from the healthy path and reported the broken one as fine.
 * Reverting the fix left it green. A guard that cannot fail is worse than no guard, because it
 * is also a claim.
 *
 * This version keys on the actual signature of the bug instead: a `<LoadStateView>` whose
 * nearest enclosing element is the screen's own root (`styles.screen`). That is precisely the
 * "this replaces the whole body" shape, and it never matches the inline section placeholders.
 */
function fullScreenBranches(src: string): string[] {
  const out: string[] = [];
  let i = src.indexOf("<LoadStateView");
  while (i !== -1) {
    const before = src.slice(0, i);
    const openIdx = before.lastIndexOf("<View");
    if (openIdx !== -1) {
      const tag = src.slice(openIdx, src.indexOf(">", openIdx) + 1);
      if (tag.includes("styles.screen")) out.push(tag);
    }
    i = src.indexOf("<LoadStateView", i + 1);
  }
  return out;
}

describe("failure states respect the safe area", () => {
  it("found inset-aware screens to check", () => {
    // ⚠️ Assert the scan found something before trusting that it found nothing.
    expect(INSET_AWARE.length).toBeGreaterThan(2);
  });

  it("found full-screen LoadStateView branches to judge", () => {
    const total = INSET_AWARE.reduce(
      (n, f) => n + fullScreenBranches(readFileSync(join(SCREENS, f), "utf8")).length,
      0
    );
    expect(total).toBeGreaterThan(0);
  });

  it("every full-screen LoadStateView branch carries the top inset", () => {
    const offenders: string[] = [];
    for (const f of INSET_AWARE) {
      const src = readFileSync(join(SCREENS, f), "utf8");
      if (fullScreenBranches(src).some((tag) => !tag.includes("insets.top"))) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
