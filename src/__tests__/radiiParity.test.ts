/**
 * `radii.ts` declares exactly the container steps the canvas's Radius panel declares, in the
 * canvas's order — read from the panel's data, not from a comment quoting it.
 *
 * ⚠️ WHY THIS EXISTS NOW AND NOT BEFORE. radiusAdoption.test.ts opened by saying "the canvas
 * declares five container radii and no more" and treated that as settled. It was true of the
 * PANEL and false of the ARTBOARDS, which drew a tinted notice box at 13–14 that the panel did
 * not name — and 24 screens drew the same element with nothing to bind to. Library #11 added
 * the row. A guard that reads the panel would have shown the token and the panel agreeing
 * with each other and both disagreeing with the artboards, which is the finding.
 *
 * Skips with a warning when the design repo is not checked out beside this one, as the other
 * parity guards do.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { radii } from "../theme";

function findCanvas(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const c = join(dir, "design", "mobile-v3", "Components.dc.html");
    if (existsSync(c)) return c;
    dir = join(dir, "..");
  }
  return null;
}

const canvasPath = findCanvas();
const canvas = canvasPath ? readFileSync(canvasPath, "utf8") : "";
const describeParity = canvasPath ? describe : describe.skip;
if (!canvasPath) {
  // eslint-disable-next-line no-console
  console.warn("[radii] design/mobile-v3 not found — parity assertions skipped, not failed.");
}

/** The panel's `radii: [ { px: "12px", use: "chip" }, … ]` literal. */
function panelSteps(src: string): Array<[string, number]> {
  const m = /radii:\s*\[([\s\S]*?)\]/.exec(src);
  if (!m) return [];
  return [...m[1].matchAll(/\{\s*px:\s*"(\d+)px",\s*use:\s*"(\w+)"\s*\}/g)].map((x) => [x[2], Number(x[1])]);
}

describeParity("radii parity with the approved canvas", () => {
  const steps = panelSteps(canvas);

  it("found the panel's list at all", () => {
    expect(steps.length).toBeGreaterThan(4);
  });

  it("declares exactly the panel's steps, in the panel's order", () => {
    expect(Object.entries(radii)).toEqual(steps);
  });

  it("names the notice box the artboards draw", () => {
    expect(steps).toContainEqual(["notice", 14]);
  });
});

describe("the radii parser", () => {
  it("reads the literal shape the panel uses", () => {
    expect(panelSteps('radii: [\n { px: "12px", use: "chip" }, { px: "18px", use: "tile" }\n ],')).toEqual([["chip", 12], ["tile", 18]]);
  });
});
