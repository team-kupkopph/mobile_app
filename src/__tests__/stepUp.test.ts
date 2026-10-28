/**
 * Plan Task 14c · the step-up prompt (backend: accounts/stepup.py).
 *
 * With two-step verification on, five routes answer `403 step_up_required` until the request carries
 * `X-Step-Up: <token>`: DELETE /me, POST /me/password, POST /me/email, GET /me/export and
 * POST /me/2fa/disable (and enabling needs a proof too). The app answers that ONCE per action: ask for a
 * code, get a token, retry the same call with it. A prompt on every action trains people to ignore it,
 * so the rule is exactly one prompt and exactly one retry.
 *
 * Pure logic is tested directly; the wiring a helper cannot see is a source scan, and each scan asserts it
 * FOUND the file before it is allowed to say the file is fine.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { createApi } from "../api/client";
import {
  STEP_UP_HEADER,
  isStepUpRequired,
  requestStepUpCode,
  runWithStepUp,
  verifyStepUp,
} from "../stepUp";
import { settingsGroups } from "../settings";
import { STEP_UP_TOKEN_TTL_MS, clearStepUpCache, getCachedStepUp, setCachedStepUp } from "../stepUpCache";

// Every test starts with no remembered proof: the cache is module-level on purpose (it outlives a screen).
beforeEach(() => clearStepUpCache());

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");

const NEEDS = { ok: false, status: 403, data: { error: { code: "step_up_required" } } };
const DONE = { ok: true, status: 200, data: { done: true } };

describe("isStepUpRequired", () => {
  it("is only the server's step_up_required refusal", () => {
    expect(isStepUpRequired(NEEDS)).toBe(true);
    expect(isStepUpRequired({ ok: false, status: 403, data: { error: { code: "forbidden" } } })).toBe(false);
    expect(isStepUpRequired({ ok: false, status: 401, data: {} })).toBe(false);
    expect(isStepUpRequired(DONE)).toBe(false);
  });
});

describe("runWithStepUp", () => {
  const sendsOk = { post: jest.fn(async () => ({ ok: true, status: 202, data: { sent_to: "o***@example.com" } })) };

  it("with no proof needed it just returns the result: no prompt, no code sent", async () => {
    const ask = jest.fn();
    const call = jest.fn(async () => DONE);

    const out = await runWithStepUp({ call, api: sendsOk, ask });

    expect(out).toEqual({ kind: "result", res: DONE });
    expect(ask).not.toHaveBeenCalled();
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("asks for a proof exactly once and retries exactly once, carrying the token", async () => {
    const ask = jest.fn(async () => "tok-123");
    const call = jest.fn(async (token?: string) => (token ? DONE : NEEDS));

    const out = await runWithStepUp({ call, api: sendsOk, ask });

    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask).toHaveBeenCalledWith("o***@example.com");        // tells the person where the code went
    expect(call.mock.calls.map((c) => c[0])).toEqual([undefined, "tok-123"]);
    expect(out).toEqual({ kind: "result", res: DONE });
  });

  it("cancelling the prompt leaves the action undone and says nothing", async () => {
    const call = jest.fn(async () => NEEDS);

    const out = await runWithStepUp({ call, api: sendsOk, ask: async () => null });

    expect(out).toEqual({ kind: "cancelled" });
    expect(call).toHaveBeenCalledTimes(1);                         // never retried
  });

  it("a code that could not be sent is reported, and the action is not retried", async () => {
    const api = { post: jest.fn(async () => ({ ok: false, status: 409, data: { error: { code: "no_verified_channel" } } })) };
    const ask = jest.fn();
    const call = jest.fn(async () => NEEDS);

    const out = await runWithStepUp({ call, api, ask });

    expect(out).toMatchObject({ kind: "unavailable", message: expect.stringMatching(/verified email/i) });
    expect(ask).not.toHaveBeenCalled();
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("a second refusal after the proof is handed back, not prompted for again", async () => {
    const ask = jest.fn(async () => "tok");
    const call = jest.fn(async () => NEEDS);

    const out = await runWithStepUp({ call, api: sendsOk, ask });

    expect(ask).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledTimes(2);
    expect(out).toEqual({ kind: "result", res: NEEDS });
  });
});

describe("keeping the proof for its life (N5)", () => {
  const sendsOk = { post: jest.fn(async () => ({ ok: true, status: 202, data: { sent_to: "o***@example.com" } })) };

  it("a proof earned by one action covers the next one: no second prompt, no second code", async () => {
    const ask = jest.fn(async () => "tok-1");
    const call = jest.fn(async (token?: string) => (token ? DONE : NEEDS));

    await runWithStepUp({ call, api: sendsOk, ask });
    sendsOk.post.mockClear();
    const out = await runWithStepUp({ call, api: sendsOk, ask });

    expect(out).toEqual({ kind: "result", res: DONE });
    expect(ask).toHaveBeenCalledTimes(1);                    // only the first action prompted
    expect(sendsOk.post).not.toHaveBeenCalled();             // and no second code was sent
    expect(call.mock.calls.map((c) => c[0]).slice(-1)).toEqual(["tok-1"]);   // the second went straight out with it
  });

  it("the remembered proof expires before the server's five minutes do", () => {
    expect(STEP_UP_TOKEN_TTL_MS).toBeLessThan(300_000);
    setCachedStepUp("tok", 1_000);

    expect(getCachedStepUp(1_000 + STEP_UP_TOKEN_TTL_MS - 1)).toBe("tok");
    expect(getCachedStepUp(1_000 + STEP_UP_TOKEN_TTL_MS)).toBeUndefined();
  });

  it("once it has expired the next action asks again", async () => {
    setCachedStepUp("old", 0);
    const ask = jest.fn(async () => "fresh");
    const call = jest.fn(async (token?: string) => (token === "fresh" ? DONE : NEEDS));

    const out = await runWithStepUp({ call, api: sendsOk, ask, now: () => STEP_UP_TOKEN_TTL_MS + 5 });

    expect(ask).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ kind: "result", res: DONE });
  });

  it("a token the server no longer accepts is dropped and the person is asked once", async () => {
    setCachedStepUp("stale", 0);
    const ask = jest.fn(async () => "fresh");
    const call = jest.fn(async (token?: string) => (token === "fresh" ? DONE : NEEDS));

    const out = await runWithStepUp({ call, api: sendsOk, ask, now: () => 10 });

    expect(call.mock.calls.map((c) => c[0])).toEqual(["stale", "fresh"]);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ kind: "result", res: DONE });
    expect(getCachedStepUp(10)).toBe("fresh");
  });

  it("a refused token stays dropped even if the person then cancels", async () => {
    setCachedStepUp("stale", 0);

    const out = await runWithStepUp({ call: async () => NEEDS, api: sendsOk, ask: async () => null, now: () => 10 });

    expect(out).toEqual({ kind: "cancelled" });
    expect(getCachedStepUp(10)).toBeUndefined();
  });

  it("cancelling remembers nothing", async () => {
    await runWithStepUp({ call: async () => NEEDS, api: sendsOk, ask: async () => null });

    expect(getCachedStepUp(Date.now())).toBeUndefined();
  });

  it("a proof that still gets refused is not kept", async () => {
    await runWithStepUp({ call: async () => NEEDS, api: sendsOk, ask: async () => "tok" });

    expect(getCachedStepUp(Date.now())).toBeUndefined();
  });

  it("signing out forgets it, whatever ended the session", () => {
    const auth = readFileSync(join(__dirname, "..", "auth", "AuthContext.tsx"), "utf8");
    const nullBranch = auth.slice(auth.indexOf("} else {", auth.indexOf("async function setTokens")));
    expect(nullBranch).toContain("clearStepUpCache()");
  });
});

describe("requestStepUpCode", () => {
  const post = (res: any) => ({ post: jest.fn(async () => res) });

  it("sends to the account's own verified email by default and reports where, masked", async () => {
    const api = post({ ok: true, status: 202, data: { sent_to: "o***@example.com" } });

    expect(await requestStepUpCode(api)).toEqual({ ok: true, sentTo: "o***@example.com" });
    expect(api.post).toHaveBeenCalledWith("/me/step-up", {});
  });

  it("never blames the person, and says plainly when it is the connection or the rate limit", async () => {
    expect(await requestStepUpCode(post({ ok: false, status: 429, data: {} }))).toMatchObject({ ok: false, message: expect.stringMatching(/too many/i) });
    expect(await requestStepUpCode(post({ ok: false, status: 0, data: {} }))).toMatchObject({ ok: false, message: expect.stringMatching(/connect/i) });
    expect(await requestStepUpCode(post({ ok: false, status: 500, data: {} }))).toMatchObject({ ok: false, message: expect.stringMatching(/try again/i) });
  });
});

describe("verifyStepUp", () => {
  const post = (res: any) => ({ post: jest.fn(async () => res) });

  it("checks the six digits before it asks the server", async () => {
    const api = post(DONE);

    expect(await verifyStepUp(api, "12ab")).toMatchObject({ ok: false, message: expect.stringMatching(/6-digit/) });
    expect(api.post).not.toHaveBeenCalled();
  });

  it("a right code yields the token", async () => {
    const api = post({ ok: true, status: 200, data: { step_up_token: "tok", expires_in: 300 } });

    expect(await verifyStepUp(api, "123456")).toEqual({ ok: true, token: "tok" });
    expect(api.post).toHaveBeenCalledWith("/me/step-up/verify", { code: "123456" });
  });

  it("a wrong code says how many tries are left and does not give up the prompt", async () => {
    const out = await verifyStepUp(post({ ok: false, status: 400, data: { error: { code: "code_invalid", details: { attempts_left: 3 } } } }), "123456");

    expect(out).toMatchObject({ ok: false, message: expect.stringMatching(/3 tries left/) });
    expect((out as any).restart).toBeFalsy();
  });

  it("an expired or locked code asks for a new one", async () => {
    for (const status of [410, 423]) {
      expect(await verifyStepUp(post({ ok: false, status, data: {} }), "123456")).toMatchObject({ ok: false, restart: true });
    }
  });
});

describe("the client carries the step-up header", () => {
  it("sends custom headers on the call, and again on the refresh retry", async () => {
    const seen: any[] = [];
    let n = 0;
    global.fetch = jest.fn(async (url: any, init: any) => {
      seen.push({ url: String(url), headers: init?.headers });
      n += 1;
      const status = n === 1 ? 401 : 200;
      return { status, ok: status < 400, json: async () => ({ access: "fresh" }) } as unknown as Response;
    });
    const api = createApi(() => ({ access: "a", refresh: "r" }), async () => {});

    await api.post("/me/password", {}, { headers: { [STEP_UP_HEADER]: "tok" } });

    const withHeader = seen.filter((s) => !s.url.endsWith("/auth/refresh"));
    expect(withHeader).toHaveLength(2);
    for (const s of withHeader) expect(s.headers[STEP_UP_HEADER]).toBe("tok");
  });
});

describe("the wiring", () => {
  const SENSITIVE = ["DeleteAccountScreen.tsx", "ChangePasswordScreen.tsx", "ChangeEmailScreen.tsx", "ExportDataScreen.tsx", "TwoStepScreen.tsx"];

  it("finds the files it means to check", () => {
    // ⚠️ Assert the scan found something before believing it found nothing.
    for (const f of SENSITIVE) expect(read("screens", f).length).toBeGreaterThan(500);
    expect(read("auth", "useStepUp.tsx").length).toBeGreaterThan(300);
    expect(read("components", "StepUpPrompt.tsx").length).toBeGreaterThan(300);
  });

  it("every sensitive screen runs its call through the step-up hook and renders its prompt", () => {
    for (const f of SENSITIVE) {
      const src = read("screens", f);
      expect({ f, hook: src.includes("useStepUp()") }).toEqual({ f, hook: true });
      expect({ f, prompt: src.includes("{prompt}") }).toEqual({ f, prompt: true });
    }
  });

  it("each screen names the one call that is sensitive", () => {
    expect(read("screens", "DeleteAccountScreen.tsx")).toMatch(/api\.del\("\/me"/);
    expect(read("screens", "ChangePasswordScreen.tsx")).toContain('"/me/password"');
    expect(read("screens", "ChangeEmailScreen.tsx")).toContain('"/me/email"');
    expect(read("screens", "ExportDataScreen.tsx")).toContain('"/me/export"');
    const two = read("screens", "TwoStepScreen.tsx");
    expect(two).toContain('"/me/2fa/enable"');
    expect(two).toContain('"/me/2fa/disable"');
  });

  it("the email-change confirm step is NOT behind a proof (its own code is the proof)", () => {
    const src = read("screens", "ChangeEmailScreen.tsx");
    expect(src).toMatch(/api\.post\("\/me\/email\/verify"/);
    expect(src).not.toMatch(/run\(\([^)]*\) => api\.post\("\/me\/email\/verify"/);
  });

  it("Settings has a SECURITY group with the Two-step verification row", () => {
    for (const shelter of [false, true]) {
      const groups = settingsGroups({ shelter, privacyUrl: null });
      const security = groups.find((g) => g.title === "SECURITY");
      expect(security?.rows.map((r) => r.key)).toContain("twoStep");
      expect(groups.map((g) => g.title).indexOf("SECURITY")).toBe(1);   // right after ACCOUNT
    }
  });

  it("registers the route", () => {
    expect(read("navigation", "RootNavigator.tsx")).toContain('name="twoStep"');
    expect(read("navigation", "types.ts")).toMatch(/twoStep: undefined/);
  });

  it("Me carries two_factor_enabled", () => {
    expect(read("api", "types.ts")).toMatch(/two_factor_enabled/);
  });
});
