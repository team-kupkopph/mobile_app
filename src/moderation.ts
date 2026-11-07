// Review step 7 · reporting and blocking, as data and rules. The screens only render this.
//
// Both stores require them for an app with user-generated content (Apple 1.2: a report mechanism and the ability to
// block abusive users; Google Play's UGC policy: in-app reporting of content AND users, and blocking). Where a person is
// shown without an account id (a story's author, a shelter on a shift), they are named by what they posted and the
// server works out who, so no account id has to travel in a public payload.
import type { createApi } from "./api/client";

type Api = ReturnType<typeof createApi>;

/** The backend's `moderation.models.ReasonCode`. A parity test keeps the two in step. */
export type ReportReason = "spam_scam" | "animal_welfare" | "harassment" | "misleading" | "other";

export const REPORT_REASONS: ReadonlyArray<{ code: ReportReason; label: string; hint: string }> = [
  { code: "spam_scam", label: "Spam or a scam", hint: "Fake listings, asking for money, payments off the app" },
  { code: "animal_welfare", label: "An animal may be in danger", hint: "Neglect, cruelty, an animal not being cared for" },
  { code: "harassment", label: "Harassment or abuse", hint: "Threats, insults, contact you did not ask for" },
  { code: "misleading", label: "Misleading or fake", hint: "Not what it says it is" },
  { code: "other", label: "Something else", hint: "Tell us what is wrong" },
];

/** What a person can be reached through when the app has no account id for them. Matches the backend's `VIA_TYPES`. */
export type ViaType = "listing" | "story" | "shift" | "inquiry" | "signup";

/** A person, for "report this person" and "block". `name` is what the screen already shows; it is never sent. */
export type PersonRef = { name: string; accountId?: string; via?: { type: ViaType; id: string } };

/** The backend's `moderation.models.FlagTarget`, in its order. A parity test keeps the two in step. */
export const REPORT_TARGET_TYPES = ["account", "listing", "report", "qr", "message", "story", "shift", "inquiry", "signup"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export type ReportParams = {
  targetType: ReportTargetType;
  /** Omitted when a person is named by what they posted (`via`). */
  targetId?: string;
  via?: { type: ViaType; id: string };
  /** What the screen calls it ("Bantay", "Juan"), so a mistaken tap is noticed. */
  subject?: string;
  /** Set when the report is about a person, so the confirmation can offer Block. */
  person?: PersonRef;
  /** True when the page the report came from shows that person's content, so blocking them should leave it too. */
  leaveContent?: boolean;
};

const SUBJECT_FALLBACK: Record<ReportTargetType, string> = {
  report: "this report", listing: "this listing", account: "this person", qr: "this donation QR",
  message: "this message", shift: "this activity", story: "this story", inquiry: "this message",
  signup: "this volunteer",
};

export function reportSubject(p: Pick<ReportParams, "targetType" | "subject">): string {
  return p.subject?.trim() || SUBJECT_FALLBACK[p.targetType];
}

/** What is wrong with the form so far, keyed to the field that needs fixing. Empty when it can be sent. */
export function validateReport(code: ReportReason | null, note: string): { reason?: string; note?: string } {
  if (!code) return { reason: "Pick what is wrong." };
  if (code === "other" && !note.trim()) return { note: "Tell us what is wrong." };
  return {};
}

export type ReportProblems = { reason?: string; note?: string; form?: string };

/**
 * What is still wrong after an edit. A problem that is fixed must stop showing: on the device the note error stayed red
 * under a field that now had text in it. A server error is dropped on any edit, so a retry starts clean.
 */
export function stillWrong(shown: ReportProblems, code: ReportReason | null, note: string): ReportProblems {
  const now = validateReport(code, note);
  return {
    ...(now.reason && shown.reason ? { reason: shown.reason } : {}),
    ...(now.note && shown.note ? { note: shown.note } : {}),
  };
}

/** How long to wait, in words a person can plan around: "about 3 hours", "about 20 minutes", "a minute". */
export function waitText(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  if (minutes < 60) return minutes === 1 ? "a minute" : `about ${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "about an hour" : `about ${hours} hours`;
}

/**
 * Why a report could not be sent (review step 16, MO13). A day-long limit used to read "try again shortly", and the
 * retry could not succeed; it now says when the limit lifts. Anything else the server said stands (it is already a sentence:
 * "That's yours, so there is nothing to report.").
 */
export function reportFailure(res: { status: number; data?: any }): string {
  const wait = res.data?.error?.details?.retry_after;
  if (res.status === 429) {
    return typeof wait === "number" && wait > 0
      ? `You have sent a lot of reports today. You can send another in ${waitText(wait)}.`
      : "You have sent a lot of reports today. Please try again later.";
  }
  return res.data?.error?.message ?? "Couldn't send the report. Try again.";
}

export function reportBody(p: ReportParams, code: ReportReason, note: string) {
  const trimmed = note.trim();
  const target = p.via
    ? { via_type: p.via.type, via_id: p.via.id }
    : { target_id: p.targetId };
  return { target_type: p.targetType, ...target, reason_code: code, ...(trimmed ? { reason: trimmed } : {}) };
}

export function blockBody(person: PersonRef) {
  return person.accountId
    ? { account_id: person.accountId }
    : { via_type: person.via?.type, via_id: person.via?.id };
}

/** What the confirmation says. It must say what a block does AND what it leaves alone (MQ1). */
export function blockConfirmCopy(name: string) {
  return {
    title: `Block ${name}?`,
    body: `You will not see each other's posts or be able to contact each other through Kupkop. ` +
      `${name} is not told. Anything already under way between you, such as an adoption, carries on. ` +
      `You can undo this in Settings.`,
    confirm: "Block",
  };
}

/**
 * How many screens to pop once a block has gone through. The confirmation sits on top of the page the person was looking at
 * ("Pia's listing"); after the block that page is stale, still showing their content and a Block button. Found by walking
 * it on the simulator. The applicant screen is the exception: an inquiry already under way is never touched, so it stays.
 */
export function blockExitDepth(leaveContent?: boolean): number {
  return leaveContent ? 2 : 1;
}

export type BlockedPerson = { block_id: string; display_name: string; blocked_at: string };

export type BlockOutcome = { ok: true } | { ok: false; message: string };

/** One place that blocks someone, so every entry point words a failure the same way. */
export async function blockPerson(api: Api, person: PersonRef): Promise<BlockOutcome> {
  const res = await api.post("/me/blocks", blockBody(person));
  if (res.ok) return { ok: true };
  return { ok: false, message: res.data?.error?.message ?? "Could not block. Try again." };
}
