/**
 * Every screen holds the same gutter, and takes it from `spacing.lg`.
 *
 * ⚠️ THE CANVAS NAMES THIS DRIFT BY NAME. Components.dc.html does not merely declare a
 * spacing scale — it says what is wrong today: "Screen gutter is 20 everywhere. It is 26 on
 * Home, 28 in AuthFormKit and 25 on the auth back button today." spacing.ts recorded the same
 * intent a sprint earlier ("The V3 screen gutter is `lg` (20). Migrating the 26s is Tracks
 * AU/SG/AD, not this story.") and then nobody ran it. This is that migration.
 *
 * ⚠️ NOT EVERY paddingHorizontal: 26 IS A GUTTER, which is why this scans by ROLE and not by
 * value. All 103 of them turned out to be `content` (the scroll container, x60), `header`
 * (x40) or one of three rows verified to sit beside a `content` at the same value in their
 * own file — so they are gutter-aligned siblings and had to move with it or misalign by 6 pt.
 * A sweep of "every 26 in the app" would also have caught button and chip padding, which are
 * not the screen edge and have no business tracking it.
 *
 * The 25 the canvas mentions no longer exists; nothing in src matches it.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { spacing } from "../theme";

const SRC = join(__dirname, "..");

/**
 * Styles that ARE the screen gutter. `content` and `header` are the gutter wherever they
 * appear; the three siblings are NOT, so they are scoped to the file each was verified in.
 *
 * ⚠️ `row` IS WHY THIS IS SCOPED. ShelterProfile's `row` is a gutter-aligned list row at 26,
 * but Settings has a `row` at 18 that sits INSIDE a card — an inner row that has nothing to
 * do with the screen edge. A guard keyed on the name alone counted it as a stray gutter and
 * demanded it move, which would have indented every settings row by 2 pt for no reason.
 */
const GUTTER_KEYS = new Set(["content", "header"]);
const GUTTER_SIBLINGS: Record<string, string> = {
  "src/screens/AdoptScreen.tsx": "filterRow",
  "src/screens/DonatePledgeScreen.tsx": "confirmWrap",
  "src/screens/ShelterProfileScreen.tsx": "row"
};
const isGutter = (file: string, key: string) =>
  GUTTER_KEYS.has(key) || GUTTER_SIBLINGS[file] === key;

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "__tests__" && entry !== "node_modules") sources(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      if (full !== join(SRC, "theme", "spacing.ts")) out.push(full);
    }
  }
  return out;
}

function enclosingKey(text: string, idx: number): string {
  let depth = 0;
  for (let i = idx; i >= 0; i--) {
    const c = text[i];
    if (c === "}") depth++;
    else if (c === "{") {
      if (depth === 0) {
        const m = /(\w+)\s*:\s*$/.exec(text.slice(Math.max(0, i - 60), i).trimEnd());
        return m ? m[1] : "?";
      }
      depth--;
    }
  }
  return "?";
}

const onToken: string[] = [];
const offToken: string[] = [];

for (const file of sources(SRC)) {
  const text = readFileSync(file, "utf8");
  const re = /paddingHorizontal:\s*([A-Za-z0-9_.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const short = file.replace(/^.*\/src\//, "src/");
    if (!isGutter(short, enclosingKey(text, m.index))) continue;
    if (m[1] === "spacing.lg") onToken.push(short);
    else offToken.push(`${short} (${m[1]})`);
  }
}

/**
 * ⚠️ ZERO, AND IT IS NO LONGER A RATCHET. Track S moved the 26s and 28s the canvas named and
 * left five containers it did not: three shelter-volunteer list screens at 22, and two
 * centred confirmation layouts at 24 and 32 whose padding also set their text measure. The
 * canvas's own word is "Screen gutter is 20 everywhere", and a centred layout's horizontal
 * padding is still its gutter — the content is centred within it — so all five moved. The
 * two centred screens' text got 4 pt and 12 pt wider as a result; that is the change, and
 * it is the designed one. This is now a flat rule: a screen container takes the gutter from
 * `spacing.lg`, and this number may not rise.
 */
const OFF_GUTTER = 0;

describe("every screen holds the same gutter", () => {
  it("found gutters to classify", () => {
    // Guard the guard: scans here have reported a plausible smaller number more than once.
    // 129 gutters at Track S; 95 after the header conversion took 44 `header` rows into
    // ScreenHeader, which carries the gutter itself. A floor, recalibrated to what exists.
    expect(onToken.length).toBeGreaterThan(80);
    expect(new Set(onToken).size).toBeGreaterThan(70);
  });

  it("has no screen gutter left at 26 or 28", () => {
    expect(offToken.filter((s) => /\((26|28)\)$/.test(s))).toEqual([]);
  });

  it("records the containers still off the gutter rather than absorbing them", () => {
    expect(offToken.length).toBe(OFF_GUTTER);
  });

  it("has not grown a new off-gutter screen", () => {
    expect(offToken.length).toBeLessThanOrEqual(OFF_GUTTER);
  });

  it("takes the gutter from the token, not from the number 20", () => {
    // ⚠️ Asserted as the CALL. A screen that writes `paddingHorizontal: 20` renders
    // identically today and drifts the moment the token moves, so it does not count.
    expect(spacing.lg).toBe(20);
    const literal = "const s = { content: { paddingHorizontal: 20 } };";
    const key = enclosingKey(literal, literal.indexOf("paddingHorizontal"));
    expect(isGutter("src/screens/Any.tsx", key)).toBe(true);
    expect(/paddingHorizontal:\s*spacing\.lg/.test(literal)).toBe(false);
  });

  it("reads the role, not the number", () => {
    // A chip's own padding may legitimately be 26; it is not the screen edge.
    const src = 'const s = { chipText: { paddingHorizontal: 26 } };';
    expect(isGutter("src/screens/Any.tsx", enclosingKey(src, src.indexOf("paddingHorizontal"))))
      .toBe(false);
    // ...and the same key name is a gutter in one file and not in another.
    expect(isGutter("src/screens/ShelterProfileScreen.tsx", "row")).toBe(true);
    expect(isGutter("src/screens/SettingsScreen.tsx", "row")).toBe(false);
  });
});
