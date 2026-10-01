import fs from "fs";

import {
  applyFlushResult, applyResult, backoffMs, dueItems, isDue, isStuck, MAX_ATTEMPTS, nextFlushDelay, pendingLabel,
  queueReport, shouldQueue,
  visibleTo,
} from "../outbox";

const NOW = 1_000_000;
const item = (over: Partial<ReturnType<typeof queueReport>> = {}) => ({
  ...queueReport({ species: "dog" }, "key-1", NOW),
  ...over,
});

describe("queueReport", () => {
  it("carries the idempotency key into the body", () => {
    // Compose-time key: every retry of this queued report sends the same value, which is
    // the entire basis of the server's exactly-once behaviour.
    const q = queueReport({ species: "dog", condition: "injured" }, "abc", NOW);
    expect(q.body.idempotency_key).toBe("abc");
    expect(q.idempotency_key).toBe("abc");
  });

  it("is due immediately — the network may already be back", () => {
    expect(isDue(queueReport({}, "k", NOW), NOW)).toBe(true);
  });
});

describe("backoffMs", () => {
  it("grows so a dead radio is not hammered", () => {
    // The person is still standing in the street; flattening their battery helps nobody.
    expect(backoffMs(1)).toBeLessThan(backoffMs(2));
    expect(backoffMs(2)).toBeLessThan(backoffMs(3));
  });

  it("is capped so a report queued overnight sends soon after the network returns", () => {
    expect(backoffMs(50)).toBeLessThanOrEqual(30 * 60_000);
  });
});

describe("applyResult", () => {
  it("removes the item once the server has it", () => {
    expect(applyResult(item(), { ok: true, status: 201 }, NOW)).toBeNull();
  });

  it("retries a network failure with a later attempt time", () => {
    const next = applyResult(item(), { ok: false, status: 0 }, NOW)!;
    expect(next.attempts).toBe(1);
    expect(next.nextAttemptAt).toBeGreaterThan(NOW);
    expect(next.lastError).toBe("offline");
  });

  it("retries a server error — that is transient", () => {
    const next = applyResult(item(), { ok: false, status: 503 }, NOW)!;
    expect(next.attempts).toBe(1);
    expect(isStuck(next)).toBe(false);
  });

  it("stops retrying something the server will refuse forever", () => {
    // A 422 means the server has judged this report and will judge it identically every
    // time. Retrying for days would keep a doomed item cycling and hide it behind "Retrying…".
    const next = applyResult(item(), { ok: false, status: 422 }, NOW)!;
    expect(isStuck(next)).toBe(true);
    expect(next.lastError).toBe("rejected_422");
  });

  it("treats 429 as transient, not as a refusal", () => {
    // Being throttled is the server saying "later", not "no".
    const next = applyResult(item(), { ok: false, status: 429 }, NOW)!;
    expect(isStuck(next)).toBe(false);
  });

  it("never discards a report, even after giving up", () => {
    // THE RULE: §13.3 forbids silently losing a report. Giving up on automatic retry is not
    // permission to delete someone's report — it stays visible with a manual retry.
    let current = item();
    for (let i = 0; i < MAX_ATTEMPTS + 3; i++) {
      const next = applyResult(current, { ok: false, status: 0 }, NOW);
      expect(next).not.toBeNull();
      current = next!;
    }
    expect(isStuck(current)).toBe(true);
  });
});

describe("isDue", () => {
  it("waits out the backoff", () => {
    expect(isDue(item({ attempts: 1, nextAttemptAt: NOW + 5000 }), NOW)).toBe(false);
    expect(isDue(item({ attempts: 1, nextAttemptAt: NOW + 5000 }), NOW + 5000)).toBe(true);
  });

  it("stops attempting a stuck item automatically", () => {
    expect(isDue(item({ attempts: MAX_ATTEMPTS, nextAttemptAt: 0 }), NOW)).toBe(false);
  });
});

describe("dueItems", () => {
  it("sends the oldest first", () => {
    const queue = [
      item({ idempotency_key: "new", createdAt: NOW + 500 }),
      item({ idempotency_key: "old", createdAt: NOW - 500 }),
    ];
    expect(dueItems(queue, NOW, "acct-A").map((i) => i.idempotency_key)).toEqual(["old", "new"]);
  });

  it("skips what is not due", () => {
    const queue = [item({ attempts: 2, nextAttemptAt: NOW + 60_000 })];
    expect(dueItems(queue, NOW, "acct-A")).toEqual([]);
  });
});

describe("pendingLabel", () => {
  it("tells the person what is happening to their report", () => {
    expect(pendingLabel(item())).toMatch(/waiting/i);
    expect(pendingLabel(item({ attempts: 2 }))).toMatch(/retry/i);
    expect(pendingLabel(item({ attempts: MAX_ATTEMPTS }))).toMatch(/not sent/i);
  });
});

