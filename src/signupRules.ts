// A-N3 / A-N4b: the format rules live on the field, on blur (dev/onboarding-validation.md
// rules 2 and 4). Extracted from SignupScreen so onSubmit and the Field's onBlur share the
// same check instead of drifting.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const EMAIL_RULE = "Enter a valid email, e.g. ana@example.com";
export const NAME_RULE = "Enter your name (at least 2 characters).";

export function emailError(raw: string): string | undefined {
  return EMAIL.test(raw.trim()) ? undefined : EMAIL_RULE;
}

export function nameError(raw: string): string | undefined {
  return raw.trim().length >= 2 ? undefined : NAME_RULE;
}
