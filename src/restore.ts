// AS1 · pure helpers for restoring a deleted account (backend#108). Kept out of the screens so
// the rules that matter — what counts as an offer, how an expiry is worded — are testable
// without rendering anything.

/** What a sign-in that proved ownership of a deleted account hands back. */
export type RestoreOffer = { token: string; purgeOn: string };

type Res = { status: number; data?: any };

/**
 * The restore offer in a response, or null.
 *
 * The backend answers `409 account_deleted` only AFTER the caller proved they own the account
 * (the right password, or a verified Google/Apple identity), so a 409 here is safe to act on and
 * says nothing about accounts the caller does not own. Everything else — a 200, a generic 401, a
 * different 409 such as `has_active_commitments` — is not an offer. A missing `purge_on` still
 * yields the offer (empty date): the token is what matters, and dropping the offer over a label
 * would strand a person who could have been restored.
 */
export function restoreOfferFrom(res: Res): RestoreOffer | null {
  if (res.status !== 409) return null;
  const error = res.data?.error;
  if (error?.code !== "account_deleted") return null;
  const token = error.details?.restore_token;
  if (typeof token !== "string" || token.length === 0) return null;
  const purgeOn = error.details?.purge_on;
  return { token, purgeOn: typeof purgeOn === "string" ? purgeOn : "" };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDay(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** "26 Nov 2026" from the server's `YYYY-MM-DD`; "" when it is not a date. No Intl: Hermes. */
export function purgeDateLabel(iso: string): string {
  const day = parseDay(iso);
  return day ? `${day.d} ${MONTHS[day.m - 1]} ${day.y}` : "";
}

/** Whole days from today (local calendar days) to `iso`; never negative; null when not a date. */
export function daysLeft(iso: string, now: Date = new Date()): number | null {
  const day = parseDay(iso);
  if (!day) return null;
  const target = Date.UTC(day.y, day.m - 1, day.d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((target - today) / 86_400_000));
}

/** Why `POST /auth/restore` failed, in the words a person can act on. */
export function restoreErrorMessage(res: Res): string {
  if (res.status === 0) return "Couldn't connect. Check your connection and try again.";
  if (res.status === 400) {
    // The token is single-use and lasts ten minutes; the only way forward is a fresh sign-in.
    return "That took too long to confirm. Log in again to restore your account.";
  }
  if (res.status === 429) return "Too many tries. Wait a few minutes and try again.";
  return "That didn't work. Try again.";
}
