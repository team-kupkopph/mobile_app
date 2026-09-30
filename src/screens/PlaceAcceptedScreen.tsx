// US-H3 · placement-accepted confirmation. A PERSON's accept makes the animal their pet, so the
// next stop is My pets. D7 · a SHELTER's accept lands the animal as a private draft listing
// in its Animals tab (the route carries its listingId), so the next stop is finishing it.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CheckIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { colors, spacing, squircle, typography } from "../theme";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Card } from "../components/ui";


type Props = NativeStackScreenProps<RootStackParamList, "placeAccepted">;

export function PlaceAcceptedScreen({ navigation, route }: Props) {
  const draftId = route.params?.listingId;
  if (draftId) {
    return (
      <View style={styles.screen}>
        <ScreenBackdrop />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card tone="hero" style={styles.hero}>
            <View style={styles.heroIcon}><CheckIcon color={colors.white} size={30} /></View>
            <Text style={styles.heroTitle}>They're in your care</Text>
            <Text style={styles.heroBody}>
              They're in your Animals tab as a draft that only you can see. Add their story and
              adoption fee, then publish them to the Adopt feed.
            </Text>
            <Button label="Finish the listing" testID="btn.placeAccepted.finish"
              onPress={() => navigation.replace("listingForm", { listingId: draftId })} style={styles.primary} />
            <Button label="Later" variant="secondary"
              onPress={() => navigation.navigate("shelterAnimals")} style={styles.secondary} />
          </Card>
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card tone="hero" style={styles.hero}>
          <View style={styles.heroIcon}><CheckIcon color={colors.white} size={30} /></View>
          <Text style={styles.heroTitle}>Welcome home!</Text>
          <Text style={styles.heroBody}>
            The placement's confirmed and the pet is now yours. Take good care of them.
          </Text>

          <Button label="See my pets" onPress={() => navigation.navigate("myPets")} style={styles.primary} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 90, paddingBottom: 60 },
  hero: { width: "100%", alignItems: "center" },
  heroIcon: { width: 76, height: 76, borderRadius: squircle(76), alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  heroTitle: { marginTop: 18, color: colors.ink, ...typography.hero },
  heroBody: { marginTop: 8, color: colors.muted, ...typography.subtitle, textAlign: "center" },
  primary: { marginTop: 40 },
  secondary: { marginTop: 12 }
});
