/**
 * A client must send the account's CURRENT tokens, not the ones it was built with.
 *
 * Found on a device walk of Change email (plan Task 13): after the server replaced the session's
 * tokens (email change; Change password does the same), the You tab refetched with its OLD client
 * and was signed out. `useApi()` built the client with `() => tokens`, which captures the tokens of
 * one render; and screens legitimately keep an early client alive in a `useCallback(..., [])` (the
 * You tab's `load` runs on focus and says why it must not re-run on every identity change). That
 * client sent the revoked access token, 401'd, tried the revoked refresh token, 401'd, and
 * `setTokens(null)` ended the session. The tokens a client reads have to be read at CALL time.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { createApi } from "../api/client";

function recordAuthHeaders() {
  const seen: Array<string | undefined> = [];
  global.fetch = jest.fn(async (_url: any, init: any) => {
    seen.push(init?.headers?.Authorization);
    return { status: 200, ok: true, json: async () => ({}) } as unknown as Response;
  });
  return seen;
}

describe("a client whose getter reads the latest tokens", () => {
  it("sends the replaced access token, not the one it was built with", async () => {
    const seen = recordAuthHeaders();
    const holder = { current: { access: "old-access", refresh: "old-refresh" } };
    const api = createApi(() => holder.current, async () => {});

    await api.get("/me");
    holder.current = { access: "new-access", refresh: "new-refresh" };   // the server replaced the session
    await api.get("/me");

    expect(seen).toEqual(["Bearer old-access", "Bearer new-access"]);
  });
});

describe("useApi", () => {
  const src = readFileSync(join(__dirname, "..", "api", "useApi.ts"), "utf8");

  it("finds the file it means to check", () => {
    // ⚠️ Assert the scan found something before believing it found nothing.
    expect(src).toContain("createApi");
  });

  it("reads tokens through a ref at call time, never through a closure over one render's value", () => {
    expect(src).toContain("useRef");
    expect(src).toMatch(/\.current/);
    expect(src).not.toMatch(/createApi\(\(\) => tokens,/);
  });
});
