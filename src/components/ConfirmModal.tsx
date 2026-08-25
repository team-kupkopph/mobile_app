// The app's first reusable modal pattern — a centered confirm/cancel dialog built on React
// Native's own <Modal> (no bottom-sheet dependency, same posture as SignupWall's bottom sheet).
// Kept deliberately generic — no volunteer/cancel-specific copy or logic lives here — so any
// destructive-action confirm (starting with V9's shelter-cancel confirm) can reuse it as-is.
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

export type ConfirmModalTone = "neutral" | "danger";

export type ConfirmModalProps = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  tone?: ConfirmModalTone;
  onConfirm: () => void;
  onCancel: () => void;
};

const colors = {
  ink: "#12213A", muted: "#5F5E5A", white: "#FFFFFF", teal: "#1C6B6B", danger: "#B23B3B"
};

export function ConfirmModal({ visible, title, body, confirmLabel, tone = "neutral", onConfirm, onCancel }: ConfirmModalProps) {
  const confirmColor = tone === "danger" ? colors.danger : colors.teal;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.confirmButton, { backgroundColor: confirmColor }]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.75} style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Never mind</Text>
          </TouchableOpacity>
        </View>
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
  card: {
    width: "100%",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    backgroundColor: colors.white
  },
  title: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center"
  },
  body: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 14,
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
    fontSize: 15,
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
    fontSize: 14,
    fontWeight: "700"
  }
});
