// Bounces an authed user back to `welcome` when their session ends mid-use (refresh failure or
// any other tokens -> null transition — see the comment in AuthContext.setTokens). The single
// -stack navigator (RootNavigator) only gates auth at initialRouteName on mount, so without this
// a user stranded on Home/Profile/etc. after a silent session expiry stays there with every API
// call failing until they relaunch the app. Screens that legitimately run with tokens === null
// (guest browsing, the signup/signin/recovery flow) are excluded so this doesn't interrupt them.
import { useEffect } from "react";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";

import { useAuth } from "./AuthContext";
import type { RootStackParamList } from "../navigation/types";

const AUTH_SCREENS: Array<keyof RootStackParamList> = [
  "welcome",
  "signin",
  "signup",
  "accountType",
  "otp",
  "otpLocked",
  "forgotPassword",
  "resetOtp",
  "resetPassword",
  "passwordChanged",
  "homeGuest",
  "support",
];

type Props = {
  navRef: NavigationContainerRefWithCurrent<RootStackParamList>;
};

export function SessionGuard({ navRef }: Props) {
  const { tokens, isReady } = useAuth();

  useEffect(() => {
    if (!isReady || tokens !== null || !navRef.isReady()) return;
    const current = navRef.getCurrentRoute()?.name;
    if (current && !AUTH_SCREENS.includes(current as keyof RootStackParamList)) {
      navRef.reset({ index: 0, routes: [{ name: "welcome" }] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navRef is a stable ref object
  }, [tokens, isReady]);

  return null;
}
