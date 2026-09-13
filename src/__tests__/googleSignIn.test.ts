/**
 * S0-06 landed (a Google OAuth client exists); S0-05 did not (the paid Apple Developer Program
 * is deferred to before launch). So the seam is filled for Google and the Apple button says
 * "coming soon" — a named, tested state, not a silent gap.
 *
 * ⚠️ GUIDELINE 4.8 IS NOW A SUBMISSION GATE, NOT A RENDERING RULE. The row still draws both
 * buttons (socialSignIn.test.ts keeps that invariant). What changed is behaviour: Google works,
 * Apple explains. Dev builds and TestFlight are fine in this state; an App Store submission
 * is a rejection until EXPO_PUBLIC_APPLE_CLIENT_ID exists and the Apple seam is filled.
 * `coming_soon` exists as its own reason so that gap cannot be mistaken for "not configured".
 */
import { readFileSync } from "fs";
import { join } from "path";

import { googleIosUrlScheme } from "../auth/googleScheme";
import { decodeIdTokenPayload } from "../auth/idToken";
import { APPLE_COMING_SOON_MESSAGE, signInWithProvider } from "../auth/socialAuth";

const CLIENT = "845428226259-abc123.apps.googleusercontent.com";

// The SDK is mocked at the module boundary; what is under test is everything around the
// prompt — redirect, nonce, the id_token → identity mapping, and the reasons.
const mockPromptAsync = jest.fn();
const mockExchange = jest.fn();
jest.mock("expo-auth-session", () => ({
  AuthRequest: jest.fn().mockImplementation((cfg: unknown) => ({ cfg, codeVerifier: "verifier-abc", promptAsync: mockPromptAsync })),
  exchangeCodeAsync: (...args: unknown[]) => mockExchange(...args),
  ResponseType: { Code: "code", IdToken: "id_token" },
}));
jest.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "nonce-1234" }));

