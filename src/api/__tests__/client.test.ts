import { createApi } from "../client";

function mockFetchSequence(responses: Array<{ status: number; body: any }>) {
  let i = 0;
  global.fetch = jest.fn(async () => {
    const r = responses[i++];
    return { status: r.status, ok: r.status < 400, json: async () => r.body } as Response;
  });
}

test("post returns parsed data on 200", async () => {
  mockFetchSequence([{ status: 200, body: { access: "a", refresh: "b" } }]);
  const api = createApi(() => null, async () => {});
  const res = await api.post("/auth/login", { email: "x", password: "y" });
  expect(res.ok).toBe(true);
  expect(res.data.access).toBe("a");
});

test("refreshes once on 401 then retries", async () => {
  mockFetchSequence([
    { status: 401, body: { error: { code: "token_not_valid" } } },
    { status: 200, body: { access: "new" } },            // refresh call
    { status: 200, body: { ok: true } },                 // retried original
  ]);
  const setTokens = jest.fn(async () => {});
  const api = createApi(() => ({ access: "old", refresh: "r" }), setTokens);
  const res = await api.get("/me");
  expect(res.ok).toBe(true);
  expect(setTokens).toHaveBeenCalled();
});
