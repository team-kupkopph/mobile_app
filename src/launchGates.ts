// M4 launch-gate scaffolding. See `library/dev/launch-gates.md` for the ledger of all five
// gates, and `library/dev/privacy-policy-facts.md` for the technical-facts scaffold counsel
// drafts against.
//
// Two of the gates have engineering-adjacent scaffolding that lives here:
//   Gate 1 — the volunteer waiver TEXT (D-S5-1) is still a placeholder.
//   Gate 4 — the published privacy policy URL is not set.
//
// Everything a screen or a test needs to know about those two states routes through THIS
// module. When counsel returns the real waiver, flip WAIVER_PLACEHOLDER_ACTIVE to false and
// replace WAIVER_BODY. When the owner publishes the privacy policy, set the
// EXPO_PUBLIC_PRIVACY_POLICY_URL env var (via eas.json or an EAS secret) — that alone is
// what closes gate 4, no code change required.
//
// The other three gates (Apple + Play developer accounts, partner-shelter onboarding, NPC
// registration + DPO) have NO engineering scaffolding possible — they are paperwork owned by
// the owner. `launchGates.test.ts` prints their status but cannot enforce them from code.

/** Toggle to `false` in the SAME PR that replaces WAIVER_BODY with legal-reviewed copy. */
export const WAIVER_PLACEHOLDER_ACTIVE: boolean = true;

/** The waiver body paragraphs — placeholder text today, live text once gate 1 is closed.
 *  `WaiverScreen.tsx` renders these verbatim so the copy lives in exactly one place. */
export const WAIVER_BODY: readonly string[] = [
  "The full liability waiver and volunteer guidelines are still being finalised.",
  "They'll be available here before you need to start volunteering, and you'll get a chance to review them then.",
  "This page is not the waiver itself — no binding agreement exists yet.",
];

/** The published URL of the privacy policy, or `null` when unset. The UI must NEVER render
 *  a "Read our privacy policy" link when this returns null — a broken link is worse than
 *  no link at all. When set, the URL is treated as opaque; validation is a build-time
 *  concern of whoever writes the EAS profile. */
export function privacyPolicyUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
  if (!raw) return null;
  // Deliberately narrow: only http(s), no javascript:/data:/file: escape hatch.
  if (!/^https?:\/\//i.test(raw)) return null;
  return raw;
}

/** Status shape of a single launch gate — see `library/dev/launch-gates.md` for the full
 *  ledger and what "closed" means for each. */
export type LaunchGate = {
  id: 1 | 2 | 3 | 4 | 5;
  name: string;
  /** True when engineering can determine the gate is closed by reading the code + env. */
  closedFromCode: boolean;
  /** True when engineering has NO way to determine closure from the code — the gate is
   *  paperwork the owner owns. The test prints these but does not enforce them. */
  ownerOnly: boolean;
  note: string;
};

/** A snapshot of every gate's state at the moment this module is imported. Read-only. */
export function launchGateStatus(): readonly LaunchGate[] {
  return [
    {
      id: 1,
      name: "Waiver TEXT (D-S5-1)",
      closedFromCode: WAIVER_PLACEHOLDER_ACTIVE === false,
      ownerOnly: false,
      note: WAIVER_PLACEHOLDER_ACTIVE
        ? "Placeholder body still active — replace WAIVER_BODY and flip WAIVER_PLACEHOLDER_ACTIVE=false."
        : "Legal-reviewed waiver body active.",
    },
    {
      id: 2,
      name: "Apple $99 + Google Play $25 developer accounts",
      closedFromCode: false,
      ownerOnly: true,
      note: "Paperwork owned by the owner — no code representation possible.",
    },
    {
      id: 3,
      name: "Partner-shelter onboarding",
      closedFromCode: false,
      ownerOnly: true,
      note: "Relationships work — no code representation possible.",
    },
    {
      id: 4,
      name: "Published privacy policy at a real URL",
      closedFromCode: privacyPolicyUrl() !== null,
      ownerOnly: false,
      note: privacyPolicyUrl()
        ? `EXPO_PUBLIC_PRIVACY_POLICY_URL set: ${privacyPolicyUrl()}`
        : "EXPO_PUBLIC_PRIVACY_POLICY_URL unset — publish the policy, set the env var.",
    },
    {
      id: 5,
      name: "NPC registration + designated DPO",
      closedFromCode: false,
      ownerOnly: true,
      note: "Filing with the PH National Privacy Commission — no code representation possible.",
    },
  ];
}

/** True when every engineering-representable gate (1 and 4) is closed. Owner-only gates
 *  (2, 3, 5) do not gate this — the code cannot see them either way. */
export function engineeringGatesClosed(): boolean {
  return launchGateStatus().filter((g) => !g.ownerOnly).every((g) => g.closedFromCode);
}
