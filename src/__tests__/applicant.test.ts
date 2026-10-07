import {
  CHANGED_NOTE, DECLINE_REASONS, actionPath, applicantFooter, applicantRefusal, applicantStatusLine,
  askedAgo, confirmCopy, firstName, listingStatusChip, posterLadderHeader, stepActions
} from "../applicant";
import { PosterInquiry } from "../api/types";

const STAGES = ["inquiry", "application", "home_check", "interview", "vet_clearance", "finalization"];
function row(over: Partial<PosterInquiry> = {}): PosterInquiry {
  return {
    viewer: "poster", inquiry_id: "i1", kind: "inquiry", status: "active",
    listing: { listing_id: "l1", name: "Milo", species: "dog", status: "available" },
    accepted_at: null, reserved_at: null, end_reason: null,
    stages: STAGES.map((k) => ({ stage_key: k, state: k === "inquiry" ? "done" : "not_started" })),
    message: "We have a yard.", created_at: "2026-10-04T08:00:00Z",
    adopter: { account_id: "a1", display_name: "Juan Dela Cruz", city: "Pasig City", verified_member: true },
    ...over
  } as PosterInquiry;
}
const ACCEPTED = "2026-10-05T08:00:00Z";

describe("applicantFooter (spec §2)", () => {
  it("new → Accept for screening + Decline", () => {
    expect(applicantFooter(row())).toEqual({
      primary: { action: "screen", label: "Accept for screening" }, secondary: ["decline"], note: null, doneNote: null
    });
  });
  it("screening, a Verified Member, listing available → Reserve {pet} for {first}", () => {
    expect(applicantFooter(row({ accepted_at: ACCEPTED })).primary)
      .toEqual({ action: "reserve", label: "Reserve Milo for Juan" });
  });
  it("screening, not verified → Ask to get verified, with the reason above", () => {
    const f = applicantFooter(row({ accepted_at: ACCEPTED, adopter: { ...row().adopter, verified_member: false } }));
    expect(f.primary).toEqual({ action: "askVerify", label: "Ask Juan to get verified" });
    expect(f.note).toBe("Juan needs a Verified Member badge before you can reserve Milo.");
  });
  it("screening while the listing is reserved for someone else → no primary", () => {
    const f = applicantFooter(row({ accepted_at: ACCEPTED, listing: { ...row().listing, status: "pending" } }));
    expect(f.primary).toBeNull();
    expect(f.secondary).toEqual(["decline"]);
    expect(f.note).toBe("Milo is reserved for another applicant.");
  });
  it("reserved → Complete adoption, then Release + Decline", () => {
    const f = applicantFooter(row({ accepted_at: ACCEPTED, reserved_at: ACCEPTED, listing: { ...row().listing, status: "pending" } }));
    expect(f.primary).toEqual({ action: "complete", label: "Complete adoption" });
    expect(f.secondary).toEqual(["release", "decline"]);
    expect(f.note).toBe("Milo is reserved for Juan.");
  });
  it("adopted and closed states have no footer, only a closing line", () => {
    expect(applicantFooter(row({ status: "adopted" })).doneNote).toBe("Milo went home with Juan.");
    expect(applicantFooter(row({ status: "declined", end_reason: "requirements_not_met" })).doneNote)
      .toBe("You declined: Requirements not met.");
    expect(applicantFooter(row({ status: "withdrawn", end_reason: "adopter_withdrew" })).doneNote).toBe("Juan withdrew.");
    expect(applicantFooter(row({ status: "declined", end_reason: "another_adopter_chosen" })).doneNote)
      .toBe("Milo went home with another applicant.");
    expect(applicantFooter(row({ status: "withdrawn", end_reason: "listing_withdrawn" })).doneNote).toBe("You took Milo down.");
    expect(applicantFooter(row({ status: "declined" })).primary).toBeNull();
  });
  it("an open placement is read-only", () => {
    const f = applicantFooter(row({ kind: "placement" }));
    expect(f.primary).toBeNull();
    expect(f.secondary).toEqual([]);
    expect(f.doneNote).toBe("Placement offer, waiting for Juan Dela Cruz to answer.");
  });
  it("a missing animal name reads 'this animal'", () => {
    expect(applicantFooter(row({ accepted_at: ACCEPTED, listing: { ...row().listing, name: "" } })).primary?.label)
      .toBe("Reserve this animal for Juan");
  });
});

