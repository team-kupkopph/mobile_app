// Canonical signup / reset password rule (dev/onboarding-validation.md §signup): min 8
// characters, at least one number. The SAME string the server raises (accounts/serializers.py
// :: PASSWORD_ERROR) so the two never disagree. Reset uses the same rule ("same strength rule
// as signup" — §reset-password), plus its own must-differ / must-match checks on that screen.
export const PASSWORD_RULE = "At least 8 characters, including a number.";

export function passwordError(pw: string): string | undefined {
  if (pw.length < 8 || !/\d/.test(pw)) return PASSWORD_RULE;
  return undefined;
}
