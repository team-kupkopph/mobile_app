// Task 13 · pure helpers for the Change email screen (POST /me/email, POST /me/email/verify).
// Kept out of the screen so the rules that matter - which field a refusal belongs under, when a
// failure means "start over" - are testable without rendering anything.
export type ChangeEmailForm = { newEmail: string; password: string };
export type ChangeEmailFieldErrors = { newEmail?: string; password?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side checks, worded like the rest of the app. The server has the final say. */
export function changeEmailFieldErrors(form: ChangeEmailForm): ChangeEmailFieldErrors {
  const errors: ChangeEmailFieldErrors = {};
  const email = form.newEmail.trim();
  if (!email) errors.newEmail = "Enter your new email address.";
  else if (!EMAIL.test(email)) errors.newEmail = "Enter a valid email address.";
  if (form.password.length === 0) errors.password = "Enter your current password.";
  return errors;
}

type Res = { status: number; data?: any };
const CONNECT = "Couldn't connect. Check your connection and try again.";
const TOO_MANY = "Too many tries. Wait a while and try again.";
const GENERIC = "That didn't work. Try again.";

export type ChangeEmailRequestError = {
  /** The field the message belongs under, when it belongs under one. */
  field?: keyof ChangeEmailFieldErrors;
  message: string;
  /** A Google/Apple-only account: there is no password to give, so no field is "wrong". */
  noPassword?: boolean;
};

/** Why `POST /me/email` failed, in words a person can act on. */
export function changeEmailRequestErrorFrom(res: Res): ChangeEmailRequestError {
  const code = res.data?.error?.code;
  if (res.status === 409 && code === "no_password") {
    return {
      noPassword: true,
      message: "This account signs in with Google or Apple. Use Forgot password to set a password first.",
    };
  }
  if (res.status === 400 && code === "invalid_password") {
    return { field: "password", message: "That isn't your current password." };
  }
  if (res.status === 400 && code === "email_unchanged") {
    return { field: "newEmail", message: "That's already your email." };
  }
  if (res.status === 400) return { field: "newEmail", message: "Enter a valid email address." };
  if (res.status === 429) return { message: TOO_MANY };
  if (res.status === 0) return { message: CONNECT };
  return { message: GENERIC };
}

/** The six digits the code box takes, or why it will not do. */
export function codeError(code: string): string | undefined {
  return /^\d{6}$/.test(code) ? undefined : "Enter the 6-digit code.";
}

export type ChangeEmailVerifyError = {
  message: string;
  /** The code is spent or unusable: the person has to begin again, so the screen goes back a step. */
  restart?: boolean;
};

/** Why `POST /me/email/verify` failed. */
export function changeEmailVerifyErrorFrom(res: Res): ChangeEmailVerifyError {
  const code = res.data?.error?.code;
  if (res.status === 400 && code === "code_invalid") {
    const left = res.data?.error?.details?.attempts_left;
    return { message: typeof left === "number" && left > 0
      ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`
      : "That code isn't right." };
  }
  if (res.status === 410) return { message: "That code expired. Start again for a new one.", restart: true };
  if (res.status === 423) return { message: "Too many wrong codes. Wait a while, then start again.", restart: true };
  if (res.status === 409 && code === "email_taken") {
    return { message: "That email can't be used. Try a different one.", restart: true };
  }
  if (res.status === 429) return { message: TOO_MANY };
  if (res.status === 0) return { message: CONNECT };
  return { message: GENERIC };
}