function fakeIdToken(payload: Record<string, unknown>): string {
  const b64url = (s: string) => Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${b64url('{"alg":"RS256"}')}.${b64url(JSON.stringify(payload))}.sig`;
}

const keys = ["EXPO_PUBLIC_GOOGLE_CLIENT_ID", "EXPO_PUBLIC_APPLE_CLIENT_ID"] as const;
const prev: Record<string, string | undefined> = {};
beforeEach(() => { for (const k of keys) { prev[k] = process.env[k]; delete process.env[k]; } mockPromptAsync.mockReset(); mockExchange.mockReset(); });
afterEach(() => { for (const k of keys) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } });

describe("the Google iOS URL scheme", () => {
  it("is the client id reversed, as Google's iOS client page shows it", () => {
    expect(googleIosUrlScheme(CLIENT)).toBe("com.googleusercontent.apps.845428226259-abc123");
  });
  it("is registered in app.config from the same env var the seam reads, by the same rule", () => {
    // app.config.ts carries a COPY of the derivation (Expo cannot resolve a .ts import from the
    // config file). Both copies must spell the same two literals, or the browser returns to a
    // scheme the binary does not own and the sign-in hangs on a blank sheet.
    const cfg = readFileSync(join(__dirname, "..", "..", "app.config.ts"), "utf8");
    const helper = readFileSync(join(__dirname, "..", "auth", "googleScheme.ts"), "utf8");
    for (const src of [cfg, helper]) {
      expect(src).toMatch(/const suffix = "\.apps\.googleusercontent\.com";/);
      expect(src).toMatch(/`com\.googleusercontent\.apps\.\$\{head\}`/);
    }
    expect(cfg).toMatch(/EXPO_PUBLIC_GOOGLE_CLIENT_ID/);
    expect(cfg).toMatch(/scheme: googleScheme \? \["kupkop", googleScheme\] : "kupkop"/);
  });
});

describe("decoding an id_token payload (for the chip and the nonce — the backend verifies)", () => {
  it("reads base64url without padding", () => {
    expect(decodeIdTokenPayload(fakeIdToken({ email: "ana@example.com", nonce: "n" })))
      .toEqual({ email: "ana@example.com", nonce: "n" });
  });
  it("returns null for garbage rather than throwing into the handler", () => {
    expect(decodeIdTokenPayload("not.a.jwt")).toBeNull();
    expect(decodeIdTokenPayload("")).toBeNull();
  });
});

describe("signInWithProvider('google')", () => {
  it("is not_configured without a client id, and never prompts", async () => {
    await expect(signInWithProvider("google")).resolves.toEqual({ ok: false, reason: "not_configured" });
    expect(mockPromptAsync).not.toHaveBeenCalled();
  });

  it("asks for a CODE with PKCE, exchanges it, and returns the id_token + email with the nonce it sent", async () => {
    // ⚠️ Found on device, not by the first version of this test: Google's installed-app (iOS)
    // clients answer `response_type=id_token` with "Error 400: unsupported_response_type".
    // They require the authorization-code flow with PKCE, and the id_token comes back from
    // the code exchange. No client secret is involved — that is what PKCE is for.
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = CLIENT;
    const idToken = fakeIdToken({ email: "ana@example.com", nonce: "nonce-1234", sub: "g-1" });
    mockPromptAsync.mockResolvedValue({ type: "success", params: { code: "auth-code-1" } });
    mockExchange.mockResolvedValue({ idToken });
    await expect(signInWithProvider("google")).resolves.toEqual({
      ok: true, identity: { provider: "google", idToken, email: "ana@example.com" },
    });
    // The request was built for OUR client, the reversed-scheme redirect, a code, PKCE, and the nonce.
    const { AuthRequest } = jest.requireMock("expo-auth-session");
    const cfg = AuthRequest.mock.calls[0][0];
    expect(cfg.clientId).toBe(CLIENT);
    expect(cfg.redirectUri).toBe("com.googleusercontent.apps.845428226259-abc123:/oauthredirect");
    expect(cfg.responseType).toBe("code");
    expect(cfg.usePKCE).toBe(true);
    expect(cfg.extraParams.nonce).toBe("nonce-1234");
    expect(cfg.scopes).toEqual(["openid", "email", "profile"]);
    // The exchange sends the code back with the SAME client, redirect and the PKCE verifier.
    const [xcfg, discovery] = mockExchange.mock.calls[0];
    expect(xcfg).toEqual({
      clientId: CLIENT, code: "auth-code-1",
      redirectUri: "com.googleusercontent.apps.845428226259-abc123:/oauthredirect",
      extraParams: { code_verifier: "verifier-abc" },
    });
    expect(discovery.tokenEndpoint).toBe("https://oauth2.googleapis.com/token");
  });

  it("is cancelled when the person dismisses the sheet — the one quiet exit", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = CLIENT;
    mockPromptAsync.mockResolvedValue({ type: "cancel" });
    await expect(signInWithProvider("google")).resolves.toEqual({ ok: false, reason: "cancelled" });
    mockPromptAsync.mockResolvedValue({ type: "dismiss" });
    await expect(signInWithProvider("google")).resolves.toEqual({ ok: false, reason: "cancelled" });
  });

  it("fails — never succeeds — on a replayed token whose nonce is not the one it sent", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = CLIENT;
    mockPromptAsync.mockResolvedValue({ type: "success", params: { code: "c" } });
    mockExchange.mockResolvedValue({ idToken: fakeIdToken({ email: "ana@example.com", nonce: "someone-elses" }) });
    await expect(signInWithProvider("google")).resolves.toEqual({ ok: false, reason: "failed" });
  });

  it("fails on a success with no code, an exchange with no id_token, an error result, or a thrown SDK", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = CLIENT;
    mockPromptAsync.mockResolvedValue({ type: "success", params: {} });
    await expect(signInWithProvider("google")).resolves.toEqual({ ok: false, reason: "failed" });
    expect(mockExchange).not.toHaveBeenCalled();
    mockPromptAsync.mockResolvedValue({ type: "success", params: { code: "c" } });
    mockExchange.mockResolvedValue({ idToken: undefined });
    await expect(signInWithProvider("google")).resolves.toEqual({ ok: false, reason: "failed" });
    mockPromptAsync.mockResolvedValue({ type: "error", params: {} });
    await expect(signInWithProvider("google")).resolves.toEqual({ ok: false, reason: "failed" });
    mockPromptAsync.mockRejectedValue(new Error("boom"));
    await expect(signInWithProvider("google")).resolves.toEqual({ ok: false, reason: "failed" });
    mockPromptAsync.mockResolvedValue({ type: "success", params: { code: "c" } });
    mockExchange.mockRejectedValue(new Error("token endpoint 400"));
    await expect(signInWithProvider("google")).resolves.toEqual({ ok: false, reason: "failed" });
  });
});

describe("signInWithProvider('apple') while S0-05 is unpaid", () => {
  it("is coming_soon when Google is live and Apple is not — the named 4.8 gap", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = CLIENT;
    await expect(signInWithProvider("apple")).resolves.toEqual({ ok: false, reason: "coming_soon" });
  });
  it("is plain not_configured when neither is live", async () => {
    await expect(signInWithProvider("apple")).resolves.toEqual({ ok: false, reason: "not_configured" });
  });
  it("tells the person what to do instead, and names Apple", () => {
    expect(APPLE_COMING_SOON_MESSAGE).toMatch(/Apple/);
    expect(APPLE_COMING_SOON_MESSAGE).toMatch(/Google|email/);
  });
  it("is what the shared handler shows as its own sheet", () => {
    const hook = readFileSync(join(__dirname, "..", "auth", "useSocialSignIn.ts"), "utf8");
    expect(hook).toMatch(/coming_soon/);
    expect(hook).toMatch(/APPLE_COMING_SOON_MESSAGE/);
  });
});
