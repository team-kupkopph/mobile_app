/**
 * IQ3 follow-up · resolving a rescue says what makes it count.
 *
 * Since IQ3 a rescue counts toward My impact only with an outcome note or photo (or an adoption through Kupkop), but the
 * resolve step labelled both "optional" and said nothing more, so a rescuer who skipped them earned nothing and was never
 * told why. Both stay skippable (resolving is never blocked on them); the screen now says what they are for.
 * A source scan: the repo has no renderer, and the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "RescueUpdateScreen.tsx"), "utf-8");

describe("the resolve step", () => {
  it("found the outcome fields it is checking", () => {
    expect(src).toMatch(/label="Outcome/);
    expect(src).toMatch(/addOutcomePhoto/);
  });

  it("says a note or a photo is what makes the rescue count toward impact", () => {
    expect(src).toMatch(/testID="text\.rescueUpdate\.impactHint"/);
    expect(src).toMatch(/note or a photo[^"`<]*count[^"`<]*impact/i);
  });

  it("no longer calls the outcome note or photo plain 'optional'", () => {
    expect(src).not.toMatch(/Outcome \(optional\)/);
    expect(src).not.toMatch(/outcome photo · optional/);
  });

  it("still never blocks resolving on them", () => {
    expect(src).toMatch(/if \(target === "resolved" && outcomeNotes\.trim\(\)\) body\.outcome_notes/);
    expect(src).toMatch(/if \(target === "resolved" && outcomePhotoUrl\) body\.outcome_photo_url/);
  });
});
