// US-A2 · provider sign-in seam.
//
// STATUS 2026-09-13: GOOGLE IS WIRED (S0-06 landed — a Google Cloud project with iOS + Web OAuth
// clients). APPLE IS NOT (S0-05, the paid Developer Program, is deferred to before launch).
//
// The Google flow is expo-auth-session's imperative AuthRequest in the authorization-CODE flow
// with PKCE, returned to the reversed-client-id scheme the binary registers (app.config.ts, via
// googleScheme.ts), then exchangeCodeAsync at Google's token endpoint, which returns the id_token.
// ⚠️ Not response_type=id_token: Google's installed-app (iOS) clients refuse it with "Error 400:
// unsupported_response_type" — found on device 2026-09-13. PKCE is what makes the exchange safe
// without a client secret, which an app must never carry.
// The id_token goes to POST /auth/social/google, where the backend verifies signature, issuer,
// expiry and — the part that matters — that its audience is one of OUR client ids. The client
// checks only what it can: that the token carries the nonce this request sent.
//
// ⚠️ APPLE IS "COMING SOON", AND THAT IS A NAMED STATE, NOT A GAP. App Store Review Guideline
// 4.8 requires Sign in with Apple wherever Google is offered. The row still renders both buttons
// (SocialSignIn.tsx keeps that invariant); what this file does is answer the Apple tap with
// `coming_soon` — its own reason, so the sheet can say exactly that and so the state cannot be
// mistaken for "not configured". A build in this state is fine for dev and TestFlight and a
// rejection if submitted; the checklist (dev/sprint-0-checklist.md S0-05) carries the gate.
//
// TO FINISH APPLE (once S0-05 is paid and the Services ID + App ID capability exist):
//   1. `npx expo install expo-apple-authentication` — use `expo install`, NOT `pnpm add`.
//   2. Set EXPO_PUBLIC_APPLE_CLIENT_ID; add `ios.usesAppleSignIn: true` to app.config.ts.
//   3. Fill `acquireApple` with AppleAuthentication.signInAsync and return its identityToken.
//   4. Backend: fill the Apple arm of accounts/social.py (JWKS + audience = bundle id).
//   5. Retire the "expo-apple-authentication is absent" case in socialSignIn.test.ts.
//
// WHY THE BUTTON MUST NOT BE SILENT: before this module, WelcomeScreen rendered "Continue with
// Google" but RootNavigator never passed a handler, so the button did nothing at all when tapped.
// A dead control is worse than a disabled one — the user cannot tell the difference between "broken"
// and "slow", so they tap it repeatedly and conclude the app is broken.
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";

import { googleIosUrlScheme } from "./googleScheme";
import { decodeIdTokenPayload } from "./idToken";

// Lets the auth sheet close itself when the redirect lands while the app is foregrounded.
WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = "google" | "apple";

export type SocialIdentity = {
  provider: SocialProvider;
  idToken: string;
  email: string;
};

export type SocialResult =
  | { ok: true; identity: SocialIdentity }
  | { ok: false; reason: "not_configured" | "coming_soon" | "cancelled" | "failed" };

function clientIdFor(provider: SocialProvider): string | undefined {
  return provider === "google"
    ? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID
    : process.env.EXPO_PUBLIC_APPLE_CLIENT_ID;
}

export function isConfigured(provider: SocialProvider): boolean {
  return !!clientIdFor(provider);
}

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

async function acquireGoogle(clientId: string): Promise<SocialResult> {
  const nonce = Crypto.randomUUID();
  try {
    // Must be the scheme app.config.ts registered from the same env var — see googleScheme.ts.
    const redirectUri = `${googleIosUrlScheme(clientId)}:/oauthredirect`;
    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri,
      scopes: ["openid", "email", "profile"],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: { nonce },
    });
    const result = await request.promptAsync(GOOGLE_DISCOVERY);
    if (result.type === "cancel" || result.type === "dismiss") return { ok: false, reason: "cancelled" };
    if (result.type !== "success") return { ok: false, reason: "failed" };
    const code = result.params.code;
    if (!code) return { ok: false, reason: "failed" };
    const tokens = await AuthSession.exchangeCodeAsync(
      { clientId, code, redirectUri, extraParams: { code_verifier: request.codeVerifier ?? "" } },
      GOOGLE_DISCOVERY,
    );
    const idToken = tokens.idToken;
    if (!idToken) return { ok: false, reason: "failed" };
    const payload = decodeIdTokenPayload(idToken);
    // A token that does not carry the nonce this request sent is not the answer to this request.
    if (!payload || payload.nonce !== nonce || typeof payload.email !== "string") {
      return { ok: false, reason: "failed" };
    }
    return { ok: true, identity: { provider: "google", idToken, email: payload.email } };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function signInWithProvider(provider: SocialProvider): Promise<SocialResult> {
  const clientId = clientIdFor(provider);
  if (provider === "google") {
    if (!clientId) return { ok: false, reason: "not_configured" };
    return acquireGoogle(clientId);
  }
  // Apple. With Google live and no Apple client id, this is the named 4.8 gap; with neither
  // live it is the plain "not switched on yet" both buttons said before S0-06.
  if (!clientId) return { ok: false, reason: isConfigured("google") ? "coming_soon" : "not_configured" };
  // ---- Apple SDK call goes here (TO FINISH, step 3). Intentionally not faked: returning a
  // made-up identityToken would let the UI "succeed" against a backend that must reject it.
  return { ok: false, reason: "not_configured" };
}

/** Copy for the two cases a person can hit today. Kept here so both entry points (Welcome and
 *  Log in) say exactly the same thing. */
export const NOT_CONFIGURED_MESSAGE =
  "Google and Apple sign-in aren't switched on yet. Please sign up with your email — it only takes a minute.";
export const APPLE_COMING_SOON_MESSAGE =
  "We're finishing Sign in with Apple. For now, continue with Google or sign up with your email.";
