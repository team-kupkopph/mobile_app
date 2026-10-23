// US-Q2 · the public donate surface. GET /shelters/{accountId}/donation-qr — a two-key
// gate (org approved AND the QR reviewer-verified), so a 404 here just means "nothing to
// show yet," not an error. Payments happen off-platform in the payment app itself —
// Kupkop never touches the money (decision: donations stay off-platform QR by design).
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { setIntent } from "../guestIntent";
import { SignupWall } from "../components/SignupWall";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { donateLoadState } from "../donateState";
import { needCategoryLabel, needProgressLabel, quantityLabel } from "../community";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { colors, maxFontScale, pill, radii, spacing, typography } from "../theme";
import { Card, ScreenHeader } from "../components/ui";


const PROVIDER_LABEL: Record<string, string> = { gcash: "GCash", maya: "Maya" };

type DonationQr = { provider: string; account_name: string; qr_image_url: string };
type Need = {
  need_id: string; title: string; category: string;
  quantity_needed: number; quantity_received: number; status: string;
  unit?: string; quantity_pledged?: number;
  my_pledged?: number;   // only when the caller is signed in
};
type Props = NativeStackScreenProps<RootStackParamList, "donate">;

// AT31 · an image that fails to load used to leave a blank grey box, so a donor could not tell "loading" from "failed" from "no code".
// The card keeps the provider and the account name (who the gift is for) and says plainly that the code did not load.
function QrCard({ qr }: { qr: DonationQr }) {
  const [failed, setFailed] = useState(false);
  return (
    // Decision 5 · the code must render at full contrast — Card is white by default,
    // but the explicit fill is kept so a future tone change can't tint the code.
    <Card style={styles.qrCard}>
      <Text style={styles.provider}>{PROVIDER_LABEL[qr.provider] ?? qr.provider}</Text>
      {failed ? (
        <View style={[styles.qrImage, styles.qrFailed]}>
          <Text style={styles.qrFailedText}>We couldn't load this code. Check your connection, then open Donate again.</Text>
        </View>
      ) : (
        <Image source={{ uri: qr.qr_image_url }} style={styles.qrImage} resizeMode="contain" onError={() => setFailed(true)} />
      )}
      <Text style={styles.accountName}>{qr.account_name}</Text>
    </Card>
  );
}

