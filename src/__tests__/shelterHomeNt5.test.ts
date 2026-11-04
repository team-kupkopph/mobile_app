// NT-5 (shelter home test plan) · the mobile rows the review asked for that had no test yet.
// - U9 · `requestRoute` over every kind × status in the typed unions, and an unknown kind from a newer server.
// - I7 · a 401 on page 2: the client refreshes once, retries, and the paged list appends the page once. A refresh that
//   fails signs out once (setTokens(null)), and page 2 reports a failure instead of rows.
import { ShelterRequest, ShelterRequestKind, ShelterRequestStatus } from "../api/types";
import { createApi } from "../api/client";
import { PagedState, createPagedList } from "../pagedList";
import { REQUEST_STATUS_TONE, requestRoute } from "../shelterRequests";

const KINDS: ShelterRequestKind[] = ["adoption", "volunteer", "placement"];
const STATUSES = Object.keys(REQUEST_STATUS_TONE) as ShelterRequestStatus[];   // keyed by the union: every status

const item = (kind: string, status: string): ShelterRequest => ({
  kind: kind as ShelterRequestKind, id: "row-id", title: "t", subtitle: "s", status: status as ShelterRequestStatus,
  created_at: "2030-10-10T00:00:00Z", target: { route: "x", id: "target-id" }
});

describe("requestRoute: every kind × status (U9)", () => {
  it("the matrix is the full union (guard the guard)", () => {
    expect(STATUSES).toHaveLength(9);
  });

  for (const kind of KINDS) {
    for (const status of STATUSES) {
      it(`${kind} · ${status} routes on target.id, never the row id`, () => {
        const route = requestRoute(item(kind, status));
        expect(route.name).toMatch(/^(applicant|inquiry|placeRequest|shelterVolunteerActivity)$/);
        expect(Object.values(route.params)).toContain("target-id");
        expect(Object.values(route.params)).not.toContain("row-id");
      });
    }
  }

  it("only an active placement opens Accept/Decline; a decided one opens the ladder", () => {
    for (const status of STATUSES) {
      expect(requestRoute(item("placement", status)).name).toBe(status === "active" ? "placeRequest" : "inquiry");
    }
  });

  it("an unknown kind from a newer server falls back to the inquiry ladder and does not throw", () => {
    expect(() => requestRoute(item("fostering", "active"))).not.toThrow();
    expect(requestRoute(item("fostering", "active"))).toEqual({ name: "inquiry", params: { inquiryId: "target-id" } });
  });
});

describe("a 401 on page 2 (I7)", () => {
  const page = (ids: string[], next: number | null) => ({ results: ids.map((id) => ({ id })), next, count: 21 });
  const json = (status: number, body: unknown) =>
    ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
  const flush = () => new Promise((r) => setImmediate(r));

  function harness(refreshStatus: number) {
    const calls: string[] = [];
    let page2Seen = 0;
    global.fetch = jest.fn(async (url: string) => {
      calls.push(String(url));
      if (String(url).endsWith("/auth/refresh")) {
        return json(refreshStatus, refreshStatus === 200 ? { access: "new" } : { error: { code: "token_not_valid" } });
      }
      if (String(url).includes("page=1")) return json(200, page(Array.from({ length: 20 }, (_, i) => `r${i}`), 2));
      page2Seen += 1;
      return page2Seen === 1 ? json(401, { error: { code: "token_not_valid" } }) : json(200, page(["r20"], null));
    }) as unknown as typeof fetch;
    const setTokens = jest.fn(async () => undefined);
    const api = createApi(() => ({ access: "old", refresh: "r" }), setTokens);
    let state: PagedState<{ id: string }> | null = null;
    const list = createPagedList<{ id: string }>((p) => api.get(p), (s) => { state = s; });
    return { calls, setTokens, list, now: () => state! };
  }

  it("refreshes once, retries once, and appends page 2 once", async () => {
    const h = harness(200);
    await h.list.reset("/shelter/requests?kind=adoption&status=open");
    await h.list.more();
    await flush();
    expect(h.calls.filter((u) => u.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(h.calls.filter((u) => u.includes("page=2"))).toHaveLength(2);         // the 401, then the retry
    expect(h.now().items!.map((r) => r.id)).toEqual([...Array.from({ length: 20 }, (_, i) => `r${i}`), "r20"]);
    expect(h.now().next).toBeNull();
    expect(h.setTokens).toHaveBeenCalledTimes(1);
    expect(h.setTokens).toHaveBeenCalledWith({ access: "new", refresh: "r" });
  });

  it("a failed refresh signs out once and page 2 reports a failure, keeping page 1", async () => {
    const h = harness(401);
    await h.list.reset("/shelter/requests?kind=adoption&status=open");
    await h.list.more();
    await flush();
    expect(h.setTokens).toHaveBeenCalledTimes(1);
    expect(h.setTokens).toHaveBeenCalledWith(null);
    expect(h.now().items).toHaveLength(20);
    expect(h.now().moreFailed).toBe(true);
  });
});
