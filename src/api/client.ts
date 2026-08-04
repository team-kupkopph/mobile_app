const BASE = process.env.EXPO_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";

type Tokens = { access: string; refresh: string } | null;
export type ApiResult<T = any> = { ok: boolean; status: number; data: T };

export function createApi(getTokens: () => Tokens, setTokens: (t: Tokens) => Promise<void>) {
  async function raw(method: string, path: string, body?: any, retry = true): Promise<ApiResult> {
    const tokens = getTokens();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;
    const res = await fetch(`${BASE}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    });
    const data = res.status === 204 ? {} : await res.json();
    if (res.status === 401 && retry && tokens?.refresh) {
      const r = await fetch(`${BASE}/auth/refresh`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: tokens.refresh }),
      });
      if (r.ok) {
        const rd = await r.json();
        await setTokens({ access: rd.access, refresh: tokens.refresh });
        return raw(method, path, body, false);
      }
      await setTokens(null);
    }
    return { ok: res.status < 400, status: res.status, data };
  }
  return {
    get: (p: string) => raw("GET", p),
    post: (p: string, b?: any) => raw("POST", p, b),
    patch: (p: string, b?: any) => raw("PATCH", p, b),
    put: (p: string, b?: any) => raw("PUT", p, b),
  };
}
