/**
 * Task 10 · the account half of Settings (library plan 2026-10-27, AS2 / AS6 / X9 / X10 / X14).
 *
 * What the review found on this surface, and what each group of tests pins:
 *
 *   · Settings → "Edit profile" pushed a SECOND copy of the "You" tab (React Navigation 7's
 *     `navigate` pushes; going back to the existing screen is `popTo`). A loop.
 *   · No way to change a password, sign out everywhere, or see which number is on file.
 *   · The privacy screen said "Your number stays hidden … shared only with a shelter you
 *     volunteer for" — untrue: Sagip reports, offers and claims share contact on consent too.
 *   · The delete screen promised pets AND listings were removed; the purge removes pets and keeps
 *     (hides) listings. It also never said that pledges end when you leave.
 *   · Blockers on the delete screen were plain text with nowhere to go.
 *   · Three different log-out behaviours on three screens.
 *
 * Pure helpers are tested directly; the wiring a helper cannot see is a source scan, and each
 * scan asserts it FOUND the file before it is allowed to say the file is fine.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { Alert } from "react-native";

import { confirmLogout } from "../auth/confirmLogout";
import { signOutEverywhere } from "../auth/logoutAll";
import {
  changePasswordErrorFrom,
  changePasswordFieldErrors,
} from "../changePassword";
import {
  DELETE_KEPT,
  DELETE_LEDE,
  DELETE_REMOVED,
  DELETE_TITLE,
  blockerRoute,
  phoneRowValue,
  privacyRows,
  settingsGroups,
  type Settings,
} from "../settings";

const SRC = join(__dirname, "..");
const read = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");

afterEach(() => jest.restoreAllMocks());

// ------------------------------------------------------------------------ one log-out rule

describe("confirmLogout", () => {
  function prompts() {
    return jest.spyOn(Alert, "alert").mockImplementation(() => {});
  }
  const press = (spy: jest.SpyInstance, label: string) => {
    const buttons = spy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    buttons.find((b) => b.text === label)!.onPress!();
  };

  it("asks once, plainly, when there is nothing unsent", () => {
    const spy = prompts();
    const onConfirm = jest.fn();

    confirmLogout({ queueCount: 0, onConfirm, onDiscard: jest.fn() });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe("Log out?");
    expect(onConfirm).not.toHaveBeenCalled();           // asking is not doing
    press(spy, "Log out");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("with unsent reports the ONLY question is the keep-or-discard one", () => {
    // Never "Log out?" first and then a second alert from its button.
    const spy = prompts();
    const onConfirm = jest.fn();
    const onDiscard = jest.fn();

    confirmLogout({ queueCount: 2, onConfirm, onDiscard });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toMatch(/2 reports/);
    press(spy, "Keep for next time");
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("discarding runs the discard path, not the plain one", () => {
    const spy = prompts();
    const onConfirm = jest.fn();
    const onDiscard = jest.fn();

    confirmLogout({ queueCount: 1, onConfirm, onDiscard });
    press(spy, "Discard");

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------- sign out of all devices

describe("signOutEverywhere", () => {
  it("revokes on the server FIRST, then signs out here", async () => {
    const order: string[] = [];
    const api = { post: jest.fn(async () => { order.push("server"); return { ok: true, status: 204 }; }) };
    const signOut = jest.fn(async () => { order.push("local"); });

    const result = await signOutEverywhere(api as never, signOut);

    expect(result).toBe("done");
    expect(api.post).toHaveBeenCalledWith("/auth/logout-all", {});
    expect(order).toEqual(["server", "local"]);
  });

  it("does NOT sign out locally when the server could not be reached", async () => {
    // Otherwise the person believes every device is signed out while the others still are.
    const api = { post: jest.fn(async () => ({ ok: false, status: 0 })) };
    const signOut = jest.fn(async () => {});

    expect(await signOutEverywhere(api as never, signOut)).toBe("offline");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("does not sign out on any other failure either", async () => {
    const api = { post: jest.fn(async () => ({ ok: false, status: 500 })) };
    const signOut = jest.fn(async () => {});

    expect(await signOutEverywhere(api as never, signOut)).toBe("failed");
    expect(signOut).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------------ change password

describe("change password", () => {
  const ok = { current: "Right1234", next: "Better5678", confirm: "Better5678" };

  it("accepts a good change", () => {
    expect(changePasswordFieldErrors(ok)).toEqual({});
  });

  it("names the field that is wrong, in the words the rest of the app uses", () => {
    expect(changePasswordFieldErrors({ ...ok, current: "" }).current).toMatch(/current password/i);
    expect(changePasswordFieldErrors({ ...ok, next: "short1", confirm: "short1" }).next)
      .toBe("At least 8 characters, including a number.");      // the signup rule, verbatim
    expect(changePasswordFieldErrors({ ...ok, confirm: "Different1" }).confirm).toMatch(/match/i);
    expect(changePasswordFieldErrors({ ...ok, next: ok.current, confirm: ok.current }).next)
      .toMatch(/different/i);
  });

  it("maps each server answer to the field it belongs to", () => {
    expect(changePasswordErrorFrom({ status: 400, data: { error: { code: "invalid_password" } } }))
      .toMatchObject({ field: "current", message: expect.stringMatching(/current password/i) });
    expect(changePasswordErrorFrom({ status: 400, data: { error: { code: "password_unchanged" } } }))
      .toMatchObject({ field: "next" });
    expect(changePasswordErrorFrom({ status: 429 }).message).toMatch(/too many/i);
    expect(changePasswordErrorFrom({ status: 0 }).message).toMatch(/connect/i);
    expect(changePasswordErrorFrom({ status: 500 }).message).toMatch(/try again/i);
  });

  it("a Google/Apple-only account is told what to do, not that it typed something wrong", () => {
    const res = { status: 409, data: { error: { code: "no_password" } } };

    const err = changePasswordErrorFrom(res);

    expect(err.noPassword).toBe(true);
    expect(err.field).toBeUndefined();
    expect(err.message).toMatch(/google or apple/i);
  });
});

// ------------------------------------------------------------------------------ the rows

describe("settingsGroups", () => {
  const keys = (groups: ReturnType<typeof settingsGroups>, title: string) =>
    (groups.find((g) => g.title === title)?.rows ?? []).map((r) => r.key);

  it("gives an owner the whole ACCOUNT group", () => {
    const groups = settingsGroups({ shelter: false, privacyUrl: null });

    expect(keys(groups, "ACCOUNT")).toEqual(["editProfile", "phone", "changeEmail", "changePassword", "logoutAll"]);
  });

  it("gives a shelter the account-shaped rows only", () => {
    // Edit profile and Phone are owner screens. A shelter's phone is its SMS-verified
    // `official_phone`; changing the ACCOUNT phone here would desync the two (Task 9 owns that).
    const groups = settingsGroups({ shelter: true, privacyUrl: null });

    expect(keys(groups, "ACCOUNT")).toEqual(["changeEmail", "changePassword", "logoutAll"]);
  });

  it("keeps PRIVACY and YOUR DATA for everyone, in the order the screen reads", () => {
    for (const shelter of [false, true]) {
      const groups = settingsGroups({ shelter, privacyUrl: null });
      expect(groups.map((g) => g.title)).toEqual(
        expect.arrayContaining(["PRIVACY", "YOUR DATA", "SUPPORT"]));
      expect(keys(groups, "YOUR DATA")).toEqual(["export", "delete"]);
    }
  });

  it("Edit profile goes BACK to the existing tab; it never pushes a second copy", () => {
    const groups = settingsGroups({ shelter: false, privacyUrl: null });

    const edit = groups.flatMap((g) => g.rows).find((r) => r.key === "editProfile")!;

    expect(edit.action).toEqual({ type: "popTo", name: "profile", params: { editing: true } });
  });

  it("Privacy & terms exists ONLY once the policy URL does (launch gate 4)", () => {
    const without = settingsGroups({ shelter: false, privacyUrl: null });
    const withUrl = settingsGroups({ shelter: false, privacyUrl: "https://kupkop.ph/privacy" });

    expect(keys(without, "SUPPORT")).toEqual(["help"]);
    expect(keys(withUrl, "SUPPORT")).toEqual(["help", "privacy"]);
    expect(withUrl.flatMap((g) => g.rows).find((r) => r.key === "privacy")!.action)
      .toEqual({ type: "link", url: "https://kupkop.ph/privacy" });
  });

  it("marks only the destructive rows as danger", () => {
    const rows = settingsGroups({ shelter: false, privacyUrl: null }).flatMap((g) => g.rows);

    expect(rows.filter((r) => r.danger).map((r) => r.key)).toEqual(["delete"]);
  });
});

describe("phoneRowValue", () => {
  it("shows a verified number masked, never in full", () => {
    expect(phoneRowValue("+639171234567", "2026-10-01T00:00:00Z")).toBe("+63 917 ••• 4567");
  });

  it("says plainly when there is no number, or it was never verified", () => {
    expect(phoneRowValue(null, null)).toBe("Not added");
    expect(phoneRowValue("+639171234567", null)).toBe("Not verified");
  });

  it("copes with a number it does not recognise rather than printing it whole", () => {
    expect(phoneRowValue("+1555123456", "x")).toBe("••••3456");
  });
});

// -------------------------------------------------------------------------------- the copy

describe("privacy facts (X9)", () => {
  const settings: Settings = { marketing_emails: false, push_enabled: true,
                               analytics_consent: false, analytics_consent_at: null };

  it("no longer claims a number is shared ONLY with a shelter you volunteer for", () => {
    const note = privacyRows(settings).facts.map((f) => f.note).join(" ");

    expect(note).not.toMatch(/only for that shift/i);
    // Sagip shares contact on consent too — the claim has to say so.
    expect(note).toMatch(/rescuer/i);
    expect(note).toMatch(/choose/i);
  });
});

describe("delete copy (AS2)", () => {
  it("promises exactly what the purge does", () => {
    expect(DELETE_REMOVED).toEqual(expect.arrayContaining([
      "Your pets", "Linked Google or Apple sign-in", "Saved places"]));
    // Listings are HIDDEN and kept as records, not removed — the old copy said "pets and listings".
    expect(DELETE_REMOVED.join(" ")).not.toMatch(/listing/i);
    expect(DELETE_KEPT.join(" ")).toMatch(/animals you listed/i);
    expect(DELETE_KEPT).toContain("Shown as “Deleted user”");
  });

  it("states the 30 days as something you can use, and drops 'can't be undone'", () => {
    expect(DELETE_TITLE).toBe("Delete your account?");
    expect(DELETE_LEDE).toMatch(/30 days to restore it by signing in/);
    expect(`${DELETE_TITLE} ${DELETE_LEDE}`).not.toMatch(/can't be undone/i);
  });
});

describe("blockerRoute", () => {
  it.each([
    ["rescue_claim", "myRescues"],
    ["volunteer_shift", "kawanggawa"],
    ["adoption_inquiry", "myInquiries"],
    ["hosted_shift", "shelterVolunteer"],
  ])("%s leads to %s", (kind, name) => {
    expect(blockerRoute(kind)?.name).toBe(name);
  });

  it("an unknown kind is not tappable rather than a dead tap", () => {
    expect(blockerRoute("something_new")).toBeNull();
  });
});

// ------------------------------------------------------------------------------- the wiring

describe("the wiring", () => {
  const SCREENS = ["SettingsScreen.tsx", "ProfileScreen.tsx", "ShelterProfileScreen.tsx"];

  it("finds the files it means to check", () => {
    // ⚠️ Assert the scan found something before believing it found nothing.
    for (const f of SCREENS) expect(read("screens", f).length).toBeGreaterThan(500);
    expect(read("screens", "ChangePasswordScreen.tsx").length).toBeGreaterThan(500);
  });

  it.each(SCREENS)("%s logs out through the one shared rule", (file) => {
    const src = read("screens", file);
    expect(src).toContain("confirmLogout(");
    expect(src).not.toContain("confirmSignOutWithQueue(");
  });

  it("registers Change password, and types the profile's `editing` param", () => {
    expect(read("navigation", "RootNavigator.tsx")).toContain('name="changePassword"');
    expect(read("navigation", "types.ts")).toMatch(/changePassword: undefined/);
    expect(read("navigation", "types.ts")).toMatch(/profile: \{ editing\?: boolean \} \| undefined/);
  });

  it("the You tab opens its inline editor when Settings sends it back with `editing`", () => {
    const src = read("screens", "ProfileScreen.tsx");
    expect(src).toContain("route.params?.editing");
    expect(src).toContain("startEdit()");
  });

  it("Settings reaches the profile with popTo, never navigate — the loop must stay gone", () => {
    const src = read("screens", "SettingsScreen.tsx");
    expect(src).toContain("popTo(");
    expect(src).not.toMatch(/navigate\(\s*"profile"/);
  });

  it("Change password stores the tokens the server hands back, or it would sign this device out", () => {
    const src = read("screens", "ChangePasswordScreen.tsx");
    expect(src).toContain('"/me/password"');
    expect(src).toContain("setTokens(");
    expect(src).toContain('testID="screen.changePassword"');
  });

  it("the delete screen sends the confirmation the server requires", () => {
    // DELETE /me answers 400 confirmation_required without {confirm: true}. The screen called
    // `api.del("/me")` with no body, so deleting an account never worked from the app (device walk).
    const src = read("screens", "DeleteAccountScreen.tsx");
    expect(src).toContain('api.del("/me", { confirm: true })');
  });

  it("the delete screen is driven by the shared copy and its blockers are tappable", () => {
    const src = read("screens", "DeleteAccountScreen.tsx");
    expect(src).toContain("DELETE_REMOVED");
    expect(src).toContain("DELETE_LEDE");
    expect(src).toContain("blockerRoute(");
    expect(src).not.toContain("This can't be undone");
  });

  it("the privacy screen's analytics note is honest that nothing is collected yet", () => {
    expect(read("screens", "SettingsPrivacyScreen.tsx"))
      .toMatch(/Nothing is collected yet/);
  });
});
