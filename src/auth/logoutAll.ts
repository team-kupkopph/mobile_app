// Task 10 · "Sign out of all devices" (Feature Spec §3.8). The endpoint has existed since Sprint
// 1 (POST /auth/logout-all) with no caller.

type Api = { post: (path: string, body?: unknown) => Promise<{ ok: boolean; status: number }> };

export type LogoutAllResult = "done" | "offline" | "failed";

/**
 * Revoke every session on the server FIRST, then sign out here.
 *
 * The order is the point. If the request fails (offline, a 500) this device must NOT sign itself
 * out: the person would believe every device is signed out while the others still hold live
 * sessions — the opposite of what they asked for. Nothing changes until the server says so.
 */
export async function signOutEverywhere(api: Api, signOut: () => Promise<void>): Promise<LogoutAllResult> {
  const res = await api.post("/auth/logout-all", {});
  if (res.ok) {
    await signOut();
    return "done";
  }
  return res.status === 0 ? "offline" : "failed";
}
