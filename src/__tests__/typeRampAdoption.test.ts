/**
 * Screens take their text sizes from the ramp, not from raw numbers.
 *
 * ⚠️ WHAT THIS GUARD MEASURES, AND WHY IT IS NOT A `fontSize` COUNT. A ramp step is four
 * properties — `{fontSize, fontWeight, letterSpacing, lineHeight}` — so a style is only on the
 * ramp when all four RENDER the same. React Native's defaults matter here and are easy to get
 * wrong by reading source: an absent `fontWeight` IS "400", an absent `letterSpacing` IS 0, and
 * "bold" IS "700". Comparing style objects as text rather than as rendered values is how an
 * earlier pass of this migration reported "0 of 839 already conform" when the real figure was
 * 41 — and how the plan projected 317 bindable sites by counting `fontSize` alone.
 *
 * So this resolves each style object the way RN would, then asks whether the result equals a
 * step. `typography` is IMPORTED rather than copied, so correcting the ramp moves the guard
 * with it instead of leaving a stale duplicate to disagree with the token.
 *
 * ⚠️ TWO STEPS SUPPLY SIZE ONLY. The canvas declares `17 / 700-800` and `13 / 400-800` — a
 * range — so `subtitle` and `meta` name no weight and the caller brings one:
 *     { ...typography.meta, fontWeight: "800" }
 * A binding that drops that trailing weight silently de-bolds the text, which is the exact
 * regression this whole track was paused to avoid. Openness is read off the token (a step with
 * no `fontWeight` is open), never hardcoded here.
 *
 * This is a RATCHET in the shape of themeAdoption.test.ts: exact conformance is a flat rule at
 * zero, and the remaining off-ramp sizes may fall but never rise.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { typography } from "../theme";

const SRC = join(__dirname, "..");
const RAMP = typography as Record<string, Record<string, string | number>>;
/** A step that names no weight declares a RANGE; the caller supplies the weight. */
const isOpen = (step: string) => !("fontWeight" in RAMP[step]);

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "__tests__" && entry !== "node_modules") sources(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      // The ramp defines the steps; it does not bind to them.
      if (full !== join(SRC, "theme", "typography.ts")) out.push(full);
    }
  }
  return out;
}

/**
 * ⚠️ COMMENTS AND STRINGS ARE BLANKED BEFORE ANY STRUCTURAL SCAN, and this is load-bearing.
 * A style object in SigninScreen carries the comment "⚠️ ON A SURFACE, not on the raw
 * backdrop." — whose comma reads as a property separator to a scanner that cannot see
 * comments. Masking runs comments FIRST so a comment's own apostrophe can never open a string.
 * It is scoped to the object, never the file: at file scope an apostrophe in JSX prose
 * ("Help's a tap away") would swallow everything to the next one.
 */
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
      blank(i, j);
      i = j;
    } else if (c === "/" && nx === "*") {
      let j = text.indexOf("*/", i + 2);
      j = j === -1 || j + 2 > n ? n : j + 2;
      blank(i, j);
      i = j;
    } else if (c === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"') {
        if (text[j] === "\\") j++;
        j++;
      }
      blank(i, Math.min(j + 1, n));
      i = Math.min(j + 1, n);
    } else {
      i++;
    }
  }
  return out.join("");
}

function enclosingBlock(text: string, idx: number): [number, number] | null {
  let depth = 0;
  let start = -1;
  for (let i = idx; i >= 0; i--) {
    const c = text[i];
    if (c === "}") depth++;
    else if (c === "{") {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start < 0) return null;
  depth = 0;
  for (let j = start; j < text.length; j++) {
    const c = text[j];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return [start, j];
    }
  }
  return null;
}

const KEYS = ["fontSize", "fontWeight", "letterSpacing", "lineHeight"];
const NUM = /^-?\d+(\.\d+)?$/;

type Style = { props: Record<string, string>; spread: string | null };