test("shouldQueue: offline and gateway failures queue; a real answer doesn't (C17)", () => {
  [0, 502, 503, 504].forEach((s) => expect(shouldQueue(s)).toBe(true));
  [400, 401, 403, 409, 429, 500].forEach((s) => expect(shouldQueue(s)).toBe(false));
});

test("C16 · a queued report is sent and shown only for the account that queued it", () => {
  const a = queueReport({ species: "dog" }, "k1", 0, undefined, "acct-A");
  const b = queueReport({ species: "cat" }, "k2", 0, undefined, "acct-B");
  const legacy = queueReport({ species: "dog" }, "k3", 0);          // queued before owners existed
  expect(dueItems([a, b, legacy], 1, "acct-A").map((i) => i.idempotency_key)).toEqual(["k1", "k3"]);
  expect(dueItems([a, b, legacy], 1, null)).toEqual([]);           // signed out: nothing is sent
  expect(visibleTo([a, b, legacy], "acct-B").map((i) => i.idempotency_key)).toEqual(["k2", "k3"]);
});

describe("applyFlushResult (PR3-F1)", () => {
  // The flush loop awaits a POST for up to 20 s. Whatever was written to the queue meanwhile is
  // the truth; the result of the send is applied to THAT, never to the snapshot taken before.
  const sent = queueReport({ species: "dog" }, "sent", 0, undefined, "acct-A");
  const other = queueReport({ species: "cat" }, "other", 0, undefined, "acct-A");
  const added = queueReport({ species: "dog" }, "added", 1, undefined, "acct-A");

  it("keeps a report enqueued while the send was in flight", () => {
    const latest = [sent, other, added];
    expect(applyFlushResult(latest, sent, null).map((i) => i.idempotency_key)).toEqual(["other", "added"]);
    const retried = applyResult(sent, { ok: false, status: 503 }, NOW)!;
    expect(applyFlushResult(latest, sent, retried)).toEqual([retried, other, added]);
  });

  it("does not resurrect a report discarded while the send was in flight", () => {
    const latest = [other];                                   // "sent" was discarded mid-flush
    const retried = applyResult(sent, { ok: false, status: 0 }, NOW)!;
    expect(applyFlushResult(latest, sent, retried)).toBe(latest);
    expect(applyFlushResult(latest, sent, null)).toBe(latest);
  });
});

test("PR3-F1 · the flush loop applies each result to the queue as it is after the send", () => {
  const src = fs.readFileSync("src/outbox/OutboxProvider.tsx", "utf8");
  expect(src).toMatch(/const latest = queueRef\.current;\s*const updated = applyFlushResult\(latest, item, next\)/);
  expect(src).not.toMatch(/let current = queueRef\.current/);
});

describe("nextFlushDelay (PR3-F2 · a report queued while online still retries)", () => {
  // C17 queues timeouts and 502/503/504 while NetInfo says online, so no reconnect will ever come
  // to flush them. The provider sets a timer for the earliest retry this account is owed.
  const mine = (key: string, nextAttemptAt: number, attempts = 1) =>
    ({ ...queueReport({}, key, 0, undefined, "acct-A"), attempts, nextAttemptAt });

  it("waits for the earliest retry of this account's reports", () => {
    expect(nextFlushDelay([mine("a", NOW + 40_000), mine("b", NOW + 10_000)], NOW, "acct-A")).toBe(10_000);
  });

  it("never fires sooner than 1 s, even for something already due", () => {
    expect(nextFlushDelay([mine("a", NOW - 5_000)], NOW, "acct-A")).toBe(1_000);
    expect(nextFlushDelay([mine("a", NOW + 200)], NOW, "acct-A")).toBe(1_000);
  });

  it("has nothing to wait for: an empty queue, another account's, a stuck one, or signed out", () => {
    const theirs = { ...mine("b", NOW + 10_000), ownerId: "acct-B" };
    const stuck = mine("s", NOW + 10_000, MAX_ATTEMPTS);   // only a manual "Try again" sends it
    expect(nextFlushDelay([], NOW, "acct-A")).toBeNull();
    expect(nextFlushDelay([theirs, stuck], NOW, "acct-A")).toBeNull();
    expect(nextFlushDelay([mine("a", NOW + 10_000)], NOW, null)).toBeNull();
  });
});

test("PR3-F2 · the provider retries on a timer while online, and right after queueing", () => {
  const src = fs.readFileSync("src/outbox/OutboxProvider.tsx", "utf8");
  expect(src).toMatch(/nextFlushDelay\(queue, Date\.now\(\), ownerId\)/);
  expect(src).toMatch(/setTimeout\(\(\) => \{ void flush\(\); \}, delay\)/);
  expect(src).toContain("clearTimeout(");
  const enqueue = src.slice(src.indexOf("const enqueue"), src.indexOf("const retry"));
  expect(enqueue).toMatch(/if \(online\) void flush\(\)|if \(online\) await flush\(\)/);
});
