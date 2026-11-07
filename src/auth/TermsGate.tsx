// Review step 7a · the one listener for "the server wants the current terms accepted". Mounted once in App.tsx beside SessionGuard.
// The api client announces the refusal (src/termsGate.ts); this opens the terms in accept mode, unless they are already open.
import { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import { useEffect } from "react";

import { RootStackParamList } from "../navigation/types";
import { setTermsListener } from "../termsGate";

export function TermsGate({ navRef }: { navRef: NavigationContainerRefWithCurrent<RootStackParamList> }) {
  useEffect(() => {
    setTermsListener(() => {
      if (!navRef.isReady() || navRef.getCurrentRoute()?.name === "terms") return;
      navRef.navigate("terms", { accept: true });
    });
    return () => setTermsListener(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navRef is a stable ref object
  }, []);
  return null;
}
