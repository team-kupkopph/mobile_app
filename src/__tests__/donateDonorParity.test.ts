/**
 * DW3 part 2 (Abot-tulong QR plan; the owner approved the draft artboard `DonateDonor.dc.html`, library#161): the donor's `DonateScreen` follows it.
 * Same convention as shelterShellParity: walk up to design/mobile-v3 and skip (warn, not fail) without it.
 *  - org identity block: avatar + name + verified tick + city;
 *  - "Give directly" + its copy, shown with the QR cards;
 *  - the QR on a flat white Card (decision 5), Save QR + hint, three states;
 *  - wishlist rows in goods with a progress bar and Pledge; My donations.
 * Deliberate deviation: the artboard's category emoji are a placeholder; the app has a "no emoji" rule and no category icon set, so rows carry
 * the progress bar without an icon until one exists.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { needProgressFraction } from "../community";

const src = readFileSync(join(__dirname, "..", "screens", "DonateScreen.tsx"), "utf8");
const listing = readFileSync(join(__dirname, "..", "screens", "ListingDetailScreen.tsx"), "utf8");
const types = readFileSync(join(__dirname, "..", "navigation", "types.ts"), "utf8");

function findCanvasDir(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "design", "mobile-v3", "DonateDonor.dc.html"))) return join(dir, "design", "mobile-v3");
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const canvas = findCanvasDir();
const describeParity = canvas ? describe : describe.skip;
if (!canvas) {
  // eslint-disable-next-line no-console
  console.warn("[donateDonor] design/mobile-v3/DonateDonor.dc.html not found — artboard assertions skipped, not failed.");
}
const facts = (html: string) =>
  Object.fromEntries([...html.matchAll(/data-fact="([^"]+)"\s+content="([^"]*)"/g)].map((m) => [m[1], m[2]]));

describeParity("the donor's Donate screen matches the artboard", () => {
  const html = canvas ? readFileSync(join(canvas, "DonateDonor.dc.html"), "utf8") : "";
  it("the artboard's markers", () => {
    const f = facts(html);
    expect(f["header"]).toBe("Donate");
    expect(f["qr-surface"]).toBe("white-flat");
    expect(f["sections"]).toBe("Give directly,Wishlist");
  });
  it("the build says what the artboard says", () => {
    expect(src).toContain("Give directly");
    expect(src).toContain("Scan with GCash or Maya. Straight to the shelter — Kupkop never handles it.");
    expect(src).toContain("Using one phone? Save the code, then in GCash or Maya choose Scan QR and upload the saved image.");
    expect(src).toContain("Donations aren't available for this org yet.");
    expect(src).toContain("Pledge to bring what");
  });
});

describe("the build", () => {
  it("shows the org identity: avatar, name, verified tick, city", () => {
    expect(src).toMatch(/<Avatar [^>]*tinted/);
    expect(src).toMatch(/Verified organisation/);
    expect(src).toMatch(/\{city \?/);
  });
  it("the city comes from the listing the donor tapped from", () => {
    expect(types).toMatch(/donate: \{ accountId: string; orgName: string; city\?: string \| null \}/);
    expect(listing).toMatch(/orgName: listing\.poster\.name, city: listing\.city/);
  });
  it("'Give directly' heads the QR section only when there is a QR to scan", () => {
    const i = src.indexOf("Give directly");
    expect(i).toBeGreaterThan(-1);
    expect(src.slice(i - 300, i)).toMatch(/qrState\.kind === "ready"|qrs && qrs\.length > 0/);
  });
  it("each wishlist row has a progress bar", () => {
    expect(src).toMatch(/needProgressFraction\(/);
    expect(src).toMatch(/styles\.needBar/);
  });
  it("the QR card stays flat white", () => {
    expect(src).toMatch(/qrCard: \{[^}]*backgroundColor: colors\.white/);
  });
});

describe("needProgressFraction", () => {
  it("received over needed, clamped to 0..1", () => {
    expect(needProgressFraction(5, 8)).toBeCloseTo(0.625);
    expect(needProgressFraction(0, 8)).toBe(0);
    expect(needProgressFraction(9, 8)).toBe(1);
  });
  it("is 0 when nothing is needed (no divide by zero)", () => {
    expect(needProgressFraction(0, 0)).toBe(0);
  });
});
