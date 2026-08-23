// US-X1 · the bell — the notification list that was missing entirely (found during the
// Sprint 3 story audit: the backend wrote report_claimed/offer_matched/case_reopened/
// report_escalated/verification_* rows correctly, but nothing on mobile ever read them).
// GET /me/notifications; POST /me/notifications/read marks everything read on open, per
// the backend's own docstring ("on opening the bell").
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MeNotification } from "../api/types";
import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { notificationTarget } from "../notifications";
import { relTime } from "../sagip";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", unreadBg: "#EAF3F2"
};

type Props = NativeStackScreenProps<RootStackParamList, "notifications">;

export function NotificationsScreen({ navigation }: Props) {
  const api = useApi();
  const [items, setItems] = useState<MeNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Unread rows keep looking unread for the rest of THIS viewing, even after the
  // mark-read call fires — reopening the screen later is what actually clears them.
  const markedRef = useRef(false);

  useFocusEffect(useCallback(() => {
    markedRef.current = false;
    api.get("/me/notifications").then((r) => {
      if (r.ok) {
        const list: MeNotification[] = r.data?.notifications ?? [];
        setItems(list);
        if (!markedRef.current && list.some((n) => !n.read)) {
          markedRef.current = true;
          api.post("/me/notifications/read");
        }
      }
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch + re-mark on focus
  }, []));

  function onPress(n: MeNotification) {
    const target = notificationTarget(n);
    if (!target) return; // unrecognized type, or missing the data it needs — no destination
    if (target.screen === "reportDetail") {
      navigation.navigate("reportDetail", { reportId: target.reportId });
    } else {
      navigation.navigate("verifyDocuments");
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loaded && items.length === 0 ? (
          <Text style={styles.empty}>Nothing yet — this is where updates on your reports and offers show up.</Text>
        ) : (
          items.map((n) => {
            const target = notificationTarget(n);
            return (
              <TouchableOpacity
                key={n.notification_id}
                style={[styles.card, !n.read && styles.cardUnread]}
                activeOpacity={target ? 0.85 : 1}
                onPress={() => onPress(n)}
              >
                {!n.read ? <View style={styles.dot} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{n.title || "Update"}</Text>
                  {n.body ? <Text style={styles.cardBody}>{n.body}</Text> : null}
                  <Text style={styles.cardTime}>{relTime(n.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
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
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 60 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardUnread: { backgroundColor: colors.unreadBg },
  dot: { marginTop: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  cardBody: { marginTop: 4, color: colors.muted, fontSize: 14, lineHeight: 20 },
  cardTime: { marginTop: 8, color: "#9a988f", fontSize: 12, fontWeight: "600" },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center", lineHeight: 22 }
});
