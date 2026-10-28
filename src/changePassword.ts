// Task 10 · pure helpers for the Change password screen (POST /me/password, backend#112).
import { PASSWORD_RULE, passwordError } from "./passwordRules";

export type ChangePasswordForm = { current: string; next: string; confirm: string };
export type ChangePasswordFieldErrors = { current?: string; next?: string; confirm?: string };

/** Client-side checks, worded like the rest of the app. The server has the final say. */
export function changePasswordFieldErrors(form: ChangePasswordForm): ChangePasswordFieldErrors {
  const errors: ChangePasswordFieldErrors = {};
  if (form.current.length === 0) errors.current = "Enter your current password.";
  const weak = passwordError(form.next);
  if (weak) errors.next = weak;                       // the signup rule, verbatim
  else if (form.current && form.next === form.current) {
    errors.next = "Choose a password different from your current one.";
  }
  if (form.confirm !== form.next) errors.confirm = "Passwords don't match.";
  return errors;
}

export type ChangePasswordError = {
  /** The field the message belongs under, when it belongs under one. */
  field?: "current" | "next";
  message: string;
  /** A Google/Apple-only account: there is no password to change, so no field is "wrong". */
  noPassword?: boolean;
};

type Res = { status: number; data?: any };

/** Why `POST /me/password` failed, in words a person can act on. */
export function changePasswordErrorFrom(res: Res): ChangePasswordError {
  const code = res.data?.error?.code;
  if (res.status === 409 && code === "no_password") {
    return {
      noPassword: true,
      message: "This account signs in with Google or Apple. Use Forgot password to set a password.",
    };
  }
  if (res.status === 400 && code === "invalid_password") {
    return { field: "current", message: "That isn't your current password." };
  }
  if (res.status === 400 && code === "password_unchanged") {
    return { field: "next", message: "Choose a password you haven't used here." };
  }
  if (res.status === 400) return { field: "next", message: PASSWORD_RULE };
  if (res.status === 429) return { message: "Too many tries. Wait a while and try again." };
  if (res.status === 0) return { message: "Couldn't connect. Check your connection and try again." };
  return { message: "That didn't work. Try again." };
}
