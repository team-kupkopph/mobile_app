// Review step 7c/7d · "Report this person" and "Block", side by side wherever a person is shown.
//
// Both stores require them (Apple 1.2: report and block; Google Play: report AND block, "separate, clearly labelled").
// They are two controls, never one button doing both. A guest sees neither: reporting and blocking need an account, and
// the screen's own "Report this" link already raises the sign-up wall for them.
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { blockConfirmCopy, blockPerson, type PersonRef } from "../moderation";
import { TAP_SLOP } from "../touch";
import { colors, dangerOnSurface, typography } from "../theme";
import { ConfirmModal } from "./ConfirmModal";

type Props = {
  person: PersonRef;
  /** Opens the report form for this person. The screen owns navigation, so this component needs no route types. */
  onReport: () => void;
  /** Called once the block has gone through, after the person has read that it did. */
  onBlocked?: () => void;
  testID: string;
};

export function PersonActions({ person, onReport, onBlocked, testID }: Props) {
  const api = useApi();
  const { tokens } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  if (tokens === null) return null;

  const copy = blockConfirmCopy(person.name);

  async function block() {
    if (busy) return;
    setBusy(true);
    const outcome = await blockPerson(api, person);
    setBusy(false);
    setConfirming(false);
    if (!outcome.ok) { Alert.alert("Could not block", outcome.message); return; }
    setBlocked(true);
    Alert.alert("Blocked", `${person.name} is blocked. You can undo this in Settings.`,
      [{ text: "OK", onPress: onBlocked }]);
  }

  return (
    <>
      <View style={styles.row} testID={testID}>
        <TouchableOpacity hitSlop={TAP_SLOP} onPress={onReport} accessibilityRole="button"
          accessibilityLabel={`Report ${person.name}`} testID={`${testID}.report`}>
          <Text style={styles.link}>Report this person</Text>
        </TouchableOpacity>
        {blocked ? (
          // Done is not a button. On a screen you stay on (the applicant), "Block" would otherwise stay offered for
          // someone already blocked. Found on the simulator.
          <Text style={styles.link} accessibilityLabel={`${person.name} is blocked`} testID={`${testID}.blocked`}>Blocked</Text>
        ) : (
          <TouchableOpacity hitSlop={TAP_SLOP} onPress={() => setConfirming(true)} accessibilityRole="button"
            accessibilityLabel={`Block ${person.name}`} testID={`${testID}.block`}>
            <Text style={[styles.link, styles.block]}>Block</Text>
          </TouchableOpacity>
        )}
      </View>
      <ConfirmModal visible={confirming} title={copy.title} body={copy.body}
        confirmLabel={busy ? "Blocking…" : copy.confirm} tone="danger"
        onConfirm={() => { void block(); }} onCancel={() => setConfirming(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 24, marginTop: 14 },
  link: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  // Danger text sits on its own tint (backdropContrast): the token is a style to spread, not a colour.
  block: { color: colors.danger, ...dangerOnSurface }
});
