// NT-4 (shelter home test plan; owner decision 2026-11-04: drop late answers) · Home and You fired their requests on
// every focus and applied each answer whenever it landed. A slow answer from an earlier visit could overwrite the
// newer one until the next focus. `createLatestOnly` is the per-focus generation counter Requests got in step 2
// (createPagedList), as a wrapper: an answer applies only if no later load has started since.
import { readFileSync } from "fs";
import { join } from "path";

import { createLatestOnly } from "../latestOnly";

describe("createLatestOnly", () => {
  it("applies the answers of the current load", () => {
    const latest = createLatestOnly();
    const seen: number[] = [];
    const only = latest.begin();
    only((n: number) => seen.push(n))(1);
    only((n: number) => seen.push(n))(2);
    expect(seen).toEqual([1, 2]);
  });

  it("drops an answer from an earlier load that lands after a later load began", () => {
    const latest = createLatestOnly();
    const seen: string[] = [];
    const first = latest.begin();
    const second = latest.begin();
    second((s: string) => seen.push(s))("new");
    first((s: string) => seen.push(s))("stale");     // the slow first answer arrives last
    expect(seen).toEqual(["new"]);
  });

  it("passes the answer through unchanged", () => {
    const latest = createLatestOnly();
    let got: unknown;
    latest.begin()((r: { ok: boolean }) => { got = r; })({ ok: true });
    expect(got).toEqual({ ok: true });
  });
});

describe("Home and You apply only the latest focus's answers", () => {
  for (const rel of ["screens/ShelterDashboardScreen.tsx", "screens/ShelterProfileScreen.tsx"]) {
    const src = readFileSync(join(__dirname, "..", rel), "utf8");
    const load = /const load = useCallback\(\(\) => \{([\s\S]*?)\n {4}\}, \[\]\);/.exec(src)?.[1] ?? "";

    it(`${rel}: the scan found the load function and its requests`, () => {
      expect((load.match(/api\.get\(/g) ?? []).length).toBeGreaterThanOrEqual(4);
    });

    it(`${rel}: begins a generation per load and wraps every answer`, () => {
      expect(load).toMatch(/const only = latest\.begin\(\);/);
      expect((load.match(/api\.get\([^)]*\)\.then\(only\(/g) ?? []).length)
        .toBe((load.match(/api\.get\(/g) ?? []).length);
    });
  }
});
