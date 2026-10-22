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
import { Button, Card, Chip, SectionHeader } from "../components/ui";
import { ChipTone, NeedStatus, needProgressLabel, needStatusChip } from "../community";
import { RootStackParamList } from "../navigation/types";
import {
  donateSections,
  DonateNeedInput,
  ShelterOwnDonationQr,
  ShelterOwnDonationQrResponse
} from "../shelterDonate";
import { colors, maxFontScale, spacing, squircle, typography } from "../theme";
import { useLargeText } from "../useLargeText";

/** Maps community.ts's own tone vocabulary onto the shared Chip primitive's tones. */
const CHIP_TONE: Record<ChipTone, "success" | "warning" | "neutral"> = {
  ok: "success",
  warn: "warning",
  muted: "neutral"
};

const PROVIDER_LABEL: Record<string, string> = { gcash: "GCash", maya: "Maya" };

type Props = NativeStackScreenProps<RootStackParamList, "shelterDonate">;

// One row of GET /shelters/{me}/needs. `quantity_pledged` rides on it, so this tab makes ONE request for the whole
// wishlist; it used to fan out a `/needs/{id}/pledges` call per need to add the pledged total up itself.
type Need = DonateNeedInput & {
  quantity_needed: number; status: NeedStatus; unit?: string;
};

