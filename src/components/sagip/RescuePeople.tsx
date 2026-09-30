// D1 + D8 (dev/sagip-build-review.md) · the other people on a rescue, and how to reach the ones
// who agreed. The backend decides who appears (GET /reports/{id} `people`, sagip/contact.py);
// this only renders it. A contact row appears only when that person consented — otherwise the
// field is absent and we say so, rather than implying there is nothing to share.
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RescuePerson } from "../../api/types";
import { personSummary } from "../../sagip";
import { colors, spacing, typography } from "../../theme";
import { Card } from "../ui";

export function RescuePeople({ people, title = "People on this rescue" }: { people: RescuePerson[]; title?: string }) {
  if (people.length === 0) return null;
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {people.map((p, i) => {
        const s = personSummary(p);
        return (
          <View key={`${p.role}-${i}`} style={[styles.person, i > 0 && styles.divider]}>
            <Text style={styles.name}>{s.title}</Text>
            <Text style={styles.detail}>{s.detail}</Text>
            {p.contact?.phone ? (
              <TouchableOpacity
                style={styles.contactRow}
                accessibilityRole="button"
                accessibilityLabel={`Call ${s.title}`}
                onPress={() => Linking.openURL(`tel:${p.contact!.phone}`)}
              >
                <Text style={styles.contactText}>{p.contact.phone}</Text>
              </TouchableOpacity>
            ) : null}
            {p.contact?.email ? (
              <TouchableOpacity
                style={styles.contactRow}
                accessibilityRole="button"
                accessibilityLabel={`Email ${s.title}`}
                onPress={() => Linking.openURL(`mailto:${p.contact!.email}`)}
              >
                <Text style={styles.contactText}>{p.contact.email}</Text>
              </TouchableOpacity>
            ) : null}
            {!p.contact && s.noContact ? <Text style={styles.noContact}>{s.noContact}</Text> : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20, padding: spacing.lg },
  title: { color: colors.ink, ...typography.section, marginBottom: 6 },
  person: { paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  name: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  detail: { marginTop: 2, color: colors.muted, ...typography.meta },
  contactRow: { minHeight: 44, justifyContent: "center" },
  contactText: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  noContact: { marginTop: 6, color: colors.muted, ...typography.meta, fontStyle: "italic" }
});
