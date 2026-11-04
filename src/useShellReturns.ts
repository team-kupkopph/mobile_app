import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";

// SQ5 follow-up · counts the times a tab shell came back into view after a pushed screen covered it, for
// `useRefreshOnFocus` (a new count means "stale now": the pushed screen is where things change). The shelter navigator has its
// own inline copy of this (it shipped first and is left untouched); a later change can point it here.
export function useShellReturns(): number {
  const stack = useNavigation();
  const [returns, setReturns] = useState(0);
  const away = useRef(false);
  useEffect(() => {
    const offBlur = stack.addListener("blur", () => { away.current = true; });
    const offFocus = stack.addListener("focus", () => {
      if (!away.current) return;
      away.current = false;
      setReturns((n) => n + 1);
    });
    return () => { offBlur(); offFocus(); };
  }, [stack]);
  return returns;
}
