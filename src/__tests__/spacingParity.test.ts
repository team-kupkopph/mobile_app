/**
 * `spacing.ts` declares exactly the steps the canvas's "Radius & spacing" panel declares — read
 * from the panel's `spaces: [...]` literal, as radiiParity does for radii.
 *
 * The token carried 24, 32 and 40 for two sprints; the panel never declared them, and the app
 * used one of them once. It lacked the panel's 28. Neither side had noticed, because nothing
 * compared them — which is what this file is for. Skips with a warning when the design repo is
 * not checked out beside this one.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { spacing } from "../theme";

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
  console.warn("[spacing] design/mobile-v3 not found — parity assertions skipped, not failed.");
}

/** The panel's `spaces: [ { px: "4px", n: "4" }, … ]` literal. */
function panelSteps(src: string): number[] {
  const m = /spaces:\s*\[([\s\S]*?)\]/.exec(src);
  if (!m) return [];
  return [...m[1].matchAll(/\{\s*px:\s*"(\d+)px"/g)].map((x) => Number(x[1]));
}

describeParity("spacing parity with the approved canvas", () => {
  const steps = panelSteps(canvas);

  it("found the panel's list at all", () => {
    expect(steps.length).toBeGreaterThan(4);
  });

  it("declares exactly the panel's steps, in the panel's order", () => {
    expect(Object.values(spacing)).toEqual(steps);
  });
});

describe("the spacing parser", () => {
  it("reads the literal shape the panel uses", () => {
    expect(panelSteps('spaces: [\n { px: "4px", n: "4" }, { px: "8px", n: "8" }\n ],')).toEqual([4, 8]);
  });
});
