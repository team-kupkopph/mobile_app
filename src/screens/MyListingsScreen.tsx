// Spec 2026-10-06 §3 · an individual poster's listings (Profile → My listings): the same body as
// Shelter Animals, as a stack screen with a back button instead of the shelter tab bar.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { ListingsByStatus } from "../components/ListingsByStatus";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, ScreenHeader } from "../components/ui";
import { RootStackParamList } from "../navigation/types";
import { draftRoute } from "../shelterAnimals";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "myListings">;

export function MyListingsScreen({ navigation }: Props) {
  return (
    <View style={styles.screen} testID="screen.myListings">
      <ScreenBackdrop />
      <ScreenHeader title="My listings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ListingsByStatus
          segmentTestID="seg.myListings"
          onOpen={(listingId) => navigation.navigate("posterListing", { listingId })}
          onOpenDraft={(listingId) => { const to = draftRoute(listingId); navigation.navigate(to.name, to.params); }}
          actions={<Button label="+  List an animal" onPress={() => navigation.navigate("listingForm", undefined)} style={styles.button} />}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 48 },
  button: { marginTop: 18 }
});
