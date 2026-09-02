import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BellIcon, UserBadgeIcon } from "./components/AppIcons";
import { ShelterTabs, ShelterTabKey } from "./components/ShelterTabs";
import { TopStatus } from "./components/TopStatus";

const paw = require("../assets/paw-white.png") as ImageSourcePropType;


type ShelterDashboardProps = {
  verified?: boolean;
  onContinueVerification?: () => void;
  onDonations?: () => void;
  onListings?: () => void;
  onListAnimal?: () => void;
  onTabPress?: (tab: ShelterTabKey) => void;
};

type ShelterDonationsProps = {
  onBack: () => void;
  onTabPress?: (tab: ShelterTabKey) => void;
};


export function ShelterDashboardScreen({ verified = false, onContinueVerification, onDonations, onListings, onListAnimal, onTabPress }: ShelterDashboardProps) {
  const stats = verified
    ? [
        { value: "12", label: "Listed" },
        { value: "34", label: "Adopted" },
        { value: "₱18.4k", label: "Donations" }
      ]
    : [
        { value: "3", label: "Drafts" },
        { value: "0", label: "Adopted" },
        { value: "₱0", label: "Donations" }
      ];

  const shortcuts = verified ? ["Listings", "Volunteer", "Donations", "Requests"] : ["Listings", "Donations", "Requests"];

  return (
    <View style={styles.screen}>
      <TopStatus />
      <ScrollView contentContainerStyle={styles.dashboardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.dashboardHeader}>
          <View>
            <View style={styles.orgNameRow}>
              <Text style={styles.orgName}>PAWS Manila</Text>
              {verified ? <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓</Text></View> : <View style={styles.unverifiedPill}><Text style={styles.unverifiedText}>Unverified</Text></View>}
            </View>
            <Text style={styles.dashboardSubhead}>Shelter dashboard</Text>
          </View>
          <TouchableOpacity activeOpacity={0.75} style={styles.bellButton}>
            <BellIcon color={colors.ink} />
          </TouchableOpacity>
        </View>

        {!verified && (
          <View style={styles.reviewCard}>
            <View style={styles.clockIcon}><View style={styles.clockHandTall} /><View style={styles.clockHandWide} /></View>
            <View style={styles.reviewCopy}>
              <Text style={styles.reviewTitle}>Under review</Text>
              <Text style={styles.reviewText}>Listings stay hidden & donations off until approved.</Text>
            </View>
            <TouchableOpacity activeOpacity={0.75} onPress={onContinueVerification}>
              <Text style={styles.statusLink}>Status ›</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsCard}>
          {stats.map((stat, index) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              {index < stats.length - 1 && <View style={styles.statDivider} />}
            </View>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.listAnimalButton} onPress={onListAnimal}>
          <Text style={styles.listAnimalText}>+ List an animal</Text>
        </TouchableOpacity>
        {!verified && <Text style={styles.savedDraftText}>Saved as a draft until you're verified.</Text>}

        <View style={verified ? styles.verifiedShortcutGrid : styles.shortcutGrid}>
          {shortcuts.map((label) => (
            <ShortcutCard key={label} label={label} locked={!verified && label === "Donations"} onPress={label === "Donations" ? onDonations : label === "Listings" ? onListings : undefined} />
          ))}
        </View>

        {verified ? <RequestsPreview /> : <VerifyCard onPress={onContinueVerification} />}
      </ScrollView>
      <ShelterTabs active="home" onTabPress={onTabPress} />
    </View>
  );
}

export function ShelterDonationsScreen({ onBack, onTabPress }: ShelterDonationsProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.donationsHeader}>
        <TopStatus />
        <TouchableOpacity activeOpacity={0.75} onPress={onBack} style={styles.backButton} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.donationsContent} showsVerticalScrollIndicator={false}>
        <View style={styles.donationTotalCard}>
          <Text style={styles.receivedLabel}>Received this month</Text>
          <Text style={styles.donationTotal}>₱18,450</Text>
          <Text style={styles.donorCount}>132 donors</Text>
        </View>

        <Text style={styles.sectionTitle}>Your Abot-tulong QR</Text>
        <View style={styles.qrCard}>
          <QrCode />
          <Text style={styles.qrText}>Scan with GCash · Maya · GrabPay</Text>
        </View>

        <Text style={styles.sectionTitle}>Recent donations</Text>
        <DonationRow initials="AR" name="Ana Reyes" time="2h ago" amount="₱500" />
        <DonationRow initials="?" name="Anonymous" time="5h ago" amount="₱250" />
        <DonationRow initials="JC" name="Jose Cruz" time="Yesterday" amount="₱1,000" />
      </ScrollView>
      <ShelterTabs active="donate" onTabPress={onTabPress} />
    </View>
  );
}

