// Spec §2 · the decline sheet — four reasons worded as the adopter reads them; the button stays
// enabled and says what is missing (design system: never disable submit).
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../ui";
import { DECLINE_REASONS } from "../../applicant";
import { TAP_SLOP } from "../../touch";
import { colors, radii, spacing, typography } from "../../theme";

type Props = { visible: boolean; name: string; busy: boolean; onDecline: (reason: string) => void; onClose: () => void };

export function DeclineSheet({ visible, name, busy, onDecline, onClose }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!visible) {
      setReason(null);
      setMissing(false);
    }
  }, [visible]);
  function submit() {
    if (!reason) { setMissing(true); return; }
    onDecline(reason);
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet} testID="sheet.applicant.decline">
        <Text style={styles.title}>Decline applicant</Text>
        {DECLINE_REASONS.map((r) => (
          <TouchableOpacity key={r.code} hitSlop={TAP_SLOP} accessibilityRole="radio"
            accessibilityState={{ selected: reason === r.code }} testID={`radio.decline.${r.code}`}
            style={styles.option} onPress={() => { setReason(r.code); setMissing(false); }}>
            <View style={[styles.dot, reason === r.code && styles.dotOn]} />
            <Text style={styles.optionLabel}>{r.label}</Text>
          </TouchableOpacity>
        ))}
        {missing ? <Text style={styles.error} testID="text.decline.missing">Choose a reason</Text> : null}
        <Text style={styles.hint}>{name} will be told you won&apos;t be going ahead.</Text>
        <Button label="Decline applicant" variant="destructive" loading={busy} onPress={submit}
          testID="btn.decline.confirm" style={styles.button} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(18,33,58,0.32)" },
  sheet: { padding: spacing.lg, paddingBottom: 36, borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, backgroundColor: colors.white },
  title: { color: colors.ink, ...typography.section, marginBottom: 10 },
  option: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.teal },
  dotOn: { backgroundColor: colors.teal },
  optionLabel: { color: colors.ink, ...typography.subtitle },
  error: { marginTop: 6, color: colors.danger, ...typography.meta, fontWeight: "700" },
  hint: { marginTop: 12, color: colors.muted, ...typography.meta },
  button: { marginTop: 16 }
});
