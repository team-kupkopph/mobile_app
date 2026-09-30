import { MyReport, RescueCaseSummary } from "../api/types";
import {
  CLOSE_REASONS, offersShareContact, personSummary, advanceableStatuses, claimDeadline, directionsUrl, escalationLines, historyNote,
  offerStatusChip, pickSpotlight, relTime, sagipTitle, strayChip
} from "../sagip";

describe("strayChip (only unclaimed is amber — the app's 'someone must act' colour)", () => {
  it("maps each status to a labelled tone", () => {
    expect(strayChip("reported")).toEqual({ label: "Reported", tone: "amber" });
    expect(strayChip("claimed")).toEqual({ label: "Claimed", tone: "teal" });
    expect(strayChip("rescued").tone).toBe("green");
    expect(strayChip("safe").tone).toBe("green");
    expect(strayChip("resolved").tone).toBe("grey");
  });
});

describe("sagipTitle", () => {
  it("formats species and condition into the card title", () => {
    expect(sagipTitle("dog", "injured")).toBe("Dog · Injured");
    expect(sagipTitle("cat", "pregnant")).toBe("Cat · Pregnant");
  });
});

describe("advanceableStatuses (US-K2 — forward-only, but not one-step-only)", () => {
  it("offers every remaining forward status, not just the next one", () => {
    expect(advanceableStatuses("claimed")).toEqual(["rescued", "safe", "resolved"]);
    expect(advanceableStatuses("rescued")).toEqual(["safe", "resolved"]);
    expect(advanceableStatuses("safe")).toEqual(["resolved"]);
  });

  it("resolved is terminal — nothing left to advance to", () => {
    expect(advanceableStatuses("resolved")).toEqual([]);
  });

  it("a report that was never claimed has no case to advance", () => {
    expect(advanceableStatuses("reported")).toEqual([]);
  });
});

describe("offerStatusChip (decision 14 — no amber; that's the report's job, not an offer's)", () => {
  it("maps each offer status to a labelled, never-amber tone", () => {
    expect(offerStatusChip("open")).toEqual({ label: "Open", tone: "teal" });
    expect(offerStatusChip("matched")).toEqual({ label: "Matched", tone: "green" });
    expect(offerStatusChip("expired")).toEqual({ label: "Expired", tone: "grey" });
  });
});

describe("relTime", () => {
  const now = new Date("2026-08-15T10:00:00Z").getTime();
  it("formats minutes, hours, and just-now", () => {
    expect(relTime("2026-08-15T09:40:00Z", now)).toBe("20 min ago");
    expect(relTime("2026-08-15T07:00:00Z", now)).toBe("3 h ago");
    expect(relTime("2026-08-15T09:59:40Z", now)).toBe("just now");
  });
});

// ── Home's spotlight ────────────────────────────────────────────────────────────────
const T0 = new Date("2026-09-09T12:00:00Z").getTime();
const iso = (hoursAgo: number) => new Date(T0 - hoursAgo * 3600_000).toISOString();

function aCase(over: Partial<RescueCaseSummary> = {}): RescueCaseSummary {
  return {
    case_id: "c1",
    report: { report_id: "r1", species: "dog", condition: "injured", city: "Marikina" },
    status: "claimed", claimed_at: iso(2), expired_at: null, ...over
  };
}
function aReport(over: Partial<MyReport> = {}): MyReport {
  return {
    report_id: "r9", species: "cat", condition: "healthy",
    status: "reported", city: "Marikina", created_at: iso(3), ...over
  };
}