export function DonateScreen({ navigation, route }: Props) {
  const api = useApi();
  const { accountId, orgName } = route.params;
  const [qrs, setQrs] = useState<DonationQr[] | null>(null);
  // US-R2 · PRIMARY: this screen exists to show the QR. `needs` below is SECONDARY and
  // degrades on its own rather than taking the screen.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [needs, setNeeds] = useState<Need[] | null>(null);
  // AW14a · the wishlist's own result, so a failed request says so (offline / error + retry) instead of the
  // section quietly not being there.
  const [needsRes, setNeedsRes] = useState<{ ok: boolean; status: number } | null>(null);

  // US-W2 · the shelter's open wishlist, shown beside the QR block (both live on Donate). Refetched on focus
  // (AW13): coming back from a pledge shows the new progress and "You pledged …".
  const loadNeeds = useCallback(() => {
    api.get(`/shelters/${accountId}/needs?status=open`).then((r) => {
      setNeedsRes({ ok: r.ok, status: r.status });
      if (r.ok) setNeeds(r.data.results);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- api changes with the tokens, which also change what comes back
  }, [accountId, api]);
  useFocusEffect(loadNeeds);

  // AT14 · a guest may open Donate (public), but "My donations" is the pledger's own list (401 for a guest): the wall, not a dead-end error.
  const { tokens } = useAuth();
  const isGuest = tokens === null;
  const [wall, setWall] = useState(false);
  const openWall = (_action: "account") => setWall(true);

  // AT2 · one callable load, so the state view can offer Try again after an offline or 5xx answer.
  const load = useCallback(() => {
    setRes(null);
    // ⚠️ was `setQrs(r.ok ? ... : [])` — so a failed request rendered "Donations aren't
    // available for this org yet.", a false statement about a shelter that could cost it a
    // donation.
    api.get(`/shelters/${accountId}/donation-qr`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setQrs(r.data.donation_qrs);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload for this accountId
  }, [accountId]);
  useEffect(load, [load]);

  // Rows already on screen stay on screen if a later refresh fails; the state only decides the first load.
  const needsState = needs === null ? loadState(needsRes) : ({ kind: "ready" } as const);
  const qrState = donateLoadState(res, qrs?.length);
  // AW14b · the shelter has a wishlist but no verified code (the API answers 404, or an empty list): say that,
  // rather than "donations aren't available". Waits for the wishlist so the line does not flash and flip.
  const noQr = qrState.kind === "gone" || qrState.kind === "empty";
  const hasNeeds = !!needs && needs.length > 0;
  const needsPending = needs === null && needsState.kind === "loading";

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Donate" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.orgName} maxFontSizeMultiplier={maxFontScale.title}>{orgName}</Text>
        <Text style={styles.offPlatformNote}>
          Donations happen in your payment app — Kupkop never touches the money.
        </Text>

        {noQr && needsPending ? null : noQr && hasNeeds ? (
          <Text style={styles.noQr}>
            This shelter doesn't take QR donations yet — you can still pledge an item below.
          </Text>
        ) : qrState.kind !== "ready" ? (
          <LoadStateView
            state={qrState}
            emptyTitle="Donations aren't available for this org yet."
            onRetry={load}
          />
        ) : qrs && qrs.length > 0 ? (
          qrs.map((qr) => (
            // Decision 5 · the code must render at full contrast — Card is white by default,
            // but the explicit fill is kept so a future tone change can't tint the code.
            <QrCard key={qr.provider} qr={qr} />
          ))
        ) : null}

        {needsState.kind !== "ready" ? (
          <LoadStateView
            state={needsState}
            onRetry={() => { setNeedsRes(null); loadNeeds(); }}
          />
        ) : null}

        {needs && needs.length > 0 ? (
          <View style={styles.wishlist}>
            <Text style={styles.sectionTitle}>Wishlist</Text>
            <Text style={styles.sectionNote}>
              Pledge to bring what {orgName} needs. They confirm once it arrives.
            </Text>
            {needs.map((need) => (
              <Card key={need.need_id} style={styles.needCard}>
                <Text style={styles.needTitle}>{need.title}</Text>
                <Text style={styles.needMeta}>
                  {needCategoryLabel(need.category)} · {needProgressLabel(need.quantity_received, need.quantity_needed, need.unit, need.quantity_pledged)}
                </Text>
                {need.my_pledged && need.my_pledged > 0 ? (
                  <Text style={styles.myPledge}>You pledged {quantityLabel(need.my_pledged, need.unit)}</Text>
                ) : null}
                <TouchableOpacity hitSlop={TAP_SLOP} style={styles.pledgeBtn}
                  onPress={() => navigation.navigate("donatePledge", {
                    needId: need.need_id, needTitle: need.title, shelterName: orgName
                  })}>
                  <Text style={styles.pledgeLabel}>Pledge</Text>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        ) : null}

        <TouchableOpacity hitSlop={TAP_SLOP} style={styles.myDonationsRow}
          onPress={() => (isGuest ? openWall("account") : navigation.navigate("myDonations"))}>
          <Text style={styles.myDonationsLabel}>My donations ›</Text>
        </TouchableOpacity>
      </ScrollView>
      <SignupWall
        visible={wall}
        action="account"
        onCreateAccount={() => { setIntent("account"); setWall(false); navigation.navigate("accountType"); }}
        onLogin={() => { setWall(false); navigation.navigate("signin"); }}
        onDismiss={() => setWall(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  orgName: { color: colors.ink, ...typography.hero },
  offPlatformNote: { marginTop: 8, marginBottom: 20, color: colors.muted, ...typography.meta, lineHeight: 20 },
  qrCard: { marginBottom: 18, padding: spacing.lg, alignItems: "center", backgroundColor: colors.white },
  provider: { color: colors.teal, ...typography.subtitle, fontWeight: "800" },
  qrImage: { marginTop: 14, width: 220, height: 220, borderRadius: radii.chip, backgroundColor: colors.border },
  accountName: { marginTop: 14, color: colors.ink, ...typography.strong, fontWeight: "700", textAlign: "center" },
  qrFailed: { alignItems: "center", justifyContent: "center", padding: spacing.md },
  qrFailedText: { color: colors.muted, ...typography.meta, textAlign: "center" },
  empty: { marginTop: 40, color: colors.muted, ...typography.subtitle, textAlign: "center" },
  wishlist: { marginTop: 28 },
  sectionTitle: { color: colors.ink, ...typography.section },
  sectionNote: { marginTop: 6, marginBottom: 14, color: colors.muted, ...typography.meta, lineHeight: 20 },
  needCard: { marginBottom: 12, padding: 18 },
  needTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  noQr: { color: colors.muted, ...typography.meta, lineHeight: 20, marginBottom: 4 },
  myPledge: { marginTop: 4, color: colors.teal, ...typography.meta, fontWeight: "700" },
  needMeta: { marginTop: 6, color: colors.muted, ...typography.meta },
  pledgeBtn: { marginTop: 14, alignSelf: "flex-start", minHeight: 38, paddingVertical: 8, paddingHorizontal: 22, justifyContent: "center", borderRadius: pill(38), backgroundColor: colors.teal },
  pledgeLabel: { color: colors.white, ...typography.strong, fontWeight: "700" },
  myDonationsRow: { marginTop: 26, alignItems: "center" },
  myDonationsLabel: { color: colors.teal, ...typography.subtitle, fontWeight: "700" }
});
