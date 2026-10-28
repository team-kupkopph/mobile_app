// Plan Task 14c · the step-up answer, as pure logic (backend: accounts/stepup.py).
//
// With two-step verification on, five routes refuse with `403 step_up_required` until the request carries
// `X-Step-Up: <token>`. The app answers that ONCE per action: ask for a code, trade it for a token, retry the
// same call with it. A prompt on every action trains people to ignore it, so the contract is exactly one
// prompt and exactly one retry. The UI (StepUpPrompt, useStepUp) is a thin shell around this.
import { ApiResult } from "./api/client";
import { codeError } from "./changeEmail";
import { clearStepUpCache, getCachedStepUp, setCachedStepUp } from "./stepUpCache";

export const STEP_UP_HEADER = "X-Step-Up";

type Api = { post: (p: string, b?: any, o?: any) => Promise<ApiResult> };

const CONNECT = "Couldn't connect. Check your connection and try again.";
const TOO_MANY = "Too many codes requested. Wait a while and try again.";
const GENERIC = "That didn't work. Try again.";

/** True for the server's one specific refusal: the action is fine, it just wants proof it's you. */
export function isStepUpRequired(res: { status: number; data?: any; ok?: boolean }): boolean {
  return res.status === 403 && res.data?.error?.code === "step_up_required";
}

export type SentCode = { ok: true; sentTo: string } | { ok: false; message: string };

/** Send a code to the account's own verified email (or phone, when asked). `sentTo` is already masked. */
export async function requestStepUpCode(api: Api, channel?: "sms"): Promise<SentCode> {
  const res = await api.post("/me/step-up", channel ? { channel } : {});
  if (res.status === 202) return { ok: true, sentTo: String(res.data?.sent_to ?? "") };
  if (res.status === 409 && res.data?.error?.code === "no_verified_channel") {
    return { ok: false, message: `We have no verified ${channel === "sms" ? "phone" : "email"} to send a code to.` };
  }
  if (res.status === 429) return { ok: false, message: TOO_MANY };
  if (res.status === 0) return { ok: false, message: CONNECT };
  return { ok: false, message: GENERIC };
}

export type VerifiedStepUp =
  | { ok: true; token: string }
  /** `restart`: the code is spent or unusable, so offer to send a new one rather than retype. */
  | { ok: false; message: string; restart?: boolean };

/** Trade a typed code for a step-up token. */
export async function verifyStepUp(api: Api, code: string): Promise<VerifiedStepUp> {
  const bad = codeError(code);
  if (bad) return { ok: false, message: bad };
  const res = await api.post("/me/step-up/verify", { code });
  if (res.ok && res.data?.step_up_token) return { ok: true, token: String(res.data.step_up_token) };
  if (res.status === 400 && res.data?.error?.code === "code_invalid") {
    const left = res.data?.error?.details?.attempts_left;
    return { ok: false, message: typeof left === "number" && left > 0
      ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`
      : "That code isn't right." };
  }
  if (res.status === 410) return { ok: false, message: "That code expired. Send a new one.", restart: true };
  if (res.status === 423) return { ok: false, message: "Too many wrong codes. Wait a while, then send a new one.", restart: true };
  if (res.status === 429) return { ok: false, message: TOO_MANY };
  if (res.status === 0) return { ok: false, message: CONNECT };
  return { ok: false, message: GENERIC };
}

export type StepUpOutcome =
  | { kind: "result"; res: ApiResult }
  /** The person closed the prompt: the action stays undone and nothing is said. */
  | { kind: "cancelled" }
  /** A code could not even be sent (no verified email, offline, rate limit). */
  | { kind: "unavailable"; message: string };

/**
 * Run `call`; if the server wants a proof, ask once and retry once.
 *
 * A proof earned a moment ago is sent first (stepUpCache.ts), so a second sensitive action inside its life does
 * not ask again; if the server no longer accepts it the cache is dropped and the person is asked once.
 *
 * `call(undefined)` is the plain attempt (a server with two-step off, or an account that never turned it on,
 * answers it directly, so nobody is ever prompted who did not opt in). `ask(sentTo)` shows the prompt and
 * resolves a token, or `null` when the person cancels. A SECOND refusal is handed back as the result:
 * looping on a prompt would be a trap.
 */
export async function runWithStepUp(opts: {
  call: (stepUpToken?: string) => Promise<ApiResult>;
  api: Api;
  ask: (sentTo: string) => Promise<string | null>;
  /** Injected for tests; the clock that decides whether a remembered proof is still good. */
  now?: () => number;
}): Promise<StepUpOutcome> {
  const clock = opts.now ?? Date.now;
  const remembered = getCachedStepUp(clock());
  const first = await opts.call(remembered);
  if (!isStepUpRequired(first)) return { kind: "result", res: first };
  if (remembered) clearStepUpCache();                  // the server refused it: it is not good any more

  const sent = await requestStepUpCode(opts.api);
  if (!sent.ok) return { kind: "unavailable", message: sent.message };

  const token = await opts.ask(sent.sentTo);
  if (token === null) return { kind: "cancelled" };
  const res = await opts.call(token);
  if (isStepUpRequired(res)) clearStepUpCache();       // refused even now: never keep a proof that does not work
  else setCachedStepUp(token, clock());
  return { kind: "result", res };
}
