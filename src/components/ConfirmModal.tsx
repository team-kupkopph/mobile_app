// The app's first reusable modal pattern — a centered confirm/cancel dialog built on React
// Native's own <Modal> (no bottom-sheet dependency, same posture as SignupWall's bottom sheet).
// Kept deliberately generic — no volunteer/cancel-specific copy or logic lives here — so any
// destructive-action confirm (starting with V9's shelter-cancel confirm) can reuse it as-is.
import { ReactNode } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
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
  // The quiet way out's label ("Never mind" unless named, e.g. My donations' "Keep pledge"). Unlike
  // `secondaryLabel` it keeps the muted style: it is the safe choice, not a destructive alternative.
  cancelLabel?: string;
  // Opt-in content between the body and the buttons (e.g. the shelter's received-quantity stepper).
  // Omitted by every other caller, so their rendering is unchanged.
  children?: ReactNode;
};

export function ConfirmModal({
  visible, title, body, confirmLabel, tone = "neutral", onConfirm, onCancel, secondaryLabel, onSecondary, children,
  cancelLabel = "Never mind"
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
          {/* At AX5 a dialog's text can outgrow the screen; a short one is the same height as before, a tall one scrolls. */}
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {children}

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
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
          )}
          </ScrollView>
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
    maxHeight: "90%",
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
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    minHeight: 44,
    paddingVertical: 10,
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
