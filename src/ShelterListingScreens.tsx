import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useState } from "react";

import { ShelterTabs, ShelterTabKey } from "./components/ShelterTabs";
import { TopStatus } from "./components/TopStatus";

const paw = require("../assets/paw-white.png") as ImageSourcePropType;

type ShelterListAnimalProps = {
  onBack: () => void;
  onPublish: () => void;
};

type ShelterListingsProps = {
  onBack: () => void;
  onNew: () => void;
  onTabPress?: (tab: ShelterTabKey) => void;
};

type ListingStatus = "Available" | "Pending" | "Adopted";

const filters: Array<"All" | ListingStatus> = ["All", "Available", "Pending", "Adopted"];
const listings = [
  { name: "Milo", details: "Aspin · 2 yrs · Male", status: "Available" as ListingStatus },
  { name: "Luna", details: "Puspin · 1 yr · Female", status: "Pending" as ListingStatus },
  { name: "Bantay", details: "Aspin · 4 yrs · Male", status: "Available" as ListingStatus },
  { name: "Muning", details: "Puspin · 3 yrs · Female", status: "Adopted" as ListingStatus }
];

export function ShelterListAnimalScreen({ onBack, onPublish }: ShelterListAnimalProps) {
  const [name, setName] = useState("Milo");
  const [species, setSpecies] = useState("Dog");
  const [breed, setBreed] = useState("Aspin (Asong Pinoy)");
  const [sex, setSex] = useState("Male");
  const [status, setStatus] = useState<ListingStatus>("Available");
  const [fee, setFee] = useState("₱0 (Free adoption)");

  return (
    <View style={styles.screen}>
      <Header title="List an animal" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity activeOpacity={0.8} style={styles.photoWrap}>
          <View style={styles.photoCircle}><Image source={paw} resizeMode="contain" style={styles.photoPaw} /></View>
          <View style={styles.plusBadge}><Text style={styles.plusText}>+</Text></View>
        </TouchableOpacity>
        <Text style={styles.photoText}>Add photos</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />

        <Text style={styles.label}>Species</Text>
        <View style={styles.chipRow}>{["Dog", "Cat", "Other"].map((item) => <Chip key={item} label={item} active={species === item} onPress={() => setSpecies(item)} />)}</View>

        <Text style={styles.label}>Breed</Text>
        <View style={styles.selectInput}>
          <TextInput value={breed} onChangeText={setBreed} style={styles.selectText} />
          <Text style={styles.downChevron}>⌄</Text>
        </View>

        <Text style={styles.label}>Sex</Text>
        <View style={styles.chipRow}>{["Male", "Female"].map((item) => <Chip key={item} label={item} active={sex === item} onPress={() => setSex(item)} />)}</View>

        <Text style={styles.label}>Adoption status</Text>
        <View style={styles.chipRow}>{(["Available", "Pending", "Adopted"] as ListingStatus[]).map((item) => <Chip key={item} label={item} active={status === item} onPress={() => setStatus(item)} />)}</View>

        <Text style={styles.label}>Adoption fee</Text>
        <TextInput value={fee} onChangeText={setFee} style={styles.input} />

        <TouchableOpacity activeOpacity={0.85} style={styles.publishButton} onPress={onPublish}>
          <Text style={styles.primaryText}>Publish listing</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function ShelterListingsScreen({ onBack, onNew, onTabPress }: ShelterListingsProps) {
  const [filter, setFilter] = useState<"All" | ListingStatus>("All");
  const visibleListings = filter === "All" ? listings : listings.filter((item) => item.status === filter);

  return (
    <View style={styles.screen}>
      <View style={styles.listHeader}>
        <TopStatus />
        <TouchableOpacity activeOpacity={0.75} onPress={onBack} style={styles.backButton} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My listings</Text>
        <TouchableOpacity activeOpacity={0.75} onPress={onNew} style={styles.newButton}>
          <Text style={styles.newText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <View style={styles.filterRow}>{filters.map((item) => <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />)}</View>
        {visibleListings.map((item) => <ListingRow key={item.name} {...item} />)}
      </ScrollView>
      <ShelterTabs active="animals" onTabPress={onTabPress} />
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

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.chip, active && styles.activeChip]}>
      <Text style={[styles.chipText, active && styles.activeChipText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ListingRow({ name, details, status }: { name: string; details: string; status: ListingStatus }) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.listingRow}>
      <View style={styles.listingAvatar}><Image source={paw} resizeMode="contain" style={styles.listingPaw} /></View>
      <View style={styles.listingCopy}>
        <Text style={styles.listingName}>{name}</Text>
        <Text style={styles.listingDetails}>{details}</Text>
      </View>
      <View style={styles.listingRight}>
        <View style={[styles.statusBadge, status === "Pending" && styles.pendingBadge, status === "Adopted" && styles.adoptedBadge]}>
          <Text style={[styles.statusText, status === "Pending" && styles.pendingText, status === "Adopted" && styles.adoptedText]}>{status}</Text>
        </View>
        <Text style={styles.editText}>Edit ›</Text>
      </View>
    </TouchableOpacity>
  );
}


const colors = {
  ink: "#1F3A5F",
  teal: "#1C7876",
  page: "#F7F7F4",
  border: "#E3E1D9",
  muted: "#62615C",
  paleTeal: "#E5F0EE",
  green: "#2F681D",
  cream: "#FDE9C8"
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { height: 108 },
  listHeader: { height: 108 },
  backButton: { position: "absolute", left: 25, top: 45, width: 42, height: 42, zIndex: 10, justifyContent: "center" },
  backText: { color: colors.ink, fontSize: 34, fontWeight: "700", lineHeight: 34 },
  headerTitle: { marginTop: -3, color: colors.ink, fontSize: 16, fontWeight: "800", textAlign: "center" },
  newButton: { position: "absolute", right: 26, top: 48 },
  newText: { color: colors.teal, fontSize: 13, fontWeight: "800" },
  formContent: { paddingHorizontal: 26, paddingBottom: 36 },
  photoWrap: { width: 98, height: 98, marginTop: 10, alignSelf: "center" },
  photoCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  photoPaw: { width: 34, height: 34, tintColor: colors.teal, transform: [{ translateY: -2 }] },
  plusBadge: { position: "absolute", right: -2, bottom: 16, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  plusText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", lineHeight: 25 },
  photoText: { marginTop: 8, color: colors.teal, fontSize: 13, fontWeight: "800", textAlign: "center" },
  label: { marginTop: 18, marginBottom: 9, color: colors.ink, fontSize: 12, fontWeight: "800" },
  input: { height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 16, color: colors.ink, fontSize: 15, fontWeight: "800", backgroundColor: "#FFFFFF" },
  chipRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chip: { height: 40, minWidth: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, backgroundColor: "#FFFFFF" },
  activeChip: { borderColor: colors.teal, backgroundColor: colors.teal },
  chipText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  activeChipText: { color: "#FFFFFF" },
  selectInput: { height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 10, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF" },
  selectText: { flex: 1, paddingHorizontal: 16, color: colors.ink, fontSize: 15, fontWeight: "800" },
  downChevron: { paddingRight: 16, color: colors.muted, fontSize: 28, lineHeight: 28 },
  publishButton: { height: 56, marginTop: 40, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  listContent: { paddingHorizontal: 26, paddingBottom: 112 },
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  listingRow: { height: 76, marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 13, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, backgroundColor: "#FFFFFF" },
  listingAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  listingPaw: { width: 24, height: 24, tintColor: colors.teal, transform: [{ translateY: -1 }] },
  listingCopy: { flex: 1, marginLeft: 14 },
  listingName: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  listingDetails: { marginTop: 6, color: colors.muted, fontSize: 12 },
  listingRight: { alignItems: "flex-end" },
  statusBadge: { minWidth: 90, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E1F2D3" },
  pendingBadge: { backgroundColor: colors.cream },
  adoptedBadge: { backgroundColor: "#E7E5DE" },
  statusText: { color: colors.green, fontSize: 12, fontWeight: "800" },
  pendingText: { color: "#74440D" },
  adoptedText: { color: colors.muted },
  editText: { marginTop: 8, color: colors.teal, fontSize: 12, fontWeight: "800" }
});
