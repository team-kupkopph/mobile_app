// Adoption · the poster's own listing (spec 2026-10-06 §3; artboard PosterListing.dc.html):
// status, Publish/Edit, and its applicants. Users never see "pending" — it reads Reserved.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ListingDetail, PosterInquiry } from "../api/types";
import { useApi } from "../api/useApi";
import { applicantStatusLine, listingStatusChip } from "../applicant";
import { LoadStateView } from "../components/LoadStateView";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Avatar, Button, Card, Chip, ScreenHeader } from "../components/ui";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { colors, spacing, squircle, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "posterListing">;

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("");
}

export function PosterListingScreen({ navigation, route }: Props) {
  const api = useApi();
  const { listingId } = route.params;
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [applicants, setApplicants] = useState<PosterInquiry[]>([]);
  const [appsRes, setAppsRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const loadApplicants = useCallback((page: number) => {
    api.get(`/listings/${listingId}/inquiries?page=${page}`).then((r) => {
      setAppsRes({ ok: r.ok, status: r.status });
      if (!r.ok) return;
      setApplicants((prev) => (page === 1 ? r.data.results : [...prev, ...r.data.results]));
      setNext(r.data.next ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by listing
  }, [listingId]);

  const load = useCallback(() => {
    api.get(`/listings/${listingId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setListing(r.data);
    });
    loadApplicants(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [listingId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function publish() {
    if (publishing) return;
    setPublishing(true);
    const r = await api.post(`/listings/${listingId}/publish`, {});
    setPublishing(false);
    if (!r.ok) { Alert.alert("Couldn't publish", r.data?.error?.message ?? "Try again."); return; }
    load();
  }

  if (!listing) {
    return (
      <View style={styles.screen} testID="screen.posterListing">
        <ScreenBackdrop />
        <ScreenHeader title="Your listing" onBack={() => navigation.goBack()} />
        <LoadStateView state={loadState(res)} subject="listing" onRetry={load} onBack={() => navigation.goBack()} />
      </View>
    );
  }

  const chip = listingStatusChip(listing.status);
  const openRows = applicants.filter((a) => a.status === "active");
  const closedRows = applicants.filter((a) => a.status !== "active");
  const fee = Number(listing.adoption_fee) > 0 ? `₱${Number(listing.adoption_fee).toLocaleString()}` : "Free";
  const sub = [listing.pet.species, listing.city, fee].filter(Boolean).join(" · ");
  const pet = listing.pet.name || "this animal";

  function rowFor(a: PosterInquiry) {
    return (
      <TouchableOpacity key={a.inquiry_id} activeOpacity={0.85} accessibilityRole="button"
        testID={`row.posterListing.applicant.${a.inquiry_id}`}
        onPress={() => navigation.navigate("applicant", { inquiryId: a.inquiry_id })}>
        <Card style={styles.row}>
          <Avatar initials={initials(a.adopter.display_name)} size={44} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>{a.adopter.display_name}</Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {[a.adopter.city, applicantStatusLine(a)].filter(Boolean).join(" · ")}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.screen} testID="screen.posterListing">
      <ScreenBackdrop />
      <ScreenHeader title="Your listing" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.headRow}>
            {listing.photos[0] ? <Image source={{ uri: listing.photos[0] }} style={styles.photo} /> : <View style={styles.photo} />}
            <View style={styles.rowText}>
              <Text style={styles.title} numberOfLines={1}>{listing.pet.name}</Text>
              <Text style={styles.rowSub}>{sub}</Text>
            </View>
            <View testID="chip.posterListing.status">
              <Chip label={chip.label} tone={chip.tone} dot={false} />
            </View>
          </View>
          {listing.status === "draft" ? (
            <>
              <Text style={styles.hint}>Add a story and an adoption fee, then publish to put them on the Adopt feed.</Text>
              <Button label="Publish to the Adopt feed" loading={publishing} onPress={publish}
                testID="btn.posterListing.publish" style={styles.action} />
            </>
          ) : null}
          {listing.status === "draft" || listing.status === "available" || listing.status === "pending" ? (
            <Button label="Edit" variant="secondary" testID="btn.posterListing.edit" style={styles.action}
              onPress={() => navigation.navigate("listingForm", { listingId })} />
          ) : null}
        </Card>

        <Text style={styles.section}>Applicants ({applicants.length})</Text>
        {appsRes && !appsRes.ok ? (
          <LoadStateView state={loadState(appsRes)} subject="applicants" onRetry={() => loadApplicants(1)} />
        ) : applicants.length === 0 && appsRes ? (
          <Text style={styles.hint} testID="text.posterListing.empty">No one has asked about {pet} yet.</Text>
        ) : (
          <>
            {openRows.map(rowFor)}
            {closedRows.length > 0 ? (
              <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" testID="btn.posterListing.showClosed"
                style={styles.more} onPress={() => setShowClosed((v) => !v)}>
                <Text style={styles.moreLabel}>{showClosed ? "Hide closed" : `Show ${closedRows.length} closed`}</Text>
              </TouchableOpacity>
            ) : null}
            {showClosed ? closedRows.map(rowFor) : null}
            {next ? (
              <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" style={styles.more}
                onPress={() => loadApplicants(next)}>
                <Text style={styles.moreLabel}>Load more</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 48 },
  card: { marginTop: 14, padding: spacing.lg },
  headRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  photo: { width: 62, height: 62, borderRadius: squircle(62), backgroundColor: colors.soft },
  title: { color: colors.ink, ...typography.title },
  rowText: { flex: 1 },
  rowTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  rowSub: { marginTop: 3, color: colors.muted, ...typography.meta },
  hint: { marginTop: 12, color: colors.muted, ...typography.meta, lineHeight: 18 },
  action: { marginTop: 12 },
  section: { marginTop: 24, color: colors.ink, ...typography.section },
  row: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  more: { alignSelf: "center", marginTop: 12, minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  moreLabel: { color: colors.teal, ...typography.strong, fontWeight: "700" }
});
