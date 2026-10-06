import { STAGE_ORDER, STAGE_STEP, adopterBadgeNote, inquireBlockedCopy, inquirySentCopy, ladderHeader, inquiryProgressLabel, inquiryStatusLabel, inquireRefusalMessage, inquiryClosedNote, inquiryIsClosed, ladderStageTone, ladderStep, stageMeta, stageStateChip } from "../adoption";

describe("stageStateChip", () => {
  it("maps each stage state to a labelled tone; skipped is not a failure", () => {
    expect(stageStateChip("not_started")).toEqual({ label: "Not started", tone: "muted" });
    expect(stageStateChip("in_progress")).toEqual({ label: "In progress", tone: "active" });
    expect(stageStateChip("done")).toEqual({ label: "Done", tone: "done" });
    expect(stageStateChip("skipped")).toEqual({ label: "Skipped", tone: "skipped" });
  });
});

describe("inquiryProgressLabel", () => {
  const allNotStarted = [
    "inquiry", "application", "home_check", "interview", "vet_clearance", "finalization"
  ].map((k) => ({ stage_key: k, state: "not_started" }));

  it("reads 'Just inquired' when only the inquiry stage is done", () => {
    const stages = allNotStarted.map((s) =>
      s.stage_key === "inquiry" ? { ...s, state: "done" } : s);
    expect(inquiryProgressLabel(stages)).toBe("Just inquired");
  });

  it("reports the furthest stage that has moved", () => {
    const stages = allNotStarted.map((s) => {
      if (s.stage_key === "inquiry") return { ...s, state: "done" };
      if (s.stage_key === "application") return { ...s, state: "done" };
      if (s.stage_key === "home_check") return { ...s, state: "in_progress" };
      return s;
    });
    expect(inquiryProgressLabel(stages)).toBe("Home check in progress");
  });

  it("prefers a later in_progress over an earlier done", () => {
    const stages = allNotStarted.map((s) => {
      if (s.stage_key === "inquiry") return { ...s, state: "done" };
      if (s.stage_key === "interview") return { ...s, state: "in_progress" };
      return s;
    });
    expect(inquiryProgressLabel(stages)).toBe("Interview in progress");
  });
});

describe("ladderStep", () => {
  const s = (states: string[]) => STAGE_ORDER.map((stage_key, i) => ({ stage_key, state: states[i] ?? "not_started" }));

  it("is the artboard's example: done, done, skipped, in progress -> step 4 of 6", () => {
    expect(ladderStep(s(["done", "done", "skipped", "in_progress"]))).toEqual({ step: 4, of: 6 });
  });

  it("is step 2 right after the inquiry lands", () => {
    // The view marks the inquiry stage done at creation; everything else is untouched.
    expect(ladderStep(s(["done"]))).toEqual({ step: 2, of: 6 });
  });

  it("is step 6 of 6 when every stage is settled", () => {
    expect(ladderStep(s(["done", "done", "done", "done", "done", "done"]))).toEqual({ step: 6, of: 6 });
    // A placement bypass skips everything — also complete, not "step 1".
    expect(ladderStep(s(Array(6).fill("skipped")))).toEqual({ step: 6, of: 6 });
  });

  it("does not skip ahead over a stage that is merely in progress", () => {
    expect(ladderStep(s(["done", "in_progress", "done"]))).toEqual({ step: 2, of: 6 });
  });

  it("tolerates a missing stage row, as the summary does", () => {
    expect(ladderStep([{ stage_key: "inquiry", state: "done" }])).toEqual({ step: 2, of: 6 });
    expect(ladderStep([])).toEqual({ step: 1, of: 6 });
  });
});

