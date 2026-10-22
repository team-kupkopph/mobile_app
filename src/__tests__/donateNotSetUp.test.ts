/**
 * AT1 (Abot-tulong QR plan, Runs 1-2): the backend answers 404 for an approved shelter with no verified QR, which is most shelters. The donor reaches
 * Donate from a listing, so the shelter exists; `loadState` read that 404 as "gone" and told the donor "This is no longer available / It may have been
 * removed, or you no longer have access to it." The intended "Donations aren't available for this org yet." only showed for a 200 with zero rows, which
 * the backend never sends. `donateLoadState` maps the 404 to `empty`.
 */
import { donateLoadState } from "../donateState";
import { loadStateCopy } from "../net";

const TITLE = "Donations aren't available for this org yet.";

describe("the donor's Donate state", () => {
  it("AT1: a 404 (no verified QR yet) is the 'not available yet' empty state, not 'gone'", () => {
    const s = donateLoadState({ ok: false, status: 404 } as any, undefined);
    expect(s.kind).toBe("empty");
    expect(loadStateCopy(s, TITLE).title).toBe(TITLE);
    expect(loadStateCopy(s, TITLE).title).not.toMatch(/no longer available/i);
  });
  it("a 200 with QRs is ready; a 200 with none is empty", () => {
    expect(donateLoadState({ ok: true, status: 200 } as any, 2).kind).toBe("ready");
    expect(donateLoadState({ ok: true, status: 200 } as any, 0).kind).toBe("empty");
  });
  it("loading, offline and server errors are unchanged", () => {
    expect(donateLoadState(null, undefined).kind).toBe("loading");
    expect(donateLoadState({ ok: false, status: 0 } as any, undefined).kind).toBe("offline");
    expect(donateLoadState({ ok: false, status: 500 } as any, undefined).kind).toBe("error");
  });
  it("a 403 is still 'gone' (the account may no longer be reachable)", () => {
    expect(donateLoadState({ ok: false, status: 403 } as any, undefined).kind).toBe("gone");
  });
});
