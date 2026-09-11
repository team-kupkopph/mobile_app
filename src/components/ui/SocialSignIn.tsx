import { StyleSheet, Text, View } from "react-native";

import type { SocialProvider } from "../../auth/socialAuth";
import { AppleIcon, GoogleIcon } from "../AppIcons";
import { colors, elevation, pill, typography } from "../../theme";
import { PressScale } from "./PressScale";

/**
 * "or continue with" → [ Google ] [ Apple ]. The canvas's social row, as drawn on the Log in
 * artboard (design/mobile-v3/SignIn.dc.html) and nowhere else.
 *
 * ⚠️ APPLE AND GOOGLE ARE A PAIR, NOT A LIST. App Store Review Guideline 4.8 requires Sign in
 * with Apple wherever a third-party sign-in is offered, so a screen must show both or neither.
 * This component takes no `providers` prop for that reason: there is no supported way to
 * render Google alone. Today neither is wired (see socialAuth.ts — blocked on the S0-05 /
 * S0-06 paperwork, not on code), so both buttons say so honestly when tapped, via the same
 * handler. When the credentials land they must land TOGETHER: shipping Google before Apple
 * is a review rejection, not a partial feature.
 *
 * Geometry is the canvas's: two pills of `height: 52px; border-radius: 26px; gap: 9px`
 * between mark and label, `gap: 12px` between the pills, `--sh-soft`, label 15 / 700; the
 * divider is a 1 px `#E1E3DC` rule either side of a 13 pt muted caption, 26 above and 18
 * below. The mark is drawn at the artboard's 19 px.
 */

type SocialSignInProps = {
  onPress: (provider: SocialProvider) => void;
  /** e.g. "signin" → testIDs `btn.signin.google` / `btn.signin.apple`. */
  testIDPrefix: string;
  /** The caption between the rules. The canvas says "or continue with". */
  caption?: string;
};

const HEIGHT = 52;
const MARK = 19;

const PROVIDERS: ReadonlyArray<{ id: SocialProvider; label: string }> = [
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" }
];

export function SocialSignIn({ onPress, testIDPrefix, caption = "or continue with" }: SocialSignInProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={styles.rule} />
        <Text style={styles.caption}>{caption}</Text>
        <View style={styles.rule} />
      </View>
      <View style={styles.row}>
        {PROVIDERS.map(({ id, label }) => (
          <PressScale
            key={id}
            onPress={() => onPress(id)}
            accessibilityRole="button"
            accessibilityLabel={`Continue with ${label}`}
            testID={`btn.${testIDPrefix}.${id}`}
            style={styles.pill}
          >
            {id === "google" ? (
              <GoogleIcon color={colors.ink} size={MARK} />
            ) : (
              <AppleIcon color={colors.ink} size={MARK} />
            )}
            <Text style={styles.label}>{label}</Text>
          </PressScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // ⚠️ THE ROW CLAIMS ITS OWN WIDTH. Found on device: Log in centres its children
    // (`alignItems: "center"`), so without this the row shrank to its content and the two
    // pills — `flexGrow: 1` with nothing to grow into — collapsed onto each other in the
    // middle of the screen. Welcome's sheet does not centre, so the same code looked right
    // there. A shared component must not depend on which parent it lands in.
    alignSelf: "stretch"
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 26
  },
  rule: {
    flexGrow: 1,
    height: 1,
    // The artboard rules are #E1E3DC; `border` is #E3E1D9, two units off per channel and
    // the same grey to the eye. Absorbed, as the colour migration absorbed its near-greys.
    backgroundColor: colors.border
  },
  caption: {
    ...typography.meta,
    color: colors.muted
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18
  },
  pill: {
    flexGrow: 1,
    flexBasis: 0,
    height: HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    // pill(), not radii.hero — it is half the height and the two move together.
    borderRadius: pill(HEIGHT),
    backgroundColor: colors.white,
    ...elevation.soft
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink
  }
});
