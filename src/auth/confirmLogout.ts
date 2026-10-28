// Task 10 · ONE log-out rule. Settings, the owner's You tab and the shelter's You tab each had
// their own: Settings asked "Log out?", the owner tab asked nothing unless reports were unsent,
// the shelter tab asked nothing at all. A person should get the same question wherever they tap.
import { Alert } from "react-native";

import { confirmSignOutWithQueue } from "../outbox/signOutGuard";

type Options = {
  /** How many reports are queued on the phone and unsent. */
  queueCount: number;
  /** Log out, keeping any unsent reports for this account's next sign-in. */
  onConfirm: () => void;
  /** Log out and throw the unsent reports away (only offered when there are some). */
  onDiscard: () => void;
};

/**
 * With unsent reports the ONLY question is keep-or-discard (it has its own Cancel): never
 * "Log out?" first and then a second alert from its button (PR3-F8). Otherwise one plain
 * confirmation. Asking never logs out by itself — only a button press does.
 */
export function confirmLogout({ queueCount, onConfirm, onDiscard }: Options) {
  if (queueCount > 0) {
    confirmSignOutWithQueue(queueCount, onConfirm, onDiscard);
    return;
  }
  Alert.alert("Log out?", "You can sign back in any time.", [
    { text: "Cancel", style: "cancel" },
    { text: "Log out", style: "destructive", onPress: onConfirm },
  ]);
}
