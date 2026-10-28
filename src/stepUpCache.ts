// A step-up proof, remembered for its own short life (account-settings Run 2, N5).
//
// The server mints a signed, account-bound token good for five minutes. Without this the app dropped it after
// one retry, so an export followed by a password change a minute later asked for a second code. Kept IN MEMORY
// only (never SecureStore: a proof that outlives the process is exactly what it is not), shorter than the
// server's window so the app never sends one that is about to expire, and cleared on any session end
// (AuthContext), so the next person on a shared phone inherits nothing. The server still binds it to the
// account, so a stale one fails safe: it is refused and the person is asked again.
export const STEP_UP_TOKEN_TTL_MS = 270_000;   // 4.5 min, inside the server's 5

let kept: { token: string; at: number } | null = null;

export function getCachedStepUp(now: number): string | undefined {
  if (!kept) return undefined;
  if (now - kept.at >= STEP_UP_TOKEN_TTL_MS) { kept = null; return undefined; }
  return kept.token;
}

export function setCachedStepUp(token: string, now: number): void {
  kept = { token, at: now };
}

export function clearStepUpCache(): void {
  kept = null;
}
