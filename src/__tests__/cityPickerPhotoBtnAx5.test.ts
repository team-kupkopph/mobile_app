/**
 * Two fixed-height controls at AX5 (the city picker was seen on a device, opened from Home's "Change ›", owner persona; the photo button by reading):
 * every city row in "Your location" is a fixed `height: 58`, so "Marikina City" / "Quezon City" ran into its radio button and was cut off at the
 * right edge; the search bar is a fixed `height: 50` around a `height: "100%"` input. The listing form's dashed "Add a photo" button is a fixed
 * `height: 90`.
 *
 * The same fixes as the rest of the AX5 work: `minHeight` + padding instead of a fixed `height` (the row's name column already has `flex: 1` and no
 * `numberOfLines`, so it wraps once the row can grow). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const picker = read("LocationPickerScreen.tsx");
const form = read("ListingFormScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

test.each([
  ["cityRow", picker],
  ["searchBar", picker],
  ["searchInput", picker],
  ["photoBtn", form]
])("%s grows with its content (minHeight, no fixed height)", (name, src) => {
  const b = body(src, name) as string;
  expect(b).not.toBeNull();
  expect(b).not.toMatch(fixedHeight);
  expect(b).toMatch(/minHeight\s*:/);
});

test("the city row and the photo button keep vertical padding", () => {
  expect(body(picker, "cityRow")).toMatch(/paddingVertical\s*:/);
  expect(body(form, "photoBtn")).toMatch(/paddingVertical\s*:/);
});
