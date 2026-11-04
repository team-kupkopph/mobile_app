/**
 * SQ5 follow-up PR 4 (spec 2026-11-04-owner-guest-tab-navigator-design.md §4.5) · the owner and guest tabs stay mounted, so WHEN
 * they refetch on focus is a policy: first focus; then only after 30 s; always after a pushed screen pops; a failed load retries.
 * Home splits it: the ACCOUNT (and the shelter redirect) loads on first focus and after a pushed screen only (a plain tab switch
 * never re-asks), the panels and stories follow the 30 s rule. A refresh never blanks what is showing and a failed one leaves it.
 * Pure helpers are tested here; the screens are held by source scans that name what they must find.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { keepGoodRes } from "../refreshState";
import { shouldRefresh } from "../useRefreshOnFocus";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const strip = (src: string) => src.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");

describe("keepGoodRes", () => {
  const ok = { ok: true, status: 200 };
  const down = { ok: false, status: 0 };
  it("a first answer is taken as it is, good or bad", () => {
    expect(keepGoodRes(null, ok)).toEqual(ok);
    expect(keepGoodRes(null, down)).toEqual(down);
  });
  it("a failed refresh never downgrades a panel that had loaded", () => {
    expect(keepGoodRes(ok, down)).toBe(ok);
  });
  it("a panel that had failed takes a later answer, good or bad", () => {
    expect(keepGoodRes(down, ok)).toEqual(ok);
    expect(keepGoodRes(down, { ok: false, status: 503 })).toEqual({ ok: false, status: 503 });
  });
});

describe("an Infinity window means: first focus and after a pushed screen only (Home's account)", () => {
  const base = { lastLoadAt: 1_000_000, now: 1_000_000, staleMs: Infinity, returns: 0, returnsAtLastLoad: 0 };
  it("loads the first time", () => expect(shouldRefresh({ ...base, lastLoadAt: null })).toBe(true));
  it("never on a plain tab switch, however long it has been", () => {
    expect(shouldRefresh({ ...base, now: base.now + 24 * 3600_000 })).toBe(false);
  });
  it("after a pushed screen pops", () => {
    expect(shouldRefresh({ ...base, now: base.now + 5_000, returns: 1 })).toBe(true);
  });
});

// NT-O3 · a key change (the city) that happens while the tab is NOT focused (a picker pushed over it, or another tab) must not load in
// the background and then load AGAIN when the tab comes back: it marks the tab invalidated, and the next focus loads once,
// whatever the window says.
describe("an invalidated tab loads at its next focus", () => {
  const base = { lastLoadAt: 1_000_000, now: 1_000_001, staleMs: 30_000, returns: 0, returnsAtLastLoad: 0 };
  it("loads even inside the window and with nothing returned", () => {
    expect(shouldRefresh({ ...base, invalidated: true })).toBe(true);
    expect(shouldRefresh({ ...base, invalidated: false })).toBe(false);
  });
  it("an Infinity window (Home's account) is untouched by it: only the key-driven loads pass `invalidated`", () => {
    const src = strip(read("useRefreshOnFocus.ts"));
    expect(src).toMatch(/useRefreshOnFocus\(\(\) => \{[\s\S]*?\}, staleMs, invalid\);/);
  });
  it("useRefreshWithKey loads a key change at once only while focused, and otherwise invalidates", () => {
    const src = strip(read("useRefreshOnFocus.ts"));
    expect(src).toMatch(/const focused = useIsFocused\(\);/);
    expect(src).toMatch(/if \(focused\) loadRef\.current\(\);\s*else invalid\.current = true;/);
  });
});

describe("Home", () => {
  const src = strip(read("screens/HomeScreen.tsx"));
  it("no longer refetches through useFocusEffect(load…); the one-shot intent takeover stays a param-driven focus effect", () => {
    expect(src).not.toMatch(/useFocusEffect\(loadAccount\)|useFocusEffect\(loadCityPanels\)|useFocusEffect\(loadStories\)/);
    expect((src.match(/useFocusEffect\(/g) ?? []).length).toBe(1);
    expect(src).toMatch(/if \(!route\.params\?\.justSignedUp\) return;/);
  });
  it("the account (and the shelter redirect) loads on first focus and after a pushed screen only", () => {
    expect(src).toMatch(/useRefreshOnFocus\(loadAccount, Infinity\)/);
  });
  it("the bell dot, spotlight sources, panels and stories follow the 30 s rule, and the panels reload when the city resolves", () => {
    expect(src).toMatch(/useRefreshOnFocus\(loadHomeData\)/);
    expect(src).toMatch(/useRefreshWithKey\(loadCityPanels, cityKey\)/);
    expect(src).toMatch(/useRefreshOnFocus\(loadStories\)/);
    expect(src).toMatch(/const cityKey = isReady \? city \?\? "" : null;/);
  });
  it("a failed refresh never downgrades a panel that had loaded", () => {
    expect(src.match(/keepGoodRes\(/g)?.length).toBeGreaterThanOrEqual(4);
  });
});

describe("the other owner and guest tabs", () => {
  it.each([
    ["screens/AdoptScreen.tsx", /useRefreshWithKey\(load, `\$\{city \?\? ""\}\|\$\{species \?\? ""\}`\)/],
    ["screens/KawangGawaScreen.tsx", /useRefreshWithKey\(loadAll, loadKey\)/],
    ["screens/ProfileScreen.tsx", /useRefreshOnFocus\(load\);/],
    ["screens/HomeGuestScreen.tsx", /useRefreshOnFocus\(load\);/]
  ])("%s goes through the policy", (file, pattern) => {
    const src = strip(read(file));
    expect(src).toMatch(pattern);
    expect(src).not.toMatch(/useFocusEffect\(/);
  });
  it("Volunteer waits for the cached city before loading (the cold-start gate) and loads Browse and My shifts together", () => {
    const src = strip(read("screens/KawangGawaScreen.tsx"));
    expect(src).toMatch(/const loadKey = isReady \?/);
    expect(src).toMatch(/if \(!isGuest\) loadMine\(\)/);
  });
  it("My shifts and the guest panels are no longer blanked to a spinner on every refresh", () => {
    expect(strip(read("screens/KawangGawaScreen.tsx"))).not.toMatch(/setMineRes\(null\)/);
    expect(strip(read("screens/HomeGuestScreen.tsx"))).not.toMatch(/setListingsRes\(null\)/);
  });
  it("a shared feed reports whether its request succeeded, so a failure retries on the next focus", () => {
    expect(read("useCachedFeed.ts")).toMatch(/return r\.ok;/);
  });
});

describe("useRefreshWithKey", () => {
  const hook = read("useRefreshOnFocus.ts");
  it("a key change loads by itself (a filter, the city landing) and a null key means not ready: the focus load reports failure", () => {
    expect(hook).toMatch(/export function useRefreshWithKey/);
    expect(hook).toMatch(/if \(keyRef\.current === null\) return false;/);
    expect(hook).toMatch(/prevKey\.current !== key/);
  });
});
