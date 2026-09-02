import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BottomTabs, TabKey } from "./components/BottomTabs";

const paw = require("../assets/paw-white.png") as ImageSourcePropType;

type QuickAction = {
  label: string;
  icon: "search" | "heart" | "peso" | "person";
};

type PetCardProps = {
  name: string;
  details: string;
  shelter: string;
};

type PetCardViewProps = PetCardProps & {
  onPress?: () => void;
};

const quickActions: QuickAction[] = [
  { label: "Lost & found", icon: "search" },
  { label: "Adopt", icon: "heart" },
  { label: "Donate", icon: "peso" },
  { label: "Volunteer", icon: "person" }
];

const pets: PetCardProps[] = [
  { name: "Milo", details: "Aspin · 1 yr · Male", shelter: "PAWS Manila · 2 km" },
  { name: "Luna", details: "Puspin · 2 yrs · Female", shelter: "Marikina AWG · 4 km" }
];

type HomeScreenProps = {
  onNotifications?: () => void;
  onOpenPet?: () => void;
  onTabPress?: (tab: TabKey) => void;
};

export function HomeScreen({ onNotifications, onOpenPet, onTabPress }: HomeScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.statusBar}>
        <Text style={styles.time}>9:41</Text>
        <View style={styles.battery}>
          <View style={styles.batteryDot} />
          <View style={styles.batteryDot} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Kumusta, Ana!</Text>
            <Text style={styles.role}>Pet owner · rescuer application pending</Text>
          </View>
          <TouchableOpacity activeOpacity={0.75} onPress={onNotifications} style={styles.bellButton}>
            <View style={styles.bellDome} />
            <View style={styles.bellBase} />
            <View style={styles.bellClapper} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.reviewCard}>
          <View style={styles.clockIcon}>
            <View style={styles.clockHandTall} />
            <View style={styles.clockHandWide} />
          </View>
          <View style={styles.reviewCopy}>
            <Text style={styles.reviewTitle}>Rescuer application under review</Text>
            <Text style={styles.reviewText}>We'll notify you within a day.</Text>
          </View>
          <Text style={styles.statusLink}>Status ›</Text>
        </TouchableOpacity>

        <View style={styles.reportCard}>
          <View>
            <Text style={styles.reportTitle}>Saw a stray?</Text>
            <Text style={styles.reportText}>Report it in seconds — help is near.</Text>
            <TouchableOpacity activeOpacity={0.85} style={styles.reportButton}>
              <Text style={styles.reportButtonText}>Report now</Text>
            </TouchableOpacity>
          </View>
          <Image source={paw} resizeMode="contain" style={styles.reportPaw} />
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity key={action.label} activeOpacity={0.82} style={styles.quickCard}>
              <View style={styles.quickIcon}>{renderQuickIcon(action.icon)}</View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Adopt near you</Text>
          <TouchableOpacity activeOpacity={0.75}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {pets.map((pet) => (
          <PetCard key={pet.name} {...pet} onPress={onOpenPet} />
        ))}

        <Text style={[styles.sectionTitle, styles.rescueTitle]}>Nearby rescues</Text>
        <View style={styles.rescueCard}>
          <View style={styles.avatarCircle}>
            <Image source={paw} resizeMode="contain" style={styles.avatarPaw} />
          </View>
          <View style={styles.petCopy}>
            <Text style={styles.petName}>Aspin · Quezon City</Text>
            <Text style={styles.petDetails}>0.4 km · needs pickup</Text>
          </View>
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>Urgent</Text>
          </View>
        </View>

        <Text style={styles.lockedNote}>Claiming rescues unlocks once you're verified.</Text>
      </ScrollView>

      <BottomTabs active="home" onTabPress={onTabPress} />
    </View>
  );
}

function PetCard({ name, details, shelter, onPress }: PetCardViewProps) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.petCard}>
      <View style={styles.avatarCircle}>
        <Image source={paw} resizeMode="contain" style={styles.avatarPaw} />
      </View>
      <View style={styles.petCopy}>
        <Text style={styles.petName}>{name}</Text>
        <Text style={styles.petDetails}>{details}</Text>
      </View>
      <View style={styles.petMeta}>
        <View style={styles.availableBadge}>
          <Text style={styles.availableText}>Available</Text>
        </View>
        <Text style={styles.shelterText}>{shelter}</Text>
      </View>
    </TouchableOpacity>
  );
}

function renderQuickIcon(icon: QuickAction["icon"]) {
  if (icon === "search") {
    return (
      <View style={styles.searchIcon}>
        <View style={styles.searchCircle} />
        <View style={styles.searchHandle} />
      </View>
    );
  }

  if (icon === "person") {
    return (
      <View style={styles.personIcon}>
        <View style={styles.personHead} />
        <View style={styles.personBody} />
      </View>
    );
  }

  return <Text style={styles.quickSymbol}>{icon === "heart" ? "♥" : "₱"}</Text>;
}