describe("confirmCopy and actionPath", () => {
  it("each footer action has its confirm and its endpoint", () => {
    expect(confirmCopy("screen", row())).toEqual({
      title: "Accept Juan for screening?", body: "You'll both see each other's phone numbers.",
      confirmLabel: "Accept", tone: "neutral"
    });
    expect(confirmCopy("complete", row()).body)
      .toBe("Milo goes home with Juan. Other applicants will be told Milo found a home. This can't be undone.");
    expect(confirmCopy("release", row()).title).toBe("Release the reservation?");
    expect(actionPath("screen")).toBe("screen");
    expect(actionPath("askVerify")).toBe("reserve");
    expect(actionPath("release")).toBe("unreserve");
  });
});

describe("posterLadderHeader / applicantStatusLine", () => {
  it("Step N of 6 · Reserved · Adopted · none when closed", () => {
    expect(posterLadderHeader(row())).toEqual({ label: "Step 2 of 6", tone: "info" });
    expect(posterLadderHeader(row({ reserved_at: ACCEPTED }))).toEqual({ label: "Reserved", tone: "warning" });
    expect(posterLadderHeader(row({ status: "adopted" }))).toEqual({ label: "Adopted", tone: "success" });
    expect(posterLadderHeader(row({ status: "declined" }))).toBeNull();
  });
  it("one line per applicant row", () => {
    expect(applicantStatusLine(row())).toBe("New");
    const interview = row({ accepted_at: ACCEPTED }).stages.map((s) =>
      s.stage_key === "interview" ? { ...s, state: "in_progress" } : s);
    expect(applicantStatusLine(row({ accepted_at: ACCEPTED, stages: interview }))).toBe("Screening · Interview in progress");
    expect(applicantStatusLine(row({ accepted_at: ACCEPTED, reserved_at: ACCEPTED }))).toBe("Reserved for them");
    expect(applicantStatusLine(row({ status: "adopted" }))).toBe("Adopted");
    expect(applicantStatusLine(row({ status: "withdrawn", end_reason: "adopter_withdrew" }))).toBe("Withdrew");
    expect(applicantStatusLine(row({ status: "declined", end_reason: "not_a_fit" }))).toBe("Declined");
    expect(applicantStatusLine(row({ kind: "placement" }))).toBe("Placement offer");
  });
});

describe("sheets, chips, refusals, dates", () => {
  it("decline reasons, worded as the adopter reads them", () => {
    expect(DECLINE_REASONS).toEqual([
      { code: "not_a_fit", label: "Not the right match" },
      { code: "requirements_not_met", label: "Requirements not met" },
      { code: "no_response", label: "Couldn't reach them" },
      { code: "other", label: "Other reason" }
    ]);
  });
  it("step actions hide the current state, and finalization can't be marked done", () => {
    expect(stepActions("interview", "not_started")).toEqual([
      { state: "in_progress", label: "Start" }, { state: "done", label: "Mark done" }, { state: "skipped", label: "Skip" }
    ]);
    expect(stepActions("interview", "in_progress").map((a) => a.label)).toEqual(["Mark done", "Skip"]);
    expect(stepActions("finalization", "in_progress").map((a) => a.label)).toEqual(["Skip"]);
  });
  it("listing chips say Reserved, never pending", () => {
    expect(listingStatusChip("pending")).toEqual({ label: "Reserved", tone: "warning" });
    expect(listingStatusChip("available")).toEqual({ label: "Live", tone: "success" });
    expect(listingStatusChip("draft")).toEqual({ label: "Draft", tone: "neutral" });
    expect(listingStatusChip("adopted")).toEqual({ label: "Adopted", tone: "success" });
    expect(listingStatusChip("withdrawn")).toEqual({ label: "Withdrawn", tone: "neutral" });
  });
  it("refusals map to what the poster sees", () => {
    for (const c of ["already_screening", "inquiry_closed", "already_reserved", "reserved_for_another",
                     "not_reserved", "not_screening", "listing_unavailable"]) {
      expect(applicantRefusal(c)).toBe("changed");
    }
    expect(applicantRefusal("poster_phone_required")).toBe("phone");
    expect(applicantRefusal("adopter_badge_required")).toBe("badge");
    expect(applicantRefusal("boom")).toBe("other");
    expect(CHANGED_NOTE).toBe("This changed while you were looking. Here's where it stands now.");
  });
  it("asked-ago reads plainly, and first names are first words", () => {
    const now = new Date("2026-10-06T08:00:00Z");
    expect(askedAgo("2026-10-06T07:00:00Z", now)).toBe("today");
    expect(askedAgo("2026-10-05T07:00:00Z", now)).toBe("yesterday");
    expect(askedAgo("2026-10-01T07:00:00Z", now)).toBe("5 days ago");
    expect(askedAgo(undefined, now)).toBe("");
    expect(firstName("Juan Dela Cruz")).toBe("Juan");
    expect(firstName("")).toBe("they");
  });
});
