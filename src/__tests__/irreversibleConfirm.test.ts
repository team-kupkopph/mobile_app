// C23 · irreversible steps (Mark resolved, Accept, Decline) ask first.
import fs from "fs";

test("Mark Resolved asks first", () => {
  const src = fs.readFileSync("src/screens/RescueUpdateScreen.tsx", "utf8");
  expect(src).toContain('"Mark this rescue resolved?"');
});

test("Accept and Decline ask first", () => {
  const src = fs.readFileSync("src/screens/PlaceRequestScreen.tsx", "utf8");
  expect(src).toContain('"Take them in?"');
  expect(src).toContain('"Decline this placement?"');
});
