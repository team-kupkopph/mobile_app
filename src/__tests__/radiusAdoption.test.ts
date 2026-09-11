/**
 * Screens take corner radii from `src/theme/radii.ts` — but only where a radius is a
 * CONTAINER radius, which most of them are not.
 *
 * ⚠️ THE RE-SCAN PLAN GOT THIS TRACK WRONG, AND THE NUMBERS ARE WHY. It reported "62%
 * genuinely off, concentrated in 22(81), 14(46), 16(37)" and framed the work as a decision
 * about whether the five-step scale is missing steps. Measured against what each radius
 * actually IS, of 479 radius-bearing style objects:
 *
 *   208  a pill or a circle — exactly half the element's height or width
 *   139  genuinely off the scale
 *    97  already equal to a step, or already the squircle rule (bound by this change)
 *
 * So 22 is not an off-scale value that wants snapping to `field` (20): most of the 81 sites
 * are `borderRadius: 22` on a 44 pt control, which is a pill, and snapping it would visibly
 * un-round the control. radii.ts warns about exactly this, and the warning was right.
 *
 * The scale question is answered by the canvas, not by a vote: Components.dc.html declares
 * five container radii and no more — `{px:"12px",use:"chip"}, {18,tile}, {20,field},
 * {24,card}, {26,hero}` — which is radii.ts exactly. Nothing to decide; the token is correct.
 *
 * ⚠️ A SQUARE TILE IS NOT A CONTAINER. Six sites looked bindable to `radii.card`/`radii.tile`
 * and were not: their radius equals a container step ONLY BY COINCIDENCE. `heroIcon` is 76×76
 * with radius 24, and round(76 × 0.32) is also 24 — it is following the squircle rule, and
 * writing `radii.card` there would be the same pixel today and the wrong shape the moment the
 * tile is resized. They bind to `squircle(size)` instead. The guard below refuses to let a
 * square tile carry a container step, because a pixel-diff CANNOT catch that regression.
 *
 * A RATCHET, in the shape of themeAdoption.test.ts.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { radii, squircle } from "../theme";

const SRC = join(__dirname, "..");
const SCALE = radii as unknown as Record<string, number>;
const KEYS = ["borderRadius", "height", "minHeight", "width", "minWidth"];

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "__tests__" && entry !== "node_modules") sources(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      if (full !== join(SRC, "theme", "radii.ts")) out.push(full);
    }
  }
  return out;
}

function maskBlock(text: string, lo: number, hi: number): string {
  const out = text.split("");
  const blank = (a: number, b: number) => {
    for (let k = a; k < b; k++) if (out[k] !== "\n") out[k] = " ";
  };
  let i = lo;
  const n = hi + 1;
  while (i < n) {
    const c = text[i];
    const nx = i + 1 < n ? text[i + 1] : "";
    if (c === "/" && nx === "/") {
      let j = text.indexOf("\n", i);
      if (j === -1 || j > n) j = n;
      blank(i, j); i = j;
    } else if (c === "/" && nx === "*") {
      let j = text.indexOf("*/", i + 2);
      j = j === -1 || j + 2 > n ? n : j + 2;
      blank(i, j); i = j;
    } else if (c === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"') { if (text[j] === "\\") j++; j++; }
      blank(i, Math.min(j + 1, n)); i = Math.min(j + 1, n);
    } else i++;
  }
  return out.join("");
}

function enclosingBlock(text: string, idx: number): [number, number] | null {
  let depth = 0;
  let start = -1;
  for (let i = idx; i >= 0; i--) {
    const c = text[i];
    if (c === "}") depth++;
    else if (c === "{") { if (depth === 0) { start = i; break; } depth--; }
  }
  if (start < 0) return null;
  depth = 0;
  for (let j = start; j < text.length; j++) {
    if (text[j] === "{") depth++;
    else if (text[j] === "}") { depth--; if (depth === 0) return [start, j]; }
  }
  return null;
}

function props(text: string, lo: number, hi: number): Record<string, string> {
  const masked = maskBlock(text, lo, hi);
  let depth = 0;
  const cuts: number[] = [];
  for (let i = lo; i <= hi; i++) {
    const c = masked[i];
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") depth--;
    else if (c === "," && depth === 1) cuts.push(i);
  }
  const out: Record<string, string> = {};
  let prev = lo + 1;
  for (const cut of [...cuts, hi]) {
    const segM = masked.slice(prev, cut);
    if (segM.trim()) {
      const mm = new RegExp(`(?:["']?)(${KEYS.join("|")})(?:["']?)\\s*:`).exec(segM);
      if (mm) {
        let v = prev + mm.index + mm[0].length;
        while (v < cut && (text[v] === " " || text[v] === "\t")) v++;
        out[mm[1]] = text.slice(v, cut).replace(/\/\/.*$/gm, "").trim();
      }
    }
    prev = cut + 1;
  }
  return out;
}

const numOf = (v?: string) =>
  v !== undefined && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : null;

type Site = { file: string; raw: string; radius: number | null; side: number | null;
              square: boolean };

