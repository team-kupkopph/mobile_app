import { Image, ImageSourcePropType, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useState } from "react";

import { DocumentIcon, UserBadgeIcon } from "./components/AppIcons";
import { TopStatus } from "./components/TopStatus";

const paw = require("../assets/paw-white.png") as ImageSourcePropType;

type ScreenProps = {
  onBack: () => void;
  onNext?: () => void;
};

const unlocks = [
  "Claim & update stray rescue cases",
  "Post rescued animals for adoption",
  "Adopt from partner shelters",
  "Keep everything you do as a fur parent"
];

export function RescuerUpgradeScreen({ onBack, onNext }: ScreenProps) {
  return (
    <View style={styles.screen}>
      <Header title="Become a rescuer" onBack={onBack} />

      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <UserBadgeIcon color="#5AA39D" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Rescue with Kupkop</Text>
            <Text style={styles.heroText}>Unlock rescue tools on your personal account.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What you unlock</Text>
        <View style={styles.unlockList}>
          {unlocks.map((item) => (
            <View key={item} style={styles.unlockRow}>
              <Image source={paw} resizeMode="contain" style={styles.unlockPaw} />
              <Text style={styles.unlockText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Light verification</Text>
          <Text style={styles.infoText}>A valid ID and one link to your rescue page.</Text>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.primaryButton} onPress={onNext}>
          <Text style={styles.primaryText}>Get verified</Text>
        </TouchableOpacity>
        <Text style={styles.footerHint}>Free · takes a few minutes</Text>
      </View>
    </View>
  );
}

export function RescuerVerifyScreen({ onBack }: ScreenProps) {
  const [pageLink, setPageLink] = useState("facebook.com/maria.rescues");
  const [about, setAbout] = useState("I've fostered aspins in QC since 2022...");

  return (
    <View style={styles.screen}>
      <Header title="Rescuer verification" onBack={onBack} />

      <View style={styles.content}>
        <Text style={styles.verifyTitle}>Quick verification</Text>
        <Text style={styles.verifySubtitle}>Two things and you're set.</Text>

        <TouchableOpacity activeOpacity={0.82} style={styles.uploadCard}>
          <View style={styles.documentCircle}>
            <DocumentIcon color={colors.teal} />
          </View>
          <View style={styles.uploadCopy}>
            <Text style={styles.uploadTitle}>Valid government ID</Text>
            <Text style={styles.uploadText}>A clear photo of your ID · Required</Text>
          </View>
          <View style={styles.checkCircle}>
            <Text style={styles.checkText}>✓</Text>
          </View>
          <Text style={styles.fileName}>maria-id.jpg</Text>
        </TouchableOpacity>

        <Text style={styles.inputLabel}>Rescue page link</Text>
        <TextInput
          value={pageLink}
          onChangeText={setPageLink}
          autoCapitalize="none"
          keyboardType="url"
          style={styles.linkInput}
        />

        <Text style={styles.inputLabel}>About your rescue work (optional)</Text>
        <TextInput value={about} onChangeText={setAbout} multiline textAlignVertical="top" style={styles.aboutInput} />

        <Text style={styles.reviewNote}>A Kupkop admin reviews this — usually within a day.</Text>

        <TouchableOpacity activeOpacity={0.85} style={styles.submitButton}>
          <Text style={styles.primaryText}>Submit for review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TopStatus />
      <TouchableOpacity activeOpacity={0.75} onPress={onBack} style={styles.backButton} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const colors = {
  ink: "#1F3A5F",
  teal: "#1C7876",
  page: "#F7F7F4",
  border: "#E3E1D9",
  muted: "#62615C",
  paleTeal: "#E5F0EE"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  header: {
    height: 108
  },
  backButton: {
    position: "absolute",
    left: 25,
    top: 45,
    width: 42,
    height: 42,
    zIndex: 10,
    justifyContent: "center"
  },
  backText: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 34
  },
  headerTitle: {
    marginTop: -3,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  content: {
    flex: 1,
    paddingHorizontal: 26
  },
  heroCard: {
    height: 110,
    marginTop: 2,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
    backgroundColor: colors.teal
  },
  heroIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5AA39D"
  },
  heroCopy: {
    flex: 1,
    marginLeft: 20
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800"
  },
  heroText: {
    marginTop: 11,
    width: 170,
    color: "#D7F0EC",
    fontSize: 12,
    lineHeight: 18
  },
  sectionTitle: {
    marginTop: 25,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  unlockList: {
    marginTop: 18,
    gap: 21
  },
  unlockRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  unlockPaw: {
    width: 20,
    height: 20,
    tintColor: colors.teal,
    transform: [{ translateY: -2 }]
  },
  unlockText: {
    marginLeft: 18,
    color: colors.ink,
    fontSize: 13
  },
  infoCard: {
    height: 72,
    marginTop: 48,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "#EAF6F4"
  },
  infoTitle: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "800"
  },
  infoText: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 11
  },
  primaryButton: {
    height: 49,
    marginTop: 35,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  footerHint: {
    marginTop: 11,
    color: "#B8B5AD",
    fontSize: 10,
    textAlign: "center"
  },
  verifyTitle: {
    marginTop: 0,
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  verifySubtitle: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 13
  },
  uploadCard: {
    height: 84,
    marginTop: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF"
  },
  documentCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paleTeal
  },
  uploadCopy: {
    flex: 1,
    marginLeft: 16
  },
  uploadTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  uploadText: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 10
  },
  checkCircle: {
    position: "absolute",
    right: 16,
    top: 17,
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E1F2D3"
  },
  checkText: {
    color: "#356A24",
    fontSize: 14,
    fontWeight: "900"
  },
  fileName: {
    position: "absolute",
    right: 16,
    bottom: 18,
    color: colors.muted,
    fontSize: 10
  },
  inputLabel: {
    marginTop: 17,
    marginBottom: 9,
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  linkInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 17,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    backgroundColor: "#FFFFFF"
  },
  aboutInput: {
    height: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 17,
    paddingTop: 15,
    color: colors.muted,
    fontSize: 13,
    backgroundColor: "#FFFFFF"
  },
  reviewNote: {
    marginTop: 17,
    color: colors.muted,
    fontSize: 11
  },
  submitButton: {
    height: 51,
    marginTop: 38,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  }
});