describe("STAGE_STEP", () => {
  it("names every stage in the DDL's order, and no others", () => {
    expect(Object.keys(STAGE_STEP)).toEqual([...STAGE_ORDER]);
  });

  it("writes the pet and the shelter into the note, never a placeholder", () => {
    const ctx = { pet: "Milo", shelter: "PAWS Manila" };
    for (const key of STAGE_ORDER) {
      const note = STAGE_STEP[key].note(ctx);
      expect(note).not.toMatch(/\{|\}|undefined/);
      expect(note.length).toBeGreaterThan(20);
    }
    expect(STAGE_STEP.home_check.skippedNote!(ctx)).toBe("PAWS Manila waived the home visit for this listing.");
    expect(STAGE_STEP.interview.note(ctx)).toContain("Milo's");
  });
});

describe("stageMeta", () => {
  const now = new Date("2026-09-12T10:00:00Z");

  it("shows the date a done stage moved, the way the artboard draws it", () => {
    expect(stageMeta("done", "2026-07-12T03:21:00Z", now)).toMatch(/Jul 12/);
  });

  it("adds the year only when it differs", () => {
    expect(stageMeta("done", "2025-07-12T03:21:00Z", now)).toMatch(/2025/);
    expect(stageMeta("done", "2026-07-12T03:21:00Z", now)).not.toMatch(/2026/);
  });

  it("says Done, not an invented date, when the server sent none", () => {
    expect(stageMeta("done", null, now)).toBe("Done");
    expect(stageMeta("done", undefined, now)).toBe("Done");
    expect(stageMeta("done", "not a date", now)).toBe("Done");
  });

  it("names the other states and says nothing for a step still to come", () => {
    expect(stageMeta("in_progress", "2026-07-12T03:21:00Z", now)).toBe("In progress");
    expect(stageMeta("skipped", null, now)).toBe("Skipped");
    expect(stageMeta("not_started", null, now)).toBe("");
  });
});

describe("inquiryStatusLabel (D15)", () => {
  it("a withdrawn inquiry is 'No longer available', never 'You withdrew'", () => {
    expect(inquiryStatusLabel("withdrawn")).toBe("No longer available");
    expect(inquiryStatusLabel("active")).toBe("Active");
    expect(inquiryStatusLabel("adopted")).toBe("Adopted");
    expect(inquiryStatusLabel("declined")).toBe("Declined");
    expect(inquiryStatusLabel("withdrawn")).not.toMatch(/withdrew/i);
  });
  it("an unknown status falls back to Active", () => {
    expect(inquiryStatusLabel("something_new")).toBe("Active");
    expect(inquiryStatusLabel("")).toBe("Active");
  });
});

describe("inquireRefusalMessage (D15)", () => {
  it("shows the listing_unavailable message and leaves other codes to the screen", () => {
    expect(inquireRefusalMessage("listing_unavailable")).toBe("This animal is no longer available for adoption.");
    expect(inquireRefusalMessage("already_inquired")).toBeNull();
    expect(inquireRefusalMessage(undefined)).toBeNull();
  });
});

describe("inquiryClosedNote / inquiryIsClosed (D15)", () => {
  it("withdrawn and declined inquiries are closed, with a one-line note", () => {
    expect(inquiryClosedNote("withdrawn")).toBe("This animal is no longer available, so this inquiry is closed.");
    expect(inquiryClosedNote("declined")).toBe("This inquiry was declined.");
    expect(inquiryIsClosed("withdrawn")).toBe(true);
    expect(inquiryIsClosed("declined")).toBe(true);
  });
  it("active and adopted inquiries are not closed", () => {
    expect(inquiryClosedNote("active")).toBeNull();
    expect(inquiryClosedNote("adopted")).toBeNull();
    expect(inquiryClosedNote("something_new")).toBeNull();
    expect(inquiryIsClosed("active")).toBe(false);
    expect(inquiryIsClosed("adopted")).toBe(false);
  });
  it("the note never says 'You withdrew'", () => {
    expect(inquiryClosedNote("withdrawn")).not.toMatch(/you withdrew/i);
  });
});