describe("pickSpotlight — the one thing waiting on you", () => {
  it("returns null when there is genuinely nothing open", () => {
    expect(pickSpotlight([], [])).toBeNull();
  });

  it("prefers your own claimed case over your own unclaimed report", () => {
    // The case is work you owe an animal you took custody of; the report is you waiting
    // on someone else. Even when the report is NEWER, the case wins.
    const s = pickSpotlight([aCase({ claimed_at: iso(48) })], [aReport({ created_at: iso(1) })]);
    expect(s?.kind).toBe("case");
    expect(s?.eyebrow).toBe("Your open case");
  });

  it("ignores an expired claim — that animal went back to the pool", () => {
    const s = pickSpotlight([aCase({ expired_at: iso(1) })], [aReport()]);
    expect(s?.kind).toBe("report");
  });

  it("ignores a resolved case", () => {
    expect(pickSpotlight([aCase({ status: "resolved" })], [])).toBeNull();
  });

  it("takes the most recently claimed of several active cases", () => {
    const s = pickSpotlight(
      [aCase({ case_id: "old", claimed_at: iso(50) }), aCase({ case_id: "new", claimed_at: iso(4) })], []);
    expect(s?.caseId).toBe("new");
  });

  it("names the handoff, not the screen, once a case is safe", () => {
    expect(pickSpotlight([aCase({ status: "safe" })], [])?.nextStep).toBe("Find them a home");
    expect(pickSpotlight([aCase({ status: "claimed" })], [])?.nextStep).toBe("Post an update");
  });

  it("sorts an unclaimed report ahead of an older-but-claimed one, whatever the dates", () => {
    const s = pickSpotlight([], [
      aReport({ report_id: "claimed", status: "claimed", created_at: iso(1) }),
      aReport({ report_id: "unclaimed", status: "reported", created_at: iso(30) })
    ]);
    expect(s?.reportId).toBe("unclaimed");
    expect(s?.nextStep).toBe("No one has claimed this yet");
  });

  it("drops resolved reports", () => {
    expect(pickSpotlight([], [aReport({ status: "resolved" })])).toBeNull();
  });

  it("carries a chip and a relative time the card can render as-is", () => {
    const s = pickSpotlight([aCase({ claimed_at: iso(3) })], [], T0);
    expect(s?.chip).toEqual({ label: "Claimed", tone: "teal" });
    expect(s?.since).toBe("claimed 3 h ago");
    expect(s?.title).toBe("Dog · Injured");
  });
});


// ── Sagip loop closure ────────────────────────────────────────────────────────────────
describe("claimDeadline (S9 · the claimer is told when an unposted claim reopens)", () => {
  const now = Date.parse("2026-09-30T10:00:00Z");
  const inMin = (m: number) => new Date(now + m * 60000).toISOString();

  it("says nothing when there is no deadline (rescued, safe, expired)", () => {
    expect(claimDeadline(null, now)).toBeNull();
    expect(claimDeadline(undefined, now)).toBeNull();
  });

  it("names the time left, calmly while there's room", () => {
    expect(claimDeadline(inMin(135), now)).toEqual({
      text: "Post an update within 2 h 15 min or it reopens for another rescuer.",
      short: "Update within 2 h 15 min", urgent: false
    });
  });

  it("turns urgent inside the last 90 minutes", () => {
    expect(claimDeadline(inMin(45), now)).toMatchObject({ short: "Update within 45 min", urgent: true });
    expect(claimDeadline(inMin(120), now)?.short).toBe("Update within 2 h");
  });

  it("says so honestly once the window has passed (the sweep runs hourly)", () => {
    expect(claimDeadline(inMin(-5), now)).toEqual({
      text: "The update window has passed — this may reopen for another rescuer any moment.",
      short: "Update overdue", urgent: true
    });
  });
});

