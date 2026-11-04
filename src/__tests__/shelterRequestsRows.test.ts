// V3 / SH17 (shelter home review, 2026-10-29) · step 10, Requests rows match ShelterRequests.dc.html: a kind
// glyph tile per row, a "{n} {segment} requests" line above the list, and an empty state per segment. The count
// is the server's `count` (backend#133), never `results.length`, which undercounts once there is a page 2.
import { readFileSync } from "fs";
import { join } from "path";

import { createPagedList } from "../pagedList";
import { REQUEST_KIND_TILE, requestCountLine, requestsEmptyCopy } from "../shelterRequests";
import { colors } from "../theme";

describe("REQUEST_KIND_TILE", () => {
  it("gives each of the three kinds its own glyph and a theme tint", () => {
    const kinds = ["adoption", "volunteer", "placement"] as const;
    expect(new Set(kinds.map((k) => REQUEST_KIND_TILE[k].icon)).size).toBe(3);
    for (const k of kinds) expect(Object.values(colors)).toContain(REQUEST_KIND_TILE[k].bg);
  });
});

describe("requestCountLine", () => {
  it("reads the server's total for the segment, singular and plural", () => {
    expect(requestCountLine(25, "Adoption")).toBe("25 adoption requests");
    expect(requestCountLine(1, "Volunteer")).toBe("1 volunteer request");
  });
  it("says nothing when the server sent no count (an older server) or there are none", () => {
    expect(requestCountLine(null, "Adoption")).toBeNull();
    expect(requestCountLine(0, "Placement")).toBeNull();
  });
});

describe("requestsEmptyCopy", () => {
  it("names the segment, as the artboard does", () => {
    expect(requestsEmptyCopy("Volunteer")).toEqual({
      title: "No volunteer requests", body: "New requests land here as they come in."
    });
  });
});

describe("createPagedList keeps page 1's count", () => {
  it("reads count from page 1 and keeps it across Load more", async () => {
    const pages: Record<string, unknown> = {
      "/r?page=1": { results: [{ id: "a" }], next: 2, count: 2 },
      "/r?page=2": { results: [{ id: "b" }], next: null, count: 2 }
    };
    let last: { count: number | null } | null = null;
    const list = createPagedList<{ id: string }>(async (p) => ({ ok: true, status: 200, data: pages[p] }),
      (s) => { last = s; });
    await list.reset("/r");
    expect(last!.count).toBe(2);
    await list.more();
    expect(last!.count).toBe(2);
  });
  it("is null when the server sent none", async () => {
    let last: { count: number | null } | null = null;
    const list = createPagedList(async () => ({ ok: true, status: 200, data: { results: [], next: null } }),
      (s) => { last = s; });
    await list.reset("/r");
    expect(last!.count).toBeNull();
  });
});

describe("ShelterRequestsScreen renders the artboard's row", () => {
  const screen = readFileSync(join(__dirname, "..", "screens", "ShelterRequestsScreen.tsx"), "utf8");
  it("draws the kind tile, the count line and the per-segment empty copy", () => {
    expect(screen).toMatch(/REQUEST_KIND_TILE\[item\.kind\]/);
    expect(screen).toMatch(/requestCountLine\(paged\.count, SEGMENTS\[segment\]\)/);
    expect(screen).toMatch(/requestsEmptyCopy\(SEGMENTS\[segment\]\)/);
    expect(screen).not.toMatch(/No requests here yet\./);
  });
});
