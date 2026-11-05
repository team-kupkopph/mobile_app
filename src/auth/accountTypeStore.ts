// The account type this phone last saw for the signed-in person, kept beside the tokens so a cold start can open the
// right shell without the network (spec 2026-11-04-account-aware-first-screen-design.md §3.1).
//
// Per signed-in account, like the city and the app-lock preference: AuthContext clears it on any tokens -> null
// transition, so the next person on a shared phone never inherits it. Anything unreadable or unexpected reads as
// unknown (null); the callers treat that as "ask /me", never as a reason to fail a launch.
import * as SecureStore from "expo-secure-store";

export type AccountType = "personal" | "shelter";

const KEY = "kupkop.accountType";
let cached: AccountType | null | undefined;

export async function loadAccountType(): Promise<AccountType | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    cached = raw === "personal" || raw === "shelter" ? raw : null;
  } catch {
    return null;                          // not cached: a transient failure should be retried next time
  }
  return cached;
}

export async function saveAccountType(t: AccountType): Promise<void> {
  cached = t;
  try {
    await SecureStore.setItemAsync(KEY, t);
  } catch { /* the in-memory value still holds for this launch */ }
}

export async function clearAccountType(): Promise<void> {
  cached = null;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch { /* nothing to forget */ }
}
