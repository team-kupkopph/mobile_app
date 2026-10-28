// Plan Task 14b · the biometric app lock's decisions, as pure functions (the gate and the Settings switch
// are thin shells around them). Device-local: the server knows nothing about it.
//
// Locks on a cold start (someone signed in who turned it on) and when the app comes back after MORE than
// LOCK_AFTER_MS in the background. The device passcode is the fallback the OS itself offers, there is no
// in-app PIN, and nothing here can bypass the lock: repeated failures only add "Sign out" as the other way
// out, never instead of Unlock.

/** One constant, so the grace period is a decision in one place. */
export const LOCK_AFTER_MS = 60_000;
export const MAX_FAILED_ATTEMPTS = 3;

export function shouldLock(input: {
  hasTokens: boolean;
  enabled: boolean;
  event: "start" | "resume";
  /** When the app last left the foreground (ms), or null if it has not since this launch. */
  backgroundedAt: number | null;
  now: number;
}): boolean {
  // A guest has nothing to protect, and a person who did not opt in is never interrupted.
  if (!input.hasTokens || !input.enabled) return false;
  if (input.event === "start") return true;
  if (input.backgroundedAt === null) return false;
  return input.now - input.backgroundedAt > LOCK_AFTER_MS;
}

export function lockScreenOptions(failures: number): { canUnlock: boolean; canSignOut: boolean } {
  return { canUnlock: true, canSignOut: failures >= MAX_FAILED_ATTEMPTS };
}
