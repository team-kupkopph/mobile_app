import fs from "fs";

test("RescueUpdateScreen gates its actions on caseScreenState, never on report.status alone", () => {
  const src = fs.readFileSync("src/screens/RescueUpdateScreen.tsx", "utf8");
  expect(src).toContain("caseScreenState(report)");
  expect(src).toContain('testID="card.rescueUpdate.ended"');
  // the handoff buttons and the status options sit behind the state, not a raw status check
  expect(src).not.toMatch(/report\.status === "safe" \? \(\s*<View style=\{styles\.handoffRow\}/);
});

test("PR3-F4 · People shows on every state but ended — a resolved case keeps consented contact (C2)", () => {
  const src = fs.readFileSync("src/screens/RescueUpdateScreen.tsx", "utf8");
  expect(src.match(/<RescuePeople /g)?.length).toBe(1);
  expect(src).toMatch(/\{state !== "ended" && report\.people \? <RescuePeople people=\{report\.people\} \/> : null\}/);
  // outside the claim-holder block: the consent switch, release, options and handoff stay inside it
  const claimBlock = src.indexOf("{holdsClaim ? (");
  expect(claimBlock).toBeGreaterThan(-1);
  expect(src.indexOf("<RescuePeople ")).toBeLessThan(claimBlock);
  expect(src.indexOf("<ContactShareRow")).toBeGreaterThan(claimBlock);
  expect(src.indexOf("canHandOff ? (")).toBeGreaterThan(claimBlock);
});

test("PR3-F6 · the ended card's line comes from endedCaseLine", () => {
  const src = fs.readFileSync("src/screens/RescueUpdateScreen.tsx", "utf8");
  expect(src).toContain("endedCaseLine(report.status)");
  expect(src).not.toContain("Another rescuer has it now.");
});

describe("the handoff card (AD20)", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { handoffCard } = require("../sagip");
  const h = (over: object) => ({ listing_id: "l1", kind: "listing", status: "available", open_inquiries: 0, ...over });
  it("says nothing when nothing is listed or offered, so List / Place stay", () => {
    expect(handoffCard(null)).toBeNull();
    expect(handoffCard(undefined)).toBeNull();
  });
  it("reads a live listing with its inquiry count, and opens it", () => {
    expect(handoffCard(h({ open_inquiries: 3 }))).toEqual({ title: "Listed", line: "Live on the Adopt feed · 3 inquiries", opensListing: true });
    expect(handoffCard(h({}))?.line).toMatch(/no inquiries yet/);
    expect(handoffCard(h({ open_inquiries: 1 }))?.line).toMatch(/1 inquiry$/);
    expect(handoffCard(h({ status: "pending", open_inquiries: 2 }))?.line).toMatch(/Reserved for an applicant/);
    expect(handoffCard(h({ status: "draft" }))?.title).toBe("Draft listing");
  });
  it("names who a placement is waiting on, and does not open a listing", () => {
    const card = handoffCard(h({ kind: "placement", status: "pending", recipient: "Ana Cruz" }));
    expect(card).toEqual({ title: "Placed", line: "Waiting for Ana Cruz to answer.", opensListing: false });
  });
  it("the case screen shows it in place of the List / Place buttons", () => {
    const src = require("fs").readFileSync(require("path").join(__dirname, "..", "screens", "RescueUpdateScreen.tsx"), "utf8");
    expect(src).toContain("card.rescueUpdate.handoff");
    expect(src).toMatch(/\{handoff \? \(/);
  });
});
