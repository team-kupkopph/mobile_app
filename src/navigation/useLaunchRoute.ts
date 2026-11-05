// The route the stack opens on (spec 2026-11-04-account-aware-first-screen-design.md §3.2-3.3). The plan is decided ONCE, on
// the first render where hydration is done: a sign-in later in the session sets tokens too, and re-deciding then would blank
// the stack in the middle of it. null = still deciding (RootNavigator renders nothing, as it does while hydrating).
import { useEffect, useRef, useState } from "react";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { launchPlan, resolveLaunchHold, shellRouteFor } from "../entryShell";

export type LaunchRoute = "welcome" | "ownerTabs" | "shelterTabs";

export function useLaunchRoute(): LaunchRoute | null {
  const { tokens, isReady, accountType, setAccountType } = useAuth();
  const api = useApi();
  const [route, setRoute] = useState<LaunchRoute | null>(null);
  const decided = useRef(false);

  useEffect(() => {
    if (!isReady || decided.current) return;
    decided.current = true;
    const plan = launchPlan(tokens, accountType);
    if (plan === "welcome") setRoute("welcome");
    else if (plan === "shell") setRoute(shellRouteFor(accountType));
    else void resolveLaunchHold(() => api.get("/me"), setAccountType).then(setRoute);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- decided once; later token changes are sign-ins the stack handles itself
  }, [isReady]);

  return route;
}
