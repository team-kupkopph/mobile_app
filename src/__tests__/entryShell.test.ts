import { HOLD_MS, enterSignedInShell, launchPlan, resolveLaunchHold, shellRouteFor } from "../entryShell";

describe("shellRouteFor", () => {
  it("sends a shelter to its own shell", () => {
    expect(shellRouteFor("shelter")).toBe("shelterTabs");
  });

  it("sends a personal account, and an unknown one, to the owner shell", () => {
    expect(shellRouteFor("personal")).toBe("ownerTabs");
    expect(shellRouteFor(null)).toBe("ownerTabs");
  });
});

describe("launchPlan", () => {
  const signedIn = { access: "a", refresh: "r" };

  it("opens Welcome for a signed-out launch, whatever type was left behind", () => {
    expect(launchPlan(null, null)).toBe("welcome");
    expect(launchPlan(null, "shelter")).toBe("welcome");
  });

  it("holds for /me when there is a token and no remembered type", () => {
    expect(launchPlan(signedIn, null)).toBe("hold");
  });

  it("opens the shell at once when the type is remembered", () => {
    expect(launchPlan(signedIn, "shelter")).toBe("shell");
    expect(launchPlan(signedIn, "personal")).toBe("shell");
  });
});

describe("resolveLaunchHold", () => {
  const remember = jest.fn(async () => {});
  beforeEach(() => remember.mockClear());

  it("opens the shelter shell and remembers it when /me says shelter", async () => {
    const route = await resolveLaunchHold(async () => ({ ok: true, data: { account_type: "shelter" } }), remember);
    expect(route).toBe("shelterTabs");
    expect(remember).toHaveBeenCalledWith("shelter");
  });

  it("opens the owner shell and remembers personal", async () => {
    const route = await resolveLaunchHold(async () => ({ ok: true, data: { account_type: "personal" } }), remember);
    expect(route).toBe("ownerTabs");
    expect(remember).toHaveBeenCalledWith("personal");
  });

  it("falls back to the owner shell without remembering on a failure, an admin, or a throw", async () => {
    expect(await resolveLaunchHold(async () => ({ ok: false }), remember)).toBe("ownerTabs");
    expect(await resolveLaunchHold(async () => ({ ok: true, data: { account_type: "admin" } }), remember)).toBe("ownerTabs");
    expect(await resolveLaunchHold(async () => { throw new Error("boom"); }, remember)).toBe("ownerTabs");
    expect(remember).not.toHaveBeenCalled();
  });

  it("opens Welcome when /me answers 401: the session is dead, and the client has already signed it out", async () => {
    const route = await resolveLaunchHold(async () => ({ ok: false, status: 401 }), remember);
    expect(route).toBe("welcome");
    expect(remember).not.toHaveBeenCalled();
  });

  it("gives up after HOLD_MS and opens the owner shell", async () => {
    jest.useFakeTimers();
    try {
      expect(HOLD_MS).toBe(3000);
      const p = resolveLaunchHold(() => new Promise(() => {}), remember);
      await jest.advanceTimersByTimeAsync(HOLD_MS);
      expect(await p).toBe("ownerTabs");
      expect(remember).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("enterSignedInShell", () => {
  const remember = jest.fn(async () => {});
  const reset = jest.fn();
  const nav = { reset };
  const apiReturning = (r: unknown) => ({ get: jest.fn(async () => r as never) });
  beforeEach(() => { remember.mockClear(); reset.mockClear(); });

  const lastRoute = () => reset.mock.calls[0][0].routes[0].name;

  it("opens the shelter shell and remembers a shelter", async () => {
    await enterSignedInShell(nav, remember, apiReturning({ ok: true, data: { account_type: "shelter" } }), "tok");
    expect(reset).toHaveBeenCalledTimes(1);
    expect(lastRoute()).toBe("shelterTabs");
    expect(remember).toHaveBeenCalledWith("shelter");
  });

  it("opens the owner shell and remembers a personal account", async () => {
    await enterSignedInShell(nav, remember, apiReturning({ ok: true, data: { account_type: "personal" } }), "tok");
    expect(lastRoute()).toBe("ownerTabs");
    expect(remember).toHaveBeenCalledWith("personal");
  });

  it("asks /me with the new access token, not whatever the client last held", async () => {
    const api = apiReturning({ ok: true, data: { account_type: "personal" } });
    await enterSignedInShell(nav, remember, api, "fresh-access");
    expect(api.get).toHaveBeenCalledWith("/me", { headers: { Authorization: "Bearer fresh-access" } });
  });

  it("falls back to the owner shell, remembering nothing, on a failure, an admin or a throw", async () => {
    await enterSignedInShell(nav, remember, apiReturning({ ok: false, status: 0 }), "t");
    await enterSignedInShell(nav, remember, apiReturning({ ok: true, data: { account_type: "admin" } }), "t");
    await enterSignedInShell(nav, remember, { get: async () => { throw new Error("down"); } }, "t");
    expect(reset).toHaveBeenCalledTimes(3);
    reset.mock.calls.forEach((c) => expect(c[0].routes[0].name).toBe("ownerTabs"));
    expect(remember).not.toHaveBeenCalled();
  });
});

describe("enterSignedInShell never makes someone wait on a slow /me", () => {
  it("enters the owner shell after HOLD_MS when /me does not answer", async () => {
    jest.useFakeTimers();
    try {
      const reset = jest.fn();
      const remember = jest.fn(async () => {});
      const p = enterSignedInShell({ reset }, remember, { get: () => new Promise(() => {}) }, "tok");
      await jest.advanceTimersByTimeAsync(HOLD_MS);
      await p;
      expect(reset).toHaveBeenCalledTimes(1);
      expect(reset.mock.calls[0][0].routes[0].name).toBe("ownerTabs");
      expect(remember).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
