import { Alert } from "react-native";

/** D14 · Log out with unsent reports on the phone: keep them for this account's next sign-in, or
 *  discard them. Nothing is ever sent as the next person who signs in (C16). */
export function confirmSignOutWithQueue(count: number, onKeep: () => void, onDiscard: () => void) {
  if (count === 0) { onKeep(); return; }
  Alert.alert(
    count === 1 ? "1 report hasn't sent yet" : `${count} reports haven't sent yet`,
    "Keep them on this phone and they'll send the next time you sign in, or discard them now.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onDiscard },
      { text: "Keep for next time", onPress: onKeep }
    ]
  );
}
