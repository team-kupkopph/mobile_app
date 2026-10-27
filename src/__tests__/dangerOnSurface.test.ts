/**
 * R3-F2 (wishlist Run 3) · `backdropContrast.test.ts` keeps `colors.danger` deliberately BELOW 4.5:1 on the mesh
 * backdrop: the rule is that danger text sits on a surface (a card, or the `dangerBg` tint). That guard checks tokens,
 * not placement, and Run 3 measured red lines rendered straight onto the backdrop at 4.46:1 — "Couldn't load more",
 * the pledge refusal, the need form's and a need's error lines, and the shared Field's per-field error.
 *
 * So: on these screens and in Field, every style that colours text `colors.danger` spreads the shared
 * `dangerOnSurface` (the tint, a radius and padding — 5.18:1), unless it is named below with the surface it sits on.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");
const FILES: Array<[string, string]> = [
  ["components/ui/Field.tsx", read("components", "ui", "Field.tsx")],
  ...["DonateScreen", "DonatePledgeScreen", "MyDonationsScreen", "ShelterNeedsScreen", "NeedFormScreen", "NeedPledgesScreen",
    "DonationInstructionsScreen", "ShelterDonateScreen", "WaysToHelpScreen"].map((n) => [`screens/${n}.tsx`, read("screens", `${n}.tsx`)] as [string, string]),
];
/** Already on a surface, so plain danger is fine there (5.86:1 on a card, 5.18:1 on the tint). */
const ON_A_SURFACE: Record<string, string> = {
  "screens/DonateScreen.tsx:saveError": "inside the white QR card",
  "screens/MyDonationsScreen.tsx:cancelLabel": "inside cancelBtn, whose fill is the dangerBg tint",
  "components/ui/Field.tsx:labelError": "the label inside the white field box",
};

/** `name: { …color: colors.danger… }` style entries — one level of braces, as StyleSheet entries are written here. */
function dangerStyles(file: string, src: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const m of src.matchAll(/^\s+(\w+): \{([^{}]*)\}/gm)) {
    if (/color:\s*colors\.danger\b/.test(m[2])) out.push([`${file}:${m[1]}`, m[2]]);
  }
  return out;
}
const found = FILES.flatMap(([f, src]) => dangerStyles(f, src));

describe("danger text on the wishlist screens sits on a surface (R3-F2)", () => {
  it("the scan found the danger styles (a guard that matches nothing proves nothing)", () => {
    expect(found.length).toBeGreaterThanOrEqual(10);
    expect(found.map(([k]) => k)).toEqual(expect.arrayContaining(["components/ui/Field.tsx:errorText", "screens/WaysToHelpScreen.tsx:moreError"]));
  });
  it("every one spreads dangerOnSurface or is named as already on a surface", () => {
    const bare = found.filter(([k, body]) => !/\.\.\.dangerOnSurface\b/.test(body) && !(k in ON_A_SURFACE)).map(([k]) => k);
    expect(bare).toEqual([]);
  });
  it("the allow-list names only styles that still exist", () => {
    const keys = new Set(found.map(([k]) => k));
    expect(Object.keys(ON_A_SURFACE).filter((k) => !keys.has(k))).toEqual([]);
  });
});
