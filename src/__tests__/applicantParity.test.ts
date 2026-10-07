/**
 * Adoption poster loop — the app matches its two anchor artboards (Applicant.dc.html,
 * PosterListing.dc.html; library PR "docs/canvas-adoption-poster"). Advisory when the canvas
 * isn't laid out alongside (CI), exactly like volunteerParity.test.ts.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { DECLINE_REASONS, applicantFooter, listingStatusChip, stepActions } from "../applicant";

const SRC = join(__dirname, "..");
function findCanvasDir(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "design", "mobile-v3", "Applicant.dc.html"))) return join(dir, "design", "mobile-v3");
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
  console.warn("[applicantParity] design/mobile-v3 not found — parity assertions skipped, not failed.");
}
const facts = (html: string) =>
  Object.fromEntries([...html.matchAll(/data-fact="([^"]+)"\s+content="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const src = (f: string) => readFileSync(join(SRC, f), "utf8");

describeParity("the poster screens match their anchor artboards", () => {
  const applicant = () => facts(readCanvas("Applicant.dc.html"));
  const listing = () => facts(readCanvas("PosterListing.dc.html"));

  it("decline reasons and step actions are the artboard's words", () => {
    expect(DECLINE_REASONS.map((r) => r.label).join(",")).toBe(applicant()["decline-reasons"]);
    expect(stepActions("interview", "not_started").map((a) => a.label).join(",")).toBe(applicant()["step-actions"]);
  });

  it("the footer labels are the artboard's, for the artboard's sample (Juan, Milo)", () => {
    const [accept, reserve, ask, complete] = applicant().primary.split(",");
    const base: any = {
      viewer: "poster", inquiry_id: "i", kind: "inquiry", status: "active", end_reason: null,
      listing: { listing_id: "l", name: "Milo", species: "dog", status: "available" },
      accepted_at: null, reserved_at: null, stages: [],
      adopter: { account_id: "a", display_name: "Juan Dela Cruz", city: "Pasig City", verified_member: true }
    };
    expect(applicantFooter(base).primary?.label).toBe(accept);
    expect(applicantFooter({ ...base, accepted_at: "x" }).primary?.label).toBe(reserve);
    expect(applicantFooter({ ...base, accepted_at: "x", adopter: { ...base.adopter, verified_member: false } }).primary?.label).toBe(ask);
    expect(applicantFooter({ ...base, accepted_at: "x", reserved_at: "x" }).primary?.label).toBe(complete);
    for (const label of applicant().secondary.split(",")) expect(src("screens/ApplicantScreen.tsx")).toContain(label);
  });

  it("contact stays locked with the artboard's words", () => {
    expect(src("screens/ApplicantScreen.tsx")).toContain(applicant()["contact-locked"]);
  });

  it("listing chips: label and tone per status, as drawn", () => {
    const wire: Record<string, string> = { Draft: "draft", Live: "available", Reserved: "pending", Adopted: "adopted", Withdrawn: "withdrawn" };
    for (const pair of listing()["status-chips"].split(",")) {
      const [label, tone] = pair.split(":");
      expect(listingStatusChip(wire[label])).toEqual({ label, tone });
    }
  });

  it("the draft's actions and the empty line are the artboard's", () => {
    const screen = src("screens/PosterListingScreen.tsx");
    for (const label of listing()["actions-draft"].split(",")) expect(screen).toContain(label);
    expect(listing().empty).toBe("No one has asked about Milo yet.");
    expect(screen).toContain("No one has asked about {pet} yet.");
  });
});
