/**
 * Plan Task 14b · the biometric app lock (device-local; the server knows nothing about it).
 *
 * Face ID / fingerprint when the app opens, and when it comes back after more than a minute in the
 * background. The preference lives in SecureStore on the phone, per signed-in account; the device passcode
 * is the fallback the OS itself offers, there is no in-app PIN, and nothing here can bypass the lock:
 * three failed or cancelled attempts add "Sign out" as the only other way out.
 *
 * The decisions are pure and tested directly. The wiring a helper cannot see is a source scan, and each
 * scan asserts it FOUND the file before it is allowed to say the file is fine.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { settingsGroups } from "../settings";
import { LOCK_AFTER_MS, MAX_FAILED_ATTEMPTS, lockScreenOptions, shouldLock } from "../auth/appLock";

const ROOT = join(__dirname, "..", "..");
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), "utf8");

describe("shouldLock", () => {
  const base = { hasTokens: true, enabled: true, backgroundedAt: null as number | null, now: 1_000_000 };

  it("locks on a cold start for a signed-in person who turned it on", () => {
    expect(shouldLock({ ...base, event: "start" })).toBe(true);
  });

  it("never locks a guest, nor someone who did not turn it on", () => {
    expect(shouldLock({ ...base, event: "start", hasTokens: false })).toBe(false);
    expect(shouldLock({ ...base, event: "start", enabled: false })).toBe(false);
    expect(shouldLock({ ...base, event: "resume", hasTokens: false, backgroundedAt: 0 })).toBe(false);
    expect(shouldLock({ ...base, event: "resume", enabled: false, backgroundedAt: 0 })).toBe(false);
  });

  it("locks on return only after MORE than the grace period in the background", () => {
    expect(LOCK_AFTER_MS).toBe(60_000);
    const at = (seconds: number) => shouldLock({ ...base, event: "resume", backgroundedAt: base.now - seconds * 1000 });

    expect(at(59)).toBe(false);
    expect(at(60)).toBe(false);          // exactly the grace period is still inside it
    expect(at(61)).toBe(true);
  });

  it("a return with no recorded departure never locks (nothing to measure from)", () => {
    expect(shouldLock({ ...base, event: "resume", backgroundedAt: null })).toBe(false);
  });
});

describe("lockScreenOptions", () => {
  it("offers Unlock always, and Sign out only after repeated failures, never instead of Unlock", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(3);
    expect(lockScreenOptions(0)).toEqual({ canUnlock: true, canSignOut: false });
    expect(lockScreenOptions(2)).toEqual({ canUnlock: true, canSignOut: false });
    expect(lockScreenOptions(3)).toEqual({ canUnlock: true, canSignOut: true });
    expect(lockScreenOptions(9)).toEqual({ canUnlock: true, canSignOut: true });
  });
});

describe("the wiring", () => {
  it("finds the files it means to check", () => {
    // ⚠️ Assert the scan found something before believing it found nothing.
    for (const f of [["App.tsx"], ["app.config.ts"], ["package.json"], ["src", "auth", "AuthContext.tsx"],
      ["src", "auth", "AppLockGate.tsx"], ["src", "auth", "useAppLock.ts"], ["src", "screens", "SettingsScreen.tsx"]]) {
      expect(read(...f).length).toBeGreaterThan(300);
    }
  });

  it("the native module, its plugin and the Face ID purpose string are all declared", () => {
    expect(read("package.json")).toMatch(/"expo-local-authentication"/);
    const config = read("app.config.ts");
    expect(config).toContain("expo-local-authentication");
    expect(config).toContain("NSFaceIDUsageDescription");
  });

  it("the gate wraps the navigator, above every screen", () => {
    const app = read("App.tsx");
    expect(app).toContain("<AppLockGate>");
    expect(app.indexOf("<AppLockGate>")).toBeLessThan(app.indexOf("<RootNavigator />"));
  });

  it("the gate listens to AppState, covers the screen, and asks the OS for the scan", () => {
    const gate = read("src", "auth", "AppLockGate.tsx");
    expect(gate).toContain("AppState.addEventListener");
    expect(gate).toContain("authenticate(");
    expect(gate).toContain('"overlay.appLock"');          // an overlay, not a route: `screen.*` is reserved for routes (e2eSelectors)
    expect(gate).toContain("lockScreenOptions(");
  });

  it("signing out forgets the preference, whatever ended the session", () => {
    const auth = read("src", "auth", "AuthContext.tsx");
    const nullBranch = auth.slice(auth.indexOf("} else {", auth.indexOf("async function setTokens")));
    expect(nullBranch).toContain("clearAppLockPreference()");
  });

  it("turning it on asks for one successful scan first, and the switch is hidden without biometrics", () => {
    const screen = read("src", "screens", "SettingsScreen.tsx");
    expect(screen).toContain('case "appLock"');
    expect(screen).toContain("appLock.available === true");
    const hook = read("src", "auth", "useAppLock.ts");
    expect(hook).toMatch(/if \(on && !\(await authenticate\(/);
    expect(hook.indexOf("authenticate(")).toBeLessThan(hook.indexOf("saveAppLockPreference(on)"));
  });

  it("Settings lists App lock in the SECURITY group, after Two-step verification", () => {
    for (const shelter of [false, true]) {
      const security = settingsGroups({ shelter, privacyUrl: null }).find((g) => g.title === "SECURITY");
      const keys = security?.rows.map((r) => r.key) ?? [];
      expect(keys).toContain("appLock");
      expect(keys.indexOf("twoStep")).toBeLessThan(keys.indexOf("appLock"));
    }
  });
});
