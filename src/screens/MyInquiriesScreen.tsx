// US-A4 · the adopter's own inquiries with each one's stage progress.
// GET /me/inquiries. "Both sides see the same state" — this reads the same stage rows the
// poster's advance writes.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MyInquiry } from "../api/types";
import { useApi } from "../api/useApi";
import { inquiryProgressLabel } from "../adoption";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  tealBg: "#E7F0EE", tealFg: "#14504F", pink: "#B23B3B", pinkBg: "#FBECEC",
  greyBg: "#ECEAE3", grey: "#5F5E5A"
};

// inquiry_status (not stage state): active/adopted/declined/withdrawn.
const STATUS_TONE: Record<string, { bg: string; fg: string; label: string }> = {
  active: { bg: colors.tealBg, fg: colors.tealFg, label: "Active" },
  adopted: { bg: "#EAF3DE", fg: "#27500A", label: "Adopted" },
  declined: { bg: colors.pinkBg, fg: colors.pink, label: "Declined" },
  withdrawn: { bg: colors.greyBg, fg: colors.grey, label: "Withdrawn" }
};

type Props = NativeStackScreenProps<RootStackParamList, "myInquiries">;

export function MyInquiriesScreen({ navigation }: Props) {
  const api = useApi();
  const [inquiries, setInquiries] = useState<MyInquiry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    api.get("/me/inquiries").then((r) => {
      if (r.ok) setInquiries(r.data?.results ?? []);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My inquiries</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loaded && inquiries.length === 0 ? (
          <Text style={styles.empty}>You haven't inquired on any pets yet.</Text>
        ) : (
          inquiries.map((iq) => {
            const tone = STATUS_TONE[iq.status] ?? STATUS_TONE.active;
            return (
              <TouchableOpacity
                key={iq.inquiry_id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("listingDetail", { listingId: iq.listing.listing_id })}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{iq.listing.name}</Text>
                    <Text style={styles.cardMeta}>{capitalize(iq.listing.species)}</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.chipText, { color: tone.fg }]}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={styles.progress}>{inquiryProgressLabel(iq.stages)}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 60 },
  card: { padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardName: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  cardMeta: { marginTop: 4, color: colors.muted, fontSize: 14 },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "800" },
  progress: { marginTop: 12, color: colors.teal, fontSize: 14, fontWeight: "700" },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center" }
});
