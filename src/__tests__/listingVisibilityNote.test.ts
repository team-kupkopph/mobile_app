/**
 * "+ List" is open to every signed-in account (decision 2: draft-only, gated-public), so the
 * form has to say who will see the listing — and say it only to the people it applies to.
 *
 * ⚠️ The form used to print "Saved as a draft until your account is verified" to EVERYONE,
 * a Verified Member included, on a screen they had every right to use. The notice is now
 * derived from /me with the same predicate the backend's `public_poster_q` uses — an approved
 * `rescuer` capability (the Verified Member badge) or an approved shelter — and rendered only
 * when that predicate is known to be false. Unknown (the fetch has not answered) shows nothing.
 */
import { readFileSync } from "fs";
import { join } from "path";

const form = readFileSync(join(__dirname, "..", "screens", "ListingFormScreen.tsx"), "utf8");
const adopt = readFileSync(join(__dirname, "..", "screens", "AdoptScreen.tsx"), "utf8");

describe("the listing form's visibility notice", () => {
  it("derives 'verified poster' the way public_poster_q does", () => {
    expect(form).toMatch(/c\.capability === "rescuer" && c\.status === "approved"/);
    expect(form).toMatch(/me\.shelter\?\.verification_status === "approved"/);
  });

  it("shows the notice only when verification is known to be false, and never on edit", () => {
    expect(form).toMatch(/\{!isEdit && verifiedPoster === false \? \(/);
    expect(form).toMatch(/: null; \/\/ unknown until \/me answers/);
    expect(form).not.toMatch(/Saved as a draft until your account is verified/); // the old line, shown to everyone
  });

  it("names the badge, offers the way to it, and promises only what the backend does", () => {
    expect(form).toMatch(/It appears once you're a Verified Member/);
    expect(form).toMatch(/It appears once your shelter is verified/);
    expect(form).toMatch(/navigation\.navigate\("memberUpgrade"\)/);
    expect(form).toMatch(/goes public on its own once you're approved/); // public_poster_q is derived, never a flag
  });

  it("keeps + List open to everyone signed in, as the panel's small button", () => {
    expect(adopt).toMatch(/<Button size="small" label="\+ List" testID="btn\.adopt\.list"/);
    expect(adopt).not.toMatch(/verifiedPoster|approvedMember/); // no gate on the entry point
  });
});