const sites: Site[] = [];
for (const file of sources(SRC)) {
  const text = readFileSync(file, "utf8");
  const seen = new Set<number>();
  const re = /\bborderRadius\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const blk = enclosingBlock(text, m.index);
    if (!blk || seen.has(blk[0])) continue;
    seen.add(blk[0]);
    const p = props(text, blk[0], blk[1]);
    const raw = p.borderRadius;
    if (raw === undefined) continue;
    const h = numOf(p.height) ?? numOf(p.minHeight);
    const w = numOf(p.width) ?? numOf(p.minWidth);
    sites.push({
      file, raw, radius: numOf(raw), side: h ?? w,
      square: h !== null && w !== null && h === w && h <= 100
    });
  }
}

const isPill = (s: Site) =>
  s.radius !== null && s.side !== null && Math.abs(s.radius - s.side / 2) < 0.01;
const followsSquircle = (s: Site) =>
  s.radius !== null && s.side !== null && s.square && s.radius === squircle(s.side);
const stepValues = Object.values(SCALE);

const tokenRefs = sites.filter((s) => /^radii\./.test(s.raw));
const squircleRefs = sites.filter((s) => /^squircle\(/.test(s.raw));
/** A literal equal to a step, that is not a pill and not the squircle rule. */
const bindableLiterals = sites.filter(
  (s) => s.radius !== null && stepValues.includes(s.radius) &&
         !isPill(s) && !followsSquircle(s)
);
/** A square tile wearing a container step — same pixel, wrong rule. */
const squareOnContainerStep = tokenRefs.filter((s) => s.square);
const offScale = sites.filter(
  (s) => s.radius !== null && !stepValues.includes(s.radius) &&
         !isPill(s) && !followsSquircle(s)
);

/**
 * ⚠️ THIS LIST HELD FIVE TILES AND NOW HOLDS NONE, WHICH IS THE POINT OF LISTING THEM. Track R
 * found five square tiles at 0.29–0.31 × size instead of the rule's 0.32 — checkTile and
 * logoGradient at 84 (26 and 24, rule 27), two avatars at 44 (12, rule 14), animalPhoto at
 * 52 (12, rule 17) — and held them back, because 2–5 pt on a corner is visible and therefore a
 * decision. Naming them as an assertion rather than a skip meant that decision, once taken,
 * would turn this red on a list that was no longer true. It did. They are on `squircle(size)`.
 */
const TILE_EXEMPTIONS: string[] = [];

/**
 * ⚠️ THE REMAINING WORK, AND IT IS NOT ONE JOB. 139 radii are genuinely off the five-step
 * scale, led by 16 (x36), 14 (x32) and 22 (x29) — each two points from a step. They split
 * into groups that want different answers: containers that should snap; buttons sized by
 * padding rather than height, which are pills by intent but have no height for the pill rule
 * to halve; and tiles that are 0.29–0.31 × size instead of 0.32. Each is a visible move.
 * It may fall. It may not rise.
 */
const OFF_SCALE = 139;

describe("screens take corner radii from the theme", () => {
  it("found radii to classify", () => {
    // Guard the guard: scans here have reported a plausible smaller number more than once.
    expect(sites.length).toBeGreaterThan(400);
    expect(tokenRefs.length + squircleRefs.length).toBeGreaterThan(90);
    expect(sites.filter(isPill).length).toBeGreaterThan(150);
  });

  it("leaves no container literal that already equals a step", () => {
    expect(bindableLiterals.map((s) => s.file.replace(/^.*\/src\//, "src/")).sort())
      .toEqual([...TILE_EXEMPTIONS].sort());
  });

  it("never gives a square tile a container step", () => {
    // ⚠️ A PIXEL DIFF CANNOT CATCH THIS. `heroIcon` at 76×76 renders identically whether it
    // says `radii.card` or `squircle(76)` — both are 24 today. Only the rule differs, and
    // only when the tile is resized. So it is asserted here rather than left to the diff.
    expect(squareOnContainerStep.map((s) => s.file)).toEqual([]);
  });

  it("has not grown a new off-scale radius", () => {
    expect(offScale.length).toBeLessThanOrEqual(OFF_SCALE);
  });

  it("records the remaining off-scale radii rather than absorbing them", () => {
    expect(offScale.length).toBe(OFF_SCALE);
  });

  it("does not mistake a pill for a scale step", () => {
    // Home's report button: height 44, radius 22. Snapping that to `field` (20) would
    // visibly un-round it, which is why radii.ts tells callers to write the literal.
    const src = "{ height: 44, borderRadius: 22, backgroundColor: colors.white }";
    const blk = enclosingBlock(src, src.indexOf("borderRadius"))!;
    const p = props(src, blk[0], blk[1]);
    const s: Site = { file: "x", raw: p.borderRadius, radius: 22, side: 44, square: false };
    expect(isPill(s)).toBe(true);
    expect(stepValues.includes(24)).toBe(true); // 24 IS a step, so the pill check must win
  });

  it("reads the squircle rule as the rule, not as a number", () => {
    const s: Site = { file: "x", raw: "24", radius: 24, side: 76, square: true };
    expect(followsSquircle(s)).toBe(true);
    expect(squircle(76)).toBe(24);
    // ...and 24 is also `card`, which is exactly the coincidence this track had to survive.
    expect(SCALE.card).toBe(24);
  });
});
