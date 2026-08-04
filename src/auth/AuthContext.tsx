import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState } from "react";

type Tokens = { access: string; refresh: string } | null;
type AuthValue = {
  tokens: Tokens;
  isReady: boolean;
  setTokens: (t: Tokens) => Promise<void>;
  signOut: () => Promise<void>;
  // City has no GET endpoint (only PUT /me/location) — M5 caches the last value the user picked
  // here, alongside tokens, so Home/Profile can both read it without re-deriving it from /me.
  city: string | null;
  setCity: (c: string | null) => Promise<void>;
};

const KEY = "kupkop.tokens";
const CITY_KEY = "kupkop.city";
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokensState] = useState<Tokens>(null);
  const [city, setCityState] = useState<string | null>(null);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    Promise.all([SecureStore.getItemAsync(KEY), SecureStore.getItemAsync(CITY_KEY)])
      .then(([rawTokens, rawCity]) => {
        try {
          if (rawTokens) setTokensState(JSON.parse(rawTokens));
        } catch {
          // corrupt entry — treat as signed out
        }
        if (rawCity) setCityState(rawCity);
      })
      .finally(() => setReady(true));
  }, []);

  async function setTokens(t: Tokens) {
    setTokensState(t);
    if (t) await SecureStore.setItemAsync(KEY, JSON.stringify(t));
    else await SecureStore.deleteItemAsync(KEY);
  }

  async function setCity(c: string | null) {
    setCityState(c);
    if (c) await SecureStore.setItemAsync(CITY_KEY, c);
    else await SecureStore.deleteItemAsync(CITY_KEY);
  }

  async function signOut() {
    await setTokens(null);
    await setCity(null); // don't leak the previous account's city to whoever signs in next
  }

  return (
    <AuthContext.Provider value={{ tokens, isReady, setTokens, signOut, city, setCity }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
