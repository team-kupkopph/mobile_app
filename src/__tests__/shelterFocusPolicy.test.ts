/**
 * SQ5 PR 4 (spec 2026-11-04-shelter-tab-navigator-design.md §5.3) · the five shelter tabs stay mounted, so WHEN they refetch
 * on focus is a policy, not an accident of `useFocusEffect`: first focus loads; a tab switch inside the stale window does
 * not; coming back from a pushed screen always does; a refresh never blanks what is showing, and a failed one leaves it.
 * The decision itself is pinned in useRefreshOnFocus.test.ts and the paged refresh in pagedList.test.ts; this scan holds
 * that every tab actually goes through them.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const ROOTS = ["ShelterDashboardScreen", "ShelterDonateScreen", "ShelterRequestsScreen", "ShelterProfileScreen"];

describe.each(ROOTS)("%s", (name) => {
  const src = read(`screens/${name}.tsx`);
  it("refetches through useRefreshOnFocus, not useFocusEffect", () => {
    expect(src).toMatch(/useRefreshOnFocus\(load\);/);
    expect(src).not.toMatch(/useFocusEffect/);
  });
});

describe("tabs whose load reports the primary request's outcome (so a failure retries on the next focus)", () => {
  it.each(["ShelterDashboardScreen", "ShelterDonateScreen", "ShelterProfileScreen"])("%s returns its primary request", (name) => {
    expect(read(`screens/${name}.tsx`)).toMatch(/const primary = api\.get\(/);
    expect(read(`screens/${name}.tsx`)).toMatch(/return primary;/);
  });
});

describe("ShelterDonateScreen", () => {
  const src = read("screens/ShelterDonateScreen.tsx");
  it("no longer ends a load when the tab blurs (the effect cleanup is gone); a newer load supersedes an older one", () => {
    expect(src).not.toMatch(/alive = false/);
    expect(src).toMatch(/const mine = \+\+loads\.current;/);
  });
});

describe("ShelterRequestsScreen", () => {
  const src = read("screens/ShelterRequestsScreen.tsx");
  it("a visit after the first refreshes in place; only a first or failed load, or a segment change, resets", () => {
    expect(src).toMatch(/pagedRef\.current\.items \? list\.refresh\(\) : list\.reset\(pathFor\(segment\)\)/);
    expect(src).toMatch(/useEffect\(\(\) => \{\s*if \(shownSegment\.current === segment\) return;/);
  });
  it("the focus path no longer resets the list on its own", () => {
    expect(src).not.toMatch(/useFocusEffect/);
    expect((src.match(/list\.reset\(/g) ?? []).length).toBe(2);
  });
});

describe("ListingsByStatus / Animals", () => {
  const by = read("components/ListingsByStatus.tsx");
  it("refreshes in place once it has rows, and a segment change starts from an empty list", () => {
    expect(by).toMatch(/listingsRef\.current \? loadPage\(1, true\) : loadPage\(1\)/);
    expect(by).toMatch(/refreshStaleMs\)/);
    expect(by).not.toMatch(/useFocusEffect/);
  });
  it("a failed in-place refresh does not overwrite the page-1 outcome", () => {
    expect(by).toMatch(/!\(keep && !r\.ok\)/);
  });
  it("the Animals tab passes the stale window; My listings keeps reloading on every focus (default 0)", () => {
    expect(read("screens/ShelterAnimalsScreen.tsx")).toMatch(/refreshStaleMs=\{DEFAULT_STALE_MS\}/);
    expect(read("screens/MyListingsScreen.tsx")).not.toMatch(/refreshStaleMs/);
    expect(by).toMatch(/refreshStaleMs = 0/);
  });
});

describe("useRefreshOnFocus", () => {
  it("reads `load` through a ref, so a screen whose load changes with its segment does not refocus-load", () => {
    const hook = read("useRefreshOnFocus.ts");
    expect(hook).toMatch(/loadRef\.current = load;/);
    expect(hook).toMatch(/loadRef\.current\(\)/);
    expect(hook).toMatch(/\[returns, staleMs\]/);
  });
});
