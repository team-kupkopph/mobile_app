// US-S1 · report a stray. Reference: screens/user/screen-report-stray.png.
// POST /reports { species, condition, notes?, is_anonymous, lat, lng, location_text?, city?, photos } -> 201.
// Location = the app's ONE precise-GPS surface (decision 11): expo-location gives the coords, and
// the disclosure below is NOT optional copy — everywhere else a person's location is city-level.
// The precise-pin refinement (US-S2 "Adjust") opens AdjustPinScreen (react-native-maps, dev build).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Button, Field, ScreenHeader, SegmentedControl } from "../components/ui";

import { useApi } from "../api/useApi";
import { useOutbox } from "../outbox/OutboxProvider";
import { randomKey } from "../outbox/key";
import { pickAndUpload } from "../media/pickAndUpload";
import { RootStackParamList } from "../navigation/types";
import { sagipTitle } from "../sagip";
import { TAP_SLOP } from "../touch";
import { colors, elevation, radii, spacing, typography } from "../theme";

const SPECIES = ["dog", "cat", "other"] as const;
const CONDITIONS = ["injured", "sick", "healthy", "pregnant"] as const;

type Props = NativeStackScreenProps<RootStackParamList, "reportStray">;

export function ReportStrayScreen({ navigation, route }: Props) {
  const api = useApi();
  const { enqueue } = useOutbox();
  const [species, setSpecies] = useState<string>("dog");
  const [condition, setCondition] = useState<string>("injured");
  const [notes, setNotes] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationText, setLocationText] = useState<string>("");
  // Coarse city label from the same reverse-geocode; sent so the report stores its own city
  // (report-detail + the map show it) instead of the server needing a geocoder. Never precise.
  const [city, setCity] = useState<string>("");
  const [locState, setLocState] = useState<"loading" | "ready" | "denied">("loading");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { setLocState("denied"); return; }
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        try {
          const [place] = await Location.reverseGeocodeAsync(loc.coords);
          if (place) {
            const line = [place.name, place.street, place.city].filter(Boolean).join(", ");
            setLocationText(line || place.city || "");
            setCity(place.city ?? "");
          }
        } catch {
          // reverse-geocode is best-effort; the coords are what matter
        }
        setLocState("ready");
      } catch {
        setLocState("denied");
      }
    })();
  }, []);

  // US-S2 · the Adjust map pops back with refined coords — adopt them and refresh the address.
  const adjLat = route.params?.adjustedLat;
  const adjLng = route.params?.adjustedLng;
  useEffect(() => {
    if (adjLat == null || adjLng == null) return;
    setCoords({ lat: adjLat, lng: adjLng });
    setLocState("ready");
    (async () => {
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: adjLat, longitude: adjLng });
        if (place) {
          const line = [place.name, place.street, place.city].filter(Boolean).join(", ");
          setLocationText(line || place.city || "");
          setCity(place.city ?? "");
        }
      } catch {
        // best-effort; the refined coords are what matter
      }
    })();
  }, [adjLat, adjLng]);

  async function addPhoto() {
    if (uploading) return;
    setUploading(true);
    const res = await pickAndUpload(api, "stray_photo");
    setUploading(false);
    if (res?.ok) setPhotoUrl(res.fileUrl);
  }

  async function submit() {
    if (!coords || submitting) return;
    setSubmitting(true);
    setError(undefined);

    // US-O3 · the key is generated HERE, at compose time, not at send time — every retry of
    // this report must carry the same value or the server cannot tell a replay from a second
    // animal, and one animal gets two rescuers.
    const idempotencyKey = randomKey();
    const body = {
      species, condition, notes: notes.trim() || undefined, is_anonymous: anonymous,
      lat: coords.lat, lng: coords.lng, location_text: locationText || undefined,
      city: city || undefined,
      photos: photoUrl ? [{ file_url: photoUrl }] : [],
      idempotency_key: idempotencyKey,
    };

    const res = await api.post("/reports", body);
    setSubmitting(false);

    if (res.ok) {
      navigation.replace("reportSent", {
        reportId: res.data.report_id, title: sagipTitle(species, condition),
        city: locationText || null
      });
      return;
    }

    // §13.3 · "never silently lose a user's report". A connectivity failure is not a dead
    // end: the report is queued and sent when the network returns, and the person is told
    // so rather than being asked to remember and re-file it.
    if (res.status === 0) {
      await enqueue(body, idempotencyKey);
      navigation.replace("reportSent", {
        reportId: null, title: sagipTitle(species, condition),
        city: locationText || null, queued: true
      });
      return;
    }
    setError(res.data?.error?.message ?? "Couldn't send the report. Try again.");
  }

  return (
    <View style={styles.screen} testID="screen.reportStray">
      <ScreenHeader title="Report a stray" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>What did you see?</Text>
        <Text style={styles.sub}>A photo helps — but don't wait for one.</Text>

        <TouchableOpacity
          style={styles.photoBtn}
          onPress={addPhoto}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={photoUrl ? "Photo added. Tap to replace it." : "Add a photo, optional"}
          accessibilityState={{ busy: uploading }}
        >
          {uploading ? <ActivityIndicator color={colors.teal} />
            : <Text style={styles.photoText}>{photoUrl ? "✓ Photo added" : "Add a photo · optional"}</Text>}
        </TouchableOpacity>

        <Text style={styles.label}>Animal</Text>
        <Segmented options={SPECIES} value={species} onChange={setSpecies} />

        <Text style={styles.label}>Condition</Text>
        <Segmented options={CONDITIONS} value={condition} onChange={setCondition} />

        <Field
          label="Notes (optional)"
          testID="field.reportStray.notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Limping, near the sari-sari store — wouldn't let me near."
        />

        <View style={styles.locCard}>
          {locState === "loading" ? (
            <View style={styles.locRow}><ActivityIndicator color={colors.teal} /><Text style={styles.locText}>Finding your location…</Text></View>
          ) : locState === "denied" ? (
            <Text style={styles.locDenied}>Location off — turn it on so a rescuer can find the animal.</Text>
          ) : (
            <>
              <Text style={styles.locAddr}>{locationText || "Current location"}</Text>
              <View style={styles.locFooter}>
                <Text style={styles.locFrom}>From your GPS</Text>
                {coords ? (
                  <TouchableOpacity
                    onPress={() => navigation.navigate("adjustPin", { lat: coords.lat, lng: coords.lng })} hitSlop={TAP_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Adjust the exact location of this report"
                  >
                    <Text style={styles.adjust}>Adjust exact location ›</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          )}
        </View>
        <Text style={styles.fine}>Only this report uses your exact spot · your profile still shows just your city.</Text>

        <View style={styles.anonRow}>
          <Text style={styles.anonLabel}>Report anonymously</Text>
          <Switch
            value={anonymous}
            onValueChange={setAnonymous}
            trackColor={{ true: colors.teal }}
            accessibilityLabel="Report anonymously"
            accessibilityHint="Hides your name from other users. The report is still linked to your account."
          />
        </View>

        {error ? (
          <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Button
          testID="btn.reportStray.submit"
          label="Send report"
          onPress={submit}
          loading={submitting}
          accessibilityHint={coords ? undefined : "Waiting for your location"}
          style={styles.submit}
        />
      </ScrollView>
    </View>
  );
}

function Segmented({ options, value, onChange }: {
  options: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  // The primitive takes labels and an index; the screens keep their string enums.
  return (
    <SegmentedControl
      segments={options.map((opt) => opt.charAt(0).toUpperCase() + opt.slice(1))}
      index={Math.max(0, options.indexOf(value))}
      onChange={(i) => onChange(options[i])}
    />
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  h1: { color: colors.ink, ...typography.display },
  sub: { marginTop: 8, color: colors.muted, ...typography.subtitle },
  photoBtn: { marginTop: 18, height: 90, borderRadius: radii.field, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoText: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  label: { marginTop: 24, marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  locCard: { marginTop: 24, padding: 18, borderRadius: radii.tile, ...card },
  locRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  locText: { color: colors.muted, ...typography.body },
  locAddr: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  locFooter: { marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  locFrom: { color: colors.muted, ...typography.meta, fontWeight: "600" },
  adjust: { color: colors.teal, ...typography.strong, fontWeight: "800" },
  locDenied: { color: colors.warningStrong, ...typography.strong, fontWeight: "700" },
  fine: { marginTop: 12, color: colors.muted, ...typography.meta, lineHeight: 19 },
  anonRow: { marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, borderRadius: radii.tile, ...card },
  anonLabel: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  error: { marginTop: 16, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 }
});