const colors = {
  ink: "#1F3A5F",
  teal: "#1C7876",
  page: "#F7F7F4",
  border: "#E3E1D9",
  muted: "#62615C",
  cream: "#FFF0D8",
  amber: "#8A560D",
  paleTeal: "#E5F0EE"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  statusBar: {
    height: 88,
    paddingHorizontal: 30
  },
  time: {
    position: "absolute",
    left: 31,
    top: 17,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  battery: {
    position: "absolute",
    right: 26,
    top: 20,
    width: 29,
    height: 14,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 4,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 4
  },
  batteryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ink
  },
  content: {
    paddingHorizontal: 26,
    paddingBottom: 156
  },
  headerRow: {
    marginTop: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  greeting: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28
  },
  role: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13
  },
  bellButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  bellDome: {
    width: 15,
    height: 15,
    borderWidth: 2,
    borderColor: colors.ink,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8
  },
  bellBase: {
    width: 22,
    height: 2,
    marginTop: -1,
    borderRadius: 1,
    backgroundColor: colors.ink
  },
  bellClapper: {
    width: 5,
    height: 5,
    marginTop: 2,
    borderRadius: 3,
    backgroundColor: colors.ink
  },
  reviewCard: {
    height: 84,
    marginTop: 22,
    borderRadius: 15,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    backgroundColor: colors.cream
  },
  clockIcon: {
    width: 38,
    height: 38,
    borderWidth: 3,
    borderColor: colors.amber,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  clockHandTall: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.amber,
    transform: [{ translateY: -3 }]
  },
  clockHandWide: {
    width: 10,
    height: 3,
    marginTop: -5,
    marginLeft: 8,
    borderRadius: 2,
    backgroundColor: colors.amber
  },
  reviewCopy: {
    flex: 1,
    marginLeft: 14
  },
  reviewTitle: {
    color: "#6E3D06",
    fontSize: 14,
    fontWeight: "800"
  },
  reviewText: {
    marginTop: 5,
    color: "#8C5A14",
    fontSize: 11
  },
  statusLink: {
    color: "#6E3D06",
    fontSize: 12,
    fontWeight: "800"
  },
  reportCard: {
    height: 136,
    marginTop: 22,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 16,
    paddingTop: 26,
    backgroundColor: colors.teal
  },
  reportTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 28
  },
  reportText: {
    marginTop: 9,
    color: "#D5ECE8",
    fontSize: 13
  },
  reportButton: {
    width: 136,
    height: 38,
    marginTop: 14,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  reportButtonText: {
    color: "#126B69",
    fontSize: 13,
    fontWeight: "800"
  },
  reportPaw: {
    width: 72,
    height: 72,
    marginTop: 4
  },
  quickGrid: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  quickCard: {
    width: "23%",
    height: 86,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  quickLabel: {
    marginTop: 8,
    color: colors.ink,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center"
  },
  quickSymbol: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900"
  },
  searchIcon: {
    width: 25,
    height: 25
  },
  searchCircle: {
    width: 17,
    height: 17,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 9
  },
  searchHandle: {
    position: "absolute",
    right: 2,
    bottom: 3,
    width: 11,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }]
  },
  personIcon: {
    alignItems: "center"
  },
  personHead: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#FFFFFF"
  },
  personBody: {
    width: 23,
    height: 13,
    marginTop: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#FFFFFF"
  },
  sectionHeader: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  seeAll: {
    color: "#126B69",
    fontSize: 12,
    fontWeight: "800"
  },
  petCard: {
    height: 68,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 13,
    backgroundColor: "#FFFFFF"
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paleTeal
  },
  avatarPaw: {
    width: 24,
    height: 24,
    tintColor: colors.teal
  },
  petCopy: {
    flex: 1,
    marginLeft: 14
  },
  petName: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  petDetails: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 11
  },
  petMeta: {
    alignItems: "flex-end"
  },
  availableBadge: {
    minWidth: 92,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E1F2D3"
  },
  availableText: {
    color: "#356A24",
    fontSize: 12,
    fontWeight: "800"
  },
  shelterText: {
    marginTop: 8,
    color: "#AAA69D",
    fontSize: 10
  },
  rescueTitle: {
    marginTop: 34
  },
  rescueCard: {
    height: 68,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 13,
    backgroundColor: "#FFFFFF"
  },
  urgentBadge: {
    width: 68,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDE9C8"
  },
  urgentText: {
    color: "#74440D",
    fontSize: 12,
    fontWeight: "800"
  },
  lockedNote: {
    marginTop: 14,
    color: colors.muted,
    fontSize: 11,
    textAlign: "center"
  }
});
