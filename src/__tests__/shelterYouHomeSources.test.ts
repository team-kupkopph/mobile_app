// Shelter home review (2026-10-29), High steps 5–7.
// - SH5 · You's first tile read "Listings" for a verified shelter but showed `counts.draft_listings`, so 12 live
//   animals and no drafts read "0 Listings".
// - SH13 · Home took its tier and name from /me, which may fail quietly. A failed /me defaulted the tier to
//   community_rescue: an NGO saw "Verified Rescue" and "Upload ›" opened the tier-1 document set. Home also showed
//   the ACCOUNT's display_name while You showed the ORGANISATION's org_name.
// - SH8b · `ShelterRequest.status` was typed `string`.
import { readFileSync } from "fs";
import { join } from "path";

import { Me, ShelterDashboard, ShelterProfileSummary } from "../api/types";
import { shelterIdentity, shelterListingsTile } from "../shelterDashboard";

const counts = (c: Partial<ShelterDashboard["counts"]>): ShelterDashboard["counts"] =>
  ({ draft_listings: 0, adopted: 0, donations: 0, ...c });

describe("shelterListingsTile (SH5)", () => {
  it("a verified shelter with 12 live and no drafts reads 12 Listings, not 0", () => {
    expect(shelterListingsTile(counts({ live_listings: 12, draft_listings: 0 }), true, false))
      .toEqual({ n: 12, label: "Listings" });
  });

  it("a gated shelter counts its drafts, labelled Drafts (Draft for tier 1, as before)", () => {
    expect(shelterListingsTile(counts({ live_listings: 0, draft_listings: 3 }), false, false))
      .toEqual({ n: 3, label: "Drafts" });
    expect(shelterListingsTile(counts({ draft_listings: 1 }), false, true)).toEqual({ n: 1, label: "Draft" });
  });

  it("a verified shelter on an older server with no live_listings says Drafts, never a draft count as Listings", () => {
    expect(shelterListingsTile(counts({ draft_listings: 4 }), true, false)).toEqual({ n: 4, label: "Drafts" });
  });
});

const profile = (p: Partial<ShelterProfileSummary>): ShelterProfileSummary =>
  ({ org_name: "Paws of Marikina Inc.", tier: "registered_ngo", ...p });
const me = (m: Partial<Me>) => ({ display_name: "juan@paws", shelter: null, ...m }) as Me;

describe("shelterIdentity (SH13)", () => {
  it("reads the organisation's name and tier from /shelter/profile", () => {
    expect(shelterIdentity(profile({}), me({ shelter: { tier: "community_rescue", verification_status: "approved" } })))
      .toEqual({ name: "Paws of Marikina Inc.", tier: "registered_ngo" });
  });

  it("falls back to /me's own tier and name while the profile has not answered", () => {
    expect(shelterIdentity(null, me({ shelter: { tier: "registered_ngo", verification_status: null } })))
      .toEqual({ name: "juan@paws", tier: "registered_ngo" });
  });

  it("with neither answered, the tier is UNKNOWN (null), never defaulted to community_rescue", () => {
    expect(shelterIdentity(null, null)).toEqual({ name: null, tier: null });
    expect(shelterIdentity(null, me({ shelter: null }))).toEqual({ name: "juan@paws", tier: null });
  });
});

describe("Home reads identity from /shelter/profile", () => {
  const home = readFileSync(join(__dirname, "..", "screens", "ShelterDashboardScreen.tsx"), "utf8");

  it("loads /shelter/profile and derives the identity through the helper", () => {
    expect(home).toMatch(/api\.get\("\/shelter\/profile"\)/);
    expect(home).toMatch(/shelterIdentity\(profile, me\)/);
  });

  it("never defaults the tier to community_rescue", () => {
    expect(home).not.toMatch(/\?\? "community_rescue"/);
  });

  it("hides the tier badge and the Upload CTA while the tier is unknown", () => {
    expect(home).toMatch(/verified \? \(\s*id\.tier \?/);
    expect(home).toMatch(/state === "incomplete" && !id\.tier/);
  });
});

describe("You's first tile reads the helper", () => {
  const you = readFileSync(join(__dirname, "..", "screens", "ShelterProfileScreen.tsx"), "utf8");
  it("passes the tile's n and label from shelterListingsTile", () => {
    expect(you).toMatch(/shelterListingsTile\(counts, !gated, isTier1\)/);
    expect(you).not.toMatch(/<Stat n=\{counts\.draft_listings\}/);
  });
});

describe("ShelterRequest is typed (SH8b)", () => {
  const types = readFileSync(join(__dirname, "..", "api", "types.ts"), "utf8");
  it("status is a union of the two sources' vocabularies, not string", () => {
    const block = /export type ShelterRequest = \{[\s\S]*?\n\};/.exec(types)?.[0] ?? "";
    expect(block).toMatch(/status: ShelterRequestStatus;/);
    expect(types).toMatch(/export type ShelterRequestStatus =/);
  });
});
