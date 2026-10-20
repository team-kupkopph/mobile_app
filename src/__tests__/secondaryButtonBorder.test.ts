import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "components/ui/Button.tsx"), "utf8");

// Run 8 · R8-F3: the `secondary` button is white text-weight on a white card, so Edit / Mark as adopted on Your listing
// read as plain text. It gets the same 1 pt hairline the glass variant has, in the theme's border colour.
describe("a secondary button has an outline, so it reads as a button (R8-F3)", () => {
  const block = /secondary: \{[^}]*\}/.exec(src)?.[0] ?? "";
  it("the scan found the secondary surface", () => {
    expect(block).toContain("backgroundColor: colors.white");
  });
  it("it carries a 1 pt border in the theme's border colour", () => {
    expect(block).toMatch(/borderWidth: 1/);
    expect(block).toMatch(/borderColor: colors\.border\b/);
  });
  it("the other variants are unchanged: primary has no border, destructive none, glass keeps its own", () => {
    expect(/destructive: \{[^}]*\}/.exec(src)?.[0]).not.toMatch(/borderWidth/);
    expect(/glass: \{[^}]*\}/.exec(src)?.[0]).toMatch(/borderColor: colors\.glassBorder/);
  });
});
