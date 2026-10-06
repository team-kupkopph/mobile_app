// US-A3/A4 · a listing's detail + the gated Inquire action.
// GET /listings/{id}; POST /listings/{id}/inquiries.
// The inquiry gates (Verified Member, verified phone) are backend-enforced — this screen
// POSTs and handles the 403 codes rather than re-deriving who's allowed (the SEC1 pattern:
// the server owns the access decision, the client renders the outcome).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button, Card, ScreenHeader } from "../components/ui";

import { ListingDetail } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { inquireBlockedCopy, inquireRefusalMessage, inquirySentCopy } from "../adoption";
import { useAuth } from "../auth/AuthContext";
import { accountIdFromAccessToken } from "../auth/idToken";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { SignupWall, SignupWallAction } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { RootStackParamList } from "../navigation/types";
import { DRAFT_STATUS } from "../shelterAnimals";
import { TAP_SLOP } from "../touch";
import { colors, radii, spacing, typography } from "../theme";


type Props = NativeStackScreenProps<RootStackParamList, "listingDetail">;

export function ListingDetailScreen({ navigation, route }: Props) {
  const api = useApi();
  const { tokens } = useAuth();
  const isGuest = tokens === null;
  const myAccountId = accountIdFromAccessToken(tokens?.access);
  const { listingId } = route.params;
  const [listing, setListing] = useState<ListingDetail | null>(null);
  // US-R4 · "{X} not found." was shown for EVERY failure, not just a missing row — so
  // someone offline, or hitting a 500, was told the thing does not exist. R2's `gone`
  // is what actually means "not found" (404/403); everything else keeps its own words
  // and a retry that can work.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [inquiring, setInquiring] = useState(false);
  const [inquired, setInquired] = useState(false);
  // Which gated tap raised the wall: Inquire → "adopt"; "Report this" → the generic
  // "account" copy (the "report" copy is about reporting a stray, not flagging a listing).
  // The action outlives `open` so the copy doesn't flip while the sheet slides out.
  const [wall, setWall] = useState<{ open: boolean; action: SignupWallAction }>(
    { open: false, action: "adopt" });
  const openWall = (action: SignupWallAction) => setWall({ open: true, action });
  const closeWall = () => setWall((w) => ({ ...w, open: false }));

  // D7 · a draft is private to its poster (the server 404s it for anyone else), so seeing one
  // here means it's yours: offer Publish and Edit instead of Inquire.
  const [publishing, setPublishing] = useState(false);
  async function publish() {
    if (publishing) return;
    setPublishing(true);
    const res = await api.post(`/listings/${route.params.listingId}/publish`, {});
    setPublishing(false);
    if (!res.ok) {
      Alert.alert("Couldn't publish", res.data?.error?.message ?? "Try again.");
      return;
    }
    Alert.alert("Published", "It's on the Adopt feed now.");
    load();
  }

  const load = useCallback(() => {
    setRes(null);
    api.get(`/listings/${listingId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setListing(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [listingId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onInquirePressed() {
    // US-A1b/A3: a guest may VIEW this screen read-only, but Inquire is the gated action —
    // it raises the signup wall rather than hitting the API (which would just 401). A
    // signed-in user goes straight to the real inquiry.
    if (isGuest) {
      openWall("adopt");
      return;
    }
    inquire();
  }

  async function inquire() {
    if (inquiring) return;
    setInquiring(true);
    const res = await api.post(`/listings/${listingId}/inquiries`, {});
    setInquiring(false);
    if (res.ok) {
      setInquired(true);
      // AQ1/AQ2 · say what really happens next; a non-member hears about the badge now.
      const copy = inquirySentCopy(listing?.poster.name ?? "The poster", res.data?.verified_member);
      const buttons: Array<{ text: string; onPress?: () => void }> = [
        { text: "OK" },
        { text: "See my inquiries", onPress: () => navigation.navigate("myInquiries") }
      ];
      if (res.data?.verified_member === false) {
        buttons.push({ text: "Get verified", onPress: () => navigation.navigate("memberUpgrade") });
      }
      Alert.alert(copy.title, copy.body, buttons);
      return;
    }
    const code = res.data?.error?.code;
    // AQ2 / AD13 · the new gate's refusals. Before PR A a shelter fell into the pet-owner upgrade.
    const blocked = inquireBlockedCopy(code);
    if (blocked) {
      Alert.alert(blocked.title, blocked.body);
      return;
    }
    if (code === "already_inquired") {
      setInquired(true);
      Alert.alert("Already inquired", "You've already inquired on this listing.");
      return;
    }
    // A server older than AQ2 (2026-10-05) still asks for the badge at inquiry.
    if (code === "member_badge_required") {
      Alert.alert("Get verified to adopt",
        "Adopting needs a Verified Member badge — it takes a gov ID and one social link.",
        [{ text: "Not now", style: "cancel" },
         { text: "Get verified", onPress: () => navigation.navigate("memberUpgrade") }]);
      return;
    }
    if (code === "phone_unverified") {
      Alert.alert("Verify your phone first",
        "Verify a mobile number to inquire. It's shared with the poster only if they accept you for screening.",
        [{ text: "Not now", style: "cancel" },
         { text: "Verify phone", onPress: () => navigation.navigate("verifyPhone") }]);
      return;
    }
    // D15 · the rescuer took the animal back while this screen was open: say so, and refetch so
    // the listing shows its real status ("No longer available for adoption.") instead of an
    // Inquire button that can only fail.
    const refusal = inquireRefusalMessage(code);
    if (refusal) {
      Alert.alert("No longer available", refusal);
      load();
      return;
    }
    Alert.alert("Couldn't send the inquiry", res.data?.error?.message ?? "Try again.");
  }

  return (
    <View style={styles.screen} testID="screen.listingDetail">
      <ScreenBackdrop />
      <ScreenHeader
        title="Adopt"
        onBack={() => navigation.goBack()}
        right={listing ? (
          <TouchableOpacity
            hitSlop={TAP_SLOP}
            // A guest's report would 401 at /moderation/flags and dead-end on "Couldn't send
            // the report" — raise the signup wall instead, same as Inquire.
            onPress={() => isGuest ? openWall("account") : navigation.navigate("reportContent",
              { targetType: "listing", targetId: listing.listing_id })}
          >
            <Text style={styles.flagLinkText}>Report this</Text>
          </TouchableOpacity>
        ) : null}
      />

      {!listing ? (
        <LoadStateView state={loadState(res)} subject="listing" onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {listing.photos.length > 0 ? (
            <Image source={{ uri: listing.photos[0] }} style={styles.photo} resizeMode="cover" />
          ) : null}

          <Text style={styles.name}>{listing.pet.name}</Text>
          <Text style={styles.sub}>
            {[capitalize(listing.pet.species), listing.pet.breed,
              listing.pet.sex ? capitalize(listing.pet.sex) : null, listing.city]
              .filter(Boolean).join(" · ")}
          </Text>

          <View style={styles.tagRow}>
            {listing.pet.spayed_neutered ? <Tag text="Spayed/neutered" /> : null}
            {listing.pet.vaccinated ? <Tag text="Vaccinated" /> : null}
            {listing.pet.walkable ? <Tag text="Walkable" /> : null}
          </View>

          <Card style={styles.feeCard}>
            <Text style={styles.feeLabel}>Adoption fee</Text>
            <Text style={styles.feeValue}>
              {Number(listing.adoption_fee) > 0 ? `₱${Number(listing.adoption_fee).toLocaleString()}` : "Free"}
            </Text>
          </Card>

          {listing.description ? (
            <>
              <Text style={styles.sectionTitle}>About {listing.pet.name}</Text>
              <Text style={styles.body}>{listing.description}</Text>
            </>
          ) : null}

          {listing.requirements ? (
            <>
              <Text style={styles.sectionTitle}>Adoption requirements</Text>
              <Text style={styles.body}>{listing.requirements}</Text>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Posted by</Text>
          <Text style={styles.body}>
            {listing.poster.name}{listing.poster.is_shelter ? " · Shelter" : ""}
            {listing.poster.city ? ` · ${listing.poster.city}` : ""}
          </Text>

          {listing.poster.is_shelter ? (
            // US-Q2 · a 404 (org unapproved or no verified QR yet) is handled on the
            // donate screen itself — this link doesn't need to know which is true.
            <TouchableOpacity hitSlop={TAP_SLOP}
              style={styles.donateLink}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("donate",
                { accountId: listing.poster.account_id, orgName: listing.poster.name })}
            >
              <Text style={styles.donateLinkText}>Donate to {listing.poster.name} ›</Text>
            </TouchableOpacity>
          ) : null}

          {listing.status === DRAFT_STATUS ? (
            <View style={styles.draftCard}>
              <Text style={styles.draftTitle}>Draft · only you can see this</Text>
              <Text style={styles.draftBody}>
                Add a story and an adoption fee, then publish to put them on the Adopt feed.
              </Text>
              <Button
                testID="btn.listingDetail.publish"
                label="Publish to the Adopt feed"
                onPress={publish}
                loading={publishing}
                style={styles.inquireBtn}
              />
              <Button
                label="Edit the listing"
                variant="secondary"
                onPress={() => navigation.navigate("listingForm", { listingId: listing.listing_id })}
                style={styles.inquireBtn}
              />
            </View>
          ) : listing.poster.account_id === myAccountId ? (
            // AD13 · the server refuses it (own_listing); the screen doesn't offer it.
            <Text style={styles.inquiredNote} testID="text.listingDetail.yours">This is your listing.</Text>
          ) : inquired ? (
            <>
              {/* e2e 20-browse-and-inquire asserts this copy: it is the signal the POST was accepted. */}
              <Text style={styles.inquiredNote}>Inquiry sent — they'll review it and get back to you.</Text>
              <Button
                label="See my inquiries"
                onPress={() => navigation.navigate("myInquiries")}
                variant="secondary"
                style={styles.inquireBtn}
              />
            </>
          ) : listing.status !== "available" ? (
            // D15 · the server still serves a withdrawn (or pending/adopted) listing at 200, so
            // Inquire is offered only while it is AVAILABLE.
            <Text style={styles.inquiredNote} testID="text.listingDetail.unavailable">
              No longer available for adoption.
            </Text>
          ) : (
            <Button
              testID="btn.listingDetail.inquire"
              label="Inquire to adopt"
              onPress={onInquirePressed}
              loading={inquiring}
              style={styles.inquireBtn}
            />
          )}
        </ScrollView>
      )}

      <SignupWall
        visible={wall.open}
        action={wall.action}
        subject={wall.action === "adopt" ? listing?.pet.name : undefined}
        onCreateAccount={() => { setIntent(wall.action); closeWall(); navigation.navigate("accountType"); }}
        onLogin={() => { closeWall(); navigation.navigate("signin"); }}
        onDismiss={closeWall}
      />
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return <View style={styles.tag}><Text style={styles.tagText}>{text}</Text></View>;
}

function capitalize(s: string | null | undefined): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  flagLinkText: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  photo: { width: "100%", height: 240, borderRadius: radii.card, marginBottom: 18, backgroundColor: colors.border },
  name: { color: colors.ink, ...typography.hero },
  sub: { marginTop: 8, color: colors.muted, ...typography.subtitle },
  donateLink: { marginTop: 10 },
  donateLinkText: { color: colors.teal, ...typography.strong, fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  tag: { backgroundColor: colors.soft, paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: "center" },
  tagText: { color: colors.tealDark, ...typography.meta, fontWeight: "700" },
  feeCard: { marginTop: 18, padding: 18, flexDirection: "row",
             alignItems: "center", justifyContent: "space-between" },
  feeLabel: { color: colors.muted, ...typography.strong, fontWeight: "700" },
  feeValue: { color: colors.ink, ...typography.section },
  sectionTitle: { marginTop: 24, marginBottom: 8, color: colors.ink, ...typography.section },
  body: { color: colors.ink, ...typography.body },
  inquiredNote: { marginTop: 30, color: colors.muted, ...typography.strong, fontWeight: "700", textAlign: "center" },
  inquireBtn: { marginTop: 14 },
  draftCard: { marginTop: 30, padding: 18, borderRadius: radii.tile, backgroundColor: colors.warningBg },
  draftTitle: { color: colors.warningStrong, ...typography.subtitle, fontWeight: "800" },
  draftBody: { marginTop: 6, color: colors.ink, ...typography.body }
});