function ShortcutCard({ label, locked, onPress }: { label: string; locked?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.shortcutCard}>
      {locked && <View style={styles.lockBadge}><Text style={styles.lockText}>•</Text></View>}
      <View style={styles.shortcutIcon}>{label === "Volunteer" ? <UserBadgeIcon color={colors.teal} /> : label === "Donations" ? <Text style={styles.shortcutGlyph}>₱</Text> : label === "Requests" ? <Text style={styles.shortcutGlyph}>✉</Text> : <Image source={paw} resizeMode="contain" style={styles.shortcutPaw} />}</View>
      <Text style={styles.shortcutLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function VerifyCard({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.verifyCard}>
      <View>
        <Text style={styles.verifyTitle}>Finish verifying to go live</Text>
        <Text style={styles.verifyText}>Upload your documents to get approved.</Text>
      </View>
      <Text style={styles.verifyLink}>Continue ›</Text>
    </TouchableOpacity>
  );
}

function RequestsPreview() {
  return (
    <View style={styles.requestsBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Adoption requests</Text>
        <Text style={styles.seeAll}>See all</Text>
      </View>
      <RequestRow initials="AR" name="Ana Reyes" body="wants to adopt Milo" badge="New" />
      <RequestRow initials="JC" name="Jose Cruz" body="wants to adopt Luna" badge="Review" />
    </View>
  );
}

function RequestRow({ initials, name, body, badge }: { initials: string; name: string; body: string; badge: string }) {
  return (
    <View style={styles.requestRow}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
      <View style={styles.requestCopy}>
        <Text style={styles.requestName}>{name}</Text>
        <Text style={styles.requestBody}>{body}</Text>
      </View>
      <View style={badge === "New" ? styles.newBadge : styles.reviewBadge}><Text style={badge === "New" ? styles.newText : styles.reviewBadgeText}>{badge}</Text></View>
    </View>
  );
}

function DonationRow({ initials, name, time, amount }: { initials: string; name: string; time: string; amount: string }) {
  return (
    <View style={styles.donationRow}>
      <View style={styles.donationAvatar}><Text style={styles.donationAvatarText}>{initials}</Text></View>
      <View style={styles.donationCopy}>
        <Text style={styles.donationName}>{name}</Text>
        <Text style={styles.donationTime}>{time}</Text>
      </View>
      <Text style={styles.donationAmount}>{amount}</Text>
    </View>
  );
}

function QrCode() {
  const cells = [
    [1,1,1,0,1,0,0,1,1,1],
    [1,0,1,0,0,1,0,1,0,1],
    [1,1,1,1,1,0,1,1,1,1],
    [0,0,1,0,1,1,0,0,1,0],
    [1,0,0,1,1,0,1,0,0,1],
    [0,1,1,0,0,1,1,1,0,0],
    [1,1,0,1,0,0,1,0,1,1],
    [1,0,1,1,1,0,0,1,0,1],
    [1,1,1,0,1,1,0,1,1,1],
    [0,1,0,0,1,0,1,0,1,0]
  ];
  return (
    <View style={styles.qrGrid}>
      {cells.flatMap((row, rowIndex) => row.map((cell, colIndex) => <View key={rowIndex + "-" + colIndex} style={[styles.qrCell, cell ? styles.qrCellOn : styles.qrCellOff]} />))}
    </View>
  );
}

const colors = {
  ink: "#1F3A5F",
  teal: "#1C7876",
  page: "#F7F7F4",
  border: "#E3E1D9",
  muted: "#62615C",
  paleTeal: "#E5F0EE",
  cream: "#FFF0D8",
  amber: "#8A560D",
  green: "#2F681D"
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  dashboardContent: { paddingHorizontal: 26, paddingTop: 10, paddingBottom: 112 },
  dashboardHeader: { marginTop: 0, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  orgNameRow: { flexDirection: "row", alignItems: "center" },
  orgName: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  dashboardSubhead: { marginTop: 7, color: colors.muted, fontSize: 11 },
  unverifiedPill: { marginLeft: 8, height: 20, borderRadius: 10, justifyContent: "center", paddingHorizontal: 10, backgroundColor: "#E7E5DE" },
  unverifiedText: { color: colors.muted, fontSize: 9, fontWeight: "800" },
  verifiedBadge: { width: 18, height: 18, marginLeft: 10, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  verifiedText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  bellButton: { width: 36, height: 36, borderWidth: 1, borderColor: colors.border, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  reviewCard: { height: 78, marginTop: 17, borderRadius: 13, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, backgroundColor: colors.cream },
  clockIcon: { width: 34, height: 34, borderWidth: 3, borderColor: colors.amber, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  clockHandTall: { width: 3, height: 11, backgroundColor: colors.amber, transform: [{ translateY: -3 }] },
  clockHandWide: { width: 9, height: 3, marginTop: -5, marginLeft: 7, backgroundColor: colors.amber },
  reviewCopy: { flex: 1, marginLeft: 14 },
  reviewTitle: { color: "#6E3D06", fontSize: 12, fontWeight: "800" },
  reviewText: { width: 155, marginTop: 6, color: "#8C5A14", fontSize: 9, lineHeight: 13 },
  statusLink: { color: "#6E3D06", fontSize: 10, fontWeight: "800" },
  statsCard: { height: 82, marginTop: 17, borderWidth: 1, borderColor: colors.border, borderRadius: 13, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  statLabel: { marginTop: 9, color: colors.muted, fontSize: 9 },
  statDivider: { position: "absolute", right: 0, width: 1, height: 42, backgroundColor: colors.border },
  listAnimalButton: { height: 44, marginTop: 18, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  listAnimalText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  savedDraftText: { marginTop: 6, color: colors.muted, fontSize: 9, textAlign: "center" },
  shortcutGrid: { marginTop: 17, flexDirection: "row", gap: 8 },
  verifiedShortcutGrid: { marginTop: 17, flexDirection: "row", gap: 7 },
  shortcutCard: { flex: 1, height: 72, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  shortcutIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  shortcutPaw: { width: 18, height: 18, tintColor: colors.teal, transform: [{ translateY: -1 }] },
  shortcutGlyph: { color: colors.teal, fontSize: 16, fontWeight: "900" },
  shortcutLabel: { marginTop: 8, color: colors.ink, fontSize: 9, fontWeight: "800" },
  lockBadge: { position: "absolute", right: 8, top: 8, width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: colors.border, zIndex: 2 },
  lockText: { color: colors.muted, fontSize: 14, lineHeight: 14 },
  verifyCard: { minHeight: 68, marginTop: 18, borderWidth: 1, borderColor: colors.teal, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, backgroundColor: "#EAF6F4" },
  verifyTitle: { color: colors.teal, fontSize: 12, fontWeight: "800" },
  verifyText: { marginTop: 8, color: colors.muted, fontSize: 9 },
  verifyLink: { color: colors.teal, fontSize: 10, fontWeight: "800" },
  requestsBlock: { marginTop: 17 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  seeAll: { color: colors.teal, fontSize: 9, fontWeight: "800" },
  requestRow: { height: 56, marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, backgroundColor: "#FFFFFF" },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  avatarText: { color: colors.teal, fontSize: 12, fontWeight: "800" },
  requestCopy: { flex: 1, marginLeft: 12 },
  requestName: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  requestBody: { marginTop: 5, color: colors.muted, fontSize: 9 },
  newBadge: { minWidth: 38, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  newText: { color: colors.teal, fontSize: 9, fontWeight: "800" },
  reviewBadge: { minWidth: 50, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#FDE9C8" },
  reviewBadgeText: { color: "#74440D", fontSize: 9, fontWeight: "800" },
  donationsHeader: { height: 89 },
  backButton: { position: "absolute", left: 25, top: 45, width: 42, height: 42, zIndex: 10, justifyContent: "center" },
  backText: { color: colors.ink, fontSize: 34, fontWeight: "700", lineHeight: 34 },
  headerTitle: { marginTop: -3, color: colors.ink, fontSize: 16, fontWeight: "800", textAlign: "center" },
  donationsContent: { paddingHorizontal: 26, paddingBottom: 112 },
  donationTotalCard: { height: 94, borderRadius: 12, padding: 16, backgroundColor: colors.teal },
  receivedLabel: { color: "#BBDCD8", fontSize: 10 },
  donationTotal: { marginTop: 5, color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
  donorCount: { position: "absolute", right: 15, bottom: 17, color: "#D8EFEA", fontSize: 10 },
  qrCard: { height: 126, marginTop: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  qrGrid: { width: 76, height: 76, flexDirection: "row", flexWrap: "wrap" },
  qrCell: { width: 7.6, height: 7.6 },
  qrCellOn: { backgroundColor: colors.ink },
  qrCellOff: { backgroundColor: "#FFFFFF" },
  qrText: { marginTop: 8, color: colors.muted, fontSize: 9 },
  donationRow: { height: 48, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center" },
  donationAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  donationAvatarText: { color: colors.teal, fontSize: 10, fontWeight: "800" },
  donationCopy: { flex: 1, marginLeft: 12 },
  donationName: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  donationTime: { marginTop: 4, color: colors.muted, fontSize: 9 },
  donationAmount: { color: colors.green, fontSize: 12, fontWeight: "800" },
});
