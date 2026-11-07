// Review step 7a · when the server refuses a post because the person has not accepted the CURRENT terms (403 `terms_not_accepted`), the app
// takes them to the terms to accept. One place, instead of every posting screen learning about it: the api client announces the refusal,
// and a single listener (auth/TermsGate.tsx) navigates. Nothing here sends anything.
let listener: (() => void) | null = null;

export function setTermsListener(fn: (() => void) | null): void {
  listener = fn;
}

export const TERMS_REFUSAL_CODE = "terms_not_accepted";

/** True for the server's answer to a post it will not take until the terms are accepted. */
export function isTermsRefusal(res: { status: number; data?: any }): boolean {
  return res.status === 403 && res.data?.error?.code === TERMS_REFUSAL_CODE;
}

export function announceTermsRefusal(): void {
  try { listener?.(); } catch { /* a navigation failure must not break the request that was refused */ }
}
