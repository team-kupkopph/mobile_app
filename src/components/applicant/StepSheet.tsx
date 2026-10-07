// Spec §2 · the step sheet — Start / Mark done / Skip (current state hidden; finalization is
// finished by Complete) with an optional note the adopter sees on their ladder.
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../ui";
import { STAGE_STEP, StageKey } from "../../adoption";
import { stepActions } from "../../applicant";
import { colors, radii, spacing, typography } from "../../theme";

type Props = {
  stageKey: string | null; state: string; name: string; pet: string; busy: boolean;
  onMove: (state: string, note: string) => void; onClose: () => void;
};

export function StepSheet({ stageKey, state, name, pet, busy, onMove, onClose }: Props) {
  const [note, setNote] = useState("");
  useEffect(() => { setNote(""); }, [stageKey]);
  if (!stageKey) return null;
  const title = STAGE_STEP[stageKey as StageKey]?.title ?? stageKey;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet} testID="sheet.applicant.step">
        <Text style={styles.title}>{title}</Text>
        {stageKey === "finalization" ? (
          <Text style={styles.hint}>Use Complete adoption when {pet} goes home.</Text>
        ) : null}
        <TextInput value={note} onChangeText={setNote} placeholder={`Add a note for ${name} (optional)`}
          placeholderTextColor={colors.placeholder} style={styles.input} multiline testID="input.step.note" />
        <View style={styles.actions}>
          {stepActions(stageKey, state).map((a) => (
            <Button key={a.state} label={a.label} size="small" variant={a.state === "done" ? "primary" : "secondary"}
              loading={busy} onPress={() => onMove(a.state, note.trim())} testID={`btn.step.${a.state}`} />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(18,33,58,0.32)" },
  sheet: { padding: spacing.lg, paddingBottom: 36, borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, backgroundColor: colors.white },
  title: { color: colors.ink, ...typography.section },
  hint: { marginTop: 6, color: colors.muted, ...typography.meta },
  input: { marginTop: 14, minHeight: 72, padding: 14, borderRadius: radii.field, backgroundColor: colors.soft, color: colors.ink, ...typography.body },
  actions: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 }
});
