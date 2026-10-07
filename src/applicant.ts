// Adoption · the poster's side of an inquiry — every decision the Applicant and Your-listing
// screens make, kept pure so jest pins it (spec docs/superpowers/specs/2026-10-06-adoption-
// applicant-screen-design.md §2–§3). Wording mirrors backend listings/notices.py.
import { PosterInquiry } from "./api/types";
import { ChipTone } from "./components/ui";
import { inquiryProgressLabel, ladderStep } from "./adoption";

export type FooterAction = "screen" | "reserve" | "askVerify" | "complete";
export type SecondaryAction = "release" | "decline";
export type ApplicantFooter = {
  primary: { action: FooterAction; label: string } | null;
  secondary: SecondaryAction[];
  note: string | null;
  doneNote: string | null;
};

export const CHANGED_NOTE = "This changed while you were looking. Here's where it stands now.";

export const DECLINE_REASONS = [
  { code: "not_a_fit", label: "Not the right match" },
  { code: "requirements_not_met", label: "Requirements not met" },
  { code: "no_response", label: "Couldn't reach them" },
  { code: "other", label: "Other reason" }
] as const;
const REASON_LABEL: Record<string, string> = Object.fromEntries(DECLINE_REASONS.map((r) => [r.code, r.label]));

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "they";
}
export function petName(row: PosterInquiry): string {
  return row.listing.name || "this animal";
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function applicantFooter(row: PosterInquiry): ApplicantFooter {
  const first = firstName(row.adopter.display_name);
  const pet = petName(row);
  const none = { primary: null, secondary: [] as SecondaryAction[], note: null };
  if (row.kind === "placement" && row.status === "active") {
    return { ...none, doneNote: `Placement offer, waiting for ${row.adopter.display_name} to answer.` };
  }
  if (row.status === "adopted") return { ...none, doneNote: `${cap(pet)} went home with ${first}.` };
  if (row.status !== "active") return { ...none, doneNote: closedLine(row, first, pet) };
  if (!row.accepted_at) {
    return { primary: { action: "screen", label: "Accept for screening" }, secondary: ["decline"], note: null, doneNote: null };
  }
  if (row.reserved_at) {
    return { primary: { action: "complete", label: "Complete adoption" }, secondary: ["release", "decline"],
             note: `${cap(pet)} is reserved for ${first}.`, doneNote: null };
  }
  if (row.listing.status === "pending") {
    return { primary: null, secondary: ["decline"], note: `${cap(pet)} is reserved for another applicant.`, doneNote: null };
  }
  if (!row.adopter.verified_member) {
    return { primary: { action: "askVerify", label: `Ask ${first} to get verified` }, secondary: ["decline"],
             note: `${first} needs a Verified Member badge before you can reserve ${pet}.`, doneNote: null };
  }
  return { primary: { action: "reserve", label: `Reserve ${pet} for ${first}` }, secondary: ["decline"], note: null, doneNote: null };
}

function closedLine(row: PosterInquiry, first: string, pet: string): string {
  const reason = row.end_reason ?? "";
  if (reason === "adopter_withdrew") return `${first} withdrew.`;
  if (reason === "another_adopter_chosen") return `${cap(pet)} went home with another applicant.`;
  if (reason === "listing_withdrawn") return `You took ${pet} down.`;
  if (REASON_LABEL[reason]) return `You declined: ${REASON_LABEL[reason]}.`;
  return "This inquiry is closed.";
}

export function confirmCopy(action: FooterAction | "release", row: PosterInquiry):
    { title: string; body: string; confirmLabel: string; tone: "neutral" | "warning" | "danger" } {
  const first = firstName(row.adopter.display_name);
  const pet = petName(row);
  switch (action) {
    case "screen":
      return { title: `Accept ${first} for screening?`, body: "You'll both see each other's phone numbers.", confirmLabel: "Accept", tone: "neutral" };
    case "reserve":
    case "askVerify":
      return { title: `Reserve ${pet} for ${first}?`, body: `${cap(pet)} leaves the Adopt feed and other applicants wait.`, confirmLabel: "Reserve", tone: "neutral" };
    case "complete":
      return { title: "Complete the adoption?", body: `${cap(pet)} goes home with ${first}. Other applicants will be told ${pet} found a home. This can't be undone.`, confirmLabel: "Complete", tone: "warning" };
    case "release":
      return { title: "Release the reservation?", body: `${cap(pet)} goes back on the Adopt feed. ${first} stays in the running.`, confirmLabel: "Release", tone: "neutral" };
  }
}

export function actionPath(action: FooterAction | "release"): string {
  return { screen: "screen", reserve: "reserve", askVerify: "reserve", complete: "complete", release: "unreserve" }[action];
}

export function posterLadderHeader(row: PosterInquiry): { label: string; tone: ChipTone } | null {
  if (row.status === "adopted") return { label: "Adopted", tone: "success" };
  if (row.status !== "active") return null;
  if (row.reserved_at) return { label: "Reserved", tone: "warning" };
  const { step, of } = ladderStep(row.stages);
  return { label: `Step ${step} of ${of}`, tone: "info" };
}

export function applicantStatusLine(row: PosterInquiry): string {
  if (row.kind === "placement" && row.status === "active") return "Placement offer";
  if (row.status === "adopted") return "Adopted";
  if (row.status === "withdrawn" && row.end_reason === "adopter_withdrew") return "Withdrew";
  if (row.status !== "active") return "Declined";
  if (row.reserved_at) return "Reserved for them";
  if (!row.accepted_at) return "New";
  return `Screening · ${inquiryProgressLabel(row.stages)}`;
}

const STEP_LABEL: Record<string, string> = { in_progress: "Start", done: "Mark done", skipped: "Skip" };
export function stepActions(stageKey: string, state: string): Array<{ state: string; label: string }> {
  return ["in_progress", "done", "skipped"]
    .filter((s) => s !== state && !(stageKey === "finalization" && s === "done"))
    .map((s) => ({ state: s, label: STEP_LABEL[s] }));
}

export function listingStatusChip(status: string): { label: string; tone: ChipTone } {
  switch (status) {
    case "draft": return { label: "Draft", tone: "neutral" };
    case "pending": return { label: "Reserved", tone: "warning" };
    case "adopted": return { label: "Adopted", tone: "success" };
    case "withdrawn": return { label: "Withdrawn", tone: "neutral" };
    default: return { label: "Live", tone: "success" };
  }
}

const CHANGED = new Set(["already_screening", "inquiry_closed", "already_reserved", "reserved_for_another",
                         "not_reserved", "not_screening", "listing_unavailable"]);
export function applicantRefusal(code: string | undefined): "changed" | "phone" | "badge" | "other" {
  if (code && CHANGED.has(code)) return "changed";
  if (code === "poster_phone_required") return "phone";
  if (code === "adopter_badge_required") return "badge";
  return "other";
}

export function askedAgo(iso: string | undefined, now: Date): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
