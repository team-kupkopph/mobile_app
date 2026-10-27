/**
 * D4 (owner, 2026-10-27) · each need row on the shelter's Donate tab shows a progress bar AND a percentage, as
 * `ShelterDonate.dc.html` draws it (a 7 pt rounded bar, the sunken track, the button's teal gradient), and keeps
 * the "N of M received · N pledged" line. The bar is decoration: the text beside and under it carries the meaning,
 * so it stays out of VoiceOver's way. The arithmetic is unit-tested in community.test.ts (`needPercent`,
 * `needProgressFraction`); this pins the row's structure.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "ShelterDonateScreen.tsx"), "utf8");
const row = /sections\.needs\.map\(([\s\S]*?)\n {12}\}\)\}/.exec(src)?.[1] ?? "";
const style = (name: string) => new RegExp(`\\n  ${name}: \\{([^}]*)\\}`).exec(src)?.[1] ?? "";

describe("the shelter Donate tab's need rows (D4)", () => {
  it("the scan found the row (a guard that matches nothing proves nothing)", () => {
    expect(row).toMatch(/needStatusChip\(raw\.status\)/);
  });

  it("draws a bar filled to the received share of the target", () => {
    expect(row).toMatch(/needProgressFraction\(row\.received, raw\.quantity_needed\)/);
    expect(row).toMatch(/<LinearGradient\b[^>]*colors=\{gradients\.button\}/);
  });

  it("labels it with the percentage", () => {
    expect(row).toMatch(/needPercent\(row\.received, raw\.quantity_needed\)/);
    expect(row).toMatch(/\{pct\}%/);
  });

  it("keeps the exact numbers under it", () => {
    expect(row).toMatch(/needProgressLabel\(row\.received, raw\.quantity_needed, raw\.unit, row\.pledged\)/);
  });

  it("the bar is decoration; the text carries it", () => {
    expect(row).toMatch(/style=\{styles\.barTrack\}[^>]*accessible=\{false\}|accessible=\{false\}[^>]*style=\{styles\.barTrack\}/);
  });

  it("matches the artboard: 7 pt, radius 4, the sunken track", () => {
    expect(style("barTrack")).toMatch(/height: 7/);
    expect(style("barTrack")).toMatch(/borderRadius: 4/);
    expect(style("barTrack")).toMatch(/backgroundColor: colors\.segmentTrack/);
  });
});
