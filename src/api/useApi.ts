import { useMemo, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { createApi } from "./client";

export function useApi() {
  const { tokens, setTokens } = useAuth();
  // ⚠️ The client reads the tokens through a ref, at CALL time. A getter closing over this render's
  // `tokens` pins the client to the session it was built with, and screens legitimately keep an early
  // client alive in a `useCallback(..., [])` (the You tab's focus refetch). When the server replaces the
  // session's tokens (email or password change), that client sent the revoked pair, 401'd, failed to
  // refresh, and signed the person out. Identity still changes with `tokens`, so effects keyed on the
  // client behave as before. See __tests__/useApiTokens.test.ts.
  const latest = useRef(tokens);
  latest.current = tokens;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- memoized on tokens only; setTokens is stable in effect (closes over setState)
  return useMemo(() => createApi(() => latest.current, setTokens), [tokens]);
}
