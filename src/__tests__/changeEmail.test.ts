/**
 * Plan Task 13 · changing the sign-in email (backend: POST /me/email, POST /me/email/verify).
 *
 * The email is the recovery channel, so the screen mirrors what the server insists on: the CURRENT
 * password up front, a code from the NEW inbox, and a fresh token pair on success (the server
 * revokes every other session, including the one this device was holding).
 *
 * Pure helpers are tested directly; the wiring a helper cannot see is a source scan, and each scan
 * asserts it FOUND the file before it is allowed to say the file is fine.
 */
import { readFileSync } from "fs";
import { join } from "path";

import {
  changeEmailFieldErrors,
  changeEmailRequestErrorFrom,
  changeEmailVerifyErrorFrom,
  codeError,
} from "../changeEmail";
import { settingsGroups } from "../settings";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");

describe("changeEmailFieldErrors", () => {
  const ok = { newEmail: "new@example.com", password: "Right1234" };

  it("accepts a plausible address and a password", () => {
    expect(changeEmailFieldErrors(ok)).toEqual({});
  });

  it("asks for each missing thing under its own field", () => {
    expect(changeEmailFieldErrors({ ...ok, newEmail: "  " }).newEmail).toMatch(/email/i);
    expect(changeEmailFieldErrors({ ...ok, newEmail: "not-an-email" }).newEmail).toMatch(/valid email/i);
    expect(changeEmailFieldErrors({ ...ok, password: "" }).password).toMatch(/current password/i);
  });
});

describe("changeEmailRequestErrorFrom", () => {
  it("a wrong password sits under the password field", () => {
    expect(changeEmailRequestErrorFrom({ status: 400, data: { error: { code: "invalid_password" } } }))
      .toMatchObject({ field: "password", message: expect.stringMatching(/current password/i) });
  });

  it("'already your email' sits under the email field", () => {
    expect(changeEmailRequestErrorFrom({ status: 400, data: { error: { code: "email_unchanged" } } }))
      .toMatchObject({ field: "newEmail" });
  });

  it("a Google/Apple-only account has no password to give: the screen explains, not a field", () => {
    const err = changeEmailRequestErrorFrom({ status: 409, data: { error: { code: "no_password" } } });

    expect(err.noPassword).toBe(true);
    expect(err.field).toBeUndefined();
  });

  it("says plainly when it is the connection or the rate limit, and never blames the person for a 500", () => {
    expect(changeEmailRequestErrorFrom({ status: 429 }).message).toMatch(/too many/i);
    expect(changeEmailRequestErrorFrom({ status: 0 }).message).toMatch(/connect/i);
    expect(changeEmailRequestErrorFrom({ status: 500 }).message).toMatch(/try again/i);
  });
});

describe("codeError", () => {
  it("wants exactly six digits", () => {
    expect(codeError("123456")).toBeUndefined();
    expect(codeError("12345")).toMatch(/6-digit/);
    expect(codeError("12a456")).toMatch(/6-digit/);
    expect(codeError("")).toMatch(/6-digit/);
  });
});

describe("changeEmailVerifyErrorFrom", () => {
  it("a wrong code says how many tries are left", () => {
    const err = changeEmailVerifyErrorFrom({ status: 400, data: { error: { code: "code_invalid", details: { attempts_left: 3 } } } });

    expect(err.message).toMatch(/3 tries left/);
    expect(err.restart).toBeFalsy();
  });

  it("the last try reads in the singular", () => {
    expect(changeEmailVerifyErrorFrom({ status: 400, data: { error: { code: "code_invalid", details: { attempts_left: 1 } } } }).message)
      .toMatch(/1 try left/);
  });

  it("an expired, locked or taken-in-the-meantime code sends the person back to the start", () => {
    for (const res of [{ status: 410 }, { status: 423 }, { status: 409, data: { error: { code: "email_taken" } } }]) {
      expect(changeEmailVerifyErrorFrom(res).restart).toBe(true);
    }
    expect(changeEmailVerifyErrorFrom({ status: 410 }).message).toMatch(/expired/i);
    expect(changeEmailVerifyErrorFrom({ status: 409, data: { error: { code: "email_taken" } } }).message)
      .toMatch(/different/i);
  });

  it("says plainly when it is the connection", () => {
    expect(changeEmailVerifyErrorFrom({ status: 0 }).message).toMatch(/connect/i);
  });
});

describe("the wiring", () => {
  it("finds the files it means to check", () => {
    // ⚠️ Assert the scan found something before believing it found nothing.
    expect(read("screens", "ChangeEmailScreen.tsx").length).toBeGreaterThan(500);
    expect(read("settings.ts").length).toBeGreaterThan(500);
  });

  it("the screen starts the change with the password, confirms with the code, and keeps the NEW tokens", () => {
    const src = read("screens", "ChangeEmailScreen.tsx");
    expect(src).toContain('api.post("/me/email"');
    expect(src).toContain('api.post("/me/email/verify"');
    expect(src).toContain("setTokens(");
    expect(src).toContain('testID="screen.changeEmail"');
    expect(src).toMatch(/new_email/);
  });

  it("Settings lists it for everyone, between the phone and the password", () => {
    for (const shelter of [false, true]) {
      const keys = settingsGroups({ shelter, privacyUrl: null })[0].rows.map((r) => r.key);
      expect(keys).toContain("changeEmail");
      expect(keys.indexOf("changeEmail")).toBeLessThan(keys.indexOf("changePassword"));
    }
    const owner = settingsGroups({ shelter: false, privacyUrl: null })[0].rows.map((r) => r.key);
    expect(owner.indexOf("phone")).toBeLessThan(owner.indexOf("changeEmail"));
  });

  it("registers the route", () => {
    expect(read("navigation", "RootNavigator.tsx")).toContain('name="changeEmail"');
    expect(read("navigation", "types.ts")).toMatch(/changeEmail: undefined/);
  });
});
