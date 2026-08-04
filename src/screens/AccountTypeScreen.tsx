// US-A1 step 1 — reference: screens/user/screen-account-type.png
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RootStackParamList } from "../navigation/types";
import { AuthHeader, authColors } from "./AuthFormKit";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type Props = NativeStackScreenProps<RootStackParamList, "accountType">;

export function AccountTypeScreen({ navigation }: Props) {
  function onPetOwner() {
    navigation.navigate("signup", { accountType: "personal" });
  }

  function onShelter() {
    Alert.alert(
      "Shelter accounts coming soon",
      "Shelter & organization signup isn't open yet — check back soon."
    );
  }

  return (
    <View style={styles.screen}>
      <AuthHeader title="Choose account type" activeStep={0} onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.title}>How will you join?</Text>
        <Text style={styles.caption}>This sets up the right account — you can get verified anytime.</Text>

        <TouchableOpacity activeOpacity={0.85} onPress={onPetOwner} style={styles.card}>
          <View style={styles.iconCircle}>
            <Image source={paw} resizeMode="contain" style={styles.pawIcon} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>Pet Owner</Text>
            <Text style={styles.cardBody}>Adopt, report strays, and rehome animals you rescue yourself.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={onShelter} style={[styles.card, styles.secondCard]}>
          <View style={[styles.iconCircle, styles.orgIconCircle]}>
            <Text style={styles.orgGlyph}>▦</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>Shelter / Organization</Text>
            <Text style={styles.cardBody}>List animals, receive donations, and host volunteers.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: authColors.page
  },
  content: {
    flex: 1,
    paddingHorizontal: 28
  },
  title: {
    color: authColors.ink,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30
  },
  caption: {
    marginTop: 6,
    color: authColors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  card: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  secondCard: {
    marginTop: 18
  },
  iconCircle: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: authColors.teal
  },
  pawIcon: {
    width: 30,
    height: 30
  },
  orgIconCircle: {
    backgroundColor: authColors.paleTeal
  },
  orgGlyph: {
    color: authColors.teal,
    fontSize: 28,
    fontWeight: "900"
  },
  copy: {
    flex: 1,
    marginLeft: 18
  },
  cardTitle: {
    color: authColors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  cardBody: {
    marginTop: 6,
    color: authColors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  chevron: {
    color: authColors.muted,
    fontSize: 26,
    fontWeight: "700",
    marginLeft: 8
  }
});
