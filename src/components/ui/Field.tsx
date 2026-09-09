import { ReactNode, useState } from "react";
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";

import { colors, elevation, radii, spacing, typography } from "../../theme";

type FieldProps = {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  /**
   * The reason this field is wrong, in the user's words.
   * ⚠️ It renders UNDER THIS FIELD, never pooled into a summary at the top of the form. A
   * "3 fields need attention" banner makes people hunt; the message under the offending field
   * does not. This is why `error` is a prop on the field and there is no FormErrorSummary.
   */
  error?: string;
  /** Read-only renders flat and unshadowed — it is not a control, so it should not look raised. */
  readOnly?: boolean;
  /** e.g. a password eye toggle. */
  accessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
} & Pick<TextInputProps, "placeholder" | "keyboardType" | "autoCapitalize" | "secureTextEntry" | "testID" | "autoComplete">;

export function Field({
  label, value, onChangeText, error, readOnly, accessory, style, ...input
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const state = error ? "error" : focused ? "focused" : readOnly ? "readOnly" : "rest";

  return (
    // ⚠️ alignSelf: "stretch" is load-bearing. Without it, a screen whose form column centres
    // its children collapses the field to its intrinsic width — a ~150 pt box that is hard to
    // hit and puts the email and password targets close enough that taps land on the wrong
    // one. That shipped once already. A form field is always full-width.
    <View style={[styles.group, style]}>
      <View style={[styles.box, boxState[state]]}>
        <Text style={[styles.label, state === "error" && styles.labelError, state === "focused" && styles.labelFocused]}>
          {label.toUpperCase()}
        </Text>
        <View style={styles.row}>
          <TextInput
            {...input}
            value={value}
            onChangeText={onChangeText}
            editable={!readOnly}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholderTextColor={colors.muted}
            style={[styles.input, readOnly && styles.inputReadOnly]}
          />
          {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
        </View>
      </View>
      {error ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { alignSelf: "stretch" },
  box: {
    minHeight: 64,
    paddingHorizontal: 18,
    paddingTop: 11,
    paddingBottom: 8,
    borderRadius: radii.field,
    backgroundColor: colors.white,
    ...elevation.soft
  },
  rest: {},
  focused: { borderWidth: 2, borderColor: colors.teal, paddingHorizontal: 16 },
  errored: { borderWidth: 2, borderColor: colors.danger, paddingHorizontal: 16 },
  readOnly: {
    backgroundColor: colors.greyPill,
    shadowOpacity: 0,
    elevation: 0
  },
  label: { ...typography.label, color: colors.muted },
  labelFocused: { color: colors.teal },
  labelError: { color: colors.danger },
  row: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    marginTop: 2,
    padding: 0,
    ...typography.subtitle,
    color: colors.ink
  },
  inputReadOnly: { color: colors.muted },
  accessory: { marginLeft: spacing.sm, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  errorText: {
    ...typography.meta,
    fontWeight: "600",
    color: colors.danger,
    marginTop: 6,
    marginLeft: 6
  }
});

// Kept out of the StyleSheet map above so `error` can name both a box style and the message.
const boxState = {
  rest: styles.rest,
  focused: styles.focused,
  error: styles.errored,
  readOnly: styles.readOnly
} as const;
