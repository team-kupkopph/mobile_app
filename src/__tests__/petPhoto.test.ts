/**
 * My Pets test plan NT-12 (F7) — a pet photo that won't load shows the paw placeholder, never a blank tile.
 *
 * Found on the simulator (Run 3): an adopted pet keeps its previous owner's photos, and when that owner's
 * file is gone the URL 404s. `<Image>` with no `onError` then left the soft background: blank on My pets,
 * on the pet screen and in the form's photo strip. Every pet photo now goes through `PetPhoto`.
 */
import { readFileSync } from "fs";
import { join } from "path";

const SRC = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

describe("PetPhoto (NT-12)", () => {
  const source = read("components/PetPhoto.tsx");

  it("falls back to the paw placeholder when the image fails to load, and when there is none", () => {
    expect(source).toMatch(/onError=\{/);
    expect(source).toMatch(/<AdoptIcon/);
    expect(source).toMatch(/!uri \|\| failed === uri/);   // per URL: a new photo gets its own chance
  });

  it.each(["screens/MyPetsScreen.tsx", "screens/PetDetailScreen.tsx", "screens/PetFormScreen.tsx"])(
    "%s draws every pet photo through PetPhoto", (file) => {
      const screen = read(file);
      expect(screen).toMatch(/<PetPhoto\b/);
      expect(screen).not.toMatch(/<Image\b/);
    });
});
