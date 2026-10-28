import fs from "fs";

import { accountIdFromAccessToken } from "../auth/idToken";
import { queueReport, withoutOwned } from "../outbox";

// C16 · D14 — Log out with unsent reports asks "Keep for next time / Discard" first.
// Task 10 · all three screens now log out through ONE rule, `confirmLogout`, which owns the prompt (below).
test.each(["src/screens/SettingsScreen.tsx", "src/screens/ProfileScreen.tsx", "src/screens/ShelterProfileScreen.tsx"])(
  "%s asks about unsent reports before logging out", (file) => {
    expect(fs.readFileSync(file, "utf8")).toContain("confirmLogout(");
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

test("PR3-F8 · Log out asks one question, never an alert inside an alert", () => {
  // Task 10 · this rule moved from Settings into the shared `confirmLogout` (behaviour pinned in
  // settingsAccount.test.ts); the source still has to have the shape that makes it true.
  const src = fs.readFileSync("src/auth/confirmLogout.ts", "utf8");
  const logout = src.slice(src.indexOf("export function confirmLogout"));
  expect(logout.length).toBeGreaterThan(100);              // the scan found the function
  // unsent reports → only the keep/discard prompt (it has its own Cancel)…
  expect(logout).toMatch(/if \(queueCount > 0\) \{\s*confirmSignOutWithQueue\(/);
  // …otherwise the plain confirm, which no longer opens a second alert from its button
  const confirm = logout.slice(logout.indexOf('Alert.alert("Log out?"'));
  expect(confirm).toContain('Alert.alert("Log out?"');
  expect(confirm).not.toContain("confirmSignOutWithQueue(");
});

test("P1 · the shelter profile's Log out asks keep/discard, and discard clears this account's queue", () => {
  const src = fs.readFileSync("src/screens/ShelterProfileScreen.tsx", "utf8");
  expect(src).toMatch(/onPress=\{(?!signOut\})/);
  expect(src).not.toMatch(/onPress=\{signOut\}/);
  expect(src).toContain("confirmLogout(");
  expect(src).toContain("queueCount: queue.length");
  expect(src).toContain("discardAllFor(accountIdFromAccessToken(tokens?.access))");
});
