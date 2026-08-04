import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import { createApi } from "./client";

export function useApi() {
  const { tokens, setTokens } = useAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- memoized on tokens only; setTokens is stable in effect (closes over setState)
  return useMemo(() => createApi(() => tokens, setTokens), [tokens]);
}
