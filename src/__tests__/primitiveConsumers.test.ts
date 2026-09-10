/**
 * Every primitive must be RENDERED somewhere. A component with no consumer is not a design
 * system; it is a branch nobody merged.
 *
 * ⚠️ THIS IS THE FAILURE THIS TRACK EXISTS TO CLOSE. Avatar, Card, SectionHeader and
 * SegmentedControl were written in US-FD3 and then sat unmerged on `sprint11/fd3-primitives`
 * for the whole sprint, because they were held back "until they had consumers" and never got
 * any. The design audit against the approved canvas is what surfaced them — the canvas has
 * dedicated panels for "Avatars · squircle" and "Segmented control", and the app had neither.
 *
 * So the rule is not "these components exist". It is "something renders them".
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const UI = join(__dirname, "..", "components", "ui");
const SRC = join(__dirname, "..");

/** Every .tsx in components/ui is a primitive, minus the barrel. */
const PRIMITIVES = readdirSync(UI)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => f.replace(/\.tsx$/, ""));

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sources(join(dir, e.name))
      : e.name.endsWith(".tsx") ? [join(dir, e.name)]
      : []);
}

/**
 * ⚠️ THE TRAILING CHARACTER CLASS IS LOAD-BEARING. A bare `<Card` also matches `<CardTone`,
 * and it did: a first count of Card's consumers said 3 when the real answer was 1, because two
 * screens declare `Record<CardTone, …>`. A JSX element is followed by whitespace, `/` or `>` —
 * anything else is a longer identifier that merely starts the same way.
 */
function rendersElement(src: string, name: string): boolean {
  return new RegExp("<" + name + "[\\s/>]").test(src);
}

const FILES = sources(SRC).map((f) => ({ path: f, text: readFileSync(f, "utf8") }));

describe("every primitive has a consumer", () => {
  it("found primitives and files to search", () => {
    // Guard the guard: an empty list on either side makes every assertion below vacuous.
    expect(PRIMITIVES.length).toBeGreaterThan(5);
    expect(FILES.length).toBeGreaterThan(50);
  });

  it.each(PRIMITIVES)("%s is rendered outside its own file", (name) => {
    const consumers = FILES.filter(
      (f) => !f.path.endsWith(`/ui/${name}.tsx`) && rendersElement(f.text, name)
    );
    expect(consumers.map((c) => c.path.replace(SRC, ""))).not.toEqual([]);
  });
});

describe("the element scan does not over-count", () => {
  it("does not mistake <CardTone for <Card", () => {
    expect(rendersElement("Record<CardTone, X>", "Card")).toBe(false);
    expect(rendersElement("<Card accent={x}>", "Card")).toBe(true);
    expect(rendersElement("<Card/>", "Card")).toBe(true);
    expect(rendersElement("<Card>", "Card")).toBe(true);
  });
});
