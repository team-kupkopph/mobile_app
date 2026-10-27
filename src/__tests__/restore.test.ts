/**
 * AS1 · restoring a deleted account from the app (backend#108).
 *
 * The delete screen promises "30 days to change your mind". The backend now keeps that promise:
 * a CORRECT password (or a verified Google/Apple identity) on a deleted account answers
 * `409 account_deleted` with a single-use `restore_token`. The app has to turn that 409 into
 * a screen, from every place a sign-in can happen — not just the Log in form.
 *
 * Two kinds of test, matching how this repo guards things: the pure helpers directly, and
 * source scans for the wiring that a helper test cannot see (each asserts it FOUND the files
 * before it is allowed to say they are fine).
 */
import { readFileSync } from "fs";
import { join } from "path";

import {
  daysLeft,
  purgeDateLabel,
  restoreErrorMessage,
  restoreOfferFrom,
} from "../restore";

const SRC = join(__dirname, "..");
const read = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");
const offer = { status: 409, data: { error: { code: "account_deleted", details: {
  restore_token: "tok-123", purge_on: "2026-11-26" } } } };

describe("restoreOfferFrom", () => {
  it("reads the token and the purge date from the 409", () => {
    expect(restoreOfferFrom(offer)).toEqual({ token: "tok-123", purgeOn: "2026-11-26" });
  });

  it.each([
    ["a 200", { status: 200, data: { access: "a", refresh: "r" } }],
    ["a generic 401", { status: 401, data: { error: { code: "invalid_credentials" } } }],
    ["another 409", { status: 409, data: { error: { code: "has_active_commitments" } } }],
    ["a 409 with no token", { status: 409, data: { error: { code: "account_deleted", details: {} } } }],
    ["a 409 with a non-string token",
      { status: 409, data: { error: { code: "account_deleted", details: { restore_token: 7 } } } }],
    ["an offline response", { status: 0, data: undefined }],
    ["no body at all", { status: 409 }],
  ])("is null for %s", (_label, res) => {
    expect(restoreOfferFrom(res as never)).toBeNull();
  });

  it("tolerates a missing purge date rather than dropping the offer", () => {
    const res = { status: 409, data: { error: { code: "account_deleted",
      details: { restore_token: "tok" } } } };
    expect(restoreOfferFrom(res)).toEqual({ token: "tok", purgeOn: "" });
  });
});

describe("purgeDateLabel and daysLeft", () => {
  it("writes the date the way the rest of the app does, without Intl", () => {
    expect(purgeDateLabel("2026-11-26")).toBe("26 Nov 2026");
    expect(purgeDateLabel("2027-01-05")).toBe("5 Jan 2027");
  });

  it.each(["", "soon", "2026-13-40", "26/11/2026"])("gives nothing for %p", (v) => {
    expect(purgeDateLabel(v)).toBe("");
  });

  it("counts whole days from today, never negative", () => {
    const today = new Date(2026, 9, 27, 15, 30);            // 27 Oct 2026, afternoon
    expect(daysLeft("2026-11-26", today)).toBe(30);
    expect(daysLeft("2026-10-28", today)).toBe(1);
    expect(daysLeft("2026-10-27", today)).toBe(0);
    expect(daysLeft("2026-10-01", today)).toBe(0);
    expect(daysLeft("", today)).toBeNull();
  });
});

describe("restoreErrorMessage", () => {
  it("tells an expired offer apart from a network problem", () => {
    expect(restoreErrorMessage({ status: 400, data: { error: { code: "restore_token_invalid" } } }))
      .toMatch(/log in again/i);
    expect(restoreErrorMessage({ status: 0 })).toMatch(/connect|offline/i);
  });

  it("says why a throttle is a throttle, and never blames the person for a 500", () => {
    expect(restoreErrorMessage({ status: 429 })).toMatch(/too many/i);
    expect(restoreErrorMessage({ status: 500 })).toMatch(/try again/i);
  });
});

describe("the wiring", () => {
  const SIGN_IN_PATHS = ["SigninScreen.tsx", "AccountTypeScreen.tsx", "ShelterTierScreen.tsx"];

  it("finds the files it means to check", () => {
    // ⚠️ Assert the scan found something before believing it found nothing.
    for (const f of SIGN_IN_PATHS) expect(read("screens", f).length).toBeGreaterThan(500);
    expect(read("screens", "RestoreAccountScreen.tsx").length).toBeGreaterThan(500);
  });

  it.each(SIGN_IN_PATHS)("%s sends a restore offer to the restore screen", (file) => {
    // Log in, and both Google/Apple paths: a deleted person can arrive by any of them.
    const src = read("screens", file);
    expect(src).toContain("restoreOfferFrom(");
    expect(src).toContain('"restoreAccount"');
  });

  it("registers the screen and treats it as a signed-out route", () => {
    expect(read("navigation", "RootNavigator.tsx")).toContain('name="restoreAccount"');
    // Tokens are null while the offer is on screen. A route missing from AUTH_SCREENS is one
    // SessionGuard bounces to Welcome the moment it mounts — the offer would flash and vanish.
    expect(read("auth", "SessionGuard.tsx")).toContain('"restoreAccount"');
    expect(read("navigation", "types.ts")).toMatch(/restoreAccount:\s*\{\s*restoreToken: string;\s*purgeOn: string/);
  });

  it("the sign-in screen itself still reveals nothing before the password is right", () => {
    // authEnumeration owns the full rule; this pins the one new branch: it is driven by the
    // response, and no literal on the sign-in screen mentions deletion.
    const literals = (read("screens", "SigninScreen.tsx").match(/"[^"\n]*"/g) ?? []).join(" ");
    expect(literals).not.toMatch(/delet/i);
  });

  it("the restore screen restores through the one endpoint and then signs in", () => {
    const src = read("screens", "RestoreAccountScreen.tsx");
    expect(src).toContain('"/auth/restore"');
    expect(src).toContain("setTokens(");
    expect(src).toContain('testID="screen.restoreAccount"');
  });
});