describe("ladderStageTone (D15 · a closed inquiry shows no progress)", () => {
  it("is unchanged while the inquiry is open", () => {
    expect(ladderStageTone("in_progress", false)).toBe("active");
    expect(ladderStageTone("done", false)).toBe("done");
    expect(ladderStageTone("skipped", false)).toBe("skipped");
    expect(ladderStageTone("not_started", false)).toBe("muted");
  });
  it("mutes an in_progress stage once the inquiry is closed, leaving the rest as they were", () => {
    expect(ladderStageTone("in_progress", true)).toBe("muted");
    expect(ladderStageTone("done", true)).toBe("done");
    expect(ladderStageTone("skipped", true)).toBe("skipped");
    expect(ladderStageTone("not_started", true)).toBe("muted");
  });
});

describe("inquireBlockedCopy (AQ2 / AD13)", () => {
  it("explains the two new refusals and nothing else", () => {
    expect(inquireBlockedCopy("shelter_cannot_adopt")).toEqual({
      title: "Shelters can't adopt",
      body: "Adopting is for pet owners. You can still list animals from your Animals tab."
    });
    expect(inquireBlockedCopy("own_listing")).toEqual({
      title: "This is your listing", body: "You can't inquire on your own listing."
    });
    expect(inquireBlockedCopy("listing_unavailable")).toBeNull();   // D15 keeps its own path
    expect(inquireBlockedCopy(undefined)).toBeNull();
  });
});

describe("inquirySentCopy (AQ1 / AQ2)", () => {
  it("says what happens next, and tells a non-member about the badge up front", () => {
    expect(inquirySentCopy("Paws Marikina", true)).toEqual({
      title: "Inquiry sent",
      body: "Paws Marikina will review it. If they accept you for screening, you'll both see each other's phone numbers."
    });
    expect(inquirySentCopy("Paws Marikina", false).body).toBe(
      "Paws Marikina will review it. If they accept you for screening, you'll both see each other's phone numbers. "
      + "You'll also need a Verified Member badge before they can reserve this pet for you.");
    // An older server sends no verified_member: say nothing about the badge rather than guess.
    expect(inquirySentCopy("Paws Marikina", undefined).body).not.toMatch(/badge/);
  });
});

describe("adopterBadgeNote (AQ2)", () => {
  const base = { inquiry_id: "i1", listing: { listing_id: "l1", name: "Milo", species: "dog" },
                 status: "active", stages: [], kind: "inquiry" as const };
  it("shows only on an open public inquiry from a non-member", () => {
    expect(adopterBadgeNote({ ...base, verified_member: false }, "Paws Marikina", "Milo"))
      .toBe("You'll need a Verified Member badge before Paws Marikina can reserve Milo for you.");
    expect(adopterBadgeNote({ ...base, verified_member: true }, "Paws Marikina", "Milo")).toBeNull();
    expect(adopterBadgeNote({ ...base, verified_member: undefined }, "Paws Marikina", "Milo")).toBeNull();
    expect(adopterBadgeNote({ ...base, verified_member: false, status: "declined" }, "P", "M")).toBeNull();
    expect(adopterBadgeNote({ ...base, verified_member: false, kind: "placement" }, "P", "M")).toBeNull();
  });
});

describe("ladderHeader (a public adoption completed by the poster)", () => {
  const stage = (stage_key: string, state: string) => ({ stage_key, state });
  const mostlyNotStarted = STAGE_ORDER.map((k) => stage(k, k === "inquiry" ? "done" : k === "finalization" ? "done" : "not_started"));
  const mk = (status: string, stages = mostlyNotStarted) =>
    ({ inquiry_id: "i1", listing: { listing_id: "l1", name: "Milo", species: "dog" }, status, stages });

  it("reads Adopted at 100% even when the earlier steps were never worked", () => {
    expect(ladderHeader(mk("adopted"))).toEqual({ label: "Adopted", tone: "success", percent: 100 });
  });
  it("reads the step for an active inquiry", () => {
    const stages = STAGE_ORDER.map((k) => stage(k, k === "inquiry" || k === "application" ? "done" : "not_started"));
    expect(ladderHeader(mk("active", stages))).toEqual({ label: "Step 3 of 6", tone: "info", percent: 50 });
  });
});
