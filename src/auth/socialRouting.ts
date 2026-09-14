/**
 * Where to send someone after POST /auth/social/{provider} answers 200.
 *
 * The backend (accounts/views.py SocialAuthView) decides identity on the same call that
 * creates the account: `is_new` is true only when neither the provider identity nor the
 * email was already on file. A returning user is therefore signed in, not signed up — the
 * signup recap ("You're in! Your email is verified") and the shelter setup steps are wrong
 * for them, and the account type they tapped is ignored by the server anyway.
 *
 * A missing flag is treated as new. That is the behaviour the screens had before the flag was
 * read at all, and it fails loud (a recap) rather than quiet (a home reset that skips setup).
 */
export function isReturningSocialAccount(data: unknown): boolean {
  return !!data && typeof data === "object" && (data as { is_new?: unknown }).is_new === false;
}
