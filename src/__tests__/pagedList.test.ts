// SH3 / SH6 (shelter home review, 2026-10-29) · the Requests inbox asked for page 1 only, so a shelter with more
// than 20 open requests in a segment never saw the OLDEST ones (rows are newest first: the people waiting longest).
// And `load()` had no request guard, so a slow Adoption answer arriving after the Volunteer one overwrote it.
// `createPagedList` is the R1-F1 generation counter + "Load more" from ListingsByStatus, pulled out pure so both
// halves are testable without rendering.
import { readFileSync } from "fs";
import { join } from "path";

import { ApiResult } from "../api/client";
import { PagedState, createPagedList } from "../pagedList";

type Row = { id: string };
const rows = (from: number, n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: `r${from + i}` }));

/** A fake server: 25 rows for `kind=adoption`, paged at 20; anything else has 3. Each call is a deferred so a test
 *  can resolve answers out of order. */
function server() {
  const calls: Array<{ path: string; resolve: (r: ApiResult) => void }> = [];
  const get = (path: string) => new Promise<ApiResult>((resolve) => calls.push({ path, resolve }));
  const answer = (i: number, override?: Partial<ApiResult>) => {
    const { path, resolve } = calls[i];
    const page = Number(/[?&]page=(\d+)/.exec(path)?.[1] ?? "1");
    const all = path.includes("kind=adoption") ? rows(1, 25) : rows(100, 3);
    const results = all.slice((page - 1) * 20, page * 20);
    resolve({ ok: true, status: 200, data: { results, next: page * 20 < all.length ? page + 1 : null }, ...override });
  };
  return { calls, get, answer };
}

function harness() {
  const s = server();
  let state: PagedState<Row> | null = null;
  const list = createPagedList<Row>(s.get, (next) => { state = next; });
  return { s, list, now: () => state! };
}

const flush = () => new Promise((r) => setImmediate(r));

describe("createPagedList (SH3 — every page; SH6 — no stale answers)", () => {
  it("asks for page 1 with a page parameter, keeping the query", async () => {
    const { s, list } = harness();
    list.reset("/shelter/requests?kind=adoption&status=open");
    expect(s.calls[0].path).toBe("/shelter/requests?kind=adoption&status=open&page=1");
  });

  it("25 rows: page 1 gives 20 and next=2; Load more gives all 25 and stops", async () => {
    const { s, list, now } = harness();
    list.reset("/shelter/requests?kind=adoption&status=open");
    s.answer(0); await flush();
    expect(now().items).toHaveLength(20);
    expect(now().next).toBe(2);
    expect(now().res).toEqual({ ok: true, status: 200 });

    list.more();
    expect(s.calls[1].path).toBe("/shelter/requests?kind=adoption&status=open&page=2");
    s.answer(1); await flush();
    expect(now().items).toHaveLength(25);
    expect(now().items!.map((r) => r.id)).toEqual(rows(1, 25).map((r) => r.id));
    expect(now().next).toBeNull();

    list.more();   // next is null: nothing more is asked for
    expect(s.calls).toHaveLength(2);
  });

  it("a segment switch while page 1 is in flight shows only the new segment, whatever order the answers land in", async () => {
    const { s, list, now } = harness();
    list.reset("/shelter/requests?kind=adoption&status=open");
    list.reset("/shelter/requests?kind=volunteer&status=open");
    s.answer(1); await flush();     // volunteer answers first
    s.answer(0); await flush();     // the slow adoption answer arrives late
    expect(now().items!.map((r) => r.id)).toEqual(["r100", "r101", "r102"]);
    expect(now().next).toBeNull();
  });

  it("drops a page 2 that arrives after a segment switch", async () => {
    const { s, list, now } = harness();
    list.reset("/shelter/requests?kind=adoption&status=open");
    s.answer(0); await flush();
    list.more();                                         // page 2 of adoption in flight
    list.reset("/shelter/requests?kind=volunteer&status=open");
    s.answer(2); await flush();                          // volunteer page 1
    s.answer(1); await flush();                          // adoption page 2, stale
    expect(now().items!.map((r) => r.id)).toEqual(["r100", "r101", "r102"]);
  });

  it("a second Load more while one is in flight does not ask twice (no duplicate rows)", async () => {
    const { s, list, now } = harness();
    list.reset("/shelter/requests?kind=adoption&status=open");
    s.answer(0); await flush();
    list.more();
    list.more();
    expect(s.calls).toHaveLength(2);
    s.answer(1); await flush();
    expect(new Set(now().items!.map((r) => r.id)).size).toBe(25);
  });

  it("a failed page 2 keeps page 1's rows and the same next, and says so for an inline retry", async () => {
    const { s, list, now } = harness();
    list.reset("/shelter/requests?kind=adoption&status=open");
    s.answer(0); await flush();
    list.more();
    s.answer(1, { ok: false, status: 0, data: null }); await flush();
    expect(now().items).toHaveLength(20);
    expect(now().next).toBe(2);
    expect(now().moreFailed).toBe(true);
    expect(now().res).toEqual({ ok: true, status: 200 });   // the list is not turned into a failed load
    list.more();                                             // retry
    expect(s.calls[2].path).toMatch(/page=2$/);
    expect(now().moreFailed).toBe(false);
  });

  it("a failed page 1 reports the failure with no rows (never an empty 'No requests' list)", async () => {
    const { s, list, now } = harness();
    list.reset("/shelter/requests?kind=adoption&status=open");
    s.answer(0, { ok: false, status: 0, data: null }); await flush();
    expect(now().res).toEqual({ ok: false, status: 0 });
    expect(now().items).toBeNull();
  });

  it("an empty page with a non-null next (server inconsistency) does not page on its own", async () => {
    const calls: string[] = [];
    const looping = createPagedList<Row>(async (p) => { calls.push(p); return { ok: true, status: 200, data: { results: [], next: 2 } }; },
      () => undefined);
    looping.reset("/x?kind=adoption");
    await flush();
    expect(calls).toHaveLength(1);
  });
});

describe("ShelterRequestsScreen pages through createPagedList", () => {
  const screen = readFileSync(join(__dirname, "..", "screens", "ShelterRequestsScreen.tsx"), "utf8");

  it("loads through the paged list, not a bare page-1 api.get", () => {
    expect(screen).toMatch(/createPagedList</);
    expect(screen).not.toMatch(/api\.get\(`\/shelter\/requests/);
  });

  it("offers Load more only while the server says there is a next page, with a 44 pt target", () => {
    expect(screen).toMatch(/paged\.next \? \(/);
    expect(screen).toMatch(/testID="btn\.shelterRequests\.loadMore"/);
    expect(screen).toMatch(/onPress=\{\(\) => list\.more\(\)\}/);
    expect(screen).toMatch(/Load more/);
  });

  it("says when page 2 failed instead of silently stopping", () => {
    expect(screen).toMatch(/paged\.moreFailed/);
  });
});
