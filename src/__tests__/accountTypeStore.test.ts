/**
 * The remembered account type (spec 2026-11-04-account-aware-first-screen-design.md §3.1): what lets a cold
 * start, offline included, open the right shell. A value that is not exactly "personal" or "shelter" reads as
 * unknown, and an unreadable store never crashes a launch.
 */
import { readFileSync } from "fs";
import { join } from "path";

const mockStore = new Map<string, string>();
const mockGetItem = jest.fn(async (k: string) => mockStore.get(k) ?? null);
jest.mock("expo-secure-store", () => ({
  getItemAsync: (k: string) => mockGetItem(k),
  setItemAsync: async (k: string, v: string) => { mockStore.set(k, v); },
  deleteItemAsync: async (k: string) => { mockStore.delete(k); }
}));

type Store = typeof import("../auth/accountTypeStore");
// The module caches what it read, so each test loads a fresh copy: a read must actually reach the (mocked) keychain.
function fresh(): Store {
  let m!: Store;
  jest.isolateModules(() => { m = require("../auth/accountTypeStore"); });
  return m;
}

const KEY = "kupkop.accountType";

beforeEach(() => {
  mockStore.clear();
  mockGetItem.mockClear();
});

describe("accountTypeStore", () => {
  it("round-trips both types, across a relaunch", async () => {
    await fresh().saveAccountType("shelter");
    expect(await fresh().loadAccountType()).toBe("shelter");
    await fresh().saveAccountType("personal");
    expect(await fresh().loadAccountType()).toBe("personal");
  });

  it.each(["admin", "", "Shelter"])("reads a stored %p as unknown", async (raw) => {
    mockStore.set(KEY, raw);
    expect(await fresh().loadAccountType()).toBeNull();
    expect(mockGetItem).toHaveBeenCalledWith(KEY);
  });

  it("reads as unknown when the store throws, and reads again next time", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("keychain locked"));
    const m = fresh();
    expect(await m.loadAccountType()).toBeNull();
    mockStore.set(KEY, "shelter");
    expect(await m.loadAccountType()).toBe("shelter");
  });

  it("forgets the value on clear", async () => {
    const m = fresh();
    await m.saveAccountType("shelter");
    await m.clearAccountType();
    expect(mockStore.has(KEY)).toBe(false);
    expect(await m.loadAccountType()).toBeNull();
  });
});

describe("AuthContext wiring", () => {
  const src = readFileSync(join(__dirname, "..", "auth", "AuthContext.tsx"), "utf8");

  it("hydrates the type in the same read as the tokens and the city", () => {
    const all = src.match(/Promise\.all\(\[[^\]]*\]\)/s)?.[0];
    expect(all).toBeDefined();
    expect(all).toContain("SecureStore.getItemAsync(KEY)");
    expect(all).toContain("loadAccountType()");
  });

  it("clears the type FIRST when the session ends, so a later failing cleanup step cannot leave it behind", () => {
    const elseBranch = src.slice(src.indexOf("} else {", src.indexOf("async function setTokens")));
    expect(elseBranch.indexOf("clearAccountType()")).toBeGreaterThan(-1);
    expect(elseBranch.indexOf("clearAccountType()")).toBeLessThan(elseBranch.indexOf("SecureStore.deleteItemAsync(KEY)"));
  });

  it("restores the type only together with parseable tokens", () => {
    const hydrate = src.slice(src.indexOf("if (rawTokens)"), src.indexOf(".finally(() => setReady(true))"));
    const tokensParsed = hydrate.indexOf("JSON.parse(rawTokens)");
    expect(tokensParsed).toBeGreaterThan(-1);
    expect(hydrate.indexOf("setAccountTypeState(rawType)")).toBeGreaterThan(tokensParsed);
    expect(hydrate).toMatch(/catch \{[^}]*clearAccountType\(\)/s);   // a corrupt tokens entry forgets the type too
  });

  it("clears the type wherever the tokens are cleared", () => {
    const elseBranch = src.slice(src.indexOf("} else {", src.indexOf("async function setTokens")));
    expect(elseBranch).toContain("clearAccountType()");
    expect(elseBranch).toContain("setAccountTypeState(null)");
  });
});
