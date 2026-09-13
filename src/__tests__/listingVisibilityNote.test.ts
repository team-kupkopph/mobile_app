/**
 * "+ List" is open to every signed-in account (decision 2: draft-only, gated-public), so the
 * form has to say who will see the listing — and say it only to the people it applies to.
 *
 * ⚠️ The form used to print "Saved as a draft until your account is verified" to EVERYONE,
 * a Verified Member included, on a screen they had every right to use. The notice is now
 * read from /me's `is_verified_rescuer` — the backend's own `public_poster_q` predicate, served —
 * and rendered only when that is known to be false. Unknown (the fetch has not answered) shows
 * nothing.
 *
 * ⚠️ The first version re-derived the predicate on the client from `capabilities` and
 * `shelter.verification_status`. That status is the LATEST shelter_org request (what a dashboard
 * displays), while the gate is "any approved" (decision 16) — so a tier-1 shelter mid-upgrade,
 * whose listings the backend was publishing, was told they would not appear. The client owns
 * no copy of the predicate now; this test forbids one coming back.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { Me } from "../api/types";

const form = readFileSync(join(__dirname, "..", "screens", "ListingFormScreen.tsx"), "utf8");
const adopt = readFileSync(join(__dirname, "..", "screens", "AdoptScreen.tsx"), "utf8");
const shelterProfile = readFileSync(join(__dirname, "..", "screens", "ShelterProfileScreen.tsx"), "utf8");

describe("the listing form's visibility notice", () => {
  it("reads the gate /me serves and does not re-derive it", () => {
    expect(form).toMatch(/me\.is_verified_rescuer/);
    expect(form).not.toMatch(/c\.capability === "rescuer"/);        // the client-side copy, gone
    expect(form).not.toMatch(/verification_status === "approved"/);  // the LATEST status is not the gate
  });

  it("is a gate the shelter profile reads the same way", () => {
    expect(shelterProfile).toMatch(/is_verified_rescuer/);
    expect(shelterProfile).not.toMatch(/verification_status !== "approved"/);
  });

  it("types the served gate on Me, so the divergent shelter is representable", () => {
    // A tier-1 shelter with an in-flight tier-2 upgrade: latest request pending, listings shown.
    const midUpgrade: Me = {
      account_id: "a", account_type: "shelter", display_name: "T1", email: "t1@x", email_verified_at: null,
      phone: null, photo_url: null, capabilities: [],
      shelter: { tier: "community_rescue", verification_status: "pending" },
      is_verified_rescuer: true, settings: {},
    };
    expect(midUpgrade.is_verified_rescuer).toBe(true);
    expect(midUpgrade.shelter?.verification_status).toBe("pending");
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
