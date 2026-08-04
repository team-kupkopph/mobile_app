import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState } from "react";

type Tokens = { access: string; refresh: string } | null;
type AuthValue = { tokens: Tokens; isReady: boolean; setTokens: (t: Tokens) => Promise<void>; signOut: () => Promise<void> };

const KEY = "kupkop.tokens";
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokensState] = useState<Tokens>(null);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(KEY).then((raw) => {
      try {
        if (raw) setTokensState(JSON.parse(raw));
      } catch {
        // corrupt entry — treat as signed out
      } finally {
        setReady(true);
      }
    });
  }, []);

  async function setTokens(t: Tokens) {
    setTokensState(t);
    if (t) await SecureStore.setItemAsync(KEY, JSON.stringify(t));
    else await SecureStore.deleteItemAsync(KEY);
  }

  return (
    <AuthContext.Provider value={{ tokens, isReady, setTokens, signOut: () => setTokens(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
