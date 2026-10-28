// US-N5 · Settings. Four grouped cards: ACCOUNT · PRIVACY · YOUR DATA · SUPPORT.
//
// Task 10 · the rows are DATA (`settingsGroups` in src/settings.ts) and this screen only maps a
// row's action to a handler, so what is listed — and which account type sees what — is testable.
//
// This screen did not exist before Sprint 7 despite being designed since Sprint 1, which is
// how `GET/PATCH /me/settings` shipped with zero callers and how §12.6's in-app data rights
// had no surface at all. YOUR DATA is the pair of RA 10173 rights (§12.7): export and delete.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { ScreenHeader } from "../components/ui";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { useAppLock } from "../auth/useAppLock";
import { confirmLogout } from "../auth/confirmLogout";
import { accountIdFromAccessToken } from "../auth/idToken";
import { signOutEverywhere } from "../auth/logoutAll";
import { privacyPolicyUrl } from "../launchGates";
import { useOutbox } from "../outbox/OutboxProvider";
import { RootStackParamList } from "../navigation/types";
import { RowAction, settingsGroups } from "../settings";
import { useLargeText } from "../useLargeText";
import { colors, elevation, radii, typography } from "../theme";

const card = {
  backgroundColor: colors.white, ...elevation.soft,
};

type Props = NativeStackScreenProps<RootStackParamList, "settings">;
export function SettingsScreen({ navigation, route }: Props) {
  // At Dynamic Type AX3 and up a row's label and its value + chevron cannot share a line, so the value drops below the label.
  const large = useLargeText();
  const api = useApi();
  const { signOut, tokens } = useAuth();
  const { queue, discardAllFor } = useOutbox();
  // Plan Task 14b · the biometric lock is a switch on THIS phone; `available` is false/null until the device says it has biometrics enrolled.
  const appLock = useAppLock();
  // F-R3-4 · reached from ShelterProfileScreen. See the param's note in navigation/types.ts.
  const shelter = route.params?.shelter === true;

  const discardThen = (then: () => Promise<void>) =>
    discardAllFor(accountIdFromAccessToken(tokens?.access)).then(then);

  function handleLogout() {
    // One log-out rule for every screen (confirmLogout): with unsent reports the keep-or-discard
    // prompt is the only question; otherwise a plain "Log out?".
    confirmLogout({
      queueCount: queue.length,
      onConfirm: () => { void signOut(); },
      onDiscard: () => { void discardThen(signOut); },
    });
  }

  function runLogoutAll(discardQueue: boolean) {
    // The server revokes first; only on success does this phone sign out (signOutEverywhere).
    const wipe = discardQueue ? () => discardThen(signOut) : signOut;
    void signOutEverywhere(api, wipe).then((result) => {
      if (result === "offline") {
        Alert.alert("You're offline", "Nothing changed. Try again when you're connected.");
      } else if (result === "failed") {
        Alert.alert("That didn't work", "Nothing changed. Try again.");
      }
    });
  }

  function handleLogoutAll() {
    if (queue.length > 0) {
      confirmLogout({ queueCount: queue.length, onConfirm: () => runLogoutAll(false),
                      onDiscard: () => runLogoutAll(true) });
      return;
    }
    Alert.alert("Sign out of all devices?", "You'll be signed out everywhere, including this phone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out everywhere", style: "destructive", onPress: () => runLogoutAll(false) },
    ]);
  }

  // Route names come from `settingsGroups` as data, so the navigator's per-route generics cannot
  // check them here; settingsAccount.test.ts pins every name instead.
  const nav = navigation as unknown as {
    navigate: (name: string, params?: object) => void;
    popTo: (name: string, params?: object) => void;
  };

  function perform(action: RowAction) {
    switch (action.type) {
      case "navigate": nav.navigate(action.name, action.params); return;
      // Back to the EXISTING screen (React Navigation 7: `navigate` would push a second copy).
      case "popTo": nav.popTo(action.name, action.params); return;
      case "logoutAll": handleLogoutAll(); return;
      case "link": void Linking.openURL(action.url); return;
      // Turning it ON asks for one successful scan first (useAppLock); OFF just turns it off.
      case "appLock": void appLock.setEnabled(!appLock.enabled); return;
    }
  }

  const groups = settingsGroups({
    shelter,
    privacyUrl: privacyPolicyUrl(),
  });

  return (
    <View style={styles.screen} testID="screen.settings">
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} align="center" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {groups.map((group) => {
          // The App lock switch is only offered where the device has biometrics enrolled: never a switch that does nothing.
          const rows = group.rows.filter((row) => row.action.type !== "appLock" || appLock.available === true);
          return (
          <View key={group.title}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.card}>
              {rows.map((row, i) => row.action.type === "appLock" ? (
                <View
                  key={row.label}
                  testID="row.settings.app-lock"
                  style={[styles.row, large && styles.rowLarge, i < rows.length - 1 && styles.rowDivided]}
                >
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Switch
                    testID="switch.settings.appLock"
                    value={appLock.enabled}
                    onValueChange={() => perform(row.action)}
                    accessibilityLabel="App lock"
                    trackColor={{ true: colors.teal }}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  // Slugged from the label so a flow can reach a row without depending on
                  // its position in a list that grows — `row.settings.delete-account`.
                  testID={`row.settings.${row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  key={row.label}
                  activeOpacity={0.75}
                  onPress={() => perform(row.action)}
                  accessibilityRole="button"
                  accessibilityLabel={row.value ? `${row.label}, ${row.value}` : row.label}
                  style={[styles.row, large && styles.rowLarge, i < rows.length - 1 && styles.rowDivided]}
                >
                  <Text style={[styles.rowLabel, row.danger && styles.rowLabelDanger]}>
                    {row.label}
                  </Text>
                  <View style={[styles.rowRight, large && styles.rowRightLarge]}>
                    {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          );
        })}

        <TouchableOpacity
          activeOpacity={0.75}
          style={[styles.card, styles.logoutCard]}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Text style={styles.logoutLabel}>Log out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Kupkop PH · v1.0.0 (MVP)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { padding: 20, paddingBottom: 48 },
  groupTitle: { ...typography.meta, fontWeight: "700", color: colors.muted, letterSpacing: 1.4, marginBottom: 8, marginTop: 20 },
  card: { borderRadius: radii.tile, ...card },
  row: { minHeight: 56, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowDivided: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.subtitle, fontWeight: "600", color: colors.ink },
  rowLabelDanger: { color: colors.danger },
  rowRight: { flexDirection: "row", alignItems: "center" },
  rowLarge: { flexDirection: "column", alignItems: "flex-start", paddingVertical: 12 },
  rowRightLarge: { alignSelf: "stretch", justifyContent: "space-between" },
  rowValue: { flexShrink: 1, ...typography.meta, color: colors.muted, marginRight: 8 },
  chevron: { fontSize: 19, fontWeight: "700", color: colors.muted },
  logoutCard: { marginTop: 28, minHeight: 56, alignItems: "center", justifyContent: "center" },
  logoutLabel: { ...typography.subtitle, fontWeight: "700", color: colors.danger },
  version: { textAlign: "center", ...typography.meta, color: colors.muted, marginTop: 24 },
});