export function ShelterDonateScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const large = useLargeText();
  const api = useApi();
  const [dash, setDash] = useState<ShelterDashboard | null>(null);
  const [dashRes, setDashRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [qr, setQr] = useState<ShelterOwnDonationQrResponse | null>(null);
  const [needs, setNeeds] = useState<Need[] | null>(null);
  // The wishlist has its own load state (AW17): a failed request must not read as "No needs posted yet."
  const [needsRes, setNeedsRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [moreNeeds, setMoreNeeds] = useState(false);
  // "Add a need" follows the approval gate the Profile tab's Wishlist row uses: /me's `is_verified_rescuer`
  // ("any approved", not the latest request's status). Unknown until /me answers, so it reads as gated.
  const [verifiedRescuer, setVerifiedRescuer] = useState<boolean | null>(null);
  // Artboard · the QR card names the org. `/me` already answers for the accountId below; its display_name is the org's name for a shelter.
  const [orgName, setOrgName] = useState<string | null>(null);

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
      if (!alive) return;
      // A failed /me is the wishlist's failure too: without this its spinner never ended.
      if (!me.ok) { setNeedsRes({ ok: false, status: me.status }); return; }
      setVerifiedRescuer(!!me.data.is_verified_rescuer);
      const accountId = me.data.account_id;
      if (alive) setOrgName(me.data.display_name ?? null);

      api.get(`/shelters/${accountId}/donation-qr`).then((r) => {
        // A 404 here is the two-key gate saying "nothing to show yet" — the same reading
        // `DonateScreen` gives this endpoint for a donor — not a fault, so it degrades to
        // "no QR on file" instead of an error banner over an otherwise-working screen.
        if (alive) setQr(r.ok ? r.data : { donation_qrs: [] });
      });

      api.get(`/shelters/${accountId}/needs`).then((r) => {
        if (!alive) return;
        setNeedsRes({ ok: r.ok, status: r.status });
        if (r.ok) {
          setNeeds(r.data.results ?? []);
          setMoreNeeds(r.data.next != null);
        }
      });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus only
  }, []);
  useFocusEffect(load);

  const sections = donateSections(dash, qr, needs);
  const gated = verifiedRescuer !== true;
  const needsState = loadState(needsRes);
  function retryNeeds() { setNeedsRes(null); load(); }
  const donationsOn = dash?.gates.donations_enabled ?? false;

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
          onTabPress={(t) => {
            if (t === "home") navigation.navigate("shelterDashboard");
            if (t === "animals") navigation.navigate("shelterAnimals");
            if (t === "requests") navigation.navigate("shelterRequests");
            if (t === "profile") navigation.navigate("shelterProfile");
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="screen.shelterDonate">
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle} maxFontSizeMultiplier={maxFontScale.title}>Donate</Text>
        <Text style={styles.subtitle}>Your donation QR and wishlist, in one place.</Text>

        {/* Decision 5 · the QR must render at full contrast — Card is white by default, but
            the explicit fill is kept in source so a future tone change to Card can never
            tint the code (same convention DonateScreen's qrCard follows). */}
        <Card style={styles.qrCard}>
          {/* Artboard · org name, "Donations are on/paused" and an On/Off chip. (The amber "Pending verification" chip waits for DW2: a shelter cannot read its own pending QR yet.) */}
          <View style={styles.qrHead}>
            <View style={styles.qrHeadCopy}>
              {orgName ? <Text style={styles.qrOrg} maxFontSizeMultiplier={maxFontScale.title}>{orgName}</Text> : null}
              <Text style={styles.qrSub}>{donationsOn ? "Donations are on" : "Donations are paused"}</Text>
            </View>
            <Chip tone={donationsOn ? "success" : "neutral"} dot={false} label={donationsOn ? "On" : "Off"} />
          </View>
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

        <SectionHeader title="Wishlist" />
        {verifiedRescuer === false ? (
          <Text style={styles.emptyNote}>You can add needs once your shelter is verified.</Text>
        ) : null}

        {needsState.kind !== "ready" ? (
          <LoadStateView state={needsState} onRetry={retryNeeds} />
        ) : sections.needs.length === 0 ? (
          <Text style={styles.emptyNote}>No needs posted yet.</Text>
        ) : (
          <>
            {sections.needs.map((row, i) => {
              const raw = (needs ?? [])[i];
              const chip = needStatusChip(raw.status);
              return (
                <TouchableOpacity key={row.id} activeOpacity={0.8}
                  onPress={() => navigation.navigate("needPledges", { needId: row.id })}>
                  <Card style={styles.needCard}>
                    <View style={[styles.needRow, large && styles.needRowLarge]}>
                      <Text style={[styles.needTitle, large && styles.needTitleLarge]} maxFontSizeMultiplier={maxFontScale.title}>{row.title}</Text>
                      <Chip tone={CHIP_TONE[chip.tone]} dot={false} label={chip.label} />
                    </View>
                    <Text style={styles.needMeta}>{needProgressLabel(row.received, raw.quantity_needed, raw.unit, row.pledged)}</Text>
                  </Card>
                </TouchableOpacity>
              );
            })}
            {moreNeeds ? (
              <Button label="See the full wishlist" variant="secondary" onPress={() => navigation.navigate("shelterNeeds")} />
            ) : null}
          </>
        )}

        {/* Artboard · "Add a need" is a dashed button BELOW the list (it was a header action). Same approval gate as before (`gated`), same destination. */}
        {!gated ? (
          <TouchableOpacity activeOpacity={0.8} style={styles.addNeed} onPress={() => navigation.navigate("needForm", {})}
            testID="btn.shelterDonate.wishlist" accessibilityRole="button" accessibilityLabel="Add a need to your wishlist">
            <Text style={styles.addNeedLabel}>+ Add a need</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <ShelterTabs
        active="donate"
        onTabPress={(t) => {
            if (t === "home") navigation.navigate("shelterDashboard");
            if (t === "animals") navigation.navigate("shelterAnimals");
            if (t === "requests") navigation.navigate("shelterRequests");
            if (t === "profile") navigation.navigate("shelterProfile");
          }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 24, paddingBottom: 120 },
  pageTitle: { color: colors.ink, ...typography.display },
  subtitle: { marginTop: 6, color: colors.muted, ...typography.body },
  qrHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 },
  qrHeadCopy: { flex: 1 },
  qrOrg: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  qrSub: { marginTop: 2, color: colors.muted, ...typography.meta },
  addNeed: { marginTop: 4, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: squircle(48), borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.teal },
  addNeedLabel: { color: colors.teal, ...typography.strong, fontWeight: "700" },
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
  // large: stacked. The base `flex: 1` survives in a style array and would collapse the text in a column (`flex: 0` is what works, #189).
  // No `alignSelf: "stretch"`: with the title cap it reserved the frame for the uncapped size (a ~100 pt gap, seen on My donations).
  needRowLarge: { flexDirection: "column", alignItems: "flex-start" },
  needTitleLarge: { flex: 0, flexGrow: 0, flexBasis: "auto" },
  needTitle: { flex: 1, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  needMeta: { marginTop: 8, color: colors.muted, ...typography.meta }
});
