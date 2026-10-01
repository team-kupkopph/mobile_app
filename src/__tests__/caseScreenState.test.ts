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
