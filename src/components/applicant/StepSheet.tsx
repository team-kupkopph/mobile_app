// Spec §2 · the step sheet — the title and current state, then Start / Mark done / Skip (the action
// for the current state is hidden; finalization is finished by Complete) with an optional note the
// adopter sees on their ladder.
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Chip } from "../ui";
import { STAGE_STEP, StageKey } from "../../adoption";
import { stepActions, stepSheetState } from "../../applicant";
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
      {/* R6-F2 · a Modal is its own root, so the keyboard covered the whole sheet. The backdrop is
          flex:1, so with padding it shrinks and the sheet rides up above the keyboard; the
          backdrop still closes the sheet. */}
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet} testID="sheet.applicant.step">
        <Text style={styles.title}>{title}</Text>
        <View style={styles.stateRow} testID="chip.step.state">
          <Chip label={stepSheetState(state).label} tone={stepSheetState(state).tone} dot={false} />
        </View>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(18,33,58,0.32)" },
  sheet: { padding: spacing.lg, paddingBottom: 36, borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, backgroundColor: colors.white },
  title: { color: colors.ink, ...typography.section },
  stateRow: { marginTop: 8, flexDirection: "row" },
  hint: { marginTop: 6, color: colors.muted, ...typography.meta },
  input: { marginTop: 14, minHeight: 72, padding: 14, borderRadius: radii.field, backgroundColor: colors.soft, color: colors.ink, ...typography.body },
  actions: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 }
});
