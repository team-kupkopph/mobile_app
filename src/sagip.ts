import { MyReport, OfferListStatus, OfferType, RescueCaseSummary, StrayStatus } from "./api/types";

// Sagip's shared display logic, unit-tested (like shelterDashboard.ts / verifications.ts).

// Rule 5: only unclaimed is amber. Reported (amber = someone must still act) · Claimed
// (teal, being helped) · Rescued/Safe (green, resolved-ish) · Resolved (grey).
export type StrayTone = "amber" | "teal" | "green" | "grey";

export function strayChip(status: StrayStatus): { label: string; tone: StrayTone } {
  switch (status) {
    case "reported":
      return { label: "Reported", tone: "amber" };
    case "claimed":
      return { label: "Claimed", tone: "teal" };
    case "rescued":
      return { label: "Rescued", tone: "green" };
    case "safe":
      return { label: "Safe", tone: "green" };
    default:
      return { label: "Resolved", tone: "grey" };
  }
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function sagipTitle(species: string, condition: string): string {
  return `${cap(species)} · ${cap(condition)}`;
}

// Track K (US-K2) — a case can move forward only (never back), and the backend allows
// skipping ahead (e.g. claimed -> safe in one call) rather than forcing one step at a
// time, so this returns every status still reachable, not just the next one.
const CASE_ORDER: StrayStatus[] = ["claimed", "rescued", "safe", "resolved"];

export function advanceableStatuses(current: StrayStatus): StrayStatus[] {
  const idx = CASE_ORDER.indexOf(current);
  if (idx === -1) return []; // 'reported' (not yet claimed) or an unknown value
  return CASE_ORDER.slice(idx + 1);
}

// Track O (US-O1) — the three offer types. Centralised so the offer sheet, the offer
// list and my-offers can't drift on labels the way HANDOFF's OFFERS map does on web.
export const OFFER_TYPES: OfferType[] = ["transport", "vet_costs", "supplies"];
export const OFFER_TYPE_LABEL: Record<OfferType, string> = {
  transport: "Transport", vet_costs: "Vet costs", supplies: "Supplies"
};
export const OFFER_TYPE_HINT: Record<OfferType, string> = {
  transport: "Drive the animal to safety or to a vet",
  vet_costs: "Help cover a vet bill",
  supplies: "Food, a carrier, or other supplies"
};

// Decision 14 — no amber among offer states: amber means "someone must still act", and a
// live offer needs nothing from anyone. The unclaimed REPORT is what still does.
export function offerStatusChip(status: OfferListStatus): { label: string; tone: StrayTone } {
  switch (status) {
    case "open":
      return { label: "Open", tone: "teal" };
    case "matched":
      return { label: "Matched", tone: "green" };
    default:
      return { label: "Expired", tone: "grey" };
  }
}

export function relTime(iso: string, nowMs: number = Date.now()): string {
  const mins = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Home's spotlight (US-X1 redesign, 2026-09-09) ────────────────────────────────────
// Home used to carry a list of four links to the caller's own Sagip screens. A list is the
// same on the day you report your first stray and on the day nothing is open — so it told
// nobody anything. This picks the ONE thing that is actually waiting on them, and Home
// renders that instead.
//
// ⚠️ RANKING. Your own claimed case outranks your own unclaimed report: the case is work you
// owe an animal you took custody of (a claim is binding — see the decision in gen-screens.js),
// whereas an unclaimed report is you waiting on someone else. Within each group, most recent
// first.
//
// ⚠️ THE ONE THING THIS MUST NEVER DO is speak when it does not know. It returns null both
// for "nothing is open" and for "we could not tell", and Home renders NOTHING in either case
// — never a reassuring "you're all clear". That sentence, rendered while a fetch had failed,
// is exactly the 2026-09-04 bug the rescue map and Home's own empty copy were caught in.
export type Spotlight = {
  kind: "case" | "report";
  /** `case` → rescueUpdate needs both ids; `report` → reportDetail needs the report id. */
  caseId: string | null;
  reportId: string;
  title: string;
  city: string | null;
  chip: { label: string; tone: StrayTone };
  /** Relative time for the event that put this in the spotlight (claim, or report). */
  since: string;
  /** The eyebrow above the title — says which of your two piles this came from. */
  eyebrow: string;
  /** What happens next, in the user's terms. Never a feature name. */
  nextStep: string;
};

/** An expired claim is not work you owe any more — the animal went back to the pool. */
function isActiveCase(c: RescueCaseSummary): boolean {
  return c.expired_at === null && c.status !== "resolved";
}

function byNewest(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

export function pickSpotlight(
  cases: RescueCaseSummary[],
  reports: MyReport[],
  nowMs: number = Date.now()
): Spotlight | null {
  const active = cases.filter(isActiveCase).sort((a, b) => byNewest(a.claimed_at, b.claimed_at));
  if (active.length > 0) {
    const c = active[0];
    return {
      kind: "case",
      caseId: c.case_id,
      reportId: c.report.report_id,
      title: sagipTitle(c.report.species, c.report.condition),
      city: c.report.city,
      chip: strayChip(c.status),
      since: `claimed ${relTime(c.claimed_at, nowMs)}`,
      eyebrow: "Your open case",
      // `safe` is the point the handoff opens up (US-H1 list / US-H2 place), and both live
      // behind rescueUpdate — so the copy names the real next move rather than the screen.
      nextStep: c.status === "safe" ? "Find them a home" : "Post an update"
    };
  }

  const open = reports
    .filter((r) => r.status !== "resolved")
    // An unclaimed report is the one still waiting on a human, so it sorts ahead of a
    // report someone has already picked up.
    .sort((a, b) =>
      (a.status === "reported" ? 0 : 1) - (b.status === "reported" ? 0 : 1) ||
      byNewest(a.created_at, b.created_at));
  if (open.length > 0) {
    const r = open[0];
    return {
      kind: "report",
      caseId: null,
      reportId: r.report_id,
      title: sagipTitle(r.species, r.condition),
      city: r.city,
      chip: strayChip(r.status),
      since: `reported ${relTime(r.created_at, nowMs)}`,
      eyebrow: "Your report",
      nextStep:
        r.status === "reported" ? "No one has claimed this yet"
          : r.status === "claimed" ? "A rescuer is on the way"
          : "They're safe now"
    };
  }

  return null;
}

// ── Sagip loop closure (dev/sagip-build-review.md) ────────────────────────────────────

function duration(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// S9 · the claim confirm says a claim "can't be handed back", but an unposted claim reopens
// when its window passes. The claimer is told when, in time left rather than a clock time
// (the server sends the instant; "within 2 h" needs no time-zone guess). Urgent inside the
// last 90 minutes: the backend's hourly sweep warns at 75% of the window, so this is the
// stretch where a push has already gone out.
export function claimDeadline(
  claimDueAt: string | null | undefined, nowMs: number = Date.now()
): { text: string; short: string; urgent: boolean } | null {
  if (!claimDueAt) return null;
  const mins = Math.floor((new Date(claimDueAt).getTime() - nowMs) / 60000);
  if (mins <= 0) {
    return {
      text: "The update window has passed — this may reopen for another rescuer any moment.",
      short: "Update overdue", urgent: true
    };
  }
  return {
    text: `Post an update within ${duration(mins)} or it reopens for another rescuer.`,
    short: `Update within ${duration(mins)}`, urgent: mins <= 90
  };
}

// S5 · the waiting card used to say "partner shelters notified" at level 2 whether or not a
// single partner existed. These lines only claim what the server counted: how many people
// each level actually reached. An older server without the counts gets neutral words.
export function escalationLines(
  level: number | undefined, notified: { level_1: number; level_2: number } | undefined
): string[] {
  if (!level) return [];
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const lines: string[] = [];
  if (!notified) {
    lines.push("Widened to your city.");
    if (level >= 2) lines.push("Widened further.");
    return lines;
  }
  const n1 = notified.level_1, n2 = notified.level_2;
  lines.push(n1 > 0
    ? `Widened to your city · ${n1} verified ${plural(n1, "rescuer", "rescuers")} alerted.`
    : "Widened to your city · no verified rescuers there to alert yet.");
  if (level >= 2) {
    lines.push(n2 > 0
      ? `Widened further · ${n2} partner ${plural(n2, "shelter", "shelters")} nearby alerted.`
      : "Widened further · no partner shelter nearby to alert yet.");
  }
  return lines;
}

// S8 · "Open in Maps" from the case screen, to the exact point the claimer is entitled to.
export function directionsUrl(lat: number, lng: number, os: string): string {
  return os === "ios"
    ? `http://maps.apple.com/?daddr=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// S11 · the reasons a reporter may close their own report — the backend's
// ReportCloseSerializer accepts exactly these keys.
export type CloseReason = "gone" | "duplicate" | "handled_myself" | "mistake";
export const CLOSE_REASONS: { key: CloseReason; label: string }[] = [
  { key: "gone", label: "The animal is gone" },
  { key: "duplicate", label: "Someone already reported it" },
  { key: "handled_myself", label: "I took care of it myself" },
  { key: "mistake", label: "I reported it by mistake" }
];
const CLOSE_NOTE_PREFIX = "closed_by_reporter:";

/** A status-history note in the reporter's words: their own close named, others as written. */
export function historyNote(note: string | undefined): string | null {
  if (!note) return null;
  if (note.startsWith(CLOSE_NOTE_PREFIX)) {
    const key = note.slice(CLOSE_NOTE_PREFIX.length);
    const reason = CLOSE_REASONS.find((r) => r.key === key);
    return `Closed by you · ${reason ? reason.label : key}`;
  }
  return note;
}
