// AD8 · the Inquire bottom sheet: a message plus a few quick answers the poster screens with.
// Native <Modal>, no bottom-sheet dependency (same posture as ConfirmModal and SignupWall).
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

import { ApplicationState, EMPTY_APPLICATION, HOME_TYPES, SHARING_NOTE, inquiryBody, yesNoIndex } from "../inquireApplication";
import { TAP_SLOP } from "../touch";
import { colors, radii, spacing, typography } from "../theme";
import { Button, Field, SegmentedControl } from "./ui";

type Props = {
  visible: boolean;
  petName: string;
  posterName: string;
  sending: boolean;
  onSend: (body: ReturnType<typeof inquiryBody>) => void;
  onCancel: () => void;
};

export function InquireSheet({ visible, petName, posterName, sending, onSend, onCancel }: Props) {
  const [message, setMessage] = useState("");
  const [app, setApp] = useState<ApplicationState>(EMPTY_APPLICATION);
  const set = (patch: Partial<ApplicationState>) => setApp((a) => ({ ...a, ...patch }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={styles.sheet} testID="sheet.inquire">
          {/* Run 9 · at AX5 the sheet's own text fills the room above the keyboard, so a focused field sat behind it and
              could not be scrolled to. The inset makes the scroll view move for the keyboard (same fix as the auth screens). */}
          <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <Text style={styles.title}>Ask about {petName}</Text>
            <Text style={styles.sub}>{posterName} will see this when they review your inquiry. Everything here is optional.</Text>

            <Field label="A message (optional)" value={message} onChangeText={setMessage} multiline
              testID="field.inquire.message" placeholder="Hi! I'd love to meet…" />

            <Text style={styles.label}>Where would they live?</Text>
            <View style={styles.chipRow}>
              {HOME_TYPES.map((h) => {
                const on = app.homeType === h.code;
                return (
                  <TouchableOpacity key={h.code} activeOpacity={0.85} accessibilityRole="button"
                    accessibilityState={{ selected: on }} testID={`btn.inquire.home.${h.code}`}
                    style={[styles.pill, on && styles.pillOn]} onPress={() => set({ homeType: on ? null : h.code })}>
                    <Text style={[styles.pillText, on && styles.pillTextOn]}>{h.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Do you rent?</Text>
            <SegmentedControl segments={["No", "Yes"]} index={yesNoIndex(app.rents)}
              onChange={(i) => set({ rents: i === 1, landlordOk: i === 1 ? app.landlordOk : null })}
              testID="seg.inquire.rents" />
            {app.rents === true ? (
              <>
                <Text style={styles.label}>Does your landlord allow pets?</Text>
                <SegmentedControl segments={["No", "Yes"]} index={yesNoIndex(app.landlordOk)}
                  onChange={(i) => set({ landlordOk: i === 1 })} />
              </>
            ) : null}

            <Field label="Other pets at home (optional)" value={app.otherPets}
              onChangeText={(t) => set({ otherPets: t })} maxLength={500} placeholder="One cat, 4 years" />
            <Field label="Experience with animals (optional)" value={app.experience}
              onChangeText={(t) => set({ experience: t })} maxLength={500} multiline />
            <Field label="Daily schedule (optional)" value={app.schedule}
              onChangeText={(t) => set({ schedule: t })} maxLength={500} placeholder="Work from home Mon–Thu" />

            <Text style={styles.note}>{SHARING_NOTE}</Text>
            <Button label="Send inquiry" loading={sending} testID="btn.inquire.send" style={styles.send}
              onPress={() => onSend(inquiryBody(message, app))} />
            <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" style={styles.cancel} onPress={onCancel}
              testID="btn.inquire.cancel">
              <Text style={styles.cancelText}>Not now</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  // maxHeight keeps the sheet on screen at AX5; the content scrolls inside it.
  sheet: { maxHeight: "88%", backgroundColor: colors.page, borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card },
  content: { paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: 32 },
  title: { color: colors.ink, ...typography.title },
  sub: { marginTop: 6, marginBottom: 8, color: colors.muted, ...typography.meta, lineHeight: 18 },
  label: { marginTop: 18, marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  pillOn: { backgroundColor: colors.soft, borderColor: colors.teal },
  pillText: { color: colors.ink, ...typography.strong, fontWeight: "600" },
  pillTextOn: { color: colors.tealDark, fontWeight: "800" },
  note: { marginTop: 18, color: colors.muted, ...typography.meta, lineHeight: 18 },
  send: { marginTop: 14 },
  cancel: { alignSelf: "center", marginTop: 8, minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  cancelText: { color: colors.muted, ...typography.strong, fontWeight: "700" }
});
