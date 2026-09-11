// US-N5 · Privacy controls. Wires `GET / PATCH /me/settings` — live since Sprint 1 with no
// caller until now — plus the new `analytics_consent` (D-S7-3).
//
// THE RULE THIS SCREEN IS BUILT AROUND: never render a toggle that does nothing.
// `masked_contact` describes Phase-2 chat and `approximate_location` is enforced server-side
// regardless (§12.5 stores a city, never coordinates), so neither is a control the user
// actually holds. They appear under ALWAYS ON as stated facts. See `privacyRows`.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ScrollView, StyleSheet, Switch, Text, View,
} from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { privacyRows, Settings } from "../settings";
import { ScreenHeader } from "../components/ui";
import { colors, elevation, radii, typography } from "../theme";

const card = {
  backgroundColor: colors.white, ...elevation.soft,
};

type Props = NativeStackScreenProps<RootStackParamList, "settingsPrivacy">;

export function SettingsPrivacyScreen({ navigation }: Props) {
  const api = useApi();
  const [settings, setSettings] = useState<Settings | null>(null);
  // `error` is now the SAVE error only. It used to carry the load failure too, which is how
  // this screen ended up distinguishing offline in its save path (below) but not in its load
  // path — the same request failing in two places, described two different ways.
  const [error, setError] = useState<string | undefined>();
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const load = useCallback(() => {
    setRes(null);
    api.get("/me/settings").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setSettings(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(key: keyof Settings, next: boolean) {
    if (!settings) return;
    const previous = settings;
    // Optimistic: a privacy switch that lags feels broken, and the user is watching it.
    setSettings({ ...settings, [key]: next });
    setError(undefined);

    const res = await api.patch("/me/settings", { [key]: next });
    if (res.ok) {
      setSettings(res.data);
    } else {
      // Revert rather than leave the switch showing a state the server never accepted —
      // on THIS screen a lie is a broken privacy promise, not a cosmetic glitch.
      setSettings(previous);
      setError(res.status === 0 ? "You're offline — that didn't save."
                                : "That didn't save. Try again.");
    }
  }

  if (!settings) {
    return (
      <View style={styles.screen}>
        <Header navigation={navigation} />
        <View style={styles.loading}>
          <LoadStateView state={loadState(res)} subject="settings page" onRetry={load} />
        </View>
      </View>
    );
  }

  const rows = privacyRows(settings);
  const toggles = rows.toggles;

  return (
    <View style={styles.screen} testID="screen.settingsPrivacy">
      <Header navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Text style={styles.groupTitle}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          {toggles.slice(0, 2).map((row, i) => (
            <ToggleRow key={row.key} row={row} divided={i === 0} onChange={(v) => toggle(row.key, v)} />
          ))}
        </View>

        <Text style={styles.groupTitle}>ANALYTICS</Text>
        <View style={styles.card}>
          <ToggleRow row={toggles[2]} divided={false} onChange={(v) => toggle(toggles[2].key, v)} />
        </View>
        {/* The right to WITHDRAW is half of what consent means under RA 10173, and it
            belongs on the screen rather than in a policy nobody opens. */}
        <Text style={styles.footnote}>
          Off by default. Turn it on or off any time — switching it off stops collection
          straight away.
        </Text>

        <Text style={styles.groupTitle}>ALWAYS ON</Text>
        <View style={styles.card}>
          {rows.facts.map((fact, i) => (
            <View
              key={fact.label}
              style={[styles.factRow, i < rows.facts.length - 1 && styles.divided]}
              accessible
              accessibilityLabel={`${fact.label}. ${fact.note}`}
            >
              <Text style={styles.factLabel}>{fact.label}</Text>
              <Text style={styles.note}>{fact.note}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  row, divided, onChange,
}: {
  row: { key: string; label: string; note: string; value: boolean };
  divided: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.toggleRow, divided && styles.divided]}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{row.label}</Text>
        <Text style={styles.note}>{row.note}</Text>
      </View>
      <Switch
        testID={`toggle.privacy.${row.key}`}
        value={row.value}
        onValueChange={onChange}
        trackColor={{ false: "#D8D6CD", true: colors.teal }}
        accessibilityLabel={row.label}
        accessibilityHint={row.note}
      />
    </View>
  );
}

function Header({ navigation }: { navigation: Props["navigation"] }) {
  return (
    <ScreenHeader title="Privacy" onBack={() => navigation.goBack()} align="center" />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { padding: 20, paddingBottom: 48 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  groupTitle: { fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 1.4, marginBottom: 8, marginTop: 22 },
  card: { borderRadius: radii.tile, ...card },
  toggleRow: { paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center" },
  toggleText: { flex: 1, paddingRight: 14 },
  toggleLabel: { ...typography.subtitle, fontWeight: "700", color: colors.ink },
  factRow: { paddingHorizontal: 18, paddingVertical: 16 },
  factLabel: { ...typography.strong, fontWeight: "700", color: colors.ink },
  note: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  divided: { borderBottomWidth: 1, borderBottomColor: colors.border },
  footnote: { fontSize: 13, color: colors.muted, marginTop: 10, lineHeight: 18 },
  error: { fontSize: 15, color: colors.danger },
  errorBanner: { ...typography.meta, color: colors.danger, marginBottom: 12 },
});
