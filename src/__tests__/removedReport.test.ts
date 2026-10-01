/**
 * P2 · a report removed by moderation says so. The decision lives in sagip.ts (tested there);
 * these guards pin that each screen actually USES it, since a screen that forgets falls back to
 * LoadStateView "gone" — "this report doesn't exist" — for something that did, and was taken down.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("the removed-report card", () => {
  const card = read("components/sagip/ReportRemovedCard.tsx");
  it("carries the exact copy and a Back button", () => {
    expect(card).toContain("This report was removed by moderation");
    expect(card).toContain("There's nothing left to do on it.");
    expect(card).toMatch(/<Button[^>]*label="Back"/);
    expect(card).toContain("onBack");
  });
});

describe.each(["screens/RescueUpdateScreen.tsx", "screens/ReportDetailScreen.tsx"])("%s", (file) => {
  const src = read(file);
  it("keeps the error code of the load", () => {
    expect(src).toMatch(/setResCode\(r\.data\?\.error\?\.code\)/);
  });
  it("renders the removed card for a 410 report_removed, before LoadStateView", () => {
    expect(src).toContain("isReportRemoved(res, resCode)");
    expect(src).toContain("<ReportRemovedCard");
    expect(src.indexOf("isReportRemoved(res, resCode)")).toBeLessThan(src.indexOf("<LoadStateView"));
  });
  it("Back goes back", () => {
    expect(src).toMatch(/<ReportRemovedCard[^>]*onBack=\{\(\) => navigation\.goBack\(\)\}/);
  });
});

describe("ReportDetailScreen · the reporter's view of a hidden report", () => {
  const src = read("screens/ReportDetailScreen.tsx");
  it("uses the Removed by moderation chip in place of the status chip", () => {
    expect(src).toContain("reporterDetailChip(report)");
  });
  it("hides the status ladder on a hidden report", () => {
    expect(src).toMatch(/isLost && !isReporterView \|\| report\.hidden \? null/);
  });
});

describe("MyRescuesScreen", () => {
  const src = read("screens/MyRescuesScreen.tsx");
  it("takes its chip from rescueRowChip (Removed when hidden) and keeps the row tappable", () => {
    expect(src).toContain("rescueRowChip(c)");
    expect(src).toContain("<TouchableOpacity");
  });
});
