/**
 * F15 (dev/test-plan-auth.md, Run 3 · X-1) — Log out never revoked the refresh token.
 *
 * `signOut()` used to be `await setTokens(null)` and nothing else. Refresh tokens live 30 days,
 * so a refresh copied off a device kept minting access tokens after the user signed out; only
 * "log out everywhere" killed it. The backend already exposes POST /auth/logout {refresh}
 * (Bearer access, blacklists the refresh, 204 even for a bogus refresh — best-effort).
 *
 * The fix routes sign-out through `src/auth/logout.ts`: a bounded, never-rejecting server
 * revoke, THEN the local wipe. These tests pin the request shape, that the wipe survives a
 * rejected / hung / absent request, and that AuthContext actually goes through the helper.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { LOGOUT_REVOKE_TIMEOUT_MS, signOutWithRevoke } from "../auth/logout";

const TOKENS = { access: "acc-123", refresh: "ref-456" };

type Call = { url: string; init: any };
function captureFetch(status = 204): Call[] {
  const calls: Call[] = [];
  global.fetch = jest.fn(async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return { status, ok: status < 400, json: async () => ({}) } as unknown as Response;
  });
  return calls;
}

afterEach(() => {
  jest.useRealTimers();
});

test("(a) sign-out POSTs /auth/logout with the refresh in the body and the access as Bearer", async () => {
  const calls = captureFetch();
  const wipe = jest.fn(async () => {});

  await signOutWithRevoke(TOKENS, wipe);

  expect(calls).toHaveLength(1);
  expect(calls[0].url).toMatch(/\/auth\/logout$/);
  expect(calls[0].init.method).toBe("POST");
  expect(calls[0].init.headers.Authorization).toBe(`Bearer ${TOKENS.access}`);
  expect(JSON.parse(calls[0].init.body)).toEqual({ refresh: TOKENS.refresh });
  expect(wipe).toHaveBeenCalledTimes(1);
});

test("(a') the revoke is attempted BEFORE the local wipe, so a fast success is not cancelled", async () => {
  const order: string[] = [];
  global.fetch = jest.fn(async () => {
    order.push("revoke");
    return { status: 204, ok: true, json: async () => ({}) } as unknown as Response;
  });
  const wipe = jest.fn(async () => { order.push("wipe"); });

  await signOutWithRevoke(TOKENS, wipe);

  expect(order).toEqual(["revoke", "wipe"]);
});

test("(b) the local wipe still happens when the revoke request rejects (offline)", async () => {
  global.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); });
  const wipe = jest.fn(async () => {});

  await expect(signOutWithRevoke(TOKENS, wipe)).resolves.toBeUndefined();

  expect(wipe).toHaveBeenCalledTimes(1);
});

test("(b) the local wipe still happens when the server answers 401", async () => {
  captureFetch(401);
  const wipe = jest.fn(async () => {});

  await signOutWithRevoke(TOKENS, wipe);

  expect(wipe).toHaveBeenCalledTimes(1);
});

test("(b) a hung revoke request cannot delay the wipe past LOGOUT_REVOKE_TIMEOUT_MS", async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn(() => new Promise<Response>(() => {}));   // never settles
  const wipe = jest.fn(async () => {});

  const done = signOutWithRevoke(TOKENS, wipe);
  await jest.advanceTimersByTimeAsync(LOGOUT_REVOKE_TIMEOUT_MS - 1);
  expect(wipe).not.toHaveBeenCalled();                            // still inside the bounded wait

  await jest.advanceTimersByTimeAsync(1);
  await done;
  expect(wipe).toHaveBeenCalledTimes(1);
});

test("no tokens → no request, but the wipe still runs", async () => {
  const calls = captureFetch();
  const wipe = jest.fn(async () => {});

  await signOutWithRevoke(null, wipe);

  expect(calls).toHaveLength(0);
  expect(wipe).toHaveBeenCalledTimes(1);
});

test("(c) AuthContext.signOut goes through auth/logout — not a bare setTokens(null)", () => {
  const src = readFileSync(join(__dirname, "..", "auth", "AuthContext.tsx"), "utf8");
  expect(src).toMatch(/from ["']\.\/logout["']|auth\/logout/);
  expect(src).toMatch(/signOutWithRevoke\(/);
});
