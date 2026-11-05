// Which shell a signed-in person opens on (spec 2026-11-04-account-aware-first-screen-design.md §3.2). The one place
// that decides it, as shelterTabs.ts and appTabs.ts are the one place that knows their tab routes.
import { enterOwnerShell } from "./appTabs";
import type { AccountType } from "./auth/accountTypeStore";
import { enterShelterShell } from "./shelterTabs";

/** `personal` and an unknown type open the owner shell (admin accounts too); Home's redirect corrects a wrong guess. */
export function shellRouteFor(accountType: AccountType | null): "ownerTabs" | "shelterTabs" {
  return accountType === "shelter" ? "shelterTabs" : "ownerTabs";
}

/** How long a launch may wait for /me when a token has no remembered type (spec §3.3, OQ1). */
export const HOLD_MS = 3000;

export type LaunchPlan = "welcome" | "hold" | "shell";

/** What a launch does: no token opens Welcome; a token with a remembered type opens its shell at once; a token without one holds for /me. */
export function launchPlan(tokens: object | null, accountType: AccountType | null): LaunchPlan {
  if (!tokens) return "welcome";
  return accountType ? "shell" : "hold";
}

type MeAnswer = { ok: boolean; data?: { account_type?: string } };

/**
 * The hold: one /me read, raced against HOLD_MS. A shelter or personal answer is remembered and picks the shell; a failure,
 * a timeout, an admin or a throw opens the owner shell and leaves the cache alone, so Home's redirect corrects it later.
 */
export async function resolveLaunchHold(
  getMe: () => Promise<MeAnswer>,
  remember: (t: AccountType) => Promise<void>
): Promise<"ownerTabs" | "shelterTabs"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), HOLD_MS); });
  try {
    const answer = await Promise.race([getMe().catch(() => null), timeout]);
    const type = answer?.ok ? answer.data?.account_type : undefined;
    if (type === "shelter" || type === "personal") {
      await remember(type);
      return shellRouteFor(type);
    }
    return "ownerTabs";
  } finally {
    clearTimeout(timer);
  }
}

type SignInNav = Parameters<typeof enterOwnerShell>[0] & Parameters<typeof enterShelterShell>[0];

/**
 * Every SIGN-IN lands here instead of in the owner shell (spec §3.2): read /me, remember who this is, enter their shell.
 * `/me` is asked with the access token just issued, because the client's own copy of the tokens may not have caught up with
 * `setTokens` yet. A failure, an admin or a throw enters the owner shell and caches nothing; Home's redirect corrects it later.
 */
export async function enterSignedInShell(
  navigation: SignInNav,
  remember: (t: AccountType) => Promise<void>,
  client: { get: (path: string, opts?: { headers?: Record<string, string> }) => Promise<MeAnswer> },
  access: string
): Promise<void> {
  let type: string | undefined;
  try {
    const me = await client.get("/me", { headers: { Authorization: `Bearer ${access}` } });
    type = me.ok ? me.data?.account_type : undefined;
  } catch { /* offline or down: fall through to the owner shell */ }
  if (type === "shelter" || type === "personal") {
    await remember(type);
    if (type === "shelter") return enterShelterShell(navigation);
  }
  enterOwnerShell(navigation);
}
