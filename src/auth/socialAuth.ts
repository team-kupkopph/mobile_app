// US-A2 · provider sign-in seam.
//
// STATUS: NOT WIRED TO A REAL PROVIDER YET, AND BLOCKED — not by effort, by paperwork.
// `dev/sprint-0-checklist.md` S0-05 (Apple Developer Program) and S0-06 (Google OAuth client)
// are both still unchecked, so no client ID exists to configure and no redirect URI can be
// registered. Installing `expo-auth-session` / `expo-apple-authentication` now would add native
// dependencies that cannot be exercised, which is worse than an honest gap.
//
// This module is the seam that closes that gap in one file. It deliberately mirrors the backend's
// `accounts/social.py :: verify_token` seam — same shape, same reason, so both sides drop in
// together once the credentials land.
//
// TO FINISH (once S0-05 / S0-06 are done):
//   1. `npx expo install expo-auth-session expo-crypto` (Google) and
//      `npx expo install expo-apple-authentication` (Apple — iOS only).
//      Use `expo install`, NOT `pnpm add` — see CLAUDE.md.
//   2. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID / EXPO_PUBLIC_APPLE_CLIENT_ID.
//   3. Replace the `acquire*` bodies below with the SDK call; return the provider's id_token.
//   Everything downstream (the identity chip, the account-type step, POST /auth/social/{provider},
//   token storage, the signup-success landing) is already built and needs no change.
//
// WHY THE BUTTON MUST NOT BE SILENT: before this module, WelcomeScreen rendered "Continue with
// Google" but RootNavigator never passed a handler, so the button did nothing at all when tapped.
// A dead control is worse than a disabled one — the user cannot tell the difference between "broken"
// and "slow", so they tap it repeatedly and conclude the app is broken.

export type SocialProvider = "google" | "apple";

export type SocialIdentity = {
  provider: SocialProvider;
  idToken: string;
  email: string;
};

export type SocialResult =
  | { ok: true; identity: SocialIdentity }
  | { ok: false; reason: "not_configured" | "cancelled" | "failed" };

function clientIdFor(provider: SocialProvider): string | undefined {
  return provider === "google"
    ? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID
    : process.env.EXPO_PUBLIC_APPLE_CLIENT_ID;
}

export function isConfigured(provider: SocialProvider): boolean {
  return !!clientIdFor(provider);
}

export async function signInWithProvider(provider: SocialProvider): Promise<SocialResult> {
  if (!isConfigured(provider)) return { ok: false, reason: "not_configured" };

  // ---- SDK call goes here (step 3 above). Intentionally not faked: returning a made-up
  // id_token would let the UI "succeed" against a backend that must reject it, which is a
  // worse failure than declining up front.
  return { ok: false, reason: "not_configured" };
}

/** Copy for the one case the user can actually hit today. Kept here so both entry points
 *  (Welcome and the account-type step) say exactly the same thing. */
export const NOT_CONFIGURED_MESSAGE =
  "Google and Apple sign-in aren't switched on yet. Please sign up with your email — it only takes a minute.";
