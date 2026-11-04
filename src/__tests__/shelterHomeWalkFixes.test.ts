// NT-8 walk findings (shelter home test plan, 2026-11-04).
// - W5 · with the tier unknown (a shelter that skipped setup has no profile), the banner's "Upload ›" was hidden
//   (SH13), but the foot card's "Continue ›" called the same handler, which returns early, so it was a dead tap.
//   It is hidden under the same condition.
// - F8 · a shelter that opened the app offline landed on the OWNER Home (the stack's initial route is "home"; the
//   redirect to the shelter shell waits for /me). "Try again" reloaded only the city panels, never /me, so after the
//   connection came back the shelter stayed in the owner shell. Retry now re-runs the account load, redirect included.
import { readFileSync } from "fs";
import { join } from "path";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("W5 · no dead Continue on Home while the tier is unknown", () => {
  const home = read("screens/ShelterDashboardScreen.tsx");
  it("the scan found the foot card's Continue", () => {
    expect(home).toMatch(/testID="btn\.shelterDashboard\.continueVerify"/);
  });
  it("hides Continue whenever onBannerPress would do nothing", () => {
    const foot = /\{[^{}]*footContinue[^{}]*\? \([\s\S]*?btn\.shelterDashboard\.continueVerify/.exec(home);
    expect(home).toMatch(/const footContinue = !\(state === "incomplete" && !id\.tier\);/);
    expect(foot).not.toBeNull();
  });
});

describe("F8 · Try again on the owner Home re-runs the /me routing", () => {
  const home = read("screens/HomeScreen.tsx");
  const loadAccount = /const loadAccount = useCallback\(\(\) => \{([\s\S]*?)\n {2}\}, \[\]\);/.exec(home)?.[1] ?? "";
  it("the shelter redirect lives in loadAccount", () => {
    expect(loadAccount).toMatch(/api\.get\("\/me"\)/);
    expect(loadAccount).toMatch(/account_type === "shelter"/);
    expect(loadAccount).toMatch(/enterShelterShell\(navigation\.getParent<NativeStackNavigationProp<RootStackParamList>>\(\)!\)/);
  });
  it("focus and Try again both run it", () => {
    // SQ5 follow-up PR 4: focus goes through the policy (first focus and after a pushed screen, never a plain tab switch).
    expect(home).toMatch(/useRefreshOnFocus\(loadAccount, Infinity\);/);
    const reload = /const reloadPanels = useCallback\(\(\) => \{([\s\S]*?)\}, \[/.exec(home)?.[1] ?? "";
    expect(reload).toMatch(/loadAccount\(\);/);
  });
});
