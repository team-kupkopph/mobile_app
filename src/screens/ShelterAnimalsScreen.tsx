// Task B2 · the shelter's Animals tab root (spec §5's "Animals" row). New screen, V3 from
// birth — the fifth of ShelterTabs' five tabs to stop being dead (see `surfaceV3.test.ts`'s
// `findDeadTabs`). The list body itself — Live/Reserved/Adopted over the shelter's OWN listings,
// plus drafts — is ListingsByStatus, shared with My listings (spec 2026-10-06 §3). The "+ List
// an animal" CTA used to live on ShelterDashboardScreen; it lives here, next to the listings it
// actually creates.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ListingsByStatus } from "../components/ListingsByStatus";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { ShelterTabs } from "../components/ShelterTabs";
import { Button } from "../components/ui";
import { RootStackParamList } from "../navigation/types";
import { draftRoute } from "../shelterAnimals";
import { colors, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "shelterAnimals">;

export function ShelterAnimalsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen} testID="screen.shelterAnimals">
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        {/* A real wrapper, not a bare <Text> — keeps an intervening <View> between the root and
            the body so offlineEscape.test.ts / safeAreaOnFailure.test.ts never read the screen
            as the "replaces the whole screen" shape; this one genuinely groups the title. */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Animals</Text>
        </View>

        <ListingsByStatus
          segmentTestID="seg.shelterAnimals"
          onOpen={(listingId) => navigation.navigate("posterListing", { listingId })}
          onOpenDraft={(listingId) => { const to = draftRoute(listingId); navigation.navigate(to.name, to.params); }}
          actions={<Button label="+  List an animal" onPress={() => navigation.navigate("listingForm", undefined)} style={styles.primaryButton} />}
        />
      </ScrollView>

      <ShelterTabs
        active="animals"
        onTabPress={(t) => {
          if (t === "home") navigation.navigate("shelterDashboard");
          if (t === "donate") navigation.navigate("shelterDonate");
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
  header: { flexDirection: "row", alignItems: "center" },
  primaryButton: { marginTop: 18 }
});
