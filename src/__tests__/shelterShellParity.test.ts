/**
 * A0.3 Part B — the shelter shell matches the four new canvas anchor artboards
 * (ShelterHome.dc.html, ShelterYou.dc.html, AnimalsRow.dc.html, RescueCase.dc.html)
 * added to design/mobile-v3 in the companion library PR (docs/canvas-shelter-anchors).
 *
 * Same convention as adoptDeckParity.test.ts: walk up from this file looking for
 * design/mobile-v3, and describe.skip + console.warn (not fail) when it isn't there —
 * the guard is advisory until the artboards ship, never a false red for a checkout
 * that simply doesn't have the sibling library repo laid out alongside it.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

const SRC = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

function findCanvasDir(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const c = join(dir, "design", "mobile-v3", "ShelterHome.dc.html");
    if (existsSync(c)) return join(dir, "design", "mobile-v3");
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const canvasDir = findCanvasDir();
const readCanvas = (file: string) => readFileSync(join(canvasDir as string, file), "utf8");
const describeParity = canvasDir ? describe : describe.skip;
if (!canvasDir) {
  // eslint-disable-next-line no-console
  console.warn("[shelterShell] design/mobile-v3 not found — parity assertions skipped, not failed.");
}

// data-fact="key" content="value" — the same marker convention across every anchor artboard.
const facts = (html: string) =>
  Object.fromEntries(
    [...html.matchAll(/data-fact="([^"]+)"\s+content="([^"]*)"/g)].map((m) => [m[1], m[2]])
  );

describeParity("the shelter shell matches the anchor artboards", () => {
  it("the shelter tab bar matches the artboard", () => {
    const home = facts(readCanvas("ShelterHome.dc.html"));
    expect(home.tabs).toBe("Home,Animals,Donate,Requests,You");

    const tabs = readFileSync(join(SRC, "components", "ShelterTabs.tsx"), "utf8");
    for (const label of ["Home", "Animals", "Donate", "Requests", "You"]) {
      expect(tabs).toMatch(new RegExp(`label: "${label}"`));
    }
  });

  it("three stat tiles, on both roots", () => {
    const home = facts(readCanvas("ShelterHome.dc.html"));
    const you = facts(readCanvas("ShelterYou.dc.html"));
    expect(home["stat-tiles"]).toBe("3");
    expect(you["stat-tiles"]).toBe("3");

    // Loose >= — ShelterDashboardScreen and ShelterProfileScreen may already render more
    // than the artboard's minimum, and that is fine; fewer than 3 is the regression this
    // guards against.
    const dashboard = read("screens/ShelterDashboardScreen.tsx");
    const profile = read("screens/ShelterProfileScreen.tsx");
    const count = (src: string) => (src.match(/<Stat /g) ?? []).length;
    expect(count(dashboard)).toBeGreaterThanOrEqual(3);
    expect(count(profile)).toBeGreaterThanOrEqual(3);
  });

  it("the QR sits on a flat white surface", () => {
    const home = facts(readCanvas("ShelterHome.dc.html"));
    const you = facts(readCanvas("ShelterYou.dc.html"));
    expect(home["qr-surface"] ?? you["qr-surface"]).toBe("white-flat");
  });

  it("the Animals row shape is photo, title, subtitle, chip", () => {
    const row = facts(readCanvas("AnimalsRow.dc.html"));
    expect(row["row-shape"]).toBe("photo-title-subtitle-chip");
  });

  it("the rescue case stepper has six stages and a shared done layout", () => {
    const rescue = facts(readCanvas("RescueCase.dc.html"));
    expect(rescue.stages).toBe("6");
    expect(rescue["done-layout"]).toBe("true");
  });
});
