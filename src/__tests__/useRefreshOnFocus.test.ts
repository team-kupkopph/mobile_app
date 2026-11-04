/**
 * SQ5 PR 1 · the refresh rule for mounted shelter tabs (spec §5.3). Pure decision function; the hook is a thin wrapper.
 * Not adopted by a screen until PR 4.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { COALESCE_MS, DEFAULT_STALE_MS, shouldRefresh } from "../useRefreshOnFocus";

const base = { lastLoadAt: 1_000_000, now: 1_000_000, staleMs: 30_000, returns: 0, returnsAtLastLoad: 0 };

describe("shouldRefresh", () => {
  it("loads on first focus", () => {
    expect(shouldRefresh({ ...base, lastLoadAt: null })).toBe(true);
  });
  it("does not reload a tab switched back to inside the stale window", () => {
    expect(shouldRefresh({ ...base, now: base.now + 29_999 })).toBe(false);
  });
  it("reloads once the data is stale", () => {
    expect(shouldRefresh({ ...base, now: base.now + 30_000 })).toBe(true);
  });
  it("reloads after returning from a pushed screen even when the data is otherwise fresh", () => {
    expect(shouldRefresh({ ...base, now: base.now + COALESCE_MS, returns: 1 })).toBe(true);
  });
  it("but not when a load began a moment ago on this same return (the focus load already covers it)", () => {
    expect(shouldRefresh({ ...base, now: base.now + COALESCE_MS - 1, returns: 1 })).toBe(false);
  });
  it("a failed load (lastLoadAt cleared) loads again on the next focus", () => {
    expect(shouldRefresh({ ...base, lastLoadAt: null, now: base.now + 1 })).toBe(true);
  });
  it("defaults to 30 s (OQ3)", () => {
    expect(DEFAULT_STALE_MS).toBe(30_000);
  });
});

it("the hook clears the stamp when load reports failure (a guard that matches nothing proves nothing)", () => {
  const src = readFileSync(join(__dirname, "..", "useRefreshOnFocus.ts"), "utf8");
  expect(src).toMatch(/ok === false\) lastLoadAt\.current = null/);
});
