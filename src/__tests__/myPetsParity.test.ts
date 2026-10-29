/**
 * My Pets review step 11 — the app matches its two anchor artboards (MyPets.dc.html, Pet.dc.html;
 * library PR "design/my-pets-artboards", approved 2026-10-29). Advisory when the canvas isn't laid
 * out alongside (CI), exactly like applicantParity.test.ts.
 *
 * The artboards' `<meta data-fact>` markers are the contract. Where the app can say more than the
 * artboard's sample shows (a fact the sample pet doesn't have), the artboard's list must appear in
 * the app's, in the same order.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import {
  LIST_PET_LABEL, MY_PETS_EMPTY, PET_ACTIONS, REHOMED_TITLE, REMOVE_REASONS, VIEW_LISTING_LABEL,
  petChips, petFactRows, rehomedLine
} from "../petForm";

const SRC = join(__dirname, "..");
function findCanvasDir(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "design", "mobile-v3", "MyPets.dc.html"))) return join(dir, "design", "mobile-v3");
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
  console.warn("[myPetsParity] design/mobile-v3 not found — parity assertions skipped, not failed.");
}
const facts = (html: string) =>
  Object.fromEntries([...html.matchAll(/data-fact="([^"]+)"\s+content="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const src = (f: string) => readFileSync(join(SRC, f), "utf8");
const isSubsequence = (needle: string[], hay: string[]) => {
  let i = 0;
  for (const h of hay) if (h === needle[i]) i++;
  return i === needle.length;
};

describeParity("My pets and Pet match their anchor artboards", () => {
  const list = () => facts(readCanvas("MyPets.dc.html"));
  const pet = () => facts(readCanvas("Pet.dc.html"));

  it("found the markers (a guard that reads nothing proves nothing)", () => {
    expect(Object.keys(list()).length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(pet()).length).toBeGreaterThanOrEqual(5);
  });

  it("every chip is the artboard's word and tone", () => {
    const l = (status: string, removed = false) => ({ listing_id: "l", status, removed });
    const app = [
      ...petChips({ open_listing: l("available"), lost_report_id: null }),
      ...petChips({ open_listing: l("draft"), lost_report_id: null }),
      ...petChips({ open_listing: l("pending"), lost_report_id: null }),
      ...petChips({ open_listing: l("available", true), lost_report_id: null }),
      ...petChips({ open_listing: null, lost_report_id: "r" })
    ].map((c) => `${c.label}:${c.tone}`);
    expect(app.join(",")).toBe(list().chips);
  });

  it("the card's actions, the Rehomed section and the empty copy are the artboard's", () => {
    expect([VIEW_LISTING_LABEL, LIST_PET_LABEL].join(",")).toBe(list()["card-actions"]);
    expect(REHOMED_TITLE).toBe(list().sections);
    expect(rehomedLine("2026-10-01T00:00:00Z").startsWith(list()["rehomed-line"])).toBe(true);
    expect(MY_PETS_EMPTY).toBe(list().empty);
    expect(src("screens/MyPetsScreen.tsx")).toContain(`label="+ ${list().add}"`);
  });

  it("the pet screen's facts follow the artboard's order", () => {
    const all = petFactRows({ breed: "b", sex: "male", size_category: "small", color_markings: "c",
      spayed_neutered: true, temperament: "t", medical_conditions: "m", vet_contact: "v" }).map(([k]) => k);
    expect(isSubsequence(pet().facts.split(","), all)).toBe(true);
  });

  it("the pet screen's actions, for a listed pet and a lost one, are the artboard's", () => {
    expect([PET_ACTIONS.edit, VIEW_LISTING_LABEL, PET_ACTIONS.reportLost, PET_ACTIONS.remove].join(","))
      .toBe(pet()["actions-listed"]);
    expect([PET_ACTIONS.edit, LIST_PET_LABEL, PET_ACTIONS.viewLost, PET_ACTIONS.remove].join(","))
      .toBe(pet()["actions-lost"]);
  });

  it("removing asks the artboard's question with its reasons", () => {
    expect(REMOVE_REASONS.map((r: { label: string }) => r.label).join(",")).toBe(pet()["remove-reasons"]);
    expect(pet()["remove-title"]).toBe("Remove Mochi?");
    expect(src("screens/PetDetailScreen.tsx")).toContain("title={`Remove ${pet.name}?`}");
  });
});
