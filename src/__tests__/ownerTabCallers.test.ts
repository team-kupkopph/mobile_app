/**
 * SQ5 follow-up PR 2 · every INBOUND path into the personal member's shell and the guest shell goes through the helpers in
 * `appTabs.ts` (spec 2026-11-04-owner-guest-tab-navigator-design.md §4.3), so the switch PR changes the helpers' bodies and no
 * caller. A scan, so it names what it must find: a guard that matches nothing proves nothing.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { popToOwnerTab } from "../appTabs";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
/** Code only: a comment may mention a route, a navigate/reset/replace may not. */
const code = (rel: string) =>
  read(rel).split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("{/*")).join("\n");

describe("the nine sign-in / sign-up resets land on Home through enterOwnerShell", () => {
  const sites: [string, number][] = [
    ["screens/SignupSuccessScreen.tsx", 1],
    ["screens/SigninScreen.tsx", 2],
    ["screens/RestoreAccountScreen.tsx", 1],
    ["screens/MemberSubmittedScreen.tsx", 1],
    ["screens/ShelterTierScreen.tsx", 1],
    ["screens/AccountTypeScreen.tsx", 1],
    ["screens/OtpScreen.tsx", 1],
    ["screens/dev/DevMenuScreen.tsx", 1]
  ];
  it("found all nine sites (a guard that matches nothing proves nothing)", () => {
    expect(sites.reduce((n, [, c]) => n + c, 0)).toBe(9);
  });
  it.each(sites)("%s calls enterOwnerShell %i time(s) and names no `home` route itself", (file, count) => {
    const src = code(file);
    expect(src.match(/enterOwnerShell\(navigation/g)).toHaveLength(count);
    expect(src).not.toMatch(/name: "home"/);
  });
  it("only SignupSuccess carries justSignedUp (it, and only it, resumes the guest intent)", () => {
    expect(code("screens/SignupSuccessScreen.tsx")).toMatch(/enterOwnerShell\(navigation, \{ justSignedUp: true \}\)/);
    for (const [file] of sites.filter(([f]) => f !== "screens/SignupSuccessScreen.tsx")) {
      expect(code(file)).not.toMatch(/justSignedUp/);
    }
  });
});

describe("the Volunteer hub is opened through openOwnerTab", () => {
  const callers: [string, number][] = [
    ["screens/KawangGawaRequestedScreen.tsx", 4],
    ["screens/KawangGawaCancelScreen.tsx", 1],
    ["screens/NotificationsScreen.tsx", 1]
  ];
  it.each(callers)("%s calls openOwnerTab(…, \"volunteer\") %i time(s) and never navigates to `kawanggawa`", (file, count) => {
    const src = code(file);
    expect(src.match(/openOwnerTab\(navigation, "volunteer"/g)).toHaveLength(count);
    expect(src).not.toMatch(/navigate\("kawanggawa"/);
  });
});

describe("other inbound paths", () => {
  it("Home's empty state opens the Adopt tab through the helper", () => {
    expect(code("screens/HomeScreen.tsx")).toMatch(/openOwnerTab\(navigation, "adopt"\)/);
    expect(code("screens/HomeScreen.tsx")).not.toMatch(/navigate\("adopt"\)/);
  });
  it("Welcome's guest entry and the initial route come from appTabs", () => {
    const root = code("navigation/RootNavigator.tsx");
    expect(root).toMatch(/onBrowseGuest=\{\(\) => enterGuestShell\(navigation\)\}/);
    expect(root).toMatch(/initialRouteName=\{tokens \? OWNER_SHELL_ROUTE : "welcome"\}/);
  });
  it("Settings' Edit profile and the delete screen's volunteer blocker go through the owner-tab helpers", () => {
    const settings = code("settings.ts");
    expect(settings).toMatch(/type: "popToOwnerTab", key: "profile", params: \{ editing: true \}/);
    expect(settings).toMatch(/ownerTab: "volunteer", params: \{ tab: "mine" \}/);
    expect(code("screens/SettingsScreen.tsx")).toMatch(/case "popToOwnerTab": popToOwnerTab\(/);
    expect(code("screens/DeleteAccountScreen.tsx")).toMatch(/openOwnerTab\(/);
  });
});

describe("popToOwnerTab (shim until the switch)", () => {
  it("pops back to the existing tab with its params: the loop `navigate` caused must stay gone", () => {
    const calls: unknown[][] = [];
    popToOwnerTab({ popTo: (...a: unknown[]) => calls.push(a) }, "profile", { editing: true });
    expect(calls).toEqual([["profile", { editing: true }]]);
  });
});
