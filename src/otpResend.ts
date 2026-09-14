// src/otpResend.ts — F3: the resend button used to say "We sent a new code." whatever the server said.
export type ResendOutcome = { ok: boolean; notice: string; cooldown: number };
const RESEND_COOLDOWN_SECONDS = 60;
export function resendOutcome(res: { status: number; data?: any }): ResendOutcome {
  if (res.status >= 200 && res.status < 300) return { ok: true, notice: "We sent a new code.", cooldown: RESEND_COOLDOWN_SECONDS };
  if (res.status === 0) return { ok: false, notice: "Couldn't reach the server. Check your connection and try again.", cooldown: 0 };
  if (res.status === 429) {
    const wait = Number(res.data?.error?.details?.retry_after);
    const secs = Number.isFinite(wait) && wait > 0 ? wait : RESEND_COOLDOWN_SECONDS;
    const mins = Math.max(1, Math.ceil(secs / 60));
    return { ok: false, notice: `Too many codes requested. Try again in about ${mins} minute${mins === 1 ? "" : "s"}.`, cooldown: secs };
  }
  return { ok: false, notice: "Couldn't send a new code. Please try again.", cooldown: 0 };
}
