import { Alert } from "react-native";
import type { NavigationProp } from "@react-navigation/native";

import type { RootStackParamList } from "../navigation/types";
import { NOT_CONFIGURED_MESSAGE, type SocialProvider, signInWithProvider } from "./socialAuth";

/**
 * The one social sign-in handler, shared by every screen that renders the provider row.
 *
 * It lived inside RootNavigator's WelcomeRoute until the Log in screen grew the same row, at
 * which point two copies of "alert on not-configured, navigate on success" would have been
 * one more thing to fix twice. (The tab bar's three private colour tables are the reference
 * case for why that matters — see TabBar.tsx.)
 *
 * ⚠️ NOT SILENT ON ANY BRANCH. `cancelled` is the only quiet exit, because the person
 * cancelled. Everything else either moves the flow on or says why it cannot; a button that
 * does nothing is indistinguishable from a broken one and gets tapped until it is.
 */
export function useSocialSignIn(navigation: NavigationProp<RootStackParamList>) {
  return async function onSocial(provider: SocialProvider) {
    const res = await signInWithProvider(provider);
    if (res.ok) {
      navigation.navigate("accountType", { social: res.identity });
      return;
    }
    if (res.reason === "cancelled") return;
    Alert.alert(
      res.reason === "not_configured" ? "Not available yet" : "Sign-in failed",
      res.reason === "not_configured" ? NOT_CONFIGURED_MESSAGE : "Please try again."
    );
  };
}
