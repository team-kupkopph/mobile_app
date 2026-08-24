// US-Q2 · the public donate surface. GET /shelters/{accountId}/donation-qr — a two-key
// gate (org approved AND the QR reviewer-verified), so a 404 here just means "nothing to
// show yet," not an error. Payments happen off-platform in the payment app itself —
// Kupkop never touches the money (decision: donations stay off-platform QR by design).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9"
};

const PROVIDER_LABEL: Record<string, string> = { gcash: "GCash", maya: "Maya" };

type DonationQr = { provider: string; account_name: string; qr_image_url: string };
type Props = NativeStackScreenProps<RootStackParamList, "donate">;

export function DonateScreen({ navigation, route }: Props) {
  const api = useApi();
  const { accountId, orgName } = route.params;
  const [qrs, setQrs] = useState<DonationQr[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get(`/shelters/${accountId}/donation-qr`).then((r) => {
      setQrs(r.ok ? r.data.donation_qrs : []);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once for this accountId
  }, [accountId]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Donate</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.orgName}>{orgName}</Text>
        <Text style={styles.offPlatformNote}>
          Donations happen in your payment app — Kupkop never touches the money.
        </Text>

        {!loaded ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.teal} />
        ) : qrs && qrs.length > 0 ? (
          qrs.map((qr) => (
            <View key={qr.provider} style={styles.qrCard}>
              <Text style={styles.provider}>{PROVIDER_LABEL[qr.provider] ?? qr.provider}</Text>
              <Image source={{ uri: qr.qr_image_url }} style={styles.qrImage} resizeMode="contain" />
              <Text style={styles.accountName}>{qr.account_name}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Donations aren't available for this org yet.</Text>
        )}
      </ScrollView>
    </View>
  );
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
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  orgName: { color: colors.ink, fontSize: 26, fontWeight: "800" },
  offPlatformNote: { marginTop: 8, marginBottom: 20, color: colors.muted, fontSize: 14, lineHeight: 20 },
  qrCard: { marginBottom: 18, padding: 20, borderRadius: 22, alignItems: "center", ...card },
  provider: { color: colors.teal, fontSize: 16, fontWeight: "800" },
  qrImage: { marginTop: 14, width: 220, height: 220, borderRadius: 12, backgroundColor: colors.line },
  accountName: { marginTop: 14, color: colors.ink, fontSize: 15, fontWeight: "600" },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center" }
});
