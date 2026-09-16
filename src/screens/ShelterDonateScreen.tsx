// Task B1 · the shelter's Donate tab root (spec §5's "Donate" row). New screen, V3 from
// birth — the fourth of ShelterTabs' five tabs to stop being dead (see `surfaceV3.test.ts`'s
// `findDeadTabs`). This is the shelter's OWN preview of what the donor-facing `DonateScreen`
// (US-Q2) shows a stranger: the same Donation QR two-key gate, plus the Abot-tulong
// wishlist with pledged/received per need. Payments stay off-platform in the payment app —
// Kupkop never touches the money, same as DonateScreen.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ShelterDashboard } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { LockIcon } from "../components/AppIcons";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { ShelterTabs } from "../components/ShelterTabs";
import { Card, Chip, SectionHeader } from "../components/ui";
import { ChipTone, NeedStatus, needStatusChip } from "../community";
import { RootStackParamList } from "../navigation/types";
import {
  donateSections,
  ShelterOwnDonationQr,
  ShelterOwnDonationQrResponse
} from "../shelterDonate";
import { colors, spacing, squircle, typography } from "../theme";

/** Maps community.ts's own tone vocabulary onto the shared Chip primitive's tones. */
const CHIP_TONE: Record<ChipTone, "success" | "warning" | "neutral"> = {
  ok: "success",
  warn: "warning",
  muted: "neutral"
};

const PROVIDER_LABEL: Record<string, string> = { gcash: "GCash", maya: "Maya" };

type Props = NativeStackScreenProps<RootStackParamList, "shelterDonate">;

type RawNeed = {
  need_id: string;
  title: string;
  quantity_needed: number;
  quantity_received: number;
  status: NeedStatus;
};

type RawPledge = { pledge_id: string; quantity: number; status: string };

