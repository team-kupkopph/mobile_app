// Which shell a signed-in person opens on (spec 2026-11-04-account-aware-first-screen-design.md §3.2). The one place
// that decides it, as shelterTabs.ts and appTabs.ts are the one place that knows their tab routes.
import type { AccountType } from "./auth/accountTypeStore";

/** `personal` and an unknown type open the owner shell (admin accounts too); Home's redirect corrects a wrong guess. */
export function shellRouteFor(accountType: AccountType | null): "ownerTabs" | "shelterTabs" {
  return accountType === "shelter" ? "shelterTabs" : "ownerTabs";
}
