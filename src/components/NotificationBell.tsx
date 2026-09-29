/**
 * The header bell — the account's way into its notification feed (`notifications`).
 *
 * F-R3-4 · drawn by the owner Home AND the shelter Home. It used to live only in HomeScreen,
 * so the shelter shell had no bell at all: every shelter notification was push-only, and a
 * dismissed push (or a denied permission) meant the shelter never saw it. One component so
 * the two headers can't drift into two different controls.
 *
 * `hasUnread` is the caller's — each Home refetches GET /me/notifications on focus, which is
 * what clears the dot on return from NotificationsScreen (it marks everything read on open).
 */
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { BellIcon } from "./AppIcons";
import { colors } from "../theme";

export function NotificationBell({ hasUnread, onPress }: { hasUnread: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.bellButton}
      activeOpacity={0.75}
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <BellIcon color="#12213A" />
      {hasUnread ? <View style={styles.bellDot} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  bellDot: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#B23B3B",
    borderWidth: 1.5,
    borderColor: "#FFFFFF"
  }
});