export function ShelterDonateScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [dash, setDash] = useState<ShelterDashboard | null>(null);
  const [dashRes, setDashRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [qr, setQr] = useState<ShelterOwnDonationQrResponse | null>(null);
  const [needs, setNeeds] = useState<Array<RawNeed & { pledged: number }> | null>(null);

  // US-R1 · named so the same function serves the focus refetch AND the retry button.
  const load = useCallback(() => {
    let alive = true;
    // US-R2 · PRIMARY. This screen is ABOUT whether donations are on — `/shelter/dashboard`'s
    // `gates.donations_enabled` is the whole gate, so its failure takes the whole screen.
    // The QR preview and the wishlist below are SECONDARY: they only fill in once /me also
    // answers with the account_id, and either can degrade on its own without blanking the
    // gate state the screen is actually about.
    api.get("/shelter/dashboard").then((r) => {
      if (!alive) return;
      setDashRes({ ok: r.ok, status: r.status });
      if (r.ok) setDash(r.data);
    });
    api.get("/me").then((me) => {
      if (!alive || !me.ok) return;
      const accountId = me.data.account_id;

      api.get(`/shelters/${accountId}/donation-qr`).then((r) => {
        // A 404 here is the two-key gate saying "nothing to show yet" — the same reading
        // `DonateScreen` gives this endpoint for a donor — not a fault, so it degrades to
        // "no QR on file" instead of an error banner over an otherwise-working screen.
        if (alive) setQr(r.ok ? r.data : { donation_qrs: [] });
      });

      api.get(`/shelters/${accountId}/needs`).then((r) => {
        if (!alive) return;
        if (!r.ok) { setNeeds([]); return; }
        const rows: RawNeed[] = r.data.results ?? [];
        // Each need's "pledged" total is a sum over ITS OWN pledges — the needs list
        // endpoint only ever carries `quantity_received` (backend `_need_repr`), never an
        // aggregate of outstanding pledges. There is no bulk endpoint for this, so it is
        // one GET per need, same fan-out shape `DonateScreen` already accepts for needs.
        Promise.all(
          rows.map((n) =>
            api.get(`/needs/${n.need_id}/pledges`).then((rp) => {
              const pledges: RawPledge[] = rp.ok ? rp.data.results ?? [] : [];
              const pledged = pledges
                .filter((p) => p.status === "pledged")
                .reduce((sum, p) => sum + p.quantity, 0);
              return { ...n, pledged };
            })
          )
        ).then((withPledged) => { if (alive) setNeeds(withPledged); });
      });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus only
  }, []);
  useFocusEffect(load);

  const sections = donateSections(dash, qr, needs);

  // US-R1 · when the PRIMARY load failed and we have nothing, say so instead of rendering
  // the gated/locked fallback as fact — same rule as ShelterDashboardScreen/ShelterProfileScreen.
  if (!dash && loadState(dashRes).kind !== "ready" && loadState(dashRes).kind !== "empty") {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenBackdrop />
        <LoadStateView state={loadState(dashRes)} onRetry={load} />
        {/* The tab bar belongs in this branch too — the screen is reached by a tab, so
            there is no back button, and the offline state must not be a dead end. */}
        <ShelterTabs
          active="donate"
          onTabPress={(t) => t === "home" && navigation.navigate("shelterDashboard")}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="screen.shelterDonate">
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Donate</Text>

        {/* Decision 5 · the QR must render at full contrast — Card is white by default, but
            the explicit fill is kept in source so a future tone change to Card can never
            tint the code (same convention DonateScreen's qrCard follows). */}
        <Card style={styles.qrCard}>
          {sections.qr === "locked" ? (
            <View style={styles.lockedRow}>
              <LockIcon color={colors.muted} size={18} />
              <Text style={styles.lockedText}>
                Donations turn on once your shelter is verified and your QR is reviewed.
              </Text>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("donationQr")}>
              {sections.qr === "missing" ? (
                <>
                  <Text style={styles.qrTitle}>Add your donation QR</Text>
                  <Text style={styles.qrBody}>Donors won't see a QR until you upload one.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.qrTitle}>Donation QR</Text>
                  {(qr?.donation_qrs ?? []).map((q: ShelterOwnDonationQr) => (
                    <View key={q.provider} style={styles.qrRow}>
                      <Image source={{ uri: q.qr_image_url }} style={styles.qrThumb} resizeMode="contain" />
                      <View style={styles.qrCopy}>
                        <Text style={styles.qrProvider}>{PROVIDER_LABEL[q.provider] ?? q.provider}</Text>
                        <Text style={styles.qrAccountName}>{q.account_name}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </TouchableOpacity>
          )}
        </Card>

        <SectionHeader
          title="Wishlist"
          actionLabel="Add a need"
          onAction={() => navigation.navigate("shelterNeeds")}
          testID="btn.shelterDonate.wishlist"
        />

        {needs === null ? (
          <LoadStateView state={{ kind: "loading" }} />
        ) : sections.needs.length === 0 ? (
          <Text style={styles.emptyNote}>No needs posted yet.</Text>
        ) : (
          sections.needs.map((row, i) => {
            const raw = needs[i];
            const chip = needStatusChip(raw.status);
            return (
              <TouchableOpacity key={row.id} activeOpacity={0.8} onPress={() => navigation.navigate("shelterNeeds")}>
                <Card style={styles.needCard}>
                  <View style={styles.needRow}>
                    <Text style={styles.needTitle}>{row.title}</Text>
                    <Chip tone={CHIP_TONE[chip.tone]} dot={false} label={chip.label} />
                  </View>
                  <Text style={styles.needMeta}>Pledged {row.pledged} · Received {row.received}</Text>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <ShelterTabs
        active="donate"
        onTabPress={(t) => t === "home" && navigation.navigate("shelterDashboard")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 24, paddingBottom: 120 },
  pageTitle: { color: colors.ink, ...typography.display },
  qrCard: { marginTop: 16, padding: spacing.lg, backgroundColor: colors.white },
  lockedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  lockedText: { flex: 1, color: colors.muted, ...typography.meta, lineHeight: 19 },
  qrTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  qrBody: { marginTop: 6, color: colors.muted, ...typography.meta, lineHeight: 19 },
  qrRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14 },
  qrThumb: { width: 64, height: 64, borderRadius: squircle(64), backgroundColor: colors.border },
  qrCopy: { flex: 1 },
  qrProvider: { color: colors.teal, ...typography.strong, fontWeight: "800" },
  qrAccountName: { marginTop: 4, color: colors.ink, ...typography.meta },
  emptyNote: { marginTop: 4, color: colors.muted, ...typography.body },
  needCard: { marginBottom: 12, padding: 18 },
  needRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  needTitle: { flex: 1, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  needMeta: { marginTop: 8, color: colors.muted, ...typography.meta }
});
