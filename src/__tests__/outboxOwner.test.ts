import fs from "fs";

import { accountIdFromAccessToken } from "../auth/idToken";
import { queueReport, withoutOwned } from "../outbox";

// C16 · D14 — Log out with unsent reports asks "Keep for next time / Discard" first.
test.each(["src/screens/SettingsScreen.tsx", "src/screens/ProfileScreen.tsx"])(
  "%s asks about unsent reports before logging out", (file) => {
    expect(fs.readFileSync(file, "utf8")).toContain("confirmSignOutWithQueue(");
  });

// PR3-F7 · the session's owner comes from the access token's own `account_id` claim.
describe("accountIdFromAccessToken (C16)", () => {
  const b64url = (s: string) =>
    Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = (payload: unknown) =>
    `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(JSON.stringify(payload))}.sig`;

  it("reads the account id from the token's payload", () => {
    expect(accountIdFromAccessToken(jwt({ account_id: "acct-A", exp: 1 }))).toBe("acct-A");
  });

  it("is null for no token, a malformed one, or one without a string account_id", () => {
    expect(accountIdFromAccessToken(undefined)).toBeNull();
    expect(accountIdFromAccessToken("")).toBeNull();
    expect(accountIdFromAccessToken("not-a-jwt")).toBeNull();
    expect(accountIdFromAccessToken("a.%%%not-base64%%%.c")).toBeNull();
    expect(accountIdFromAccessToken(jwt({ user_id: "acct-A" }))).toBeNull();
    expect(accountIdFromAccessToken(jwt({ account_id: 42 }))).toBeNull();
  });
});

// PR3-F7 · what "Discard" at Log out (and deleting the account) removes: discardAllFor(owner).
describe("withoutOwned — the discardAllFor rule (C16 · D14)", () => {
  const a = queueReport({}, "a", 0, undefined, "acct-A");
  const b = queueReport({}, "b", 0, undefined, "acct-B");
  const legacy = queueReport({}, "legacy", 0);   // queued before owners existed: no ownerId

  it("drops the account's own reports AND legacy ones, and keeps another account's", () => {
    // Legacy items count as owned by whoever is signed in (ownedBy), so they are sendable by
    // that account — and, by the same rule, discarded with it. B's reports are never touched.
    expect(withoutOwned([a, b, legacy], "acct-A").map((i) => i.idempotency_key)).toEqual(["b"]);
  });

  it("discards nothing for no owner (signed out owns nothing)", () => {
    expect(withoutOwned([a, b, legacy], null)).toEqual([a, b, legacy]);
  });

  it("is what the provider's discardAllFor writes", () => {
    expect(fs.readFileSync("src/outbox/OutboxProvider.tsx", "utf8"))
      .toContain("await write(withoutOwned(queueRef.current, owner));");
  });
});
