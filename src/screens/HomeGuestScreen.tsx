// US-A1b — guest browse. Read-only Home for an unauthenticated visitor.
//
// ⚠️ THE SAME HOME, NOT A SEPARATE ONE. This screen composes the pieces in
// components/home/HomeSections.tsx — the header, the report card, the three sections and
// their rows — exactly as HomeScreen does, from the same three public endpoints (/listings,
// /stories, /reports/map are AllowAny on GET). What differs is only what a guest cannot do:
// there is no /me, so no verification card, no spotlight and no trail; the bell's slot holds
// "Log in"; the status slot says "browsing as a guest"; the city is fixed to the seeded one;
// and the gated taps — Report now, See all under Adopt, a stray's row, the Adopt / Volunteer /
// You tabs — open the SignupWall. A listing row opens the read-only detail (US-A3).
//
// It was written against a V1 mock and then not kept up with Home for two sprints; the header
// of HomeSections.tsx records what that looked like and why the pieces are now shared.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { Listing } from "../api/types";
import { AdoptIcon, HomeIcon, ProfileIcon, VolunteerIcon } from "../components/AppIcons";
import { SignupWall, SignupWallAction } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { SectionHeader, TabBar, type TabBarItem } from "../components/ui";
import { EmptyNote, HomeHeader, ListingRow, MapReport, ReportStrayCard, StoryRow, StoryRowData, StrayRow, sectionSpacing } from "../components/home/HomeSections";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { colors, elevation, pill, radii, spacing, squircle, typography } from "../theme";


type Props = NativeStackScreenProps<RootStackParamList, "homeGuest">;

const GUEST_CITY = "Marikina";

type WallState = { action: SignupWallAction; subject?: string } | null;

