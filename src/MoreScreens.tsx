import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useState } from "react";

import { DocumentIcon } from "./components/AppIcons";
import { TopStatus } from "./components/TopStatus";

const paw = require("../assets/paw-white.png") as ImageSourcePropType;

type ScreenProps = {
  onBack: () => void;
};

type OptionChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

type SettingsGroupProps = {
  title: string;
  rows: Array<{ label: string; value?: string }>;
};

const notifications = [
  {
    title: "Shift cancelled",
    body: "PAWS Manila cancelled “Morning dog walk”\n(Sat, Jul 12). Your slot was released.",
    time: "2h",
    kind: "alert"
  },
  {
    title: "Shift confirmed",
    body: "Marikina AWG confirmed “Feed the rescue\npack” (Sun, Jul 13). Added to your calendar.",
    time: "1d",
    kind: "success"
  },
  {
    title: "New pet near you",
    body: "Milo, an Aspin, is looking for a home 2 km away.",
    time: "2d",
    kind: "pet"
  }
];

export function AddPetScreen({ onBack }: ScreenProps) {
  const [name, setName] = useState("Milo");
  const [species, setSpecies] = useState("Dog");
  const [breed, setBreed] = useState("Aspin (Asong Pinoy)");
  const [birthdate, setBirthdate] = useState("10 Feb 2024");
  const [sex, setSex] = useState("Male");
  const [spayed, setSpayed] = useState(true);

  return (
    <View style={styles.screen}>
      <Header title="Add a pet" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.addContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity activeOpacity={0.8} style={styles.photoWrap}>
          <View style={styles.photoCircle}>
            <Image source={paw} resizeMode="contain" style={styles.photoPaw} />
          </View>
          <View style={styles.plusBadge}>
            <Text style={styles.plusText}>+</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.photoText}>Add a photo</Text>

        <Text style={styles.label}>Pet name</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />

        <Text style={styles.label}>Species</Text>
        <View style={styles.chipRow}>
          {['Dog', 'Cat', 'Other'].map((item) => (
            <OptionChip key={item} label={item} active={species === item} onPress={() => setSpecies(item)} />
          ))}
        </View>

        <Text style={styles.label}>Breed</Text>
        <View style={styles.selectInput}>
          <TextInput value={breed} onChangeText={setBreed} style={styles.selectText} />
          <Text style={styles.downChevron}>⌄</Text>
        </View>

        <Text style={styles.label}>Birthdate</Text>
        <View style={styles.selectInput}>
          <TextInput value={birthdate} onChangeText={setBirthdate} style={styles.selectText} />
          <View style={styles.calendarIcon}>
            <View style={styles.calendarTop} />
            <View style={styles.calendarRingLeft} />
            <View style={styles.calendarRingRight} />
          </View>
        </View>

        <Text style={styles.label}>Sex</Text>
        <View style={styles.chipRow}>
          {['Male', 'Female'].map((item) => (
            <OptionChip key={item} label={item} active={sex === item} onPress={() => setSex(item)} />
          ))}
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Spayed / neutered</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setSpayed((value) => !value)} style={[styles.switchTrack, spayed && styles.switchTrackActive]}>
            <View style={[styles.switchThumb, spayed && styles.switchThumbActive]} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.saveButton}>
          <Text style={styles.primaryText}>Save pet</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function SettingsScreen({ onBack }: ScreenProps) {
  return (
    <View style={styles.screen}>
      <Header title="Settings" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
        <SettingsGroup
          title="ACCOUNT"
          rows={[
            { label: "Edit profile" },
            { label: "Phone number", value: "+63 917…" },
            { label: "Email address" }
          ]}
        />
        <SettingsGroup title="PREFERENCES" rows={[{ label: "Notifications" }, { label: "Location" }]} />
        <SettingsGroup
          title="SUPPORT"
          rows={[{ label: "Help center" }, { label: "About Kupkop PH" }, { label: "Privacy & terms" }]}
        />
        <TouchableOpacity activeOpacity={0.8} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>Kupkop PH · v0.1.0 (MVP)</Text>
      </ScrollView>
    </View>
  );
}

