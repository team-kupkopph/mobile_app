// The app's first reusable modal pattern — a centered confirm/cancel dialog built on React
// Native's own <Modal> (no bottom-sheet dependency, same posture as SignupWall's bottom sheet).
// Kept deliberately generic — no volunteer/cancel-specific copy or logic lives here — so any
// destructive-action confirm (starting with V9's shelter-cancel confirm) can reuse it as-is.
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { colors, typography } from "../theme";
import { Card } from "./ui";

export type ConfirmModalTone = "neutral" | "warning" | "danger";

export type ConfirmModalProps = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  tone?: ConfirmModalTone;
  onConfirm: () => void;
  onCancel: () => void;
  // Opt-in third affordance (e.g. V9's "Decline instead" on the reapprove-confirm dialog).
  // When provided it REPLACES the default "Never mind" text — the dialog still dismisses via
  // backdrop tap / hardware back (both still call onCancel), so no action is lost, only the
  // visible label changes. Omitted by every other caller, so their rendering is unchanged.
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function ConfirmModal({
  visible, title, body, confirmLabel, tone = "neutral", onConfirm, onCancel, secondaryLabel, onSecondary
}: ConfirmModalProps) {
  // P5 · Task 4 moves the whole component onto theme tokens.
  const confirmColor =
    tone === "danger" ? colors.danger : tone === "warning" ? colors.warningStrong : colors.teal;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <Card style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.confirmButton, { backgroundColor: confirmColor }]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>

          {secondaryLabel && onSecondary ? (
            <TouchableOpacity activeOpacity={0.75} style={styles.cancelButton} onPress={onSecondary}>
              <Text style={[styles.cancelText, styles.secondaryText]}>{secondaryLabel}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.75} style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Never mind</Text>
            </TouchableOpacity>
          )}
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "rgba(18, 33, 58, 0.45)"
  },
  // `Card` supplies background, radius and elevation; this keeps the modal's own padding,
  // which is taller top/bottom than Card's default `spacing.md` on every side.
  card: {
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22
  },
  title: {
    color: colors.ink,
    ...typography.section,
    textAlign: "center"
  },
  body: {
    marginTop: 10,
    color: colors.muted,
    ...typography.meta,
    lineHeight: 20,
    textAlign: "center"
  },
  confirmButton: {
    height: 52,
    marginTop: 22,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center"
  },
  confirmText: {
    color: colors.white,
    ...typography.strong,
    fontWeight: "800"
  },
  cancelButton: {
    height: 44,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelText: {
    color: colors.muted,
    ...typography.meta,
    fontWeight: "700"
  },
  secondaryText: {
    color: colors.danger,
    fontWeight: "800"
  }
});
