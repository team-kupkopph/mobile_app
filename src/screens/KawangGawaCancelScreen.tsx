// US-V8 · cancel a shift (K13: the modal says free/late/withdraw BEFORE the volunteer commits,
// instead of a single "cancelling closer to the start time will be recorded" sentence that never
// said which one this cancellation actually was).
//
// `cancelVariant` (src/volunteer.ts) is a PREVIEW only — it is what the client believes right
// now, from `cancel_cutoff_at`. `was_late` is decided server-side by POST /signups/{id}/cancel,
// never a device clock, so the result phase renders `lateCancelCopy(res.data.was_late)` straight
// from the server response even if it disagrees with the preview the modal showed.
//
// The screen only gets a `signupId` in its route params (same as Check-in), so it fetches
// `/me/signups` on mount and does the same upcoming/requested/history lookup Check-in does —
// that's the only place `cancel_cutoff_at` and `status` (needed for `cancelVariant`) live.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { AlertIcon, CheckIcon } from "../components/AppIcons";
import { ConfirmModal, ConfirmModalTone } from "../components/ConfirmModal";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { CancelVariant, MySignupItem, MySignups, cancelVariant, lateCancelCopy } from "../volunteer";
import { colors, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";

type Phase = "confirm" | "submitting" | "result";

type Outcome = { variant: CancelVariant; wasLate: boolean };

const VARIANT_COPY: Record<CancelVariant, { title: string; body: string; confirmLabel: string; tone: ConfirmModalTone }> = {
  request: {
    title: "Withdraw your request?",
    body: "The shelter hasn't confirmed you yet, so nothing is recorded.",
    confirmLabel: "Withdraw request",
    tone: "neutral",
  },
  free: {
    title: "Cancel this shift?",
    body: "You're cancelling more than 12 hours ahead — this is free, and the shelter will be told.",
    confirmLabel: "Cancel shift",
    tone: "neutral",
  },
  late: {
    title: "Cancel this late?",
    body: "It's less than 12 hours before the shift. You can still cancel, and it will be noted on your record. It won't count as a no-show.",
    confirmLabel: "Cancel anyway",
    tone: "warning",
  },
};

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawaCancel">;

export function KawangGawaCancelScreen({ navigation, route }: Props) {
  const api = useApi();
  const { signupId } = route.params;

  const [data, setData] = useState<MySignups | null>(null);
  // US-R4 pattern (see Check-in): the RESULT of the fetch, so `loadState` can tell offline/
  // error/gone apart instead of collapsing everything into "something went wrong".
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [phase, setPhase] = useState<Phase>("confirm");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setRes(null);
    return api.get("/me/signups").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setData(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  useEffect(() => { load(); }, [load]);

  const item: MySignupItem | undefined = data
    ? [...data.upcoming, ...data.requested, ...data.history].find((i) => i.signup_id === signupId)
    : undefined;
  const variant: CancelVariant | undefined = item ? cancelVariant(item) : undefined;

  async function onConfirm() {
    if (!variant) return;
    setPhase("submitting");
    setErrorMessage(undefined);
    const r = await api.post(`/signups/${signupId}/cancel`);
    if (!r.ok) {
      const code = r.data?.error?.code;
      if (r.status === 409 && code === "not_cancellable") {
        setErrorMessage("This shift can no longer be cancelled.");
      } else {
        setErrorMessage(r.data?.error?.message ?? "Couldn't cancel this shift. Try again.");
      }
      setPhase("confirm");
      return;
    }
    setOutcome({ variant, wasLate: !!r.data.was_late });
    setPhase("result");
  }

  const resultTone = outcome && outcome.variant !== "request" && outcome.wasLate
    ? { bg: colors.warningBg, fg: colors.warningStrong }
    : { bg: colors.successBg, fg: colors.success };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Cancel shift" onBack={() => navigation.goBack()} />

      {phase === "confirm" && !item && (
        <View style={styles.centerFill}>
          <LoadStateView
            state={loadState(res, 0)}
            emptyTitle="Not found"
            emptyBody="This signup couldn't be found."
            subject="signup"
            onRetry={load}
            onBack={() => navigation.goBack()}
          />
        </View>
      )}

      {phase === "submitting" && (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.teal} />
        </View>
      )}

      {phase === "result" && !!outcome && (
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: resultTone.bg }]}>
            {outcome.variant !== "request" && outcome.wasLate
              ? <AlertIcon color={resultTone.fg} size={40} />
              : <CheckIcon color={resultTone.fg} size={32} />}
          </View>

          <Text style={styles.heading}>
            {outcome.variant === "request" ? "Request withdrawn" : "Shift cancelled"}
          </Text>
          <Text style={styles.subheading}>
            {outcome.variant === "request"
              ? "Your request has been withdrawn. Nothing was recorded."
              : lateCancelCopy(outcome.wasLate)}
          </Text>

          <Button
            label="Back to my shifts"
            onPress={() => navigation.navigate("kawanggawa", { tab: "mine" })}
            style={styles.primaryButton}
          />
        </View>
      )}

      {phase === "confirm" && !!item && !!errorMessage && (
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.dangerBg }]}>
            <AlertIcon color={colors.danger} size={40} />
          </View>
          <Text style={styles.heading}>Couldn't cancel</Text>
          <Text style={styles.subheading}>{errorMessage}</Text>

          <Button label="Back" onPress={() => navigation.goBack()} style={styles.primaryButton} />
        </View>
      )}

      {!!variant && (
        <ConfirmModal
          visible={phase === "confirm" && !!item && !errorMessage}
          title={VARIANT_COPY[variant].title}
          body={VARIANT_COPY[variant].body}
          confirmLabel={VARIANT_COPY[variant].confirmLabel}
          tone={VARIANT_COPY[variant].tone}
          onConfirm={onConfirm}
          onCancel={() => navigation.goBack()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 60, alignItems: "center" },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  heading: { marginTop: 22, color: colors.ink, ...typography.hero },
  subheading: { marginTop: 10, color: colors.muted, ...typography.body, textAlign: "center" },
  primaryButton: { width: "100%", marginTop: 32 }
});
