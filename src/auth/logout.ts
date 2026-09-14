import { createApi } from "../api/client";

type Tokens = { access: string; refresh: string } | null;

// F15 · how long sign-out waits for the server to acknowledge the revoke before wiping the
// device anyway. Long enough for a healthy round-trip; short enough that a dead network never
// leaves the user staring at a Log out button that "does nothing".
export const LOGOUT_REVOKE_TIMEOUT_MS = 3000;

/**
 * F15 (dev/test-plan-auth.md, Run 3 · X-1) — Log out must revoke the refresh token server-side.
 *
 * WHY. Refresh tokens live 30 days (REFRESH_TOKEN_LIFETIME). Before this, `signOut()` only
 * wiped SecureStore, so a refresh copied off the device kept minting access tokens after the
 * user had "logged out"; only Log out everywhere killed it. POST /auth/logout {refresh}
 * (Bearer access) blacklists the refresh; it answers 204 even for a bogus refresh, so the call
 * is best-effort on both ends.
 *
 * ORDER. The revoke is awaited BEFORE the local wipe — but only for a bounded window, and it
 * never rejects. Awaiting it first means a fast success is not cancelled by the unmount the
 * wipe triggers (tokens → null re-renders the navigator); bounding it means offline / DNS /
 * a hung socket cannot hold the user on the screen. A request that outlives the window simply
 * completes (or fails) in the background.
 *
 * The api client is built with a no-op `setTokens` on purpose. On a 401 it refreshes and
 * retries with the new access — good, that lets the revoke land — but it must NOT write the
 * refreshed pair back to SecureStore, or a slow refresh could re-persist a session after the
 * wipe below has already run.
 */
export function revokeRefreshToken(
  tokens: NonNullable<Tokens>,
  timeoutMs: number = LOGOUT_REVOKE_TIMEOUT_MS,
): Promise<void> {
  const api = createApi(() => tokens, async () => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => { timer = setTimeout(resolve, timeoutMs); });
  // createApi never rejects (US-C1: network failure → status 0), but a `.catch` costs nothing
  // and keeps "never blocks the wipe" true even if that contract changes.
  const attempt = api.post("/auth/logout", { refresh: tokens.refresh }).then(() => undefined, () => undefined);
  return Promise.race([attempt, deadline]).finally(() => { if (timer !== undefined) clearTimeout(timer); });
}

/** Revoke server-side (bounded, best-effort) when there is a session, then always wipe locally. */
export async function signOutWithRevoke(tokens: Tokens, wipe: () => Promise<void>): Promise<void> {
  if (tokens) await revokeRefreshToken(tokens);
  await wipe();
}
