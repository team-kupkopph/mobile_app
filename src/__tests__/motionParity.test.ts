/**
 * The motion tokens must be the CANVAS's motion tokens.
 *
 * ⚠️ WHY A PARITY GUARD AND NOT JUST A UNIT TEST. `motion.ts` could assert 340 against itself
 * forever and prove nothing. The only claim worth making is that the number matches
 * design/mobile-v3/Components.dc.html — the approved canvas — so this reads that file and
 * compares. It is the same shape as the other cross-repo parity guards here: if the sibling
 * design repo is not checked out, it SKIPS WITH A WARNING rather than failing, because a
 * missing sibling is an environment fact and not a defect in this repo.
 *
 * ⚠️ THE APP HAD NO MOTION AT ALL until this landed — no duration, no easing, no `Animated`
 * anywhere in src/, every touchable using `activeOpacity` (a fade, not the transform the
 * canvas specifies). The design audit against the canvas is what surfaced it; nothing in this
 * repo could have, because there was nothing to compare against.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

import { motion } from "../theme/motion";

/** Walk up until design/mobile-v3 turns up — the worktree depth is not fixed. */
function findCanvas(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, "design", "mobile-v3", "Components.dc.html");
    if (existsSync(candidate)) return candidate;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

const canvasPath = findCanvas();
const canvas = canvasPath ? readFileSync(canvasPath, "utf8") : "";
const describeParity = canvasPath ? describe : describe.skip;

if (!canvasPath) {
  // eslint-disable-next-line no-console
  console.warn("[motion] design/mobile-v3 not found — parity assertions skipped, not failed.");
}

describe("motion tokens", () => {
  it("uses the canvas's two durations", () => {
    expect(motion.duration).toBe(340);
    expect(motion.durationSlow).toBe(420);
  });

  it("scales by the canvas's three amounts", () => {
    expect(motion.pressScale).toBe(0.978);
    expect(motion.ctaScale).toBe(0.99);
    expect(motion.chipScale).toBe(0.94);
  });
});

describeParity("parity with the approved canvas", () => {
  it("found the canvas to compare against", () => {
    expect(canvas.length).toBeGreaterThan(1000);
  });

  it.each([
    ["--dur", ".34s", 340],
    ["--dur-slow", ".42s", 420]
  ])("the canvas's %s is %s", (_name, literal, ms) => {
    expect(canvas).toContain(literal);
    expect([motion.duration, motion.durationSlow]).toContain(ms);
  });

  it("uses the canvas's one easing curve", () => {
    // `--ease: cubic-bezier(.2,.8,.2,1)` — "easing, everywhere" in the Motion panel.
    expect(canvas).toContain("cubic-bezier(.2,.8,.2,1)");
  });

  it.each([
    ["press", "scale(.978)"],
    ["cta", "scale(.99)"],
    ["chip", "scale(.94)"]
  ])("the canvas presses %s by %s", (_n, spec) => {
    expect(canvas.replace(/\s+/g, "")).toContain(spec.replace(/\s+/g, ""));
  });
});

describe("reduced motion is honoured", () => {
  const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

  // The canvas ends its Motion panel with a prefers-reduced-motion block that kills every
  // transition. iOS exposes the same preference; every animating component must read it.
  //
  // ⚠️ THE CALL, NOT THE IMPORT — and the first version of this assertion got that wrong. It
  // asked `toContain("useReducedMotion")`, which the IMPORT LINE satisfies: replacing the call
  // with `const reduced = false` left the suite green. That is the exact hole this repo had
  // just found in loadStateScreens.test.ts, reintroduced three files later. Strip the imports,
  // then require the invocation.
  it.each([
    ["components/ui/PressScale.tsx"],
    ["components/ui/TabBar.tsx"]
  ])("%s actually CALLS useReducedMotion", (file) => {
    const body = read(file).replace(/^import[\s\S]*?;$/gm, "");
    expect(body).toMatch(/useReducedMotion\(\)/);
  });

  it("the canvas really does have the reduced-motion block", () => {
    if (!canvasPath) return;
    expect(canvas).toContain("prefers-reduced-motion");
  });
});