export function HomeGuestScreen({ navigation }: Props) {
  // The status bar is real now (App.tsx), so the first thing on screen has to start below
  // it. This block used to pad 20pt, which was right while the bar was hidden and put
  // "Welcome!" directly under the clock once it was not.
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsRes, setListingsRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [stories, setStories] = useState<StoryRowData[]>([]);
  const [storiesRes, setStoriesRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [rescues, setRescues] = useState<MapReport[]>([]);
  const [rescuesRes, setRescuesRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [wall, setWall] = useState<WallState>(null);

  // ⚠️ THE SAME THREE SECTIONS THE SIGNED-IN HOME SHOWS, from the same three endpoints — all
  // three are AllowAny on GET. For two sprints the guest Home showed one of them, drawn the V1
  // way, and a "See nearby strays" row the signed-in Home had already replaced with the
  // "Nearby rescues" section. HomeSections.tsx says why that is not allowed to happen again.
  const load = useCallback(() => {
    setListingsRes(null); setStoriesRes(null); setRescuesRes(null);
    api.get(`/listings?city=${GUEST_CITY}`).then((r) => {
      setListingsRes({ ok: r.ok, status: r.status });
      if (r.ok) setListings((r.data?.results ?? []).slice(0, 5));
    });
    api.get("/stories").then((r) => {
      setStoriesRes({ ok: r.ok, status: r.status });
      if (r.ok) setStories((r.data?.results ?? []).slice(0, 2));
    });
    api.get(`/reports/map?city=${GUEST_CITY}&status=reported`).then((r) => {
      setRescuesRes({ ok: r.ok, status: r.status });
      if (r.ok) setRescues((r.data?.reports ?? []).slice(0, 2));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on focus, not on every api identity change
  }, []);
  useFocusEffect(load);

  function openWall(action: SignupWallAction, subject?: string) {
    setWall({ action, subject });
  }

  function onCreateAccount() {
    if (wall) setIntent(wall.action);
    setWall(null);
    navigation.navigate("accountType");
  }

  function onWallLogin() {
    setWall(null);
    navigation.navigate("signin");
  }

  const listingsPanel = loadState(listingsRes, listings.length);
  const storiesPanel = loadState(storiesRes, stories.length);
  const rescuesPanel = loadState(rescuesRes, rescues.length);

  return (
    <View style={styles.screen} testID="screen.homeGuest">
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        {/* The bell's slot carries "Log in"; the city is fixed to the seeded one — changing it
            is an account feature (LocationPickerScreen's PUT /me/location). */}
        <HomeHeader
          greeting="Welcome!"
          city={`${GUEST_CITY} City`}
          right={
            <TouchableOpacity
              hitSlop={TAP_SLOP}
              activeOpacity={0.85}
              style={styles.loginPill}
              onPress={() => navigation.navigate("signin")}
              accessibilityRole="button"
            >
              <Text style={styles.loginPillText}>Log in</Text>
            </TouchableOpacity>
          }
        />

        {/* The status slot: where a member sees "Verified Member in review", a guest sees this,
            in the same card. */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.guestCard}
          onPress={() => navigation.navigate("accountType")}
          accessibilityRole="button"
          accessibilityLabel="Sign up"
        >
          <View style={styles.guestIcon}>
            <ProfileIcon color={colors.teal} size={22} />
          </View>
          <View style={styles.guestCopy}>
            <Text style={styles.guestTitle}>You're browsing as a guest</Text>
            <Text style={styles.guestBody}>Sign up to adopt, save pets & help strays.</Text>
          </View>
          <Text style={styles.guestLink}>Sign up ›</Text>
        </TouchableOpacity>

        <ReportStrayCard testID="btn.homeGuest.report" onPress={() => openWall("report")} />

        <SectionHeader
          title="Adopt near you"
          actionLabel="See all ›"
          onAction={() => openWall("adopt")}
          testID="btn.homeGuest.adopt"
          style={sectionSpacing.first}
        />
        {listingsPanel.kind !== "ready" && listingsPanel.kind !== "empty" ? (
          <LoadStateView state={listingsPanel} onRetry={load} />
        ) : listingsPanel.kind === "empty" ? (
          <EmptyNote>No pets listed near you yet.</EmptyNote>
        ) : listings.map((listing, i) => (
          // US-A1b/A3: a guest may VIEW a listing read-only; Inquire on it raises the wall.
          <ListingRow
            key={listing.listing_id}
            testID={`card.homeGuest.listing.${i}`}
            listing={listing}
            onPress={() => navigation.navigate("listingDetail", { listingId: listing.listing_id })}
          />
        ))}

        <SectionHeader
          title="Community stories"
          actionLabel="See all ›"
          onPress={() => navigation.navigate("stories")}
          style={sectionSpacing.next}
        />
        {storiesPanel.kind !== "ready" && storiesPanel.kind !== "empty" ? (
          <LoadStateView state={storiesPanel} onRetry={load} />
        ) : storiesPanel.kind === "empty" ? (
          <EmptyNote>No stories yet.</EmptyNote>
        ) : stories.map((story) => (
          <StoryRow key={story.story_id} story={story} onPress={() => navigation.navigate("storyDetail", { storyId: story.story_id })} />
        ))}

        {/* US-G2 · the public rescue map (GET /reports/map is AllowAny). The section header goes
            there directly, as on the signed-in Home. A row is a step toward claiming, which is
            an account action, so it opens the wall rather than a detail whose only control the
            guest cannot use. */}
        <SectionHeader
          testID="btn.homeGuest.rescueMap"
          title="Nearby rescues"
          actionLabel="See map ›"
          onPress={() => navigation.navigate("rescueMap")}
          style={sectionSpacing.next}
        />
        {rescuesPanel.kind !== "ready" && rescuesPanel.kind !== "empty" ? (
          <LoadStateView state={rescuesPanel} onRetry={load} />
        ) : rescuesPanel.kind === "empty" ? (
          <EmptyNote>No strays reported nearby yet.</EmptyNote>
        ) : rescues.map((report) => (
          <StrayRow key={report.report_id} report={report} onPress={() => openWall("account", report.species)} />
        ))}
      </ScrollView>

      <GuestTabs onGated={openWall} />

      <SignupWall
        visible={!!wall}
        action={wall?.action ?? "account"}
        subject={wall?.subject}
        onCreateAccount={onCreateAccount}
        onLogin={onWallLogin}
        onDismiss={() => setWall(null)}
      />
    </View>
  );
}

// A guest-only tab bar (not OwnerTabs): OwnerTabs navigates straight to the real Adopt/Volunteer/
// profile routes, which is exactly what a guest must not do — every non-Home tab here opens the
// SignupWall instead. Only the DESTINATIONS differ; the look comes from the shared TabBar.
//
// ⚠️ US-CH1 converted this bar. It was an opaque white 84 pt panel whose active state was a tinted
// chip behind the ICON ALONE, leaving the label outside the selection — the V2 shape. It now uses
// the same 68 pt glass bar as the other two shells, with the pill behind icon and label together.
// It also carried its own private colour table (GUEST_TAB_COLORS); the colours now come from the
// theme, which is the point of the exercise — this is the bar a signed-out visitor actually lands
// on, and it is the one that kept its 1.60:1 inactive icon the last time only the owner bar
// was fixed.
function GuestTabs({ onGated }: { onGated: (action: SignupWallAction) => void }) {
  const items: TabBarItem[] = [
    // Home is the tab the guest is already on, so TabBar swallows the press.
    { key: "home", label: "Home", testID: "tab.guest.home", icon: (c, s) => <HomeIcon color={c} size={s} />, onPress: () => {} },
    { key: "adopt", label: "Adopt", testID: "tab.guest.adopt", icon: (c, s) => <AdoptIcon color={c} size={s} />, onPress: () => onGated("adopt") },
    { key: "volunteer", label: "Volunteer", testID: "tab.guest.volunteer", icon: (c, s) => <VolunteerIcon color={c} size={s} />, onPress: () => onGated("volunteer") },
    { key: "profile", label: "You", testID: "tab.guest.profile", icon: (c, s) => <ProfileIcon color={c} size={s} />, onPress: () => onGated("account") }
  ];

  return <TabBar items={items} active="home" />;
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 20,
    paddingBottom: 156
  },
  loginPill: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: pill(40),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    ...elevation.soft
  },
  loginPillText: {
    color: colors.teal,
    ...typography.meta,
    fontWeight: "800"
  },
  // The signed-in Home's status card, in the guest's tint: same height, radius, padding and
  // type as `reviewCard` there. It was an outlined box with a circle icon — the V1 recipe.
  guestCard: {
    minHeight: 84,
    marginTop: 22,
    borderRadius: radii.card,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.soft
  },
  guestIcon: {
    width: 46,
    height: 46,
    borderRadius: squircle(46),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  guestCopy: {
    flex: 1,
    marginLeft: 14
  },
  guestTitle: {
    color: colors.ink,
    ...typography.meta,
    fontWeight: "800"
  },
  guestBody: {
    marginTop: 5,
    color: colors.muted,
    ...typography.caption,
    fontWeight: "600"
  },
  guestLink: {
    marginLeft: 8,
    color: colors.tealDark,
    ...typography.meta,
    fontWeight: "800"
  }
});