export function NotificationsScreen({ onBack }: ScreenProps) {
  return (
    <View style={styles.screen}>
      <Header title="Notifications" onBack={onBack} />
      <View style={styles.notificationsContent}>
        {notifications.map((item) => (
          <View key={item.title} style={styles.notificationRow}>
            <View style={[styles.notificationIcon, item.kind === "alert" && styles.alertIcon, item.kind === "success" && styles.successIcon]}>
              {item.kind === "pet" ? (
                <Image source={paw} resizeMode="contain" style={styles.notificationPaw} />
              ) : item.kind === "success" ? (
                <Text style={styles.successMark}>✓</Text>
              ) : (
                <Text style={styles.alertMark}>!</Text>
              )}
            </View>
            <View style={styles.notificationCopy}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.notificationTime}>{item.time}</Text>
              </View>
              <Text style={styles.notificationBody}>{item.body}</Text>
            </View>
            {item.kind === "alert" && <View style={styles.unreadDot} />}
          </View>
        ))}
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

function OptionChip({ label, active, onPress }: OptionChipProps) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.chip, active && styles.activeChip]}>
      <Text style={[styles.chipText, active && styles.activeChipText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SettingsGroup({ title, rows }: SettingsGroupProps) {
  return (
    <View style={styles.settingsGroupWrap}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.settingsCard}>
        {rows.map((row, index) => (
          <View key={row.label}>
            <TouchableOpacity activeOpacity={0.75} style={styles.settingItem}>
              <Text style={styles.settingLabel}>{row.label}</Text>
              {row.value && <Text style={styles.settingValue}>{row.value}</Text>}
              <Text style={styles.settingChevron}>›</Text>
            </TouchableOpacity>
            {index < rows.length - 1 && <View style={styles.settingDivider} />}
          </View>
        ))}
      </View>
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
  addContent: {
    paddingHorizontal: 26,
    paddingBottom: 36
  },
  photoWrap: {
    width: 98,
    height: 98,
    marginTop: 24,
    alignSelf: "center"
  },
  photoCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.paleTeal
  },
  photoPaw: {
    width: 34,
    height: 34,
    tintColor: colors.teal,
    transform: [{ translateY: -3 }]
  },
  plusBadge: {
    position: "absolute",
    right: 0,
    bottom: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  plusText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 26
  },
  photoText: {
    marginTop: 14,
    marginBottom: 18,
    color: colors.teal,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center"
  },
  label: {
    marginTop: 12,
    marginBottom: 9,
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  input: {
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
  chipRow: {
    flexDirection: "row",
    gap: 10
  },
  chip: {
    height: 40,
    minWidth: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF"
  },
  activeChip: {
    borderColor: colors.teal,
    backgroundColor: colors.teal
  },
  chipText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800"
  },
  activeChipText: {
    color: "#FFFFFF"
  },
  selectInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 17,
    backgroundColor: "#FFFFFF"
  },
  selectText: {
    flex: 1,
    height: "100%",
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  downChevron: {
    color: colors.muted,
    fontSize: 28,
    lineHeight: 28
  },
  calendarIcon: {
    width: 23,
    height: 22,
    borderWidth: 2,
    borderColor: colors.muted,
    borderRadius: 3
  },
  calendarTop: {
    height: 5,
    borderBottomWidth: 2,
    borderBottomColor: colors.muted
  },
  calendarRingLeft: {
    position: "absolute",
    left: 5,
    top: -5,
    width: 3,
    height: 7,
    borderRadius: 2,
    backgroundColor: colors.muted
  },
  calendarRingRight: {
    position: "absolute",
    right: 5,
    top: -5,
    width: 3,
    height: 7,
    borderRadius: 2,
    backgroundColor: colors.muted
  },
  toggleRow: {
    marginTop: 31,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  toggleLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  switchTrack: {
    width: 62,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    paddingHorizontal: 4,
    backgroundColor: "#CAD2CF"
  },
  switchTrackActive: {
    backgroundColor: colors.teal
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF"
  },
  switchThumbActive: {
    alignSelf: "flex-end"
  },
  saveButton: {
    height: 51,
    marginTop: 36,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  settingsContent: {
    paddingHorizontal: 26,
    paddingTop: 34,
    paddingBottom: 40
  },
  settingsGroupWrap: {
    marginBottom: 12
  },
  groupTitle: {
    marginBottom: 10,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  settingsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#FFFFFF"
  },
  settingItem: {
    minHeight: 52,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 17
  },
  settingLabel: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  settingValue: {
    marginRight: 14,
    color: colors.muted,
    fontSize: 13
  },
  settingChevron: {
    color: "#B9B5AA",
    fontSize: 27,
    lineHeight: 27
  },
  settingDivider: {
    height: 1,
    marginLeft: 17,
    marginRight: 17,
    backgroundColor: colors.border
  },
  logoutButton: {
    height: 52,
    marginTop: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  logoutText: {
    color: "#B33636",
    fontSize: 14,
    fontWeight: "800"
  },
  versionText: {
    marginTop: 35,
    color: "#B8B5AD",
    fontSize: 11,
    textAlign: "center"
  },
  notificationsContent: {
    paddingHorizontal: 26,
    paddingTop: 54
  },
  notificationRow: {
    minHeight: 84,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    paddingTop: 12
  },
  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paleTeal
  },
  alertIcon: {
    backgroundColor: "#FDE9C8"
  },
  successIcon: {
    backgroundColor: "#E1F2D3"
  },
  alertMark: {
    width: 20,
    height: 20,
    borderWidth: 3,
    borderColor: "#8A560D",
    borderRadius: 10,
    color: "#8A560D",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
    textAlign: "center"
  },
  successMark: {
    color: "#356A24",
    fontSize: 20,
    fontWeight: "900"
  },
  notificationPaw: {
    width: 21,
    height: 21,
    tintColor: colors.teal,
    transform: [{ translateY: -2 }]
  },
  notificationCopy: {
    flex: 1,
    marginLeft: 16
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  notificationTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  notificationTime: {
    color: "#B8B5AD",
    fontSize: 10
  },
  notificationBody: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17
  },
  unreadDot: {
    position: "absolute",
    right: 0,
    top: 32,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.teal
  }
});
