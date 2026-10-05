/**
 * R4-F1 · AX-3 — The Rescue card ("Saw a stray?") truncates its title at Dynamic Type
 * accessibility-extra-extra-extra-large (AX5), observed on 2026-10-05 Run 4. Root cause:
 * `styles.reportCard` sets `height: 140` as a fixed cap. At AX5 the title "Saw a stray?"
 * scales past the single line that fits, and the card's `overflow: "hidden"` clips the
 * glyph instead of letting the text wrap or the card grow.
 *
 * This test pins the invariant staticly, so a future fix (switch to `minHeight: 140`, or
 * drop the height entirely and let the gradient size itself) can be confirmed without a
 * device walk.
 */
import { readFileSync } from "fs";
import { join } from "path";

const SRC = join(__dirname, "..", "components", "home", "HomeSections.tsx");

/** Return the body of the `reportCard: { ... }` style block, or null. */
function reportCardBody(src: string): string | null {
  const m = /\breportCard\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/s.exec(src);
  return m ? m[1] : null;
}

test("ReportStrayCard uses minHeight, not height — so the title can wrap at AX5", () => {
  const body = reportCardBody(readFileSync(SRC, "utf-8"));
  expect(body).not.toBeNull();
  // A fixed numeric height (`height: 140`) caps the card and clips the title at AX5.
  // The invariant: declare `minHeight` and let the content grow instead.
  expect(body).not.toMatch(/\bheight\s*:\s*\d+(?:[.,]\d+)?\b/);
  expect(body).toMatch(/\bminHeight\s*:\s*\d+/);
});
