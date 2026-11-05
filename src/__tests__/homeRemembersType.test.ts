/**
 * Home's /me read is the safety net for a wrong or missing remembered type, so it also teaches the cache
 * (spec 2026-11-04-account-aware-first-screen-design.md §3.4). A scan, so it names what it must find.
 */
import { readFileSync } from "fs";
import { join } from "path";

const home = readFileSync(join(__dirname, "..", "screens", "HomeScreen.tsx"), "utf8");
const root = readFileSync(join(__dirname, "..", "navigation", "RootNavigator.tsx"), "utf8");

describe("the first screen follows the account type", () => {
  const start = home.indexOf("const loadAccount = useCallback");
  const body = home.slice(start, home.indexOf("useRefreshOnFocus(loadAccount", start));

  it("finds loadAccount", () => {
    expect(start).toBeGreaterThan(-1);
    expect(body.length).toBeGreaterThan(100);
  });

  it("Home remembers shelter before it redirects, and personal when it stays", () => {
    const shelter = body.indexOf('setAccountType("shelter")');
    expect(shelter).toBeGreaterThan(-1);
    expect(shelter).toBeLessThan(body.indexOf("enterShelterShell("));
    expect(body).toMatch(/account_type === "personal"[\s\S]*setAccountType\("personal"\)/);
  });

  it("RootNavigator has one initialRouteName and it comes from useLaunchRoute", () => {
    expect(root.match(/initialRouteName=/g)).toHaveLength(1);
    expect(root).toMatch(/useLaunchRoute\(\)/);
    expect(root).toMatch(/initialRouteName=\{first\}/);
  });
});
