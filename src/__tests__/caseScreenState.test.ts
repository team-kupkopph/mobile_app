import fs from "fs";

test("RescueUpdateScreen gates its actions on caseScreenState, never on report.status alone", () => {
  const src = fs.readFileSync("src/screens/RescueUpdateScreen.tsx", "utf8");
  expect(src).toContain("caseScreenState(report)");
  expect(src).toContain('testID="card.rescueUpdate.ended"');
  // the handoff buttons and the status options sit behind the state, not a raw status check
  expect(src).not.toMatch(/report\.status === "safe" \? \(\s*<View style=\{styles\.handoffRow\}/);
});