describe("escalationLines (S5 · D2 · only claim who was actually alerted)", () => {
  const counts = (at_report: number | null, level_1 = 0, level_2 = 0) => ({ at_report, level_1, level_2 });

  it("is empty when nothing was sent and nothing has escalated", () => {
    expect(escalationLines(0, counts(null))).toEqual([]);
    expect(escalationLines(undefined, undefined)).toEqual([]);
  });

  it("says how many were alerted the moment it was reported (D2)", () => {
    expect(escalationLines(0, counts(3)))
      .toEqual(["3 verified rescuers and shelters nearby were alerted right away."]);
    expect(escalationLines(0, counts(1)))
      .toEqual(["1 verified rescuer or shelter nearby was alerted right away."]);
  });

  it("says plainly when there was no one to alert — but only when the policy tried", () => {
    expect(escalationLines(0, counts(0)))
      .toEqual(["No verified rescuers or shelters in your city to alert yet."]);
    // null = a healthy stray: the policy sends nothing, so there is nothing to report.
    expect(escalationLines(0, counts(null))).toEqual([]);
  });

  it("counts the people each escalation level reached", () => {
    expect(escalationLines(1, counts(null, 3)))
      .toEqual(["Widened to your city · 3 verified rescuers and shelters alerted."]);
    expect(escalationLines(2, counts(2, 1, 2))).toEqual([
      "2 verified rescuers and shelters nearby were alerted right away.",
      "Widened to your city · 1 more verified rescuer or shelter alerted.",
      "Widened further · 2 partner shelters nearby alerted."
    ]);
  });

  it("doesn't call level 1 empty when everyone there was already alerted", () => {
    expect(escalationLines(1, counts(2, 0))).toEqual([
      "2 verified rescuers and shelters nearby were alerted right away.",
      "Widened to your city · everyone there was already alerted."
    ]);
  });

  it("says plainly when a level reached no one — never 'notified'", () => {
    expect(escalationLines(2, counts(null, 0, 0))).toEqual([
      "Widened to your city · no verified rescuers or shelters there to alert yet.",
      "Widened further · no partner shelter nearby to alert yet."
    ]);
  });

  it("falls back to neutral words when an older server sends no counts", () => {
    const lines = escalationLines(2, undefined);
    expect(lines).toEqual(["Widened to your city.", "Widened further."]);
    expect(lines.join(" ")).not.toMatch(/notified|alerted/);
  });
});

describe("directionsUrl (S8 · Open in Maps)", () => {
  it("opens Apple Maps on iOS and Google Maps elsewhere, with the exact point", () => {
    expect(directionsUrl(14.65, 121.1, "ios")).toBe("http://maps.apple.com/?daddr=14.65,121.1");
    expect(directionsUrl(14.65, 121.1, "android"))
      .toBe("https://www.google.com/maps/dir/?api=1&destination=14.65,121.1");
  });
});

describe("close reasons and history notes (S11)", () => {
  it("offers exactly the four reasons the server accepts", () => {
    expect(CLOSE_REASONS.map((r) => r.key)).toEqual(["gone", "duplicate", "handled_myself", "mistake"]);
  });

  it("renders a reporter's close in words, other notes as written, and blanks as nothing", () => {
    expect(historyNote("closed_by_reporter:handled_myself")).toBe("Closed by you · I took care of it myself");
    expect(historyNote("At the vet")).toBe("At the vet");
    expect(historyNote("")).toBeNull();
    expect(historyNote(undefined)).toBeNull();
  });
});


// ── D1 + D8 · the people on a rescue ──────────────────────────────────────────────────
describe("personSummary (D1 + D8 · who each person is, in the viewer's words)", () => {
  it("names the claimer and the reporter by what they did", () => {
    expect(personSummary({ role: "claimer", display_name: "Rico" }))
      .toEqual({ title: "Rico", detail: "Claimed this rescue", noContact: "Hasn't shared contact details." });
    expect(personSummary({ role: "reporter", display_name: "Ana" }))
      .toMatchObject({ title: "Ana", detail: "Reported this" });
  });

  it("says what a helper offered, with their note", () => {
    expect(personSummary({ role: "helper", display_name: "Ben", offer_type: "transport", note: "I have a car" }))
      .toMatchObject({ title: "Ben", detail: "Offered transport · “I have a car”" });
    expect(personSummary({ role: "helper", display_name: "Cora", offer_type: "vet_costs", note: null }))
      .toMatchObject({ detail: "Offered vet costs" });
  });

  it("keeps an anonymous reporter anonymous and never asks them for contact (D8)", () => {
    expect(personSummary({ role: "reporter", anonymous: true }))
      .toEqual({ title: "The reporter", detail: "Chose to stay anonymous", noContact: null });
  });
});

describe("offersShareContact (a helper with several offers has one switch)", () => {
  it("is on only when every offer shares", () => {
    expect(offersShareContact([{ contact_shared: true }, { contact_shared: true }])).toBe(true);
    expect(offersShareContact([{ contact_shared: true }, { contact_shared: false }])).toBe(false);
    expect(offersShareContact([])).toBe(false);
  });
});