/** Apply depth-1 properties and `...typography.x` spreads left to right, as JS would. */
function readObject(text: string, lo: number, hi: number): Style {
  const masked = maskBlock(text, lo, hi);
  let depth = 0;
  const cuts: number[] = [];
  for (let i = lo; i <= hi; i++) {
    const c = masked[i];
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") depth--;
    else if (c === "," && depth === 1) cuts.push(i);
  }
  const props: Record<string, string> = {};
  let spread: string | null = null;
  let prev = lo + 1;
  for (const cut of [...cuts, hi]) {
    const segM = masked.slice(prev, cut);
    if (segM.trim()) {
      const sp = /\.\.\.\s*typography\s*\.\s*(\w+)/.exec(segM);
      if (sp && RAMP[sp[1]]) {
        spread = sp[1];
        for (const [k, v] of Object.entries(RAMP[sp[1]])) props[k] = String(v);
      } else {
        // ⚠️ The key pattern must NOT end in \s* — masking blanks a quoted value to spaces,
        // and a greedy \s* eats it, leaving every `fontWeight: "800"` looking empty.
        const mm = new RegExp(`(?:["']?)(${KEYS.join("|")})(?:["']?)\\s*:`).exec(segM);
        if (mm) {
          let v = prev + mm.index + mm[0].length;
          while (v < cut && (text[v] === " " || text[v] === "\t")) v++;
          const val = text
            .slice(v, cut)
            .replace(/\/\/.*$/gm, "")
            .replace(/\s+as\s+const$/, "")
            .trim();
          props[mm[1]] = val;
        }
      }
    }
    prev = cut + 1;
  }
  return { props, spread };
}

type Resolved = { size: number; weight: string; tracking: number; leading: number | null };

