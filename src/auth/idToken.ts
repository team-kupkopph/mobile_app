// Reads the payload of a JWT WITHOUT verifying it. That is the correct amount of trust here:
// the client needs the email for the identity chip on the account-type step and the nonce to
// confirm the token answers the request it just made; the BACKEND verifies signature, issuer,
// expiry and audience (accounts/social.py) and is the only party that acts on the claims.
export function decodeIdTokenPayload(idToken: string): Record<string, unknown> | null {
  const parts = idToken.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    // atob is a Hermes global on RN 0.74+ and a Node global under jest.
    const json = atob(padded);
    const obj = JSON.parse(json);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

// C16 · the account a session belongs to, from the access token's own `account_id` claim
// (accounts/tokens.py). Unverified on purpose, like decodeIdTokenPayload: it only decides which
// queued reports this device may send now; the server still authenticates every request.
export function accountIdFromAccessToken(access: string | undefined): string | null {
  if (!access) return null;
  const id = decodeIdTokenPayload(access)?.account_id;
  return typeof id === "string" ? id : null;
}