/** RN render semantics. `null` when a value is an expression rather than a literal. */
function render(props: Record<string, string>): Resolved | null {
  const size = props.fontSize;
  if (size === undefined || !NUM.test(size)) return null;
  let weight = props.fontWeight;
  if (weight === undefined) weight = "400";
  else {
    weight = weight.replace(/^["']|["']$/g, "").trim();
    if (weight === "normal") weight = "400";
    else if (weight === "bold") weight = "700";
    if (!/^[1-9]00$/.test(weight)) return null;
  }
  const ls = props.letterSpacing;
  if (ls !== undefined && !NUM.test(ls)) return null;
  const lh = props.lineHeight;
  if (lh !== undefined && !NUM.test(lh)) return null;
  return {
    size: Number(size),
    weight,
    tracking: ls === undefined ? 0 : Number(ls),
    leading: lh === undefined ? null : Number(lh)
  };
}

/** The step this style could bind to with no pixel change, if any. */
function stepFor(r: Resolved): string | null {
  for (const [name, tok] of Object.entries(RAMP)) {
    if (Number(tok.fontSize) !== r.size) continue;
    if (isOpen(name)) {
      // The token supplies size only; the caller's weight survives untouched.
      return r.tracking === 0 && r.leading === null ? name : null;
    }
    if (String(tok.fontWeight ?? "400") !== r.weight) return null;
    if (Number(tok.letterSpacing ?? 0) !== r.tracking) return null;
    const tl = tok.lineHeight === undefined ? null : Number(tok.lineHeight);
    if (tl !== r.leading) return null;
    return name;
  }
  return null;
}

/**
 * The migration table declared in the header of `src/theme/typography.ts`, which says which
 * step each stray size belongs to. T2 snapped the subset where the size is the ONLY thing
 * that moves; a size whose step would also change weight, tracking or leading is a restyle,
 * not a snap, and is left for a decision rather than swept in here.
 */
const MIGRATION: Record<number, string> = {};
for (const [sizes, step] of [
  [[30, 28, 27], "display"], [[26, 25, 24], "hero"], [[23, 22, 21], "title"],
  [[20, 19, 18], "section"], [[17, 16.5, 16], "subtitle"], [[15.5, 15, 14.5], "body"],
  [[14, 13.5, 13, 12.5, 12], "meta"], [[11, 10, 9], "label"]
] as [number[], string][]) {
  for (const s of sizes) MIGRATION[s] = step;
}

/** What a bind would change besides the size. Empty means it is a pure snap. */
function sideEffects(r: Resolved, step: string): string[] {
  const tok = RAMP[step];
  const out: string[] = [];
  if (isOpen(step)) {
    if (r.tracking !== 0) out.push("tracking");
    if (r.leading !== null) out.push("leading");
    return out;
  }
  if (String(tok.fontWeight ?? "400") !== r.weight) out.push("weight");
  if (Number(tok.letterSpacing ?? 0) !== r.tracking) out.push("tracking");
  const tl = tok.lineHeight === undefined ? null : Number(tok.lineHeight);
  if (tl !== r.leading) out.push("leading");
  return out;
}

const bound: string[] = [];
const rawSites: { file: string; resolved: Resolved }[] = [];
const bindableButRaw: string[] = [];
const snappableButRaw: string[] = [];

for (const file of sources(SRC)) {
  const text = readFileSync(file, "utf8");
  const seen = new Set<number>();
  const re = /\bfontSize\s*:|\.\.\.\s*typography\s*\./g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const blk = enclosingBlock(text, m.index);
    if (!blk || seen.has(blk[0])) continue;
    seen.add(blk[0]);
    const { props, spread } = readObject(text, blk[0], blk[1]);
    if (props.fontSize === undefined) continue;
    if (spread) {
      bound.push(`${file}:${spread}`);
      continue;
    }
    const r = render(props);
    if (!r) continue;
    rawSites.push({ file, resolved: r });
    const step = stepFor(r);
    if (step) {
      bindableButRaw.push(`${file} -> ${step} ${JSON.stringify(r)}`);
      continue;
    }
    const target = MIGRATION[r.size];
    if (target) {
      const delta = Number(RAMP[target].fontSize) - r.size;
      if (Math.abs(delta) > 0 && Math.abs(delta) <= 1 && sideEffects(r, target).length === 0) {
        snappableButRaw.push(`${file} -> ${target} (${delta > 0 ? "+" : ""}${delta}pt) ${JSON.stringify(r)}`);
      }
    }
  }
}

/**
 * ⚠️ THIS NUMBER IS THE REMAINING WORK, NOT A BUDGET. 876 style objects held a literal
 * fontSize before T1. T1 bound the 164 that already rendered exactly as a step, leaving 710
 * (712 less Avatar's two `fontSize: Math.round(size * 0.33)`, a size computed from a prop,
 * which no fixed ramp can hold). T2 then snapped the 221 where the SIZE IS THE ONLY THING
 * THAT MOVES — 16→17 x83, 14→13 x77, 12→13 x49, and four half-point strays. (49, not 50:
 * the tab label is held back deliberately — see the exemption below.)
 *
 * What is left is not more of the same, and should not be described as "the rest of the 1pt
 * band". It is three groups, each carrying a decision rather than a delta:
 *
 *   · 259 sit within 1pt of a step but would ALSO gain the step's tracking, lose an explicit
 *     line height, or change weight. The largest are 22→title x46 and 20/18→section x43,
 *     which snap 1pt AND adopt tracking the screens never had.
 *   · 167 are ALREADY the right size and differ only in the other three properties. 88 of
 *     these are 15pt at weight 600/700/800 — and `body`, the only 15pt step, is closed at
 *     400. THE RAMP HAS NO BOLD FIFTEEN. Binding them would de-bold 88 sites, which is the
 *     regression the ramp was un-pinned to prevent.
 *   · 60 are further than 1pt away — 58 of them 30pt, the app's most common heading size,
 *     for which the canvas declares no step at all. That is T3.
 *
 * It may fall. It may not rise: a new screen typing `fontSize: 14` is the drift the ramp
 * exists to end.
 */
const OFF_RAMP = 490;

describe("screens take their text sizes from the ramp", () => {
  it("found style objects to classify", () => {
    // Guard the guard: scans in this repo have reported a plausible smaller number more
    // than once, and a guard that silently matches nothing passes forever.
    expect(rawSites.length + bound.length).toBeGreaterThan(800);
    expect(bound.length).toBeGreaterThan(150);
  });

  it("leaves no style that could bind to a step with no pixel change", () => {
    expect(bindableButRaw).toEqual([]);
  });

  it("leaves no size that could snap to a step with only the size moving", () => {
    // T2's rule. A size within 1pt of a step whose bind changes nothing else is a snap and
    // belongs on the ramp; one that would also restyle the text is deliberately still here.
    //
    // ⚠️ ONE DELIBERATE EXEMPTION, AND IT IS ASSERTED RATHER THAN ALLOWED. TabBar's label is
    // 12pt, which the size table maps to `meta` (13) — but the canvas draws that exact
    // element at 11px, so snapping up would move it AWAY from the design. It fits no step:
    // the 11pt one is uppercase/800/+0.8, this is sentence case at +0.1 with a weight that
    // changes on selection. Listing it here (rather than skipping it in the scan) means a
    // stale exemption fails too: snap it, and this expectation goes red.
    expect(snappableButRaw.map((s) => s.split(" -> ")[0].replace(/^.*\/src\//, "src/"))).toEqual([
      "src/components/ui/TabBar.tsx"
    ]);
  });

  it("has not grown a new off-ramp text size", () => {
    expect(rawSites.length).toBeLessThanOrEqual(OFF_RAMP);
  });

  it("records the remaining off-ramp sizes rather than absorbing them", () => {
    expect(rawSites.length).toBe(OFF_RAMP);
  });

  it("counts the call, not the import", () => {
    // ⚠️ Two guards this sprint passed on an unused import. A file may name `typography`
    // in an import and still bind nothing; only a spread inside a style object counts.
    const importOnly = 'import { typography } from "../theme";\nconst s = { fontSize: 13 };';
    const blk = enclosingBlock(importOnly, importOnly.indexOf("fontSize"))!;
    expect(readObject(importOnly, blk[0], blk[1]).spread).toBeNull();
  });

  it("reads RN's defaults, not the source text", () => {
    // An absent weight IS 400 and an absent tracking IS 0 — the mistake that made an
    // earlier pass report 0 conforming sites out of 839.
    expect(render({ fontSize: "15", lineHeight: "21" })).toEqual({
      size: 15,
      weight: "400",
      tracking: 0,
      leading: 21
    });
    expect(render({ fontSize: "13", fontWeight: '"bold"' })!.weight).toBe("700");
    expect(stepFor(render({ fontSize: "15", lineHeight: "21" })!)).toBe("body");
  });

  it("keeps the caller's weight on the two steps that declare a range", () => {
    expect(isOpen("meta")).toBe(true);
    expect(isOpen("subtitle")).toBe(true);
    expect(isOpen("body")).toBe(false);
    // 13pt at 800 is still `meta` — the step names no weight, so binding preserves the bold.
    expect(stepFor(render({ fontSize: "13", fontWeight: '"800"' })!)).toBe("meta");
    expect(stepFor(render({ fontSize: "13", fontWeight: '"400"' })!)).toBe("meta");
  });

  it("sees past a comma inside a comment", () => {
    // The SigninScreen shape that broke the first codemod.
    const src = '{\n  marginTop: 12,\n  // ⚠️ ON A SURFACE, not the backdrop.\n  fontSize: 13,\n  fontWeight: "700"\n}';
    const blk = enclosingBlock(src, src.indexOf("fontSize"))!;
    const r = render(readObject(src, blk[0], blk[1]).props)!;
    expect(r).toEqual({ size: 13, weight: "700", tracking: 0, leading: null });
  });
});
